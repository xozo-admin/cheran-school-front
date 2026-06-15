'use client';

import { adminApi } from '@/lib/api';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  FaMoneyBillWave,
  FaUserPlus,
  FaTrash,
  FaEye,
  FaEdit,
  FaSave,
  FaSearch,
  FaFilter,
  FaDownload,
  FaCalendar,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaUsers,
  FaChartBar,
  FaUniversity,
  FaReceipt,
  FaPercent,
  FaCreditCard,
  FaHistory,
  FaCalendarAlt,
  FaMoneyCheckAlt,
  FaRupeeSign,
  FaTags,
  FaTimes,
  FaCheck,
  FaPrint,
  FaFilePdf,
  FaFileCsv,
  FaPlus,
  FaMinus,
  FaInfoCircle,
  FaSync,
  FaExclamationTriangle,
  FaClipboardList,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaArrowRight,
  FaFileInvoiceDollar,
  FaLayerGroup,
  FaCog,
  FaHome,
  FaBook,
  FaTruck,
  FaCalculator,
  FaBell,
  FaUndo,
  FaRedo,
  FaBalanceScale,
  FaChartPie,
  FaRegChartBar,
  FaRegMoneyBillAlt,
  FaRegCalendarCheck,
  FaCheckDouble,
  FaHourglassHalf,
  FaBan,
  FaEyeSlash,
} from 'react-icons/fa';
import { FiFilter, FiDownload, FiUsers, FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi';
import { MdClass, MdOutlineDashboard, MdPayment, MdAttachMoney, MdAccountBalance, MdOutlineReceipt } from 'react-icons/md';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { format, parseISO, isAfter, isBefore, differenceInDays } from 'date-fns';
import { usePathname, useSearchParams } from 'next/navigation';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

// ============ INTERFACES ============

interface AcademicYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface FeeStructure {
  id: number;
  academic_year: string;
  fee_type: string;
  class_name: string;
  amount: string;
  installment_count?: number;
  installment_amount?: string;
  due_date: string;
  total_students?: number;
  paid_count?: number;
  total_collected?: string;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface StudentFee {
  student_id: string;
  student_name: string;
  class: string;
  section: string;
  roll_number?: string;
  student_roll?: string;
  student_class?: string;
  student_section?: string;
  total_fee: string;
  paid_amount: string;
  due_amount: string;
  concession_amount?: string;
  installment_count?: number;
  next_installment_amount?: string;
  payment_status: 'PAID' | 'UNPAID' | 'OVERDUE';
  installments_count: number;
  installments_remaining_count?: number;
  last_payment_date?: string;
  last_payment?: {
    date: string;
    amount: string;
    mode: string;
    transaction_id: string;
  } | null;
  parent_mobile?: string;
}

interface Concession {
  id?: number;
  student_id: string;
  student_name: string;
  class: string;
  academic_year: string;
  fee_type: string;
  total_fee: string;
  concession_amount: string;
  balance_due: string;
  valid_from?: string;
  valid_to?: string;
  concession_type?: string;
}

interface Transaction {
  student_id: string;
  student_name?: string;
  class?: string;
  section?: string;
  amount: string;
  mode: string;
  txn_id: string;
  payment_date: string;
  fee_type?: string;
}

interface DailyCollection {
  date: string;
  total_collected: string;
  total_transactions: number;
  mode_breakdown: Record<string, number>;
  class_wise_breakdown?: Record<string, number>;
  transactions: Transaction[];
}

interface FeeType {
  name: string;
}

interface Section {
  id: number;
  name: string;
  description: string;
}

interface Standard {
  id: number;
  name: string;
  description: string;
  sections: Section[];
}

interface StandardWithSections {
  id: number;
  name: string;
  sections: string[];
}

const buildAcademicYearLabel = () => {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${currentYear + 1}`;
};

interface ClassFeeReport {
  class: string;
  section: string;
  fee_type: string;
  total_fee_per_student: number | null;
  statistics: {
    total_students: number;
    paid: number;
    unpaid: number;
    overdue: number;
    collection_rate: number;
    total_collected: number;
    total_pending: number;
  };
  students: StudentFee[];
}

interface SchoolDueReport {
  academic_year: string;
  fee_type: string;
  summary: {
    total_students_in_school: number;
    due_students_count: number;
    total_pending_amount: string;
    coverage_percentage: number;
  };
  dues_by_class: Array<{
    class: string;
    total_due_students: number;
    total_due_amount: number;
    students: Array<{
      student_id: string;
      student_name: string;
      roll_number: string;
      section: string;
      parent_phone: string;
      due_amount: string;
      paid_amount: string;
      total_amount: string;
      concession: string;
      installments_paid: number;
      last_payment_date: string | null;
      status: string;
    }>;
  }>;
}

interface Receipt {
  id: number;
  student_id: string;
  student_name: string;
  student_class: string;
  student_section: string;
  fee_type: string;
  academic_year: string;
  transaction_id: string;
  payment_mode: string;
  payment_mode_display: string;
  payment_date: string;
  payment_datetime?: string;
  amount_paid: string;
  total_fee: string;
  concession_amount: string;
  balance_due: string;
  status: string;
  payment_status: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  remarks?: string;
}

interface StudentFeeSummaryReport {
  student: {
    id: string;
    name: string;
    class: string | null;
    section: string | null;
    profile_image?: string | null;
  };
  summary: {
    total_fee: string;
    total_concession: string;
    total_paid: string;
    total_due: string;
    records_count: number;
    paid_count: number;
    unpaid_count: number;
  };
  fee_records: Array<{
    fee_id: number;
    academic_year: string;
    fee_type: string;
    class: string;
    total_amount: string;
    concession: string;
    paid_amount: string;
    due_amount: string;
    status: string;
    due_date: string;
    last_payment_date: string | null;
    payments: Array<{
      date: string;
      payment_datetime?: string;
      amount: string;
      mode: string;
      transaction_id: string;
    }>;
  }>;
}

interface FeeStatsCards {
  filters: {
    academic_year: string;
    as_of_date: string;
  };
  cards: {
    total_fee_defined: number;
    total_assigned_amount: number;
    total_fee_structures: number;
    assigned_fee_records_count: number;
    active_classes_count: number;
    total_students_count: number;
    paid_students_count: number;
    due_students_count: number;
    total_pending_amount: number;
    total_collected_amount: number;
    total_concession_amount: number;
    today_collected_amount: number;
    today_transactions: number;
    collection_rate: number;
  };
  status_counts: {
    paid: number;
    unpaid: number;
    overdue: number;
    refunded: number;
  };
}

// ============ MAIN COMPONENT ============

export default function FeesManagementPage() {
  const reportsRef = useRef<HTMLDivElement>(null);
  const dueReportsRef = useRef<HTMLDivElement>(null);
  const redirectParamsHandled = useRef(false);
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'fee_management_school_scope' });
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFeeReportsRoute = pathname === '/admin/finance/feereports';
  const showManagementTabs = !isFeeReportsRoute;
  const showReportTabs = isFeeReportsRoute;

  // ============ STATE MANAGEMENT ============

  // Tab state
  const [activeTab, setActiveTab] = useState<'structure' | 'assign' | 'payments' | 'concessions' | 'reports' | 'dueReports' | 'studentReports' | 'receipts'>(
    isFeeReportsRoute ? 'reports' : 'structure'
  );

  // Loading states
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Data states
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>('');
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [feeTypes, setFeeTypes] = useState<string[]>([]);
  const [standards, setStandards] = useState<StandardWithSections[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [concessions, setConcessions] = useState<Concession[]>([]);
  const [classFeeReport, setClassFeeReport] = useState<ClassFeeReport | null>(null);
  const [dueSchoolReport, setDueSchoolReport] = useState<SchoolDueReport | null>(null);
  const [dailyCollection, setDailyCollection] = useState<DailyCollection | null>(null);
  const [receiptData, setReceiptData] = useState<Receipt | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [feeStatsCards, setFeeStatsCards] = useState<FeeStatsCards | null>(null);
  const [loadingFeeStatsCards, setLoadingFeeStatsCards] = useState(false);
  const [expandedClassGroups, setExpandedClassGroups] = useState<Record<string, boolean>>({});
  const [studentReportFilters, setStudentReportFilters] = useState({
    student_id: '',
    academic_year: ''
  });
  const [studentFeeSummaryReport, setStudentFeeSummaryReport] = useState<StudentFeeSummaryReport | null>(null);

  // Popup states
  const [showAllStudentsPopup, setShowAllStudentsPopup] = useState(false);
  const [selectedClassData, setSelectedClassData] = useState<{
    class: string;
    students: Array<{
      student_id: string;
      student_name: string;
      roll_number: string;
      section: string;
      parent_phone: string;
      due_amount: string;
      paid_amount: string;
      total_amount: string;
      concession: string;
      installments_paid: number;
      last_payment_date: string | null;
      status: string;
    }>;
  } | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState({
    from: format(new Date(), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [structureSearchQuery, setStructureSearchQuery] = useState('');
  const [structurePagination, setStructurePagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'class_name',
    direction: 'asc'
  });

  // Form states
  const [assignFeeData, setAssignFeeData] = useState({
    academic_year: '',
    class_name: '',
    fee_type: '',
    amount: '',
    installment_count: '1',
    due_date: format(new Date().setMonth(new Date().getMonth() + 1), 'yyyy-MM-dd'),
    override_existing: false
  });
  const [assignFeeTypeMode, setAssignFeeTypeMode] = useState<'existing' | 'new'>('existing');

  const [updateFeeData, setUpdateFeeData] = useState({
    fee_id: '',
    academic_year: '',
    class_name: '',
    fee_type: '',
    new_amount: '',
    installment_count: '1',
    due_date: ''
  });

  const [paymentData, setPaymentData] = useState({
    student_id: '',
    class_name: '',
    fee_type: '',
    paid_amount: '',
    payment_mode: 'CASH',
    transaction_id: '',
    academic_year: '2025-2026'
  });

  const [concessionData, setConcessionData] = useState({
    student_id: '',
    academic_year: '',
    discounts: [{ fee_type: '', discount_amount: '' }]
  });

  const [concessionFilters, setConcessionFilters] = useState({
    academic_year: '',
    student_id: ''
  });

  const [reportFilters, setReportFilters] = useState({
    class: '',
    section: '',
    fee_type: '',
    academic_year: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    from_date: format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'),
    to_date: format(new Date(), 'yyyy-MM-dd')
  });

  const [receiptSearch, setReceiptSearch] = useState('');

  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConcessionModal, setShowConcessionModal] = useState(false);
  const [showBulkConcessionModal, setShowBulkConcessionModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  // Selected items
  const [selectedFee, setSelectedFee] = useState<FeeStructure | null>(null);
  const [selectedConcession, setSelectedConcession] = useState<Concession | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentFee | null>(null);
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);

  const extractApiPayload = (raw: any) => {
    if (!raw) return null;
    if (raw.data && typeof raw.data === 'object') return raw.data;
    if (raw.result && typeof raw.result === 'object') return raw.result;
    if (raw.results && typeof raw.results === 'object') return raw.results;
    return raw;
  };

  const isPermissionDenied = (error: any) => error?.response?.status === 403;

  const getApiErrorMessage = (payload: any, fallback: string): string => {
    if (payload?.error) return String(payload.error);
    if (payload?.message) return String(payload.message);
    return fallback;
  };

  const getConcessionErrorMessage = (payload: any): string => {
    const firstFailed = Array.isArray(payload?.report)
      ? payload.report.find((item: any) => String(item?.status).toLowerCase() !== 'success')
      : null;
    if (firstFailed?.reason) return String(firstFailed.reason);
    if (payload?.error) return String(payload.error);
    if (payload?.message) return String(payload.message);
    return 'Failed to apply concession';
  };

  const applyAcademicYearDefaults = useCallback((years: string[]) => {
    const unique = Array.from(new Set(years.filter(Boolean)));
    const fallbackYear = buildAcademicYearLabel();
    if (!unique.length) unique.push(fallbackYear);

    const mappedYears: AcademicYear[] = unique.map((name, idx) => {
      const [startRaw = '', endRaw = ''] = name.split('-');
      return {
        id: idx + 1,
        name,
        start_date: startRaw ? `${startRaw}-01-01` : '',
        end_date: endRaw ? `${endRaw}-12-31` : '',
        is_current: false,
      };
    });

    mappedYears.sort((a, b) => b.name.localeCompare(a.name));
    mappedYears[0].is_current = true;

    setAcademicYears(mappedYears);
    const activeYear = mappedYears[0].name;
    setCurrentAcademicYear(activeYear);
    setAssignFeeData(prev => ({ ...prev, academic_year: activeYear }));
    setConcessionData(prev => ({ ...prev, academic_year: activeYear }));
    setConcessionFilters(prev => ({ ...prev, academic_year: activeYear }));
    setReportFilters(prev => ({ ...prev, academic_year: activeYear }));
  }, []);

  const applyStaffClassFallbackFromStructures = useCallback(async () => {
    const structureRes = await adminApi.fees.feeStructure(new URLSearchParams());
    const structurePayload = extractApiPayload(structureRes.data);
    const structures: FeeStructure[] = structurePayload?.data || [];

    const years = structures.map((item) => item.academic_year).filter(Boolean);
    applyAcademicYearDefaults(years);

    const classSet = new Set(structures.map((item) => item.class_name).filter(Boolean));
    const fallbackClasses = Array.from(classSet);

    setClasses(fallbackClasses);
    setStandards(
      fallbackClasses.map((name, index) => ({
        id: index + 1,
        name,
        sections: [],
      }))
    );
    setSections([]);
  }, [applyAcademicYearDefaults]);

  // ============ THEME CLASSES ============

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'green', solid: boolean = false) => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (solid) {
      return combine(baseClasses, get('bg', 'card'));
    }

    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'green' | 'blue' | 'purple' | 'amber' | 'indigo' | 'red' = 'green') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    'border',
    theme === 'dark'
      ? 'bg-gray-800 border-gray-600 text-gray-100 placeholder:text-gray-400'
      : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-500',
    'placeholder:text-xs sm:placeholder:text-sm',
    'hover:border-[var(--color-border-strong)]',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = (color: string = 'green') => combine(
    'px-3 sm:px-5 lg:px-6 py-2.5 sm:py-3.5 rounded-xl transition-all duration-200 font-medium whitespace-nowrap',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? `bg-gradient-to-r from-${color}-600 to-${color}-700 hover:from-${color}-700 hover:to-${color}-800`
      : `bg-gradient-to-r from-${color}-500 to-${color}-600 hover:from-${color}-600 hover:to-${color}-700`
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getModalCardClass = () => combine(
    'rounded-2xl p-6 border shadow-2xl',
    theme === 'dark'
      ? 'bg-gray-900 border-gray-700'
      : 'bg-white border-gray-200'
  );

  const getStatusBadge = (status: string) => {
    const normalizedStatus = status === 'PARTIAL' ? 'UNPAID' : status;
    const colorMap: { [key: string]: string } = {
      PAID: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      UNPAID: theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200',
      OVERDUE: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200',
      PENDING: theme === 'dark' ? 'bg-gray-700 text-gray-300 border-gray-600' : 'bg-gray-100 text-gray-700 border-gray-200',
      SUCCESS: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      FAILED: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200',
      INITIATED: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      REFUNDED: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      REFUND_PENDING: theme === 'dark' ? 'bg-orange-900/30 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200',
    };

    const classes = combine(
      'px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full border inline-flex items-center gap-1.5',
      colorMap[normalizedStatus] || colorMap.UNPAID
    );

    return <span className={classes}>{normalizedStatus}</span>;
  };

  const getPaymentModeBadge = (mode: string) => {
    const colorMap: { [key: string]: string } = {
      UPI: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      CASH: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      NETBANKING: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      CHEQUE: theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
      CARD: theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-100 text-indigo-700 border-indigo-200',
      DD: theme === 'dark' ? 'bg-orange-900/30 text-orange-300 border-orange-800' : 'bg-orange-100 text-orange-700 border-orange-200',
      ONLINE: theme === 'dark' ? 'bg-cyan-900/30 text-cyan-300 border-cyan-800' : 'bg-cyan-100 text-cyan-700 border-cyan-200',
      RAZORPAY: theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
    };

    const displayMode = mode.replace('_', ' ');
    const classes = combine(
      'px-2 py-1 text-xs font-medium rounded-full border inline-flex items-center gap-1',
      colorMap[mode] || colorMap.CASH
    );

    return <span className={classes}>{displayMode}</span>;
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    try {
      return format(parseISO(value), 'dd/MM/yyyy hh:mm a');
    } catch {
      return value;
    }
  };

  const getFeeTypeBadge = (feeType: string) => {
    const colorMap: { [key: string]: string } = {
      Tuition: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      Transport: theme === 'dark' ? 'bg-amber-900/30 text-amber-300 border-amber-800' : 'bg-amber-100 text-amber-700 border-amber-200',
      Hostel: theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Library: theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200',
      Sports: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      Lab: theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300 border-indigo-800' : 'bg-indigo-100 text-indigo-700 border-indigo-200',
      Development: theme === 'dark' ? 'bg-pink-900/30 text-pink-300 border-pink-800' : 'bg-pink-100 text-pink-700 border-pink-200',
    };

    const defaultColor = theme === 'dark'
      ? 'bg-gray-700 text-gray-300 border-gray-600'
      : 'bg-gray-100 text-gray-700 border-gray-200';

    const classes = combine(
      'px-3 py-1.5 text-sm font-medium rounded-full border inline-flex items-center gap-1.5',
      colorMap[feeType] || defaultColor
    );

    return <span className={classes}>{feeType}</span>;
  };

  // ============ API CALLS ============

  // Fetch academic years
  const fetchAcademicYears = useCallback(async () => {
    try {
      const res = await adminApi.school.academicYears(schoolScope.scopeParams);

      if (res.data) {
        const data = res.data;
        setAcademicYears(data);

        // Find current academic year
        const current = data.find((year: AcademicYear) => year.is_current);
        if (current) {
          setCurrentAcademicYear(current.name);

          // Update all forms with current academic year
          setAssignFeeData(prev => ({ ...prev, academic_year: current.name }));
          setPaymentData(prev => ({ ...prev, academic_year: current.name }));
          setConcessionData(prev => ({ ...prev, academic_year: current.name }));
          setConcessionFilters(prev => ({ ...prev, academic_year: current.name }));
          setReportFilters(prev => ({ ...prev, academic_year: current.name }));
        }
      }
    } catch (error: any) {
      if (isPermissionDenied(error)) {
        try {
          await applyStaffClassFallbackFromStructures();
          return;
        } catch (fallbackError) {
          console.error('Fallback academic year load failed:', fallbackError);
        }
      }
      console.error('Error fetching academic years:', error);
      toastError('Failed to fetch academic years');
    }
  }, [applyStaffClassFallbackFromStructures, schoolScope.selectedSchoolId]);

  // Fetch standards and sections
  const fetchStandardsAndSections = useCallback(async () => {
    try {
      const res = await adminApi.academics.standards(schoolScope.scopeParams);

      if (res.data) {
        const data = res.data;
        const standardsData: StandardWithSections[] = data.map((standard: Standard) => ({
          id: standard.id,
          name: standard.name,
          sections: standard.sections.map((section: Section) => section.name)
        }));

        setStandards(standardsData);
        setClasses(data.map((standard: Standard) => standard.name));
        setSections(data.flatMap((standard: Standard) =>
          standard.sections.map((section: Section) => section.name)
        ));
      }
    } catch (error: any) {
      if (isPermissionDenied(error)) {
        try {
          await applyStaffClassFallbackFromStructures();
          return;
        } catch (fallbackError) {
          console.error('Fallback class/section load failed:', fallbackError);
        }
      }
      console.error('Error fetching standards:', error);
      toastError('Failed to fetch classes and sections');
    }
  }, [applyStaffClassFallbackFromStructures, schoolScope.selectedSchoolId]);

  // Fetch fee structures
  const fetchFeeStructures = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filterYear !== 'all') queryParams.append('academic_year', filterYear);
      if (filterClass !== 'all') queryParams.append('class', filterClass);
      if (filterType !== 'all') queryParams.append('fee_type', filterType);
      if (structureSearchQuery.trim()) queryParams.append('q', structureSearchQuery.trim());
      if (schoolScope.scopeParams.school_id) queryParams.append('school_id', String(schoolScope.scopeParams.school_id));
      queryParams.append('page', String(currentPage));
      queryParams.append('page_size', String(itemsPerPage));

      const res = await adminApi.fees.feeStructure(queryParams);
      if (res.data) {
        const data = res.data;
        setFeeStructures(data.data || []);
        const pagination = data.pagination;
        if (pagination) {
          setStructurePagination({
            page: pagination.page ?? currentPage,
            page_size: pagination.page_size ?? itemsPerPage,
            total: pagination.total ?? 0,
            total_pages: pagination.total_pages ?? 1,
            has_next: Boolean(pagination.has_next),
            has_previous: Boolean(pagination.has_previous)
          });
          if (pagination.page && pagination.page !== currentPage) {
            setCurrentPage(pagination.page);
          }
        } else {
          const total = data.count || (data.data || []).length || 0;
          const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
          setStructurePagination({
            page: currentPage,
            page_size: itemsPerPage,
            total,
            total_pages: totalPages,
            has_next: currentPage < totalPages,
            has_previous: currentPage > 1
          });
        }
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error);
      toastError('Failed to fetch fee structures');
      setFeeStructures([]);
      setStructurePagination({
        page: 1,
        page_size: itemsPerPage,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false
      });
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterClass, filterType, structureSearchQuery, currentPage, itemsPerPage, schoolScope.selectedSchoolId]);

  // Fetch fee types
  const fetchFeeTypes = useCallback(async () => {
    try {
      const res = await adminApi.fees.feeTypes();

      if (res.data) {
        const data = res.data;
        setFeeTypes(data.fee_types || []);
      }
    } catch (error) {
      console.error('Error fetching fee types:', error);
    }
  }, []);

  // Assign fee to class
  const assignFeeToClass = async () => {
    const normalizedFeeType = assignFeeData.fee_type.trim();
    if (!normalizedFeeType) {
      toastInfo('Fee type is required.');
      return;
    }
    if (!/^[a-zA-Z0-9\s-]+$/.test(normalizedFeeType)) {
      toastError('Fee type can only contain letters, numbers, spaces, and hyphens.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await adminApi.fees.feeAssign({
        ...assignFeeData,
        fee_type: normalizedFeeType,
        ...schoolScope.scopeParams,
      });

      const data = extractApiPayload(res.data) || {};

      if (res.data) {
        toastSuccess(`Fee assigned successfully to ${data.students_created || 0} students`);
        setShowAssignModal(false);
        setAssignFeeTypeMode('existing');
        setAssignFeeData({
          academic_year: currentAcademicYear,
          class_name: '',
          fee_type: '',
          amount: '',
          installment_count: '1',
          due_date: format(new Date().setMonth(new Date().getMonth() + 1), 'yyyy-MM-dd'),
          override_existing: false
        });
        fetchFeeTypes();
        fetchFeeStructures();
        setActiveTab('structure');
      } else {
        toastError(data.error || data.message || 'Failed to assign fee');
      }
    } catch (error: any) {
      console.error('Error assigning fee:', error);
      const payload = error?.response?.data || {};
      toastError(getApiErrorMessage(payload, 'Failed to assign fee'));
    } finally {
      setActionLoading(false);
    }
  };

  // Update fee structure
  const updateFeeStructure = async () => {
    setActionLoading(true);
    try {
      const res = await adminApi.fees.feeUpdate({
        ...updateFeeData,
        ...schoolScope.scopeParams,
      });

      const data = extractApiPayload(res.data) || {};

      if (res.data) {
        toastSuccess('Fee structure updated successfully');
        setShowUpdateModal(false);
        setUpdateFeeData({
          fee_id: '',
          academic_year: '',
          class_name: '',
          fee_type: '',
          new_amount: '',
          installment_count: '1',
          due_date: ''
        });
        fetchFeeStructures();
      } else {
        toastError(data.error || data.message || 'Failed to update fee structure');
      }
    } catch (error: any) {
      console.error('Error updating fee:', error);
      const payload = error?.response?.data || {};
      toastError(getApiErrorMessage(payload, 'Failed to update fee structure'));
    } finally {
      setActionLoading(false);
    }
  };

  // Delete fee structure
  const deleteFeeStructure = async (feeId: number) => {
    setActionLoading(true);
    try {
      const res = await adminApi.fees.feeDelete({ fee_id: feeId, ...schoolScope.scopeParams });

      const data = extractApiPayload(res.data) || {};

      if (res.data) {
        toastSuccess(data.message || 'Fee structure deleted successfully');
        fetchFeeStructures();
        setShowDeleteConfirm(null);
      } else {
        toastError(data.error || data.message || 'Failed to delete fee structure');
      }
    } catch (error: any) {
      console.error('Error deleting fee:', error);
      const payload = error?.response?.data || {};
      toastError(getApiErrorMessage(payload, 'Failed to delete fee structure'));
    } finally {
      setActionLoading(false);
    }
  };

  // Record offline payment
  const recordPayment = async () => {
    setActionLoading(true);
    try {
      console.log(paymentData)
      const res = await adminApi.fees.feePaymentOffline({
        ...paymentData,
        ...schoolScope.scopeParams,
      });

      const data = await res.data;

      if (res.data) {
        toastSuccess('Payment recorded successfully');
        setShowPaymentModal(false);
        setPaymentData({
          student_id: '',
          class_name: '',
          fee_type: '',
          paid_amount: '',
          payment_mode: 'CASH',
          transaction_id: '',
          academic_year: currentAcademicYear
        });
        if (dailyCollection) fetchDailyCollection();
      } else {
        toastError(data.error || data.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      toastError('Payment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch concessions
  const fetchConcessions = useCallback(async (year?: string) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      const academicYear = year || currentAcademicYear;
      queryParams.append('academic_year', academicYear);

      if (concessionFilters.student_id) {
        queryParams.append('student_id', concessionFilters.student_id);
      }
      if (schoolScope.scopeParams.school_id) queryParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const res = await adminApi.fees.feeGetConcession(queryParams);

      if (res.data) {
        const data = await res.data;
        setConcessions(data.concessions || []);
      }
    } catch (error) {
      console.error('Error fetching concessions:', error);
      toastError('Failed to fetch concessions');
    } finally {
      setLoading(false);
    }
  }, [concessionFilters.student_id, currentAcademicYear, schoolScope.selectedSchoolId]);

  // Apply concession
  const applyConcession = async () => {
    setActionLoading(true);
    try {
      const payload = {
        ...concessionData,
        academic_year: concessionData.academic_year || currentAcademicYear,
        ...schoolScope.scopeParams,
      };

      const res = await adminApi.fees.feePostConcession(payload);
      const data = extractApiPayload(res.data) || {};
      const report = Array.isArray(data?.report) ? data.report : [];
      const successCount = report.filter((item: any) => String(item?.status).toLowerCase() === 'success').length;
      const failedCount = report.length - successCount;
      const firstFailed = report.find((item: any) => String(item?.status).toLowerCase() !== 'success');

      if (successCount > 0) {
        if (failedCount > 0) {
          toastWarning(`Concession applied for ${successCount} item(s), ${failedCount} item(s) failed`);
        } else {
          toastSuccess('Concession applied successfully');
        }

        setShowConcessionModal(false);
        setConcessionData({
          student_id: '',
          academic_year: currentAcademicYear,
          discounts: [{ fee_type: '', discount_amount: '' }]
        });
        await fetchConcessions();
      } else {
        if (
          firstFailed?.concession_id &&
          String(firstFailed?.reason || '').toLowerCase().includes('already assigned')
        ) {
          const shouldUpdate = window.confirm('Concession already assigned. Do you want to update it?');
          if (shouldUpdate) {
            const updateAmount = firstFailed?.attempted_amount || '';
            if (!updateAmount) {
              toastError('Unable to update concession: amount missing');
              return;
            }

            const updateRes = await adminApi.fees.feePutConcession({
              concession_id: Number(firstFailed.concession_id),
              new_amount: updateAmount,
              ...schoolScope.scopeParams,
            });
            const updateData = extractApiPayload(updateRes.data) || {};
            toastSuccess(updateData.message || 'Concession updated successfully');
            setShowConcessionModal(false);
            setConcessionData({
              student_id: '',
              academic_year: currentAcademicYear,
              discounts: [{ fee_type: '', discount_amount: '' }]
            });
            await fetchConcessions();
            return;
          }
        }
        toastError(getConcessionErrorMessage(data));
      }
    } catch (error: any) {
      console.error('Error applying concession:', error);
      const payload = error?.response?.data || {};
      toastError(getConcessionErrorMessage(payload));
    } finally {
      setActionLoading(false);
    }
  };

  const updateConcessionById = async (concession: Concession) => {
    if (!concession.id) {
      toastError('Concession id not found');
      return;
    }

    const nextAmount = window.prompt(
      'Enter updated concession amount',
      String(concession.concession_amount || '')
    );
    if (nextAmount === null) return;

    setActionLoading(true);
    try {
      const res = await adminApi.fees.feePutConcession({
        concession_id: concession.id,
        new_amount: nextAmount,
        ...schoolScope.scopeParams,
      });
      const data = extractApiPayload(res.data) || {};
      toastSuccess(data.message || 'Concession updated successfully');
      await fetchConcessions();
    } catch (error: any) {
      const payload = error?.response?.data || {};
      toastError(getConcessionErrorMessage(payload));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteConcessionById = async (concession: Concession) => {
    if (!concession.id) {
      toastError('Concession id not found');
      return;
    }

    const shouldDelete = window.confirm('Are you sure you want to delete this concession?');
    if (!shouldDelete) return;

    setActionLoading(true);
    try {
      const res = await adminApi.fees.feeDeleteConcession(concession.id, schoolScope.scopeParams);
      const data = extractApiPayload(res.data) || {};
      toastSuccess(data.message || 'Concession removed successfully');
      await fetchConcessions();
    } catch (error: any) {
      const payload = error?.response?.data || {};
      toastError(getApiErrorMessage(payload, 'Failed to delete concession'));
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch class fee report
  const fetchClassFeeReport = async () => {
    if (!reportFilters.academic_year) {
      toastWarning('Please select an academic year first');
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('academic_year', reportFilters.academic_year);
      if (reportFilters.class) queryParams.append('class', reportFilters.class);
      if (reportFilters.section) queryParams.append('section', reportFilters.section);
      if (reportFilters.fee_type) queryParams.append('fee_type', reportFilters.fee_type);
      if (schoolScope.scopeParams.school_id) queryParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const res = await adminApi.fees.feeGetReport(queryParams);

      if (res.data) {
        const data = extractApiPayload(res.data);
        setClassFeeReport(data);
        toastSuccess('Class fee report loaded');

        setTimeout(() => {
          document.getElementById('class-report')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const error = await res.data;
        toastError(error.error || 'Failed to fetch report');
      }
    } catch (error) {
      console.error('Error fetching class fee report:', error);
      toastError('Failed to fetch class fee report');
    } finally {
      setLoading(false);
    }
  };

  // Fetch school due report
  const fetchSchoolDueReport = async () => {
    if (!reportFilters.academic_year) {
      toastWarning('Please select an academic year first');
      return;
    }

    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('academic_year', reportFilters.academic_year);
      if (reportFilters.fee_type) queryParams.append('fee_type', reportFilters.fee_type);
      if (schoolScope.scopeParams.school_id) queryParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const res = await adminApi.fees.feeGetReportDue(queryParams);

      if (res.data) {
        const data = extractApiPayload(res.data);
        setDueSchoolReport(data);
        toastSuccess('School due report loaded');

        setTimeout(() => {
          document.getElementById('school-report')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        const error = await res.data;
        toastError(error.error || 'Failed to fetch report');
      }
    } catch (error) {
      console.error('Error fetching school due report:', error);
      toastError('Failed to fetch school due report');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFeeSummaryReport = useCallback(async (overrides?: { student_id?: string; academic_year?: string }) => {
    const effectiveStudentId = (overrides?.student_id ?? studentReportFilters.student_id).trim();
    const effectiveAcademicYear = overrides?.academic_year ?? (studentReportFilters.academic_year || undefined);

    if (!effectiveStudentId) {
      toastWarning('Please enter a student ID');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.fees.feeStudentSummary({
        student_id: effectiveStudentId,
        academic_year: effectiveAcademicYear,
        ...schoolScope.scopeParams,
      });
      const data = extractApiPayload(res.data);
      setStudentFeeSummaryReport(data);
      toastSuccess('Student fee report loaded');
    } catch (error: any) {
      console.error('Error fetching student fee report:', error);
      const msg = error?.response?.data?.error || 'Failed to fetch student fee report';
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [studentReportFilters.student_id, studentReportFilters.academic_year, schoolScope.selectedSchoolId]);

  // Fetch daily collection
  const fetchDailyCollection = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();

      if (dateRange.from === dateRange.to) {
        queryParams.append('date', dateRange.from);
      } else {
        queryParams.append('from_date', dateRange.from);
        queryParams.append('to_date', dateRange.to);
      }
      if (schoolScope.scopeParams.school_id) queryParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const res = await adminApi.fees.feeDailyReport(queryParams);

      if (res.data) {
        const data = extractApiPayload(res.data);
        setDailyCollection(data);
        setRecentTransactions(data.transactions || []);

        setTimeout(() => {
          document.getElementById('daily-report')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Error fetching daily collection:', error);
      toastError('Failed to fetch daily collection');
    } finally {
      setLoading(false);
    }
  }, [dateRange.from, dateRange.to, schoolScope.selectedSchoolId]);

  // Fetch summary data for top cards without changing active tab
  const fetchQuickStats = useCallback(async () => {
    if (!currentAcademicYear) return;

    try {
      const dueParams = new URLSearchParams();
      dueParams.append('academic_year', currentAcademicYear);
      if (schoolScope.scopeParams.school_id) dueParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const today = format(new Date(), 'yyyy-MM-dd');
      const dailyParams = new URLSearchParams();
      dailyParams.append('date', today);
      if (schoolScope.scopeParams.school_id) dailyParams.append('school_id', String(schoolScope.scopeParams.school_id));

      const [dueRes, dailyRes] = await Promise.all([
        adminApi.fees.feeGetReportDue(dueParams),
        adminApi.fees.feeDailyReport(dailyParams),
      ]);

      const dueData = extractApiPayload(dueRes?.data);
      if (dueData?.summary) {
        setDueSchoolReport(dueData);
      }

      const dailyData = extractApiPayload(dailyRes?.data);
      if (dailyData && (dailyData.total_collected !== undefined || dailyData.transactions !== undefined)) {
        setDailyCollection(dailyData);
        setRecentTransactions(dailyData.transactions || []);
      }
    } catch (error) {
      console.error('Error fetching fees quick stats:', error);
    }
  }, [currentAcademicYear, schoolScope.selectedSchoolId]);

  const fetchFeeStatsCards = useCallback(async () => {
    if (!currentAcademicYear) return;

    setLoadingFeeStatsCards(true);
    try {
      const res = await adminApi.fees.feeStatsCards({ academic_year: currentAcademicYear, ...schoolScope.scopeParams });
      const data = extractApiPayload(res.data);
      if (data?.cards) {
        setFeeStatsCards(data);
      }
    } catch (error) {
      console.error('Error fetching fees stats cards:', error);
    } finally {
      setLoadingFeeStatsCards(false);
    }
  }, [currentAcademicYear, schoolScope.selectedSchoolId]);

  // Fetch receipt
  const fetchReceipt = async (transactionId: string) => {
    setLoading(true);
    try {
      const res = await adminApi.fees.feeTransaction(transactionId);

      if (res.data) {
        const data = await res.data;
        setReceiptData(data.receipt);
        setShowReceiptModal(true);
        toastSuccess('Receipt loaded successfully');
      } else {
        toastError('Receipt not found');
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toastError('Failed to fetch receipt');
    } finally {
      setLoading(false);
    }
  };

  // ============ EXPORT FUNCTIONS ============

  const exportToPDF = (data: any, type: string) => {
    setExportLoading(true);
    try {
      const doc = new jsPDF();

      doc.setFontSize(18);
      doc.text('School Fees Management System', 14, 22);
      doc.setFontSize(12);
      doc.text(`${type} Report - ${format(new Date(), 'dd/MM/yyyy')}`, 14, 32);

      if (type === 'Fee Structures' && feeStructures.length) {
        autoTable(doc, {
          head: [['Class', 'Fee Type', 'Academic Year', 'Amount', 'Due Date']],
          body: feeStructures.map(f => [
            f.class_name,
            f.fee_type,
            f.academic_year,
            `₹${f.amount}`,
            format(new Date(f.due_date), 'dd/MM/yyyy')
          ]),
          startY: 40,
        });
      } else if (type === 'Class Report' && classFeeReport) {
        autoTable(doc, {
          head: [['Student ID', 'Student Name', 'Paid', 'Due', 'Status']],
          body: classFeeReport.students.map(s => [
            s.student_id,
            s.student_name,
            `₹${s.paid_amount}`,
            `₹${s.due_amount}`,
            s.payment_status
          ]),
          startY: 40,
        });
      } else if (type === 'Daily Collection' && dailyCollection) {
        autoTable(doc, {
          head: [['Student ID', 'Amount', 'Mode', 'Transaction ID']],
          body: dailyCollection.transactions.map(t => [
            t.student_id,
            `₹${t.amount}`,
            t.mode,
            t.txn_id
          ]),
          startY: 40,
        });
      }

      doc.save(`${type.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`);
      toastSuccess('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toastError('Failed to export PDF');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToExcel = (data: any, type: string) => {
    setExportLoading(true);
    try {
      let worksheet: XLSX.WorkSheet;
      let workbook: XLSX.WorkBook;

      if (type === 'Fee Structures' && feeStructures.length) {
        worksheet = XLSX.utils.json_to_sheet(
          feeStructures.map(f => ({
            Class: f.class_name,
            'Fee Type': f.fee_type,
            'Academic Year': f.academic_year,
            Amount: f.amount,
            'Due Date': f.due_date
          }))
        );
      } else if (type === 'Class Report' && classFeeReport) {
        worksheet = XLSX.utils.json_to_sheet(
          classFeeReport.students.map(s => ({
            'Student ID': s.student_id,
            'Student Name': s.student_name,
            'Roll Number': s.roll_number,
            Class: s.class,
            Section: s.section,
            'Paid Amount': s.paid_amount,
            'Due Amount': s.due_amount,
            Status: s.payment_status
          }))
        );
      } else if (type === 'School Due Report' && dueSchoolReport) {
        const allStudents: any[] = [];
        dueSchoolReport.dues_by_class.forEach(c => {
          c.students.forEach(s => {
            allStudents.push({
              Class: c.class,
              'Student ID': s.student_id,
              'Student Name': s.student_name,
              Section: s.section,
              'Total Fee': s.total_amount,
              'Paid Amount': s.paid_amount,
              'Due Amount': s.due_amount,
              'Parent Phone': s.parent_phone,
              Status: s.status
            });
          });
        });
        worksheet = XLSX.utils.json_to_sheet(allStudents);
      } else if (type === 'Daily Collection' && dailyCollection) {
        worksheet = XLSX.utils.json_to_sheet(
          dailyCollection.transactions.map(t => ({
            'Student ID': t.student_id,
            'Student Name': t.student_name,
            Class: t.class,
            Section: t.section,
            'Fee Type': t.fee_type,
            Amount: t.amount,
            Mode: t.mode,
            'Transaction ID': t.txn_id,
            Date: t.payment_date
          }))
        );
      } else {
        toastWarning('No data to export');
        return;
      }

      workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, type);
      XLSX.writeFile(workbook, `${type.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
      toastSuccess('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      toastError('Failed to export Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToCSV = (data: any, type: string) => {
    setExportLoading(true);
    try {
      let csvContent = '';
      let filename = '';

      if (type === 'Fee Structures' && feeStructures.length) {
        const headers = ['Class', 'Fee Type', 'Academic Year', 'Amount', 'Due Date'];
        const rows = feeStructures.map(f => [
          f.class_name,
          f.fee_type,
          f.academic_year,
          f.amount,
          f.due_date
        ]);
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `fee_structures_${format(new Date(), 'yyyyMMdd')}.csv`;
      } else if (type === 'Class Report' && classFeeReport) {
        const headers = ['Student ID', 'Student Name', 'Roll Number', 'Class', 'Section', 'Paid Amount', 'Due Amount', 'Status'];
        const rows = classFeeReport.students.map(s => [
          s.student_id,
          s.student_name,
          s.roll_number || '',
          s.class,
          s.section,
          s.paid_amount,
          s.due_amount,
          s.payment_status
        ]);
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `class_report_${format(new Date(), 'yyyyMMdd')}.csv`;
      } else if (type === 'Daily Collection' && dailyCollection) {
        const headers = ['Student ID', 'Student Name', 'Class', 'Section', 'Fee Type', 'Amount', 'Mode', 'Transaction ID', 'Date'];
        const rows = dailyCollection.transactions.map(t => [
          t.student_id,
          t.student_name || '',
          t.class || '',
          t.section || '',
          t.fee_type || '',
          t.amount,
          t.mode,
          t.txn_id,
          t.payment_date
        ]);
        csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        filename = `daily_collection_${format(new Date(), 'yyyyMMdd')}.csv`;
      } else {
        toastWarning('No data to export');
        return;
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, filename);
      toastSuccess('CSV file exported successfully');
    } catch (error) {
      console.error('CSV export error:', error);
      toastError('Failed to export CSV');
    } finally {
      setExportLoading(false);
    }
  };

  // ============ UTILITY FUNCTIONS ============

  const getSectionsForClass = (className: string): string[] => {
    const standard = standards.find(std => std.name === className);
    return standard ? standard.sections : [];
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStructures = useMemo(() => {
    return [...feeStructures].sort((a, b) => {
      const aValue: any = a[sortConfig.key as keyof FeeStructure];
      const bValue: any = b[sortConfig.key as keyof FeeStructure];

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [feeStructures, sortConfig]);

  const filteredStructures = sortedStructures;

  const filteredConcessions = useMemo(() => {
    return concessions.filter(c => {
      const matchesSearch =
        c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.fee_type.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || true;

      return matchesSearch && matchesStatus;
    });
  }, [concessions, searchTerm, filterStatus]);

  const totalPages = structurePagination.total_pages || 1;
  const indexOfFirstItem = structurePagination.total > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
  const indexOfLastItem = structurePagination.total > 0 ? indexOfFirstItem + filteredStructures.length - 1 : 0;
  const currentStructures = filteredStructures;

  const uniqueYears = Array.from(new Set(academicYears.map(y => y.name)));
  const uniqueTypes = Array.from(new Set(feeTypes));

  const totalFeeAmount = feeStatsCards?.cards?.total_assigned_amount ?? 0;
  const assignedFeeRecordsCount = feeStatsCards?.cards?.assigned_fee_records_count ?? 0;
  const totalPending = feeStatsCards?.cards?.total_pending_amount ?? 0;
  const totalCollected = feeStatsCards?.cards?.total_collected_amount ?? 0;
  const totalConcessionAmount = feeStatsCards?.cards?.total_concession_amount ?? 0;
  const totalCollectedToday = feeStatsCards?.cards?.today_collected_amount ?? 0;
  const totalTransactionsToday = feeStatsCards?.cards?.today_transactions ?? 0;

  const classWiseReportGroups = useMemo(() => {
    if (!classFeeReport || classFeeReport.class !== 'ALL') return [];

    const grouped = new Map<string, StudentFee[]>();
    for (const student of classFeeReport.students) {
      const cls = student.student_class || student.class || 'Unknown';
      const sec = student.student_section || student.section || 'NA';
      const key = `${cls}::${sec}`;
      const list = grouped.get(key) || [];
      list.push(student);
      grouped.set(key, list);
    }

    return Array.from(grouped.entries()).map(([key, students]) => {
      const [cls, section] = key.split('::');
      return { key, className: cls, section, students };
    });
  }, [classFeeReport]);

  const addDiscountField = () => {
    setConcessionData(prev => ({
      ...prev,
      discounts: [...prev.discounts, { fee_type: '', discount_amount: '' }]
    }));
  };

  const removeDiscountField = (index: number) => {
    setConcessionData(prev => ({
      ...prev,
      discounts: prev.discounts.filter((_, i) => i !== index)
    }));
  };

  const updateDiscountField = (index: number, field: string, value: string) => {
    const newDiscounts = [...concessionData.discounts];
    newDiscounts[index] = { ...newDiscounts[index], [field]: value };
    setConcessionData(prev => ({ ...prev, discounts: newDiscounts }));
  };

  // ============ EFFECTS ============

  useEffect(() => {
    const timer = setTimeout(() => {
      setStructureSearchQuery(searchTerm);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterYear, filterClass, filterType, structureSearchQuery, schoolScope.selectedSchoolId]);

  useEffect(() => {
    fetchAcademicYears();
    fetchStandardsAndSections();
    fetchFeeTypes();
  }, [fetchAcademicYears, fetchStandardsAndSections, fetchFeeTypes, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (currentAcademicYear) {
      fetchFeeStructures();
    }
  }, [currentAcademicYear, fetchFeeStructures]);

  useEffect(() => {
    if (!currentAcademicYear) return;
    setReportFilters(prev => ({ ...prev, academic_year: currentAcademicYear }));
    setStudentReportFilters(prev => ({ ...prev, academic_year: currentAcademicYear }));
  }, [currentAcademicYear]);

  useEffect(() => {
    const managementTabs = new Set(['structure', 'assign', 'concessions']);
    const reportsTabs = new Set(['reports', 'dueReports', 'studentReports', 'receipts']);

    if (isFeeReportsRoute) {
      if (!reportsTabs.has(activeTab)) {
        setActiveTab('reports');
      }
      return;
    }

    if (!managementTabs.has(activeTab)) {
      setActiveTab('structure');
    }
  }, [isFeeReportsRoute, activeTab]);

  useEffect(() => {
    if (activeTab === 'concessions' && currentAcademicYear) {
      fetchConcessions();
    } else if (showReportTabs && activeTab === 'reports' && currentAcademicYear) {
      fetchDailyCollection();
    }
  }, [activeTab, currentAcademicYear, fetchConcessions, fetchDailyCollection, showReportTabs]);

  useEffect(() => {
    fetchQuickStats();
    fetchFeeStatsCards();
  }, [fetchQuickStats, fetchFeeStatsCards]);

  useEffect(() => {
    if (!isFeeReportsRoute || redirectParamsHandled.current) return;

    const redirectedFrom = searchParams.get('redirectedFrom');
    const tabParam = searchParams.get('tab');
    const studentIdParam = (searchParams.get('studentId') || searchParams.get('student_id') || '').trim();
    const academicYearParam = (searchParams.get('academicYear') || searchParams.get('academic_year') || '').trim();

    setShowRedirectBackButton(redirectedFrom === 'allstudents');

    if (tabParam === 'studentReports' || studentIdParam) {
      setActiveTab('studentReports');
    }

    if (studentIdParam) {
      setStudentReportFilters(prev => ({
        ...prev,
        student_id: studentIdParam,
        academic_year: academicYearParam || prev.academic_year
      }));
      void fetchStudentFeeSummaryReport({
        student_id: studentIdParam,
        academic_year: academicYearParam || undefined
      });
    }

    redirectParamsHandled.current = true;
  }, [isFeeReportsRoute, searchParams, fetchStudentFeeSummaryReport]);

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/students/allstudents';
  };

  const resetAssignFeeForm = () => {
    setAssignFeeTypeMode('existing');
    setAssignFeeData({
      academic_year: currentAcademicYear,
      class_name: '',
      fee_type: '',
      amount: '',
      installment_count: '1',
      due_date: format(new Date().setMonth(new Date().getMonth() + 1), 'yyyy-MM-dd'),
      override_existing: false
    });
  };

  const openAssignFeeModal = () => {
    resetAssignFeeForm();
    setShowAssignModal(true);
  };

  const renderAssignFeeTypeField = () => {
    const isNewFeeType = assignFeeTypeMode === 'new';

    return (
      <div>
        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
          Fee Type <span className="text-red-500">*</span>
        </label>
        <select
          value={isNewFeeType ? '__new__' : assignFeeData.fee_type}
          onChange={(e) => {
            if (e.target.value === '__new__') {
              setAssignFeeTypeMode('new');
              setAssignFeeData({ ...assignFeeData, fee_type: '' });
              return;
            }
            setAssignFeeTypeMode('existing');
            setAssignFeeData({ ...assignFeeData, fee_type: e.target.value });
          }}
          required
          className={getInputClass()}
        >
          <option value="">Select Fee Type</option>
          {feeTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
          <option value="__new__">+ Add new fee type</option>
        </select>

        {isNewFeeType && (
          <div className="mt-3">
            <input
              type="text"
              value={assignFeeData.fee_type}
              onChange={(e) => setAssignFeeData({ ...assignFeeData, fee_type: e.target.value })}
              required
              maxLength={50}
              className={getInputClass()}
              placeholder="Enter new fee type, e.g., Exam Fee"
            />
            <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
              New fee types are saved when this fee is assigned.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ============ RENDER ============

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto max-w-[1600px]">
        {/* ============ HEADER SECTION ============ */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 sm:mb-6">
  <div className="flex items-center gap-3 sm:gap-4">
    <div
      className={combine(
        "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
        theme === "dark"
          ? "bg-gradient-to-br from-green-600 to-green-700"
          : "bg-gradient-to-br from-green-500 to-green-600"
      )}
    >
      <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
    </div>
    <div>
      <h1
        className={combine(
          "text-2xl sm:text-3xl font-bold",
          get("text", "primary")
        )}
      >
        Fees Management
      </h1>
      <p
        className={combine(
          "text-xs sm:text-sm mt-1 flex items-center gap-2",
          get("text", "secondary")
        )}
      >
        <MdOutlineDashboard className="text-sm" />
        Manage fee structures, payments, concessions and reports
      </p>
    </div>
  </div>

  <div className="flex items-stretch sm:items-center flex-wrap gap-2 w-full lg:w-auto lg:flex-nowrap">
    <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
    {showRedirectBackButton && (
      <button
        onClick={handleRedirectBack}
        className={combine(getSecondaryButtonClass(), "flex items-center gap-2 whitespace-nowrap")}
      >
        <FaArrowLeft className="text-sm" />
        <span className="hidden sm:inline">Back</span>
      </button>
    )}
    <select
      value={currentAcademicYear}
      onChange={(e) => setCurrentAcademicYear(e.target.value)}
      className={combine(getInputClass(), "min-w-0 w-full sm:w-auto sm:min-w-[170px] flex-1 sm:flex-none")}
    >
      <option value="">Select Academic Year</option>
      {academicYears.map((year) => (
        <option key={year.id} value={year.name}>
          {year.name} {year.is_current ? "(Active)" : ""}
        </option>
      ))}
    </select>

    {showReportTabs && (
      <button
        onClick={() => setShowPaymentModal(true)}
        className={combine(getPrimaryButtonClass(), "w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap")}
      >
        <FaCreditCard className="text-sm" />
        <span className="hidden sm:inline">Record Payment</span>
        <span className="sm:hidden">Pay</span>
      </button>
    )}

    {showManagementTabs && (
      <button
        onClick={openAssignFeeModal}
        className={combine(
          getPrimaryButtonClass("blue"),
          "w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap"
        )}
      >
        <FaPlus className="text-sm" />
        <span className="hidden sm:inline">Assign Fee</span>
        <span className="sm:hidden">Add</span>
      </button>
    )}
  </div>
</div>

          {/* ============ QUICK STATS ============ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 mt-6">
            <div className={getStatsCardClass('green')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Fees (Assigned)</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingFeeStatsCards ? '...' : `₹${totalFeeAmount.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                )}>
                  <FaMoneyBillWave className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {loadingFeeStatsCards ? 'Loading...' : `${assignedFeeRecordsCount} student fee records`}
              </div>
            </div>

            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Concession</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingFeeStatsCards ? '...' : `₹${totalConcessionAmount.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaLayerGroup className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {loadingFeeStatsCards ? 'Loading...' : `${assignedFeeRecordsCount} student fee records`}
              </div>
            </div>

            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Pending</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingFeeStatsCards ? '...' : `₹${totalPending.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <FaExclamationTriangle className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {loadingFeeStatsCards ? 'Loading...' : `${feeStatsCards?.cards?.due_students_count ?? 0} due students`}
              </div>
            </div>

            <div className={getStatsCardClass('indigo')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Collected (Academic Year)</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingFeeStatsCards ? '...' : `₹${totalCollected.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaMoneyCheckAlt className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {loadingFeeStatsCards ? 'Loading...' : `${feeStatsCards?.cards?.collection_rate?.toFixed(1) ?? '0.0'}% collection rate`}
              </div>
            </div>

            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Today Collection</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingFeeStatsCards ? '...' : `₹${totalCollectedToday.toLocaleString('en-IN')}`}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaBell className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 text-xs", get('text', 'tertiary'))}>
                {loadingFeeStatsCards ? 'Loading...' : `${totalTransactionsToday} transactions today`}
              </div>
            </div>
          </div>
        </div>

        {/* ============ TABS NAVIGATION ============ */}
        <div className="mb-6 overflow-x-auto">
          <div className="border-b border-gray-200 dark:border-gray-700 min-w-max">
            <nav className="-mb-px flex space-x-6">
              {showManagementTabs && (
                <button
                  onClick={() => setActiveTab('structure')}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'structure'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaFileInvoiceDollar className="text-sm" />
                  <span>Fee Structures</span>
                </button>
              )}

              {showManagementTabs && (
                <button
                  onClick={() => setActiveTab('assign')}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'assign'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaUserPlus className="text-sm" />
                  <span>Assign Fee</span>
                </button>
              )}

              {showManagementTabs && (
                <button
                  onClick={() => setActiveTab('concessions')}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'concessions'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaPercent className="text-sm" />
                  <span>Concessions</span>
                </button>
              )}

              {showReportTabs && (
                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setTimeout(() => {
                      reportsRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'reports'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaChartBar className="text-sm" />
                  <span>Reports</span>
                </button>
              )}

              {showReportTabs && (
                <button
                  onClick={() => {
                    setActiveTab('dueReports');
                    setTimeout(() => {
                      dueReportsRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'dueReports'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaUniversity className="text-sm" />
                  <span>Due Reports</span>
                </button>
              )}

              {showReportTabs && (
                <button
                  onClick={() => setActiveTab('studentReports')}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'studentReports'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaUserPlus className="text-sm" />
                  <span>Student Report</span>
                </button>
              )}

              {showReportTabs && (
                <button
                  onClick={() => setActiveTab('receipts')}
                  className={combine(
                    "py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors",
                    activeTab === 'receipts'
                      ? 'border-green-500 text-green-600 dark:text-green-400 dark:border-green-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaReceipt className="text-sm" />
                  <span>Receipts</span>
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* ============ MAIN CONTENT AREA ============ */}

        {/* FEE STRUCTURES TAB */}
        {showManagementTabs && activeTab === 'structure' && (
          <div className="animate-fade-in">
            {/* Search & Filters */}
            <div className={getCardGradientClass('green', true)}>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search by fee type, class, or year..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={combine(getInputClass(), "h-12")}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="flex items-center flex-wrap gap-2 w-full md:w-auto">
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className={combine(getInputClass(), "h-12 w-full sm:w-auto sm:min-w-[120px]")}
                  >
                    <option value="all">All Years</option>
                    {academicYears.map(year => (
                      <option key={year.id} value={year.name}>{year.name}</option>
                    ))}
                  </select>

                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className={combine(getInputClass(), "h-12 w-full sm:w-auto sm:min-w-[120px]")}
                  >
                    <option value="all">All Classes</option>
                    {classes.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className={combine(getInputClass(), "h-12 w-full sm:w-auto sm:min-w-[120px]")}
                  >
                    <option value="all">All Types</option>
                    {uniqueTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setShowExportModal(true)}
                    className={combine(getSecondaryButtonClass(), "h-12 flex items-center gap-2")}
                    disabled={feeStructures.length === 0}
                  >
                    <FiDownload className="text-sm" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Fee Structures Table */}
            <div className={getCardGradientClass('green', true)}>
              <div className={combine("p-4 border-b", get('border', 'primary'))}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      Fee Structures
                    </h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      {structurePagination.total} structures found
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={openAssignFeeModal}
                      className={combine(getPrimaryButtonClass(), "flex items-center gap-2")}
                    >
                      <FaPlus className="text-sm" />
                      <span>Assign New</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                {loading ? (
                  <div className="p-12 text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                        </div>
                      </div>
                      <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>
                        Loading fee structures...
                      </p>
                      <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>
                        Preparing fee structure records
                      </p>
                    </div>
                  </div>
                ) : currentStructures.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className={combine(
                      "inline-block p-4 rounded-full mb-4",
                      theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                    )}>
                      <FaMoneyBillWave className={combine(
                        "text-3xl",
                        theme === 'dark' ? 'text-green-400' : 'text-green-500'
                      )} />
                    </div>
                    <h3 className={combine("text-lg font-medium mb-2", get('text', 'primary'))}>
                      No fee structures found
                    </h3>
                    <p className={combine("text-sm mb-6 max-w-md mx-auto", get('text', 'secondary'))}>
                      {searchTerm || filterYear !== 'all' || filterClass !== 'all'
                        ? 'Try adjusting your search or filters'
                        : 'Assign your first fee structure to get started'}
                    </p>
                    <button
                      onClick={openAssignFeeModal}
                      className={combine(getPrimaryButtonClass(), "flex items-center gap-2 mx-auto")}
                    >
                      <FaPlus className="text-sm" />
                      <span>Assign First Fee</span>
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className={combine(
                          "bg-gray-50 dark:bg-gray-800",
                          "divide-y",
                          get('border', 'primary')
                        )}>
                          <tr>
                            {['class_name', 'fee_type', 'academic_year', 'amount', 'installment_count', 'due_date'].map((key) => (
                              <th
                                key={key}
                                className={combine(
                                  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                                  get('text', 'tertiary'),
                                  "hover:bg-[var(--color-bg-hover)]"
                                )}
                                onClick={() => handleSort(key)}
                              >
                                <div className="flex items-center gap-2">
                                  {key === 'class_name' && <MdClass className="text-xs" />}
                                  {key === 'fee_type' && <FaTags className="text-xs" />}
                                  {key === 'academic_year' && <FaCalendar className="text-xs" />}
                                  {key === 'amount' && <FaRupeeSign className="text-xs" />}
                                  {key === 'installment_count' && <FaLayerGroup className="text-xs" />}
                                  {key === 'due_date' && <FaCalendarAlt className="text-xs" />}
                                  <span className="text-xs">
                                    {key.replace('_', ' ').toUpperCase()}
                                  </span>
                                  <div className="ml-1">
                                    {sortConfig.key === key ? (
                                      sortConfig.direction === 'asc' ?
                                        <FaSortUp className={get('accent', 'primary') + " text-xs"} /> :
                                        <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                                    ) : (
                                      <FaSort className={get('icon', 'secondary') + " text-xs"} />
                                    )}
                                  </div>
                                </div>
                              </th>
                            ))}
                            <th className={combine(
                              "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'tertiary')
                            )}>
                              <div className="flex items-center gap-2">
                                <FaCog className="text-xs" />
                                <span className="text-xs">Actions</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className={combine(
                          "divide-y",
                          get('bg', 'card'),
                          get('border', 'primary')
                        )}>
                          {currentStructures.map((fee) => (
                            <tr
                              key={fee.id}
                              className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={combine(
                                    "h-8 w-8 rounded-full flex items-center justify-center",
                                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                  )}>
                                    <MdClass className={combine(
                                      "text-xs",
                                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    )} />
                                  </div>
                                  <span className="font-medium text-sm">Class {fee.class_name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {getFeeTypeBadge(fee.fee_type)}
                              </td>
                              <td className="px-4 py-3">
                                <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                                  {fee.academic_year}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                                  <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                                    {parseFloat(fee.amount).toLocaleString('en-IN')}
                                  </span>
                                </div>
                                <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                  Per installment: ₹{parseFloat(fee.installment_amount || fee.amount).toLocaleString('en-IN')}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                                  {fee.installment_count || 1}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <FaCalendar className={combine("text-xs", get('icon', 'secondary'))} />
                                  <span className={combine("text-sm", get('text', 'primary'))}>
                                    {format(new Date(fee.due_date), 'dd MMM yyyy')}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1.5">
                                  <button
                                    onClick={() => {
                                      setSelectedFee(fee);
                                      setUpdateFeeData({
                                        fee_id: fee.id.toString(),
                                        academic_year: fee.academic_year,
                                        class_name: fee.class_name,
                                        fee_type: fee.fee_type,
                                        new_amount: fee.amount,
                                        installment_count: String(fee.installment_count || 1),
                                        due_date: fee.due_date
                                      });
                                      setShowUpdateModal(true);
                                    }}
                                    className={combine(
                                      "p-2 rounded-xl transition-all duration-200 hover:text-blue-500 hover:bg-blue-500/10",
                                      get('icon', 'primary')
                                    )}
                                    title="Edit"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(fee.id)}
                                    className={combine(
                                      "p-2 rounded-xl transition-all duration-200 hover:text-red-500 hover:bg-red-500/10",
                                      get('icon', 'primary')
                                    )}
                                    title="Delete"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Showing {indexOfFirstItem} to {indexOfLastItem} of {structurePagination.total} entries
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={!structurePagination.has_previous}
                              className={combine(
                                "p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronLeft className="text-xs" />
                            </button>

                            <div className="flex gap-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={combine(
                                      "px-3 py-1.5 rounded-xl transition-all font-medium",
                                      currentPage === pageNum
                                        ? getPrimaryButtonClass()
                                        : getSecondaryButtonClass()
                                    )}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={!structurePagination.has_next}
                              className={combine(
                                "p-2 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronRight className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN FEE TAB */}
        {showManagementTabs && activeTab === 'assign' && (
          <div className="animate-fade-in max-w-2xl mx-auto">
            <div className={getCardGradientClass('blue', true)}>
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaUserPlus className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      Assign Fee to Class
                    </h2>
                    <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                      Assign fee structure to all students in a class
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); assignFeeToClass(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignFeeData.academic_year}
                      onChange={(e) => setAssignFeeData({ ...assignFeeData, academic_year: e.target.value })}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map(year => (
                        <option key={year.id} value={year.name}>
                          {year.name} {year.is_current && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Class <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={assignFeeData.class_name}
                      onChange={(e) => setAssignFeeData({ ...assignFeeData, class_name: e.target.value })}
                      required
                      className={getInputClass()}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>

                  {renderAssignFeeTypeField()}

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Amount (₹) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={assignFeeData.amount}
                      onChange={(e) => setAssignFeeData({ ...assignFeeData, amount: e.target.value })}
                      required
                      min="1"
                      step="0.01"
                      className={getInputClass()}
                      placeholder="35000"
                    />
                  </div>

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Installment Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={assignFeeData.installment_count}
                      onChange={(e) => setAssignFeeData({ ...assignFeeData, installment_count: e.target.value })}
                      required
                      min="1"
                      step="1"
                      className={getInputClass()}
                      placeholder="1"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Due Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={assignFeeData.due_date}
                      onChange={(e) => setAssignFeeData({ ...assignFeeData, due_date: e.target.value })}
                      required
                      className={getInputClass()}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assignFeeData.override_existing}
                        onChange={(e) => setAssignFeeData({ ...assignFeeData, override_existing: e.target.checked })}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600"
                      />
                      <span className={combine("text-sm", get('text', 'primary'))}>
                        Override existing fee records (update amounts for existing students)
                      </span>
                    </label>
                  </div>
                </div>

                <div className={combine("flex gap-2 pt-4 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={resetAssignFeeForm}
                    className={combine(getSecondaryButtonClass(), "flex-1")}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className={combine(getPrimaryButtonClass('blue'), "flex-1 flex items-center justify-center gap-2")}
                  >
                    {actionLoading ? (
                      <>
                        <FaSync className="animate-spin text-sm" />
                        <span>Assigning...</span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span>Assign Fee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CONCESSIONS TAB */}
        {showManagementTabs && activeTab === 'concessions' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Apply Concession Form */}
              <div className="lg:col-span-2">
                <div className={getCardGradientClass('indigo', true)}>
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={combine(
                          "p-3 rounded-xl",
                          theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                        )}>
                          <FaPercent className={combine(
                            "text-lg",
                            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                          )} />
                        </div>
                        <div>
                          <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                            Apply Concession
                          </h2>
                          <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                            Apply fee concession to individual student
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowBulkConcessionModal(true)}
                        className={combine(getSecondaryButtonClass(), "flex items-center gap-2")}
                      >
                        <FaUsers className="text-sm" />
                        <span className="hidden sm:inline">Bulk Concession</span>
                      </button>
                    </div>
                  </div>

                  <form onSubmit={(e) => { e.preventDefault(); applyConcession(); }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Student ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={concessionData.student_id}
                          onChange={(e) => setConcessionData({ ...concessionData, student_id: e.target.value })}
                          required
                          className={getInputClass()}
                          placeholder="STU101"
                        />
                      </div>
                      <div>
                        <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                          Academic Year <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={concessionData.academic_year}
                          onChange={(e) => setConcessionData({ ...concessionData, academic_year: e.target.value })}
                          required
                          className={getInputClass()}
                        >
                          <option value="">Select Academic Year</option>
                          {academicYears.map(year => (
                            <option key={year.id} value={year.name}>
                              {year.name} {year.is_current && '(Current)'}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className={combine("border-t pt-4", get('border', 'primary'))}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={combine("text-md font-semibold", get('text', 'primary'))}>
                          Discounts
                        </h3>
                        <button
                          type="button"
                          onClick={addDiscountField}
                          className={combine(
                            "px-3 py-1.5 rounded-lg text-sm flex items-center gap-1",
                            theme === 'dark'
                              ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/30'
                              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                          )}
                        >
                          <FaPlus className="text-xs" />
                          <span>Add Discount</span>
                        </button>
                      </div>

                      {concessionData.discounts.map((discount, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 items-end">
                          <div>
                            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                              Fee Type <span className="text-red-500">*</span>
                            </label>
                            {feeTypes.length > 0 ? (
                              <select
                                value={discount.fee_type}
                                onChange={(e) => updateDiscountField(index, 'fee_type', e.target.value)}
                                required
                                className={getInputClass()}
                              >
                                <option value="">Select Fee Type</option>
                                {feeTypes.map(type => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type="text"
                                value={discount.fee_type}
                                onChange={(e) => updateDiscountField(index, 'fee_type', e.target.value)}
                                required
                                className={getInputClass()}
                                placeholder="Enter fee type"
                              />
                            )}
                          </div>
                          <div>
                            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                              Discount (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="number"
                              value={discount.discount_amount}
                              onChange={(e) => updateDiscountField(index, 'discount_amount', e.target.value)}
                              required
                              min="1"
                              step="0.01"
                              className={getInputClass()}
                              placeholder="5000"
                            />
                          </div>
                          <div className="flex justify-end">
                            {concessionData.discounts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeDiscountField(index)}
                                className={combine(
                                  "p-3 rounded-lg transition-all hover:bg-red-500/10 hover:text-red-500",
                                  get('icon', 'secondary')
                                )}
                                title="Remove"
                              >
                                <FaMinus className="text-sm" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={combine("flex gap-2 pt-4 border-t", get('border', 'primary'))}>
                      <button
                        type="button"
                        onClick={() => setConcessionData({
                          student_id: '',
                          academic_year: currentAcademicYear,
                          discounts: [{ fee_type: '', discount_amount: '' }]
                        })}
                        className={combine(getSecondaryButtonClass(), "flex-1")}
                      >
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className={combine(getPrimaryButtonClass('indigo'), "flex-1 flex items-center justify-center gap-2")}
                      >
                        {actionLoading ? (
                          <>
                            <FaSync className="animate-spin text-sm" />
                            <span>Applying...</span>
                          </>
                        ) : (
                          <>
                            <FaPercent className="text-sm" />
                            <span>Apply Concession</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Concessions List */}
              <div className="lg:col-span-1">
                <div className={getCardGradientClass('purple', true)}>
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={combine(
                        "p-2 rounded-xl",
                        theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                      )}>
                        <FaClipboardList className={combine(
                          "text-lg",
                          theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                        )} />
                      </div>
                      <div>
                        <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                          All Concessions
                        </h3>
                        <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                          {filteredConcessions.length} concessions found
                        </p>
                      </div>
                    </div>

                    {/* Active Academic Year */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className={combine("text-sm", get('text', 'secondary'))}>
                          Active Year: <span className={combine("font-semibold", get('text', 'primary'))}>{currentAcademicYear || '-'}</span>
                        </div>

                        <button
                          onClick={() => fetchConcessions()}
                          className={combine(
                            "px-3 py-2.5 rounded-lg flex items-center gap-2",
                            getSecondaryButtonClass()
                          )}
                          disabled={loading}
                        >
                          <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {loading ? (
                    <div className="py-8 text-center">
                      <div className="text-center">
                        <div className="relative mx-auto w-16 h-16">
                          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                          </div>
                        </div>
                        <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>
                          Loading concessions...
                        </p>
                        <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>
                          Preparing concession records
                        </p>
                      </div>
                    </div>
                  ) : filteredConcessions.length > 0 ? (
                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                      {filteredConcessions.map((concession, index) => (
                        <div
                          key={index}
                          className={combine(
                            "p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md",
                            theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700' : 'bg-gray-50 hover:bg-white border-gray-200'
                          )}
                          onClick={() => setSelectedConcession(concession)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                                {concession.student_name}
                              </div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                ID: {concession.student_id} • Class {concession.class}
                              </div>
                            </div>
                            <div className={combine(
                              "px-2 py-1 rounded text-xs font-medium",
                              theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                            )}>
                              -₹{parseFloat(concession.concession_amount).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            {concession.fee_type} • {concession.academic_year}
                          </div>
                          <div className="mt-2 flex justify-between items-center">
                            <div className={combine("text-xs", get('text', 'secondary'))}>
                              Balance: ₹{parseFloat(concession.balance_due).toLocaleString('en-IN')}
                            </div>
                            <div className="flex items-center gap-2">
                              {concession.concession_type && (
                                <span className={combine(
                                  "text-xs px-1.5 py-0.5 rounded",
                                  theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                )}>
                                  {concession.concession_type}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateConcessionById(concession);
                                }}
                                className={combine(
                                  "text-xs px-2 py-1 rounded border",
                                  theme === 'dark'
                                    ? 'border-amber-700 text-amber-300 hover:bg-amber-900/20'
                                    : 'border-amber-300 text-amber-700 hover:bg-amber-50'
                                )}
                              >
                                Update
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteConcessionById(concession);
                                }}
                                className={combine(
                                  "text-xs px-2 py-1 rounded border",
                                  theme === 'dark'
                                    ? 'border-red-700 text-red-300 hover:bg-red-900/20'
                                    : 'border-red-300 text-red-700 hover:bg-red-50'
                                )}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FaClipboardList className={combine("text-3xl mx-auto mb-3", get('icon', 'secondary'))} />
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        No concessions found
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {showReportTabs && (activeTab === 'reports' || activeTab === 'dueReports') && (
          <div ref={reportsRef} className="animate-fade-in space-y-6">
            {/* Class Report Filters */}
            {activeTab === 'reports' && (
              <div className={getCardGradientClass('green', true)}>
                <div className="mb-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Academic Year is mandatory. Class, Section and Fee Type are optional.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Class
                    </label>
                    <select
                      value={reportFilters.class}
                      onChange={(e) => setReportFilters({ ...reportFilters, class: e.target.value, section: '' })}
                      className={getInputClass()}
                    >
                      <option value="">All Classes</option>
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Section
                    </label>
                    <select
                      value={reportFilters.section}
                      onChange={(e) => setReportFilters({ ...reportFilters, section: e.target.value })}
                      className={getInputClass()}
                      disabled={!reportFilters.class}
                    >
                      <option value="">All Sections</option>
                      {reportFilters.class && getSectionsForClass(reportFilters.class).map(section => (
                        <option key={section} value={section}>Section {section}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Fee Type
                    </label>
                    {feeTypes.length > 0 ? (
                      <select
                        value={reportFilters.fee_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, fee_type: e.target.value })}
                        className={getInputClass()}
                      >
                        <option value="">All Types</option>
                        {feeTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={reportFilters.fee_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, fee_type: e.target.value })}
                        className={getInputClass()}
                        placeholder="Enter fee type"
                      />
                    )}
                  </div>

                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reportFilters.academic_year}
                      onChange={(e) => setReportFilters({ ...reportFilters, academic_year: e.target.value })}
                      className={getInputClass()}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map(year => (
                        <option key={year.id} value={year.name}>
                          {year.name} {year.is_current && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={fetchClassFeeReport}
                    className={combine(getPrimaryButtonClass('blue'), "flex items-center gap-2")}
                    disabled={!reportFilters.academic_year || loading}
                  >
                    {loading ? <FaSync className="animate-spin text-sm" /> : <FaChartBar className="text-sm" />}
                    <span>Class Report</span>
                  </button>
                </div>
              </div>
            )}

            {/* School Due Filters */}
            {activeTab === 'dueReports' && (
              <div ref={dueReportsRef} className={getCardGradientClass('red', true)}>
                <div className="mb-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Academic Year is mandatory for School Due Report. Fee Type is optional.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Academic Year <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={reportFilters.academic_year}
                      onChange={(e) => setReportFilters({ ...reportFilters, academic_year: e.target.value })}
                      className={getInputClass()}
                    >
                      <option value="">Select Academic Year</option>
                      {academicYears.map(year => (
                        <option key={year.id} value={year.name}>
                          {year.name} {year.is_current && '(Current)'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Fee Type
                    </label>
                    {feeTypes.length > 0 ? (
                      <select
                        value={reportFilters.fee_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, fee_type: e.target.value })}
                        className={getInputClass()}
                      >
                        <option value="">All Types</option>
                        {feeTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={reportFilters.fee_type}
                        onChange={(e) => setReportFilters({ ...reportFilters, fee_type: e.target.value })}
                        className={getInputClass()}
                        placeholder="Enter fee type"
                      />
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    onClick={fetchSchoolDueReport}
                    className={combine(getPrimaryButtonClass('purple'), "flex items-center gap-2")}
                    disabled={!reportFilters.academic_year || loading}
                  >
                    {loading ? <FaSync className="animate-spin text-sm" /> : <FaUniversity className="text-sm" />}
                    <span>Load School Due Report</span>
                  </button>
                </div>
              </div>
            )}

            {/* Daily Collection Filter */}
            {activeTab === 'reports' && (
              <div className={getCardGradientClass('amber', true)}>
                <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
                  <div className="w-full lg:flex-1">
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Date Range
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-3 items-center">
                      <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                        className={getInputClass()}
                      />
                      <span className={combine("self-center justify-self-center text-sm", get('text', 'secondary'))}>to</span>
                      <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                        className={getInputClass()}
                      />
                    </div>
                  </div>

                  <button
                    onClick={fetchDailyCollection}
                    className={combine(getPrimaryButtonClass('amber'), "w-full sm:w-auto flex items-center justify-center gap-2 h-auto sm:h-[50px]")}
                    disabled={loading}
                  >
                    {loading ? <FaSync className="animate-spin text-sm" /> : <FaMoneyCheckAlt className="text-sm" />}
                    <span>Get Daily Collection</span>
                  </button>
                </div>
              </div>
            )}

            {/* Class Fee Report */}
            {activeTab === 'reports' && classFeeReport && (
              <div id="class-report" className={getCardGradientClass('blue', true)}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-3 rounded-xl",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <MdClass className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    </div>
                    <div>
                      <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        Class Fee Report
                      </h3>
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        Class {classFeeReport.class} {classFeeReport.section && classFeeReport.section !== 'ALL' ? `- Section ${classFeeReport.section}` : ''} • {classFeeReport.fee_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={combine(
                      "px-4 py-2 rounded-xl font-bold text-sm",
                      theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                    )}>
                      {classFeeReport.total_fee_per_student
                        ? `₹${classFeeReport.total_fee_per_student.toLocaleString('en-IN')} per student`
                        : 'Mixed fee selection'}
                    </div>

                    <button
                      onClick={() => exportToPDF(classFeeReport, 'Class Report')}
                      className={combine(getSecondaryButtonClass(), "p-3")}
                      title="Export to PDF"
                    >
                      <FaFilePdf className="text-sm" />
                    </button>

                    <button
                      onClick={() => exportToExcel(classFeeReport, 'Class Report')}
                      className={combine(getSecondaryButtonClass(), "p-3")}
                      title="Export to Excel"
                    >
                      <FaFileCsv className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-3 md:grid-cols-4 gap-4 mb-6">
  <div
    className={combine(
      "p-4 rounded-xl border",
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}
  >
    <p className={combine("text-xs", get("text", "tertiary"))}>
      Total Students
    </p>
    <p className={combine("text-xl font-bold mt-1", get("text", "primary"))}>
      {classFeeReport.statistics.total_students}
    </p>
  </div>

  <div
    className={combine(
      "p-4 rounded-xl border",
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}
  >
    <p className={combine("text-xs", get("text", "tertiary"))}>Paid</p>
    <p
      className={combine(
        "text-xl font-bold mt-1 text-green-600 dark:text-green-400"
      )}
    >
      {classFeeReport.statistics.paid}
    </p>
  </div>

  <div
    className={combine(
      "p-4 rounded-xl border",
      theme === "dark"
        ? "bg-gray-800/50 border-gray-700"
        : "bg-gray-50 border-gray-200"
    )}
  >
    <p className={combine("text-xs", get("text", "tertiary"))}>Overdue</p>
    <p
      className={combine(
        "text-xl font-bold mt-1 text-red-600 dark:text-red-400"
      )}
    >
      {classFeeReport.statistics.overdue}
    </p>
  </div>
</div>

                {/* Students Table */}
                {classFeeReport.class === 'ALL' ? (
                  <div className="space-y-4">
                    {classWiseReportGroups.map((group) => {
                      const isExpanded = !!expandedClassGroups[group.key];
                      const visibleStudents = isExpanded ? group.students : group.students.slice(0, 5);
                      return (
                        <div key={group.key} className={combine("rounded-xl border", theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50')}>
                          <div className={combine("px-4 py-3 border-b flex items-center justify-between", get('border', 'primary'))}>
                            <div className={combine("font-semibold text-sm", get('text', 'primary'))}>
                              Class {group.className} - Section {group.section}
                            </div>
                            <div className={combine("text-xs", get('text', 'tertiary'))}>
                              {group.students.length} students
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                              <thead className={combine("bg-gray-50 dark:bg-gray-800", get('border', 'primary'))}>
                                <tr>
                                  <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Student</th>
                                  <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Paid</th>
                                  <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Due</th>
                                  <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Status</th>
                                  <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Installments</th>
                                </tr>
                              </thead>
                              <tbody className={combine("divide-y", get('border', 'primary'))}>
                                {visibleStudents.map((student, index) => (
                                  <tr key={`${group.key}-${student.student_id}-${index}`} className="hover:bg-[var(--color-bg-hover)]">
                                    <td className="px-4 py-3">
                                      <div>
                                        <div className={combine("font-medium text-sm", get('text', 'primary'))}>{student.student_name}</div>
                                        <div className={combine("text-xs", get('text', 'tertiary'))}>{student.student_id}</div>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center">
                                        <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                                        <span className={combine("font-medium text-sm", get('text', 'primary'))}>{parseFloat(student.paid_amount).toLocaleString('en-IN')}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center">
                                        <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                                        <span className={combine("font-medium text-sm", get('accent', 'warning'))}>{parseFloat(student.due_amount).toLocaleString('en-IN')}</span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="space-y-1">
                                        {getStatusBadge(student.payment_status)}
                                        {student.payment_status === 'PAID' && student.last_payment && (
                                          <div className={combine("text-[11px]", get('text', 'tertiary'))}>
                                            {student.last_payment.mode} • {student.last_payment.transaction_id}
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-1">
                                        <FaHistory className={combine("text-xs", get('icon', 'secondary'))} />
                                        <span className={combine("text-sm", get('text', 'primary'))}>{student.installments_count}</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {group.students.length > 5 && (
                            <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--color-border-primary)' }}>
                              <button
                                onClick={() => setExpandedClassGroups((prev) => ({ ...prev, [group.key]: !isExpanded }))}
                                className={combine(getSecondaryButtonClass(), "text-xs px-3 py-1.5")}
                              >
                                {isExpanded ? 'View Less' : `View More (${group.students.length - 5} more)`}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={combine(
                        "bg-gray-50 dark:bg-gray-800",
                        get('border', 'primary')
                      )}>
                        <tr>
                          <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                            Student
                          </th>
                          <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                            Paid
                          </th>
                          <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                            Due
                          </th>
                          <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                            Status
                          </th>
                          <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                            Installments
                          </th>
                        </tr>
                      </thead>
                      <tbody className={combine("divide-y", get('border', 'primary'))}>
                        {classFeeReport.students.map((student, index) => (
                          <tr key={index} className="hover:bg-[var(--color-bg-hover)]">
                            <td className="px-4 py-3">
                              <div>
                                <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                                  {student.student_name}
                                </div>
                                <div className={combine("text-xs", get('text', 'tertiary'))}>
                                  {student.student_id} • Roll: {student.student_roll || student.roll_number || 'N/A'}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                                <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                                  {parseFloat(student.paid_amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                                <span className={combine("font-medium text-sm", get('accent', 'warning'))}>
                                  {parseFloat(student.due_amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {getStatusBadge(student.payment_status)}
                                {student.payment_status === 'PAID' && student.last_payment && (
                                  <div className={combine("text-[11px]", get('text', 'tertiary'))}>
                                    {student.last_payment.mode} • {student.last_payment.transaction_id}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <FaHistory className={combine("text-xs", get('icon', 'secondary'))} />
                                <span className={combine("text-sm", get('text', 'primary'))}>
                                  {student.installments_count}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* School Due Report */}
            {activeTab === 'dueReports' && dueSchoolReport && (
              <div id="school-report" className={getCardGradientClass('red', true)}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-3 rounded-xl",
                      theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                    )}>
                      <FaUniversity className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-red-400' : 'text-red-600'
                      )} />
                    </div>
                    <div>
                      <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        School-wide Due Report
                      </h3>
                      <p className={combine("text-sm", get('text', 'secondary'))}>
                        {dueSchoolReport.academic_year} • {dueSchoolReport.fee_type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={combine(
                      "px-4 py-2 rounded-xl font-bold text-sm",
                      theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                    )}>
                      ₹{parseFloat(dueSchoolReport.summary.total_pending_amount).toLocaleString('en-IN')} Pending
                    </div>

                    <button
                      onClick={() => exportToExcel(dueSchoolReport, 'School Due Report')}
                      className={combine(getSecondaryButtonClass(), "p-3")}
                      title="Export to Excel"
                    >
                      <FaFileCsv className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className={combine("p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Total Students (Filtered Scope)</p>
                    <p className={combine("text-xl font-bold mt-1", get('text', 'primary'))}>
                      {dueSchoolReport.summary.total_students_in_school}
                    </p>
                  </div>

                  <div className={combine("p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Students with Dues</p>
                    <p className={combine("text-xl font-bold mt-1 text-amber-600 dark:text-amber-400")}>
                      {dueSchoolReport.summary.due_students_count}
                    </p>
                  </div>

                  <div className={combine("p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Due Coverage</p>
                    <p className={combine("text-xl font-bold mt-1 text-blue-600 dark:text-blue-400")}>
                      {dueSchoolReport.summary.coverage_percentage}%
                    </p>
                  </div>
                </div>

                {/* Class-wise Dues */}
                <div className="space-y-4">
                  {dueSchoolReport.dues_by_class.map((classData, index) => (
                    <div key={index} className={combine("p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-800/30 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className={combine("font-semibold text-sm", get('text', 'primary'))}>
                          Class {classData.class} • {classData.total_due_students} student{classData.total_due_students !== 1 ? 's' : ''}
                        </h4>
                        <div className={combine("text-sm font-medium", get('accent', 'warning'))}>
                          Due: ₹{classData.total_due_amount.toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {classData.students.slice(0, 3).map((student, sIndex) => (
                          <div key={sIndex} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className={combine("font-medium", get('text', 'primary'))}>
                                {student.student_name}
                              </span>
                              <span className={combine("text-xs", get('text', 'tertiary'))}>
                                {student.student_id} • Sec {student.section}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(student.status)}
                              <span className={combine("font-medium", get('accent', 'warning'))}>
                                ₹{parseFloat(student.due_amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        ))}

                        {classData.students.length > 3 && (
                          <div
                            className={combine(
                              "text-xs text-center pt-2 cursor-pointer hover:underline",
                              get('text', 'tertiary')
                            )}
                            onClick={() => {
                              setSelectedClassData({
                                class: classData.class,
                                students: classData.students
                              });
                              setShowAllStudentsPopup(true);
                            }}
                          >
                            + {classData.students.length - 3} more students (click to view all)
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Collection Report */}
            {dailyCollection && (
              <div id="daily-report" className={getCardGradientClass('amber', true)}>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={combine(
                      "p-3 rounded-xl",
                      theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                    )}>
                      <FaMoneyCheckAlt className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      )} />
                    </div>
                    <div>
                      <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        Daily Collection Report
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={combine(
                      "px-4 py-2 rounded-xl font-bold text-sm",
                      theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                    )}>
                      ₹{parseFloat(dailyCollection.total_collected).toLocaleString('en-IN')} Collected
                    </div>

                    <button
                      onClick={() => exportToPDF(dailyCollection, 'Daily Collection')}
                      className={combine(getSecondaryButtonClass(), "p-3")}
                      title="Export to PDF"
                    >
                      <FaFilePdf className="text-sm" />
                    </button>
                  </div>
                </div>

                {/* Mode Breakdown */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(dailyCollection.mode_breakdown).map(([mode, amount]) => (
                    <div key={mode} className={combine("p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>{mode}</p>
                      <div className="flex items-center mt-1">
                        <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                        <span className={combine("text-lg font-bold", get('text', 'primary'))}>
                          {typeof amount === 'number' ? amount.toLocaleString('en-IN') : amount}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={combine(
                      "bg-gray-50 dark:bg-gray-800",
                      get('border', 'primary')
                    )}>
                      <tr>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                          Student
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                          Amount
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                          Mode
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                          Transaction ID
                        </th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className={combine("divide-y", get('border', 'primary'))}>
                      {dailyCollection.transactions.map((txn, index) => (
                        <tr key={index} className="hover:bg-[var(--color-bg-hover)]">
                          <td className="px-4 py-3">
                            <div>
                              <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                                {txn.student_name || txn.student_id}
                              </div>
                              {txn.class && (
                                <div className={combine("text-xs", get('text', 'tertiary'))}>
                                  Class {txn.class} {txn.section && `- ${txn.section}`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                                {parseFloat(txn.amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {getPaymentModeBadge(txn.mode)}
                          </td>
                          <td className="px-4 py-3">
                            <div className={combine("text-sm font-mono", get('text', 'secondary'))}>
                              {txn.txn_id}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => fetchReceipt(txn.txn_id)}
                              className={combine(
                                "p-2 rounded-xl transition-all hover:text-blue-500 hover:bg-blue-500/10",
                                get('icon', 'primary')
                              )}
                              title="View Receipt"
                            >
                              <FaReceipt className="text-sm" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDENT REPORT TAB */}
        {showReportTabs && activeTab === 'studentReports' && (
          <div className="animate-fade-in space-y-6">
            <div className={getCardGradientClass('indigo', true)}>
              <div className="mb-3 text-xs font-medium text-amber-600 dark:text-amber-400">
                Enter Student ID and load all fee records. Academic Year is optional.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={studentReportFilters.student_id}
                    onChange={(e) => setStudentReportFilters({ ...studentReportFilters, student_id: e.target.value })}
                    className={getInputClass()}
                    placeholder="Enter student ID"
                  />
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Academic Year
                  </label>
                  <select
                    value={studentReportFilters.academic_year}
                    onChange={(e) => setStudentReportFilters({ ...studentReportFilters, academic_year: e.target.value })}
                    className={getInputClass()}
                  >
                    <option value="">All Academic Years</option>
                    {academicYears.map(year => (
                      <option key={year.id} value={year.name}>
                        {year.name} {year.is_current && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => { void fetchStudentFeeSummaryReport(); }}
                    className={combine(getPrimaryButtonClass('indigo'), "flex items-center gap-2")}
                    disabled={loading || !studentReportFilters.student_id.trim()}
                  >
                    {loading ? <FaSync className="animate-spin text-sm" /> : <FaSearch className="text-sm" />}
                    <span>Load Student Report</span>
                  </button>
                </div>
              </div>
            </div>

            {studentFeeSummaryReport && (
              <div className={getCardGradientClass('blue', true)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {studentFeeSummaryReport.student.profile_image ? (
                      <img
                        src={studentFeeSummaryReport.student.profile_image}
                        alt={studentFeeSummaryReport.student.name}
                        className="h-12 w-12 rounded-full object-cover border border-indigo-300 dark:border-indigo-700"
                      />
                    ) : (
                      <div className={combine(
                        "h-12 w-12 rounded-full flex items-center justify-center",
                        theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                      )}>
                        <FaUsers className={combine(
                          "text-base",
                          theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                        )} />
                      </div>
                    )}
                    <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      Student Fee Summary
                    </h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      {studentFeeSummaryReport.student.id} • {studentFeeSummaryReport.student.name} • Class {studentFeeSummaryReport.student.class || '-'} {studentFeeSummaryReport.student.section ? `- ${studentFeeSummaryReport.student.section}` : ''}
                    </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
                  <div className={combine("p-3 rounded-xl border", theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Total Fee</p>
                    <p className={combine("text-lg font-bold mt-1", get('text', 'primary'))}>₹{parseFloat(studentFeeSummaryReport.summary.total_fee).toLocaleString('en-IN')}</p>
                  </div>
                  <div className={combine("p-3 rounded-xl border", theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Concession</p>
                    <p className="text-lg font-bold mt-1 text-blue-600 dark:text-blue-400">₹{parseFloat(studentFeeSummaryReport.summary.total_concession).toLocaleString('en-IN')}</p>
                  </div>
                  <div className={combine("p-3 rounded-xl border", theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Paid</p>
                    <p className="text-lg font-bold mt-1 text-green-600 dark:text-green-400">₹{parseFloat(studentFeeSummaryReport.summary.total_paid).toLocaleString('en-IN')}</p>
                  </div>
                  <div className={combine("p-3 rounded-xl border", theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                    <p className={combine("text-xs", get('text', 'tertiary'))}>Due</p>
                    <p className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">₹{parseFloat(studentFeeSummaryReport.summary.total_due).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className={combine("bg-gray-50 dark:bg-gray-800", get('border', 'primary'))}>
                      <tr>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Academic Year</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Fee Type</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Total</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Paid</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Due</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Status</th>
                        <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Transactions</th>
                      </tr>
                    </thead>
                    <tbody className={combine("divide-y", get('border', 'primary'))}>
                      {studentFeeSummaryReport.fee_records.map((record) => (
                        <tr key={record.fee_id} className="hover:bg-[var(--color-bg-hover)]">
                          <td className={combine("px-4 py-3 text-sm", get('text', 'primary'))}>{record.academic_year}</td>
                          <td className={combine("px-4 py-3 text-sm", get('text', 'primary'))}>{record.fee_type}</td>
                          <td className={combine("px-4 py-3 text-sm", get('text', 'primary'))}>₹{parseFloat(record.total_amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm text-green-600 dark:text-green-400">₹{parseFloat(record.paid_amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm text-amber-600 dark:text-amber-400">₹{parseFloat(record.due_amount).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-3">{getStatusBadge(record.status)}</td>
                          <td className="px-4 py-3">
                            {record.payments.length === 0 ? (
                              <span className={combine("text-xs", get('text', 'tertiary'))}>No transactions</span>
                            ) : (
                              <div className="space-y-1 min-w-[240px]">
                                {record.payments.map((txn, index) => (
                                  <div key={`${record.fee_id}-${txn.transaction_id}-${index}`} className={combine("text-xs rounded-lg px-2 py-1.5 border", theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200')}>
                                    <div className="font-medium">{txn.transaction_id}</div>
                                    <div className={combine("mt-0.5", get('text', 'secondary'))}>
                                      {txn.mode} • ₹{parseFloat(txn.amount).toLocaleString('en-IN')} • {formatDateTime(txn.payment_datetime || txn.date)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* RECEIPTS TAB */}
        {showReportTabs && activeTab === 'receipts' && (
          <div className="animate-fade-in max-w-lg mx-auto">
            <div className={getCardGradientClass('amber', true)}>
              <div className="mb-6">
                <div className="flex items-center gap-3">
                  <div className={combine(
                    "p-3 rounded-xl",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaReceipt className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                  <div>
                    <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      Get Receipt
                    </h2>
                    <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                      View payment receipt by transaction ID
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                if (receiptSearch.trim()) fetchReceipt(receiptSearch.trim());
              }} className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={receiptSearch}
                    onChange={(e) => setReceiptSearch(e.target.value)}
                    required
                    className={getInputClass()}
                    placeholder="TXN123456 or PAYMENT_ID"
                  />
                </div>

                <div className={combine("flex gap-2 pt-4 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={() => setReceiptSearch('')}
                    className={combine(getSecondaryButtonClass(), "flex-1")}
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !receiptSearch.trim()}
                    className={combine(getPrimaryButtonClass('amber'), "flex-1 flex items-center justify-center gap-2")}
                  >
                    {loading ? (
                      <>
                        <FaSync className="animate-spin text-sm" />
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <FaSearch className="text-sm" />
                        <span>Get Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ============ MODALS ============ */}

      {/* Assign Fee Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Assign Fee to Class
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFeeData.academic_year}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, academic_year: e.target.value })}
                  className={getInputClass()}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.name}>
                      {year.name} {year.is_current && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={assignFeeData.class_name}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, class_name: e.target.value })}
                  className={getInputClass()}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>

              {renderAssignFeeTypeField()}

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={assignFeeData.amount}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, amount: e.target.value })}
                  className={getInputClass()}
                  placeholder="35000"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Installment Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={assignFeeData.installment_count}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, installment_count: e.target.value })}
                  className={getInputClass()}
                  min="1"
                  step="1"
                  placeholder="1"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={assignFeeData.due_date}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, due_date: e.target.value })}
                  className={getInputClass()}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignFeeData.override_existing}
                  onChange={(e) => setAssignFeeData({ ...assignFeeData, override_existing: e.target.checked })}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500 dark:bg-gray-800 dark:border-gray-600"
                />
                <span className={combine("text-sm", get('text', 'primary'))}>
                  Override existing fee records
                </span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className={combine(getSecondaryButtonClass(), "flex-1")}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={assignFeeToClass}
                className={combine(
                  getPrimaryButtonClass('blue'),
                  "flex-1 flex items-center justify-center gap-2"
                )}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <FaSync className="animate-spin text-sm" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <FaCheck className="text-sm" />
                    <span>Assign</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Fee Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Update Fee Structure
              </h2>
              <button
                onClick={() => setShowUpdateModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Fee ID
                </label>
                <input
                  type="text"
                  value={updateFeeData.fee_id}
                  disabled
                  className={combine(getInputClass(), "opacity-50")}
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Class
                </label>
                <input
                  type="text"
                  value={`Class ${updateFeeData.class_name}`}
                  disabled
                  className={combine(getInputClass(), "opacity-50")}
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Fee Type
                </label>
                <input
                  type="text"
                  value={updateFeeData.fee_type}
                  disabled
                  className={combine(getInputClass(), "opacity-50")}
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Academic Year
                </label>
                <select
                  value={updateFeeData.academic_year}
                  onChange={(e) => setUpdateFeeData({ ...updateFeeData, academic_year: e.target.value })}
                  className={getInputClass()}
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map(year => (
                    <option key={year.id} value={year.name}>
                      {year.name} {year.is_current && '(Current)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  New Amount (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={updateFeeData.new_amount}
                  onChange={(e) => setUpdateFeeData({ ...updateFeeData, new_amount: e.target.value })}
                  className={getInputClass()}
                  placeholder="36000"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Installment Count <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={updateFeeData.installment_count}
                  onChange={(e) => setUpdateFeeData({ ...updateFeeData, installment_count: e.target.value })}
                  className={getInputClass()}
                  min="1"
                  step="1"
                  placeholder="1"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={updateFeeData.due_date}
                  onChange={(e) => setUpdateFeeData({ ...updateFeeData, due_date: e.target.value })}
                  className={getInputClass()}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUpdateModal(false)}
                className={combine(getSecondaryButtonClass(), "flex-1")}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={updateFeeStructure}
                className={combine(
                  getPrimaryButtonClass('green'),
                  "flex-1 flex items-center justify-center gap-2"
                )}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <FaSync className="animate-spin text-sm" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="text-sm" />
                    <span>Update</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Record Payment
              </h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Student ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={paymentData.student_id}
                  onChange={(e) => setPaymentData({ ...paymentData, student_id: e.target.value })}
                  className={getInputClass()}
                  placeholder="STU101"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Class <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentData.class_name}
                  onChange={(e) => setPaymentData({ ...paymentData, class_name: e.target.value })}
                  className={getInputClass()}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Fee Type <span className="text-red-500">*</span>
                </label>
                {feeTypes.length > 0 ? (
                  <select
                    value={paymentData.fee_type}
                    onChange={(e) => setPaymentData({ ...paymentData, fee_type: e.target.value })}
                    className={getInputClass()}
                  >
                    <option value="">Select Fee Type</option>
                    {feeTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={paymentData.fee_type}
                    onChange={(e) => setPaymentData({ ...paymentData, fee_type: e.target.value })}
                    className={getInputClass()}
                    placeholder="Enter fee type"
                  />
                )}
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Amount Paid (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paymentData.paid_amount}
                  onChange={(e) => setPaymentData({ ...paymentData, paid_amount: e.target.value })}
                  className={getInputClass()}
                  placeholder="10000"
                />
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <select
                  value={paymentData.payment_mode}
                  onChange={(e) => setPaymentData({ ...paymentData, payment_mode: e.target.value })}
                  className={getInputClass()}
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="DD">Demand Draft</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NETBANKING">Net Banking</option>
                  <option value="ONLINE">Online Transfer</option>
                </select>
              </div>

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={paymentData.transaction_id}
                  onChange={(e) => setPaymentData({ ...paymentData, transaction_id: e.target.value })}
                  className={getInputClass()}
                  placeholder="TXN123456 (optional for cash)"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className={combine(getSecondaryButtonClass(), "flex-1")}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={recordPayment}
                className={combine(
                  getPrimaryButtonClass('purple'),
                  "flex-1 flex items-center justify-center gap-2"
                )}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <>
                    <FaSync className="animate-spin text-sm" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <FaCreditCard className="text-sm" />
                    <span>Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-2xl w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>
                Payment Receipt
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => window.print()}
                  className={combine(getSecondaryButtonClass(), "p-3")}
                  title="Print"
                >
                  <FaPrint className="text-sm" />
                </button>
                <button
                  onClick={() => setShowReceiptModal(false)}
                  className={combine(
                    "p-3 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary')
                  )}
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 rounded-xl">
              {/* Receipt Header */}
              <div className="text-center mb-8">
                <h1 className={combine("text-2xl font-bold mb-2", get('text', 'primary'))}>
                  SCHOOL FEES RECEIPT
                </h1>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  Payment Confirmation • Receipt #{receiptData.transaction_id}
                </p>
              </div>

              {/* Receipt Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className={combine("text-lg font-semibold mb-3", get('text', 'primary'))}>
                    Student Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Student ID:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {receiptData.student_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Name:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {receiptData.student_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Class:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {receiptData.student_class} - {receiptData.student_section}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className={combine("text-lg font-semibold mb-3", get('text', 'primary'))}>
                    Payment Details
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Date:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {formatDateTime(receiptData.payment_datetime || receiptData.payment_date)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Transaction ID:</span>
                      <span className={combine("font-medium text-sm font-mono", get('text', 'primary'))}>
                        {receiptData.transaction_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Mode:</span>
                      {getPaymentModeBadge(receiptData.payment_mode)}
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Fee Type:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {receiptData.fee_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Academic Year:</span>
                      <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                        {receiptData.academic_year}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Fee Details Table */}
              <div className="mb-8">
                <h3 className={combine("text-lg font-semibold mb-3", get('text', 'primary'))}>
                  Fee Details
                </h3>
                <div className={combine("rounded-xl overflow-hidden border", get('border', 'primary'))}>
                  <table className="min-w-full">
                    <thead className={combine(
                      "bg-gray-50 dark:bg-gray-800",
                      get('border', 'primary')
                    )}>
                      <tr>
                        <th className={combine("px-4 py-3 text-left text-sm font-medium", get('text', 'tertiary'))}>
                          Description
                        </th>
                        <th className={combine("px-4 py-3 text-right text-sm font-medium", get('text', 'tertiary'))}>
                          Amount (₹)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className={combine("border-t", get('border', 'primary'))}>
                        <td className="px-4 py-3">
                          <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                            {receiptData.fee_type} Fee
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            Base Fee Amount
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                              {parseFloat(receiptData.total_fee).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {parseFloat(receiptData.concession_amount) > 0 && (
                        <tr className={combine("border-t", get('border', 'primary'))}>
                          <td className="px-4 py-3">
                            <div className={combine("font-medium text-sm text-green-600 dark:text-green-400")}>
                              Concession
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end text-green-600 dark:text-green-400">
                              <FaRupeeSign className="mr-1 text-xs" />
                              <span className="font-bold text-sm">
                                -{parseFloat(receiptData.concession_amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}

                      <tr className={combine("border-t", get('border', 'primary'))}>
                        <td className="px-4 py-3">
                          <div className={combine("font-medium text-sm", get('accent', 'warning'))}>
                            Amount Paid
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-lg text-green-600 dark:text-green-400")}>
                              {parseFloat(receiptData.amount_paid).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>

                      <tr className={combine("border-t", get('border', 'primary'))}>
                        <td className="px-4 py-3">
                          <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                            Balance Due
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end">
                            <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                            <span className={combine("font-bold text-sm", get('accent', 'warning'))}>
                              {parseFloat(receiptData.balance_due).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status and Footer */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 mb-2">
                  {getStatusBadge(receiptData.status)}
                  <span className={combine("text-xs", get('text', 'tertiary'))}>
                    Status: {receiptData.payment_status}
                  </span>
                </div>
                {receiptData.remarks && (
                  <p className={combine("text-xs mb-2", get('text', 'tertiary'))}>
                    Remarks: {receiptData.remarks}
                  </p>
                )}
                <p className={combine("text-xs", get('text', 'tertiary'))}>
                  This is a computer-generated receipt and does not require a signature.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="text-center">
              <div className={combine(
                "mx-auto flex items-center justify-center h-14 w-14 rounded-full mb-4",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <FaExclamationTriangle className={combine(
                  "h-6 w-6",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )} />
              </div>
              <h3 className={combine("text-lg font-bold mb-2", get('text', 'primary'))}>
                Delete Fee Structure
              </h3>
              <p className={combine("text-sm mb-6", get('text', 'secondary'))}>
                Are you sure you want to delete this fee structure? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={combine(getSecondaryButtonClass(), "flex-1")}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={() => deleteFeeStructure(showDeleteConfirm)}
                  className={combine(
                    "flex-1 px-6 py-3.5 rounded-xl transition-all duration-200 font-medium",
                    "text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]",
                    "text-sm",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700',
                    actionLoading ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <FaSync className="animate-spin text-sm" />
                      Deleting...
                    </span>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-md w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Export Fee Structures
              </h2>
              <button
                onClick={() => setShowExportModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <p className={combine("text-sm mb-6", get('text', 'secondary'))}>
              Choose export format for {filteredStructures.length} fee structures
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => {
                  exportToPDF(feeStructures, 'Fee Structures');
                  setShowExportModal(false);
                }}
                disabled={exportLoading}
                className={combine(
                  "p-4 rounded-xl border transition-all hover:shadow-md flex flex-col items-center gap-2",
                  theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700' : 'bg-gray-50 hover:bg-white border-gray-200',
                  get('border', 'secondary')
                )}
              >
                <FaFilePdf className={combine("text-2xl text-red-500")} />
                <span className="text-xs font-medium">PDF</span>
              </button>

              <button
                onClick={() => {
                  exportToExcel(feeStructures, 'Fee Structures');
                  setShowExportModal(false);
                }}
                disabled={exportLoading}
                className={combine(
                  "p-4 rounded-xl border transition-all hover:shadow-md flex flex-col items-center gap-2",
                  theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700' : 'bg-gray-50 hover:bg-white border-gray-200',
                  get('border', 'secondary')
                )}
              >
                <FaFileCsv className={combine("text-2xl text-green-500")} />
                <span className="text-xs font-medium">Excel</span>
              </button>

              <button
                onClick={() => {
                  exportToCSV(feeStructures, 'Fee Structures');
                  setShowExportModal(false);
                }}
                disabled={exportLoading}
                className={combine(
                  "p-4 rounded-xl border transition-all hover:shadow-md flex flex-col items-center gap-2",
                  theme === 'dark' ? 'bg-gray-800/50 hover:bg-gray-800 border-gray-700' : 'bg-gray-50 hover:bg-white border-gray-200',
                  get('border', 'secondary')
                )}
              >
                <FiDownload className={combine("text-2xl text-blue-500")} />
                <span className="text-xs font-medium">CSV</span>
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className={combine(getSecondaryButtonClass(), "w-full")}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bulk Concession Modal */}
      {showBulkConcessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-2xl w-full shadow-2xl"}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Apply Bulk Concessions
              </h2>
              <button
                onClick={() => setShowBulkConcessionModal(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <div className={combine(
                "p-4 rounded-xl text-sm",
                theme === 'dark' ? 'bg-indigo-900/20' : 'bg-indigo-50'
              )}>
                <p className={combine("flex items-center gap-2", get('text', 'primary'))}>
                  <FaInfoCircle className="text-sm" />
                  <span>Upload a CSV file with student concessions or use the template below.</span>
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
                <FaFileCsv className={combine("text-4xl mx-auto mb-3", get('icon', 'secondary'))} />
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  Drop your CSV file here or click to browse
                </p>
                <button className={combine(getSecondaryButtonClass(), "flex items-center gap-2 mx-auto")}>
                  <FiDownload className="text-sm" />
                  <span className="text-sm">Upload CSV</span>
                </button>
                <p className={combine("text-xs mt-3", get('text', 'tertiary'))}>
                  CSV Format: student_id,academic_year,fee_type,discount_amount
                </p>
              </div>

              <div className={combine("border-t pt-4", get('border', 'primary'))}>
                <h3 className={combine("text-md font-semibold mb-3", get('text', 'primary'))}>
                  Download Template
                </h3>
                <button
                  onClick={() => {
                    const csvContent = "student_id,academic_year,fee_type,discount_amount\nSTU101,2024-2025,Tuition,5000\nSTU102,2024-2025,Transport,2000";
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    saveAs(blob, 'concession_template.csv');
                  }}
                  className={combine(getSecondaryButtonClass(), "flex items-center gap-2")}
                >
                  <FaDownload className="text-sm" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowBulkConcessionModal(false)}
                className={combine(getSecondaryButtonClass(), "flex-1")}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toastInfo('Bulk concession feature coming soon');
                  setShowBulkConcessionModal(false);
                }}
                className={combine(
                  getPrimaryButtonClass('indigo'),
                  "flex-1 flex items-center justify-center gap-2"
                )}
              >
                <FaPercent className="text-sm" />
                <span>Process Bulk</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Students Popup Modal */}
      {showAllStudentsPopup && selectedClassData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getModalCardClass() + " max-w-4xl w-full shadow-2xl max-h-[80vh] overflow-hidden flex flex-col"}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Class {selectedClassData.class} - All Students ({selectedClassData.students.length})
              </h2>
              <button
                onClick={() => setShowAllStudentsPopup(false)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine(
                  "bg-gray-50 dark:bg-gray-800 sticky top-0",
                  get('border', 'primary')
                )}>
                  <tr>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Student ID
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Name
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Section
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Status
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Total Fee
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Paid
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Due
                    </th>
                    <th className={combine("px-4 py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>
                      Parent Phone
                    </th>
                  </tr>
                </thead>
                <tbody className={combine("divide-y", get('border', 'primary'))}>
                  {selectedClassData.students.map((student, index) => (
                    <tr key={index} className="hover:bg-[var(--color-bg-hover)]">
                      <td className="px-4 py-3">
                        <span className={combine("font-mono text-xs", get('text', 'primary'))}>
                          {student.student_id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                          {student.student_name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={combine("text-sm", get('text', 'secondary'))}>
                          {student.section}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(student.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                          <span className={combine("text-sm", get('text', 'primary'))}>
                            {parseFloat(student.total_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                          <span className={combine("text-sm text-green-600 dark:text-green-400")}>
                            {parseFloat(student.paid_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                          <span className={combine("text-sm", get('accent', 'warning'))}>
                            {parseFloat(student.due_amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={combine("text-xs", get('text', 'secondary'))}>
                          {student.parent_phone}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={combine("pt-4 mt-4 border-t", get('border', 'primary'))}>
              <button
                onClick={() => setShowAllStudentsPopup(false)}
                className={combine(getSecondaryButtonClass(), "w-full")}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
