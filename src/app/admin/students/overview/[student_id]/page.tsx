// src/app/admin/students/overview/[student_id]/page.tsx
'use client';

import { adminApi, backend_api } from '@/lib/api';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  FaUserGraduate,
  FaArrowLeft,
  FaChartLine,
  FaCalendarCheck,
  FaBook,
  FaGraduationCap,
  FaMoneyBillWave,
  FaClipboardList,
  FaUserFriends,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaSchool,
  FaUserTie,
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
  FaBed,
  FaClipboardCheck,
  FaBalanceScale,
  FaInfoCircle,
  FaPrint,
  FaDownload,
  FaShare,
  FaRegSadTear,
  FaRegFrownOpen,
  FaRegSmile,
  FaRegGrinStars,
  FaChartPie,
  FaCalculator,
  FaUsers,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaMoneyCheckAlt,
  FaReceipt,
  FaFileMedicalAlt,
  FaClipboard,
  FaChalkboardTeacher,
  FaIdCard,
  FaExclamationTriangle,
  FaLock,
  FaServer,
  FaDatabase,
  FaPlug,
  FaRegClock,
  FaRegCalendarAlt,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaRegQuestionCircle,
  FaAward,
  FaMedal,
  FaTrophy,
  FaRibbon,
  FaSpinner,
} from 'react-icons/fa';
import { IoMdStats, IoMdSchool, IoMdPerson, IoMdContacts } from 'react-icons/io';
import { MdClass, MdOutlineFamilyRestroom, MdOutlinePayment, MdOutlineAttachMoney, MdOutlineAccountBalance, MdWarning, MdEmail, MdLocationOn, MdBloodtype, MdLocalHospital, MdDirectionsBus } from 'react-icons/md';
import { FiCalendar, FiDollarSign, FiTrendingUp, FiTrendingDown, FiUser, FiBook, FiAlertCircle, FiHeart } from 'react-icons/fi';
import { GiRank3, GiAchievement, GiGraduateCap, GiNotebook, GiTeacher, GiSchoolBag, GiStarsStack, GiStarMedal, GiStarSwirl } from 'react-icons/gi';
import { BsGraphUp, BsGraphDown, BsCalendarCheck, BsCalendarX, BsBarChartFill, BsPieChartFill, BsStarFill, BsStarHalf, BsStar } from 'react-icons/bs';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError } from '@/lib/toast';
import { useSchoolScope } from '@/components/admin/SchoolScopeSelector';
import { School } from 'lucide-react';

// Types based on API responses
interface ApiErrorResponse {
  error: string;
  message?: string;
}

interface StudentOverview {
  status?: number;
  message?: string;
  timestamp?: string;
  data: {
    profile: {
      student_id: string;
      student_name: string;
      profile_image: string | null;
      gender: string;
      date_of_birth: string | null;
      age: number | null;
      student_email: string | null;
      address: string | null;
      date_of_admission: string;
      extra_details: {
        blood_group?: string;
        medical_conditions?: string;
        transport_route?: string;
      };
    };
    academic: {
      academic_year: string;
      class: string | null;
      section: string | null;
      class_teacher: {
        name: string;
        teacher_id: string | null;
      };
      roll_number: string | null;
      enrollment_status: string;
      promoted: boolean;
    };
    parents: {
      father_name: string | null;
      mother_name: string | null;
      father_phone: string | null;
      mother_phone: string | null;
      emergency_contact: string;
    };
    today_snapshot?: {
      date: string;
      today_attendance_status: string;
      attendance: {
        date: string;
        status: string;
        is_marked: boolean;
        remarks: string | null;
      };
    };
    attendance: {
      today?: {
        date: string;
        status: string;
        is_marked: boolean;
        remarks: string | null;
      };
      overall: {
        total_days_marked?: number;
        total_days_passed?: number;
        actual_working_days?: number;
        sundays?: number;
        holidays?: number;
        holiday_dates?: string[];
        present: number;
        absent: number;
        late: number;
        attendance_percentage: number;
        total_days?: number;
      };
      current_month: {
        month: string;
        present: number;
        absent: number;
        late: number;
        sundays?: number;
        holidays?: number;
        working_days?: number;
        total?: number;
        attendance_percentage: number;
      };
      recent_attendance?: Array<{ date: string; status: string }>;
      last_updated: string | null;
    };
    exams: {
      total_exams_taken: number;
      upcoming_exams?: any[];
      current_exams?: any[];
      finished_exams?: any[];
      exam_performance?: Array<{
        exam_name: string;
        term: string;
        total_marks: number;
        obtained_marks: number;
        percentage: number;
        subjects?: Array<{
          subject: string;
          marks_obtained: number;
          total_marks: number;
          grade: string;
          percentage: number;
        }>;
      }>;
      subject_ranking: Array<{
        subject: string;
        average_percentage: number;
        total_exams: number;
      }>;
      best_subject: {
        subject: string;
        average_percentage: number;
        total_exams: number;
      } | null;
      needs_improvement: {
        subject: string;
        average_percentage: number;
        total_exams: number;
      } | null;
      exam_status_summary?: {
        upcoming: number;
        current: number;
        finished: number;
      };
      overall_average: number;
      message?: string;
    };
    behavior: {
      total_reports: number;
      overall_score: number;
      behavior_rating: string;
      term_averages: Array<{
        term: string;
        average_score: number;
        total_subjects: number;
      }>;
      reports: Array<{
        term: string;
        subject: string;
        participation: number;
        responsibility: number;
        discipline: number;
        attitude: number;
        collaboration: number;
        average_score: number;
        remarks: string;
        posted_by: string;
        date: string;
      }>;
      last_updated: string | null;
      message?: string;
    };
    fees: {
      total_fees: number;
      total_amount: number;
      total_paid: number;
      total_concession: number;
      total_due: number;
      payment_status: string;
      fee_details: Array<{
        fee_type: string;
        total_amount: number;
        paid_amount: number;
        concession: number;
        due_amount: number;
        status: string;
        due_date: string;
        installments: number;
      }>;
      recent_payments: Array<{
        date: string;
        amount: number;
        mode: string;
        transaction_id: string;
        fee_type: string;
      }>;
      payment_summary: {
        cleared: number;
        partial: number;
        unpaid: number;
      };
      message?: string;
    };
    leaves: {
      total_leaves: number;
      approved: number;
      pending: number;
      rejected: number;
      days_taken_current_year: number;
      leave_details: Array<{
        start_date: string;
        end_date: string;
        duration_days: number;
        reason: string;
        status: string;
        approved_by: string | null;
        admin_comment: string | null;
        applied_date: string;
        has_proof: boolean;
      }>;
      recent_leaves: any[];
      current_status: string;
      message?: string;
    };
    transport: {
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
    overall_stats: {
      overall_score: number;
      overall_status: string;
      status_color: string;
      breakdown: {
        attendance: number;
        academics: number;
        behavior: number;
        fees: number;
      };
      areas_needing_attention: string[];
      strengths: string[];
      last_updated: string;
    };
  };
}

// Default empty data structures based on API partial responses
const getDefaultStudentData = (): StudentOverview['data'] => ({
  profile: {
    student_id: '',
    student_name: '',
    profile_image: null,
    gender: '',
    date_of_birth: null,
    age: null,
    student_email: null,
    address: null,
    date_of_admission: new Date().toISOString().split('T')[0],
    extra_details: {}
  },
  academic: {
    academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    class: null,
    section: null,
    class_teacher: {
      name: 'Not Assigned',
      teacher_id: null
    },
    roll_number: null,
    enrollment_status: 'Active',
    promoted: false
  },
  parents: {
    father_name: null,
    mother_name: null,
    father_phone: null,
    mother_phone: null,
    emergency_contact: 'Not Available'
  },
  attendance: {
    today: {
      date: new Date().toISOString().split('T')[0],
      status: 'Not Marked',
      is_marked: false,
      remarks: null
    },
    overall: {
      total_days_marked: 0,
      total_days_passed: 0,
      actual_working_days: 0,
      sundays: 0,
      holidays: 0,
      holiday_dates: [],
      present: 0,
      absent: 0,
      late: 0,
      attendance_percentage: 0,
      total_days: 0
    },
    current_month: {
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      present: 0,
      absent: 0,
      late: 0,
      sundays: 0,
      holidays: 0,
      working_days: 0,
      total: 0,
      attendance_percentage: 0
    },
    recent_attendance: [],
    last_updated: null
  },
  exams: {
    total_exams_taken: 0,
    upcoming_exams: [],
    current_exams: [],
    finished_exams: [],
    exam_performance: [],
    subject_ranking: [],
    best_subject: null,
    needs_improvement: null,
    exam_status_summary: {
      upcoming: 0,
      current: 0,
      finished: 0
    },
    overall_average: 0
  },
  behavior: {
    total_reports: 0,
    overall_score: 0,
    behavior_rating: 'Not Rated',
    term_averages: [],
    reports: [],
    last_updated: null,
    message: 'No behavior reports found'
  },
  fees: {
    total_fees: 0,
    total_amount: 0,
    total_paid: 0,
    total_concession: 0,
    total_due: 0,
    payment_status: 'No Fees',
    fee_details: [],
    recent_payments: [],
    payment_summary: {
      cleared: 0,
      partial: 0,
      unpaid: 0
    },
    message: 'No fee records found'
  },
  leaves: {
    total_leaves: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    days_taken_current_year: 0,
    leave_details: [],
    recent_leaves: [],
    current_status: 'No Leave Records',
    message: 'No leave records found'
  },
  transport: {
    is_assigned: false,
    message: 'Student is not assigned to any bus',
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
  overall_stats: {
    overall_score: 0,
    overall_status: 'Not Available',
    status_color: 'blue',
    breakdown: {
      attendance: 0,
      academics: 0,
      behavior: 0,
      fees: 0
    },
    areas_needing_attention: [],
    strengths: [],
    last_updated: new Date().toISOString().split('T')[0]
  }
});

// Error message mapping for better user understanding
const getErrorMessage = (error: any): { title: string; message: string; icon: any; color: string } => {
  const errorMsg = error?.message || error?.error || 'Unknown error';

  if (errorMsg.includes('student_id parameter is required')) {
    return {
      title: 'Missing Student ID',
      message: 'Please provide a valid student ID to view the overview.',
      icon: <FaIdCard className="text-4xl" />,
      color: 'amber'
    };
  }

  if (errorMsg.includes('No Active Academic Year configured')) {
    return {
      title: 'Academic Year Not Configured',
      message: 'The current academic year has not been configured in the system. Please contact the administrator.',
      icon: <FaCalendar className="text-4xl" />,
      color: 'orange'
    };
  }

  if (errorMsg.includes('Access Denied') || errorMsg.includes('not authorized')) {
    return {
      title: 'Access Denied',
      message: 'You do not have permission to view this student\'s details. Please contact your administrator if you need access.',
      icon: <FaLock className="text-4xl" />,
      color: 'red'
    };
  }

  if (errorMsg.includes('not found') && errorMsg.includes('Student with ID')) {
    return {
      title: 'Student Not Found',
      message: errorMsg,
      icon: <FaUserGraduate className="text-4xl" />,
      color: 'red'
    };
  }

  if (errorMsg.includes('not enrolled in the current academic year')) {
    return {
      title: 'Not Enrolled',
      message: errorMsg,
      icon: <FaGraduationCap className="text-4xl" />,
      color: 'amber'
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

  if (errorMsg.includes('Database connection error') || errorMsg.includes('integrity error') || errorMsg.includes('duplicate key')) {
    return {
      title: 'Database Error',
      message: 'A database error occurred. Please try again later or contact support if the problem persists.',
      icon: <FaDatabase className="text-4xl" />,
      color: 'red'
    };
  }

  return {
    title: 'Error Loading Student',
    message: errorMsg || 'An unexpected error occurred while fetching student details.',
    icon: <FiAlertCircle className="text-4xl" />,
    color: 'red'
  };
};

// Helper function to determine if data exists in a section
const hasData = (section: any): boolean => {
  if (!section) return false;

  // "message" can coexist with valid payload keys in some endpoints.
  if (section.message && typeof section === 'object') {
    const { message, ...rest } = section;
    if (Object.keys(rest).length === 0) return false;
  }

  // Check arrays
  if (Array.isArray(section)) return section.length > 0;

  // Check objects with common empty patterns
  if (typeof section === 'object') {
    // For attendance
    if (section.total_days_marked !== undefined) {
      return section.total_days_marked > 0 || section.present > 0 || section.absent > 0;
    }

    // For exams
    if (section.total_exams_taken !== undefined) {
      return section.total_exams_taken > 0;
    }

    // For behavior
    if (section.total_reports !== undefined) {
      return section.total_reports > 0;
    }

    // For fees
    if (section.total_fees !== undefined) {
      return section.total_fees > 0;
    }

    // For leaves
    if (section.total_leaves !== undefined) {
      return section.total_leaves > 0;
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

const asNumber = (value: any, fallback: number = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

// Helper to get behavior score color
const getBehaviorScoreColor = (score: number) => {
  if (score >= 4.5) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 4.0) return 'text-green-600 dark:text-green-400';
  if (score >= 3.5) return 'text-blue-600 dark:text-blue-400';
  if (score >= 3.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
};

// Helper to get behavior badge class
const getBehaviorBadgeClass = (score: number) => {
  if (score >= 4.5) return 'emerald';
  if (score >= 4.0) return 'green';
  if (score >= 3.5) return 'blue';
  if (score >= 3.0) return 'amber';
  return 'red';
};

// Helper to render star rating
const renderStars = (score: number) => {
  const fullStars = Math.floor(score);
  const hasHalfStar = score % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center space-x-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <BsStarFill key={`full-${i}`} className="text-yellow-400 text-xs" />
      ))}
      {hasHalfStar && <BsStarHalf className="text-yellow-400 text-xs" />}
      {[...Array(emptyStars)].map((_, i) => (
        <BsStar key={`empty-${i}`} className="text-yellow-400 text-xs" />
      ))}
    </div>
  );
};

export default function StudentOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const schoolScope = useSchoolScope({ storageKey: 'allstudents_school_scope' });
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const student_id = params.student_id as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentData, setStudentData] = useState<StudentOverview['data'] | null | any>(null);
  const [profileImageError, setProfileImageError] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const [error, setError] = useState<{ title: string; message: string; icon: any; color: string } | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const pageContentRef = useRef<HTMLDivElement | null>(null);

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
      indigo: theme === 'dark' ? 'from-indigo-900/20 via-indigo-800/20 to-indigo-700/20' : 'from-indigo-50 via-indigo-100/50 to-indigo-200/30',
      purple: theme === 'dark' ? 'from-purple-900/20 via-purple-800/20 to-purple-700/20' : 'from-purple-50 via-purple-100/50 to-purple-200/30',
      green: theme === 'dark' ? 'from-green-900/20 via-green-800/20 to-green-700/20' : 'from-green-50 via-green-100/50 to-green-200/30',
      red: theme === 'dark' ? 'from-red-900/20 via-red-800/20 to-red-700/20' : 'from-red-50 via-red-100/50 to-red-200/30',
      orange: theme === 'dark' ? 'from-orange-900/20 via-orange-800/20 to-orange-700/20' : 'from-orange-50 via-orange-100/50 to-orange-200/30',
    };

    return combine(baseClasses, 'bg-gradient-to-br', colorMap[color] || colorMap.blue);
  };

  const getPrimaryButtonClass = () => combine(
    'px-6 py-3.5 rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 hover:from-blue-700 hover:via-blue-600 hover:to-blue-700'
      : 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500 hover:from-blue-600 hover:via-blue-500 hover:to-blue-600'
  );

  const getSecondaryButtonClass = () => combine(
    'px-4 py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/40 to-blue-800/40' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/40 to-emerald-800/40' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      pink: {
        bg: theme === 'dark' ? 'from-pink-900/40 to-pink-800/40' : 'from-pink-100 to-pink-200',
        text: theme === 'dark' ? 'text-pink-300' : 'text-pink-700',
        border: theme === 'dark' ? 'border-pink-800' : 'border-pink-200'
      },
      amber: {
        bg: theme === 'dark' ? 'from-amber-900/40 to-amber-800/40' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/40 to-indigo-800/40' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/40 to-purple-800/40' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      red: {
        bg: theme === 'dark' ? 'from-red-900/40 to-red-800/40' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
      green: {
        bg: theme === 'dark' ? 'from-green-900/40 to-green-800/40' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
      orange: {
        bg: theme === 'dark' ? 'from-orange-900/40 to-orange-800/40' : 'from-orange-100 to-orange-200',
        text: theme === 'dark' ? 'text-orange-300' : 'text-orange-700',
        border: theme === 'dark' ? 'border-orange-800' : 'border-orange-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-gradient-to-r from-emerald-500 to-green-500';
    if (percentage >= 80) return 'bg-gradient-to-r from-blue-500 to-indigo-500';
    if (percentage >= 70) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (percentage >= 60) return 'bg-gradient-to-r from-orange-500 to-red-500';
    return 'bg-gradient-to-r from-red-500 to-pink-500';
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 90) return 'text-emerald-600 dark:text-emerald-400';
    if (percentage >= 80) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 70) return 'text-amber-600 dark:text-amber-400';
    if (percentage >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getTransportAttendanceClass = (status: string) => {
    if (status === 'Present') {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    }
    if (status === 'Absent') {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    }
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const normalizeSubjectName = (subject: string): string => (
    subject
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, ' ')
      .replace(/[\/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mathematics: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    maths: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    english: { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' },
    science: { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'general science': { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'social studies': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    sanskrit: { bg: '#78350F', text: '#FFFFFF', border: '#78350F' },
    malayalam: { bg: '#047857', text: '#FFFFFF', border: '#047857' },
    telugu: { bg: '#0891B2', text: '#FFFFFF', border: '#0891B2' },
    kannada: { bg: '#115E59', text: '#FFFFFF', border: '#115E59' },
    urdu: { bg: '#064E3B', text: '#FFFFFF', border: '#064E3B' },
    french: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    'business studies': { bg: '#7F1D1D', text: '#FFFFFF', border: '#7F1D1D' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    commerce: { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    'commerce general': { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    civics: { bg: '#334155', text: '#FFFFFF', border: '#334155' },
    'political science': { bg: '#581C87', text: '#FFFFFF', border: '#581C87' },
    psychology: { bg: '#BE185D', text: '#FFFFFF', border: '#BE185D' },
    sociology: { bg: '#4D7C0F', text: '#FFFFFF', border: '#4D7C0F' },
    'physical education': { bg: '#059669', text: '#FFFFFF', border: '#059669' },
    yoga: { bg: '#2DD4BF', text: '#111827', border: '#2DD4BF' },
    art: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    drawing: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    'art drawing': { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value education': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'moral science value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'environmental studies': { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];
    const cleaned = normalized
      .replace(/\b(subject|theory|practical|lab|core|elective)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (SUBJECT_COLOR_MAP[cleaned]) return SUBJECT_COLOR_MAP[cleaned];
    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (cleaned.includes(key) || key.includes(cleaned)) return value;
    }
    return null;
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const getEmojiForScore = (score: number) => {
    if (score >= 90) return { emoji: '🎯', label: 'Excellent' };
    if (score >= 80) return { emoji: '👍', label: 'Good' };
    if (score >= 70) return { emoji: '📈', label: 'Improving' };
    if (score >= 60) return { emoji: '⚠️', label: 'Needs Attention' };
    return { emoji: '🔄', label: 'Requires Action' };
  };

  const handleViewAttendance = () => {
  // Encode the parameters in the URL
  const params = new URLSearchParams({
    view: 'history',
    studentId: studentData.profile.student_id,
    studentName: studentData.profile.student_name,
    year: studentData.academic.academic_year // You can make this dynamic if needed
  });
  
  // Redirect to attendance page with query parameters
  router.push(`/admin/students/attendance?${params.toString()}`);
};


  const getEmptyState = (type: string, customMessage?: string) => {
    const emptyStates: { [key: string]: { icon: any; title: string; description: string; color: string } } = {
      exams: {
        icon: <FaBook className="text-3xl" />,
        title: "No Exam Records",
        description: customMessage || "This student hasn't taken any exams yet.",
        color: 'emerald'
      },
      behavior: {
        icon: <FaClipboardCheck className="text-3xl" />,
        title: "No Behavior Reports",
        description: customMessage || "No behavior reports have been submitted yet.",
        color: 'pink'
      },
      fees: {
        icon: <FaMoneyBillWave className="text-3xl" />,
        title: "No Fee Records",
        description: customMessage || "No fee information is available.",
        color: 'amber'
      },
      leaves: {
        icon: <FaClipboardList className="text-3xl" />,
        title: "No Leave Records",
        description: customMessage || "This student hasn't applied for any leaves yet.",
        color: 'purple'
      },
      attendance: {
        icon: <FaCalendarCheck className="text-3xl" />,
        title: "No Attendance Data",
        description: customMessage || "Attendance records are not available.",
        color: 'blue'
      },
      academic: {
        icon: <GiGraduateCap className="text-3xl" />,
        title: "Academic Data Not Found",
        description: customMessage || "Academic information is not available.",
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

  const fetchStudentOverview = async (isRefresh: boolean = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    setHttpStatus(null);
    setProfileImageError(false);

    try {
      const response = await adminApi.students.overview(student_id, schoolScope.scopeParams);
      setHttpStatus(response.status);
      const payload = response.data;
      const overviewData = payload?.data || payload;
      if (!overviewData || typeof overviewData !== 'object') {
        throw new Error(payload?.error || payload?.message || 'Student overview data is missing');
      }

      const normalizedData: StudentOverview['data'] = {
        ...getDefaultStudentData(),
        ...overviewData,
        profile: {
          ...getDefaultStudentData().profile,
          ...overviewData?.profile,
          date_of_admission: overviewData?.profile?.date_of_admission || getDefaultStudentData().profile.date_of_admission,
          profile_image: resolveProfileImageUrl(overviewData?.profile?.profile_image || null),
          extra_details: overviewData?.profile?.extra_details || {}
        },
        academic: {
          ...getDefaultStudentData().academic,
          ...overviewData?.academic,
          class_teacher: {
            name: overviewData?.academic?.class_teacher?.name || 'Not Assigned',
            teacher_id: overviewData?.academic?.class_teacher?.teacher_id || null
          },
          class: overviewData?.academic?.class || null,
          section: overviewData?.academic?.section || null
        },
        parents: {
          father_name: overviewData?.parents?.father_name || null,
          mother_name: overviewData?.parents?.mother_name || null,
          father_phone: overviewData?.parents?.father_phone || null,
          mother_phone: overviewData?.parents?.mother_phone || null,
          emergency_contact: overviewData?.parents?.emergency_contact || 'Not Available'
        },
        attendance: {
          ...getDefaultStudentData().attendance,
          ...overviewData?.attendance,
          overall: {
            ...getDefaultStudentData().attendance.overall,
            ...overviewData?.attendance?.overall,
            total_days: asNumber(overviewData?.attendance?.overall?.total_days) ||
              asNumber(overviewData?.attendance?.overall?.total_days_marked),
            attendance_percentage: asNumber(overviewData?.attendance?.overall?.attendance_percentage)
          },
          current_month: {
            ...getDefaultStudentData().attendance.current_month,
            ...overviewData?.attendance?.current_month,
            month: overviewData?.attendance?.current_month?.month ||
              new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
            total: asNumber(overviewData?.attendance?.current_month?.total) ||
              asNumber(overviewData?.attendance?.current_month?.working_days)
          },
          recent_attendance: overviewData?.attendance?.recent_attendance || [],
          today: overviewData?.attendance?.today || overviewData?.today_snapshot?.attendance || {
            date: new Date().toISOString().split('T')[0],
            status: 'Not Marked',
            is_marked: false,
            remarks: null
          }
        },
        exams: {
          ...getDefaultStudentData().exams,
          ...overviewData?.exams,
          total_exams_taken: asNumber(overviewData?.exams?.total_exams_taken),
          exam_performance: overviewData?.exams?.exam_performance || [],
          subject_ranking: overviewData?.exams?.subject_ranking || [],
          best_subject: overviewData?.exams?.best_subject || null,
          needs_improvement: overviewData?.exams?.needs_improvement || null,
          overall_average: asNumber(overviewData?.exams?.overall_average)
        },
        behavior: {
          ...getDefaultStudentData().behavior,
          ...overviewData?.behavior,
          total_reports: asNumber(overviewData?.behavior?.total_reports),
          overall_score: asNumber(overviewData?.behavior?.overall_score),
          behavior_rating: overviewData?.behavior?.behavior_rating || 'Not Rated',
          term_averages: overviewData?.behavior?.term_averages || [],
          reports: overviewData?.behavior?.reports || []
        },
        fees: {
          ...getDefaultStudentData().fees,
          ...overviewData?.fees,
          total_fees: asNumber(overviewData?.fees?.total_fees),
          total_amount: asNumber(overviewData?.fees?.total_amount),
          total_paid: asNumber(overviewData?.fees?.total_paid),
          total_concession: asNumber(overviewData?.fees?.total_concession),
          total_due: asNumber(overviewData?.fees?.total_due),
          payment_status: overviewData?.fees?.payment_status || 'No Fees',
          fee_details: overviewData?.fees?.fee_details || [],
          recent_payments: overviewData?.fees?.recent_payments || []
        },
        leaves: {
          ...getDefaultStudentData().leaves,
          ...overviewData?.leaves,
          total_leaves: asNumber(overviewData?.leaves?.total_leaves),
          approved: asNumber(overviewData?.leaves?.approved),
          pending: asNumber(overviewData?.leaves?.pending),
          rejected: asNumber(overviewData?.leaves?.rejected),
          days_taken_current_year: asNumber(overviewData?.leaves?.days_taken_current_year),
          leave_details: overviewData?.leaves?.leave_details || [],
          recent_leaves: overviewData?.leaves?.recent_leaves || [],
          current_status: overviewData?.leaves?.current_status || 'No Leave Records'
        },
        transport: {
          ...getDefaultStudentData().transport,
          ...overviewData?.transport,
          is_assigned: Boolean(overviewData?.transport?.is_assigned),
          message: overviewData?.transport?.message || getDefaultStudentData().transport.message,
          bus: overviewData?.transport?.bus
            ? {
              bus_id: overviewData.transport.bus.bus_id ?? null,
              bus_number: overviewData.transport.bus.bus_number ?? null,
              registration_number: overviewData.transport.bus.registration_number ?? null,
              capacity: asNumber(overviewData.transport.bus.capacity, 0),
              driver_name: overviewData.transport.bus.driver_name ?? null,
              route_id: overviewData.transport.bus.route_id ?? null,
              route_start: overviewData.transport.bus.route_start ?? null,
              route_end: overviewData.transport.bus.route_end ?? null,
              is_live: Boolean(overviewData.transport.bus.is_live)
            }
            : null,
          stop: overviewData?.transport?.stop
            ? {
              stop_id: overviewData.transport.stop.stop_id ?? null,
              stop_name: overviewData.transport.stop.stop_name ?? null,
              order_number: overviewData.transport.stop.order_number ?? null,
              arrival_time: overviewData.transport.stop.arrival_time ?? null,
              latitude: overviewData.transport.stop.latitude ?? null,
              longitude: overviewData.transport.stop.longitude ?? null
            }
            : null,
          today_bus_attendance: {
            date: overviewData?.transport?.today_bus_attendance?.date || getDefaultStudentData().transport.today_bus_attendance.date,
            morning: {
              is_marked: Boolean(overviewData?.transport?.today_bus_attendance?.morning?.is_marked),
              status: overviewData?.transport?.today_bus_attendance?.morning?.status || 'Not Marked',
              marked_by: overviewData?.transport?.today_bus_attendance?.morning?.marked_by || null,
              updated_at: overviewData?.transport?.today_bus_attendance?.morning?.updated_at || null
            },
            evening: {
              is_marked: Boolean(overviewData?.transport?.today_bus_attendance?.evening?.is_marked),
              status: overviewData?.transport?.today_bus_attendance?.evening?.status || 'Not Marked',
              marked_by: overviewData?.transport?.today_bus_attendance?.evening?.marked_by || null,
              updated_at: overviewData?.transport?.today_bus_attendance?.evening?.updated_at || null
            },
            overall_status: overviewData?.transport?.today_bus_attendance?.overall_status || 'Not Marked'
          }
        },
        overall_stats: {
          ...getDefaultStudentData().overall_stats,
          ...overviewData?.overall_stats,
          overall_score: asNumber(overviewData?.overall_stats?.overall_score),
          overall_status: overviewData?.overall_stats?.overall_status || 'Not Available',
          status_color: overviewData?.overall_stats?.status_color || 'blue',
          breakdown: {
            attendance: asNumber(overviewData?.overall_stats?.breakdown?.attendance) ||
              (hasData(overviewData?.attendance) ? asNumber(overviewData?.attendance?.overall?.attendance_percentage) : 0),
            academics: asNumber(overviewData?.overall_stats?.breakdown?.academics) ||
              (hasData(overviewData?.exams) ? asNumber(overviewData?.exams?.overall_average) : 0),
            behavior: asNumber(overviewData?.overall_stats?.breakdown?.behavior) ||
              (hasData(overviewData?.behavior) ? asNumber(overviewData?.behavior?.overall_score) * 20 : 0),
            fees: asNumber(overviewData?.overall_stats?.breakdown?.fees) ||
              (hasData(overviewData?.fees) && asNumber(overviewData?.fees?.total_amount) > 0
                ? (asNumber(overviewData?.fees?.total_paid) / asNumber(overviewData?.fees?.total_amount)) * 100
                : 0)
          },
          areas_needing_attention: overviewData?.overall_stats?.areas_needing_attention || [],
          strengths: overviewData?.overall_stats?.strengths || []
        }
      };


      setStudentData(normalizedData);

    } catch (error: any) {
      console.error('Error fetching student overview:', error);
      const statusCode = error?.response?.status || null;
      const errorPayload = error?.response?.data || error;
      const parsedError = getErrorMessage(errorPayload);
      setHttpStatus(statusCode);
      setError(parsedError);
      setStudentData(null);
      toastError(parsedError.message);

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (student_id) {
      fetchStudentOverview(false);
    }
  }, [student_id, schoolScope.selectedSchoolId]);

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

  // Update the handlePrintReport function
const handlePrintReport = () => {
  // Get current theme to preserve colors
  const currentTheme = theme;

  // Create print-specific styles
  const printStyles = `
    <style>
      @media print {
        /* Hide interactive elements */
        button:not(.print-button), 
        .no-print,
        [onclick],
        .cursor-pointer,
        .hover\\:scale-105 {
          display: none !important;
        }
        
        /* Keep print button visible */
        .print-button {
          display: block !important;
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          background: #2563eb !important;
          color: white !important;
          padding: 10px 20px !important;
          border-radius: 8px !important;
          border: none !important;
          font-size: 14px !important;
          cursor: pointer !important;
        }
        
        /* Page setup with margins */
        @page {
          size: A4;
          margin: 1.5cm;
        }
        
        /* Base styles */
        body {
          margin: 0;
          padding: 20px;
          background: ${currentTheme === 'dark' ? '#1f2937' : '#ffffff'};
          color: ${currentTheme === 'dark' ? '#f3f4f6' : '#111827'};
          font-family: Arial, sans-serif;
        }
        
        /* Preserve all original styling */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Keep cards together */
        .grid > div,
        [class*="rounded-xl"],
        [class*="bg-gradient-to-br"] {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Prevent orphaned headings */
        h1, h2, h3, h4, h5, h6 {
          page-break-after: avoid;
        }
        
        /* Ensure all content is visible */
        .overflow-y-auto {
          overflow: visible !important;
          max-height: none !important;
        }
        
        /* Fix flex layouts */
        .flex {
          display: flex !important;
        }
        
        .flex-col {
          flex-direction: column !important;
        }
        
        .md\\:flex-row {
          flex-direction: row !important;
        }
        
        /* Grid layouts */
        .grid {
          display: grid !important;
        }
        
        .grid-cols-1 {
          grid-template-columns: repeat(1, 1fr) !important;
        }
        
        .lg\\:grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .sm\\:grid-cols-2 {
          grid-template-columns: repeat(2, 1fr) !important;
        }
        
        .xl\\:grid-cols-3 {
          grid-template-columns: repeat(3, 1fr) !important;
        }
        
        /* Spacing */
        .gap-4 {
          gap: 16px !important;
        }
        
        .gap-6 {
          gap: 24px !important;
        }
        
        .space-y-6 > * + * {
          margin-top: 24px !important;
        }
        
        /* Print header */
        .print-header {
          display: block !important;
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .print-header h1 {
          font-size: 24px;
          font-weight: bold;
          margin: 0 0 10px 0;
          color: ${currentTheme === 'dark' ? '#f3f4f6' : '#111827'};
        }
        
        .print-header p {
          font-size: 14px;
          margin: 5px 0;
          color: ${currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
        }
        
        /* Print footer */
        .print-footer {
          display: block !important;
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          font-size: 11px;
          color: ${currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
        }
        
        /* Ensure backgrounds print properly */
        [class*="bg-"] {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        /* Fix text colors in dark mode */
        .dark\\:text-gray-300,
        .dark\\:text-gray-400 {
          color: ${currentTheme === 'dark' ? '#d1d5db' : 'inherit'} !important;
        }
        
        /* Fix progress bars */
        [class*="h-1.5"] {
          height: 6px !important;
          border-radius: 9999px !important;
          overflow: hidden !important;
        }
        
        /* Ensure images are visible */
        img {
          max-width: 100% !important;
          height: auto !important;
        }
        
        /* Page number */
        .page-number:after {
          content: "Page " counter(page);
          position: running(footer);
        }
      }
      
      /* Hide print elements in screen view */
      .print-header, .print-footer {
        display: none;
      }
    </style>
  `;

  // Create print header with student info
  const printHeader = `
    <div class="print-header">
      <h1>Student Overview Report</h1>
      <p>${studentData?.profile?.student_name} (ID: ${studentData?.profile?.student_id})</p>
      <p>Class: ${studentData?.academic?.class || 'N/A'} - ${studentData?.academic?.section || 'N/A'} | Generated: ${new Date().toLocaleString()}</p>
    </div>
  `;

  // Create print footer
  const printFooter = `
    <div class="print-footer">
      <p>© ${new Date().getFullYear()} School Management System - Confidential Student Report</p>
    </div>
  `;

  // Get the main content
  const mainContent = pageContentRef.current?.innerHTML || '';

  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Overview - ${studentData?.profile?.student_name}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://cdn.tailwindcss.com"></script>
          ${printStyles}
        </head>
        <body>
          <button onclick="window.print()" class="print-button">
            🖨️ Print Report
          </button>
          ${printHeader}
          <div class="print-content" style="max-width: 1200px; margin: 0 auto;">
            ${mainContent}
          </div>
          ${printFooter}
          <script>
            // Auto-trigger print dialog after a short delay
            setTimeout(() => {
              window.print();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  } else {
    // Fallback to regular print
    window.print();
  }
};

// Update the handleExportPDF function
const handleExportPDF = async () => {
  try {
    if (!pageContentRef.current) {
      toastError('Page content is not ready for PDF export.');
      return;
    }

    // Show loading toast
    toastSuccess('Preparing PDF export...');

    // Dynamically import required libraries
    const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);
    const html2canvas = (await import('html2canvas')).default;

    // Get current theme to preserve colors
    const currentTheme = theme;

    // Create a clone of the content for PDF generation
    const contentClone = pageContentRef.current.cloneNode(true) as HTMLElement;
    
    // Remove ONLY interactive buttons
    const interactiveButtons = contentClone.querySelectorAll('button:not(.keep-in-pdf)');
    interactiveButtons.forEach(btn => btn.remove());
    
    // Remove the refresh button container
    const refreshContainer = contentClone.querySelector('.flex.justify-center.mt-10');
    if (refreshContainer) refreshContainer.remove();

    // Add PDF-specific styles with margins
    const pdfStyles = document.createElement('style');
    pdfStyles.textContent = `
      /* Preserve all original styling */
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Page setup */
      @page {
        size: A4;
        margin: 1.5cm;
      }
      
      /* Keep cards together */
      .grid > div, [class*="rounded-xl"] {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Ensure proper spacing */
      body {
        padding: 20px;
        background: ${currentTheme === 'dark' ? '#1f2937' : '#ffffff'};
      }
      
      /* PDF header */
      .pdf-header {
        text-align: center;
        margin-bottom: 30px;
        padding-bottom: 20px;
        border-bottom: 2px solid #e5e7eb;
      }
      
      .pdf-header h1 {
        font-size: 24px;
        font-weight: bold;
        margin: 0 0 10px 0;
        color: ${currentTheme === 'dark' ? '#f3f4f6' : '#111827'};
      }
      
      .pdf-header p {
        font-size: 14px;
        margin: 5px 0;
        color: ${currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
      }
      
      /* PDF footer */
      .pdf-footer {
        text-align: center;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        font-size: 11px;
        color: ${currentTheme === 'dark' ? '#9ca3af' : '#6b7280'};
      }
      
      /* Ensure grid layouts work */
      .grid {
        display: grid !important;
      }
      
      .lg\\:grid-cols-2 {
        grid-template-columns: repeat(2, 1fr) !important;
      }
      
      /* Fix any overflow issues */
      .overflow-y-auto {
        overflow: visible !important;
        max-height: none !important;
      }
    `;
    contentClone.appendChild(pdfStyles);

    // Add PDF header
    const pdfHeader = document.createElement('div');
    pdfHeader.className = 'pdf-header';
    pdfHeader.innerHTML = `
      <h1>Student Overview Report</h1>
      <p>${studentData?.profile?.student_name} (ID: ${studentData?.profile?.student_id})</p>
      <p>Class: ${studentData?.academic?.class || 'N/A'} - ${studentData?.academic?.section || 'N/A'} | Generated: ${new Date().toLocaleString()}</p>
    `;
    contentClone.insertBefore(pdfHeader, contentClone.firstChild);

    // Add PDF footer
    const pdfFooter = document.createElement('div');
    pdfFooter.className = 'pdf-footer';
    pdfFooter.innerHTML = `© ${new Date().getFullYear()} School Management System - Confidential Student Report`;
    contentClone.appendChild(pdfFooter);

    // Create temporary container
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '0';
    tempContainer.style.width = '1200px';
    tempContainer.style.backgroundColor = currentTheme === 'dark' ? '#1f2937' : '#f3f4f6';
    tempContainer.style.padding = '20px';
    tempContainer.appendChild(contentClone);
    document.body.appendChild(tempContainer);

    try {
      // Wait for images to load
      await Promise.all([
        new Promise(resolve => setTimeout(resolve, 1000)),
        ...Array.from(tempContainer.getElementsByTagName('img')).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => { img.onload = resolve; img.onerror = resolve; });
        })
      ]);

      // Setup PDF with margins
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      // Define margins (in pixels)
      const margin = {
        top: 60,
        bottom: 60,
        left: 50,
        right: 50
      };

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Available area for content
      const contentWidth = pdfWidth - margin.left - margin.right;
      const contentHeight = pdfHeight - margin.top - margin.bottom;

      // Get total content height
      const totalHeight = tempContainer.scrollHeight;
      
      // Calculate scale and pages
      const scale = contentWidth / 1200; // 1200px is container width
      const scaledTotalHeight = totalHeight * scale;
      const totalPages = Math.ceil(scaledTotalHeight / contentHeight);

      // Capture each page
      for (let page = 0; page < totalPages; page++) {
        // Calculate capture position
        const captureY = page * (contentHeight / scale);
        const captureHeight = Math.min(
          contentHeight / scale,
          totalHeight - captureY
        );

        // Capture this chunk
        const canvas = await html2canvas(tempContainer, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: currentTheme === 'dark' ? '#1f2937' : '#ffffff',
          logging: false,
          windowWidth: 1200,
          y: captureY,
          height: captureHeight,
          onclone: (clonedDoc) => {
            // Add page number to header
            if (page === 0) {
              const pageNum = clonedDoc.createElement('div');
              pageNum.style.textAlign = 'right';
              pageNum.style.fontSize = '10px';
              pageNum.style.color = '#6b7280';
              pageNum.style.marginBottom = '10px';
              pageNum.innerHTML = `Page ${page + 1} of ${totalPages}`;
              clonedDoc.body.insertBefore(pageNum, clonedDoc.body.firstChild);
            }
          }
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate scaling for this chunk
        const chunkScale = contentWidth / imgWidth;
        const scaledChunkHeight = imgHeight * chunkScale;
        
        if (page > 0) {
          pdf.addPage();
        }

        // Add page number at top right
        pdf.setFontSize(8);
        pdf.setTextColor(107, 114, 128);
        pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth - margin.right - 30, margin.top - 20);

        // Add image with margins
        pdf.addImage(
          imgData,
          'PNG',
          margin.left,
          margin.top,
          contentWidth,
          scaledChunkHeight,
          undefined,
          'FAST'
        );
      }

      // Save PDF
      const safeName = (studentData?.profile?.student_name || student_id || 'student')
        .toString()
        .replace(/[^a-zA-Z0-9_-]/g, '_');
      
      pdf.save(`student_overview_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toastSuccess('PDF exported successfully!');
    } finally {
      // Clean up
      document.body.removeChild(tempContainer);
    }
  } catch (err) {
    console.error('PDF export failed:', err);
    toastError('Failed to export PDF. Please try again or use Print instead.');
  }
};



  // Loading state
  if (loading) {
    return (
      <div className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <School className="h-8 w-8 text-blue-600 animate-pulse" />
                </div>
              </div>
              <p className={combine("text-xl font-bold mb-3", get('text', 'primary'))}>
                Loading Student Overview
              </p>
              <p className={combine("text-base max-w-md mx-auto", get('text', 'secondary'))}>
                Fetching comprehensive profile and performance data for student ID: {student_id}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !studentData) {
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
              {error?.title || 'Error Loading Student'}
            </h3>

            <p className={combine("text-base mb-6 text-center max-w-md", get('text', 'secondary'))}>
              {error?.message || 'Unable to load student overview. Please try again.'}
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
                onClick={() => fetchStudentOverview(false)}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2 px-6 py-3")}
              >
                <FaChartLine className="text-sm" />
                <span className="text-sm">Retry</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Determine which sections have data
  const hasExams = hasData(studentData.exams) && (
    (studentData.exams.total_exams_taken || 0) > 0 ||
    (studentData.exams.subject_ranking?.length || 0) > 0 ||
    (studentData.exams.upcoming_exams?.length || 0) > 0 ||
    (studentData.exams.current_exams?.length || 0) > 0 ||
    (studentData.exams.finished_exams?.length || 0) > 0
  );
  const hasBehavior = hasData(studentData.behavior) && (
    (studentData.behavior.total_reports || 0) > 0 ||
    (studentData.behavior.reports?.length || 0) > 0 ||
    (studentData.behavior.term_averages?.length || 0) > 0
  );
  const hasFees = hasData(studentData.fees) && (
    (studentData.fees.total_fees || 0) > 0 ||
    (studentData.fees.fee_details?.length || 0) > 0 ||
    (studentData.fees.recent_payments?.length || 0) > 0
  );
  const hasLeaves = hasData(studentData.leaves) && (
    (studentData.leaves.total_leaves || 0) > 0 ||
    (studentData.leaves.leave_details?.length || 0) > 0
  );
  const hasAttendance = hasData(studentData.attendance) && (
    (studentData.attendance.overall.total_days_marked || 0) > 0 ||
    studentData.attendance.overall.present > 0 ||
    (studentData.attendance.recent_attendance?.length || 0) > 0 ||
    !!studentData.attendance.today?.is_marked
  );
  const profileImageUrl = !profileImageError ? studentData.profile.profile_image : null;

  return (
    <div ref={pageContentRef} className={`dashboard-typography p-3 sm:p-4 lg:p-6 ${combine(get('bg', 'primary'), 'transition-colors duration-200 min-h-screen')}`}>
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div>
              <h1 className={combine("text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                Student Overview
              </h1>
              <p className={combine("text-sm mt-2 flex items-center", get('text', 'secondary'))}>
                <FaUserGraduate className="mr-2" />
                Complete profile and performance analysis
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {showBackButton && (
              <button
                onClick={() => router.back()}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaArrowLeft className="text-sm" />
                <span className="text-sm">Back</span>
              </button>
            )}

            {/* <button
              onClick={handlePrintReport}
              className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
            >
              <FaPrint className="text-sm" />
              <span className="hidden sm:inline text-sm">Print</span>
            </button> */}
            <button
              onClick={handleExportPDF}
              className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
            >
              <FaDownload className="text-sm" />
              <span className="hidden sm:inline text-sm">Export</span>
            </button>
          </div>
        </div>

        {/* Student Profile Card */}
        <div className={combine(
          getCardGradientClass('blue'),
          "relative overflow-hidden"
        )}>


          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={combine(
                "h-24 w-24 rounded-2xl flex items-center justify-center shadow-xl",
                studentData.profile.gender === 'Male'
                  ? theme === 'dark' ? 'bg-gradient-to-br from-blue-900/40 to-blue-800/40' : 'bg-gradient-to-br from-blue-100 to-blue-200'
                  : studentData.profile.gender === 'Female'
                    ? theme === 'dark' ? 'bg-gradient-to-br from-pink-900/40 to-pink-800/40' : 'bg-gradient-to-br from-pink-100 to-pink-200'
                    : theme === 'dark' ? 'bg-gradient-to-br from-purple-900/40 to-purple-800/40' : 'bg-gradient-to-br from-purple-100 to-purple-200'
              )}>
                {profileImageUrl ? (
                  <img
                    src={profileImageUrl}
                    alt={`${studentData.profile.student_name} profile`}
                    className="h-24 w-24 rounded-2xl object-cover"
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <FaUserGraduate className={
                    studentData.profile.gender === 'Male'
                      ? theme === 'dark' ? 'text-blue-400 text-4xl' : 'text-blue-600 text-4xl'
                      : studentData.profile.gender === 'Female'
                        ? theme === 'dark' ? 'text-pink-400 text-4xl' : 'text-pink-600 text-4xl'
                        : theme === 'dark' ? 'text-purple-400 text-4xl' : 'text-purple-600 text-4xl'
                  } />
                )}
              </div>
              <div>
                <div className='mb-3'>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {studentData.profile.student_name}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaIdCard className="text-xs" />
                    <span className="text-xs">ID: {studentData.profile.student_id}</span>
                  </span>

                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaVenusMars className="text-xs" />
                    <span className="text-xs">{studentData.profile.gender || 'Not Specified'}</span>
                  </span>
                  {studentData.profile.age && (
                    <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <FaBirthdayCake className="text-xs" />
                      <span className="text-xs">{studentData.profile.age} years</span>
                    </span>
                  )}
                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>

                    <IoMdSchool className="text-xs" />
                    <span className="text-xs">
                      Class {studentData.academic.class || 'N/A'} - Sec {studentData.academic.section || 'N/A'}
                    </span>
                  </span>

                  <span className={combine("flex items-center space-x-1 px-3 py-1 rounded-full",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaChalkboardTeacher className="text-xs" />
                    <span className="text-xs">{studentData.academic.class_teacher.name || 'Not Assigned'}</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">

                <div className={combine(
                  "p-3 sm:p-4 rounded-xl",
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                )}>
                  <div className="flex items-center space-x-3">
                    <FaCalendarCheck className={combine("text-xl",
                      studentData.attendance.today?.status === 'Present' ? 'text-emerald-500' :
                        studentData.attendance.today?.status === 'Absent' ? 'text-red-500' :
                          studentData.attendance.today?.status === 'Late' ? 'text-amber-500' : 'text-gray-400'
                    )} />
                    <div>
                      <div className={combine("text-md", get('text', 'secondary'))}>Attendance Today</div>
                      <div className={combine("text-sm", get('text', 'primary'))}>
                        <span className={combine("text-lg ",
                          studentData.attendance.today?.status === 'Present' ? 'text-emerald-600' :
                            studentData.attendance.today?.status === 'Absent' ? 'text-red-600' :
                              studentData.attendance.today?.status === 'Late' ? 'text-amber-600' : 'text-gray-600'
                        )}>
                          {studentData.attendance.today?.status || 'Not Marked'}
                        </span>
                        {studentData.attendance.today?.is_marked && (
                          <FaCheckCircle className="text-emerald-500 text-sm" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={combine(
                  "p-3 sm:p-4 rounded-xl",
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                )}>
                  <div className="flex items-center space-x-3">
                    <FaRegCalendarAlt className="text-xl text-indigo-500" />
                    <div>
                      <div className={combine("text-md", get('text', 'secondary'))}>Academic Year</div>
                      <div className={combine("text-sm", get('text', 'primary'))}>
                        {studentData.academic.academic_year}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={combine(
                  "p-3 sm:p-4 rounded-xl",
                  theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                )}>
                  <div className="flex items-center space-x-3">
                    <FaCalendarAlt className="text-xl text-indigo-500" />
                    <div>
                      <div className={combine("text-md", get('text', 'secondary'))}>Admission Date</div>
                      <div className={combine("text-sm", get('text', 'primary'))}>
                        {new Date(studentData.profile.date_of_admission).toLocaleDateString()}
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
              <span className={getStatusBadgeClass(
                studentData.attendance.overall.attendance_percentage >= 90 ? 'emerald' :
                  studentData.attendance.overall.attendance_percentage >= 75 ? 'blue' :
                    studentData.attendance.overall.attendance_percentage >= 60 ? 'amber' : 'red'
              )}>
                {studentData.attendance.overall.attendance_percentage.toFixed(1)}%
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Attendance</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Present/Absent</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {studentData.attendance.overall.present}/{studentData.attendance.overall.absent}
              </span>
            </div>
            <div className="mt-3 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
              <div
                className={combine("h-full rounded-full", getProgressBarColor(studentData.attendance.overall.attendance_percentage))}
                style={{ width: `${Math.min(100, studentData.attendance.overall.attendance_percentage)}%` }}
              ></div>
            </div>
          </div>

          {/* Academic Card */}
          <div className={combine(
            getCardGradientClass('emerald'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                <GiGraduateCap className="text-emerald-600 dark:text-emerald-400 text-xl" />
              </div>
              <span className={getStatusBadgeClass(
                studentData.exams.overall_average >= 90 ? 'emerald' :
                  studentData.exams.overall_average >= 75 ? 'green' :
                    studentData.exams.overall_average >= 60 ? 'blue' : 'amber'
              )}>
                {studentData.exams.overall_average.toFixed(1)}%
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Academic</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Exams Taken</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {studentData.exams.total_exams_taken}
              </span>
            </div>
            {studentData.exams.best_subject && (
              <div className="mt-2 text-xs">
                <span className={get('text', 'tertiary')}>Best: </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  {studentData.exams.best_subject.subject} ({studentData.exams.best_subject.average_percentage.toFixed(1)}%)
                </span>
              </div>
            )}
          </div>

          {/* Behavior Card */}
          <div className={combine(
            getCardGradientClass('pink'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100')}>
                <FaClipboardCheck className="text-pink-600 dark:text-pink-400 text-xl" />
              </div>
              <span className={getStatusBadgeClass(getBehaviorBadgeClass(studentData.behavior.overall_score))}>
                {studentData.behavior.overall_score.toFixed(1)}/5
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Behavior</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Reports</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                {studentData.behavior.total_reports}
              </span>
            </div>
            <div className="mt-2">
              {renderStars(studentData.behavior.overall_score)}
            </div>
          </div>

          {/* Fees Card */}
          <div className={combine(
            getCardGradientClass('amber'),
            "hover:scale-105 transition-transform cursor-pointer"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')}>
                <FaMoneyBillWave className="text-amber-600 dark:text-amber-400 text-xl" />
              </div>
              <span className={getStatusBadgeClass(
                studentData.fees.total_due === 0 ? 'emerald' :
                  studentData.fees.total_due < studentData.fees.total_amount / 2 ? 'amber' : 'red'
              )}>
                {studentData.fees.payment_status}
              </span>
            </div>
            <h3 className={combine("text-lg font-semibold mb-2", get('text', 'primary'))}>Fees</h3>
            <div className="flex items-center justify-between text-sm">
              <span className={get('text', 'secondary')}>Paid/Total</span>
              <span className={combine("font-medium", get('text', 'primary'))}>
                ₹{studentData.fees.total_paid}/₹{studentData.fees.total_amount}
              </span>
            </div>
            {studentData.fees.total_due > 0 && (
              <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                Due: ₹{studentData.fees.total_due}
              </div>
            )}
          </div>
        </div>

        <div className={getCardGradientClass(studentData.overall_stats.status_color || 'blue')}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Overall Insights</h3>
              <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                Status: {studentData.overall_stats.overall_status} • Score: {studentData.overall_stats.overall_score}
              </p>
            </div>
            <div className={combine("text-xs", get('text', 'tertiary'))}>
              Last Updated: {studentData.overall_stats.last_updated ? new Date(studentData.overall_stats.last_updated).toLocaleDateString() : 'N/A'}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.overall_stats.breakdown.attendance?.toFixed?.(1) ?? studentData.overall_stats.breakdown.attendance}</div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Attendance</div>
            </div>
            <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.overall_stats.breakdown.academics?.toFixed?.(1) ?? studentData.overall_stats.breakdown.academics}</div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Academics</div>
            </div>
            <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.overall_stats.breakdown.behavior?.toFixed?.(1) ?? studentData.overall_stats.breakdown.behavior}</div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Behavior</div>
            </div>
            <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.overall_stats.breakdown.fees?.toFixed?.(1) ?? studentData.overall_stats.breakdown.fees}</div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Fees</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={combine("p-3 rounded-lg", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>Strengths</div>
              {studentData.overall_stats.strengths?.length ? (
                <ul className={combine("text-xs space-y-1", get('text', 'secondary'))}>
                  {studentData.overall_stats.strengths.map((item: string, idx: number) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className={combine("text-xs", get('text', 'tertiary'))}>No strengths identified yet</p>
              )}
            </div>
            <div className={combine("p-3 rounded-lg", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
              <div className={combine("text-sm font-medium mb-2", get('text', 'primary'))}>Needs Attention</div>
              {studentData.overall_stats.areas_needing_attention?.length ? (
                <ul className={combine("text-xs space-y-1", get('text', 'secondary'))}>
                  {studentData.overall_stats.areas_needing_attention.map((item: string, idx: number) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className={combine("text-xs", get('text', 'tertiary'))}>No critical areas</p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* First Row - Two Columns */}
  {/* Column 1: Student Details */}
  <div className={getCardGradientClass('purple')}>
    <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
      <IoMdPerson className="text-xl" />
      <span>Student Details</span>
    </h3>
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className={combine("text-xs", get('text', 'tertiary'))}>Date of Birth</div>
          <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
            {studentData.profile.date_of_birth ? new Date(studentData.profile.date_of_birth).toLocaleDateString() : 'Not Provided'}
          </div>
        </div>
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className={combine("text-xs", get('text', 'tertiary'))}>Age</div>
          <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
            {studentData.profile.age || 'N/A'} years
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className={combine("text-xs", get('text', 'tertiary'))}>Roll Number</div>
          <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
            {studentData.academic.roll_number || 'Not Assigned'}
          </div>
        </div>
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className={combine("text-xs", get('text', 'tertiary'))}>Enrollment Status</div>
          <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
            {studentData.academic.enrollment_status || 'Unknown'}
          </div>
        </div>
      </div>
      <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
        <div className={combine("text-xs", get('text', 'tertiary'))}>Promotion Status</div>
        <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
          {studentData.academic.promoted ? 'Promoted' : 'Not Promoted'}
        </div>
      </div>

      {studentData.profile.student_email && (
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className="flex items-center space-x-3">
            <FaEnvelope className={combine("text-sm", get('text', 'tertiary'))} />
            <span className={combine("text-sm", get('text', 'primary'))}>{studentData.profile.student_email}</span>
          </div>
        </div>
      )}

      {studentData.profile.address && (
        <div className='flex flex-col items-start justify-between p-3 rounded-lg bg-white/30 dark:bg-gray-800/30'>
          <div className="flex items-start space-x-3">
            <FaMapMarkerAlt className={combine("text-sm mt-0.5", get('text', 'tertiary'))} />
            <span className={combine("text-sm", get('text', 'primary'))}>{studentData.profile.address}</span>
          </div>
        </div>
      )}

      {/* Extra Details */}
      {Object.keys(studentData.profile.extra_details).length > 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Additional Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {studentData.profile.extra_details.blood_group && (
              <div className="flex items-center space-x-2">
                <MdBloodtype className="text-red-500" />
                <span className={combine("text-xs", get('text', 'primary'))}>{studentData.profile.extra_details.blood_group}</span>
              </div>
            )}
            {studentData.profile.extra_details.medical_conditions && (
              <div className="flex items-center space-x-2">
                <MdLocalHospital className="text-blue-500" />
                <span className={combine("text-xs", get('text', 'primary'))}>{studentData.profile.extra_details.medical_conditions}</span>
              </div>
            )}
            {studentData.profile.extra_details.transport_route && (
              <div className="flex items-center space-x-2">
                <MdDirectionsBus className="text-amber-500" />
                <span className={combine("text-xs", get('text', 'primary'))}>{studentData.profile.extra_details.transport_route}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Column 2: Transport Details */}
  <div className={getCardGradientClass('indigo')}>
    <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
      <MdDirectionsBus className="text-xl" />
      <span>Transport Details</span>
    </h3>

    {studentData.transport.is_assigned ? (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
            <div className={combine("text-xs", get('text', 'tertiary'))}>Bus Number</div>
            <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
              {studentData.transport.bus?.bus_number || 'N/A'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
            <div className={combine("text-xs", get('text', 'tertiary'))}>Registration</div>
            <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
              {studentData.transport.bus?.registration_number || 'N/A'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
            <div className={combine("text-xs", get('text', 'tertiary'))}>Driver</div>
            <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
              {studentData.transport.bus?.driver_name || 'Not Assigned'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
            <div className={combine("text-xs", get('text', 'tertiary'))}>Bus Status</div>
            <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
              {studentData.transport.bus?.is_live ? 'Live' : 'Not Live'}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30 space-y-2">
          <div className={combine("text-xs", get('text', 'tertiary'))}>Assigned Stop</div>
          <div className={combine("text-sm font-medium", get('text', 'primary'))}>
            {studentData.transport.stop?.stop_name || 'Not Assigned'}
          </div>
          <div className={combine("text-xs", get('text', 'secondary'))}>
            Order: {studentData.transport.stop?.order_number ?? 'N/A'} • Time: {studentData.transport.stop?.arrival_time || 'N/A'}
          </div>
          {studentData.transport.stop?.latitude !== null && studentData.transport.stop?.longitude !== null && (
            <div className={combine("text-xs flex items-center space-x-1", get('text', 'secondary'))}>
              <MdLocationOn className="text-red-500" />
              <span>
                {studentData.transport.stop.latitude}, {studentData.transport.stop.longitude}
              </span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
          <div className="flex items-center justify-between mb-3">
            <div className={combine("text-sm font-medium", get('text', 'primary'))}>
              Today Bus Attendance
            </div>
            <span className={combine("px-2 py-1 rounded-md text-xs font-medium", getTransportAttendanceClass(studentData.transport.today_bus_attendance.overall_status))}>
              {studentData.transport.today_bus_attendance.overall_status}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-2 rounded-md bg-white/40 dark:bg-gray-900/30">
              <div className={combine("text-xs", get('text', 'tertiary'))}>Morning</div>
              <div className="mt-1">
                <span className={combine("px-2 py-1 rounded text-xs font-medium", getTransportAttendanceClass(studentData.transport.today_bus_attendance.morning.status))}>
                  {studentData.transport.today_bus_attendance.morning.status}
                </span>
              </div>
            </div>
            <div className="p-2 rounded-md bg-white/40 dark:bg-gray-900/30">
              <div className={combine("text-xs", get('text', 'tertiary'))}>Evening</div>
              <div className="mt-1">
                <span className={combine("px-2 py-1 rounded text-xs font-medium", getTransportAttendanceClass(studentData.transport.today_bus_attendance.evening.status))}>
                  {studentData.transport.today_bus_attendance.evening.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ) : (
      <div className="p-4 rounded-lg bg-white/30 dark:bg-gray-800/30">
        <p className={combine("text-sm", get('text', 'secondary'))}>
          {studentData.transport.message || 'Student is not assigned to any bus.'}
        </p>
      </div>
    )}
  </div>

  {/* Second Row - Two Columns */}
  {/* Column 1: Parent Information */}
  <div className={getCardGradientClass('amber')}>
    <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
      <MdOutlineFamilyRestroom className="text-xl" />
      <span>Parent Information</span>
    </h3>
    <div className="space-y-4">
      {(studentData.parents.father_name || studentData.parents.mother_name) ? (
        <>
          {studentData.parents.father_name && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
              <div>
                <div className={combine("text-xs", get('text', 'tertiary'))}>Father</div>
                <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                  {studentData.parents.father_name}
                </div>
              </div>
              {studentData.parents.father_phone && (
                <div className="flex items-center space-x-1">
                  <FaPhone className="text-xs text-green-600" />
                  <span className={combine("text-xs", get('text', 'secondary'))}>{studentData.parents.father_phone}</span>
                </div>
              )}
            </div>
          )}

          {studentData.parents.mother_name && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
              <div>
                <div className={combine("text-xs", get('text', 'tertiary'))}>Mother</div>
                <div className={combine("text-sm font-medium mt-1", get('text', 'primary'))}>
                  {studentData.parents.mother_name}
                </div>
              </div>
              {studentData.parents.mother_phone && (
                <div className="flex items-center space-x-1">
                  <FaPhone className="text-xs text-green-600" />
                  <span className={combine("text-xs", get('text', 'secondary'))}>{studentData.parents.mother_phone}</span>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <p className={combine("text-sm text-center py-4", get('text', 'secondary'))}>
          No parent information available
        </p>
      )}

      {studentData.parents.emergency_contact && (
        <div className="p-3 rounded-lg bg-white/30 dark:bg-gray-800/30">
          <div className={combine("text-xs", get('text', 'tertiary'))}>Emergency Contact</div>
          <div className="flex items-center space-x-2 mt-1">
            <FaPhone className="text-xs text-red-500" />
            <span className={combine("text-sm font-medium", get('text', 'primary'))}>
              {studentData.parents.emergency_contact}
            </span>
          </div>
        </div>
      )}
    </div>
  </div>

  {/* Column 2: Attendance Overview */}
  <div className={getCardGradientClass('blue')}>
    <div className='flex items-center justify-between mb-6'>
      <h3 className={combine("text-xl font-bold flex items-center space-x-3", get('text', 'primary'))}>
        <FaCalendarCheck className="text-xl" />
        <span>Attendance Overview</span>
      </h3>
      <button
        onClick={() => handleViewAttendance()}
        className={combine(
          "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
          get('icon', 'primary') + " text-xs sm:text-sm"
        )}
        title="View Attendance History"
        data-title="View Attendance History" 
      >
        <FaHistory className="text-xs sm:text-sm" />
      </button>
    </div>

    {hasAttendance ? (
      <div className="space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={combine("text-2xl font-bold text-emerald-600")}>
              {studentData.attendance.overall.present}
            </div>
            <div className={combine("text-xs", get('text', 'tertiary'))}>Present</div>
          </div>
          <div className="text-center">
            <div className={combine("text-2xl font-bold text-red-600")}>
              {studentData.attendance.overall.absent}
            </div>
            <div className={combine("text-xs", get('text', 'tertiary'))}>Absent</div>
          </div>
          <div className="text-center">
            <div className={combine("text-2xl font-bold text-amber-600")}>
              {studentData.attendance.overall.late}
            </div>
            <div className={combine("text-xs", get('text', 'tertiary'))}>Late</div>
          </div>
          <div className="text-center">
            <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
              {studentData.attendance.overall.total_days || 0}
            </div>
            <div className={combine("text-xs", get('text', 'tertiary'))}>Total Days</div>
          </div>
        </div>

        {/* Monthly Stats */}
        <div>
          <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>
            {studentData.attendance.current_month.month}
          </h4>
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className={combine("text-lg font-bold text-emerald-600")}>
                {studentData.attendance.current_month.present}
              </div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Present</div>
            </div>
            <div className="text-center">
              <div className={combine("text-lg font-bold text-red-600")}>
                {studentData.attendance.current_month.absent}
              </div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Absent</div>
            </div>
            <div className="text-center">
              <div className={combine("text-lg font-bold text-amber-600")}>
                {studentData.attendance.current_month.late}
              </div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>Late</div>
            </div>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div
              className={combine("h-full rounded-full", getProgressBarColor(studentData.attendance.current_month.attendance_percentage))}
              style={{ width: `${Math.min(100, studentData.attendance.current_month.attendance_percentage)}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Attendance */}
        {studentData.attendance.recent_attendance && studentData.attendance.recent_attendance.length > 0 && (
          <div>
            <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Recent Days</h4>
            <div className="grid grid-cols-7 gap-1">
              {studentData.attendance.recent_attendance.slice(0, 14).map((day: any, index: number) => (
                <div
                  key={index}
                  className={combine(
                    "aspect-square rounded-lg flex items-center justify-center text-xs font-medium",
                    day.status === 'Present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300' :
                      day.status === 'Absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                        day.status === 'Late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  )}
                  title={`${new Date(day.date).toLocaleDateString()}: ${day.status}`}
                >
                  {new Date(day.date).getDate()}
                </div>
              ))}
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
          {getEmptyState('attendance', studentData.attendance.message).icon}
        </div>
        <p className={combine("text-sm", get('text', 'secondary'))}>
          {getEmptyState('attendance', studentData.attendance.message).description}
        </p>
      </div>
    )}
  </div>
</div>

        {/* Middle Column - Academic & Behavior */}
        <div className="lg:col-span-2 space-y-6">


          {/* Academic Performance */}
          <div className={getCardGradientClass('emerald')}>
            <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
              <GiGraduateCap className="text-xl" />
              <span>Academic Performance</span>
            </h3>

            {hasExams ? (
              <div className="space-y-6">
                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={combine("text-2xl font-bold", getScoreColor(studentData.exams.overall_average))}>
                      {studentData.exams.overall_average.toFixed(1)}%
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Overall</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {studentData.exams.total_exams_taken}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Exams</div>
                  </div>
                  {studentData.exams.best_subject && (
                    <div className="text-center col-span-2">
                      {(() => {
                        const subjectColor = getSubjectColor(studentData.exams.best_subject.subject);
                        return (
                          <div
                            className={combine("text-sm font-medium inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border", !subjectColor ? get('text', 'primary') : '')}
                            style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                          >
                            <span>🏆 Best:</span>
                            <span>{studentData.exams.best_subject.subject}</span>
                          </div>
                        );
                      })()}
                      <div className={combine("text-xs", get('text', 'tertiary'))}>
                        {studentData.exams.best_subject.average_percentage.toFixed(1)}% avg
                      </div>
                    </div>
                  )}
                </div>
                {studentData.exams.exam_status_summary && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
                      <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {studentData.exams.exam_status_summary.upcoming || 0}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Upcoming</div>
                    </div>
                    <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
                      <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {studentData.exams.exam_status_summary.current || 0}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Current</div>
                    </div>
                    <div className={combine("p-3 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
                      <div className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {studentData.exams.exam_status_summary.finished || 0}
                      </div>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Finished</div>
                    </div>
                  </div>
                )}
                {(studentData.exams.upcoming_exams?.length > 0 ||
                  studentData.exams.current_exams?.length > 0 ||
                  studentData.exams.finished_exams?.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Upcoming', list: studentData.exams.upcoming_exams || [] },
                      { label: 'Current', list: studentData.exams.current_exams || [] },
                      { label: 'Finished', list: studentData.exams.finished_exams || [] },
                    ].map((group, idx) => (
                      <div key={idx} className={combine("p-3 rounded-lg", theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50')}>
                        <div className={combine("text-xs font-medium mb-2", get('text', 'secondary'))}>{group.label} Exams</div>
                        {group.list.length === 0 ? (
                          <p className={combine("text-xs", get('text', 'tertiary'))}>No exams</p>
                        ) : (
                          <div className="space-y-1">
                            {group.list.slice(0, 3).map((exam: any, i: number) => (
                              <p key={i} className={combine("text-xs", get('text', 'primary'))}>
                                {exam.exam_type || 'Exam'} {exam.term ? `(${exam.term})` : ''}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Subject Rankings */}
                {studentData.exams.subject_ranking.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Subject Rankings</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {studentData.exams.subject_ranking.map((subject: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg flex items-center justify-between",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📚'}
                            </span>
                            {(() => {
                              const subjectColor = getSubjectColor(subject.subject);
                              return (
                                <span
                                  className={combine("text-sm font-medium px-2 py-1 rounded-md border", !subjectColor ? get('text', 'primary') : '')}
                                  style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                >
                                  {subject.subject}
                                </span>
                              );
                            })()}
                          </div>
                          <span className={combine("text-sm font-bold", getScoreColor(subject.average_percentage))}>
                            {subject.average_percentage.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Exams */}
                {studentData.exams.exam_performance && studentData.exams.exam_performance.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Recent Exams</h4>
                    <div className="space-y-3">
                      {studentData.exams.exam_performance.slice(0, 3).map((exam: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className={combine("text-sm font-medium", get('text', 'primary'))}>
                                {exam.exam_name}
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>{exam.term}</div>
                            </div>
                            <div className="text-right">
                              <div className={combine("text-lg font-bold", getScoreColor(exam.percentage))}>
                                {exam.percentage.toFixed(1)}%
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {exam.obtained_marks}/{exam.total_marks}
                              </div>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <div
                              className={combine("h-full rounded-full", getProgressBarColor(exam.percentage))}
                              style={{ width: `${exam.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
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
                  {getEmptyState('exams', studentData.exams.message).icon}
                </div>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {getEmptyState('exams', studentData.exams.message).description}
                </p>
              </div>
            )}
          </div>

          {/* Behavior Reports */}
          <div className={getCardGradientClass('pink')}>
            <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
              <FaClipboardCheck className="text-xl" />
              <span>Behavior Reports</span>
            </h3>

            {hasBehavior ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className={combine("text-3xl font-bold", getBehaviorScoreColor(studentData.behavior.overall_score))}>
                      {studentData.behavior.overall_score.toFixed(1)}/5
                    </div>
                    <div className="mt-1">{renderStars(studentData.behavior.overall_score)}</div>
                  </div>
                  <div className="text-right">
                    <span className={getStatusBadgeClass(getBehaviorBadgeClass(studentData.behavior.overall_score))}>
                      {studentData.behavior.behavior_rating}
                    </span>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Based on {studentData.behavior.total_reports} reports
                    </div>
                  </div>
                </div>

                {studentData.behavior.term_averages.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Term Performance</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {studentData.behavior.term_averages.map((term: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex justify-between items-center mb-2">
                            <span className={combine("text-xs font-medium", get('text', 'secondary'))}>
                              {term.term}
                            </span>
                            <span className={combine("text-sm font-bold", getBehaviorScoreColor(term.average_score))}>
                              {term.average_score.toFixed(1)}/5
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <div
                              className={combine("h-full rounded-full", getProgressBarColor(term.average_score * 20))}
                              style={{ width: `${(term.average_score / 5) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentData.behavior.reports.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Recent Reports</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {studentData.behavior.reports.slice(0, 5).map((report: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                {(() => {
                                  const subjectColor = getSubjectColor(report.subject);
                                  return (
                                    <span
                                      className={combine("text-sm font-medium px-2 py-1 rounded-md border", !subjectColor ? get('text', 'primary') : '')}
                                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                    >
                                      {report.subject}
                                    </span>
                                  );
                                })()}
                                <span className={getStatusBadgeClass(getBehaviorBadgeClass(report.average_score))}>
                                  {report.average_score.toFixed(1)}/5
                                </span>
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {report.term} • {new Date(report.date).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="text-xs">
                              {renderStars(report.average_score)}
                            </div>
                          </div>
                          {report.remarks && (
                            <p className={combine("text-xs mt-2 p-2 rounded",
                              theme === 'dark' ? 'bg-gray-800/70' : 'bg-gray-100'
                            )}>
                              "{report.remarks}"
                            </p>
                          )}
                          <div className="flex justify-end mt-2">
                            <span className={combine("text-xs", get('text', 'tertiary'))}>
                              By: {report.posted_by}
                            </span>
                          </div>
                        </div>
                      ))}
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
                  {getEmptyState('behavior', studentData.behavior.message).icon}
                </div>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {getEmptyState('behavior', studentData.behavior.message).description}
                </p>
              </div>
            )}
          </div>



          {/* Fees & Payments */}
          <div className={getCardGradientClass('amber')}>
            <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
              <FaMoneyBillWave className="text-xl" />
              <span>Fees & Payments</span>
            </h3>

            {hasFees ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={combine("text-xl font-bold", get('text', 'primary'))}>
                      ₹{studentData.fees.total_amount}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold text-emerald-600")}>
                      ₹{studentData.fees.total_paid}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Paid</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold text-blue-600")}>
                      ₹{studentData.fees.total_concession}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Concession</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold",
                      studentData.fees.total_due === 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      ₹{studentData.fees.total_due}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Due</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={combine("p-2 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50')}>
                    <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.fees.payment_summary?.cleared ?? 0}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Cleared</div>
                  </div>
                  <div className={combine("p-2 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50')}>
                    <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.fees.payment_summary?.partial ?? 0}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Partial</div>
                  </div>
                  <div className={combine("p-2 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50')}>
                    <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.fees.payment_summary?.unpaid ?? 0}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Unpaid</div>
                  </div>
                </div>

                {studentData.fees.fee_details.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Fee Breakdown</h4>
                    <div className="space-y-3">
                      {studentData.fees.fee_details.map((fee: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className={combine("text-sm font-medium", get('text', 'primary'))}>
                                {fee.fee_type}
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                Due: {new Date(fee.due_date).toLocaleDateString()}
                              </div>
                            </div>
                            <span className={getStatusBadgeClass(
                              fee.status === 'PAID' || fee.status === 'Cleared' ? 'emerald' :
                                fee.status === 'PARTIAL' ? 'amber' : 'red'
                            )}>
                              {fee.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className={get('text', 'tertiary')}>Total: </span>
                              <span className="font-medium">₹{fee.total_amount}</span>
                            </div>
                            <div>
                              <span className={get('text', 'tertiary')}>Paid: </span>
                              <span className="font-medium text-emerald-600">₹{fee.paid_amount}</span>
                            </div>
                            <div>
                              <span className={get('text', 'tertiary')}>Due: </span>
                              <span className={fee.due_amount > 0 ? 'text-red-600 font-medium' : 'font-medium'}>
                                ₹{fee.due_amount}
                              </span>
                            </div>
                            <div>
                              <span className={get('text', 'tertiary')}>Install: </span>
                              <span className="font-medium">{fee.installments}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentData.fees.recent_payments.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Recent Payments</h4>
                    <div className="space-y-2">
                      {studentData.fees.recent_payments.slice(0, 3).map((payment: any, index: number) => (
                        <div key={index} className={combine(
                          "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50'
                        )}>
                          <div className="flex items-center space-x-2">
                            <FaReceipt className="text-emerald-500" />
                            <div>
                              <div className={combine("text-xs font-medium", get('text', 'primary'))}>
                                {payment.fee_type}
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {new Date(payment.date).toLocaleDateString()} • {payment.mode}
                              </div>
                            </div>
                          </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-emerald-600">₹{payment.amount}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {payment.transaction_id ? `${payment.transaction_id.substring(0, 8)}...` : 'N/A'}
                              </div>
                            </div>
                          </div>
                      ))}
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
                  {getEmptyState('fees', studentData.fees.message).icon}
                </div>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {getEmptyState('fees', studentData.fees.message).description}
                </p>
              </div>
            )}
          </div>

          {/* Leave Records */}
          <div className={getCardGradientClass('purple')}>
            <h3 className={combine("text-xl font-bold mb-6 flex items-center space-x-3", get('text', 'primary'))}>
              <FaBed className="text-xl" />
              <span>Leave Records</span>
            </h3>

            {hasLeaves ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className={combine("text-xl font-bold", get('text', 'primary'))}>
                      {studentData.leaves.total_leaves}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold text-emerald-600")}>
                      {studentData.leaves.approved}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Approved</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold text-amber-600")}>
                      {studentData.leaves.pending}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Pending</div>
                  </div>
                  <div className="text-center">
                    <div className={combine("text-xl font-bold text-red-600")}>
                      {studentData.leaves.rejected}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Rejected</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className={combine("p-2 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50')}>
                    <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.leaves.days_taken_current_year ?? 0}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Days This Year</div>
                  </div>
                  <div className={combine("p-2 rounded-lg text-center", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100/50')}>
                    <div className={combine("text-sm font-bold", get('text', 'primary'))}>{studentData.leaves.current_status || 'N/A'}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Current Status</div>
                  </div>
                </div>

                {studentData.leaves.leave_details.length > 0 && (
                  <div>
                    <h4 className={combine("text-sm font-medium mb-3", get('text', 'secondary'))}>Recent Leaves</h4>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                      {studentData.leaves.leave_details.slice(0, 5).map((leave: any, index: number) => (
                        <div key={index} className={combine(
                          "p-3 rounded-lg",
                          theme === 'dark' ? 'bg-gray-800/50' : 'bg-white/50'
                        )}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                                  {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                </span>
                                <span className={getStatusBadgeClass(
                                  leave.status === 'Approved' ? 'emerald' :
                                    leave.status === 'Pending' ? 'amber' : 'red'
                                )}>
                                  {leave.status}
                                </span>
                              </div>
                              <div className={combine("text-xs mt-1", get('text', 'secondary'))}>
                                {leave.duration_days} day{leave.duration_days !== 1 ? 's' : ''}
                              </div>
                            </div>
                          </div>
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            <span className="font-medium">Reason:</span> {leave.reason}
                          </p>
                          {leave.admin_comment && (
                            <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                              <span className="font-medium">Comment:</span> {leave.admin_comment}
                            </p>
                          )}
                        </div>
                      ))}
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
                  {getEmptyState('leaves', studentData.leaves.message).icon}
                </div>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {getEmptyState('leaves', studentData.leaves.message).description}
                </p>
              </div>
            )}
          </div>
        </div>


        {/* Refresh Button */}
        <div className="flex justify-center mt-10">
          <button
            onClick={() => fetchStudentOverview(true)}
            className={combine(getPrimaryButtonClass(), "flex items-center space-x-3 px-8 py-4")}
            disabled={refreshing}
          >
            {refreshing ? <FaSpinner className="text-base animate-spin" /> : <FaChartLine className="text-base" />}
            <span className="text-base">{refreshing ? 'Refreshing...' : 'Refresh Overview'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
