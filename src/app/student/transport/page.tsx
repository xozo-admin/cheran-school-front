// app/student/transport/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FaBus, 
  FaMapMarkerAlt, 
  FaClock, 
  FaUserTie,
  FaCalendarAlt,
  FaHistory,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaRoute,
  FaIdCard,
  FaPhone,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaMapMarkedAlt,
  FaStreetView,
  FaWifi,
  FaLayerGroup,
  FaExpand,
  FaCompress,
  FaBell
} from 'react-icons/fa';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { transportLiveApi } from '@/lib/transport-live-api';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline, TileLayer as LeafletTileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// TypeScript Interfaces
interface BusStop {
  id: number;
  stop_name: string;
  order_number: number;
  arrival_time: string;
  latitude: number;
  longitude: number;
}

interface MyBusResponse {
  status: number;
  bus_number: string;
  reg_number: string;
  route_id: number;
  driver_name: string;
  driver_phone?: string;
  route_start: string;
  route_end: string;
  stops: BusStop[];
}

interface AttendanceEntry {
  status: 'Present' | 'Absent' | 'Pending' | 'Not Marked';
  marked_by: string;
}

interface DateHistoryResponse {
  date: string;
  bus_number: string;
  history: {
    morning: AttendanceEntry;
    evening: AttendanceEntry;
  };
}

interface MonthHistoryDay {
  day: number;
  date: string;
  morning: AttendanceEntry;
  evening: AttendanceEntry;
}

interface MonthHistoryResponse {
  month: number;
  year: number;
  bus_number: string;
  allocated_at: string;
  history: MonthHistoryDay[];
  message?: string;
}

interface LocationUpdate {
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

interface ArrivalAlert {
  title: string;
  message: string;
  bus_number: string;
  stop_name: string;
  distance_km: number;
  threshold_km: number;
  timestamp: string;
}

const L = typeof window !== 'undefined' ? require('leaflet') : null;

if (L) {
  const DefaultIcon = L.icon({
    iconUrl: icon.src,
    shadowUrl: iconShadow.src,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
  L.Marker.prototype.options.icon = DefaultIcon;
}

const createBusIcon = () =>
  L?.divIcon({
    className: 'custom-bus-icon',
    html: `<div class="relative">
      <div class="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
        <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8H4v8zm3.5-6c.83 0 1.5.67 1.5 1.5S8.33 13 7.5 13 6 12.33 6 11.5 6.67 10 7.5 10zM19 8H5v1h14V8z"/>
        </svg>
      </div>
      <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
    </div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });

const createStopIcon = (orderNumber: number) => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-teal-500',
  ];
  const colorIndex = (orderNumber - 1) % colors.length;
  const bgColor = colors[colorIndex] || 'bg-blue-500';

  return L?.divIcon({
    className: 'custom-stop-icon',
    html: `<div class="relative group">
      <div class="w-8 h-8 ${bgColor} rounded-full flex items-center justify-center shadow-lg border-2 border-white">
        <span class="text-white text-xs font-bold">${orderNumber}</span>
      </div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Status Badge Component
const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Present':
        return { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: FaCheckCircle };
      case 'Absent':
        return { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: FaTimesCircle };
      case 'Pending':
        return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: FaHourglassHalf };
      case 'Not Marked':
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: FaExclamationTriangle };
      default:
        return { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: FaExclamationTriangle };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      <Icon className="text-xs" />
      {status}
    </span>
  );
};

export default function TransportPage() {
  const [loading, setLoading] = useState(true);
  const [myBus, setMyBus] = useState<MyBusResponse | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<DateHistoryResponse | null>(null);
  const [monthHistory, setMonthHistory] = useState<MonthHistoryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'tracking'>('overview');
  const [historyView, setHistoryView] = useState<'today' | 'month'>('today');
  const [currentLocation, setCurrentLocation] = useState<LocationUpdate | null>(null);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [nearestStop, setNearestStop] = useState<BusStop | null>(null);
  const [timeToArrival, setTimeToArrival] = useState<string | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [arrivalAlert, setArrivalAlert] = useState<ArrivalAlert | null>(null);

  const academicMonths = [
    'June', 'July', 'August', 'September', 'October', 'November',
    'December', 'January', 'February', 'March', 'April', 'May'
  ];
  const academicMonthNumbers = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

  const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (currentMonth >= 6) return `${currentYear}-${currentYear + 1}`;
    return `${currentYear - 1}-${currentYear}`;
  };

  const getAcademicYearRange = (academicYear: string) => {
    const [startYear, endYear] = academicYear.split('-').map(Number);
    return { startYear, endYear };
  };

  const getAcademicMonthName = (monthNumber: number, academicYear: string) => {
    const { startYear } = getAcademicYearRange(academicYear);
    if (monthNumber >= 6) return `${academicMonths[monthNumber - 6]} ${startYear}`;
    return `${academicMonths[monthNumber + 6]} ${startYear + 1}`;
  };

  const currentAcademicYear = getCurrentAcademicYear();
  const currentMonthNumber = new Date().getMonth() + 1;
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const busMarkerRef = useRef<LeafletMarker | null>(null);
  const stopMarkersRef = useRef<LeafletMarker[]>([]);
  const routePathRef = useRef<LeafletPolyline | null>(null);
  const trackingSocketRef = useRef<WebSocket | null>(null);
  const arrivalAlertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Calculate nearest stop based on current location
  const calculateNearestStop = useCallback((location: LocationUpdate) => {
    if (!myBus?.stops.length) return;

    let minDistance = Infinity;
    let nearest: BusStop | null = null;

    myBus.stops.forEach(stop => {
      const distance = calculateDistance(
        location.latitude,
        location.longitude,
        stop.latitude,
        stop.longitude
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = stop;
      }
    });

    if (nearest) {
      setNearestStop(nearest);
      
      // Calculate estimated time to arrival based on speed and distance
      if (location.speed > 0) {
        const distanceKm = minDistance;
        const speedKmh = location.speed;
        const timeHours = distanceKm / speedKmh;
        const timeMinutes = timeHours * 60;
        
        if (timeMinutes < 60) {
          setTimeToArrival(`${Math.round(timeMinutes)} minutes`);
        } else {
          setTimeToArrival(`${Math.round(timeMinutes / 60)} hour ${Math.round(timeMinutes % 60)} minutes`);
        }
      } else {
        // setTimeToArrion(null);
      }
    }
  }, [myBus]);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getApiErrorMessage = (error: any, fallback: string) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 403) return 'Access denied. You do not have permission to view transport details.';
    if (status === 404) return 'Transport details not found.';
    if (status === 500) return 'Server error. Please try again later.';
    if (error?.message === 'Network Error') return 'Network error. Please check your connection.';
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (typeof data === 'string') return data;

    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const value = (data as any)[firstKey];
        if (Array.isArray(value) && value.length > 0) return value[0];
        if (typeof value === 'string') return value;
      }
    }

    return fallback;
  };

  const resetMap = useCallback(() => {
    if (trackingSocketRef.current) {
      trackingSocketRef.current.close();
      trackingSocketRef.current = null;
    }
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    tileLayerRef.current = null;
    busMarkerRef.current = null;
    stopMarkersRef.current = [];
    routePathRef.current = null;
    setTrackingStatus('idle');
  }, []);

  const clearMapInstance = useCallback(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.remove();
      leafletMapRef.current = null;
    }
    tileLayerRef.current = null;
    busMarkerRef.current = null;
    stopMarkersRef.current = [];
    routePathRef.current = null;
  }, []);

  const applyTileLayer = useCallback((style: 'street' | 'satellite') => {
    if (!L || !leafletMapRef.current) return;

    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
      tileLayerRef.current = null;
    }

    if (style === 'satellite') {
      tileLayerRef.current = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution:
            'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 19,
        }
      );
    } else {
      tileLayerRef.current = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      });
    }

    const layer = tileLayerRef.current;
    if (!layer) return;
    layer.addTo(leafletMapRef.current);
  }, []);

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);

    if (showMap) {
      setShowMap(false);
      window.setTimeout(() => setShowMap(true), 30);
      return;
    }

    setShowMap(true);
    [100, 350, 700].forEach((delay) => {
      window.setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
          if (currentLocation) {
            leafletMapRef.current.setView(
              [currentLocation.latitude, currentLocation.longitude],
              leafletMapRef.current.getZoom()
            );
          }
        }
      }, delay);
    });
  };

  const initializeMap = useCallback(() => {
    if (!L || !mapRef.current || leafletMapRef.current || !myBus) return;

    const stopsWithCoords = (myBus.stops || []).filter(
      (stop) => typeof stop.latitude === 'number' && typeof stop.longitude === 'number'
    );
    const initialStop = stopsWithCoords[0];
    const defaultCenter = initialStop
      ? { lat: initialStop.latitude as number, lng: initialStop.longitude as number }
      : { lat: 13.0827, lng: 80.2707 };

    const map = L.map(mapRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([defaultCenter.lat, defaultCenter.lng], 13);

    leafletMapRef.current = map;
    applyTileLayer(mapStyle);

    if (stopsWithCoords.length) {
      stopsWithCoords.forEach((stop) => {
        const marker = L.marker([stop.latitude as number, stop.longitude as number], {
          icon: createStopIcon(stop.order_number),
        }).addTo(map);
        marker.bindPopup(`<div class="text-sm font-semibold">${stop.stop_name}</div>`);
        stopMarkersRef.current.push(marker);
      });

      if (stopsWithCoords.length > 1) {
        const latLngs = stopsWithCoords.map((stop) => [stop.latitude as number, stop.longitude as number]) as [number, number][];
        const polyline = L.polyline(latLngs, { color: '#3b82f6', weight: 3, opacity: 0.7 }).addTo(map);
        routePathRef.current = polyline;
      }
    }
  }, [applyTileLayer, mapStyle, myBus]);

  const updateBusMarker = useCallback((location: LocationUpdate) => {
    if (!L || !leafletMapRef.current) return;

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([location.latitude, location.longitude], {
        icon: createBusIcon(),
      }).addTo(leafletMapRef.current);
      const marker = busMarkerRef.current;
      if (!marker) return;
      marker.bindPopup(`<div class="text-sm font-semibold">Live Bus Location</div>`);
    } else {
      busMarkerRef.current.setLatLng([location.latitude, location.longitude]);
    }
  }, []);

  const connectLiveTracking = useCallback(() => {
    if (!myBus?.route_id) {
      setTrackingStatus('error');
      return;
    }

    if (trackingSocketRef.current) {
      trackingSocketRef.current.close();
    }

    setTrackingStatus('connecting');
    const wsUrl = transportLiveApi.websocket.trackUrl(myBus.route_id);
    const socket = new WebSocket(wsUrl);
    trackingSocketRef.current = socket;

    socket.onopen = () => {
      setTrackingStatus('connected');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'arrival_alert') {
          const nextAlert: ArrivalAlert = {
            title: payload.title || 'Bus arriving soon',
            message: payload.message || 'Your bus is close to your stop.',
            bus_number: payload.bus_number || myBus.bus_number,
            stop_name: payload.stop_name || 'your stop',
            distance_km: Number(payload.distance_km || 0),
            threshold_km: Number(payload.threshold_km || 1),
            timestamp: payload.timestamp || new Date().toISOString(),
          };

          setArrivalAlert(nextAlert);
          toastSuccess(nextAlert.message);

          if (arrivalAlertTimerRef.current) {
            clearTimeout(arrivalAlertTimerRef.current);
          }
          arrivalAlertTimerRef.current = setTimeout(() => {
            setArrivalAlert(null);
            arrivalAlertTimerRef.current = null;
          }, 20000);
          return;
        }

        if (
          payload.type === 'ws_ack' ||
          payload.type === 'ws_error' ||
          payload.latitude === undefined ||
          payload.longitude === undefined
        ) {
          return;
        }

        const nextLocation: LocationUpdate = {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed || 0,
          timestamp: payload.timestamp || new Date().toISOString(),
        };
        setCurrentLocation(nextLocation);
        updateBusMarker(nextLocation);
        calculateNearestStop(nextLocation);
        if (leafletMapRef.current) {
          leafletMapRef.current.panTo([nextLocation.latitude, nextLocation.longitude], { animate: true });
        }
      } catch (error) {
        console.error('Failed to parse live tracking data', error);
      }
    };

    socket.onerror = () => {
      setTrackingStatus('error');
    };

    socket.onclose = () => {
      setTrackingStatus((prev) => (prev === 'connected' ? 'error' : prev));
    };
  }, [calculateNearestStop, myBus, updateBusMarker]);

  // Fetch all transport data
  const fetchTransportData = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setPermissionDenied(false);

      // Fetch my bus info
      const busRes = await studentApi.transport.myBus();
      const busData = busRes.data?.data || busRes.data;
      setMyBus(busData);

      // Fetch today's attendance
      try {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayRes = await studentApi.transport.userHistory({ date: today });
        const todayData = todayRes.data?.data || todayRes.data;
        setTodayAttendance(todayData);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setTodayAttendance(null);
        } else if (error?.response?.status === 400) {
          // Handle pre-joining date
          setTodayAttendance(null);
        }
      }

      // Fetch month history
      try {
        const month = new Date().getMonth() + 1;
        const monthRes = await studentApi.transport.userHistory({ month });
        const monthData = monthRes.data?.data || monthRes.data;
        setMonthHistory(monthData);
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setMonthHistory(null);
        }
      }

    } catch (error: any) {
      console.error('Error fetching transport data:', error);
      const message = getApiErrorMessage(error, 'Failed to load transport information');
      if (error?.response?.status === 403) {
        setPermissionDenied(true);
      }
      if (error?.response?.status === 404) {
        setMyBus(null);
      }
      setErrorMessage(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransportData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'tracking') {
      if (trackingSocketRef.current) {
        trackingSocketRef.current.close();
        trackingSocketRef.current = null;
      }
      return;
    }

    if (showMap) {
      initializeMap();
      if (currentLocation) {
        updateBusMarker(currentLocation);
        leafletMapRef.current?.setView(
          [currentLocation.latitude, currentLocation.longitude],
          leafletMapRef.current?.getZoom() || 13
        );
      }
    }
    connectLiveTracking();

    return () => {
      if (trackingSocketRef.current) {
        trackingSocketRef.current.close();
        trackingSocketRef.current = null;
      }
    };
  }, [activeTab, connectLiveTracking, initializeMap, showMap, updateBusMarker]);

  useEffect(() => {
    applyTileLayer(mapStyle);
  }, [applyTileLayer, mapStyle]);

  useEffect(() => {
    if (!leafletMapRef.current) return;
    const timer = window.setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 120);
    return () => window.clearTimeout(timer);
  }, [isFullscreen]);

  useEffect(() => {
    if (!showMap) {
      clearMapInstance();
    }
  }, [clearMapInstance, showMap]);

  useEffect(() => {
    return () => {
      if (arrivalAlertTimerRef.current) {
        clearTimeout(arrivalAlertTimerRef.current);
        arrivalAlertTimerRef.current = null;
      }
      resetMap();
    };
  }, [resetMap]);

  // Handle date selection for attendance
  const handleDateChange = async (date: string) => {
    try {
      setSelectedDate(date);
      setHistoryError('');
      const response = await studentApi.transport.userHistory({ date });
      const data = response.data?.data || response.data;
      if (data?.history) {
        setTodayAttendance(data);
      } else {
        setTodayAttendance(null);
        if (data?.message) {
          setHistoryError(data.message);
          toastInfo(data.message);
        }
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setPermissionDenied(true);
        const message = getApiErrorMessage(error, 'Access denied.');
        setHistoryError(message);
        toastError(message);
        return;
      }
      if (error?.response?.status === 400) {
        const errorMsg = error.response.data?.message || 'Invalid date';
        setHistoryError(errorMsg);
        toastError(errorMsg);
      } else if (error?.response?.status === 404) {
        setTodayAttendance(null);
        const message = 'No attendance record for this date';
        setHistoryError(message);
        toastInfo(message);
      } else {
        const message = getApiErrorMessage(error, 'Failed to load attendance for this date.');
        setHistoryError(message);
        toastError(message);
      }
    }
  };

  // Handle month selection
  const handleMonthChange = async (month: number) => {
    try {
      setSelectedMonth(month);
      setHistoryError('');
      const response = await studentApi.transport.userHistory({ month });
      const data = response.data?.data || response.data;
      setMonthHistory(data);
    } catch (error: any) {
      if (error?.response?.status === 403) {
        setPermissionDenied(true);
        const message = getApiErrorMessage(error, 'Access denied.');
        setHistoryError(message);
        toastError(message);
        return;
      }
      if (error?.response?.status === 400) {
        const message = error.response.data?.error || 'Invalid month';
        setHistoryError(message);
        toastError(message);
      } else if (error?.response?.status === 404) {
        setMonthHistory(null);
        const message = 'No attendance records for this month';
        setHistoryError(message);
        toastInfo(message);
      } else {
        const message = getApiErrorMessage(error, 'Failed to load monthly attendance.');
        setHistoryError(message);
        toastError(message);
      }
    }
  };

  // Format time string
  const formatTimeString = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return format(date, 'h:mm a');
  };

  // Get arrival status for a stop
  const getStopArrivalStatus = (stop: BusStop) => {
    if (!currentLocation) return 'unknown';
    
    const now = new Date();
    const [hours, minutes] = stop.arrival_time.split(':');
    const stopTime = new Date();
    stopTime.setHours(parseInt(hours), parseInt(minutes), 0);
    
    const diffMinutes = differenceInMinutes(stopTime, now);
    
    if (diffMinutes < 0) return 'passed';
    if (diffMinutes < 5) return 'arriving';
    if (diffMinutes < 15) return 'near';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (permissionDenied) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-6">
                <FaExclamationTriangle className="text-4xl text-yellow-600 dark:text-yellow-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                You do not have permission to view transport details. Please contact your administrator.
              </p>
              <button
                onClick={fetchTransportData}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaSync /> Retry
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // No bus assigned state
  if (!myBus) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1 flex flex-col">
          <main className="flex-1 p-4 md:p-6">
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
                <FaBus className="text-4xl text-gray-400 dark:text-gray-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                No Bus Assigned
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">
                You haven't been assigned to any bus transport yet. Please contact the transport department for assistance.
              </p>
              <button
                onClick={fetchTransportData}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaSync /> Refresh
              </button>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 flex flex-col">
        <main className="flex-1 p-4 md:p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600">
              <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                    <FaBus className="text-2xl sm:text-3xl" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                      Bus Transport
                    </h1>
                    <p className="text-xs sm:text-sm text-blue-100">
                      {myBus ? `Bus ${myBus.bus_number} • ${myBus.reg_number} • ${myBus.route_start} → ${myBus.route_end}` : 'Track your assigned bus, route, and attendance history'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={fetchTransportData}
                    disabled={permissionDenied}
                    className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FaSync /> Refresh
                  </button>
                </div>
              </div>
            </div>

            {permissionDenied && (
              <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-yellow-600" />
                  <div>
                    <h4 className="font-bold text-gray-800">Permission Required</h4>
                    <p className="text-gray-700">You do not have access to transport details. Please contact your administrator.</p>
                  </div>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-600" />
                  <div>
                    <h4 className="font-bold text-gray-800">Error Loading Data</h4>
                    <p className="text-gray-700">{errorMessage}</p>
                  </div>
                  <button
                    onClick={fetchTransportData}
                    className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FaBus /> Overview
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'tracking'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FaMapMarkerAlt /> Live Tracking
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <FaHistory /> Attendance History
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Driver Info Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaUserTie className="text-blue-600" />
                  Driver Information
                </h2>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <FaUserTie className="text-2xl text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{myBus.driver_name}</h3>
                    {myBus.driver_phone && (
                      <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                        <FaPhone className="text-sm" /> {myBus.driver_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Route Overview Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaRoute className="text-blue-600" />
                    Route Overview
                  </h2>
                  <button
                    onClick={() => setShowRouteMap(!showRouteMap)}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                  >
                    {showRouteMap ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>

                {/* Route Map Placeholder */}
                {showRouteMap && (
                  <div className="mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                      <FaMapMarkedAlt className="text-4xl text-gray-400" />
                      <span className="ml-2 text-gray-500">Route Map Integration Here</span>
                    </div>
                  </div>
                )}

                {/* Stops List */}
                <div className="space-y-4">
                  {myBus.stops
                    .sort((a, b) => a.order_number - b.order_number)
                    .map((stop, index) => (
                      <div key={stop.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            index === 0 ? 'bg-green-100 text-green-600' :
                            index === myBus.stops.length - 1 ? 'bg-red-100 text-red-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {index + 1}
                          </div>
                          {index < myBus.stops.length - 1 && (
                            <div className="w-0.5 h-12 bg-gray-300 dark:bg-gray-600 my-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 dark:text-white">
                                {stop.stop_name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-1">
                                <FaClock className="text-xs" />
                                Arrival: {formatTimeString(stop.arrival_time)}
                              </p>
                            </div>
                            {stop.latitude && stop.longitude && (
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                <FaStreetView className="inline mr-1" />
                                Stop {stop.order_number}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Today's Attendance Preview */}
              {todayAttendance && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <FaCalendarAlt className="text-blue-600" />
                    Today's Attendance
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Morning</div>
                      <StatusBadge status={todayAttendance.history.morning.status} />
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Marked by: {todayAttendance.history.morning.marked_by}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Evening</div>
                      <StatusBadge status={todayAttendance.history.evening.status} />
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        Marked by: {todayAttendance.history.evening.marked_by}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Live Tracking Tab */}
          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg flex items-center justify-between ${
                trackingStatus === 'connected'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400'
                  : trackingStatus === 'connecting'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-400'
              }`}>
                <div className="flex items-center gap-2">
                  <FaWifi className="text-lg" />
                  <span>
                    {trackingStatus === 'connected'
                      ? 'Connected to live tracking'
                      : trackingStatus === 'connecting'
                      ? 'Connecting...'
                      : 'Disconnected from live tracking'}
                  </span>
                </div>
              </div>

              {arrivalAlert && (
                <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-lg dark:border-emerald-800 dark:bg-gray-800">
                  <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
                  <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-300">
                        <FaBell className="text-xl animate-pulse" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                          Bus arriving soon
                        </p>
                        <h3 className="mt-1 text-lg font-bold text-gray-900 dark:text-white">
                          {arrivalAlert.bus_number} is near {arrivalAlert.stop_name}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                          {arrivalAlert.message}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center dark:bg-emerald-900/20">
                        <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Distance</p>
                        <p className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-100">
                          {arrivalAlert.distance_km.toFixed(2)} km
                        </p>
                      </div>
                      <div className="rounded-lg bg-blue-50 px-3 py-2 text-center dark:bg-blue-900/20">
                        <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Alert range</p>
                        <p className="mt-1 text-base font-bold text-blue-900 dark:text-blue-100">
                          {arrivalAlert.threshold_km.toFixed(0)} km
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 ${isFullscreen ? 'fixed inset-0 z-[999] m-0 rounded-none overflow-hidden' : ''}`}>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaMapMarkerAlt className="text-red-600" />
                    Live Bus Location
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <button
                      onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      <FaLayerGroup />
                      {mapStyle === 'street' ? 'Satellite' : 'Street'}
                    </button>
                    <button
                      onClick={toggleFullscreen}
                      className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 flex items-center gap-2"
                    >
                      {isFullscreen ? <FaCompress /> : <FaExpand />}
                      {isFullscreen ? 'Exit' : 'Fullscreen'}
                    </button>
                  </div>
                </div>

                {myBus?.route_id ? (
                  <div className="w-full">
                    {showMap ? (
                      <div
                        ref={mapRef}
                        className={`w-full rounded-2xl border overflow-hidden ${isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[420px]'}`}
                      />
                    ) : (
                      <div className={`w-full rounded-2xl border overflow-hidden bg-gray-100/60 dark:bg-gray-800/40 ${isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[420px]'}`} />
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Live tracking is not available because route information is missing.
                  </p>
                )}

                {currentLocation && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Speed</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentLocation.speed.toFixed(1)} km/h
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Updated</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {format(parseISO(currentLocation.timestamp), 'h:mm:ss a')}
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</div>
                      <div className="text-xl font-bold text-gray-900 dark:text-white">
                        {currentLocation.speed > 0 ? 'Moving' : 'Stopped'}
                      </div>
                    </div>
                  </div>
                )}

                {nearestStop && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-medium text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <FaMapMarkerAlt /> Nearest Stop
                    </h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-blue-900 dark:text-blue-300 font-semibold">
                          {nearestStop.stop_name}
                        </p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          Scheduled: {formatTimeString(nearestStop.arrival_time)}
                        </p>
                      </div>
                      {timeToArrival && (
                        <div className="text-right">
                          <p className="text-sm text-blue-700 dark:text-blue-400">ETA</p>
                          <p className="text-lg font-bold text-blue-900 dark:text-blue-300">
                            {timeToArrival}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Upcoming Stops */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FaClock className="text-blue-600" />
                  Upcoming Stops
                </h2>
                <div className="space-y-3">
                  {myBus.stops
                    .sort((a, b) => a.order_number - b.order_number)
                    .map((stop) => {
                      const status = getStopArrivalStatus(stop);
                      return (
                        <div
                          key={stop.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            status === 'passed'
                              ? 'opacity-50'
                              : status === 'arriving'
                              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                              : status === 'near'
                              ? 'bg-yellow-50 dark:bg-yellow-900/20'
                              : 'bg-gray-50 dark:bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${
                              status === 'arriving'
                                ? 'bg-green-500 animate-pulse'
                                : status === 'near'
                                ? 'bg-yellow-500'
                                : status === 'passed'
                                ? 'bg-gray-400'
                                : 'bg-blue-500'
                            }`} />
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {stop.stop_name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {formatTimeString(stop.arrival_time)}
                              </p>
                            </div>
                          </div>
                          {status === 'arriving' && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full">
                              Arriving
                            </span>
                          )}
                          {status === 'near' && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs rounded-full">
                              Approaching
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              {/* History Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setHistoryView('today');
                        const today = format(new Date(), 'yyyy-MM-dd');
                        setSelectedDate(today);
                        handleDateChange(today);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        historyView === 'today'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        setHistoryView('month');
                        const currentMonth = new Date().getMonth() + 1;
                        setSelectedMonth(currentMonth);
                        handleMonthChange(currentMonth);
                      }}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        historyView === 'month'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Monthly
                    </button>
                  </div>

                  {historyView === 'month' && (
                    <div className="flex items-center gap-3">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Month
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => handleMonthChange(parseInt(e.target.value))}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                      {academicMonthNumbers
                        .filter((monthNum) => {
                          if (currentMonthNumber >= 6) {
                            return monthNum >= 6 && monthNum <= currentMonthNumber;
                          }
                          return monthNum >= 6 || monthNum <= currentMonthNumber;
                        })
                        .map((monthNum, index) => (
                          <option key={monthNum} value={monthNum}>
                            {academicMonths[academicMonthNumbers.indexOf(monthNum)]} {monthNum >= 6
                              ? getAcademicYearRange(currentAcademicYear).startYear
                              : getAcademicYearRange(currentAcademicYear).startYear + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {historyError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FaExclamationTriangle className="text-red-600" />
                    <div>
                      <h4 className="font-bold text-gray-800">Attendance Error</h4>
                      <p className="text-gray-700">{historyError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Single Day View */}
              {historyView === 'today' && todayAttendance && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Attendance for {format(parseISO(todayAttendance.date), 'MMMM d, yyyy')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">Morning Journey</h3>
                        <StatusBadge status={todayAttendance.history.morning.status} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Marked by: {todayAttendance.history.morning.marked_by}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">Evening Journey</h3>
                        <StatusBadge status={todayAttendance.history.evening.status} />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Marked by: {todayAttendance.history.evening.marked_by}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Month View */}
              {historyView === 'month' && monthHistory && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getAcademicMonthName(selectedMonth, currentAcademicYear)} Attendance
                    </h2>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Allocated from: {monthHistory.allocated_at ? format(parseISO(monthHistory.allocated_at), 'MMM d, yyyy') : 'N/A'}
                    </div>
                  </div>

                  {monthHistory.message ? (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">{monthHistory.message}</p>
                    </div>
                  ) : (
                    <>
                      {/* Month Stats */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        {(() => {
                          const present = monthHistory.history.filter(
                            day => day.morning.status === 'Present' || day.evening.status === 'Present'
                          ).length;
                          const absent = monthHistory.history.filter(
                            day => day.morning.status === 'Absent' || day.evening.status === 'Absent'
                          ).length;
                          const pending = monthHistory.history.filter(
                            day => day.morning.status === 'Pending' || day.evening.status === 'Pending'
                          ).length;
                          const notMarked = monthHistory.history.filter(
                            day => day.morning.status === 'Not Marked' || day.evening.status === 'Not Marked'
                          ).length;

                          return (
                            <>
                              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{present}</div>
                                <div className="text-sm text-green-700 dark:text-green-500">Present Days</div>
                              </div>
                              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{absent}</div>
                                <div className="text-sm text-red-700 dark:text-red-500">Absent Days</div>
                              </div>
                              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pending}</div>
                                <div className="text-sm text-yellow-700 dark:text-yellow-500">Pending</div>
                              </div>
                              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{notMarked}</div>
                                <div className="text-sm text-gray-700 dark:text-gray-500">Not Marked</div>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Month Calendar View */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900">
                              <th className="p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Day</th>
                              <th className="p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Date</th>
                              <th className="p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Morning</th>
                              <th className="p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Evening</th>
                              <th className="p-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">Marked By</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {monthHistory.history.map((day) => (
                              <tr key={day.date} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-gray-900 dark:text-white">
                                  {format(parseISO(day.date), 'EEEE')}
                                </td>
                                <td className="p-3 text-gray-900 dark:text-white">
                                  {format(parseISO(day.date), 'MMM d')}
                                </td>
                                <td className="p-3">
                                  <StatusBadge status={day.morning.status} />
                                </td>
                                <td className="p-3">
                                  <StatusBadge status={day.evening.status} />
                                </td>
                                <td className="p-3 text-sm text-gray-600 dark:text-gray-400">
                                  {day.morning.marked_by !== 'N/A' ? day.morning.marked_by : day.evening.marked_by}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* No History State */}
              {historyView === 'today' && !todayAttendance && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                  <FaHistory className="text-5xl text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Attendance Records
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No attendance record found for today.
                  </p>
                </div>
              )}
              {historyView === 'month' && !monthHistory && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
                  <FaHistory className="text-5xl text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    No Attendance Records
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    No attendance records found for the selected month.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Summary Statistics */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {myBus.stops.length}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Total Stops</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {myBus.bus_number}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Bus Number</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {myBus.route_id}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Route ID</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {todayAttendance?.history.morning.status === 'Present' ? 'Today' : '--'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">Today's Status</div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
