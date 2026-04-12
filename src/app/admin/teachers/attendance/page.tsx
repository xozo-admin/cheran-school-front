// src/app/admin/teachers/attendance/page.tsx

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
  FaSearch,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaHistory,
  FaCalendarCheck,
  FaCalendarTimes,
  FaTable,
  FaCalendarMinus,
  FaRegCalendarCheck,
  FaRegCalendarTimes,
  FaRegCalendarAlt,
  FaChevronDown,
  FaTimes,
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
  teacher_profile?: {
    teacher_id: string;
    teacher_name: string;
    department?: string;
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
  teacher_profile?: {
    teacher_id: string;
    teacher_name: string;
    department?: string;
    profile_image?: string | null;
  };
  summary: YearSummary;
  history: {
    [month: string]: HistoryRecord[];
  };
}

interface SingleDateHistory {
  period: string;
  teacher_profile?: {
    teacher_id: string;
    teacher_name: string;
    department?: string;
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

type SortField = 'name' | 'status' | 'check_in_time';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'daily' | 'monthly' | 'yearly';
type TabType = 'today' | 'history';

export default function TeacherAttendancePage() {
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // State for history tab
  const [teachers, setTeachers] = useState<DailyAttendance[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedTeacher, setSelectedTeacher] = useState<DailyAttendance | null>(null);
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

  const searchParams = useSearchParams();

useEffect(() => {
  const teacherId = searchParams.get('teacherId');
  const tab = searchParams.get('tab');
  const redirectedFrom = searchParams.get('redirectedFrom');
  setShowRedirectBackButton(redirectedFrom === 'allteachers');
  
  if (teacherId && teachers.length > 0) {
    // Find the teacher in the teachers list
    const teacher = teachers.find(t => t.id === teacherId);
    if (teacher) {
      setSelectedTeacherId(teacherId);
      setSelectedTeacher(teacher);
      
      // Switch to history tab if specified
      if (tab === 'history') {
        setActiveTab('history');
        setHistoryViewMode('monthly');
        setHistoryMonth(new Date().getMonth() + 1);
        setHistoryYear(new Date().getFullYear());
      }
    }
  }
}, [searchParams, teachers]);

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/teachers/allteachers';
  };

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'purple') => {
    const baseClasses = combine(
      'rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
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
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getSelectClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none transition-all w-full appearance-none cursor-pointer',
    'text-xs sm:text-sm font-medium',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-purple-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-purple-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:shadow-sm focus:shadow-md',
    theme === 'dark'
      ? 'bg-gradient-to-br from-gray-800/50 to-gray-900/30'
      : 'bg-gradient-to-br from-white to-gray-50/50'
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
          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
          : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
      );
    }

    return combine(
      baseClass,
      getSecondaryButtonClass(),
      'hover:shadow-md'
    );
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-purple-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-purple-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
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

  // Fetch all teachers for dropdown
  const fetchAllTeachers = async () => {
    try {
      const res = await adminApi.attendance.teacher.dailyReport(new Date().toISOString().split('T')[0]);
      const data: DailyReportResponse = res.data;
      setTeachers(data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    }
  };

  // Fetch daily attendance report
  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const res = await adminApi.attendance.teacher.dailyReportPaginated({
        date: selectedDate,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: searchTerm.trim() ? searchTerm.trim() : undefined,
        page: currentPage,
        page_size: itemsPerPage,
      });
      const data: DailyReportPaginatedResponse = res.data;
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
    } finally {
      setLoading(false);
    }
  };

  // Fetch teacher attendance history
  const fetchTeacherHistory = async () => {
    if (!selectedTeacherId && !selectedTeacher) return;

    setHistoryLoading(true);
    try {
      const teacherId = selectedTeacherId || selectedTeacher?.id;
      if (!teacherId) return;

      const res = await adminApi.attendance.teacher.history(
        String(teacherId),
        historyViewMode,
        selectedDate,
        historyMonth,
        historyYear
      );
      const data = res.data;
      setHistoryData(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      setHistoryData(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  const renderCalendarView = (history: { [day: string]: HistoryRecord[] }) => {
    const month = historyMonth;
    const year = historyYear;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

    // Get all records for the current month
    // The API returns all records in a single array under the month key
    const monthRecords = history[String(month)] || [];

    // Create a map of date strings to records for easy lookup
    const recordsByDate: { [key: string]: HistoryRecord } = {};
    monthRecords.forEach((record: HistoryRecord) => {
      // Store by full date string for exact matching
      recordsByDate[record.date] = record;
    });

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-1 sm:p-2"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Create date string in YYYY-MM-DD format to match API
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;

      // Look up the record by exact date string
      const dayRecord = recordsByDate[dateStr];
      const dayStatus = dayRecord?.status || null;

      // Check if this day is today
      const isToday = isCurrentMonth && day === today.getDate();

      // Check if this day is Sunday (only if no record exists)
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
        // No record for this day
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
            isToday ? (theme === 'dark' ? 'ring-1 sm:ring-2 ring-blue-500/50' : 'ring-1 sm:ring-2 ring-blue-400/50') : '',
            !dayRecord ? 'opacity-70' : '' // Make days without records slightly transparent
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

  const [visibleLines, setVisibleLines] = useState<any>({
    present: true,
    late: true,
    absent: true
  });

  const toggleLine = (key: 'present' | 'late' | 'absent') => {
    setVisibleLines((prev: any) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };


  // Updated renderYearCharts function with proper line chart
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
    const padding = { top: 50, right: 50, bottom: 50, left: 60 }; // Increased top padding for legend
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
                      {/* Horizontal grid line */}
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      {/* Y-axis label */}
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
                    {/* Attendance counts */}
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

                    {/* Total */}
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

  // Handle view history from today tab
  const handleViewHistoryFromToday = (teacher: DailyAttendance) => {
    setSelectedTeacher(teacher);
    setSelectedTeacherId(teacher.id);
    setActiveTab('history');
    setHistoryViewMode('monthly');
    setHistoryMonth(new Date().getMonth() + 1);
    setHistoryYear(new Date().getFullYear());
  };

  // Handle teacher selection in history tab
  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const teacher = teachers.find(t => t.id === teacherId) || null;
    setSelectedTeacher(teacher);
  };

  // Handle history view mode change
  const handleHistoryViewModeChange = (mode: ViewMode) => {
    setHistoryViewMode(mode);
    setHistoryViewStyle(mode === 'yearly' ? 'chart' : 'calendar');
  };

  // Handle month change in history view
  const handleHistoryMonthChange = (month: number) => {
    setHistoryMonth(month);
  };

  // Handle year change in history view
  const handleHistoryYearChange = (year: number) => {
    setHistoryYear(year);
  };

  // Fetch history when view mode, date, or selected teacher changes
  useEffect(() => {
  // Check URL parameters first
  const teacherId = searchParams.get('teacherId');
  
  if (activeTab === 'history') {
    if (teacherId && !selectedTeacherId && teachers.length > 0) {
      // Set from URL if not already set
      const teacher = teachers.find(t => t.id === teacherId);
      if (teacher) {
        setSelectedTeacherId(teacherId);
        setSelectedTeacher(teacher);
      }
    }
    
    if (selectedTeacherId || selectedTeacher) {
      fetchTeacherHistory();
    }
  }
}, [historyViewMode, historyMonth, historyYear, selectedTeacherId, activeTab, teachers, searchParams]);

  // Initialize / refresh today tab data
  useEffect(() => {
    fetchDailyReport();
  }, [selectedDate, statusFilter, searchTerm, currentPage]);

  // Keep history dropdown teacher list behavior separate.
  useEffect(() => {
    fetchAllTeachers();
  }, [selectedDate]);

  // Filter and sort daily report
  const filteredTeachers = dailyReport;

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
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
  const currentTeachers = sortedTeachers;

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

  // Export to CSV
  const exportToCSV = async () => {
    try {
      const allTeachers: DailyAttendance[] = [];
      let page = 1;
      let hasMore = true;
      const exportPageSize = 200;

      while (hasMore) {
        const res = await adminApi.attendance.teacher.dailyReportPaginated({
          date: selectedDate,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm.trim() ? searchTerm.trim() : undefined,
          page,
          page_size: exportPageSize,
        });

        const data: DailyReportPaginatedResponse = res.data;
        const pageResults = Array.isArray(data.results) ? data.results : [];
        allTeachers.push(...pageResults);

        hasMore = !!data.next;
        page += 1;
      }

      if (allTeachers.length === 0) {
        toastError('No attendance records to export');
        return;
      }

      const sortedForExport = [...allTeachers].sort((a, b) => {
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

      const headers = ['Teacher ID', 'Name', 'Status', 'Check-in Time', 'Date'];
      const csvData = sortedForExport.map(teacher => [
        teacher.id,
        teacher.name,
        teacher.status,
        teacher.check_in_time || '-',
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
      a.download = `teacher_attendance_${selectedDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toastSuccess(`CSV exported successfully! (${allTeachers.length} records)`);
    } catch (error) {
      console.error('Error exporting teacher attendance CSV:', error);
      toastError('Failed to export CSV');
    }
  };

  // Render wave chart for attendance percentage
  const renderWaveChart = (percentage: number) => {
    const waveHeight = 30;
    const waveWidth = 100;
    const waveCount = 3;
    const waveAmplitude = 6;

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
              strokeWidth="1.5"
              transform={`translate(${-i * 15}, 0)`}
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
            "text-lg sm:text-xl font-bold",
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
        <div className={getCardGradientClass('purple')}>
          <div className="flex items-center justify-between">
            <div>
              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Teachers</p>
              <p className={combine("text-lg sm:text-xl lg:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{stats.total}</p>
            </div>
            <div className={combine(
              "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
              theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
            )}>
              <FaUserTie className={combine(
                "text-sm sm:text-lg",
                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
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

      {/* Filters Section */}
      <div className={combine(getCardGradientClass('purple'), 'mb-4')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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

          {/* Search */}
          <div className="sm:col-span-2">
            <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
              Search Teachers
            </label>
            <div className="relative">
              <FaSearch className={combine(
                "absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                get('icon', 'secondary')
              )} />
              <input
                type="text"
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className={getInputClass()}
                style={{ paddingLeft: '2rem' }}
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
                Showing {indexOfFirstItem} to {indexOfLastItem} of {totalTodayRecords} teachers
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
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                    Loading attendance data...
                  </p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing attendance records</p>
                </div>
              </div>
            ) : currentTeachers.length === 0 ? (
              <div className="p-6 sm:p-8 text-center">
                <div className={combine(
                  "inline-block p-2 sm:p-3 rounded-full mb-2 sm:mb-3",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <FaUserTie className={combine(
                    "text-lg sm:text-xl",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                  )} />
                </div>
                <h3 className={combine("text-sm sm:text-base font-medium mb-1", get('text', 'primary'))}>
                  No attendance records found
                </h3>
                <p className={combine("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                  {searchTerm || statusFilter !== 'all'
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
                        <FaUserTie className="text-xs" />
                        <span className="text-xs">Teacher Details</span>
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

                {/* Mobile table headers */}
                <div className={combine("sm:hidden px-2 py-2 sticky top-0 z-10", get('bg', 'secondary'))}>
                  <h4 className={combine("text-xs font-medium", get('text', 'primary'))}>
                    Teacher Attendance ({currentTeachers.length})
                  </h4>
                </div>

                {/* Table Body */}
                <tbody className={combine("divide-y", get('bg', 'card'), get('border', 'primary'))}>
                  {currentTeachers.map((teacher) => (
                    <tr key={teacher.id} className="hover:bg-[var(--color-bg-hover)] block sm:table-row">
                      {/* Mobile View */}
                      <td colSpan={4} className="sm:hidden block p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            <div className={combine(
                              "h-8 w-8 rounded-full flex items-center justify-center mr-2",
                              theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                            )}>
                              <FaUserTie className={combine(
                                "text-xs",
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              )} />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{teacher.name}</div>
                              <div className={combine("text-xs mt-0.5", get('text', 'tertiary'))}>
                                ID: {teacher.id}
                              </div>
                            </div>
                          </div>
                          <span className={getStatusBadgeClass(teacher.status)}>
                            {teacher.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center space-x-2">
                            <FaCalendarAlt className={combine("text-xs", get('text', 'tertiary'))} />
                            <span className={combine("text-xs", get('text', 'secondary'))}>
                              {teacher.check_in_time || 'No check-in'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleViewHistoryFromToday(teacher)}
                            className={combine(
                              "px-2 py-1 rounded-lg transition-all duration-200 flex items-center space-x-1 text-xs",
                              theme === 'dark'
                                ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 border border-blue-800'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
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
                            theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                          )}>
                            <FaUserTie className={combine(
                              "text-sm",
                              theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                            )} />
                          </div>
                          <div>
                            <div className="font-semibold text-sm">{teacher.name}</div>
                            <div className={combine("text-xs mt-0.5 sm:mt-1", get('text', 'tertiary'))}>
                              ID: {teacher.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <div className={combine("text-sm", get('text', 'primary'))}>
                          {teacher.check_in_time || '-'}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <span className={getStatusBadgeClass(teacher.status)}>
                          {teacher.status}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell px-3 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={() => handleViewHistoryFromToday(teacher)}
                          className={combine(
                            "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 hover:scale-[1.02] active:scale-[0.98] text-xs",
                            theme === 'dark'
                              ? 'bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 border border-blue-800'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
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
          {totalPages > 1 && !loading && currentTeachers.length > 0 && (
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
    <div className={getCardGradientClass('blue')}>
      <h3 className={combine("text-lg font-bold mb-4 sm:mb-6", get('text', 'primary'))}>
        Teacher Attendance History
      </h3>

      {/* Teacher Selection */}
      {teachers.length === 0 && searchParams.get('teacherId') ? (
  <div className="p-8 text-center">
    <div className="text-center">
      <div className="relative mx-auto w-16 h-16">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
        </div>
      </div>
      <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
        Loading teacher data...
      </p>
      <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing teacher records</p>
    </div>
  </div>
) : (
      <div className="mb-4 sm:mb-6 relative">
        <label className={combine("block text-xs sm:text-sm font-medium mb-1 sm:mb-2", get('text', 'primary'))}>
          Select Teacher
        </label>
        <div className="relative">
          
          <select
            value={selectedTeacherId}
            onChange={(e) => handleTeacherSelect(e.target.value)}
            className={getSelectClass()}
          >
            <option value="">Select a teacher...</option>
            {teachers.map(teacher => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} (ID: {teacher.id})
              </option>
            ))}
          </select>
          <FaChevronDown className={combine(
            "absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 pointer-events-none",
            theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
          )} />
        </div>
      </div>
)}
      {/* History Content */}
      {selectedTeacherId ? (
        <>
          {/* Teacher Info */}
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl border" style={{
            background: theme === 'dark'
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.5), rgba(59, 130, 246, 0.1))'
              : 'linear-gradient(135deg, #f8fafc, #e0f2fe)',
            borderColor: theme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : '#bae6fd'
          }}>
            <div className="flex items-center">
              {historyData?.teacher_profile?.profile_image ? (
                <img
                  src={`${process.env.NEXT_PUBLIC_BACKEND_API}${historyData.teacher_profile.profile_image}`}
                  alt={historyData?.teacher_profile?.teacher_name || selectedTeacher?.name || 'Teacher'}
                  className="h-10 sm:h-12 w-10 sm:w-12 rounded-full object-cover mr-3 sm:mr-4 border border-blue-300 dark:border-blue-700"
                />
              ) : (
                <div className={combine(
                  "h-10 sm:h-12 w-10 sm:w-12 rounded-full flex items-center justify-center mr-3 sm:mr-4",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaUserTie className={combine(
                    "text-base sm:text-lg",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              )}
              <div>
                <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>
                  {historyData?.teacher_profile?.teacher_name || selectedTeacher?.name || 'Loading...'}
                </h4>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Teacher ID: {historyData?.teacher_profile?.teacher_id || selectedTeacherId}
                </p>
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
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
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
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
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
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                  </div>
                </div>
                <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                Loading attendance history...
                </p>
                <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing attendance records</p>
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
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
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
                    } else {
                      // List view
                      // In the monthly history list view section
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
                theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
              )} />
              <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
                No History Available
              </h4>
              <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                Select a teacher and period to view attendance history
              </p>
            </div>
          )}
        </>
      ) : (
        <div className={combine("p-6 sm:p-8 rounded-lg border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
          <FaUserTie className={combine(
            "text-3xl sm:text-4xl mx-auto mb-3 sm:mb-4",
            theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
          )} />
          <h4 className={combine("text-base sm:text-lg font-semibold mb-2", get('text', 'primary'))}>
            Select a Teacher
          </h4>
          <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
            Choose a teacher from the dropdown to view their attendance history
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
                  ? "bg-gradient-to-br from-purple-600 to-purple-700"
                  : "bg-gradient-to-br from-purple-500 to-purple-600"
              )}>
                <FaUserTie className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Teacher Attendance
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Track and monitor teacher attendance records
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
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
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
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
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
