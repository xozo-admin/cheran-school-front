'use client';

import { adminApi } from '@/lib/api';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  FaChevronLeft, 
  FaChevronRight, 
  FaExclamationTriangle, 
  FaHistory, 
  FaSearch, 
  FaSync,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaFileExcel,
  FaFilePdf,
  FaUserTie,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaMoneyBillWave,
  FaInfoCircle,
  FaEye
} from 'react-icons/fa';

type SalaryPayment = {
  id: number;
  month: number;
  year: number;
  payment_status: string;
  net_payable: string;
  transaction_id?: string | null;
  payment_date?: string | null;
  staff_name?: string;
  teacher_name?: string;
};

type AuditLog = {
  id: number;
  action: string;
  severity: string;
  timestamp: string;
  request_path?: string;
  user_name?: string;
  details?: Record<string, unknown>;
};

type SalaryReportsPageProps = {
  embedded?: boolean;
};

type PaginationMeta = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) => `₹${toNumber(value).toLocaleString('en-IN')}`;

const formatDateTime = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true
  });
};

const formatDate = (value?: string) => {
  if (!value) return 'N/A';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { 
    year: 'numeric', 
    month: 'short', 
    day: '2-digit'
  });
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getFailureMeta = (details?: Record<string, unknown>) => {
  const payload = details || {};
  const failureType = String(payload.failure_type || '').trim();
  const failureSource = String(payload.failure_source || '').trim();
  const message = String(payload.message || payload.error || payload.reason || payload.operation || 'N/A').trim();
  return { failureType, failureSource, message };
};

const getAuditParticipants = (log: AuditLog) => {
  const details = (log.details || {}) as Record<string, unknown>;
  const performedBy = String(details.performed_by || log.user_name || 'System');
  const creditedTo = String(
    details.credited_to ||
    details.staff_name ||
    details.teacher_name ||
    (details.staff_id ? `Staff #${details.staff_id}` : '') ||
    (details.teacher_id ? `Teacher #${details.teacher_id}` : '') ||
    'N/A'
  );
  return { performedBy, creditedTo };
};

const getCreditedStatus = (log: AuditLog): 'Credited' | 'Not Credited' | '-' => {
  const details = (log.details || {}) as Record<string, unknown>;
  const action = String(log.action || '').toLowerCase();
  const status = String(details.current_status || details.payment_status || details.status || details.bank_status || '').toLowerCase();

  if (
    status.includes('processed') ||
    status.includes('completed') ||
    status.includes('credited') ||
    status.includes('success') ||
    action.includes('verified')
  ) {
    return 'Credited';
  }
  if (
    status.includes('pending') ||
    status.includes('processing') ||
    status.includes('failed') ||
    status.includes('cancelled') ||
    action.includes('failed')
  ) {
    return 'Not Credited';
  }
  return '-';
};

const getStatusIcon = (status: string) => {
  switch(status?.toLowerCase()) {
    case 'processed':
    case 'completed':
    case 'credited':
    case 'success':
      return <FaCheckCircle className="text-green-500" />;
    case 'pending':
    case 'processing':
      return <FaHourglassHalf className="text-yellow-500" />;
    case 'failed':
    case 'cancelled':
      return <FaTimesCircle className="text-red-500" />;
    default:
      return null;
  }
};

const getStatusBadgeClass = (status: string) => {
  const statusLower = status?.toLowerCase() || '';
  
  if (statusLower.includes('processed') || statusLower.includes('completed') || statusLower.includes('credited') || statusLower.includes('success')) {
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800';
  }
  if (statusLower.includes('pending') || statusLower.includes('processing')) {
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800';
  }
  if (statusLower.includes('failed') || statusLower.includes('cancelled')) {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800';
  }
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
};

export function SalaryReportsPanel({ embedded = false }: SalaryReportsPageProps) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [status, setStatus] = useState('');
  const [days, setDays] = useState(30);
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize] = useState(30);

  const [staffPayments, setStaffPayments] = useState<SalaryPayment[]>([]);
  const [teacherPayments, setTeacherPayments] = useState<SalaryPayment[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPagination, setAuditPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 30,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });

  const [loading, setLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePaymentTab, setActivePaymentTab] = useState<'staff' | 'teacher'>('staff');
  const [selectedPayment, setSelectedPayment] = useState<{ type: 'staff' | 'teacher'; payment: SalaryPayment } | null>(null);

  const { get, combine } = useThemeClasses();

  const loadSummaryData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    const [staffRes, teacherRes] = await Promise.allSettled([
      adminApi.salary.payments.staff.list({ month, year, ...(status ? { status: status as any } : {}) }),
      adminApi.salary.payments.teacher.list({ month, year, ...(status ? { status: status as any } : {}) }),
    ]);

    let failed = false;

    if (staffRes.status === 'fulfilled') {
      setStaffPayments(Array.isArray(staffRes.value?.data?.data) ? staffRes.value.data.data : []);
    } else {
      failed = true;
      setStaffPayments([]);
    }

    if (teacherRes.status === 'fulfilled') {
      setTeacherPayments(Array.isArray(teacherRes.value?.data?.data) ? teacherRes.value.data.data : []);
    } else {
      failed = true;
      setTeacherPayments([]);
    }

    if (failed) setError('Some report data could not be loaded.');

    if (isRefresh) {
      setRefreshing(false);
    } else {
      setLoading(false);
    }
  }, [month, year, status]);

  const loadAuditData = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await adminApi.salary.audit.logs({
        page: auditPage,
        page_size: auditPageSize,
        days,
        month,
        year,
        ...(status ? { status: status as any } : {}),
        ...(searchQuery.trim() ? { q: searchQuery.trim() } : {}),
      });
      const payload = res?.data?.data || {};
      const logs = Array.isArray(payload.logs) ? payload.logs : [];
      const total = toNumber(payload.total);
      const totalPages = Math.max(1, toNumber(payload.total_pages) || Math.ceil(total / auditPageSize));
      const nextPage = toNumber(payload.page) || auditPage;

      setAuditLogs(logs);
      setAuditTotal(total);
      setAuditPagination({
        page: nextPage,
        page_size: toNumber(payload.page_size) || auditPageSize,
        total,
        total_pages: totalPages,
        has_next: nextPage < totalPages,
        has_previous: nextPage > 1,
      });
      if (nextPage !== auditPage) {
        setAuditPage(nextPage);
      }
    } catch (e) {
      setAuditLogs([]);
      setAuditTotal(0);
      setAuditPagination({
        page: 1,
        page_size: auditPageSize,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
      setError('Some report data could not be loaded.');
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, auditPageSize, days, month, year, status, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadSummaryData(true), loadAuditData()]);
    setRefreshing(false);
  }, [loadSummaryData, loadAuditData]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadSummaryData(false);
  }, [loadSummaryData]);

  useEffect(() => {
    setAuditPage(1);
  }, [days, month, year, status, searchQuery]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const totals = useMemo(() => {
    const staffTotal = staffPayments.reduce((sum, p) => sum + toNumber(p.net_payable), 0);
    const teacherTotal = teacherPayments.reduce((sum, p) => sum + toNumber(p.net_payable), 0);
    return {
      staffCount: staffPayments.length,
      teacherCount: teacherPayments.length,
      staffTotal,
      teacherTotal,
      grand: staffTotal + teacherTotal,
    };
  }, [staffPayments, teacherPayments]);

  return (
    <div className={combine(
      embedded ? 'space-y-4 sm:space-y-6' : 'dashboard-typography p-3 md:p-4 xl:p-6 space-y-4 sm:space-y-6 min-h-screen',
      get('bg', 'primary')
    )}>
      {/* Header */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <FaHistory className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h2 className={combine('text-xl sm:text-2xl font-semibold', get('text', 'primary'))}>
                Salary Reports & Audit Logs
              </h2>
              <p className={combine('text-xs sm:text-sm mt-0.5', get('text', 'secondary'))}>
                View payment records and audit history
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={combine('p-4 sm:p-5 space-y-4', get('bg', 'card'))}>
          <div className="flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
            {/* Month/Year Selection */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-lg border border-gray-200 dark:border-gray-700 w-full sm:w-auto min-w-0">
              <FaCalendarAlt className={combine('text-sm ml-2', get('text', 'tertiary'))} />
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))} 
                className={combine(
                  'px-2.5 sm:px-3 py-2 rounded-md text-xs sm:text-sm border-0 bg-transparent focus:ring-1 focus:ring-indigo-500 min-w-0',
                  get('text', 'primary')
                )}
                aria-label="Select month"
              >
                {monthNames.map((name, index) => (
                  <option key={index + 1} value={index + 1}>{name}</option>
                ))}
              </select>
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))} 
                className={combine(
                  'px-2.5 sm:px-3 py-2 rounded-md text-xs sm:text-sm border-0 bg-transparent focus:ring-1 focus:ring-indigo-500 min-w-0',
                  get('text', 'primary')
                )}
                aria-label="Select year"
              >
                {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <FaFilter className={combine('text-sm', get('text', 'tertiary'))} />
              <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)} 
                className={combine(
                  'px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm w-full sm:w-auto',
                  get('bg', 'card'),
                  get('border', 'primary'),
                  get('text', 'primary')
                )}
              >
                <option value=''>All Status</option>
                <option value='pending'>Pending</option>
                <option value='processing'>Processing</option>
                <option value='processed'>Processed</option>
                <option value='failed'>Failed</option>
                <option value='cancelled'>Cancelled</option>
              </select>
            </div>

            {/* Days Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>Audit:</span>
              <select 
                value={days} 
                onChange={(e) => setDays(Number(e.target.value))} 
                className={combine(
                  'px-3 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm w-full sm:w-auto',
                  get('bg', 'card'),
                  get('border', 'primary'),
                  get('text', 'primary')
                )}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            {/* Search */}
            <div className={combine(
              'flex-1 min-w-0 sm:min-w-[250px] rounded-lg border px-3 py-2 inline-flex items-center gap-2 w-full',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <FaSearch className={combine('text-sm', get('text', 'tertiary'))} />
              <input 
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder='Search audit logs...' 
                className={combine(
                  'bg-transparent outline-none text-xs sm:text-sm w-full',
                  get('text', 'primary')
                )} 
              />
            </div>

            {/* Refresh Button */}
            <button 
              onClick={handleRefresh} 
              disabled={loading || refreshing} 
              className='w-full sm:w-auto px-3 sm:px-5 py-2.5 rounded-lg text-white text-xs sm:text-sm font-medium bg-indigo-600 hover:bg-indigo-700 inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-colors whitespace-nowrap'
            >
              <FaSync className={refreshing ? 'animate-spin' : ''} /> 
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error ? (
        <div className='p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs sm:text-sm flex items-center gap-3'>
          <FaExclamationTriangle className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {/* Summary Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Staff Records
              </p>
              <p className={combine('text-2xl sm:text-3xl font-bold mt-2', get('text', 'primary'))}>
                {totals.staffCount}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FaUserTie className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Total amount: {formatCurrency(totals.staffTotal)}
          </p>
        </div>

        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Teacher Records
              </p>
              <p className={combine('text-2xl sm:text-3xl font-bold mt-2', get('text', 'primary'))}>
                {totals.teacherCount}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
              <FaChalkboardTeacher className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Total amount: {formatCurrency(totals.teacherTotal)}
          </p>
        </div>

        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Total Amount
              </p>
              <p className={combine('text-2xl sm:text-3xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                <FaMoneyBillWave className="text-indigo-500 text-lg" />
                {formatCurrency(totals.grand)}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Combined payable amount
          </p>
        </div>

        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Audit Period
              </p>
              <p className={combine('text-2xl sm:text-3xl font-bold mt-2', get('text', 'primary'))}>
                {days} days
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FaHistory className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {auditTotal} audit entries found
          </p>
        </div>
      </div>

      {/* Payment Records Tabs */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="p-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <nav className="flex gap-2">
            <button
              onClick={() => setActivePaymentTab('staff')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all",
                activePaymentTab === 'staff'
                  ? 'bg-emerald-500 text-white shadow-md'
                  : combine('text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700', get('bg', 'card'))
              )}
            >
              <FaUserTie className="text-sm" />
              Staff Payments
            </button>
            <button
              onClick={() => setActivePaymentTab('teacher')}
              className={combine(
                "px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all",
                activePaymentTab === 'teacher'
                  ? 'bg-blue-500 text-white shadow-md'
                  : combine('text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700', get('bg', 'card'))
              )}
            >
              <FaChalkboardTeacher className="text-sm" />
              Teacher Payments
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading payment records...</p>
                <p className={combine("text-xs sm:text-sm mt-2", get('text', 'tertiary'))}>Preparing salary payment records</p>
              </div>
            </div>
          ) : activePaymentTab === 'staff' ? (
            staffPayments.length === 0 ? (
              <div className="text-center py-12">
                <div className={combine(
                  "inline-block p-4 rounded-full mb-3",
                  get('bg', 'secondary')
                )}>
                  <FaUserTie className={combine('text-2xl', get('text', 'tertiary'))} />
                </div>
                <p className={combine('text-sm', get('text', 'secondary'))}>
                  No staff payment records found for {monthNames[month-1]} {year}
                </p>
              </div>
            ) : (
              <div className='space-y-3 max-h-[400px] overflow-auto pr-1'>
                {staffPayments.map((p) => (
                  <div 
                    key={`s-${p.id}`} 
                    className={combine(
                      'rounded-lg border p-4 hover:shadow-md transition-shadow',
                      get('bg', 'card'),
                      get('border', 'primary')
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <FaUserTie className="text-sm" />
                        </div>
                        <div>
                          <p className={combine('font-medium text-sm', get('text', 'primary'))}>
                            {p.staff_name || 'Staff Member'}
                          </p>
                          <p className={combine('text-xs mt-1', get('text', 'tertiary'))}>
                            {p.month}/{p.year} • ID: {p.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getStatusBadgeClass(p.payment_status)}>
                          {p.payment_status}
                        </span>
                        <button
                          onClick={() => setSelectedPayment({ type: 'staff', payment: p })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label={`View staff payment ${p.id}`}
                        >
                          <FaEye className={combine('text-xs', get('text', 'tertiary'))} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <FaMoneyBillWave className={combine('text-xs', get('text', 'tertiary'))} />
                        <span className={combine('text-xs', get('text', 'secondary'))}>
                          Amount: <span className="font-semibold">{formatCurrency(p.net_payable)}</span>
                        </span>
                      </div>
                      {p.payment_date && (
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className={combine('text-xs', get('text', 'tertiary'))} />
                          <span className={combine('text-xs', get('text', 'secondary'))}>
                            {formatDate(p.payment_date)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {p.transaction_id && (
                      <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        <span className={combine('font-medium', get('text', 'tertiary'))}>Transaction ID:</span>
                        <span className={combine('ml-2 font-mono', get('text', 'secondary'))}>{p.transaction_id}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            teacherPayments.length === 0 ? (
              <div className="text-center py-12">
                <div className={combine(
                  "inline-block p-4 rounded-full mb-3",
                  get('bg', 'secondary')
                )}>
                  <FaChalkboardTeacher className={combine('text-2xl', get('text', 'tertiary'))} />
                </div>
                <p className={combine('text-sm', get('text', 'secondary'))}>
                  No teacher payment records found for {monthNames[month-1]} {year}
                </p>
              </div>
            ) : (
              <div className='space-y-3 max-h-[400px] overflow-auto pr-1'>
                {teacherPayments.map((p) => (
                  <div 
                    key={`t-${p.id}`} 
                    className={combine(
                      'rounded-lg border p-4 hover:shadow-md transition-shadow',
                      get('bg', 'card'),
                      get('border', 'primary')
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                          <FaChalkboardTeacher className="text-sm" />
                        </div>
                        <div>
                          <p className={combine('font-medium text-sm', get('text', 'primary'))}>
                            {p.teacher_name || 'Teacher'}
                          </p>
                          <p className={combine('text-xs mt-1', get('text', 'tertiary'))}>
                            {p.month}/{p.year} • ID: {p.id}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={getStatusBadgeClass(p.payment_status)}>
                          {p.payment_status}
                        </span>
                        <button
                          onClick={() => setSelectedPayment({ type: 'teacher', payment: p })}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                          aria-label={`View teacher payment ${p.id}`}
                        >
                          <FaEye className={combine('text-xs', get('text', 'tertiary'))} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <FaMoneyBillWave className={combine('text-xs', get('text', 'tertiary'))} />
                        <span className={combine('text-xs', get('text', 'secondary'))}>
                          Amount: <span className="font-semibold">{formatCurrency(p.net_payable)}</span>
                        </span>
                      </div>
                      {p.payment_date && (
                        <div className="flex items-center gap-2">
                          <FaCalendarAlt className={combine('text-xs', get('text', 'tertiary'))} />
                          <span className={combine('text-xs', get('text', 'secondary'))}>
                            {formatDate(p.payment_date)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {p.transaction_id && (
                      <div className="mt-2 text-xs bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                        <span className={combine('font-medium', get('text', 'tertiary'))}>Transaction ID:</span>
                        <span className={combine('ml-2 font-mono', get('text', 'secondary'))}>{p.transaction_id}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Payment Details Modal */}
      {selectedPayment ? (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={combine(
            'w-full max-w-lg rounded-xl border shadow-xl',
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className={combine('px-5 py-4 border-b flex items-center justify-between', get('border', 'primary'))}>
              <h3 className={combine('text-base font-semibold', get('text', 'primary'))}>
                {selectedPayment.type === 'staff' ? 'Staff Payment Details' : 'Teacher Payment Details'}
              </h3>
              <button
                onClick={() => setSelectedPayment(null)}
                className={combine('text-sm px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800', get('text', 'secondary'))}
              >
                Close
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Name</p>
                  <p className={combine('font-medium', get('text', 'primary'))}>
                    {selectedPayment.type === 'staff'
                      ? (selectedPayment.payment.staff_name || 'Staff Member')
                      : (selectedPayment.payment.teacher_name || 'Teacher')}
                  </p>
                </div>
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Payment ID</p>
                  <p className={combine('font-medium', get('text', 'primary'))}>{selectedPayment.payment.id}</p>
                </div>
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Month / Year</p>
                  <p className={combine('font-medium', get('text', 'primary'))}>
                    {monthNames[selectedPayment.payment.month - 1] || selectedPayment.payment.month} {selectedPayment.payment.year}
                  </p>
                </div>
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Status</p>
                  <div className="mt-0.5">
                    <span className={getStatusBadgeClass(selectedPayment.payment.payment_status)}>
                      {selectedPayment.payment.payment_status}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Amount</p>
                  <p className={combine('font-medium', get('text', 'primary'))}>
                    {formatCurrency(selectedPayment.payment.net_payable)}
                  </p>
                </div>
                <div>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Payment Date</p>
                  <p className={combine('font-medium', get('text', 'primary'))}>
                    {formatDate(selectedPayment.payment.payment_date || undefined)}
                  </p>
                </div>
              </div>

              {selectedPayment.payment.transaction_id ? (
                <div className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                  <p className={combine('text-xs', get('text', 'tertiary'))}>Transaction ID</p>
                  <p className={combine('font-mono text-sm mt-1 break-all', get('text', 'primary'))}>
                    {selectedPayment.payment.transaction_id}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Audit Logs */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <FaHistory className="text-sm" />
              </div>
              <h3 className={combine('font-semibold', get('text', 'primary'))}>
                Salary Audit Logs
              </h3>
            </div>
            <p className={combine('text-xs', get('text', 'tertiary'))}>
              Showing {auditLogs.length} of {auditTotal} logs • Page {auditPagination.page} of {auditPagination.total_pages}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {auditLoading ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading audit entries...</p>
                <p className={combine("text-xs sm:text-sm mt-2", get('text', 'tertiary'))}>Preparing salary audit records</p>
              </div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-center py-12">
              <div className={combine(
                "inline-block p-4 rounded-full mb-3",
                get('bg', 'secondary')
              )}>
                <FaHistory className={combine('text-2xl', get('text', 'tertiary'))} />
              </div>
              <p className={combine('text-sm', get('text', 'secondary'))}>
                No salary audit entries found for the selected filters
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full text-xs sm:text-sm'>
                <thead>
                  <tr className={combine('border-b', get('border', 'primary'))}>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      <div className="flex items-center gap-2">
                        <FaCalendarAlt className="text-xs" />
                        Timestamp
                      </div>
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Action
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Severity
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Status
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Performed By
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Credited To
                    </th>
                    <th className={combine('text-left py-3 pr-4 text-xs font-semibold uppercase tracking-wider', get('text', 'tertiary'))}>
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => {
                    const meta = getFailureMeta(log.details);
                    const participants = getAuditParticipants(log);
                    const creditedStatus = getCreditedStatus(log);
                    
                    return (
                      <tr 
                        key={log.id} 
                        className={combine(
                          'border-b hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                          get('border', 'primary')
                        )}
                      >
                        <td className={combine('py-3 pr-4 text-xs', get('text', 'secondary'))}>
                          <div className="font-medium">{formatDateTime(log.timestamp)}</div>
                        </td>
                        <td className='py-3 pr-4'>
                          <span className='inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'>
                            {log.action}
                          </span>
                        </td>
                        <td className='py-3 pr-4'>
                          <span className={combine(
                            'inline-flex px-2.5 py-1 rounded-md text-xs font-medium',
                            log.severity?.toLowerCase() === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            log.severity?.toLowerCase() === 'warning' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          )}>
                            {log.severity}
                          </span>
                        </td>
                        <td className='py-3 pr-4'>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(creditedStatus)}
                            <span className={combine(
                              'text-xs font-medium',
                              creditedStatus === 'Credited' ? 'text-green-600 dark:text-green-400' :
                              creditedStatus === 'Not Credited' ? 'text-red-600 dark:text-red-400' :
                              get('text', 'secondary')
                            )}>
                              {creditedStatus}
                            </span>
                          </div>
                        </td>
                        <td className={combine('py-3 pr-4 text-xs', get('text', 'secondary'))}>
                          {participants.performedBy}
                        </td>
                        <td className={combine('py-3 pr-4 text-xs', get('text', 'secondary'))}>
                          {participants.creditedTo}
                        </td>
                        <td className='py-3 pr-4'>
                          <div className="space-y-1">
                            {meta.failureType && meta.failureType !== '-' && (
                              <span className='inline-flex px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'>
                                {meta.failureType}
                              </span>
                            )}
                            {meta.message && meta.message !== 'N/A' && (
                              <p className={combine('text-xs max-w-[300px] truncate', get('text', 'secondary'))} 
                                 title={meta.message}>
                                {meta.message}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {auditPagination.total_pages > 1 && (
            <div className='mt-5 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
              <p className={combine('text-xs', get('text', 'tertiary'))}>
                Page {auditPagination.page} of {auditPagination.total_pages}
              </p>
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setAuditPage((prev) => Math.max(prev - 1, 1))}
                  disabled={!auditPagination.has_previous || auditLoading}
                  className={combine(
                    'px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    get('bg', 'card'),
                    get('border', 'primary'),
                    get('text', 'primary')
                  )}
                >
                  <FaChevronLeft className='text-[10px]' /> Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, auditPagination.total_pages) }, (_, i) => {
                    let pageNum: number;
                    if (auditPagination.total_pages <= 5) {
                      pageNum = i + 1;
                    } else if (auditPagination.page <= 3) {
                      pageNum = i + 1;
                    } else if (auditPagination.page >= auditPagination.total_pages - 2) {
                      pageNum = auditPagination.total_pages - 4 + i;
                    } else {
                      pageNum = auditPagination.page - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setAuditPage(pageNum)}
                        className={combine(
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          auditPagination.page === pageNum
                            ? 'bg-indigo-600 text-white'
                            : combine('hover:bg-gray-100 dark:hover:bg-gray-800', get('bg', 'card'), get('text', 'primary'))
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setAuditPage((prev) => Math.min(auditPagination.total_pages, prev + 1))}
                  disabled={!auditPagination.has_next || auditLoading}
                  className={combine(
                    'px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    get('bg', 'card'),
                    get('border', 'primary'),
                    get('text', 'primary')
                  )}
                >
                  Next <FaChevronRight className='text-[10px]' />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SalaryReportsPanel;
