// src/app/admin/staff/attendance/page.tsx

'use client';

import { adminApi } from '@/lib/api';
import { useEffect, useState } from 'react';
import {
  FaUserTie,
  FaCalendarAlt,
  FaFilter,
  FaEye,
  FaChartBar,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaChartLine,
  FaDownload,
  FaArrowLeft,
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaHistory,
  FaCalendarCheck,
  FaCalendarTimes,
  FaChartArea,
  FaTable,
  FaCalendarMinus,
  FaRegCalendarCheck,
  FaRegCalendarTimes,
  FaRegCalendarAlt,
  FaChevronDown,
  FaUsers,
  FaIdCard,
  FaUserTag,
  FaSchool,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError } from '@/lib/toast';
import { useSearchParams } from 'next/navigation';

// Interface for daily report
interface DailyAttendance {
  id: string;
  name: string;
  role: string;
  status: 'Present' | 'Absent' | 'Late';
  check_in_time: string;
}

interface DailyReportResponse {
  count: number;
  data: DailyAttendance[];
}

interface DailyReportPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: DailyAttendance[];
  summary: {
    total: number;
    present: number;
    late: number;
    absent: number;
    present_percentage: number;
  };
  role_summary: {
    [key: string]: {
      total: number;
      present: number;
      late: number;
      absent: number;
    };
  };
}

// Interface for history
interface HistoryRecord {
  date: string;
  check_in_time?: string | null;
  status: 'Present' | 'Absent' | 'Late' | 'Sunday' | 'Holiday';
}

interface MonthSummary {
  total_days_passed: number;
  sundays: number;
  holidays: number;
  actual_working_days: number;
  present: number;
  late: number;
  absent: number;
  percentage: string;
}

interface MonthHistoryResponse {
  period: string;
  staff_profile?: {
    staff_id: string;
    staff_name: string;
    staff_role?: string;
    profile_image?: string | null;
  };
  summary: MonthSummary;
  history: {
    [day: string]: HistoryRecord[];
  };
}

interface YearSummary {
  total_days_passed: number;
  sundays: number;
  holidays: number;
  holiday_dates?: string[];
  actual_working_days: number;
  present: number;
  late: number;
  absent: number;
  attendance_percentage: string;
  percentage?: string;
}

interface YearHistoryResponse {
  period: string;
  staff_profile?: {
    staff_id: string;
    staff_name: string;
    staff_role?: string;
    profile_image?: string | null;
  };
  summary: YearSummary;
  history: {
    [month: string]: HistoryRecord[];
  };
}

interface SingleDateHistory {
  period: string;
  staff_profile?: {
    staff_id: string;
    staff_name: string;
    staff_role?: string;
    profile_image?: string | null;
  };
  date?: string;
  status?: 'Present' | 'Absent' | 'Late' | 'Sunday';
  data?: {
    date: string;
    check_in_time: string;
    status: 'Present' | 'Absent' | 'Late' | 'Sunday';
  };
}

type SortField = 'name' | 'status' | 'check_in_time' | 'role';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'daily' | 'monthly' | 'yearly';
type TabType = 'today' | 'history';

// Common staff roles (can be fetched from API)
const STAFF_ROLES = [
  'admin_staff',
  'finance_staff',
  'it_staff',
  'operations_staff',
  'transport_staff',
  'external_staff'
];

// Role mapping for display
const ROLE_DISPLAY_NAMES: { [key: string]: string } = {
  'admin_staff': 'Admin Staff',
  'finance_staff': 'Finance Staff',
  'it_staff': 'IT Staff',
  'operations_staff': 'Operations Staff',
  'transport_staff': 'Transport Staff',
  'external_staff': 'External Staff',
  'Accountant': 'Accountant',
  'Librarian': 'Librarian',
  'Receptionist': 'Receptionist',
  'Administrator': 'Administrator',
  'Maintenance': 'Maintenance',
  'Security': 'Security',
  'Nurse': 'Nurse',
  'Counselor': 'Counselor',
  'IT Support': 'IT Support',
  'Cleaner': 'Cleaner',
  'Driver': 'Driver',
  'Other': 'Other'
};

export default function StaffAttendancePage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  // State for tabs
  const [activeTab, setActiveTab] = useState<TabType>('today');

  // State for daily report (Today tab)
  const [dailyReport, setDailyReport] = useState<DailyAttendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // State for history tab
  const [staffMembers, setStaffMembers] = useState<DailyAttendance[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<DailyAttendance | null>(null);
  const [historyData, setHistoryData] = useState<MonthHistoryResponse | YearHistoryResponse | SingleDateHistory | null | any>(null);
  const [historyViewMode, setHistoryViewMode] = useState<ViewMode>('monthly');
  const [historyMonth, setHistoryMonth] = useState<number>(new Date().getMonth() + 1);
  const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyViewStyle, setHistoryViewStyle] = useState<'calendar' | 'chart' | 'list'>('calendar');
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);

  // Pagination for today tab
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalTodayRecords, setTotalTodayRecords] = useState(0);
  const [todaySummary, setTodaySummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    present_percentage: 0,
  });
  const [todayRoleSummary, setTodayRoleSummary] = useState<{
    [key: string]: {
      total: number;
      present: number;
      late: number;
      absent: number;
    };
  }>({});

  const searchParams = useSearchParams();

  useEffect(() => {
  const staffIdFromUrl = searchParams.get('staffId');
  const tab = searchParams.get('tab');
  const redirectedFrom = searchParams.get('redirectedFrom');
  setShowRedirectBackButton(redirectedFrom === 'staff-directory');

  if (staffIdFromUrl) {
    setSelectedStaffId(staffIdFromUrl);
    if (tab === 'history' || !tab) {
      setActiveTab('history');
    }
    // Find and set the selected staff object
    const staff = staffMembers.find(s => s.id === staffIdFromUrl) || null;
    setSelectedStaff(staff);
  }
}, [searchParams, staffMembers]);

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/staff/directory';
  };

  // Tooltip state for charts
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    label: string;
    value: number;
  }>({
    visible: false,
    x: 0,
    y: 0,
    label: '',
    value: 0
  });

  // Visible lines for chart toggle
  const [visibleLines, setVisibleLines] = useState({
    present: true,
    late: true,
    absent: true
  });

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'purple') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
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
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getSelectClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full appearance-none cursor-pointer',
    'text-xs sm:text-sm font-medium',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-indigo-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-indigo-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:shadow-sm focus:shadow-md',
    theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/30'
      : 'bg-gradient-to-br from-white to-gray-50/50'
  );

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-indigo-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-indigo-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800'
      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
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

  const getViewModeButtonClass = (isActive: boolean) => {
    const baseClass = combine(
      'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 sm:duration-300 flex items-center gap-2 font-medium text-xs sm:text-sm',
      'hover:scale-[1.02] active:scale-[0.98]'
    );

    if (isActive) {
      return combine(
        baseClass,
        theme === 'dark'
          ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
          : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
      );
    }

    return combine(
      baseClass,
      getSecondaryButtonClass(),
      'hover:shadow-md'
    );
  };

  const getStatusBadgeClass = (status: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      Present: {
        bg: theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      Absent: {
        bg: theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
      Late: {
        bg: theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      Sunday: {
        bg: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      Holiday: {
        bg: theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      }
    };

    const colors = colorMap[status] || { bg: '', text: '', border: '' };
    return combine(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full border',
      colors.bg,
      colors.text,
      colors.border
    );
  };

  const getRoleColor = (role: string) => {
    const roleColors: { [key: string]: { bg: string; text: string; border: string } } = {
      'admin_staff': {
        bg: theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      'finance_staff': {
        bg: theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      'it_staff': {
        bg: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      'operations_staff': {
        bg: theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      'transport_staff': {
        bg: theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
      'external_staff': {
        bg: theme === 'dark' ? 'bg-gray-900/30' : 'bg-gray-100',
        text: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
        border: theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
      }
    };

    return roleColors[role] || {
      bg: theme === 'dark' ? 'bg-gray-800/30' : 'bg-gray-100',
      text: theme === 'dark' ? 'text-gray-300' : 'text-gray-600',
      border: theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
    };
  };

  const getRoleBadgeClass = (role: string) => {
    const displayRole = ROLE_DISPLAY_NAMES[role] || role;
    const colors = getRoleColor(role);

    return combine(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs rounded-full border flex items-center gap-1 sm:gap-1.5',
      colors.bg,
      colors.text,
      colors.border
    );
  };

  // Fetch all staff for dropdown
  const fetchAllStaff = async () => {
    try {
      const response = await adminApi.attendance.staff.dailyReport(
        new Date().toISOString().split('T')[0]
      );
      const data: DailyReportResponse = response.data;
      setStaffMembers(data.data || []);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      setStaffMembers([]);
    }
  };

  // Fetch daily attendance report
  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const response = await adminApi.attendance.staff.dailyReportPaginated({
        date: selectedDate,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
        page: currentPage,
        page_size: itemsPerPage,
      });
      const data: DailyReportPaginatedResponse = response.data;
      setDailyReport(Array.isArray(data.results) ? data.results : []);
      setTotalTodayRecords(typeof data.count === 'number' ? data.count : 0);
      setTodaySummary(
        data.summary || {
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          present_percentage: 0,
        }
      );
      setTodayRoleSummary(data.role_summary || {});
    } catch (error) {
      console.error('Error fetching daily report:', error);
      setDailyReport([]);
      setTotalTodayRecords(0);
      setTodaySummary({
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        present_percentage: 0,
      });
      setTodayRoleSummary({});
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff attendance history
  const fetchStaffHistory = async () => {
    if (!selectedStaffId && !selectedStaff) return;

    setHistoryLoading(true);
    try {
      const staffId = selectedStaffId || selectedStaff?.id;
      if (!staffId) return;

      const response = await adminApi.attendance.staff.history(
        staffId,
        historyViewMode,
        selectedDate,
        historyMonth,
        historyYear
      );
      const data = response.data;
      setHistoryData(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Render calendar view
  const renderCalendarView = (history: { [day: string]: HistoryRecord[] }) => {
    const month = historyMonth;
    const year = historyYear;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

    // Get all records for the current month
    const monthRecords = history[String(month)] || [];

    // Create a map of date strings to records for easy lookup
    const recordsByDate: { [key: string]: HistoryRecord } = {};
    monthRecords.forEach((record: HistoryRecord) => {
      recordsByDate[record.date] = record;
    });

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 sm:p-2"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const dayRecord = recordsByDate[dateStr];
      const dayStatus = dayRecord?.status || null;

      const isToday = isCurrentMonth && day === today.getDate();
      const isSunday = !dayRecord && new Date(year, month - 1, day).getDay() === 0;

      let statusColor = '';
      let statusBg = '';
      let statusIcon = null;
      let statusText = '';

      if (dayStatus === 'Present') {
        statusColor = theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600';
        statusBg = theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-100';
        statusIcon = <FaRegCalendarCheck className="text-[10px] sm:text-xs" />;
        statusText = 'P';
      } else if (dayStatus === 'Late') {
        statusColor = theme === 'dark' ? 'text-amber-300' : 'text-amber-600';
        statusBg = theme === 'dark' ? 'bg-amber-900/20' : 'bg-amber-100';
        statusIcon = <FaRegCalendarAlt className="text-[10px] sm:text-xs" />;
        statusText = 'L';
      } else if (dayStatus === 'Absent') {
        statusColor = theme === 'dark' ? 'text-red-300' : 'text-red-600';
        statusBg = theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100';
        statusIcon = <FaRegCalendarTimes className="text-[10px] sm:text-xs" />;
        statusText = 'A';
      } else if (dayStatus === 'Sunday') {
        statusColor = theme === 'dark' ? 'text-blue-300' : 'text-blue-600';
        statusBg = theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100';
        statusIcon = <FaCalendarMinus className="text-[10px] sm:text-xs" />;
        statusText = 'S';
      } else if (dayStatus === 'Holiday') {
        statusColor = theme === 'dark' ? 'text-purple-300' : 'text-purple-600';
        statusBg = theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-100';
        statusIcon = <FaCalendarMinus className="text-[10px] sm:text-xs" />;
        statusText = 'H';
      } else {
        statusColor = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';
        statusBg = theme === 'dark' ? 'bg-gray-800/20' : 'bg-gray-100';
        statusIcon = <FaCalendarMinus className="text-[10px] sm:text-xs opacity-50" />;
        statusText = '-';
      }

      days.push(
        <div
          key={day}
          className={combine(
            "p-1 sm:p-2 rounded-lg border transition-all duration-200 sm:duration-300 hover:scale-105 text-center",
            statusBg,
            theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200',
            isToday ? (theme === 'dark' ? 'ring-1 sm:ring-2 ring-indigo-500/50' : 'ring-1 sm:ring-2 ring-indigo-400/50') : '',
            !dayRecord ? 'opacity-70' : ''
          )}
        >
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-0.5 sm:mb-1">
              <span className={combine(
                "text-[10px] sm:text-xs font-medium",
                isSunday ? (theme === 'dark' ? 'text-red-400' : 'text-red-500') : get('text', 'secondary')
              )}>
                {day}
              </span>
              {statusIcon && (
                <span className={statusColor}>
                  {statusIcon}
                </span>
              )}
            </div>
            <div className="text-center">
              <span className={combine("text-[10px] sm:text-xs font-medium", statusColor)}>
                {statusText}
              </span>
              {dayRecord?.check_in_time && (
                <div className={combine("text-[8px] sm:text-[10px] mt-0.5", get('text', 'tertiary'))}>
                  {dayRecord.check_in_time.substring(0, 5)}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
          <h4 className={combine("text-sm font-semibold", get('text', 'primary'))}>
            {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500"></div>
              <span className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}>Present</span>
            </div>
            <div className="flex items-center gap-1 ml-2 whitespace-nowrap">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500"></div>
              <span className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}>Late</span>
            </div>
            <div className="flex items-center gap-1 ml-2 whitespace-nowrap">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
              <span className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}>Absent</span>
            </div>
            <div className="flex items-center gap-1 ml-2 whitespace-nowrap">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
              <span className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}>Sunday</span>
            </div>
            <div className="flex items-center gap-1 ml-2 whitespace-nowrap">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-purple-500"></div>
              <span className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}>Holiday</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <div key={day} className={combine("text-center p-1 sm:p-2 text-[10px] sm:text-xs font-semibold",
              index === 0 ? (theme === 'dark' ? 'text-red-400' : 'text-red-500') : get('text', 'tertiary')
            )}>
              {day}
            </div>
          ))}
          {days}
        </div>
      </div>
    );
  };

  const renderYearMonthData = (history: { [month: string]: HistoryRecord[] }) => {
    const monthEntries = Object.entries(history)
      .map(([monthKey, records]) => ({
        monthKey: Number(monthKey),
        records: Array.isArray(records) ? records : []
      }))
      .filter((entry) => entry.records.length > 0)
      .sort((a, b) => a.monthKey - b.monthKey);

    if (monthEntries.length === 0) {
      return (
        <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
          <FaCalendarMinus className={combine(
            "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )} />
          <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
            No Attendance Records
          </h4>
          <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
            No attendance records found for {historyYear}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {monthEntries.map(({ monthKey, records }) => {
          const monthLabel = new Date(historyYear, monthKey - 1, 1).toLocaleString('default', { month: 'long' });

          return (
            <div key={monthKey} className={combine("rounded-lg border p-3 sm:p-4", get('bg', 'secondary'), get('border', 'secondary'))}>
              <h4 className={combine("text-sm sm:text-base font-semibold mb-3 sticky top-0 z-10 py-2", get('bg', 'secondary'), get('text', 'primary'))}>
                {monthLabel} {historyYear}
              </h4>

              {/* Month Table Container with Scroll */}
              <div className="relative">
                <div className="overflow-y-auto max-h-[300px] border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                    {/* Sticky Header for each month table */}
                    <thead className={combine(
                      "bg-[var(--color-bg-secondary)] sticky top-0 z-10",
                      get('border', 'primary'),
                      theme === 'dark' ? 'shadow-md' : 'shadow-sm'
                    )}>
                      <tr>
                        <th className={combine(
                          "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                          get('text', 'tertiary')
                        )}>
                          Date
                        </th>
                        <th className={combine(
                          "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                          get('text', 'tertiary')
                        )}>
                          Status
                        </th>
                        <th className={combine(
                          "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                          get('text', 'tertiary')
                        )}>
                          Check-in Time
                        </th>
                      </tr>
                    </thead>

                    {/* Table Body */}
                    <tbody className={combine("divide-y", get('bg', 'card'), get('border', 'primary'))}>
                      {records.map((record, idx) => (
                        <tr key={`${record.date}-${idx}`} className="hover:bg-[var(--color-bg-hover)]">
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                            {record.date}
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3">
                            <span className={getStatusBadgeClass(record.status)}>
                              {record.status}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                            {record.check_in_time || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Month Summary */}
              <div className="mt-3 flex justify-end gap-4 text-xs">
                <span className={theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}>
                  Present: {records.filter(r => r.status === 'Present').length}
                </span>
                <span className={theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}>
                  Late: {records.filter(r => r.status === 'Late').length}
                </span>
                <span className={theme === 'dark' ? 'text-red-400' : 'text-red-600'}>
                  Absent: {records.filter(r => r.status === 'Absent').length}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const showTooltip = (
    e: React.MouseEvent,
    label: string,
    value: number
  ) => {
    setTooltip({
      visible: true,
      x: e.clientX + 10,
      y: e.clientY - 40,
      label,
      value
    });
  };

  const hideTooltip = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
  };

  const toggleLine = (key: 'present' | 'late' | 'absent') => {
    setVisibleLines(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Render year charts with proper line chart
  const renderYearCharts = (history: { [month: string]: HistoryRecord[] }) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Process monthly data - only include months that have records
    const monthlyData = [];

    // Get all month keys from history that have data
    const monthsWithRecords = Object.keys(history)
      .map(key => parseInt(key))
      .filter(month => !isNaN(month) && month >= 1 && month <= 12)
      .sort((a, b) => a - b);

    // Calculate max value for y-axis scaling
    let maxCount = 0;

    for (const month of monthsWithRecords) {
      const monthRecords = history[String(month)] || [];

      let present = 0;
      let late = 0;
      let absent = 0;

      monthRecords.forEach((record) => {
        if (record.status === 'Present') {
          present++;
        } else if (record.status === 'Late') {
          late++;
        } else if (record.status === 'Absent') {
          absent++;
        }
      });

      // Update max count
      maxCount = Math.max(maxCount, present, late, absent);

      monthlyData.push({
        monthNumber: month,
        month: monthNames[month - 1],
        present,
        late,
        absent
      });
    }

    if (monthlyData.length === 0) {
      return (
        <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
          <FaCalendarMinus className={combine(
            "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          )} />
          <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
            No Chart Data
          </h4>
          <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
            No yearly attendance records found for {historyYear}
          </p>
        </div>
      );
    }

    // Add a small buffer to maxCount for better visualization
    maxCount = Math.max(maxCount, 5); // Minimum scale of 5
    const yAxisMax = Math.ceil(maxCount * 1.1); // Add 10% padding

    // Chart dimensions - keep enough width for readability and allow horizontal scroll on small screens
    const minChartWidth = Math.max(720, monthlyData.length * 90);
    const chartWidth = Math.max(minChartWidth, Math.min(1200, window.innerWidth - 48));
    const chartHeight = 400;
    const padding = { top: 50, right: 50, bottom: 50, left: 60 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    // Calculate x and y scales
    const xStep = monthlyData.length > 1 ? innerWidth / (monthlyData.length - 1) : 0;

    const getX = (index: number) => padding.left + (index * xStep);
    const getY = (value: number) => padding.top + innerHeight - (value / yAxisMax) * innerHeight;

    // Generate points for each line
    const presentPoints = monthlyData.map((data, index) =>
      `${getX(index)},${getY(data.present)}`
    ).join(' ');

    const latePoints = monthlyData.map((data, index) =>
      `${getX(index)},${getY(data.late)}`
    ).join(' ');

    const absentPoints = monthlyData.map((data, index) =>
      `${getX(index)},${getY(data.absent)}`
    ).join(' ');

    // Generate y-axis ticks
    const yTicks = [];
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const value = Math.round((yAxisMax / tickCount) * i);
      yTicks.push(value);
    }

    return (
      <div className="w-full px-2 py-2 sm:px-3 sm:py-3">
          <h4 className={combine("text-base sm:text-lg font-semibold mb-6 text-center", get('text', 'primary'))}>
            Attendance Trends - {historyYear}
          </h4>

          <div className="relative w-full flex flex-col items-center">
            {/* Legend - Centered at top */}
            <div className="flex justify-center mb-6 w-full">
              <div
                className="inline-flex flex-wrap justify-center gap-4 sm:gap-6 p-3 rounded-lg"
                style={{
                  background: theme === 'dark' ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  border: theme === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB'
                }}
              >
                <div
                  className={combine(
                    "flex items-center gap-2 cursor-pointer transition-opacity",
                    !visibleLines.present ? "opacity-40" : ""
                  )}
                  onClick={() => toggleLine('present')}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: theme === 'dark' ? '#10B981' : '#059669' }}
                  />
                  <span className={combine("text-xs font-medium", get('text', 'primary'))}>
                    Present
                  </span>
                </div>

                <div
                  className={combine(
                    "flex items-center gap-2 cursor-pointer transition-opacity",
                    !visibleLines.late ? "opacity-40" : ""
                  )}
                  onClick={() => toggleLine('late')}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: theme === 'dark' ? '#F59E0B' : '#D97706' }}
                  />
                  <span className={combine("text-xs font-medium", get('text', 'primary'))}>
                    Late
                  </span>
                </div>

                <div
                  className={combine(
                    "flex items-center gap-2 cursor-pointer transition-opacity",
                    !visibleLines.absent ? "opacity-40" : ""
                  )}
                  onClick={() => toggleLine('absent')}
                >
                  <div
                    className="w-4 h-4 rounded"
                    style={{ background: theme === 'dark' ? '#EF4444' : '#DC2626' }}
                  />
                  <span className={combine("text-xs font-medium", get('text', 'primary'))}>
                    Absent
                  </span>
                </div>
              </div>
            </div>

            {/* Chart Container */}
            <div className="w-full overflow-x-auto pb-1">
              <div className="min-w-max">
              {tooltip.visible && (
                <div
                  className="fixed z-50 px-3 py-2 rounded-lg shadow-lg text-xs font-medium pointer-events-none"
                  style={{
                    left: tooltip.x,
                    top: tooltip.y,
                    background: theme === 'dark' ? '#111827' : '#ffffff',
                    color: theme === 'dark' ? '#F9FAFB' : '#111827',
                    border: theme === 'dark'
                      ? '1px solid #374151'
                      : '1px solid #E5E7EB'
                  }}
                >
                  <div className="font-semibold">{tooltip.label}</div>
                  <div>Count: {tooltip.value}</div>
                </div>
              )}

              <svg width={chartWidth} height={chartHeight + 40} className="overflow-visible block mx-auto">
                {/* Grid lines and y-axis labels */}
                {yTicks.map((tick, i) => {
                  const y = getY(tick);
                  return (
                    <g key={i}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padding.left - 10}
                        y={y}
                        textAnchor="end"
                        dominantBaseline="middle"
                        className={combine("text-[10px] sm:text-xs", get('text', 'tertiary'))}
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Y-axis line */}
                <line
                  x1={padding.left}
                  y1={padding.top}
                  x2={padding.left}
                  y2={chartHeight - padding.bottom}
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  strokeWidth="1.5"
                />

                {/* X-axis line */}
                <line
                  x1={padding.left}
                  y1={chartHeight - padding.bottom}
                  x2={chartWidth - padding.right}
                  y2={chartHeight - padding.bottom}
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  strokeWidth="1.5"
                />

                {/* X-axis labels */}
                {monthlyData.map((data, index) => (
                  <text
                    key={index}
                    x={getX(index)}
                    y={chartHeight - padding.bottom + 20}
                    textAnchor="middle"
                    className={combine("text-[10px] sm:text-xs font-medium", get('text', 'secondary'))}
                  >
                    {data.month}
                  </text>
                ))}

                {/* Present line (green) */}
                {visibleLines.present && (
                  <polyline
                    points={presentPoints}
                    fill="none"
                    stroke={theme === 'dark' ? '#10B981' : '#059669'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Late line (amber) */}
                {visibleLines.late && (
                  <polyline
                    points={latePoints}
                    fill="none"
                    stroke={theme === 'dark' ? '#F59E0B' : '#D97706'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Absent line (red) */}
                {visibleLines.absent && (
                  <polyline
                    points={absentPoints}
                    fill="none"
                    stroke={theme === 'dark' ? '#EF4444' : '#DC2626'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points */}
                {monthlyData.map((data, index) => {
                  const x = getX(index);
                  return (
                    <g key={index}>
                      {/* Present point */}
                      {visibleLines.present && (
                        <circle
                          cx={x}
                          cy={getY(data.present)}
                          r="4"
                          fill={theme === 'dark' ? '#10B981' : '#059669'}
                          stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                          onMouseMove={(e) =>
                            showTooltip(e, `${data.month} Present`, data.present)
                          }
                          onMouseLeave={hideTooltip}
                        />
                      )}

                      {/* Late point */}
                      {visibleLines.late && (
                        <circle
                          cx={x}
                          cy={getY(data.late)}
                          r="4"
                          fill={theme === 'dark' ? '#F59E0B' : '#D97706'}
                          stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                          onMouseMove={(e) =>
                            showTooltip(e, `${data.month} Late`, data.late)
                          }
                          onMouseLeave={hideTooltip}
                        />
                      )}

                      {/* Absent point */}
                      {visibleLines.absent && (
                        <circle
                          cx={x}
                          cy={getY(data.absent)}
                          r="4"
                          fill={theme === 'dark' ? '#EF4444' : '#DC2626'}
                          stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                          strokeWidth="2"
                          className="cursor-pointer transition-all"
                          onMouseMove={(e) =>
                            showTooltip(e, `${data.month} Absent`, data.absent)
                          }
                          onMouseLeave={hideTooltip}
                        />
                      )}
                    </g>
                  );
                })}
              </svg>
              </div>
            </div>
          </div>

          {/* Month Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
            {monthlyData.map((data, index) => {
              const total = data.present + data.late + data.absent;
              const percentage = total > 0 ? ((data.present / total) * 100).toFixed(1) : '0';

              return (
                <div
                  key={index}
                  className={combine(
                    "p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02]",
                    theme === 'dark' ? 'border-gray-700/50 bg-gray-800/20' : 'border-gray-200 bg-white/50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={combine("text-sm font-semibold", get('text', 'primary'))}>
                      {data.month} {historyYear}
                    </span>
                    <span className={combine(
                      "text-xs font-bold px-2 py-1 rounded-full",
                      parseFloat(percentage) >= 75
                        ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                        : parseFloat(percentage) >= 50
                          ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                          : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                    )}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">{data.present}</div>
                        <div className={combine("text-[10px]", get('text', 'tertiary'))}>Present</div>
                      </div>
                      <div>
                        <div className="text-amber-600 dark:text-amber-400 font-bold text-sm">{data.late}</div>
                        <div className={combine("text-[10px]", get('text', 'tertiary'))}>Late</div>
                      </div>
                      <div>
                        <div className="text-red-600 dark:text-red-400 font-bold text-sm">{data.absent}</div>
                        <div className={combine("text-[10px]", get('text', 'tertiary'))}>Absent</div>
                      </div>
                    </div>

                    <div className="flex justify-center gap-3 text-[10px] pt-1 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-1">
                        <span className={get('text', 'primary')}>Total:</span>
                        <span className={combine("font-bold", get('text', 'primary'))}>{total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </div>
    );
  };

  // Render area chart for monthly view
  const renderAreaChart = (history: { [day: string]: HistoryRecord[] }) => {
    const month = historyMonth;
    const year = historyYear;
    const daysInMonth = new Date(year, month, 0).getDate();

    // Get records for the month
    const monthRecords = history[String(month)] || [];
    const recordsByDate: { [key: string]: HistoryRecord } = {};
    monthRecords.forEach((record: HistoryRecord) => {
      recordsByDate[record.date] = record;
    });

    const dataPoints: any = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const record = recordsByDate[dateStr];

      let value = 0;
      if (record?.status === 'Present') value = 100;
      else if (record?.status === 'Late') value = 66;
      else if (record?.status === 'Absent') value = 33;
      else if (record?.status === 'Sunday' || record?.status === 'Holiday') value = 0;
      else value = -10; // No record

      dataPoints.push({
        day,
        value,
        status: record?.status || 'No Record',
        check_in_time: record?.check_in_time
      });
    }

    const chartHeight = 200;
    const chartWidth = Math.min(800, typeof window !== 'undefined' ? window.innerWidth - 100 : 700);
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerWidth = chartWidth - padding.left - padding.right;
    const xStep = dataPoints.length > 1 ? innerWidth / (dataPoints.length - 1) : 0;

    const getX = (index: number) => padding.left + (index * xStep);
    const getY = (value: number) => {
      if (value < 0) return chartHeight - padding.bottom + 10;
      return padding.top + ((100 - value) / 100) * (chartHeight - padding.top - padding.bottom);
    };

    // Generate area path
    let areaPath = `M ${getX(0)},${chartHeight - padding.bottom} `;
    dataPoints.forEach((point: any, i: any) => {
      const y = point.value >= 0 ? getY(point.value) : chartHeight - padding.bottom;
      areaPath += `L ${getX(i)},${y} `;
    });
    areaPath += `L ${getX(dataPoints.length - 1)},${chartHeight - padding.bottom} Z`;

    // Generate line path
    let linePath = '';
    dataPoints.forEach((point: any, i: any) => {
      if (point.value >= 0) {
        const y = getY(point.value);
        if (linePath === '') {
          linePath = `M ${getX(i)},${y}`;
        } else {
          linePath += ` L ${getX(i)},${y}`;
        }
      }
    });

    return (
      <div className="w-full overflow-x-auto">
        <div className="min-w-full p-4">
          <h4 className={combine("text-base sm:text-lg font-semibold mb-4 text-center", get('text', 'primary'))}>
            Daily Attendance Trend - {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h4>

          <div className="relative w-full flex flex-col items-center">
            <svg width={chartWidth} height={chartHeight + 40} className="overflow-visible mx-auto">
              <defs>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={theme === 'dark' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(99, 102, 241, 0.2)'} />
                  <stop offset="100%" stopColor={theme === 'dark' ? 'rgba(99, 102, 241, 0)' : 'rgba(99, 102, 241, 0)'} />
                </linearGradient>
              </defs>

              {/* Background grid lines */}
              {[0, 25, 50, 75, 100].map((tick, i) => {
                const y = getY(tick);
                return (
                  <g key={i}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={chartWidth - padding.right}
                      y2={y}
                      stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={padding.left - 10}
                      y={y}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className={combine("text-[10px]", get('text', 'tertiary'))}
                    >
                      {tick}%
                    </text>
                  </g>
                );
              })}

              {/* Area fill */}
              <path
                d={areaPath}
                fill="url(#areaGradient)"
                stroke="none"
              />

              {/* Line */}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke={theme === 'dark' ? '#6366F1' : '#4F46E5'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points */}
              {dataPoints.map((point: any, i: any) => {
                if (point.value < 0) return null;
                const x = getX(i);
                const y = getY(point.value);
                let fillColor = '';

                if (point.status === 'Present') fillColor = theme === 'dark' ? '#10B981' : '#059669';
                else if (point.status === 'Late') fillColor = theme === 'dark' ? '#F59E0B' : '#D97706';
                else if (point.status === 'Absent') fillColor = theme === 'dark' ? '#EF4444' : '#DC2626';
                else fillColor = theme === 'dark' ? '#6B7280' : '#9CA3AF';

                return (
                  <circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={fillColor}
                    stroke={theme === 'dark' ? '#1F2937' : '#FFFFFF'}
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:r-6"
                    onMouseMove={(e) =>
                      showTooltip(e, `Day ${point.day}: ${point.status}`, point.value)
                    }
                    onMouseLeave={hideTooltip}
                  />
                );
              })}

              {/* X-axis labels */}
              {[1, Math.floor(daysInMonth / 4), Math.floor(daysInMonth / 2), Math.floor(daysInMonth * 3 / 4), daysInMonth].map((day, i) => {
                const index = dataPoints.findIndex((p: any) => p.day === day);
                if (index === -1) return null;
                const x = getX(index);
                return (
                  <text
                    key={i}
                    x={x}
                    y={chartHeight - padding.bottom + 25}
                    textAnchor="middle"
                    className={combine("text-[10px] font-medium", get('text', 'secondary'))}
                  >
                    Day {day}
                  </text>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div className="flex justify-center mt-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className={combine("text-xs", get('text', 'secondary'))}>Present (100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <span className={combine("text-xs", get('text', 'secondary'))}>Late (66%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className={combine("text-xs", get('text', 'secondary'))}>Absent (33%)</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Handle view history from today tab
  const handleViewHistoryFromToday = (staff: DailyAttendance) => {
    setSelectedStaff(staff);
    setSelectedStaffId(staff.id);
    setActiveTab('history');
    setHistoryViewMode('monthly');
    setHistoryMonth(new Date().getMonth() + 1);
    setHistoryYear(new Date().getFullYear());
  };

  // Handle staff selection in history tab
  const handleStaffSelect = (staffId: string) => {
    setSelectedStaffId(staffId);
    const staff = staffMembers.find(s => s.id === staffId) || null;
    setSelectedStaff(staff);
  };

  // Handle history view mode change
  const handleHistoryViewModeChange = (mode: ViewMode) => {
    setHistoryViewMode(mode);
    // Reset view style based on mode
    if (mode === 'yearly') {
      setHistoryViewStyle('chart');
    } else if (mode === 'monthly') {
      setHistoryViewStyle('calendar');
    }
  };

  // Handle month change in history view
  const handleHistoryMonthChange = (month: number) => {
    setHistoryMonth(month);
  };

  // Handle year change in history view
  const handleHistoryYearChange = (year: number) => {
    setHistoryYear(year);
  };

  // Fetch history when view mode, date, or selected staff changes
  useEffect(() => {
    if (activeTab === 'history' && (selectedStaffId || selectedStaff)) {
      fetchStaffHistory();
    }
  }, [historyViewMode, historyMonth, historyYear, selectedStaffId, activeTab]);

  // Initialize / refresh today tab data
  useEffect(() => {
    fetchDailyReport();
  }, [selectedDate, statusFilter, roleFilter, searchTerm, currentPage]);

  // Keep history dropdown source unchanged.
  useEffect(() => {
    fetchAllStaff();
  }, [selectedDate]);

  // Filter and sort daily report
  const filteredStaff = dailyReport;

  const sortedStaff = [...filteredStaff].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (sortField === 'check_in_time') {
      aValue = aValue || '23:59:59';
      bValue = bValue || '23:59:59';
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(totalTodayRecords / itemsPerPage));
  const indexOfLastItem = Math.min(currentPage * itemsPerPage, totalTodayRecords);
  const indexOfFirstItem = totalTodayRecords === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const currentStaff = sortedStaff;

  // Handle sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Calculate statistics
  const stats = {
    total: todaySummary.total,
    present: todaySummary.present,
    absent: todaySummary.absent,
    late: todaySummary.late,
    presentPercentage: todaySummary.present_percentage.toFixed(1)
  };

  // Calculate role-based statistics
  const roleStats = STAFF_ROLES.reduce((acc, role) => {
    const roleItem = todayRoleSummary[role];
    if (roleItem && roleItem.total > 0) {
      const percentage = ((roleItem.present / roleItem.total) * 100).toFixed(1);
      acc[role] = {
        label: ROLE_DISPLAY_NAMES[role] || role,
        total: roleItem.total,
        present: roleItem.present,
        percentage
      };
    }
    return acc;
  }, {} as { [key: string]: { label: string; total: number; present: number; percentage: string } });

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const headers = ['Staff ID', 'Name', 'Role', 'Status', 'Check-in Time', 'Date'];
      const allRows: DailyAttendance[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const response = await adminApi.attendance.staff.dailyReportPaginated({
          date: selectedDate,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
          page,
          page_size: exportPageSize,
        });

        const data: DailyReportPaginatedResponse = response.data;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allRows.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      if (allRows.length === 0) {
        toastError('No attendance records to export');
        return;
      }

      const csvData = allRows.map(staff => [
        staff.id,
        staff.name,
        staff.role,
        staff.status,
        staff.check_in_time || '-',
        selectedDate
      ]);

      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `staff_attendance_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`CSV exported successfully! (${allRows.length} records)`);
    } catch (error) {
      console.error('Error exporting staff attendance CSV:', error);
      toastError('Failed to export CSV');
    }
  };

  // Render wave chart for attendance percentage
  const renderWaveChart = (percentage: number) => {
    const waveHeight = 40;
    const waveWidth = 120;
    const waveCount = 3;
    const waveAmplitude = 8;

    return (
      <div className="relative overflow-hidden" style={{ width: waveWidth, height: waveHeight }}>
        <svg
          width={waveWidth}
          height={waveHeight}
          className="absolute"
          style={{ bottom: 0 }}
        >
          {Array.from({ length: waveCount }).map((_, i) => (
            <path
              key={i}
              d={`
                M 0,${waveHeight / 2}
                Q ${waveWidth / 4},${waveHeight / 2 - waveAmplitude}
                ${waveWidth / 2},${waveHeight / 2}
                T ${waveWidth},${waveHeight / 2}
              `}
              fill="none"
              strokeWidth="2"
              transform={`translate(${-i * 20}, 0)`}
            />
          ))}
          <rect
            width={waveWidth}
            height={waveHeight * (1 - percentage / 100)}
            fill={theme === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={combine(
            "text-2xl font-bold",
            percentage >= 90 ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') :
              percentage >= 75 ? (theme === 'dark' ? 'text-amber-400' : 'text-amber-600') :
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  // Render Today tab content
  const renderTodayTab = () => (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-4">
        <div className={getCardGradientClass('indigo')}>
          <div className="flex items-center justify-between">
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Staff</p>
              <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.total}</p>
            </div>
            <div className={combine(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
            )}>
              <FaUsers className={combine(
                "text-sm sm:text-lg",
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
              )} />
            </div>
          </div>
        </div>

        <div className={getCardGradientClass('emerald')}>
          <div className="flex items-center justify-between">
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Present Today</p>
              <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.present}</p>
            </div>
            <div className={combine(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
            )}>
              <FaCheckCircle className={combine(
                "text-sm sm:text-lg",
                theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
              )} />
            </div>
          </div>
          <div className={combine("mt-2 text-xs", get('accent', 'success'))}>
            {stats.presentPercentage}% attendance
          </div>
        </div>

        <div className={getCardGradientClass('amber')}>
          <div className="flex items-center justify-between">
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Late Today</p>
              <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.late}</p>
            </div>
            <div className={combine(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
            )}>
              <FaClock className={combine(
                "text-sm sm:text-lg",
                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
              )} />
            </div>
          </div>
        </div>

        <div className={getCardGradientClass('red')}>
          <div className="flex items-center justify-between">
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Absent Today</p>
              <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.absent}</p>
            </div>
            <div className={combine(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
            )}>
              <FaTimesCircle className={combine(
                "text-sm sm:text-lg",
                theme === 'dark' ? 'text-red-400' : 'text-red-600'
              )} />
            </div>
          </div>
        </div>
      </div>

      {/* Role-wise Statistics */}
      <div className={combine(getCardGradientClass('purple'), 'mb-4')}>
        <h3 className={combine("text-base sm:text-lg font-semibold mb-3 sm:mb-4", get('text', 'primary'))}>
          Role-wise Attendance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3">
          {Object.entries(roleStats).map(([role, stats]) => {
            const roleColors = getRoleColor(role);

            return (
              <div
                key={role}
                className={combine(
                  "p-2.5 sm:p-3 rounded-lg border transition-all duration-300 hover:scale-[1.02]",
                  theme === 'dark'
                    ? 'border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/30'
                    : 'border-gray-200 bg-gradient-to-br from-white to-gray-50/50'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={combine("text-xs font-semibold truncate", get('text', 'primary'))}>
                    {stats.label}
                  </span>
                  <span className={combine(
                    "text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full",
                    roleColors.bg,
                    roleColors.text
                  )}>
                    {stats.percentage}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <FaUserTie className={roleColors.text} />
                    <span className={roleColors.text}>{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaCheckCircle className={combine(
                      "text-xs",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                    <span className={roleColors.text}>{stats.present}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2">
                  <div className={combine(
                    "h-1.5 rounded-full overflow-hidden",
                    theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-200'
                  )}>
                    <div
                      className={combine("h-full rounded-full transition-all duration-500")}
                      style={{
                        width: `${stats.percentage}%`,
                        background: theme === 'dark'
                          ? roleColors.text.replace('text-', '').replace('-300', '-500')
                          : roleColors.text.replace('text-', '').replace('-700', '-500')
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters Section */}
      <div className={combine(getCardGradientClass('indigo'), 'mb-4')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Date Picker */}
          <div>
            <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setCurrentPage(1);
              }}
              className={getInputClass()}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={getInputClass()}
            >
              <option value="all">All Status</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
              Role Filter
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className={getSelectClass()}
            >
              <option value="all">All Roles</option>
              {STAFF_ROLES.map(role => (
                <option key={role} value={role}>
                  {ROLE_DISPLAY_NAMES[role] || role}
                </option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="lg:col-span-2">
            <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
              Search Staff
            </label>
            <div className="relative">
              <FaSearch className={combine(
                "absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder="Search by name, ID, or role..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      {/* Attendance Table */}
      <div className={combine(getCardGradientClass(), 'mt-4 sm:mt-5')}>
        {/* Table Header */}
        <div className={combine("p-3 sm:p-4 border-b", get('border', 'primary'))}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <div>
              <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                Daily Attendance Report
              </h3>
              <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <div className={combine("text-xs", get('text', 'tertiary'))}>
                Showing {indexOfFirstItem} to {indexOfLastItem} of {totalTodayRecords} staff
              </div>
              <button
                onClick={exportToCSV}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-1 sm:space-x-2")}
              >
                <FaDownload className="text-xs sm:text-sm" />
                <span className="text-xs sm:text-sm">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Table Container with Fixed Height and Scroll */}
        <div className="relative">
          <div className="border-t border-b">
            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaSchool className="h-8 w-8 text-indigo-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                    Loading attendance data...
                  </p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing staff records</p>
                </div>
              </div>
            ) : currentStaff.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-2 sm:p-3 rounded-full mb-2 sm:mb-3",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaUsers className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                  )} />
                </div>
                <h3 className={combine("text-sm sm:text-base font-medium mb-1", get('text', 'primary'))}>
                  No attendance records found
                </h3>
                <p className={combine("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                  {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'No attendance data available for the selected date'}
                </p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                {/* Sticky Header - Desktop */}
                <thead className={combine(
                  "bg-[var(--color-bg-secondary)] sticky top-0 z-10 hidden sm:table-header-group",
                  get('border', 'primary'),
                  theme === 'dark' ? 'shadow-md' : 'shadow-sm'
                )}>
                  <tr>
                    <th className={combine(
                      "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                      get('text', 'tertiary'),
                      "hover:bg-[var(--color-bg-hover)]"
                    )}
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FaUsers className="text-xs" />
                        <span className="text-xs">Staff Details</span>
                        <div className="ml-1">
                          {sortField === 'name' ? (
                            sortDirection === 'asc' ?
                              <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> :
                              <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                          ) : (
                            <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                      get('text', 'tertiary'),
                      "hover:bg-[var(--color-bg-hover)]"
                    )}
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FaUserTag className="text-xs" />
                        <span className="text-xs">Role</span>
                        <div className="ml-1">
                          {sortField === 'role' ? (
                            sortDirection === 'asc' ?
                              <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> :
                              <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                          ) : (
                            <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                      get('text', 'tertiary'),
                      "hover:bg-[var(--color-bg-hover)]"
                    )}
                      onClick={() => handleSort('check_in_time')}
                    >
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FaCalendarAlt className="text-xs" />
                        <span className="text-xs">Check-in Time</span>
                        <div className="ml-1">
                          {sortField === 'check_in_time' ? (
                            sortDirection === 'asc' ?
                              <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> :
                              <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                          ) : (
                            <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer bg-[var(--color-bg-secondary)]",
                      get('text', 'tertiary'),
                      "hover:bg-[var(--color-bg-hover)]"
                    )}
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FaChartBar className="text-xs" />
                        <span className="text-xs">Status</span>
                        <div className="ml-1">
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ?
                              <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> :
                              <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                          ) : (
                            <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                          )}
                        </div>
                      </div>
                    </th>
                    <th className={combine(
                      "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase tracking-wider bg-[var(--color-bg-secondary)]",
                      get('text', 'tertiary')
                    )}>
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <FaEye className="text-xs" />
                        <span className="text-xs">Actions</span>
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* Mobile header */}
                <div className={combine("sm:hidden px-2 py-2 sticky top-0 z-10", get('bg', 'secondary'))}>
                  <h4 className={combine("text-xs font-medium", get('text', 'primary'))}>
                    Staff Attendance ({currentStaff.length})
                  </h4>
                </div>

                {/* Table Body */}
                <tbody className={combine("divide-y", get('bg', 'card'), get('border', 'primary'))}>
                  {currentStaff.map((staff) => (
                    <tr key={staff.id} className="hover:bg-[var(--color-bg-hover)] block sm:table-row">
                      {/* Mobile View */}
                      <td colSpan={5} className="sm:hidden block p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={combine(
                              "h-8 w-8 rounded-full flex items-center justify-center mr-2",
                              theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                            )}>
                              <FaUserTie className={combine(
                                "text-xs",
                                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                              )} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{staff.name}</div>
                              <div className={combine("text-xs mt-0.5", get('text', 'tertiary'))}>
                                ID: {staff.id}
                              </div>
                            </div>
                          </div>
                          <span className={getStatusBadgeClass(staff.status)}>
                            {staff.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            <FaUserTag className={combine("text-xs", get('text', 'tertiary'))} />
                            <span className={combine("text-xs", get('text', 'secondary'))}>
                              {ROLE_DISPLAY_NAMES[staff.role] || staff.role}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FaCalendarAlt className={combine("text-xs", get('text', 'tertiary'))} />
                            <span className={combine("text-xs", get('text', 'secondary'))}>
                              {staff.check_in_time || 'No check-in'}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => handleViewHistoryFromToday(staff)}
                            className={combine(
                              "px-2 py-1 rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs",
                              theme === 'dark'
                                ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/30 border border-indigo-800'
                                : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
                            )}
                          >
                            <FaHistory className="text-xs" />
                            <span>History</span>
                          </button>
                        </div>
                      </td>

                      {/* Desktop View */}
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <div className="flex items-center">
                          <div className={combine(
                            "h-8 sm:h-10 w-8 sm:w-10 rounded-full flex items-center justify-center mr-2 sm:mr-3",
                            theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                          )}>
                            <FaUserTie className={combine(
                              "text-sm",
                              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                            )} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{staff.name}</div>
                            <div className={combine("text-xs mt-0.5 sm:mt-1", get('text', 'tertiary'))}>
                              ID: {staff.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <span className={getRoleBadgeClass(staff.role)}>
                          {ROLE_DISPLAY_NAMES[staff.role] || staff.role}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <div className={combine("text-sm", get('text', 'primary'))}>
                          {staff.check_in_time || '-'}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <span className={getStatusBadgeClass(staff.status)}>
                          {staff.status}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={() => handleViewHistoryFromToday(staff)}
                          className={combine(
                            "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 hover:scale-[1.02] active:scale-[0.98] text-xs",
                            theme === 'dark'
                              ? 'bg-indigo-900/30 text-indigo-300 hover:bg-indigo-800/30 border border-indigo-800'
                              : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
                          )}
                        >
                          <FaHistory className="text-xs" />
                          <span>View History</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && !loading && currentStaff.length > 0 && (
            <div className={combine("px-3 sm:px-4 py-2 sm:py-3 border-t", get('border', 'primary'))}>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                <p className={combine("text-xs", get('text', 'tertiary'))}>
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center space-x-1 sm:space-x-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className={combine(
                      "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                      getSecondaryButtonClass()
                    )}
                  >
                    <FaChevronLeft className="text-xs" />
                  </button>

                  <div className="flex space-x-0.5 sm:space-x-1">
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
                            "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
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
                    disabled={currentPage === totalPages}
                    className={combine(
                      "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm",
                      getSecondaryButtonClass()
                    )}
                  >
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  // Render History tab content
  const renderHistoryTab = () => (
    <div className={getCardGradientClass('indigo')}>
      <h3 className={combine("text-lg font-bold mb-4 sm:mb-6", get('text', 'primary'))}>
        Staff Attendance History
      </h3>

      {/* Staff Selection */}
      <div className="mb-4 sm:mb-6 relative">
        <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
          Select Staff Member
        </label>
        <div className="relative">
          <select
            value={selectedStaffId}
            onChange={(e) => handleStaffSelect(e.target.value)}
            className={getSelectClass()}
          >
            <option value="">Select a staff member...</option>
            {staffMembers.map(staff => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({ROLE_DISPLAY_NAMES[staff.role] || staff.role}) - ID: {staff.id}
              </option>
            ))}
          </select>
          <FaChevronDown className={combine(
            "absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none",
            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
          )} />
        </div>
      </div>

      {/* History Content */}
      {selectedStaffId ? (
        <>
          {/* Staff Info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl border" style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(99, 102, 241, 0.1))'
              : 'linear-gradient(135deg, #f8fafc, #e0f2fe)',
            borderColor: theme === 'dark' ? 'rgba(99, 102, 241, 0.2)' : '#c7d2fe'
          }}>
            <div className="flex items-center">
              {historyData?.staff_profile?.profile_image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_BACKEND_API}${historyData.staff_profile.profile_image}`}
                  alt={historyData?.staff_profile?.staff_name || selectedStaff?.name || 'Staff'}
                  className="h-10 sm:h-12 w-10 sm:w-12 rounded-full object-cover mr-3 sm:mr-4 border border-indigo-300 dark:border-indigo-700"
                />
              ) : (
                <div className={combine(
                  "h-10 sm:h-12 w-10 sm:w-12 rounded-full flex items-center justify-center mr-3 sm:mr-4",
                  theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                )}>
                  <FaUserTie className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                  )} />
                </div>
              )}
              <div>
                <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>
                  {historyData?.staff_profile?.staff_name || selectedStaff?.name || 'Loading...'}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={getRoleBadgeClass(historyData?.staff_profile?.staff_role || selectedStaff?.role || '')}>
                    {historyData?.staff_profile?.staff_role
                      ? (ROLE_DISPLAY_NAMES[historyData.staff_profile.staff_role] || historyData.staff_profile.staff_role)
                      : selectedStaff ? (ROLE_DISPLAY_NAMES[selectedStaff.role] || selectedStaff.role) : ''}
                  </span>
                  <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                    ID: {historyData?.staff_profile?.staff_id || selectedStaffId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
            <button
              onClick={() => handleHistoryViewModeChange('daily')}
              className={getViewModeButtonClass(historyViewMode === 'daily')}
            >
              <FaCalendarDay className="text-xs sm:text-sm" />
              <span className="hidden xs:inline">Daily</span>
              <span className="xs:hidden">Day</span>
            </button>
            <button
              onClick={() => handleHistoryViewModeChange('monthly')}
              className={getViewModeButtonClass(historyViewMode === 'monthly')}
            >
              <FaCalendarWeek className="text-xs sm:text-sm" />
              <span className="hidden xs:inline">Monthly</span>
              <span className="xs:hidden">Month</span>
            </button>
            <button
              onClick={() => handleHistoryViewModeChange('yearly')}
              className={getViewModeButtonClass(historyViewMode === 'yearly')}
            >
              <FaCalendar className="text-xs sm:text-sm" />
              <span className="hidden xs:inline">Yearly</span>
              <span className="xs:hidden">Year</span>
            </button>
          </div>

          {/* Month/Year Selector with custom styling */}
          {(historyViewMode === 'monthly' || historyViewMode === 'yearly') && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
              {historyViewMode === 'monthly' && (
                <div className="relative flex-1">
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
                    Select Month
                  </label>
                  <div className="relative">
                    <select
                      value={historyMonth}
                      onChange={(e) => handleHistoryMonthChange(parseInt(e.target.value))}
                      className={getSelectClass()}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {new Date(historyYear, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                    <FaCalendarAlt className={combine(
                      "absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                    )} />
                  </div>
                </div>
              )}
              <div className="relative flex-1">
                <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
                  Select Year
                </label>
                <div className="relative">
                  <select
                    value={historyYear}
                    onChange={(e) => handleHistoryYearChange(parseInt(e.target.value))}
                    className={getSelectClass()}
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <FaCalendar className={combine(
                    "absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none",
                    theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                  )} />
                </div>
              </div>
            </div>
          )}

          {/* View Style Selector for Monthly/Yearly */}
          {(historyViewMode === 'monthly' || historyViewMode === 'yearly') && (
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 flex-wrap">
              {historyViewMode === 'monthly' && (
                <button
                  onClick={() => setHistoryViewStyle('calendar')}
                  className={getViewModeButtonClass(historyViewStyle === 'calendar')}
                >
                  <FaCalendarCheck className="text-xs sm:text-sm" />
                  <span className="hidden sm:inline">Calendar</span>
                  <span className="sm:hidden">Cal</span>
                </button>
              )}
              {historyViewMode === 'yearly' && (
                <button
                  onClick={() => setHistoryViewStyle('chart')}
                  className={getViewModeButtonClass(historyViewStyle === 'chart')}
                >
                  <FaChartLine className="text-xs sm:text-sm" />
                  <span className="hidden sm:inline">Chart</span>
                  <span className="sm:hidden">Chart</span>
                </button>
              )}

              <button
                onClick={() => setHistoryViewStyle('list')}
                className={getViewModeButtonClass(historyViewStyle === 'list')}
              >
                <FaTable className="text-xs sm:text-sm" />
                <span className="hidden sm:inline">List</span>
                <span className="sm:hidden">List</span>
              </button>
            </div>
          )}

          {/* History Data */}
          {historyLoading ? (
            <div className="p-8 text-center">
              <div className="text-center">
                <div className="relative mx-auto w-16 h-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaSchool className="h-8 w-8 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                  Loading attendance history...
                </p>
                <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing staff records</p>
              </div>
            </div>
          ) : historyData ? (
            <div>
              {/* Summary Section */}
              {'summary' in historyData && (
                <div className="mb-6 sm:mb-8">
                  <h3 className={combine("text-base sm:text-lg font-semibold mb-3 sm:mb-4", get('text', 'primary'))}>
                    Summary - {historyData.period}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                    <div className={combine("p-3 sm:p-4 rounded-lg border transition-all duration-200 sm:duration-300 hover:scale-[1.02]", get('bg', 'secondary'), get('border', 'secondary'))}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Working Days</p>
                      <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1", get('text', 'primary'))}>
                        {historyData.summary.actual_working_days}
                      </p>
                    </div>
                    <div className={combine("p-3 sm:p-4 rounded-lg border transition-all duration-200 sm:duration-300 hover:scale-[1.02]",
                      theme === 'dark' ? 'bg-emerald-900/10 border-emerald-800/30' : 'bg-emerald-50 border-emerald-200'
                    )}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Present</p>
                      <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1", theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')}>
                        {historyData.summary.present}
                      </p>
                    </div>
                    <div className={combine("p-3 sm:p-4 rounded-lg border transition-all duration-200 sm:duration-300 hover:scale-[1.02]",
                      theme === 'dark' ? 'bg-amber-900/10 border-amber-800/30' : 'bg-amber-50 border-amber-200'
                    )}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Late</p>
                      <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1", theme === 'dark' ? 'text-amber-400' : 'text-amber-600')}>
                        {historyData.summary.late}
                      </p>
                    </div>
                    <div className={combine("p-3 sm:p-4 rounded-lg border transition-all duration-200 sm:duration-300 hover:scale-[1.02]",
                      theme === 'dark' ? 'bg-red-900/10 border-red-800/30' : 'bg-red-50 border-red-200'
                    )}>
                      <p className={combine("text-xs", get('text', 'tertiary'))}>Absent</p>
                      <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>
                        {historyData.summary.absent}
                      </p>
                    </div>
                  </div>

                  {/* Wave Chart for Percentage */}
                  <div className="mt-4 sm:mt-6 flex items-center justify-center">
                    <div className="text-center">
                      <p className={combine("text-xs sm:text-sm mb-1 sm:mb-2", get('text', 'tertiary'))}>Attendance Percentage</p>
                      {renderWaveChart(
                        parseFloat(
                          'percentage' in historyData.summary
                            ? historyData.summary.percentage.replace('%', '')
                            : historyData.summary.attendance_percentage.replace('%', '')
                        )
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* History Display based on view style */}
              {(() => {
                if ('data' in historyData && historyData.data) {
                  // Single date view
                  return (
                    <div className={combine("p-4 sm:p-6 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
                      <FaCalendarCheck className={combine(
                        "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500'
                      )} />
                      <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                        {historyData.data.date}
                      </h4>
                      <span className={getStatusBadgeClass(historyData.data.status)}>
                        {historyData.data.status}
                      </span>
                      {historyData.data.check_in_time && (
                        <p className={combine("mt-2 sm:mt-3 text-xs sm:text-sm", get('text', 'secondary'))}>
                          Check-in: {historyData.data.check_in_time}
                        </p>
                      )}
                    </div>
                  );
                } else if ('date' in historyData && historyData.date && historyData.status) {
                  // Single date view without nested data object
                  return (
                    <div className={combine("p-4 sm:p-6 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
                      <FaCalendarCheck className={combine(
                        "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
                        theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
                      )} />
                      <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                        {historyData.date}
                      </h4>
                      <span className={getStatusBadgeClass(historyData.status)}>
                        {historyData.status}
                      </span>
                    </div>
                  );
                } else if ('status' in historyData && historyData.status === 'Absent') {
                  // No record for single date
                  return (
                    <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
                      <FaCalendarTimes className={combine(
                        "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
                        theme === 'dark' ? 'text-red-400' : 'text-red-500'
                      )} />
                      <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                        No Attendance Record
                      </h4>
                      <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                        No attendance record found for {selectedDate}
                      </p>
                    </div>
                  );
                } else if ('history' in historyData) {
                  const history = historyData.history;
                  const hasHistory = Object.keys(history).length > 0 &&
                    Object.values(history).some(records => Array.isArray(records) && records.length > 0);

                  if (!hasHistory) {
                    return (
                      <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
                        <FaCalendarMinus className={combine(
                          "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        )} />
                        <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                          No Attendance History
                        </h4>
                        <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                          No attendance records found for this period
                        </p>
                      </div>
                    );
                  }

                  // Monthly view with different styles
                  if (historyViewMode === 'monthly') {
                    if (historyViewStyle === 'calendar') {
                      return renderCalendarView(history);
                    } else if (historyViewStyle === 'chart') {
                      return renderAreaChart(history);
                    } else {
                      // List view
                      // List view for monthly history
                      const records = Object.entries(history).flatMap(([key, dayRecords]) =>
                        Array.isArray(dayRecords)
                          ? dayRecords.map(record => ({
                            ...record,
                            displayKey: key
                          }))
                          : []
                      );

                      return (
                        <div className="relative">
                          <div className="overflow-y-auto max-h-[400px] border rounded-lg" style={{ maxHeight: 'calc(100vh - 500px)' }}>
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                              {/* Sticky Header */}
                              <thead className={combine(
                                "bg-[var(--color-bg-secondary)] sticky top-0 z-10",
                                get('border', 'primary'),
                                theme === 'dark' ? 'shadow-md' : 'shadow-sm'
                              )}>
                                <tr>
                                  <th className={combine(
                                    "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                                    get('text', 'tertiary')
                                  )}>
                                    Date
                                  </th>
                                  <th className={combine(
                                    "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                                    get('text', 'tertiary')
                                  )}>
                                    Status
                                  </th>
                                  <th className={combine(
                                    "px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium uppercase bg-[var(--color-bg-secondary)]",
                                    get('text', 'tertiary')
                                  )}>
                                    Check-in Time
                                  </th>
                                </tr>
                              </thead>

                              {/* Table Body */}
                              <tbody className={combine("divide-y", get('bg', 'card'), get('border', 'primary'))}>
                                {records.map((record, index) => (
                                  <tr key={index} className="hover:bg-[var(--color-bg-hover)]">
                                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                      {record.date}
                                    </td>
                                    <td className="px-3 sm:px-4 py-2 sm:py-3">
                                      <span className={getStatusBadgeClass(record.status)}>
                                        {record.status}
                                      </span>
                                    </td>
                                    <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                                      {record.check_in_time || '-'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    }
                  } else if (historyViewMode === 'yearly') {
                    if (historyViewStyle === 'chart') {
                      return renderYearCharts(history);
                    }
                    return renderYearMonthData(history);
                  }
                }
                return null;
              })()}
            </div>
          ) : (
            <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
              <FaHistory className={combine(
                "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
                theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
              )} />
              <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                No History Available
              </h4>
              <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                Select a staff member and period to view attendance history
              </p>
            </div>
          )}
        </>
      ) : (
        <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
          <FaUsers className={combine(
            "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
            theme === 'dark' ? 'text-indigo-400' : 'text-indigo-500'
          )} />
          <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
            Select a Staff Member
          </h4>
          <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
            Choose a staff member from the dropdown to view their attendance history
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full">
        {/* Header Section */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700"
                  : "bg-gradient-to-br from-indigo-500 to-indigo-600"
              )}>
                <FaUsers className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Staff Attendance
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Track and monitor staff attendance records across all roles
                </p>
              </div>
            </div>
            {showRedirectBackButton && (
              <button
                onClick={handleRedirectBack}
                className={combine(
                  getSecondaryButtonClass(),
                  'sm:ml-auto flex items-center justify-center'
                )}
              >
                Back
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <button
              onClick={() => setActiveTab('today')}
              className={combine(
                "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                activeTab === 'today'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                  : getSecondaryButtonClass()
              )}
            >
              <FaCalendarDay className="text-xs sm:text-sm" />
              <span>Today</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={combine(
                "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                activeTab === 'history'
                  ? theme === 'dark'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg'
                  : getSecondaryButtonClass()
              )}
            >
              <FaHistory className="text-xs sm:text-sm" />
              <span>History</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-2 sm:mt-0">
            {activeTab === 'today' ? renderTodayTab() : renderHistoryTab()}
          </div>
        </div>
      </div>
    </div>
  );
}
