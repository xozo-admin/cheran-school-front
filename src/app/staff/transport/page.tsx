// app/staff/transport/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  FaUsers,
  FaMapMarkerAlt,
  FaRoute,
  FaBus,
  FaUserCheck,
  FaClock,
  FaSearch,
  FaArrowLeft,
  FaSync,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaDownload,
  FaPrint,
  FaPhone,
  FaIdCard,
  FaSchool,
  FaPlay,
  FaStop,
  FaSatelliteDish,
  FaWifi,
} from 'react-icons/fa';
import { transportLiveApi } from '@/lib/transport-live-api';
import { staffApi } from '@/lib/api';
import { isTransportStaffRole, resolveStaffRole } from '@/lib/staff-access';
import { toast } from 'react-hot-toast';

interface Passenger {
  type: string;
  name: string;
  id: string;
  class?: string;
  section?: string;
  pickup_point?: string;
  drop_point?: string;
  contact_number?: string;
}

interface TransportData {
  my_bus: string;
  route_id: number;
  total_passengers: number;
  passengers: Passenger[];
  reg_number?: string;
  driver_name?: string;
  route_start?: string;
  route_end?: string;
  stops?: Array<{ id?: number; stop_name?: string; stop?: string }>;
}

interface BusLocation {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export default function StaffTransportPage() {
  const socketRef = useRef<WebSocket | null>(null);
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tripActiveRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transportData, setTransportData] = useState<TransportData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isTransportOperator, setIsTransportOperator] = useState(false);
  const [ownAttendanceHistory, setOwnAttendanceHistory] = useState<
    Array<{
      day?: number;
      date?: string;
      morning?: { status?: string; marked_by?: string };
      evening?: { status?: string; marked_by?: string };
    }>
  >([]);

  /* 🔥 LIVE STATES */
  const [liveAttendance, setLiveAttendance] = useState<Record<string, string>>({});
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  
  /* Trip Control States */
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripStartTime, setTripStartTime] = useState<Date | null>(null);
  const [sendingLocation, setSendingLocation] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const extractApiError = (err: any, fallback: string) => {
    const payload = err?.response?.data;
    if (!payload) return err?.message || fallback;
    if (typeof payload === 'string') return payload;
    if (payload.error) return String(payload.error);
    if (payload.message) return String(payload.message);
    if (payload.detail) return String(payload.detail);
    return err?.message || fallback;
  };

  const mapPassengers = (items: any[]): Passenger[] =>
    items.map((item) => ({
      type: String(item?.type || item?.user_type || 'Passenger'),
      name: String(item?.name || item?.full_name || item?.student_name || item?.teacher_name || item?.staff_name || 'Unknown'),
      id: String(item?.id || item?.user_id || item?.student_id || item?.teacher_id || item?.staff_id || ''),
      class: item?.class || item?.student_class,
      section: item?.section || item?.student_section,
      pickup_point: item?.pickup_point || item?.pickup,
      drop_point: item?.drop_point || item?.drop,
      contact_number: item?.contact_number || item?.phone,
    }));

  /* ---------------- LOAD DATA ---------------- */
  const loadTransportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileResponse = await staffApi.profile.get();
      const profile = profileResponse.data?.data || profileResponse.data || {};
      const currentRole = resolveStaffRole(profile);
      const transportRole = isTransportStaffRole(currentRole);
      setIsTransportOperator(transportRole);

      if (transportRole) {
        const response = await transportLiveApi.driver.myPassengers();
        const payload = response.data?.data || response.data || {};
        setTransportData({
          my_bus: String(payload?.my_bus || payload?.bus_number || '-'),
          route_id: Number(payload?.route_id || 0),
          total_passengers: Number(payload?.total_passengers || 0),
          passengers: Array.isArray(payload?.passengers) ? mapPassengers(payload.passengers) : [],
        });
        setOwnAttendanceHistory([]);
      } else {
        const [busRes, historyRes] = await Promise.allSettled([
          staffApi.transport.getMyBusInfo(),
          staffApi.transport.getMyAttendanceHistory({
            year: new Date().getFullYear(),
            month: new Date().getMonth() + 1,
          }),
        ]);

        const busPayload =
          busRes.status === 'fulfilled'
            ? (busRes.value?.data?.data || busRes.value?.data || {})
            : {};
        const historyPayload =
          historyRes.status === 'fulfilled'
            ? (historyRes.value?.data?.data || historyRes.value?.data || {})
            : {};

        const routeId = Number(busPayload?.route_id || busPayload?.route?.id || 0);
        const passengersSource = Array.isArray(busPayload?.passengers)
          ? busPayload.passengers
          : Array.isArray(historyPayload?.passengers)
          ? historyPayload.passengers
          : [];

        setTransportData({
          my_bus: String(
            busPayload?.bus_number ||
              busPayload?.my_bus ||
              busPayload?.bus?.bus_number ||
              'Not allocated'
          ),
          route_id: routeId,
          total_passengers: Number(
            busPayload?.total_passengers ||
              busPayload?.passengers_count ||
              passengersSource.length ||
              0
          ),
          passengers: [],
          reg_number: busPayload?.reg_number || busPayload?.registration_number,
          driver_name: busPayload?.driver_name,
          route_start: busPayload?.route_start,
          route_end: busPayload?.route_end,
          stops: Array.isArray(busPayload?.stops) ? busPayload.stops : [],
        });

        setOwnAttendanceHistory(
          Array.isArray(historyPayload?.history) ? historyPayload.history : []
        );

        const location = busPayload?.current_location || busPayload?.location;
        if (location?.latitude && location?.longitude) {
          setBusLocation({
            latitude: Number(location.latitude),
            longitude: Number(location.longitude),
            speed: Number(location.speed || 0),
            timestamp: String(location.timestamp || new Date().toISOString()),
          });
        }
      }

    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load transport data');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransportData();
    
    // Check location permission
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setLocationPermission(result.state);
        result.addEventListener('change', () => {
          setLocationPermission(result.state);
        });
      });
    }

    return () => {
      cleanupTrip();
    };
  }, []);

  const cleanupTrip = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsTripActive(false);
    tripActiveRef.current = false;
    setWsConnected(false);
    setTripStartTime(null);
    setConnectionAttempts(0);
  };

  /* ---------------- START TRIP ---------------- */
  const startTrip = async () => {
    try {
      if (!isTransportOperator) {
        toast.error('Trip controls are available only for Transport Staff.');
        return;
      }

      // Check location permission
      if (locationPermission === 'denied') {
        toast.error('Location permission denied. Please enable location access in your browser settings.');
        return;
      }

      if (!transportData?.route_id) {
        toast.error('Route information not available');
        return;
      }

      const token = transportLiveApi.auth.token();
      if (!token) {
        toast.error('Authentication token not found');
        return;
      }

      // Show loading toast
      const loadingToast = toast.loading('Starting trip and connecting to live tracking...');

      // Request location permission if not granted
      if (locationPermission !== 'granted') {
        try {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          setLocationPermission('granted');
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Location access is required for live tracking');
          return;
        }
      }

      // Close existing socket if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Connect WebSocket
      const wsUrl = transportLiveApi.websocket.trackUrl(transportData.route_id, token);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('✅ WebSocket Connected');
        setWsConnected(true);
        setIsTripActive(true);
        tripActiveRef.current = true;
        setTripStartTime(new Date());
        setConnectionAttempts(0);
        
        toast.dismiss(loadingToast);
        toast.success('🚌 Trip started! Live tracking is now active');
        
        // Start sending location updates
        startLocationUpdates();
      };

      socket.onmessage = (event) => {
        let data: any;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.error('Invalid WebSocket payload:', parseError);
          return;
        }
        console.log('📡 WS Data:', data);

        // Handle different message types
        if (data.latitude && data.longitude) {
          // Location broadcast from server
          setBusLocation({
            latitude: data.latitude,
            longitude: data.longitude,
            speed: data.speed || 0,
            timestamp: data.timestamp || new Date().toISOString()
          });
        } else {
          // Handle other message types
          switch (data.type) {
            case 'bus_location_update':
              setBusLocation(data.payload);
              break;
            case 'attendance_update':
              setLiveAttendance((prev) => ({
                ...prev,
                [data.payload.passenger_id]: data.payload.status,
              }));
              toast.success(`Attendance updated: ${data.payload.passenger_id} is ${data.payload.status}`);
              break;
            case 'transport_refresh':
              loadTransportData();
              break;
            default:
              console.log('Unknown WS message type:', data);
          }
        }
      };

      socket.onclose = (event) => {
        console.log('🔌 WebSocket Closed', event);
        setWsConnected(false);
        
        if (tripActiveRef.current) {
          // Attempt to reconnect
          const attempts = connectionAttempts + 1;
          setConnectionAttempts(attempts);
          
          if (attempts <= 3) {
            toast.error(`Connection lost. Reconnecting... (Attempt ${attempts}/3)`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              startTrip();
            }, 3000);
          } else {
            toast.error('Failed to maintain connection. Please try starting the trip again.');
            setIsTripActive(false);
            tripActiveRef.current = false;
          }
        }
        
        if (locationIntervalRef.current) {
          clearInterval(locationIntervalRef.current);
        }
      };

      socket.onerror = (err) => {
        console.error('❌ WS Error:', err);
        toast.dismiss(loadingToast);
        toast.error('Failed to connect to live tracking');
        setWsConnected(false);
      };

    } catch (err) {
      console.error('Failed to start trip:', err);
      toast.error('Failed to start trip');
    }
  };

  /* ---------------- STOP TRIP ---------------- */
  const stopTrip = () => {
    cleanupTrip();
    toast.success('🚏 Trip ended. Live tracking stopped');
  };

  /* ---------------- START LOCATION UPDATES ---------------- */
  const startLocationUpdates = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
    }

    // Send location immediately
    sendCurrentLocation();

    // Then send every 3 seconds
    locationIntervalRef.current = setInterval(() => {
      sendCurrentLocation();
    }, 3000);
  };

  /* ---------------- SEND CURRENT LOCATION ---------------- */
  const sendCurrentLocation = () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    if (!navigator.geolocation) {
      console.error('Geolocation not supported');
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setSendingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          speed: position.coords.speed || 0,
          timestamp: new Date().toISOString()
        };

        // Send to WebSocket
        console.log('📤 Sending WS location update:', {
          readyState: socketRef.current?.readyState,
          routeId: transportData?.route_id,
          payload: locationData,
        });
        socketRef.current?.send(JSON.stringify(locationData));
        
        // Update local state
        setBusLocation(locationData);
        setSendingLocation(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        setSendingLocation(false);
        
        let errorMessage = 'Failed to get location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied';
            setLocationPermission('denied');
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }
        
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  /* ---------------- SEND ATTENDANCE ---------------- */
  const sendAttendance = (passengerId: string, status: string) => {
    if (!isTransportOperator) {
      toast.error('Attendance marking is allowed only for Transport Staff.');
      return;
    }

    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      toast.error('WebSocket not connected. Please start the trip first.');
      return;
    }

    socketRef.current.send(
      JSON.stringify({
        type: 'mark_attendance',
        payload: {
          passenger_id: passengerId,
          status,
        },
      })
    );

    // Optimistically update UI
    setLiveAttendance((prev) => ({
      ...prev,
      [passengerId]: status,
    }));

    toast.success(`${passengerId} marked ${status}`);
  };

  /* ---------------- FILTER ---------------- */
  const filteredPassengers =
    transportData?.passengers?.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = filterType === 'all' || p.type === filterType;
      return matchSearch && matchType;
    }) || [];

  /* ---------------- TRIP DURATION ---------------- */
  const getTripDuration = () => {
    if (!tripStartTime) return '00:00:00';
    const diff = Math.floor((new Date().getTime() - tripStartTime.getTime()) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-xl max-w-md text-center">
          <FaExclamationTriangle className="text-5xl text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">{error}</p>
          <button 
            onClick={loadTransportData}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Transport Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isTransportOperator
              ? 'Track your bus, start/end trips, and manage passenger attendance'
              : 'Track your allotted bus and route updates'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            wsConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            <FaWifi className={wsConnected ? 'text-green-600' : 'text-gray-500'} />
            <span className="text-sm font-medium">{wsConnected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Trip Control Button */}
          {!isTransportOperator ? (
            <div className="px-4 py-2 rounded-lg bg-amber-100 text-amber-700 font-medium">
              Tracking only
            </div>
          ) : !isTripActive ? (
            <button
              onClick={startTrip}
              disabled={!transportData?.route_id}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition-all ${
                transportData?.route_id
                  ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <FaPlay className="text-sm" />
              <span>Start Trip</span>
            </button>
          ) : (
            <button
              onClick={stopTrip}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FaStop className="text-sm" />
              <span>End Trip</span>
            </button>
          )}

          <button 
            onClick={loadTransportData} 
            className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow"
            title="Refresh Data"
          >
            <FaSync className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* TRIP STATUS BANNER */}
      {isTripActive && isTransportOperator && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-xl shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse" />
              <div>
                <p className="font-semibold">Trip Active</p>
                <p className="text-sm text-blue-100">Started at {tripStartTime?.toLocaleTimeString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <FaClock className="text-blue-200" />
                <span className="font-mono">{getTripDuration()}</span>
              </div>
              {sendingLocation && (
                <div className="flex items-center gap-2">
                  <FaSatelliteDish className="text-blue-200 animate-pulse" />
                  <span className="text-sm">Updating location...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BUS INFO */}
      {transportData && (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 rounded-2xl shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-white/20 rounded-2xl backdrop-blur">
                <FaBus className="text-3xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Bus #{transportData.my_bus}</h2>
                <p className="text-indigo-100 mt-1">Total Passengers: {transportData.total_passengers}</p>
              </div>
            </div>

            {busLocation && (isTripActive || !isTransportOperator) && (
              <div className="bg-white/10 p-4 rounded-xl backdrop-blur min-w-[250px]">
                <div className="flex items-center gap-2 border-b border-white/20 pb-2 mb-2">
                  <FaMapMarkerAlt className="text-indigo-200" />
                  <span className="text-sm font-medium">Live Location</span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Lat: {busLocation.latitude.toFixed(6)}</p>
                  <p>Lng: {busLocation.longitude.toFixed(6)}</p>
                  {busLocation.speed > 0 && (
                    <p className="text-green-300">Speed: {busLocation.speed.toFixed(1)} km/h</p>
                  )}
                  <p className="text-xs text-indigo-200">
                    Updated: {new Date(busLocation.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isTransportOperator ? (
        <>
          {/* SEARCH AND FILTER */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
              <FaSearch className="absolute left-3 top-3.5 text-gray-400" />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
            >
              <option value="all">All Types</option>
              <option value="Student">Students</option>
              <option value="Teacher">Teachers</option>
              <option value="Staff">Staff</option>
            </select>
          </div>

          {/* STATISTICS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
              <p className="text-2xl font-bold">{transportData?.total_passengers || 0}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <p className="text-sm text-gray-600 dark:text-gray-400">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {Object.values(liveAttendance).filter(s => s === 'Present').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <p className="text-sm text-gray-600 dark:text-gray-400">Absent</p>
              <p className="text-2xl font-bold text-red-600">
                {Object.values(liveAttendance).filter(s => s === 'Absent').length}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow">
              <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                {Object.values(liveAttendance).filter(s => s === 'Pending').length}
              </p>
            </div>
          </div>

          {/* PASSENGER TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold">Passenger List ({filteredPassengers.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 text-left">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Pickup</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredPassengers.map((p, i) => {
                    const status = liveAttendance[p.id] || 'Pending';

                    return (
                      <tr key={i} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          {p.contact_number && (
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <FaPhone className="text-xs" />
                              {p.contact_number}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            p.type === 'Student' ? 'bg-green-100 text-green-700' :
                            p.type === 'Teacher' ? 'bg-blue-100 text-blue-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>{p.id}</div>
                          {p.class && (
                            <div className="text-xs text-gray-500">
                              Class {p.class} {p.section}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">{p.pickup_point || '-'}</td>

                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              status === 'Present'
                                ? 'bg-green-100 text-green-700'
                                : status === 'Absent'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => sendAttendance(p.id, 'Present')}
                              disabled={!wsConnected}
                              className={`p-2 rounded-lg transition-all ${
                                status === 'Present'
                                  ? 'bg-green-100 text-green-600 cursor-not-allowed'
                                  : wsConnected
                                  ? 'bg-green-500 text-white hover:bg-green-600 hover:scale-110'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                              title="Mark Present"
                            >
                              <FaCheckCircle />
                            </button>

                            <button
                              onClick={() => sendAttendance(p.id, 'Absent')}
                              disabled={!wsConnected}
                              className={`p-2 rounded-lg transition-all ${
                                status === 'Absent'
                                  ? 'bg-red-100 text-red-600 cursor-not-allowed'
                                  : wsConnected
                                  ? 'bg-red-500 text-white hover:bg-red-600 hover:scale-110'
                                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              }`}
                              title="Mark Absent"
                            >
                              <FaTimesCircle />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredPassengers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <FaSearch className="text-4xl mx-auto mb-3 opacity-50" />
                        <p>No passengers found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SUMMARY CARD */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {Object.values(liveAttendance).filter(s => s !== 'Pending').length} of {transportData?.total_passengers} passengers marked
                </p>
              </div>
              {!wsConnected && (
                <p className="text-sm text-yellow-600 flex items-center gap-2">
                  <FaExclamationTriangle />
                  Start trip to enable live tracking
                </p>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Bus Number</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{transportData?.my_bus || '-'}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Driver</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{transportData?.driver_name || 'Not assigned'}</p>
            </div>
            <div className="rounded-xl bg-white p-4 shadow">
              <p className="text-sm text-gray-500">Registration</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">{transportData?.reg_number || '-'}</p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow">
            <h3 className="mb-3 font-semibold text-gray-900">Route Details</h3>
            <p className="text-sm text-gray-700">
              <span className="font-medium">From:</span> {transportData?.route_start || '-'}{' '}
              <span className="mx-2">|</span>
              <span className="font-medium">To:</span> {transportData?.route_end || '-'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(transportData?.stops || []).map((stop, idx) => (
                <span key={`${stop.id || idx}`} className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
                  {stop.stop_name || stop.stop || `Stop ${idx + 1}`}
                </span>
              ))}
              {(transportData?.stops || []).length === 0 && (
                <span className="text-sm text-gray-500">No stops available</span>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white shadow overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">My Transport Attendance (This Month)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Morning</th>
                    <th className="px-4 py-3">Evening</th>
                  </tr>
                </thead>
                <tbody>
                  {ownAttendanceHistory.map((item, idx) => (
                    <tr key={`${item.date || idx}`} className="border-t">
                      <td className="px-4 py-3 text-sm text-gray-700">{item.date || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {item.morning?.status || 'Not Marked'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {item.evening?.status || 'Not Marked'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {ownAttendanceHistory.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-sm text-gray-500">
                        No attendance records available for this month.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
