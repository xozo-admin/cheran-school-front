// src/components/dashboard/TeacherSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import {
  FaTachometerAlt,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaUsers,
  FaCalendarAlt,
  FaBook,
  FaFileAlt,
  FaChartBar,
  FaClipboardCheck,
  FaTasks,
  FaBullhorn,
  FaBell,
  FaGraduationCap,
  FaCog,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaChartLine,
  FaFileUpload,
  FaEye,
  FaFolderOpen,
  FaSchool,
  FaUserCircle,
  FaQuestionCircle,
  FaHistory,
  FaClock,
  FaChartPie,
  FaCheckCircle,
  FaBookOpen,
  FaCalendarDay,
  FaCalendarCheck,
  FaUserCheck,
  FaListAlt,
  FaUpload,
  FaChartArea,
  FaCogs,
  FaUserTie,
  FaPercentage,
  FaBus,
  FaBoxes,
  FaMoneyBillAlt,
  FaCalendarTimes,
} from 'react-icons/fa';
import { FiLogOut } from 'react-icons/fi';
import { MdOutlineDashboard, MdOutlineAssignment, MdOutlineClass } from 'react-icons/md';
import { TbReportAnalytics } from 'react-icons/tb';
import { GiNotebook } from 'react-icons/gi';
import { toastLoading, toastUpdateSuccess, toastError } from '@/lib/toast';
import { teacherApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { clearAllCookies } from '@/lib/auth';

interface TeacherSidebarProps {
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

interface TeacherProfile {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  qualification: string;
  department: string;
  address: string;
  user: number;
  assigned_class: string;
  section_name: string;
  class_name: string;
  gender: string;
  blood_group: string;
  joining_date: string;
  emergency_contact: string;
  // Add these for backward compatibility
  username?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  user_type?: string;
}

export const TeacherSidebar = ({
  collapsed,
  onToggle,
  isMobile: _isMobile = false,
  onCloseMobile: _onCloseMobile,
}: TeacherSidebarProps) => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isCompactScreen, setIsCompactScreen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const isMobileLikeView = _isMobile || isCompactScreen;

  useEffect(() => {
    const handleViewport = () => {
      setIsCompactScreen(window.innerWidth < 1024);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  // Theme-aware CSS classes (same as admin sidebar)
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
      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
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
    'text-xs',
    get('text', 'secondary')
  );

  const versionTextClasses = combine(
    'text-xs',
    get('text', 'tertiary')
  );

  // Fetch teacher profile on mount
  useEffect(() => {
    fetchTeacherProfile();
  }, []);

  const fetchTeacherProfile = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token') || localStorage.getItem('token');
      
      if (!token) {
        toastError('No authentication token found');
        handleLogout();
        return;
      }

      const response = await teacherApi.profile.get();
      const data = response.data?.data || response.data;

      if (data) {
        setTeacherProfile(data);
      } else {
        toastError('Failed to load profile');
      }
    } catch (error: any) {
      console.error('Error fetching teacher profile:', error);
      toastError(error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const loadingToastId = toastLoading('Logging out...');
    
    setTimeout(() => {
      console.log('Logging out from teacher sidebar...');
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

  // Check if a menu item is active
  const isMenuItemActive = (item: MenuItem): boolean => {
    if (item.link) {
      if (item.link === '/teacher') {
        return pathname === '/teacher' || pathname === '/teacher/';
      }
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

  const getTeacherInitials = () => {
    if (!teacherProfile) return 'TU';
    
    const { name } = teacherProfile;
    
    if (name) {
      const names = name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return name.charAt(0).toUpperCase();
    }
    
    // Fallback to old structure if available
    if (teacherProfile.first_name && teacherProfile.last_name) {
      return `${teacherProfile.first_name.charAt(0)}${teacherProfile.last_name.charAt(0)}`.toUpperCase();
    }
    
    if (teacherProfile.full_name) {
      const names = teacherProfile.full_name.split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[1].charAt(0)}`.toUpperCase();
      }
      return teacherProfile.full_name.charAt(0).toUpperCase();
    }
    
    return 'TU';
  };

  const getTeacherName = () => {
    if (!teacherProfile) return 'Teacher User';
    
    // Use the new structure first
    if (teacherProfile.name) {
      return teacherProfile.name;
    }
    
    // Fallback to old structure
    if (teacherProfile.first_name && teacherProfile.last_name) {
      return `${teacherProfile.first_name} ${teacherProfile.last_name}`;
    }
    
    if (teacherProfile.full_name) {
      return teacherProfile.full_name;
    }
    
    return teacherProfile.teacher_id || 'Teacher User';
  };

  const getTeacherRole = () => {
    if (!teacherProfile) return 'Teacher';
    
    // Check if teacher has an assigned class
    const hasAssignedClass = teacherProfile.assigned_class && 
      teacherProfile.assigned_class !== "Not Assigned" && 
      teacherProfile.assigned_class !== "";
    
    if (hasAssignedClass) {
      return `Class Teacher - ${teacherProfile.assigned_class}`;
    }
    
    // Subject teacher without class
    return `Subject Teacher - ${teacherProfile.department || 'Teacher'}`;
  };

  // Check if teacher has an assigned class
  const hasAssignedClass = () => {
    if (!teacherProfile) return false;
    
    return teacherProfile.assigned_class && 
      teacherProfile.assigned_class !== "Not Assigned" && 
      teacherProfile.assigned_class !== "" &&
      teacherProfile.assigned_class !== null;
  };

  // Teacher menu items (keeping your original routes)
  // const getTeacherMenuItems = (): MenuItem[] => {
  //   const baseMenuItems: MenuItem[] = [
  //     {
  //       id: 'dashboard',
  //       label: 'Dashboard',
  //       icon: <MdOutlineDashboard className="w-5 h-5" />,
  //       link: '/teacher'
  //     }
  //   ];

  //   // Only add "My Class" menu if teacher has an assigned class
  //   if (hasAssignedClass()) {
  //     baseMenuItems.push({
  //       id: 'class',
  //       label: 'My Class',
  //       icon: <FaChalkboardTeacher className="w-5 h-5" />,
  //       subItems: [
  //         { 
  //           label: 'Attendance', 
  //           link: '/teacher/class/attendance', 
  //           icon: <GiNotebook className="w-4 h-4" /> 
  //         },
  //         { 
  //           label: "My Class Timetable", 
  //           link: '/teacher/timetable/myclass', 
  //           icon: <FaCalendarDay className="w-4 h-4" />
  //         },
  //         { 
  //           label: 'Class Resources', 
  //           link: '/teacher/class/resources', 
  //           icon: <FaFolderOpen className="w-4 h-4" /> 
  //         },
  //         { 
  //           label: 'Performance', 
  //           link: '/teacher/class/performance', 
  //           icon: <FaFolderOpen className="w-4 h-4" /> 
  //         }
  //       ]
  //     });
  //   }

  //   // Add the rest of the menu items
  //   baseMenuItems.push(
  //     {
  //       id: 'subject',
  //       label: 'Subjects Teaching',
  //       icon: <FaBook className="w-5 h-5" />,
  //       subItems: [
  //         { 
  //           label: 'My Subjects', 
  //           link: '/teacher/subject/subjects', 
  //           icon: <FaCalendarAlt className="w-4 h-4" /> 
  //         },
  //        { 
  //           label: 'My Schedule', 
  //           link: '/teacher/timetable/schedule', 
  //           icon: <FaClock className="w-4 h-4" /> 
  //         },
  //         { 
  //           label: "Assignments", 
  //           link: '/teacher/subject/assignments', 
  //           icon: <MdOutlineAssignment className="w-4 h-4" />
  //         },
  //         { 
  //           label: 'Subject Materials', 
  //           link: '/teacher/subject/subjectmaterials', 
  //           icon: <FaHistory className="w-4 h-4" /> 
  //         },
  //         { 
  //           label: 'To-Do Tasks', 
  //           link: '/teacher/subject/todo', 
  //           icon: <FaTasks className="w-4 h-4" /> 
  //         },
  //       ]
  //     },
  //     {
  //       id: 'assesments',
  //       label: 'Assessments',
  //       icon: <FaClipboardCheck className="w-5 h-5" />,
  //       subItems: [
  //         { 
  //           label: 'Exams', 
  //           link: '/teacher/assessment/exam', 
  //           icon: <FaUpload className="w-4 h-4" />
  //         },
  //         { 
  //           label: 'Behaviour', 
  //           link: '/teacher/assessment/behaviour', 
  //           icon: <FaUpload className="w-4 h-4" />
  //         }
  //       ]
  //     },
  //     {
  //       id: 'announcements',
  //       label: 'Announcements',
  //       icon: <FaClipboardCheck className="w-5 h-5" />,
  //       subItems: [
  //         { 
  //           label: "Noticeboard", 
  //           link: '/teacher/communication/noticeboard', 
  //           icon: <FaCalendarDay className="w-4 h-4" />
  //         },
  //         { 
  //           label: 'My Announcemnts', 
  //           link: '/teacher/communication/announcements', 
  //           icon: <FaClock className="w-4 h-4" /> 
  //         },
  //       ]
  //     },
      
  //     {
  //       id: 'settings',
  //       label: 'Settings',
  //       icon: <FaCog className="w-5 h-5" />,
  //       subItems: [
  //         { 
  //           label: 'My Profile', 
  //           link: '/teacher/settings/profile', 
  //           icon: <FaUserCircle className="w-4 h-4" /> 
  //         },
  //         { 
  //           label: 'Help & Support', 
  //           link: '/teacher/settings/help', 
  //           icon: <FaQuestionCircle className="w-4 h-4" /> 
  //         },
  //       ]
  //     }
  //   );

  //   return baseMenuItems;
  // };


  const getTeacherMenuItems = (): MenuItem[] => {

    const baseMenuItems: MenuItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <FaTachometerAlt className="w-5 h-5" />,
        link: '/teacher'
      }
    ];

    // Add the rest of the menu items
    baseMenuItems.push(
      {
          id:'schedule',
            label: 'My Schedule', 
            link: '/teacher/timetable/schedule', 
            icon: <FaClock className="w-4 h-4" /> 
          },
      {
          id:'myattendance',
            label: 'My Attendance', 
            link: '/teacher/attendance', 
            icon: <FaCalendarCheck className="w-4 h-4" /> 
          },
      { 
        id:'Leaves',
        label: 'Leaves', 
        link: '/teacher/leaves', 
        icon: <FaCalendarTimes className="w-4 h-4" /> 
      },
      { 
        id:'Salary',
        label: 'Salary', 
        link: '/teacher/salary', 
        icon: <FaMoneyBillAlt className="w-4 h-4" /> 
      },
      {
        id: 'transport',
        label: 'Transport',
        link: '/teacher/transport',
        icon: <FaBus className="w-4 h-4" />
      },
      {
        id: 'meetings',
        label: 'Meetings',
        link: '/teacher/meetings',
        icon: <FaCalendarAlt className="w-4 h-4" />
      },
        {
          id:'subjects',
            label: 'My Subjects', 
            link: '/teacher/subject/subjects', 
            icon: <FaBookOpen className="w-4 h-4" /> 
          },
          { 
            id:'materials',
            label: 'Subject Materials', 
            link: '/teacher/subject/subjectmaterials', 
            icon: <FaBook className="w-4 h-4" /> 
          },
          { 
            id:'assign',
            label: "Assignments", 
            link: '/teacher/subject/assignments', 
            icon: <FaFileAlt className="w-4 h-4" />
          },
          { 
            id:'tasks',
            label: 'Tasks', 
            link: '/teacher/subject/todo', 
            icon: <FaTasks className="w-4 h-4" /> 
          }
    );

    // Only add "My Class" menu if teacher has an assigned class
    if (hasAssignedClass()) {
      baseMenuItems.push({
        id: 'class',
        label: 'My Class',
        icon: <FaChalkboardTeacher className="w-5 h-5" />,
        subItems: [
          { 
            label: 'Attendance', 
            link: '/teacher/class/attendance', 
            icon: <FaUserCheck className="w-4 h-4" /> 
          },
          { 
            label: "My Class Timetable", 
            link: '/teacher/timetable/myclass', 
            icon: <FaCalendarAlt className="w-4 h-4" />
          },
          { 
            label: 'Class Resources', 
            link: '/teacher/class/resources', 
            icon: <FaFolderOpen className="w-4 h-4" /> 
          },
          { 
            label: 'Performance', 
            link: '/teacher/class/performance', 
            icon: <FaChartLine className="w-4 h-4" /> 
          },
          {
            label: 'Student Leaves',
            link: '/teacher/class/leaves',
            icon: <FaHistory className="w-4 h-4" />
          }
        ]
      });
    }

    baseMenuItems.push(
      {
        id: 'assesments',
        label: 'Assessments',
        icon: <FaChartBar className="w-5 h-5" />,
        subItems: [
          { 
            label: 'Exams', 
            link: '/teacher/assessment/exam', 
            icon: <FaClipboardCheck className="w-4 h-4" />
          },
          { 
            label: 'Class Tests', 
            link: '/teacher/assessment/class-test', 
            icon: <FaListAlt className="w-4 h-4" />
          },
          { 
            label: 'Behaviour', 
            link: '/teacher/assessment/behaviour', 
            icon: <FaChartArea className="w-4 h-4" />
          }
        ]
      },
      {
        id: 'announcements',
        label: 'Announcements',
        icon: <FaBullhorn className="w-5 h-5" />,
        subItems: [
          { 
            label: "Noticeboard", 
            link: '/teacher/communication/noticeboard', 
            icon: <FaBullhorn className="w-4 h-4" />
          },
          { 
            label: 'My Announcemnts', 
            link: '/teacher/communication/announcements', 
            icon: <FaBell className="w-4 h-4" /> 
          },
        ]
      }
      
      // {
      //   id: 'settings',
      //   label: 'Settings',
      //   icon: <FaCog className="w-5 h-5" />,
      //   subItems: [
      //     { 
      //       label: 'My Profile', 
      //       link: '/teacher/settings/profile', 
      //       icon: <FaUserCircle className="w-4 h-4" /> 
      //     },
      //     { 
      //       label: 'Help & Support', 
      //       link: '/teacher/settings/help', 
      //       icon: <FaQuestionCircle className="w-4 h-4" /> 
      //     },
      //   ]
      // }
    );

    return baseMenuItems;
  };

  // Auto-expand parent when child is active
  useEffect(() => {
    const teacherMenuItems = getTeacherMenuItems();
    teacherMenuItems.forEach(item => {
      if (item.subItems && item.subItems.some(subItem => isSubItemActive(subItem.link))) {
        if (!expandedItems.includes(item.id)) {
          setExpandedItems(prev => [...prev, item.id]);
        }
      }
    });
  }, [pathname, teacherProfile]); // Add teacherProfile as dependency

  return (
    <aside 
      className={sidebarClasses}
      style={{ background: 'var(--color-bg-secondary)' }}
    >
      {/* Sidebar Header */}
      <div className={sidebarHeaderClasses}>
        {(!collapsed || isMobileLikeView) ? (
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-2 rounded-lg">
              <FaSchool className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className={combine("font-bold text-lg", get('text', 'primary'))}>
                Teacher Portal
              </h2>
              <p className={versionTextClasses}>
                {hasAssignedClass() ? 'Class Teacher' : 'Subject Teacher'}
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
        {!_isMobile && !isCompactScreen && !collapsed && (
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
          {getTeacherMenuItems().map((item) => {
            const isActive = isMenuItemActive(item);
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems.includes(item.id);
            
            return (
              <div key={item.id} className="mb-1">
                {item.link ? (
                  <Link
                    href={item.link}
                    className={menuItemClasses(isActive)}
                  >
                    <span className={`${isActive ? 'text-white' : combine(
                      get('icon', 'primary'),
                      'group-hover:text-[var(--color-accent-primary)]'
                    )}`}>
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <span className="font-medium">{item.label}</span>
                    )}
                    {isActive && !collapsed && (
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
                          ? 'text-white' 
                          : combine(
                              get('icon', 'primary'),
                              'group-hover:text-[var(--color-accent-primary)]'
                            )
                        }>
                          {item.icon}
                        </span>
                        {!collapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                      </div>
                      {!collapsed && hasSubItems && (
                        <FaChevronDown
                          className={`transition-transform duration-300 ${
                            isExpanded ? 'rotate-180' : ''
                          } ${isActive 
                            ? 'text-white' 
                            : combine(
                                get('icon', 'secondary'),
                                'group-hover:text-[var(--color-accent-primary)]'
                              )
                          }`}
                        />
                      )}
                      {isActive && !collapsed && !hasSubItems && (
                        <span className="ml-auto w-2 h-2 bg-[var(--color-accent-primary)] rounded-full animate-pulse"></span>
                      )}
                    </button>
                    
                    {!collapsed && isExpanded && hasSubItems && (
                      <div className={subMenuContainerClasses}>
                        {item.subItems?.map((subItem, index) => {
                          const isSubActive = isSubItemActive(subItem.link);
                          return (
                            <Link
                              key={index}
                              href={subItem.link}
                              className={subMenuItemClasses(isSubActive)}
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
                              {isSubActive && (
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
        {!collapsed ? (
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
                      <span className="font-bold text-white">{getTeacherInitials()}</span>
                    </div>
                    <div>
                      <p className={profileTextClasses}>{getTeacherName()}</p>
                      <p className={roleTextClasses}>{getTeacherRole()}</p>
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
              <p className={combine("font-medium", versionTextClasses)}>
                School Management System v3.0
              </p>
              <p className={combine("mt-1", versionTextClasses)}>
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
                <span className="font-bold text-white text-sm">{getTeacherInitials()}</span>
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
