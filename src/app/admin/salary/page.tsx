// src/app/admin/salary/page.tsx

'use client';

import { adminApi, apiFetch } from '@/lib/api';
import { useEffect, useState, useMemo, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  FaMoneyBillWave,
  FaTrash,
  FaEdit,
  FaSearch,
  FaSync,
  FaPlus,
  FaUser,
  FaChalkboardTeacher,
  FaIdCard,
  FaCalendar,
  FaRupeeSign,
  FaPercent,
  FaEye,
  FaClock,
  FaBan,
  FaChevronDown,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaMoneyCheckAlt,
  FaChartLine,
  FaCalculator,
  FaExclamationTriangle,
  FaUserTie,
  FaSave,
  FaCheckCircle,
  FaHourglassHalf,
  FaExclamationCircle,
  FaUniversity,
  FaCreditCard,
  FaCheck,
  FaUndo,
  FaFileInvoice,
  FaHistory,
  FaMoneyBill,
  FaExchangeAlt,
  FaShieldAlt,
  FaInfoCircle
} from 'react-icons/fa';
import { MdOutlineDashboard, MdPayment, MdAttachMoney, MdAccountBalance, MdVerified } from 'react-icons/md';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

// Configuration for gateway mode: defaults to real, can be overridden by env.
const USE_REAL_GATEWAY = process.env.NEXT_PUBLIC_SALARY_REAL_GATEWAY !== 'false';

// Interfaces for Staff Salary
interface StaffSalaryStructure {
  id: number;
  staff_type: string;
  base_salary: string;
  late_penalty_percentage: number;
}

interface TeacherSalaryStructure {
  id: number;
  teacher_id: string;
  teacher_name?: string;
  base_salary: string;
  late_penalty_percentage: number;
}

interface StaffPayment {
  id: number;
  staff: number;
  staff_name: string;
  staff_role: string;
  staff_id_display?: string;
  month: number;
  year: number;
  base_salary: string;
  per_day_wage: string;
  days_worked: number;
  days_absent: number;
  days_late: number;
  total_working_days?: number;
  absent_amount: string;
  late_amount: string;
  total_deduction: string;
  net_payable: string;
  payment_date: string | null;
  transaction_id: string | null;
  bank_reference: string | null;
  transfer_bank_code?: string;
  payment_status: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  remarks: string | null;
  created_at: string;
}

interface TeacherPayment {
  id: number;
  teacher: number;
  teacher_name: string;
  teacher_id_display: string;
  month: number;
  year: number;
  base_salary: string;
  per_day_wage: string;
  days_worked: number;
  days_absent: number;
  days_late: number;
  total_working_days?: number;
  absent_amount: string;
  late_amount: string;
  total_deduction: string;
  net_payable: string;
  payment_date: string | null;
  transaction_id: string | null;
  bank_reference: string | null;
  transfer_bank_code?: string;
  payment_status: 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
  remarks: string | null;
  created_at: string;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  bank_account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
}

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  bank_account_number?: string;
  ifsc_code?: string;
  account_holder_name?: string;
}

interface SalarySummary {
  month: number;
  year: number;
  staff: {
    total_count: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
    processed_amount: number;
    pending_amount: number;
    failed_amount: number;
  };
  teachers: {
    total_count: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
    processed_amount: number;
    pending_amount: number;
    failed_amount: number;
  };
  grand_total: number;
}

interface SalaryCardStats {
  month: number;
  year: number;
  staff_structures_count: number;
  teacher_structures_count: number;
  staff_pending_payments_count: number;
  staff_processed_payments_count: number;
  staff_failed_payments_count: number;
  teacher_pending_payments_count: number;
  teacher_processed_payments_count: number;
  teacher_failed_payments_count: number;
  pending_payments_count: number;
  processed_payments_count: number;
  failed_payments_count: number;
  staff_total_payable: number;
  teacher_total_payable: number;
  total_payable_amount: number;
}

interface EmployeeSalaryMonthReport {
  month: number;
  month_name: string;
  has_record: boolean;
  payment_id: number | null;
  payment_status: string;
  base_salary: number;
  days_worked: number;
  days_absent: number;
  days_late: number;
  total_deduction: number;
  net_payable: number;
  payment_date: string | null;
  transaction_id: string | null;
  bank_reference: string | null;
}

interface EmployeeYearlyReportData {
  employee_type: 'staff' | 'teacher';
  employee_id: string;
  employee_name: string;
  employee_role: string;
  employee_profile_image?: string | null;
  year: number;
  monthly_report: EmployeeSalaryMonthReport[];
  summary: {
    months_with_records: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    total_net_payable: number;
    total_deduction: number;
  };
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

interface BankTransferResult {
  success: boolean;
  transaction_id?: string;
  bank_reference?: string;
  status?: string;
  error?: string;
  dummy_mode?: boolean;
  gateway_mode?: string;
  payment_id?: number;
  employee_name?: string;
  net_payable?: string;
}

interface BulkProcessResult {
  payments_created: Array<{ 
    staff_id?: number; 
    teacher_id?: number; 
    staff_name?: string; 
    teacher_name?: string; 
    net_payable: string 
  }>;
  errors: string[];
}

interface BulkBankTransferResult {
  dummy_mode: any;
  batch_id: string;
  total: number;
  successful: number;
  failed: number;
  gateway_mode: string;
  results: Array<{
    payment_id: number;
    employee: string;
    amount: string;
    result: {
      success: boolean;
      transaction_id?: string;
      bank_reference?: string;
      status?: string;
      error?: string;
      dummy_mode?: boolean;
    };
  }>;
  batch_record_id?: number;
}

// Staff types constants
const STAFF_TYPES = [
  'admin_staff',
  'finance_staff',
  'it_staff',
  'operations_staff',
  'transport_staff',
  'external_staff'
];

const PAYMENT_STATUSES = ['pending', 'processing', 'processed', 'failed', 'cancelled'];

// Bank codes
const BANK_CODES = [
  { value: 'RAZORPAYX', label: 'RazorpayX Payouts' }
];

const TRANSFER_OTP_DURATION_SECONDS = 30;

export default function SalaryManagementPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [activeTab, setActiveTab] = useState<'staff' | 'teacher' | 'payments' | 'summary' | 'employeeReport'>('staff');
  const [activePaymentTab, setActivePaymentTab] = useState<'staff' | 'teacher'>('staff');
  
  // Staff states
  const [staffStructures, setStaffStructures] = useState<StaffSalaryStructure[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffSearchTerm, setStaffSearchTerm] = useState('');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilterType, setStaffFilterType] = useState('all');
  const [staffCurrentPage, setStaffCurrentPage] = useState(1);
  const [staffPagination, setStaffPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [staffSortConfig, setStaffSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'staff_type',
    direction: 'asc'
  });

  // Teacher states
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [teacherStructures, setTeacherStructures] = useState<TeacherSalaryStructure[]>([]);
  const [loadingTeacher, setLoadingTeacher] = useState(false);
  const [teacherSearchTerm, setTeacherSearchTerm] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(1);
  const [teacherPagination, setTeacherPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [teacherSortConfig, setTeacherSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'teacher_id',
    direction: 'asc'
  });

  // Staff list for processing
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Payment states
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [teacherPayments, setTeacherPayments] = useState<TeacherPayment[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentFilters, setPaymentFilters] = useState({
    staff_id: '',
    teacher_id: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    status: ''
  });
  const [selectedPayment, setSelectedPayment] = useState<StaffPayment | TeacherPayment | null>(null);
  const [paymentUpdateData, setPaymentUpdateData] = useState<any>({
    transaction_id: '',
    bank_reference: '',
    payment_status: 'processed' as 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled',
    remarks: ''
  });

  // Bank transfer states
  const [bankTransferMode, setBankTransferMode] = useState<'standard' | 'bank'>('standard');
  const [selectedBankCode, setSelectedBankCode] = useState('RAZORPAYX');
  const [bankTransferResult, setBankTransferResult] = useState<BankTransferResult | BulkBankTransferResult | null | any>(null);

  // Summary state
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null);
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [employeeReportFilters, setEmployeeReportFilters] = useState({
    employee_type: 'teacher' as 'staff' | 'teacher',
    employee_id: '',
    year: new Date().getFullYear(),
  });
  const [employeeSalaryReport, setEmployeeSalaryReport] = useState<EmployeeYearlyReportData | null>(null);
  const [loadingEmployeeSalaryReport, setLoadingEmployeeSalaryReport] = useState(false);
  const [employeeSalaryReportError, setEmployeeSalaryReportError] = useState('');
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);
  const [redirectBackTarget, setRedirectBackTarget] = useState('/admin/teachers/allteachers');
  const [salaryCardStats, setSalaryCardStats] = useState<SalaryCardStats | null>(null);
  const [loadingSalaryCards, setLoadingSalaryCards] = useState(false);
  const [activeTransferAction, setActiveTransferAction] = useState<string | null>(null);
  const [isRealtimeTransferSyncing, setIsRealtimeTransferSyncing] = useState(false);

  // Form states
  const [staffFormData, setStaffFormData] = useState({
    staff_type: '',
    base_salary: '',
    late_penalty_percentage: '10.0'
  });
  const [isEditingStaffStructure, setIsEditingStaffStructure] = useState(false);

  const [teacherFormData, setTeacherFormData] = useState({
    teacher_id: '',
    base_salary: '',
    late_penalty_percentage: '10.0'
  });

  // Bulk process states
  const [bulkProcessData, setBulkProcessData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    staff_type: '',
    employee_type: 'staff' as 'staff' | 'teacher',
    bank_code: 'RAZORPAYX'
  });
  const [bulkProcessResult, setBulkProcessResult] = useState<BulkProcessResult | null>(null);

  // Single process state
  const [singleProcessData, setSingleProcessData] = useState<{
    type: 'staff' | 'teacher';
    employeeId: number | null;
    month: number;
    year: number;
  } | null>(null);
  const [singleProcessCandidates, setSingleProcessCandidates] = useState<{
    staff: StaffMember[];
    teacher: Teacher[];
  }>({ staff: [], teacher: [] });
  const [availableStaffTypeOptions, setAvailableStaffTypeOptions] = useState<string[]>([]);

  // Modal states
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'staff' | 'teacher';
    id?: string;
    identifier: string;
  } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showBulkProcessModal, setShowBulkProcessModal] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState<{
    type: 'staff' | 'teacher';
    payment: StaffPayment | TeacherPayment;
  } | null>(null);
  const [showBankDetailsModal, setShowBankDetailsModal] = useState<{
    type: 'staff' | 'teacher';
    employee: any;
  } | null>(null);
  const [isSubmittingSingleProcess, setIsSubmittingSingleProcess] = useState(false);
  const [isSubmittingBulkProcess, setIsSubmittingBulkProcess] = useState(false);
  const [showTransferOtpModal, setShowTransferOtpModal] = useState(false);
  const [transferOtp, setTransferOtp] = useState('');
  const [transferOtpTimeLeft, setTransferOtpTimeLeft] = useState(0);
  const [transferOtpEmailHint, setTransferOtpEmailHint] = useState('');
  const [isSendingTransferOtp, setIsSendingTransferOtp] = useState(false);
  const [isVerifyingTransferOtp, setIsVerifyingTransferOtp] = useState(false);
  const [transferOtpPurpose, setTransferOtpPurpose] = useState('payment transfer');
  const pendingTransferActionRef = useRef<null | (() => Promise<void>)>(null);

  // Common settings
  const itemsPerPage = 10;

  // Gateway mode
  const gatewayMode = USE_REAL_GATEWAY ? 'REAL' : 'DUMMY';

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'green') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const colorClasses = {
      green: theme === 'dark' ? 'from-gray-800 to-green-900/10' : 'from-white to-green-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      purple: theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
      red: theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50'
    };

    return combine(baseClasses, 'bg-gradient-to-br', colorClasses[color as keyof typeof colorClasses] || colorClasses.green);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    '[&>option]:bg-[var(--color-bg-card)] [&>option]:text-[var(--color-text-primary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-green-500',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
      : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getDangerButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
  );

  const getStatusBadgeClass = (status: string) => {
    const colorMap: { [key: string]: string } = {
      processed: theme === 'dark' ? 'bg-green-900/30 text-green-300 border-green-800' : 'bg-green-100 text-green-700 border-green-200',
      processing: theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200',
      pending: theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300 border-yellow-800' : 'bg-yellow-100 text-yellow-700 border-yellow-200',
      failed: theme === 'dark' ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-red-100 text-red-700 border-red-200',
      cancelled: theme === 'dark' ? 'bg-gray-900/30 text-gray-300 border-gray-800' : 'bg-gray-100 text-gray-700 border-gray-200',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full border capitalize',
      colorMap[status] || colorMap.pending
    );
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'processed':
        return <FaCheckCircle className="text-green-500" />;
      case 'processing':
        return <FaSync className="text-blue-500 animate-spin" />;
      case 'pending':
        return <FaHourglassHalf className="text-yellow-500" />;
      case 'failed':
        return <FaExclamationCircle className="text-red-500" />;
      case 'cancelled':
        return <FaBan className="text-gray-500" />;
      default:
        return <FaClock className="text-gray-500" />;
    }
  };

  /* ================= API FUNCTIONS ================= */
  const requestSalaryAdminApi = async (
    path: string,
    options: RequestInit & { skipEncryption?: boolean } = {}
  ) => {
    const response = await apiFetch(path, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error: any = new Error(data?.error || data?.detail || 'API request failed');
      error.response = { status: response.status, data };
      throw error;
    }

    return data;
  };

  const extractApiErrorMessage = (error: any, fallback: string): string => {
    const data = error?.response?.data;

    const pickMessage = (value: any): string | null => {
      if (value == null) return null;
      if (typeof value === 'string') {
        const text = value.trim();
        return text || null;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          const msg = pickMessage(item);
          if (msg) return msg;
        }
        return null;
      }
      if (typeof value === 'object') {
        const preferredKeys = ['error', 'detail', 'message', 'details', 'non_field_errors'];
        for (const key of preferredKeys) {
          if (key in value) {
            const msg = pickMessage(value[key]);
            if (msg) return msg;
          }
        }

        for (const [key, val] of Object.entries(value)) {
          if (preferredKeys.includes(key)) continue;
          const msg = pickMessage(val);
          if (msg) return `${key.replace(/_/g, ' ')}: ${msg}`;
        }
      }
      return null;
    };

    return pickMessage(data) || fallback;
  };

  const buildRealtimePaymentHeaders = async (
    _method: 'POST' | 'PUT' | 'DELETE',
    _path: string,
    _bodyString: string,
    extraHeaders: Record<string, string> = {}
  ) => {
    const timestamp = `${Math.floor(Date.now() / 1000)}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Admin-Verified': 'true',
      ...extraHeaders,
    };

    return headers;
  };

  const closeTransferOtpModal = () => {
    setShowTransferOtpModal(false);
    setTransferOtp('');
    setTransferOtpTimeLeft(0);
    setTransferOtpEmailHint('');
    setTransferOtpPurpose('payment transfer');
    setIsSendingTransferOtp(false);
    setIsVerifyingTransferOtp(false);
    pendingTransferActionRef.current = null;
  };

  const sendTransferOtp = async (mode: 'send' | 'resend' = 'send') => {
    setIsSendingTransferOtp(true);
    try {
      const response = mode === 'send'
        ? await adminApi.salary.payments.transferOtp.send()
        : await adminApi.salary.payments.transferOtp.resend();
      const payload = response?.data || {};
      setTransferOtpTimeLeft(Number(payload.expires_in || TRANSFER_OTP_DURATION_SECONDS));
      setTransferOtpEmailHint(payload.message || 'OTP sent to your email');
      toastInfo(payload.message || 'OTP sent to email');
    } catch (error: any) {
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to send OTP');
      throw error;
    } finally {
      setIsSendingTransferOtp(false);
    }
  };

  const startTransferOtpFlow = async (
    action: () => Promise<void>,
    purpose: string = 'payment transfer'
  ) => {
    pendingTransferActionRef.current = action;
    setTransferOtpPurpose(purpose);
    setTransferOtp('');
    setShowTransferOtpModal(true);
    try {
      await sendTransferOtp('send');
    } catch {
      closeTransferOtpModal();
    }
  };

  const verifyTransferOtpAndContinue = async () => {
    const otpValue = transferOtp.trim();
    if (otpValue.length < 4) {
      toastWarning('Enter a valid OTP');
      return;
    }

    setIsVerifyingTransferOtp(true);
    let otpVerified = false;
    try {
      const response = await adminApi.salary.payments.transferOtp.verify({ otp: otpValue });
      const data = response?.data || {};
      toastSuccess(data.message || 'OTP verified');
      otpVerified = true;
    } catch (error: any) {
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Invalid or expired OTP');
    } finally {
      setIsVerifyingTransferOtp(false);
    }

    if (!otpVerified) return;

    const pendingAction = pendingTransferActionRef.current;
    closeTransferOtpModal();
    if (pendingAction) {
      try {
        await pendingAction();
      } catch {
        // Transfer handlers already show user-facing error toasts.
      }
    }
  };

  // Fetch teachers list
  const fetchTeachers = async () => {
    setLoadingTeachers(true);
    try {
      const response = await adminApi.teachers.list();
      setTeachers(response.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toastError('Failed to fetch teachers list');
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Fetch staff list
  const fetchStaffList = async () => {
    try {
      const response = await adminApi.staff.list();
      setStaffList(response.data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
    }
  };

  // Staff API calls
  const fetchStaffStructures = async () => {
    setLoadingStaff(true);
    try {
      const response = await adminApi.salary.staff.listStructures({
        staff_type: staffFilterType !== 'all' ? staffFilterType : undefined,
        q: staffSearchQuery.trim() || undefined,
        page: staffCurrentPage,
        page_size: itemsPerPage,
      });
      setStaffStructures(response.data.data || []);
      const pagination = response.data?.pagination;
      if (pagination) {
        setStaffPagination({
          page: pagination.page ?? staffCurrentPage,
          page_size: pagination.page_size ?? itemsPerPage,
          total: pagination.total ?? 0,
          total_pages: pagination.total_pages ?? 1,
          has_next: Boolean(pagination.has_next),
          has_previous: Boolean(pagination.has_previous),
        });
        if (pagination.page && pagination.page !== staffCurrentPage) {
          setStaffCurrentPage(pagination.page);
        }
      } else {
        const total = (response.data?.data || []).length;
        setStaffPagination({
          page: 1,
          page_size: itemsPerPage,
          total,
          total_pages: 1,
          has_next: false,
          has_previous: false,
        });
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('You do not have permission to view staff salary structures');
      } else {
        toastError('Failed to fetch staff salary structures');
      }
      console.error('Error fetching staff structures:', error);
      setStaffStructures([]);
      setStaffPagination({
        page: 1,
        page_size: itemsPerPage,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    } finally {
      setLoadingStaff(false);
    }
  };

  const createOrUpdateStaffStructure = async () => {
    if (!staffFormData.staff_type || !staffFormData.base_salary) {
      toastError('Staff type and base salary are required');
      return;
    }

    const runSave = async () => {
      const response = await adminApi.salary.staff.createOrUpdate({
        staff_type: staffFormData.staff_type,
        base_salary: parseFloat(staffFormData.base_salary),
        late_penalty_percentage: parseFloat(staffFormData.late_penalty_percentage),
      });
      
      toastSuccess(response.data.message || 'Salary structure saved successfully');
      setShowStaffModal(false);
      setIsEditingStaffStructure(false);
      setStaffFormData({
        staff_type: '',
        base_salary: '',
        late_penalty_percentage: '10.0'
      });
      fetchStaffStructures();
      fetchSalaryCardStats();
    };

    if (isEditingStaffStructure) {
      await startTransferOtpFlow(runSave, 'staff salary update');
      return;
    }

    try {
      await runSave();
    } catch (error: any) {
      console.error('Error saving staff structure:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || data?.base_salary?.[0] || 'Failed to save salary structure');
    }
  };

  const deleteStaffStructure = async (staffType: string) => {
    try {
      const response = await adminApi.salary.staff.deleteStructure(staffType);
      toastSuccess(response.data.message || 'Salary structure deleted successfully');
      fetchStaffStructures();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error deleting staff structure:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to delete salary structure');
    }
  };

  // Teacher API calls
  const fetchTeacherStructures = async () => {
    setLoadingTeacher(true);
    try {
      const response = await adminApi.salary.teacher.listStructures({
        q: teacherSearchQuery.trim() || undefined,
        page: teacherCurrentPage,
        page_size: itemsPerPage,
      });
      setTeacherStructures(response.data.data || []);
      const pagination = response.data?.pagination;
      if (pagination) {
        setTeacherPagination({
          page: pagination.page ?? teacherCurrentPage,
          page_size: pagination.page_size ?? itemsPerPage,
          total: pagination.total ?? 0,
          total_pages: pagination.total_pages ?? 1,
          has_next: Boolean(pagination.has_next),
          has_previous: Boolean(pagination.has_previous),
        });
        if (pagination.page && pagination.page !== teacherCurrentPage) {
          setTeacherCurrentPage(pagination.page);
        }
      } else {
        const total = (response.data?.data || []).length;
        setTeacherPagination({
          page: 1,
          page_size: itemsPerPage,
          total,
          total_pages: 1,
          has_next: false,
          has_previous: false,
        });
      }
    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('You do not have permission to view teacher salary structures');
      } else {
        toastError('Failed to fetch teacher salary structures');
      }
      console.error('Error fetching teacher structures:', error);
      setTeacherStructures([]);
      setTeacherPagination({
        page: 1,
        page_size: itemsPerPage,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    } finally {
      setLoadingTeacher(false);
    }
  };

  const createOrUpdateTeacherStructure = async () => {
    if (!teacherFormData.teacher_id || !teacherFormData.base_salary) {
      toastError('Teacher and base salary are required');
      return;
    }

    const runSave = async () => {
      const response = await adminApi.salary.teacher.createOrUpdate({
        teacher_id: teacherFormData.teacher_id,
        base_salary: parseFloat(teacherFormData.base_salary),
        late_penalty_percentage: parseFloat(teacherFormData.late_penalty_percentage),
      });
      
      toastSuccess(response.data.message || 'Teacher salary saved successfully');
      setShowTeacherModal(false);
      setTeacherFormData({
        teacher_id: '',
        base_salary: '',
        late_penalty_percentage: '10.0'
      });
      fetchTeacherStructures();
      fetchSalaryCardStats();
    };

    const existingStructure = teacherStructures.some((s) => s.teacher_id === teacherFormData.teacher_id);
    if (existingStructure) {
      await startTransferOtpFlow(runSave, 'teacher salary update');
      return;
    }

    try {
      await runSave();
    } catch (error: any) {
      console.error('Error saving teacher structure:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to save teacher salary');
    }
  };

  const deleteTeacherStructure = async (teacherId: string) => {
    try {
      const response = await adminApi.salary.teacher.deleteStructure(teacherId);
      toastSuccess(response.data.message || 'Teacher salary structure deleted successfully');
      fetchTeacherStructures();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error deleting teacher structure:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to delete teacher salary structure');
    }
  };

  // Payment API calls
  const fetchStaffPayments = async () => {
    setLoadingPayments(true);
    try {
      const params: any = {};
      if (paymentFilters.staff_id) params.staff_id = paymentFilters.staff_id;
      if (paymentFilters.month) params.month = paymentFilters.month;
      if (paymentFilters.year) params.year = paymentFilters.year;
      if (paymentFilters.status) params.status = paymentFilters.status;

      const response = await adminApi.salary.payments.staff.list(params);
      setStaffPayments(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching staff payments:', error);
      toastError('Failed to fetch staff payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchTeacherPayments = async () => {
    setLoadingPayments(true);
    try {
      const params: any = {};
      if (paymentFilters.teacher_id) params.teacher_id = paymentFilters.teacher_id;
      if (paymentFilters.month) params.month = paymentFilters.month;
      if (paymentFilters.year) params.year = paymentFilters.year;
      if (paymentFilters.status) params.status = paymentFilters.status;

      const response = await adminApi.salary.payments.teacher.list(params);
      setTeacherPayments(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching teacher payments:', error);
      toastError('Failed to fetch teacher payments');
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchPaymentDetails = async (paymentId: number, type: 'staff' | 'teacher') => {
    try {
      const response = await adminApi.salary.payments[type].get(paymentId);
      return response.data.data;
    } catch (error: any) {
      console.error('Error fetching payment details:', error);
      toastError('Failed to fetch payment details');
      return null;
    }
  };

  // Standard process (without bank transfer)
  const processStaffSalary = async () => {
    if (!singleProcessData?.employeeId) {
      toastWarning('Select a staff member to process salary');
      return;
    }

    setIsSubmittingSingleProcess(true);
    try {
      const response = await adminApi.salary.payments.staff.process({
        staff_id: singleProcessData.employeeId,
        month: singleProcessData.month,
        year: singleProcessData.year
      });

      toastSuccess(response.data.message || 'Salary payment created successfully');
      setShowProcessModal(false);
      setSingleProcessData(null);
      setSingleProcessCandidates({ staff: [], teacher: [] });
      fetchStaffPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing staff salary:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to process salary');
    } finally {
      setIsSubmittingSingleProcess(false);
    }
  };

  const processTeacherSalary = async () => {
    if (!singleProcessData?.employeeId) {
      toastWarning('Select a teacher to process salary');
      return;
    }

    setIsSubmittingSingleProcess(true);
    try {
      const response = await adminApi.salary.payments.teacher.process({
        teacher_id: singleProcessData.employeeId,
        month: singleProcessData.month,
        year: singleProcessData.year
      });

      toastSuccess(response.data.message || 'Salary payment created successfully');
      setShowProcessModal(false);
      setSingleProcessData(null);
      setSingleProcessCandidates({ staff: [], teacher: [] });
      fetchTeacherPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing teacher salary:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to process salary');
    } finally {
      setIsSubmittingSingleProcess(false);
    }
  };

  // Bank transfer enabled process
  const processStaffSalaryWithBank = async () => {
    if (!singleProcessData?.employeeId) {
      toastWarning('Select a staff member to process salary');
      return;
    }

    setIsSubmittingSingleProcess(true);
    try {
      const payload = {
        staff_id: singleProcessData.employeeId,
        month: singleProcessData.month,
        year: singleProcessData.year,
        bank_code: selectedBankCode
      };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        'salary/admin/payments/staff/process-with-bank/',
        body
      );
      const response = await requestSalaryAdminApi(
        'salary/admin/payments/staff/process-with-bank/',
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });
      
      if (!USE_REAL_GATEWAY || result.gateway_mode === 'DUMMY') {
        toastInfo(`[DUMMY MODE] ${response.message || 'Payment processed in dummy mode'}`);
      } else {
        toastSuccess(response.message || 'Salary processed with bank transfer');
      }
      
      setShowProcessModal(false);
      setSingleProcessData(null);
      setSingleProcessCandidates({ staff: [], teacher: [] });
      fetchStaffPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing staff salary with bank:', error);
      const message = extractApiErrorMessage(error, 'Failed to process salary with bank');
      setBankTransferResult({
        success: false,
        error: message,
        gateway_mode: gatewayMode,
        dummy_mode: !USE_REAL_GATEWAY
      });
      toastError(message);
    } finally {
      setIsSubmittingSingleProcess(false);
    }
  };

  const processTeacherSalaryWithBank = async () => {
    if (!singleProcessData?.employeeId) {
      toastWarning('Select a teacher to process salary');
      return;
    }

    setIsSubmittingSingleProcess(true);
    try {
      const payload = {
        teacher_id: singleProcessData.employeeId,
        month: singleProcessData.month,
        year: singleProcessData.year,
        bank_code: selectedBankCode
      };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        'salary/admin/payments/teacher/process-with-bank/',
        body
      );
      const response = await requestSalaryAdminApi(
        'salary/admin/payments/teacher/process-with-bank/',
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });
      
      if (!USE_REAL_GATEWAY || result.gateway_mode === 'DUMMY') {
        toastInfo(`[DUMMY MODE] ${response.message || 'Payment processed in dummy mode'}`);
      } else {
        toastSuccess(response.message || 'Salary processed with bank transfer');
      }
      
      setShowProcessModal(false);
      setSingleProcessData(null);
      setSingleProcessCandidates({ staff: [], teacher: [] });
      fetchTeacherPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing teacher salary with bank:', error);
      const message = extractApiErrorMessage(error, 'Failed to process salary with bank');
      setBankTransferResult({
        success: false,
        error: message,
        gateway_mode: gatewayMode,
        dummy_mode: !USE_REAL_GATEWAY
      });
      toastError(message);
    } finally {
      setIsSubmittingSingleProcess(false);
    }
  };

  // Bulk process
  const bulkProcessStaffSalary = async () => {
    setIsSubmittingBulkProcess(true);
    try {
      const data: any = {
        month: bulkProcessData.month,
        year: bulkProcessData.year,
      };
      
      if (bulkProcessData.staff_type) {
        data.staff_type = bulkProcessData.staff_type;
      }

      if (bankTransferMode === 'bank') {
        data.bank_code = bulkProcessData.bank_code;
        const body = JSON.stringify(data);
        const headers = await buildRealtimePaymentHeaders(
          'POST',
          'salary/admin/payments/staff/bulk-process-with-bank/',
          body
        );
        const response = await requestSalaryAdminApi(
          'salary/admin/payments/staff/bulk-process-with-bank/',
          { method: 'POST', headers, body }
        );
        
        const result = response.data || response;
        setBankTransferResult({
          ...result,
          gateway_mode: result.gateway_mode || gatewayMode,
          dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
        });
        
        if (!USE_REAL_GATEWAY || result.gateway_mode === 'DUMMY') {
          toastInfo(`[DUMMY MODE] ${response.message || 'Bulk processing in dummy mode'}`);
        } else {
          toastSuccess(response.message || `Processed ${result.successful || 0} payments successfully`);
        }
      } else {
        const response = await adminApi.salary.payments.staff.bulkProcess(data);
        setBulkProcessResult(response.data);
        toastSuccess(response.data.message || `Created ${response.data.payments_created?.length || 0} payments`);
      }
      
      fetchStaffPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error bulk processing staff salary:', error);
      toastError('Failed to bulk process salaries');
    } finally {
      setIsSubmittingBulkProcess(false);
    }
  };

  const bulkProcessTeacherSalary = async () => {
    setIsSubmittingBulkProcess(true);
    try {
      const data: any = {
        month: bulkProcessData.month,
        year: bulkProcessData.year,
      };

      if (bankTransferMode === 'bank') {
        data.bank_code = bulkProcessData.bank_code;
        const body = JSON.stringify(data);
        const headers = await buildRealtimePaymentHeaders(
          'POST',
          'salary/admin/payments/teacher/bulk-process-with-bank/',
          body
        );
        const response = await requestSalaryAdminApi(
          'salary/admin/payments/teacher/bulk-process-with-bank/',
          { method: 'POST', headers, body }
        );
        
        const result = response.data || response;
        setBankTransferResult({
          ...result,
          gateway_mode: result.gateway_mode || gatewayMode,
          dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
        });
        
        if (!USE_REAL_GATEWAY || result.gateway_mode === 'DUMMY') {
          toastInfo(`[DUMMY MODE] ${response.message || 'Bulk processing in dummy mode'}`);
        } else {
          toastSuccess(response.message || `Processed ${result.successful || 0} payments successfully`);
        }
      } else {
        const response = await adminApi.salary.payments.teacher.bulkProcess(data);
        setBulkProcessResult(response.data);
        toastSuccess(response.data.message || `Created ${response.data.payments_created?.length || 0} payments`);
      }
      
      fetchTeacherPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error bulk processing teacher salary:', error);
      toastError('Failed to bulk process salaries');
    } finally {
      setIsSubmittingBulkProcess(false);
    }
  };

  // Verify bank transfer
  const verifyBankTransfer = async (
    paymentId: number,
    paymentType: 'staff' | 'teacher',
    options?: { silent?: boolean; refreshList?: boolean }
  ) => {
    const silent = !!options?.silent;
    const refreshList = options?.refreshList !== false;
    try {
      const response = await adminApi.salary.payments.verifyTransfer(paymentType, paymentId);
      
      const data = response.data.data;
      
      if (!silent) {
        if (data.current_status === 'processed') {
          toastSuccess('Payment verified and marked as processed');
        } else if (data.current_status === 'processing') {
          toastInfo(`Payment is still processing`);
        } else {
          toastInfo(`Payment status: ${data.current_status}`);
        }
      }
      
      if (refreshList) {
        if (paymentType === 'staff') {
          fetchStaffPayments();
        } else {
          fetchTeacherPayments();
        }
      }
      
      if (showPaymentDetailsModal) {
        // Refresh the payment details
        const updatedPayment = await fetchPaymentDetails(paymentId, paymentType);
        if (updatedPayment) {
          setShowPaymentDetailsModal({
            type: paymentType,
            payment: updatedPayment
          });
        }
      }
    } catch (error: any) {
      console.error('Error verifying bank transfer:', error);
      if (!silent) {
        toastError('Failed to verify bank transfer');
      }
    }
  };

  const retryStaffPaymentWithBank = async (paymentId: number) => {
    const actionKey = `staff-retry-${paymentId}`;
    setActiveTransferAction(actionKey);
    try {
      const payload = { bank_code: selectedBankCode };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        `salary/admin/payments/staff/${paymentId}/retry-with-bank/`,
        body
      );
      const response = await requestSalaryAdminApi(
        `salary/admin/payments/staff/${paymentId}/retry-with-bank/`,
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });

      toastSuccess(response.message || 'Staff salary retry initiated');
      await fetchStaffPayments();
      await fetchSalaryCardStats();

      if (showPaymentDetailsModal?.type === 'staff' && showPaymentDetailsModal.payment.id === paymentId) {
        const updatedPayment = await fetchPaymentDetails(paymentId, 'staff');
        if (updatedPayment) {
          setShowPaymentDetailsModal({ type: 'staff', payment: updatedPayment });
        }
      }
    } catch (error: any) {
      console.error('Error retrying staff salary with bank:', error);
      toastError(extractApiErrorMessage(error, 'Failed to retry staff salary transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  const retryTeacherPaymentWithBank = async (paymentId: number) => {
    const actionKey = `teacher-retry-${paymentId}`;
    setActiveTransferAction(actionKey);
    try {
      const payload = { bank_code: selectedBankCode };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        `salary/admin/payments/teacher/${paymentId}/retry-with-bank/`,
        body
      );
      const response = await requestSalaryAdminApi(
        `salary/admin/payments/teacher/${paymentId}/retry-with-bank/`,
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });

      toastSuccess(response.message || 'Teacher salary retry initiated');
      await fetchTeacherPayments();
      await fetchSalaryCardStats();

      if (showPaymentDetailsModal?.type === 'teacher' && showPaymentDetailsModal.payment.id === paymentId) {
        const updatedPayment = await fetchPaymentDetails(paymentId, 'teacher');
        if (updatedPayment) {
          setShowPaymentDetailsModal({ type: 'teacher', payment: updatedPayment });
        }
      }
    } catch (error: any) {
      console.error('Error retrying teacher salary with bank:', error);
      toastError(extractApiErrorMessage(error, 'Failed to retry teacher salary transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  const processExistingStaffPaymentWithBank = async (paymentId: number) => {
    const actionKey = `staff-process-${paymentId}`;
    setActiveTransferAction(actionKey);
    try {
      const payload = { bank_code: selectedBankCode };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        `salary/admin/payments/staff/${paymentId}/process-with-bank/`,
        body
      );
      const response = await requestSalaryAdminApi(
        `salary/admin/payments/staff/${paymentId}/process-with-bank/`,
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });
      toastSuccess(response.message || 'Salary transfer initiated');
      await fetchStaffPayments();
      await fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing existing staff payment with bank:', error);
      toastError(extractApiErrorMessage(error, 'Failed to process salary transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  const processExistingTeacherPaymentWithBank = async (paymentId: number) => {
    const actionKey = `teacher-process-${paymentId}`;
    setActiveTransferAction(actionKey);
    try {
      const payload = { bank_code: selectedBankCode };
      const body = JSON.stringify(payload);
      const headers = await buildRealtimePaymentHeaders(
        'POST',
        `salary/admin/payments/teacher/${paymentId}/process-with-bank/`,
        body
      );
      const response = await requestSalaryAdminApi(
        `salary/admin/payments/teacher/${paymentId}/process-with-bank/`,
        { method: 'POST', headers, body }
      );

      const result = response.data || response;
      setBankTransferResult({
        success: true,
        ...result,
        gateway_mode: result.gateway_mode || gatewayMode,
        dummy_mode: result.gateway_mode === 'DUMMY' || !USE_REAL_GATEWAY
      });
      toastSuccess(response.message || 'Salary transfer initiated');
      await fetchTeacherPayments();
      await fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error processing existing teacher payment with bank:', error);
      toastError(extractApiErrorMessage(error, 'Failed to process salary transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  // Update payment
  const updateStaffPayment = async (paymentId: number) => {
    try {
      const response = await adminApi.salary.payments.staff.update(paymentId, paymentUpdateData);
      toastSuccess(response.data.message || 'Payment updated successfully');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentUpdateData({
        transaction_id: '',
        bank_reference: '',
        payment_status: 'processed',
        remarks: ''
      });
      fetchStaffPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error updating staff payment:', error);
      toastError('Failed to update payment');
    }
  };

  const updateTeacherPayment = async (paymentId: number) => {
    try {
      const response = await adminApi.salary.payments.teacher.update(paymentId, paymentUpdateData);
      toastSuccess(response.data.message || 'Payment updated successfully');
      setShowPaymentModal(false);
      setSelectedPayment(null);
      setPaymentUpdateData({
        transaction_id: '',
        bank_reference: '',
        payment_status: 'processed',
        remarks: ''
      });
      fetchTeacherPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error updating teacher payment:', error);
      toastError('Failed to update payment');
    }
  };

  // Delete payment
  const deleteStaffPayment = async (paymentId: number) => {
    try {
      const response = await requestSalaryAdminApi(
        `salary/admin/payments/staff/${paymentId}/`,
        { method: 'DELETE' }
      );
      toastSuccess(response.message || 'Payment record deleted successfully');
      fetchStaffPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error deleting staff payment:', error);
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to delete payment record');
    }
  };

  const deleteTeacherPayment = async (paymentId: number) => {
    try {
      const response = await adminApi.salary.payments.teacher.delete(paymentId);
      toastSuccess(response.data.message || 'Payment record deleted successfully');
      fetchTeacherPayments();
      fetchSalaryCardStats();
    } catch (error: any) {
      console.error('Error deleting teacher payment:', error);
      toastError('Failed to delete payment record');
    }
  };

  // Summary API call
  const fetchSalarySummary = async () => {
    setLoadingSummary(true);
    try {
      const response = await adminApi.salary.payments.summary({
        month: summaryMonth,
        year: summaryYear
      });
      setSalarySummary(response.data.data);
    } catch (error: any) {
      console.error('Error fetching salary summary:', error);
      toastError('Failed to fetch salary summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchEmployeeSalaryYearlyReport = async (
    overrides?: Partial<{ employee_type: 'staff' | 'teacher'; employee_id: string; year: number }>,
    silentSuccessToast: boolean = false
  ) => {
    const employeeType = overrides?.employee_type ?? employeeReportFilters.employee_type;
    const employeeId = (overrides?.employee_id ?? employeeReportFilters.employee_id).trim();
    const year = Number(overrides?.year ?? employeeReportFilters.year);

    if (!employeeId) {
      toastWarning(`Please enter a ${employeeType} ID`);
      return;
    }
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      toastWarning('Please enter a valid year between 2000 and 2100');
      return;
    }

    setLoadingEmployeeSalaryReport(true);
    setEmployeeSalaryReportError('');
    try {
      const response = await adminApi.salary.reports.employeeYearly({
        employee_type: employeeType,
        employee_id: employeeId,
        year,
      });
      const data = response?.data?.data;
      if (!data) {
        throw new Error('Invalid report response');
      }
      setEmployeeSalaryReport(data);
      if (!silentSuccessToast) {
        toastSuccess('Salary report loaded');
      }
    } catch (error: any) {
      console.error('Error fetching employee salary report:', error);
      const message = extractApiErrorMessage(error, 'Failed to load salary report');
      setEmployeeSalaryReport(null);
      setEmployeeSalaryReportError(message);
      toastError(message);
    } finally {
      setLoadingEmployeeSalaryReport(false);
    }
  };

  const fetchSalaryCardStats = async (month = paymentFilters.month, year = paymentFilters.year) => {
    setLoadingSalaryCards(true);
    try {
      const response = await adminApi.salary.payments.cardsOverview({ month, year });
      setSalaryCardStats(response.data?.data || null);
    } catch (error) {
      console.error('Error fetching salary card stats:', error);
    } finally {
      setLoadingSalaryCards(false);
    }
  };

  const openSingleProcessModal = async () => {
    const targetMonth = paymentFilters.month;
    const targetYear = paymentFilters.year;
    try {
      const [
        staffListResponse,
        teacherListResponse,
        staffPaymentsResponse,
        teacherPaymentsResponse,
        staffStructuresResponse,
        teacherStructuresResponse
      ] = await Promise.all([
        adminApi.staff.list(),
        adminApi.teachers.list(),
        adminApi.salary.payments.staff.list({ month: targetMonth, year: targetYear }),
        adminApi.salary.payments.teacher.list({ month: targetMonth, year: targetYear }),
        adminApi.salary.staff.listStructures(),
        adminApi.salary.teacher.listStructures(),
      ]);

      const allStaff: StaffMember[] = staffListResponse.data || [];
      const allTeachers: Teacher[] = teacherListResponse.data || [];
      const staffPaymentsForPeriod: StaffPayment[] = staffPaymentsResponse.data?.data || [];
      const teacherPaymentsForPeriod: TeacherPayment[] = teacherPaymentsResponse.data?.data || [];
      const assignedStaffTypes = new Set<string>((staffStructuresResponse.data?.data || []).map((s: any) => s.staff_type));
      const assignedTeacherIds = new Set<string>((teacherStructuresResponse.data?.data || []).map((t: any) => t.teacher_id));

      setStaffList(allStaff);
      setTeachers(allTeachers);
      setAvailableStaffTypeOptions(Array.from(assignedStaffTypes));

      // Only include employees with assigned salary structure and without processed salary for this period.
      const staffWithProcessedPayments = new Set(
        staffPaymentsForPeriod.filter((payment) => payment.payment_status === 'processed').map((payment) => payment.staff)
      );
      const teacherWithProcessedPayments = new Set(
        teacherPaymentsForPeriod.filter((payment) => payment.payment_status === 'processed').map((payment) => payment.teacher)
      );
      const eligibleStaff = allStaff.filter(
        (staff) => assignedStaffTypes.has(staff.role) && !staffWithProcessedPayments.has(staff.id)
      );
      const eligibleTeachers = allTeachers.filter(
        (teacher) => assignedTeacherIds.has(teacher.teacher_id) && !teacherWithProcessedPayments.has(teacher.id)
      );

      if (eligibleStaff.length === 0 && eligibleTeachers.length === 0) {
        toastInfo(`No eligible employees with assigned salary structure for ${targetMonth}/${targetYear}`);
        return;
      }

      const initialType: 'staff' | 'teacher' =
        activePaymentTab === 'staff'
          ? (eligibleStaff.length > 0 ? 'staff' : 'teacher')
          : (eligibleTeachers.length > 0 ? 'teacher' : 'staff');
      const initialEmployeeId =
        initialType === 'staff'
          ? (eligibleStaff[0]?.id ?? null)
          : (eligibleTeachers[0]?.id ?? null);

      setSingleProcessCandidates({
        staff: eligibleStaff,
        teacher: eligibleTeachers,
      });

      setSingleProcessData({
        type: initialType,
        employeeId: initialEmployeeId,
        month: targetMonth,
        year: targetYear,
      });
      setShowProcessModal(true);
    } catch (error) {
      console.error('Error preparing single process modal:', error);
      toastError('Failed to load staff/teacher data for single process');
    }
  };

  const ensureAssignedStaffTypes = async () => {
    try {
      const response = await adminApi.salary.staff.listStructures();
      const options = Array.from(new Set<string>((response.data?.data || []).map((s: any) => s.staff_type)));
      setAvailableStaffTypeOptions(options);
      return options;
    } catch {
      return availableStaffTypeOptions;
    }
  };

  const getCurrentPaymentExportRows = () => {
    if (activePaymentTab === 'staff') {
      return staffPayments.map((payment) => {
        const perDayWage = Number(payment.per_day_wage || 0);
        const workedSalary = perDayWage * Number(payment.days_worked || 0);
        return {
          paymentId: payment.id,
          employeeId: payment.staff_id_display || `STF-${payment.staff}`,
          name: payment.staff_name,
          role: formatStaffType(payment.staff_role || ''),
          monthYear: `${payment.month}/${payment.year}`,
          assignedSalary: Number(payment.base_salary || 0),
          workedCount: Number(payment.days_worked || 0),
          workedSalary,
          absentCount: Number(payment.days_absent || 0),
          absentDeduction: Number(payment.absent_amount || 0),
          lateCount: Number(payment.days_late || 0),
          lateDeduction: Number(payment.late_amount || 0),
          netPayable: Number(payment.net_payable || 0),
          status: payment.payment_status,
        };
      });
    }
    return teacherPayments.map((payment) => {
      const perDayWage = Number(payment.per_day_wage || 0);
      const workedSalary = perDayWage * Number(payment.days_worked || 0);
      return {
        paymentId: payment.id,
        employeeId: payment.teacher_id_display,
        name: payment.teacher_name,
        role: teacherRoleMap[payment.teacher] || 'Teacher',
        monthYear: `${payment.month}/${payment.year}`,
        assignedSalary: Number(payment.base_salary || 0),
        workedCount: Number(payment.days_worked || 0),
        workedSalary,
        absentCount: Number(payment.days_absent || 0),
        absentDeduction: Number(payment.absent_amount || 0),
        lateCount: Number(payment.days_late || 0),
        lateDeduction: Number(payment.late_amount || 0),
        netPayable: Number(payment.net_payable || 0),
        status: payment.payment_status,
      };
    });
  };

  const exportPaymentsToExcel = () => {
    const sourceRows = activePaymentTab === 'staff' ? staffPayments : teacherPayments;
    if (sourceRows.length === 0) {
      toastWarning('No data to export');
      return;
    }
    const exportRows = activePaymentTab === 'staff'
      ? staffPayments.map((payment) => ({
          'Payment ID': payment.id,
          'Employee ID': payment.staff_id_display || `STF-${payment.staff}`,
          Name: payment.staff_name,
          Role: formatStaffType(payment.staff_role || ''),
          Month: payment.month,
          Year: payment.year,
          'Base Salary': Number(payment.base_salary || 0),
          'Per Day Wage': Number(payment.per_day_wage || 0),
          'Total Working Days': Number(payment.total_working_days || 0),
          'Days Worked': Number(payment.days_worked || 0),
          'Worked Salary': Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0),
          'Days Absent': Number(payment.days_absent || 0),
          'Absent Deduction': Number(payment.absent_amount || 0),
          'Days Late': Number(payment.days_late || 0),
          'Late Deduction': Number(payment.late_amount || 0),
          'Total Deduction': Number(payment.total_deduction || 0),
          'Net Payable': Number(payment.net_payable || 0),
          Status: payment.payment_status,
          'Payment Date': payment.payment_date ? formatDate(payment.payment_date) : '',
          'Transaction ID': payment.transaction_id || '',
          'Bank Reference': payment.bank_reference || '',
          'Transfer Bank Code': payment.transfer_bank_code || '',
          Remarks: payment.remarks || '',
          'Created At': payment.created_at ? formatDate(payment.created_at) : '',
        }))
      : teacherPayments.map((payment) => ({
          'Payment ID': payment.id,
          'Employee ID': payment.teacher_id_display,
          Name: payment.teacher_name,
          Role: teacherRoleMap[payment.teacher] || 'Teacher',
          Month: payment.month,
          Year: payment.year,
          'Base Salary': Number(payment.base_salary || 0),
          'Per Day Wage': Number(payment.per_day_wage || 0),
          'Total Working Days': Number(payment.total_working_days || 0),
          'Days Worked': Number(payment.days_worked || 0),
          'Worked Salary': Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0),
          'Days Absent': Number(payment.days_absent || 0),
          'Absent Deduction': Number(payment.absent_amount || 0),
          'Days Late': Number(payment.days_late || 0),
          'Late Deduction': Number(payment.late_amount || 0),
          'Total Deduction': Number(payment.total_deduction || 0),
          'Net Payable': Number(payment.net_payable || 0),
          Status: payment.payment_status,
          'Payment Date': payment.payment_date ? formatDate(payment.payment_date) : '',
          'Transaction ID': payment.transaction_id || '',
          'Bank Reference': payment.bank_reference || '',
          'Transfer Bank Code': payment.transfer_bank_code || '',
          Remarks: payment.remarks || '',
          'Created At': payment.created_at ? formatDate(payment.created_at) : '',
        }));
    const sheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, `${activePaymentTab}_payments`);
    XLSX.writeFile(workbook, `${activePaymentTab}_salary_payments_${paymentFilters.month}_${paymentFilters.year}.xlsx`);
    toastSuccess('Excel exported successfully');
  };

  const exportPaymentsToPDF = () => {
    const rows = getCurrentPaymentExportRows();
    if (rows.length === 0) {
      toastWarning('No data to export');
      return;
    }
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(12);
    doc.text(
      `${activePaymentTab === 'staff' ? 'Staff' : 'Teacher'} Salary Payments (${paymentFilters.month}/${paymentFilters.year})`,
      40,
      30
    );
    autoTable(doc, {
      startY: 45,
      head: [[
        'Payment ID', 'Employee ID', 'Name', 'Role', 'Month/Year', 'Assigned Salary',
        'Worked Count', 'Worked Salary', 'Absent Count', 'Absent Deduction',
        'Late Count', 'Late Deduction', 'Net Payable', 'Status'
      ]],
      body: rows.map((r) => [
        r.paymentId, r.employeeId, r.name, r.role, r.monthYear,
        r.assignedSalary.toFixed(2),
        r.workedCount,
        r.workedSalary.toFixed(2),
        r.absentCount,
        r.absentDeduction.toFixed(2),
        r.lateCount,
        r.lateDeduction.toFixed(2),
        r.netPayable.toFixed(2),
        r.status,
      ]),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133] },
    });
    doc.save(`${activePaymentTab}_salary_payments_${paymentFilters.month}_${paymentFilters.year}.pdf`);
    toastSuccess('PDF exported successfully');
  };

  /* ================= EFFECTS ================= */

  useEffect(() => {
    const timer = setTimeout(() => {
      setStaffSearchQuery(staffSearchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [staffSearchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTeacherSearchQuery(teacherSearchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [teacherSearchTerm]);

  useEffect(() => {
    setStaffCurrentPage(1);
  }, [staffFilterType, staffSearchQuery]);

  useEffect(() => {
    setTeacherCurrentPage(1);
  }, [teacherSearchQuery]);

  useEffect(() => {
    if (activeTab === 'staff') {
      fetchStaffStructures();
    }
  }, [activeTab, staffFilterType, staffSearchQuery, staffCurrentPage]);

  useEffect(() => {
    if (activeTab === 'teacher') {
      fetchTeacherStructures();
    }
  }, [activeTab, teacherSearchQuery, teacherCurrentPage]);

  useEffect(() => {
    fetchSalaryCardStats(paymentFilters.month, paymentFilters.year);
    if (activeTab === 'payments') {
      if (teachers.length === 0) {
        fetchTeachers();
      }
      if (activePaymentTab === 'staff') {
        fetchStaffPayments();
      } else {
        fetchTeacherPayments();
      }
    } else if (activeTab === 'summary') {
      fetchSalarySummary();
    }
  }, [activeTab, activePaymentTab]);

  useEffect(() => {
    fetchSalaryCardStats(paymentFilters.month, paymentFilters.year);
  }, [paymentFilters.month, paymentFilters.year]);

  useEffect(() => {
    if (activeTab === 'payments') {
      if (activePaymentTab === 'staff') {
        fetchStaffPayments();
      } else {
        fetchTeacherPayments();
      }
    }
  }, [paymentFilters.month, paymentFilters.year, paymentFilters.status]);

  useEffect(() => {
    if (showTeacherModal && teachers.length === 0) {
      fetchTeachers();
    }
  }, [showTeacherModal]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const redirectedFrom = params.get('redirectedFrom');
    const tabParam = params.get('tab');
    const employeeTypeParam = params.get('employee_type');
    const employeeIdParam = params.get('employee_id');
    const yearParamRaw = params.get('year');

    const redirectMap: Record<string, string> = {
      allteachers: '/admin/teachers/allteachers',
      'staff-directory': '/admin/staff/directory',
    };
    const backTarget = redirectedFrom ? redirectMap[redirectedFrom] : undefined;
    setShowRedirectBackButton(Boolean(backTarget));
    if (backTarget) {
      setRedirectBackTarget(backTarget);
    }

    if (tabParam === 'employeeReport') {
      setActiveTab('employeeReport');
    }

    if (employeeTypeParam && employeeIdParam) {
      const normalizedType: 'staff' | 'teacher' = employeeTypeParam === 'staff' ? 'staff' : 'teacher';
      const parsedYear = yearParamRaw ? parseInt(yearParamRaw, 10) : new Date().getFullYear();
      const normalizedYear = Number.isFinite(parsedYear) ? parsedYear : new Date().getFullYear();

      setActiveTab('employeeReport');
      setEmployeeReportFilters({
        employee_type: normalizedType,
        employee_id: employeeIdParam,
        year: normalizedYear,
      });
      void fetchEmployeeSalaryYearlyReport(
        {
          employee_type: normalizedType,
          employee_id: employeeIdParam,
          year: normalizedYear,
        },
        true
      );
    }
  }, []);

  useEffect(() => {
    if (!showTransferOtpModal || transferOtpTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setTransferOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showTransferOtpModal, transferOtpTimeLeft]);

  // Realtime status updates for payouts in processing state.
  useEffect(() => {
    if (activeTab !== 'payments') return;

    const run = async () => {
      let hasProcessingPayments = false;
      try {
        if (activePaymentTab === 'staff') {
          const processingPayments = staffPayments.filter(
            (payment) => payment.payment_status === 'processing' && !!payment.transaction_id
          );
          if (processingPayments.length === 0) return;
          hasProcessingPayments = true;
          setIsRealtimeTransferSyncing(true);
          await Promise.all(
            processingPayments.slice(0, 10).map((payment) =>
              verifyBankTransfer(payment.id, 'staff', { silent: true, refreshList: false })
            )
          );
          fetchStaffPayments();
        } else {
          const processingPayments = teacherPayments.filter(
            (payment) => payment.payment_status === 'processing' && !!payment.transaction_id
          );
          if (processingPayments.length === 0) return;
          hasProcessingPayments = true;
          setIsRealtimeTransferSyncing(true);
          await Promise.all(
            processingPayments.slice(0, 10).map((payment) =>
              verifyBankTransfer(payment.id, 'teacher', { silent: true, refreshList: false })
            )
          );
          fetchTeacherPayments();
        }
      } catch (error) {
        console.error('Realtime payout sync failed:', error);
      } finally {
        if (hasProcessingPayments) {
          setIsRealtimeTransferSyncing(false);
          fetchSalaryCardStats();
        }
      }
    };

    const interval = setInterval(run, 15000);
    return () => clearInterval(interval);
  }, [activeTab, activePaymentTab, staffPayments, teacherPayments]);

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = redirectBackTarget;
  };

  /* ================= UTILITY FUNCTIONS ================= */

  // Staff table functions
  const sortedStaffStructures = useMemo(() => {
    return [...staffStructures].sort((a, b) => {
      const aValue = a[staffSortConfig.key as keyof StaffSalaryStructure];
      const bValue = b[staffSortConfig.key as keyof StaffSalaryStructure];
      
      if (aValue < bValue) return staffSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return staffSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [staffStructures, staffSortConfig]);

  const filteredStaffStructures = sortedStaffStructures;

  const staffTotalPages = staffPagination.total_pages || 1;
  const currentStaffStructures = filteredStaffStructures;

  const handleStaffSort = (key: string) => {
    setStaffSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Teacher table functions
  const sortedTeacherStructures = useMemo(() => {
    return [...teacherStructures].sort((a, b) => {
      const aValue:any = a[teacherSortConfig.key as keyof TeacherSalaryStructure];
      const bValue:any = b[teacherSortConfig.key as keyof TeacherSalaryStructure];
      
      if (aValue < bValue) return teacherSortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return teacherSortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [teacherStructures, teacherSortConfig]);

  const filteredTeacherStructures = sortedTeacherStructures;

  const teacherTotalPages = teacherPagination.total_pages || 1;
  const currentTeacherStructures = filteredTeacherStructures;

  const handleTeacherSort = (key: string) => {
    setTeacherSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Format staff type for display
  const formatStaffType = (staffType: string) => {
    return staffType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return num.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const selectedSingleProcessEmployee =
    singleProcessData?.type === 'staff'
      ? singleProcessCandidates.staff.find((staff) => staff.id === singleProcessData.employeeId)
      : singleProcessCandidates.teacher.find((teacher) => teacher.id === singleProcessData?.employeeId);
  const teacherRoleMap = useMemo(
    () => Object.fromEntries((teachers || []).map((t) => [t.id, t.department || 'Teacher'])),
    [teachers]
  );

  const singleProcessEmployeeOptions =
    singleProcessData?.type === 'staff' ? singleProcessCandidates.staff : singleProcessCandidates.teacher;

  const openCreateStaffModal = () => {
    setIsEditingStaffStructure(false);
    setStaffFormData({
      staff_type: '',
      base_salary: '',
      late_penalty_percentage: '10.0'
    });
    setShowStaffModal(true);
  };

  const openEditStaffModal = (structure: StaffSalaryStructure) => {
    setIsEditingStaffStructure(true);
    setStaffFormData({
      staff_type: structure.staff_type,
      base_salary: structure.base_salary,
      late_penalty_percentage: structure.late_penalty_percentage.toString()
    });
    setShowStaffModal(true);
  };

  const closeStaffModal = () => {
    setShowStaffModal(false);
    setIsEditingStaffStructure(false);
    setStaffFormData({
      staff_type: '',
      base_salary: '',
      late_penalty_percentage: '10.0'
    });
  };

  const getEmployeeBankStatus = (employee: any) => {
    if (!employee) return { hasBank: false, message: 'No employee data' };
    
    const hasAccount = !!employee.bank_account_number;
    const hasIfsc = !!employee.ifsc_code;
    const hasHolder = !!employee.account_holder_name;
    
    if (hasAccount && hasIfsc && hasHolder) {
      return { hasBank: true, message: 'Bank details complete' };
    }
    
    const missing = [];
    if (!hasAccount) missing.push('Account Number');
    if (!hasIfsc) missing.push('IFSC Code');
    if (!hasHolder) missing.push('Account Holder Name');
    
    return { 
      hasBank: false, 
      message: `Missing: ${missing.join(', ')}`
    };
  };

  /* ================= RENDER FUNCTIONS ================= */

  const renderStaffTab = () => (
    <div className="animate-fade-in">
      {/* SEARCH & FILTERS */}
      <div className={getCardGradientClass('green')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className={combine(
                "absolute left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder="Search staff type or salary..."
                value={staffSearchTerm}
                onChange={(e) => setStaffSearchTerm(e.target.value)}
                className={getInputClass()}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
          <div>
            <select
              value={staffFilterType}
              onChange={(e) => setStaffFilterType(e.target.value)}
              className={getInputClass()}
            >
              <option value="all">All Staff Types</option>
              {STAFF_TYPES.map(type => (
                <option key={type} value={type}>{formatStaffType(type)}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={openCreateStaffModal}
              className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              <FaPlus className="text-xs sm:text-sm" />
              <span>Add Staff Salary</span>
            </button>
          </div>
        </div>
      </div>

      {/* STAFF SALARY TABLE */}
      <div className={getCardGradientClass()}>
        <div className={combine("p-4 border-b", get('border', 'primary'))}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
            <div>
              <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Staff Salary Structures</h3>
              <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                View and manage all staff salary structures
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchStaffStructures}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaSync className="text-xs sm:text-sm" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingStaff ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>Loading staff salary structures...</p>
                <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>Preparing staff salary records</p>
              </div>
            </div>
          ) : currentStaffStructures.length === 0 ? (
            <div className="p-8 text-center">
              <div className={combine(
                "inline-block p-3 rounded-full mb-3",
                theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
              )}>
                <FaUserTie className={combine(
                  "text-xl",
                  theme === 'dark' ? 'text-green-400' : 'text-green-500'
                )} />
              </div>
              <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No staff salary structures found</h3>
              <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                {staffSearchTerm || staffFilterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first staff salary structure to get started'}
              </p>
              <button
                onClick={openCreateStaffModal}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2 mx-auto")}
              >
                <FaPlus className="text-sm" />
                <span className="text-sm">Create First Structure</span>
              </button>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine(
                  "bg-gray-50 dark:bg-gray-800",
                  "divide-y",
                  get('border', 'primary')
                )}>
                  <tr>
                    <th 
                      className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                      onClick={() => handleStaffSort('staff_type')}
                    >
                      <div className="flex items-center space-x-2">
                        <FaUser className="text-xs" />
                        <span className="text-xs">Staff Type</span>
                        <div className="ml-1">
                          {staffSortConfig.key === 'staff_type' ? (
                            staffSortConfig.direction === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          ) : (
                            <FaSort className={get('icon', 'secondary') + " text-xs"} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                      onClick={() => handleStaffSort('base_salary')}
                    >
                      <div className="flex items-center space-x-2">
                        <FaRupeeSign className="text-xs" />
                        <span className="text-xs">Base Salary</span>
                        <div className="ml-1">
                          {staffSortConfig.key === 'base_salary' ? (
                            staffSortConfig.direction === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          ) : (
                            <FaSort className={get('icon', 'secondary') + " text-xs"} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Late Penalty</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaEye className="text-xs" />
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
                  {currentStaffStructures.map((structure) => (
                    <tr 
                      key={structure.id} 
                      className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                    >
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center">
                          <div className={combine(
                            "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                            theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                          )}>
                            <FaUserTie className={combine(
                              "text-sm",
                              theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            )} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{formatStaffType(structure.staff_type)}</div>
                            <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                              Staff Category
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center">
                          <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                          <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                            {formatCurrency(structure.base_salary)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center space-x-2">
                          <FaPercent className={combine("text-xs", get('icon', 'secondary'))} />
                          <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                            {structure.late_penalty_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => openEditStaffModal(structure)}
                            className={combine(
                              "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                              get('icon', 'primary') + " text-sm"
                            )}
                            title="Edit"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({
                              type: 'staff',
                              identifier: structure.staff_type
                            })}
                            className={combine(
                              "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                              get('icon', 'primary') + " text-sm"
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

              {/* PAGINATION */}
              {staffTotalPages > 1 && (
                <div className={combine("px-3 sm:px-4 py-2.5 sm:py-3 border-t", get('border', 'primary'))}>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className={combine("text-xs", get('text', 'tertiary'))}>
                      Page {staffCurrentPage} of {staffTotalPages} ({staffPagination.total} total)
                    </p>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setStaffCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={!staffPagination.has_previous}
                        className={combine(
                          "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                          getSecondaryButtonClass()
                        )}
                      >
                        <FaChevronLeft className="text-xs" />
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, staffTotalPages) }, (_, i) => {
                          let pageNum:any;
                          if (staffTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (staffCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (staffCurrentPage >= staffTotalPages - 2) {
                            pageNum = staffTotalPages - 4 + i;
                          } else {
                            pageNum = staffCurrentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setStaffCurrentPage(pageNum)}
                              className={combine(
                                "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                staffCurrentPage === pageNum
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
                        onClick={() => setStaffCurrentPage(prev => Math.min(prev + 1, staffTotalPages))}
                        disabled={!staffPagination.has_next}
                        className={combine(
                          "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
  );

  const renderTeacherTab = () => (
    <div className="animate-fade-in">
      {/* SEARCH & FILTERS */}
      <div className={getCardGradientClass('blue')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className={combine(
                "absolute left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder="Search teacher ID, name or salary..."
                value={teacherSearchTerm}
                onChange={(e) => setTeacherSearchTerm(e.target.value)}
                className={getInputClass()}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
          <div>
            <button
              onClick={fetchTeacherStructures}
              className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              <FaSync className="text-xs sm:text-sm" />
              <span>Refresh</span>
            </button>
          </div>
          <div>
            <button
              onClick={() => setShowTeacherModal(true)}
              className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              <FaPlus className="text-xs sm:text-sm" />
              <span>Add Teacher Salary</span>
            </button>
          </div>
        </div>
      </div>

      {/* TEACHER SALARY TABLE */}
      <div className={getCardGradientClass()}>
        <div className={combine("p-4 border-b", get('border', 'primary'))}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
            <div>
              <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Teacher Salary Structures</h3>
              <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                View and manage all teacher salary structures
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingTeacher ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>Loading teacher salary structures...</p>
                <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>Preparing teacher salary records</p>
              </div>
            </div>
          ) : currentTeacherStructures.length === 0 ? (
            <div className="p-8 text-center">
              <div className={combine(
                "inline-block p-3 rounded-full mb-3",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaChalkboardTeacher className={combine(
                  "text-xl",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                )} />
              </div>
              <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No teacher salary structures found</h3>
              <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                {teacherSearchTerm
                  ? 'Try adjusting your search'
                  : 'Create your first teacher salary structure to get started'}
              </p>
              <button
                onClick={() => setShowTeacherModal(true)}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2 mx-auto")}
              >
                <FaPlus className="text-sm" />
                <span className="text-sm">Create First Structure</span>
              </button>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine(
                  "bg-gray-50 dark:bg-gray-800",
                  "divide-y",
                  get('border', 'primary')
                )}>
                  <tr>
                    <th 
                      className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                      onClick={() => handleTeacherSort('teacher_id')}
                    >
                      <div className="flex items-center space-x-2">
                        <FaIdCard className="text-xs" />
                        <span className="text-xs">Teacher ID</span>
                        <div className="ml-1">
                          {teacherSortConfig.key === 'teacher_id' ? (
                            teacherSortConfig.direction === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          ) : (
                            <FaSort className={get('icon', 'secondary') + " text-xs"} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th 
                      className={combine(
                        "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer",
                        get('text', 'tertiary'),
                        "hover:bg-[var(--color-bg-hover)]"
                      )}
                      onClick={() => handleTeacherSort('base_salary')}
                    >
                      <div className="flex items-center space-x-2">
                        <FaRupeeSign className="text-xs" />
                        <span className="text-xs">Base Salary</span>
                        <div className="ml-1">
                          {teacherSortConfig.key === 'base_salary' ? (
                            teacherSortConfig.direction === 'asc' ? 
                              <FaSortUp className={get('accent', 'primary') + " text-xs"} /> : 
                              <FaSortDown className={get('accent', 'primary') + " text-xs"} />
                          ) : (
                            <FaSort className={get('icon', 'secondary') + " text-xs"} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs">Late Penalty</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaEye className="text-xs" />
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
                  {currentTeacherStructures.map((structure) => (
                    <tr 
                      key={structure.id} 
                      className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                    >
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center">
                          <div className={combine(
                            "h-10 w-10 rounded-full flex items-center justify-center mr-3",
                            theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                          )}>
                            <FaChalkboardTeacher className={combine(
                              "text-sm",
                              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                            )} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{structure.teacher_id}</div>
                            {structure.teacher_name && (
                              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                {structure.teacher_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center">
                          <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                          <span className={combine("font-bold text-sm", get('text', 'primary'))}>
                            {formatCurrency(structure.base_salary)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex items-center space-x-2">
                          <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                            {structure.late_penalty_percentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <div className="flex space-x-1.5">
                          <button
                            onClick={() => {
                              setTeacherFormData({
                                teacher_id: structure.teacher_id,
                                base_salary: structure.base_salary,
                                late_penalty_percentage: structure.late_penalty_percentage.toString()
                              });
                              setShowTeacherModal(true);
                            }}
                            className={combine(
                              "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                              get('icon', 'primary') + " text-sm"
                            )}
                            title="Edit"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm({
                              type: 'teacher',
                              identifier: structure.teacher_id
                            })}
                            className={combine(
                              "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                              get('icon', 'primary') + " text-sm"
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

              {/* PAGINATION */}
              {teacherTotalPages > 1 && (
                <div className={combine("px-3 sm:px-4 py-2.5 sm:py-3 border-t", get('border', 'primary'))}>
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <p className={combine("text-xs", get('text', 'tertiary'))}>
                      Page {teacherCurrentPage} of {teacherTotalPages} ({teacherPagination.total} total)
                    </p>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setTeacherCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={!teacherPagination.has_previous}
                        className={combine(
                          "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                          getSecondaryButtonClass()
                        )}
                      >
                        <FaChevronLeft className="text-xs" />
                      </button>
                      
                      <div className="flex space-x-1">
                        {Array.from({ length: Math.min(5, teacherTotalPages) }, (_, i) => {
                          let pageNum:any;
                          if (teacherTotalPages <= 5) {
                            pageNum = i + 1;
                          } else if (teacherCurrentPage <= 3) {
                            pageNum = i + 1;
                          } else if (teacherCurrentPage >= teacherTotalPages - 2) {
                            pageNum = teacherTotalPages - 4 + i;
                          } else {
                            pageNum = teacherCurrentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setTeacherCurrentPage(pageNum)}
                              className={combine(
                                "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                teacherCurrentPage === pageNum
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
                        onClick={() => setTeacherCurrentPage(prev => Math.min(prev + 1, teacherTotalPages))}
                        disabled={!teacherPagination.has_next}
                        className={combine(
                          "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
  );

  const renderPaymentsTab = () => (
    <div className="animate-fade-in">
      {/* Payment Tabs */}
      <div className={combine(getCardGradientClass('purple'), "mb-4 p-2")}>
        <nav className="flex flex-wrap gap-2">
          <button
            onClick={() => setActivePaymentTab('staff')}
            className={combine(
              "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
              activePaymentTab === 'staff'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <FaUserTie className="text-xs sm:text-sm" />
            <span>Staff Payments</span>
          </button>
          <button
            onClick={() => setActivePaymentTab('teacher')}
            className={combine(
              "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
              activePaymentTab === 'teacher'
                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
            )}
          >
            <FaChalkboardTeacher className="text-xs sm:text-sm" />
            <span>Teacher Payments</span>
          </button>
        </nav>
      </div>

      {/* Gateway Mode Indicator */}
      <div className="mb-4 flex items-center justify-end space-x-2">
        <div className={combine(
          "px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1",
          USE_REAL_GATEWAY 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
        )}>
          <FaShieldAlt className="text-xs" />
          <span>{USE_REAL_GATEWAY ? 'Real Payment Gateway' : 'Dummy Mode (Testing)'}</span>
        </div>
      </div>

      {/* Filters */}
      <div className={getCardGradientClass('purple')}>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 sm:gap-4">
          {activePaymentTab === 'staff' ? (
            <div>
              <input
                type="text"
                placeholder="Staff ID"
                value={paymentFilters.staff_id}
                onChange={(e) => setPaymentFilters({ ...paymentFilters, staff_id: e.target.value })}
                className={getInputClass()}
              />
            </div>
          ) : (
            <div>
              <input
                type="text"
                placeholder="Teacher ID"
                value={paymentFilters.teacher_id}
                onChange={(e) => setPaymentFilters({ ...paymentFilters, teacher_id: e.target.value })}
                className={getInputClass()}
              />
            </div>
          )}
          <div>
            <input
              type="number"
              placeholder="Month"
              min="1"
              max="12"
              value={paymentFilters.month}
              onChange={(e) => setPaymentFilters({ ...paymentFilters, month: parseInt(e.target.value) })}
              className={getInputClass()}
            />
          </div>
          <div>
            <input
              type="number"
              placeholder="Year"
              value={paymentFilters.year}
              onChange={(e) => setPaymentFilters({ ...paymentFilters, year: parseInt(e.target.value) })}
              className={getInputClass()}
            />
          </div>
          <div>
            <select
              value={paymentFilters.status}
              onChange={(e) => setPaymentFilters({ ...paymentFilters, status: e.target.value })}
              className={getInputClass()}
            >
              <option value="">All Status</option>
              {PAYMENT_STATUSES.map(status => (
                <option key={status} value={status} className="capitalize">{status}</option>
              ))}
            </select>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                if (activePaymentTab === 'staff') {
                  fetchStaffPayments();
                } else {
                  fetchTeacherPayments();
                }
              }}
              className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
            >
              <FaSearch className="text-xs sm:text-sm" />
              <span>Search</span>
            </button>
            <button
              onClick={() => {
                setPaymentFilters({
                  staff_id: '',
                  teacher_id: '',
                  month: new Date().getMonth() + 1,
                  year: new Date().getFullYear(),
                  status: ''
                });
              }}
              className={combine(getSecondaryButtonClass(), "flex items-center justify-center")}
              title="Reset Filters"
            >
              <FaUndo className="text-xs sm:text-sm" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={openSingleProcessModal}
              className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              {/* <FaPlus className="text-xs sm:text-sm" /> */}
              <span>Single Process</span>
            </button>
            <button
              onClick={async () => {
                const staffTypes = await ensureAssignedStaffTypes();
                setBulkProcessData({
                  month: paymentFilters.month,
                  year: paymentFilters.year,
                  staff_type: staffTypes[0] || '',
                  employee_type: activePaymentTab,
                  bank_code: selectedBankCode
                });
                setBulkProcessResult(null);
                setBankTransferResult(null);
                setShowBulkProcessModal(true);
              }}
              className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              {/* <FaMoneyCheckAlt className="text-xs sm:text-sm" /> */}
              <span>Bulk Process</span>
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className={getCardGradientClass()}>
        <div className={combine("p-4 border-b", get('border', 'primary'))}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
            <div>
              <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                {activePaymentTab === 'staff' ? 'Staff' : 'Teacher'} Salary Payments
              </h3>
              <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                View and manage salary payments
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={exportPaymentsToExcel}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaFileInvoice className="text-xs sm:text-sm" />
                <span>Export Excel</span>
              </button>
              <button
                onClick={exportPaymentsToPDF}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaFileInvoice className="text-xs sm:text-sm" />
                <span>Export PDF</span>
              </button>
              {isRealtimeTransferSyncing && (
                <div className={combine(
                  "text-xs px-2.5 py-1 rounded-full border flex items-center space-x-1.5",
                  theme === 'dark'
                    ? 'bg-blue-900/20 text-blue-300 border-blue-800'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                )}>
                  <FaSync className="animate-spin text-[10px]" />
                  <span>Realtime transfer sync...</span>
                </div>
              )}
              <button
                onClick={() => {
                  if (activePaymentTab === 'staff') {
                    fetchStaffPayments();
                  } else {
                    fetchTeacherPayments();
                  }
                }}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaSync className="text-xs sm:text-sm" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingPayments ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>Loading payments...</p>
                <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>Preparing payment records</p>
              </div>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine(
                  "bg-gray-50 dark:bg-gray-800",
                  "divide-y",
                  get('border', 'primary')
                )}>
                  <tr>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaIdCard className="text-xs" />
                        <span>ID</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaUser className="text-xs" />
                        <span>Name / Role</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaCalendar className="text-xs" />
                        <span>Month/Year</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaRupeeSign className="text-xs" />
                        <span>Assigned Salary</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaCalendar className="text-xs" />
                        <span>Total Working Days</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaCalculator className="text-xs" />
                        <span>Worked (Count/Salary)</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaExclamationTriangle className="text-xs" />
                        <span>Absent (Count/Deduction)</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaPercent className="text-xs" />
                        <span>Late (Count/Deduction)</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaRupeeSign className="text-xs" />
                        <span>Net Payable</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaClock className="text-xs" />
                        <span>Status</span>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-2">
                        <FaEye className="text-xs" />
                        <span>Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className={combine(
                  "divide-y",
                  get('bg', 'card'),
                  get('border', 'primary')
                )}>
                  {activePaymentTab === 'staff' ? (
                    staffPayments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 sm:px-4 py-8 text-center">
                          <div className={combine("text-sm", get('text', 'secondary'))}>
                            No staff payments found
                          </div>
                        </td>
                      </tr>
                    ) : (
                      staffPayments.map((payment) => (
                        <tr key={payment.id} className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]">
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="space-y-0.5">
                              <div className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                                PAY-{payment.id}
                              </div>
                              <div className="text-xs font-semibold">
                                {payment.staff_id_display || `STF-${payment.staff}`}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div>
                              <div className="font-semibold text-sm">{payment.staff_name}</div>
                              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                {formatStaffType(payment.staff_role)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              {payment.month}/{payment.year}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-medium text-sm">
                                {formatCurrency(payment.base_salary)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm font-medium">
                              {payment.total_working_days ?? 0}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_worked}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0))}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_absent}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(payment.absent_amount)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_late}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(payment.late_amount)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-bold text-sm">
                                {formatCurrency(payment.net_payable)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center space-x-2">
                              {getPaymentStatusIcon(payment.payment_status)}
                              <span className={getStatusBadgeClass(payment.payment_status)}>
                                {payment.payment_status}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowPaymentDetailsModal({
                                    type: 'staff',
                                    payment
                                  });
                                }}
                                className={combine(
                                  "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                  get('icon', 'primary') + " text-sm"
                                )}
                                title="View Details"
                              >
                                <FaEye className="text-sm" />
                              </button>
                              {payment.payment_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => processExistingStaffPaymentWithBank(payment.id))}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    disabled={activeTransferAction === `staff-process-${payment.id}`}
                                    title="Process Bank Transfer"
                                  >
                                    {activeTransferAction === `staff-process-${payment.id}` ? (
                                      <FaSync className="text-sm animate-spin" />
                                    ) : (
                                      <FaUniversity className="text-sm" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setPaymentUpdateData({
                                        transaction_id: payment.transaction_id || '',
                                        bank_reference: payment.bank_reference || '',
                                        payment_status: 'processed',
                                        remarks: payment.remarks || ''
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this payment record?')) {
                                        deleteStaffPayment(payment.id);
                                      }
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Delete"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </>
                              )}
                              {payment.payment_status === 'processing' && (
                                <button
                                  onClick={() => verifyBankTransfer(payment.id, 'staff')}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="Verify Transfer"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                              )}
                              {payment.payment_status === 'failed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setPaymentUpdateData({
                                        transaction_id: payment.transaction_id || '',
                                        bank_reference: payment.bank_reference || '',
                                        payment_status: 'processed',
                                        remarks: payment.remarks || ''
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => retryStaffPaymentWithBank(payment.id))}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    disabled={activeTransferAction === `staff-retry-${payment.id}`}
                                    title="Retry Transfer"
                                  >
                                    <FaSync className={combine(
                                      "text-sm",
                                      activeTransferAction === `staff-retry-${payment.id}` ? "animate-spin" : ""
                                    )} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  ) : (
                    teacherPayments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-3 sm:px-4 py-8 text-center">
                          <div className={combine("text-sm", get('text', 'secondary'))}>
                            No teacher payments found
                          </div>
                        </td>
                      </tr>
                    ) : (
                      teacherPayments.map((payment) => (
                        <tr key={payment.id} className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]">
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="space-y-0.5">
                              <div className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                                PAY-{payment.id}
                              </div>
                              <div className="text-xs font-semibold">
                                {payment.teacher_id_display}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div>
                              <div className="font-semibold text-sm">{payment.teacher_name}</div>
                              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                {teacherRoleMap[payment.teacher] || 'Teacher'}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              {payment.month}/{payment.year}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-medium text-sm">
                                {formatCurrency(payment.base_salary)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm font-medium">
                              {payment.total_working_days ?? 0}
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_worked}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0))}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_absent}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(payment.absent_amount)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="text-sm">
                              <div>{payment.days_late}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {formatCurrency(payment.late_amount)}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-bold text-sm">
                                {formatCurrency(payment.net_payable)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex items-center space-x-2">
                              {getPaymentStatusIcon(payment.payment_status)}
                              <span className={getStatusBadgeClass(payment.payment_status)}>
                                {payment.payment_status}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  setShowPaymentDetailsModal({
                                    type: 'teacher',
                                    payment
                                  });
                                }}
                                className={combine(
                                  "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-primary)]",
                                  get('icon', 'primary') + " text-sm"
                                )}
                                title="View Details"
                              >
                                <FaEye className="text-sm" />
                              </button>
                              {payment.payment_status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => processExistingTeacherPaymentWithBank(payment.id))}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    disabled={activeTransferAction === `teacher-process-${payment.id}`}
                                    title="Process Bank Transfer"
                                  >
                                    {activeTransferAction === `teacher-process-${payment.id}` ? (
                                      <FaSync className="text-sm animate-spin" />
                                    ) : (
                                      <FaUniversity className="text-sm" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setPaymentUpdateData({
                                        transaction_id: payment.transaction_id || '',
                                        bank_reference: payment.bank_reference || '',
                                        payment_status: 'processed',
                                        remarks: payment.remarks || ''
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm('Are you sure you want to delete this payment record?')) {
                                        deleteTeacherPayment(payment.id);
                                      }
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Delete"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </>
                              )}
                              {payment.payment_status === 'processing' && (
                                <button
                                  onClick={() => verifyBankTransfer(payment.id, 'teacher')}
                                  className={combine(
                                    "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-info)]",
                                    get('icon', 'primary') + " text-sm"
                                  )}
                                  title="Verify Transfer"
                                >
                                  <FaCheck className="text-sm" />
                                </button>
                              )}
                              {payment.payment_status === 'failed' && (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setPaymentUpdateData({
                                        transaction_id: payment.transaction_id || '',
                                        bank_reference: payment.bank_reference || '',
                                        payment_status: 'processed',
                                        remarks: payment.remarks || ''
                                      });
                                      setShowPaymentModal(true);
                                    }}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => retryTeacherPaymentWithBank(payment.id))}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-warning)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    disabled={activeTransferAction === `teacher-retry-${payment.id}`}
                                    title="Retry Transfer"
                                  >
                                    <FaSync className={combine(
                                      "text-sm",
                                      activeTransferAction === `teacher-retry-${payment.id}` ? "animate-spin" : ""
                                    )} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderSummaryTab = () => (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className={getCardGradientClass('indigo')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Month</label>
            <input
              type="number"
              min="1"
              max="12"
              value={summaryMonth}
              onChange={(e) => setSummaryMonth(parseInt(e.target.value))}
              className={getInputClass()}
            />
          </div>
          <div>
            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Year</label>
            <input
              type="number"
              value={summaryYear}
              onChange={(e) => setSummaryYear(parseInt(e.target.value))}
              className={getInputClass()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchSalarySummary}
              className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
            >
              <FaChartLine className="text-sm" />
              <span>Load Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="p-8 text-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
              </div>
            </div>
            <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>Loading summary...</p>
            <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>Preparing salary summary records</p>
          </div>
        </div>
      ) : salarySummary ? (
        <div className="space-y-6">
          {/* Grand Total */}
          <div className={getCardGradientClass('indigo')}>
            <div className="text-center">
              <div className={combine("text-sm mb-2", get('text', 'secondary'))}>Grand Total Payable</div>
              <div className="flex items-center justify-center">
                <FaRupeeSign className={combine("mr-2 text-3xl", get('text', 'primary'))} />
                <span className={combine("text-4xl font-bold", get('accent', 'primary'))}>
                  {formatCurrency(salarySummary.grand_total)}
                </span>
              </div>
              <div className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                For {salarySummary.month}/{salarySummary.year}
              </div>
            </div>
          </div>

          {/* Staff Summary */}
          <div className={getCardGradientClass('green')}>
            <h3 className={combine("text-lg font-bold mb-4 flex items-center space-x-2", get('text', 'primary'))}>
              <FaUserTie className="text-lg" />
              <span>Staff Salary Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Total Staff</div>
                <div className="text-2xl font-bold mt-1">{salarySummary.staff.total_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Processed</div>
                <div className="text-2xl font-bold mt-1 text-green-500">{salarySummary.staff.processed_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Pending</div>
                <div className="text-2xl font-bold mt-1 text-yellow-500">{salarySummary.staff.pending_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Failed</div>
                <div className="text-2xl font-bold mt-1 text-red-500">{salarySummary.staff.failed_count}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Total Amount</div>
                <div className="flex items-center mt-1">
                  <FaRupeeSign className={combine("mr-1", get('icon', 'secondary'))} />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.staff.total_amount)}</span>
                </div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Processed Amount</div>
                <div className="flex items-center mt-1 text-green-500">
                  <FaRupeeSign className="mr-1" />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.staff.processed_amount)}</span>
                </div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Pending Amount</div>
                <div className="flex items-center mt-1 text-yellow-500">
                  <FaRupeeSign className="mr-1" />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.staff.pending_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Summary */}
          <div className={getCardGradientClass('blue')}>
            <h3 className={combine("text-lg font-bold mb-4 flex items-center space-x-2", get('text', 'primary'))}>
              <FaChalkboardTeacher className="text-lg" />
              <span>Teacher Salary Summary</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Total Teachers</div>
                <div className="text-2xl font-bold mt-1">{salarySummary.teachers.total_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Processed</div>
                <div className="text-2xl font-bold mt-1 text-green-500">{salarySummary.teachers.processed_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Pending</div>
                <div className="text-2xl font-bold mt-1 text-yellow-500">{salarySummary.teachers.pending_count}</div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Failed</div>
                <div className="text-2xl font-bold mt-1 text-red-500">{salarySummary.teachers.failed_count}</div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Total Amount</div>
                <div className="flex items-center mt-1">
                  <FaRupeeSign className={combine("mr-1", get('icon', 'secondary'))} />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.teachers.total_amount)}</span>
                </div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Processed Amount</div>
                <div className="flex items-center mt-1 text-green-500">
                  <FaRupeeSign className="mr-1" />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.teachers.processed_amount)}</span>
                </div>
              </div>
              <div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>Pending Amount</div>
                <div className="flex items-center mt-1 text-yellow-500">
                  <FaRupeeSign className="mr-1" />
                  <span className="text-xl font-bold">{formatCurrency(salarySummary.teachers.pending_amount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <div className={combine(
            "inline-block p-3 rounded-full mb-3",
            theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
          )}>
            <FaChartLine className={combine("text-xl", get('icon', 'secondary'))} />
          </div>
          <p className={combine("text-sm", get('text', 'secondary'))}>
            Select month and year, then click Load Summary to view salary summary
          </p>
        </div>
      )}
    </div>
  );

  const renderEmployeeReportTab = () => (
    <div className="animate-fade-in">
      <div className={getCardGradientClass('blue')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Type</label>
            <select
              value={employeeReportFilters.employee_type}
              onChange={(e) =>
                setEmployeeReportFilters((prev) => ({
                  ...prev,
                  employee_type: e.target.value as 'staff' | 'teacher',
                }))
              }
              className={getInputClass()}
            >
              <option value="teacher">Teacher</option>
              <option value="staff">Staff</option>
            </select>
          </div>
          <div>
            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
              {employeeReportFilters.employee_type === 'teacher' ? 'Teacher ID' : 'Staff ID'}
            </label>
            <input
              type="text"
              value={employeeReportFilters.employee_id}
              onChange={(e) =>
                setEmployeeReportFilters((prev) => ({ ...prev, employee_id: e.target.value }))
              }
              placeholder={
                employeeReportFilters.employee_type === 'teacher' ? 'Enter teacher ID' : 'Enter staff ID'
              }
              className={getInputClass()}
            />
          </div>
          <div>
            <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Year</label>
            <input
              type="number"
              value={employeeReportFilters.year}
              onChange={(e) =>
                setEmployeeReportFilters((prev) => ({ ...prev, year: parseInt(e.target.value, 10) || 0 }))
              }
              min={2000}
              max={2100}
              className={getInputClass()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { void fetchEmployeeSalaryYearlyReport(); }}
              disabled={loadingEmployeeSalaryReport}
              className={combine(getPrimaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
            >
              {loadingEmployeeSalaryReport ? <FaSync className="text-sm animate-spin" /> : <FaSearch className="text-sm" />}
              <span>Show Report</span>
            </button>
          </div>
        </div>
      </div>

      {employeeSalaryReportError && (
        <div className={combine(getCardGradientClass('red'), "mt-4")}>
          <div className="flex items-center space-x-2">
            <FaExclamationTriangle className="text-red-500" />
            <p className={combine("text-sm font-medium", get('text', 'primary'))}>{employeeSalaryReportError}</p>
          </div>
        </div>
      )}

      {employeeSalaryReport && (
        <div className="space-y-4 mt-4">
          <div className={getCardGradientClass('indigo')}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex items-center gap-3">
                {employeeSalaryReport.employee_profile_image ? (
                  <img
                    src={employeeSalaryReport.employee_profile_image}
                    alt={employeeSalaryReport.employee_name}
                    className="h-12 w-12 rounded-full object-cover border border-indigo-300 dark:border-indigo-700"
                  />
                ) : (
                  <div className={combine(
                    "h-12 w-12 rounded-full flex items-center justify-center",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    {employeeSalaryReport.employee_type === 'teacher' ? (
                      <FaChalkboardTeacher className={combine("text-base", theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600')} />
                    ) : (
                      <FaUserTie className={combine("text-base", theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600')} />
                    )}
                  </div>
                )}
                <div>
                  <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>Teacher/Staff Salary Report</h3>
                  <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                    {employeeSalaryReport.employee_name} ({employeeSalaryReport.employee_id}) • {employeeSalaryReport.year}
                  </p>
                </div>
              </div>
              <div className={combine("text-xs", get('text', 'tertiary'))}>
                Role: {employeeSalaryReport.employee_role === 'teacher' ? 'Teacher' : formatStaffType(employeeSalaryReport.employee_role)}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              <div className={combine("rounded-xl p-3 border", get('border', 'secondary'), get('bg', 'card'))}>
                <p className={combine("text-xs", get('text', 'tertiary'))}>Months with Records</p>
                <p className={combine("text-lg font-bold mt-1", get('text', 'primary'))}>{employeeSalaryReport.summary.months_with_records}</p>
              </div>
              <div className={combine("rounded-xl p-3 border", get('border', 'secondary'), get('bg', 'card'))}>
                <p className={combine("text-xs", get('text', 'tertiary'))}>Processed</p>
                <p className="text-lg font-bold mt-1 text-green-500">{employeeSalaryReport.summary.processed_count}</p>
              </div>
              <div className={combine("rounded-xl p-3 border", get('border', 'secondary'), get('bg', 'card'))}>
                <p className={combine("text-xs", get('text', 'tertiary'))}>Pending</p>
                <p className="text-lg font-bold mt-1 text-yellow-500">{employeeSalaryReport.summary.pending_count}</p>
              </div>
              <div className={combine("rounded-xl p-3 border", get('border', 'secondary'), get('bg', 'card'))}>
                <p className={combine("text-xs", get('text', 'tertiary'))}>Failed</p>
                <p className="text-lg font-bold mt-1 text-red-500">{employeeSalaryReport.summary.failed_count}</p>
              </div>
            </div>
          </div>

          <div className={getCardGradientClass()}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                  <tr>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Month</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Status</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Base Salary</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Deduction</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Net Payable</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Payment Date</th>
                    <th className={combine("px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase", get('text', 'tertiary'))}>Transaction ID</th>
                  </tr>
                </thead>
                <tbody className={combine("divide-y", get('border', 'primary'))}>
                  {employeeSalaryReport.monthly_report.map((entry) => (
                    <tr key={`${entry.month}-${entry.payment_id ?? 'none'}`} className="hover:bg-[var(--color-bg-hover)]">
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm">{entry.month_name}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                        <span className={getStatusBadgeClass(entry.payment_status === 'not_processed' ? 'pending' : entry.payment_status)}>
                          {entry.payment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm">{formatCurrency(entry.base_salary)}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm">{formatCurrency(entry.total_deduction)}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-semibold">{formatCurrency(entry.net_payable)}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm">{formatDate(entry.payment_date)}</td>
                      <td className="px-3 sm:px-4 py-2.5 sm:py-3 text-sm">{entry.transaction_id || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* HEADER SECTION */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-green-600 to-green-700" 
                  : "bg-gradient-to-br from-green-500 to-green-600"
              )}>
                <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className={combine("text-2xl sm:text-3xl font-bold", get('text', 'primary'))}>
                  Salary & Payroll Management
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1 flex items-center", get('text', 'secondary'))}>
                  <MdOutlineDashboard className="mr-2 text-xs sm:text-sm" />
                  Manage salary structures and payroll for teachers and staff
                  {!USE_REAL_GATEWAY && (
                    <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 rounded-full text-xs">
                      Dummy Mode
                    </span>
                  )}
                </p>
              </div>
            </div>
            {showRedirectBackButton && (
              <div className="flex justify-end">
                <button
                  onClick={handleRedirectBack}
                  className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                >
                  <FaChevronLeft className="text-xs sm:text-sm" />
                  <span>Back</span>
                </button>
              </div>
            )}
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 sm:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getCardGradientClass('green')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Staff Structures</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : (salaryCardStats?.staff_structures_count ?? staffStructures.length)}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                )}>
                  <FaUserTie className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-green-400' : 'text-green-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                For {salaryCardStats?.month || paymentFilters.month}/{salaryCardStats?.year || paymentFilters.year}
              </div>
            </div>
            
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Teacher Structures</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : (salaryCardStats?.teacher_structures_count ?? teacherStructures.length)}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaChalkboardTeacher className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                For {salaryCardStats?.month || paymentFilters.month}/{salaryCardStats?.year || paymentFilters.year}
              </div>
            </div>
            
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Pending Payments</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : (salaryCardStats?.pending_payments_count ?? 0)}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaHourglassHalf className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Staff {loadingSalaryCards ? '...' : (salaryCardStats?.staff_pending_payments_count ?? 0)} | Teacher {loadingSalaryCards ? '...' : (salaryCardStats?.teacher_pending_payments_count ?? 0)}
              </div>
            </div>

            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Processed Payments</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : (salaryCardStats?.processed_payments_count ?? 0)}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaCheckCircle className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Staff {loadingSalaryCards ? '...' : (salaryCardStats?.staff_processed_payments_count ?? 0)} | Teacher {loadingSalaryCards ? '...' : (salaryCardStats?.teacher_processed_payments_count ?? 0)}
              </div>
            </div>

            <div className={getCardGradientClass('red')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Failed Payments</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : (salaryCardStats?.failed_payments_count ?? 0)}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaExclamationCircle className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Staff {loadingSalaryCards ? '...' : (salaryCardStats?.staff_failed_payments_count ?? 0)} | Teacher {loadingSalaryCards ? '...' : (salaryCardStats?.teacher_failed_payments_count ?? 0)}
              </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-sm font-medium", get('text', 'secondary'))}>Total Payable</p>
                  <p className={combine("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {loadingSalaryCards ? '...' : formatCurrency((salaryCardStats?.total_payable_amount ?? 0).toString())}
                  </p>
                </div>
                <div className={combine(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <MdAttachMoney className={combine(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('text', 'tertiary'))}>
                Staff {loadingSalaryCards ? '...' : formatCurrency((salaryCardStats?.staff_total_payable ?? 0).toString())} | Teacher {loadingSalaryCards ? '...' : formatCurrency((salaryCardStats?.teacher_total_payable ?? 0).toString())}
              </div>
            </div>
          </div>
        </div>

        {/* MAIN TABS NAVIGATION */}
        <div className={combine(getCardGradientClass('green'), "mb-4 sm:mb-6 md:mb-8 p-2 sm:p-3")}>
          <nav className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('staff')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
                activeTab === 'staff'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <FaUserTie className="text-xs sm:text-sm" />
              <span>Staff Salaries</span>
            </button>
            <button
              onClick={() => setActiveTab('teacher')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
                activeTab === 'teacher'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <FaChalkboardTeacher className="text-xs sm:text-sm" />
              <span>Teacher Salaries</span>
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
                activeTab === 'payments'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <MdPayment className="text-xs sm:text-sm" />
              <span>Payments</span>
            </button>
            <button
              onClick={() => setActiveTab('summary')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
                activeTab === 'summary'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <FaChartLine className="text-xs sm:text-sm" />
              <span>Summary</span>
            </button>
            <button
              onClick={() => setActiveTab('employeeReport')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all",
                activeTab === 'employeeReport'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
              )}
            >
              <FaHistory className="text-xs sm:text-sm" />
              <span>Teacher/Staff Report</span>
            </button>
          </nav>
        </div>

        {/* MAIN CONTENT AREA */}
        {activeTab === 'staff' && renderStaffTab()}
        {activeTab === 'teacher' && renderTeacherTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'employeeReport' && renderEmployeeReportTab()}
      </div>

      {/* MODALS */}

      {/* Staff Salary Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('green'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                {isEditingStaffStructure ? 'Update Staff Salary' : 'Create Staff Salary'}
              </h2>
              <button onClick={closeStaffModal} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type *</label>
                <select
                  value={staffFormData.staff_type}
                  onChange={(e) => setStaffFormData({ ...staffFormData, staff_type: e.target.value })}
                  className={getInputClass()}
                  disabled={isEditingStaffStructure}
                >
                  <option value="">Select Staff Type</option>
                  {STAFF_TYPES.map(type => (
                    <option key={type} value={type}>{formatStaffType(type)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Base Salary (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={staffFormData.base_salary}
                  onChange={(e) => setStaffFormData({ ...staffFormData, base_salary: e.target.value })}
                  className={getInputClass()}
                  placeholder="25000.00"
                />
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Late Penalty Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={staffFormData.late_penalty_percentage}
                  onChange={(e) => setStaffFormData({ ...staffFormData, late_penalty_percentage: e.target.value })}
                  className={getInputClass()}
                  placeholder="10.0"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={closeStaffModal} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                Cancel
              </button>
              <button onClick={createOrUpdateStaffStructure} className={combine(
                getPrimaryButtonClass(),
                "flex-1 flex items-center justify-center gap-2 text-sm"
              )}>
                <FaSave className="text-sm" /> {isEditingStaffStructure ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Salary Modal */}
      {showTeacherModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('blue'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                {teacherFormData.teacher_id ? 'Update Teacher Salary' : 'Create Teacher Salary'}
              </h2>
              <button onClick={() => setShowTeacherModal(false)} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Teacher *</label>
                {loadingTeachers ? (
                  <div className="flex items-center justify-center py-8">
                    <div className={combine(
                      "animate-spin rounded-full h-6 w-6 border-2",
                      theme === 'dark' ? 'border-blue-500 border-t-transparent' : 'border-blue-600 border-t-transparent'
                    )}></div>
                    <span className={combine("ml-2 text-sm", get('text', 'secondary'))}>Loading teachers...</span>
                  </div>
                ) : teachers.length === 0 ? (
                  <div className={combine(
                    "p-4 text-center rounded-xl",
                    theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100'
                  )}>
                    <p className={combine("text-sm", get('text', 'secondary'))}>No teachers found</p>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={teacherFormData.teacher_id}
                      onChange={(e) => {
                        setTeacherFormData({ 
                          ...teacherFormData, 
                          teacher_id: e.target.value 
                        });
                      }}
                      className={combine(
                        getInputClass(),
                        "appearance-none pr-10"
                      )}
                      disabled={!!teacherFormData.teacher_id}
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map((teacher) => (
                        <option 
                          key={teacher.id} 
                          value={teacher.teacher_id}
                        >
                          {teacher.teacher_id} - {teacher.name} ({teacher.department})
                        </option>
                      ))}
                    </select>
                    <div className={combine(
                      "pointer-events-none absolute inset-y-0 right-0 flex items-center px-3",
                      get('icon', 'secondary')
                    )}>
                      <FaChevronDown className="text-xs" />
                    </div>
                  </div>
                )}
                
                {teacherFormData.teacher_id && (
                  <div className={combine(
                    "mt-2 p-3 rounded-xl text-sm",
                    theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50'
                  )}>
                    <div className="font-medium">
                      Selected: {teachers.find(t => t.teacher_id === teacherFormData.teacher_id)?.name}
                    </div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      ID: {teacherFormData.teacher_id} | 
                      Department: {teachers.find(t => t.teacher_id === teacherFormData.teacher_id)?.department}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Base Salary (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={teacherFormData.base_salary}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, base_salary: e.target.value })}
                  className={getInputClass()}
                  placeholder="35000.00"
                />
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Late Penalty Percentage (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={teacherFormData.late_penalty_percentage}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, late_penalty_percentage: e.target.value })}
                  className={getInputClass()}
                  placeholder="10.0"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowTeacherModal(false)} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                Cancel
              </button>
              <button 
                onClick={createOrUpdateTeacherStructure} 
                disabled={!teacherFormData.teacher_id || !teacherFormData.base_salary || loadingTeachers}
                className={combine(
                  getPrimaryButtonClass(),
                  "flex-1 flex items-center justify-center gap-2 text-sm",
                  (!teacherFormData.teacher_id || !teacherFormData.base_salary || loadingTeachers) ? 'opacity-50 cursor-not-allowed' : ''
                )}
              >
                <FaSave className="text-sm" /> {teacherFormData.teacher_id ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Salary Modal */}
      {showProcessModal && singleProcessData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('purple'),
            "max-w-lg w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Process Salary
              </h2>
              <button onClick={() => {
                setShowProcessModal(false);
                setSingleProcessData(null);
                setSingleProcessCandidates({ staff: [], teacher: [] });
                setBankTransferResult(null);
              }} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Employee Selection */}
              <div className={combine("p-4 rounded-xl space-y-3", theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50')}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Employee Type</label>
                    <select
                      value={singleProcessData.type}
                      onChange={(e) => {
                        const nextType = e.target.value as 'staff' | 'teacher';
                        const nextOptions = nextType === 'staff' ? singleProcessCandidates.staff : singleProcessCandidates.teacher;
                        setSingleProcessData({
                          ...singleProcessData,
                          type: nextType,
                          employeeId: nextOptions[0]?.id ?? null,
                        });
                      }}
                      className={getInputClass()}
                    >
                      <option value="staff" disabled={singleProcessCandidates.staff.length === 0}>Staff</option>
                      <option value="teacher" disabled={singleProcessCandidates.teacher.length === 0}>Teacher</option>
                    </select>
                  </div>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Employee</label>
                    <select
                      value={singleProcessData.employeeId ?? ''}
                      onChange={(e) => setSingleProcessData({
                        ...singleProcessData,
                        employeeId: e.target.value ? Number(e.target.value) : null,
                      })}
                      className={getInputClass()}
                      disabled={singleProcessEmployeeOptions.length === 0}
                    >
                      <option value="">Select employee</option>
                      {singleProcessData.type === 'staff'
                        ? singleProcessCandidates.staff.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} ({formatStaffType(employee.role)})
                            </option>
                          ))
                        : singleProcessCandidates.teacher.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.teacher_id} - {employee.name}
                            </option>
                          ))}
                    </select>
                  </div>
                </div>
                <div className={combine("text-sm", get('text', 'tertiary'))}>
                  Period: {singleProcessData.month}/{singleProcessData.year}
                </div>
                {singleProcessEmployeeOptions.length === 0 && (
                  <div className={combine("text-xs", get('text', 'tertiary'))}>
                    No eligible {singleProcessData.type} available for this period (already processed).
                  </div>
                )}
              </div>

              {/* Payment Mode Selection */}
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBankTransferMode('standard')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bankTransferMode === 'standard'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaMoneyBill className={combine(
                      "text-xl mx-auto mb-2",
                      bankTransferMode === 'standard' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Standard Process</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Create payment record only
                    </div>
                  </button>
                  <button
                    onClick={() => setBankTransferMode('bank')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bankTransferMode === 'bank'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaUniversity className={combine(
                      "text-xl mx-auto mb-2",
                      bankTransferMode === 'bank' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Bank Transfer</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Process with automatic bank transfer
                      {!USE_REAL_GATEWAY && (
                        <span className="block text-yellow-500 mt-1">(Dummy Mode)</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              {/* Bank Transfer Options */}
              {bankTransferMode === 'bank' && (
                <>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Bank
                    </label>
                    <select
                      value={selectedBankCode}
                      onChange={(e) => setSelectedBankCode(e.target.value)}
                      className={getInputClass()}
                    >
                      {BANK_CODES.map(bank => (
                        <option key={bank.value} value={bank.value}>{bank.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Details Check */}
                  {(() => {
                    const bankStatus = getEmployeeBankStatus(selectedSingleProcessEmployee);
                    if (!bankStatus.hasBank) {
                      return (
                        <div className={combine(
                          "p-3 rounded-xl flex items-start space-x-2",
                          theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
                        )}>
                          <FaExclamationTriangle className="text-yellow-500 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                              Missing Bank Details
                            </p>
                            <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                              {bankStatus.message}
                            </p>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className={combine(
                        "p-3 rounded-xl flex items-start space-x-2",
                        theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
                      )}>
                        <FaCheckCircle className="text-green-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-green-700 dark:text-green-400">
                            Bank Details Available
                          </p>
                          <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                            {selectedSingleProcessEmployee?.bank_account_number} | {selectedSingleProcessEmployee?.ifsc_code}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              {/* Bank Transfer Result */}
              {bankTransferResult && (
                <div className={combine(
                  "p-4 rounded-xl",
                  bankTransferResult.success 
                    ? (theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')
                    : (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50')
                )}>
                  <div className="flex items-center space-x-2 mb-2">
                    {bankTransferResult.success ? 
                      <FaCheckCircle className="text-green-500" /> : 
                      <FaExclamationCircle className="text-red-500" />
                    }
                    <span className="font-medium">
                      {bankTransferResult.success ? 'Success' : 'Failed'}
                    </span>
                    {bankTransferResult.dummy_mode && (
                      <span className={combine(
                        "px-2 py-0.5 rounded-full text-xs",
                        theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                      )}>
                        DUMMY MODE
                      </span>
                    )}
                  </div>
                  {bankTransferResult.transaction_id && (
                    <p className={combine("text-xs mb-1", get('text', 'secondary'))}>
                      Transaction ID: {bankTransferResult.transaction_id}
                    </p>
                  )}
                  {bankTransferResult.bank_reference && (
                    <p className={combine("text-xs mb-1", get('text', 'secondary'))}>
                      Bank Ref: {bankTransferResult.bank_reference}
                    </p>
                  )}
                  {bankTransferResult.error && (
                    <p className="text-xs text-red-500">{bankTransferResult.error}</p>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowProcessModal(false);
                    setSingleProcessData(null);
                    setSingleProcessCandidates({ staff: [], teacher: [] });
                    setBankTransferResult(null);
                  }}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (bankTransferMode === 'bank') {
                      startTransferOtpFlow(() =>
                        singleProcessData.type === 'staff'
                          ? processStaffSalaryWithBank()
                          : processTeacherSalaryWithBank()
                      );
                    } else {
                      if (singleProcessData.type === 'staff') {
                        processStaffSalary();
                      } else {
                        processTeacherSalary();
                      }
                    }
                  }}
                  className={combine(getPrimaryButtonClass(), "flex-1 text-sm flex items-center justify-center space-x-2")}
                  disabled={
                    isSubmittingSingleProcess ||
                    !singleProcessData.employeeId ||
                    (bankTransferMode === 'bank' &&
                      !selectedSingleProcessEmployee?.bank_account_number)
                  }
                >
                  {isSubmittingSingleProcess && <FaSync className="text-sm animate-spin" />}
                  <span>{isSubmittingSingleProcess ? 'Processing...' : 'Process Salary'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Process Modal */}
      {showBulkProcessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('purple'),
            "max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Bulk Process {bulkProcessData.employee_type === 'staff' ? 'Staff' : 'Teacher'} Salaries
              </h2>
              <button onClick={() => {
                setShowBulkProcessModal(false);
                setBulkProcessResult(null);
                setBankTransferResult(null);
              }} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Payment Mode Selection */}
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBankTransferMode('standard')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bankTransferMode === 'standard'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaMoneyBill className={combine(
                      "text-xl mx-auto mb-2",
                      bankTransferMode === 'standard' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Standard Process</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Create payment records only
                    </div>
                  </button>
                  <button
                    onClick={() => setBankTransferMode('bank')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bankTransferMode === 'bank'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaUniversity className={combine(
                      "text-xl mx-auto mb-2",
                      bankTransferMode === 'bank' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Bank Transfer</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Process with automatic bank transfers
                      {!USE_REAL_GATEWAY && (
                        <span className="block text-yellow-500 mt-1">(Dummy Mode)</span>
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Month *</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={bulkProcessData.month}
                    onChange={(e) => setBulkProcessData({ ...bulkProcessData, month: parseInt(e.target.value) })}
                    className={getInputClass()}
                  />
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Year *</label>
                  <input
                    type="number"
                    value={bulkProcessData.year}
                    onChange={(e) => setBulkProcessData({ ...bulkProcessData, year: parseInt(e.target.value) })}
                    className={getInputClass()}
                  />
                </div>
                {bulkProcessData.employee_type === 'staff' && (
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                    <select
                      value={bulkProcessData.staff_type}
                      onChange={(e) => setBulkProcessData({ ...bulkProcessData, staff_type: e.target.value })}
                      className={getInputClass()}
                    >
                      <option value="">All Assigned Roles</option>
                      {availableStaffTypeOptions.map(type => (
                        <option key={type} value={type}>{formatStaffType(type)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {bankTransferMode === 'bank' && (
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Select Bank
                  </label>
                  <select
                    value={bulkProcessData.bank_code}
                    onChange={(e) => setBulkProcessData({ ...bulkProcessData, bank_code: e.target.value })}
                    className={getInputClass()}
                  >
                    {BANK_CODES.map(bank => (
                      <option key={bank.value} value={bank.value}>{bank.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gateway Mode Warning */}
              {bankTransferMode === 'bank' && (
                <div className={combine(
                  "p-3 rounded-xl flex items-start space-x-2",
                  theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
                )}>
                  <FaInfoCircle className="text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      {USE_REAL_GATEWAY ? 'Real Payment Gateway' : 'Dummy Mode Active'}
                    </p>
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      {USE_REAL_GATEWAY 
                        ? 'Real bank transfers will be processed. This will move actual money.'
                        : 'Bank transfers will be simulated. No real money will be transferred.'}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (bankTransferMode === 'bank') {
                    startTransferOtpFlow(() =>
                      bulkProcessData.employee_type === 'staff'
                        ? bulkProcessStaffSalary()
                        : bulkProcessTeacherSalary()
                    );
                    return;
                  }
                  if (bulkProcessData.employee_type === 'staff') {
                    bulkProcessStaffSalary();
                  } else {
                    bulkProcessTeacherSalary();
                  }
                }}
                disabled={isSubmittingBulkProcess}
                className={combine(
                  getPrimaryButtonClass(), 
                  "w-full flex items-center justify-center space-x-2",
                  isSubmittingBulkProcess ? 'opacity-50 cursor-not-allowed' : ''
                )}
              >
                {isSubmittingBulkProcess ? (
                  <FaSync className="text-sm animate-spin" />
                ) : (
                  <FaMoneyCheckAlt className="text-sm" />
                )}
                <span>
                  {isSubmittingBulkProcess
                    ? 'Processing Bulk Transfer...'
                    : `Process Salaries ${bankTransferMode === 'bank' ? 'with Bank Transfer' : ''}`}
                </span>
              </button>

              {/* Bank Transfer Result */}
              {bankTransferResult && 'batch_id' in bankTransferResult && (
                <div className="mt-4 space-y-4">
                  <div className={combine(
                    "p-4 rounded-xl",
                    (bankTransferResult as BulkBankTransferResult).successful > 0 
                      ? (theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')
                      : (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50')
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {(bankTransferResult as BulkBankTransferResult).successful > 0 ? 
                          <FaCheckCircle className="text-green-500" /> : 
                          <FaExclamationCircle className="text-red-500" />
                        }
                        <span className="font-medium">
                          {(bankTransferResult as BulkBankTransferResult).successful > 0 ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      {(bankTransferResult as BulkBankTransferResult).dummy_mode && (
                        <span className={combine(
                          "px-2 py-0.5 rounded-full text-xs",
                          theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                        )}>
                          DUMMY MODE
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-3">
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Batch ID</div>
                        <div className="text-sm font-medium">{(bankTransferResult as BulkBankTransferResult).batch_id}</div>
                      </div>
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                        <div className="text-sm font-medium">{(bankTransferResult as BulkBankTransferResult).total}</div>
                      </div>
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Successful</div>
                        <div className="text-sm font-medium text-green-500">{(bankTransferResult as BulkBankTransferResult).successful}</div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  {(bankTransferResult as BulkBankTransferResult).results && (
                    <div className={combine(
                      "p-4 rounded-xl max-h-60 overflow-y-auto",
                      theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                    )}>
                      <h3 className={combine("font-semibold mb-2 text-sm", get('text', 'primary'))}>
                        Detailed Results
                      </h3>
                      {(bankTransferResult as BulkBankTransferResult).results.map((result, index) => (
                        <div key={index} className="py-2 border-b last:border-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{result.employee}</span>
                            <span className="text-xs font-medium">
                              ₹{formatCurrency(result.amount)}
                            </span>
                          </div>
                          {result.result.success ? (
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-green-500">✓ {result.result.transaction_id}</span>
                              <span className="text-xs text-green-500">Success</span>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center mt-1">
                              <span className="text-xs text-red-500">✗ {result.result.error || 'Failed'}</span>
                              <span className="text-xs text-red-500">Failed</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Standard Process Result */}
              {bulkProcessResult && (
                <div className="mt-6 space-y-4">
                  <div className={combine(
                    "p-4 rounded-xl",
                    theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
                  )}>
                    <h3 className={combine("font-semibold mb-2 flex items-center space-x-2", get('text', 'primary'))}>
                      <FaCheckCircle className="text-green-500" />
                      <span>Created Payments ({bulkProcessResult.payments_created?.length || 0})</span>
                    </h3>
                    <div className="max-h-40 overflow-y-auto">
                      {bulkProcessResult.payments_created?.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-1 text-sm">
                          <span>{item.staff_name || item.teacher_name}</span>
                          <span className="font-medium">₹{formatCurrency(item.net_payable)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {bulkProcessResult.errors?.length > 0 && (
                    <div className={combine(
                      "p-4 rounded-xl",
                      theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                    )}>
                      <h3 className={combine("font-semibold mb-2 flex items-center space-x-2", get('text', 'primary'))}>
                        <FaExclamationTriangle className="text-red-500" />
                        <span>Errors ({bulkProcessResult.errors.length})</span>
                      </h3>
                      <div className="max-h-40 overflow-y-auto">
                        {bulkProcessResult.errors.map((error, index) => (
                          <div key={index} className="py-1 text-sm text-red-600 dark:text-red-400">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Update Modal */}
      {showPaymentModal && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('purple'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Update Payment
              </h2>
              <button onClick={() => {
                setShowPaymentModal(false);
                setSelectedPayment(null);
                setPaymentUpdateData({
                  transaction_id: '',
                  bank_reference: '',
                  payment_status: 'processed',
                  remarks: ''
                });
              }} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Payment Status</label>
                <select
                  value={paymentUpdateData.payment_status}
                  onChange={(e) => setPaymentUpdateData({ ...paymentUpdateData, payment_status: e.target.value as any })}
                  className={getInputClass()}
                >
                  {PAYMENT_STATUSES.map(status => (
                    <option key={status} value={status} className="capitalize">{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Transaction ID</label>
                <input
                  type="text"
                  value={paymentUpdateData.transaction_id}
                  onChange={(e) => setPaymentUpdateData({ ...paymentUpdateData, transaction_id: e.target.value })}
                  className={getInputClass()}
                  placeholder="TXN123456"
                />
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Bank Reference</label>
                <input
                  type="text"
                  value={paymentUpdateData.bank_reference}
                  onChange={(e) => setPaymentUpdateData({ ...paymentUpdateData, bank_reference: e.target.value })}
                  className={getInputClass()}
                  placeholder="BANKREF789"
                />
              </div>
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Remarks</label>
                <textarea
                  value={paymentUpdateData.remarks}
                  onChange={(e) => setPaymentUpdateData({ ...paymentUpdateData, remarks: e.target.value })}
                  className={getInputClass()}
                  rows={3}
                  placeholder="Additional remarks..."
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => {
                setShowPaymentModal(false);
                setSelectedPayment(null);
                setPaymentUpdateData({
                  transaction_id: '',
                  bank_reference: '',
                  payment_status: 'processed',
                  remarks: ''
                });
              }} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                Cancel
              </button>
              <button
                onClick={() => {
                  if ('staff' in selectedPayment) {
                    updateStaffPayment(selectedPayment.id);
                  } else {
                    updateTeacherPayment(selectedPayment.id);
                  }
                }}
                className={combine(getPrimaryButtonClass(), "flex-1 text-sm")}
              >
                Update Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('purple'),
            "max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Payment Details
              </h2>
              <button onClick={() => setShowPaymentDetailsModal(null)} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary') + " text-sm"
              )}>
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Employee Info */}
              <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50')}>
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-full",
                    showPaymentDetailsModal.type === 'staff' 
                      ? (theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100')
                      : (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')
                  )}>
                    {showPaymentDetailsModal.type === 'staff' ? 
                      <FaUserTie className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-green-400' : 'text-green-600'
                      )} /> :
                      <FaChalkboardTeacher className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    }
                  </div>
                  <div>
                    <div className="font-semibold text-lg">
                      {showPaymentDetailsModal.type === 'staff' 
                        ? (showPaymentDetailsModal.payment as StaffPayment).staff_name
                        : (showPaymentDetailsModal.payment as TeacherPayment).teacher_name}
                    </div>
                    <div className={combine("text-sm", get('text', 'tertiary'))}>
                      {showPaymentDetailsModal.type === 'staff'
                        ? `Staff ID: ${(showPaymentDetailsModal.payment as StaffPayment).staff_id_display || `STF-${(showPaymentDetailsModal.payment as StaffPayment).staff}`}`
                        : `Teacher ID: ${(showPaymentDetailsModal.payment as TeacherPayment).teacher_id_display}`}
                    </div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>
                      Payment ID: PAY-{showPaymentDetailsModal.payment.id}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Period */}
              <div className="grid grid-cols-2 gap-4">
                <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>Month</div>
                  <div className="font-semibold mt-1">{showPaymentDetailsModal.payment.month}</div>
                </div>
                <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>Year</div>
                  <div className="font-semibold mt-1">{showPaymentDetailsModal.payment.year}</div>
                </div>
              </div>

              {/* Salary Details */}
              <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Salary Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={combine("text-sm", get('text', 'tertiary'))}>Base Salary</span>
                    <span className="font-medium">₹{formatCurrency(showPaymentDetailsModal.payment.base_salary)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={combine("text-sm", get('text', 'tertiary'))}>Per Day Wage</span>
                    <span className="font-medium">₹{formatCurrency(showPaymentDetailsModal.payment.per_day_wage)}</span>
                  </div>
                </div>
              </div>

              {/* Attendance */}
              <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Attendance Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Days Worked</div>
                    <div className="font-semibold text-green-500">{showPaymentDetailsModal.payment.days_worked}</div>
                  </div>
                  <div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Days Absent</div>
                    <div className="font-semibold text-red-500">{showPaymentDetailsModal.payment.days_absent}</div>
                  </div>
                  <div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>Days Late</div>
                    <div className="font-semibold text-yellow-500">{showPaymentDetailsModal.payment.days_late}</div>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Deductions</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={combine("text-sm", get('text', 'tertiary'))}>Absent Amount</span>
                    <span className="font-medium text-red-500">-₹{formatCurrency(showPaymentDetailsModal.payment.absent_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={combine("text-sm", get('text', 'tertiary'))}>Late Amount</span>
                    <span className="font-medium text-yellow-500">-₹{formatCurrency(showPaymentDetailsModal.payment.late_amount)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className={combine("text-sm font-medium", get('text', 'primary'))}>Total Deduction</span>
                    <span className="font-bold text-red-500">-₹{formatCurrency(showPaymentDetailsModal.payment.total_deduction)}</span>
                  </div>
                </div>
              </div>

              {/* Net Payable */}
              <div className={combine("p-4 rounded-xl text-center", theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')}>
                <div className={combine("text-sm mb-1", get('text', 'secondary'))}>Net Payable Amount</div>
                <div className="flex items-center justify-center">
                  <FaRupeeSign className={combine("mr-2 text-2xl", get('text', 'primary'))} />
                  <span className={combine("text-3xl font-bold", get('accent', 'success'))}>
                    {formatCurrency(showPaymentDetailsModal.payment.net_payable)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              {(showPaymentDetailsModal.payment.payment_date || 
                showPaymentDetailsModal.payment.transaction_id || 
                showPaymentDetailsModal.payment.bank_reference) && (
                <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                  <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Payment Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Payment ID</span>
                      <span className="font-medium">PAY-{showPaymentDetailsModal.payment.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={combine("text-sm", get('text', 'tertiary'))}>Employee ID</span>
                      <span className="font-medium">
                        {showPaymentDetailsModal.type === 'staff'
                          ? ((showPaymentDetailsModal.payment as StaffPayment).staff_id_display || `STF-${(showPaymentDetailsModal.payment as StaffPayment).staff}`)
                          : (showPaymentDetailsModal.payment as TeacherPayment).teacher_id_display}
                      </span>
                    </div>
                    {showPaymentDetailsModal.payment.payment_date && (
                      <div className="flex justify-between">
                        <span className={combine("text-sm", get('text', 'tertiary'))}>Payment Date</span>
                        <span className="font-medium">{formatDate(showPaymentDetailsModal.payment.payment_date)}</span>
                      </div>
                    )}
                    {showPaymentDetailsModal.payment.transaction_id && (
                      <div className="flex justify-between">
                        <span className={combine("text-sm", get('text', 'tertiary'))}>Transaction ID</span>
                        <span className="font-medium">{showPaymentDetailsModal.payment.transaction_id}</span>
                      </div>
                    )}
                    {showPaymentDetailsModal.payment.bank_reference && (
                      <div className="flex justify-between">
                        <span className={combine("text-sm", get('text', 'tertiary'))}>Bank Reference</span>
                        <span className="font-medium">{showPaymentDetailsModal.payment.bank_reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Remarks */}
              {showPaymentDetailsModal.payment.remarks && (
                <div className={combine("p-4 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                  <h3 className={combine("font-semibold mb-2", get('text', 'primary'))}>Remarks</h3>
                  <p className={combine("text-sm", get('text', 'secondary'))}>
                    {showPaymentDetailsModal.payment.remarks}
                  </p>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center justify-center space-x-2">
                {getPaymentStatusIcon(showPaymentDetailsModal.payment.payment_status)}
                <span className={getStatusBadgeClass(showPaymentDetailsModal.payment.payment_status)}>
                  {showPaymentDetailsModal.payment.payment_status}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                {showPaymentDetailsModal.payment.payment_status === 'pending' && (
                  <div className="w-full flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        startTransferOtpFlow(() =>
                          showPaymentDetailsModal.type === 'staff'
                            ? processExistingStaffPaymentWithBank(showPaymentDetailsModal.payment.id)
                            : processExistingTeacherPaymentWithBank(showPaymentDetailsModal.payment.id)
                        );
                      }}
                      className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                      disabled={
                        activeTransferAction === `staff-process-${showPaymentDetailsModal.payment.id}` ||
                        activeTransferAction === `teacher-process-${showPaymentDetailsModal.payment.id}`
                      }
                    >
                      <FaUniversity className="text-sm" />
                      <span>
                        {activeTransferAction === `staff-process-${showPaymentDetailsModal.payment.id}` ||
                        activeTransferAction === `teacher-process-${showPaymentDetailsModal.payment.id}`
                          ? 'Processing Transfer...'
                          : 'Process Bank Transfer'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPayment(showPaymentDetailsModal.payment);
                        setPaymentUpdateData({
                          transaction_id: showPaymentDetailsModal.payment.transaction_id || '',
                          bank_reference: showPaymentDetailsModal.payment.bank_reference || '',
                          payment_status: 'processed',
                          remarks: showPaymentDetailsModal.payment.remarks || ''
                        });
                        setShowPaymentDetailsModal(null);
                        setShowPaymentModal(true);
                      }}
                      className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                    >
                      <FaEdit className="text-sm" />
                      <span>Update Payment</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this payment record?')) {
                          if (showPaymentDetailsModal.type === 'staff') {
                            deleteStaffPayment(showPaymentDetailsModal.payment.id);
                          } else {
                            deleteTeacherPayment(showPaymentDetailsModal.payment.id);
                          }
                          setShowPaymentDetailsModal(null);
                        }
                      }}
                      className={combine(getDangerButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                    >
                      <FaTrash className="text-sm" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
                {showPaymentDetailsModal.payment.payment_status === 'processing' && (
                  <button
                    onClick={() => verifyBankTransfer(
                      showPaymentDetailsModal.payment.id,
                      showPaymentDetailsModal.type
                    )}
                    className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                  >
                    <FaCheck className="text-sm" />
                    <span>Verify Transfer</span>
                  </button>
                )}
                {showPaymentDetailsModal.payment.payment_status === 'failed' && (
                  <div className="w-full flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedPayment(showPaymentDetailsModal.payment);
                        setPaymentUpdateData({
                          transaction_id: showPaymentDetailsModal.payment.transaction_id || '',
                          bank_reference: showPaymentDetailsModal.payment.bank_reference || '',
                          payment_status: 'processed',
                          remarks: showPaymentDetailsModal.payment.remarks || ''
                        });
                        setShowPaymentDetailsModal(null);
                        setShowPaymentModal(true);
                      }}
                      className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                    >
                      <FaEdit className="text-sm" />
                      <span>Update Payment</span>
                    </button>
                    <button
                      onClick={() => {
                        startTransferOtpFlow(() =>
                          showPaymentDetailsModal.type === 'staff'
                            ? retryStaffPaymentWithBank(showPaymentDetailsModal.payment.id)
                            : retryTeacherPaymentWithBank(showPaymentDetailsModal.payment.id)
                        );
                      }}
                      className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                      disabled={
                        activeTransferAction === `staff-retry-${showPaymentDetailsModal.payment.id}` ||
                        activeTransferAction === `teacher-retry-${showPaymentDetailsModal.payment.id}`
                      }
                    >
                      <FaSync className={combine(
                        "text-sm",
                        (activeTransferAction === `staff-retry-${showPaymentDetailsModal.payment.id}` ||
                          activeTransferAction === `teacher-retry-${showPaymentDetailsModal.payment.id}`)
                          ? 'animate-spin'
                          : ''
                      )} />
                      <span>
                        {(activeTransferAction === `staff-retry-${showPaymentDetailsModal.payment.id}` ||
                          activeTransferAction === `teacher-retry-${showPaymentDetailsModal.payment.id}`)
                          ? 'Retrying...'
                          : 'Retry Transfer'}
                      </span>
                    </button>
                  </div>
                )}
                {showPaymentDetailsModal.payment.payment_status === 'processed' && (
                  <div className={combine(
                    "p-3 rounded-xl w-full text-center",
                    theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
                  )}>
                    <FaCheckCircle className="inline-block text-green-500 mr-2" />
                    <span className={combine("text-sm font-medium", get('text', 'primary'))}>
                      Payment Completed
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transfer OTP Modal */}
      {showTransferOtpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(getCardGradientClass('blue'), "max-w-md w-full shadow-2xl")}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                Verify OTP
              </h2>
              <button
                onClick={closeTransferOtpModal}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

            <div className="space-y-4">
              <p className={combine("text-sm", get('text', 'secondary'))}>
                Enter the OTP sent to admin email before {transferOtpPurpose}.
              </p>
              {transferOtpEmailHint && (
                <p className={combine("text-xs", get('text', 'tertiary'))}>{transferOtpEmailHint}</p>
              )}

              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Email OTP</label>
                <input
                  type="text"
                  maxLength={6}
                  value={transferOtp}
                  onChange={(e) => setTransferOtp(e.target.value.replace(/\D/g, ''))}
                  className={getInputClass()}
                  placeholder="Enter OTP"
                />
              </div>

              <div className="flex items-center justify-between">
                <p className={combine("text-xs", get('text', 'tertiary'))}>
                  Expires in: {transferOtpTimeLeft}s
                </p>
                <button
                  onClick={() => sendTransferOtp('resend')}
                  disabled={isSendingTransferOtp || transferOtpTimeLeft > 0}
                  className={combine(
                    getSecondaryButtonClass(),
                    "text-xs px-3 py-2",
                    (isSendingTransferOtp || transferOtpTimeLeft > 0) ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  {isSendingTransferOtp ? 'Sending...' : 'Resend OTP'}
                </button>
              </div>

              <div className="flex gap-3 mt-4">
                <button onClick={closeTransferOtpModal} className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}>
                  Cancel
                </button>
                <button
                  onClick={verifyTransferOtpAndContinue}
                  disabled={isVerifyingTransferOtp || transferOtp.length < 4}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 text-sm flex items-center justify-center gap-2",
                    (isVerifyingTransferOtp || transferOtp.length < 4) ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  {isVerifyingTransferOtp && <FaSync className="text-sm animate-spin" />}
                  <span>{isVerifyingTransferOtp ? 'Verifying...' : 'Verify & Continue'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('red'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="text-center">
              <div className={combine(
                "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <FaTrash className={combine(
                  "h-5 w-5",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )} />
              </div>
              <h3 className={combine("text-lg font-bold mb-1.5", get('text', 'primary'))}>
                Delete {showDeleteConfirm.type === 'staff' ? 'Staff' : 'Teacher'} Salary Structure
              </h3>
              <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                Are you sure you want to delete salary structure for{' '}
                <span className="font-semibold">
                  {showDeleteConfirm.type === 'staff' 
                    ? formatStaffType(showDeleteConfirm.identifier)
                    : showDeleteConfirm.identifier}
                </span>?
                <br />
                This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (showDeleteConfirm.type === 'staff') {
                      startTransferOtpFlow(
                        () => deleteStaffStructure(showDeleteConfirm.identifier),
                        'staff salary delete'
                      );
                    } else {
                      startTransferOtpFlow(
                        () => deleteTeacherStructure(showDeleteConfirm.identifier),
                        'teacher salary delete'
                      );
                    }
                    setShowDeleteConfirm(null);
                  }}
                  className={combine(
                    getPrimaryButtonClass(),
                    "text-sm flex-1",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  )}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
