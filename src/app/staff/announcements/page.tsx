// app/staff/announcements/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  FaBullhorn,
  FaCalendarAlt,
  FaBell,
  FaFilter,
  FaSearch,
  FaArrowLeft,
  FaSync,
  FaEye,
  FaEyeSlash,
  FaExclamationTriangle,
  FaInfoCircle,
  FaNewspaper,
  FaUsers,
  FaCalendarDay,
  FaSchool,
  FaUserTie,
  FaIdBadge,
  FaTimes
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { staffApi } from '@/lib/api';

interface Announcement {
  id: number;
  title: string;
  description: string;
  date: string;
  academic_year: string;
  created_at: string;
  visibility?: string;
  target_role?: string | null;
}

interface StaffAnnouncementsResponse {
  status: number;
  viewer_role: string;
  year: string;
  viewing_date: string;
  filter: string;
  common_announcements: Announcement[];
  all_staff_announcements: Announcement[];
  role_specific_announcements: Announcement[];
}

type AnnouncementSource = 'all' | 'common' | 'all_staff' | 'my_role';

export default function StaffAnnouncementsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State for API response
  const [apiData, setApiData] = useState<StaffAnnouncementsResponse>({
    status: 200,
    viewer_role: '',
    year: '',
    viewing_date: '',
    filter: 'all',
    common_announcements: [],
    all_staff_announcements: [],
    role_specific_announcements: []
  });
  
  const [selectedDate, setSelectedDate] = useState<string>(() => {
  return new Date().toISOString().split('T')[0]; // Today's date
});
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<AnnouncementSource>('all');
  const [activeFilters, setActiveFilters] = useState<{
    date: string | null;
    source: AnnouncementSource;
  }>({
    date: new Date().toISOString().split('T')[0], // Today's date by default
    source: 'all'
  });

  // Load announcements data
  const loadAnnouncementsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { date?: string; source?: string } = {};
      if (activeFilters.date) params.date = activeFilters.date;
      if (activeFilters.source && activeFilters.source !== 'all') {
        params.source = activeFilters.source;
      }
      const apiResponse = await staffApi.announcements.dashboard(params);
      const response = apiResponse.data?.data || apiResponse.data;
      
      if (response.status === 200) {
        setApiData(response);
        
        // Mark announcements as read in localStorage
        const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
        const allAnnouncements = [
          ...response.common_announcements,
          ...response.all_staff_announcements,
          ...response.role_specific_announcements
        ];
        
        allAnnouncements.forEach((ann: Announcement) => {
          const announcementKey = `announcement-${ann.id}`;
          if (!readAnnouncements.includes(announcementKey)) {
            readAnnouncements.push(announcementKey);
          }
        });
        
        localStorage.setItem('readAnnouncements', JSON.stringify(readAnnouncements));
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        router.push('/');
        return;
      }
      if (err?.response?.status === 403) {
        setError('Access forbidden: You do not have staff permissions');
        return;
      }
      if (err?.response?.status === 500) {
        setError('Server error: No active academic year found');
        return;
      }
      console.error('Error loading announcements:', err);
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    setActiveFilters({
      date: selectedDate || null, // Convert empty string to null
      source: sourceFilter
    });
  };

  // Reset filters to initial state (today's date, all sources)
  const resetFilters = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setSourceFilter('all');
    setSearchQuery('');
    setActiveFilters({
      date: today, // Reset to today's date
      source: 'all'
    });
  };

  // Clear date filter
  const clearDateFilter = () => {
    setSelectedDate('');
    setActiveFilters(prev => ({
      ...prev,
      date: null // Set to null to get all announcements
    }));
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (user?.user_type !== 'staff') {
        router.push(`/${user?.user_type}`);
      } else {
        loadAnnouncementsData();
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    // Load data whenever activeFilters changes
    loadAnnouncementsData();
  }, [activeFilters]);

  // Filter announcements based on search query (client-side)
  const filterAnnouncementsBySearch = (announcements: Announcement[]) => {
    if (!searchQuery.trim()) return announcements;
    
    const query = searchQuery.toLowerCase();
    return announcements.filter(announcement => 
      announcement.title.toLowerCase().includes(query) ||
      announcement.description.toLowerCase().includes(query)
    );
  };

  // Get filtered announcements for each section
  const filteredCommonAnnouncements = filterAnnouncementsBySearch(apiData.common_announcements);
  const filteredAllStaffAnnouncements = filterAnnouncementsBySearch(apiData.all_staff_announcements);
  const filteredRoleSpecificAnnouncements = filterAnnouncementsBySearch(apiData.role_specific_announcements);

  // Get total count based on source filter
  const getTotalAnnouncementsCount = () => {
    switch (sourceFilter) {
      case 'common':
        return filteredCommonAnnouncements.length;
      case 'all_staff':
        return filteredAllStaffAnnouncements.length;
      case 'my_role':
        return filteredRoleSpecificAnnouncements.length;
      default:
        return filteredCommonAnnouncements.length + 
               filteredAllStaffAnnouncements.length + 
               filteredRoleSpecificAnnouncements.length;
    }
  };

  // Mark announcement as read
  const markAsRead = (announcementId: number) => {
    const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    const announcementKey = `announcement-${announcementId}`;
    
    if (!readAnnouncements.includes(announcementKey)) {
      readAnnouncements.push(announcementKey);
      localStorage.setItem('readAnnouncements', JSON.stringify(readAnnouncements));
      // Trigger re-render
      loadAnnouncementsData();
    }
  };

  // Check if announcement is read
  const isAnnouncementRead = (announcementId: number) => {
    const readAnnouncements = JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    const announcementKey = `announcement-${announcementId}`;
    return readAnnouncements.includes(announcementKey);
  };

  // Format role name
  const formatRoleName = (role: string) => {
    return role.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  // Get announcement type badge
  const getAnnouncementTypeBadge = (type: string) => {
    switch (type) {
      case 'common':
        return { text: 'School-wide', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' };
      case 'all_staff':
        return { text: 'All Staff', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' };
      case 'my_role':
        return { text: 'Role Specific', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' };
      default:
        return { text: 'Announcement', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300' };
    }
  };

  // Get icon for announcement type
  const getAnnouncementIcon = (type: string) => {
    switch (type) {
      case 'common':
        return <FaSchool className="text-blue-600 dark:text-blue-400 text-xl" />;
      case 'all_staff':
        return <FaUsers className="text-purple-600 dark:text-purple-400 text-xl" />;
      case 'my_role':
        return <FaUserTie className="text-green-600 dark:text-green-400 text-xl" />;
      default:
        return <FaBullhorn className="text-gray-600 dark:text-gray-400 text-xl" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/staff')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <FaArrowLeft className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                Announcements Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Academic Year: {apiData.year || '2024-2025'} • 
                Showing: {activeFilters.date ? `Announcements for ${activeFilters.date}` : 'All announcements'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Show Today
            </button>
            <button
              onClick={loadAnnouncementsData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaSync /> Refresh
            </button>
          </div>
        </div>

        {/* WELCOME CARD */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaBullhorn className="text-yellow-300" />
                Welcome, {formatRoleName(apiData.viewer_role)}!
              </h2>
              <p className="text-blue-100 mt-2">
                {activeFilters.date 
                  ? `Showing announcements for ${activeFilters.date}`
                  : 'Showing all announcements'}
              </p>
              <div className="flex flex-wrap gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">Common: {apiData.common_announcements.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span className="text-sm">All Staff: {apiData.all_staff_announcements.length}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Role Specific: {apiData.role_specific_announcements.length}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              <div className="text-center">
                <div className="text-4xl font-bold mb-1">{getTotalAnnouncementsCount()}</div>
                <div className="text-blue-200">
                  {activeFilters.date ? 'Filtered' : 'Total'} Announcements
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FILTERS SECTION */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaFilter className="text-blue-600" />
              Filter Announcements
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Showing {getTotalAnnouncementsCount()} results
              {activeFilters.date && ` for ${activeFilters.date}`}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Announcements
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title or description..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Filter by Date
              </label>
              <div className="relative">
                <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {selectedDate && (
                  <button
                    onClick={clearDateFilter}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to show all announcements
              </p>
            </div>

            {/* Source Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Announcement Type
              </label>
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as AnnouncementSource)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Announcements</option>
                <option value="common">School-wide Only</option>
                <option value="all_staff">All Staff Only</option>
                <option value="my_role">My Role Only</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={clearDateFilter}
              className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Clear Date Filter
            </button>
            <button
              onClick={applyFilters}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
            >
              Apply Filters
            </button>
          </div>

          
        </div>

        {/* ANNOUNCEMENTS SECTIONS */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-6">
            <div className="flex items-start gap-3">
              <FaExclamationTriangle className="text-red-500 text-xl mt-0.5" />
              <div>
                <h3 className="font-bold text-red-800 dark:text-red-300">Error Loading Announcements</h3>
                <p className="text-red-600 dark:text-red-400 mt-1">{error}</p>
                <button
                  onClick={loadAnnouncementsData}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMMON ANNOUNCEMENTS */}
        {(sourceFilter === 'all' || sourceFilter === 'common') && filteredCommonAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-2xl shadow-lg border border-blue-200 dark:border-blue-700 overflow-hidden"
          >
            <div className="p-6 border-b border-blue-200 dark:border-blue-700 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <FaSchool className="text-blue-600 dark:text-blue-400 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">School-wide Announcements</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Important updates for everyone in the school</p>
                  </div>
                </div>
                <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-4 py-2 rounded-full font-medium">
                  {filteredCommonAnnouncements.length} announcements
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {filteredCommonAnnouncements.map((announcement, index) => (
                <div
                  key={`common-${announcement.id}`}
                  className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all ${
                    !isAnnouncementRead(announcement.id) ? 'border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${getAnnouncementTypeBadge('common').color.replace('text-', 'bg-').split(' ')[0]}`}>
                          {getAnnouncementIcon('common')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                {announcement.title}
                                {!isAnnouncementRead(announcement.id) && (
                                  <span className="ml-2 inline-flex h-2 w-2 bg-blue-500 rounded-full animate-pulse"></span>
                                )}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {announcement.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                <FaCalendarAlt className="inline mr-1" />
                                {new Date(announcement.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAnnouncementTypeBadge('common').color}`}>
                                {getAnnouncementTypeBadge('common').text}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <FaCalendarAlt />
                              <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isAnnouncementRead(announcement.id) && (
                                <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full">
                                  New
                                </span>
                              )}
                              <button
                                onClick={() => markAsRead(announcement.id)}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
                              >
                                {isAnnouncementRead(announcement.id) ? (
                                  <>
                                    <FaEye /> Marked as Read
                                  </>
                                ) : (
                                  <>
                                    <FaEyeSlash /> Mark as Read
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ALL STAFF ANNOUNCEMENTS */}
        {(sourceFilter === 'all' || sourceFilter === 'all_staff') && filteredAllStaffAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-2xl shadow-lg border border-purple-200 dark:border-purple-700 overflow-hidden"
          >
            <div className="p-6 border-b border-purple-200 dark:border-purple-700 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <FaUsers className="text-purple-600 dark:text-purple-400 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">All Staff Announcements</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Updates relevant to all staff members</p>
                  </div>
                </div>
                <span className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-4 py-2 rounded-full font-medium">
                  {filteredAllStaffAnnouncements.length} announcements
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {filteredAllStaffAnnouncements.map((announcement) => (
                <div
                  key={`all-staff-${announcement.id}`}
                  className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all ${
                    !isAnnouncementRead(announcement.id) ? 'border-l-4 border-l-purple-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${getAnnouncementTypeBadge('all_staff').color.replace('text-', 'bg-').split(' ')[0]}`}>
                          {getAnnouncementIcon('all_staff')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                {announcement.title}
                                {!isAnnouncementRead(announcement.id) && (
                                  <span className="ml-2 inline-flex h-2 w-2 bg-purple-500 rounded-full animate-pulse"></span>
                                )}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {announcement.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                <FaCalendarAlt className="inline mr-1" />
                                {new Date(announcement.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAnnouncementTypeBadge('all_staff').color}`}>
                                {getAnnouncementTypeBadge('all_staff').text}
                              </span>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <FaCalendarAlt />
                              <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isAnnouncementRead(announcement.id) && (
                                <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-3 py-1 rounded-full">
                                  New
                                </span>
                              )}
                              <button
                                onClick={() => markAsRead(announcement.id)}
                                className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
                              >
                                {isAnnouncementRead(announcement.id) ? (
                                  <>
                                    <FaEye /> Marked as Read
                                  </>
                                ) : (
                                  <>
                                    <FaEyeSlash /> Mark as Read
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ROLE-SPECIFIC ANNOUNCEMENTS */}
        {(sourceFilter === 'all' || sourceFilter === 'my_role') && filteredRoleSpecificAnnouncements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl shadow-lg border border-green-200 dark:border-green-700 overflow-hidden"
          >
            <div className="p-6 border-b border-green-200 dark:border-green-700 bg-white/50 dark:bg-gray-800/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <FaUserTie className="text-green-600 dark:text-green-400 text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">Role-Specific Announcements</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      Updates specifically for {formatRoleName(apiData.viewer_role)} role
                    </p>
                  </div>
                </div>
                <span className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-4 py-2 rounded-full font-medium">
                  {filteredRoleSpecificAnnouncements.length} announcements
                </span>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {filteredRoleSpecificAnnouncements.map((announcement) => (
                <div
                  key={`role-${announcement.id}`}
                  className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-all ${
                    !isAnnouncementRead(announcement.id) ? 'border-l-4 border-l-green-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-lg ${getAnnouncementTypeBadge('my_role').color.replace('text-', 'bg-').split(' ')[0]}`}>
                          {getAnnouncementIcon('my_role')}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
                                {announcement.title}
                                {!isAnnouncementRead(announcement.id) && (
                                  <span className="ml-2 inline-flex h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                                )}
                              </h3>
                              <p className="text-gray-600 dark:text-gray-400">
                                {announcement.description}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2 ml-4">
                              <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                <FaCalendarAlt className="inline mr-1" />
                                {new Date(announcement.date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAnnouncementTypeBadge('my_role').color}`}>
                                  {getAnnouncementTypeBadge('my_role').text}
                                </span>
                                {announcement.target_role && (
                                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
                                    <FaIdBadge className="inline mr-1" />
                                    {formatRoleName(announcement.target_role)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              <FaCalendarAlt />
                              <span>Created: {new Date(announcement.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {!isAnnouncementRead(announcement.id) && (
                                <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full">
                                  New
                                </span>
                              )}
                              <button
                                onClick={() => markAsRead(announcement.id)}
                                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1"
                              >
                                {isAnnouncementRead(announcement.id) ? (
                                  <>
                                    <FaEye /> Marked as Read
                                  </>
                                ) : (
                                  <>
                                    <FaEyeSlash /> Mark as Read
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* NO ANNOUNCEMENTS MESSAGE */}
        {!error && getTotalAnnouncementsCount() === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <FaBullhorn className="text-3xl text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3">
                {activeFilters.date 
                  ? `No Announcements for ${activeFilters.date}`
                  : 'No Announcements Found'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {activeFilters.date 
                  ? 'There are no announcements for the selected date. Try a different date or clear the date filter.'
                  : 'There are no announcements matching your current filters. Try adjusting your filters or check back later.'}
              </p>
              <div className="flex gap-3 justify-center">
                {activeFilters.date && (
                  <button
                    onClick={clearDateFilter}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Clear Date Filter
                  </button>
                )}
                <button
                  onClick={resetFilters}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Show Today's Announcements
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QUICK STATS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {getTotalAnnouncementsCount()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activeFilters.date ? 'Filtered' : 'All'}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FaBullhorn className="text-blue-600 dark:text-blue-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {[...apiData.common_announcements, ...apiData.all_staff_announcements, ...apiData.role_specific_announcements]
                    .filter(ann => !isAnnouncementRead(ann.id)).length}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <FaBell className="text-red-600 dark:text-red-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">This Month</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {[...apiData.common_announcements, ...apiData.all_staff_announcements, ...apiData.role_specific_announcements]
                    .filter(ann => {
                      const announcementDate = new Date(ann.date);
                      const now = new Date();
                      return announcementDate.getMonth() === now.getMonth() && 
                             announcementDate.getFullYear() === now.getFullYear();
                    }).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FaCalendarDay className="text-green-600 dark:text-green-400 text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your Role</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {apiData.role_specific_announcements.length}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <FaIdBadge className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-6">
          <p>Showing announcements for academic year {apiData.year || '2024-2025'}</p>
          <p className="mt-1">
            {activeFilters.date 
              ? `Filtered by date: ${activeFilters.date}`
              : 'Showing all announcements'}
          </p>
          <p className="mt-1">Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>
    </div>
  );
}
