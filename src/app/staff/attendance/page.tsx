'use client';

import React, { useState, useEffect } from 'react';
import {
  FaMapMarkerAlt, FaCheckCircle, FaTimes, FaClock, 
  FaCalendarAlt, FaCalendarDay, FaCalendarWeek, 
  FaCalendar, FaHistory, FaSpinner, FaExclamationTriangle,
  FaMapMarkedAlt, FaUserCheck, FaLocationArrow, FaQrcode,
  FaDoorOpen, FaSchool, FaRulerCombined,
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { staffApi } from '@/lib/api';

// API Service Functions for Staff
const staffApiService = {
  async markAttendance(latitude: string, longitude: string) {
    const response = await staffApi.attendance.mark({
      latitude: Number(latitude),
      longitude: Number(longitude),
    });
    return response.data?.data || response.data;
  },

  async getAttendanceHistory(params: Record<string, any> = {}) {
    const response = await staffApi.attendance.selfHistory(params);
    return response.data?.data || response.data;
  },

  async getStaffProfile() {
    const response = await staffApi.profile.get();
    return response.data?.data || response.data;
  },

  async markAttendanceByQR(token: string) {
    const response = await staffApi.attendance.qrScan(token);
    return response.data?.data || response.data;
  },
};

interface AttendanceRecord {
  date: string;
  check_in_time: string;
  status: 'Present' | 'Late' | 'Absent';
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

export default function StaffSelfAttendance() {
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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [attendanceHistory, setAttendanceHistory] = useState<HistoryData | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [staffProfile, setStaffProfile] = useState<any>(null);
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
      const profile = await staffApiService.getStaffProfile();
      setStaffProfile(profile?.data || profile);
      
      await loadTodayAttendance();
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load profile data');
    }
  };

  const loadTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const history = await staffApiService.getAttendanceHistory({ date: today });
      if (history.data) {
        setTodayAttendance(history.data);
        setAttendanceStatus(history.data.status);
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
      
      const history = await staffApiService.getAttendanceHistory(params);
      setAttendanceHistory(history);
    } catch (error) {
      console.error('Error loading attendance history:', error);
      toast.error('Failed to load attendance history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getCurrentLocation = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
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
        toast('Please go to: Settings → Location → Enable location');
      } else if (browserInfo.os === 'iOS') {
        toast('Please go to: Settings → Privacy → Location Services → Enable');
      }
    } else {
      // Desktop instructions
      const instructions = [
        'Click the lock/padlock icon in the address bar',
        'Find "Location" in the permissions list',
        'Change from "Block" or "Ask" to "Allow"',
        'Refresh this page and try again'
      ];
      
      toast(
        <div className="text-left">
          <p className="font-semibold mb-2">To allow location access:</p>
          {instructions.map((instruction, idx) => (
            <p key={idx} className="text-sm mb-1">• {instruction}</p>
          ))}
        </div>,
        { duration: 8000 }
      );
    }
  };

  const handleMarkAttendance = async () => {
    if (!isGeolocationSupported) {
      toast.error('Geolocation is not supported by your browser');
      setShowTroubleshooting(true);
      return;
    }

    if (permissionStatus.state === 'denied') {
      toast.error('Location permission denied. Please allow location access in your browser settings.');
      openLocationSettings();
      setShowTroubleshooting(true);
      return;
    }

    if (todayAttendance) {
      toast.error('Attendance already marked for today');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    
    try {
      let position: GeolocationPosition;
      
      const isLocalhost = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
      
      // Check for testing mode
      const isTestingMode = localStorage.getItem('testing_mode') === 'true';
      
      if ((isLocalhost || isTestingMode) && retryCount >= 2) {
        // After 2 failures, offer simulated location for testing
        if (window.confirm('Geolocation seems to be failing. Would you like to use a simulated location for testing?')) {
          position = await simulateLocationForTesting();
          toast.success('Using simulated location for testing');
        } else {
          throw new Error('Location access required');
        }
      } else {
        position = await getCurrentLocation();
      }
      
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
      
      setRetryCount(0);
      setShowLocationDetails(true);
      
      // Now mark attendance
      setIsMarking(true);
      
      // Call API to mark attendance
      const result = await staffApiService.markAttendance(
        latitude.toString(),
        longitude.toString()
      );
      
      if (result.message === 'Already Marked') {
        toast.success('Attendance already marked for today');
        setAttendanceStatus('Present');
      } else {
        toast.success(result.message);
        setAttendanceStatus(result.status);
      }
      
      // Refresh data
      await loadTodayAttendance();
      await loadAttendanceHistory();
      
    } catch (error: any) {
      console.error('Error marking attendance:', error);
      setLocationError(error.message);
      setRetryCount(prev => prev + 1);
      
      // Handle API errors
      if (error.message.includes('API Error:')) {
        const apiError = error.message;
        if (apiError.includes('403')) {
          if (apiError.includes('Out of range')) {
            toast.error(`You are outside the allowed range (${schoolConfig.radius}m from school)`);
          } else if (apiError.includes('Invalid Coords')) {
            toast.error('Invalid coordinates detected');
          } else if (apiError.includes('Config Missing')) {
            toast.error('School configuration missing');
          } else if (apiError.includes('holiday')) {
            toast.error('Today is a holiday. Attendance not allowed.');
          } else if (apiError.includes('Unauthorized')) {
            toast.error('You are not authorized to mark attendance');
          }
        } else if (apiError.includes('400')) {
          toast.error('Invalid request. Please try again.');
        } else if (apiError.includes('Timeout')) {
          toast.error('Server timeout. Please try again.');
        }
      } else {
        // Geolocation errors
        const errorLines = error.message.split('\n');
        toast.error(errorLines[0] || 'Failed to get location');
        
        if (errorLines.length > 1) {
          setShowTroubleshooting(true);
        }
      }
    } finally {
      setIsLocating(false);
      setIsMarking(false);
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

  const handleMarkAttendanceByQR = async () => {
    if (todayAttendance) {
      toast.error('Attendance already marked for today');
      return;
    }

    const trimmedToken = qrToken.trim();
    if (!trimmedToken) {
      toast.error('Enter QR token to mark attendance');
      return;
    }

    setIsQrMarking(true);
    try {
      const result = await staffApiService.markAttendanceByQR(trimmedToken);
      const message = result?.message || 'Attendance marked successfully';

      if (message === 'Already Marked') {
        toast.success('Attendance already marked for today');
        setAttendanceStatus(result?.status || attendanceStatus || 'Present');
      } else {
        toast.success(message);
        setAttendanceStatus(result?.status || 'Present');
      }

      setQrToken('');
      await loadTodayAttendance();
      await loadAttendanceHistory();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to mark attendance using QR'));
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'Late': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Absent': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Present': return <FaCheckCircle className="text-emerald-600" />;
      case 'Late': return <FaClock className="text-amber-600" />;
      case 'Absent': return <FaTimes className="text-rose-600" />;
      default: return <FaExclamationTriangle className="text-gray-600" />;
    }
  };

  const renderHistoryCard = () => {
    return (
      <div className="bg-gradient-to-br from-white to-blue-50/50 rounded-3xl border border-blue-200 shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <FaHistory className="text-2xl text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Attendance History</h2>
                <p className="text-white/90 text-sm">View your attendance records</p>
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setHistoryView('day')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                historyView === 'day'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <FaCalendarDay /> Day
            </button>
            <button
              onClick={() => setHistoryView('month')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                historyView === 'month'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <FaCalendarWeek /> Month
            </button>
            <button
              onClick={() => setHistoryView('year')}
              className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                historyView === 'year'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <FaCalendar /> Year
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6">
          {/* Date Selectors */}
          <div className="mb-6">
            {historyView === 'day' && (
              <div className="flex items-center gap-3">
                <label className="text-gray-700 font-medium">Select Date:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}
            
            {(historyView === 'month' || historyView === 'year') && (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-gray-700 font-medium">Year:</label>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
                
                {historyView === 'month' && (
                  <div className="flex items-center gap-3">
                    <label className="text-gray-700 font-medium">Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-4 py-2.5 border-2 border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
            )}
          </div>

          {/* History Content */}
          {loadingHistory ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                <FaSpinner className="text-3xl text-blue-600 animate-spin" />
              </div>
              <p className="text-gray-600 text-lg">Loading attendance history...</p>
            </div>
          ) : attendanceHistory ? (
            <div className="space-y-8">
              {/* Summary Section */}
              {attendanceHistory.summary && (
                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl p-6">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Summary - {attendanceHistory.period}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-blue-100 shadow-sm">
                      <div className="text-3xl font-bold text-blue-700 mb-2">{attendanceHistory.summary.present}</div>
                      <div className="text-sm font-medium text-gray-600">Present</div>
                      <div className="w-16 h-1 bg-blue-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-amber-100 shadow-sm">
                      <div className="text-3xl font-bold text-amber-700 mb-2">{attendanceHistory.summary.late}</div>
                      <div className="text-sm font-medium text-gray-600">Late</div>
                      <div className="w-16 h-1 bg-amber-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-rose-100 shadow-sm">
                      <div className="text-3xl font-bold text-rose-700 mb-2">{attendanceHistory.summary.absent}</div>
                      <div className="text-sm font-medium text-gray-600">Absent</div>
                      <div className="w-16 h-1 bg-rose-500 rounded-full mx-auto mt-2"></div>
                    </div>
                    <div className="text-center p-4 bg-white rounded-xl border-2 border-emerald-100 shadow-sm">
                      <div className="text-3xl font-bold text-emerald-700 mb-2">
                        {attendanceHistory.summary.percentage || attendanceHistory.summary.attendance_percentage}
                      </div>
                      <div className="text-sm font-medium text-gray-600">Percentage</div>
                      <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mt-2"></div>
                    </div>
                  </div>
                  <div className="mt-6 text-sm text-gray-600 grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-white/50 rounded-lg">Working Days: {attendanceHistory.summary.actual_working_days}</div>
                    <div className="p-3 bg-white/50 rounded-lg">Total Days: {attendanceHistory.summary.total_days_passed}</div>
                    <div className="p-3 bg-white/50 rounded-lg">Sundays: {attendanceHistory.summary.sundays}</div>
                    <div className="p-3 bg-white/50 rounded-lg">Holidays: {attendanceHistory.summary.holidays}</div>
                  </div>
                </div>
              )}

              {/* Detailed History */}
              {attendanceHistory.history ? (
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Detailed Records</h3>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-3">
                    {Object.entries(attendanceHistory.history).map(([key, records]) => (
                      <div key={key} className="space-y-3">
                        <h4 className="font-bold text-gray-700 mb-2 text-lg px-2">
                          {historyView === 'year' 
                            ? `Month ${key}` 
                            : `Day ${key}`}
                        </h4>
                        <div className="space-y-3">
                          {records.map((record, idx) => (
                            <div
                              key={idx}
                              className="p-5 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all duration-300"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex-1">
                                  <div className="font-bold text-gray-800 text-lg mb-1">{record.date}</div>
                                  <div className="text-gray-600">
                                    {record.check_in_time ? `Checked in at ${formatTime(record.check_in_time)}` : 'No check-in recorded'}
                                  </div>
                                </div>
                                <div className={`px-4 py-2.5 rounded-xl border-2 ${getStatusColor(record.status)} flex items-center gap-2 min-w-[140px] justify-center`}>
                                  {getStatusIcon(record.status)}
                                  <span className="font-bold text-lg">{record.status}</span>
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
                <div className="text-center p-10 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-2xl">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full mb-6">
                    {getStatusIcon(attendanceHistory.data.status)}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-4">{attendanceHistory.data.date}</h3>
                  <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-xl border-2 ${getStatusColor(attendanceHistory.data.status)} mb-6`}>
                    {getStatusIcon(attendanceHistory.data.status)}
                    <span className="font-bold text-xl">{attendanceHistory.data.status}</span>
                  </div>
                  {attendanceHistory.data.check_in_time && (
                    <div className="text-gray-600 text-lg">
                      Checked in at <span className="font-bold text-gray-800">{formatTime(attendanceHistory.data.check_in_time)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6">
                    <FaTimes className="text-3xl text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">No Attendance Record</h3>
                  <p className="text-gray-600 text-lg">
                    {attendanceHistory.status === 'Absent' 
                      ? `You were absent on ${attendanceHistory.date}`
                      : 'No attendance records found for this period'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-600 text-lg">No attendance history available</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-4 md:p-8">
      <Toaster 
        position="top-right" 
        toastOptions={{
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
            border: '2px solid #e2e8f0',
            color: '#1e293b',
            borderRadius: '1rem',
            padding: '1rem',
            fontSize: '0.95rem',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto z-10">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
                Staff Self Attendance
              </h1>
              <p className="text-gray-600 text-lg">
                Mark your daily attendance and view your history
              </p>
            </div>
            
            {/* Staff Profile */}
            {staffProfile && (
              <div className="flex flex-col md:flex-row items-stretch gap-6 w-full">
                <div className="flex flex-col gap-3 w-full md:max-w-[380px]">
                  {/* Attendance Button */}
                  <button
                    onClick={handleMarkAttendance}
                    disabled={isLocating || isMarking || todayAttendance}
                    className={`w-full py-5 rounded-2xl font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-xl ${
                      todayAttendance
                        ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 hover:scale-[1.02] active:scale-95'
                    }`}
                  >
                    {isLocating || isMarking ? (
                      <>
                        <FaSpinner className="animate-spin text-xl" />
                        <span className="text-lg">
                          {isLocating ? 'Getting Location...' : 'Marking Attendance...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaUserCheck className="text-xl" />
                        <span className="text-lg">
                          {todayAttendance
                            ? `Checked in at ${formatTime(todayAttendance.check_in_time)}`
                            : 'Mark Attendance'
                          }
                        </span>
                      </>
                    )}
                  </button>

                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-lg p-3">
                    <div className="flex items-center gap-2 mb-2 text-blue-700 font-semibold">
                      <FaQrcode />
                      <span>Dynamic QR Attendance</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={qrToken}
                        onChange={(e) => setQrToken(e.target.value)}
                        placeholder="Paste scanned QR token"
                        disabled={isQrMarking || Boolean(todayAttendance)}
                        className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={handleMarkAttendanceByQR}
                        disabled={isQrMarking || Boolean(todayAttendance)}
                        className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap ${
                          todayAttendance
                            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        } ${isQrMarking ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {isQrMarking ? 'Marking...' : 'Mark Via QR'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Staff Profile Card */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border-2 border-blue-200 shadow-lg p-5 min-w-[280px]">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                      <FaUserCheck className="text-2xl text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 text-xl truncate">{staffProfile.name}</div>
                      <div className="text-gray-600 truncate">ID: {staffProfile.staff_id}</div>
                      {staffProfile.department && (
                        <div className="text-gray-500 text-sm truncate">{staffProfile.department}</div>
                      )}
                      {staffProfile.designation && (
                        <div className="text-gray-500 text-sm truncate">{staffProfile.designation}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-8">
          {/* History Card */}
          {renderHistoryCard()}
        </div>

      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        
        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #93c5fd;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #60a5fa;
        }
      `}</style>
    </div>
  );
}
