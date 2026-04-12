// src/components/dashboard/Announcements.tsx
'use client';

import { adminApi } from '@/lib/api';
import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  FaBullhorn, 
  FaExclamationCircle, 
  FaInfoCircle, 
  FaCheckCircle, 
  FaPlus,
  FaUsers,
  FaChalkboardTeacher,
  FaUserTie,
  FaCalendarAlt,
  FaClock,
  FaSync,
  FaChevronDown,
  FaChevronUp,
  FaTimes,
  FaFilter,
  FaSortAmountDown,
  FaUserTag,
  FaGlobe,
  FaLock
} from 'react-icons/fa';
import { ChevronRight, Minimize2 } from 'lucide-react';

interface StaffAnnouncement {
  id: number;
  academic_year: string;
  title: string;
  description: string;
  date: string;
  visibility: 'ALL_STAFF' | 'ROLE_SPECIFIC';
  target_role?: string;
  created_at: string;
}

interface CommonAnnouncement {
  id: number;
  academic_year: string;
  title: string;
  description: string;
  date: string;
  created_at: string;
}

interface TeacherAnnouncement {
  id: number;
  academic_year: string;
  title: string;
  description: string;
  date: string;
  created_at: string;
}

type Announcement = {
  id: number;
  title: string;
  description: string;
  date: string;
  created_at: string;
  type: 'teacher' | 'staff' | 'common';
  priority: 'high' | 'medium' | 'low';
  visibility?: 'ALL_STAFF' | 'ROLE_SPECIFIC';
  target_role?: string;
};

interface AnnouncementData {
  status: number;
  academic_year: string;
  filters_applied: {
    type: string;
    recent_days: number;
  };
  overview: {
    total_announcements: number;
    by_type: {
      teacher: {
        total: number;
        recent: number;
        past: number;
        visibility_distribution?: Array<{visibility: string; count: number}>;
        has_data: boolean;
      };
      staff: {
        total: number;
        recent: number;
        past: number;
        visibility_distribution?: Array<{visibility: string; count: number}>;
        role_distribution?: Array<{target_role: string; count: number}>;
        has_data: boolean;
      };
      common: {
        total: number;
        recent: number;
        past: number;
        has_data: boolean;
      };
    };
    recent_count: number;
    past_count: number;
    has_data: boolean;
    activity_timeline: Array<{
      date: string;
      teacher: number;
      staff: number;
      common: number;
      total: number;
    }>;
    timeline_has_data: boolean;
  };
  recent_announcements: {
    teacher: TeacherAnnouncement[];
    staff: StaffAnnouncement[];
    common: CommonAnnouncement[];
  };
  past_announcements: {
    teacher: TeacherAnnouncement[];
    staff: StaffAnnouncement[];
    common: CommonAnnouncement[];
  };
  messages: string[];
}

export const Announcements = ({ 
  isFullScreen = false, 
  onCloseFullScreen = () => {} 
}: { 
  isFullScreen?: boolean; 
  onCloseFullScreen?: () => void;
}) => {
  const [data, setData] = useState<AnnouncementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'teacher' | 'staff' | 'common'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [internalModalOpen, setInternalModalOpen] = useState(false);
  const [modalFilter, setModalFilter] = useState<'all' | 'teacher' | 'staff' | 'common'>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const INITIAL_DISPLAY_COUNT = 4;

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    const handleViewport = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await adminApi.announcements.dashboardOverview();
const responseData = response.data;


      if (responseData.status !== 200) {
        throw new Error(`API error! status: ${responseData.status}`);
      }
      setData(responseData);
      setIsExpanded(false);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const determinePriority = (announcement: any, type: string): 'high' | 'medium' | 'low' => {
    // You can implement your own priority logic here
    // For now, let's assign priorities based on some criteria
    if (type === 'teacher') return 'high';
    if (type === 'staff') {
      if (announcement.visibility === 'ALL_STAFF') return 'medium';
      return 'low';
    }
    // For common announcements, check if it's recent
    const date = new Date(announcement.date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'high';
    if (diffDays < 3) return 'medium';
    return 'low';
  };

  const getFilteredAnnouncements = (filterType: 'all' | 'teacher' | 'staff' | 'common' = activeFilter) => {
    if (!data) return [];
    
    const allAnnouncements: Announcement[] = [
      ...data.recent_announcements.teacher.map(a => ({ 
        ...a, 
        type: 'teacher' as const,
        priority: determinePriority(a, 'teacher')
      })),
      ...data.recent_announcements.staff.map(a => ({ 
        ...a, 
        type: 'staff' as const,
        priority: determinePriority(a, 'staff'),
        visibility: a.visibility,
        target_role: a.target_role
      })),
      ...data.recent_announcements.common.map(a => ({ 
        ...a, 
        type: 'common' as const,
        priority: determinePriority(a, 'common')
      })),
      ...data.past_announcements.teacher.map(a => ({ 
        ...a, 
        type: 'teacher' as const,
        priority: 'low' as const
      })),
      ...data.past_announcements.staff.map(a => ({ 
        ...a, 
        type: 'staff' as const,
        priority: 'low' as const,
        visibility: a.visibility,
        target_role: a.target_role
      })),
      ...data.past_announcements.common.map(a => ({ 
        ...a, 
        type: 'common' as const,
        priority: 'low' as const
      }))
    ];

    let filtered = allAnnouncements;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(ann => ann.type === filterType);
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ann => ann.priority === priorityFilter);
    }

    return filtered;
  };

  const getSortedAnnouncements = (announcements: Announcement[]) => {
    return [...announcements].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIcon = (type: Announcement['type'], announcement?: Announcement) => {
    switch (type) {
      case 'teacher': 
        return <FaChalkboardTeacher className="text-purple-500" />;
      case 'staff': 
        if (announcement?.visibility === 'ROLE_SPECIFIC') {
          return <FaUserTag className="text-indigo-500" />;
        }
        return <FaUserTie className="text-indigo-500" />;
      case 'common': 
        return <FaUsers className="text-blue-500" />;
      default: 
        return <FaInfoCircle className="text-slate-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'medium': return 'bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
      case 'low': return 'bg-green-100 text-green-600 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      default: return 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'teacher': return 'text-purple-600 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30';
      case 'staff': return 'text-indigo-600 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-900/30';
      case 'common': return 'text-blue-600 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30';
      default: return 'text-slate-600 bg-slate-50 dark:text-gray-300 dark:bg-gray-800';
    }
  };

  const getVisibilityBadge = (visibility?: string, target_role?: string) => {
    if (!visibility) return null;
    
    if (visibility === 'ALL_STAFF') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300">
          <FaUsers className="w-3 h-3" />
          All Staff
        </span>
      );
    } else if (visibility === 'ROLE_SPECIFIC' && target_role) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300">
          <FaUserTag className="w-3 h-3" />
          {target_role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </span>
      );
    }
    return null;
  };

  const openModal = () => {
    setInternalModalOpen(true);
  };

  const closeModal = () => {
    setInternalModalOpen(false);
    onCloseFullScreen();
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-700 shadow-sm">
        <div className="h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-auto lg:max-h-none flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaBullhorn className="h-5 w-5 text-blue-600 animate-pulse" />
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-600 dark:text-gray-300">Loading announcements...</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Preparing recent updates</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-6 border border-slate-200 dark:border-gray-700 shadow-sm">
        <div className="text-center py-8">
          <FaExclamationCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-900 dark:text-gray-100 mb-2">Failed to load announcements</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 mb-4">Please try again</p>
          <button 
            onClick={fetchAnnouncements}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all text-sm font-medium flex items-center gap-2 mx-auto"
          >
            <FaSync className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const filteredAnnouncements = getFilteredAnnouncements();
  const recentCount = data.overview.recent_count;
  const totalCount = data.overview.total_announcements;
  
  const displayedAnnouncements = isExpanded 
    ? filteredAnnouncements 
    : filteredAnnouncements.slice(0, INITIAL_DISPLAY_COUNT);
  
  const hasMoreAnnouncements = filteredAnnouncements.length > INITIAL_DISPLAY_COUNT;

  return (
    <>
      <div className="w-full px-2 sm:px-3 py-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-auto lg:max-h-none flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 truncate pr-2">
            Academic Year: {data.academic_year} • Last {data.filters_applied.recent_days} days
          </p>
          <span className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2.5 sm:px-3 py-1 rounded-full">
            {totalCount} Total
          </span>
        </div>

        {/* Announcements List */}
        <div className="flex-1 min-h-0 flex flex-col">
          {displayedAnnouncements.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 dark:bg-gray-900/40 rounded-xl border border-dashed border-slate-200 dark:border-gray-700">
              <FaBullhorn className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h4 className="font-medium text-slate-700 dark:text-gray-300 mb-2">No announcements found</h4>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                No {activeFilter !== 'all' ? activeFilter : ''} announcements 
                {activeFilter === 'all' ? '' : ' '}available
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 flex-1 min-h-0 overflow-hidden">
                {displayedAnnouncements.map((announcement) => (
                  <AnnouncementCard 
                    key={`${announcement.type}-${announcement.id}`} 
                    announcement={announcement}
                    getIcon={getIcon}
                    getPriorityColor={getPriorityColor}
                    getTypeColor={getTypeColor}
                    getVisibilityBadge={getVisibilityBadge}
                    formatDateDisplay={formatDateDisplay}
                    formatTime={formatTime}
                  />
                ))}
              </div>

              {/* Show More Button */}
              {hasMoreAnnouncements && (
                <div className="pt-2 text-center border-t border-gray-100 dark:border-gray-800 mt-2">
                  <button
                    onClick={openModal}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
                  >
                    View more announcements
              <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Announcements Modal */}
      <AnnouncementsModal
        isOpen={internalModalOpen || isFullScreen}
        onClose={closeModal}
        announcements={getSortedAnnouncements(getFilteredAnnouncements(modalFilter))}
        isMobileScreen={isMobileScreen}
        filter={modalFilter}
        setFilter={setModalFilter}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        getIcon={getIcon}
        getPriorityColor={getPriorityColor}
        getTypeColor={getTypeColor}
        getVisibilityBadge={getVisibilityBadge}
        formatDateDisplay={formatDateDisplay}
        formatTime={formatTime}
      />
    </>
  );
};

// Announcement Card Component
const AnnouncementCard = ({ 
  announcement, 
  getIcon, 
  getPriorityColor, 
  getTypeColor, 
  getVisibilityBadge,
  formatDateDisplay, 
  formatTime 
}: { 
  announcement: Announcement;
  getIcon: (type: Announcement['type'], announcement?: Announcement) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  getTypeColor: (type: string) => string;
  getVisibilityBadge: (visibility?: string, target_role?: string) => JSX.Element | null;
  formatDateDisplay: (date: string) => string;
  formatTime: (date: string) => string;
}) => {
  const getRelativeTime = () => {
    const source = announcement.created_at || announcement.date;
    const parsed = new Date(source);

    if (Number.isNaN(parsed.getTime())) {
      return formatDateDisplay(announcement.date);
    }

    return formatDistanceToNow(parsed, { addSuffix: true });
  };

  return (
    <div className="group relative p-3 sm:p-4 rounded-xl bg-white dark:bg-gray-800 hover:bg-gradient-to-r hover:from-slate-50 hover:to-white dark:hover:from-gray-800 dark:hover:to-gray-700 border border-slate-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500/40 transition-all duration-300 shadow-sm hover:shadow">
      {/* Priority Indicator */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-gradient-to-b ${
        announcement.priority === 'high' ? 'from-red-400 to-red-300' :
        announcement.priority === 'medium' ? 'from-amber-400 to-amber-300' :
        'from-green-400 to-green-300'
      }`} />
      
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="p-2 sm:p-2.5 rounded-lg bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 border border-slate-200 dark:border-gray-700 group-hover:border-blue-200 dark:group-hover:border-blue-500/40 transition-all shadow-sm">
          {getIcon(announcement.type, announcement)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-gray-100 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors truncate">
              {announcement.title}
            </h4>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-[11px] sm:text-xs font-medium ${getTypeColor(announcement.type)}`}>
                {announcement.type}
              </span>
            </div>
          </div>
          
          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 mb-3 line-clamp-2">
            {announcement.description}
          </p>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-900/50 px-2 py-1 rounded-full">
                <FaClock className="w-3 h-3" />
                {getRelativeTime()}
              </div>
            </div>
            {announcement.type === 'staff' && getVisibilityBadge(announcement.visibility, announcement.target_role)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Announcements Modal Component
const AnnouncementsModal = ({
  isOpen,
  onClose,
  announcements,
  isMobileScreen = false,
  filter,
  setFilter,
  sortOrder,
  setSortOrder,
  priorityFilter,
  setPriorityFilter,
  getIcon,
  getPriorityColor,
  getTypeColor,
  getVisibilityBadge,
  formatDateDisplay,
  formatTime
}: {
  isOpen: boolean;
  onClose: () => void;
  announcements: Announcement[];
  isMobileScreen?: boolean;
  filter: 'all' | 'teacher' | 'staff' | 'common';
  setFilter: (filter: 'all' | 'teacher' | 'staff' | 'common') => void;
  sortOrder: 'newest' | 'oldest';
  setSortOrder: (order: 'newest' | 'oldest') => void;
  priorityFilter: 'all' | 'high' | 'medium' | 'low';
  setPriorityFilter: (filter: 'all' | 'high' | 'medium' | 'low') => void;
  getIcon: (type: Announcement['type'], announcement?: Announcement) => JSX.Element;
  getPriorityColor: (priority: string) => string;
  getTypeColor: (type: string) => string;
  getVisibilityBadge: (visibility?: string, target_role?: string) => JSX.Element | null;
  formatDateDisplay: (date: string) => string;
  formatTime: (date: string) => string;
}) => {
  const typeOptions = [
    { value: 'all', label: 'All', icon: <FaInfoCircle className="w-4 h-4" /> },
    { value: 'teacher', label: 'Teacher', icon: <FaChalkboardTeacher className="w-4 h-4" /> },
    { value: 'staff', label: 'Staff', icon: <FaUserTie className="w-4 h-4" /> },
    { value: 'common', label: 'Common', icon: <FaUsers className="w-4 h-4" /> }
  ] as const;

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ] as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative z-10 bg-white dark:bg-gray-900 shadow-2xl flex flex-col ${
          isMobileScreen
            ? 'w-[100vw] h-[100dvh] rounded-none overflow-y-auto'
            : 'w-[98vw] sm:w-[95vw] md:w-[92vw] lg:w-[88vw] xl:w-[82vw] 2xl:w-[76vw] h-[94vh] rounded-xl sm:rounded-2xl overflow-hidden'
        }`}
      >
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FaBullhorn className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  All Announcements
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {announcements.length} announcements found
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Full Screen</span>
            </button>
           
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <FaFilter className="w-4 h-4 text-gray-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFilter(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-2 ${
                    filter === option.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
           
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-3 sm:p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900/50">
          {announcements.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-slate-100 dark:bg-gray-800 rounded-full mb-4">
                <FaBullhorn className="w-8 h-8 text-slate-400" />
              </div>
              <h4 className="font-semibold text-slate-700 dark:text-gray-300 mb-2">No announcements found</h4>
              <p className="text-sm text-slate-500 dark:text-gray-400">
                No {filter !== 'all' ? filter : ''} announcements 
                {priorityFilter !== 'all' ? ` with ${priorityFilter} priority` : ''} available
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <AnnouncementCard
                  key={`${announcement.type}-${announcement.id}`}
                  announcement={announcement}
                  getIcon={getIcon}
                  getPriorityColor={getPriorityColor}
                  getTypeColor={getTypeColor}
                  getVisibilityBadge={getVisibilityBadge}
                  formatDateDisplay={formatDateDisplay}
                  formatTime={formatTime}
                />
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4" />
              <span>Showing {announcements.length} announcements</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Press</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd>
              <span className="text-xs">to exit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
