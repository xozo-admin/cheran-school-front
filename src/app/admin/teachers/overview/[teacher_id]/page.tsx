// src/app/admin/teachers/overview/[teacher_id]/page.tsx
'use client';

import { adminApi, backend_api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaUserTie,
  FaArrowLeft,
  FaChartLine,
  FaCalendarCheck,
  FaBook,
  FaGraduationCap,
  FaMoneyBillWave,
  FaClipboardList,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaSchool,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationCircle,
  FaClock,
  FaPercentage,
  FaStar,
  FaChartBar,
  FaHistory,
  FaFileInvoiceDollar,
  FaClipboardCheck,
  FaInfoCircle,
  FaPrint,
  FaDownload,
  FaRegClock,
  FaRegCalendarAlt,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaAward,
  FaMedal,
  FaTrophy,
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
  FaDoorOpen,
  FaBookOpen,
  FaUsers,
  FaCalendarDay,
  FaCalendarWeek,
  FaSortAmountDown,
  FaSortAmountUp,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaClock as FaClockIcon,
  FaSpinner,
} from 'react-icons/fa';
import { MdClass, MdOutlineFamilyRestroom, MdWarning, MdEmail, MdLocationOn, MdBloodtype, MdLocalHospital, MdDirectionsBus, MdOutlineAttachMoney } from 'react-icons/md';
import { FiTrendingUp, FiTrendingDown, FiUser, FiBook, FiAlertCircle, FiHeart } from 'react-icons/fi';
import { GiRank3, GiAchievement, GiGraduateCap, GiNotebook, GiTeacher, GiSchoolBag, GiStarsStack, GiStarMedal } from 'react-icons/gi';
import { BsGraphUp, BsGraphDown, BsCalendarCheck, BsCalendarX, BsBarChartFill, BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastInfo } from '@/lib/toast';
import { useSchoolScope } from '@/components/admin/SchoolScopeSelector';
import { School } from 'lucide-react';

// Types based on API responses
interface ApiErrorResponse {
  error: string;
  message?: string;
  detail?: string;
}

interface AcademicYearReport {
  academic_year: string;
  is_current: boolean;
  date_range?: {
    start_date: string;
    end_date: string;
  };
  class_information: {
    is_class_teacher: boolean;
    class_teacher_of: {
      class: string | null;
      section: string | null;
    };
    sections_teaching: Array<{
      class: string;
      section: string;
    }>;
  };
  allocations: Array<{
    subject_name: string;
    subject_code: string;
    class: string;
  }>;
  attendance_history: {
    period?: string;
    from_date?: string | null;
    to_date?: string | null;
    based_on_joining_date?: boolean;
    mode?: string;
    note?: string;
    summary: {
      total_days_marked?: number;
      total_days_passed?: number;
      actual_working_days?: number;
      sundays?: number;
      holidays?: number;
      holiday_dates?: string[];
      present?: number;
      late?: number;
      absent?: number;
      present_days?: number;
      late_days?: number;
      absent_days?: number;
      percentage?: string;
    };
    records?: Array<{
      date: string;
      status: string;
      check_in_time: string | null;
    }>;
  };
  exam_and_performance?: {
    handled_subjects?: string[];
    handled_classes?: string[];
    exam_counts?: {
      total_scheduled?: number;
      upcoming?: number;
      current?: number;
      finished?: number;
    };
    mark_upload_status?: {
      due_by_exam_date?: number;
      uploaded?: number;
      pending?: number;
      upload_percentage?: number;
    };
    overall_marks?: {
      entries_count?: number;
      total_obtained_marks?: number;
      total_max_marks?: number;
      overall_percentage?: number;
      average_marks_per_entry?: number;
    };
    exam_details?: {
      upcoming?: Array<any>;
      current?: Array<any>;
      finished?: Array<any>;
    };
  };
}

interface TeacherOverviewData {
  current_academic_year: string | null;
  empty_state?: {
    has_reports: boolean;
    message: string | null;
  };
  personal_details: {
    teacher_id: string;
    name: string;
    email: string;
    phone: string;
    department: string;
    qualification: string;
    date_of_birth: string;
    joining_date?: string | null;
    address: string;
    profile_image?: string | null;
    bank_account_number?: string | null;
    ifsc_code?: string | null;
    account_holder_name?: string | null;
    bank_name?: string | null;
    upi_id?: string | null;
    extra_details?: {
      emergency_contact?: string;
      blood_group?: string;
      gender?: string;
      [key: string]: any;
    };
  };
  full_teacher_details?: {
    teacher_id?: string;
    name?: string;
    email?: string;
    phone?: string;
    department?: string;
    qualification?: string;
    date_of_birth?: string | null;
    joining_date?: string | null;
    address?: string | null;
    profile_image?: string | null;
    assigned_class?: string;
    bank_details?: {
      account_holder_name?: string | null;
      bank_name?: string | null;
      bank_account_number?: string | null;
      ifsc_code?: string | null;
      upi_id?: string | null;
    };
    extra_details?: Record<string, any>;
    today_attendance?: string;
    today_check_in_time?: string | null;
  };
  today_snapshot?: {
    date: string;
    today_attendance_status: string;
    attendance: {
      status: string;
      check_in_time: string | null;
    };
    classes: {
      day: string;
      count: number;
      list: Array<{
        period_no: number;
        start_time: string;
        end_time: string;
        subject: string;
        class: string;
        section: string;
      }>;
    };
  };
  transport?: {
    is_assigned: boolean;
    message?: string;
    bus: {
      bus_id: number | null;
      bus_number: string | null;
      registration_number: string | null;
      capacity: number | null;
      driver_name: string | null;
      route_id: number | null;
      route_start: string | null;
      route_end: string | null;
      is_live: boolean;
    } | null;
    stop: {
      stop_id: number | null;
      stop_name: string | null;
      order_number: number | null;
      arrival_time: string | null;
      latitude: number | null;
      longitude: number | null;
    } | null;
    today_bus_attendance: {
      date: string;
      morning: {
        is_marked: boolean;
        status: string;
        marked_by: string | null;
        updated_at: string | null;
      };
      evening: {
        is_marked: boolean;
        status: string;
        marked_by: string | null;
        updated_at: string | null;
      };
      overall_status: string;
    };
  };
  academic_year_reports: AcademicYearReport[];
  overall_stats?: {
    overall_score: number;
    overall_status: string;
    status_color: string;
    breakdown: {
      attendance: number;
      academics: number;
      workload: number;
      performance: number;
    };
    areas_needing_attention: string[];
    strengths: string[];
    last_updated: string;
  };
}

// Default empty data structures
const getDefaultTeacherData = (): TeacherOverviewData => ({
  current_academic_year: null,
  empty_state: {
    has_reports: false,
    message: null
  },
  personal_details: {
    teacher_id: '',
    name: '',
    email: '',
    phone: '',
    department: '',
    qualification: '',
    date_of_birth: '',
    joining_date: null,
    address: '',
    profile_image: null,
    bank_account_number: null,
    ifsc_code: null,
    account_holder_name: null,
    bank_name: null,
    upi_id: null,
    extra_details: {}
  },
  full_teacher_details: {
    profile_image: null,
    assigned_class: 'No Class Assigned',
    bank_details: {
      account_holder_name: null,
      bank_name: null,
      bank_account_number: null,
      ifsc_code: null,
      upi_id: null
    }
  },
  transport: {
    is_assigned: false,
    message: 'Teacher is not assigned to any bus',
    bus: null,
    stop: null,
    today_bus_attendance: {
      date: new Date().toISOString().split('T')[0],
      morning: {
        is_marked: false,
        status: 'Not Marked',
        marked_by: null,
        updated_at: null
      },
      evening: {
        is_marked: false,
        status: 'Not Marked',
        marked_by: null,
        updated_at: null
      },
      overall_status: 'Not Marked'
    }
  },
  academic_year_reports: [],
  overall_stats: {
    overall_score: 0,
    overall_status: 'Not Available',
    status_color: 'blue',
    breakdown: {
      attendance: 0,
      academics: 0,
      workload: 0,
      performance: 0
    },
    areas_needing_attention: [],
    strengths: [],
    last_updated: new Date().toISOString().split('T')[0]
  }
});

// Error message mapping
const getErrorMessage = (error: any): { title: string; message: string; icon: any; color: string } => {
  const errorMsg = error?.message || error?.error || error?.detail || 'Unknown error';

  if (errorMsg.includes('teacher_id parameter is required')) {
    return {
      title: 'Missing Teacher ID',
      message: 'Please provide a valid teacher ID to view the overview.',
      icon: <FaIdCard className="text-4xl" />,
      color: 'amber'
    };
  }

  if (errorMsg.includes('No Active Academic Year configured') || errorMsg.includes('Academic Years')) {
    return {
      title: 'Academic Year Not Configured',
      message: 'The current academic year has not been configured in the system. Please contact the administrator.',
      icon: <FaCalendarWeek className="text-4xl" />,
      color: 'orange'
    };
  }

  if (errorMsg.includes('Access Denied') || errorMsg.includes('not authorized')) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to view this teacher\'s details. Please contact your administrator if you need access.',
      icon: <FaLock className="text-4xl" />,
      color: 'red'
    };
  }

  if (errorMsg.includes('not found') && errorMsg.includes('Teacher with ID')) {
    return {
      title: 'Teacher Not Found',
      message: errorMsg,
      icon: <FaUserTie className="text-4xl" />,
      color: 'red'
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
    title: 'Error Loading Teacher',
    message: errorMsg || 'An unexpected error occurred while fetching teacher details.',
    icon: <FiAlertCircle className="text-4xl" />,
    color: 'red'
  };
};

// Helper function to determine if data exists
const hasData = (section: any): boolean => {
  if (!section) return false;

  if (typeof section === 'object') {
    // Check for arrays
    if (Array.isArray(section)) return section.length > 0;
    
    // Check for summary objects
    if (section.total_days_marked !== undefined) {
      return section.total_days_marked > 0 || section.present > 0 || section.absent > 0;
    }
    
    // Check if object has any non-empty properties
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

// Helper to get performance score color
const getPerformanceScoreColor = (score: number, max: number = 100) => {
  const percentage = (score / max) * 100;
  if (percentage >= 90) return 'text-emerald-600 dark:text-emerald-400';
  if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
  if (percentage >= 70) return 'text-amber-600 dark:text-amber-400';
  if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

// Helper to get progress bar color
const getProgressBarColor = (percentage: number) => {
  if (percentage >= 90) return 'bg-gradient-to-r from-emerald-500 to-green-500';
  if (percentage >= 80) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
  if (percentage >= 70) return 'bg-gradient-to-r from-amber-500 to-orange-500';
  if (percentage >= 60) return 'bg-gradient-to-r from-orange-500 to-red-500';
  return 'bg-gradient-to-r from-red-500 to-pink-500';
};

// Helper to get status badge class
const getStatusBadgeClass = (status: string, theme: any, get: any) => {
  const statusLower = status.toLowerCase();
  const colorMap: Record<string, string> = {
    present: 'emerald',
    absent: 'red',
    late: 'amber',
    'not marked': 'gray',
    active: 'emerald',
    inactive: 'gray',
    pending: 'amber',
    approved: 'emerald',
    rejected: 'red'
  };

  const color = colorMap[statusLower] || 'blue';
  
  return {
    bg: theme === 'dark' ? `from-${color}-900/40 to-${color}-800/40` : `from-${color}-100 to-${color}-200`,
    text: theme === 'dark' ? `text-${color}-300` : `text-${color}-700`,
    border: theme === 'dark' ? `border-${color}-800` : `border-${color}-200`
  };
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
    allocations: {
      icon: <FaBook className="text-3xl" />,
      title: "No Subject Allocations",
      description: customMessage || "This teacher hasn't been assigned any subjects yet.",
      color: 'emerald'
    },
    performance: {
      icon: <FaChartBar className="text-3xl" />,
      title: "No Performance Data",
      description: customMessage || "Performance records are not available.",
      color: 'pink'
    },
    classes: {
      icon: <FaSchool className="text-3xl" />,
      title: "No Class Assignments",
      description: customMessage || "This teacher hasn't been assigned to any classes.",
      color: 'amber'
    },
    today: {
      icon: <FaCalendarDay className="text-3xl" />,
      title: "No Today's Data",
      description: customMessage || "No information available for today.",
      color: 'purple'
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

export default function TeacherOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const schoolScope = useSchoolScope({ storageKey: 'allteachers_school_scope' });
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const teacher_id = params.teacher_id as string;

  const [loading, setLoading] = useState(true);
  const [teacherData, setTeacherData] = useState<TeacherOverviewData | null>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; icon: any; color: string } | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [attendanceView, setAttendanceView] = useState<'summary' | 'records'>('summary');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showExtraDetails, setShowExtraDetails] = useState(false);
  const [showApiData, setShowApiData] = useState(false);

  // Get current academic year report
  const currentYearReport = teacherData?.academic_year_reports?.find(report => report.is_current);
  
  // Get selected academic year report or default to current
  const activeReport:any = selectedAcademicYear 
    ? teacherData?.academic_year_reports?.find(report => report.academic_year === selectedAcademicYear)
    : currentYearReport || teacherData?.academic_year_reports?.[0];

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
      green: theme === 'dark' ? 'from-green-900/20 via-green-800/20 to-green-700/20' : 'from-green-50 via-green-100/50 to-green-200/30',
    };

    return combine(baseClasses, 'bg-gradient-to-br', colorMap[color] || colorMap.blue);
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

  // Helper to get status badge class
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
    if (!activeReport?.attendance_history?.summary) return 0;
    
    const summary = activeReport.attendance_history.summary;
    
    if (summary.percentage) {
      const percentageValue = parseFloat(summary.percentage.replace('%', ''));
      if (!isNaN(percentageValue)) return Math.round(percentageValue);
    }
    
    const present = summary.present_days || summary.present || 0;
    const total = summary.total_days_marked || 0;
    
    if (total === 0) return 0;
    return Math.round((present / total) * 100);
  };

  const attendancePercentage = calculateAttendancePercentage();

  // Get summary value with fallback
  const getSummaryValue = (field: string, fallback: number = 0) => {
    if (!activeReport?.attendance_history?.summary) return fallback;
    const summary = activeReport.attendance_history.summary as any;
    return summary[field] !== undefined ? summary[field] : fallback;
  };

  // Filter and paginate attendance records
  const getFilteredRecords = () => {
    if (!activeReport?.attendance_history?.records) return [];
    
    let records = [...activeReport.attendance_history.records];
    
    if (searchTerm) {
      records = records.filter(record => 
        record.date.includes(searchTerm) || 
        record.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterStatus !== 'all') {
      records = records.filter(record => 
        record.status.toLowerCase() === filterStatus.toLowerCase()
      );
    }
    
    records.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    return records;
  };

  const filteredRecords = getFilteredRecords();
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
  const paginatedRecords = filteredRecords.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Format date
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format time
  const formatTime = (timeString: string | null) => {
    if (!timeString) return '--:--';
    try {
      return new Date(timeString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  // Fetch teacher overview data
  const fetchTeacherOverview = async () => {
    setLoading(true);
    setError(null);
    setHttpStatus(null);
    setProfileImageError(false);

    try {
      const response = await adminApi.teachers.overview(teacher_id, schoolScope.scopeParams);
      setHttpStatus(response.status);

      const payload = response.data;
      const apiData = payload?.data || payload;
      if (!apiData || typeof apiData !== 'object') {
        throw new Error('Invalid response format');
      }

      const normalized: TeacherOverviewData = {
        ...getDefaultTeacherData(),
        ...apiData,
        personal_details: {
          ...getDefaultTeacherData().personal_details,
          ...(apiData.personal_details || {}),
        },
        full_teacher_details: {
          ...getDefaultTeacherData().full_teacher_details,
          ...(apiData.full_teacher_details || {}),
          bank_details: {
            ...getDefaultTeacherData().full_teacher_details?.bank_details,
            ...(apiData.full_teacher_details?.bank_details || {})
          }
        },
        today_snapshot: apiData.today_snapshot || undefined,
        transport: {
          ...getDefaultTeacherData().transport,
          ...(apiData.transport || {}),
          is_assigned: Boolean(apiData?.transport?.is_assigned),
          message: apiData?.transport?.message || getDefaultTeacherData().transport?.message,
          bus: apiData?.transport?.bus
            ? {
              bus_id: apiData.transport.bus.bus_id ?? null,
              bus_number: apiData.transport.bus.bus_number ?? null,
              registration_number: apiData.transport.bus.registration_number ?? null,
              capacity: apiData.transport.bus.capacity ?? null,
              driver_name: apiData.transport.bus.driver_name ?? null,
              route_id: apiData.transport.bus.route_id ?? null,
              route_start: apiData.transport.bus.route_start ?? null,
              route_end: apiData.transport.bus.route_end ?? null,
              is_live: Boolean(apiData.transport.bus.is_live)
            }
            : null,
          stop: apiData?.transport?.stop
            ? {
              stop_id: apiData.transport.stop.stop_id ?? null,
              stop_name: apiData.transport.stop.stop_name ?? null,
              order_number: apiData.transport.stop.order_number ?? null,
              arrival_time: apiData.transport.stop.arrival_time ?? null,
              latitude: apiData.transport.stop.latitude ?? null,
              longitude: apiData.transport.stop.longitude ?? null
            }
            : null,
          today_bus_attendance: {
            date: apiData?.transport?.today_bus_attendance?.date || getDefaultTeacherData().transport?.today_bus_attendance.date,
            morning: {
              is_marked: Boolean(apiData?.transport?.today_bus_attendance?.morning?.is_marked),
              status: apiData?.transport?.today_bus_attendance?.morning?.status || 'Not Marked',
              marked_by: apiData?.transport?.today_bus_attendance?.morning?.marked_by || null,
              updated_at: apiData?.transport?.today_bus_attendance?.morning?.updated_at || null
            },
            evening: {
              is_marked: Boolean(apiData?.transport?.today_bus_attendance?.evening?.is_marked),
              status: apiData?.transport?.today_bus_attendance?.evening?.status || 'Not Marked',
              marked_by: apiData?.transport?.today_bus_attendance?.evening?.marked_by || null,
              updated_at: apiData?.transport?.today_bus_attendance?.evening?.updated_at || null
            },
            overall_status: apiData?.transport?.today_bus_attendance?.overall_status || 'Not Marked'
          }
        },
        academic_year_reports: Array.isArray(apiData.academic_year_reports) ? apiData.academic_year_reports : [],
        empty_state: apiData.empty_state || getDefaultTeacherData().empty_state
      };

      setTeacherData(normalized);

      // Set selected academic year to current if available
      const currentYear = normalized.academic_year_reports?.find((r: AcademicYearReport) => r.is_current);
      if (currentYear) {
        setSelectedAcademicYear(currentYear.academic_year);
      } else if (normalized.academic_year_reports?.length > 0) {
        setSelectedAcademicYear(normalized.academic_year_reports[0].academic_year);
      } else {
        setSelectedAcademicYear('');
      }

      // toastSuccess('Teacher overview loaded successfully');
    } catch (error: any) {
      console.error('Error fetching teacher overview:', error);
      
      const errorResponse = error?.response?.data || error;
      const mappedError = getErrorMessage(errorResponse);
      setError(mappedError);
      
      if (error?.response?.status === 404 && errorResponse?.error?.includes('not found')) {
        setTimeout(() => {
          router.push('/admin/teachers');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (teacher_id) {
      fetchTeacherOverview();
    }
  }, [teacher_id, schoolScope.selectedSchoolId]);

  // Handle print report
  const handlePrintReport = () => {
    window.print();
  };

  // Handle export PDF
  const handleExportPDF = () => {
    toastInfo('PDF export feature coming soon!');
  };

  // Handle view full attendance
  const handleViewAttendance = () => {
    if (!teacherData?.personal_details) return;
    
    const params = new URLSearchParams({
      view: 'history',
      teacherId: teacherData.personal_details.teacher_id,
      teacherName: teacherData.personal_details.name,
      year: selectedAcademicYear || teacherData.current_academic_year || ''
    });
    
    router.push(`/admin/teachers/attendance?${params.toString()}`);
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
                Loading Teacher Overview
              </p>
              <p className={combine("text-base max-w-md mx-auto", get('text', 'secondary'))}>
                Fetching comprehensive profile and performance data for teacher ID: {teacher_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !teacherData) {
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
              {error?.title || 'Error Loading Teacher'}
            </h3>

            <p className={combine("text-base mb-6 text-center max-w-md", get('text', 'secondary'))}>
              {error?.message || 'Unable to load teacher overview. Please try again.'}
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
                onClick={fetchTeacherOverview}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2 px-6 py-3")}
              >
                <FaChartLine className="text-sm" />
                <span className="text-sm">Retry</span>
              </button>
            </div>

            {error?.message?.includes('not found') && (
              <p className={combine("text-sm mt-4", get('text', 'tertiary'))}>
                Redirecting to teachers list...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const { personal_details, full_teacher_details, today_snapshot, academic_year_reports, overall_stats, empty_state } = teacherData;
  const profileImageUrl = !profileImageError
    ? resolveProfileImageUrl(personal_details.profile_image || full_teacher_details?.profile_image || null)
    : null;
  const bankDetails = full_teacher_details?.bank_details;
  const transport = teacherData.transport || getDefaultTeacherData().transport;

  // Determine which sections have data
  const hasAttendance = activeReport?.attendance_history && hasData(activeReport.attendance_history.summary);
  const hasAllocations = activeReport?.allocations && activeReport.allocations.length > 0;
  const hasPerformance = activeReport?.exam_and_performance && 
    (activeReport.exam_and_performance.exam_counts?.total_scheduled > 0 || 
     activeReport.exam_and_performance.overall_marks?.entries_count > 0);
  const hasClasses = activeReport?.class_information?.sections_teaching?.length > 0;
  const hasTodayData = !!today_snapshot && hasData(today_snapshot);
  const todayClasses = today_snapshot?.classes?.list || [];
  const todayClassesCount = today_snapshot?.classes?.count || todayClasses.length || 0;

  return (
    <div className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            
            <div>
              <h1 className={combine("text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                Teacher Overview
              </h1>
              <p className={combine("text-sm mt-2 flex items-center", get('text', 'secondary'))}>
                <FaUserTie className="mr-2" />
                Complete profile and performance analysis
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {academic_year_reports && academic_year_reports.length > 1 && (
              <div className="flex items-center space-x-2 mr-2">
                <FaCalendarWeek className={combine("text-sm", get('text', 'tertiary'))} />
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
            <button
              onClick={() => router.back()}
              className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
            >
              <FaArrowLeft className="text-sm" />
              <span className="hidden sm:inline text-sm">Back</span>
            </button>
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

        {/* Teacher Profile Card */}
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
                    <span className="text-xs">ID: {personal_details.teacher_id}</span>
                  </span>

                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaBuilding className="text-xs" />
                    <span className="text-xs">{personal_details.department}</span>
                  </span>

                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaGraduationCap className="text-xs" />
                    <span className="text-xs">{personal_details.qualification}</span>
                  </span>

                  {activeReport?.class_information?.is_class_teacher && (
                    <span className={combine(
                      "flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                    )}>
                      <FaChalkboardTeacher className="text-xs" />
                      <span className="text-xs">
                        Class Teacher: {activeReport.class_information.class_teacher_of.class} - {activeReport.class_information.class_teacher_of.section}
                      </span>
                    </span>
                  )}
                  {full_teacher_details?.assigned_class && (
                    <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <FaSchool className="text-xs" />
                      <span className="text-xs">Assigned: {full_teacher_details.assigned_class}</span>
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
                      <div className={combine("text-md", get('text', 'secondary'))}>Joining Date</div>
                      <div className={combine("text-sm", get('text', 'primary'))}>
                        {personal_details.joining_date ? formatDate(personal_details.joining_date) : 'N/A'}
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
          )} onClick={() => setAttendanceView('summary')}>
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
                {getSummaryValue('present_days') || getSummaryValue('present') || 0}/
                {getSummaryValue('absent_days') || getSummaryValue('absent') || 0}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div
                className={combine("h-full rounded-full", getProgressBarColor(attendancePercentage))}
                style={{ width: `${Math.min(100, attendancePercentage)}%` }}
              ></div>
            </div>
          </div>

          {/* Allocations Card */}
          <div className={combine(
            getCardGradientClass('emerald'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                <FaBook className="text-emerald-600 dark:text-emerald-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasAllocations ? 'active' : 'inactive')}>
                {hasAllocations ? `${activeReport?.allocations?.length || 0} Subjects` : 'No Allocations'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Allocations</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Classes Taught</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {activeReport?.class_information?.sections_teaching?.length || 0}
              </span>
            </div>
            {hasAllocations && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Subjects: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {activeReport?.allocations?.map((a:any) => a.subject_name).slice(0, 2).join(', ')}
                  {(activeReport?.allocations?.length || 0) > 2 ? '...' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Performance Card */}
          <div className={combine(
            getCardGradientClass('pink'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100')}>
                <FaChartBar className="text-pink-600 dark:text-pink-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasPerformance ? 'active' : 'inactive')}>
                {hasPerformance ? 'Data Available' : 'No Data'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Performance</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Exams Scheduled</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {activeReport?.exam_and_performance?.exam_counts?.total_scheduled || 0}
              </span>
            </div>
            {activeReport?.exam_and_performance?.overall_marks?.overall_percentage && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Avg: </span>
                <span className={combine("font-medium", 
                  getPerformanceScoreColor(activeReport.exam_and_performance.overall_marks.overall_percentage)
                )}>
                  {activeReport.exam_and_performance.overall_marks.overall_percentage.toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Workload Card */}
          <div className={combine(
            getCardGradientClass('amber'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')}>
                <FaUsers className="text-amber-600 dark:text-amber-400 text-xl" />
              </div>
              <span className={getStatusBadgeClasses(hasClasses ? 'active' : 'inactive')}>
                {hasClasses ? `${activeReport?.class_information?.sections_teaching?.length || 0} Classes` : 'No Classes'}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Workload</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Total Allocations</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {activeReport?.allocations?.length || 0}
              </span>
            </div>
            {activeReport?.class_information?.sections_teaching?.length > 0 && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Class Teacher: </span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  {activeReport.class_information.is_class_teacher ? 'Yes' : 'No'}
                </span>
              </div>
            )}
          </div>
        </div>

        {!academic_year_reports?.length && (
          <div className={combine(
            getCardGradientClass('orange'),
            "flex items-start gap-3"
          )}>
            <FaExclamationCircle className="text-orange-500 mt-0.5" />
            <div>
              <p className={combine("text-sm font-semibold", get('text', 'primary'))}>No Academic Year Reports</p>
              <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                {empty_state?.message || 'This teacher does not have academic-year report data yet.'}
              </p>
            </div>
          </div>
        )}

        <div className={getCardGradientClass('green')}>
          <h3 className={combine("text-xl font-bold mb-4 flex items-center space-x-3", get('text', 'primary'))}>
            <MdOutlineAttachMoney className="text-xl" />
            <span>Full Teacher Details</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Assigned Class</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {full_teacher_details?.assigned_class || 'No Class Assigned'}
              </p>
            </div>
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-xs", get('text', 'tertiary'))}>Today Attendance</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {full_teacher_details?.today_attendance || today_snapshot?.today_attendance_status || 'Not Marked'}
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
              <p className={combine("text-xs", get('text', 'tertiary'))}>IFSC / UPI</p>
              <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                {(bankDetails?.ifsc_code || personal_details.ifsc_code || 'N/A')} / {(bankDetails?.upi_id || personal_details.upi_id || 'N/A')}
              </p>
            </div>
          </div>
        </div>

        <div className={getCardGradientClass('indigo')}>
          <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
            <MdDirectionsBus className="text-xl" />
            <span>Transport Details</span>
          </h3>

          {transport?.is_assigned ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Bus Number</p>
                  <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                    {transport.bus?.bus_number || 'N/A'}
                  </p>
                </div>
                <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Registration</p>
                  <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                    {transport.bus?.registration_number || 'N/A'}
                  </p>
                </div>
                <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Driver</p>
                  <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                    {transport.bus?.driver_name || 'Not Assigned'}
                  </p>
                </div>
                <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                  <p className={combine("text-xs", get('text', 'tertiary'))}>Bus Status</p>
                  <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                    {transport.bus?.is_live ? 'Live' : 'Not Live'}
                  </p>
                </div>
              </div>

              <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                <p className={combine("text-xs", get('text', 'tertiary'))}>Assigned Stop</p>
                <p className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                  {transport.stop?.stop_name || 'Not Assigned'}
                </p>
                <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                  Order: {transport.stop?.order_number ?? 'N/A'} • Time: {transport.stop?.arrival_time || 'N/A'}
                </p>
                {transport.stop?.latitude !== null && transport.stop?.longitude !== null && (
                  <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                    Location: {transport.stop?.latitude}, {transport.stop?.longitude}
                  </p>
                )}
              </div>

              <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                <div className="flex items-center justify-between mb-3">
                  <p className={combine("text-sm font-medium", get('text', 'primary'))}>Today Bus Attendance</p>
                  <span className={getStatusBadgeClasses(transport.today_bus_attendance?.overall_status || 'Not Marked')}>
                    {transport.today_bus_attendance?.overall_status || 'Not Marked'}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className={combine("p-3 rounded-lg", get('bg', 'primary'))}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Morning</p>
                    <div className="mt-2">
                      <span className={getStatusBadgeClasses(transport.today_bus_attendance?.morning?.status || 'Not Marked')}>
                        {transport.today_bus_attendance?.morning?.status || 'Not Marked'}
                      </span>
                    </div>
                  </div>
                  <div className={combine("p-3 rounded-lg", get('bg', 'primary'))}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Evening</p>
                    <div className="mt-2">
                      <span className={getStatusBadgeClasses(transport.today_bus_attendance?.evening?.status || 'Not Marked')}>
                        {transport.today_bus_attendance?.evening?.status || 'Not Marked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
              <p className={combine("text-sm", get('text', 'secondary'))}>
                {transport?.message || 'Teacher is not assigned to any bus.'}
              </p>
            </div>
          )}
        </div>

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
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Date of Birth</div>
                    <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                      {personal_details.date_of_birth ? formatDate(personal_details.date_of_birth) : 'Not Provided'}
                    </div>
                  </div>
                  <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Joining Date</div>
                    <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                      {personal_details.joining_date ? formatDate(personal_details.joining_date) : 'N/A'}
                    </div>
                  </div>
                </div>

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
                      <FaChevronLeft className={`text-xs transition-transform ${showExtraDetails ? 'rotate-90' : '-rotate-90'}`} />
                    </button>
                    
                    {showExtraDetails && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {Object.entries(personal_details.extra_details).map(([key, value]) => (
                          <div key={key} className={combine("p-2 rounded-lg text-xs", get('bg', 'secondary'))}>
                            <span className={combine("capitalize", get('text', 'tertiary'))}>
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className={combine("ml-1 font-medium", get('text', 'primary'))}>
                              {String(value) || 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Today's Snapshot */}
            <div className={getCardGradientClass('blue')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaCalendarDay className="text-xl" />
                <span>Today's Snapshot</span>
              </h3>

              {hasTodayData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
                    <div className="flex items-center space-x-3">
                      <FaCalendarCheck className={combine("text-xl",
                        today_snapshot.today_attendance_status?.toLowerCase() === 'present' ? 'text-emerald-500' :
                          today_snapshot.today_attendance_status?.toLowerCase() === 'absent' ? 'text-red-500' :
                            today_snapshot.today_attendance_status?.toLowerCase() === 'late' ? 'text-amber-500' : 'text-gray-400'
                      )} />
                      <div>
                        <div className={combine("text-sm", get('text', 'tertiary'))}>Attendance</div>
                        <div className={combine("text-base font-medium", get('text', 'primary'))}>
                          {today_snapshot.today_attendance_status || 'Not Marked'}
                        </div>
                      </div>
                    </div>
                    {today_snapshot.attendance?.check_in_time && (
                      <div className="text-right">
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Check-in</div>
                        <div className={combine("text-sm font-medium", get('text', 'primary'))}>
                          {formatTime(today_snapshot.attendance.check_in_time)}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={combine("text-sm font-medium", get('text', 'secondary'))}>
                        Today's Classes ({todayClassesCount})
                      </span>
                      {todayClassesCount > 0 && (
                        <span className={getStatusBadgeClasses('active')}>
                          {todayClassesCount} Scheduled
                        </span>
                      )}
                    </div>

                    {todayClasses.length > 0 ? (
                      <div className="space-y-2 pr-1">
                        {todayClasses.map((cls, index) => (
                          <div key={index} className={combine(
                            "p-2 rounded-lg flex items-center justify-between text-xs",
                            theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50'
                          )}>
                            <div className="flex items-center space-x-2">
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                Period {cls.period_no}
                              </span>
                              <span className={combine("text-xs", get('text', 'tertiary'))}>
                                {cls.start_time} - {cls.end_time}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                {cls.subject}
                              </span>
                              <span className={combine(
                                "px-2 py-0.5 rounded-full text-xs",
                                theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                              )}>
                                {cls.class}-{cls.section}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={combine("text-sm text-center py-4", get('text', 'tertiary'))}>
                        No classes scheduled for today
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('today').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    No information available for today
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Middle & Right Columns - Combined */}
          <div className="lg:col-span-2 space-y-6">
            {/* Attendance Section */}
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={combine("text-xl font-bold flex items-center space-x-3", get('text', 'primary'))}>
                  <FaCalendarCheck className="text-xl" />
                  <span>Attendance Overview - {activeReport?.academic_year || 'N/A'}</span>
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setAttendanceView('summary')}
                    className={combine(
                      "px-3 py-1.5 text-xs rounded-lg transition-all",
                      attendanceView === 'summary'
                        ? theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                        : get('bg', 'secondary')
                    )}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setAttendanceView('records')}
                    className={combine(
                      "px-3 py-1.5 text-xs rounded-lg transition-all",
                      attendanceView === 'records'
                        ? theme === 'dark' ? 'bg-purple-600 text-white' : 'bg-purple-500 text-white'
                        : get('bg', 'secondary')
                    )}
                  >
                    Records
                  </button>
                  <button
                    onClick={handleViewAttendance}
                    className={combine(
                      "p-1.5 rounded-lg transition-all",
                      get('icon', 'primary') + " hover:text-purple-600"
                    )}
                    title="View Full Attendance History"
                  >
                    <FaHistory className="text-sm" />
                  </button>
                </div>
              </div>

              {activeReport ? (
                hasAttendance ? (
                  <div className="space-y-6">
                    {attendanceView === 'summary' ? (
                      <>
                        {/* Attendance Note if any */}
                        {activeReport.attendance_history?.note && (
                          <div className={combine(
                            "mb-4 p-3 rounded-lg flex items-start space-x-2",
                            theme === 'dark' ? 'bg-amber-900/20' : 'bg-amber-50',
                            theme === 'dark' ? 'border border-amber-800' : 'border border-amber-200'
                          )}>
                            <FaExclamationCircle className={combine(
                              "flex-shrink-0 mt-0.5",
                              theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                            )} />
                            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                              {activeReport.attendance_history.note}
                            </p>
                          </div>
                        )}

                        {/* Summary Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                              {getSummaryValue('total_days_marked')}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>Marked Days</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-emerald-600">
                              {getSummaryValue('present_days') || getSummaryValue('present')}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>Present</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-red-600">
                              {getSummaryValue('absent_days') || getSummaryValue('absent')}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>Absent</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-amber-600">
                              {getSummaryValue('late_days') || getSummaryValue('late')}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>Late</div>
                          </div>
                        </div>

                        {/* Additional Stats */}
                        {(getSummaryValue('total_days_passed') > 0 || getSummaryValue('actual_working_days') > 0) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {getSummaryValue('total_days_passed') > 0 && (
                              <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                                <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                                  {getSummaryValue('total_days_passed')}
                                </p>
                                <p className={combine("text-xs", get('text', 'tertiary'))}>Days Passed</p>
                              </div>
                            )}
                            {getSummaryValue('actual_working_days') > 0 && (
                              <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                                <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                                  {getSummaryValue('actual_working_days')}
                                </p>
                                <p className={combine("text-xs", get('text', 'tertiary'))}>Working Days</p>
                              </div>
                            )}
                            {getSummaryValue('sundays') > 0 && (
                              <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                                <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                                  {getSummaryValue('sundays')}
                                </p>
                                <p className={combine("text-xs", get('text', 'tertiary'))}>Sundays</p>
                              </div>
                            )}
                            {getSummaryValue('holidays') > 0 && (
                              <div className={combine("p-2 rounded-lg text-center", get('bg', 'secondary'))}>
                                <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                                  {getSummaryValue('holidays')}
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
                            <span className={combine("text-sm font-bold", getPerformanceScoreColor(attendancePercentage))}>
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

                        {/* Date Range */}
                        {activeReport.attendance_history?.from_date && (
                          <div className="text-center">
                            <p className={combine("text-xs", get('text', 'tertiary'))}>
                              Period: {formatDate(activeReport.attendance_history.from_date)} - 
                              {activeReport.attendance_history.to_date ? formatDate(activeReport.attendance_history.to_date) : 'Present'}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Attendance Records */
                      <div>
                        {/* Search and Filter Controls */}
                        <div className="flex flex-col sm:flex-row gap-3 mb-4">
                          <div className="flex-1 relative">
                            <FaSearch className={combine(
                              "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs",
                              get('text', 'tertiary')
                            )} />
                            <input
                              type="text"
                              placeholder="Search by date..."
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
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="not marked">Not Marked</option>
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

                        {/* Records Table */}
                        {paginatedRecords.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className={combine("border-b", get('border', 'primary'))}>
                                  <th className="py-2 px-3 text-left font-medium">Date</th>
                                  <th className="py-2 px-3 text-left font-medium">Status</th>
                                  <th className="py-2 px-3 text-left font-medium">Check-in Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedRecords.map((record, index) => (
                                  <tr key={index} className={combine(
                                    "border-b",
                                    get('border', 'primary'),
                                    'hover:bg-[var(--color-bg-hover)] transition-colors'
                                  )}>
                                    <td className="py-2 px-3">
                                      <span className={get('text', 'primary')}>
                                        {formatDate(record.date)}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={getStatusBadgeClasses(record.status)}>
                                        {record.status}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className={get('text', 'secondary')}>
                                        {formatTime(record.check_in_time)}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <div className={combine(
                              "inline-block p-3 rounded-full mb-3",
                              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                            )}>
                              <FaClockIcon className={combine(
                                "text-xl",
                                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              )} />
                            </div>
                            <p className={combine("text-sm", get('text', 'secondary'))}>
                              {searchTerm || filterStatus !== 'all' 
                                ? 'No records match your filters' 
                                : 'No attendance records found for this period'}
                            </p>
                          </div>
                        )}

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between mt-4">
                            <p className={combine("text-xs", get('text', 'tertiary'))}>
                              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
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
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                    )}>
                      {getEmptyState('attendance', activeReport.attendance_history?.note).icon}
                    </div>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {activeReport.attendance_history?.note || getEmptyState('attendance').description}
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

            {/* Subject Allocations */}
            <div className={getCardGradientClass('emerald')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaBook className="text-xl" />
                <span>Subject Allocations - {activeReport?.academic_year || 'N/A'}</span>
              </h3>

              {activeReport ? (
                hasAllocations ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeReport.allocations.map((allocation:any, index:any) => (
                      <div key={index} className={combine(
                        "p-4 rounded-lg border",
                        get('border', 'primary'),
                        get('bg', 'secondary')
                      )}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center space-x-3 min-w-0">
                            <div className={combine(
                              "p-2 rounded-lg flex-shrink-0",
                              theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                            )}>
                              <FaBookOpen className={combine(
                                "text-sm",
                                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                              )} />
                            </div>
                            <div className="min-w-0">
                              <h4 className={combine("font-semibold text-sm truncate", get('text', 'primary'))}>
                                {allocation.subject_name}
                              </h4>
                              <p className={combine("text-xs truncate", get('text', 'tertiary'))}>
                                Code: {allocation.subject_code}
                              </p>
                            </div>
                          </div>
                          <span className={getStatusBadgeClasses('active')}>
                            Class {allocation.class}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                    )}>
                      {getEmptyState('allocations').icon}
                    </div>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      No subject allocations found for {activeReport.academic_year}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('allocations', 'No academic year selected').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    No subject allocation data available
                  </p>
                </div>
              )}
            </div>

            {/* Class Information */}
            <div className={getCardGradientClass('amber')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaSchool className="text-xl" />
                <span>Class Information - {activeReport?.academic_year || 'N/A'}</span>
              </h3>

              {activeReport ? (
                <div className="space-y-4">
                  {/* Class Teacher Status */}
                  <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className={combine("text-sm font-medium", get('text', 'primary'))}>
                          Class Teacher Status
                        </p>
                        <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                          {activeReport.class_information?.is_class_teacher 
                            ? `Currently class teacher for Class ${activeReport.class_information.class_teacher_of.class} - Section ${activeReport.class_information.class_teacher_of.section}`
                            : 'Not assigned as class teacher'}
                        </p>
                      </div>
                      <span className={getStatusBadgeClasses(activeReport.class_information?.is_class_teacher ? 'active' : 'inactive')}>
                        {activeReport.class_information?.is_class_teacher ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Sections Teaching */}
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>
                      Sections Teaching
                    </h4>
                    {activeReport.class_information?.sections_teaching?.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeReport.class_information.sections_teaching.map((section:any, index:any) => (
                          <div key={index} className={combine(
                            "p-3 rounded-lg flex items-center space-x-3",
                            get('bg', 'secondary')
                          )}>
                            <div className={combine(
                              "p-2 rounded-lg flex-shrink-0",
                              theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                            )}>
                              <FaUsers className={combine(
                                "text-sm",
                                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                              )} />
                            </div>
                            <div className="min-w-0">
                              <p className={combine("font-medium text-sm truncate", get('text', 'primary'))}>
                                Class {section.class}
                              </p>
                              <p className={combine("text-xs truncate", get('text', 'tertiary'))}>
                                Section {section.section}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={combine("text-sm text-center py-4", get('text', 'tertiary'))}>
                        No sections assigned for {activeReport.academic_year}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('classes', 'No academic year selected').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    No class information available
                  </p>
                </div>
              )}
            </div>

            
          </div>
        </div>

              {/* Performance Section */}
            <div className={getCardGradientClass('pink')}>
              <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
                <FaChartBar className="text-xl" />
                <span>Academic Performance - {activeReport?.academic_year || 'N/A'}</span>
              </h3>

              {activeReport ? (
                hasPerformance ? (
                  <div className="space-y-6">
                    {/* Exam Counts */}
                    {activeReport.exam_and_performance?.exam_counts && (
                      <div>
                        <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>
                          Exam Overview
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className={combine("p-3 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className={combine("text-lg font-bold", get('text', 'primary'))}>
                              {activeReport.exam_and_performance.exam_counts.total_scheduled || 0}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Total</p>
                          </div>
                          <div className={combine("p-3 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className="text-lg font-bold text-emerald-500">
                              {activeReport.exam_and_performance.exam_counts.finished || 0}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Finished</p>
                          </div>
                          <div className={combine("p-3 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className="text-lg font-bold text-amber-500">
                              {activeReport.exam_and_performance.exam_counts.current || 0}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Current</p>
                          </div>
                          <div className={combine("p-3 rounded-lg text-center", get('bg', 'secondary'))}>
                            <p className="text-lg font-bold text-blue-500">
                              {activeReport.exam_and_performance.exam_counts.upcoming || 0}
                            </p>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Upcoming</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Mark Upload Status */}
                    {activeReport.exam_and_performance?.mark_upload_status && (
                      <div>
                        <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>
                          Mark Upload Status
                        </h4>
                        <div className={combine("p-4 rounded-lg", get('bg', 'secondary'))}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={combine("text-xs", get('text', 'primary'))}>
                              Upload Progress
                            </span>
                            <span className={combine("text-xs font-bold", get('text', 'primary'))}>
                              {activeReport.exam_and_performance.mark_upload_status.upload_percentage?.toFixed(1) || 0}%
                            </span>
                          </div>
                          <div className={combine("h-2 rounded-full overflow-hidden mb-3", get('bg', 'primary'))}>
                            <div 
                              className={combine("h-full rounded-full", getProgressBarColor(activeReport.exam_and_performance.mark_upload_status.upload_percentage || 0))}
                              style={{ width: `${activeReport.exam_and_performance.mark_upload_status.upload_percentage || 0}%` }}
                            ></div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className={combine("text-sm font-bold", get('text', 'primary'))}>
                                {activeReport.exam_and_performance.mark_upload_status.due_by_exam_date || 0}
                              </p>
                              <p className={combine("text-xs", get('text', 'tertiary'))}>Due</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-emerald-500">
                                {activeReport.exam_and_performance.mark_upload_status.uploaded || 0}
                              </p>
                              <p className={combine("text-xs", get('text', 'tertiary'))}>Uploaded</p>
                            </div>
                            <div>
                              <p className="text-sm font-bold text-amber-500">
                                {activeReport.exam_and_performance.mark_upload_status.pending || 0}
                              </p>
                              <p className={combine("text-xs", get('text', 'tertiary'))}>Pending</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Overall Marks */}
                    {activeReport.exam_and_performance?.overall_marks && activeReport.exam_and_performance.overall_marks.entries_count > 0 && (
                      <div>
                        <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>
                          Overall Performance
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Total Entries</p>
                            <p className={combine("text-lg font-bold", get('text', 'primary'))}>
                              {activeReport.exam_and_performance.overall_marks.entries_count}
                            </p>
                          </div>
                          <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Overall Percentage</p>
                            <p className={combine("text-lg font-bold", getPerformanceScoreColor(activeReport.exam_and_performance.overall_marks.overall_percentage || 0))}>
                              {activeReport.exam_and_performance.overall_marks.overall_percentage?.toFixed(1) || 0}%
                            </p>
                          </div>
                          <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Total Obtained</p>
                            <p className={combine("text-lg font-bold", get('text', 'primary'))}>
                              {activeReport.exam_and_performance.overall_marks.total_obtained_marks?.toFixed(1) || 0}
                            </p>
                          </div>
                          <div className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                            <p className={combine("text-xs", get('text', 'tertiary'))}>Total Max Marks</p>
                            <p className={combine("text-lg font-bold", get('text', 'primary'))}>
                              {activeReport.exam_and_performance.overall_marks.total_max_marks?.toFixed(1) || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Handled Subjects/Classes */}
                    {(activeReport.exam_and_performance?.handled_subjects?.length > 0 || activeReport.exam_and_performance?.handled_classes?.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {activeReport.exam_and_performance.handled_subjects?.length > 0 && (
                          <div>
                            <h4 className={combine("text-sm font-medium mb-2", get('text', 'secondary'))}>
                              Subjects Handled
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {activeReport.exam_and_performance.handled_subjects.map((subject:any, index:any) => (
                                <span
                                  key={index}
                                  className={combine(
                                    "px-2 py-1 rounded-full text-xs",
                                    theme === 'dark' ? 'bg-pink-900/30 text-pink-300' : 'bg-pink-100 text-pink-700'
                                  )}
                                >
                                  {subject}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {activeReport.exam_and_performance.handled_classes?.length > 0 && (
                          <div>
                            <h4 className={combine("text-sm font-medium mb-2", get('text', 'secondary'))}>
                              Classes Handled
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {activeReport.exam_and_performance.handled_classes.map((className:any, index:any) => (
                                <span
                                  key={index}
                                  className={combine(
                                    "px-2 py-1 rounded-full text-xs",
                                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  )}
                                >
                                  Class {className}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {(activeReport.exam_and_performance?.exam_details?.upcoming?.length ||
                      activeReport.exam_and_performance?.exam_details?.current?.length ||
                      activeReport.exam_and_performance?.exam_details?.finished?.length) ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { label: 'Upcoming', list: activeReport.exam_and_performance?.exam_details?.upcoming || [] },
                          { label: 'Current', list: activeReport.exam_and_performance?.exam_details?.current || [] },
                          { label: 'Finished', list: activeReport.exam_and_performance?.exam_details?.finished || [] },
                        ].map((group) => (
                          <div key={group.label} className={combine("p-3 rounded-lg", get('bg', 'secondary'))}>
                            <p className={combine("text-xs font-semibold mb-2", get('text', 'secondary'))}>
                              {group.label} Exams ({group.list.length})
                            </p>
                            {group.list.length > 0 ? (
                              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {group.list.slice(0, 8).map((exam: any, idx: number) => (
                                  <div key={idx} className={combine("text-xs", get('text', 'primary'))}>
                                    <p className="font-medium">{exam.subject || 'Subject'}</p>
                                    <p className={get('text', 'tertiary')}>
                                      {exam.exam_type || 'Exam'} • {exam.exam_date ? formatDate(exam.exam_date) : 'No date'}
                                    </p>
                                    <p className={get('text', 'tertiary')}>
                                      Term: {exam.term || 'N/A'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className={combine("text-xs", get('text', 'tertiary'))}>No exams</p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                    )}>
                      {getEmptyState('performance', activeReport.exam_and_performance ? 'No performance data available' : undefined).icon}
                    </div>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {activeReport.exam_and_performance ? 'No performance data available' : getEmptyState('performance').description}
                    </p>
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <div className={combine(
                    "inline-block p-4 rounded-full mb-4",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-100'
                  )}>
                    {getEmptyState('performance', 'No academic year selected').icon}
                  </div>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    No performance data available
                  </p>
                </div>
              )}
            </div>
           
        {/* Refresh Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={fetchTeacherOverview}
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
