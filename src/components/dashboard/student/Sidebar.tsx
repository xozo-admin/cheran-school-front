// components/dashboard/student/Sidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { clearAllCookies } from '@/lib/auth';
import {
  FaCalendarAlt,
  FaClipboardCheck,
  FaFileAlt,
  FaUsers,
  FaBookOpen,
  FaBell,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaTasks,
  FaGraduationCap,
  FaHotel,
} from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { MdOutlineDashboard, MdOutlineAssignment } from 'react-icons/md';
import { TbReportAnalytics } from 'react-icons/tb';
import { HiOutlineAcademicCap } from 'react-icons/hi';
import { toastLoading, toastUpdateSuccess, toastError } from '@/lib/toast';
import { studentApi } from '@/lib/api';

interface StudentSidebarProps {
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
  }[];
}

interface StudentProfile {
  id: number;
  student_id: string;
  student_name: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email: string;
  phone: string;
  date_of_birth: string;
  class_name: string;
  section_name: string;
  roll_number: string;
  gender: string;
  blood_group: string;
  address: string;
  emergency_contact: string;
  admission_date: string;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  user: number;
  username?: string;
  user_type?: string;
}

export const StudentSidebar = ({ collapsed, onToggle, isMobile = false, onCloseMobile }: StudentSidebarProps) => {
  const { get, combine } = useThemeClasses();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [assignmentBadge, setAssignmentBadge] = useState(0);
  const [announcementBadge, setAnnouncementBadge] = useState(0);
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

  // Theme-aware CSS classes (match admin sidebar design)
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
    'min-w-[22px] px-1.5 py-0.5 rounded-full text-[11px] text-center font-semibold',
    'bg-red-500 text-white'
  );

  // Fetch student profile on mount
  useEffect(() => {
    fetchStudentProfile();
    fetchSidebarData();
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

  const handleLinkClick = () => {
    if (isMobile && onCloseMobile) {
      onCloseMobile();
    }
  };

  const fetchStudentProfile = async () => {
    try {
      setLoading(true);
      const response = await studentApi.profile.get();
      const data = response.data?.data || response.data;
      setStudentProfile(data || null);
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      if (error?.response?.status === 401) {
        handleLogout();
        return;
      }
      toastError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchSidebarData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch pending assignments count
      const assignmentsResponse = await studentApi.assignments.feed(today);
      const assignmentsData = assignmentsResponse.data?.data || assignmentsResponse.data || [];
      const assignmentsList = Array.isArray(assignmentsData)
        ? assignmentsData
        : (Array.isArray(assignmentsData?.data) ? assignmentsData.data : []);
      const pending = assignmentsList.filter((a: any) => a.status === 'Pending').length;
      setAssignmentBadge(pending);

      // Fetch announcements count
      const announcementsResponse = await studentApi.announcements.board({ date: today });
      const announcementsData = announcementsResponse.data?.data || announcementsResponse.data || [];
      const announcementCount = Array.isArray(announcementsData)
        ? announcementsData.length
        : (announcementsData?.count || 0);
      setAnnouncementBadge(announcementCount);
    } catch (error) {
      console.error('Error fetching sidebar data:', error);
    }
  };

  const handleLogout = () => {
    const loadingToastId = toastLoading('Logging out...');
    
    setTimeout(() => {
      console.log('Logging out from student sidebar...');
      clearAllCookies();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('user_type');
      localStorage.removeItem('username');
      localStorage.removeItem('login_time');
      localStorage.removeItem('token_expiry');
      
      toastUpdateSuccess(loadingToastId, 'Logged out successfully!');
      
      // Redirect to login page
      setTimeout(() => {
        router.push('/');
      }, 1000);
    }, 500);
  };

  const toggleExpand = (item: string) => {
    setExpandedItems(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const getCountForLink = (link: string) => {
    if (link.includes('/student/academics/assignments')) return assignmentBadge;
    if (link.includes('/student/announcement')) return announcementBadge;
    return undefined;
  };

  const getParentCount = (item: MenuItem) => {
    if (!item.subItems) return undefined;
    const counts = item.subItems
      .map(sub => getCountForLink(sub.link))
      .filter((count): count is number => typeof count === 'number');
    if (counts.length === 0) return undefined;
    return counts.reduce((sum, count) => sum + count, 0);
  };

  // Check if a menu item is active
  const isMenuItemActive = (item: MenuItem): boolean => {
    if (item.link) {
      return pathname === item.link || pathname?.startsWith(item.link + '/');
    }
    
    if (item.subItems) {
      return item.subItems.some(subItem => 
        pathname === subItem.link || pathname?.startsWith(subItem.link + '/')
      );
    }
    
    return false;
  };

  // Check if sub-item is active
  const isSubItemActive = (link: string): boolean => {
    return pathname === link || pathname?.startsWith(link + '/');
  };

  const getStudentInitials = () => {
    if (!studentProfile) return 'SU';
    
    const { student_name } = studentProfile;
    
    if (student_name) {
      const names = student_name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return student_name.charAt(0).toUpperCase();
    }
    
    // Fallback to old structure if available
    if (studentProfile.first_name && studentProfile.last_name) {
      return `${studentProfile.first_name.charAt(0)}${studentProfile.last_name.charAt(0)}`.toUpperCase();
    }
    
    if (studentProfile.full_name) {
      const names = studentProfile.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return studentProfile.full_name.charAt(0).toUpperCase();
    }
    
    return 'SU';
  };

  const getStudentName = () => {
    if (!studentProfile) return 'Student User';
    
    // Use the new structure first
    if (studentProfile.student_name) {
      return studentProfile.student_name;
    }
    
    // Fallback to old structure
    if (studentProfile.first_name && studentProfile.last_name) {
      return `${studentProfile.first_name} ${studentProfile.last_name}`;
    }
    
    if (studentProfile.full_name) {
      return studentProfile.full_name;
    }
    
    return studentProfile.student_id || 'Student User';
  };

  const getStudentClassInfo = () => {
    if (!studentProfile) return 'Student';
    
    const classInfo = studentProfile.class_name ? `Class ${studentProfile.class_name}` : 'Student';
    const sectionInfo = studentProfile.section_name ? ` - ${studentProfile.section_name}` : '';
    const rollInfo = studentProfile.roll_number ? ` (Roll: ${studentProfile.roll_number})` : '';
    
    return `${classInfo}${sectionInfo}${rollInfo}`;
  };

  // Student menu items (keeping your original routes with badges)
  const getStudentMenuItems = (): MenuItem[] => {
    return [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <MdOutlineDashboard className="w-5 h-5 flex-shrink-0" />,
        link: '/student'
      },
      { 
        id: 'timetable',
            label: 'Timetable', 
            link: '/student/academics/timetable', 
            icon: <FaCalendarAlt className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'assignments',
            label: 'Assignments', 
            link: '/student/academics/assignments', 
            icon: <MdOutlineAssignment className="w-4 h-4 flex-shrink-0" />
          },
          { 
            id: 'study',
            label: 'Study Materials', 
            link: '/student/academics/materials', 
            icon: <FaBookOpen className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'tasks',
            label: 'Tasks', 
            link: '/student/academics/tasks', 
            icon: <FaTasks className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'exams',
            label: 'Exam Results', 
            link: '/student/performance/exams', 
            icon: <HiOutlineAcademicCap className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'class-tests',
            label: 'Class Tests', 
            link: '/student/performance/class-test', 
            icon: <FaClipboardCheck className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'attendance',
            label: 'Attendance', 
            link: '/student/performance/attendance', 
            icon: <FaClipboardCheck className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'behaviour',
            label: 'Behavior Reports', 
            link: '/student/performance/behaviour', 
            icon: <TbReportAnalytics className="w-4 h-4 flex-shrink-0" /> 
          },
          { 
            id: 'leaves',
            label: 'Leaves', 
            link: '/student/leaves', 
            icon: <TbReportAnalytics className="w-4 h-4 flex-shrink-0" /> 
          },
      {
        id: 'announcements',
        label: 'Announcements',
        icon: <FaBell className="w-5 h-5 flex-shrink-0" />,
        link: '/student/announcement'
      },
      {
        id: 'meetings',
        label: 'Meetings',
        icon: <FaCalendarAlt className="w-5 h-5 flex-shrink-0" />,
        link: '/student/meetings'
      },
      {
        id: 'fees',
        label: 'Fees & Payments',
        icon: <FaFileAlt className="w-5 h-5 flex-shrink-0" />,
        link: '/student/fees'
      },
      {
        id: 'transport',
        label: 'Transport',
        icon: <FaUsers className="w-5 h-5 flex-shrink-0" />,
        link: '/student/transport'
      },
      {
        id: 'hostel',
        label: 'Hostel',
        icon: <FaHotel className="w-5 h-5 flex-shrink-0" />,
        link: '/student/hostel'
      }
    ];
  };

  // Auto-expand parent when child is active
  useEffect(() => {
    const studentMenuItems = getStudentMenuItems();
    studentMenuItems.forEach(item => {
      if (item.subItems && item.subItems.some(subItem => isSubItemActive(subItem.link))) {
        if (!expandedItems.includes(item.id)) {
          setExpandedItems(prev => [...prev, item.id]);
        }
      }
    });
  }, [pathname, studentProfile]);

  return (
    <aside 
      className={sidebarClasses}
      style={{ 
        background: 'var(--color-bg-secondary)',
        height: '100vh'
      }}
      aria-label="Student Navigation Sidebar"
    >
      {/* Sidebar Header */}
      <div className={sidebarHeaderClasses}>
        {(!collapsed || isMobileLikeView) && (
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
              <FaGraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={combine("font-bold text-base", get('text', 'primary'))}>
                Student Portal
              </h2>
              <p className={combine("text-xs font-medium", versionTextClasses)}>
                School Management
              </p>
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
          {getStudentMenuItems().map((item) => {
            const isActive = isMenuItemActive(item);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.id);
            const parentCount = getParentCount(item);
            
            return (
              <div key={item.id} className="mb-1">
                {item.link ? (
                  <Link
                    href={item.link}
                    className={menuItemClasses(isActive)}
                    aria-current={isActive ? 'page' : undefined}
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
                          onCloseMobile();
                        }
                      }}
                      className={expandButtonClasses(isActive)}
                      aria-expanded={isExpanded}
                      aria-controls={`submenu-${item.id}`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
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
                            <span className={badgeClasses}>
                              {parentCount}
                            </span>
                          )}
                          <FaChevronDown
                            className={`transition-transform duration-300 flex-shrink-0 ${
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
                      <div 
                        id={`submenu-${item.id}`}
                        className={subMenuContainerClasses}
                        role="region"
                        aria-label={`${item.label} submenu`}
                      >
                        {item.subItems?.map((subItem, index) => {
                          const isSubActive = isSubItemActive(subItem.link);
                          const subBadge = getCountForLink(subItem.link);
                          
                          return (
                            <Link
                              key={index}
                              href={subItem.link}
                              className={subMenuItemClasses(isSubActive)}
                              aria-current={isSubActive ? 'page' : undefined}
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
                              {typeof subBadge === 'number' && subBadge > 0 && (
                                <span className={badgeClasses}>
                                  {subBadge}
                                </span>
                              )}
                              {isSubActive && typeof subBadge !== 'number' && (
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
                      "w-8 h-8 rounded-full animate-pulse flex-shrink-0",
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
                      <span className="font-bold text-white text-[14px]">{getStudentInitials()}</span>
                    </div>
                    <div>
                      <p className={profileTextClasses}>{getStudentName()}</p>
                      <p className={roleTextClasses}>{getStudentClassInfo()}</p>
                    </div>
                  </>
                )}
              </div>
              <button 
                onClick={handleLogout}
                className={profileLogoutButtonClasses}
                title="Logout"
                disabled={loading}
                aria-label="Logout"
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
                <span className="font-bold text-white text-[14px]">{getStudentInitials()}</span>
              </div>
            )}
            <button 
              onClick={handleLogout}
              className={profileLogoutButtonClasses}
              title="Logout"
              disabled={loading}
              aria-label="Logout"
            >
              <FiLogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
