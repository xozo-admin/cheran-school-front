// src/components/dashboard/Header.tsx

'use client';

import { useState, useEffect, useRef, useMemo, type FormEvent } from 'react';
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
  FaBars,
  FaUsers,
  FaSchool,
  FaCalendar,
  FaArrowUp,
  FaArrowDown,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUserTie,
  FaBook,
  FaTools,
  FaMoneyBillWave,
  FaBullhorn,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { useRouter } from 'next/navigation';
import {
  toastSuccess,
  toastError,
  toastInfo,
} from '@/lib/toast';

import { adminApi } from '@/lib/api';
import { setupAdminWebNotifications } from '@/lib/admin-web-notifications';
import Cookies from 'js-cookie';
import { clearAllCookies } from '@/lib/auth';

interface AdminProfile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  current_academic_year: string;
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

interface DashboardStats {
  school_name: string;
  active_academic_year: string;
  total_students: number;
  trend: 'increase' | 'decrease' | 'stable';
  percentage_change: string;
  comparison_text: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

interface SearchSuggestion {
  label: string;
  description: string;
  href: string;
  keywords: string[];
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null | any>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const unreadNotifications = Array.isArray(notifications)
    ? notifications.filter(n => !n.is_read)
    : [];
  const unreadCount = unreadNotifications.length;
  const initialMountRef = useRef(true);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const adminSearchSuggestions: SearchSuggestion[] = [
    { label: 'Dashboard', description: 'Admin home overview', href: '/admin', keywords: ['home', 'overview', 'stats'] },
    { label: 'All Students', description: 'Student directory and records', href: '/admin/students/allstudents', keywords: ['student', 'admissions', 'all students'] },
    { label: 'Student Attendance', description: 'Track daily student attendance', href: '/admin/students/attendance', keywords: ['attendance', 'present', 'absent'] },
    { label: 'Student Grades', description: 'Exam schedules and grades', href: '/admin/students/grades', keywords: ['grades', 'marks', 'results', 'exam'] },
    { label: 'All Teachers', description: 'Teacher directory and overview', href: '/admin/teachers/allteachers', keywords: ['teachers', 'faculty'] },
    { label: 'Teacher Attendance', description: 'Teacher attendance records', href: '/admin/teachers/attendance', keywords: ['teachers attendance', 'teacher present'] },
    { label: 'All Staff', description: 'Staff directory', href: '/admin/staff/directory', keywords: ['staff directory', 'employees'] },
    { label: 'Staff Attendance', description: 'Staff attendance records', href: '/admin/staff/attendance', keywords: ['staff attendance', 'workday'] },
    { label: 'Attendance Config', description: 'Attendance setup and configuration', href: '/admin/academics/attendance', keywords: ['config', 'settings', 'attendance setup'] },
    { label: 'Classes & Sections', description: 'Manage classes and sections', href: '/admin/academics/classes', keywords: ['classes', 'sections'] },
    { label: 'Subjects', description: 'Manage academic subjects', href: '/admin/academics/subjects', keywords: ['subject', 'curriculum'] },
    { label: 'Teacher Allocations', description: 'Allocate teachers to classes', href: '/admin/teachers/allocations', keywords: ['allocations', 'mapping'] },
    { label: 'Timetable', description: 'Academic timetable management', href: '/admin/academics/timetable', keywords: ['schedule', 'periods', 'timetable'] },
    { label: 'Examinations', description: 'Examination management', href: '/admin/academics/examination', keywords: ['exam', 'tests'] },
    { label: 'Transport Management', description: 'Transport routes and vehicles', href: '/admin/operations/transport', keywords: ['bus', 'routes', 'transport'] },
    { label: 'Transport Live Tracking', description: 'Track transport live location', href: '/admin/operations/transport/live', keywords: ['live', 'tracking', 'map'] },
    { label: 'Hostel Management', description: 'Hostel blocks, rooms, and allocations', href: '/admin/operations/hostel', keywords: ['hostel', 'rooms', 'beds', 'warden'] },
    { label: 'Staff Work', description: 'Work assignments and tasks', href: '/admin/staff/work', keywords: ['tasks', 'assignments', 'work'] },
    { label: 'Inventory', description: 'Inventory and resources', href: '/admin/staff/resources', keywords: ['stock', 'resources', 'inventory'] },
    { label: 'Leave Management', description: 'Leave requests and approvals', href: '/admin/operations/leave', keywords: ['leave', 'vacation'] },
    { label: 'Holidays', description: 'Holiday calendar management', href: '/admin/operations/holidays', keywords: ['holiday', 'calendar'] },
    { label: 'Fees', description: 'Fee collection and reports', href: '/admin/fees', keywords: ['finance', 'payments', 'fees'] },
    { label: 'Salary & Payroll', description: 'Payroll management', href: '/admin/salary', keywords: ['salary', 'payroll'] },
    { label: 'Announcements', description: 'School-wide announcements', href: '/admin/communications/announcements', keywords: ['notice', 'announcements', 'communication'] },
  ];

  const filteredSuggestions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return [];

    return adminSearchSuggestions
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
      fetchAdminProfile();
      fetchDashboardStats();
      fetchNotifications();
    }
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const initializeWebNotifications = async () => {
      try {
        cleanup = await setupAdminWebNotifications({
          onForegroundMessage: () => {},
        });
      } catch (error) {
        console.error('Failed to initialize admin web notifications:', error);
      }
    };

    initializeWebNotifications();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const fetchAdminProfile = async (): Promise<void> => {
    try {
      const response = await adminApi.profile.get();
      const data = response.data;

      let profileData = null;

      if (data?.data) profileData = data.data;
      else if (data?.username) profileData = data;

      setAdminProfile(profileData);
    } catch (error: any) {
      console.error('Error fetching admin profile:', error);
      toastError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    setStatsLoading(true);

    try {
      const response = await adminApi.dashboard.get();
      console.log('Dashboard stats response:', response.data);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchNotifications = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setNotificationsLoading(true);
    }
    try {
      const response = await adminApi.notification.listAll();

      const data = response.data;

      // Handle different backend response formats safely
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
      const token = Cookies.get('token');
      if (!token) return;

      await adminApi.notification.markAsRead(id);

      // Update local state
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
    clearAllCookies();

    toastSuccess('Logged out successfully!');

    setTimeout(() => {
      router.push('/')
    }, 800);
  };

  const getAdminInitials = () => {
    if (!adminProfile) return 'AU';

    const { first_name, last_name, username } = adminProfile;
    if (first_name && last_name) {
      return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
    }
    if (first_name) {
      return first_name.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'AU';
  };

  const getAdminName = () => {
    if (!adminProfile) return 'Loading...';

    const { first_name, last_name, username } = adminProfile;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (first_name) {
      return first_name;
    }
    return username || 'Admin User';
  };

  const getAdminEmail = () => {
    return adminProfile?.email || 'admin@school.com';
  };

  const getAdminPhone = () => {
    return adminProfile?.phone || 'Not provided';
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const bestMatch = filteredSuggestions[0];
    if (bestMatch) {
      router.push(bestMatch.href);
      setSearchFocused(false);
      return;
    }

    toastInfo('No matching admin page found');
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    router.push(suggestion.href);
    setSearchQuery(suggestion.label);
    setSearchFocused(false);
  };

  const getSuggestionIcon = (href: string) => {
    if (href.startsWith('/admin/students')) return <FaUserGraduate className="w-4 h-4" />;
    if (href.startsWith('/admin/teachers')) return <FaChalkboardTeacher className="w-4 h-4" />;
    if (href.startsWith('/admin/staff')) return <FaUserTie className="w-4 h-4" />;
    if (href.startsWith('/admin/academics')) return <FaBook className="w-4 h-4" />;
    if (href.startsWith('/admin/operations')) return <FaTools className="w-4 h-4" />;
    if (href.startsWith('/admin/fees') || href.startsWith('/admin/salary')) return <FaMoneyBillWave className="w-4 h-4" />;
    if (href.startsWith('/admin/communications')) return <FaBullhorn className="w-4 h-4" />;
    if (href === '/admin') return <FaSchool className="w-4 h-4" />;
    return <FaSearch className="w-4 h-4" />;
  };

  const getAdminRole = () => {
    if (!adminProfile) return 'Super Administrator';

    const userType = adminProfile.user_type;
    if (userType === 'admin') return 'Administrator';
    return userType?.replace('_', ' ') || 'Super Administrator';
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

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US');
  };

  // Get trend icon and color
  const getTrendInfo = (trend: string) => {
    switch (trend) {
      case 'increase':
        return {
          icon: FaArrowUp,
          color: 'text-green-600 dark:text-green-400',
          bg: 'bg-green-100 dark:bg-green-900/30',
        };
      case 'decrease':
        return {
          icon: FaArrowDown,
          color: 'text-red-600 dark:text-red-400',
          bg: 'bg-red-100 dark:bg-red-900/30',
        };
      default:
        return {
          icon: null,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-100 dark:bg-gray-800',
        };
    }
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
    'bg-red-500'
  );

  const skeletonClasses = combine(
    'animate-pulse rounded',
    'bg-gradient-to-r from-[var(--color-bg-secondary)] via-[var(--color-bg-tertiary)] to-[var(--color-bg-secondary)]'
  );



  return (
    <header
      className={headerClasses}
      style={{
        borderBottom: `1px solid var(--color-border-primary)`,
        boxShadow: `var(--shadow-sm)`,
        // Remove sticky positioning
      }}
    >
      <div className="flex items-center justify-between">
        {/* Left side: Mobile menu button, Search, and Dashboard Stats */}
        <div className="flex items-center space-x-3 lg:space-x-6">
          {/* Mobile Menu Button */}
          {isMobile && onMenuClick && (
            <button
              onClick={onMenuClick}
              className={combine(
                iconButtonClasses,
                "mr-2"
              )}
              aria-label="Toggle menu"
            >
              <FaBars className="w-5 h-5" />
            </button>
          )}

          {/* Dashboard Stats */}
          <div className="hidden lg:flex xl:hidden items-center">
            <div className={combine(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border max-w-[160px]',
              get('bg', 'secondary'),
              get('border', 'primary')
            )}>
              <FaCalendar className={combine('w-3.5 h-3.5', get('icon', 'primary'))} />
              <p className={combine('text-xs font-semibold truncate', get('text', 'primary'))}>
                {adminProfile?.current_academic_year || 'N/A'}
              </p>
            </div>
          </div>
          <div className="hidden xl:flex items-center space-x-4 md:space-x-6">
            {/* Academic Year */}
            <div className="flex items-center space-x-2">
              <div className={combine(
                "p-2 rounded-lg",
                get('bg', 'secondary'),
                get('border', 'primary'),
                'border'
              )}>
                <FaCalendar className={combine(
                  "w-4 h-4",
                  get('icon', 'primary')
                )} />
              </div>
              <div>
                <p className={combine(
                  "text-xs",
                  get('text', 'tertiary')
                )}>
                  Academic Year
                </p>
                <p className={combine(
                  "text-sm font-semibold",
                  get('text', 'primary')
                )}>
                  {adminProfile?.current_academic_year || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative flex-1 lg:flex-none" ref={searchRef}>
            <form className="relative" onSubmit={handleSearchSubmit}>
              <FaSearch className={combine(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder={isMobile ? "Search..." : "Search students, teachers, reports..."}
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
            className={combine(iconButtonClasses, "hidden lg:flex")}
            aria-label="Help Center"
            title="Help Center"
            onClick={() => toastInfo('Help center coming soon!')}
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
                "p-3 border-b flex items-center justify-between",
                get('border', 'primary'),
                get('bg', 'secondary')
              )}>
                <div>
                  <h3 className={combine(
                    "font-medium",
                    get('text', 'primary')
                  )}>
                    Notifications
                  </h3>
                  <p className={combine(
                    "text-xs mt-0.5",
                    get('text', 'tertiary')
                  )}>
                    {unreadCount} unread • {unreadCount > 0 ? `${unreadCount} new` : 'No new messages'}
                  </p>
                </div>

              </div>
              <div className="max-h-96 overflow-y-auto">
                {notificationsLoading ? (
                  // Loading skeleton
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
                    "divide-y",
                    get('border', 'primary')
                  )}>
                    {unreadNotifications.map((notification) => {
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
                            {/* Sender avatar/icon */}
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
                                  <p className={combine(
                                    "font-medium text-sm truncate max-w-[180px]",
                                    get('text', 'primary')
                                  )}>
                                    {notification.title}
                                  </p>
                                  <p className={combine(
                                    "text-xs mt-0.5 truncate max-w-[180px]",
                                    get('text', 'secondary')
                                  )}>
                                    {notification.message}
                                  </p>
                                </div>
                                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                              </div>

                              <div className="flex items-center mt-1 space-x-2">
                                <span className={combine(
                                  "text-xs px-1.5 py-0.5 rounded",
                                  typeInfo.bg,
                                  typeInfo.text
                                )}>
                                  {notification.sender_name}
                                </span>
                                <span className={combine(
                                  "text-xs",
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
                      "text-xs mt-2",
                      get('text', 'tertiary')
                    )}>

                      All caught up!
                    </p>
                  </div>
                )}
              </div>
              {unreadNotifications.length > 0 && (
                <div className={combine(
                  "p-2 border-t text-center",
                  get('border', 'primary'),
                  get('bg', 'secondary')
                )}>
                  <button
                    onClick={() => fetchNotifications()}
                    className={combine(
                      "text-xs font-medium",
                      get('accent', 'primary'),
                      "hover:opacity-80 transition-opacity"
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
              "flex items-center space-x-2 lg:space-x-3 pl-2 lg:pl-3",
              "border-l",
              get('border', 'primary')
            )}
            ref={profileRef}
          >
            <div className="text-right hidden lg:block">
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
                    {getAdminName()}
                  </p>
                  <p className={combine(
                    "text-xs capitalize",
                    get('text', 'secondary')
                  )}>
                    {getAdminRole()}
                  </p>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className={combine(
                  "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold",
                  "cursor-pointer transition-all duration-200 hover:scale-105",
                  "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700",
                  "shadow-md hover:shadow-lg"
                )}
                aria-label="Profile menu"
              >
                {loading ? (
                  <div className={combine("w-5 h-5 rounded-full", skeletonClasses)} />
                ) : (
                  getAdminInitials()
                )}
              </button>

              
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
