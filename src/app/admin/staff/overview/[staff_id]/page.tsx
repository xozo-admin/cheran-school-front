// src/app/admin/staff/overview/[staff_id]/page.tsx
'use client';

import { adminApi, backend_api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaUserTie,
  FaArrowLeft,
  FaChartLine,
  FaCalendarCheck,
  FaClipboardList,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaClock,
  FaChartBar,
  FaHistory,
  FaInfoCircle,
  FaPrint,
  FaDownload,
  FaIdCard,
  FaExclamationTriangle,
  FaLock,
  FaDatabase,
  FaPlug,
  FaBuilding,
  FaBriefcase,
  FaUserClock,
  FaUserCheck,
  FaUserTimes,
  FaBus,
  FaRoute,
  FaBoxes,
  FaTruck,
  FaUsers,
  FaClipboardCheck,
  FaRegClock,
  FaRegCalendarAlt,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaAward,
  FaMedal,
  FaStar,
  FaCertificate,
  FaChevronDown,
  FaSortAmountDown,
  FaSortAmountUp,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaSpinner,
} from 'react-icons/fa';
import { MdOutlineFamilyRestroom, MdWarning, MdEmail, MdLocationOn, MdBloodtype, MdLocalHospital } from 'react-icons/md';
import { FiTrendingUp, FiTrendingDown, FiUser, FiAlertCircle, FiHeart } from 'react-icons/fi';
import { GiRank3, GiAchievement, GiGraduateCap, GiNotebook, GiTeacher, GiSchoolBag, GiStarsStack } from 'react-icons/gi';
import { BsGraphUp, BsGraphDown, BsCalendarCheck, BsCalendarX, BsBarChartFill, BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { School } from 'lucide-react';

// Types based on API responses
interface ApiErrorResponse {
  error: string;
  message?: string;
  detail?: string;
}

interface StaffOverviewData {
  status?: number;
  message?: string;
  timestamp?: string;
  data: {
    current_academic_year: string | null;
    empty_state?: {
      has_reports: boolean;
      message: string | null;
    };
    personal_details: {
      staff_id: string;
      name: string;
      phone: string;
      email: string;
      role: string;
      role_display: string;
      joining_date: string | null;
      address: string;
      profile_image?: string | null;
      bank_account_number?: string | null;
      ifsc_code?: string | null;
      account_holder_name?: string | null;
      bank_name?: string | null;
      upi_id?: string | null;
      transport_role_flags?: {
        is_transport_staff: boolean;
        is_bus_driver: boolean;
        assignment_mode: string | null;
      };
      extra_details?: {
        emergency_contact?: string;
        department?: string;
        date_of_birth?: string;
        gender?: string;
        salary_grade?: string;
        qualification?: string;
        license_number?: string;
        license_expiry?: string;
        specialization?: string;
        blood_group?: string;
        medical_conditions?: string;
        [key: string]: any;
      };
    };
    full_staff_details?: {
      staff_id?: string;
      name?: string;
      phone?: string;
      email?: string;
      role?: string;
      role_display?: string;
      joining_date?: string | null;
      address?: string;
      profile_image?: string | null;
      bank_details?: {
        account_holder_name?: string | null;
        bank_name?: string | null;
        bank_account_number?: string | null;
        ifsc_code?: string | null;
        upi_id?: string | null;
      };
      user_account?: {
        linked_user_id?: number | null;
        username?: string | null;
        is_active?: boolean | null;
      };
      role_access?: {
        role?: string;
        role_display?: string;
        is_transport_staff?: boolean;
        is_bus_driver?: boolean;
        assignment_mode?: string | null;
      };
      extra_details?: Record<string, any>;
    };
    today_snapshot?: {
      date: string;
      today_attendance_status?: string;
      attendance: {
        status: string;
        check_in_time: string | null;
      };
      transport?: {
        is_allocated: boolean;
        assignment_mode: string | null;
        is_driver_assigned: boolean;
        allocation_id: number | null;
        user_type: string | null;
        allocated_at: string | null;
        bus_number: string | null;
        registration_number: string | null;
        capacity: number | null;
        stop?: {
          stop_id: number | null;
          stop_name: string | null;
        };
        driver: {
          staff_id: string | null;
          name: string | null;
        };
        route: {
          start_location: string | null;
          end_location: string | null;
          is_active: boolean;
          last_updated: string | null;
        };
        note: string;
      };
      role_insights?: {
        role: string;
        role_display: string;
        is_transport_staff: boolean;
      };
      works: {
        total: number;
        pending: number;
        completed: number;
        list: Array<{
          assignment_id: number;
          description: string;
          status: string;
          is_recurring?: boolean;
          created_date: string;
          completed_at: string | null;
          proof_uploaded?: boolean;
        }>;
      };
      inventory: {
        total_logs: number;
        logs: Array<{
          log_id: number;
          item_name: string;
          action: string;
          quantity_changed: number;
          timestamp: string;
        }>;
      };
    };
    transport_details?: {
      is_allocated: boolean;
      assignment_mode: string | null;
      is_driver_assigned: boolean;
      allocation_id: number | null;
      user_type: string | null;
      allocated_at: string | null;
      bus_number: string | null;
      registration_number: string | null;
      capacity: number | null;
      stop?: {
        stop_id: number | null;
        stop_name: string | null;
      };
      driver: {
        staff_id: string | null;
        name: string | null;
      };
      route: {
        start_location: string | null;
        end_location: string | null;
        is_active: boolean;
        last_updated: string | null;
      };
      note: string;
    };
    academic_year_reports: Array<{
      academic_year: string;
      is_current: boolean;
      date_range: {
        start_date: string | null;
        end_date: string | null;
      };
      works: {
        total_assignments: number;
        work_status_counts: {
          pending: number;
          completed: number;
        };
        list: Array<any>;
        updates: Array<any>;
      };
      attendance: {
        period: string;
        from_date: string | null;
        to_date: string | null;
        based_on_joining_date: boolean;
        mode: string;
        note: string;
        summary: {
          total_days_marked: number;
          total_days_passed: number;
          actual_working_days: number;
          sundays: number;
          holidays: number;
          holiday_dates: string[];
          present: number;
          late: number;
          absent: number;
          attendance_percentage: number;
        };
      };
      inventory: {
        has_activity: boolean;
        summary: {
          total_logs: number;
          used: number;
          damaged: number;
          restocked: number;
        };
        logs: Array<any>;
      };
      transport?: any;
    }>;
    overall_stats?: {
      overall_score: number;
      overall_status: string;
      status_color: string;
      breakdown: {
        attendance: number;
        work_completion: number;
        inventory_activity: number;
        transport: number;
      };
      areas_needing_attention: string[];
      strengths: string[];
      last_updated: string;
    };
  };
}

// Default empty data structures
const getDefaultStaffData = (): StaffOverviewData['data'] => ({
  current_academic_year: null,
  empty_state: {
    has_reports: false,
    message: null
  },
  personal_details: {
    staff_id: '',
    name: '',
    phone: '',
    email: '',
    role: '',
    role_display: '',
    joining_date: null,
    address: '',
    profile_image: null,
    bank_account_number: null,
    ifsc_code: null,
    account_holder_name: null,
    bank_name: null,
    upi_id: null,
    transport_role_flags: {
      is_transport_staff: false,
      is_bus_driver: false,
      assignment_mode: null
    },
    extra_details: {}
  },
  full_staff_details: {
    profile_image: null,
    bank_details: {
      account_holder_name: null,
      bank_name: null,
      bank_account_number: null,
      ifsc_code: null,
      upi_id: null
    },
    user_account: {
      linked_user_id: null,
      username: null,
      is_active: null
    }
  },
  academic_year_reports: [],
  overall_stats: {
    overall_score: 0,
    overall_status: 'Not Available',
    status_color: 'blue',
    breakdown: {
      attendance: 0,
      work_completion: 0,
      inventory_activity: 0,
      transport: 0
    },
    areas_needing_attention: [],
    strengths: [],
    last_updated: new Date().toISOString().split('T')[0]
  }
});

// Error message mapping
const getErrorMessage = (error: any): { title: string; message: string; icon: any; color: string } => {
  const errorMsg = error?.message || error?.error || error?.detail || 'Unknown error';

  if (errorMsg.includes('staff_id parameter is required')) {
    return {
      title: 'Missing Staff ID',
      message: 'Please provide a valid staff ID to view the overview.',
      icon: <FaIdCard className="text-4xl" />,
      color: 'amber'
    };
  }

  if (errorMsg.includes('No Active Academic Year configured') || errorMsg.includes('Academic Years')) {
    return {
      title: 'Academic Year Not Configured',
      message: 'The current academic year has not been configured in the system. Please contact the administrator.',
      icon: <FaCalendarAlt className="text-4xl" />,
      color: 'orange'
    };
  }

  if (errorMsg.includes('Access Denied') || errorMsg.includes('not authorized') || errorMsg.includes('permission')) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to view this staff member\'s details. Please contact your administrator if you need access.',
      icon: <FaLock className="text-4xl" />,
      color: 'red'
    };
  }

  if (errorMsg.includes('not found') && errorMsg.includes('Staff with ID')) {
    return {
      title: 'Staff Not Found',
      message: errorMsg,
      icon: <FaUserTie className="text-4xl" />,
      color: 'red'
    };
  }

  if (errorMsg.includes('Authentication required') || errorMsg.includes('login')) {
    return {
      title: 'Authentication Required',
      message: 'Please log in to view staff details.',
      icon: <FaUserClock className="text-4xl" />,
      color: 'orange'
    };
  }

  if (errorMsg.includes('Connection timed out')) {
    return {
      title: 'Connection Timeout',
      message: 'The request took too long to complete. Please check your internet connection and try again.',
      icon: <FaPlug className="text-4xl" />,
      color: 'orange'
    };
  }

  if (errorMsg.includes('Database connection error') || errorMsg.includes('integrity error')) {
    return {
      title: 'Database Error',
      message: 'A database error occurred. Please try again later or contact support if the problem persists.',
      icon: <FaDatabase className="text-4xl" />,
      color: 'red'
    };
  }

  return {
    title: 'Error Loading Staff',
    message: errorMsg || 'An unexpected error occurred while fetching staff details.',
    icon: <FiAlertCircle className="text-4xl" />,
    color: 'red'
  };
};

// Helper function to determine if data exists
const hasData = (section: any): boolean => {
  if (!section) return false;

  if (typeof section === 'object') {
    if (Array.isArray(section)) return section.length > 0;
    
    if (section.total_days_marked !== undefined) {
      return section.total_days_marked > 0 || section.present > 0 || section.absent > 0;
    }
    
    if (section.total_assignments !== undefined) {
      return section.total_assignments > 0;
    }
    
    if (section.total_logs !== undefined) {
      return section.total_logs > 0;
    }
    
    return Object.values(section).some(value =>
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && value !== null && Object.keys(value).length === 0)
    );
  }

  return true;
};

// Helper to get status badge class
const getStatusBadgeClass = (status: string, theme: any, get: any) => {
  const statusLower = status.toLowerCase();
  const colorMap: Record<string, string> = {
    present: 'emerald',
    absent: 'red',
    late: 'amber',
    'not marked': 'gray',
    completed: 'emerald',
    pending: 'amber',
    in_progress: 'blue',
    used: 'blue',
    damaged: 'red',
    restocked: 'emerald',
    active: 'emerald',
    inactive: 'gray'
  };

  const color = colorMap[statusLower] || 'purple';
  
  return {
    bg: theme === 'dark' ? `from-${color}-900/40 to-${color}-800/40` : `from-${color}-100 to-${color}-200`,
    text: theme === 'dark' ? `text-${color}-300` : `text-${color}-700`,
    border: theme === 'dark' ? `border-${color}-800` : `border-${color}-200`
  };
};

// Helper to get status icon
const getStatusIcon = (status: string) => {
  const statusLower = status.toLowerCase();
  if (statusLower === 'completed' || statusLower === 'present' || statusLower === 'restocked') return FaCheckCircle;
  if (statusLower === 'in_progress') return FaSpinner;
  if (statusLower === 'pending' || statusLower === 'late' || statusLower === 'not marked') return FaClock;
  if (statusLower === 'absent' || statusLower === 'damaged') return FaTimesCircle;
  if (statusLower === 'used') return FaBoxes;
  return FaClipboardList;
};

// Helper to get empty state
const getEmptyState = (type: string, customMessage?: string) => {
  const emptyStates: { [key: string]: { icon: any; title: string; description: string; color: string } } = {
    attendance: {
      icon: <FaCalendarCheck className="text-3xl" />,
      title: "No Attendance Data",
      description: customMessage || "Attendance records are not available for this period.",
      color: 'blue'
    },
    work: {
      icon: <FaClipboardList className="text-3xl" />,
      title: "No Work Assignments",
      description: customMessage || "No work assignments found for today.",
      color: 'emerald'
    },
    transport: {
      icon: <FaBus className="text-3xl" />,
      title: "No Transport Allocation",
      description: customMessage || "This staff member is not allocated to any transport.",
      color: 'amber'
    },
    inventory: {
      icon: <FaBoxes className="text-3xl" />,
      title: "No Inventory Logs",
      description: customMessage || "No inventory activity recorded for today.",
      color: 'purple'
    },
    reports: {
      icon: <FaHistory className="text-3xl" />,
      title: "No Academic Reports",
      description: customMessage || "No academic year reports are available.",
      color: 'pink'
    },
    today: {
      icon: <FaClock className="text-3xl" />,
      title: "No Today's Data",
      description: customMessage || "No information available for today.",
      color: 'indigo'
    }
  };

  return emptyStates[type] || {
    icon: <FaInfoCircle className="text-3xl" />,
    title: "No Data Available",
    description: customMessage || "Information will appear here once it becomes available.",
    color: 'blue'
  };
};

const resolveProfileImageUrl = (value: string | null): string | null => {
  if (!value) return null;
 
  const backendBase = process.env.NEXT_PUBLIC_BACKEND_API

  if (!backendBase) return value;
  
  try {
    // URL constructor handles slashes properly
    return new URL(value, backendBase).toString();
  } catch {
    // Fallback if URL construction fails
    const cleanValue = value.startsWith('/') ? value : `/${value}`;
    return `${backendBase}${cleanValue}`;
  }
};

export default function StaffOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const staff_id = params.staff_id as string;

  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffOverviewData['data'] | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; icon: any; color: string } | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [workView, setWorkView] = useState<'summary' | 'list'>('list');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Get current academic year report
  const currentYearReport = staffData?.academic_year_reports?.find(report => report.is_current);
  
  // Get selected academic year report or default to current
  const activeReport = selectedAcademicYear 
    ? staffData?.academic_year_reports?.find(report => report.academic_year === selectedAcademicYear)
    : currentYearReport || staffData?.academic_year_reports?.[0];

  // Helper to get card gradient class
  const getCardGradientClass = (color: string = 'default') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border shadow-lg transition-all duration-300 backdrop-blur-sm',
      get('border', 'primary')
    );

    const colorMap: Record<string, string> = {
      blue: theme === 'dark' ? 'from-blue-900/20 via-blue-800/20 to-blue-700/20' : 'from-blue-50 via-blue-100/50 to-blue-200/30',
      emerald: theme === 'dark' ? 'from-emerald-900/20 via-emerald-800/20 to-emerald-700/20' : 'from-emerald-50 via-emerald-100/50 to-emerald-200/30',
      amber: theme === 'dark' ? 'from-amber-900/20 via-amber-800/20 to-amber-700/20' : 'from-amber-50 via-amber-100/50 to-amber-200/30',
      pink: theme === 'dark' ? 'from-pink-900/20 via-pink-800/20 to-pink-700/20' : 'from-pink-50 via-pink-100/50 to-pink-200/30',
      purple: theme === 'dark' ? 'from-purple-900/20 via-purple-800/20 to-purple-700/20' : 'from-purple-50 via-purple-100/50 to-purple-200/30',
      red: theme === 'dark' ? 'from-red-900/20 via-red-800/20 to-red-700/20' : 'from-red-50 via-red-100/50 to-red-200/30',
      orange: theme === 'dark' ? 'from-orange-900/20 via-orange-800/20 to-orange-700/20' : 'from-orange-50 via-orange-100/50 to-orange-200/30',
      indigo: theme === 'dark' ? 'from-indigo-900/20 via-indigo-800/20 to-indigo-700/20' : 'from-indigo-50 via-indigo-100/50 to-indigo-200/30',
    };

    return combine(baseClasses, 'bg-gradient-to-br', colorMap[color] || colorMap.purple);
  };

  // Helper to get primary button class
  const getPrimaryButtonClass = () => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-purple-600 via-purple-500 to-purple-600 hover:from-purple-700 hover:via-purple-600 hover:to-purple-700'
      : 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-500 hover:from-purple-600 hover:via-purple-500 hover:to-purple-600'
  );

  // Helper to get secondary button class
  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  // Helper to get status badge classes
  const getStatusBadgeClasses = (status: string) => {
    const colors = getStatusBadgeClass(status, theme, get);
    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  // Calculate attendance percentage
  const calculateAttendancePercentage = () => {
    if (!activeReport?.attendance?.summary) return 0;
    return Math.round(activeReport.attendance.summary.attendance_percentage);
  };

  const attendancePercentage = calculateAttendancePercentage();

  // Get color for attendance percentage
  const getAttendanceColor = () => {
    if (attendancePercentage >= 90) return 'text-emerald-500';
    if (attendancePercentage >= 75) return 'text-blue-500';
    if (attendancePercentage >= 60) return 'text-amber-500';
    return 'text-red-500';
  };

  // Get progress bar color
  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-gradient-to-r from-emerald-500 to-green-500';
    if (percentage >= 80) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (percentage >= 70) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (percentage >= 60) return 'bg-gradient-to-r from-orange-500 to-red-500';
    return 'bg-gradient-to-r from-red-500 to-pink-500';
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Format time
  const formatTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '--:--';
    try {
      return new Date(dateTimeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Time';
    }
  };

  // Filter work assignments
  const getFilteredWorkAssignments = () => {
    if (!staffData?.today_snapshot?.works?.list) return [];
    
    let assignments = [...staffData.today_snapshot.works.list];
    
    if (searchTerm) {
      assignments = assignments.filter(assignment => 
        assignment.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      assignments = assignments.filter(assignment => 
        assignment.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    assignments.sort((a, b) => {
      const dateA = new Date(a.created_date).getTime();
      const dateB = new Date(b.created_date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return assignments;
  };

  // Filter inventory logs
  const getFilteredInventoryLogs = () => {
    if (!staffData?.today_snapshot?.inventory?.logs) return [];
    
    let logs = [...staffData.today_snapshot.inventory.logs];
    
    if (searchTerm) {
      logs = logs.filter(log => 
        log.item_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      logs = logs.filter(log => 
        log.action.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    logs.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return logs;
  };

  const filteredAssignments = getFilteredWorkAssignments();
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filteredLogs = getFilteredInventoryLogs();
  const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Fetch staff overview data
  const fetchStaffOverview = async () => {
    setLoading(true);
    setError(null);
    setHttpStatus(null);
    setProfileImageError(false);

    try {
      const response = await adminApi.staff.overview(staff_id);
      setHttpStatus(response.status);

      const payload = response.data;
      const data = payload?.data || payload;
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      const normalized: StaffOverviewData['data'] = {
        ...getDefaultStaffData(),
        ...data,
        personal_details: {
          ...getDefaultStaffData().personal_details,
          ...(data.personal_details || {})
        },
        full_staff_details: {
          ...getDefaultStaffData().full_staff_details,
          ...(data.full_staff_details || {}),
          bank_details: {
            ...getDefaultStaffData().full_staff_details?.bank_details,
            ...(data.full_staff_details?.bank_details || {})
          },
          user_account: {
            ...getDefaultStaffData().full_staff_details?.user_account,
            ...(data.full_staff_details?.user_account || {})
          },
          role_access: {
            ...(data.full_staff_details?.role_access || {})
          }
        },
        today_snapshot: data.today_snapshot || undefined,
        transport_details: data.transport_details || undefined,
        empty_state: data.empty_state || getDefaultStaffData().empty_state,
        academic_year_reports: Array.isArray(data.academic_year_reports) ? data.academic_year_reports : []
      };

      setStaffData(normalized);
      const currentYear = normalized.academic_year_reports?.find((r: any) => r.is_current);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.academic_year);
      } else if (normalized.academic_year_reports?.length > 0) {
        setSelectedAcademicYear(normalized.academic_year_reports[0].academic_year);
      } else {
        setSelectedAcademicYear('');
      }
    } catch (error: any) {
      console.error('Error fetching staff overview:', error);
      
      const errorResponse = error?.response?.data || error;
      const mappedError = getErrorMessage(errorResponse);
      setError(mappedError);
      
      if (error?.response?.status === 404 && errorResponse?.error?.includes('not found')) {
        setTimeout(() => {
          router.push('/admin/staff');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staff_id) {
      fetchStaffOverview();
    }
  }, [staff_id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const referrer = document.referrer;
    if (!referrer || window.history.length <= 1) {
      setShowBackButton(false);
      return;
    }
    try {
      const refUrl = new URL(referrer);
      const currentUrl = new URL(window.location.href);
      const isInternal = refUrl.origin === currentUrl.origin;
      const isDifferentPage = refUrl.pathname !== currentUrl.pathname;
      setShowBackButton(isInternal && isDifferentPage);
    } catch {
      setShowBackButton(false);
    }
  }, []);

  // Handle print report
  const handlePrintReport = () => {
    window.print();
  };

  // Handle export PDF
  const handleExportPDF = () => {
    toastInfo('PDF export feature coming soon!');
  };

  // Loading state
  if (loading) {
    return (
      <div className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <School className="h-8 w-8 text-purple-600 animate-pulse" />
                </div>
              </div>
              <p className={combine("text-xl font-bold mb-3", get('text', 'primary'))}>
                Loading Staff Overview
              </p>
              <p className={combine("text-base max-w-md mx-auto", get('text', 'secondary'))}>
                Fetching comprehensive profile and work data for staff ID: {staff_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !staffData) {
    return (
      <div className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className={combine(
              "p-8 rounded-3xl mb-8",
              theme === 'dark' ? `bg-gradient-to-br from-${error?.color || 'red'}-900/30 to-${error?.color || 'red'}-800/30` :
                `bg-gradient-to-br from-${error?.color || 'red'}-50 to-${error?.color || 'red'}-100`
            )}>
              <div className={combine(
                "text-6xl mb-4",
                theme === 'dark' ? `text-${error?.color || 'red'}-400` : `text-${error?.color || 'red'}-600`
              )}>
                {error?.icon || <FaExclamationTriangle className="text-4xl" />}
              </div>
            </div>

            <h3 className={combine("text-2xl font-bold mb-3", get('text', 'primary'))}>
              {error?.title || 'Error Loading Staff'}
            </h3>

            <p className={combine("text-base mb-6 text-center max-w-md", get('text', 'secondary'))}>
              {error?.message || 'Unable to load staff overview. Please try again.'}
            </p>

            {httpStatus === 403 && (
              <div className={combine(
                "mb-8 p-4 rounded-xl max-w-md",
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
              )}>
                <p className={combine("text-sm text-center", get('text', 'secondary'))}>
                  If you believe you should have access, please contact your system administrator.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={() => router.back()}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2 px-6 py-3")}
              >
                <FaArrowLeft className="text-sm" />
                <span className="text-sm">Go Back</span>
              </button>
              <button
                onClick={fetchStaffOverview}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2 px-6 py-3")}
              >
                <FaChartLine className="text-sm" />
                <span className="text-sm">Retry</span>
              </button>
            </div>

            {error?.message?.includes('not found') && (
              <p className={combine("text-sm mt-4", get('text', 'tertiary'))}>
                Redirecting to staff list...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { personal_details, full_staff_details, today_snapshot, transport_details, academic_year_reports, overall_stats, empty_state } = staffData;
  const profileImageUrl = !profileImageError
    ? resolveProfileImageUrl(personal_details.profile_image || full_staff_details?.profile_image || null)
    : null;
  const bankDetails = full_staff_details?.bank_details;

  // Determine which sections have data
  const hasAttendance = activeReport?.attendance?.summary && 
    (activeReport.attendance.summary.total_days_marked > 0 || activeReport.attendance.summary.present > 0);
  const hasWork = today_snapshot?.works?.list && today_snapshot.works.list.length > 0;
  const hasTransport = transport_details?.is_allocated === true;
  const hasInventory = today_snapshot?.inventory?.logs && today_snapshot.inventory.logs.length > 0;
  const hasReports = academic_year_reports && academic_year_reports.length > 0;

  return (
    <div className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* <button
              onClick={() => router.back()}
              className={combine(
                "p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary')
              )}
            >
              <FaArrowLeft className="text-sm sm:text-lg" />
            </button> */}
            <div>
              <h1 className={combine("text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                Staff Overview
              </h1>
              <p className={combine("text-sm mt-2 flex items-center", get('text', 'secondary'))}>
                <FaUserTie className="mr-2" />
                Complete profile and work analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {academic_year_reports && academic_year_reports.length > 1 && (
              <div className="flex items-center space-x-2 mr-2">
                <FaCalendarAlt className={combine("text-sm", get('text', 'tertiary'))} />
                <select
                  value={selectedAcademicYear}
                  onChange={(e) => {
                    setSelectedAcademicYear(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={combine(
                    "px-3 py-2 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500",
                    get('bg', 'primary'),
                    get('border', 'primary'),
                    get('text', 'primary')
                  )}
                >
                  {academic_year_reports.map((report) => (
                    <option key={report.academic_year} value={report.academic_year}>
                      {report.academic_year} {report.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {showBackButton && (
              <button
                onClick={() => router.back()}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaArrowLeft className="text-sm" />
                <span className="hidden sm:inline text-sm">Back</span>
              </button>
            )}
            {/* <button
              onClick={handlePrintReport}
              className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
            >
              <FaPrint className="text-sm" />
              <span className="hidden sm:inline text-sm">Print</span>
            </button>
            <button
              onClick={handleExportPDF}
              className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
            >
              <FaDownload className="text-sm" />
              <span className="hidden sm:inline text-sm">Export</span>
            </button> */}
          </div>
        </div>

        {/* Staff Profile Card */}
        <div className={combine(
          getCardGradientClass('purple'),
          "relative overflow-hidden"
        )}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center space-x-4">
              <div className={combine(
                "h-24 w-24 rounded-2xl flex items-center justify-center shadow-xl",
                personal_details.extra_details?.gender === 'Male'
                  ? theme === 'dark' ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/40' : 'bg-gradient-to-br from-blue-100 to-blue-200'
                  : personal_details.extra_details?.gender === 'Female'
                    ? theme === 'dark' ? 'bg-gradient-to-br from-pink-900/40 to-pink-800/40' : 'bg-gradient-to-br from-pink-100 to-pink-200'
                    : theme === 'dark' ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40' : 'bg-gradient-to-br from-purple-100 to-purple-200'
              )}>
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={`${personal_details.name} profile`}
                    className="h-24 w-24 rounded-2xl object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <FaUserTie className={
                    personal_details.extra_details?.gender === 'Male'
                      ? theme === 'dark' ? 'text-blue-400 text-4xl' : 'text-blue-600 text-4xl'
                      : personal_details.extra_details?.gender === 'Female'
                        ? theme === 'dark' ? 'text-pink-400 text-4xl' : 'text-pink-600 text-4xl'
                        : theme === 'dark' ? 'text-purple-400 text-4xl' : 'text-purple-600 text-4xl'
                  } />
                )}
              </div>
              <div>
                <div className='mb-3'>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {personal_details.name}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaIdCard className="text-xs" />
                    <span className="text-xs">ID: {personal_details.staff_id}</span>
                  </span>

                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaBriefcase className="text-xs" />
                    <span className="text-xs">{personal_details.role_display}</span>
                  </span>

                  {personal_details.extra_details?.department && (
                    <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <FaBuilding className="text-xs" />
                      <span className="text-xs">{personal_details.extra_details.department}</span>
                    </span>
                  )}

                  {personal_details.joining_date && (
                    <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <FaCalendarAlt className="text-xs" />
                      <span className="text-xs">Joined: {formatDate(personal_details.joining_date)}</span>
                    </span>
                  )}

                  {transport_details?.is_driver_assigned && (
                    <span className={combine(
                      "flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'
                    )}>
                      <FaBus className="text-xs" />
                      <span className="text-xs">Driver</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="flex gap-4">
                {today_snapshot && (
                  <div className={combine(
                    "p-4 rounded-xl",
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                  )}>
                    <div className="flex items-center space-x-3">
                      <FaCalendarCheck className={combine("text-xl",
                        today_snapshot.today_attendance_status?.toLowerCase() === 'present' ? 'text-emerald-500' :
                          today_snapshot.today_attendance_status?.toLowerCase() === 'absent' ? 'text-red-500' :
                            today_snapshot.today_attendance_status?.toLowerCase() === 'late' ? 'text-amber-500' : 'text-gray-400'
                      )} />
                      <div>
                        <div className={combine("text-md", get('text', 'secondary'))}>Today's Status</div>
                        <div className={combine("text-sm", get('text', 'primary'))}>
                          <span className={combine("text-lg ",
                            today_snapshot.today_attendance_status?.toLowerCase() === 'present' ? 'text-emerald-600' :
                              today_snapshot.today_attendance_status?.toLowerCase() === 'absent' ? 'text-red-600' :
                                today_snapshot.today_attendance_status?.toLowerCase() === 'late' ? 'text-amber-600' : 'text-gray-600'
                          )}>
                            {today_snapshot.today_attendance_status || 'Not Marked'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className={combine(
                  "p-4 rounded-xl",
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                )}>
                  <div className="flex items-center space-x-3">
                    <FaCalendarAlt className="text-xl text-indigo-500" />
                    <div>
                      <div className={combine("text-md", get('text', 'secondary'))}>Current Year</div>
                      <div className={combine("text-sm", get('text', 'primary'))}>
                        {staffData.current_academic_year || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Attendance Card */}
          <div className={combine(
            getCardGradientClass('blue'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')}>
                <FaCalendarCheck className="text-blue-600 dark:text-blue-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(
                attendancePercentage >= 90 ? 'present' :
                  attendancePercentage >= 75 ? 'active' :
                    attendancePercentage >= 60 ? 'pending' : 'absent'
              )}>
                {attendancePercentage}%
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Attendance</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Present/Absent</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {activeReport?.attendance?.summary?.present || 0}/
                {activeReport?.attendance?.summary?.absent || 0}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div
                className={combine("h-full rounded-full", getProgressBarColor(attendancePercentage))}
                style={{ width: `${Math.min(100, attendancePercentage)}%` }}
              ></div>
            </div>
          </div>

          {/* Work Card */}
          <div className={combine(
            getCardGradientClass('emerald'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                <FaClipboardList className="text-emerald-600 dark:text-emerald-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasWork ? 'active' : 'inactive')}>
                {hasWork ? `${today_snapshot?.works?.total || 0} Tasks` : 'No Tasks'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Today's Work</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Completed/Pending</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {today_snapshot?.works?.completed || 0}/{today_snapshot?.works?.pending || 0}
              </span>
            </div>
            {today_snapshot?.works && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Completion: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {today_snapshot.works.total > 0 
                    ? Math.round((today_snapshot.works.completed / today_snapshot.works.total) * 100) 
                    : 0}%
                </span>
              </div>
            )}
          </div>

          {/* Transport Card */}
          <div className={combine(
            getCardGradientClass('amber'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')}>
                <FaBus className="text-amber-600 dark:text-amber-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasTransport ? 'active' : 'inactive')}>
                {hasTransport ? 'Allocated' : 'Not Allocated'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Transport</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Bus Number</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {transport_details?.bus_number || 'N/A'}
              </span>
            </div>
            {transport_details?.driver?.name && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Driver: </span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {transport_details.driver.name}
                </span>
              </div>
            )}
          </div>

          {/* Inventory Card */}
          <div className={combine(
            getCardGradientClass('pink'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100')}>
                <FaBoxes className="text-pink-600 dark:text-pink-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasInventory ? 'active' : 'inactive')}>
                {hasInventory ? `${today_snapshot?.inventory?.total_logs || 0} Logs` : 'No Logs'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Inventory</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Today's Activity</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {today_snapshot?.inventory?.total_logs || 0}
              </span>
            </div>
            {hasInventory && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Last: </span>
                <span className="text-pink-600 dark:text-pink-400 font-medium">
                  {today_snapshot?.inventory?.logs[0]?.item_name || 'N/A'}
                </span>
              </div>
            )}
          </div>
        </div>

        {!hasReports && (
          <div className={combine(
            getCardGradientClass('orange'),
            "flex items-start gap-3"
          )}>
            <FaExclamationCircle className="text-orange-500 mt-0.5" />
            <div>
              <p className={combine("text-sm font-semibold", get('text', 'primary'))}>No Academic Year Reports</p>
              <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                {empty_state?.message || 'No academic year report data available for this staff yet.'}
              </p>
            </div>
          </div>
        )}

        <div className={getCardGradientClass('indigo')}>
          <h3 className={combine("text-xl font-bold mb-4 flex items-center space-x-3", get('text', 'primary'))}>
            <FaIdCard className="text-xl" />
            <span>Full Staff Details</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Role Access</p>
              <p className={combine("text-sm font-medium capitalize", get('text', 'primary'))}>
                {full_staff_details?.role_access?.assignment_mode?.replace('_', ' ') || 'N/A'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>User Account</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {full_staff_details?.user_account?.username || 'Not Linked'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>User Active</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {full_staff_details?.user_account?.is_active === null || full_staff_details?.user_account?.is_active === undefined
                  ? 'N/A'
                  : full_staff_details?.user_account?.is_active ? 'Yes' : 'No'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Bank Name</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {bankDetails?.bank_name || personal_details.bank_name || 'Not Provided'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Account Holder</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {bankDetails?.account_holder_name || personal_details.account_holder_name || 'Not Provided'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Account Number</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {bankDetails?.bank_account_number || personal_details.bank_account_number || 'Not Provided'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>IFSC</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {bankDetails?.ifsc_code || personal_details.ifsc_code || 'N/A'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>UPI</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {bankDetails?.upi_id || personal_details.upi_id || 'N/A'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Transport Staff</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {full_staff_details?.role_access?.is_transport_staff ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>

        {/* Today's Snapshot Cards */}
        {today_snapshot && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Today's Attendance</p>
                  <p className={combine("text-lg sm:text-xl font-bold mt-1 capitalize", get('text', 'primary'))}>
                    {today_snapshot.attendance?.status || 'Not Marked'}
                  </p>
                  {today_snapshot.attendance?.check_in_time && (
                    <p className={combine("text-xs mt-1 flex items-center gap-1", get('text', 'tertiary'))}>
                      <FaClock className="text-xs" />
                      {formatTime(today_snapshot.attendance.check_in_time)}
                    </p>
                  )}
                </div>
                <div className={combine(
                  "p-2 sm:p-3 rounded-full",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaUserCheck className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
            </div>

            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Today's Tasks</p>
                  <p className={combine("text-lg sm:text-xl font-bold mt-1", get('text', 'primary'))}>
                    {today_snapshot.works?.completed || 0}/{today_snapshot.works?.total || 0}
                  </p>
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    {today_snapshot.works?.pending || 0} pending
                  </p>
                </div>
                <div className={combine(
                  "p-2 sm:p-3 rounded-full",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <FaClipboardList className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
            </div>

            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Transport</p>
                  <p className={combine("text-lg sm:text-xl font-bold mt-1 capitalize", get('text', 'primary'))}>
                    {transport_details?.is_allocated ? (transport_details.is_driver_assigned ? 'Driver' : 'Allocated') : 'No'}
                  </p>
                  {transport_details?.bus_number && (
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Bus: {transport_details.bus_number}
                    </p>
                  )}
                </div>
                <div className={combine(
                  "p-2 sm:p-3 rounded-full",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaBus className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
            </div>

            <div className={getCardGradientClass('pink')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Inventory Logs</p>
                  <p className={combine("text-lg sm:text-xl font-bold mt-1", get('text', 'primary'))}>
                    {today_snapshot.inventory?.total_logs || 0}
                  </p>
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>Today</p>
                </div>
                <div className={combine(
                  "p-2 sm:p-3 rounded-full",
                  theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100'
                )}>
                  <FaBoxes className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                  )} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile & Personal Info */}
          <div className="space-y-6">
            {/* Personal Details */}
            <div className={getCardGradientClass('purple')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FiUser className="text-xl" />
                <span>Personal Details</span>
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Staff ID</div>
                    <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                      {personal_details.staff_id}
                    </div>
                  </div>
                  <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Role</div>
                    <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                      {personal_details.role_display}
                    </div>
                  </div>
                </div>

                {personal_details.extra_details?.date_of_birth && (
                  <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                    <div className="flex items-center space-x-3">
                      <FaBirthdayCake className={combine("text-sm", get('text', 'tertiary'))} />
                      <span className={combine("text-sm", get('text', 'primary'))}>
                        {formatDate(personal_details.extra_details.date_of_birth)}
                      </span>
                    </div>
                  </div>
                )}

                <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                  <div className="flex items-center space-x-3">
                    <FaEnvelope className={combine("text-sm", get('text', 'tertiary'))} />
                    <span className={combine("text-sm", get('text', 'primary'))}>{personal_details.email}</span>
                  </div>
                </div>

                <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                  <div className="flex items-center space-x-3">
                    <FaPhone className={combine("text-sm", get('text', 'tertiary'))} />
                    <span className={combine("text-sm", get('text', 'primary'))}>{personal_details.phone}</span>
                  </div>
                </div>

                {personal_details.address && (
                  <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                    <div className="flex items-start space-x-3">
                      <FaMapMarkerAlt className={combine("text-sm mt-0.5", get('text', 'tertiary'))} />
                      <span className={combine("text-sm", get('text', 'primary'))}>{personal_details.address}</span>
                    </div>
                  </div>
                )}

                {/* Extra Details Toggle */}
                {personal_details.extra_details && Object.keys(personal_details.extra_details).length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowExtraDetails(!showExtraDetails)}
                      className={combine(
                        "text-xs flex items-center gap-1 hover:underline mt-2",
                        get('text', 'tertiary')
                      )}
                    >
                      {showExtraDetails ? 'Hide' : 'Show'} additional details
                      <FaChevronDown className={`text-xs transition-transform ${showExtraDetails ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showExtraDetails && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {Object.entries(personal_details.extra_details).map(([key, value]) => {
                          if (key === 'date_of_birth') return null; // Already shown
                          return (
                            <div key={key} className={combine("p-2 rounded-lg text-xs", get('bg', 'secondary'))}>
                              <span className={combine("capitalize", get('text', 'tertiary'))}>
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <span className={combine("ml-1 font-medium", get('text', 'primary'))}>
                                {String(value) || 'N/A'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Summary */}
            <div className={getCardGradientClass('indigo')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaChartBar className="text-xl" />
                <span>Quick Stats</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={get('text', 'secondary')}>Attendance Rate</span>
                    <span className={getAttendanceColor()}>{attendancePercentage}%</span>
                  </div>
                  <div className={combine("h-1.5 rounded-full overflow-hidden", get('bg', 'secondary'))}>
                    <div 
                      className={combine("h-full rounded-full", getProgressBarColor(attendancePercentage))}
                      style={{ width: `${attendancePercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={get('text', 'secondary')}>Work Completion</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {today_snapshot?.works?.total 
                        ? Math.round((today_snapshot.works.completed / today_snapshot.works.total) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className={combine("h-1.5 rounded-full overflow-hidden", get('bg', 'secondary'))}>
                    <div 
                      className={combine("h-full rounded-full", getProgressBarColor(
                        today_snapshot?.works?.total 
                          ? (today_snapshot.works.completed / today_snapshot.works.total) * 100
                          : 0
                      ))}
                      style={{ width: `${today_snapshot?.works?.total 
                        ? Math.round((today_snapshot.works.completed / today_snapshot.works.total) * 100)
                        : 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="text-center p-2 rounded-lg bg-white/30 dark:bg-gray-800/30">
                    <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                      {today_snapshot?.inventory?.total_logs || 0}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Inventory Logs</div>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-white/30 dark:bg-gray-800/30">
                    <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                      {academic_year_reports?.length || 0}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Academic Years</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Middle & Right Columns - Combined */}
          <div className="lg:col-span-2 space-y-6">
            {/* Work Assignments Section */}
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={combine("text-xl font-bold flex items-center space-x-3", get('text', 'primary'))}>
                  <FaClipboardList className="text-xl" />
                  <span>Today's Work Assignments</span>
                </h3>
                {hasWork && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setWorkView(workView === 'summary' ? 'list' : 'summary')}
                      className={combine(
                        "px-3 py-1.5 text-xs rounded-lg transition-all",
                        workView === 'list'
                          ? theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                          : get('bg', 'secondary')
                      )}
                    >
                      List View
                    </button>
                  </div>
                )}
              </div>

              {hasWork ? (
                <div className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 relative">
                      <FaSearch className={combine(
                        "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs",
                        get('text', 'tertiary')
                      )} />
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={combine(
                          "w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500",
                          get('bg', 'primary'),
                          get('border', 'primary'),
                          get('text', 'primary')
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={combine(
                          "px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500",
                          get('bg', 'primary'),
                          get('border', 'primary'),
                          get('text', 'primary')
                        )}
                      >
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      
                      <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className={combine(
                          "px-3 py-2 rounded-lg border flex items-center gap-1",
                          get('border', 'primary'),
                          get('bg', 'secondary'),
                          get('text', 'primary')
                        )}
                      >
                        {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                      </button>
                    </div>
                  </div>

                  {workView === 'summary' ? (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
                        <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                          {today_snapshot.works.total}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
                        <div className="text-2xl font-bold text-emerald-600">
                          {today_snapshot.works.completed}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Completed</div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
                        <div className="text-2xl font-bold text-amber-600">
                          {today_snapshot.works.pending}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Pending</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {paginatedAssignments.length > 0 ? (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                          {paginatedAssignments.map((assignment) => {
                            const Icon = getStatusIcon(assignment.status);
                            return (
                              <div key={assignment.assignment_id} className={combine(
                                "p-4 rounded-lg border",
                                get('border', 'primary'),
                                get('bg', 'secondary')
                              )}>
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-2">
                                      <Icon className={assignment.status.toLowerCase() === 'completed' ? 'text-emerald-500' : 
                                                       assignment.status.toLowerCase() === 'in_progress' ? 'text-blue-500 animate-spin' :
                                                       assignment.status.toLowerCase() === 'pending' ? 'text-amber-500' : 'text-gray-500'} />
                                      <span className={getStatusBadgeClasses(assignment.status)}>
                                        {assignment.status.replace('_', ' ').toUpperCase()}
                                      </span>
                                      {assignment.is_recurring && (
                                        <span className={combine(
                                          "px-2 py-0.5 rounded-full text-xs",
                                          theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                                        )}>
                                          Recurring
                                        </span>
                                      )}
                                      {assignment.proof_uploaded && (
                                        <span className="text-emerald-500 text-xs">
                                          <FaCheckCircle className="inline mr-1" />
                                          Proof Uploaded
                                        </span>
                                      )}
                                    </div>
                                    <p className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>
                                      {assignment.description}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-3 text-xs">
                                      <span className={combine("flex items-center gap-1", get('text', 'tertiary'))}>
                                        <FaCalendarAlt className="text-xs" />
                                        Created: {formatDate(assignment.created_date)}
                                      </span>
                                      {assignment.completed_at && (
                                        <span className={combine("flex items-center gap-1", get('text', 'tertiary'))}>
                                          <FaCheck className="text-xs" />
                                          Completed: {formatDate(assignment.completed_at)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className={combine("text-sm", get('text', 'secondary'))}>
                            {searchTerm || filterStatus !== 'all' 
                              ? 'No assignments match your filters' 
                              : 'No work assignments for today'}
                          </p>
                        </div>
                      )}

                      {/* Pagination */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4">
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredAssignments.length)} of {filteredAssignments.length} assignments
                          </p>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className={combine(
                                "p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed",
                                get('border', 'primary'),
                                get('bg', 'secondary'),
                                get('text', 'primary')
                              )}
                            >
                              <FaChevronLeft className="text-xs" />
                            </button>
                            <span className={combine("text-xs", get('text', 'primary'))}>
                              Page {currentPage} of {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages}
                              className={combine(
                                "p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed",
                                get('border', 'primary'),
                                get('bg', 'secondary'),
                                get('text', 'primary')
                              )}
                            >
                              <FaChevronRight className="text-xs" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('work').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {getEmptyState('work').description}
                  </p>
                </div>
              )}
            </div>

            {/* Attendance Section */}
            <div className={getCardGradientClass('blue')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaCalendarCheck className="text-xl" />
                <span>Attendance Overview - {activeReport?.academic_year || 'N/A'}</span>
              </h3>

              {activeReport ? (
                hasAttendance ? (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                          {activeReport.attendance.summary.total_days_marked}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Marked Days</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {activeReport.attendance.summary.present}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Present</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {activeReport.attendance.summary.absent}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Absent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-amber-600">
                          {activeReport.attendance.summary.late}
                        </div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Late</div>
                      </div>
                    </div>

                    {/* Additional Stats */}
                    {(activeReport.attendance.summary.actual_working_days > 0 || 
                      activeReport.attendance.summary.sundays > 0 || 
                      activeReport.attendance.summary.holidays > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {activeReport.attendance.summary.actual_working_days > 0 && (
                          <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                              {activeReport.attendance.summary.actual_working_days}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Working Days</p>
                          </div>
                        )}
                        {activeReport.attendance.summary.sundays > 0 && (
                          <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                              {activeReport.attendance.summary.sundays}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Sundays</p>
                          </div>
                        )}
                        {activeReport.attendance.summary.holidays > 0 && (
                          <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                              {activeReport.attendance.summary.holidays}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Holidays</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Attendance Percentage Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={combine("text-sm", get('text', 'primary'))}>Attendance Rate</span>
                        <span className={combine("text-sm font-bold", getAttendanceColor())}>
                          {attendancePercentage}%
                        </span>
                      </div>
                      <div className={combine("h-2 rounded-full overflow-hidden", get('bg', 'secondary'))}>
                        <div 
                          className={combine("h-full rounded-full", getProgressBarColor(attendancePercentage))}
                          style={{ width: `${attendancePercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Period Info */}
                    {activeReport.attendance.note && (
                      <div className={combine(
                        "p-3 rounded-lg text-xs",
                        theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                      )}>
                        <FaInfoCircle className="inline mr-1 text-blue-500" />
                        {activeReport.attendance.note}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                    )}>
                      {getEmptyState('attendance', activeReport.attendance?.note).icon}
                    </div>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {activeReport.attendance?.note || getEmptyState('attendance').description}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('attendance', 'No academic year selected').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    No attendance data available for the selected period
                  </p>
                </div>
              )}
            </div>

            

            

            
          </div>
        </div>

        {/* Transport Details */}
            <div className={getCardGradientClass('amber')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaBus className="text-xl" />
                <span>Transport Details</span>
              </h3>

              {hasTransport ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Bus Number</p>
                      <p className={combine("text-sm font-bold mt-1", get('text', 'primary'))}>
                        {transport_details?.bus_number || 'N/A'}
                      </p>
                    </div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Registration</p>
                      <p className={combine("text-sm font-bold mt-1", get('text', 'primary'))}>
                        {transport_details?.registration_number || 'N/A'}
                      </p>
                    </div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Capacity</p>
                      <p className={combine("text-sm font-bold mt-1", get('text', 'primary'))}>
                        {transport_details?.capacity || 'N/A'} seats
                      </p>
                    </div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Stop Location</p>
                      <p className={combine("text-sm font-bold mt-1", get('text', 'primary'))}>
                        {transport_details?.stop?.stop_name || 'N/A'}
                      </p>
                    </div>
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Assignment Mode</p>
                      <p className={combine("text-sm font-bold mt-1 capitalize", get('text', 'primary'))}>
                        {transport_details?.assignment_mode?.replace('_', ' ') || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {transport_details?.route && (
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs mb-2", get('text', 'tertiary'))}>Route</p>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className={get('text', 'primary')}>
                          <FaRoute className="inline mr-1 text-purple-500" />
                          {transport_details.route.start_location || 'N/A'}
                        </span>
                        <span className={get('text', 'tertiary')}>→</span>
                        <span className={get('text', 'primary')}>
                          {transport_details.route.end_location || 'N/A'}
                        </span>
                        {transport_details.route.is_active && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-500 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {transport_details?.driver?.name && (
                    <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Driver</p>
                      <p className={combine("text-sm font-bold mt-1", get('text', 'primary'))}>
                        {transport_details.driver.name}
                        {transport_details.driver.staff_id && (
                          <span className={combine("text-xs ml-2", get('text', 'tertiary'))}>
                            ({transport_details.driver.staff_id})
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {transport_details?.note && (
                    <div className={combine(
                      "p-3 rounded-lg text-xs",
                      theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                    )}>
                      <FaInfoCircle className="inline mr-1 text-blue-500" />
                      {transport_details.note}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('transport', transport_details?.note).icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {transport_details?.note || getEmptyState('transport').description}
                  </p>
                </div>
              )}
            </div>

            {/* Inventory Logs */}
            <div className={getCardGradientClass('pink')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaBoxes className="text-xl" />
                <span>Today's Inventory Logs</span>
              </h3>

              {hasInventory ? (
                <div className="space-y-4">
                  {/* Search and Filter Controls */}
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 relative">
                      <FaSearch className={combine(
                        "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs",
                        get('text', 'tertiary')
                      )} />
                      <input
                        type="text"
                        placeholder="Search items..."
                        value={searchTerm}
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={combine(
                          "w-full pl-8 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500",
                          get('bg', 'primary'),
                          get('border', 'primary'),
                          get('text', 'primary')
                        )}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <select
                        value={filterStatus}
                        onChange={(e) => {
                          setFilterStatus(e.target.value);
                          setCurrentPage(1);
                        }}
                        className={combine(
                          "px-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-purple-500",
                          get('bg', 'primary'),
                          get('border', 'primary'),
                          get('text', 'primary')
                        )}
                      >
                        <option value="all">All Actions</option>
                        <option value="used">Used</option>
                        <option value="damaged">Damaged</option>
                        <option value="restocked">Restocked</option>
                      </select>
                      
                      <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className={combine(
                          "px-3 py-2 rounded-lg border flex items-center gap-1",
                          get('border', 'primary'),
                          get('bg', 'secondary'),
                          get('text', 'primary')
                        )}
                      >
                        {sortOrder === 'desc' ? <FaSortAmountDown /> : <FaSortAmountUp />}
                      </button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-2 rounded-lg bg-white/30 dark:bg-gray-800/30">
                      <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {today_snapshot.inventory.total_logs}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/30 dark:bg-gray-800/30">
                      <div className="text-lg font-bold text-blue-600">
                        {today_snapshot.inventory.logs.filter(l => l.action.toLowerCase() === 'used').length}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Used</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-white/30 dark:bg-gray-800/30">
                      <div className="text-lg font-bold text-red-600">
                        {today_snapshot.inventory.logs.filter(l => l.action.toLowerCase() === 'damaged').length}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Damaged</div>
                    </div>
                  </div>

                  {/* Logs List */}
                  {paginatedLogs.length > 0 ? (
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {paginatedLogs.map((log) => {
                        const Icon = getStatusIcon(log.action);
                        return (
                          <div key={log.log_id} className={combine(
                            "p-3 rounded-lg border",
                            get('border', 'primary'),
                            get('bg', 'secondary')
                          )}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className={log.action.toLowerCase() === 'used' ? 'text-blue-500' : 
                                                   log.action.toLowerCase() === 'damaged' ? 'text-red-500' :
                                                   log.action.toLowerCase() === 'restocked' ? 'text-emerald-500' : 'text-gray-500'} />
                                  <span className={getStatusBadgeClasses(log.action)}>
                                    {log.action.toUpperCase()}
                                  </span>
                                </div>
                                <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                                  {log.item_name}
                                </p>
                                <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                  Quantity: {log.quantity_changed}
                                </p>
                                <p className={combine("text-xs mt-1 flex items-center gap-1", get('text', 'tertiary'))}>
                                  <FaClock className="text-xs" />
                                  {formatTime(log.timestamp)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        {searchTerm || filterStatus !== 'all' 
                          ? 'No inventory logs match your filters' 
                          : 'No inventory logs for today'}
                      </p>
                    </div>
                  )}

                  {/* Pagination */}
                  {totalLogPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} logs
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={combine(
                            "p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed",
                            get('border', 'primary'),
                            get('bg', 'secondary'),
                            get('text', 'primary')
                          )}
                        >
                          <FaChevronLeft className="text-xs" />
                        </button>
                        <span className={combine("text-xs", get('text', 'primary'))}>
                          Page {currentPage} of {totalLogPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalLogPages))}
                          disabled={currentPage === totalLogPages}
                          className={combine(
                            "p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed",
                            get('border', 'primary'),
                            get('bg', 'secondary'),
                            get('text', 'primary')
                          )}
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('inventory').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {getEmptyState('inventory').description}
                  </p>
                </div>
              )}
            </div>

            {/* Academic Year Reports */}
            {hasReports && (
              <div className={getCardGradientClass('indigo')}>
                <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                  <FaHistory className="text-xl" />
                  <span>Academic Year Reports</span>
                </h3>

                <div className="space-y-4">
                  {academic_year_reports.slice(0, 3).map((report, index) => (
                    <div key={index} className={combine(
                      "p-4 rounded-lg border",
                      report.is_current ? 
                        theme === 'dark' ? 'border-emerald-800 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50/50' :
                        get('border', 'primary') + ' ' + get('bg', 'secondary')
                    )}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={combine("text-sm font-bold", get('text', 'primary'))}>
                          {report.academic_year}
                          {report.is_current && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-500 rounded-full">
                              Current
                            </span>
                          )}
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className={get('text', 'tertiary')}>Attendance:</span>
                          <span className={combine("ml-1 font-medium", getAttendanceColor())}>
                            {report.attendance.summary.attendance_percentage}%
                          </span>
                        </div>
                        <div>
                          <span className={get('text', 'tertiary')}>Present:</span>
                          <span className="ml-1 font-medium text-emerald-600">
                            {report.attendance.summary.present}
                          </span>
                        </div>
                        <div>
                          <span className={get('text', 'tertiary')}>Work Total:</span>
                          <span className="ml-1 font-medium">{report.works.total_assignments}</span>
                        </div>
                        <div>
                          <span className={get('text', 'tertiary')}>Completed:</span>
                          <span className="ml-1 font-medium text-emerald-600">
                            {report.works.work_status_counts.completed}
                          </span>
                        </div>
                      </div>

                      {report.inventory.has_activity && (
                        <div className="mt-2 text-xs">
                          <span className={get('text', 'tertiary')}>Inventory Logs:</span>
                          <span className="ml-1 font-medium">{report.inventory.summary.total_logs}</span>
                        </div>
                      )}

                      {report.date_range.start_date && (
                        <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                          {formatDate(report.date_range.start_date)} - {formatDate(report.date_range.end_date)}
                        </div>
                      )}
                    </div>
                  ))}

                  {academic_year_reports.length > 3 && (
                    <p className={combine("text-xs text-center mt-2", get('text', 'tertiary'))}>
                      + {academic_year_reports.length - 3} more academic years
                    </p>
                  )}
                </div>
              </div>
            )}

        {/* Refresh Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={fetchStaffOverview}
            className={combine(getPrimaryButtonClass(), "flex items-center space-x-3 px-8 py-4")}
          >
            <FaChartLine className="text-base" />
            <span className="text-base">Refresh Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
}
