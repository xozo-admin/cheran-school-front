// app/student/announcements/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  FaBullhorn,
  FaFilter,
  FaSearch,
  FaCalendarAlt,
  FaUserTie,
  FaBook,
  FaBell,
  FaDownload,
  FaPrint,
  FaChevronLeft,
  FaChevronRight,
  FaChevronUp,
  FaChevronDown,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEnvelope,
  FaCalendarDay,
  FaEye,
  FaTimes,
  FaInfoCircle
} from 'react-icons/fa';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { studentApi } from '@/lib/api';

interface Announcement {
  announcement_number: number;
  posted_by: string;
  class_name: string;
  section_name: string;
  subject_name: string;
  announcement_type: 'general' | 'exam' | 'holiday' | 'event' | 'academic' | 'emergency';
  description: string;
  posted_time: string;
  posted_date?: string;
  priority?: 'high' | 'medium' | 'low';
  academic_year?: string;
}

interface AnnouncementsResponse {
  status: number;
  student: string;
  class: string;
  year: string;
  view_mode: string;
  count: number;
  class_announcements: Announcement[];
  school_announcements: Announcement[];
}

interface Subject {
  id: number;
  name: string;
  subject_code: string;
}

interface SubjectsResponse {
  status: number;
  message: string;
  student: {
    name: string;
    student_id: string;
    class: string;
    section: string;
  };
  subjects: Subject[];
  subject_count: number;
}

export default function AnnouncementsPage() {
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<AnnouncementsResponse | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [todayAnnouncements, setTodayAnnouncements] = useState<Announcement[]>([]);
  const [filteredAnnouncements, setFilteredAnnouncements] = useState<Announcement[]>([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewType, setViewType] = useState<'list' | 'grid'>('list');

  const getApiErrorMessage = (error: any, fallback: string) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 403) return 'Access denied. You do not have permission to view announcements.';
    if (status === 404) return 'Announcements not found.';
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

  const normalizeAnnouncementsResponse = (payload: any): AnnouncementsResponse => {
    if (payload?.data) return payload.data;
    return payload;
  };

  const getCombinedAnnouncements = (data: AnnouncementsResponse | null, source: string) => {
    if (!data) return [];
    if (source === 'class_teacher') return data.class_announcements || [];
    if (source === 'admin') return data.school_announcements || [];
    return [
      ...(data.class_announcements || []),
      ...(data.school_announcements || [])
    ];
  };

  const getAnnouncementDate = (announcement: Announcement) => {
    if (announcement.posted_date) return announcement.posted_date;
    if (announcement.posted_time && announcement.posted_time.includes('T')) {
      return announcement.posted_time.split('T')[0];
    }
    return null;
  };

  const isSameDate = (announcement: Announcement, dateStr: string) => {
    const date = getAnnouncementDate(announcement);
    return date ? date === dateStr : false;
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setPermissionDenied(false);

      const response = await studentApi.announcements.boardWithDateResponse({ source: 'all' });
      const data: AnnouncementsResponse = normalizeAnnouncementsResponse(response.data || response);
      setAnnouncements(data);

      const combinedAnnouncements = getCombinedAnnouncements(data, 'all');
      setAllAnnouncements(combinedAnnouncements);

      const today = new Date().toISOString().split('T')[0];
      setTodayAnnouncements(combinedAnnouncements.filter(a => isSameDate(a, today)));

    } catch (error: any) {
      console.error('Error fetching announcements:', error);
      const message = getApiErrorMessage(error, 'Failed to load announcements');
      if (error?.response?.status === 403) {
        setPermissionDenied(true);
      }
      setAnnouncements(null);
      setAllAnnouncements([]);
      setTodayAnnouncements([]);
      setFilteredAnnouncements([]);
      setErrorMessage(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const response = await studentApi.subjects.mySubjects();
      const data: SubjectsResponse = response.data?.data || response.data;
      setSubjects(data.subjects || []);

    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      const message = getApiErrorMessage(error, 'Failed to load subjects');
      if (error?.response?.status === 403) {
        setPermissionDenied(true);
      }
      toastError(message);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (!announcements) return;

    const combinedAnnouncements = getCombinedAnnouncements(announcements, sourceFilter);
    filterAnnouncements(combinedAnnouncements);
  }, [searchTerm, typeFilter, priorityFilter, subjectFilter, announcements, sourceFilter, selectedDate]);

  const filterAnnouncements = (announcementsList: Announcement[]) => {
    let filtered = [...announcementsList];

    const hasDateInfo = filtered.some(a => Boolean(getAnnouncementDate(a)));
    if (selectedDate && hasDateInfo) {
      filtered = filtered.filter(announcement => isSameDate(announcement, selectedDate));
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(announcement =>
        announcement.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        announcement.posted_by.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (announcement.subject_name && announcement.subject_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(announcement => announcement.announcement_type === typeFilter);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(announcement => announcement.priority === priorityFilter);
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(announcement => announcement.subject_name === subjectFilter);
    }

    setFilteredAnnouncements(filtered);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'exam': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'holiday': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'event': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'academic': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'emergency': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'general': return <FaBullhorn className="text-blue-500" />;
      case 'exam': return <FaBook className="text-red-500" />;
      case 'holiday': return <FaCalendarDay className="text-green-500" />;
      case 'event': return <FaBell className="text-purple-500" />;
      case 'academic': return <FaBullhorn className="text-yellow-500" />;
      case 'emergency': return <FaExclamationTriangle className="text-orange-500" />;
      default: return <FaBullhorn className="text-gray-500" />;
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority?: string) => {
    switch (priority) {
      case 'high': return <FaExclamationTriangle className="text-red-500" />;
      case 'medium': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'low': return <FaCheckCircle className="text-green-500" />;
      default: return <FaBullhorn className="text-gray-500" />;
    }
  };

  const handleDateChange = (increment: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + increment);
    const newDate = currentDate.toISOString().split('T')[0];
    setSelectedDate(newDate);
  };

  const handleSourceChange = (source: string) => {
    setSourceFilter(source);
  };

  const handleDownloadAnnouncements = async () => {
    try {
      toastInfo('Generating announcements report...');
      // In a real app, generate and download PDF
      setTimeout(() => {
        toastSuccess('Announcements report downloaded successfully');
      }, 1500);
    } catch (error) {
      toastError('Failed to download report');
    }
  };

  const handlePrintAnnouncements = () => {
    window.print();
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1">
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="p-6">
        {/* Header */}
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                <FaBullhorn className="text-2xl sm:text-3xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                  Announcements
                </h1>
                <p className="text-xs sm:text-sm text-blue-100">
                  Stay updated with important notices and information
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => fetchAnnouncements()}
                disabled={permissionDenied}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaBullhorn /> Refresh
              </button>
              <button
                onClick={handleDownloadAnnouncements}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors"
              >
                <FaDownload /> Download
              </button>
              <button
                onClick={handlePrintAnnouncements}
                className="px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors"
              >
                <FaPrint /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <FaBullhorn className="text-2xl opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">Total</span>
            </div>
            <div className="text-3xl font-bold">{allAnnouncements.length}</div>
            <div className="text-sm opacity-90">Total Announcements</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <FaBell className="text-2xl opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">Today</span>
            </div>
            <div className="text-3xl font-bold">
              {todayAnnouncements.length}
            </div>
            <div className="text-sm opacity-90">Today Announcements</div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <FaEnvelope className="text-2xl opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">Class</span>
            </div>
            <div className="text-3xl font-bold">
              {(announcements?.class_announcements || []).length}
            </div>
            <div className="text-sm opacity-90">Class Announcements</div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <FaExclamationTriangle className="text-2xl opacity-80" />
              <span className="text-sm bg-white/20 px-2 py-1 rounded">School</span>
            </div>
            <div className="text-3xl font-bold">
              {(announcements?.school_announcements || []).length}
            </div>
            <div className="text-sm opacity-90">School Announcements</div>
          </div>
        </div>

        {permissionDenied && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-yellow-600" />
              <div>
                <h4 className="font-bold text-gray-800">Permission Required</h4>
                <p className="text-gray-700">You do not have access to announcements. Please contact your administrator.</p>
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
                onClick={() => fetchAnnouncements()}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Date and Source Selector */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {announcements?.view_mode === 'all' ? 'All' : announcements?.view_mode} Announcements
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                For: {announcements?.student || 'Student'} • {announcements?.class || 'Class'} • Academic Year: {announcements?.year || '2025-2026'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Date Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDateChange(-1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FaChevronLeft />
                </button>
                <div className="text-center">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedDate).toLocaleDateString('en-US', { 
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing announcements for this date
                  </div>
                </div>
                <button
                  onClick={() => handleDateChange(1)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FaChevronRight />
                </button>
              </div>
              
              {/* Source Selector */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleSourceChange('class_teacher')}
                  className={`px-4 py-2 rounded-lg ${
                    sourceFilter === 'class_teacher'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Class Teacher
                </button>
                <button
                  onClick={() => handleSourceChange('admin')}
                  className={`px-4 py-2 rounded-lg ${
                    sourceFilter === 'admin'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Admin
                </button>
                <button
                  onClick={() => handleSourceChange('all')}
                  className={`px-4 py-2 rounded-lg ${
                    sourceFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Announcements
              </label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by description, teacher, or subject"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Announcement Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="general">General</option>
                <option value="exam">Exam</option>
                <option value="holiday">Holiday</option>
                <option value="event">Event</option>
                <option value="academic">Academic</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Subjects</option>
                <option value="General">General</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.name}>
                    {subject.name} ({subject.subject_code})
                  </option>
                ))}
              </select>
            </div>

            {/* View Toggle */}
            <div className="flex items-end">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setViewType('list')}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    viewType === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setViewType('grid')}
                  className={`flex-1 px-4 py-2 rounded-lg ${
                    viewType === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Grid View
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Announcements Content */}
        {filteredAnnouncements.length > 0 ? (
          viewType === 'list' ? (
            /* Table View */
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Announcement
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Posted By
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <span className="inline-flex items-center gap-2">
                          Date
                          <span className="flex flex-col leading-none">
                            <FaChevronUp className="text-[10px]" />
                            <FaChevronDown className="text-[10px]" />
                          </span>
                        </span>
                      </th>
                      <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAnnouncements.map((announcement) => (
                      <tr 
                        key={`${announcement.announcement_number}-${announcement.posted_by}-${announcement.posted_time}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <div className={`p-2 rounded-lg ${getTypeColor(announcement.announcement_type)}`}>
                              {getTypeIcon(announcement.announcement_type)}
                            </div>
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {announcement.announcement_type}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              #{announcement.announcement_number}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                              {announcement.description.substring(0, 60)}...
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <FaUserTie className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {announcement.posted_by}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {announcement.subject_name || 'General'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center">
                            <FaClock className="text-gray-400 mr-2" />
                            <span className="text-sm text-gray-900 dark:text-white">
                              {announcement.posted_time}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {announcement.posted_date || announcement.posted_time?.split('T')[0] || '-'}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleViewAnnouncement(announcement)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
                          >
                            <FaEye /> View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Grid View - unchanged */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnnouncements.map((announcement) => (
                <div
                  key={`${announcement.announcement_number}-${announcement.posted_by}-${announcement.posted_time}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all hover:-translate-y-1"
                >
                  {/* Header */}
                  <div className={`p-6 ${getTypeColor(announcement.announcement_type)}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="text-3xl">
                        {getTypeIcon(announcement.announcement_type)}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">#{announcement.announcement_number}</div>
                        {announcement.priority && (
                          <div className="text-xs mt-1">
                            <span className={`px-2 py-1 rounded-full ${getPriorityColor(announcement.priority)}`}>
                              {announcement.priority}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {announcement.description.substring(0, 60)}...
                    </h3>
                    
                    <div className="text-sm">
                      <div className="flex items-center gap-2">
                        <FaUserTie />
                        <span>{announcement.posted_by}</span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
                      {announcement.description}
                    </p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Class:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {announcement.class_name}-{announcement.section_name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Subject:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {announcement.subject_name || 'General'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Time:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {announcement.posted_time}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewAnnouncement(announcement)}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                      >
                        <FaEye /> View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="text-center py-12">
            <FaBullhorn className="text-4xl text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No announcements found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || typeFilter !== 'all' || priorityFilter !== 'all' || subjectFilter !== 'all'
                ? 'Try changing your filters'
                : 'No announcements for the selected date and source'}
            </p>
          </div>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedAnnouncement && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${getTypeColor(selectedAnnouncement.announcement_type)}`}>
                    {getTypeIcon(selectedAnnouncement.announcement_type)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Announcement #{selectedAnnouncement.announcement_number}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {selectedAnnouncement.announcement_type} Announcement
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <FaTimes className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Announcement Details */}
                <div className="space-y-6">
                  {/* Priority Badge */}
                  {selectedAnnouncement.priority && (
                    <div className="flex items-center gap-2">
                      <FaExclamationTriangle className={`${
                        selectedAnnouncement.priority === 'high' ? 'text-red-500' :
                        selectedAnnouncement.priority === 'medium' ? 'text-yellow-500' : 'text-green-500'
                      }`} />
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(selectedAnnouncement.priority)}`}>
                        {selectedAnnouncement.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  )}

                  {/* Description */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                      Announcement Details
                    </h3>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6">
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                        {selectedAnnouncement.description}
                      </p>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Posted By</div>
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                        <FaUserTie />
                        {selectedAnnouncement.posted_by}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Class & Section</div>
                      <div className="text-gray-900 dark:text-white font-medium">
                        {selectedAnnouncement.class_name} - {selectedAnnouncement.section_name}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Subject</div>
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                        <FaBook />
                        {selectedAnnouncement.subject_name || 'General'}
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Posted Time</div>
                      <div className="flex items-center gap-2 text-gray-900 dark:text-white font-medium">
                        <FaClock />
                        {selectedAnnouncement.posted_time}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
