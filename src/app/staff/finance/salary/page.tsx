'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi, apiFetch, staffApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastError, toastInfo, toastSuccess, toastWarning } from '@/lib/toast';
import { 
  FaEye, 
  FaFileInvoiceDollar, 
  FaHistory, 
  FaSync,
  FaUserTie,
  FaChalkboardTeacher,
  FaSearch,
  FaUndo,
  FaPlus,
  FaMoneyCheckAlt,
  FaFileInvoice,
  FaCheckCircle,
  FaExclamationCircle,
  FaHourglassHalf,
  FaBan,
  FaClock,
  FaRupeeSign,
  FaUniversity,
  FaCheck,
  FaEdit,
  FaTrash,
  FaInfoCircle,
  FaShieldAlt,
  FaTimes,
  FaChevronDown
} from 'react-icons/fa';
import { MdPayment, MdAttachMoney } from 'react-icons/md';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type PaymentStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'cancelled';
type PaymentUpdateStatus = 'pending' | 'processed' | 'failed' | 'cancelled';

type StaffPayment = {
  id: number;
  staff?: number;
  staff_id_display?: string;
  staff_name: string;
  staff_role?: string;
  month: number;
  year: number;
  base_salary?: string;
  per_day_wage?: string;
  total_working_days?: number;
  days_worked?: number;
  days_absent?: number;
  days_late?: number;
  absent_amount?: string;
  late_amount?: string;
  total_deduction?: string;
  net_payable: string;
  payment_date?: string | null;
  payment_status: PaymentStatus;
  transaction_id?: string | null;
  bank_reference?: string | null;
  transfer_bank_code?: string | null;
  remarks?: string | null;
  created_at?: string;
};

type TeacherPayment = {
  id: number;
  teacher?: number;
  teacher_id_display?: string;
  teacher_name: string;
  month: number;
  year: number;
  base_salary?: string;
  per_day_wage?: string;
  total_working_days?: number;
  days_worked?: number;
  days_absent?: number;
  days_late?: number;
  absent_amount?: string;
  late_amount?: string;
  total_deduction?: string;
  net_payable: string;
  payment_date?: string | null;
  payment_status: PaymentStatus;
  transaction_id?: string | null;
  bank_reference?: string | null;
  transfer_bank_code?: string | null;
  remarks?: string | null;
  created_at?: string;
};

type SalarySummary = {
  month: number;
  year: number;
  staff: {
    total_count: number;
    processed_count: number;
    processing_count?: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
    processed_amount?: number;
    processing_amount?: number;
    pending_amount?: number;
    failed_amount?: number;
  };
  teachers: {
    total_count: number;
    processed_count: number;
    processing_count?: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
    processed_amount?: number;
    processing_amount?: number;
    pending_amount?: number;
    failed_amount?: number;
  };
  grand_total: number;
};

type AuditLog = {
  id: number;
  action: string;
  severity: string;
  timestamp: string;
  user_name?: string;
  details?: Record<string, any>;
  request_path?: string;
};

type StaffCandidate = { id: number; name: string; role?: string };
type TeacherCandidate = { id: number; name: string; teacher_id?: string };
type StaffSalaryStructure = any;
type TeacherSalaryStructure = any;

const ALLOWED_ROLES = new Set(['admin_staff', 'finance_staff']);
const BANK_CODES = [
  { value: 'RAZORPAYX', label: 'RazorpayX Payouts' },
];
const PAYMENT_STATUSES = ['pending', 'processing', 'processed', 'failed', 'cancelled'];
const TRANSFER_OTP_DURATION_SECONDS = 30;

const money = (value: string | number) =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const formatStaffType = (staffType: string) =>
  String(staffType || '')
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

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

export default function StaffFinanceSalaryPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { combine, get } = useThemeClasses();

  const [roleChecked, setRoleChecked] = useState(false);
  const [roleAllowed, setRoleAllowed] = useState(false);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState('');
  const [staffIdFilter, setStaffIdFilter] = useState('');
  const [teacherIdFilter, setTeacherIdFilter] = useState('');

  const [activeTab, setActiveTab] = useState<'payments' | 'summary' | 'audit'>('payments');
  const [activePaymentTab, setActivePaymentTab] = useState<'staff' | 'teacher'>('staff');

  const [loading, setLoading] = useState(false);
  const [staffPayments, setStaffPayments] = useState<StaffPayment[]>([]);
  const [teacherPayments, setTeacherPayments] = useState<TeacherPayment[]>([]);
  const [summary, setSummary] = useState<SalarySummary | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [processedStaffIds, setProcessedStaffIds] = useState<Set<number>>(new Set());
  const [processedTeacherIds, setProcessedTeacherIds] = useState<Set<number>>(new Set());

  const [selectedBankCode, setSelectedBankCode] = useState('RAZORPAYX');
  const [activeTransferAction, setActiveTransferAction] = useState<string | null>(null);
  const [isRealtimeTransferSyncing, setIsRealtimeTransferSyncing] = useState(false);

  const [staffCandidates, setStaffCandidates] = useState<StaffCandidate[]>([]);
  const [teacherCandidates, setTeacherCandidates] = useState<TeacherCandidate[]>([]);
  const [staffStructures, setStaffStructures] = useState<StaffSalaryStructure[]>([]);
  const [teacherStructures, setTeacherStructures] = useState<TeacherSalaryStructure[]>([]);
  const [singleType, setSingleType] = useState<'staff' | 'teacher'>('staff');
  const [singleProcessMode, setSingleProcessMode] = useState<'standard' | 'bank'>('bank');
  const [singleEmployeeId, setSingleEmployeeId] = useState<number | ''>('');

  const [bulkType, setBulkType] = useState<'staff' | 'teacher'>('staff');
  const [bulkProcessMode, setBulkProcessMode] = useState<'standard' | 'bank'>('bank');
  const [bulkMonth, setBulkMonth] = useState(new Date().getMonth() + 1);
  const [bulkYear, setBulkYear] = useState(new Date().getFullYear());
  const [bulkStaffType, setBulkStaffType] = useState('');
  const [availableStaffTypeOptions, setAvailableStaffTypeOptions] = useState<string[]>([]);
  const [showTransferOtpModal, setShowTransferOtpModal] = useState(false);
  const [transferOtp, setTransferOtp] = useState('');
  const [transferOtpTimeLeft, setTransferOtpTimeLeft] = useState(0);
  const [transferOtpEmailHint, setTransferOtpEmailHint] = useState('');
  const [isSendingTransferOtp, setIsSendingTransferOtp] = useState(false);
  const [isVerifyingTransferOtp, setIsVerifyingTransferOtp] = useState(false);
  const [showUpdatePaymentModal, setShowUpdatePaymentModal] = useState(false);
  const [isUpdatingPayment, setIsUpdatingPayment] = useState(false);
  const [showPaymentDetailsModal, setShowPaymentDetailsModal] = useState<{
    type: 'staff' | 'teacher';
    payment: StaffPayment | TeacherPayment;
  } | null>(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showBulkProcessModal, setShowBulkProcessModal] = useState(false);
  const [updatePaymentType, setUpdatePaymentType] = useState<'staff' | 'teacher'>('staff');
  const [updatePaymentId, setUpdatePaymentId] = useState<number | null>(null);
  const [paymentUpdateData, setPaymentUpdateData] = useState({
    transaction_id: '',
    bank_reference: '',
    payment_status: 'processed' as PaymentUpdateStatus,
    remarks: '',
  });
  const [bulkProcessResult, setBulkProcessResult] = useState<any>(null);
  const [bankTransferResult, setBankTransferResult] = useState<any>(null);
  const [singleProcessCandidates, setSingleProcessCandidates] = useState<{
    staff: StaffCandidate[];
    teacher: TeacherCandidate[];
  }>({ staff: [], teacher: [] });
  const [singleProcessData, setSingleProcessData] = useState<{
    type: 'staff' | 'teacher';
    employeeId: number | null;
    month: number;
    year: number;
  } | null>(null);

  const pendingTransferActionRef = useRef<null | (() => Promise<void>)>(null);

  const currentPaymentRows = activePaymentTab === 'staff' ? staffPayments : teacherPayments;

  const getCardGradientClass = (color: string = 'green') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const colorClasses = {
      green: 'bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-900/20 dark:to-slate-900/30',
      blue: 'bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-900/20 dark:to-slate-900/30',
      purple: 'bg-gradient-to-br from-violet-50/80 to-white dark:from-violet-900/20 dark:to-slate-900/30',
      amber: 'bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-900/20 dark:to-slate-900/30',
      indigo: 'bg-gradient-to-br from-indigo-50/80 to-white dark:from-indigo-900/20 dark:to-slate-900/30',
      red: 'bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-900/20 dark:to-slate-900/30'
    };

    return combine(baseClasses, colorClasses[color as keyof typeof colorClasses] || colorClasses.green);
  };

  const getControlClass = () =>
    combine(
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

  const getTabClass = (active: boolean) =>
    combine(
      'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap flex items-center space-x-2 transition-all',
      active
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 border border-green-300 dark:border-green-700'
        : 'border border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-[var(--color-bg-hover)]'
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

  const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleString('en-IN');
  };

  const getExportRows = () => {
    if (activePaymentTab === 'staff') {
      return staffPayments.map((row) => ({
        'Payment ID': row.id,
        'Employee ID': row.staff_id_display || `STF-${row.staff || ''}`,
        Name: row.staff_name || '',
        Role: row.staff_role || '',
        Month: row.month,
        Year: row.year,
        'Base Salary': Number(row.base_salary || 0),
        'Per Day Wage': Number(row.per_day_wage || 0),
        'Total Working Days': Number(row.total_working_days || 0),
        'Days Worked': Number(row.days_worked || 0),
        'Days Absent': Number(row.days_absent || 0),
        'Days Late': Number(row.days_late || 0),
        'Absent Deduction': Number(row.absent_amount || 0),
        'Late Deduction': Number(row.late_amount || 0),
        'Total Deduction': Number(row.total_deduction || 0),
        'Net Payable': Number(row.net_payable || 0),
        Status: row.payment_status || '',
        'Payment Date': formatDateTime(row.payment_date),
        'Transaction ID': row.transaction_id || '',
        'Bank Reference': row.bank_reference || '',
        'Transfer Bank Code': row.transfer_bank_code || '',
        Remarks: row.remarks || '',
        'Created At': formatDateTime(row.created_at),
      }));
    }
    return teacherPayments.map((row) => ({
      'Payment ID': row.id,
      'Employee ID': row.teacher_id_display || '',
      Name: row.teacher_name || '',
      Month: row.month,
      Year: row.year,
      'Base Salary': Number(row.base_salary || 0),
      'Per Day Wage': Number(row.per_day_wage || 0),
      'Total Working Days': Number(row.total_working_days || 0),
      'Days Worked': Number(row.days_worked || 0),
      'Days Absent': Number(row.days_absent || 0),
      'Days Late': Number(row.days_late || 0),
      'Absent Deduction': Number(row.absent_amount || 0),
      'Late Deduction': Number(row.late_amount || 0),
      'Total Deduction': Number(row.total_deduction || 0),
      'Net Payable': Number(row.net_payable || 0),
      Status: row.payment_status || '',
      'Payment Date': formatDateTime(row.payment_date),
      'Transaction ID': row.transaction_id || '',
      'Bank Reference': row.bank_reference || '',
      'Transfer Bank Code': row.transfer_bank_code || '',
      Remarks: row.remarks || '',
      'Created At': formatDateTime(row.created_at),
    }));
  };

  const exportPaymentsToExcel = () => {
    const rows = getExportRows();
    if (!rows.length) {
      toastWarning('No payments to export');
      return;
    }
    const sheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, `${activePaymentTab}_payments`);
    XLSX.writeFile(workbook, `${activePaymentTab}_salary_payments_${month}_${year}.xlsx`);
    toastSuccess('Excel exported successfully');
  };

  const exportPaymentsToPDF = () => {
    const rows = getExportRows();
    if (!rows.length) {
      toastWarning('No payments to export');
      return;
    }
    const doc = new jsPDF('l', 'pt', 'a4');
    const headers = Object.keys(rows[0]);
    autoTable(doc, {
      startY: 45,
      head: [headers],
      body: rows.map((row) => headers.map((key) => String((row as any)[key] ?? ''))),
      styles: { fontSize: 7, cellPadding: 3 },
      headStyles: { fillColor: [22, 160, 133] },
    });
    doc.save(`${activePaymentTab}_salary_payments_${month}_${year}.pdf`);
    toastSuccess('PDF exported successfully');
  };

  const unprocessedStaffCandidates = useMemo(
    () => staffCandidates.filter((item) => !processedStaffIds.has(item.id)),
    [staffCandidates, processedStaffIds]
  );
  const unprocessedTeacherCandidates = useMemo(
    () => teacherCandidates.filter((item) => !processedTeacherIds.has(item.id)),
    [teacherCandidates, processedTeacherIds]
  );
  const singleProcessEmployeeOptions =
    singleProcessData?.type === 'staff' ? singleProcessCandidates.staff : singleProcessCandidates.teacher;

  const transferLogs = useMemo(
    () => logs
      .filter((log) => {
        const action = String(log.action || '').toUpperCase();
        const requestPath = String(log.request_path || '').toLowerCase();
        const details = log.details || {};
        const detailsText = JSON.stringify(details).toLowerCase();
        const moduleName = String(details.module || '').toLowerCase();
        const operationName = String(details.operation || '').toLowerCase();
        const entityName = String(details.entity || '').toLowerCase();

        const isStructureOperation =
          operationName.includes('create_or_update_structure') ||
          operationName.includes('structure') ||
          entityName.includes('structure') ||
          requestPath.includes('/salary/admin/structure/');
        if (isStructureOperation) return false;

        const actionLooksTransfer =
          action.includes('BANK_TRANSFER') ||
          action.includes('WITH_BANK') ||
          action.includes('SALARY_PROCESSED') ||
          action.includes('BULK_STAFF_SALARY_PROCESSED') ||
          action.includes('BULK_TEACHER_SALARY_PROCESSED') ||
          action.includes('PAYMENT') ||
          action.includes('OTP') ||
          action.includes('PAYMENT_FAILED') ||
          action.includes('PAYMENT_VERIFIED');
        const payloadLooksTransfer =
          detailsText.includes('salary') ||
          detailsText.includes('transfer') ||
          detailsText.includes('bank') ||
          detailsText.includes('process_existing') ||
          detailsText.includes('retry_') ||
          detailsText.includes('update_payment');
        const pathLooksSalaryPayments = requestPath.includes('/salary/admin/payments/');
        const moduleLooksSalary = moduleName === 'salary';
        const baseMatch = actionLooksTransfer || payloadLooksTransfer || pathLooksSalaryPayments || moduleLooksSalary;
        if (!baseMatch) return false;

        const logMonth = Number(details.month || details.salary_month || details.payment_month || 0);
        const logYear = Number(details.year || details.salary_year || details.payment_year || 0);
        const monthYearMatch =
          (logMonth > 0 && logYear > 0)
            ? (logMonth === month && logYear === year)
            : true;

        if (!monthYearMatch) return false;

        if (!status) return true;
        const selectedStatus = status.toLowerCase();
        const logStatus = String(
          details.current_status ||
          details.payment_status ||
          details.status ||
          details.transfer_status ||
          ''
        ).toLowerCase();
        return logStatus === selectedStatus;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [logs, month, year, status]
  );

  const getAuditTransferStatus = (log: AuditLog): { status: string; credited: 'Yes' | 'No' | 'Unknown' } => {
    const action = String(log.action || '').toUpperCase();
    const details = log.details || {};
    const rawStatus = String(
      details.current_status || details.payment_status || details.status || details.transfer_status || ''
    ).toLowerCase();
    const message = String(details.message || '').toLowerCase();

    if (
      rawStatus.includes('processed') ||
      rawStatus.includes('success') ||
      rawStatus.includes('credited') ||
      action.includes('PAYMENT_VERIFIED') ||
      action.includes('TRANSFER_VERIFIED')
    ) {
      return { status: 'Credited', credited: 'Yes' };
    }

    if (rawStatus.includes('failed') || rawStatus.includes('error') || action.includes('PAYMENT_FAILED')) {
      return { status: 'Failed', credited: 'No' };
    }

    if (
      rawStatus.includes('processing') ||
      rawStatus.includes('pending') ||
      rawStatus.includes('initiated') ||
      action.includes('WITH_BANK') ||
      action.includes('SALARY_PROCESSED') ||
      message.includes('initiated')
    ) {
      return { status: 'Processing', credited: 'No' };
    }

    return { status: 'Unknown', credited: 'Unknown' };
  };

  const getAuditParticipants = (log: AuditLog): { performedBy: string; creditedTo: string } => {
    const details = log.details || {};
    const performedBy = String(
      details.performed_by || log.user_name || details.actor || details.user_name || 'System'
    );
    const creditedTo = String(
      details.credited_to ||
      details.staff_name ||
      details.teacher_name ||
      details.employee_name ||
      (details.staff_id ? `Staff #${details.staff_id}` : '') ||
      (details.teacher_id ? `Teacher #${details.teacher_id}` : '') ||
      'NA'
    );
    return { performedBy, creditedTo };
  };

  const requestSalaryApi = async (path: string, options: RequestInit = {}) => {
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

  const buildRealtimeHeaders = async (extraHeaders: Record<string, string> = {}) => ({
    'Content-Type': 'application/json',
    'X-Timestamp': `${Math.floor(Date.now() / 1000)}`,
    'X-Admin-Verified': 'true',
    ...extraHeaders,
  });

  const closeTransferOtpModal = () => {
    setShowTransferOtpModal(false);
    setTransferOtp('');
    setTransferOtpTimeLeft(0);
    setTransferOtpEmailHint('');
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
      setTransferOtpEmailHint(payload.message || 'OTP sent to configured email');
      toastInfo(payload.message || 'OTP sent');
    } catch (error: any) {
      const data = error?.response?.data;
      toastError(data?.error || data?.detail || 'Failed to send OTP');
      throw error;
    } finally {
      setIsSendingTransferOtp(false);
    }
  };

  const startTransferOtpFlow = async (action: () => Promise<void>) => {
    pendingTransferActionRef.current = action;
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
        // Transfer handlers already display specific errors.
      }
    }
  };

  const checkRole = async () => {
    try {
      const fallbackRole = (user as any)?.staff_role || (user as any)?.role || '';
      const response = await staffApi.profile.get();
      const profile = response?.data?.data || response?.data || {};
      const currentRole = profile?.role || profile?.staff_role || fallbackRole;
      setRoleAllowed(ALLOWED_ROLES.has(String(currentRole)));
    } catch {
      setRoleAllowed(ALLOWED_ROLES.has(String((user as any)?.staff_role || (user as any)?.role || '')));
    } finally {
      setRoleChecked(true);
    }
  };

  const loadCandidates = async () => {
    try {
      const [staffRes, teacherRes, staffStructuresRes, teacherStructuresRes] = await Promise.all([
        adminApi.staff.list(),
        adminApi.teachers.list(),
        adminApi.salary.staff.listStructures(),
        adminApi.salary.teacher.listStructures(),
      ]);
      setStaffCandidates(staffRes?.data || []);
      setTeacherCandidates(teacherRes?.data || []);
      setStaffStructures(staffStructuresRes?.data?.data || []);
      setTeacherStructures(teacherStructuresRes?.data?.data || []);
      
      const assignedStaffTypes = Array.from(
        new Set<string>((staffStructuresRes?.data?.data || []).map((row: any) => String(row?.staff_type || '')).filter(Boolean))
      );
      setAvailableStaffTypeOptions(assignedStaffTypes);
      if (!bulkStaffType && assignedStaffTypes.length > 0) {
        setBulkStaffType(assignedStaffTypes[0]);
      }
      if (!singleEmployeeId) {
        if (singleType === 'staff' && (staffRes?.data?.length || 0) > 0) {
          setSingleEmployeeId(staffRes.data[0].id);
        }
        if (singleType === 'teacher' && (teacherRes?.data?.length || 0) > 0) {
          setSingleEmployeeId(teacherRes.data[0].id);
        }
      }
    } catch {
      // Non-blocking: single transfer can still use manual id entry.
    }
  };

  const loadPayments = async () => {
    setLoading(true);
    try {
      const staffParams: any = { month, year, ...(status ? { status: status as any } : {}) };
      const teacherParams: any = { month, year, ...(status ? { status: status as any } : {}) };
      if (staffIdFilter.trim()) staffParams.staff_id = staffIdFilter.trim();
      if (teacherIdFilter.trim()) teacherParams.teacher_id = teacherIdFilter.trim();
      const [staffRes, teacherRes] = await Promise.all([
        adminApi.salary.payments.staff.list(staffParams),
        adminApi.salary.payments.teacher.list(teacherParams),
      ]);
      setStaffPayments(staffRes?.data?.data || []);
      setTeacherPayments(teacherRes?.data?.data || []);
    } catch (error: any) {
      const code = error?.response?.status;
      if (code === 401) {
        logout();
        router.push('/');
        return;
      }
      toastError(error?.response?.data?.error || 'Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const loadProcessedEmployeeSets = async () => {
    try {
      const [staffProcessedRes, teacherProcessedRes] = await Promise.all([
        adminApi.salary.payments.staff.list({ month, year, status: 'processed' }),
        adminApi.salary.payments.teacher.list({ month, year, status: 'processed' }),
      ]);
      const processedStaff = new Set<number>((staffProcessedRes?.data?.data || []).map((row: any) => Number(row.staff)));
      const processedTeacher = new Set<number>((teacherProcessedRes?.data?.data || []).map((row: any) => Number(row.teacher)));
      setProcessedStaffIds(processedStaff);
      setProcessedTeacherIds(processedTeacher);
    } catch {
      // non-blocking
    }
  };

  const loadSummary = async () => {
    setLoading(true);
    try {
      const response = await adminApi.salary.payments.summary({ month, year });
      setSummary(response?.data?.data || null);
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.audit.staffSalaryPaymentLogs({
        days: 90,
        page: 1,
        page_size: 200,
      });
      const payload = response?.data?.data || response?.data || {};
      const auditLogs =
        (Array.isArray(payload.logs) ? payload.logs : null) ||
        (Array.isArray(payload.results) ? payload.results : null) ||
        (Array.isArray(payload.data) ? payload.data : null) ||
        [];
      setLogs(auditLogs);
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to load transfer audit logs');
    } finally {
      setLoading(false);
    }
  };

  const processSingleWithBank = async () => {
    if (!singleEmployeeId) {
      toastWarning('Select employee id');
      return;
    }
    if (singleType === 'staff' && processedStaffIds.has(Number(singleEmployeeId))) {
      toastWarning('Selected staff salary is already processed for this month/year');
      return;
    }
    if (singleType === 'teacher' && processedTeacherIds.has(Number(singleEmployeeId))) {
      toastWarning('Selected teacher salary is already processed for this month/year');
      return;
    }

    const key = `single-${singleType}-${singleEmployeeId}`;
    setActiveTransferAction(key);
    try {
      const payload: any = {
        month,
        year,
        bank_code: selectedBankCode,
      };
      if (singleType === 'staff') payload.staff_id = Number(singleEmployeeId);
      else payload.teacher_id = Number(singleEmployeeId);

      const body = JSON.stringify(payload);
      const headers = await buildRealtimeHeaders();
      const path = singleType === 'staff'
        ? 'salary/admin/payments/staff/process-with-bank/'
        : 'salary/admin/payments/teacher/process-with-bank/';

      const response = await requestSalaryApi(path, { method: 'POST', headers, body });
      toastSuccess(response?.message || 'Single bank transfer initiated');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to process single transfer');
    } finally {
      setActiveTransferAction(null);
    }
  };

  const processSingleStandard = async () => {
    if (!singleEmployeeId) {
      toastWarning('Select employee id');
      return;
    }
    if (singleType === 'staff' && processedStaffIds.has(Number(singleEmployeeId))) {
      toastWarning('Selected staff salary is already processed for this month/year');
      return;
    }
    if (singleType === 'teacher' && processedTeacherIds.has(Number(singleEmployeeId))) {
      toastWarning('Selected teacher salary is already processed for this month/year');
      return;
    }

    const key = `single-standard-${singleType}-${singleEmployeeId}`;
    setActiveTransferAction(key);
    try {
      if (singleType === 'staff') {
        await adminApi.salary.payments.staff.process({
          staff_id: Number(singleEmployeeId),
          month,
          year,
        });
      } else {
        await adminApi.salary.payments.teacher.process({
          teacher_id: Number(singleEmployeeId),
          month,
          year,
        });
      }
      toastSuccess('Salary processed successfully');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to process salary');
    } finally {
      setActiveTransferAction(null);
    }
  };

  const bulkProcessWithBank = async () => {
    const key = `bulk-${bulkType}`;
    setActiveTransferAction(key);
    try {
      const payload: any = {
        month: bulkMonth,
        year: bulkYear,
        bank_code: selectedBankCode,
      };
      if (bulkType === 'staff' && bulkStaffType) payload.staff_type = bulkStaffType;

      const body = JSON.stringify(payload);
      const headers = await buildRealtimeHeaders();
      const path = bulkType === 'staff'
        ? 'salary/admin/payments/staff/bulk-process-with-bank/'
        : 'salary/admin/payments/teacher/bulk-process-with-bank/';

      const response = await requestSalaryApi(path, { method: 'POST', headers, body });
      const result = response?.data || response;
      setBankTransferResult(result);

      toastSuccess(response?.message || 'Bulk bank transfer completed');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      const data = error?.response?.data || {};
      const errorMessage =
        data?.error ||
        data?.detail ||
        data?.details ||
        error?.message ||
        'Failed to process bulk transfer';
      setBankTransferResult({
        batch_id: `ERR-${Date.now()}`,
        total: 0,
        successful: 0,
        failed: 0,
        gateway_mode: data?.gateway_mode || 'UNKNOWN',
        results: [],
        error: errorMessage,
      });
      toastError(errorMessage);
    } finally {
      setActiveTransferAction(null);
    }
  };

  const bulkProcessStandard = async () => {
    const key = `bulk-standard-${bulkType}`;
    setActiveTransferAction(key);
    try {
      if (bulkType === 'staff') {
        const payload: { month: number; year: number; staff_type?: string } = {
          month: bulkMonth,
          year: bulkYear,
        };
        if (bulkStaffType) payload.staff_type = bulkStaffType;
        await adminApi.salary.payments.staff.bulkProcess(payload);
      } else {
        await adminApi.salary.payments.teacher.bulkProcess({
          month: bulkMonth,
          year: bulkYear,
        });
      }
      toastSuccess('Bulk salary process completed');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to process bulk salary');
    } finally {
      setActiveTransferAction(null);
    }
  };

  const processExistingPaymentWithBank = async (paymentId: number, type: 'staff' | 'teacher') => {
    const key = `${type}-process-${paymentId}`;
    setActiveTransferAction(key);
    try {
      const body = JSON.stringify({ bank_code: selectedBankCode });
      const headers = await buildRealtimeHeaders();
      const path = `salary/admin/payments/${type}/${paymentId}/process-with-bank/`;
      const response = await requestSalaryApi(path, { method: 'POST', headers, body });
      toastSuccess(response?.message || 'Salary transfer initiated');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(extractApiErrorMessage(error, 'Failed to process salary transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  const retryPaymentWithBank = async (paymentId: number, type: 'staff' | 'teacher') => {
    const key = `${type}-retry-${paymentId}`;
    setActiveTransferAction(key);
    try {
      const body = JSON.stringify({ bank_code: selectedBankCode });
      const headers = await buildRealtimeHeaders();
      const path = `salary/admin/payments/${type}/${paymentId}/retry-with-bank/`;
      const response = await requestSalaryApi(path, { method: 'POST', headers, body });
      toastSuccess(response?.message || 'Transfer retry initiated');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(extractApiErrorMessage(error, 'Failed to retry transfer'));
    } finally {
      setActiveTransferAction(null);
    }
  };

  const verifyBankTransfer = async (paymentId: number, type: 'staff' | 'teacher') => {
    const key = `${type}-verify-${paymentId}`;
    setActiveTransferAction(key);
    try {
      const response = await adminApi.salary.payments.verifyTransfer(type, paymentId);
      const currentStatus = response?.data?.data?.current_status;
      if (currentStatus === 'processed') toastSuccess('Payment verified and marked as processed');
      else toastInfo(`Payment status: ${currentStatus || 'processing'}`);
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to verify transfer');
    } finally {
      setActiveTransferAction(null);
    }
  };

  const deleteStaffPayment = async (paymentId: number) => {
    try {
      await requestSalaryApi(`salary/admin/payments/staff/${paymentId}/`, { method: 'DELETE' });
      toastSuccess('Payment record deleted successfully');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to delete payment record');
    }
  };

  const deleteTeacherPayment = async (paymentId: number) => {
    try {
      await adminApi.salary.payments.teacher.delete(paymentId);
      toastSuccess('Payment record deleted successfully');
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to delete payment record');
    }
  };

  const openUpdatePaymentModal = (payment: any, type: 'staff' | 'teacher') => {
    const mappedStatus: PaymentUpdateStatus =
      payment.payment_status === 'processed' || payment.payment_status === 'failed' || payment.payment_status === 'cancelled'
        ? payment.payment_status
        : 'pending';
    setUpdatePaymentType(type);
    setUpdatePaymentId(payment.id);
    setPaymentUpdateData({
      transaction_id: payment.transaction_id || '',
      bank_reference: payment.bank_reference || '',
      payment_status: mappedStatus,
      remarks: payment.remarks || '',
    });
    setShowUpdatePaymentModal(true);
  };

  const updatePayment = async () => {
    if (!updatePaymentId) return;
    setIsUpdatingPayment(true);
    try {
      if (updatePaymentType === 'staff') {
        await adminApi.salary.payments.staff.update(updatePaymentId, paymentUpdateData);
      } else {
        await adminApi.salary.payments.teacher.update(updatePaymentId, paymentUpdateData);
      }
      toastSuccess('Payment updated successfully');
      setShowUpdatePaymentModal(false);
      setUpdatePaymentId(null);
      await loadPayments();
      await loadProcessedEmployeeSets();
      await loadSummary();
      await loadAuditLogs();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.response?.data?.detail || 'Failed to update payment');
    } finally {
      setIsUpdatingPayment(false);
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

  const openSingleProcessModal = async () => {
    const targetMonth = month;
    const targetYear = year;
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

      const allStaff: StaffCandidate[] = staffListResponse.data || [];
      const allTeachers: TeacherCandidate[] = teacherListResponse.data || [];
      const staffPaymentsForPeriod: StaffPayment[] = staffPaymentsResponse.data?.data || [];
      const teacherPaymentsForPeriod: TeacherPayment[] = teacherPaymentsResponse.data?.data || [];
      const assignedStaffTypes = new Set<string>((staffStructuresResponse.data?.data || []).map((s: any) => s.staff_type));
      const assignedTeacherIds = new Set<string>((teacherStructuresResponse.data?.data || []).map((t: any) => t.teacher_id));

      // Only include employees with assigned salary structure and without processed salary for this period.
      const staffWithProcessedPayments = new Set(
        staffPaymentsForPeriod.filter((payment) => payment.payment_status === 'processed').map((payment) => payment.staff)
      );
      const teacherWithProcessedPayments = new Set(
        teacherPaymentsForPeriod.filter((payment) => payment.payment_status === 'processed').map((payment) => payment.teacher)
      );
      const eligibleStaff = allStaff.filter(
        (staff) => assignedStaffTypes.has(staff.role || '') && !staffWithProcessedPayments.has(staff.id)
      );
      const eligibleTeachers = allTeachers.filter(
        (teacher) => assignedTeacherIds.has(teacher.teacher_id || '') && !teacherWithProcessedPayments.has(teacher.id)
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
              verifyBankTransfer(payment.id, 'staff')
            )
          );
          await loadPayments();
        } else {
          const processingPayments = teacherPayments.filter(
            (payment) => payment.payment_status === 'processing' && !!payment.transaction_id
          );
          if (processingPayments.length === 0) return;
          hasProcessingPayments = true;
          setIsRealtimeTransferSyncing(true);
          await Promise.all(
            processingPayments.slice(0, 10).map((payment) =>
              verifyBankTransfer(payment.id, 'teacher')
            )
          );
          await loadPayments();
        }
      } catch (error) {
        console.error('Realtime payout sync failed:', error);
      } finally {
        if (hasProcessingPayments) {
          setIsRealtimeTransferSyncing(false);
          await loadSummary();
        }
      }
    };

    const interval = setInterval(run, 15000);
    return () => clearInterval(interval);
  }, [activeTab, activePaymentTab, staffPayments, teacherPayments]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    if (user?.user_type !== 'staff') {
      router.push(`/${user?.user_type}`);
      return;
    }
    checkRole();
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    if (!roleChecked || !roleAllowed) return;
    loadCandidates();
  }, [roleChecked, roleAllowed]);

  useEffect(() => {
    if (!roleChecked || !roleAllowed) return;
    if (activeTab === 'payments') loadPayments();
    if (activeTab === 'summary') loadSummary();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab, month, year, status, roleChecked, roleAllowed]);

  useEffect(() => {
    if (!roleChecked || !roleAllowed) return;
    loadProcessedEmployeeSets();
  }, [month, year, roleChecked, roleAllowed]);

  useEffect(() => {
    if (singleType === 'staff' && unprocessedStaffCandidates.length > 0) {
      setSingleEmployeeId(unprocessedStaffCandidates[0].id);
      return;
    }
    if (singleType === 'teacher' && unprocessedTeacherCandidates.length > 0) {
      setSingleEmployeeId(unprocessedTeacherCandidates[0].id);
      return;
    }
    setSingleEmployeeId('');
  }, [singleType, unprocessedStaffCandidates, unprocessedTeacherCandidates]);

  useEffect(() => {
    if (!showTransferOtpModal || transferOtpTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setTransferOtpTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [showTransferOtpModal, transferOtpTimeLeft]);

  if (!roleChecked || isLoading) return <div className="p-6">Loading...</div>;

  if (!roleAllowed) {
    return (
      <div className="p-6">
        <div className={combine('rounded-xl p-4 border', get('bg', 'card'), get('border', 'primary'))}>
          Access denied. Salary operations are allowed only for Admin Staff and Finance Staff.
        </div>
      </div>
    );
  }

  return (
    <div className={combine('p-4 md:p-6 space-y-4 min-h-screen', get('bg', 'primary'))}>
      <div className={combine(getCardGradientClass('green'), 'p-4')}>
        <h1 className="text-xl font-bold flex items-center gap-2"><FaFileInvoiceDollar /> Salary Operations</h1>
        <p className={combine('text-sm mt-1', get('text', 'secondary'))}>
          Payments, individual and bulk processing (standard and bank transfer), summary, and transfer audit logs.
        </p>
      </div>

      <div className={combine(getCardGradientClass('blue'), 'p-3')}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className={getControlClass()}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className={getControlClass()}>
            {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 3 + i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={getControlClass()}>
            <option value="">All Status</option>
            {PAYMENT_STATUSES.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <button
            onClick={() => {
              if (activeTab === 'payments') loadPayments();
              if (activeTab === 'summary') loadSummary();
              if (activeTab === 'audit') loadAuditLogs();
            }}
            className="px-4 py-2 rounded-lg bg-green-600 text-white flex items-center justify-center gap-2"
          >
            <FaSync /> Refresh
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('payments')} className={getTabClass(activeTab === 'payments')}>
          <MdPayment className="mr-1" /> Payments
        </button>
        <button onClick={() => setActiveTab('summary')} className={getTabClass(activeTab === 'summary')}>
          <MdAttachMoney className="mr-1" /> Summary
        </button>
        <button onClick={() => setActiveTab('audit')} className={getTabClass(activeTab === 'audit')}>
          <FaHistory className="mr-1" /> Transfer Audit Logs
        </button>
      </div>

      {activeTab === 'payments' && (
        <div className={getCardGradientClass('purple')}>
          {/* Gateway Mode Indicator */}
          <div className="mb-4 flex items-center justify-end space-x-2">
            <div className={combine(
              "px-3 py-1.5 rounded-full text-xs font-medium flex items-center space-x-1",
              process.env.NEXT_PUBLIC_SALARY_REAL_GATEWAY !== 'false'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            )}>
              <FaShieldAlt className="text-xs" />
              <span>{process.env.NEXT_PUBLIC_SALARY_REAL_GATEWAY !== 'false' ? 'Real Payment Gateway' : 'Dummy Mode (Testing)'}</span>
            </div>
          </div>

          {/* Payment Tabs */}
          <div className={combine("mb-4 p-2")}>
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

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 sm:gap-4 mb-4">
            {activePaymentTab === 'staff' ? (
              <div>
                <input
                  type="text"
                  placeholder="Staff ID"
                  value={staffIdFilter}
                  onChange={(e) => setStaffIdFilter(e.target.value)}
                  className={getControlClass()}
                />
              </div>
            ) : (
              <div>
                <input
                  type="text"
                  placeholder="Teacher ID"
                  value={teacherIdFilter}
                  onChange={(e) => setTeacherIdFilter(e.target.value)}
                  className={getControlClass()}
                />
              </div>
            )}
            <div>
              <input
                type="number"
                placeholder="Month"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className={getControlClass()}
              />
            </div>
            <div>
              <input
                type="number"
                placeholder="Year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className={getControlClass()}
              />
            </div>
            <div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={getControlClass()}
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
                    loadPayments();
                  } else {
                    loadPayments();
                  }
                }}
                className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
              >
                <FaSearch className="text-xs sm:text-sm" />
                <span>Search</span>
              </button>
              <button
                onClick={() => {
                  setMonth(new Date().getMonth() + 1);
                  setYear(new Date().getFullYear());
                  setStatus('');
                  setStaffIdFilter('');
                  setTeacherIdFilter('');
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
                <FaPlus className="text-xs sm:text-sm" />
                <span>Single Process</span>
              </button>
              <button
                onClick={() => {
                  setBulkType(activePaymentTab);
                  setBulkMonth(month);
                  setBulkYear(year);
                  setBulkStaffType(activePaymentTab === 'staff' ? (availableStaffTypeOptions[0] || '') : '');
                  setBulkProcessResult(null);
                  setBankTransferResult(null);
                  setShowBulkProcessModal(true);
                }}
                className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full")}
              >
                <FaMoneyCheckAlt className="text-xs sm:text-sm" />
                <span>Bulk Process</span>
              </button>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <button onClick={exportPaymentsToExcel} className={getTabClass(false)}>
              <FaFileInvoice className="mr-1" /> Export Excel
            </button>
            <button onClick={exportPaymentsToPDF} className={getTabClass(false)}>
              <FaFileInvoice className="mr-1" /> Export PDF
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
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex flex-col items-center">
                <div className={combine(
                  "animate-spin rounded-full h-8 w-8 border-4",
                  theme === 'dark' ? 'border-purple-500 border-t-transparent' : 'border-purple-600 border-t-transparent'
                )}></div>
                <p className={combine("mt-3 text-sm font-medium", get('text', 'secondary'))}>Loading payments...</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200/70 dark:border-slate-700/70">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100/80 dark:bg-slate-800/60">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left p-2">ID</th>
                    <th className="text-left p-2">Name / Role</th>
                    <th className="text-left p-2">Month/Year</th>
                    <th className="text-left p-2">Assigned Salary</th>
                    <th className="text-left p-2">Total Working Days</th>
                    <th className="text-left p-2">Worked (Count/Salary)</th>
                    <th className="text-left p-2">Absent (Count/Deduction)</th>
                    <th className="text-left p-2">Late (Count/Deduction)</th>
                    <th className="text-left p-2">Net Payable</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activePaymentTab === 'staff' ? (
                    staffPayments.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="p-8 text-center">
                          <div className={combine("text-sm", get('text', 'secondary'))}>
                            No staff payments found
                          </div>
                        </td>
                      </tr>
                    ) : (
                      staffPayments.map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="p-2">
                            <div className="space-y-0.5">
                              <div className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                                PAY-{payment.id}
                              </div>
                              <div className="text-xs font-semibold">
                                {payment.staff_id_display || `STF-${payment.staff || ''}`}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div>
                              <div className="font-semibold text-sm">{payment.staff_name}</div>
                              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                {payment.staff_role ? formatStaffType(payment.staff_role) : '-'}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              {payment.month}/{payment.year}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-medium text-sm">
                                {money(payment.base_salary || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm font-medium">
                              {payment.total_working_days ?? 0}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_worked || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0))}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_absent || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(payment.absent_amount || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_late || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(payment.late_amount || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-bold text-sm">
                                {money(payment.net_payable)}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              {getPaymentStatusIcon(payment.payment_status)}
                              <span className={getStatusBadgeClass(payment.payment_status)}>
                                {payment.payment_status}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => setShowPaymentDetailsModal({ type: 'staff', payment })}
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
                                    onClick={() => startTransferOtpFlow(() => processExistingPaymentWithBank(payment.id, 'staff'))}
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
                                    onClick={() => openUpdatePaymentModal(payment, 'staff')}
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
                                  disabled={activeTransferAction === `staff-verify-${payment.id}`}
                                  title="Verify Transfer"
                                >
                                  {activeTransferAction === `staff-verify-${payment.id}` ? (
                                    <FaSync className="text-sm animate-spin" />
                                  ) : (
                                    <FaCheck className="text-sm" />
                                  )}
                                </button>
                              )}
                              {payment.payment_status === 'failed' && (
                                <>
                                  <button
                                    onClick={() => openUpdatePaymentModal(payment, 'staff')}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => retryPaymentWithBank(payment.id, 'staff'))}
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
                        <td colSpan={11} className="p-8 text-center">
                          <div className={combine("text-sm", get('text', 'secondary'))}>
                            No teacher payments found
                          </div>
                        </td>
                      </tr>
                    ) : (
                      teacherPayments.map((payment) => (
                        <tr key={payment.id} className="border-t border-slate-200 dark:border-slate-700 hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="p-2">
                            <div className="space-y-0.5">
                              <div className={combine("text-xs font-medium", get('text', 'tertiary'))}>
                                PAY-{payment.id}
                              </div>
                              <div className="text-xs font-semibold">
                                {payment.teacher_id_display || ''}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div>
                              <div className="font-semibold text-sm">{payment.teacher_name}</div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              {payment.month}/{payment.year}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-medium text-sm">
                                {money(payment.base_salary || 0)}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm font-medium">
                              {payment.total_working_days ?? 0}
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_worked || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(Number(payment.per_day_wage || 0) * Number(payment.days_worked || 0))}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_absent || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(payment.absent_amount || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="text-sm">
                              <div>{payment.days_late || 0}</div>
                              <div className={combine("text-xs", get('text', 'tertiary'))}>
                                {money(payment.late_amount || 0)}
                              </div>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center">
                              <FaRupeeSign className={combine("mr-1 text-xs", get('icon', 'secondary'))} />
                              <span className="font-bold text-sm">
                                {money(payment.net_payable)}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              {getPaymentStatusIcon(payment.payment_status)}
                              <span className={getStatusBadgeClass(payment.payment_status)}>
                                {payment.payment_status}
                              </span>
                            </div>
                          </td>
                          <td className="p-2">
                            <div className="flex space-x-1.5">
                              <button
                                onClick={() => setShowPaymentDetailsModal({ type: 'teacher', payment })}
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
                                    onClick={() => startTransferOtpFlow(() => processExistingPaymentWithBank(payment.id, 'teacher'))}
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
                                    onClick={() => openUpdatePaymentModal(payment, 'teacher')}
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
                                  disabled={activeTransferAction === `teacher-verify-${payment.id}`}
                                  title="Verify Transfer"
                                >
                                  {activeTransferAction === `teacher-verify-${payment.id}` ? (
                                    <FaSync className="text-sm animate-spin" />
                                  ) : (
                                    <FaCheck className="text-sm" />
                                  )}
                                </button>
                              )}
                              {payment.payment_status === 'failed' && (
                                <>
                                  <button
                                    onClick={() => openUpdatePaymentModal(payment, 'teacher')}
                                    className={combine(
                                      "p-1.5 rounded-xl transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Update Payment"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => startTransferOtpFlow(() => retryPaymentWithBank(payment.id, 'teacher'))}
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
            </div>
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className={combine(getCardGradientClass('indigo'), 'p-4 space-y-4')}>
          {loading || !summary ? <p>Loading...</p> : (
            <>
              <div className={combine(getCardGradientClass('purple'), 'p-3 text-center')}>
                <p className="text-sm">Grand Total Payable</p>
                <p className="text-2xl font-bold">₹{money(summary.grand_total)}</p>
                <p className="text-xs mt-1">For {summary.month}/{summary.year}</p>
              </div>

              <div className={combine(getCardGradientClass('green'), 'p-3 space-y-3')}>
                <h3 className="font-semibold">Staff Salary Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>Total: <b>{summary.staff.total_count}</b></div>
                  <div>Processed: <b>{summary.staff.processed_count}</b></div>
                  <div>Processing: <b>{summary.staff.processing_count || 0}</b></div>
                  <div>Pending: <b>{summary.staff.pending_count}</b></div>
                  <div>Failed: <b>{summary.staff.failed_count}</b></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                  <div>Total Amt: <b>₹{money(summary.staff.total_amount)}</b></div>
                  <div>Processed Amt: <b>₹{money(summary.staff.processed_amount || 0)}</b></div>
                  <div>Processing Amt: <b>₹{money(summary.staff.processing_amount || 0)}</b></div>
                  <div>Pending Amt: <b>₹{money(summary.staff.pending_amount || 0)}</b></div>
                  <div>Failed Amt: <b>₹{money(summary.staff.failed_amount || 0)}</b></div>
                </div>
              </div>

              <div className={combine(getCardGradientClass('blue'), 'p-3 space-y-3')}>
                <h3 className="font-semibold">Teacher Salary Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>Total: <b>{summary.teachers.total_count}</b></div>
                  <div>Processed: <b>{summary.teachers.processed_count}</b></div>
                  <div>Processing: <b>{summary.teachers.processing_count || 0}</b></div>
                  <div>Pending: <b>{summary.teachers.pending_count}</b></div>
                  <div>Failed: <b>{summary.teachers.failed_count}</b></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
                  <div>Total Amt: <b>₹{money(summary.teachers.total_amount)}</b></div>
                  <div>Processed Amt: <b>₹{money(summary.teachers.processed_amount || 0)}</b></div>
                  <div>Processing Amt: <b>₹{money(summary.teachers.processing_amount || 0)}</b></div>
                  <div>Pending Amt: <b>₹{money(summary.teachers.pending_amount || 0)}</b></div>
                  <div>Failed Amt: <b>₹{money(summary.teachers.failed_amount || 0)}</b></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className={combine(getCardGradientClass('amber'), 'p-4')}>
          <h3 className="font-semibold mb-2 flex items-center gap-2"><FaHistory /> Transfer Audit Logs</h3>
          {loading ? <p>Loading...</p> : (
            <div className="space-y-2">
              {transferLogs.map((log) => (
                <div key={log.id} className={combine(getCardGradientClass('blue'), 'p-3')}>
                  {(() => {
                    const derivedStatus = getAuditTransferStatus(log);
                    const participants = getAuditParticipants(log);
                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{log.action}</span>
                          <span className="text-xs">{new Date(log.timestamp).toLocaleString('en-IN')}</span>
                        </div>
                        <p className="text-xs mt-1">{log.request_path || '-'}</p>
                        <p className="text-xs mt-2">
                          Status: <b>{derivedStatus.status}</b> | Salary Credited: <b>{derivedStatus.credited}</b>
                        </p>
                        <p className="text-xs mt-1">
                          Performed By: <b>{participants.performedBy}</b> | Credited To: <b>{participants.creditedTo}</b>
                        </p>
                      </>
                    );
                  })()}
                  <div className="text-xs mt-2 space-y-1">
                    {log.details?.message && <p>Message: {String(log.details.message)}</p>}
                    {log.details?.operation && <p>Operation: {String(log.details.operation)}</p>}
                    {log.details?.payment_id && <p>Payment ID: {String(log.details.payment_id)}</p>}
                    {log.details?.payment_status && <p>Payment Status: {String(log.details.payment_status)}</p>}
                    {log.details?.current_status && <p>Current Status: {String(log.details.current_status)}</p>}
                    {log.details?.transaction_id && <p>Transaction ID: {String(log.details.transaction_id)}</p>}
                    {log.details?.bank_code && <p>Bank: {String(log.details.bank_code)}</p>}
                    {log.details?.gateway_mode && <p>Gateway: {String(log.details.gateway_mode)}</p>}
                  </div>
                </div>
              ))}
              {transferLogs.length === 0 && <p className="text-sm">No transfer audit logs found.</p>}
            </div>
          )}
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
                      className={getControlClass()}
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
                      className={getControlClass()}
                      disabled={singleProcessEmployeeOptions.length === 0}
                    >
                      <option value="">Select employee</option>
                      {singleProcessData.type === 'staff'
                        ? singleProcessCandidates.staff.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} {employee.role ? `(${formatStaffType(employee.role)})` : ''}
                            </option>
                          ))
                        : singleProcessCandidates.teacher.map((employee) => (
                            <option key={employee.id} value={employee.id}>
                              {employee.name} {employee.teacher_id ? `(${employee.teacher_id})` : ''}
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
                    onClick={() => setBulkProcessMode('standard')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bulkProcessMode === 'standard'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaFileInvoice className={combine(
                      "text-xl mx-auto mb-2",
                      bulkProcessMode === 'standard' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Standard Process</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Create payment record only
                    </div>
                  </button>
                  <button
                    onClick={() => setBulkProcessMode('bank')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bulkProcessMode === 'bank'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaUniversity className={combine(
                      "text-xl mx-auto mb-2",
                      bulkProcessMode === 'bank' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Bank Transfer</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Process with automatic bank transfer
                    </div>
                  </button>
                </div>
              </div>

              {/* Bank Transfer Options */}
              {bulkProcessMode === 'bank' && (
                <>
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                      Select Bank
                    </label>
                    <select
                      value={selectedBankCode}
                      onChange={(e) => setSelectedBankCode(e.target.value)}
                      className={getControlClass()}
                    >
                      {BANK_CODES.map(bank => (
                        <option key={bank.value} value={bank.value}>{bank.label}</option>
                      ))}
                    </select>
                  </div>
                </>
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
                    if (bulkProcessMode === 'bank') {
                      startTransferOtpFlow(() =>
                        singleProcessData.type === 'staff'
                          ? processSingleWithBank()
                          : processSingleWithBank()
                      );
                    } else {
                      if (singleProcessData.type === 'staff') {
                        processSingleStandard();
                      } else {
                        processSingleStandard();
                      }
                    }
                  }}
                  className={combine(getPrimaryButtonClass(), "flex-1 text-sm flex items-center justify-center space-x-2")}
                  disabled={
                    activeTransferAction === `single-${singleProcessData.type}-${singleProcessData.employeeId}` ||
                    activeTransferAction === `single-standard-${singleProcessData.type}-${singleProcessData.employeeId}` ||
                    !singleProcessData.employeeId
                  }
                >
                  {(activeTransferAction === `single-${singleProcessData.type}-${singleProcessData.employeeId}` ||
                    activeTransferAction === `single-standard-${singleProcessData.type}-${singleProcessData.employeeId}`) && (
                    <FaSync className="text-sm animate-spin" />
                  )}
                  <span>
                    {(activeTransferAction === `single-${singleProcessData.type}-${singleProcessData.employeeId}` ||
                      activeTransferAction === `single-standard-${singleProcessData.type}-${singleProcessData.employeeId}`)
                      ? 'Processing...'
                      : 'Process Salary'}
                  </span>
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
                Bulk Process {bulkType === 'staff' ? 'Staff' : 'Teacher'} Salaries
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
                    onClick={() => setBulkProcessMode('standard')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bulkProcessMode === 'standard'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaFileInvoice className={combine(
                      "text-xl mx-auto mb-2",
                      bulkProcessMode === 'standard' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Standard Process</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Create payment records only
                    </div>
                  </button>
                  <button
                    onClick={() => setBulkProcessMode('bank')}
                    className={combine(
                      "p-3 rounded-xl border-2 transition-all",
                      bulkProcessMode === 'bank'
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-300 dark:border-gray-700'
                    )}
                  >
                    <FaUniversity className={combine(
                      "text-xl mx-auto mb-2",
                      bulkProcessMode === 'bank' ? 'text-green-500' : get('icon', 'secondary')
                    )} />
                    <div className="text-xs font-medium">Bank Transfer</div>
                    <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      Process with automatic bank transfers
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
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(parseInt(e.target.value))}
                    className={getControlClass()}
                  />
                </div>
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Year *</label>
                  <input
                    type="number"
                    value={bulkYear}
                    onChange={(e) => setBulkYear(parseInt(e.target.value))}
                    className={getControlClass()}
                  />
                </div>
                {bulkType === 'staff' && (
                  <div>
                    <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>Staff Type</label>
                    <select
                      value={bulkStaffType}
                      onChange={(e) => setBulkStaffType(e.target.value)}
                      className={getControlClass()}
                    >
                      <option value="">All Assigned Roles</option>
                      {availableStaffTypeOptions.map(type => (
                        <option key={type} value={type}>{formatStaffType(type)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {bulkProcessMode === 'bank' && (
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Select Bank
                  </label>
                  <select
                    value={selectedBankCode}
                    onChange={(e) => setSelectedBankCode(e.target.value)}
                    className={getControlClass()}
                  >
                    {BANK_CODES.map(bank => (
                      <option key={bank.value} value={bank.value}>{bank.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Gateway Mode Warning */}
              {bulkProcessMode === 'bank' && (
                <div className={combine(
                  "p-3 rounded-xl flex items-start space-x-2",
                  theme === 'dark' ? 'bg-yellow-900/20' : 'bg-yellow-50'
                )}>
                  <FaInfoCircle className="text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                      {process.env.NEXT_PUBLIC_SALARY_REAL_GATEWAY !== 'false' ? 'Real Payment Gateway' : 'Dummy Mode Active'}
                    </p>
                    <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                      {process.env.NEXT_PUBLIC_SALARY_REAL_GATEWAY !== 'false'
                        ? 'Real bank transfers will be processed. This will move actual money.'
                        : 'Bank transfers will be simulated. No real money will be transferred.'}
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (bulkProcessMode === 'bank') {
                    startTransferOtpFlow(() =>
                      bulkType === 'staff'
                        ? bulkProcessWithBank()
                        : bulkProcessWithBank()
                    );
                    return;
                  }
                  if (bulkType === 'staff') {
                    bulkProcessStandard();
                  } else {
                    bulkProcessStandard();
                  }
                }}
                disabled={activeTransferAction === `bulk-${bulkType}` || activeTransferAction === `bulk-standard-${bulkType}`}
                className={combine(
                  getPrimaryButtonClass(), 
                  "w-full flex items-center justify-center space-x-2",
                  (activeTransferAction === `bulk-${bulkType}` || activeTransferAction === `bulk-standard-${bulkType}`) ? 'opacity-50 cursor-not-allowed' : ''
                )}
              >
                {(activeTransferAction === `bulk-${bulkType}` || activeTransferAction === `bulk-standard-${bulkType}`) ? (
                  <FaSync className="text-sm animate-spin" />
                ) : (
                  <FaMoneyCheckAlt className="text-sm" />
                )}
                <span>
                  {(activeTransferAction === `bulk-${bulkType}` || activeTransferAction === `bulk-standard-${bulkType}`)
                    ? 'Processing Bulk Transfer...'
                    : `Process Salaries ${bulkProcessMode === 'bank' ? 'with Bank Transfer' : ''}`}
                </span>
              </button>

              {/* Bank Transfer Result */}
              {bankTransferResult && 'batch_id' in bankTransferResult && (
                <div className="mt-4 space-y-4">
                  <div className={combine(
                    "p-4 rounded-xl",
                    (bankTransferResult as any).successful > 0 
                      ? (theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')
                      : (theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50')
                  )}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {(bankTransferResult as any).successful > 0 ? 
                          <FaCheckCircle className="text-green-500" /> : 
                          <FaExclamationCircle className="text-red-500" />
                        }
                        <span className="font-medium">
                          {(bankTransferResult as any).successful > 0 ? 'Success' : 'Failed'}
                        </span>
                      </div>
                      {(bankTransferResult as any).dummy_mode && (
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
                        <div className="text-sm font-medium">{(bankTransferResult as any).batch_id}</div>
                      </div>
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
                        <div className="text-sm font-medium">{(bankTransferResult as any).total}</div>
                      </div>
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Successful</div>
                        <div className="text-sm font-medium text-green-500">{(bankTransferResult as any).successful}</div>
                      </div>
                    </div>
                    {(bankTransferResult as any).error && (
                      <p className="text-xs text-red-500 mt-3">
                        {(bankTransferResult as any).error}
                      </p>
                    )}
                  </div>

                  {/* Detailed Results */}
                  {(bankTransferResult as any).results && (
                    <div className={combine(
                      "p-4 rounded-xl max-h-60 overflow-y-auto",
                      theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
                    )}>
                      <h3 className={combine("font-semibold mb-2 text-sm", get('text', 'primary'))}>
                        Detailed Results
                      </h3>
                      {(bankTransferResult as any).results.map((result: any, index: number) => (
                        <div key={index} className="py-2 border-b last:border-0">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium">{result.employee}</span>
                            <span className="text-xs font-medium">
                              ₹{money(result.amount)}
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
                      {bulkProcessResult.payments_created?.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center py-1 text-sm">
                          <span>{item.staff_name || item.teacher_name}</span>
                          <span className="font-medium">₹{money(item.net_payable)}</span>
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
                        <FaExclamationCircle className="text-red-500" />
                        <span>Errors ({bulkProcessResult.errors.length})</span>
                      </h3>
                      <div className="max-h-40 overflow-y-auto">
                        {bulkProcessResult.errors.map((error: string, index: number) => (
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
                Enter the OTP sent to admin email before continuing.
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
                  className={getControlClass()}
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

      {/* Update Payment Modal */}
      {showUpdatePaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={combine(getCardGradientClass('green'), 'max-w-xl w-full p-4 shadow-2xl')}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Update Payment</h2>
              <button
                onClick={() => {
                  setShowUpdatePaymentModal(false);
                  setUpdatePaymentId(null);
                }}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>
            
            <p className={combine('text-sm mt-1', get('text', 'secondary'))}>
              Update payment information for {updatePaymentType} payment #{updatePaymentId}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="text-xs block mb-1">Transaction ID</label>
                <input
                  type="text"
                  value={paymentUpdateData.transaction_id}
                  onChange={(e) => setPaymentUpdateData((prev) => ({ ...prev, transaction_id: e.target.value }))}
                  className={combine(getControlClass(), 'w-full')}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Bank Reference</label>
                <input
                  type="text"
                  value={paymentUpdateData.bank_reference}
                  onChange={(e) => setPaymentUpdateData((prev) => ({ ...prev, bank_reference: e.target.value }))}
                  className={combine(getControlClass(), 'w-full')}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-xs block mb-1">Payment Status</label>
                <select
                  value={paymentUpdateData.payment_status}
                  onChange={(e) => setPaymentUpdateData((prev) => ({ ...prev, payment_status: e.target.value as PaymentUpdateStatus }))}
                  className={combine(getControlClass(), 'w-full')}
                >
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs block mb-1">Remarks</label>
              <textarea
                rows={3}
                value={paymentUpdateData.remarks}
                onChange={(e) => setPaymentUpdateData((prev) => ({ ...prev, remarks: e.target.value }))}
                className={combine(getControlClass(), 'w-full')}
                placeholder="Optional"
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowUpdatePaymentModal(false);
                  setUpdatePaymentId(null);
                }}
                className={combine(getSecondaryButtonClass(), 'flex-1 text-sm')}
              >
                Cancel
              </button>
              <button
                onClick={updatePayment}
                disabled={isUpdatingPayment}
                className={combine(getPrimaryButtonClass(), 'flex-1 text-sm', isUpdatingPayment ? 'opacity-50 cursor-not-allowed' : '')}
              >
                {isUpdatingPayment ? 'Updating...' : 'Update Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentDetailsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className={combine(getCardGradientClass('purple'), 'max-w-2xl w-full p-4 shadow-2xl max-h-[90vh] overflow-y-auto')}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Payment Details</h2>
              <button
                onClick={() => setShowPaymentDetailsModal(null)}
                className={combine(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary') + " text-sm"
                )}
              >
                <FaTimes className="text-sm" />
              </button>
            </div>

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
                      ? `Staff ID: ${(showPaymentDetailsModal.payment as StaffPayment).staff_id_display || `STF-${(showPaymentDetailsModal.payment as StaffPayment).staff || ''}`}`
                      : `Teacher ID: ${(showPaymentDetailsModal.payment as TeacherPayment).teacher_id_display || ''}`}
                  </div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>
                    Payment ID: PAY-{showPaymentDetailsModal.payment.id}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm">
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <span className={combine("text-xs", get('text', 'tertiary'))}>Month/Year</span>
                <div className="font-semibold mt-1">{showPaymentDetailsModal.payment.month}/{showPaymentDetailsModal.payment.year}</div>
              </div>
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <span className={combine("text-xs", get('text', 'tertiary'))}>Base Salary</span>
                <div className="font-semibold mt-1">₹{money((showPaymentDetailsModal.payment as any).base_salary || 0)}</div>
              </div>
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <span className={combine("text-xs", get('text', 'tertiary'))}>Per Day Wage</span>
                <div className="font-semibold mt-1">₹{money((showPaymentDetailsModal.payment as any).per_day_wage || 0)}</div>
              </div>
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <span className={combine("text-xs", get('text', 'tertiary'))}>Total Working Days</span>
                <div className="font-semibold mt-1">{(showPaymentDetailsModal.payment as any).total_working_days || 0}</div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className={combine("p-4 rounded-xl mt-4", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
              <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Attendance Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>Days Worked</div>
                  <div className="font-semibold text-green-500">{(showPaymentDetailsModal.payment as any).days_worked || 0}</div>
                </div>
                <div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>Days Absent</div>
                  <div className="font-semibold text-red-500">{(showPaymentDetailsModal.payment as any).days_absent || 0}</div>
                </div>
                <div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>Days Late</div>
                  <div className="font-semibold text-yellow-500">{(showPaymentDetailsModal.payment as any).days_late || 0}</div>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className={combine("p-4 rounded-xl mt-4", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
              <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Deductions</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={combine("text-sm", get('text', 'tertiary'))}>Absent Amount</span>
                  <span className="font-medium text-red-500">-₹{money((showPaymentDetailsModal.payment as any).absent_amount || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={combine("text-sm", get('text', 'tertiary'))}>Late Amount</span>
                  <span className="font-medium text-yellow-500">-₹{money((showPaymentDetailsModal.payment as any).late_amount || 0)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className={combine("text-sm font-medium", get('text', 'primary'))}>Total Deduction</span>
                  <span className="font-bold text-red-500">-₹{money((showPaymentDetailsModal.payment as any).total_deduction || 0)}</span>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className={combine("p-4 rounded-xl mt-4 text-center", theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50')}>
              <div className={combine("text-sm mb-1", get('text', 'secondary'))}>Net Payable Amount</div>
              <div className="flex items-center justify-center">
                <FaRupeeSign className={combine("mr-2 text-2xl", get('text', 'primary'))} />
                <span className={combine("text-3xl font-bold", get('accent', 'success'))}>
                  {money(showPaymentDetailsModal.payment.net_payable)}
                </span>
              </div>
            </div>

            {/* Payment Information */}
            {(showPaymentDetailsModal.payment.payment_date || 
              showPaymentDetailsModal.payment.transaction_id || 
              showPaymentDetailsModal.payment.bank_reference) && (
              <div className={combine("p-4 rounded-xl mt-4", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <h3 className={combine("font-semibold mb-3", get('text', 'primary'))}>Payment Information</h3>
                <div className="space-y-2">
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
              <div className={combine("p-4 rounded-xl mt-4", theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-50')}>
                <h3 className={combine("font-semibold mb-2", get('text', 'primary'))}>Remarks</h3>
                <p className={combine("text-sm", get('text', 'secondary'))}>
                  {showPaymentDetailsModal.payment.remarks}
                </p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center justify-center space-x-2 mt-4">
              {getPaymentStatusIcon(showPaymentDetailsModal.payment.payment_status)}
              <span className={getStatusBadgeClass(showPaymentDetailsModal.payment.payment_status)}>
                {showPaymentDetailsModal.payment.payment_status}
              </span>
            </div>

            <div className="flex gap-3 mt-4">
              {showPaymentDetailsModal.payment.payment_status === 'pending' && (
                <div className="w-full flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      startTransferOtpFlow(() =>
                        processExistingPaymentWithBank(showPaymentDetailsModal.payment.id, showPaymentDetailsModal.type)
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
                      openUpdatePaymentModal(showPaymentDetailsModal.payment, showPaymentDetailsModal.type);
                      setShowPaymentDetailsModal(null);
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
                  onClick={() => verifyBankTransfer(showPaymentDetailsModal.payment.id, showPaymentDetailsModal.type)}
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
                      openUpdatePaymentModal(showPaymentDetailsModal.payment, showPaymentDetailsModal.type);
                      setShowPaymentDetailsModal(null);
                    }}
                    className={combine(getPrimaryButtonClass(), "flex-1 flex items-center justify-center space-x-2")}
                  >
                    <FaEdit className="text-sm" />
                    <span>Update Payment</span>
                  </button>
                  <button
                    onClick={() => {
                      startTransferOtpFlow(() =>
                        retryPaymentWithBank(showPaymentDetailsModal.payment.id, showPaymentDetailsModal.type)
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
      )}
    </div>
  );
}
