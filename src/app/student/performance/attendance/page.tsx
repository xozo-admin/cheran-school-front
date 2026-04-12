// app/student/performance/attendance/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  FaCalendarAlt,
  FaCalendarCheck,
  FaCalendarTimes,
  FaClock,
  FaChartPie,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarDay,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaUser
} from 'react-icons/fa';
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// Types
interface AttendanceDate {
  date: number;
  status: 'present' | 'absent' | 'late' | 'holiday' | 'Not Marked';
  status_display: string;
}

interface MonthStats {
  present: number;
  absent: number;
  late: number;
}

interface AttendanceMonth {
  stats: MonthStats;
  dates: AttendanceDate[];
}

interface AttendanceResponse {
  student_id: string;
  year: string;
  attendance_percentage: string;
  annual_summary: {
    present: number;
    absent: number;
    late: number;
  };
  calendar_data: {
    [month: string]: AttendanceMonth;
  };
}

interface MonthlyResponse {
  view: string;
  month: string;
  year: string;
  total_working_days: number;
  summary: {
    Present: number;
    Absent: number;
    Late: number;
  };
  history: Array<{
    date: string;
    day: string;
    status: string;
  }>;
}

// Academic year months (June to May)
const academicMonths = [
  'June', 'July', 'August', 'September', 'October', 'November',
  'December', 'January', 'February', 'March', 'April', 'May'
];

const academicMonthNumbers = [6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5];

// Get current academic year
const getCurrentAcademicYear = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-12
    
    // If month is June or later, current year is start year
    // Otherwise, previous year is start year
    if (currentMonth >= 6) {
      return `${currentYear}-${currentYear + 1}`;
    } else {
      return `${currentYear - 1}-${currentYear}`;
    }
};

export default function AttendancePage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
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
  // State management
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [viewMode, setViewMode] = useState<'today' | 'monthly' | 'year'>('today');
  const [monthlyData, setMonthlyData] = useState<MonthlyResponse | null>(null);
  const [todayData, setTodayData] = useState<{ date: string; status: string; status_display: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const currentAcademicYear = getCurrentAcademicYear();
  const selectedAcademicYear = currentAcademicYear;

  // Get academic year start and end
  const getAcademicYearRange = (academicYear: string) => {
    const [startYear, endYear] = academicYear.split('-').map(Number);
    return { startYear, endYear };
  };

  const getAcademicYearStart = (academicYear: string) => {
    const [startYear] = academicYear.split('-').map(Number);
    return startYear;
  };

  // Get month name for academic calendar
  const getAcademicMonthName = (monthNumber: number, academicYear: string) => {
    const { startYear } = getAcademicYearRange(academicYear);
    
    if (monthNumber >= 6) {
      return `${academicMonths[monthNumber - 6]} ${startYear}`;
    } else {
      return `${academicMonths[monthNumber + 6]} ${startYear + 1}`;
    }
  };

  // Fetch student profile
  const fetchStudentProfile = async () => {
    try {
      setErrorMessage(null);
      const response = await studentApi.profile.get();
      const data = response.data?.data || response.data;
      return data.student_id;
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load student profile';
      console.error('Error fetching student profile:', error);
      setErrorMessage(message);
      toastError(message);
      return null;
    }
  };

  // Fetch today's attendance
  const fetchTodayAttendance = useCallback(async () => {
    try {
      setErrorMessage(null);
      const today = new Date().toISOString().split('T')[0];
      const response = await studentApi.attendance.today(today);
      const data = response.data?.data || response.data;
      setTodayData(data);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load today attendance';
      console.error('Error fetching today\'s attendance:', error);
      setErrorMessage(message);
    }
  }, []);

  // Fetch annual attendance
  const fetchAnnualAttendance = async (academicYear: string) => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await studentApi.attendance.self(getAcademicYearStart(academicYear));
      const data = response.data?.data || response.data;
      setAttendanceData(data);
      toastSuccess('Attendance data loaded successfully');

    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load attendance data';
      if (error?.response?.status === 403) {
        setErrorMessage(message || 'Access denied');
        toastError(message || 'Access denied');
        setAttendanceData(null);
        return;
      }
      if (error?.response?.status === 500) {
        setErrorMessage(message || 'System configuration error');
        toastError(message || 'System configuration error');
        setAttendanceData(null);
        return;
      }
      console.error('Error fetching attendance data:', error);
      setErrorMessage(message);
      toastError(message);
      setAttendanceData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch monthly attendance
  const fetchMonthlyAttendance = async (month: number, academicYear: string) => {
    try {
      setErrorMessage(null);
      const response = await studentApi.attendance.monthly(month, getAcademicYearStart(academicYear));
      const data = response.data?.data || response.data;
      setMonthlyData(data);

    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load monthly data';
      if (error?.response?.status === 403) {
        setErrorMessage(message || 'Access denied');
        toastError(message || 'Access denied');
        setMonthlyData(null);
        return;
      }
      console.error('Error fetching monthly data:', error);
      setErrorMessage(message);
      toastError(message);
      setMonthlyData(null);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const initData = async () => {
      const studentId = await fetchStudentProfile();
      if (studentId) {
        await fetchAnnualAttendance(selectedAcademicYear);
      }
      fetchTodayAttendance();
    };
    initData();
  }, [fetchTodayAttendance, selectedAcademicYear]);

  // Fetch monthly data when view mode or month changes
  useEffect(() => {
    if (viewMode === 'monthly') {
      fetchMonthlyAttendance(selectedMonth, selectedAcademicYear);
    }
  }, [selectedMonth, viewMode, selectedAcademicYear]);

  // Handlers
  const handlePrevMonth = () => {
    setSelectedMonth(prev => {
      const index = academicMonthNumbers.indexOf(prev);
      const newIndex = (index - 1 + academicMonthNumbers.length) % academicMonthNumbers.length;
      return academicMonthNumbers[newIndex] ?? prev;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => {
      const index = academicMonthNumbers.indexOf(prev);
      const newIndex = (index + 1) % academicMonthNumbers.length;
      return academicMonthNumbers[newIndex] ?? prev;
    });
  };

  const getAcademicYearAttendanceData = () => {
    const data = attendanceData;
    if (!data?.annual_summary) return { present: 0, absent: 0, late: 0 };
    
    return {
      present: data.annual_summary.present || 0,
      absent: data.annual_summary.absent || 0,
      late: data.annual_summary.late || 0
    };
  };

  const getAttendancePercentage = () => {
    const data = attendanceData;
    if (!data?.annual_summary) return '0%';
    
    const { present, absent, late } = data.annual_summary;
    const total = present + absent + late;
    const percentage = total > 0 ? (present / total) * 100 : 0;
    return `${percentage.toFixed(1)}%`;
  };

  const getMonthlySummaryChartData = () => {
    if (!monthlyData) return [];
    const total = monthlyData.summary.Present + monthlyData.summary.Absent + monthlyData.summary.Late;
    return [
      {
        name: 'Present',
        value: monthlyData.summary.Present,
        percentage: total > 0 ? (monthlyData.summary.Present / total) * 100 : 0,
        color: '#10B981'
      },
      {
        name: 'Absent',
        value: monthlyData.summary.Absent,
        percentage: total > 0 ? (monthlyData.summary.Absent / total) * 100 : 0,
        color: '#EF4444'
      },
      {
        name: 'Late',
        value: monthlyData.summary.Late,
        percentage: total > 0 ? (monthlyData.summary.Late / total) * 100 : 0,
        color: '#F59E0B'
      }
    ];
  };

  const getAcademicYearChartData = () => {
    const data = attendanceData;
    if (!data?.calendar_data) return [];

    return academicMonthNumbers.map((monthNum, index) => {
      const monthData = data.calendar_data[monthNum];
      const present = monthData?.stats.present || 0;
      const absent = monthData?.stats.absent || 0;
      const late = monthData?.stats.late || 0;
      const total = present + absent + late;
      const percentage = total > 0 ? (present / total) * 100 : 0;

      return {
        name: academicMonths[index].substring(0, 3),
        present,
        absent,
        late,
        percentage: parseFloat(percentage.toFixed(1)),
        total
      };
    });
  };

  // Calendar rendering functions
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': 
      case 'present': 
        return 'bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-900/10 text-green-800 dark:text-green-300';
      case 'absent': 
      case 'absent': 
        return 'bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-900/10 text-red-800 dark:text-red-300';
      case 'late': 
      case 'late': 
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-900/10 text-yellow-800 dark:text-yellow-300';
      case 'holiday': 
        return 'bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 text-blue-800 dark:text-blue-300';
      default: 
        return 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'present': 
      case 'present': 
        return <FaCheckCircle className="text-green-500" />;
      case 'absent': 
      case 'absent': 
        return <FaTimesCircle className="text-red-500" />;
      case 'late': 
      case 'late': 
        return <FaClock className="text-yellow-500" />;
      case 'holiday': 
        return <FaCalendarDay className="text-blue-500" />;
      default: 
        return null;
    }
  };

  // Calendar component for academic year
  const renderAcademicCalendar = () => {
    const { startYear } = getAcademicYearRange(selectedAcademicYear);
    
    const daysInMonth = new Date(
      selectedMonth >= 6 ? startYear : startYear + 1,
      selectedMonth,
      0
    ).getDate();
    
    const firstDay = new Date(
      selectedMonth >= 6 ? startYear : startYear + 1,
      selectedMonth - 1,
      1
    ).getDay();
    
    const data = attendanceData;
    const dateMap = new Map<number, AttendanceDate>();
    const monthData = data?.calendar_data?.[selectedMonth];
    
    if (monthData?.dates) {
      monthData.dates.forEach(date => {
        dateMap.set(date.date, date);
      });
    }

    const days = [];
    
    // Empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-20 rounded-xl border border-transparent"></div>
      );
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateData = dateMap.get(day);
      const isToday = new Date().getDate() === day && 
                     new Date().getMonth() + 1 === selectedMonth && 
                     new Date().getFullYear() === (selectedMonth >= 6 ? startYear : startYear + 1);
      
      const status = dateData?.status || 'Not Marked';
      
      days.push(
        <div
          key={day}
          className={`h-20 flex flex-col items-center justify-center rounded-xl border transition-all duration-300 hover:scale-105 ${
            getStatusColor(status)
          } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : 'border-gray-200 dark:border-gray-700'}`}
        >
          <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
            {day}
          </div>
          {dateData && (
            <div className="flex flex-col items-center gap-1">
              <div className="text-lg">
                {getStatusIcon(status)}
              </div>
              <div className="text-xs capitalize font-medium">
                {dateData.status_display || status}
              </div>
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return null;
  }

  const { present, absent, late } = getAcademicYearAttendanceData();
  const totalDays = present + absent + late;
  const monthlySummaryChartData = getMonthlySummaryChartData();
  const academicYearChartData = getAcademicYearChartData();

  const rootClassName = combine(
    'dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 transition-colors duration-200',
    getBgClass()
  );

  return (
    <div className={rootClassName}>
      <div className="mx-auto w-full max-w-[1600px]">
        <main>
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className={combine(
              "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6",
              theme === 'dark'
                ? "bg-gradient-to-r from-blue-700 to-blue-800"
                : "bg-gradient-to-r from-blue-500 to-blue-600"
            )}>
              <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                    <FaUser className="text-2xl sm:text-3xl" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                      Student Attendance
                    </h1>
                    <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                      <FaCalendarAlt className="text-xs sm:text-sm" />
                      Track your attendance and performance history
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  

                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                    <div className="text-[11px] sm:text-xs text-blue-100">Today</div>
                    <div className="text-sm sm:text-base font-bold">
                      {new Date().toISOString().split('T')[0]}
                    </div>
                  </div>
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                    <div className="text-[11px] sm:text-xs text-blue-100">Status</div>
                    <div className="text-sm sm:text-base font-bold">
                      {todayData?.status || 'Not Marked'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Overview Cards */}
        <div className="mb-6 sm:mb-8 grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {/* Present Card */}
          <div className={combine(getCardGradientClass('emerald'), 'hover:shadow-xl')}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <FaCalendarCheck className={combine('text-2xl md:text-3xl', get('accent', 'success'))} />
              <span className={combine('text-xs md:text-sm font-medium', get('text', 'secondary'))}>Present</span>
            </div>
            <div className={combine('text-3xl md:text-4xl font-bold mb-1 md:mb-2', get('text', 'primary'))}>
              {present}
            </div>
            <div className={combine('text-xs md:text-sm', get('text', 'secondary'))}>Days Present</div>
            <div className={combine('mt-3 md:mt-4 h-1 rounded-full overflow-hidden', get('bg', 'secondary'))}>
              <div
                className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                style={{ width: totalDays > 0 ? `${(present / totalDays) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Absent Card */}
          <div className={combine(getCardGradientClass('red'), 'hover:shadow-xl')}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <FaCalendarTimes className={combine('text-2xl md:text-3xl', get('accent', 'error'))} />
              <span className={combine('text-xs md:text-sm font-medium', get('text', 'secondary'))}>Absent</span>
            </div>
            <div className={combine('text-3xl md:text-4xl font-bold mb-1 md:mb-2', get('text', 'primary'))}>
              {absent}
            </div>
            <div className={combine('text-xs md:text-sm', get('text', 'secondary'))}>Days Absent</div>
            <div className={combine('mt-3 md:mt-4 h-1 rounded-full overflow-hidden', get('bg', 'secondary'))}>
              <div
                className="h-full bg-rose-500 transition-all duration-1000 ease-out"
                style={{ width: totalDays > 0 ? `${(absent / totalDays) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Late Card */}
          <div className={combine(getCardGradientClass('amber'), 'hover:shadow-xl')}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <FaClock className={combine('text-2xl md:text-3xl', get('accent', 'warning'))} />
              <span className={combine('text-xs md:text-sm font-medium', get('text', 'secondary'))}>Late</span>
            </div>
            <div className={combine('text-3xl md:text-4xl font-bold mb-1 md:mb-2', get('text', 'primary'))}>
              {late}
            </div>
            <div className={combine('text-xs md:text-sm', get('text', 'secondary'))}>Days Late</div>
            <div className={combine('mt-3 md:mt-4 h-1 rounded-full overflow-hidden', get('bg', 'secondary'))}>
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-out"
                style={{ width: totalDays > 0 ? `${(late / totalDays) * 100}%` : '0%' }}
              ></div>
            </div>
          </div>

          {/* Percentage Card */}
          <div className={combine(getCardGradientClass('purple'), 'hover:shadow-xl')}>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <FaChartPie className={combine('text-2xl md:text-3xl', get('accent', 'primary'))} />
              <span className={combine('text-xs md:text-sm font-medium', get('text', 'secondary'))}>Percentage</span>
            </div>
            <div className={combine('text-3xl md:text-4xl font-bold mb-1 md:mb-2', get('text', 'primary'))}>
              {getAttendancePercentage()}
            </div>
            <div className={combine('text-xs md:text-sm', get('text', 'secondary'))}>Attendance Rate</div>
            <div className={combine('mt-3 md:mt-4 h-1 rounded-full overflow-hidden', get('bg', 'secondary'))}>
              <div
                className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: getAttendancePercentage() }}
              ></div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl p-5 md:p-6 mb-8 transition-all duration-300">
          {/* Header with Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6 mb-8">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Attendance Overview
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">
                Academic Year: {selectedAcademicYear}
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm md:text-base font-semibold text-gray-900 dark:text-white">
                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Year</span>
                <span className="text-gray-900 dark:text-white font-semibold">
                  {selectedAcademicYear}
                </span>
              </div>

              <div className="flex gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                <button
                  onClick={() => setViewMode('today')}
                  className={`px-4 md:px-5 py-2 rounded-lg transition-all duration-300 text-sm md:text-base ${
                    viewMode === 'today'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaCalendarDay className="inline mr-2" /> Today
                </button>
                <button
                  onClick={() => setViewMode('monthly')}
                  className={`px-4 md:px-5 py-2 rounded-lg transition-all duration-300 text-sm md:text-base ${
                    viewMode === 'monthly'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaCalendarAlt className="inline mr-2" /> Monthly
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  className={`px-4 md:px-5 py-2 rounded-lg transition-all duration-300 text-sm md:text-base ${
                    viewMode === 'year'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <FaChartPie className="inline mr-2" /> Academic Year
                </button>
              </div>
            </div>
          </div>

          {viewMode === 'today' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Today Attendance
                </h3>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${getStatusColor(todayData?.status || 'Not Marked')}`}>
                    {getStatusIcon(todayData?.status || 'Not Marked')}
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Date</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {new Date().toISOString().split('T')[0]}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Status</div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {todayData?.status_display || todayData?.status || 'Not Marked'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Quick Summary
                </h3>
                <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-between">
                    <span>Attendance Rate</span>
                    <span className="font-semibold">{getAttendancePercentage()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Days Present</span>
                    <span className="font-semibold">{present}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Days Absent</span>
                    <span className="font-semibold">{absent}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Days Late</span>
                    <span className="font-semibold">{late}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'monthly' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4 mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                {getAcademicMonthName(selectedMonth, selectedAcademicYear)} Calendar
                </h3>
                
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-xl p-2">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      aria-label="Previous month"
                    >
                      <FaChevronLeft className="text-gray-700 dark:text-gray-300" />
                    </button>
                    <div className="px-3 md:px-4 py-1.5 md:py-2 text-gray-900 dark:text-white font-medium text-sm md:text-base">
                      {getAcademicMonthName(selectedMonth, selectedAcademicYear)}
                    </div>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      aria-label="Next month"
                    >
                      <FaChevronRight className="text-gray-700 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Calendar */}
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-[1.3fr_0.7fr] gap-6 md:gap-8">
                  {/* Calendar Grid */}
                  <div className="bg-white dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div
                          key={day}
                          className="py-3 md:py-4 text-center text-xs md:text-sm font-semibold text-gray-700 dark:text-gray-300"
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 md:gap-2 p-3 md:p-4">
                      {renderAcademicCalendar()}
                    </div>
                  </div>

                  {/* Monthly Chart */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 md:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Monthly Summary
                    </h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={monthlySummaryChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={1500}
                          >
                            {monthlySummaryChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value, name, props) => {
                              if (name === 'value') {
                                const percentage = props.payload.percentage;
                                return [`${value} days (${percentage.toFixed(1)}%)`, name];
                              }
                              return [value, name];
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    {!monthlyData && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                        Monthly data not available.
                      </div>
                    )}

                    {monthlyData && (
                      <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <div className="flex items-center justify-between">
                          <span>Working Days</span>
                          <span className="font-semibold">{monthlyData.total_working_days}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Present</span>
                          <span className="font-semibold">{monthlyData.summary.Present}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Absent</span>
                          <span className="font-semibold">{monthlyData.summary.Absent}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Late</span>
                          <span className="font-semibold">{monthlyData.summary.Late}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-900/10 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Present</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/20 dark:to-red-900/10 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Absent</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full"></div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Late</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Holiday</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl">
                    <div className="w-2.5 h-2.5 border-2 border-blue-500 rounded-full"></div>
                    <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">Today</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'year' && (
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 md:mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Academic Year Report ({selectedAcademicYear})
                </h3>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Counts (left) and attendance rate % (right)
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={academicYearChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'percentage') return [`${value}%`, 'Attendance Rate'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="present" stroke="#10B981" strokeWidth={2} dot={false} name="Present" />
                    <Line yAxisId="left" type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} dot={false} name="Absent" />
                    <Line yAxisId="left" type="monotone" dataKey="late" stroke="#F59E0B" strokeWidth={2} dot={false} name="Late" />
                    <Bar yAxisId="right" dataKey="percentage" fill="#3B82F6" name="Attendance Rate" barSize={20} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              {!academicYearChartData.length && (
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Academic year data not available.
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Present</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{present}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Absent</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{absent}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Late</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{late}</div>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">Attendance Rate</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{getAttendancePercentage()}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Monthly Summary Section (for monthly view) */}
        {viewMode === 'monthly' && monthlyData && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-5 md:p-6 mb-8 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl">
                <FaCalendarAlt className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {getAcademicMonthName(selectedMonth, selectedAcademicYear)} Summary
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Detailed attendance breakdown for this month
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Working Days</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {monthlyData.total_working_days}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Attendance Rate</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {monthlyData.total_working_days > 0 
                    ? `${((monthlyData.summary.Present / monthlyData.total_working_days) * 100).toFixed(1)}%`
                    : '0%'}
                </div>
              </div>
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-xl p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Days Missed</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {monthlyData.summary.Absent + monthlyData.summary.Late}
                </div>
              </div>
            </div>
            
            {monthlyData.history.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Day</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.history.slice(0, 10).map((record, index) => (
                      <tr key={index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="p-3">{record.date}</td>
                        <td className="p-3">{record.day}</td>
                        <td className="p-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        

        {/* Warning Banner for low attendance */}
        {parseFloat(getAttendancePercentage()) < 75 && (
          <div className="mt-8 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-2xl p-5 md:p-6 shadow-lg animate-pulse-subtle">
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <div className="flex-shrink-0">
                <FaExclamationTriangle className="text-2xl md:text-3xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg md:text-xl font-bold mb-2">Attendance Improvement Needed</h3>
                <p className="text-red-100 text-sm md:text-base">
                  Your current attendance rate is {getAttendancePercentage()}. 
                  Aim for at least 75% to ensure optimal learning and academic success.
                </p>
              </div>
              <button 
                onClick={() => toastInfo('Contact your class teacher for attendance support')}
                className="px-4 md:px-6 py-2.5 md:py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all duration-300 hover:scale-105 text-sm md:text-base whitespace-nowrap"
              >
                Get Help
              </button>
            </div>
          </div>
        )}
      </main>

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes countUp {
          from { 
            opacity: 0; 
            transform: translateY(10px); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0); 
          }
        }
        
        .animate-count-up {
          animation: countUp 0.8s ease-out;
        }
        
        @keyframes pulseSubtle {
          0%, 100% { 
            opacity: 1; 
          }
          50% { 
            opacity: 0.9; 
          }
        }
        
        .animate-pulse-subtle {
          animation: pulseSubtle 2s ease-in-out infinite;
        }
        
        /* Print styles */
        @media print {
          button, 
          .no-print {
            display: none !important;
          }
          
          body {
            background: white !important;
          }
          
          .bg-gradient-to-br,
          .bg-gradient-to-r {
            background: white !important;
            color: black !important;
          }
          
          .dark\\:from-gray-900,
          .dark\\:to-gray-800,
          .dark\\:bg-gray-800 {
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
    </div>
  );
}
