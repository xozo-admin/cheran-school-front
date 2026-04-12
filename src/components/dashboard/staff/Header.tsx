// components/dashboard/staff/header.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  FaSearch,
  FaCog,
  FaSun,
  FaMoon,
  FaQuestionCircle,
  FaClock,
  FaBell,
  FaUserCircle,
  FaSignOutAlt,
  FaBars,
  FaCaretDown,
  FaTasks,
  FaCalendarCheck,
  FaClipboardCheck,
  FaMoneyBill,
  FaTruck,
  FaBox,
  FaBullhorn,
  FaCalendarDay
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { staffApi } from '@/lib/api';
import { clearAllCookies } from '@/lib/auth';

/* ---------------- TYPES ---------------- */

interface Notification {
  id: number;
  title: string;
  time: string;
  type: string;
  unread: boolean;
  icon: string;
}

interface HeaderProps {
  profileData?: any;
  onMarkAttendance?: () => void;
  pendingTasks?: number;
  unreadAnnouncements?: number;
  onMenuClick?: () => void;
}

/* ---------------- COMPONENT ---------------- */

export const StaffHeader = ({ 
  profileData, 
  onMarkAttendance, 
  pendingTasks = 0,
  unreadAnnouncements = 0,
  onMenuClick
}: HeaderProps) => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { get, combine } = useThemeClasses();
  
  const [time, setTime] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const initialMountRef = useRef(true);

  // Theme-aware CSS variables for consistent styling
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

  /* ---------------- CLOCK & DATA LOADING ---------------- */

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      
      // Check if attendance should be marked today
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      // Reset attendance marked flag after midnight
      if (currentHour === 0 && currentMinute === 0) {
        setAttendanceMarked(false);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);

    // Load notifications
    loadNotifications();

    return () => clearInterval(interval);
  }, []);

  /* ---------------- LOAD NOTIFICATIONS ---------------- */

  const loadNotifications = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await staffApi.announcements.dashboard({ date: today });
      const data = response.data?.data || response.data;
        
        const notificationList: Notification[] = [];
        
        // Add announcements as notifications
        if (Array.isArray(data?.staff_announcements)) {
          data.staff_announcements.slice(0, 5).forEach((ann: any) => {
            notificationList.push({
              id: Date.now() + Math.random(),
              title: ann.title,
              time: ann.date,
              type: 'announcement',
              unread: true,
              icon: '📢'
            });
          });
        }

        // Add task notifications
        if (pendingTasks > 0) {
          notificationList.push({
            id: 999,
            title: `${pendingTasks} task(s) pending`,
            time: 'Today',
            type: 'task',
            unread: true,
            icon: '📝'
          });
        }

        setNotifications(notificationList);
        setUnreadCount(notificationList.filter(n => n.unread).length);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- ACTIONS ---------------- */

  const handleThemeToggle = () => {
    toggleTheme();
    toastSuccess(`Switched to ${theme === 'light' ? 'dark' : 'light'} mode`);
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
    toastSuccess('All notifications marked as read');
  };

  const handleSignOut = async () => {
    try {
      clearAllCookies();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('username');
      localStorage.removeItem('staff_role');
      localStorage.removeItem('login_time');
      localStorage.removeItem('token_expiry');
      
      toastSuccess('Logged out successfully!');
      
      // Redirect to login page
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Logout error:', error);
      toastError('Logout failed');
    }
  };

  const handleMarkAttendanceClick = () => {
    if (onMarkAttendance) {
      onMarkAttendance();
      setAttendanceMarked(true);
      toastSuccess('Attendance marked successfully!');
    }
  };

  const handleViewTasks = () => {
    router.push('/staff/tasks');
  };

  const handleViewInventory = () => {
    router.push('/staff/inventory');
  };

  const handleViewAnnouncements = () => {
    router.push('/staff/announcements');
  };

  const handleViewSalary = () => {
    router.push('/staff/salary');
  };

  const handleViewLeaves = () => {
    router.push('/staff/leaves');
  };

  const handleViewProfile = () => {
    router.push('/staff/profile');
  };

  /* ---------------- THEME-AWARE CLASSES ---------------- */

  const headerClasses = combine(
    'bg-gradient-to-br',
    theme === 'dark'
      ? 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]'
      : 'from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)]',
    'border-b',
    get('border', 'primary'),
    'px-4 sm:px-6 lg:px-8 py-3 md:py-4',
    'sticky top-0 z-30',
    'transition-all duration-150',
    'shadow-sm'
  );

  const timeCardClasses = combine(
    'flex items-center gap-3 px-4 py-2 rounded-xl',
    get('bg', 'secondary'),
    get('text', 'primary')
  );

  const searchInputClasses = combine(
    'w-full lg:w-80 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 transition-all duration-200',
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
    'bg-[var(--color-status-error)]'
  );

  const notificationDropdownClasses = combine(
    'fixed md:absolute right-0 md:top-full top-16 md:mt-2 w-full md:w-96 max-w-[calc(100vw-2rem)] md:max-w-none rounded-lg border z-50',
    'text-sm',
    get('bg', 'overlay'),
    get('border', 'primary'),
    get('shadow', 'lg')
  );

  const profileDropdownClasses = combine(
    'absolute right-0 mt-2 w-64 rounded-lg border z-50',
    get('bg', 'overlay'),
    get('border', 'primary'),
    get('shadow', 'lg')
  );

  const actionButtonClasses = combine(
    'px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md',
    'font-medium text-sm',
    'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)]',
    'text-white hover:opacity-90'
  );

  const quickStatClasses = combine(
    'text-sm',
    get('text', 'secondary')
  );

  /* ---------------- UI ---------------- */

  const staffName = profileData?.name || 'Staff Member';
  const staffRole = profileData?.role || 'staff';
  const roleDisplay = staffRole.replace('_', ' ').toUpperCase();
  const staffInitials = staffName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <header className={headerClasses}>
      {/* TOP BAR */}
      <div className="flex items-center justify-between">

        {/* LEFT SIDE */}
        <div className="flex items-center space-x-3 lg:space-x-6 flex-1">
          {/* Mobile Menu Button (admin-header style) */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className={combine(iconButtonClasses, "lg:hidden")}
              aria-label="Toggle menu"
            >
              <FaBars className="w-5 h-5" />
            </button>
          )}

          {/* TIME & ATTENDANCE */}
          {/* <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={timeCardClasses}
          >
            <FaClock className={combine(
              get('accent', 'primary')
            )} />
            <div>
              <div className="text-sm font-medium">Live Time</div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>{time}</div>
            </div>
            <button
              onClick={handleMarkAttendanceClick}
              disabled={attendanceMarked}
              className={combine(
                "ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                attendanceMarked
                  ? combine(
                      "bg-[var(--color-status-success)]/20",
                      "text-[var(--color-status-success)]",
                      "cursor-not-allowed"
                    )
                  : combine(
                      "bg-[var(--color-accent-primary)]",
                      "hover:bg-[var(--color-accent-primary-dark)]",
                      "text-white"
                    )
              )}
            >
              {attendanceMarked ? '✓ Marked' : 'Mark Attendance'}
            </button>
          </motion.div> */}

          {/* SEARCH */}
          <div className="relative flex-1 lg:flex-none">
            <FaSearch className={combine(
              "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
              get('icon', 'secondary')
            )} />
            <input
              type="text"
              className={searchInputClasses}
              placeholder="Search..."
              style={searchInputStyles}
            />
          </div>
        </div>

        {/* RIGHT SIDE - ICONS */}
        <div className="flex items-center space-x-2 lg:space-x-3">

          {/* THEME TOGGLE */}
          <motion.button 
            onClick={handleThemeToggle} 
            whileTap={{ scale: 0.95 }}
            className={iconButtonClasses}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'dark' ? (
              <FaSun className="w-4 h-4 text-yellow-400" />
            ) : (
              <FaMoon className="w-4 h-4" />
            )}
          </motion.button>

          {/* HELP */}
          <button 
            onClick={() => router.push('/staff/settings/help')}
            className={combine(iconButtonClasses, "hidden lg:flex")}
            title="Help & Support"
          >
            <FaQuestionCircle className="w-4 h-4" />
          </button>

          {/* SETTINGS */}
          <button 
            onClick={() => router.push('/staff/settings')}
            className={iconButtonClasses}
            title="Settings"
          >
            <FaCog className="w-4 h-4" />
          </button>

          {/* NOTIFICATIONS */}
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className={combine(iconButtonClasses, "relative")}
              title="Notifications"
            >
              <FaBell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className={badgeClasses}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className={notificationDropdownClasses}
                >
                  <div className={combine("p-4 border-b", get('border', 'primary'))}>
                    <div className="flex justify-between items-center">
                      <h3 className={combine("font-semibold", get('text', 'primary'))}>
                        Notifications
                      </h3>
                      <button 
                        onClick={handleMarkAllAsRead}
                        className={combine(
                          "text-sm",
                          get('accent', 'primary'),
                          "hover:opacity-80"
                        )}
                      >
                        Mark all as read
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={combine(
                            "p-4 border-b cursor-pointer transition-all duration-150",
                            get('border', 'primary'),
                            "hover:bg-[var(--color-bg-hover)]",
                            notification.unread ? "bg-[var(--color-bg-secondary)]" : ""
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-xl">{notification.icon}</div>
                            <div className="flex-1">
                              <p className={combine(
                                "font-medium text-sm",
                                get('text', 'primary')
                              )}>
                                {notification.title}
                              </p>
                              <p className={combine(
                                "text-xs mt-1",
                                get('text', 'tertiary')
                              )}>
                                {notification.time}
                              </p>
                            </div>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-[var(--color-accent-primary)] rounded-full"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <p className={combine(get('text', 'tertiary'))}>
                          No notifications
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className={combine("p-3 border-t", get('border', 'primary'))}>
                    <button 
                      onClick={handleViewAnnouncements}
                      className={combine(
                        "w-full text-center text-sm",
                        get('accent', 'primary'),
                        "hover:opacity-80"
                      )}
                    >
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* PROFILE */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className={combine(
                "flex items-center gap-2 p-1 rounded-lg transition-colors",
                get('bg', 'hover'),
                "hover:text-[var(--color-text-primary)]"
              )}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white rounded-full flex items-center justify-center font-bold">
                {staffInitials}
              </div>
              <FaCaretDown className={get('icon', 'primary')} />
            </button>

            {/* PROFILE DROPDOWN */}
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className={profileDropdownClasses}
                >
                  <div className={combine("p-4 border-b", get('border', 'primary'))}>
                    <p className={combine("font-semibold", get('text', 'primary'))}>
                      {staffName}
                    </p>
                    <p className={combine("text-sm", get('text', 'tertiary'))}>
                      {roleDisplay}
                    </p>
                    {profileData?.staff_id && (
                      <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                        ID: {profileData.staff_id}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 bg-[var(--color-status-success)] rounded-full"></div>
                      <span className={combine(
                        "text-xs",
                        "text-[var(--color-status-success)]"
                      )}>
                        Online
                      </span>
                    </div>
                  </div>

                  <div className="p-2">
                    <button 
                      onClick={handleViewProfile}
                      className={combine(
                        "w-full text-left px-4 py-2 rounded-lg transition-all duration-150",
                        "flex items-center gap-3 text-sm",
                        get('text', 'secondary'),
                        "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <FaUserCircle />
                      My Profile
                    </button>
                    
                    <button 
                      onClick={() => router.push('/staff/settings')}
                      className={combine(
                        "w-full text-left px-4 py-2 rounded-lg transition-all duration-150 mt-1",
                        "flex items-center gap-3 text-sm",
                        get('text', 'secondary'),
                        "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <FaCog />
                      Settings
                    </button>
                    
                    <button 
                      onClick={() => router.push('/staff/settings/help')}
                      className={combine(
                        "w-full text-left px-4 py-2 rounded-lg transition-all duration-150 mt-1",
                        "flex items-center gap-3 text-sm",
                        get('text', 'secondary'),
                        "hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                      )}
                    >
                      <FaQuestionCircle />
                      Help & Support
                    </button>
                  </div>

                  <div className={combine("p-2 border-t", get('border', 'primary'))}>
                    <button
                      onClick={handleSignOut}
                      className={combine(
                        "w-full text-left px-4 py-2 rounded-lg transition-all duration-150",
                        "flex items-center gap-3 text-sm",
                        "text-[var(--color-status-error)]",
                        "hover:bg-[var(--color-status-error)]/10"
                      )}
                    >
                      <FaSignOutAlt />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* QUICK STATS BAR */}
      {/* <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--color-accent-primary)] rounded-full"></div>
            <span className={quickStatClasses}>Pending Tasks:</span>
            <button 
              onClick={handleViewTasks}
              className={combine(
                "font-semibold text-sm",
                get('accent', 'primary'),
                "hover:opacity-80"
              )}
            >
              {pendingTasks} to complete
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[var(--color-status-warning)] rounded-full"></div>
            <span className={quickStatClasses}>Unread Announcements:</span>
            <button 
              onClick={handleViewAnnouncements}
              className={combine(
                "font-semibold text-sm",
                "text-[var(--color-status-warning)]",
                "hover:opacity-80"
              )}
            >
              {unreadAnnouncements} new
            </button>
          </div>
          
          {profileData?.role === 'transport_staff' && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[var(--color-status-success)] rounded-full"></div>
              <span className={quickStatClasses}>Transport Duty:</span>
              <span className={combine(
                "font-semibold text-sm",
                "text-[var(--color-status-success)]"
              )}>
                Active
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleViewTasks}
            className={actionButtonClasses}
          >
            <FaTasks /> View Tasks
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleViewInventory}
            className={combine(
              actionButtonClasses,
              "from-[var(--color-status-success)] to-[var(--color-status-success-dark)]"
            )}
          >
            <FaBox /> Inventory
          </motion.button>
        </div>
      </div> */}
    </header>
  );
};
