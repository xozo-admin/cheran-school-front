'use client';

import { adminApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SalaryReportsPanel from '../reports/SalaryReportsPanel';
import { 
  FaChartLine, 
  FaRupeeSign, 
  FaUsers, 
  FaExclamationTriangle, 
  FaSync, 
  FaHistory,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaPrint,
  FaWallet,
  FaUserTie,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaHourglassHalf,
  FaTimesCircle,
  FaMoneyBillWave,
  FaArrowUp,
  FaArrowDown,
  FaInfoCircle
} from 'react-icons/fa';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type SalaryCardStats = {
  month: number;
  year: number;
  pending_payments_count: number;
  processed_payments_count: number;
  failed_payments_count: number;
  staff_total_payable: number;
  teacher_total_payable: number;
  total_payable_amount: number;
};

type SalarySummary = {
  month: number;
  year: number;
  staff: {
    total_count: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
  };
  teachers: {
    total_count: number;
    processed_count: number;
    pending_count: number;
    failed_count: number;
    total_amount: number;
  };
  grand_total: number;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value: unknown) =>
  `₹${toNumber(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function SalaryDashboardPage() {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [cards, setCards] = useState<SalaryCardStats | null>(null);
  const [summary, setSummary] = useState<SalarySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    const [cardsRes, summaryRes] = await Promise.allSettled([
      adminApi.salary.payments.cardsOverview({ month, year }),
      adminApi.salary.payments.summary({ month, year }),
    ]);

    let failed = false;

    if (cardsRes.status === 'fulfilled') {
      setCards(cardsRes.value?.data?.data || null);
    } else {
      failed = true;
      setCards(null);
    }

    if (summaryRes.status === 'fulfilled') {
      setSummary(summaryRes.value?.data?.data || null);
    } else {
      failed = true;
      setSummary(null);
    }

    if (failed) setError('Unable to load complete salary dashboard data.');

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [month, year]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const payoutMix = useMemo(() => {
    const staff = toNumber(cards?.staff_total_payable);
    const teacher = toNumber(cards?.teacher_total_payable);
    const total = Math.max(staff + teacher, 1);
    return {
      staffPct: (staff / total) * 100,
      teacherPct: (teacher / total) * 100,
      staffAmount: staff,
      teacherAmount: teacher
    };
  }, [cards]);

  const statusChartData = useMemo(() => ([
    { name: 'Processed', value: toNumber(cards?.processed_payments_count), color: '#10b981' },
    { name: 'Pending', value: toNumber(cards?.pending_payments_count), color: '#f59e0b' },
    { name: 'Failed', value: toNumber(cards?.failed_payments_count), color: '#ef4444' },
  ]), [cards]);

  const splitChartData = useMemo(() => ([
    {
      name: 'Staff',
      total: toNumber(summary?.staff?.total_amount),
      processed: toNumber((summary?.staff as any)?.processed_amount || 0),
      pending: toNumber((summary?.staff as any)?.pending_amount || 0),
      failed: toNumber((summary?.staff as any)?.failed_amount || 0),
    },
    {
      name: 'Teachers',
      total: toNumber(summary?.teachers?.total_amount),
      processed: toNumber((summary?.teachers as any)?.processed_amount || 0),
      pending: toNumber((summary?.teachers as any)?.pending_amount || 0),
      failed: toNumber((summary?.teachers as any)?.failed_amount || 0),
    },
  ]), [summary]);

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'processed': return <FaCheckCircle className="text-green-500" />;
      case 'pending': return <FaHourglassHalf className="text-yellow-500" />;
      case 'failed': return <FaTimesCircle className="text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className={combine('dashboard-typography p-3 md:p-4 xl:p-6 space-y-4 sm:space-y-6 min-h-screen', get('bg', 'primary'))}>
      {/* Header with navigation tabs */}
      <div className={combine(
        'rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden',
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className={combine('text-base sm:text-lg font-semibold flex items-center gap-2', get('text', 'primary'))}>
            <FaMoneyBillWave className="text-emerald-500 text-base sm:text-lg" />
            Salary Management
          </h2>
          <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
            View and manage salary payments for staff and teachers
          </p>
        </div>
        <nav className='flex flex-wrap gap-1.5 p-2 sm:p-3'>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={combine(
              'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all',
              activeTab === 'dashboard'
                ? 'bg-emerald-500 text-white shadow-md'
                : combine('text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800', get('bg', 'card'))
            )}
          >
            <FaChartLine className='text-sm' /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={combine(
              'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-xs sm:text-sm whitespace-nowrap flex items-center gap-2 transition-all',
              activeTab === 'reports'
                ? 'bg-emerald-500 text-white shadow-md'
                : combine('text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800', get('bg', 'card'))
            )}
          >
            <FaHistory className='text-sm' /> Salary Reports
          </button>
        </nav>
      </div>

      {activeTab === 'reports' ? (
        <SalaryReportsPanel embedded />
      ) : (
        <>
          {/* Header with title and filters */}
          <div className={combine(
            'rounded-xl sm:rounded-2xl border shadow-md overflow-hidden',
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className={combine(
              'p-4 sm:p-5 border-b',
              get('border', 'primary')
            )}>
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <FaChartLine className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h1 className='text-xl sm:text-2xl font-bold flex items-center gap-2'>
                      Salary Dashboard
                    </h1>
                    <p className='text-xs sm:text-sm mt-0.5 text-gray-500 dark:text-gray-400'>
                      Monthly salary overview and analytics
                    </p>
                  </div>
                </div>
                <div className='flex flex-wrap items-stretch sm:items-center gap-2 w-full md:w-auto'>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 min-w-0 w-full sm:w-auto">
                    <FaCalendarAlt className={combine('text-sm ml-2', get('text', 'tertiary'))} />
                    <select 
                      value={month} 
                      onChange={(e) => setMonth(Number(e.target.value))} 
                      className={combine(
                        'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm border-0 bg-transparent focus:ring-1 focus:ring-emerald-500 min-w-0',
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
                        'px-2.5 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm border-0 bg-transparent focus:ring-1 focus:ring-emerald-500 min-w-0',
                        get('text', 'primary')
                      )}
                      aria-label="Select year"
                    >
                      {Array.from({ length: 6 }, (_, i) => now.getFullYear() - 3 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => loadData(true)} 
                    disabled={loading || refreshing} 
                    className='w-full sm:w-auto px-3 sm:px-4 py-2 rounded-lg text-white text-xs sm:text-sm font-medium bg-emerald-600 hover:bg-emerald-700 inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-colors whitespace-nowrap'
                  >
                    <FaSync className={refreshing ? 'animate-spin' : ''} /> 
                    {refreshing ? 'Refreshing...' : 'Refresh Data'}
                  </button>
                </div>
              </div>
            </div>

            {/* Period indicator */}
            <div className={combine('px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm flex flex-wrap items-center gap-2', get('bg', 'secondary'))}>
              <FaInfoCircle className={combine('text-xs', get('text', 'tertiary'))} />
              <span className={combine('font-medium', get('text', 'secondary'))}>Showing data for:</span>
              <span className={combine('font-semibold', get('text', 'primary'))}>
                {monthNames[month - 1]} {year}
              </span>
            </div>
          </div>

          {/* Error message */}
          {error ? (
            <div className='p-4 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs sm:text-sm flex items-center gap-3'>
              <FaExclamationTriangle className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Stats Cards */}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4'>
            {/* Total Payable Card */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                    Total Payable
                  </p>
                  <p className={combine('text-xl sm:text-2xl font-bold mt-2 flex items-center gap-1', get('text', 'primary'))}>
                    <FaRupeeSign className="text-emerald-500 text-base sm:text-lg" />
                    {formatCurrency(cards?.total_payable_amount)}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <FaWallet className="text-lg sm:text-xl" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                Staff: {formatCurrency(cards?.staff_total_payable)}
                <span className="mx-1">•</span>
                <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                Teachers: {formatCurrency(cards?.teacher_total_payable)}
              </div>
            </div>

            {/* Processed Payments Card */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                    Processed
                  </p>
                  <p className={combine('text-xl sm:text-2xl font-bold mt-2', get('text', 'primary'))}>
                    {toNumber(cards?.processed_payments_count)}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                  <FaCheckCircle className="text-lg sm:text-xl" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaArrowUp className="text-green-500 text-xs" />
                Successfully processed payments
              </p>
            </div>

            {/* Pending Payments Card */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                    Pending
                  </p>
                  <p className={combine('text-xl sm:text-2xl font-bold mt-2', get('text', 'primary'))}>
                    {toNumber(cards?.pending_payments_count)}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400">
                  <FaHourglassHalf className="text-lg sm:text-xl" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaArrowDown className="text-yellow-500 text-xs" />
                Awaiting processing
              </p>
            </div>

            {/* Failed Payments Card */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-start justify-between">
                <div>
                  <p className={combine('text-xs uppercase tracking-wider font-medium', get('text', 'tertiary'))}>
                    Failed
                  </p>
                  <p className={combine('text-xl sm:text-2xl font-bold mt-2', get('text', 'primary'))}>
                    {toNumber(cards?.failed_payments_count)}
                  </p>
                </div>
                <div className="p-2.5 sm:p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                  <FaTimesCircle className="text-lg sm:text-xl" />
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FaExclamationTriangle className="text-red-500 text-xs" />
                Requires attention
              </p>
            </div>
          </div>

          {/* Salary Payable Mix */}
          <div className={combine(
            'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <FaChartLine className="text-sm" />
              </div>
              <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                Salary Distribution
              </h3>
            </div>
            
            <div className='space-y-4'>
              <div>
                <div className='flex items-center justify-between text-xs sm:text-sm mb-2'>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className={combine('font-medium', get('text', 'secondary'))}>Staff</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={combine('font-semibold', get('text', 'primary'))}>
                      {formatCurrency(cards?.staff_total_payable)}
                    </span>
                    <span className={combine('text-xs px-2 py-0.5 rounded-full', get('bg', 'secondary'), get('text', 'tertiary'))}>
                      {payoutMix.staffPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className='h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'>
                  <div 
                    className='h-full bg-emerald-500 rounded-full transition-all duration-500' 
                    style={{ width: `${payoutMix.staffPct}%` }} 
                  />
                </div>
              </div>
              
              <div>
                <div className='flex items-center justify-between text-xs sm:text-sm mb-2'>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className={combine('font-medium', get('text', 'secondary'))}>Teachers</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={combine('font-semibold', get('text', 'primary'))}>
                      {formatCurrency(cards?.teacher_total_payable)}
                    </span>
                    <span className={combine('text-xs px-2 py-0.5 rounded-full', get('bg', 'secondary'), get('text', 'tertiary'))}>
                      {payoutMix.teacherPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className='h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden'>
                  <div 
                    className='h-full bg-blue-500 rounded-full transition-all duration-500' 
                    style={{ width: `${payoutMix.teacherPct}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className='grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4'>
            {/* Payment Status Distribution */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <FaUsers className="text-sm" />
                </div>
                <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                  Payment Status Distribution
                </h3>
              </div>
              
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <PieChart>
                    <Pie 
                      data={statusChartData} 
                      dataKey='value' 
                      nameKey='name' 
                      cx='50%' 
                      cy='50%' 
                      outerRadius={95} 
                      innerRadius={45}
                      label={false}
                      labelLine={false}
                    >
                      {statusChartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: any) => [toNumber(value), 'Count']}
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
                      formatter={(value) => <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Staff vs Teacher Payables */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                  <FaMoneyBillWave className="text-sm" />
                </div>
                <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                  Staff vs Teacher Payables
                </h3>
              </div>
              
              <div className='h-72'>
                <ResponsiveContainer width='100%' height='100%'>
                  <AreaChart data={splitChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey='name' 
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                    />
                    <YAxis 
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 12 }}
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`₹${toNumber(value).toLocaleString('en-IN')}`, 'Amount']}
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
                      formatter={(value) => <span className={combine('text-xs sm:text-sm capitalize', get('text', 'secondary'))}>{value}</span>}
                    />
                    <Area 
                      type='monotone' 
                      dataKey='processed' 
                      stackId='1' 
                      stroke='#10b981' 
                      fill='#10b981' 
                      fillOpacity={0.85} 
                      name="Processed"
                    />
                    <Area 
                      type='monotone' 
                      dataKey='pending' 
                      stackId='1' 
                      stroke='#f59e0b' 
                      fill='#f59e0b' 
                      fillOpacity={0.8} 
                      name="Pending"
                    />
                    <Area 
                      type='monotone' 
                      dataKey='failed' 
                      stackId='1' 
                      stroke='#ef4444' 
                      fill='#ef4444' 
                      fillOpacity={0.8} 
                      name="Failed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Summary Tables */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4'>
            {/* Staff Summary */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <FaUserTie className="text-sm" />
                </div>
                <h4 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                  Staff Summary
                </h4>
              </div>
              
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading summary...</p>
                    <p className={combine("text-xs sm:text-sm mt-2", get('text', 'tertiary'))}>Preparing staff salary summary records</p>
                  </div>
                </div>
              ) : (
                <div className='space-y-3'>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Total Records</span>
                    <span className={combine('font-semibold text-base sm:text-lg', get('text', 'primary'))}>
                      {toNumber(summary?.staff?.total_count)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('processed')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Processed</span>
                      <span className="block font-bold text-green-600 dark:text-green-400">
                        {toNumber(summary?.staff?.processed_count)}
                      </span>
                    </div>
                    
                    <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('pending')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Pending</span>
                      <span className="block font-bold text-yellow-600 dark:text-yellow-400">
                        {toNumber(summary?.staff?.pending_count)}
                      </span>
                    </div>
                    
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('failed')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Failed</span>
                      <span className="block font-bold text-red-600 dark:text-red-400">
                        {toNumber(summary?.staff?.failed_count)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Total Amount</span>
                    <span className={combine('font-bold text-base sm:text-lg text-emerald-600 dark:text-emerald-400')}>
                      {formatCurrency(summary?.staff?.total_amount)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Teacher Summary */}
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-sm',
              get('bg', 'card'),
              get('border', 'primary')
            )}>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <FaChalkboardTeacher className="text-sm" />
                </div>
                <h4 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                  Teacher Summary
                </h4>
              </div>
              
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaMoneyBillWave className="h-8 w-8 text-green-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading summary...</p>
                    <p className={combine("text-xs sm:text-sm mt-2", get('text', 'tertiary'))}>Preparing teacher salary summary records</p>
                  </div>
                </div>
              ) : (
                <div className='space-y-3'>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Total Records</span>
                    <span className={combine('font-semibold text-base sm:text-lg', get('text', 'primary'))}>
                      {toNumber(summary?.teachers?.total_count)}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-2">
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('processed')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Processed</span>
                      <span className="block font-bold text-green-600 dark:text-green-400">
                        {toNumber(summary?.teachers?.processed_count)}
                      </span>
                    </div>
                    
                    <div className="text-center p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('pending')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Pending</span>
                      <span className="block font-bold text-yellow-600 dark:text-yellow-400">
                        {toNumber(summary?.teachers?.pending_count)}
                      </span>
                    </div>
                    
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                      <div className="flex justify-center mb-1">
                        {getStatusIcon('failed')}
                      </div>
                      <span className="block text-xs text-gray-500 dark:text-gray-400">Failed</span>
                      <span className="block font-bold text-red-600 dark:text-red-400">
                        {toNumber(summary?.teachers?.failed_count)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Total Amount</span>
                    <span className={combine('font-bold text-base sm:text-lg text-blue-600 dark:text-blue-400')}>
                      {formatCurrency(summary?.teachers?.total_amount)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Grand Total Summary */}
          {summary && (
            <div className={combine(
              'rounded-xl sm:rounded-2xl border p-4 sm:p-5 shadow-md bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20',
              get('border', 'primary')
            )}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
                    <FaMoneyBillWave className="text-xl sm:text-2xl text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className={combine('text-xs sm:text-sm font-medium', get('text', 'secondary'))}>Grand Total Payable</p>
                    <p className={combine('text-2xl sm:text-3xl font-bold flex items-center gap-1', get('text', 'primary'))}>
                      <FaRupeeSign className="text-emerald-500 text-xl sm:text-2xl" />
                      {formatCurrency(summary?.grand_total)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-emerald-500"></span>
                    <span className={combine('font-medium', get('text', 'secondary'))}>
                      Staff: {formatCurrency(summary?.staff?.total_amount)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                    <span className={combine('font-medium', get('text', 'secondary'))}>
                      Teachers: {formatCurrency(summary?.teachers?.total_amount)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
