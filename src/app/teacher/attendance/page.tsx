'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FaMapMarkerAlt, FaCheckCircle, FaTimes, FaClock, 
  FaCalendarAlt, FaCalendarDay, FaCalendarWeek, 
  FaCalendar, FaHistory, FaSpinner, FaExclamationTriangle, FaChartBar,
  FaMapMarkedAlt, FaUserCheck, FaLocationArrow, FaQrcode,
  FaDoorOpen, FaRulerCombined,
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  LineController
);

// API Service Functions
const apiService = {
  async markAttendance(latitude: string, longitude: string) {
    const response = await teacherApi.attendance.selfMark({ latitude, longitude });
    return response.data || {};
  },

  async markAttendanceByQR(token: string) {
    const response = await teacherApi.attendance.qrScan(token);
    return response.data || {};
  },

  async getAttendanceHistory(params = {}) {
    const response = await teacherApi.attendance.selfHistory(params as Record<string, any>);
    return response.data || {};
  },

  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data || {};
  },

 
};

interface AttendanceRecord {
  date: string;
  check_in_time: string;
  status: 'Present' | 'Late' | 'Absent' | 'Sunday' | 'Holiday';
}

interface HistoryData {
  period: string;
  data?: AttendanceRecord;
  date?: string;
  status?: string;
  summary?: {
    total_days_passed: number;
    sundays: number;
    holidays: number;
    actual_working_days: number;
    present: number;
    late: number;
    absent: number;
    percentage: string;
    attendance_percentage?: string;
  };
  history?: {
    [key: string]: AttendanceRecord[];
  };
}

interface Location {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  isMock: boolean;
}

interface SchoolConfig {
  latitude: number;
  longitude: number;
  radius: number;
  checkInStart: string;
  checkInEnd: string;
  lateThreshold: string;
}

interface PermissionStatus {
  state: 'granted' | 'denied' | 'prompt';
  canAskAgain: boolean;
}

export default function TeacherSelfAttendance() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const getLocalDateString = (value: Date) => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = new Date();
  const todayDate = getLocalDateString(today);
  const [location, setLocation] = useState<Location>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    isMock: false
  });
  const [isLocating, setIsLocating] = useState(false);
  const [isMarking, setIsMarking] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<'day' | 'month' | 'year'>('month');
  const [yearHistoryMode, setYearHistoryMode] = useState<'chart' | 'calendar'>('chart');
  const [selectedDate, setSelectedDate] = useState<string>(todayDate);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceHistory, setAttendanceHistory] = useState<HistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [schoolConfig, setSchoolConfig] = useState<SchoolConfig>({
    latitude: 12.345678,
    longitude: 98.765432,
    radius: 250,
    checkInStart: '08:00:00',
    checkInEnd: '10:00:00',
    lateThreshold: '09:00:00'
  });
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord | null | any>(null);
  const [showLocationDetails, setShowLocationDetails] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isGeolocationSupported, setIsGeolocationSupported] = useState<boolean>(true);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>({
    state: 'prompt',
    canAskAgain: true
  });
  const [retryCount, setRetryCount] = useState<number>(0);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [qrToken, setQrToken] = useState('');
  const [isQrMarking, setIsQrMarking] = useState(false);
  const historyChartRef = useRef<ChartJS<'line'> | null>(null);
  const [browserInfo, setBrowserInfo] = useState<{
    name: string;
    version: string;
    os: string;
    isMobile: boolean;
  }>({
    name: 'Unknown',
    version: 'Unknown',
    os: 'Unknown',
    isMobile: false
  });

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
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
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const resolveApiPayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined && payload.data !== null) {
      return payload.data as T;
    }
    return payload as T;
  };

  const getApiMessage = (payload: any, fallback: string) => {
    const candidates = [
      payload?.message,
      payload?.detail,
      payload?.error,
      payload?.data?.message,
      payload?.data?.detail,
      payload?.data?.error,
    ];

    const message = candidates.find((value) => typeof value === 'string' && value.trim());
    return message ? message.trim() : fallback;
  };

  const extractApiError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;

    const directMessage = getApiMessage(responseData, '');
    if (directMessage) {
      return directMessage;
    }

    if (Array.isArray(responseData)) {
      return responseData.map((item) => String(item)).join(', ');
    }

    if (responseData && typeof responseData === 'object') {
      const values = Object.values(responseData)
        .flatMap((value) => Array.isArray(value) ? value : [value])
        .filter(Boolean)
        .map((value) => String(value).trim())
        .filter(Boolean);

      if (values.length) {
        return values.join(', ');
      }
    }

    if (typeof err?.message === 'string' && err.message.trim()) {
      return err.message;
    }

    return fallback;
  };

  const normalizeAttendanceHistoryResponse = (payload: any): HistoryData | null => {
    if (!payload) {
      return null;
    }

    const looksLikeHistoryPayload =
      typeof payload?.period === 'string' ||
      payload?.summary ||
      payload?.history ||
      typeof payload?.status === 'string' ||
      payload?.data;

    if (looksLikeHistoryPayload) {
      return payload as HistoryData;
    }

    const unwrapped = resolveApiPayload<any>(payload);
    if (!unwrapped) {
      return null;
    }

    return unwrapped as HistoryData;
  };

  useEffect(() => {
    detectBrowserInfo();
    checkGeolocationSupport();
    loadInitialData();
    
    // Check for location permission changes
    const handlePermissionChange = () => {
      checkGeolocationPermission();
    };
    
    window.addEventListener('focus', handlePermissionChange);
    
    return () => {
      window.removeEventListener('focus', handlePermissionChange);
    };
  }, []);

  useEffect(() => {
    loadAttendanceHistory();
  }, [historyView, selectedDate, selectedYear, selectedMonth]);

  useEffect(() => {
    if (historyView !== 'year' || yearHistoryMode !== 'chart' || !attendanceHistory?.history) {
      if (historyChartRef.current) {
        historyChartRef.current.destroy();
        historyChartRef.current = null;
      }
      return;
    }

    const canvas = document.getElementById('teacherAttendanceYearChart') as HTMLCanvasElement | null;
    if (!canvas) {
      return;
    }

    if (historyChartRef.current) {
      historyChartRef.current.destroy();
      historyChartRef.current = null;
    }

    const monthSummaries = getYearMonthSummaries();
    historyChartRef.current = new ChartJS(canvas, {
      type: 'line',
      data: {
        labels: monthSummaries.map((month) => month.monthLabel),
        datasets: [
          {
            label: 'Present',
            data: monthSummaries.map((month) => month.present),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            pointBackgroundColor: 'rgb(16, 185, 129)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
          },
          {
            label: 'Late',
            data: monthSummaries.map((month) => month.late),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.12)',
            pointBackgroundColor: 'rgb(245, 158, 11)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
          },
          {
            label: 'Absent',
            data: monthSummaries.map((month) => month.absent),
            borderColor: 'rgb(244, 63, 94)',
            backgroundColor: 'rgba(244, 63, 94, 0.12)',
            pointBackgroundColor: 'rgb(244, 63, 94)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            labels: {
              color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            },
          },
          title: {
            display: true,
            text: `Attendance Trend - ${selectedYear}`,
            color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
            font: {
              size: 16,
              weight: 'bold',
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#4b5563',
            },
            grid: {
              color: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              color: theme === 'dark' ? '#9ca3af' : '#4b5563',
            },
            grid: {
              color: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            },
          },
        },
      },
    });

    return () => {
      if (historyChartRef.current) {
        historyChartRef.current.destroy();
        historyChartRef.current = null;
      }
    };
  }, [attendanceHistory, historyView, selectedYear, theme, yearHistoryMode]);

  const detectBrowserInfo = () => {
    const userAgent = navigator.userAgent;
    let browserName = 'Unknown';
    let browserVersion = 'Unknown';
    let os = 'Unknown';
    let isMobile = false;

    // Detect OS
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Detect Browser
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browserName = 'Chrome';
      browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Firefox')) {
      browserName = 'Firefox';
      browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browserName = 'Safari';
      browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    } else if (userAgent.includes('Edg')) {
      browserName = 'Edge';
      browserVersion = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    }

    // Detect Mobile
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

    setBrowserInfo({ name: browserName, version: browserVersion, os, isMobile });
  };

  const checkGeolocationSupport = () => {
    const supported = 'geolocation' in navigator;
    setIsGeolocationSupported(supported);
    
    if (supported) {
      checkGeolocationPermission();
    } else {
      setLocationError('Geolocation is not supported by your browser. Please use Chrome, Firefox, Edge, or Safari.');
    }
  };

  const checkGeolocationPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        
        setPermissionStatus({
          state: result.state as 'granted' | 'denied' | 'prompt',
          canAskAgain: result.state === 'prompt'
        });

        result.onchange = () => {
          setPermissionStatus({
            state: result.state as 'granted' | 'denied' | 'prompt',
            canAskAgain: result.state === 'prompt'
          });
        };
      } else {
        // Fallback for browsers without Permissions API
        setPermissionStatus({
          state: 'prompt',
          canAskAgain: true
        });
      }
    } catch (error) {
      console.log('Permissions API not available or error:', error);
      setPermissionStatus({
        state: 'prompt',
        canAskAgain: true
      });
    }
  };

  const loadInitialData = async () => {
    try {
      const profileResponse = await apiService.getTeacherProfile();
      const profile = resolveApiPayload<any>(profileResponse);
      setTeacherProfile(profile);
 
      
      await loadTodayAttendance();
    } catch (error) {
      console.error('Error loading initial data:', error);
      toastError(extractApiError(error, 'Failed to load profile data'));
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const historyResponse = await apiService.getAttendanceHistory({ date: todayDate });
      const history = normalizeAttendanceHistoryResponse(historyResponse);
      if (history?.data) {
        setTodayAttendance(history.data);
        setAttendanceStatus(history.data.status || null);
      } else if (history?.status) {
        setTodayAttendance(null);
        setAttendanceStatus(history.status);
      }
    } catch (error) {
      console.error('Error loading today attendance:', error);
    }
  };

  const loadAttendanceHistory = async () => {
    try {
      setLoadingHistory(true);
      let params = {};
      
      if (historyView === 'day') {
        params = { date: selectedDate };
      } else if (historyView === 'month') {
        params = { year: selectedYear, month: selectedMonth };
      } else if (historyView === 'year') {
        params = { year: selectedYear };
      }
      
      const historyResponse = await apiService.getAttendanceHistory(params);
      setAttendanceHistory(normalizeAttendanceHistoryResponse(historyResponse));
    } catch (error) {
      console.error('Error loading attendance history:', error);
      toastError(extractApiError(error, 'Failed to load attendance history'));
    } finally {
      setLoadingHistory(false);
    }
  };

  const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });
};


  const simulateLocationForTesting = async (): Promise<GeolocationPosition> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          coords: {
            latitude: schoolConfig.latitude,
            longitude: schoolConfig.longitude,
            accuracy: 25,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        } as GeolocationPosition);
      }, 1000);
    });
  };

  const openLocationSettings = () => {
    if (browserInfo.isMobile) {
      // Mobile devices
      if (browserInfo.os === 'Android') {
        toastInfo('Please go to Settings > Location > Enable location');
      } else if (browserInfo.os === 'iOS') {
        toastInfo('Please go to Settings > Privacy > Location Services > Enable');
      }
    } else {
      // Desktop instructions
      toastInfo('Allow location from the browser lock icon, then refresh and try again.', {
        autoClose: 5000,
      });
    }
  };

const handleMarkAttendance = async () => {
  console.log("fvfsv")
  if (!isGeolocationSupported) {
    toastError('Geolocation is not supported by your browser');
    setShowTroubleshooting(true);
    return;
  }

  if (permissionStatus.state === 'denied') {
    toastError('Location permission denied. Please allow location access in your browser settings.');
    openLocationSettings();
    setShowTroubleshooting(true);
    return;
  }

  if (todayAttendance) {
    toastInfo('Attendance already marked for today');
    return;
  }

  setIsLocating(true);
  setLocationError(null);
  
  try {
    let position:any;
    
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';
    
    // Check for testing mode
    const isTestingMode = localStorage.getItem('testing_mode') === 'true';
    
    if ((isLocalhost || isTestingMode) && retryCount >= 2) {
      // After 2 failures, offer simulated location for testing
      if (window.confirm('Geolocation seems to be failing. Would you like to use a simulated location for testing?')) {
        position = await simulateLocationForTesting();
        toastInfo('Using simulated location for testing');
      } else {
        throw new Error('Location access required');
      }
    } else {
      position = await getCurrentLocation();
    }

    console.log(position)
    
    // Access coordinates from position.coords
    const { latitude, longitude, accuracy } = position.coords;
    
    // Check if coordinates are valid
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new Error('Invalid coordinates received');
    }

    const isMocked = (position.coords as any).isMocked || false;
    
    // Set location state
    setLocation({
      latitude,
      longitude,
      accuracy,
      timestamp: position.timestamp,
      isMock: isMocked
    });
    
    console.log('Latitude:', latitude, 'Longitude:', longitude);
    
    setRetryCount(0);
    setShowLocationDetails(true);
    
    // Now mark attendance
    setIsMarking(true);
    
    // Call API to mark attendance
    const result = await apiService.markAttendance(
      latitude.toString(),
      longitude.toString()
    );
    const attendanceResult = resolveApiPayload<any>(result);
    
    console.log('API Response:', result);
    
    if (getApiMessage(result, '') === 'Already Marked' || attendanceResult?.message === 'Already Marked') {
      toastInfo('Attendance already marked for today');
      setAttendanceStatus(attendanceResult?.status || 'Present');
    } else {
      toastSuccess(getApiMessage(result, 'Attendance marked successfully'));
      setAttendanceStatus(attendanceResult?.status || result?.status || 'Present');
    }
    
    // Refresh data
    await loadTodayAttendance();
    await loadAttendanceHistory();
    
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    setLocationError(extractApiError(error, error?.message || 'Failed to get location'));
    setRetryCount(prev => prev + 1);

    const errorMessage = extractApiError(error, 'Failed to get location');
    toastError(errorMessage);

    if (error?.code === 'TIMEOUT' || error?.code === 'ERR_NETWORK' || error?.response?.status >= 500) {
      setShowTroubleshooting(true);
    }

    if (!error?.response) {
      const errorLines = String(error?.message || '').split('\n');
      if (errorLines.length > 1) {
        setShowTroubleshooting(true);
      }
    }
  } finally {
    setIsLocating(false);
    setIsMarking(false);
  }
};

  const handleMarkAttendanceByQR = async () => {
    if (todayAttendance) {
      toastInfo('Attendance already marked for today');
      return;
    }

    const trimmedToken = qrToken.trim();
    if (!trimmedToken) {
      toastInfo('Enter QR token to mark attendance');
      return;
    }

    setIsQrMarking(true);
    try {
      const result = await apiService.markAttendanceByQR(trimmedToken);
      const attendanceResult = resolveApiPayload<any>(result);
      const message = getApiMessage(result, 'Attendance marked successfully');

      if (message === 'Already Marked' || attendanceResult?.message === 'Already Marked') {
        toastInfo('Attendance already marked for today');
        setAttendanceStatus(attendanceResult?.status || attendanceStatus || 'Present');
      } else {
        toastSuccess(message);
        setAttendanceStatus(attendanceResult?.status || result?.status || 'Present');
      }

      setQrToken('');
      await loadTodayAttendance();
      await loadAttendanceHistory();
    } catch (error) {
      toastError(extractApiError(error, 'Failed to mark attendance using QR'));
    } finally {
      setIsQrMarking(false);
    }
  };


  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return 'N/A';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getStatusShortLabel = (status: string) => {
    switch (status) {
      case 'Present': return 'P';
      case 'Late': return 'L';
      case 'Absent': return 'A';
      case 'Sunday': return 'S';
      case 'Holiday': return 'H';
      default: return '-';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Late': return theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Absent': return theme === 'dark' ? 'bg-rose-900/30 text-rose-300 border-rose-800' : 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Sunday': return theme === 'dark' ? 'bg-violet-900/30 text-violet-300 border-violet-800' : 'bg-violet-100 text-violet-700 border-violet-200';
      case 'Holiday': return theme === 'dark' ? 'bg-sky-900/30 text-sky-300 border-sky-800' : 'bg-sky-100 text-sky-700 border-sky-200';
      default: return theme === 'dark' ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <FaCheckCircle className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'} />;
      case 'Late': return <FaClock className={theme === 'dark' ? 'text-amber-400' : 'text-amber-600'} />;
      case 'Absent': return <FaTimes className={theme === 'dark' ? 'text-rose-400' : 'text-rose-600'} />;
      case 'Sunday': return <FaCalendarDay className={theme === 'dark' ? 'text-violet-400' : 'text-violet-600'} />;
      case 'Holiday': return <FaCalendarAlt className={theme === 'dark' ? 'text-sky-400' : 'text-sky-600'} />;
      default: return <FaExclamationTriangle className={combine(get('text', 'tertiary'))} />;
    }
  };

  const getMonthHistoryRecords = (monthNumber?: number) => {
    if (!attendanceHistory?.history) {
      return [] as AttendanceRecord[];
    }

    if (typeof monthNumber === 'number') {
      return attendanceHistory.history[String(monthNumber)] || [];
    }

    return Object.values(attendanceHistory.history).flat();
  };

  const buildCalendarCells = (year: number, monthNumber: number, records: AttendanceRecord[]) => {
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const mondayFirstOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const recordMap = new Map(records.map((record) => [record.date, record]));
    const cells: Array<{ type: 'empty' } | { type: 'day'; day: number; record?: AttendanceRecord }> = [];

    for (let index = 0; index < mondayFirstOffset; index += 1) {
      cells.push({ type: 'empty' });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${year}-${String(monthNumber).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({
        type: 'day',
        day,
        record: recordMap.get(dateKey),
      });
    }

    return cells;
  };

  const getYearMonthSummaries = () => {
    const history = attendanceHistory?.history || {};

    return Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      const records = history[String(monthNumber)] || [];
      const present = records.filter((record) => record.status === 'Present').length;
      const late = records.filter((record) => record.status === 'Late').length;
      const absent = records.filter((record) => record.status === 'Absent').length;
      const total = records.length || 1;
      const attendanceRate = Math.round(((present + late) / total) * 100);

      return {
        monthNumber,
        monthLabel: new Date(selectedYear, index, 1).toLocaleDateString('en-US', { month: 'short' }),
        monthLongLabel: new Date(selectedYear, index, 1).toLocaleDateString('en-US', { month: 'long' }),
        records,
        present,
        late,
        absent,
        attendanceRate,
      };
    });
  };

  const isTodaySunday = today.getDay() === 0;
  const attendanceStateLabel = isTodaySunday
    ? 'Sunday'
    : (todayAttendance?.status || attendanceStatus || 'Absent');

  const renderHistoryCard = () => {
    return (
      <div className={combine(
        "rounded-xl sm:rounded-2xl border shadow-lg overflow-hidden",
        get('border', 'primary'),
        get('bg', 'card')
      )}>
        <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className={combine(
                "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaHistory className="text-lg sm:text-xl text-white" />
              </div>
              <div>
                <h2 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>Attendance History</h2>
                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>View your attendance records</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setHistoryView('day')}
                className={combine(
                  "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center gap-2",
                  historyView === 'day' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                )}
              >
                <FaCalendarDay />
                <span>Day</span>
              </button>
              <button
                onClick={() => setHistoryView('month')}
                className={combine(
                  "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center gap-2",
                  historyView === 'month' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                )}
              >
                <FaCalendarWeek />
                <span>Month</span>
              </button>
              <button
                onClick={() => setHistoryView('year')}
                className={combine(
                  "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center gap-2",
                  historyView === 'year' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                )}
              >
                <FaCalendar />
                <span>Year</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="mb-6">
            {historyView === 'day' && (
              <div className="grid grid-cols-1 xl:max-w-md">
                <div>
                  <label className={combine("block font-medium text-xs sm:text-sm mb-1.5", get('text', 'primary'))}>Select Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    max={todayDate}
                    className={combine(getInputClass(), "w-full")}
                  />
                </div>
              </div>
            )}
            
            {(historyView === 'month' || historyView === 'year') && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 xl:max-w-2xl">
                <div>
                  <label className={combine("block font-medium text-xs sm:text-sm mb-1.5", get('text', 'primary'))}>Year</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className={combine(getInputClass(), "w-full")}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {historyView === 'month' && (
                  <div>
                    <label className={combine("block font-medium text-xs sm:text-sm mb-1.5", get('text', 'primary'))}>Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className={combine(getInputClass(), "w-full")}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {new Date(2000, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                </div>
                {historyView === 'year' && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setYearHistoryMode('chart')}
                      className={combine(
                        "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center gap-2",
                        yearHistoryMode === 'chart' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                      )}
                    >
                      <FaChartBar />
                      <span>Chart</span>
                    </button>
                    <button
                      onClick={() => setYearHistoryMode('calendar')}
                      className={combine(
                        "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center gap-2",
                        yearHistoryMode === 'calendar' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                      )}
                    >
                      <FaCalendarAlt />
                      <span>Calendar</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* History Content */}
          {loadingHistory ? (
            <div className="text-center py-16">
              <div className={combine(
                "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaSpinner className={combine("text-2xl sm:text-3xl animate-spin", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
              </div>
              <p className={combine("text-sm sm:text-lg", get('text', 'secondary'))}>Loading attendance history...</p>
            </div>
          ) : attendanceHistory ? (
            <div className="space-y-6 sm:space-y-8">
              {attendanceHistory.summary && (
                <div className={combine(
                  "border rounded-xl sm:rounded-2xl p-4 sm:p-6",
                  theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-blue-100/30 border-blue-200'
                )}>
                  <h3 className={combine("text-lg sm:text-xl font-bold mb-6", get('text', 'primary'))}>Summary - {attendanceHistory.period}</h3>
                  <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    <div className={combine("text-center p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm", get('bg', 'card'), get('border', 'primary'))}>
                      <div className={combine("text-2xl sm:text-3xl font-bold mb-2", get('accent', 'success'))}>{attendanceHistory.summary.present}</div>
                      <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Present</div>
                      <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className={combine("text-center p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm", get('bg', 'card'), get('border', 'primary'))}>
                      <div className={combine("text-2xl sm:text-3xl font-bold mb-2", get('accent', 'warning'))}>{attendanceHistory.summary.late}</div>
                      <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Late</div>
                      <div className="w-16 h-1 bg-amber-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className={combine("text-center p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm", get('bg', 'card'), get('border', 'primary'))}>
                      <div className={combine("text-2xl sm:text-3xl font-bold mb-2", get('accent', 'error'))}>{attendanceHistory.summary.absent}</div>
                      <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Absent</div>
                      <div className="w-16 h-1 bg-rose-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className={combine("text-center p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm", get('bg', 'card'), get('border', 'primary'))}>
                      <div className={combine("text-2xl sm:text-3xl font-bold mb-2", get('accent', 'primary'))}>
                        {attendanceHistory.summary.percentage || attendanceHistory.summary.attendance_percentage}
                      </div>
                      <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Percentage</div>
                      <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mt-2"></div>
                    </div>
                  </div>
                  <div className={combine("mt-6 text-xs sm:text-sm grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3", get('text', 'secondary'))}>
                    <div className={combine("p-3 rounded-lg", get('bg', 'card'))}>Working Days: {attendanceHistory.summary.actual_working_days}</div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'card'))}>Total Days: {attendanceHistory.summary.total_days_passed}</div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'card'))}>Sundays: {attendanceHistory.summary.sundays}</div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'card'))}>Holidays: {attendanceHistory.summary.holidays}</div>
                  </div>
                </div>
              )}

              {/* Detailed History */}
              {attendanceHistory.history && historyView === 'month' ? (
                <div>
                  <div className={combine(
                    "rounded-xl p-4 sm:p-6 mb-6",
                    get('bg', 'secondary')
                  )}>
                    <h3 className={combine("text-sm sm:text-base font-bold mb-2", get('text', 'primary'))}>
                      Monthly Calendar View - {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <p className={combine("text-xs mb-4", get('text', 'secondary'))}>
                      Visualize attendance patterns across this month
                    </p>
                    <div className="flex flex-wrap gap-3 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-100 border border-green-300"></div>
                        <span className={combine("text-xs", get('text', 'secondary'))}>Present</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-100 border border-red-300"></div>
                        <span className={combine("text-xs", get('text', 'secondary'))}>Absent</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                        <span className={combine("text-xs", get('text', 'secondary'))}>Late</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-violet-100 border border-violet-300"></div>
                        <span className={combine("text-xs", get('text', 'secondary'))}>Sunday</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-sky-100 border border-sky-300"></div>
                        <span className={combine("text-xs", get('text', 'secondary'))}>Holiday</span>
                      </div>
                    </div>
                  </div>

                  <div className={combine(
                    "border rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow",
                    get('bg', 'card'),
                    get('border', 'primary')
                  )}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>
                        {new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString('en-US', { month: 'long' })} {selectedYear}
                      </h4>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>
                        {getMonthHistoryRecords(selectedMonth).filter((record) => record.status === 'Present').length}P / {getMonthHistoryRecords(selectedMonth).filter((record) => record.status === 'Absent').length}A / {getMonthHistoryRecords(selectedMonth).filter((record) => record.status === 'Late').length}L
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-3">
                      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                        <div key={`${day}-${index}`} className={combine("text-center text-xs font-medium", get('text', 'tertiary'))}>{day}</div>
                      ))}

                      {buildCalendarCells(selectedYear, selectedMonth, getMonthHistoryRecords(selectedMonth)).map((cell, index) => {
                        if (cell.type === 'empty') {
                          return <div key={`month-empty-${index}`} className="h-8 sm:h-10"></div>;
                        }

                        const dayData = cell.record;
                        return (
                          <div
                            key={`month-day-${cell.day}`}
                            className={combine(
                              "h-8 sm:h-10 rounded flex items-center justify-center text-xs font-medium cursor-help",
                              dayData
                                ? dayData.status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                  dayData.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                  dayData.status === 'Late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                  dayData.status === 'Sunday' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' :
                                  'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                            )}
                            title={dayData ? `${cell.day}: ${dayData.status}${dayData.check_in_time ? ` - ${formatTime(dayData.check_in_time)}` : ''}` : `${cell.day}: No attendance record`}
                          >
                            {cell.day}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : attendanceHistory.history && historyView === 'year' && yearHistoryMode === 'chart' ? (
                <div>
                  <div className={combine(
                    "rounded-xl p-4 sm:p-6 mb-6",
                    get('bg', 'secondary')
                  )}>
                    <h3 className={combine("text-sm sm:text-base font-bold mb-2", get('text', 'primary'))}>
                      Yearly Line Chart - {selectedYear}
                    </h3>
                    <p className={combine("text-xs", get('text', 'secondary'))}>
                      Track monthly attendance trends across the year
                    </p>
                  </div>
                  <div className={combine("rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg", get('bg', 'card'), get('border', 'primary'))}>
                    <div className="h-[320px] sm:h-[380px]">
                      <canvas id="teacherAttendanceYearChart"></canvas>
                    </div>
                  </div>
                </div>
              ) : attendanceHistory.history && historyView === 'year' && yearHistoryMode === 'calendar' ? (
                <div>
                  <div className={combine(
                    "rounded-xl p-4 sm:p-6 mb-6",
                    get('bg', 'secondary')
                  )}>
                    <h3 className={combine("text-sm sm:text-base font-bold mb-2", get('text', 'primary'))}>
                      Yearly Calendar View - {selectedYear}
                    </h3>
                    <p className={combine("text-xs", get('text', 'secondary'))}>
                      Visualize attendance patterns across all months
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6">
                    {getYearMonthSummaries().map((month) => (
                      <div key={month.monthNumber} className={combine(
                        "border rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow",
                        get('bg', 'card'),
                        get('border', 'primary')
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>
                            {month.monthLongLabel} {selectedYear}
                          </h4>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            {month.present}P / {month.absent}A / {month.late}L
                          </div>
                        </div>

                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-3">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                            <div key={`${month.monthNumber}-${day}-${index}`} className={combine("text-center text-xs font-medium", get('text', 'tertiary'))}>{day}</div>
                          ))}

                          {buildCalendarCells(selectedYear, month.monthNumber, month.records).map((cell, index) => {
                            if (cell.type === 'empty') {
                              return <div key={`year-empty-${month.monthNumber}-${index}`} className="h-6 sm:h-8"></div>;
                            }

                            const dayData = cell.record;
                            return (
                              <div
                                key={`year-day-${month.monthNumber}-${cell.day}`}
                                className={combine(
                                  "h-6 sm:h-8 rounded flex items-center justify-center text-xs font-medium cursor-help",
                                  dayData
                                    ? dayData.status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                      dayData.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                      dayData.status === 'Late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                      dayData.status === 'Sunday' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' :
                                      'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300'
                                    : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                )}
                                title={dayData ? `${cell.day}: ${dayData.status}${dayData.check_in_time ? ` - ${formatTime(dayData.check_in_time)}` : ''}` : `${cell.day}: No attendance record`}
                              >
                                {cell.day}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : attendanceHistory.history ? (
                <div>
                  <h3 className={combine("text-lg sm:text-xl font-bold mb-6", get('text', 'primary'))}>Detailed Records</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 sm:pr-3">
                    {Object.entries(attendanceHistory.history).map(([key, records]) => (
                      <div key={key} className="space-y-3">
                        <h4 className={combine("font-bold mb-2 text-base sm:text-lg px-2", get('text', 'secondary'))}>
                          {historyView === 'year' 
                            ? `Month ${key}` 
                            : `Day ${key}`}
                        </h4>
                        <div className="space-y-3">
                          {records.map((record, idx) => (
                            <div
                              key={idx}
                              className={combine(
                                "p-4 sm:p-5 border rounded-xl sm:rounded-2xl hover:shadow-lg transition-all duration-300",
                                theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700 hover:border-blue-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-blue-300'
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className={combine("font-bold text-base sm:text-lg mb-1", get('text', 'primary'))}>{record.date}</div>
                                  <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                    {record.check_in_time ? `Checked in at ${formatTime(record.check_in_time)}` : 'No check-in recorded'}
                                  </div>
                                </div>
                                <div className={`px-4 py-2.5 rounded-xl border-2 ${getStatusColor(record.status)} flex items-center gap-2 min-w-[140px] justify-center`}>
                                  {getStatusIcon(record.status)}
                                  <span className="font-bold text-sm sm:text-base">{record.status}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : attendanceHistory.data ? (
                <div className={combine(
                  "text-center p-8 sm:p-10 border rounded-xl sm:rounded-2xl",
                  theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                )}>
                  <div className={combine(
                    "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    {getStatusIcon(attendanceHistory.data.status)}
                  </div>
                  <h3 className={combine("text-xl sm:text-2xl font-bold mb-4", get('text', 'primary'))}>{attendanceHistory.data.date}</h3>
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${getStatusColor(attendanceHistory.data.status)} mb-6`}>
                    {getStatusIcon(attendanceHistory.data.status)}
                    <span className="font-bold text-base sm:text-xl">{attendanceHistory.data.status}</span>
                  </div>
                  {attendanceHistory.data.check_in_time && (
                    <div className={combine("text-sm sm:text-lg", get('text', 'secondary'))}>
                      Checked in at <span className={combine("font-bold", get('text', 'primary'))}>{formatTime(attendanceHistory.data.check_in_time)}</span>
                    </div>
                  )}
                </div>
              ) : attendanceHistory.status ? (
                <div className={combine(
                  "text-center p-8 sm:p-10 border rounded-xl sm:rounded-2xl",
                  theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
                )}>
                  <div className={combine(
                    "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    {getStatusIcon(attendanceHistory.status)}
                  </div>
                  <h3 className={combine("text-xl sm:text-2xl font-bold mb-4", get('text', 'primary'))}>
                    {attendanceHistory.date}
                  </h3>
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${getStatusColor(attendanceHistory.status)} mb-6`}>
                    {getStatusIcon(attendanceHistory.status)}
                    <span className="font-bold text-base sm:text-xl">{attendanceHistory.status}</span>
                  </div>
                  <div className={combine("text-sm sm:text-lg", get('text', 'secondary'))}>
                    {attendanceHistory.status === 'Absent'
                      ? `You were absent on ${attendanceHistory.date}`
                      : attendanceHistory.status === 'Sunday'
                        ? `${attendanceHistory.date} was a Sunday`
                        : attendanceHistory.status === 'Holiday'
                          ? `${attendanceHistory.date} was a holiday`
                          : `Status for ${attendanceHistory.date}`}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className={combine(
                    "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
                    get('bg', 'secondary')
                  )}>
                    <FaTimes className={combine("text-2xl sm:text-3xl", get('text', 'tertiary'))} />
                  </div>
                  <h3 className={combine("text-lg sm:text-xl font-bold mb-3", get('text', 'primary'))}>No Attendance Record</h3>
                  <p className={combine("text-sm sm:text-lg", get('text', 'secondary'))}>
                    {attendanceHistory.status === 'Absent' 
                      ? `You were absent on ${attendanceHistory.date}`
                      : 'No attendance records found for this period'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className={combine("text-sm sm:text-lg", get('text', 'secondary'))}>No attendance history available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-700 to-blue-800"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaUserCheck className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Teacher Self Attendance</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    Mark your daily attendance and review your history
                  </p>
                </div>
              </div>

	              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={handleMarkAttendance}
                  disabled={isLocating || isMarking || Boolean(todayAttendance)}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex w-full sm:w-auto items-center justify-center gap-2",
                    todayAttendance ? 'opacity-60 cursor-not-allowed hover:scale-100 hover:shadow-lg' : ''
                  )}
                >
                  {isLocating || isMarking ? (
                    <>
                      <FaSpinner className="animate-spin text-sm" />
                      <span>{isLocating ? 'Getting Location...' : 'Marking Attendance...'}</span>
                    </>
                  ) : (
                    <>
                      <FaUserCheck className="text-sm" />
                      <span>{todayAttendance ? `Checked in at ${formatTime(todayAttendance.check_in_time)}` : 'Mark Attendance'}</span>
                    </>
                  )}
                </button>

                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Today</div>
                  <div className="text-sm sm:text-base font-bold">
                    {todayDate}
                  </div>
                </div>
	                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
	                  <div className="text-[11px] sm:text-xs text-blue-100">Status</div>
	                  <div className="text-sm sm:text-base font-bold">
	                    {attendanceStateLabel}
	                  </div>
	                </div>
	              </div>
	            </div>

              <div className="mt-4 border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4">
                <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                  <div className="flex items-center gap-2 text-blue-100 text-xs sm:text-sm font-medium">
                    <FaQrcode className="text-sm" />
                    <span>Dynamic QR Attendance</span>
                  </div>
                  <div className="flex flex-1 flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={qrToken}
                      onChange={(e) => setQrToken(e.target.value)}
                      placeholder="Paste scanned QR token"
                      disabled={isQrMarking || Boolean(todayAttendance)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-white/90 text-gray-900 placeholder:text-gray-500 border border-white/40 focus:outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-60"
                    />
                    <button
                      onClick={handleMarkAttendanceByQR}
                      disabled={isQrMarking || Boolean(todayAttendance)}
                      className={combine(
                        "px-4 py-2 rounded-lg text-sm font-semibold min-w-[170px] transition-all",
                        todayAttendance
                          ? "bg-white/40 text-blue-100 cursor-not-allowed"
                          : "bg-white text-blue-700 hover:bg-blue-50",
                        isQrMarking ? "opacity-70 cursor-not-allowed" : ""
                      )}
                    >
                      {isQrMarking ? 'Marking via QR...' : 'Mark Via QR'}
                    </button>
                  </div>
                </div>
              </div>
	          </div>
	        </div>

        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          <div className={getCardGradientClass(
            attendanceStateLabel === 'Present'
              ? 'emerald'
              : attendanceStateLabel === 'Late'
                ? 'amber'
                : attendanceStateLabel === 'Absent'
                  ? 'red'
                  : attendanceStateLabel === 'Sunday'
                    ? 'purple'
                  : 'blue'
          )}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Today Status</p>
                <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{attendanceStateLabel}</p>
                <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                  {todayAttendance?.date || todayDate}
                </p>
              </div>
              <div className={combine(
                "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                attendanceStateLabel === 'Present'
                  ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')
                  : attendanceStateLabel === 'Late'
                    ? (theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')
                    : attendanceStateLabel === 'Absent'
                      ? (theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')
                      : attendanceStateLabel === 'Sunday'
                        ? (theme === 'dark' ? 'bg-violet-900/30' : 'bg-violet-100')
                      : (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')
              )}>
                {getStatusIcon(attendanceStateLabel)}
              </div>
            </div>
          </div>

          <div className={getCardGradientClass('blue')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Check-in Time</p>
                <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                  {todayAttendance?.check_in_time ? formatTime(todayAttendance.check_in_time) : '--'}
                </p>
                <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>Today entry</p>
              </div>
              <div className={combine("p-2 sm:p-3 rounded-lg sm:rounded-xl", theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')}>
                <FaClock className={combine("text-lg sm:text-xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
              </div>
            </div>
          </div>

          <div className={getCardGradientClass(permissionStatus.state === 'granted' ? 'emerald' : permissionStatus.state === 'denied' ? 'red' : 'amber')}>
            <div className="flex items-center justify-between">
              <div>
                <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Location Access</p>
                <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2 capitalize", get('text', 'primary'))}>
                  {permissionStatus.state}
                </p>
                <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                  {locationError ? 'Permission needs attention' : 'Required for attendance'}
                </p>
              </div>
              <div className={combine(
                "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                permissionStatus.state === 'granted'
                  ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')
                  : permissionStatus.state === 'denied'
                    ? (theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')
                    : (theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')
              )}>
                <FaMapMarkerAlt className={combine(
                  "text-lg sm:text-xl",
                  permissionStatus.state === 'granted'
                    ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')
                    : permissionStatus.state === 'denied'
                      ? (theme === 'dark' ? 'text-red-400' : 'text-red-600')
                      : (theme === 'dark' ? 'text-amber-400' : 'text-amber-600')
                )} />
              </div>
            </div>
          </div>

        </div>

        {teacherProfile && (
          <div className={combine(
            "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border mb-6 sm:mb-8",
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <FaUserCheck className="text-xl sm:text-2xl text-white" />
                </div>
                <div className="min-w-0">
                  <div className={combine("font-bold text-lg sm:text-xl truncate", get('text', 'primary'))}>{teacherProfile.name}</div>
                  <div className={combine("text-xs sm:text-sm truncate", get('text', 'secondary'))}>ID: {teacherProfile.teacher_id}</div>
                  {teacherProfile.department && (
                    <div className={combine("text-xs sm:text-sm truncate", get('text', 'tertiary'))}>{teacherProfile.department}</div>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={combine(
                  "px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium",
                  theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800'
                )}>
                  {attendanceStateLabel}
                </span>
                <span className={combine(
                  "px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium",
                  theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-800'
                )}>
                  {selectedDate}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6 sm:space-y-8">
          {renderHistoryCard()}
        </div>

      </div>
    </div>
  );
}
