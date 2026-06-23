'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { adminApi } from '@/lib/api';
import { clearAllCookies } from '@/lib/auth';
import { useAuth } from '@/contexts/AuthContext';

import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUserTie,
  FaCalendarAlt,
  FaBook,
  FaCalendarCheck,
  FaTasks,
  FaMoneyBillWave,
  FaClipboardCheck,
  FaGraduationCap,
  FaUsers,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChartLine,
  FaCalendarDay,
  FaSchool,
  FaTools,
  FaBullhorn,
  FaUserCheck,
  FaBus,
  FaBoxes,
  FaCalendarMinus,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaHotel,
  FaCog,
  FaUserShield,
} from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { toastSuccess, toastError } from '@/lib/toast';
import { Sparkles } from 'lucide-react';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  link?: string;
  subItems?: {
    label: string;
    link: string;
    icon?: React.ReactNode;
    count?: number;
  }[];
}

interface AdminProfile {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  user_type: string;
  school_name?: string | null;
  institution_name?: string | null;
}

export const Sidebar = ({ collapsed, onToggle, isMobile = false, onCloseMobile }: SidebarProps) => {
  const { get, combine } = useThemeClasses();
  const { user } = useAuth();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const [sidebarCounts, setSidebarCounts] = useState({
    pendingLeaveRequests: 0,
    pendingMarkApprovals: 0,
    liveBuses: 0,
  });
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

  // Responsive sidebar classes
  const sidebarClasses = combine(
  'h-dvh flex flex-col transition-all duration-300 border-r flex-shrink-0',
  get('bg', 'secondary'),
  get('border', 'primary'),
  isMobileLikeView
    ? 'w-64'
    : collapsed ? 'w-15' : 'w-64'
);


  const sidebarHeaderClasses = combine(
    'flex items-center',
    collapsed && !isMobileLikeView ? 'justify-center px-2 py-4' : 'justify-between p-4'
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

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

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

  // Fetch admin profile on mount
  useEffect(() => {
    fetchAdminProfile();
  }, []);

  useEffect(() => {
    fetchSidebarCounts();
  }, []);

const fetchAdminProfile = async () => {
  try {
    const response = await adminApi.profile.get();
    const data = response.data;

    if (data?.data) {
      setAdminProfile(data.data);
    } else if (data?.username) {
      setAdminProfile(data);
    }
  } catch (error: any) {
    console.error('Sidebar profile error:', error);
    toastError('Failed to load profile');
  } finally {
    setLoading(false);
  }
};

  const fetchSidebarCounts = async () => {
    try {
      const response = await adminApi.sidebarCounts.get();
      const data = response.data?.data || {};
      setSidebarCounts({
        pendingLeaveRequests: Number(data.pending_leave_requests || 0),
        pendingMarkApprovals: Number(data.pending_mark_approvals || 0),
        liveBuses: Number(data.live_buses || 0),
      });
    } catch (error) {
      console.error('Sidebar counts error:', error);
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

  // Improved: Check if a menu item is active with exact matching
  const isMenuItemActive = (item: MenuItem): boolean => {
    // For dashboard, only match exact '/admin' path
    if (item.id === 'dashboard' && item.link === '/admin') {
      return pathname === '/admin';
    }
    
    if (item.link) {
      // For other top-level items with links, use exact match
      return pathname === item.link;
    }
    
    // For items with sub-items, check if any sub-item is active
if (item.subItems) {
  return item.subItems.some(subItem => pathname === subItem.link);
}
    
    return false;
  };

  // Check if sub-item is active
  // Check if sub-item is active
const isSubItemActive = (link: string): boolean => {
  return pathname === link; // Remove the startsWith check
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
    if (!adminProfile) return 'Admin User';
    
    const { first_name, last_name, username } = adminProfile;
    if (first_name && last_name) {
      return `${first_name} ${last_name}`;
    }
    if (first_name) {
      return first_name;
    }
    return username || 'Admin User';
  };

  const getAdminRole = () => {
    if (!adminProfile) return 'Super Administrator';
    
    const userType = adminProfile.user_type;
    if (userType === 'super_admin') return adminProfile.institution_name || 'Institution Super Admin';
    if (userType === 'admin') return adminProfile.school_name || 'School Administrator';
    return userType?.replace('_', ' ') || 'Super Administrator';
  };

  const getCountForLink = (link: string): number | null => {
    if (link === '/admin/operations/leave') return sidebarCounts.pendingLeaveRequests;
    if (link === '/admin/academics/examination') return sidebarCounts.pendingMarkApprovals;
    if (link === '/admin/operations/transport/live') return sidebarCounts.liveBuses;
    return null;
  };

  const getParentCount = (item: MenuItem): number | null => {
    if (!item.subItems?.length) return null;
    const counts = item.subItems
      .map((subItem) => getCountForLink(subItem.link))
      .filter((count): count is number => typeof count === 'number');
    if (!counts.length) return null;
    return counts.reduce((sum, value) => sum + value, 0);
  };

  const adminMenuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaTachometerAlt className="w-5 h-5" />,
      link: '/admin'
    },
    {
      id: 'students',
      label: 'Students',
      icon: <FaUserGraduate className="w-5 h-5" />,
      subItems: [
        { label: 'All Students', link: '/admin/students/allstudents', icon: <FaUsers className="w-4 h-4" /> },
        { label: 'Student Roles', link: '/admin/students/roles', icon: <FaUserShield className="w-4 h-4" /> },
        { label: 'Attendance', link: '/admin/students/attendance', icon: <FaUserCheck className="w-4 h-4" /> },
        { label: 'Grades', link: '/admin/students/grades', icon: <FaChartLine className="w-4 h-4" /> }
      ]
    },
    {
      id: 'teachers',
      label: 'Teachers',
      icon: <FaChalkboardTeacher className="w-5 h-5" />,
      subItems: [
        { label: 'All Teachers', link: '/admin/teachers/allteachers', icon: <FaUserTie className="w-4 h-4" /> },
        { label: 'Teacher Roles', link: '/admin/teachers/roles', icon: <FaUserShield className="w-4 h-4" /> },
        { label: 'Attendance', link: '/admin/teachers/attendance', icon: <FaCalendarCheck className="w-4 h-4" /> },
      ]
    },
    {
      id: 'staff',
      label: 'Staff',
      icon: <FaUserTie className="w-5 h-5" />,
      subItems: [
        { 
          label: 'All Staff', 
          link: '/admin/staff/directory', 
          icon: <FaUsers className="w-4 h-4" />,
        },
        {
          label: 'Staff Roles',
          link: '/admin/staff/roles',
          icon: <FaUserShield className="w-4 h-4" />,
        },
        { 
          label: 'Attendance', 
          link: '/admin/staff/attendance', 
          icon: <FaUserCheck className="w-4 h-4" />,
        }
      ]
    },
    {
      id: 'academics',
      label: 'Academics',
      icon: <FaBook className="w-5 h-5" />,
      subItems: [
        { label: 'Promotions', link: '/admin/students/promotion', icon: <Sparkles className="w-4 h-4" /> },
        { label: 'Attendance Config', link: '/admin/academics/attendance', icon: <FaClipboardCheck className="w-4 h-4" /> },
        { label: 'Classes & Sections', link: '/admin/academics/classes', icon: <FaSchool className="w-4 h-4" /> },
        { label: 'Subjects', link: '/admin/academics/subjects', icon: <FaBook className="w-4 h-4" /> },
        { label: 'Allocations', link: '/admin/teachers/allocations', icon: <FaLayerGroup className="w-4 h-4" /> },
        { label: 'Timetable', link: '/admin/academics/timetable', icon: <FaCalendarAlt className="w-4 h-4" /> },
        { label: 'Examinations', link: '/admin/academics/examination', icon: <FaGraduationCap className="w-4 h-4" /> }
      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: <FaTools className="w-5 h-5" />,
      subItems: [
        { label: 'Transport Management', link: '/admin/operations/transport', icon: <FaBus className="w-4 h-4" /> },
        { label: 'Transport Live Tracking', link: '/admin/operations/transport/live', icon: <FaMapMarkerAlt className="w-4 h-4" /> },
        { label: 'Hostel Management', link: '/admin/operations/hostel', icon: <FaHotel className="w-4 h-4" /> },
        { label: 'Staff Work', link: '/admin/staff/work', icon: <FaTasks className="w-4 h-4" /> },
        { label: 'Inventory', link: '/admin/staff/resources', icon: <FaBoxes className="w-4 h-4" /> },
        { label: 'Leave Management', link: '/admin/operations/leave', icon: <FaCalendarMinus className="w-4 h-4" /> },
        { label: 'Holidays', link: '/admin/operations/holidays', icon: <FaCalendarDay className="w-4 h-4" /> }
      ]
    },
    {
      id: 'fees',
      label: 'Fee Operation',
      icon: <FaMoneyBillWave className="w-5 h-5" />,
      subItems: [
        { label: 'Fee Dashboard', link: '/admin/finance/fees', icon: <FaChartLine className="w-4 h-4" /> },
        { label: 'Fees Management', link: '/admin/fees', icon: <FaFileInvoiceDollar className="w-4 h-4" /> },
        { label: 'Fee Reports', link: '/admin/finance/feereports', icon: <FaChartLine className="w-4 h-4" /> }
      ]
    },
    {
      id: 'salary',
      label: 'Salary & Payroll',
      icon: <FaMoneyBillWave className="w-5 h-5" />,
      subItems: [
        { label: 'Salary Dashboard', link: '/admin/salary/dashboard', icon: <FaChartLine className="w-4 h-4" /> },
        { label: 'Salary Management', link: '/admin/salary', icon: <FaFileInvoiceDollar className="w-4 h-4" /> },
      ]
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: <FaBullhorn className="w-5 h-5" />,
      link: '/admin/communications/announcements'
    },
    ...(user?.user_type !== 'super_admin'
      ? [
          {
            id: 'meetings',
            label: 'Meetings',
            icon: <FaCalendarAlt className="w-5 h-5" />,
            link: '/admin/meetings'
          },
          {
            id: 'settings',
            label: 'Settings',
            icon: <FaCog className="w-5 h-5" />,
            link: '/admin/settings'
          }
        ]
      : []),
    ...(user?.user_type === 'super_admin'
      ? [
          {
            id: 'institution',
            label: 'Institution',
            icon: <FaUserShield className="w-5 h-5" />,
            subItems: [
              { label: 'Meetings', link: '/admin/meetings', icon: <FaCalendarAlt className="w-4 h-4" /> },
              { label: 'Settings', link: '/admin/settings', icon: <FaCog className="w-4 h-4" /> },
              { label: 'Schools', link: '/admin/schools', icon: <FaSchool className="w-4 h-4" /> },
              { label: 'School Admins', link: '/admin/admin-creation', icon: <FaUserShield className="w-4 h-4" /> },
            ]
          }
        ]
      : []),
    
  ];

  // Auto-expand parent when child is active
  useEffect(() => {
    adminMenuItems.forEach(item => {
      if (item.subItems && item.subItems.some(subItem => isSubItemActive(subItem.link))) {
        if (!expandedItems.includes(item.id)) {
          setExpandedItems(prev => [...prev, item.id]);
        }
      }
    });
  }, [pathname]);

  return (
    <aside 
      className={sidebarClasses}
      style={{ 
        background: 'var(--color-bg-secondary)',
        height: '100vh' // Ensure full height
      }}
    >
      {/* Sidebar Header */}
      <div className={sidebarHeaderClasses}>
        {(!collapsed || isMobileLikeView) ? (
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm">
              <FaSchool className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className={combine("font-bold text-base", get('text', 'primary'))}>
                Admin Panel
              </h2>
              <p className={combine("text-xs font-medium", versionTextClasses)}>
                School Management
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="group relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-[var(--color-border-primary)] transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <FaSchool className="h-5 w-5 text-blue-600 transition-opacity group-hover:opacity-20 group-focus-visible:opacity-20" aria-hidden="true" />
            <FaChevronRight className="absolute text-sm text-[var(--color-text-primary)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
          </button>
        )}
        {!isMobile && !isCompactScreen && !collapsed && (
          <button
            onClick={onToggle}
            className={toggleButtonClasses}
            aria-label="Collapse sidebar"
          >
            <FaChevronLeft />
          </button>
        )}
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <div className="space-y-1">
          {adminMenuItems.map((item: any) => {
            const isActive = isMenuItemActive(item);
            const hasSubItems: any = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.id);
            const parentCount = getParentCount(item);
            
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
                      <span className="font-medium">{item.label}</span>
                    )}
                    {isActive && !collapsed && !isCompactScreen && (
                      <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    )}
                  </Link>
                ) : (
                  <div>
                    <button
                      onClick={() => {
                        toggleExpand(item.id);
                        if (isMobileLikeView && onCloseMobile && hasSubItems && !isExpanded) {
                          // Keep sidebar open when expanding on mobile
                        } else if (isMobileLikeView && onCloseMobile && hasSubItems && isExpanded) {
                          // Close sidebar when collapsing on mobile
                          onCloseMobile();
                        }
                      }}
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
                          <span className="font-medium">{item.label}</span>
                        )}
                      </div>
                      {(!collapsed || isMobileLikeView) && hasSubItems && (
                        <div className="ml-auto flex items-center gap-2">
                          {typeof parentCount === 'number' && parentCount > 0 && (
                            <span
                              className={combine(
                                "min-w-[22px] px-1.5 py-0.5 rounded-full text-[11px] text-center font-semibold",
                                isActive
                                  ? "bg-[var(--color-accent-primary)] text-white"
                                  : "bg-red-500 text-white"
                              )}
                            >
                              {parentCount}
                            </span>
                          )}
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
                        </div>
                      )}
                      {isActive && !collapsed && !hasSubItems && !isCompactScreen && (
                        <span className="ml-auto w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {(!collapsed || isMobileLikeView) && isExpanded && hasSubItems && (
                      <div className={subMenuContainerClasses}>
                        {item.subItems.map((subItem: any, index: any) => {
                          const isSubActive = isSubItemActive(subItem.link);
                          const badgeCount = getCountForLink(subItem.link);
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
                              {typeof badgeCount === 'number' && badgeCount > 0 && (
                                <span
                                  className={combine(
                                    "ml-auto min-w-[22px] px-1.5 py-0.5 rounded-full text-[11px] text-center font-semibold",
                                    isSubActive
                                      ? "bg-[var(--color-accent-primary)] text-white"
                                      : "bg-red-500 text-white"
                                  )}
                                >
                                  {badgeCount}
                                </span>
                              )}
                              {isSubActive && typeof badgeCount !== 'number' && (
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
                      <span className="font-bold text-white text-[14px]">{getAdminInitials()}</span>
                    </div>
                    <div>
                      <p className={profileTextClasses}>{getAdminName()}</p>
                      <p className={roleTextClasses}>{getAdminRole()}</p>
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
                <span className="font-bold text-white text-[14px]">{getAdminInitials()}</span>
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
