// app/admin/transport/live/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FaBus,
  FaMapMarkerAlt,
  FaRoute,
  FaClock,
  FaSearch,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaUserTie,
  FaSatelliteDish,
  FaWifi,
  FaLocationArrow,
  FaRoad,
  FaStopwatch,
  FaBatteryThreeQuarters,
  FaSignal,
  FaEye,
  FaEyeSlash,
  FaDownload,
  FaPrint,
  FaHistory,
  FaChartLine,
  FaMapMarkedAlt,
  FaChevronLeft,
  FaChevronRight,
  FaExpand,
  FaCompress,
  FaLayerGroup,
  FaStreetView,
  FaGlobe,
  FaUsers,
  FaPlay,
  FaStop,
  FaArrowRight,
  FaCrosshairs,
  FaMinus,
  FaPlus,
  FaLayerGroup as FaLayers,
} from 'react-icons/fa';
import { adminApi } from '@/lib/api';
import { transportLiveApi } from '@/lib/transport-live-api';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Types
interface Bus {
  id: number;
  bus_number: string;
  registration: string;
  capacity: number | null;
  occupied: number;
  driver: string;
  driver_id?: string;
  driver_contact?: string;
  route: string;
  route_id?: number;
  start_location?: string;
  end_location?: string;
  morning_start_location?: string;
  morning_end_location?: string;
  evening_start_location?: string;
  evening_end_location?: string;
  status: 'active' | 'inactive' | 'stopped';
  current_location?: {
    latitude: number;
    longitude: number;
    last_updated: string;
    speed?: number;
  };
  stops?: Stop[];
  is_live?: boolean;
}

interface Stop {
  id: number;
  trip_type?: string;
  stop_name: string;
  order_number: number;
  arrival_time: string;
  latitude?: number | null;
  longitude?: number | null;
}

interface BusLocation {
  bus_number: string;
  route_id: number;
  bus_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  driver_name?: string;
}

interface AdminLiveBusLocation {
  bus_id: number;
  bus_number: string;
  route_id: number;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
  driver_name?: string;
}

// Fix for default Leaflet icon
let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom bus icon
const createBusIcon = (isActive: boolean = true, colorHex?: string) => {
  const bgClass = colorHex
    ? ''
    : (isActive ? 'bg-gradient-to-br from-purple-500 to-purple-700' : 'bg-gradient-to-br from-gray-500 to-gray-700');
  const bgStyle = colorHex ? `style="background:${colorHex};"` : '';

  return L.divIcon({
    className: 'custom-bus-icon',
    html: `<div class="relative">
      <div class="w-12 h-12 ${bgClass} rounded-full flex items-center justify-center shadow-2xl border-2 border-white" ${bgStyle}>
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
};

// Custom stop icon
const createStopIcon = (orderNumber: number, isActive: boolean = false, colorHex?: string) => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 
    'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
  ];
  const colorIndex = (orderNumber - 1) % colors.length;
  const bgColor = colorHex ? '' : (isActive ? 'bg-purple-500' : colors[colorIndex]);
  const bgStyle = colorHex ? `style="background:${colorHex};"` : '';
  
  return L.divIcon({
    className: 'custom-stop-icon',
    html: `<div class="relative group">
      <div class="w-8 h-8 ${bgColor} rounded-full flex items-center justify-center shadow-lg border-2 border-white transform transition-transform group-hover:scale-110" ${bgStyle}>
        <span class="text-white text-xs font-bold">${orderNumber}</span>
      </div>
      ${isActive ? '<div class="absolute -inset-1 bg-purple-400 rounded-full animate-ping opacity-50"></div>' : ''}
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Custom user location icon
const createUserIcon = () => {
  return L.divIcon({
    className: 'custom-user-icon',
    html: `<div class="relative">
      <div class="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
      <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

export default function LiveTrackingPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'transport_live_school_scope' });
  
  // Refs
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const stopMarkersRef = useRef<L.Marker[]>([]);
  const routePathRef = useRef<L.Polyline | null>(null);
  const allBusRoutePathsRef = useRef<Record<string, L.Polyline>>({});
  const allBusStopMarkersRef = useRef<Record<string, L.Marker>>({});
  const trackingSocketRef = useRef<WebSocket | null>(null);
  const singleBusSnapshotIntervalRef = useRef<number | null>(null);
  const adminLiveSocketRef = useRef<WebSocket | null>(null);
  const adminLiveSocketEnabledRef = useRef(false);
  const trackingBusRef = useRef<Bus | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const allBusMarkersRef = useRef<Record<string, L.Marker>>({});
  
  // State
  const [loading, setLoading] = useState(true);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [trackingBus, setTrackingBus] = useState<Bus | null>(null);
  const [busLocation, setBusLocation] = useState<BusLocation | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'live'>('all');
  const [showMap, setShowMap] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);
  const [mapCenter, setMapCenter] = useState({ lat: 13.0827, lng: 80.2707 }); // Default to Chennai
  const [historyView, setHistoryView] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [showStops, setShowStops] = useState(true);
  const [stops, setStops] = useState<Stop[]>([]);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isAdminLiveConnected, setIsAdminLiveConnected] = useState(false);
  const [activeBusIds, setActiveBusIds] = useState<Set<number>>(new Set());
  const [allLiveBusLocations, setAllLiveBusLocations] = useState<Record<string, AdminLiveBusLocation>>({});
  const [isTrackAllEnabled, setIsTrackAllEnabled] = useState(false);
  const [trackAllExcludedBusIds, setTrackAllExcludedBusIds] = useState<Set<number>>(new Set());
  const [mapReady, setMapReady] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const activeTrip: 'Morning' | 'Evening' = now.getHours() < 12 ? 'Morning' : 'Evening';

  const parseCoordinate = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const getLiveBusKey = (item: { bus_id?: number; bus_number?: string; route_id?: number }) => {
    const id = Number(item?.bus_id);
    if (Number.isFinite(id) && id > 0) return `bus-${id}`;

    const routeId = Number(item?.route_id);
    const busNumber = String(item?.bus_number || '').trim();
    if (Number.isFinite(routeId) && routeId > 0 && busNumber) return `route-${routeId}-${busNumber}`;
    if (busNumber) return `bus-number-${busNumber}`;
    if (Number.isFinite(routeId) && routeId > 0) return `route-${routeId}`;
    return '';
  };

  const getRouteStops = (bus: Bus | null | undefined) => (
    (bus?.stops || [])
      .slice()
      .sort((a, b) => {
        const tripOrder = String(a.trip_type || '').localeCompare(String(b.trip_type || ''));
        if (tripOrder !== 0) return tripOrder;
        return a.order_number - b.order_number;
      })
  );

  const getTripStops = (bus: Bus | null | undefined, trip: 'Morning' | 'Evening' = activeTrip) => (
    getRouteStops(bus).filter((stop) => String(stop.trip_type || trip) === trip)
  );

  const getValidTripStops = (bus: Bus | null | undefined, trip: 'Morning' | 'Evening' = activeTrip) => (
    getTripStops(bus, trip).filter((stop) => {
      const lat = parseCoordinate(stop.latitude);
      const lng = parseCoordinate(stop.longitude);
      return lat !== null && lng !== null;
    })
  );

  const getStopsByTrip = (bus: Bus | null | undefined) => {
    const stopsByTrip: Record<string, Stop[]> = {};
    getRouteStops(bus).forEach((stop) => {
      const trip = stop.trip_type || 'Route';
      stopsByTrip[trip] = stopsByTrip[trip] || [];
      stopsByTrip[trip].push(stop);
    });
    return stopsByTrip;
  };

  const getRouteLabel = (bus: Bus, trip: 'Morning' | 'Evening') => {
    const start = trip === 'Morning'
      ? (bus.morning_start_location || bus.start_location)
      : (bus.evening_start_location || bus.end_location);
    const end = trip === 'Morning'
      ? (bus.morning_end_location || bus.end_location)
      : (bus.evening_end_location || bus.start_location);

    if (start && end) return `${start} → ${end}`;
    if (start) return `${start} → End not set`;
    if (end) return `Start not set → ${end}`;
    return '';
  };

  const fitMapToPoints = (points: [number, number][], maxZoom = 16) => {
    if (!leafletMapRef.current || points.length === 0) return;

    if (points.length === 1) {
      leafletMapRef.current.setView(points[0], Math.max(leafletMapRef.current.getZoom(), maxZoom));
      return;
    }

    leafletMapRef.current.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom });
  };

  const getTrackAllBusColor = (busId?: number, busKey?: string) => {
    const numericId = Number(busId);
    const seed = Number.isFinite(numericId) && numericId > 0
      ? numericId
      : String(busKey || '')
          .split('')
          .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const hue = (Math.abs(seed) * 47) % 360;
    return `hsl(${hue} 70% 50%)`;
  };

  const updateBusStatesFromLiveData = (liveDataByBusId: Map<number, AdminLiveBusLocation>, activeIds: Set<number>) => {
    setBuses((prev) =>
      prev.map((bus) => {
        const liveData = liveDataByBusId.get(bus.id);
        const isLive = activeIds.has(bus.id);
        if (!liveData) {
          return {
            ...bus,
            is_live: isLive,
            status: isLive ? 'active' : 'inactive',
          };
        }

        return {
          ...bus,
          is_live: true,
          status: 'active',
          current_location: {
            latitude: liveData.latitude,
            longitude: liveData.longitude,
            speed: liveData.speed,
            last_updated: liveData.timestamp,
          },
        };
      })
    );
  };

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(interval);
  }, []);


  // Get user location
  const getUserLocation = () => {
    if (navigator.geolocation) {
      toastInfo('Getting your location...');
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          setShowUserLocation(true);
          
          toastSuccess('Location found!');
          
          // Center map on user location
          if (leafletMapRef.current) {
            leafletMapRef.current.setView([latitude, longitude], 15);
          }
          
          // Add user marker to map
          if (leafletMapRef.current) {
            if (userMarkerRef.current) {
              userMarkerRef.current.remove();
            }
            
            userMarkerRef.current = L.marker([latitude, longitude], {
              icon: createUserIcon()
            }).addTo(leafletMapRef.current)
              // .bindPopup('You are here!', { className: 'transport-map-popup' })
              // .openPopup();
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          toastError('Could not get your location. Please enable location services.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      toastError('Geolocation is not supported by your browser');
    }
  };

  // Clear stop markers from map
  const clearStopMarkers = () => {
    if (stopMarkersRef.current.length > 0) {
      stopMarkersRef.current.forEach(marker => marker.remove());
      stopMarkersRef.current = [];
    }
  };

  // Add stop markers to map
  const addStopMarkers = (stops: Stop[]) => {
    if (!leafletMapRef.current || !stops.length) return;

    clearStopMarkers();

    const validStops = stops.filter(stop => 
      stop.latitude !== null && 
      stop.latitude !== undefined && 
      stop.longitude !== null && 
      stop.longitude !== undefined &&
      !isNaN(Number(stop.latitude)) &&
      !isNaN(Number(stop.longitude))
    );

    if (validStops.length === 0) {
      console.log('No valid stop coordinates found');
      return;
    }

    validStops.forEach((stop) => {
      const lat = Number(stop.latitude);
      const lng = Number(stop.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = L.marker([lat, lng], {
        icon: createStopIcon(stop.order_number, false)
      }).addTo(leafletMapRef.current!);

      const popupContent = `
        <div class="p-3 min-w-[200px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div class="flex items-center gap-2 mb-2">
            <div class="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              ${stop.order_number}
            </div>
            <div class="font-bold text-gray-900 dark:text-white">${stop.stop_name}</div>
          </div>
          <div class="space-y-1 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Arrival:</span>
              <span class="font-semibold text-blue-600 dark:text-blue-400">${stop.arrival_time}</span>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, { className: 'transport-map-popup' });
      stopMarkersRef.current.push(marker);
    });

    if (routePathRef.current) {
      routePathRef.current.remove();
      routePathRef.current = null;
    }
    if (validStops.length >= 2) {
      routePathRef.current = L.polyline(
        validStops.map((stop) => [Number(stop.latitude), Number(stop.longitude)] as [number, number]),
        {
          color: '#2563eb',
          weight: 5,
          opacity: 0.85,
          dashArray: '10 8',
          lineJoin: 'round',
        }
      ).addTo(leafletMapRef.current);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);

    // Leaflet can render blank when container size changes on fullscreen enter/exit.
    // Remount once on toggle so it starts with correct dimensions.
    if (showMap) {
      setShowMap(false);
      setTimeout(() => setShowMap(true), 30);
      return;
    }

    setShowMap(true);
    [100, 350, 700].forEach((delay) => {
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();

          if (busLocation) {
            leafletMapRef.current.setView(
              [busLocation.latitude, busLocation.longitude],
              leafletMapRef.current.getZoom()
            );
          }
        }
      }, delay);
    });
  };

  // Recalculate map size after fullscreen changes
  useEffect(() => {
    if (leafletMapRef.current) {
      const timeouts = [300, 600].map(delay => 
        setTimeout(() => {
          if (leafletMapRef.current) {
            leafletMapRef.current.invalidateSize();
          }
        }, delay)
      );
      
      return () => timeouts.forEach(clearTimeout);
    }
  }, [isFullscreen, showMap, mapType, trackingBus]);

  // Initialize map - REMOVED DEFAULT MARKER
  useEffect(() => {
    if (showMap && mapRef.current && !leafletMapRef.current) {
      leafletMapRef.current = L.map(mapRef.current, {
        minZoom: 3,
        maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
        maxBoundsViscosity: 1.0,
        worldCopyJump: true,
        fadeAnimation: true,
        zoomAnimation: true,
        markerZoomAnimation: true
      }).setView([mapCenter.lat, mapCenter.lng], mapZoom);

      const getTileLayer = () => {
        if (mapType === 'satellite') {
          return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        }
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      };

      const getAttribution = () => {
        if (mapType === 'satellite') {
          return 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
        }
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      };

      L.tileLayer(getTileLayer(), {
        attribution: getAttribution(),
        maxZoom: 19,
        minZoom: 3,
        bounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
      }).addTo(leafletMapRef.current);

      L.control.scale({ imperial: false, metric: true }).addTo(leafletMapRef.current);

      L.control.zoom({
        position: 'bottomright'
      }).addTo(leafletMapRef.current);

      // NO DEFAULT MARKER ADDED HERE
      
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 300);
      setMapReady(true);
    }

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
      setMapReady(false);
    };
  }, [showMap, theme, mapType]);

  // Update map when bus location changes (stationary bus)
  useEffect(() => {
    if (leafletMapRef.current && busLocation) {
      const { latitude, longitude } = busLocation;
      
      if (markerRef.current) {
        markerRef.current.remove();
      }

      markerRef.current = L.marker([latitude, longitude], {
        icon: createBusIcon(true)
      }).addTo(leafletMapRef.current);

      markerRef.current.bindPopup(`
        <div class="p-4 min-w-[250px] bg-gradient-to-br from-purple-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8H4v8zm3.5-6c.83 0 1.5.67 1.5 1.5S8.33 13 7.5 13 6 12.33 6 11.5 6.67 10 7.5 10zM19 8H5v1h14V8z"/>
              </svg>
            </div>
            <div class="font-bold text-lg text-gray-900 dark:text-white">Bus ${busLocation.bus_number}</div>
          </div>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Speed:</span>
              <span class="font-semibold text-purple-600 dark:text-purple-400">${busLocation.speed.toFixed(1)} km/h</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Last updated:</span>
              <span class="font-semibold">${new Date(busLocation.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-600 dark:text-gray-400">Driver:</span>
              <span class="font-semibold">${busLocation.driver_name || 'Unknown'}</span>
            </div>
          </div>
        </div>
      `, { className: 'transport-map-popup' });
      
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 300);
    }
  }, [busLocation, theme, mapReady]);

  // Update map theme when theme changes
  useEffect(() => {
    if (leafletMapRef.current) {
      leafletMapRef.current.invalidateSize();
    }
  }, [theme]);

  // Update stops display
  useEffect(() => {
    if (leafletMapRef.current) {
      if (showStops && stops.length > 0) {
        addStopMarkers(stops);
      } else {
        clearStopMarkers();
        if (routePathRef.current) {
          routePathRef.current.remove();
          routePathRef.current = null;
        }
      }
      
      setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 300);
    }
  }, [showStops, stops, theme, mapReady, activeTrip]);

  useEffect(() => {
    if (!trackingBus) return;
    setStops(getTripStops(trackingBus, activeTrip));
  }, [trackingBus, activeTrip]);

  // Show all active buses on map via websocket/API polling (without affecting single-bus tracking flow).
  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;

    const locationEntries = Object.entries(allLiveBusLocations).filter(
      ([, item]) => !(item.bus_id && trackAllExcludedBusIds.has(item.bus_id))
    );
    const nextKeys = new Set(locationEntries.map(([key]) => key));
    const nextStopKeys = new Set<string>();

    Object.entries(allBusMarkersRef.current).forEach(([busKey, marker]) => {
      if (!nextKeys.has(busKey)) {
        marker.remove();
        delete allBusMarkersRef.current[busKey];
      }
    });

    locationEntries.forEach(([busKey, item]) => {
      const position: [number, number] = [item.latitude, item.longitude];
      const popupHtml = `
        <div class="p-3 min-w-[210px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          <div class="font-bold text-gray-900 dark:text-white mb-1">Bus ${item.bus_number}</div>
          <div class="text-sm text-gray-700 dark:text-gray-200">Driver: ${item.driver_name || 'Unknown'}</div>
          <div class="text-sm text-gray-700 dark:text-gray-200">Speed: ${Number(item.speed || 0).toFixed(1)} km/h</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">${new Date(item.timestamp).toLocaleTimeString()}</div>
        </div>
      `;

      const busColor = getTrackAllBusColor(item.bus_id, busKey);
      const existing = allBusMarkersRef.current[busKey];
      if (existing) {
        existing.setLatLng(position);
        existing.setIcon(createBusIcon(true, busColor));
        existing.setPopupContent(popupHtml);
      } else {
        const marker = L.marker(position, { icon: createBusIcon(true, busColor) }).addTo(map);
        marker.bindPopup(popupHtml, { className: 'transport-map-popup' });
        allBusMarkersRef.current[busKey] = marker;
      }

      const matchedBus = buses.find((bus) => bus.id === item.bus_id || bus.bus_number === item.bus_number);
      const tripStops = getValidTripStops(matchedBus, activeTrip);
      const routeKey = busKey;
      const routeColor = getTrackAllBusColor(item.bus_id, busKey);

      if (tripStops.length >= 2) {
        const routePoints = tripStops.map((stop) => [
          Number(stop.latitude),
          Number(stop.longitude),
        ] as [number, number]);
        const existingRoute = allBusRoutePathsRef.current[routeKey];
        if (existingRoute) {
          existingRoute.setLatLngs(routePoints);
          existingRoute.setStyle({ color: routeColor });
        } else {
          allBusRoutePathsRef.current[routeKey] = L.polyline(routePoints, {
            color: routeColor,
            weight: 4,
            opacity: 0.72,
            dashArray: '8 7',
            lineJoin: 'round',
          }).addTo(map);
        }
      } else if (allBusRoutePathsRef.current[routeKey]) {
        allBusRoutePathsRef.current[routeKey].remove();
        delete allBusRoutePathsRef.current[routeKey];
      }

      tripStops.forEach((stop) => {
        const stopKey = `${busKey}-stop-${stop.id}`;
        nextStopKeys.add(stopKey);
        const stopPosition: [number, number] = [Number(stop.latitude), Number(stop.longitude)];
        const stopHtml = `
          <div class="p-3 min-w-[210px] bg-white dark:bg-gray-800 rounded-lg shadow-xl">
            <div class="font-bold text-gray-900 dark:text-white mb-1">${stop.stop_name}</div>
            <div class="text-sm text-gray-700 dark:text-gray-200">Bus ${item.bus_number}</div>
            <div class="text-sm text-gray-700 dark:text-gray-200">${activeTrip} stop #${stop.order_number}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Arrival: ${stop.arrival_time || '-'}</div>
          </div>
        `;
        const existingStop = allBusStopMarkersRef.current[stopKey];
        if (existingStop) {
          existingStop.setLatLng(stopPosition);
          existingStop.setIcon(createStopIcon(stop.order_number, false, routeColor));
          existingStop.setPopupContent(stopHtml);
        } else {
          const stopMarker = L.marker(stopPosition, {
            icon: createStopIcon(stop.order_number, false, routeColor),
          }).addTo(map);
          stopMarker.bindPopup(stopHtml, { className: 'transport-map-popup' });
          allBusStopMarkersRef.current[stopKey] = stopMarker;
        }
      });
    });

    Object.entries(allBusRoutePathsRef.current).forEach(([busKey, polyline]) => {
      if (!nextKeys.has(busKey)) {
        polyline.remove();
        delete allBusRoutePathsRef.current[busKey];
      }
    });

    Object.entries(allBusStopMarkersRef.current).forEach(([stopKey, marker]) => {
      const busKey = stopKey.replace(/-stop-.+$/, '');
      if (!nextKeys.has(busKey) || !nextStopKeys.has(stopKey)) {
        marker.remove();
        delete allBusStopMarkersRef.current[stopKey];
      }
    });
  }, [allLiveBusLocations, trackAllExcludedBusIds, mapReady, buses, activeTrip]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map || !isTrackAllEnabled) return;

    const livePoints = Object.values(allLiveBusLocations)
      .filter((item) => !(item.bus_id && trackAllExcludedBusIds.has(item.bus_id)))
      .map((item) => [item.latitude, item.longitude] as [number, number])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (livePoints.length === 0) return;

    if (livePoints.length === 1) {
      map.setView(livePoints[0], Math.max(map.getZoom(), 15));
      return;
    }

    map.fitBounds(L.latLngBounds(livePoints), { padding: [70, 70], maxZoom: 16 });
  }, [isTrackAllEnabled, allLiveBusLocations, trackAllExcludedBusIds, mapReady]);

  // Fetch all buses from the same transport source used by Transport Management
  const fetchAllBuses = async () => {
    try {
      const listRes = await adminApi.transport.vehicles.list(schoolScope.scopeParams);
      const busesList = Array.isArray(listRes.data?.data) ? listRes.data.data : [];
      const staffRes = await adminApi.staff.list(schoolScope.scopeParams);
      const staffList = Array.isArray(staffRes.data) ? staffRes.data : (staffRes.data?.data || []);
      const staffById = new Map<number, any>();
      staffList.forEach((staff: any) => {
        const staffNumericId = Number(staff.id);
        if (Number.isFinite(staffNumericId)) {
          staffById.set(staffNumericId, staff);
        }
      });

      const transformedBuses = await Promise.all(
        busesList.map(async (busItem: any) => {
          let routeData: any = busItem?.route || null;
          let occupied = 0;
          let capacity: number | null = null;

          if (!routeData && busItem?.bus_number) {
            try {
              const routeRes = await adminApi.transport.routes.byBus(busItem.bus_number, schoolScope.scopeParams);
              routeData = routeRes.data?.data || null;
            } catch {
              routeData = null;
            }
          }

          try {
            const passengerRes = await adminApi.transport.passengers.list(busItem.bus_number, schoolScope.scopeParams);
            occupied = Number(passengerRes.data?.occupied || 0);
            const parsedCapacity = Number(passengerRes.data?.capacity);
            if (Number.isFinite(parsedCapacity) && parsedCapacity >= 0) {
              capacity = parsedCapacity;
            }
          } catch {
            occupied = 0;
          }

          if (capacity === null) {
            const fallbackCapacity = Number(busItem?.capacity);
            if (Number.isFinite(fallbackCapacity) && fallbackCapacity >= 0) {
              capacity = fallbackCapacity;
            }
          }

          const stops = (routeData?.stops || []).map((stop: any) => ({
            id: stop.id,
            trip_type: stop.trip_type || 'Morning',
            stop_name: stop.stop_name,
            order_number: stop.order_number,
            arrival_time: stop.arrival_time,
            latitude: parseCoordinate(stop.latitude),
            longitude: parseCoordinate(stop.longitude),
          }));
          const routeStart =
            routeData?.morning_start_location ||
            routeData?.start_location ||
            routeData?.evening_start_location ||
            '';
          const routeEnd =
            routeData?.morning_end_location ||
            routeData?.end_location ||
            routeData?.evening_end_location ||
            '';
          const routeLabel = routeStart && routeEnd
            ? `${routeStart} → ${routeEnd}`
            : (routeStart || routeEnd || 'No Route');

          return {
            id: Number(busItem.id),
            bus_number: busItem.bus_number,
            registration: busItem.registration_number,
            capacity,
            occupied,
            driver: busItem.driver
              ? (staffById.get(Number(busItem.driver))?.name || `Driver ID: ${busItem.driver}`)
              : 'Unassigned',
            driver_id: busItem.driver ? String(busItem.driver) : undefined,
            driver_contact: undefined,
            route: routeData ? routeLabel : 'No Route',
            route_id: routeData?.id,
            start_location: routeData?.start_location,
            end_location: routeData?.end_location,
            morning_start_location: routeData?.morning_start_location,
            morning_end_location: routeData?.morning_end_location,
            evening_start_location: routeData?.evening_start_location,
            evening_end_location: routeData?.evening_end_location,
            status: 'inactive' as const,
            current_location: undefined,
            stops,
            is_live: false,
          };
        })
      );

      setBuses(transformedBuses);
    } catch (error: any) {
      console.error('Error fetching buses:', error);
      toastError('Failed to fetch bus data');
    }
  };

  const closeTrackingSocket = () => {
    if (singleBusSnapshotIntervalRef.current !== null) {
      window.clearInterval(singleBusSnapshotIntervalRef.current);
      singleBusSnapshotIntervalRef.current = null;
    }
    if (trackingSocketRef.current) {
      trackingSocketRef.current.close();
      trackingSocketRef.current = null;
    }
    setIsSocketConnected(false);
  };

  const closeAdminLiveSocket = (disable: boolean = true) => {
    if (disable) {
      adminLiveSocketEnabledRef.current = false;
    }
    if (adminLiveSocketRef.current) {
      adminLiveSocketRef.current.close();
      adminLiveSocketRef.current = null;
    }
  };

  const connectAdminLiveSocket = () => {
    if (!adminLiveSocketEnabledRef.current) return;
    closeAdminLiveSocket(false);
    adminLiveSocketEnabledRef.current = true;
    const wsUrl = transportLiveApi.websocket.adminLiveUrl();
    const socket = new WebSocket(wsUrl);
    adminLiveSocketRef.current = socket;

    socket.onopen = () => {
      setIsAdminLiveConnected(true);
      socket.send(JSON.stringify({ type: 'snapshot_request' }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload?.type === 'admin_live_snapshot') {
          const snapshotBuses = Array.isArray(payload?.buses) ? payload.buses : [];
          const nextLocations: Record<string, AdminLiveBusLocation> = {};
          const nextActiveIds = new Set<number>();
          const liveDataByBusId = new Map<number, AdminLiveBusLocation>();

          snapshotBuses.forEach((item: any) => {
            const latitude = parseCoordinate(item?.latitude);
            const longitude = parseCoordinate(item?.longitude);
            const busId = Number(item?.bus_id);
            const key = getLiveBusKey(item);
            if (!key || latitude === null || longitude === null) return;

            const liveData: AdminLiveBusLocation = {
              bus_id: Number.isFinite(busId) ? busId : 0,
              bus_number: String(item?.bus_number || ''),
              route_id: Number(item?.route_id) || 0,
              latitude,
              longitude,
              speed: parseCoordinate(item?.speed) ?? 0,
              timestamp: item?.timestamp || new Date().toISOString(),
              driver_name: item?.driver_name,
            };
            nextLocations[key] = liveData;
            if (liveData.bus_id) nextActiveIds.add(liveData.bus_id);
            if (liveData.bus_id) liveDataByBusId.set(liveData.bus_id, liveData);
          });

          setAllLiveBusLocations(nextLocations);
          setActiveBusIds(nextActiveIds);
          updateBusStatesFromLiveData(liveDataByBusId, nextActiveIds);
          return;
        }

        if (payload?.type !== 'admin_location_update') return;

        const latitude = parseCoordinate(payload.latitude);
        const longitude = parseCoordinate(payload.longitude);
        if (latitude === null || longitude === null) return;

        const busId = Number(payload.bus_id);
        const key = getLiveBusKey(payload);
        if (!key) return;

        const liveData: AdminLiveBusLocation = {
          bus_id: Number.isFinite(busId) ? busId : 0,
          bus_number: String(payload.bus_number || ''),
          route_id: Number(payload.route_id) || 0,
          latitude,
          longitude,
          speed: parseCoordinate(payload.speed) ?? 0,
          timestamp: payload.timestamp || new Date().toISOString(),
          driver_name: payload.driver_name,
        };

        setAllLiveBusLocations((prev) => ({
          ...prev,
          [key]: liveData,
        }));

        if (liveData.bus_id) {
          setActiveBusIds((prev) => {
            const next = new Set(prev);
            next.add(liveData.bus_id);
            return next;
          });
        }

        setBuses((prev) =>
          prev.map((bus) =>
            (liveData.bus_id && bus.id === liveData.bus_id) ||
            (liveData.bus_number && bus.bus_number === liveData.bus_number)
              ? {
                  ...bus,
                  is_live: true,
                  status: 'active',
                  current_location: {
                    latitude: liveData.latitude,
                    longitude: liveData.longitude,
                    speed: liveData.speed,
                    last_updated: liveData.timestamp,
                  },
                }
              : bus
          )
        );
      } catch (error) {
        console.error('Invalid admin live websocket payload:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Admin live websocket error:', error);
      setIsAdminLiveConnected(false);
    };

    socket.onclose = () => {
      setIsAdminLiveConnected(false);
      // Auto-reconnect in background.
      setTimeout(() => {
        if (
          isTrackAllEnabled &&
          adminLiveSocketEnabledRef.current &&
          (!adminLiveSocketRef.current || adminLiveSocketRef.current.readyState === WebSocket.CLOSED)
        ) {
          connectAdminLiveSocket();
        }
      }, 300);
    };
  };

  const connectTrackingSocket = (bus: Bus) => {
    if (!bus.route_id) return;

    closeTrackingSocket();
    const wsUrl = transportLiveApi.websocket.trackUrl(bus.route_id);
    const socket = new WebSocket(wsUrl);
    trackingSocketRef.current = socket;

    socket.onopen = () => {
      const requestSnapshot = () => {
        if (
          !trackingSocketRef.current ||
          trackingSocketRef.current.readyState !== WebSocket.OPEN
        ) {
          return;
        }
        trackingSocketRef.current.send(JSON.stringify({ type: 'snapshot_request' }));
      };

      requestSnapshot();
      if (singleBusSnapshotIntervalRef.current !== null) {
        window.clearInterval(singleBusSnapshotIntervalRef.current);
      }
      singleBusSnapshotIntervalRef.current = window.setInterval(requestSnapshot, 3000);

      setIsSocketConnected(true);
      setBuses((prev) =>
        prev.map((b) =>
          b.id === bus.id ? { ...b, is_live: true, status: 'active' } : b
        )
      );
      toastSuccess(`Connected to Bus ${bus.bus_number} live feed`);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const latitude = parseCoordinate(payload.latitude);
        const longitude = parseCoordinate(payload.longitude);
        const speed = parseCoordinate(payload.speed) ?? 0;
        if (latitude === null || longitude === null) return;

        const timestamp = payload.timestamp || new Date().toISOString();
        const currentTrackingBus = trackingBusRef.current || bus;
        const location: BusLocation = {
          bus_number: currentTrackingBus.bus_number,
          route_id: currentTrackingBus.route_id || 0,
          bus_id: currentTrackingBus.id,
          latitude,
          longitude,
          speed,
          timestamp,
          driver_name: currentTrackingBus.driver,
        };

        setBusLocation(location);
        setBuses((prev) =>
          prev.map((b) =>
            b.id === currentTrackingBus.id
              ? {
                  ...b,
                  is_live: true,
                  status: 'active',
                  current_location: {
                    latitude,
                    longitude,
                    speed,
                    last_updated: timestamp,
                  },
                }
              : b
          )
        );
      } catch (error) {
        console.error('Invalid websocket payload:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Tracking websocket error:', error);
      toastError('Failed to connect live tracking socket');
    };

    socket.onclose = () => {
      if (singleBusSnapshotIntervalRef.current !== null) {
        window.clearInterval(singleBusSnapshotIntervalRef.current);
        singleBusSnapshotIntervalRef.current = null;
      }
      setIsSocketConnected(false);
      const currentTrackingBus = trackingBusRef.current;
      if (currentTrackingBus) {
        setBuses((prev) =>
          prev.map((b) =>
            b.id === currentTrackingBus.id ? { ...b, is_live: false, status: 'inactive' } : b
          )
        );
      }
    };
  };

  // Active buses endpoint is used only for live status indication
  const fetchActiveBusIds = async () => {
    try {
      const response = await transportLiveApi.buses.active(schoolScope.scopeParams);
      const activeBuses = Array.isArray(response.data?.active_buses) ? response.data.active_buses : [];
      setActiveBusIds(new Set<number>(activeBuses.map((bus: any) => Number(bus?.bus_id)).filter((id: number) => Number.isFinite(id))));
    } catch (error: any) {
      console.error('Error fetching active buses:', error);
    }
  };

  // Track a specific bus (stationary - no movement)
  const startTracking = (bus: Bus) => {
    stopTracking();

    if (!bus.route_id) {
      toastInfo('This bus has no route assigned');
      return;
    }

    const routeStops = getTripStops(bus, activeTrip);

    if (routeStops.length === 0) {
      toastInfo(`No ${activeTrip.toLowerCase()} stops available for this route`);
      return;
    }

    const validStops = getValidTripStops(bus, activeTrip);
    
    if (validStops.length < 2) {
      toastInfo(`The ${activeTrip.toLowerCase()} route needs at least 2 stops with coordinates`);
      return;
    }

    setStops(routeStops);
    setTrackingBus(bus);
    trackingBusRef.current = bus;
    connectTrackingSocket(bus);
    const location: BusLocation = {
      bus_number: bus.bus_number,
      route_id: bus.route_id,
      bus_id: bus.id,
      latitude: bus.current_location?.latitude ?? Number(validStops[0].latitude),
      longitude: bus.current_location?.longitude ?? Number(validStops[0].longitude),
      speed: bus.current_location?.speed || 0,
      timestamp: bus.current_location?.last_updated || new Date().toISOString(),
      driver_name: bus.driver,
    };
    setBusLocation(location);

    toastSuccess(`Now tracking Bus ${bus.bus_number}`);

    // Center map to show all stops and bus location
    const points: [number, number][] = validStops.map(stop => 
      [Number(stop.latitude), Number(stop.longitude)]
    );
    if (bus.current_location && bus.current_location.latitude && bus.current_location.longitude) {
      points.push([bus.current_location.latitude, bus.current_location.longitude]);
    }
    fitMapToPoints(points);

    setTimeout(() => {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
    }, 300);
  };

  // Stop tracking
  const stopTracking = () => {
    closeTrackingSocket();

    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    clearStopMarkers();
    if (routePathRef.current) {
      routePathRef.current.remove();
      routePathRef.current = null;
    }

    setTrackingBus(null);
    trackingBusRef.current = null;
    setBusLocation(null);
    setStops([]);

    // toastSuccess('Tracking stopped');
  };

  const toggleTrackAllBus = (busId: number) => {
    setTrackAllExcludedBusIds((prev) => {
      const next = new Set(prev);
      const isExcluded = next.has(busId);

      if (isExcluded) {
        next.delete(busId);
      } else {
        next.add(busId);
      }

      return next;
    });
  };

  // Fetch bus history
  const fetchBusHistory = async (busId: number, date: string) => {
    try {
      const bus = buses.find((b) => b.id === busId);
      if (!bus) {
        toastError('Bus not found');
        return;
      }

      const response = await transportLiveApi.buses.dateView(bus.bus_number, date, schoolScope.scopeParams);
      const passengers = Array.isArray(response.data?.passengers) ? response.data.passengers : [];
      setHistoryData(passengers);
      setHistoryView(true);
      if (passengers.length === 0) {
        toastInfo('No attendance history found for this date');
      }
    } catch (error) {
      console.error('Error fetching history:', error);
      toastError('Failed to fetch bus history');
    }
  };

  // Initialize static bus + route data
  useEffect(() => {
    stopTracking();
    setBuses([]);
    setAllLiveBusLocations({});
    setTrackAllExcludedBusIds(new Set());
    const initializeData = async () => {
      setLoading(true);
      await fetchAllBuses();
      await fetchActiveBusIds();
      setLoading(false);
    };

    initializeData();

    return () => {
      // clearInterval(activeBusesInterval);
      closeTrackingSocket();
      closeAdminLiveSocket();
      Object.values(allBusMarkersRef.current).forEach((marker) => marker.remove());
      allBusMarkersRef.current = {};
      Object.values(allBusRoutePathsRef.current).forEach((polyline) => polyline.remove());
      allBusRoutePathsRef.current = {};
      Object.values(allBusStopMarkersRef.current).forEach((marker) => marker.remove());
      allBusStopMarkersRef.current = {};
    };
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (isTrackAllEnabled) {
      stopTracking();
      setTrackAllExcludedBusIds(new Set());
      adminLiveSocketEnabledRef.current = true;
      connectAdminLiveSocket();
      return;
    }

    closeAdminLiveSocket();
    setAllLiveBusLocations({});
    setTrackAllExcludedBusIds(new Set());
    Object.values(allBusMarkersRef.current).forEach((marker) => marker.remove());
    allBusMarkersRef.current = {};
    Object.values(allBusRoutePathsRef.current).forEach((polyline) => polyline.remove());
    allBusRoutePathsRef.current = {};
    Object.values(allBusStopMarkersRef.current).forEach((marker) => marker.remove());
    allBusStopMarkersRef.current = {};
  }, [isTrackAllEnabled]);

  // Filter buses
  const filteredBuses = buses.filter(bus => {
    const isLiveBus = activeBusIds.has(bus.id);
    const matchesSearch = 
      bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.route.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesStatus = true;
    if (filterStatus === 'active') {
      matchesStatus = Boolean(bus.route_id);
    } else if (filterStatus === 'inactive') {
      matchesStatus = !isLiveBus;
    } else if (filterStatus === 'live') {
      matchesStatus = isLiveBus;
    }
    
    return matchesSearch && matchesStatus;
  });

  // Format time
  const formatTime = (timestamp?: string) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Calculate time since last update
  const getTimeSince = (timestamp?: string) => {
    if (!timestamp) return '∞';
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  // Get status color
  const getStatusColor = (status: string, lastUpdated?: string, isLive?: boolean) => {
    if (isLive) return 'green';
    if (status !== 'active') return 'gray';
    if (!lastUpdated) return 'yellow';
    
    const seconds = Math.floor((new Date().getTime() - new Date(lastUpdated).getTime()) / 1000);
    if (seconds < 30) return 'green';
    if (seconds < 120) return 'yellow';
    return 'red';
  };

  // Get valid stops count
  const getValidStopsCount = (stops?: Stop[]) => {
    if (!stops) return 0;
    return stops.filter(stop => 
      stop.latitude !== null && 
      stop.latitude !== undefined && 
      stop.longitude !== null && 
      stop.longitude !== undefined
    ).length;
  };

  const liveCount = activeBusIds.size;
  const trackAllLegendItems = isTrackAllEnabled
    ? Object.entries(allLiveBusLocations)
        .filter(([, item]) => !(item.bus_id && trackAllExcludedBusIds.has(item.bus_id)))
        .map(([busKey, item]) => {
          const matchedBus = buses.find((b) => b.id === item.bus_id);
          return {
            key: busKey,
            busNumber: item.bus_number || matchedBus?.bus_number || 'Unknown',
            routeLabel: matchedBus?.route || `Route ${item.route_id || '-'}`,
            color: getTrackAllBusColor(item.bus_id, busKey),
          };
        })
        .sort((a, b) => a.busNumber.localeCompare(b.busNumber))
    : [];

  // Theme classes (keep all your existing theme classes)
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardClass = (color: string = 'blue') => {
    const gradients = {
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/20' : 'from-white to-blue-50',
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/20' : 'from-white to-emerald-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/20' : 'from-white to-amber-50',
      red: theme === 'dark' ? 'from-gray-800 to-red-900/20' : 'from-white to-red-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/20' : 'from-white to-indigo-50',
      purple: theme === 'dark' ? 'from-gray-800 to-purple-900/20' : 'from-white to-purple-50',
    };
    
    return combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary'),
      'bg-gradient-to-br',
      gradients[color as keyof typeof gradients] || gradients.blue
    );
  };

  const getButtonClass = (variant: 'primary' | 'secondary' | 'success' | 'danger' = 'primary') => {
    const baseClasses = 'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm hover:scale-[1.02] active:scale-[0.98]';
    
    const variants = {
      primary: theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700',
      secondary: combine(
        'border',
        get('border', 'secondary'),
        get('bg', 'card'),
        get('text', 'secondary'),
        'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
      ),
      success: theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700',
      danger: theme === 'dark'
        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
        : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700',
    };
    
    return combine(baseClasses, variants[variant]);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    '[&>option]:bg-[var(--color-bg-card)] [&>option]:text-[var(--color-text-primary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-blue-500',
    'focus:border-[var(--color-accent-primary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  );

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()}`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 sm:mb-8">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className={combine(
              "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
              theme === 'dark' 
                ? "bg-gradient-to-br from-blue-600 to-blue-700" 
                : "bg-gradient-to-br from-blue-500 to-blue-600"
            )}>
              <FaSatelliteDish className="text-xl sm:text-2xl text-white" />
            </div>
            <div>
              <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                Live Bus Tracking
              </h1>
              <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                Shared GPS feed from transport staff • click Track Live to connect
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
            <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
            <div className={combine(
              "px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl flex items-center gap-2 w-full sm:w-auto border",
              isAdminLiveConnected
                ? theme === 'dark' ? 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300' : 'bg-emerald-100 border-emerald-200 text-emerald-700'
                : theme === 'dark' ? 'bg-amber-900/30 border-amber-700/50 text-amber-300' : 'bg-amber-100 border-amber-200 text-amber-700'
            )}>
              <div className={combine(
                "w-2 h-2 rounded-full",
                isAdminLiveConnected ? "bg-green-500 animate-pulse" : "bg-amber-500"
              )} />
              <span className="font-medium text-xs sm:text-sm">
                {isAdminLiveConnected ? 'Shared live feed connected' : 'Waiting for shared live feed'}
              </span>
            </div>
            {trackingBus && (
              <div className={combine(
                "px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl flex items-center gap-2 w-full sm:w-auto",
                theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
              )}>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-medium text-xs sm:text-sm">Tracking Bus {trackingBus.bus_number}</span>
                <span className="text-xs opacity-75">{isSocketConnected ? 'Live' : 'Connecting...'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
          <div className={getCardClass('blue')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Buses</p>
                <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{buses.length}</p>
              </div>
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaBus className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                )} />
              </div>
            </div>
          </div>

          <div className={getCardClass('emerald')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Active Buses</p>
                <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                  {activeBusIds.size}
                </p>
              </div>
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
              )}>
                <FaLocationArrow className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                )} />
              </div>
            </div>
          </div>

          <div className={getCardClass('purple')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Live Now</p>
                <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                  {liveCount}
                </p>
              </div>
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              )}>
                <FaWifi className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                )} />
              </div>
            </div>
          </div>

          <div className={getCardClass('blue')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>{activeTrip} Routes</p>
                <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                  {buses.filter(b => getValidTripStops(b, activeTrip).length >= 2).length}
                </p>
              </div>
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaRoute className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                )} />
              </div>
            </div>
          </div>
        </div>

        

        {/* Map View */}
        {showMap && (
          <div 
            ref={mapContainerRef}
            className={combine(
              getCardClass('indigo'),
              "sm:mb-6 md:mb-8 transition-all duration-300",
              isFullscreen ? 'fixed inset-0 z-[999] m-0 rounded-none overflow-hidden' : ''
            )}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:p-6">
              <div className="flex items-center gap-2">
                <FaMapMarkedAlt className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
                <h3 className={combine("font-semibold", get('text', 'primary'))}>
                  {trackingBus && busLocation 
                    ? `Bus ${trackingBus.bus_number} Location` 
                    : 'Map View'}
                </h3>
                {trackingBus && (
                  <span className={combine("text-xs", get('text', 'tertiary'))}>
                    {isSocketConnected ? 'Live' : 'Connecting...'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
               
                {trackingBus && stops.length > 0 && (
                  <button
                    onClick={() => setShowStops(!showStops)}
                    className={combine(getButtonClass('secondary'), "px-2.5 sm:px-3 py-1")}
                    title={showStops ? 'Hide stops' : 'Show stops'}
                  >
                    <FaMapMarkerAlt className={showStops ? 'text-purple-500' : ''} />
                    <span className="ml-1">Stops ({getValidStopsCount(stops)})</span>
                  </button>
                )}

                <button
                  onClick={() => setMapType(mapType === 'street' ? 'satellite' : 'street')}
                  className={combine(getButtonClass('secondary'), "px-2.5 sm:px-3 py-1 flex items-center gap-1")}
                  title={`Switch to ${mapType === 'street' ? 'Satellite' : 'Street'} view`}
                >
                  <FaLayers className="mr-1" />
                  {mapType === 'street' ? 'Satellite' : 'Street'}
                </button>

                <button
                  onClick={getUserLocation}
                  className={combine(getButtonClass('secondary'), "px-2.5 sm:px-3 py-1")}
                  title="Show my location"
                >
                  <FaCrosshairs />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className={combine(getButtonClass('secondary'), "px-2.5 sm:px-3 py-1")}
                  title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {isFullscreen ? <FaCompress /> : <FaExpand />}
                </button>

                <button
                  onClick={() => setShowMap(false)}
                  className={combine(getButtonClass('secondary'), "px-2.5 sm:px-3 py-1")}
                  title="Hide map"
                >
                  <FaEyeSlash />
                </button>
              </div>
            </div>

            {/* Map Container */}
            <div 
              ref={mapRef}
              className={combine(
                "w-full rounded-xl border-2 transition-all duration-300 z-1",
                isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[360px] sm:h-[420px] lg:h-[500px]',
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              )}
            />

            {trackAllLegendItems.length > 0 && (
              <div className={combine(
                "mt-4 mx-4 sm:mx-6 p-3 sm:p-4 rounded-xl border",
                theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <p className={combine("text-sm font-semibold", get('text', 'primary'))}>
                      Live Buses on Map
                    </p>
                    <p className={combine("text-xs", get('text', 'secondary'))}>
                      {activeTrip} routes and shared transport staff GPS locations
                    </p>
                  </div>
                  <span className={combine(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold w-fit",
                    theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                  )}>
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    {trackAllLegendItems.length} visible
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {trackAllLegendItems.map((item) => (
                    <div
                      key={item.key}
                      className={combine(
                        "flex items-center gap-2 rounded-lg px-3 py-2 text-xs border min-w-0",
                        theme === 'dark' ? 'border-gray-600 bg-gray-900/40' : 'border-gray-200 bg-gray-50'
                      )}
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-white/60 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className={combine("font-medium whitespace-nowrap", get('text', 'primary'))}>
                        Bus {item.busNumber}
                      </span>
                      <span className={combine("truncate", get('text', 'tertiary'))}>
                        {item.routeLabel}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isTrackAllEnabled && trackAllLegendItems.length === 0 && !trackingBus && (
              <div className={combine(
                "mt-4 mx-4 sm:mx-6 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3",
                theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white border-gray-200'
              )}>
                <div className={combine(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  theme === 'dark' ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                )}>
                  <FaSatelliteDish />
                </div>
                <div>
                  <p className={combine("text-sm font-semibold", get('text', 'primary'))}>
                    Waiting for shared bus locations
                  </p>
                  <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                    Live buses will appear here automatically when transport staff share GPS from the mobile app.
                  </p>
                </div>
              </div>
            )}

           

            {/* Map Info Overlay */}
            {trackingBus && busLocation && (
              <div className="mt-4 p-3 sm:p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg sm:rounded-xl shadow-xl mx-4 sm:mx-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-75">Speed</p>
                    <p className="font-bold text-base sm:text-lg">{busLocation.speed.toFixed(1)} km/h</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-75">Last Updated</p>
                    <p className="font-bold text-base sm:text-lg">{formatTime(busLocation.timestamp)}</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2">
                    <p className="text-xs opacity-75">Driver</p>
                    <p className="font-bold text-base sm:text-lg truncate">{busLocation.driver_name || 'Unknown'}</p>
                  </div>
                </div>
                {stops.length > 0 && (
                  <div className="mt-2 text-xs sm:text-sm">
                    <p className="opacity-75">
                      Stops: {getValidStopsCount(stops)} of {stops.length} with coordinates
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Map Controls */}
            {trackingBus && busLocation && (
              <div className="flex flex-wrap justify-start lg:justify-end gap-2 mt-4 px-4 sm:px-6">
                <button
                  onClick={() => {
                    if (leafletMapRef.current && busLocation) {
                      leafletMapRef.current.setView(
                        [busLocation.latitude, busLocation.longitude], 
                        18
                      );
                    }
                  }}
                  className={combine(getButtonClass('secondary'), "flex items-center gap-1")}
                >
                  <FaLocationArrow />
                  Center on Bus
                </button>
                {userLocation && (
                  <button
                    onClick={() => {
                      if (leafletMapRef.current && userLocation) {
                        leafletMapRef.current.setView(
                          [userLocation.lat, userLocation.lng], 
                          15
                        );
                      }
                    }}
                    className={combine(getButtonClass('secondary'), "flex items-center gap-1")}
                  >
                    <FaCrosshairs />
                    Center on Me
                  </button>
                )}
                {stops.length > 0 && (
                  <button
                    onClick={() => {
                      if (leafletMapRef.current && stops.length > 0) {
                        const validStops = stops.filter(s => s.latitude && s.longitude);
                        if (validStops.length > 0) {
                          const bounds = L.latLngBounds(
                            validStops.map(s => [Number(s.latitude), Number(s.longitude)] as [number, number])
                          );
                          if (busLocation) {
                            bounds.extend([busLocation.latitude, busLocation.longitude]);
                          }
                          leafletMapRef.current.fitBounds(bounds, { padding: [50, 50] });
                          
                          setTimeout(() => {
                            if (leafletMapRef.current) {
                              leafletMapRef.current.invalidateSize();
                            }
                          }, 300);
                        }
                      }
                    }}
                    className={combine(getButtonClass('secondary'), "flex items-center gap-1")}
                  >
                    <FaMapMarkedAlt />
                    Show All Stops
                  </button>
                )}
                <button
                  onClick={() => window.open(`https://www.google.com/maps?q=${busLocation.latitude},${busLocation.longitude}`, '_blank')}
                  className={combine(getButtonClass('primary'), "flex items-center gap-1")}
                >
                  <FaStreetView />
                  Open in Google Maps
                </button>
                <button
                  onClick={stopTracking}
                  className={combine(getButtonClass('danger'), "flex items-center gap-1")}
                >
                  <FaStop />
                  Stop Tracking
                </button>
              </div>
            )}
          </div>
        )}

        {/* Show Map Button */}
        {!showMap && (
          <button
            onClick={() => setShowMap(true)}
            className={combine(
              getButtonClass('primary'),
              "w-full mb-4 sm:mb-6 md:mb-8 py-2.5 sm:py-3 flex items-center justify-center gap-2 text-base sm:text-lg"
            )}
          >
            <FaMapMarkedAlt />
            Show Map
          </button>
        )}


        {/* Buses Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full p-8 sm:p-12 text-center">
              <div className="inline-flex flex-col items-center">
                <div className={combine(
                  "animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-4",
                  theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
                )}></div>
                <p className={combine("mt-3 sm:mt-4 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                  Loading buses...
                </p>
              </div>
            </div>
          ) : filteredBuses.length === 0 ? (
            <div className="col-span-full p-8 sm:p-12 text-center">
              <div className={combine(
                "inline-block p-3 sm:p-4 rounded-full mb-3 sm:mb-4",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaBus className={combine(
                  "text-2xl sm:text-3xl",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                )} />
              </div>
              <h3 className={combine("text-base sm:text-lg font-medium mb-2", get('text', 'primary'))}>No buses found</h3>
              <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'No buses available'}
              </p>
            </div>
          ) : (
            filteredBuses.map((bus:any) => {
              const isLiveBus = activeBusIds.has(bus.id);
              const statusColor = getStatusColor(isLiveBus ? 'active' : 'inactive', bus.current_location?.last_updated, isLiveBus);
              const isTracking = trackingBus?.id === bus.id;
              const isExcludedInTrackAll = trackAllExcludedBusIds.has(bus.id);
              const routeStops = getRouteStops(bus);
              const activeTripStops = getTripStops(bus, activeTrip);
              const stopsByTrip = getStopsByTrip(bus);
              const morningRoute = getRouteLabel(bus, 'Morning');
              const eveningRoute = getRouteLabel(bus, 'Evening');
              const validStops = getValidStopsCount(activeTripStops);
              const canTrack = Boolean(isLiveBus && bus.route_id && validStops >= 2);
              
              return (
                <div 
                  key={bus.id} 
                  className={combine(
                    getCardClass('blue'),
                    "transform transition-all duration-300 hover:shadow-2xl",
                    isTracking ? 'ring-4 ring-blue-500 scale-[1.02]' : 'hover:scale-[1.02]',
                    isLiveBus ? 'border-l-4 border-l-green-500' : ''
                  )}
                >
                  {/* Bus Header */}
                  <div className="flex justify-between items-start mb-3 sm:mb-4 gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                      <div className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl relative",
                        theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                      )}>
                        <FaBus className={combine(
                          "text-base sm:text-xl",
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        )} />
                        <div className={combine(
                          "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2",
                          statusColor === 'green' ? 'bg-green-500' :
                          statusColor === 'yellow' ? 'bg-yellow-500' :
                          statusColor === 'red' ? 'bg-red-500' : 'bg-gray-500',
                          theme === 'dark' ? 'border-gray-800' : 'border-white'
                        )}></div>
                        {isLiveBus && (
                          <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className={combine("text-base sm:text-lg font-bold truncate", get('text', 'primary'))}>
                          Bus {bus.bus_number}
                        </h3>
                        <p className={combine("text-xs", get('text', 'tertiary'))}>
                          {bus.registration}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <span className={combine(
                        "px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                        isLiveBus
                          ? theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400 animate-pulse' : 'bg-emerald-100 text-emerald-700 animate-pulse'
                          : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-700'
                      )}>
                        {isLiveBus ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Stops Info */}
                  {routeStops.length > 0 && (
                    <div className={combine(
                      "p-2.5 sm:p-3 rounded-lg sm:rounded-xl mb-3 sm:mb-4",
                      theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <FaMapMarkerAlt className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                        <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                          Route Stops 
                        </span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(stopsByTrip).map(([trip, tripStops]) => (
                          <div key={trip}>
                            <p className={combine("mb-1 text-[11px] font-semibold uppercase", get('text', 'tertiary'))}>
                              {trip}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {tripStops.map((stop: Stop) => (
                                <div
                                  key={`${trip}-${stop.id}`}
                                  className={combine(
                                    "px-2 py-1 rounded text-xs",
                                    stop.latitude && stop.longitude
                                      ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                      : theme === 'dark' ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                                  )}
                                  title={stop.latitude && stop.longitude ? stop.stop_name : `${stop.stop_name} (no coordinates)`}
                                >
                                  {stop.order_number}. {stop.stop_name}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location Info */}
                  {bus.current_location && (
                    <div className={combine(
                      "p-3 sm:p-4 rounded-lg sm:rounded-xl mb-3 sm:mb-4",
                      theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <FaLocationArrow className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                          <span className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>
                            {isLiveBus ? 'Live Location' : 'Last Location'}
                          </span>
                        </div>
                        <span className={combine("text-xs font-medium px-2 py-1 rounded-full", 
                          getTimeSince(bus.current_location.last_updated).includes('s') 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        )}>
                          {getTimeSince(bus.current_location.last_updated)}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 gap-3 text-xs">
                        {bus.current_location.speed !== undefined && (
                          <div className="bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
                            <span className={combine("block", get('text', 'tertiary'))}>Speed</span>
                            <span className={combine("font-medium", get('text', 'primary'))}>
                              {bus.current_location.speed.toFixed(1)} km/h
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Bus Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="bg-white/50 dark:bg-gray-800/50 p-2.5 sm:p-3 rounded-lg sm:rounded-xl">
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Driver</p>
                      <div className="flex items-center gap-1 mt-1">
                        <FaUserTie className={combine("text-xs", get('icon', 'secondary'))} />
                        <span className={combine("text-xs sm:text-sm font-medium truncate", get('text', 'primary'))}>
                          {bus.driver}
                        </span>
                      </div>
                      {bus.driver_contact && (
                        <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                          {bus.driver_contact}
                        </p>
                      )}
                    </div>
                    <div className="bg-white/50 dark:bg-gray-800/50 p-2.5 sm:p-3 rounded-lg sm:rounded-xl">
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Seat Occupancy</p>
                      <div className="flex items-center gap-1 mt-1 mb-1.5">
                        <FaUsers className={combine("text-xs", get('icon', 'secondary'))} />
                        <span className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>
                          Occupied: {bus.occupied}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <p className={combine(get('text', 'tertiary'))}>
                          Total: {bus.capacity !== null ? bus.capacity : '--'}
                        </p>
                        <p className={combine(get('text', 'tertiary'))}>
                          Available: {bus.capacity !== null ? Math.max(bus.capacity - bus.occupied, 0) : '--'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Route Info */}
                  {bus.route_id ? (
                    <div className={combine(
                      "p-3 sm:p-4 rounded-lg sm:rounded-xl mb-3 sm:mb-4",
                      theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                    )}>
                      <div className="flex items-center gap-2 mb-2">
                        <FaRoute className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} />
                        <span className={combine("text-xs font-medium", get('text', 'primary'))}>Assigned Route</span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2 text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
                          <span className={combine(
                            "shrink-0 rounded-md px-2 py-0.5 font-semibold",
                            activeTrip === 'Morning'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          )}>
                            Morning
                          </span>
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            {morningRoute || 'Not configured'}
                          </span>
                        </div>
                        <div className="flex items-start gap-2 text-xs bg-white/50 dark:bg-gray-800/50 p-2 rounded-lg">
                          <span className={combine(
                            "shrink-0 rounded-md px-2 py-0.5 font-semibold",
                            activeTrip === 'Evening'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          )}>
                            Evening
                          </span>
                          <span className={combine("font-medium", get('text', 'primary'))}>
                            {eveningRoute || 'Not configured'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={combine(
                      "p-3 sm:p-4 rounded-lg sm:rounded-xl mb-3 sm:mb-4 border border-dashed",
                      theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-300'
                    )}>
                      <div className="flex items-center gap-2">
                        <FaRoute className={combine(get('icon', 'secondary'))} />
                        <span className={combine("text-xs font-medium", get('text', 'secondary'))}>
                          No route assigned
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {isTrackAllEnabled ? (
                      isLiveBus ? (
                        <button
                          onClick={() => toggleTrackAllBus(bus.id)}
                          className={combine(
                            isExcludedInTrackAll ? getButtonClass('primary') : getButtonClass('danger'),
                            "flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3"
                          )}
                          title={isExcludedInTrackAll ? 'Show this bus on map' : 'Hide this bus from map'}
                        >
                          {isExcludedInTrackAll ? <FaEye /> : <FaEyeSlash />}
                          {isExcludedInTrackAll ? 'Show on Map' : 'Hide from Map'}
                        </button>
                      ) : (
                        <button
                          disabled
                          className={combine(
                            getButtonClass('secondary'),
                            "flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 opacity-50 cursor-not-allowed"
                          )}
                          title="This bus is not live right now"
                        >
                          <FaTimesCircle />
                          Not Live
                        </button>
                      )
                    ) : (
                      isTracking ? (
                        <button
                          onClick={stopTracking}
                          className={combine(getButtonClass('danger'), "flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3")}
                        >
                          <FaStop />
                          Stop Tracking
                        </button>
                      ) : (
                        <button
                          onClick={() => startTracking(bus)}
                          disabled={!canTrack}
                          className={combine(
                            canTrack ? getButtonClass('primary') : getButtonClass('secondary'),
                            "flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3",
                            !canTrack ? 'opacity-50 cursor-not-allowed' : ''
                          )}
                          title={
                            !isLiveBus ? 'Bus is not live now' :
                            !bus.route_id ? 'No route assigned to this bus' : 
                            validStops < 2 ? `${activeTrip} route needs at least 2 stops with coordinates` : 
                            'Connect to live socket and show on map'
                          }
                        >
                          <FaPlay />
                          Show Live
                        </button>
                      )
                    )}
                  </div>

                  {/* Warnings */}
                  {!bus.route_id && (
                    <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                      <FaExclamationTriangle />
                      <span>No route assigned - cannot show on map</span>
                    </div>
                  )}
                  {bus.route_id && validStops < 2 && (
                    <div className="mt-3 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 p-2 rounded-lg">
                      <FaMapMarkerAlt />
                      <span>{activeTrip} route needs at least 2 stops with coordinates for route display</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* History View */}
        {historyView && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={combine(
              getCardClass('blue'),
              "max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            )}>
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3 mb-4 sm:mb-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaHistory className={combine(
                      "text-xl sm:text-2xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>
                      Bus History
                    </h2>
                    <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                      {selectedDate} • {trackingBus?.bus_number || 'Select a bus'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setHistoryView(false)}
                  className={combine(getButtonClass('secondary'), "!px-3 !py-2")}
                >
                  <FaTimesCircle />
                </button>
              </div>

              {/* History Summary */}
              <div className={combine(
                "p-6 sm:p-8 rounded-lg sm:rounded-xl text-center mb-4 sm:mb-6",
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              )}>
                <FaChartLine className={combine(
                  "text-3xl sm:text-4xl mx-auto mb-3 opacity-30",
                  get('icon', 'secondary')
                )} />
                <p className={combine("text-base sm:text-lg font-medium mb-2", get('text', 'secondary'))}>
                  API Attendance Snapshot
                </p>
                <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                  {historyData.length} passengers returned for {selectedDate}
                </p>
              </div>

              {/* Date Selector */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={getInputClass()}
                />
                <button
                  onClick={() => trackingBus && fetchBusHistory(trackingBus.id, selectedDate)}
                  disabled={!trackingBus}
                  className={combine(
                    getButtonClass('primary'),
                    "w-full sm:w-auto"
                  )}
                >
                  Load History
                </button>
              </div>

              {/* History Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Passenger ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Morning</th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase">Evening</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center">
                          <p className={combine("text-sm", get('text', 'secondary'))}>
                            Select a date and load history to view API data
                          </p>
                        </td>
                      </tr>
                    ) : (
                      historyData.map((row: any, idx: number) => (
                        <tr key={`${row.passenger_id}-${idx}`} className="border-t border-gray-200 dark:border-gray-700">
                          <td className="px-4 py-3 text-sm">{row.passenger_id || '-'}</td>
                          <td className="px-4 py-3 text-sm">{row.passenger_name || '-'}</td>
                          <td className="px-4 py-3 text-sm">{row.morning_status || '-'}</td>
                          <td className="px-4 py-3 text-sm">{row.evening_status || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
