// components/dashboard/staff/sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { clearAllCookies } from '@/lib/auth';
import {
  FaTasks,
  FaCalendarCheck,
  FaClipboardCheck,
  FaMoneyBill,
  FaTruck,
  FaBox,
  FaBullhorn,
  FaCalendarDay,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaUserCircle,
  FaQuestionCircle,
  FaHistory,
  FaFileAlt,
  FaChartLine,
  FaHome,
  FaSchool,
  FaUserTie,
  FaUsers,
  FaBell,
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaUserShield,
  FaTools,
  FaInbox,
  FaMedal,
  FaChartArea,
  FaCogs,
  FaUserCheck,
  FaUserEdit,
  FaPercentage,
  FaBus,
  FaBoxes,
  FaCalendarMinus,
  FaUserPlus,
  FaUsersCog,
  FaLayerGroup,
  FaMoneyCheckAlt,
  FaCashRegister,
  FaSignOutAlt,
  FaTachometerAlt,
  FaHotel,
} from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { toastSuccess, toastError } from '@/lib/toast';
import { staffApi } from '@/lib/api';
import {
  canAccessAcademicsOps,
  canAccessFinanceOps,
  canAccessHostelOps,
  formatStaffRoleLabel,
  isTransportStaffRole,
  resolveStaffRole,
} from '@/lib/staff-access';

/* ---------------- TYPES ---------------- */

interface StaffSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  profileData?: any;
  pendingTasks?: number;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  link?: string;
  badge?: number | string;
  subItems?: {
    label: string;
    link: string;
    icon?: React.ReactNode;
    badge?: number;
  }[];
}

interface StaffProfile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  role?: string;
  staff_role?: string;
  staff_id?: string;
}

/* ---------------- COMPONENT ---------------- */

export const StaffSidebar = ({
  collapsed,
  onToggle,
  profileData,
  pendingTasks = 0,
  isMobile = false,
  onCloseMobile,
}: StaffSidebarProps) => {
  const { get, combine } = useThemeClasses();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [storedStaffRole, setStoredStaffRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isMobileLikeView = isMobile || isCompactScreen;

  useEffect(() => {
    const handleViewport = () => {
      setIsCompactScreen(window.innerWidth < 1024);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  // Theme-aware CSS classes
  const sidebarClasses = combine(
    'h-dvh flex flex-col transition-all duration-300 border-r flex-shrink-0',
    get('bg', 'secondary'),
    get('border', 'primary'),
    isMobileLikeView ? 'w-64' : collapsed ? 'w-15' : 'w-64'
  );

  const sidebarHeaderClasses = combine(
    'p-4 flex items-center justify-between'
  );

  const toggleButtonClasses = combine(
    'p-2 rounded-lg transition-colors',
    'text-sm',
    get('text', 'secondary'),
    get('bg', 'hover'),
    'hover:text-[var(--color-text-primary)]'
  );

  const menuItemClasses = (isActive: boolean) => combine(
    'flex items-center space-x-3 p-3 rounded-lg transition-all group',
    'text-sm font-medium',
    isActive 
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
      : combine(
          get('text', 'secondary'),
          get('bg', 'hover'),
          'hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)]'
        )
  );

  const expandButtonClasses = (isActive: boolean) => combine(
    'flex items-center justify-between w-full p-3 rounded-lg transition-all group',
    'text-sm font-medium',
    isActive 
      ? combine(
          get('bg', 'hover'),
          'text-[var(--color-accent-primary)] font-semibold'
        ) 
      : combine(
          get('text', 'secondary'),
          get('bg', 'hover'),
          'hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)]'
        )
  );

  const subMenuContainerClasses = combine(
    'ml-4 mt-1 space-y-1 border-l pl-2',
    get('border', 'primary')
  );

  const subMenuItemClasses = (isActive: boolean) => combine(
    'flex items-center space-x-2 p-2 rounded transition-all duration-200 group',
    'text-sm font-medium',
    isActive 
      ? combine(
          'text-[var(--color-accent-primary)] font-semibold',
          'bg-[var(--color-bg-hover)]',
          'border-l-2 border-[var(--color-accent-primary)] pl-3'
        ) 
      : combine(
          get('text', 'secondary'),
          'hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-hover)] pl-4'
        )
  );

  const sidebarFooterClasses = combine(
    'p-4 border-t',
    get('border', 'primary')
  );

  const profileLogoutButtonClasses = combine(
    'p-2 rounded-lg transition-colors group',
    get('bg', 'hover'),
    get('text', 'secondary'),
    'hover:text-[var(--color-accent-primary)]'
  );

  const profileTextClasses = combine(
    'text-sm font-semibold',
    get('text', 'primary')
  );

  const roleTextClasses = combine(
    'text-xs font-medium',
    get('text', 'secondary')
  );

  const versionTextClasses = combine(
    'text-xs',
    get('text', 'tertiary')
  );

  const badgeClasses = combine(
    'text-xs px-2 py-1 rounded-full min-w-6 text-center',
    'bg-red-500 text-white'
  );

  /* ---------------- EFFECTS ---------------- */

  // Fetch staff profile on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setStoredStaffRole(localStorage.getItem('staff_role') || '');
    }
    fetchStaffProfile();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobile && onCloseMobile) {
        onCloseMobile();
      }
    };

    if (isMobile) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isMobile, onCloseMobile]);

  // Auto-expand parent when child is active
  useEffect(() => {
    staffMenuItems.forEach(item => {
      if (item.subItems && item.subItems.some(subItem => isSubItemActive(subItem.link))) {
        if (!expandedItems.includes(item.id)) {
          setExpandedItems(prev => [...prev, item.id]);
        }
      }
    });
  }, [pathname]);

  /* ---------------- FUNCTIONS ---------------- */

  const fetchStaffProfile = async () => {
    setLoading(true);
    try {
      // If profileData is passed as prop, use it
      if (profileData) {
        console.log('Using provided profile data:', profileData);
        const roleFromStorage =
          typeof window !== 'undefined' ? localStorage.getItem('staff_role') : null;
        setStaffProfile({
          ...profileData,
          role: profileData.role || profileData.staff_role || roleFromStorage || undefined,
          staff_role: profileData.staff_role || profileData.role || roleFromStorage || undefined,
        });
        return;
      }

      // Otherwise fetch from API
      const response = await staffApi.profile.get();
      const data = response.data?.data || response.data;
        console.log('Staff Profile API Data Received:', data);
        
        
      setStaffProfile(data);


    } catch (error: any) {
      if (error?.response?.status === 401) {
        toastError('Session expired. Please login again.');
        handleLogout();
        return;
      }
      console.error('Error fetching staff profile:', error);
      toastError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAllCookies();

    toastSuccess('Logged out successfully!');

    setTimeout(() => {
      router.push('/');
    }, 800);
  };

  const toggleExpand = (item: string) => {
    setExpandedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  // Check if a menu item is active
  const isMenuItemActive = (item: MenuItem): boolean => {
    // For dashboard, only match exact '/staff' path
    if (item.id === 'dashboard' && item.link === '/staff') {
      return pathname === '/staff';
    }

    if (item.link) {
      // Match top-level links exactly like admin sidebar
      return pathname === item.link;
    }
    
    if (item.subItems) {
      return item.subItems.some(subItem => pathname === subItem.link);
    }
    
    return false;
  };

  // Check if sub-item is active
  const isSubItemActive = (link: string): boolean => {
    return pathname === link;
  };

  const getStaffInitials = () => {
    if (!staffProfile) return 'SU';
    
    const { first_name, last_name, username } = staffProfile;
    if (first_name && last_name) {
      return `${first_name.charAt(0)}${last_name.charAt(0)}`.toUpperCase();
    }
    if (first_name) {
      return first_name.charAt(0).toUpperCase();
    }
    if (username) {
      return username.charAt(0).toUpperCase();
    }
    return 'SU';
  };

  const getStaffName = () => {
    if (!staffProfile) return 'Staff User';
    
    const { first_name, last_name, username } = staffProfile;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (first_name) {
      return first_name;
    }
    return username || 'Staff User';
  };

  const getStaffRole = () => {
    if (!staffProfile) return 'Staff Member';
    return formatStaffRoleLabel(resolveStaffRole(staffProfile, storedStaffRole));
  };

  const getStaffId = () => {
    return staffProfile?.staff_id || 'N/A';
  };

  const resolvedRole = resolveStaffRole(staffProfile, storedStaffRole);
  const hasFinanceOpsAccess = canAccessFinanceOps(resolvedRole);
  const hasHostelAccess = canAccessHostelOps(resolvedRole);
  const hasAcademicsOpsAccess = canAccessAcademicsOps(resolvedRole);
  const isTransportStaff = isTransportStaffRole(resolvedRole);

  /* ---------------- STAFF MENU ITEMS ---------------- */

  const staffMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaTachometerAlt className="w-5 h-5" />,
      link: '/staff'
    },
    ...(
      hasAcademicsOpsAccess
      ? [{
          id: 'academics',
          label: 'Academics',
          icon: <FaSchool className="w-5 h-5" />,
          subItems: [
            {
              label: 'Classes',
              link: '/staff/academics/classes',
              icon: <FaUsers className="w-4 h-4" />
            },
            {
              label: 'Subjects',
              link: '/staff/academics/subjects',
              icon: <FaLayerGroup className="w-4 h-4" />
            },
            {
              label: 'Timetable',
              link: '/staff/academics/timetable',
              icon: <FaCalendarAlt className="w-4 h-4" />
            },
            {
              label: 'Attendance',
              link: '/staff/academics/attendance',
              icon: <FaClipboardCheck className="w-4 h-4" />
            },
            {
              label: 'Examination',
              link: '/staff/academics/examination',
              icon: <FaFileInvoiceDollar className="w-4 h-4" />
            },
          ]
        }]
      : []),
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <FaClipboardCheck className="w-5 h-5" />,
      link: '/staff/attendance'
    },
    {
      id: 'tasks',
      label: 'Tasks',
      icon: <FaTasks className="w-5 h-5" />,
      link: '/staff/tasks',
      badge: pendingTasks
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: <FaBoxes className="w-5 h-5" />,
      link: '/staff/inventory'
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <FaBullhorn className="w-5 h-5" />,
      link: '/staff/announcements'
    },
    {
      id: 'meetings',
      label: 'Meetings',
      icon: <FaCalendarAlt className="w-5 h-5" />,
      link: '/staff/meetings'
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: <FaTools className="w-5 h-5" />,
      subItems: [
        {
          label: 'Leaves',
          link: '/staff/leaves',
          icon: <FaCalendarMinus className="w-4 h-4" />
        },
        ...(hasHostelAccess
          ? [
              {
                label: 'Hostel',
                link: '/staff/hostel',
                icon: <FaHotel className="w-4 h-4" />
              },
            ]
          : []),
        {
          label: isTransportStaff ? 'Transport Operations' : 'Transport',
          link: '/staff/transport',
          icon: <FaBus className="w-4 h-4" />
        },
      ]
    },
    {
      id: 'salary',
      label: 'Salary',
      icon: <FaMoneyCheckAlt className="w-5 h-5" />,
      link: '/staff/salary'
    },
    // Finance operations for Admin Staff and Finance Staff
    ...(
      hasFinanceOpsAccess
      ? [{
          id: 'finance-ops',
          label: 'Finance Operations',
          icon: <FaCashRegister className="w-5 h-5" />,
          subItems: [
            {
              label: 'Fees Management',
              link: '/staff/fees',
              icon: <FaMoneyBillWave className="w-4 h-4" />
            },
            {
              label: 'Fee Reports',
              link: '/staff/finance/feereports',
              icon: <FaChartLine className="w-4 h-4" />
            },
            {
              label: 'Salary Operations',
              link: '/staff/finance/salary',
              icon: <FaMoneyCheckAlt className="w-4 h-4" />
            },
            
          ]
        }]
      : []),
  ];

  /* ---------------- RENDER ---------------- */

  return (
    <aside 
      className={`${sidebarClasses} flex flex-col`}
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* Sidebar Header */}
      <div className={sidebarHeaderClasses}>
        {(!collapsed || isMobileLikeView) && (
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
              <FaUserTie className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={combine("font-bold text-base", get('text', 'primary'))}>
                Staff Portal
              </h2>
              <p className={combine("text-xs font-medium", versionTextClasses)}>School Management</p>
            </div>
          </div>
        )}
        {!isMobile && !isCompactScreen && (
          <button
            onClick={onToggle}
            className={toggleButtonClasses}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {staffMenuItems.map((item: any) => {
            const isActive = isMenuItemActive(item);
            const hasSubItems: any = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.id);
            
            return (
              <div key={item.id} className="mb-1">
                {item.link ? (
                  <Link
                    href={item.link}
                    className={menuItemClasses(isActive)}
                    onClick={handleLinkClick}
                  >
                    <span className={`${isActive ? 'text-white' : combine(
                      get('icon', 'primary'),
                      'group-hover:text-[var(--color-accent-primary)]'
                    )}`}>
                      {item.icon}
                    </span>
                    {(!collapsed || isMobileLikeView) && (
                      <>
                        <span className="font-medium flex-1">{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className={badgeClasses}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                    {isActive && !collapsed && !isCompactScreen && !item.badge && (
                      <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    )}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className={expandButtonClasses(isActive)}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={isActive 
                          ? 'text-[var(--color-accent-primary)]' 
                          : combine(
                              get('icon', 'primary'),
                              'group-hover:text-[var(--color-accent-primary)]'
                            )
                        }>
                          {item.icon}
                        </span>
                        {(!collapsed || isMobileLikeView) && (
                          <span className="font-medium flex-1">{item.label}</span>
                        )}
                      </div>
                      {(!collapsed || isMobileLikeView) && hasSubItems && (
                        <FaChevronDown
                          className={`transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          } ${isActive 
                            ? 'text-[var(--color-accent-primary)]' 
                            : combine(
                                get('icon', 'secondary'),
                                'group-hover:text-[var(--color-accent-primary)]'
                              )
                          }`}
                        />
                      )}
                      {isActive && !collapsed && !isCompactScreen && !hasSubItems && (
                        <span className="ml-auto w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {(!collapsed || isMobileLikeView) && isExpanded && hasSubItems && (
                      <div className={subMenuContainerClasses}>
                        {item.subItems.map((subItem: any, index: any) => {
                          const isSubActive = isSubItemActive(subItem.link);
                          return (
                            <Link
                              key={index}
                              href={subItem.link}
                              className={subMenuItemClasses(isSubActive)}
                              onClick={handleLinkClick}
                            >
                              {subItem.icon && (
                                <span className={isSubActive 
                                  ? 'text-[var(--color-accent-primary)]' 
                                  : combine(
                                      get('icon', 'secondary'),
                                      'group-hover:text-[var(--color-accent-primary)]'
                                    )
                                }>
                                  {subItem.icon}
                                </span>
                              )}
                              <span>{subItem.label}</span>
                              {subItem.badge && subItem.badge > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                  {subItem.badge}
                                </span>
                              )}
                              {isSubActive && !subItem.badge && (
                                <span className="ml-auto w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse"></span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer with Profile */}
      <div className={sidebarFooterClasses}>
        {(!collapsed || isMobileLikeView) ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {loading ? (
                  <>
                    <div className={combine(
                      "w-8 h-8 rounded-full animate-pulse",
                      get('bg', 'tertiary')
                    )}></div>
                    <div>
                      <div className={combine(
                        "h-3 w-20 rounded animate-pulse mb-1",
                        get('bg', 'tertiary')
                      )}></div>
                      <div className={combine(
                        "h-2 w-16 rounded animate-pulse",
                        get('bg', 'tertiary')
                      )}></div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                      <span className="font-bold text-white text-[14px]">{getStaffInitials()}</span>
                    </div>
                    <div>
                      <p className={profileTextClasses}>{getStaffName()}</p>
                      <p className={roleTextClasses}>{getStaffRole()}</p>
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className={profileLogoutButtonClasses}
                title="Logout"
                disabled={loading}
              >
                <FiLogOut className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center">
              <p className={combine("font-medium text-xs", versionTextClasses)}>
                School Management System v3.0
              </p>
              <p className={combine("mt-1 text-xs", versionTextClasses)}>
                © {new Date().getFullYear()} All rights reserved
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            {loading ? (
              <div className={combine(
                "w-8 h-8 rounded-full animate-pulse",
                get('bg', 'tertiary')
              )}></div>
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-md">
                <span className="font-bold text-white text-[14px]">{getStaffInitials()}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className={profileLogoutButtonClasses}
              title="Logout"
              disabled={loading}
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
