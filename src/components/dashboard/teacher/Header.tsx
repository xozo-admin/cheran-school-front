'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FaSearch,
  FaBell,
  FaEnvelope,
  FaUserCircle,
  FaCog,
  FaSun,
  FaMoon,
  FaQuestionCircle,
  FaChartLine,
  FaCalendarAlt,
  FaSignOutAlt,
  FaClock,
  FaChalkboardTeacher,
  FaGraduationCap,
  FaVideo,
  FaTasks,
  FaExclamationTriangle,
  FaUsers,
  FaBook,
  FaBars,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { 
  toastSuccess, 
  toastError, 
  toastInfo,
} from '@/lib/toast';
import { teacherApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { clearAllCookies } from '@/lib/auth';

interface TeacherProfile {
  username: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  subject?: string;
  class?: string;
  section?: string;
}

interface Notification {
  id: number;
  sender_id: string | null;
  sender_name: string;
  sender_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  notification_type: string;
}

interface NextClass {
  subject: string;
  class_name: string;
  time: string;
  duration: string;
  room?: string;
}

export const TeacherHeader = ({ onMenuClick }: { onMenuClick?: () => void }) => {
  const { theme, toggleTheme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [nextClass, setNextClass] = useState<NextClass | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [time, setTime] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const initialMountRef = useRef(true);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Theme-aware CSS styles
  const headerStyles = useMemo(() => ({
    background: `var(--color-bg-primary)`,
    borderBottom: `1px solid var(--color-border-primary)`,
    boxShadow: `var(--shadow-sm)`,
  }), []);

  const searchInputStyles = useMemo(() => ({
    background: `var(--color-bg-card)`,
    border: `1px solid var(--color-border-secondary)`,
    color: `var(--color-text-primary)`,
    '&:focus': {
      borderColor: `var(--color-accent-primary)`,
      boxShadow: `0 0 0 2px var(--color-accent-primary)`,
    },
  }), []);

  // Fetch all data on component mount
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      updateTime();
      const interval = setInterval(updateTime, 60000);
      fetchTeacherData();
      
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const updateTime = () => {
    const now = new Date();
    setTime(
      now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    );
  };

  const fetchTeacherData = async (): Promise<void> => {
  setLoading(true);
  try {
    const token = Cookies.get('token') || localStorage.getItem('token');
    
    if (!token) {
      handleLogout();
      return;
    }

    const profileResponse = await teacherApi.profile.get();
    const profileData = profileResponse.data;
    const teacherData = profileData?.data || profileData;
    
    if (teacherData) {
        
        // Map API response to TeacherProfile interface
        const teacherProfile: TeacherProfile = {
          username: teacherData.teacher_id || '',
          full_name: teacherData.name || '',
          first_name: teacherData.name?.split(' ')[0] || '',
          last_name: teacherData.name?.split(' ').slice(1).join(' ') || '',
          email: teacherData.email || '',
          phone: teacherData.phone || '',
          user_type: 'teacher',
          subject: teacherData.department || '',
          class: teacherData.class_name || '',
          section: teacherData.section_name || ''
        };
        
        setTeacherProfile(teacherProfile);

        // If teacher has class info, fetch timetable
        if (teacherData.class_name && teacherData.section_name) {
          const today = new Date().toISOString().split('T')[0];
          
          const timetableResponse = await teacherApi.timetable.myClass(today);
          const timetableData = timetableResponse.data?.data || timetableResponse.data || [];

            if (Array.isArray(timetableData) && timetableData.length > 0) {
              const now = new Date();
              const upcoming = timetableData
                .map((cls: any) => {
                  const [start] = cls.time?.split('-') || [];
                  if (!start) return null;

                  const [h, m] = start.trim().split(':').map(Number);
                  const classTime = new Date();
                  classTime.setHours(h, m, 0);

                  return classTime > now ? { ...cls, classTime } : null;
                })
                .filter(Boolean)
                .sort((a: any, b: any) => a.classTime - b.classTime);

              if (upcoming.length > 0) {
                setNextClass({
                  subject: upcoming[0].subject,
                  class_name: `${upcoming[0].class_name || ''}-${upcoming[0].section || ''}`,
                  time: upcoming[0].time,
                  duration: upcoming[0].duration || '1 hr',
                  room: upcoming[0].room,
                });
              }
            }
        }

        // Load notifications
        fetchNotifications();
    } else {
      throw new Error('No teacher data found');
    }
  } catch (error: any) {
    console.error('Error fetching teacher data:', error);
    toastError(error?.message || 'Failed to load profile');
  } finally {
    setLoading(false);
  }
};

  const fetchNotifications = async () => {
    try {
      const token = Cookies.get('token') || localStorage.getItem('token');
      if (!token) return;

      setNotificationsLoading(true);
      const response = await teacherApi.notification.listAll();
      const data = response.data;
      if (Array.isArray(data)) {
        setNotifications(data);
      } else if (Array.isArray(data?.results)) {
        setNotifications(data.results);
      } else if (Array.isArray(data?.data)) {
        setNotifications(data.data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleLogout = () => {
    setTimeout(() => {
      clearAllCookies();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('username');
      localStorage.removeItem('login_time');
      localStorage.removeItem('token_expiry');
      
      toastSuccess('Logged out successfully!');
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    }, 500);
  };

  const getTeacherInitials = () => {
    if (!teacherProfile) return 'TU';
    
    const { first_name, last_name, full_name, username } = teacherProfile;
    
    if (first_name && last_name) {
      return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
    }
    if (full_name) {
      const names = full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return full_name.charAt(0).toUpperCase();
    }
    if (first_name) {
      return first_name.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'TU';
  };

  const getTeacherName = () => {
    if (!teacherProfile) return 'Loading...';
    
    const { first_name, last_name, full_name, username } = teacherProfile;
    
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (full_name) {
      return full_name;
    }
    if (first_name) {
      return first_name;
    }
    return username || 'Teacher User';
  };

  const getTeacherEmail = () => {
    return teacherProfile?.email || 'teacher@school.com';
  };

  const getTeacherPhone = () => {
    return teacherProfile?.phone || 'Not provided';
  };

  const getTeacherRole = () => {
    if (!teacherProfile) return 'Teacher';
    
    const userType = teacherProfile.user_type;
    if (userType === 'teacher') return 'Teacher';
    return userType?.replace('_', ' ') || 'Teacher';
  };

  const getTeacherSubject = () => {
    return teacherProfile?.subject || 'All Subjects';
  };

  const markNotificationAsRead = async (id: number) => {
    try {
      await teacherApi.notification.markAsRead(id);
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
      toastSuccess('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toastError('Failed to mark notification as read');
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await teacherApi.notification.markAsRead();
      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      toastSuccess('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toastError('Failed to mark all notifications as read');
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const getNotificationTypeInfo = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'transport':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' };
      case 'academic':
      case 'assignment':
        return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' };
      case 'fees':
      case 'finance':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' };
      case 'attendance':
      case 'student':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400' };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const handleVirtualClass = () => {
    toastInfo('Virtual classroom feature coming soon!');
  };

  const handleQuickGrade = () => {
    toastInfo('Redirecting to quick grading...');
    window.location.href = '/teacher/subject/assignments';
  };

  const handleViewTasks = () => {
    toastInfo('Redirecting to tasks...');
    window.location.href = '/teacher/subject/todo';
  };

  // Theme-aware CSS classes
  const headerClasses = combine(
    'bg-gradient-to-br',
    theme === 'dark'
      ? 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]'
      : 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]',
    'border-b',
    get('border', 'primary'),
    'px-4 sm:px-6 lg:px-8 py-3 md:py-4',
    'transition-all duration-150',
    'sticky top-0 z-30',
    'shadow-sm'
  );

  const searchInputClasses = combine(
    'pl-10 pr-4 py-2 rounded-lg w-full lg:w-80 focus:outline-none focus:ring-2 transition-all duration-200',
    'text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'focus:ring-[var(--color-accent-primary)] focus:border-transparent'
  );

  const actionButtonClasses = combine(
    'flex items-center space-x-1 lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-all duration-200',
    'text-sm',
    get('text', 'secondary'),
    get('bg', 'hover'),
    'hover:text-[var(--color-text-primary)]',
    'hidden sm:flex'
  );

  const iconButtonClasses = combine(
    'p-2 rounded-lg transition-all duration-200',
    'text-sm',
    get('bg', 'hover'),
    get('icon', 'primary'),
    'hover:scale-105 active:scale-95'
  );

  const badgeClasses = combine(
    'absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center',
    'bg-[var(--color-status-error)]'
  );

  const notificationDropdownClasses = combine(
    'fixed md:absolute right-0 md:top-full top-16 md:mt-2 w-full md:w-96 max-w-[calc(100vw-2rem)] md:max-w-none rounded-lg border z-50',
    'text-sm',
    get('bg', 'overlay'),
    get('border', 'primary'),
    get('shadow', 'lg'),
    'transform transition-all duration-200',
    showNotifications
      ? 'opacity-100 visible scale-100 translate-y-0'
      : 'opacity-0 invisible scale-95 translate-y-2'
  );

  const skeletonClasses = combine(
    'animate-pulse rounded',
    'bg-gradient-to-r from-[var(--color-bg-secondary)] via-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)]'
  );

  const timeDisplayClasses = combine(
    'flex items-center space-x-2 px-3 py-2 rounded-lg',
    'text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary')
  );

  const nextClassClasses = combine(
    'flex items-center space-x-2 px-3 py-2 rounded-lg',
    'text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary')
  );

  const quickActionClasses = combine(
    'px-4 py-2 rounded-lg font-medium transition-all duration-200',
    'text-sm',
    'shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
  );

  return (
    <header 
      className={headerClasses}
      style={headerStyles}
    >
      {/* Top Section */}
      <div className="flex items-center justify-between">
        {/* Left side: Search and Info */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className={combine(iconButtonClasses, "mr-2")}
              aria-label="Toggle menu"
            >
              <FaBars className="w-5 h-5" />
            </button>
          )}
          
          {/* Search */}
          <form className="relative">
            <FaSearch className={combine(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
              get('icon', 'secondary')
            )} />
            <input
              type="text"
              placeholder="Search students, assignments, materials..."
              className={searchInputClasses}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={searchInputStyles}
            />
          </form>

          {/* Next Class Info */}
          {nextClass && (
            <div className={nextClassClasses}>
              <FaChalkboardTeacher className="w-4 h-4 text-purple-500" />
              <div>
                <p className="font-medium">{nextClass.subject}</p>
                <p className="text-xs opacity-75">
                  {nextClass.class_name} • {nextClass.time}
                </p>
              </div>
              <span className={combine(
                "text-xs px-2 py-1 rounded-full ml-2",
                get('bg', 'tertiary'),
                get('text', 'primary')
              )}>
                {nextClass.duration}
              </span>
            </div>
          )}
        </div>

        {/* Right side: User actions */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme();
              toastSuccess(`Switched to ${theme === 'light' ? 'dark' : 'light'} mode`);
            }}
            className={iconButtonClasses}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            title={`Current: ${theme} mode. Click to switch`}
          >
            {theme === 'dark' ? (
              <FaSun className="w-4 h-4 text-yellow-400" />
            ) : (
              <FaMoon className="w-4 h-4" />
            )}
          </button>

          {/* Help Button */}
          <button
            className={iconButtonClasses}
            aria-label="Help Center"
            title="Help Center"
            onClick={() => {
              toastInfo('Help center coming soon!');
              window.location.href = '/teacher/settings/help';
            }}
          >
            <FaQuestionCircle className="w-4 h-4" />
          </button>

         

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              className={combine(iconButtonClasses, "relative")}
              aria-label={`Notifications (${unreadCount} unread)`}
              title={`${unreadCount} unread notifications`}
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <FaBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={badgeClasses}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications dropdown */}
            <div className={notificationDropdownClasses}>
              <div className={combine(
                "p-3 border-b flex items-center justify-between",
                get('border', 'primary'),
                get('bg', 'secondary')
              )}>
                <div>
                  <h3 className={combine("font-medium", get('text', 'primary'))}>
                    Notifications
                  </h3>
                  <p className={combine("text-xs mt-0.5", get('text', 'tertiary'))}>
                    {unreadCount} unread • {unreadCount > 0 ? `${unreadCount} new` : 'No new messages'}
                  </p>
                </div>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllNotificationsAsRead}
                    className={combine(
                      "text-xs font-medium",
                      get('accent', 'primary'),
                      "hover:opacity-80 transition-opacity"
                    )}
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-3">
                      <div className="flex items-start space-x-3">
                        <div className={`w-8 h-8 rounded-full ${skeletonClasses}`} />
                        <div className="flex-1">
                          <div className={`h-4 w-3/4 mb-2 ${skeletonClasses}`} />
                          <div className={`h-3 w-1/2 ${skeletonClasses}`} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : notifications.filter(n => !n.is_read).length > 0 ? (
                  <div className={combine("divide-y", get('border', 'primary'))}>
                    {notifications.filter(n => !n.is_read).map((notification) => {
                      const typeInfo = getNotificationTypeInfo(notification.notification_type);
                      return (
                        <div
                          key={notification.id}
                          className={combine(
                            "p-3 cursor-pointer transition-all duration-150",
                            get('bg', 'hover'),
                            get('bg', 'secondary')
                          )}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={combine(
                              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                              typeInfo.bg,
                              typeInfo.text,
                              "font-medium text-xs"
                            )}>
                              {notification.sender_name?.charAt(0).toUpperCase() || 'S'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className={combine("font-medium text-sm truncate max-w-[180px]", get('text', 'primary'))}>
                                    {notification.title}
                                  </p>
                                  <p className={combine("text-xs mt-0.5 truncate max-w-[180px]", get('text', 'secondary'))}>
                                    {notification.message}
                                  </p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                              </div>

                              <div className="flex items-center mt-1 space-x-2">
                                <span className={combine("text-xs px-1.5 py-0.5 rounded", typeInfo.bg, typeInfo.text)}>
                                  {notification.sender_name}
                                </span>
                                <span className={combine("text-xs", get('text', 'tertiary'))}>
                                  {formatRelativeTime(notification.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center">
                    <p className={combine(get('text', 'tertiary'))}>No unread notifications</p>
                    <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>All caught up!</p>
                  </div>
                )}
              </div>

              {notifications.filter(n => !n.is_read).length > 0 && (
                <div className={combine("p-2 border-t text-center", get('border', 'primary'), get('bg', 'secondary'))}>
                  <button
                    onClick={() => fetchNotifications()}
                    className={combine("text-xs font-medium", get('accent', 'primary'), "hover:opacity-80 transition-opacity")}
                  >
                    Refresh notifications
                  </button>
                </div>
              )}
            </div>
          </div>

     

          {/* User Profile */}
          <div className={combine(
            "flex items-center space-x-3 pl-3",
            "border-l",
            get('border', 'primary')
          )}>
            <div className="text-right">
              {loading ? (
                <>
                  <div className={combine("h-4 w-24 mb-1", skeletonClasses)} />
                  <div className={combine("h-3 w-16", skeletonClasses)} />
                </>
              ) : (
                <>
                  <p className={combine(
                    "font-medium text-sm",
                    get('text', 'primary')
                  )}>
                    {getTeacherName()}
                  </p>
                  <p className={combine(
                    "text-xs capitalize",
                    get('text', 'secondary')
                  )}>
                    {getTeacherRole()} • {getTeacherSubject()}
                  </p>
                </>
              )}
            </div>
            
            <div className="relative group">
              <div className={combine(
                "w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold",
                "cursor-pointer transition-all duration-200 hover:scale-105",
                "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
                "shadow-md hover:shadow-lg"
              )}>
                {loading ? (
                  <div className={combine("w-6 h-6 rounded-full", skeletonClasses)} />
                ) : (
                  getTeacherInitials()
                )}
              </div>
              
              {/* Profile dropdown */}
              <div className={combine(
                "absolute right-0 top-full mt-2 w-64 rounded-lg border z-50",
                "opacity-0 invisible group-hover:opacity-100 group-hover:visible",
                "transition-all duration-200 transform translate-y-2 group-hover:translate-y-0",
                get('bg', 'overlay'),
                get('border', 'primary'),
                get('shadow', 'lg')
              )}>
                <div className="p-4">
                  <p className={combine(
                    "font-medium text-sm",
                    get('text', 'primary')
                  )}>
                    {getTeacherName()}
                  </p>
                  <p className={combine(
                    "text-xs truncate mt-1",
                    get('text', 'secondary')
                  )}>
                    {getTeacherEmail()}
                  </p>
                  <p className={combine(
                    "text-xs mt-1",
                    get('text', 'tertiary')
                  )}>
                    {getTeacherPhone()}
                  </p>
                  <div className={combine(
                    "text-xs font-medium mt-2 px-2 py-1 rounded inline-block",
                    get('accent', 'primary'),
                    "bg-opacity-10 bg-current"
                  )}>
                    {getTeacherRole()}
                  </div>
                </div>
                
                <div className={combine(
                  "p-2 border-t",
                  get('border', 'primary')
                )}>
                  <button 
                    className={combine(
                      "w-full text-left px-3 py-2 text-sm rounded transition-all duration-150",
                      "flex items-center space-x-2",
                      get('text', 'secondary'),
                      "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                    )}
                    onClick={() => window.location.href = '/teacher/settings/profile'}
                  >
                    <FaUserCircle className="w-4 h-4" />
                    <span>My Profile</span>
                  </button>
                  <button 
                    onClick={handleLogout}
                    className={combine(
                      "w-full text-left px-3 py-2 text-sm rounded transition-all duration-150 mt-1",
                      "flex items-center space-x-2",
                      "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    )}
                  >
                    <FaSignOutAlt className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
