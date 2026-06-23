// components/dashboard/student/Header.tsx
'use client';

import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
import {
  FaSearch,
  FaBell,
  FaSun,
  FaMoon,
  FaQuestionCircle,
  FaBars,
  FaCalendar,
  FaBook,
  FaClipboardCheck,
  FaChartLine,
  FaBullhorn,
  FaBus,
  FaMoneyBillWave,
  FaTasks,
  FaUserGraduate,
  FaHotel,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface StudentProfile {
  student_name?: string;
  student_id?: string;
  student_email?: string;
  class_name?: string;
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

interface StudentHeaderProps {
  onMenuClick?: () => void;
}

interface SearchSuggestion {
  label: string;
  description: string;
  href: string;
  keywords: string[];
}

export const StudentHeader = ({ onMenuClick }: StudentHeaderProps) => {
  const router = useRouter();
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  const unreadNotifications = Array.isArray(notifications)
    ? notifications.filter(n => !n.is_read)
    : [];
  const unreadCount = unreadNotifications.length;
  const initialMountRef = useRef(true);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const studentSearchSuggestions: SearchSuggestion[] = [
    { label: 'Dashboard', description: 'Student overview', href: '/student', keywords: ['home', 'overview'] },
    { label: 'Timetable', description: 'View class timetable', href: '/student/academics/timetable', keywords: ['schedule', 'periods'] },
    { label: 'Assignments', description: 'Pending and submitted assignments', href: '/student/academics/assignments', keywords: ['homework', 'submission'] },
    { label: 'Study Materials', description: 'Class resources and materials', href: '/student/academics/materials', keywords: ['notes', 'materials'] },
    { label: 'Tasks', description: 'Your tasks and todos', href: '/student/academics/tasks', keywords: ['tasks', 'todo'] },
    { label: 'Exam Results', description: 'View exam performance', href: '/student/performance/exams', keywords: ['exams', 'results', 'marks'] },
    { label: 'Attendance', description: 'Track attendance', href: '/student/performance/attendance', keywords: ['attendance', 'present'] },
    { label: 'Behavior Reports', description: 'Behavior analytics', href: '/student/performance/behaviour', keywords: ['behavior', 'reports'] },
    { label: 'Leaves', description: 'Leave applications and history', href: '/student/leaves', keywords: ['leave', 'vacation'] },
    { label: 'Announcements', description: 'School announcements', href: '/student/announcement', keywords: ['notice', 'announcements'] },
    { label: 'Fees & Payments', description: 'Fee summary and payments', href: '/student/fees', keywords: ['fees', 'payments'] },
    { label: 'Transport', description: 'Transport details', href: '/student/transport', keywords: ['bus', 'transport'] },
    { label: 'Hostel', description: 'Hostel details and roommates', href: '/student/hostel', keywords: ['hostel', 'room', 'bed', 'warden'] },
  ];

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return studentSearchSuggestions
      .filter((item) => {
        const haystack = `${item.label} ${item.description} ${item.href} ${item.keywords.join(' ')}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [searchQuery]);

  // Check if mobile on mount and resize
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch all data on component mount
  useEffect(() => {
    if (initialMountRef.current) {
      initialMountRef.current = false;
      fetchStudentProfile();
      fetchNotifications();
    }
  }, []);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      const response = await studentApi.profile.get();
      const data = response.data?.data || response.data;
      setStudentProfile(data || null);
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toastError(error?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setNotificationsLoading(true);
    }
    try {
      const response = await studentApi.notification.listAll();
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
      if (!options?.silent) {
        setNotificationsLoading(false);
      }
    }
  };

  const markNotificationAsRead = async (id: number) => {
    try {
      await studentApi.notification.markAsRead(id);

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLogout = () => {
    toastSuccess('Logged out successfully!');

    setTimeout(() => {
      logout();
    }, 800);
  };

  const getStudentInitials = () => {
    if (!studentProfile?.student_name) return 'SU';

    const parts = studentProfile.student_name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
    }
    return studentProfile.student_name.charAt(0).toUpperCase();
  };

  const getStudentName = () => {
    return studentProfile?.student_name || 'Student User';
  };

  const getStudentRole = () => {
    const className = studentProfile?.class_name ? `Class ${studentProfile.class_name}` : null;
    const section = studentProfile?.section ? `Section ${studentProfile.section}` : null;
    return [className, section].filter(Boolean).join(' • ') || 'Student';
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const bestMatch = filteredSuggestions[0];
    if (bestMatch) {
      router.push(bestMatch.href);
      setSearchFocused(false);
      return;
    }

    toastInfo('No matching student page found');
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    router.push(suggestion.href);
    setSearchQuery(suggestion.label);
    setSearchFocused(false);
  };

  const getSuggestionIcon = (href: string) => {
    if (href.includes('/academics/timetable')) return <FaCalendar className="w-4 h-4" />;
    if (href.includes('/academics/assignments')) return <FaTasks className="w-4 h-4" />;
    if (href.includes('/academics/materials')) return <FaBook className="w-4 h-4" />;
    if (href.includes('/performance/attendance')) return <FaClipboardCheck className="w-4 h-4" />;
    if (href.includes('/performance/exams')) return <FaChartLine className="w-4 h-4" />;
    if (href.includes('/announcement')) return <FaBullhorn className="w-4 h-4" />;
    if (href.includes('/transport')) return <FaBus className="w-4 h-4" />;
    if (href.includes('/hostel')) return <FaHotel className="w-4 h-4" />;
    if (href.includes('/fees')) return <FaMoneyBillWave className="w-4 h-4" />;
    if (href === '/student') return <FaUserGraduate className="w-4 h-4" />;
    return <FaSearch className="w-4 h-4" />;
  };

  // Format date to relative time
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

  // Get notification type icon/color
  const getNotificationTypeInfo = (type: string) => {
    switch (type.toLowerCase()) {
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

  const headerClasses = combine(
    'bg-gradient-to-br',
    theme === 'dark'
      ? 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]'
      : 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]',
    'border-b',
    get('border', 'primary'),
    'px-4 sm:px-6 lg:px-8 py-3 md:py-4',
    'transition-all duration-150',
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

  const iconButtonClasses = combine(
    'p-2 rounded-lg transition-all duration-200',
    'text-sm',
    get('bg', 'hover'),
    get('icon', 'primary'),
    'hover:scale-105 active:scale-95'
  );

  const badgeClasses = combine(
    'absolute -top-1 -right-1 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center',
    'bg-red-500'
  );

  const skeletonClasses = combine(
    'animate-pulse rounded',
    'bg-gradient-to-r from-[var(--color-bg-secondary)] via-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)]'
  );

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  return (
    <header
      className={headerClasses}
      style={{
        borderBottom: `1px solid var(--color-border-primary)`,
        boxShadow: `var(--shadow-sm)`,
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left side: Mobile menu button, Search, and Info */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {/* Mobile Menu Button */}
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className={combine(
                iconButtonClasses,
                'mr-2'
              )}
              aria-label="Toggle menu"
            >
              <FaBars className="w-5 h-5" />
            </button>
          )}

          {/* Search Bar */}
          <div className="relative flex-1 lg:flex-none" ref={searchRef}>
            <form className="relative" onSubmit={handleSearchSubmit}>
              <FaSearch className={combine(
                'absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4',
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder={isMobile ? 'Search...' : 'Search timetable, assignments, fees...'}
                className={searchInputClasses}
                onFocus={() => setSearchFocused(true)}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSearchFocused(true);
                }}
                style={{
                  background: `var(--color-bg-card)`,
                  border: `1px solid var(--color-border-secondary)`,
                  color: `var(--color-text-primary)`,
                }}
              />
            </form>
            {searchFocused && searchQuery.trim() && (
              <div
                className={combine(
                  'absolute mt-2 w-full lg:w-96 rounded-lg border z-50 overflow-hidden',
                  theme === 'dark' ? 'bg-slate-900' : 'bg-white',
                  get('border', 'primary'),
                  get('shadow', 'lg')
                )}
                style={{
                  background: theme === 'dark' ? 'var(--color-bg-secondary)' : '#ffffff',
                }}
              >
                {filteredSuggestions.length > 0 ? (
                  <ul className="max-h-80 overflow-y-auto">
                    {filteredSuggestions.map((suggestion) => (
                      <li key={suggestion.href}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className={combine(
                            'w-full text-left px-3 py-2.5 transition-colors duration-150',
                            'flex items-start gap-2.5',
                            theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'
                          )}
                        >
                          <span className={combine('mt-0.5', get('icon', 'secondary'))}>
                            {getSuggestionIcon(suggestion.href)}
                          </span>
                          <span>
                            <p className={combine('text-sm font-medium', get('text', 'primary'))}>
                              {suggestion.label}
                            </p>
                            <p className={combine('text-xs mt-0.5', get('text', 'secondary'))}>
                              {suggestion.description}
                            </p>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={combine('px-3 py-2.5 text-sm', get('text', 'secondary'))}>
                    No suggestions found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side: User actions */}
        <div className="flex items-center space-x-2 lg:space-x-3">
          {/* Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme();
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

          {/* Help Button - Hidden on mobile */}
          <button
            className={combine(iconButtonClasses, 'hidden lg:flex')}
            aria-label="Help Center"
            title="Help Center"
            onClick={() => toastInfo('Help center coming soon!')}
          >
            <FaQuestionCircle className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              className={combine(iconButtonClasses, 'relative')}
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
            <div className={combine(
              'fixed md:absolute right-0 md:top-full top-16 md:mt-2 w-full md:w-96 max-w-[calc(100vw-2rem)] md:max-w-none rounded-lg border z-50',
              'text-sm',
              get('bg', 'overlay'),
              get('border', 'primary'),
              get('shadow', 'lg'),
              'transform transition-all duration-200',
              showNotifications
                ? 'opacity-100 visible scale-100 translate-y-0'
                : 'opacity-0 invisible scale-95 translate-y-2'
            )}>
              <div className={combine(
                'p-3 border-b flex items-center justify-between',
                get('border', 'primary'),
                get('bg', 'secondary')
              )}>
                <div>
                  <h3 className={combine(
                    'font-medium',
                    get('text', 'primary')
                  )}>
                    Notifications
                  </h3>
                  <p className={combine(
                    'text-xs mt-0.5',
                    get('text', 'tertiary')
                  )}>
                    {unreadCount} unread • {unreadCount > 0 ? `${unreadCount} new` : 'No new messages'}
                  </p>
                </div>
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
                ) : unreadNotifications.length > 0 ? (
                  <div className={combine(
                    'divide-y',
                    get('border', 'primary')
                  )}>
                    {unreadNotifications.map((notification) => {
                      const typeInfo = getNotificationTypeInfo(notification.notification_type);

                      return (
                        <div
                          key={notification.id}
                          className={combine(
                            'p-3 cursor-pointer transition-all duration-150',
                            get('bg', 'hover'),
                            get('bg', 'secondary')
                          )}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={combine(
                              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                              typeInfo.bg,
                              typeInfo.text,
                              'font-medium text-xs'
                            )}>
                              {notification.sender_name?.charAt(0).toUpperCase() || 'S'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className={combine(
                                    'font-medium text-sm truncate max-w-[180px]',
                                    get('text', 'primary')
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className={combine(
                                    'text-xs mt-0.5 truncate max-w-[180px]',
                                    get('text', 'secondary')
                                  )}>
                                    {notification.message}
                                  </p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                              </div>

                              <div className="flex items-center mt-1 space-x-2">
                                <span className={combine(
                                  'text-xs px-1.5 py-0.5 rounded',
                                  typeInfo.bg,
                                  typeInfo.text
                                )}>
                                  {notification.sender_name}
                                </span>
                                <span className={combine(
                                  'text-xs',
                                  get('text', 'tertiary')
                                )}>
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
                    <p className={combine(
                      get('text', 'tertiary')
                    )}>
                      No unread notifications
                    </p>
                    <p className={combine(
                      'text-xs mt-2',
                      get('text', 'tertiary')
                    )}>
                      All caught up!
                    </p>
                  </div>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <div className={combine(
                  'p-2 border-t text-center',
                  get('border', 'primary'),
                  get('bg', 'secondary')
                )}>
                  <button
                    onClick={() => fetchNotifications()}
                    className={combine(
                      'text-xs font-medium',
                      get('accent', 'primary'),
                      'hover:opacity-80 transition-opacity'
                    )}
                  >
                    Refresh notifications
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* User Profile */}
          <div
            className={combine(
              'flex items-center space-x-2 lg:space-x-3 pl-2 lg:pl-3',
              'border-l',
              get('border', 'primary')
            )}
            ref={profileRef}
          >
            <div className="text-right hidden lg:block">
              {loading ? (
                <>
                  <div className={combine('h-4 w-24 mb-1', skeletonClasses)} />
                  <div className={combine('h-3 w-16', skeletonClasses)} />
                </>
              ) : (
                <>
                  <p className={combine(
                    'font-medium text-sm',
                    get('text', 'primary')
                  )}>
                    {getStudentName()}
                  </p>
                  <p className={combine(
                    'text-xs capitalize',
                    get('text', 'secondary')
                  )}>
                    {getStudentRole()}
                  </p>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={combine(
                  'w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold',
                  'cursor-pointer transition-all duration-200 hover:scale-105',
                  'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700',
                  'shadow-md hover:shadow-lg'
                )}
                aria-label="Profile menu"
              >
                {loading ? (
                  <div className={combine('w-5 h-5 rounded-full', skeletonClasses)} />
                ) : (
                  getStudentInitials()
                )}
              </button>

              {showProfileDropdown && (
                <div
                  className={combine(
                    'absolute right-0 mt-2 w-56 rounded-lg border z-50',
                    get('bg', 'overlay'),
                    get('border', 'primary'),
                    get('shadow', 'lg')
                  )}
                >
                  <div className={combine('p-3 border-b', get('border', 'primary'))}>
                    <p className={combine('font-semibold text-sm', get('text', 'primary'))}>
                      {getStudentName()}
                    </p>
                    {studentProfile?.student_id && (
                      <p className={combine('text-xs mt-1', get('text', 'tertiary'))}>
                        ID: {studentProfile.student_id}
                      </p>
                    )}
                  </div>
                  <div className="p-2">
                    <button
                      onClick={() => router.push('/student/settings')}
                      className={combine(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        get('text', 'secondary'),
                        'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                      )}
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => router.push('/student/settings/help')}
                      className={combine(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        get('text', 'secondary'),
                        'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                      )}
                    >
                      Help & Support
                    </button>
                  </div>
                  <div className={combine('p-2 border-t', get('border', 'primary'))}>
                    <button
                      onClick={handleLogout}
                      className={combine(
                        'w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150',
                        'text-red-600 dark:text-red-400',
                        'hover:bg-red-50 dark:hover:bg-red-900/20'
                      )}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
