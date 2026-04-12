// app/teacher/salary/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  FaMoneyBill,
  FaCalendarAlt,
  FaChartLine,
  FaDownload,
  FaPrint,
  FaFileInvoice,
  FaSync,
  FaCalculator,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaHistory,
  FaCreditCard,
  FaReceipt,
  FaPercentage,
  FaUserTie,
  FaChalkboardTeacher,
  FaSchool
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { teacherApi } from '@/lib/api';
import { toastError, toastInfo } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface SalaryData {
  month: string;
  structure: {
    base_salary: number;
    per_day_wage: number;
  };
  attendance: {
    worked: number;
    absent: number;
    late: number;
  };
  deductions: {
    absent_amount: number;
    late_amount: number;
    total_cut: number;
  };
  net_payable: number;
  payment_status?: {
    status: string;
    transaction_id?: string | null;
    payment_date?: string | null;
    bank_reference?: string | null;
  };
}

type TeacherProfile = {
  department?: string | null;
  department_name?: string | null;
};

export default function TeacherSalaryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const didInitLoadRef = useRef(false);
  const initialMonth = new Date().getMonth() + 1;
  const initialYear = new Date().getFullYear();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noDataMessage, setNoDataMessage] = useState<string | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [draftMonth, setDraftMonth] = useState(initialMonth);
  const [draftYear, setDraftYear] = useState(initialYear);
  const [appliedMonth, setAppliedMonth] = useState(initialMonth);
  const [appliedYear, setAppliedYear] = useState(initialYear);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [salaryTimeline, setSalaryTimeline] = useState<Array<{ month: string; net_payable: number; payment_status?: SalaryData['payment_status'] }>>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const months = useMemo(() => ([
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]), []);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine('rounded-2xl p-6 border shadow-lg', get('border', 'primary'));
    if (color === 'blue') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/20' : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/20' : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/20' : 'from-white to-amber-50');
    }
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/20' : 'from-white to-indigo-50');
  };

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium border text-xs sm:text-sm',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const extractApiError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;
    if (typeof responseData?.error === 'string') return responseData.error;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (typeof responseData?.detail === 'string') return responseData.detail;
    if (responseData && typeof responseData === 'object') {
      const values = Object.values(responseData).flat().filter(Boolean);
      if (values.length) return values.map((value) => String(value)).join(', ');
    }
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  };

  const extractApiMessage = (payload: any, fallback = '') => {
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
    return fallback;
  };

  const resolveApiPayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined && payload.data !== null) {
      return payload.data as T;
    }
    return payload as T;
  };

  const getStatusFallbackMessage = (status?: number) => {
    if (status === 400) return 'Salary structure has not been configured. Please contact the administration.';
    if (status === 403) return 'Teacher profile not found. Please complete your profile setup.';
    if (status === 404) return 'Salary information is not available for the selected month/year.';
    return 'Failed to load salary data. Please try again.';
  };

  const normalizeSalaryData = (payload: any): SalaryData => ({
    ...payload,
    structure: {
      base_salary: Number(payload?.structure?.base_salary || 0),
      per_day_wage: Number(payload?.structure?.per_day_wage || 0),
    },
    deductions: {
      absent_amount: Number(payload?.deductions?.absent_amount || 0),
      late_amount: Number(payload?.deductions?.late_amount || 0),
      total_cut: Number(payload?.deductions?.total_cut || 0),
    },
    net_payable: Number(payload?.net_payable || 0),
    payment_status: payload?.payment_status || undefined,
  });

  const isSalaryLike = (value: any) => {
    if (!value || typeof value !== 'object') return false;
    return (
      'net_payable' in value ||
      'structure' in value ||
      'attendance' in value ||
      'deductions' in value
    );
  };

  const unwrapSalaryDashboardResponse = (responseData: any) => {
    const candidates = [responseData?.data?.data, responseData?.data, responseData];
    for (const candidate of candidates) {
      if (isSalaryLike(candidate)) return candidate;
    }
    return null;
  };

  const loadTeacherProfile = async () => {
    try {
      const response = await teacherApi.profile.get();
      const payload = resolveApiPayload<any>(response?.data);
      setTeacherProfile(payload as TeacherProfile);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401) {
        logout();
        router.push('/');
      }
    }
  };

  const getRecentMonthYearPairs = (count = 6) => {
    const now = new Date();
    const pairs: Array<{ month: number; year: number; label: string }> = [];
    for (let i = 0; i < count; i += 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      pairs.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `${months[d.getMonth()]} ${d.getFullYear()}`,
      });
    }
    return pairs;
  };

  const loadRecentSalaryTimeline = async () => {
    try {
      setTimelineLoading(true);
      const targets = getRecentMonthYearPairs(6);
      const responses = await Promise.all(
        targets.map(async (item) => {
          try {
            const res = await teacherApi.salary.dashboard({ month: item.month, year: item.year });
            const unwrapped = unwrapSalaryDashboardResponse(res?.data);
            if (unwrapped) {
              const normalized = normalizeSalaryData(unwrapped);
              return {
                month: item.label,
                net_payable: normalized.net_payable,
                payment_status: normalized.payment_status,
              };
            }
            return null;
          } catch {
            return null;
          }
        })
      );
      setSalaryTimeline(responses.filter(Boolean) as Array<{ month: string; net_payable: number; payment_status?: SalaryData['payment_status'] }>);
    } finally {
      setTimelineLoading(false);
    }
  };

  // Load teacher salary data
  const loadTeacherSalaryData = async (override?: { month: number; year: number }) => {
    const targetMonth = override?.month ?? appliedMonth;
    const targetYear = override?.year ?? appliedYear;
    try {
      setIsRefreshing(true);
      setError(null);
      setNoDataMessage(null);

      const response = await teacherApi.salary.dashboard({
        month: targetMonth,
        year: targetYear,
      });
      const raw = response?.data;
      const unwrapped = unwrapSalaryDashboardResponse(raw);
      if (!unwrapped) {
        const message = extractApiMessage(raw, 'Salary data is not available for the selected month/year.');
        setSalaryData(null);
        setNoDataMessage(message);
        return;
      }

      setSalaryData(normalizeSalaryData(unwrapped));

    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 401) {
        logout();
        router.push('/');
        return;
      }

      const fallback = getStatusFallbackMessage(status);
      const message = extractApiError(err, fallback);
      const normalizedMessage = message.trim() || fallback;

      // Treat "no data" style 404s as an empty-state instead of a hard error.
      if (
        status === 404 &&
        /no\s+(salary|record|data)|not\s+available|not\s+found/i.test(normalizedMessage)
      ) {
        setSalaryData(null);
        setNoDataMessage(normalizedMessage);
      } else {
        setError(normalizedMessage);
      }
      toastError(normalizedMessage);
    } finally {
      setIsRefreshing(false);
      if (!didInitLoadRef.current) {
        didInitLoadRef.current = true;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/');
      return;
    }
    if (user?.user_type !== 'teacher') {
      router.push(`/${user?.user_type}`);
      return;
    }

    // Always start with current month salary on first load.
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    setDraftMonth(currentMonth);
    setDraftYear(currentYear);
    setAppliedMonth(currentMonth);
    setAppliedYear(currentYear);

    void loadTeacherSalaryData({ month: currentMonth, year: currentYear });
    void loadRecentSalaryTimeline();
    void loadTeacherProfile();
  }, [isLoading, isAuthenticated, user, router]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Calculate percentage
  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(2);
  };

  // Calculate per day earnings
  const calculatePerDayEarnings = () => {
    if (!salaryData || salaryData.attendance.worked === 0) return 0;
    return salaryData.net_payable / salaryData.attendance.worked;
  };

  const getPaymentStatusBadge = (status?: string) => {
    const normalized = (status || 'pending').toLowerCase();
    const styleMap: Record<string, string> = {
      processed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      cancelled: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styleMap[normalized] || styleMap.pending}`}>
        {normalized.charAt(0).toUpperCase() + normalized.slice(1)}
      </span>
    );
  };

  // Generate payslip PDF
  const generatePayslip = async () => {
    try {
      // This would call a separate API endpoint for PDF generation
      // For now, we'll just show an alert
      toastInfo('Payslip generation feature will be available soon!');
    } catch (error) {
      console.error('Error generating payslip:', error);
      toastError('Failed to generate payslip. Please try again.');
    }
  };

  // Get attendance color based on percentage
  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 75) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className={combine(getCardGradientClass('blue'), 'flex items-center justify-center py-16 text-center')}>
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        {/* HEADER */}
        <div
          className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white',
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-700 to-blue-800'
              : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
        >
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                <FaMoneyBill className="text-2xl sm:text-3xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Salary</h1>
                <p className="text-xs sm:text-sm text-blue-100">View and manage your monthly salary details</p>
              </div>
            </div>

            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => window.print()}
                className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2')}
              >
                <FaPrint /> Print
              </button>
              <button
                onClick={generatePayslip}
                className={combine(getPrimaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2')}
                disabled={!salaryData}
              >
                <FaDownload /> Download Payslip
              </button>
            </div>
          </div>
        </div>

      {/* TEACHER PROFILE BAR */}
        <div className={getCardGradientClass('blue')}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={combine('p-2.5 sm:p-3 rounded-xl sm:rounded-2xl', theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100')}>
                <FaUserTie className={combine('text-2xl sm:text-3xl', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
              </div>
              <div className="min-w-0">
                <h2 className={combine('font-bold text-sm sm:text-base', get('text', 'primary'))}>
                  {user?.full_name || 'Teacher'}
                </h2>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  Teacher ID: {user?.username || 'N/A'}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Department</p>
              <p className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>
                {teacherProfile?.department || teacherProfile?.department_name || user?.department || 'Not specified'}
              </p>
            </div>
          </div>
        </div>

      {/* FILTERS */}
        <div className={getCardGradientClass('blue')}>
          <div className="flex items-center gap-2 mb-4">
            <FaFilter className={combine('text-sm', get('accent', 'primary'))} />
            <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filter Salary</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4 items-end">
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Month</label>
              <select
                value={draftMonth}
                onChange={(e) => setDraftMonth(parseInt(e.target.value))}
                className={getInputClass()}
                disabled={isRefreshing}
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Year</label>
              <select
                value={draftYear}
                onChange={(e) => setDraftYear(parseInt(e.target.value))}
                className={getInputClass()}
                disabled={isRefreshing}
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  setAppliedMonth(draftMonth);
                  setAppliedYear(draftYear);
                  void loadTeacherSalaryData({ month: draftMonth, year: draftYear });
                }}
                disabled={isRefreshing}
                className={combine(getPrimaryButtonClass(), 'disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2')}
              >
                <FaSync className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Loading...' : 'view salary'}
              </button>
              <button
                onClick={() => {
                  const currentMonth = new Date().getMonth() + 1;
                  const currentYear = new Date().getFullYear();
                  setDraftMonth(currentMonth);
                  setDraftYear(currentYear);
                  setAppliedMonth(currentMonth);
                  setAppliedYear(currentYear);
                  void loadTeacherSalaryData({ month: currentMonth, year: currentYear });
                }}
                className={combine(getSecondaryButtonClass(), 'flex items-center justify-center')}
                disabled={isRefreshing}
              >
                Current Month
              </button>
            </div>
          </div>
        </div>

      {/* ERROR STATE */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={combine(
            'mt-8 border px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg',
            theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700'
          )}
        >
          <div className="p-3 bg-red-100 rounded-xl">
            <FaExclamationTriangle className="text-2xl text-red-600" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold">Unable to Load Salary Data</h4>
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
          <button
            onClick={() => void loadTeacherSalaryData({ month: appliedMonth, year: appliedYear })}
            className={combine('px-4 py-2 rounded-lg text-white', theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700')}
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* SALARY OVERVIEW */}
      {salaryData && (
        <>
          {/* NET PAYABLE CARD */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={combine('rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-xl', theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600')}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2">
                  <FaMoneyBill className="text-yellow-300" />
                  Salary for {months[appliedMonth - 1]} {appliedYear}
                </h2>
                <p className="text-blue-100 mt-2 text-xs sm:text-sm">
                  Net Payable Amount (After all deductions)
                </p>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-bold">
                    {formatCurrency(salaryData.net_payable)}
                  </span>
                  <span className="text-blue-200 text-xs sm:text-sm pb-1">
                    {calculatePercentage(salaryData.net_payable, salaryData.structure.base_salary)}% of base salary
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-6 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span>Base: {formatCurrency(salaryData.structure.base_salary)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span>Deductions: {formatCurrency(salaryData.deductions.total_cut)}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg mb-3">
                  <FaCalendarAlt />
                  <span>Salary Month: {salaryData.month}</span>
                </div>
                <p className="text-blue-200 text-xs sm:text-sm">
                  <FaChalkboardTeacher className="inline mr-1" />
                  Teacher Salary • Credited by 5th of next month
                </p>
              </div>
            </div>
          </motion.div>

          {/* SALARY BREAKDOWN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* SALARY STRUCTURE */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={getCardGradientClass('blue')}
            >
              <h3 className={combine('text-base sm:text-lg font-bold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                <FaFileInvoice className={combine('text-sm sm:text-base', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
                Salary Structure
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Base Salary</span>
                    <p className={combine('text-xs', get('text', 'tertiary'))}>
                      Monthly fixed salary
                    </p>
                  </div>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(salaryData.structure.base_salary)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Per Day Wage</span>
                    <p className={combine('text-xs', get('text', 'tertiary'))}>
                      Based on working days
                    </p>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(salaryData.structure.per_day_wage)}
                  </span>
                </div>
                <div className={combine('pt-4 border-t', get('border', 'secondary'))}>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    <FaSchool className="inline mr-1" />
                    Calculated as per school policy
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ATTENDANCE SUMMARY */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={getCardGradientClass('emerald')}
            >
              <h3 className={combine('text-base sm:text-lg font-bold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                <FaChartLine className={combine('text-sm sm:text-base', theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600')} />
                Teaching Attendance
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Days Worked</span>
                  </div>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {salaryData.attendance.worked} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Days Absent</span>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {salaryData.attendance.absent} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Late Arrivals</span>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    {salaryData.attendance.late} times
                  </span>
                </div>
                <div className={combine('pt-4 border-t', get('border', 'secondary'))}>
                  <div className="flex justify-between mb-2">
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Teaching Attendance Rate</span>
                    <span className={`text-sm font-bold ${getAttendanceColor(
                      parseFloat(calculatePercentage(salaryData.attendance.worked, 
                        salaryData.attendance.worked + salaryData.attendance.absent))
                    )}`}>
                      {calculatePercentage(salaryData.attendance.worked, 
                        salaryData.attendance.worked + salaryData.attendance.absent)}%
                    </span>
                  </div>
                  <div className={combine('w-full rounded-full h-2', get('bg', 'tertiary'))}>
                    <div 
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${calculatePercentage(salaryData.attendance.worked, 
                          salaryData.attendance.worked + salaryData.attendance.absent)}%`,
                        backgroundColor: parseFloat(calculatePercentage(salaryData.attendance.worked, 
                          salaryData.attendance.worked + salaryData.attendance.absent)) >= 90 ? 
                          '#10b981' : parseFloat(calculatePercentage(salaryData.attendance.worked, 
                          salaryData.attendance.worked + salaryData.attendance.absent)) >= 75 ? 
                          '#f59e0b' : '#ef4444'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* DEDUCTIONS */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={getCardGradientClass('amber')}
            >
              <h3 className={combine('text-base sm:text-lg font-bold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                <FaCalculator className={combine('text-sm sm:text-base', theme === 'dark' ? 'text-amber-300' : 'text-amber-600')} />
                Salary Deductions
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Absent Days</span>
                    <p className={combine('text-xs', get('text', 'tertiary'))}>
                      {salaryData.attendance.absent} day{salaryData.attendance.absent !== 1 ? 's' : ''} × {formatCurrency(salaryData.structure.per_day_wage)}
                    </p>
                  </div>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    -{formatCurrency(salaryData.deductions.absent_amount)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <div>
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Late Arrivals</span>
                    <p className={combine('text-xs', get('text', 'tertiary'))}>
                      {salaryData.attendance.late} time{salaryData.attendance.late !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <span className="font-bold text-amber-600 dark:text-amber-400">
                    -{formatCurrency(salaryData.deductions.late_amount)}
                  </span>
                </div>
                <div className={combine('pt-4 border-t', get('border', 'secondary'))}>
                  <div className="flex justify-between items-center">
                    <span className={combine('font-bold', get('text', 'primary'))}>Total Deductions</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-lg">
                      -{formatCurrency(salaryData.deductions.total_cut)}
                    </span>
                  </div>
                  <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
                    {calculatePercentage(salaryData.deductions.total_cut, salaryData.structure.base_salary)}% of base salary
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

	          {/* DETAILED CALCULATION */}
	          <div className={combine(getCardGradientClass('amber'), 'p-0 overflow-hidden')}>
	            <div className={combine('p-4 sm:p-6 border-b', get('border', 'secondary'))}>
	              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
	                <h3 className={combine('text-base sm:text-lg font-bold flex items-center gap-2', get('text', 'primary'))}>
	                  <FaReceipt className={combine('text-sm sm:text-base', theme === 'dark' ? 'text-amber-300' : 'text-amber-600')} />
	                  Detailed Salary Calculation
	                </h3>
	                <button
	                  onClick={() => setShowDetails(!showDetails)}
	                  className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center')}
	                >
	                  {showDetails ? 'Hide Details' : 'Show Details'}
	                </button>
	              </div>
	            </div>

	            {showDetails && (
	              <motion.div 
	                initial={{ opacity: 0, height: 0 }}
	                animate={{ opacity: 1, height: 'auto' }}
	                exit={{ opacity: 0, height: 0 }}
	                className="p-4 sm:p-6"
	              >
                <div className={combine('overflow-x-auto rounded-lg border', get('border', 'primary'))}>
	                  <table className="w-full">
                    <thead className={get('bg', 'secondary')}>
                      <tr>
                        <th className={combine('px-3 sm:px-6 py-3 text-left text-[11px] sm:text-xs font-medium uppercase tracking-wider whitespace-nowrap', get('text', 'secondary'))}>
                          Component
                        </th>
                        <th className={combine('px-3 sm:px-6 py-3 text-left text-[11px] sm:text-xs font-medium uppercase tracking-wider whitespace-nowrap', get('text', 'secondary'))}>
                          Calculation
                        </th>
                        <th className={combine('px-3 sm:px-6 py-3 text-left text-[11px] sm:text-xs font-medium uppercase tracking-wider whitespace-nowrap', get('text', 'secondary'))}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {/* Base Salary */}
                      <tr className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2">
                            <FaCheckCircle className="text-sm sm:text-base text-green-500" />
                            <span className={combine('text-xs sm:text-sm whitespace-nowrap', get('text', 'primary'))}>Base Salary</span>
                          </div>
                        </td>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm', get('text', 'secondary'))}>
                          Fixed monthly teaching salary
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-green-600 dark:text-green-400 whitespace-nowrap">
                          + {formatCurrency(salaryData.structure.base_salary)}
                        </td>
                      </tr>
                      
                      {/* Absent Deduction */}
                      <tr className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2">
                            <FaTimesCircle className="text-sm sm:text-base text-red-500" />
                            <span className={combine('text-xs sm:text-sm whitespace-nowrap', get('text', 'primary'))}>Absent Days</span>
                          </div>
                        </td>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm', get('text', 'secondary'))}>
                          {salaryData.attendance.absent} day{salaryData.attendance.absent !== 1 ? 's' : ''} × {formatCurrency(salaryData.structure.per_day_wage)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                          - {formatCurrency(salaryData.deductions.absent_amount)}
                        </td>
                      </tr>
                      
                      {/* Late Deduction */}
                      <tr className="hover:bg-[var(--color-bg-hover)]">
                        <td className="px-3 sm:px-6 py-3 sm:py-4">
                          <div className="flex items-center gap-2">
                            <FaTimesCircle className="text-sm sm:text-base text-amber-500" />
                            <span className={combine('text-xs sm:text-sm whitespace-nowrap', get('text', 'primary'))}>Late Arrivals</span>
                          </div>
                        </td>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm', get('text', 'secondary'))}>
                          {salaryData.attendance.late} late arrival{salaryData.attendance.late !== 1 ? 's' : ''}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                          - {formatCurrency(salaryData.deductions.late_amount)}
                        </td>
                      </tr>
                      
                      {/* Total Deduction */}
                      <tr className={combine(get('bg', 'secondary'), 'font-semibold')}>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap', get('text', 'primary'))}>
                          Total Deductions
                        </td>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm', get('text', 'secondary'))}>
                          Sum of all deductions
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                          - {formatCurrency(salaryData.deductions.total_cut)}
                        </td>
                      </tr>
                      
                      {/* Net Payable */}
                      <tr className={combine('bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 font-bold', get('border', 'primary'))}>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm whitespace-nowrap', get('text', 'primary'))}>
                          Net Payable Amount
                        </td>
                        <td className={combine('px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm', get('text', 'secondary'))}>
                          Base Salary - Total Deductions
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-green-600 dark:text-green-400 text-sm sm:text-lg whitespace-nowrap">
                          = {formatCurrency(salaryData.net_payable)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                
                {/* Summary */}
                <div className={combine('mt-6 p-4 rounded-lg border', get('bg', 'secondary'), get('border', 'primary'))}>
                  <div className="flex items-center gap-2 mb-4">
                    <FaPercentage className="text-sm sm:text-base text-blue-600" />
                    <span className={combine('font-medium', get('text', 'primary'))}>Summary</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Deduction Percentage</p>
                      <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                        {calculatePercentage(salaryData.deductions.total_cut, salaryData.structure.base_salary)}%
                      </p>
                    </div>
                    <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Net Salary Percentage</p>
                      <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                        {calculatePercentage(salaryData.net_payable, salaryData.structure.base_salary)}%
                      </p>
                    </div>
                    <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Effective Daily Rate</p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(calculatePerDayEarnings())}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

	          {/* PAYMENT INFORMATION */}
	          <div className={getCardGradientClass('blue')}>
	            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
	              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg self-start">
	                <FaCreditCard className="text-blue-600 dark:text-blue-400 text-2xl sm:text-3xl" />
	              </div>
	              <div className="flex-1">
	                <h3 className={combine('text-base sm:text-lg font-bold mb-2', get('text', 'primary'))}>Payment Information</h3>
	                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Payment Method</p>
                    <p className={combine('font-medium', get('text', 'primary'))}>Bank Transfer</p>
                  </div>
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Credited By</p>
                    <p className={combine('font-medium', get('text', 'primary'))}>5th of every month</p>
                  </div>
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Payment Status</p>
                    {getPaymentStatusBadge(salaryData.payment_status?.status)}
                  </div>
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Transaction ID</p>
                    <p className={combine('font-medium break-all', get('text', 'primary'))}>
                      {salaryData.payment_status?.transaction_id || 'Not available yet'}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Payment Date</p>
                    <p className={combine('font-medium', get('text', 'primary'))}>
                      {salaryData.payment_status?.payment_date
                        ? new Date(salaryData.payment_status.payment_date).toLocaleString('en-IN')
                        : 'Not credited yet'}
                    </p>
                  </div>
                  <div className={combine('p-3 rounded-lg border', get('bg', 'card'), get('border', 'primary'))}>
                    <p className={combine(get('text', 'secondary'))}>Bank Reference</p>
                    <p className={combine('font-medium break-all', get('text', 'primary'))}>
                      {salaryData.payment_status?.bank_reference || 'Pending'}
                    </p>
                  </div>
                </div>
                <div className={combine('mt-4 p-3 rounded-lg border', get('bg', 'secondary'), get('border', 'primary'))}>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    <FaExclamationTriangle className="inline mr-2 text-amber-500" />
                    Note: Any discrepancies in salary calculation should be reported to the HR department within 7 days of receiving payment.
                  </p>
                </div>
              </div>
            </div>
          </div>

	        

	          {/* RECENT SNAPSHOTS */}
	          <div className={getCardGradientClass('blue')}>
	            <div className="flex items-center justify-between mb-4">
	              <h3 className={combine('text-base sm:text-lg font-bold flex items-center gap-2', get('text', 'primary'))}>
	                <FaHistory className={combine('text-sm sm:text-base', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
	                Recent Salary Snapshots
	              </h3>
	              {timelineLoading && (
	                <span className={combine('text-xs', get('text', 'secondary'))}>Loading...</span>
	              )}
	            </div>
	            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
	              {salaryTimeline.map((item) => (
	                <div key={item.month} className={combine('rounded-xl sm:rounded-2xl border p-4 bg-gradient-to-br', get('border', 'primary'), theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50')}>
	                  <div className="flex items-center justify-between mb-2">
	                    <p className={combine('text-xs sm:text-sm font-medium', get('text', 'primary'))}>{item.month}</p>
	                    {getPaymentStatusBadge(item.payment_status?.status)}
	                  </div>
	                  <p className={combine('text-xl sm:text-2xl font-bold', get('text', 'primary'))}>
	                    {formatCurrency(item.net_payable)}
	                  </p>
	                  <p className={combine('text-xs mt-1', get('text', 'secondary'))}>
	                    {item.payment_status?.payment_date
	                      ? `Paid on ${new Date(item.payment_status.payment_date).toLocaleDateString('en-IN')}`
	                      : 'Payment not credited yet'}
	                  </p>
	                </div>
	              ))}
	            </div>
	            {!timelineLoading && salaryTimeline.length === 0 && (
	              <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>No recent salary records available.</p>
	            )}
	          </div>
        </>
      )}

      {/* NO SALARY DATA */}
      {!salaryData && !error && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={combine(getCardGradientClass('blue'), 'text-center')}
        >
          <FaMoneyBill className={combine('text-4xl mx-auto mb-4', get('text', 'muted'))} />
          <h3 className={combine('text-base sm:text-lg font-semibold mb-2', get('text', 'primary'))}>
            No Salary Data Available
          </h3>
          <p className={combine('text-xs sm:text-sm mb-6 max-w-md mx-auto', get('text', 'secondary'))}>
            {noDataMessage ||
              `Salary data for ${months[appliedMonth - 1]} ${appliedYear} is not available yet. Please check back later or contact administration if you believe this is an error.`}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => void loadTeacherSalaryData({ month: appliedMonth, year: appliedYear })}
              className={combine(getPrimaryButtonClass(), 'flex items-center justify-center gap-2')}
            >
              <FaSync /> Refresh
            </button>
            <button
              onClick={() => {
                const currentMonth = new Date().getMonth() + 1;
                const currentYear = new Date().getFullYear();
                setDraftMonth(currentMonth);
                setDraftYear(currentYear);
                setAppliedMonth(currentMonth);
                setAppliedYear(currentYear);
                void loadTeacherSalaryData({ month: currentMonth, year: currentYear });
              }}
              className={getSecondaryButtonClass()}
            >
              Current Month
            </button>
          </div>
        </motion.div>
      )}
      </div>
    </div>
  );
}
