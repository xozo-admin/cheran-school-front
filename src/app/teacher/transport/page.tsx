'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaBus,
  FaRoute,
  FaUserTie,
  FaPhone,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaHistory,
  FaSync,
  FaMapMarkedAlt,
  FaWifi,
  FaExclamationCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaHourglassHalf,
  FaExclamationTriangle,
  FaExpand,
  FaCompress,
  FaLayerGroup,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { teacherApi } from '@/lib/api';
import { transportLiveApi } from '@/lib/transport-live-api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { format } from 'date-fns';
import type { Map as LeafletMap, Marker as LeafletMarker, Polyline as LeafletPolyline, TileLayer as LeafletTileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

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

interface LiveBusLocation {
  latitude: number;
  longitude: number;
  speed?: number;
  timestamp?: string;
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

const StatusBadge = ({ status }: { status: string }) => {
  const getStatusConfig = (value: string) => {
    switch (value) {
      case 'Present':
        return {
          color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
          icon: FaCheckCircle,
        };
      case 'Absent':
        return {
          color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
          icon: FaTimesCircle,
        };
      case 'Pending':
        return {
          color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
          icon: FaHourglassHalf,
        };
      case 'Not Marked':
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          icon: FaExclamationTriangle,
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
          icon: FaExclamationTriangle,
        };
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

export default function TeacherTransportPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [myBus, setMyBus] = useState<MyBusResponse | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<DateHistoryResponse | null>(null);
  const [monthHistory, setMonthHistory] = useState<MonthHistoryResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'tracking'>('overview');
  const [error, setError] = useState('');
  const [liveLocation, setLiveLocation] = useState<LiveBusLocation | null>(null);
  const [trackingStatus, setTrackingStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const busMarkerRef = useRef<LeafletMarker | null>(null);
  const stopMarkersRef = useRef<LeafletMarker[]>([]);
  const routePathRef = useRef<LeafletPolyline | null>(null);
  const trackingSocketRef = useRef<WebSocket | null>(null);

  const getBgClass = () =>
    combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'purple' = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(
        baseClasses,
        'bg-gradient-to-br',
        theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50'
      );
    }
    if (color === 'emerald') {
      return combine(
        baseClasses,
        'bg-gradient-to-br',
        theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50'
      );
    }
    if (color === 'amber') {
      return combine(
        baseClasses,
        'bg-gradient-to-br',
        theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50'
      );
    }
    if (color === 'purple') {
      return combine(
        baseClasses,
        'bg-gradient-to-br',
        theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50'
      );
    }
    return combine(baseClasses, get('bg', 'card'));
  };

  const getPrimaryButtonClass = () =>
    combine(
      'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
      'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
      'text-xs sm:text-sm',
      theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    );

  const getSecondaryButtonClass = () =>
    combine(
      'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
      'text-xs sm:text-sm',
      'border',
      get('border', 'secondary'),
      get('bg', 'card'),
      get('text', 'secondary'),
      'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
    );

  const fetchMyBus = useCallback(async () => {
    try {
      const response = await teacherApi.transport.myBus();
      setMyBus(response.data);
      setError('');
      return true;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'No transport allocation found.';
      setMyBus(null);
      setError(message);
      return false;
    }
  }, []);

  const fetchAttendanceByDate = useCallback(async (date: string) => {
    try {
      const response = await teacherApi.transport.userHistory({ date });
      setTodayAttendance(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to load attendance.';
      setTodayAttendance(null);
      toastError(message);
    }
  }, []);

  const fetchAttendanceByMonth = useCallback(async (month: number) => {
    try {
      const response = await teacherApi.transport.userHistory({ month });
      setMonthHistory(response.data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.detail || 'Failed to load monthly history.';
      setMonthHistory(null);
      toastError(message);
    }
  }, []);

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
    setLiveLocation(null);
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
          if (liveLocation) {
            leafletMapRef.current.setView(
              [liveLocation.latitude, liveLocation.longitude],
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

  const updateBusMarker = useCallback((location: LiveBusLocation) => {
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
        const nextLocation: LiveBusLocation = {
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          timestamp: payload.timestamp,
        };
        setLiveLocation(nextLocation);
        updateBusMarker(nextLocation);
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
  }, [myBus, updateBusMarker]);

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    const ok = await fetchMyBus();
    if (ok) {
      toastSuccess('Transport details refreshed.');
    } else {
      toastInfo('No transport allocation found.');
    }
    await fetchAttendanceByDate(selectedDate);
    await fetchAttendanceByMonth(selectedMonth);
    setLoading(false);
  }, [fetchMyBus, fetchAttendanceByDate, fetchAttendanceByMonth, selectedDate, selectedMonth]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchMyBus();
      await fetchAttendanceByDate(selectedDate);
      await fetchAttendanceByMonth(selectedMonth);
      setLoading(false);
    };
    load();
  }, [fetchMyBus, fetchAttendanceByDate, fetchAttendanceByMonth]);

  useEffect(() => {
    fetchAttendanceByDate(selectedDate);
  }, [selectedDate, fetchAttendanceByDate]);

  useEffect(() => {
    fetchAttendanceByMonth(selectedMonth);
  }, [selectedMonth, fetchAttendanceByMonth]);

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
      if (liveLocation) {
        updateBusMarker(liveLocation);
        leafletMapRef.current?.setView(
          [liveLocation.latitude, liveLocation.longitude],
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
  }, [activeTab, connectLiveTracking, initializeMap, liveLocation, showMap, updateBusMarker]);

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
      resetMap();
    };
  }, [resetMap]);

  const monthOptions = useMemo(
    () => [
      { value: 1, label: 'January' },
      { value: 2, label: 'February' },
      { value: 3, label: 'March' },
      { value: 4, label: 'April' },
      { value: 5, label: 'May' },
      { value: 6, label: 'June' },
      { value: 7, label: 'July' },
      { value: 8, label: 'August' },
      { value: 9, label: 'September' },
      { value: 10, label: 'October' },
      { value: 11, label: 'November' },
      { value: 12, label: 'December' },
    ],
    []
  );

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()}`}>
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-700 to-blue-800'
              : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBus className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Transport Overview</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    View your assigned bus details, driver info, and attendance history.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Bus</div>
                  <div className="text-sm sm:text-base font-bold">
                    {myBus?.bus_number || 'Not assigned'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Route</div>
                  <div className="text-sm sm:text-base font-bold">
                    {myBus ? `${myBus.route_start} → ${myBus.route_end}` : 'Not assigned'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Stops</div>
                  <div className="text-sm sm:text-base font-bold">
                    {myBus?.stops?.length ?? 0}
                  </div>
                </div>
                <button
                  className={combine(getPrimaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2 font-bold')}
                  onClick={handleRefresh}
                >
                  <FaSync /> Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            className={activeTab === 'overview' ? getPrimaryButtonClass() : getSecondaryButtonClass()}
            onClick={() => setActiveTab('overview')}
          >
            <FaBus className="inline-block mr-2" />
            Overview
          </button>
          <button
            className={activeTab === 'history' ? getPrimaryButtonClass() : getSecondaryButtonClass()}
            onClick={() => setActiveTab('history')}
          >
            <FaHistory className="inline-block mr-2" />
            Attendance History
          </button>
          <button
            className={activeTab === 'tracking' ? getPrimaryButtonClass() : getSecondaryButtonClass()}
            onClick={() => setActiveTab('tracking')}
          >
            <FaMapMarkedAlt className="inline-block mr-2" />
            Live Tracking
          </button>
        </div>

        {loading && (
          <div className={getCardGradientClass('amber')}>
            <p className={combine('text-sm', get('text', 'secondary'))}>Loading transport data...</p>
          </div>
        )}

        {!loading && error && (
          <div className={getCardGradientClass('amber')}>
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-amber-500" />
              <div>
                <p className={combine('font-semibold', get('text', 'primary'))}>No Transport Allocation</p>
                <p className={combine('text-sm', get('text', 'secondary'))}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className={combine(getCardGradientClass('blue'), 'xl:col-span-2')}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FaBus className="text-blue-500" />
                  <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Bus Details</h2>
                </div>
              </div>

              {myBus ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Bus Number</p>
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.bus_number}</p>
                  </div>
                  <div>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Registration</p>
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.reg_number}</p>
                  </div>
                  <div>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Route</p>
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.route_start} → {myBus.route_end}</p>
                  </div>
                  <div>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Route ID</p>
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.route_id}</p>
                  </div>
                </div>
              ) : (
                <p className={combine('text-sm', get('text', 'secondary'))}>No bus details available.</p>
              )}
            </div>

            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center gap-2 mb-4">
                <FaUserTie className="text-emerald-500" />
                <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Driver</h2>
              </div>

              {myBus ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Driver Name</p>
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.driver_name || 'Not assigned'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <FaPhone className="text-emerald-500" />
                    <p className={combine('font-semibold', get('text', 'primary'))}>{myBus.driver_phone || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <p className={combine('text-sm', get('text', 'secondary'))}>No driver details available.</p>
              )}
            </div>

            <div className={combine(getCardGradientClass('purple'), 'xl:col-span-2')}>
              <div className="flex items-center gap-2 mb-4">
                <FaRoute className="text-purple-500" />
                <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Stops</h2>
              </div>
              {myBus?.stops?.length ? (
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border-primary)' }}>
                  <table className="w-full text-sm">
                    <thead className={combine(get('bg', 'secondary'), 'text-left')}>
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Stop</th>
                        <th className="px-3 py-2">Arrival</th>
                      </tr>
                    </thead>
                    <tbody className={get('bg', 'card')}>
                      {myBus.stops.map((stop) => (
                        <tr key={stop.id} className="border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
                          <td className="px-3 py-2">{stop.order_number}</td>
                          <td className="px-3 py-2 flex items-center gap-2">
                            <FaMapMarkerAlt className="text-purple-500" />
                            {stop.stop_name}
                          </td>
                          <td className="px-3 py-2">{stop.arrival_time?.slice(0, 5)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={combine('text-sm', get('text', 'secondary'))}>No stops configured.</p>
              )}
            </div>

            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center gap-2 mb-4">
                <FaCalendarAlt className="text-amber-500" />
                <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Today Attendance</h2>
              </div>
              {todayAttendance ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={combine(get('text', 'secondary'))}>Morning</span>
                    <StatusBadge status={todayAttendance.history.morning?.status || 'Not Marked'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={combine(get('text', 'secondary'))}>Evening</span>
                    <StatusBadge status={todayAttendance.history.evening?.status || 'Not Marked'} />
                  </div>
                </div>
              ) : (
                <p className={combine('text-sm', get('text', 'secondary'))}>Attendance not available.</p>
              )}
            </div>
          </div>
        )}

        {!loading && activeTab === 'history' && (
          <div className="space-y-6">
            <div className={getCardGradientClass('blue')}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-blue-500" />
                  <label className={combine('text-sm font-medium', get('text', 'secondary'))}>Select Date</label>
                </div>
                <input
                  type="date"
                  className={combine(
                    'px-3 py-2 rounded-lg border text-sm',
                    get('bg', 'card'),
                    get('border', 'primary'),
                    get('text', 'primary')
                  )}
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                />
              </div>

              {todayAttendance ? (
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className={combine('p-3 rounded-lg border', get('border', 'primary'), get('bg', 'card'))}>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Morning</p>
                    <div className="mt-2">
                      <StatusBadge status={todayAttendance.history.morning?.status || 'Not Marked'} />
                    </div>
                  </div>
                  <div className={combine('p-3 rounded-lg border', get('border', 'primary'), get('bg', 'card'))}>
                    <p className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Evening</p>
                    <div className="mt-2">
                      <StatusBadge status={todayAttendance.history.evening?.status || 'Not Marked'} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className={combine('text-sm mt-4', get('text', 'secondary'))}>No attendance found for this date.</p>
              )}
            </div>

            <div className={getCardGradientClass('emerald')}>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <FaHistory className="text-emerald-500" />
                  <label className={combine('text-sm font-medium', get('text', 'secondary'))}>Monthly History</label>
                </div>
                <select
                  className={combine(
                    'px-3 py-2 rounded-lg border text-sm',
                    get('bg', 'card'),
                    get('border', 'primary'),
                    get('text', 'primary')
                  )}
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(Number(event.target.value))}
                >
                  {monthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border" style={{ borderColor: 'var(--color-border-primary)' }}>
                <table className="w-full text-sm">
                  <thead className={combine(get('bg', 'secondary'), 'text-left')}>
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Morning</th>
                      <th className="px-3 py-2">Evening</th>
                    </tr>
                  </thead>
                  <tbody className={get('bg', 'card')}>
                    {monthHistory?.history?.length ? (
                      monthHistory.history.map((entry) => (
                        <tr key={entry.date} className="border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
                          <td className="px-3 py-2">{entry.date}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={entry.morning?.status || 'Not Marked'} />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={entry.evening?.status || 'Not Marked'} />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="px-3 py-4" colSpan={3}>
                          <p className={combine('text-sm', get('text', 'secondary'))}>No history for this month.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && activeTab === 'tracking' && (
          <div className="space-y-6">
            <div className={combine(
              getCardGradientClass('blue'),
              isFullscreen ? 'fixed inset-0 z-[999] m-0 rounded-none overflow-hidden' : ''
            )}>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <FaWifi className="text-blue-500" />
                  <h2 className={combine('text-lg font-semibold', get('text', 'primary'))}>Live Bus Tracking</h2>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <button
                    onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                    className={combine(getSecondaryButtonClass(), 'px-2.5 sm:px-3 py-1')}
                    title={`Switch to ${mapStyle === 'street' ? 'Satellite' : 'Street'} view`}
                  >
                    <FaLayerGroup className="mr-1" />
                    {mapStyle === 'street' ? 'Satellite' : 'Street'}
                  </button>
                  <button
                    onClick={toggleFullscreen}
                    className={combine(getSecondaryButtonClass(), 'px-2.5 sm:px-3 py-1')}
                    title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  >
                    {isFullscreen ? <FaCompress className="mr-1" /> : <FaExpand className="mr-1" />}
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                  </button>
                  {trackingStatus === 'connected' && (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <FaCheckCircle />
                      Connected
                    </span>
                  )}
                  {trackingStatus === 'connecting' && (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <FaHourglassHalf />
                      Connecting
                    </span>
                  )}
                  {trackingStatus === 'error' && (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <FaExclamationCircle />
                      Offline
                    </span>
                  )}
                  {trackingStatus === 'idle' && (
                    <span className="inline-flex items-center gap-1 text-gray-500">
                      <FaExclamationTriangle />
                      Idle
                    </span>
                  )}
                </div>
              </div>

              {!myBus?.route_id && (
                <p className={combine('text-sm mt-4', get('text', 'secondary'))}>
                  Live tracking is not available because route information is missing.
                </p>
              )}

              {myBus?.route_id && (
                <div className={combine('mt-4 grid grid-cols-1 gap-4', isFullscreen ? 'h-full' : '')}>
                  <div className="w-full">
                    {showMap ? (
                      <div className="relative">
                        <div
                          ref={mapRef}
                          className={combine(
                            'w-full rounded-2xl border overflow-hidden',
                            isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[420px]'
                          )}
                          style={{ borderColor: 'var(--color-border-primary)' }}
                        />
                      </div>
                    ) : (
                      <div
                        className={combine(
                          'w-full rounded-2xl border overflow-hidden bg-gray-100/60 dark:bg-gray-800/40',
                          isFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[420px]'
                        )}
                        style={{ borderColor: 'var(--color-border-primary)' }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
