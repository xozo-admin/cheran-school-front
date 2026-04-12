// src/components/dashboard/FeeOverviewChart.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  Calendar,
  DollarSign,
  PieChart,
  BarChart3,
  AlertCircle,
  Minimize2,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Percent,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { adminApi } from '@/lib/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
} from 'recharts';

interface FeeSummary {
  total_assigned: number;
  total_collected: number;
  total_pending: number;
  total_concession: number;
  collection_rate: number;
}

interface MonthlyCollection {
  month: string;
  month_key: string;
  collected: number;
  transactions: number;
}

interface FeeTypeBreakdown {
  fee_type: string;
  assigned: number;
  collected: number;
  pending: number;
  concession: number;
  students: number;
  collection_rate: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface PaymentModeBreakdown {
  mode: string;
  amount: number;
  count: number;
  percentage: number;
}

interface TopPendingClass {
  class: string;
  pending: number;
  students_with_due: number;
}

interface FeeOverviewData {
  status: number;
  message: string;
  filters: {
    academic_year: string;
    months: number;
  };
  summary_cards: FeeSummary;
  charts: {
    monthly_collection: MonthlyCollection[];
    fee_type_breakdown: FeeTypeBreakdown[];
    status_distribution: StatusDistribution[];
    payment_mode_breakdown: PaymentModeBreakdown[];
    top_pending_classes: TopPendingClass[];
  };
  meta: {
    has_data: boolean;
    total_fee_records: number;
    last_payment_date: string | null;
  };
}

// Color palettes
const FEE_TYPE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#14b8a6', // teal
  '#f43f5e', // rose
];

const STATUS_COLORS = {
  PAID: '#10b981', // green
  PARTIAL: '#f59e0b', // amber
  PENDING: '#ef4444', // red
  OVERDUE: '#8b5cf6', // purple
};

const PAYMENT_MODE_COLORS = {
  ONLINE: '#3b82f6',
  CASH: '#10b981',
  CHEQUE: '#8b5cf6',
  CARD: '#ec4899',
  BANK_TRANSFER: '#f97316',
};

// Custom Tooltip Components
const MonthlyTooltip = ({ active, payload, label }: any) => {
  const { theme } = useTheme();
  
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    
    return (
      <div className={`rounded-lg shadow-xl border p-3 w-[220px] ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <p className={`text-xs font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          {data.month}
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Collected</span>
            <span className="text-sm font-semibold text-green-500">
              ₹{data.collected.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Transactions</span>
            <span className="text-sm font-semibold text-blue-500">
              {data.transactions}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const FeeTypeTooltip = ({ active, payload }: any) => {
  const { theme } = useTheme();
  
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    
    return (
      <div className={`rounded-lg shadow-xl border p-3 w-[240px] ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          {data.fee_type}
        </p>
        <div className="space-y-1.5">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Assigned</span>
            <span className="text-xs font-medium">₹{data.assigned.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Collected</span>
            <span className="text-xs font-medium text-green-500">₹{data.collected.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Pending</span>
            <span className="text-xs font-medium text-red-500">₹{data.pending.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Concession</span>
            <span className="text-xs font-medium text-orange-500">₹{data.concession.toLocaleString()}</span>
          </div>
          <div className="border-t my-1.5"></div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Students</span>
            <span className="text-xs font-medium">{data.students}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Collection Rate</span>
            <span className="text-xs font-medium text-blue-500">{data.collection_rate}%</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const FeeOverviewChart = ({
  isFullScreen,
  onCloseFullScreen,
}: {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}) => {
  const { theme } = useTheme();
  const { get } = useThemeClasses();
  const [data, setData] = useState<FeeOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string>('');
  const [months, setMonths] = useState<number>(6);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'distribution'>('overview');
  const monthlyTrendMinWidth = useMemo(() => {
    const points = Math.max(data?.charts.monthly_collection.length ?? 0, 1);
    if (isMobile) return Math.max(560, points * 84);
    if (isTablet) return Math.max(700, points * 92);
    return undefined;
  }, [data?.charts.monthly_collection.length, isMobile, isTablet]);

  // Available academic years
  const academicYears = ['2025-2026', '2026-2027', '2027-2028'];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (academicYear) params.append('academic_year', academicYear);
        params.append('months', months.toString());
        
        const response = await adminApi.fee.overviewChart(params);
        if (response.data) {
          setData(response.data);
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching fee overview data:', err);
        setError('Failed to load fee overview data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [academicYear, months]);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const controlledFullScreen = Boolean(isFullScreen && onCloseFullScreen);
  const isModalOpen = internalFullScreen || controlledFullScreen;

  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalFullScreen(false);
        onCloseFullScreen?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, onCloseFullScreen]);

  const handleCloseFullScreen = () => {
    setInternalFullScreen(false);
    onCloseFullScreen?.();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[500px] w-full ${get('bg', 'card')} rounded-xl`}>
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-14 w-14 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className={`mt-4 text-sm ${get('text', 'secondary')}`}>Loading fee overview...</p>
          <p className={`mt-1 text-xs ${get('text', 'tertiary')}`}>Preparing collection analytics</p>
        </div>
      </div>
    );
  }

  // Error or no data state
  if (error || (data && !data.meta.has_data)) {
    return (
      <div className={`h-[500px] w-full text-center flex flex-col items-center justify-center ${get('bg', 'card')} rounded-xl`}>
        <div className={`${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full p-3 sm:p-4 w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 flex items-center justify-center`}>
          <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-500" />
        </div>
        <h3 className={`text-base sm:text-lg font-semibold mb-2 ${get('text', 'primary')}`}>
          {error ? 'Error Loading Data' : 'No Fee Data Available'}
        </h3>
        <p className={`text-xs sm:text-sm ${get('text', 'secondary')} mb-4 max-w-md`}>
          {error || data?.message || 'No fee data found for the selected filters'}
        </p>
        {!error && (
          <button
            onClick={() => setAcademicYear('')}
            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    );
  }

  if (!data) return null;

  // Main chart content - FIXED HEIGHT ISSUES
  const chartContent = (
    <div className={`w-full flex flex-col ${isModalOpen ? 'h-full' : 'h-full'}`}>
      {/* Header with Filters - Fixed height section */}
      <div className="flex-shrink-0 p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className={`w-4 h-4 shrink-0 ${get('text', 'secondary')}`} />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className={`w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <option value="">All Academic Years</option>
              {academicYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Clock className={`w-4 h-4 shrink-0 ${get('text', 'secondary')}`} />
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className={`w-full px-2.5 py-1.5 text-xs sm:text-sm rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-gray-200'
                  : 'bg-white border-gray-300 text-gray-700'
              }`}
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last 12 Months</option>
              <option value={24}>Last 24 Months</option>
            </select>
          </div>

          {data.filters.academic_year !== 'ALL' && (
            <div className={`col-span-2 sm:col-auto w-fit px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              theme === 'dark'
                ? 'bg-blue-900/30 text-blue-300 border border-blue-800'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {data.filters.academic_year}
            </div>
          )}
        </div>

        {/* Summary Cards - Grid layout */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">Assigned</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-blue-500 truncate">
              {formatCurrency(data.summary_cards.total_assigned)}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">Collected</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-green-500 truncate">
              {formatCurrency(data.summary_cards.total_collected)}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-red-500" />
              <span className="text-xs text-gray-500">Pending</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-red-500 truncate">
              {formatCurrency(data.summary_cards.total_pending)}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-gray-500">Concession</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-purple-500 truncate">
              {formatCurrency(data.summary_cards.total_concession)}
            </p>
          </div>

          <div className={`p-3 rounded-xl border ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="w-4 h-4 text-orange-500" />
              <span className="text-xs text-gray-500">Collection Rate</span>
            </div>
            <p className="text-base sm:text-lg font-bold text-orange-500">
              {data.summary_cards.collection_rate}%
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mt-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'overview'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : get('text', 'secondary')
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'trends'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : get('text', 'secondary')
            }`}
          >
            Monthly Trends
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`px-4 py-2 text-sm font-medium transition-colors relative ${
              activeTab === 'distribution'
                ? 'text-blue-500 border-b-2 border-blue-500'
                : get('text', 'secondary')
            }`}
          >
            Distribution
          </button>
        </div>
      </div>

      {/* Charts - Scrollable area with fixed height calculation */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 pt-0">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Fee Type Breakdown */}
            <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="text-sm font-semibold mb-6 flex items-center gap-2">
                <Receipt className="w-4 h-4" />
                Fee Type Breakdown
              </h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.fee_type_breakdown} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="fee_type" 
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                      width={60}
                    />
                    <Tooltip content={<FeeTypeTooltip />} />
                    <Bar dataKey="collected" fill="#10b981" stackId="a" name="Collected" />
                    <Bar dataKey="pending" fill="#ef4444" stackId="a" name="Pending" />
                    <Bar dataKey="concession" fill="#f59e0b" stackId="a" name="Concession" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Pending Classes */}
            <div className={`rounded-xl border p-3 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="text-sm font-semibold mb-6 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Top Pending Classes
              </h4>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.charts.top_pending_classes} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis type="number" tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }} />
                    <YAxis 
                      type="category" 
                      dataKey="class" 
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                      width={50}
                    />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="pending" fill="#ef4444" name="Pending Amount">
                      {data.charts.top_pending_classes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={FEE_TYPE_COLORS[index % FEE_TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'trends' && (
          <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Monthly Collection Trend
            </h4>
            <div className="overflow-x-auto pb-1">
              <div
                className="h-[300px]"
                style={monthlyTrendMinWidth ? { minWidth: `${monthlyTrendMinWidth}px` } : undefined}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.charts.monthly_collection} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <XAxis 
                      dataKey="month_key" 
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return `${month}/${year.slice(2)}`;
                      }}
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                    />
                    <Tooltip content={<MonthlyTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="collected"
                      name="Collection Amount"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.2}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="transactions"
                      name="Transactions"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status Distribution Detailed */}
            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="text-sm font-semibold mb-3">Fee Status Details</h4>
              <div className="space-y-3">
                {data.charts.status_distribution.map((item) => (
                  <div key={item.status}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="flex items-center gap-1">
                        {item.status === 'PAID' && <CheckCircle className="w-3 h-3 text-green-500" />}
                        {item.status === 'PARTIAL' && <Clock className="w-3 h-3 text-yellow-500" />}
                        {item.status === 'PENDING' && <XCircle className="w-3 h-3 text-red-500" />}
                        {item.status}
                      </span>
                      <span className="font-medium">{item.count} records ({item.percentage}%)</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${
                          item.status === 'PAID' ? 'bg-green-500' :
                          item.status === 'PARTIAL' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Mode Detailed */}
            <div className={`rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="text-sm font-semibold mb-3">Payment Mode Details</h4>
              <div className="space-y-3">
                {data.charts.payment_mode_breakdown.map((item) => (
                  <div key={item.mode}>
                    <div className="flex justify-between text-xs mb-1">
                      <span>{item.mode}</span>
                      <span className="font-medium">
                        {formatCurrency(item.amount)} ({item.percentage}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {item.count} transactions
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fee Type Summary Table */}
            <div className={`col-span-1 md:col-span-2 rounded-xl border p-4 ${theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-200'}`}>
              <h4 className="text-sm font-semibold mb-3">Fee Type Summary</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                      <th className="text-left py-2">Fee Type</th>
                      <th className="text-right py-2">Assigned</th>
                      <th className="text-right py-2">Collected</th>
                      <th className="text-right py-2">Pending</th>
                      <th className="text-right py-2">Concession</th>
                      <th className="text-right py-2">Students</th>
                      <th className="text-right py-2">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.charts.fee_type_breakdown.map((item) => (
                      <tr key={item.fee_type} className={`border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
                        <td className="py-2 font-medium">{item.fee_type}</td>
                        <td className="text-right py-2">{formatCurrency(item.assigned)}</td>
                        <td className="text-right py-2 text-green-500">{formatCurrency(item.collected)}</td>
                        <td className="text-right py-2 text-red-500">{formatCurrency(item.pending)}</td>
                        <td className="text-right py-2 text-orange-500">{formatCurrency(item.concession)}</td>
                        <td className="text-right py-2">{item.students}</td>
                        <td className="text-right py-2 font-medium">{item.collection_rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      <div className="flex-shrink-0 px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Total Records: {data.meta.total_fee_records}</span>
          {data.meta.last_payment_date && (
            <span>Last Payment: {new Date(data.meta.last_payment_date).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </div>
  );

  // Full screen modal
  if (isModalOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={handleCloseFullScreen}
        />
        <div className={`relative z-10 shadow-2xl bg-white p-3 sm:p-6 lg:p-10 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${
          isMobile
            ? 'w-full h-full rounded-none'
            : 'w-[95vw] h-[95vh] rounded-xl'
        }`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <div className='flex items-center min-w-0'>
                  <div className={`p-1.5 sm:p-2 mr-2 bg-gradient-to-br ${theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-50 to-green-100'} rounded-lg`}>
                    <BarChart3 className={`${theme === 'dark' ? 'text-green-400' : 'text-green-600'} w-4 h-4 sm:w-5 sm:h-5`} />
                  </div>
                  <div>
                    <h3 className={`text-sm sm:text-base font-semibold ${get('text', 'primary')}`}>Fee Overview</h3>
                    <p className={`text-xs ${get('text', 'tertiary')}`}>Track collections, pending fees and payment trends</p>
                  </div>
                  </div>
                  <div className="self-end sm:self-auto">
                    <button
              onClick={handleCloseFullScreen}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-lg transition-colors ${get('text', 'primary')}`}
            >
              <Minimize2 size={20} />
              <span>Exit Full Screen</span>
            </button>
                  </div>
                </div>
          {chartContent}
        </div>
      </div>
    );
  }

  // Normal view
  return chartContent;
};
