'use client';

import { apiFetch } from '@/lib/api';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaMoneyBillWave,
  FaChartLine,
  FaExclamationTriangle,
  FaSync,
  FaUsers,
  FaCheckCircle,
  FaClock,
  FaCalendarAlt,
  FaInfoCircle,
  FaHistory,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaRupeeSign,
  FaArrowUp,
  FaArrowDown,
  FaWallet,
  FaUserGraduate,
  FaFilter,
  FaDownload,
  FaPrint,
  FaTimesCircle,
  FaHourglassHalf,
  FaChartPie,
  FaUniversity,
  FaCreditCard,
  FaQrcode,
} from 'react-icons/fa';
import { toastError } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import {
  ResponsiveContainer,
  AreaChart,
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

type StatsCards = {
  total_assigned_amount: number;
  total_collected_amount: number;
  total_pending_amount: number;
  total_concession_amount: number;
  due_students_count: number;
  today_collected_amount: number;
  today_transactions: number;
  collection_rate: number;
  total_students_count: number;
  paid_students_count: number;
};

type StatsResponse = {
  data?: {
    cards?: Partial<StatsCards>;
  };
};

type MonthlyCollectionItem = {
  month: string;
  collected: number;
  transactions: number;
};

type PendingClassItem = {
  class: string;
  pending: number;
  students_with_due: number;
};

type FeeTypeBreakdownItem = {
  fee_type: string;
  assigned: number;
  collected: number;
  pending: number;
  concession: number;
  students: number;
  collection_rate: number;
};

type StatusDistributionItem = {
  status: string;
  count: number;
  percentage: number;
};

type PaymentModeItem = {
  mode: string;
  amount: number;
  count: number;
  percentage: number;
};

type OverviewResponse = {
  summary_cards?: {
    total_assigned: number;
    total_collected: number;
    total_pending: number;
    total_concession: number;
    collection_rate: number;
  };
  charts?: {
    monthly_collection?: MonthlyCollectionItem[];
    top_pending_classes?: PendingClassItem[];
    fee_type_breakdown?: FeeTypeBreakdownItem[];
    status_distribution?: StatusDistributionItem[];
    payment_mode_breakdown?: PaymentModeItem[];
  };
};

type AuditLogItem = {
  id: number;
  user_name?: string;
  action: string;
  severity: string;
  details?: Record<string, unknown>;
  request_method?: string;
  request_path?: string;
  response_status?: number | null;
  timestamp: string;
  gateway_mode?: string;
};

type AuditLogsResponse = {
  data?: {
    total?: number;
    page?: number;
    page_size?: number;
    total_pages?: number;
    logs?: AuditLogItem[];
  };
};

type AcademicYearOption = {
  id?: number;
  name: string;
  is_current?: boolean;
};

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const STATUS_COLOR_MAP: Record<string, string> = {
  paid: '#10b981',
  unpaid: '#f59e0b',
  overdue: '#ef4444',
  partial: '#f97316',
  refunded: '#8b5cf6',
};

const toNumber = (value: unknown): number => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) =>
  `₹${toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const compactCurrency = (value: unknown) => {
  const amount = toNumber(value);
  if (amount >= 1_00_00_000) return `₹${(amount / 1_00_00_000).toFixed(2)} Cr`;
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN')}`;
};

const formatDateTime = (value: string | undefined) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getAuditHighlights = (details: Record<string, unknown>) => {
  const fieldMap: Array<{ key: string; label: string; format?: (value: unknown) => string }> = [
    { key: 'operation', label: 'Operation' },
    { key: 'student_id', label: 'Student' },
    { key: 'fee_type', label: 'Fee Type' },
    { key: 'payment_mode', label: 'Mode', format: (value) => String(value).toUpperCase() },
    { key: 'amount', label: 'Amount', format: (value) => formatCurrency(value) },
    { key: 'transaction_id', label: 'Txn' },
    { key: 'order_id', label: 'Order' },
    { key: 'module', label: 'Module' },
  ];

  return fieldMap
    .filter(({ key }) => details[key] !== undefined && details[key] !== null && String(details[key]).trim() !== '')
    .slice(0, 6)
    .map(({ key, label, format }) => ({
      key,
      label,
      value: format ? format(details[key]) : String(details[key]),
    }));
};

const resolveAuditPaymentMode = (details: Record<string, unknown>) => {
  const nestedReceipt = details.receipt as Record<string, unknown> | undefined;
  const raw =
    details.payment_mode ||
    details.mode ||
    details.paymentMode ||
    nestedReceipt?.payment_mode ||
    nestedReceipt?.payment_mode_display;

  if (!raw) return '-';
  const mode = String(raw).toUpperCase().trim();
  const aliases: Record<string, string> = {
    'ONLINE TRANSFER': 'ONLINE',
    'NET BANKING': 'NETBANKING',
    'DEMAND DRAFT': 'DD',
  };
  return aliases[mode] || mode;
};

const normalizeAcademicYears = (payload: any): AcademicYearOption[] => {
  const raw = payload?.data?.academic_years || payload?.data?.results || payload?.data || payload?.results || payload || [];
  const list = Array.isArray(raw) ? raw : [];

  const normalized = list
    .map((item: any, idx) => ({
      id: item?.id ?? idx + 1,
      name: String(item?.name || item?.academic_year || '').trim(),
      is_current: Boolean(item?.is_current),
    }))
    .filter((item: AcademicYearOption) => item.name.length > 0)
    .sort((a, b) => b.name.localeCompare(a.name));

  return normalized;
};

async function fetchJson(path: string) {
  const response = await apiFetch(path);
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('text/html')) {
    const html = await response.text();
    if (html.includes('ERR_NGROK_6024') || html.toLowerCase().includes('<!doctype html')) {
      throw new Error('Received ngrok warning page instead of API JSON. Check tunnel and headers.');
    }
    throw new Error('Received HTML response instead of JSON.');
  }

  let parsed: any = null;
  try {
    parsed = await response.json();
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message = parsed?.error || parsed?.message || `Request failed (${response.status}) for ${path}`;
    throw new Error(message);
  }

  return parsed;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function FinanceFeesOverviewPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [months, setMonths] = useState<number>(6);
  const [auditDays, setAuditDays] = useState<number>(30);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditDateFrom, setAuditDateFrom] = useState<string>('');
  const [auditDateTo, setAuditDateTo] = useState<string>('');
  const [auditAcademicYear, setAuditAcademicYear] = useState<string>('');
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditPageSize] = useState<number>(20);

  const [stats, setStats] = useState<Partial<StatsCards>>({});
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditTotalPages, setAuditTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditLoading, setAuditLoading] = useState<boolean>(false);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const yearParam = selectedYear ? `academic_year=${encodeURIComponent(selectedYear)}` : '';
    const statsPath = `fees/report/stats-cards/${yearParam ? `?${yearParam}` : ''}`;
    const overviewPath = `fees/report/overview-chart/${yearParam ? `?${yearParam}&months=${months}` : `?months=${months}`}`;

    const [statsResult, overviewResult] = await Promise.allSettled([
      fetchJson(statsPath),
      fetchJson(overviewPath),
    ]);

    let failed = false;

    if (statsResult.status === 'fulfilled') {
      const payload = statsResult.value as StatsResponse;
      setStats(payload?.data?.cards || {});
    } else {
      failed = true;
      setStats({});
      console.error('Fee stats cards error:', statsResult.reason);
    }

    if (overviewResult.status === 'fulfilled') {
      setOverview(overviewResult.value as OverviewResponse);
    } else {
      failed = true;
      setOverview(null);
      console.error('Fee overview chart error:', overviewResult.reason);
    }

    if (failed) {
      setError('Unable to load complete fee dashboard data.');
      toastError('Failed to load fee dashboard data');
    }
    setLoading(false);
  }, [selectedYear, months]);

  const loadAuditData = useCallback(async () => {
    setAuditLoading(true);
    setAuditError(null);
    const auditParams = new URLSearchParams({
      scope: 'fees',
      page: String(auditPage),
      page_size: String(auditPageSize),
    });
    if (auditDateFrom && auditDateTo) {
      auditParams.set('date_from', auditDateFrom);
      auditParams.set('date_to', auditDateTo);
    } else {
      auditParams.set('days', String(auditDays));
    }
    const effectiveAuditAcademicYear = auditAcademicYear || selectedYear;
    if (effectiveAuditAcademicYear) {
      auditParams.set('academic_year', effectiveAuditAcademicYear);
    }
    if (auditSearchQuery.trim()) {
      auditParams.set('q', auditSearchQuery.trim());
    }

    try {
      const payload = await fetchJson(`audit/admin/logs/?${auditParams.toString()}`) as AuditLogsResponse;
      const logs = Array.isArray(payload?.data?.logs) ? payload.data.logs : [];
      setAuditLogs(logs);
      setAuditTotal(toNumber(payload?.data?.total));
      setAuditTotalPages(Math.max(1, toNumber(payload?.data?.total_pages)));
    } catch (err) {
      setAuditLogs([]);
      setAuditTotal(0);
      setAuditTotalPages(1);
      setAuditError('Unable to load audit logs right now.');
      console.error('Audit logs error:', err);
    } finally {
      setAuditLoading(false);
    }
  }, [
    auditPage,
    auditPageSize,
    auditDays,
    auditSearchQuery,
    auditDateFrom,
    auditDateTo,
    auditAcademicYear,
    selectedYear,
  ]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboardData(), loadAuditData()]);
    setRefreshing(false);
  }, [loadDashboardData, loadAuditData]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAuditSearchQuery(auditSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [auditSearch]);

  useEffect(() => {
    let mounted = true;

    const loadAcademicYears = async () => {
      try {
        const payload = await fetchJson('school/academic-years/');
        if (!mounted) return;

        const normalized = normalizeAcademicYears(payload);
        setAcademicYears(normalized);

        const current = normalized.find((year) => year.is_current)?.name || normalized[0]?.name || '';
        if (current) {
          setSelectedYear((prev) => prev || current);
          setAuditAcademicYear((prev) => prev || current);
        }
      } catch (err) {
        console.error('Academic years load failed:', err);
        if (mounted) setAcademicYears([]);
      }
    };

    loadAcademicYears();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    setAuditPage(1);
  }, [auditDays, auditSearchQuery, auditDateFrom, auditDateTo, auditAcademicYear, selectedYear]);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const summaryCards = useMemo(() => {
    const fallback: Partial<NonNullable<OverviewResponse['summary_cards']>> = overview?.summary_cards || {};

    const assigned = toNumber(stats.total_assigned_amount ?? fallback.total_assigned);
    const collected = toNumber(stats.total_collected_amount ?? fallback.total_collected);
    const pending = toNumber(stats.total_pending_amount ?? fallback.total_pending);

    const totalStudents = toNumber(stats.total_students_count);
    const dueStudents = toNumber(stats.due_students_count);
    const paidStudentsAnyFee = toNumber(stats.paid_students_count);
    const fullyPaidStudents =
      totalStudents > 0
        ? Math.max(0, totalStudents - dueStudents)
        : paidStudentsAnyFee;
    const studentsPaidPercent = totalStudents > 0 ? (fullyPaidStudents / totalStudents) * 100 : 0;

    return {
      assigned,
      collected,
      pending,
      concession: toNumber(stats.total_concession_amount ?? fallback.total_concession),
      rate: toNumber(stats.collection_rate ?? fallback.collection_rate),
      dueStudents,
      todayCollected: toNumber(stats.today_collected_amount),
      todayTxns: toNumber(stats.today_transactions),
      paidStudentsAnyFee,
      fullyPaidStudents,
      totalStudents,
      studentsPaidPercent,
    };
  }, [stats, overview]);

  const monthlyCollection = useMemo(() => overview?.charts?.monthly_collection || [], [overview]);
  const topPendingClasses = useMemo(() => overview?.charts?.top_pending_classes || [], [overview]);
  const feeTypeBreakdown = useMemo(() => overview?.charts?.fee_type_breakdown || [], [overview]);
  const statusDistribution = useMemo(() => overview?.charts?.status_distribution || [], [overview]);
  const paymentModes = useMemo(() => overview?.charts?.payment_mode_breakdown || [], [overview]);

  const statusChartData = useMemo(() => {
    return statusDistribution.map((item, idx) => ({
      name: item.status,
      value: toNumber(item.count),
      color: STATUS_COLOR_MAP[item.status.toLowerCase()] || CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [statusDistribution]);

  const paymentModeChartData = useMemo(() => {
    return paymentModes.map((item, idx) => ({
      mode: item.mode,
      amount: toNumber(item.amount),
      count: toNumber(item.count),
      percentage: toNumber(item.percentage),
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }));
  }, [paymentModes]);

  const feeTypeChartData = useMemo(() => {
    return feeTypeBreakdown.slice(0, 6).map((item) => ({
      fee_type: item.fee_type,
      collected: toNumber(item.collected),
      pending: toNumber(item.pending),
    }));
  }, [feeTypeBreakdown]);

  const feesAuditLogs = useMemo(() => auditLogs, [auditLogs]);

  const auditSummary = useMemo(() => {
    const total = feesAuditLogs.length;
    const failed = feesAuditLogs.filter((item) => {
      const code = toNumber(item.response_status);
      return code >= 400 || item.severity === 'ERROR' || item.severity === 'CRITICAL';
    }).length;
    const paymentOps = feesAuditLogs.filter((item) => item.action.startsWith('PAYMENT')).length;
    const configOps = feesAuditLogs.filter((item) =>
      ['CREATE', 'UPDATE', 'DELETE'].includes(item.action)
    ).length;
    return { total, failed, paymentOps, configOps };
  }, [feesAuditLogs]);

  const getPaymentModeIcon = (mode: string) => {
    switch(mode) {
      case 'CASH': return <FaMoneyBillWave className="text-green-500" />;
      case 'UPI': return <FaQrcode className="text-blue-500" />;
      case 'CARD': return <FaCreditCard className="text-purple-500" />;
      case 'NETBANKING': return <FaUniversity className="text-indigo-500" />;
      default: return <FaMoneyBillWave className="text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status?.toLowerCase()) {
      case 'paid': return <FaCheckCircle className="text-green-500" />;
      case 'unpaid': return <FaClock className="text-yellow-500" />;
      case 'overdue': return <FaExclamationTriangle className="text-red-500" />;
      case 'partial': return <FaHourglassHalf className="text-orange-500" />;
      case 'refunded': return <FaTimesCircle className="text-purple-500" />;
      default: return null;
    }
  };

  return (
    <div className={combine('dashboard-typography p-3 md:p-4 xl:p-6 space-y-4 sm:space-y-6 min-h-screen overflow-x-hidden', get('bg', 'primary'))}>
      {/* Header with gradient background */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border shadow-md overflow-hidden',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className={combine(
          'p-4 sm:p-5 border-b bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-800 dark:to-teal-800',
          get('border', 'primary')
        )}>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur text-white">
                <FaMoneyBillWave className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h1 className='text-xl sm:text-2xl font-bold text-white flex items-center gap-2'>
                  Fees Dashboard
                </h1>
                <p className='text-xs sm:text-sm mt-0.5 text-white/80'>
                  Comprehensive fee collection and payment analytics
                </p>
              </div>
            </div>
            
            <div className='flex flex-wrap items-stretch sm:items-center gap-2 sm:gap-3 w-full md:w-auto'>
              {/* Academic Year Filter */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-2.5 sm:px-3 py-1.5 min-w-0">
                <FaCalendarAlt className="text-white/80 text-sm" />
                <label htmlFor="academic-year" className="sr-only">Academic Year</label>
                <select
                  id="academic-year"
                  value={selectedYear}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedYear(value);
                    setAuditAcademicYear(value);
                  }}
                  className="bg-transparent text-white text-xs sm:text-sm border-0 focus:ring-1 focus:ring-white/50 py-1 min-w-0"
                >
                  <option value="" className="text-gray-800">All Years</option>
                  {academicYears.map((year) => (
                    <option key={year.id || year.name} value={year.name} className="text-gray-800">
                      {year.name} {year.is_current ? '(Current)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Months Filter */}
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-lg px-2.5 sm:px-3 py-1.5 min-w-0">
                <FaChartLine className="text-white/80 text-sm" />
                <label htmlFor="months-range" className="sr-only">Time Range</label>
                <select
                  id="months-range"
                  value={months}
                  onChange={(e) => setMonths(Number(e.target.value))}
                  className="bg-transparent text-white text-xs sm:text-sm border-0 focus:ring-1 focus:ring-white/50 py-1 min-w-0"
                >
                  <option value={3} className="text-gray-800">Last 3 Months</option>
                  <option value={6} className="text-gray-800">Last 6 Months</option>
                  <option value={12} className="text-gray-800">Last 12 Months</option>
                </select>
              </div>
              
              {/* Refresh Button */}
              <button
                type='button'
                onClick={handleRefresh}
                disabled={refreshing || loading}
                className='w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg bg-white text-emerald-700 text-xs sm:text-sm font-medium hover:bg-white/90 inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-colors whitespace-nowrap'
              >
                <FaSync className={refreshing ? 'animate-spin' : ''} /> 
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Period indicator */}
        <div className={combine('px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm flex flex-wrap items-center gap-2 border-b', get('bg', 'secondary'), get('border', 'primary'))}>
          <FaInfoCircle className={combine('text-xs', get('text', 'tertiary'))} />
          <span className={combine('font-medium', get('text', 'secondary'))}>Showing data for:</span>
          <span className={combine('font-semibold', get('text', 'primary'))}>
            {selectedYear || 'All Years'} • {monthNames[new Date().getMonth()]} {new Date().getFullYear()} 
            {months === 3 ? ' (Last 3 months)' : months === 6 ? ' (Last 6 months)' : ' (Last 12 months)'}
          </span>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className='p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm flex items-center gap-3'>
          <FaExclamationTriangle className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Key Stats Cards */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
        {/* Total Assigned Card */}
        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Total Assigned
              </p>
              <p className={combine('text-xl sm:text-2xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                <FaRupeeSign className="text-emerald-500 text-base sm:text-lg" />
                {compactCurrency(summaryCards.assigned)}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FaWallet className="text-lg sm:text-xl" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Total fees assigned to students
          </p>
        </div>

        {/* Total Collected Card */}
        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Total Collected
              </p>
              <p className={combine('text-xl sm:text-2xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                <FaRupeeSign className="text-green-500 text-base sm:text-lg" />
                {compactCurrency(summaryCards.collected)}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <FaCheckCircle className="text-lg sm:text-xl" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <FaArrowUp className="text-green-500 text-xs" />
            {summaryCards.rate.toFixed(1)}% collection rate
          </p>
        </div>

        {/* Total Pending Card */}
        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Total Pending
              </p>
              <p className={combine('text-xl sm:text-2xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                <FaRupeeSign className="text-yellow-500 text-base sm:text-lg" />
                {compactCurrency(summaryCards.pending)}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
              <FaClock className="text-lg sm:text-xl" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <FaArrowDown className="text-yellow-500 text-xs" />
            {summaryCards.dueStudents} students with dues
          </p>
        </div>

        {/* Concession Amount Card */}
        <div className={combine(
          'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex items-start justify-between">
            <div>
              <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                Total Concession
              </p>
              <p className={combine('text-xl sm:text-2xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                <FaRupeeSign className="text-purple-500 text-base sm:text-lg" />
                {compactCurrency(summaryCards.concession)}
              </p>
            </div>
            <div className="p-2.5 sm:p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FaUsers className="text-lg sm:text-xl" />
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Total concessions/scholarships
          </p>
        </div>
      </div>

      {/* Students Progress Card */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
            <FaUserGraduate className="text-sm" />
          </div>
          <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
            Student Fee Payment Progress
          </h3>
        </div>
        
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <div>
            <p className={combine('text-sm font-medium', get('text', 'secondary'))}>Students Paid</p>
            <p className={combine('text-xl sm:text-2xl font-bold flex items-center gap-2', get('text', 'primary'))}>
              {summaryCards.fullyPaidStudents} / {summaryCards.totalStudents}
              <span className={combine('text-xs sm:text-sm font-normal ml-2', get('text', 'tertiary'))}>
                ({summaryCards.studentsPaidPercent.toFixed(1)}%)
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
              <span className={combine('font-medium', get('text', 'secondary'))}>
                Paid: {summaryCards.fullyPaidStudents}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
              <span className={combine('font-medium', get('text', 'secondary'))}>
                Due: {summaryCards.dueStudents}
              </span>
            </div>
          </div>
        </div>
        
        <div className='h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'>
          <div
            className='h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500'
            style={{ width: `${Math.max(0, Math.min(100, summaryCards.studentsPaidPercent))}%` }}
          />
        </div>

        {/* Today's stats */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-4'>
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <FaMoneyBillWave className="text-green-600 dark:text-green-400 text-lg" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Today's Collection</p>
                <p className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                  {formatCurrency(summaryCards.todayCollected)}
                </p>
              </div>
            </div>
          </div>
          
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FaUsers className="text-blue-600 dark:text-blue-400 text-lg" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Today's Transactions</p>
                <p className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                  {summaryCards.todayTxns}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
        {/* Monthly Collection Trend */}
        <div className={combine('rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <FaChartLine className="text-sm" />
            </div>
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
              Monthly Collection Trend
            </h3>
          </div>
          
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={monthlyCollection} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey='month' 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Collected']}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => <span className={combine('text-sm', get('text', 'secondary'))}>{value}</span>}
                />
                <Line 
                  type='monotone' 
                  dataKey='collected' 
                  stroke='#10b981' 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                  name="Collection Amount"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Pending Classes */}
        <div className={combine('rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <FaClock className="text-sm" />
            </div>
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
              Top Pending Classes
            </h3>
          </div>
          
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={topPendingClasses} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey='class' 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                />
                <YAxis 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Pending Amount']}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => <span className={combine('text-sm', get('text', 'secondary'))}>{value}</span>}
                />
                <Bar dataKey='pending' fill='#f59e0b' name="Pending Amount" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Row Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
        {/* Fee Type Breakdown */}
        <div className={combine('rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <FaChartPie className="text-sm" />
            </div>
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
              Fee Type: Collected vs Pending
            </h3>
          </div>
          
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={feeTypeChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray='3 3' stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                <XAxis 
                  dataKey='fee_type' 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                  tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Amount']}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  formatter={(value) => <span className={combine('text-sm', get('text', 'secondary'))}>{value}</span>}
                />
                <Bar dataKey='collected' fill='#10b981' name="Collected" radius={[4, 4, 0, 0]} />
                <Bar dataKey='pending' fill='#f59e0b' name="Pending" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Mode Distribution */}
        <div className={combine('rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FaCreditCard className="text-sm" />
            </div>
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
              Payment Mode Distribution
            </h3>
          </div>
          
          <div className='h-72'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie 
                  data={paymentModeChartData} 
                  dataKey='amount' 
                  nameKey='mode' 
                  cx='50%' 
                  cy='50%' 
                  innerRadius={65} 
                  outerRadius={112} 
                  paddingAngle={2}
                  label={({ mode, percent }) => `${mode} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {paymentModeChartData.map((entry) => (
                    <Cell key={entry.mode} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [formatCurrency(value), 'Amount']}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  formatter={(value) => <span className={combine('text-sm', get('text', 'secondary'))}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className='mt-3 flex flex-wrap gap-2'>
            {paymentModeChartData.map((entry) => (
              <div
                key={entry.mode}
                className={combine('px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-2', get('bg', 'secondary'), get('border', 'primary'), get('text', 'secondary'))}
              >
                {getPaymentModeIcon(entry.mode)}
                <span className="font-medium">{entry.mode}</span>
                <span className={combine('font-semibold', get('text', 'primary'))}>{entry.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fee Status Distribution */}
      <div className={combine('rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400">
            <FaUsers className="text-sm" />
          </div>
          <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
            Fee Status Distribution
          </h3>
        </div>
        
        {statusChartData.length === 0 ? (
          <p className={combine('text-sm py-8 text-center', get('text', 'secondary'))}>
            No status distribution data available.
          </p>
        ) : (
          <>
            <div className='h-72'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie 
                    data={statusChartData} 
                    dataKey='value' 
                    nameKey='name' 
                    cx='50%' 
                    cy='50%' 
                    innerRadius={65} 
                    outerRadius={112} 
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [toNumber(value), 'Students']}
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value) => <span className={combine('text-sm', get('text', 'secondary'))}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className='mt-3 flex flex-wrap gap-2'>
              {statusChartData.map((entry) => (
                <div
                  key={entry.name}
                  className={combine('px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-2', get('bg', 'secondary'), get('border', 'primary'), get('text', 'secondary'))}
                >
                  {getStatusIcon(entry.name)}
                  <span className="font-medium">{entry.name}</span>
                  <span className={combine('font-semibold', get('text', 'primary'))}>{entry.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Audit Logs Section */}
      <div className={combine('rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden', get('bg', 'card'), get('border', 'primary'))}>
        <div className={combine(
          'p-4 sm:p-5 border-b bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-800 dark:to-purple-800',
          get('border', 'primary')
        )}>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur text-white">
                <FaHistory className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <div>
                <h2 className='text-xl sm:text-2xl font-bold text-white flex items-center gap-2'>
                  Fees Audit Trail
                </h2>
                <p className='text-xs sm:text-sm text-white/80'>
                  Comprehensive audit logs for all fee-related activities
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm bg-white/20 backdrop-blur rounded-lg px-2.5 sm:px-3 py-1.5">
              <FaInfoCircle className="text-xs" />
              <span>Source: audit/logs API</span>
            </div>
          </div>
        </div>

        {/* Audit Filters */}
        <div className={combine('p-4 sm:p-5 border-b', get('bg', 'secondary'), get('border', 'primary'))}>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3'>
            {/* Search Filter */}
            <div className={combine(
              'rounded-lg border px-3 py-2 inline-flex items-center gap-2 min-w-0',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <FaSearch className={combine('text-sm', get('text', 'tertiary'))} />
              <label htmlFor="audit-search" className="sr-only">Search audit logs</label>
              <input
                id="audit-search"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Search action, path, user..."
                className={combine('w-full text-xs sm:text-sm bg-transparent outline-none min-w-0', get('text', 'primary'))}
              />
            </div>

            {/* Academic Year Filter */}
            <div className={combine(
              'rounded-lg border px-3 py-2 inline-flex items-center gap-2 min-w-0',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <FaCalendarAlt className={combine('text-sm', get('text', 'tertiary'))} />
              <label htmlFor="audit-academic-year" className="sr-only">Academic Year</label>
              <select
                id="audit-academic-year"
                value={auditAcademicYear}
                onChange={(e) => setAuditAcademicYear(e.target.value)}
                className={combine('w-full text-xs sm:text-sm bg-transparent outline-none min-w-0', get('text', 'primary'))}
              >
                <option value=''>All Academic Years</option>
                {academicYears.map((year) => (
                  <option key={`audit-${year.id || year.name}`} value={year.name}>
                    {year.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div className={combine(
              'rounded-lg border px-3 py-2 inline-flex items-center gap-2 min-w-0',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <label htmlFor="audit-date-from" className={combine('text-xs sm:text-sm font-medium', get('text', 'tertiary'))}>From:</label>
              <input
                id="audit-date-from"
                type='date'
                value={auditDateFrom}
                onChange={(e) => setAuditDateFrom(e.target.value)}
                className={combine('w-full text-xs sm:text-sm bg-transparent outline-none min-w-0', get('text', 'primary'))}
              />
            </div>

            {/* Date To */}
            <div className={combine(
              'rounded-lg border px-3 py-2 inline-flex items-center gap-2 min-w-0',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <label htmlFor="audit-date-to" className={combine('text-xs sm:text-sm font-medium', get('text', 'tertiary'))}>To:</label>
              <input
                id="audit-date-to"
                type='date'
                value={auditDateTo}
                onChange={(e) => setAuditDateTo(e.target.value)}
                className={combine('w-full text-xs sm:text-sm bg-transparent outline-none min-w-0', get('text', 'primary'))}
              />
            </div>

            {/* Days Filter */}
            <div className={combine(
              'rounded-lg border px-3 py-2 inline-flex items-center gap-2 min-w-0',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <label htmlFor="audit-days" className={combine('text-xs sm:text-sm font-medium', get('text', 'tertiary'))}>Days:</label>
              <select
                id="audit-days"
                value={auditDays}
                onChange={(e) => setAuditDays(Number(e.target.value))}
                disabled={Boolean(auditDateFrom || auditDateTo)}
                className={combine(
                  'w-full text-xs sm:text-sm bg-transparent outline-none disabled:opacity-60 min-w-0',
                  get('text', 'primary')
                )}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>

          {/* Date range warning */}
          {(auditDateFrom && !auditDateTo) || (!auditDateFrom && auditDateTo) ? (
            <div className='mt-3 p-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-2'>
              <FaExclamationTriangle className="flex-shrink-0" />
              <span>Select both From and To dates to apply date-wise filtering. Otherwise day-wise filter is used.</span>
            </div>
          ) : null}
        </div>

        {/* Audit Summary Cards */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5'>
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FaHistory className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Total Events</p>
                <p className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>{auditSummary.total}</p>
              </div>
            </div>
          </div>
          
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <FaExclamationTriangle className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Failed Events</p>
                <p className={combine('text-lg sm:text-xl font-bold text-red-600 dark:text-red-400')}>{auditSummary.failed}</p>
              </div>
            </div>
          </div>
          
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <FaMoneyBillWave className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Payment Events</p>
                <p className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>{auditSummary.paymentOps}</p>
              </div>
            </div>
          </div>
          
          <div className={combine('rounded-lg p-3 sm:p-4 border', get('bg', 'secondary'), get('border', 'primary'))}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <FaUsers className="text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className={combine('text-xs', get('text', 'tertiary'))}>Config Events</p>
                <p className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>{auditSummary.configOps}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className='overflow-x-auto border-t' style={{ borderColor: theme === 'dark' ? '#374151' : '#e5e7eb' }}>
          {auditLoading ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>
                  Loading audit trail...
                </p>
                <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>
                  Preparing audit records
                </p>
              </div>
            </div>
          ) : auditError ? (
            <div className='p-4 m-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm flex items-center gap-3'>
              <FaExclamationTriangle className="flex-shrink-0" />
              {auditError}
            </div>
          ) : feesAuditLogs.length === 0 ? (
            <div className={combine('p-8 text-center text-sm', get('text', 'secondary'))}>
              No fees audit events found for selected period.
            </div>
          ) : (
            <table className='w-full min-w-[1120px] text-sm'>
              <thead className={combine('border-b', get('bg', 'secondary'), get('border', 'primary'))}>
                <tr>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Timestamp</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Action</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Severity</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Operation</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Payment Mode</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>User</th>
                  <th className={combine('text-left py-3 px-4 text-xs font-semibold', get('text', 'tertiary'))}>Details</th>
                </tr>
              </thead>
              <tbody>
                {feesAuditLogs.map((log) => {
                  const details = (log.details || {}) as Record<string, unknown>;
                  const operation = String(details.operation || '-');
                  const message = String(details.error || details.reason || details.message || '');
                  const highlights = getAuditHighlights(details);
                  const paymentMode = resolveAuditPaymentMode(details);
                  const responseStatus = toNumber(log.response_status);
                  const responseTone =
                    responseStatus >= 500 ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20' :
                    responseStatus >= 400 ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20' :
                    responseStatus >= 200 ? 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/20' : 'text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-900/20';
                  const severityTone =
                    log.severity === 'CRITICAL' ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20' :
                    log.severity === 'ERROR' ? 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/20' :
                    log.severity === 'SECURITY' ? 'text-amber-800 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20' :
                    log.severity === 'WARNING' ? 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/20' :
                    'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';

                  return (
                    <tr key={log.id} className={combine('border-b hover:bg-gray-50 dark:hover:bg-gray-800/50', get('border', 'primary'))}>
                      <td className={combine('py-3 px-4 whitespace-nowrap text-xs', get('text', 'secondary'))}>
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className='py-3 px-4'>
                        <span className='inline-flex px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'>
                          {log.action}
                        </span>
                      </td>
                      <td className='py-3 px-4'>
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${severityTone}`}>
                          {log.severity || 'INFO'}
                        </span>
                      </td>
                      <td className={combine('py-3 px-4 text-sm font-medium', get('text', 'primary'))}>{operation}</td>
                      <td className='py-3 px-4'>
                        <span className="inline-flex items-center gap-1.5">
                          {getPaymentModeIcon(paymentMode)}
                          <span className={combine('text-sm', get('text', 'secondary'))}>{paymentMode}</span>
                        </span>
                      </td>
                      <td className={combine('py-3 px-4 text-sm', get('text', 'secondary'))}>{log.user_name || 'System'}</td>
                      <td className='py-3 px-4'>
                        <div className='space-y-2 max-w-xs'>
                          {message ? (
                            <p className={combine('text-xs p-2 rounded', responseTone)}>{message}</p>
                          ) : null}

                          {highlights.length > 0 && (
                            <div className='flex flex-wrap gap-1.5'>
                              {highlights.map((item) => (
                                <span
                                  key={`${log.id}-${item.key}`}
                                  className={combine('inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs', get('bg', 'secondary'), get('border', 'primary'), get('text', 'secondary'))}
                                >
                                  <span className={combine('font-medium', get('text', 'primary'))}>{item.label}:</span>
                                  <span>{item.value}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        <div className={combine('p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3', get('bg', 'secondary'), get('border', 'primary'))}>
          <p className={combine('text-xs', get('text', 'tertiary'))}>
            Showing page {auditPage} of {auditTotalPages} • {feesAuditLogs.length} events • Total {auditTotal} records
          </p>
          
          {auditTotalPages > 1 && (
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
                disabled={auditPage <= 1 || auditLoading}
                className={combine(
                  'px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1 disabled:opacity-60 hover:bg-gray-100 dark:hover:bg-gray-800',
                  get('bg', 'card'),
                  get('border', 'primary'),
                  get('text', 'primary')
                )}
              >
                <FaChevronLeft className='text-[10px]' /> Prev
              </button>
              <span className={combine('text-sm px-2 font-medium', get('text', 'primary'))}>
                {auditPage} / {auditTotalPages}
              </span>
              <button
                type='button'
                onClick={() => setAuditPage((prev) => Math.min(auditTotalPages, prev + 1))}
                disabled={auditPage >= auditTotalPages || auditLoading}
                className={combine(
                  'px-3 py-1.5 rounded-lg border text-xs inline-flex items-center gap-1 disabled:opacity-60 hover:bg-gray-100 dark:hover:bg-gray-800',
                  get('bg', 'card'),
                  get('border', 'primary'),
                  get('text', 'primary')
                )}
              >
                Next <FaChevronRight className='text-[10px]' />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
