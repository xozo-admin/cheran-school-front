'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaBullhorn, FaChalkboardTeacher, FaSchool, 
  FaCalendarAlt, FaUserTie, FaSpinner,
  FaBell, FaInfoCircle, FaSync
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// --- Types based on your JSON Response ---
interface Announcement {
  id: number;
  title: string;
  description: string; // Updated from message/content
  date: string;
  created_at: string;
  academic_year: string;
  priority?: string; // Kept as optional in case it exists
}

interface ApiResponse {
  status: number;
  year: string;
  viewing_date: string;
  filter_applied: string;
  // The API returns the list under specific keys based on the filter
  common?: Announcement[];
  all_teachers?: Announcement[]; 
  allteachers?: Announcement[]; // Fallback for specific API naming
}

// --- API Service ---
const apiService = {
  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getAnnouncements(date: string = '', filterType: 'common' | 'allteachers' | any) {
    const response = await teacherApi.announcements.teacherAdminBoard({
      filter: filterType,
      ...(date ? { date } : {}),
    });
    return response.data;
  }
};

export default function TeacherAnnouncements() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'indigo' | 'purple' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
    if (color === 'indigo') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50');
    if (color === 'purple') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
  };

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const [loading, setLoading] = useState(true);
  const [loadingTab, setLoadingTab] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // State for the active tab (mapped to API filter values)
  const [activeTab, setActiveTab] = useState<'common' | 'allteachers'>('common');
  
  // Store the current list and metadata
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [academicYear, setAcademicYear] = useState<string>('');
  
  // Filters
  const [selectedDate, setSelectedDate] = useState<string>(''); 

  // Initial Load
  useEffect(() => {
    loadInitialData();
  }, []);

  // Reload when Date or Tab changes
  useEffect(() => {
    if (!loading) {
        fetchAnnouncements();
    }
  }, [selectedDate, activeTab]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const profileData = await apiService.getTeacherProfile();
      setProfile(profileData.data);
      
      // Fetch initial announcements
      await fetchAnnouncements();
    } catch (err: any) {
      console.error('Error loading data:', err);
      toastError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoadingTab(true);
      
      // Call API
      const data: ApiResponse = await apiService.getAnnouncements(selectedDate, activeTab);
      
      // Update Academic Year from response
      if (data.year) setAcademicYear(data.year);

      // Extract the list dynamically based on the active tab or available keys
      // This handles cases where API returns "common": [] or "all_teachers": []
      let list: Announcement[] = [];
      
      if (activeTab === 'common') {
        list = data.common || [];
      } else {
        // Check both possible casing variations for safety
        list = data.allteachers || data.all_teachers || []; 
      }

      setAnnouncements(list);

    } catch (err: any) {
      console.error(err);
      toastError('Failed to update announcements');
      setAnnouncements([]);
    } finally {
      setLoadingTab(false);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate('');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className={combine(getCardGradientClass('indigo'), 'text-center py-10 sm:py-12')}>
            <FaSpinner className={combine('animate-spin text-4xl sm:text-5xl mx-auto mb-4', get('accent', 'primary'))} />
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>Loading Noticeboard</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-blue-700 to-indigo-800 rounded-2xl p-6 shadow-xl text-white mb-6 relative overflow-hidden">
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between relative z-10">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBullhorn className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Noticeboard</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    Updates for Academic Year {academicYear || '—'}
                  </p>
                </div>
              </div>

              {/* Date Filter */}
              <div className="mt-4 sm:mt-5 lg:mt-0 w-full lg:w-auto">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className={combine(getInputClass(), 'w-full sm:w-48')}
                    />
                    {selectedDate && (
                      <button
                        onClick={clearDateFilter}
                        className={combine(getSecondaryButtonClass(), 'px-3 py-2 sm:py-3 flex items-center justify-center')}
                        title="Clear Filter"
                      >
                        <FaSync />
                      </button>
                    )}
                  </div>
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                    <div className="text-[11px] sm:text-xs text-blue-100">Teacher</div>
                    <div className="text-sm sm:text-base font-bold">
                      {profile?.name || 'Teacher'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className={combine(
          'flex space-x-1 p-1 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 border shadow-lg',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <button
            onClick={() => setActiveTab('common')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'common'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaSchool />
            Common
          </button>

          <button
            onClick={() => setActiveTab('allteachers')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'allteachers'
                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaChalkboardTeacher />
            Teachers Only
          </button>
        </div>

        {/* Content Area */}
        <div className="min-h-[400px]">
            {loadingTab ? (
                <div className="flex justify-center items-center h-64">
                     <FaSpinner className={combine('animate-spin text-3xl', get('text', 'muted'))} />
                </div>
            ) : (
                <>
                    {/* Header for List */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className={combine(
                          'text-base sm:text-lg font-bold flex items-center gap-2',
                          activeTab === 'common'
                            ? (theme === 'dark' ? 'text-blue-200' : 'text-blue-700')
                            : (theme === 'dark' ? 'text-purple-200' : 'text-purple-700')
                        )}>
                            {activeTab === 'common' ? <FaSchool/> : <FaChalkboardTeacher/>}
                            {activeTab === 'common' ? 'School Common Updates' : 'Teacher Updates'}
                        </h2>
                        <span className={combine(
                          'px-3 py-1 rounded-full text-xs sm:text-sm font-medium border',
                          get('border', 'secondary'),
                          get('bg', 'card'),
                          get('text', 'secondary')
                        )}>
                            {announcements.length} Announcements
                        </span>
                    </div>

                    {/* List */}
                    <div className="grid gap-4">
                        {announcements.length === 0 ? (
                            <EmptyState message={`No ${activeTab === 'common' ? 'common' : 'staff'} announcements found.`} />
                        ) : (
                            announcements.map((item, index) => (
                                <AnnouncementCard 
                                    key={`${activeTab}-${item.id || index}`} 
                                    data={item} 
                                    type={activeTab} 
                                    formatDate={formatDate}
                                />
                            ))
                        )}
                    </div>
                </>
            )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for individual cards
const AnnouncementCard = ({ data, type, formatDate }: { data: Announcement, type: 'common' | 'allteachers', formatDate: Function }) => {
    const { theme } = useTheme();
    const { get, combine } = useThemeClasses();

    const isTeacher = type === 'allteachers';
    const borderClass = isTeacher ? (theme === 'dark' ? 'border-l-purple-400' : 'border-l-purple-500') : (theme === 'dark' ? 'border-l-blue-400' : 'border-l-blue-500');
    const iconColor = isTeacher ? (theme === 'dark' ? 'text-purple-200' : 'text-purple-600') : (theme === 'dark' ? 'text-blue-200' : 'text-blue-600');

    return (
        <div className={combine(
          'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 border-l-4 hover:-translate-y-0.5 hover:shadow-xl',
          get('bg', 'card'),
          get('border', 'secondary'),
          borderClass
        )}>
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={combine(
                          'p-1.5 rounded-lg border',
                          get('border', 'secondary'),
                          theme === 'dark' ? 'bg-white/10' : (isTeacher ? 'bg-purple-50' : 'bg-blue-50')
                        )}>
                            {isTeacher ? <FaChalkboardTeacher className={combine('text-sm', iconColor)} /> : <FaSchool className={combine('text-sm', iconColor)} />}
                        </span>
                        <h3 className={combine('font-bold text-sm sm:text-base leading-tight', get('text', 'primary'))}>
                            {data.title}
                        </h3>
                    </div>
                    
                    {/* Using description field from your JSON */}
                    <p className={combine('mt-2 mb-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap pl-9', get('text', 'secondary'))}>
                        {data.description || "No details provided."}
                    </p>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end gap-2 pl-9 sm:pl-0 min-w-[140px]">
                    {data.priority === 'URGENT' && (
                        <span className={combine(
                          'text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1 border',
                          theme === 'dark' ? 'bg-red-900/20 text-red-200 border-red-700/40' : 'bg-red-50 text-red-700 border-red-100'
                        )}>
                            <FaBell /> URGENT
                        </span>
                    )}
                    <div className={combine(
                      'flex items-center gap-2 text-xs px-2 py-1 rounded-lg border',
                      get('border', 'secondary'),
                      get('bg', 'secondary'),
                      get('text', 'muted')
                    )}>
                        <FaCalendarAlt />
                        <span>{formatDate(data.date)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const EmptyState = ({ message }: { message: string }) => (
    <EmptyStateInner message={message} />
);

const EmptyStateInner = ({ message }: { message: string }) => {
  const { get, combine } = useThemeClasses();
  return (
    <div className={combine(
      'rounded-xl sm:rounded-2xl p-10 sm:p-12 border-2 border-dashed flex flex-col items-center justify-center text-center',
      get('bg', 'card'),
      get('border', 'secondary')
    )}>
      <div className={combine(get('bg', 'secondary'), 'p-4 rounded-full mb-3 border', get('border', 'secondary'))}>
        <FaInfoCircle className={combine(get('text', 'muted'), 'text-3xl')} />
      </div>
      <p className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>{message}</p>
    </div>
  );
};
