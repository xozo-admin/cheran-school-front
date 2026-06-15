// components/dashboard/AttendanceConfigManager.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api';
import {
  MapPin,
  Settings,
  Save,
  Trash2,
  CheckCircle,
  AlertCircle,
  Navigation,
  Clock,
  Radius,
  RefreshCw,
  Shield,
  Map,
  X,
  QrCode,
  Play,
  Square,
  Maximize2
  ,
  Download
} from 'lucide-react';
import { FaTrash, FaSchool } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

// Import Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet marker icons in Next.js
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default Leaflet icon
let DefaultIcon = L.icon({
  iconUrl: icon.src,
  // iconShadow: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface AttendanceConfig {
  school_latitude: number;
  school_longitude: number;
  allowed_radius_meters: number;
  late_cutoff_time: string;
}

interface QRSessionData {
  id: number;
  role_scope: 'teacher' | 'staff' | 'both';
  starts_at: string;
  ends_at: string;
  rotation_seconds?: number;
  is_active: boolean;
}

const normalizeTimeForInput = (value: string): string => {
  const trimmed = (value || '').trim();
  if (!trimmed) return '';
  const timePart = trimmed.split('T').pop()?.split('.')[0] || '';
  const match = timePart.match(/^([0-1]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?/);
  if (!match) return '';
  const hh = match[1].padStart(2, '0');
  const mm = match[2];
  const ss = match[3] || '00';
  return `${hh}:${mm}:${ss}`;
};

export const AttendanceConfigManager = () => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'attendance_config_school_scope' });

  // Map refs
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [config, setConfig] = useState<AttendanceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<AttendanceConfig>({
    school_latitude: 0,
    school_longitude: 0,
    allowed_radius_meters: 200,
    late_cutoff_time: '09:00:00'
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [qrRoleScope, setQrRoleScope] = useState<'teacher' | 'staff' | 'both'>('both');
  const [qrSession, setQrSession] = useState<QRSessionData | null>(null);
  const [qrToken, setQrToken] = useState('');
  const [qrTokenExpiresAt, setQrTokenExpiresAt] = useState<string | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [showQrFullscreen, setShowQrFullscreen] = useState(false);

    

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'pink') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' | 'green' | 'red' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getDangerButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'primary'),
    'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
    'text-white',
    'hover:bg-[var(--color-bg-danger)] hover:text-white'
  );

  const getStatusBadgeClass = (type: 'success' | 'warning' | 'info' | 'danger') => {
    const colorMap = {
      success: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      warning: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      info: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      danger: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      }
    };

    const colors = colorMap[type];
    return combine(
      'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  // Custom marker icon for school location
  const createSchoolIcon = () => {
    return L.divIcon({
      className: 'custom-school-icon',
      html: `<div class="relative">
        <div class="w-10 h-10 ${theme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'} rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
          <svg class="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div class="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-600 rounded-full animate-ping"></div>
      </div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20],
    });
  };

  // Custom marker icon for user location
  const createUserIcon = () => {
    return L.divIcon({
      className: 'custom-user-icon',
      html: `<div class="relative">
        <div class="w-8 h-8 ${theme === 'dark' ? 'bg-green-600' : 'bg-green-500'} rounded-full flex items-center justify-center shadow-2xl border-2 border-white">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      </div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  const getStreetTileConfig = () => {
    return {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
  };

  // Initialize map
  const initializeMap = () => {
    if (!mapRef.current || leafletMapRef.current) return;

    // Create map instance with bounds and min zoom
    leafletMapRef.current = L.map(mapRef.current, {
      minZoom: 3,
      maxBounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
      maxBoundsViscosity: 1.0,
      worldCopyJump: true
    }).setView(
      [formData.school_latitude || 11.0359, formData.school_longitude || 77.0351], 
      15
    );

    const tileConfig = getStreetTileConfig();
    tileLayerRef.current = L.tileLayer(tileConfig.url, {
      attribution: tileConfig.attribution,
      maxZoom: 19,
      minZoom: 3,
      bounds: L.latLngBounds(L.latLng(-90, -180), L.latLng(90, 180)),
    }).addTo(leafletMapRef.current);

    // Add scale control
    L.control.scale({ imperial: false, metric: true }).addTo(leafletMapRef.current);

    // Add click handler to map
    leafletMapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      
      // Update form data with clicked coordinates
      setFormData(prev => ({
        ...prev,
        school_latitude: parseFloat(lat.toFixed(6)),
        school_longitude: parseFloat(lng.toFixed(6))
      }));

      // Update marker and circle
      updateMapMarker(lat, lng);
      
      // Remove user marker when school location is set manually
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      
    });

    // Add initial marker and circle if coordinates are set
    if (formData.school_latitude && formData.school_longitude) {
      updateMapMarker(formData.school_latitude, formData.school_longitude);
    }

    // Get user location and add marker
    getUserLocationForMap();

    // Ensure Leaflet recalculates dimensions after first paint
    setTimeout(() => {
      leafletMapRef.current?.invalidateSize();
    }, 100);
  };

  // Update map marker and circle
  const updateMapMarker = (lat: number, lng: number) => {
    if (!leafletMapRef.current) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Remove existing circle
    if (circleRef.current) {
      circleRef.current.remove();
    }

    // Add new marker
    markerRef.current = L.marker([lat, lng], {
      icon: createSchoolIcon(),
      draggable: true
    }).addTo(leafletMapRef.current);

    // Add drag end handler
    markerRef.current.on('dragend', (e) => {
      const marker = e.target;
      const position = marker.getLatLng();
      
      setFormData(prev => ({
        ...prev,
        school_latitude: parseFloat(position.lat.toFixed(6)),
        school_longitude: parseFloat(position.lng.toFixed(6))
      }));

      updateMapCircle(position.lat, position.lng);
    });

    // Add popup
    markerRef.current.bindPopup(`
      <div class="p-2">
        <strong>School Location</strong><br>
        Lat: ${lat.toFixed(6)}<br>
        Lng: ${lng.toFixed(6)}<br>
        Radius: ${formData.allowed_radius_meters}m
      </div>
    `);

    // Add circle for radius
    updateMapCircle(lat, lng);
  };

  // Update radius circle
  const updateMapCircle = (lat: number, lng: number) => {
    if (!leafletMapRef.current) return;

    if (circleRef.current) {
      circleRef.current.remove();
    }

    circleRef.current = L.circle([lat, lng], {
      color: theme === 'dark' ? '#3b82f6' : '#2563eb',
      fillColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
      fillOpacity: 0.15,
      weight: 2,
      radius: formData.allowed_radius_meters
    }).addTo(leafletMapRef.current);
  };

  // Get user location for map
  const getUserLocationForMap = () => {
    if (!navigator.geolocation) {
      toastError('Geolocation is not supported by your browser');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lng: longitude });

        // Add user marker to map only if no school location is set
        if (leafletMapRef.current && !formData.school_latitude && !formData.school_longitude) {
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: createUserIcon()
          }).addTo(leafletMapRef.current);

          // Center map on user location initially
          leafletMapRef.current.setView([latitude, longitude], 15);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  // Center map on user location
  const centerOnUser = () => {
    if (leafletMapRef.current && userLocation) {
      leafletMapRef.current.setView([userLocation.lat, userLocation.lng], 16);
    } else {
      toastError('User location not available');
    }
  };

  // Update circle when radius changes
  useEffect(() => {
    if (leafletMapRef.current && formData.school_latitude && formData.school_longitude) {
      updateMapCircle(formData.school_latitude, formData.school_longitude);
      
      // Update marker popup
      if (markerRef.current) {
        markerRef.current.setPopupContent(`
          <div class="p-2">
            <strong>School Location</strong><br>
            Lat: ${formData.school_latitude.toFixed(6)}<br>
            Lng: ${formData.school_longitude.toFixed(6)}<br>
            Radius: ${formData.allowed_radius_meters}m
          </div>
        `);
      }
    }
  }, [formData.allowed_radius_meters]);

  // Initialize/Re-initialize map like transport live (stable on theme switch)
  useEffect(() => {
    if (loading) return;

    if (mapRef.current && !leafletMapRef.current) {
      const initTimeout = setTimeout(() => {
        initializeMap();
      }, 100);

      return () => {
        clearTimeout(initTimeout);
        if (tileLayerRef.current) {
          tileLayerRef.current.remove();
          tileLayerRef.current = null;
        }
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      };
    }

    return () => {
      if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
      }
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, [loading, theme]);

  // Fetch attendance configuration
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await adminApi.attendance.config.get(schoolScope.scopeParams);
      const data = response.data;

      if (data.message === 'Not configured') {
        setConfig(null);
        setFormData({
          school_latitude: 0,
          school_longitude: 0,
          allowed_radius_meters: 200,
          late_cutoff_time: '09:00:00'
        });
      } else {
        setConfig(data);
        setFormData({
          school_latitude: parseFloat(data.school_latitude),
          school_longitude: parseFloat(data.school_longitude),
          allowed_radius_meters: data.allowed_radius_meters,
          late_cutoff_time: data.late_cutoff_time
        });
        // toastSuccess('Attendance configured!');
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('Access denied: Admin privileges required');
      } else {
        toastError('Failed to load attendance configuration');
        console.error('Error fetching config:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setConfig(null);
    setQrSession(null);
    setQrToken('');
    setQrTokenExpiresAt(null);
    setShowQrFullscreen(false);
    fetchConfig();
  }, [schoolScope.selectedSchoolId]);

  // Validate form data
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.school_latitude === 0) {
      errors.school_latitude = 'Latitude cannot be 0.';
    } else if (formData.school_latitude < -90 || formData.school_latitude > 90) {
      errors.school_latitude = 'Enter a valid latitude between -90 and 90.';
    }

    if (formData.school_longitude === 0) {
      errors.school_longitude = 'Longitude cannot be 0.';
    } else if (formData.school_longitude < -180 || formData.school_longitude > 180) {
      errors.school_longitude = 'Enter a valid longitude between -180 and 180.';
    }

    if (formData.allowed_radius_meters < 1 || formData.allowed_radius_meters > 5000) {
      errors.allowed_radius_meters = 'Enter a valid radius between 1 and 5000 meters.';
    }

    const normalizedCutoff = normalizeTimeForInput(formData.late_cutoff_time);
    if (!normalizedCutoff) {
      errors.late_cutoff_time = 'Late cut-off time is required.';
    } else {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      if (!timeRegex.test(normalizedCutoff)) {
      errors.late_cutoff_time = 'Enter a valid late cut-off time in HH:MM:SS format.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save/Update configuration
  const handleSaveConfig = async () => {
    if (!validateForm()) {
      toastError('Please fix validation errors');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...formData,
        ...schoolScope.scopeParams,
      };
      const response = config
        ? await adminApi.attendance.config.update(payload)
        : await adminApi.attendance.config.create(payload);
      setConfig(response.data);
      console.log(`Config ${config ? 'updated' : 'created'}:`, response.data);
      toastSuccess('Configuration saved successfully!');
    } catch (error: any) {
      if (error?.response?.status === 400) {
        const errorData = error?.response?.data || {};
        const backendErrors: Record<string, string> = {};
        Object.keys(errorData).forEach(key => {
          backendErrors[key] = Array.isArray(errorData[key]) ? errorData[key].join(', ') : errorData[key];
        });
        setValidationErrors(backendErrors);
        toastError('Please fix the validation errors');
      } else if (error?.response?.status === 403) {
        toastError('Access denied: Admin privileges required');
      } else {
        toastError('Failed to save attendance configuration');
        console.error('Error saving config:', error);
      }
    } finally {
      setSaving(false);
    }
  };

  // Delete configuration
  const handleDeleteConfig = async () => {
    if (!config) return;

    try {
      setDeleting(true);
      await adminApi.attendance.config.delete(schoolScope.scopeParams);
      setConfig(null);
      setFormData({
        school_latitude: 0,
        school_longitude: 0,
        allowed_radius_meters: 200,
        late_cutoff_time: '09:00:00'
      });
      setShowDeleteConfirm(false);
      toastSuccess('Configuration deleted successfully!');
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('Access denied: Admin privileges required');
      } else {
        toastError('Failed to delete attendance configuration');
        console.error('Error deleting config:', error);
      }
    } finally {
      setDeleting(false);
    }
  };

  // Format time for display
  const formatTimeForDisplay = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const minute = parseInt(minutes);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
    } catch {
      return timeString;
    }
  };

  const getErrorMessage = (error: any, fallback: string) => {
    const responseData = error?.response?.data;
    if (typeof responseData?.error === 'string' && responseData.error.trim()) {
      return responseData.error.trim();
    }
    if (typeof responseData?.message === 'string' && responseData.message.trim()) {
      return responseData.message.trim();
    }
    if (typeof error?.message === 'string' && error.message.trim()) {
      return error.message.trim();
    }
    return fallback;
  };

  const syncQrToken = (payload: any) => {
    setQrToken(payload?.token || '');
    const expiresAt = payload?.expires_at ? String(payload.expires_at) : null;
    setQrTokenExpiresAt(expiresAt);
  };

  const getQrExpiryLabel = () => {
    if (!qrTokenExpiresAt) {
      return 'Valid for today';
    }
    const expiresAt = new Date(qrTokenExpiresAt);
    if (Number.isNaN(expiresAt.getTime())) {
      return 'Valid for today';
    }
    return `Valid until ${expiresAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getQrImageUrl = (size: number, margin: number = 8) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=${margin}&data=${encodeURIComponent(qrToken)}`;

  const handleDownloadQr = async () => {
    if (!qrToken) {
      toastError('No QR available to download');
      return;
    }

    try {
      const response = await fetch(getQrImageUrl(900, 16));
      if (!response.ok) {
        throw new Error('Failed to generate QR image');
      }
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const dateStamp = new Date().toISOString().slice(0, 10);
      const sessionPart = qrSession?.id ? `_session_${qrSession.id}` : '';
      anchor.href = blobUrl;
      anchor.download = `attendance_qr_${dateStamp}${sessionPart}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(blobUrl);
      toastSuccess('QR downloaded');
    } catch (error) {
      toastError(getErrorMessage(error, 'Failed to download QR'));
    }
  };

  const handleStartQrSession = async () => {
    try {
      setQrBusy(true);
      const response = await adminApi.attendance.qr.startSession({
        role_scope: qrRoleScope,
        ...schoolScope.scopeParams,
      });
      const data = response.data || {};
      setQrSession(data.session || null);
      syncQrToken(data);
      toastSuccess('QR session started');
    } catch (error) {
      toastError(getErrorMessage(error, 'Failed to start QR session'));
    } finally {
      setQrBusy(false);
    }
  };

  const handleCloseQrSession = async () => {
    if (!qrSession?.id) {
      return;
    }
    try {
      setQrBusy(true);
      await adminApi.attendance.qr.closeSession(qrSession.id);
      setQrSession(null);
      setQrToken('');
      setQrTokenExpiresAt(null);
      toastSuccess('QR session closed');
    } catch (error) {
      toastError(getErrorMessage(error, 'Failed to close QR session'));
    } finally {
      setQrBusy(false);
    }
  };

  if (loading) {
    return (
      <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="p-6 sm:p-8 text-center">
            <div className="text-center">
              <div className="relative mx-auto w-16 h-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
              Loading attendance configuration...
              </p>
              <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing attendance configuration</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <Settings className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Attendance Configuration
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Configure location and time settings for attendance marking
                </p>
              </div>
            </div>
            <SchoolScopeSelector {...schoolScope} className="w-full lg:w-auto" />
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Configuration Status</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {config ? 'Active' : 'Not Set'}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  config 
                    ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')
                    : (theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')
                )}>
                  {config ? (
                    <CheckCircle className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  ) : (
                    <AlertCircle className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  )}
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", config ? get('accent', 'success') : get('accent', 'warning'))}>
                {config ? 'Attendance is location-enabled' : 'Configure to enable location-based attendance'}
              </div>
            </div>

            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>School Location</p>
                  <p className={combine("text-xs sm:text-sm font-mono mt-1 sm:mt-2 truncate", get('text', 'primary'))}>
                    {config 
                      ? `${parseFloat(config.school_latitude as any).toFixed(6)}, ${parseFloat(config.school_longitude as any).toFixed(6)}`
                      : formData.school_latitude && formData.school_longitude 
                        ? `${formData.school_latitude.toFixed(6)}, ${formData.school_longitude.toFixed(6)}`
                        : 'Not set'
                    }
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <MapPin className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'success'))}>
                Latitude, Longitude
              </div>
            </div>

            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Allowed Radius</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {config ? `${config.allowed_radius_meters}m` : `${formData.allowed_radius_meters}m`}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <Radius className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Maximum distance from school
              </div>
            </div>

            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Late Cut-off Time</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {config ? formatTimeForDisplay(config.late_cutoff_time) : formatTimeForDisplay(formData.late_cutoff_time)}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <Clock className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'warning'))}>
                Time considered as late arrival
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className={getCardGradientClass('green')}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className={combine("text-lg sm:text-xl font-bold mb-1", get('text', 'primary'))}>
                  Daily QR Attendance Session
                </h2>
                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                  Generate one QR code for teacher/staff self-attendance check-in
                </p>
              </div>
              <div className={getStatusBadgeClass(qrSession ? 'success' : 'warning')}>
                {qrSession ? 'Session Active' : 'Session Inactive'}
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_1fr] gap-4 sm:gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:max-w-xs">
                    <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>Role Scope</label>
                    <select
                      value={qrRoleScope}
                      onChange={(e) => setQrRoleScope(e.target.value as 'teacher' | 'staff' | 'both')}
                      className={getInputClass()}
                      disabled={Boolean(qrSession)}
                    >
                      <option value="both">Teacher + Staff</option>
                      <option value="teacher">Teacher Only</option>
                      <option value="staff">Staff Only</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleStartQrSession}
                    disabled={qrBusy || Boolean(qrSession)}
                    className={combine(getPrimaryButtonClass(), "flex items-center gap-2")}
                  >
                    <Play className="h-4 w-4" />
                    Start QR Session
                  </button>
                  <button
                    onClick={handleCloseQrSession}
                    disabled={!qrSession || qrBusy}
                    className={combine(getDangerButtonClass(), "flex items-center gap-2")}
                  >
                    <Square className="h-4 w-4" />
                    Close Session
                  </button>
                </div>

              </div>

              <div className={combine("rounded-xl border p-4 sm:p-5", get('border', 'primary'), get('bg', 'card'))}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={combine("text-sm sm:text-base font-semibold flex items-center gap-2", get('text', 'primary'))}>
                    <QrCode className="h-4 w-4" />
                    Live QR Code
                  </h3>
                  <button
                    onClick={() => setShowQrFullscreen(true)}
                    disabled={!qrToken}
                    className={combine(getSecondaryButtonClass(), "px-3 py-1.5 text-xs flex items-center gap-1")}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Full Screen
                  </button>
                  <button
                    onClick={handleDownloadQr}
                    disabled={!qrToken}
                    className={combine(getSecondaryButtonClass(), "px-3 py-1.5 text-xs flex items-center gap-1")}
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download QR
                  </button>
                </div>

                {qrToken ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={getQrImageUrl(300, 8)}
                      alt="Daily attendance QR code"
                      className="w-[240px] h-[240px] sm:w-[280px] sm:h-[280px] rounded-xl border border-gray-200 bg-white p-2"
                    />
                    <p className={combine("text-xs text-center", get('text', 'secondary'))}>
                      Show this QR on screen. Teachers/Staff scan it from their attendance pages.
                    </p>
                  </div>
                ) : (
                  <div className="h-[260px] sm:h-[300px] flex items-center justify-center rounded-xl border border-dashed border-gray-300">
                    <p className={combine("text-sm text-center px-4", get('text', 'secondary'))}>
                      Start a QR session to generate today's attendance QR code.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
          {/* Left Column - Configuration Form */}
          <div>
            <div className={getCardGradientClass('blue')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-6">
                <div>
                  <h2 className={combine("text-lg sm:text-xl font-bold mb-1", get('text', 'primary'))}>
                    {config ? 'Update Attendance Settings' : 'Configure Attendance Settings'}
                  </h2>
                  <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                    Set location and time parameters for attendance validation
                  </p>
                </div>
                <div className={config ? getStatusBadgeClass('success') : getStatusBadgeClass('warning')}>
                  {config ? 'Configured' : 'Not Configured'}
                </div>
              </div>

              {/* Form */}
              <div className="space-y-5 sm:space-y-6">
                {/* Location Section */}
                <div>
                  <div className="flex items-center gap-2 mb-3 sm:mb-4">
                    <MapPin className={combine("h-4 w-4 sm:h-5 sm:w-5", get('icon', 'primary'))} />
                    <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
                      School Location
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                        Latitude *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.000001"
                          value={formData.school_latitude}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              school_latitude: parseFloat(e.target.value) || 0
                            });
                            setValidationErrors((prev) => ({ ...prev, school_latitude: '' }));
                          }}
                          placeholder="e.g., 12.971599"
                          className={combine(
                            getInputClass(),
                            validationErrors.school_latitude ? 'border-red-500' : ''
                          )}
                        />
                        {validationErrors.school_latitude && (
                          <p className="mt-1 text-xs text-red-500">
                            {validationErrors.school_latitude}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                        Longitude *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.000001"
                          value={formData.school_longitude}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              school_longitude: parseFloat(e.target.value) || 0
                            });
                            setValidationErrors((prev) => ({ ...prev, school_longitude: '' }));
                          }}
                          placeholder="e.g., 77.594566"
                          className={combine(
                            getInputClass(),
                            validationErrors.school_longitude ? 'border-red-500' : ''
                          )}
                        />
                        {validationErrors.school_longitude && (
                          <p className="mt-1 text-xs text-red-500">
                            {validationErrors.school_longitude}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {userLocation && (
                    <div className="mt-4">
                      <button
                        onClick={centerOnUser}
                        className={combine(
                          "px-4 py-2 rounded-xl transition-all duration-200 font-medium flex items-center gap-2",
                          getSecondaryButtonClass()
                        )}
                      >
                        <Navigation className="h-4 w-4" />
                        Center Map on My Location
                      </button>
                      <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                        Your current location is shown in green on the map
                      </p>
                    </div>
                  )}
                </div>

                {/* Radius and Time Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Radius className={combine("h-4 w-4 sm:h-5 sm:w-5", get('icon', 'primary'))} />
                      <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
                        Attendance Radius
                      </h3>
                    </div>
                    
                    <div>
                      <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                        Allowed Radius (meters) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          max="5000"
                          step="1"
                          value={formData.allowed_radius_meters}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              allowed_radius_meters: parseInt(e.target.value) || 200
                            });
                            setValidationErrors((prev) => ({ ...prev, allowed_radius_meters: '' }));
                          }}
                          placeholder="e.g., 200"
                          className={combine(
                            getInputClass(),
                            validationErrors.allowed_radius_meters ? 'border-red-500' : ''
                          )}
                        />
                        {validationErrors.allowed_radius_meters && (
                          <p className="mt-1 text-xs text-red-500">
                            {validationErrors.allowed_radius_meters}
                          </p>
                        )}
                      </div>
                      <div className="mt-2">
                        <input
                          type="range"
                          min="1"
                          max="5000"
                          step="10"
                          value={formData.allowed_radius_meters}
                          onChange={(e) => setFormData({
                            ...formData,
                            allowed_radius_meters: parseInt(e.target.value)
                          })}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>1m</span>
                          <span>500m</span>
                          <span>1000m</span>
                          <span>2500m</span>
                          <span>5000m</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                      <Clock className={combine("h-4 w-4 sm:h-5 sm:w-5", get('icon', 'primary'))} />
                      <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
                        Late Arrival Time
                      </h3>
                    </div>
                    
                    <div>
                      <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                        Late Cut-off Time (24-hour format) *
                      </label>
                      <div className="relative">
                        <input
                          type="time"
                          step="1"
                          value={normalizeTimeForInput(formData.late_cutoff_time)}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              late_cutoff_time: normalizeTimeForInput(e.target.value)
                            });
                            setValidationErrors((prev) => ({ ...prev, late_cutoff_time: '' }));
                          }}
                          className={combine(
                            getInputClass(),
                            validationErrors.late_cutoff_time ? 'border-red-500' : ''
                          )}
                        />
                        {validationErrors.late_cutoff_time && (
                          <p className="mt-1 text-xs text-red-500">
                            {validationErrors.late_cutoff_time}
                          </p>
                        )}
                      </div>
                      <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                        Any attendance marked after this time will be considered late
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 sm:gap-4 pt-5 sm:pt-6 border-t border-[var(--color-border-primary)]">
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving}
                    className={combine(getPrimaryButtonClass(), "flex items-center gap-2 min-w-[140px]")}
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {config ? 'Update Configuration' : 'Save Configuration'}
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      if (config) {
                        setFormData({
                          school_latitude: parseFloat(config.school_latitude as any),
                          school_longitude: parseFloat(config.school_longitude as any),
                          allowed_radius_meters: config.allowed_radius_meters,
                          late_cutoff_time: config.late_cutoff_time
                        });
                        setValidationErrors({});
                        toastSuccess('Reset to saved configuration');

                        // Update map if open
                        if (leafletMapRef.current) {
                          updateMapMarker(
                            parseFloat(config.school_latitude as any),
                            parseFloat(config.school_longitude as any)
                          );
                        }
                      } else {
                        setFormData({
                          school_latitude: 0,
                          school_longitude: 0,
                          allowed_radius_meters: 200,
                          late_cutoff_time: '09:00:00'
                        });
                        setValidationErrors({});
                      }
                    }}
                    className={combine(getSecondaryButtonClass(), "flex items-center gap-2")}
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Form
                  </button>

                  {config && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={deleting}
                      className={combine(getDangerButtonClass(), "flex items-center gap-2 min-w-[140px]")}
                    >
                      {deleting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          Delete Configuration
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Map */}
          <div>
            <div className={getCardGradientClass('indigo')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Map className={combine("h-5 w-5", get('icon', 'primary'))} />
                  <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                    Location Map
                  </h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={centerOnUser}
                    className={combine(
                      "px-3 py-1.5 rounded-lg transition-all duration-200 font-medium text-xs flex items-center gap-1",
                      getSecondaryButtonClass()
                    )}
                    disabled={!userLocation}
                  >
                    <Navigation className="h-3 w-3" />
                    Center on Me
                  </button>
                </div>
              </div>

              <div className="relative z-0">
                <div 
                  ref={mapRef}
                  className={combine(
                    "w-full h-[360px] sm:h-[420px] lg:h-[500px] rounded-xl border-2 transition-all duration-300",
                    theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                  )}
                />
                
                {/* Map Instructions */}
                <div className={combine(
                  "absolute bottom-4 left-4 right-4 p-3 rounded-lg text-xs",
                  theme === 'dark' 
                    ? 'bg-gray-900/90 text-gray-300' 
                    : 'bg-white/90 text-gray-700',
                  "backdrop-blur-sm border",
                  theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                )}>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-blue-500" />
                    <span>Click on the map to set school location • Drag marker to adjust • Blue circle shows allowed radius</span>
                  </div>
                </div>
              </div>

              {/* Map Legend */}
              <div className="mt-3 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className={get('text', 'secondary')}>School Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className={get('text', 'secondary')}>Your Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-3 bg-blue-500 opacity-30 rounded"></div>
                  <span className={get('text', 'secondary')}>Allowed Radius ({formData.allowed_radius_meters}m)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showQrFullscreen && qrToken && (
        <div className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <button
            onClick={() => setShowQrFullscreen(false)}
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors"
            aria-label="Close full screen QR"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center gap-4 max-w-[95vw]">
            <div className="text-center text-white">
              <h3 className="text-lg sm:text-xl font-semibold">Daily Attendance QR</h3>
              <p className="text-sm text-white/80">{getQrExpiryLabel()}</p>
              {qrSession && (
                <p className="text-xs text-white/70 mt-1">Session #{qrSession.id}</p>
              )}
            </div>

            <img
              src={getQrImageUrl(900, 16)}
              alt="Dynamic attendance QR full screen"
              className="w-[80vw] h-[80vw] max-w-[78vh] max-h-[78vh] rounded-2xl border border-white/20 bg-white p-3"
            />
            <button
              onClick={handleDownloadQr}
              className="text-white bg-white/10 hover:bg-white/20 rounded-xl px-4 py-2 text-sm transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download QR
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm z-1000">
          <div className={combine(
            getCardGradientClass('red'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="text-center">
              <div className={combine(
                "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <FaTrash className={combine(
                  "h-4 sm:h-5 w-4 sm:w-5",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )} />
              </div>
              <h3 className={combine("text-base sm:text-lg font-bold mb-1 sm:mb-1.5", get('text', 'primary'))}>
                Delete Configuration
              </h3>
              <p className={combine("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                Are you sure you want to delete the attendance configuration? This will disable location-based attendance and cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfig}
                  disabled={deleting}
                  className={combine(
                    getPrimaryButtonClass(),
                    "text-xs sm:text-sm flex-1",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  )}
                >
                  {deleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
