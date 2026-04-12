// app/staff/salary/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
  FaArrowLeft,
  FaSync,
  FaCalculator,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaCreditCard,
  FaReceipt,
  FaPercentage,
  FaUserTie,
  FaSchool,
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { staffApi } from '@/lib/api';

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

export default function StaffSalaryPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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

  const loadSalaryData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);

      const response = await staffApi.salary.staffDashboard({
        month: selectedMonth,
        year: selectedYear,
      });
      const data = response.data;

      if (data?.status === 200 && data?.data) {
        setSalaryData(normalizeSalaryData(data.data));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error loading staff salary data:', err);
      const status = err?.response?.status;

      if (status === 400) {
        setError('Salary structure has not been configured. Please contact the administration.');
      } else if (status === 403) {
        setError('Staff profile not found. Please complete your profile setup.');
      } else if (status === 404) {
        setError('Your salary structure is not configured yet. Please contact HR department.');
      } else if (status === 401) {
        logout();
        router.push('/');
      } else {
        setError(err?.response?.data?.error || err.message || 'Failed to load salary data. Please try again.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (user?.user_type !== 'staff') {
        router.push(`/${user?.user_type}`);
      } else {
        loadSalaryData();
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'staff') {
      loadSalaryData();
    }
  }, [selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return '0';
    return ((part / total) * 100).toFixed(2);
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

  const generatePayslip = async () => {
    try {
      alert('Payslip generation feature will be available soon!');
    } catch (e) {
      console.error('Error generating payslip:', e);
      alert('Failed to generate payslip. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/staff')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Staff Salary Dashboard</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">View and track your monthly salary details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2 transition-colors"
          >
            <FaPrint /> Print
          </button>
          <button
            onClick={generatePayslip}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            disabled={!salaryData}
          >
            <FaDownload /> Download Payslip
          </button>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-4 shadow-sm border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaUserTie className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white">{user?.full_name || 'Staff Member'}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Staff ID: {user?.username || 'N/A'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">Role</p>
            <p className="font-medium text-gray-800 dark:text-white">{(user as any)?.role || (user as any)?.staff_role || 'Not specified'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-2">
            <FaFilter className="text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">View Salary for:</span>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadSalaryData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-60"
                disabled={isRefreshing}
              >
                <FaSync className={isRefreshing ? 'animate-spin' : ''} />
                {isRefreshing ? 'Loading...' : 'Load Salary'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <FaExclamationTriangle className="text-red-500 text-xl mt-1" />
            <div>
              <h3 className="font-medium text-red-800 dark:text-red-300">Error Loading Salary Data</h3>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
              <button
                onClick={loadSalaryData}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {salaryData && (
        <>
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FaMoneyBill className="text-yellow-300" />
                  Salary for {months[selectedMonth - 1]} {selectedYear}
                </h2>
                <p className="text-green-100 mt-2">Net Payable Amount</p>
                <div className="flex items-end gap-2 mt-4">
                  <span className="text-4xl font-bold">{formatCurrency(salaryData.net_payable)}</span>
                  <span className="text-green-200 text-sm">(After deductions)</span>
                </div>
              </div>
              <div className="mt-4 md:mt-0 text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <FaCalendarAlt />
                  <span>Month: {salaryData.month}</span>
                </div>
                <p className="text-green-200 text-sm mt-2">Salary will be credited by 5th of next month</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FaFileInvoice className="text-blue-600" />
                Salary Structure
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">Base Salary</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(salaryData.structure.base_salary)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">Per Day Wage</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{formatCurrency(salaryData.structure.per_day_wage)}</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FaChartLine className="text-green-600" />
                Attendance Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Days Worked</span>
                  <span className="font-bold text-green-600 dark:text-green-400">{salaryData.attendance.worked} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Days Absent</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{salaryData.attendance.absent} days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Late Arrivals</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{salaryData.attendance.late} times</span>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Attendance Rate</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      {calculatePercentage(salaryData.attendance.worked, salaryData.attendance.worked + salaryData.attendance.absent)}%
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FaCalculator className="text-red-600" />
                Deductions
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">Absent Days</span>
                  <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(salaryData.deductions.absent_amount)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                  <span className="text-gray-700 dark:text-gray-300">Late Arrivals</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatCurrency(salaryData.deductions.late_amount)}</span>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-800 dark:text-white">Total Deductions</span>
                    <span className="font-bold text-red-600 dark:text-red-400 text-lg">{formatCurrency(salaryData.deductions.total_cut)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <FaReceipt className="text-purple-600" />
                  Detailed Salary Calculation
                </h3>
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="px-4 py-2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-2"
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
            </div>

            {showDetails && (
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Component</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Calculation</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      <tr>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><FaCheckCircle className="text-green-500" /><span className="text-gray-800 dark:text-white">Base Salary</span></div></td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">Fixed monthly salary</td>
                        <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400">+ {formatCurrency(salaryData.structure.base_salary)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><FaTimesCircle className="text-red-500" /><span className="text-gray-800 dark:text-white">Absent Days Deduction</span></div></td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{salaryData.attendance.absent} days × {formatCurrency(salaryData.structure.per_day_wage)}</td>
                        <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">- {formatCurrency(salaryData.deductions.absent_amount)}</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4"><div className="flex items-center gap-2"><FaTimesCircle className="text-amber-500" /><span className="text-gray-800 dark:text-white">Late Arrivals Deduction</span></div></td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{salaryData.attendance.late} entries</td>
                        <td className="px-6 py-4 font-bold text-amber-600 dark:text-amber-400">- {formatCurrency(salaryData.deductions.late_amount)}</td>
                      </tr>
                      <tr className="bg-green-50 dark:bg-green-900/20">
                        <td className="px-6 py-4 font-bold text-gray-800 dark:text-white">Net Payable Amount</td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">Base Salary - Total Deductions</td>
                        <td className="px-6 py-4 font-bold text-green-600 dark:text-green-400 text-lg">= {formatCurrency(salaryData.net_payable)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FaPercentage className="text-blue-600" />
                    <span className="font-medium text-gray-800 dark:text-white">Summary</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Deduction Percentage:</span>
                      <span className="font-bold text-red-600 dark:text-red-400 ml-2">
                        {calculatePercentage(salaryData.deductions.total_cut, salaryData.structure.base_salary)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Net Salary Percentage:</span>
                      <span className="font-bold text-green-600 dark:text-green-400 ml-2">
                        {calculatePercentage(salaryData.net_payable, salaryData.structure.base_salary)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Per Day Earnings:</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">
                        {formatCurrency(salaryData.net_payable / (salaryData.attendance.worked || 1))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <FaCreditCard className="text-blue-600 dark:text-blue-400 text-2xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Payment Method:</p>
                    <p className="font-medium text-gray-800 dark:text-white">Bank Transfer</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Credited By:</p>
                    <p className="font-medium text-gray-800 dark:text-white">5th of every month</p>
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Payment Status:</p>
                    {getPaymentStatusBadge(salaryData.payment_status?.status)}
                  </div>
                  <div>
                    <p className="text-gray-600 dark:text-gray-400">Reference:</p>
                    <p className="font-medium text-gray-800 dark:text-white">{salaryData.payment_status?.transaction_id || salaryData.payment_status?.bank_reference || 'Not available'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!salaryData && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
          <FaMoneyBill className="text-4xl text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Salary Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Salary data is not available for the selected month and year.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={loadSalaryData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FaSync /> Refresh
            </button>
            <button
              onClick={() => {
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Current Month
            </button>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-900/20 dark:to-slate-800/20 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <FaSchool className="text-indigo-500" />
          <span>Staff salary values are generated from Attendance + Salary Structure configured in the Salary module.</span>
        </div>
      </div>
    </div>
  );
}
