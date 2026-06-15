// src/components/students/attendance/index.tsx
'use client';

import { adminApi } from '@/lib/api';

import { useState, useEffect } from 'react';
import { FiCalendar, FiFilter, FiDownload, FiChevronRight, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiMenu, FiChevronDown, FiChevronUp, FiUser } from 'react-icons/fi';
import { FaSearch, FaChartBar, FaExclamationTriangle, FaCheckCircle, FaUserGraduate, FaArrowUp, FaArrowDown, FaCalendar, FaUsers, FaHistory, FaSchool } from 'react-icons/fa';
import { IoIosSchool, IoMdStats } from 'react-icons/io';
import { MdOutlineDashboard } from 'react-icons/md';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, Line, ReferenceLine } from 'recharts';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import {StudentAttendanceHistory} from '@/components/dashboard/StudentHistory';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface AttendanceRecord {
  student_id: string;
  student_name: string;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Not Marked';
}

interface DailyStats {
  Present: number;
  Absent: number;
  Late: number;
  'On Leave': number;
  'Not Marked': number;
}

interface ClassAttendance {
  date: string;
  class: string;
  section: string;
  summary: DailyStats;
  students: AttendanceRecord[];
}

interface ClassReport {
  class_id: number;
  class_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  unmarked?: number;
  attendance_percentage: number;
  section_count: number;
}

interface SectionDetail {
  section_id: number;
  section_name: string;
  total_students: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  attendance_percentage: number;
  class_teacher: {
    name: string;
    teacher_id: string;
  } | null;
}

interface ClassDetailResponse {
  class: string;
  date: string;
  class_summary: {
    total_sections: number;
    total_students: number;
    total_present: number;
    total_absent: number;
    total_late: number;
    total_unmarked: number;
    overall_attendance: number;
  };
  section_details: SectionDetail[];
}

interface StudentAttendance {
  student_id: string;
  student_name: string;
  status: string;
  section?: string;
}

interface Standard {
  id: number;
  name: string;
  sections?: {
    id: number;
    name: string;
    standard: number;
    standard_name: string;
    class_teacher: number | null;
  }[];
}

interface Section {
  id: number;
  name: string;
  standard: Standard;
}

interface AttendanceOverviewChartInlineProps {
  onClassSelect?: (classId: string, className: string, date: string) => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
  schoolScopeParams?: { school_id?: number };
  schoolScopeKey?: string;
}

interface AttendanceChartDataPoint {
  name: string;
  attendance: number;
  present: number;
  absent: number;
  late: number;
  unmarked: number;
  total: number;
  class_name: string;
}

interface AttendanceOverviewTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: AttendanceChartDataPoint;
  }>;
}

const AttendanceOverviewChartInline = ({ onClassSelect, selectedDate, onDateChange, schoolScopeParams, schoolScopeKey }: AttendanceOverviewChartInlineProps) => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [classReport, setClassReport] = useState<ClassReport[]>([]);
  const [loading, setLoading] = useState(false);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const dateToFetch = selectedDate || getTodayDate();
    if (!selectedDate) {
      onDateChange(dateToFetch);
    }
    fetchClassReport(dateToFetch);
  }, [selectedDate, schoolScopeKey]);

  const generateMockData = () => {
    const mockClasses = ['LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    const mockReport: ClassReport[] = mockClasses.map((className, index) => {
      const totalStudents = Math.floor(Math.random() * 40) + 20;
      const present = Math.floor(totalStudents * (0.75 + Math.random() * 0.15));
      const absent = Math.floor(totalStudents * (0.05 + Math.random() * 0.05));
      const late = Math.floor(totalStudents * (0.03 + Math.random() * 0.04));
      const unmarked = Math.max(0, totalStudents - (present + absent + late));

      return {
        class_id: index + 1,
        class_name: className,
        total_students: totalStudents,
        present,
        absent,
        late,
        unmarked,
        attendance_percentage: Math.round((present / totalStudents) * 100),
        section_count: className === 'LKG' || className === 'UKG' ? 2 : 3,
      };
    });

    setClassReport(mockReport);
  };

  const fetchClassReport = async (date: string) => {
    try {
      setLoading(true);
      const response = await adminApi.attendance.classReport(date, schoolScopeParams);
      const data = response.data;

      const transformedReport: ClassReport[] = (data.class_report || []).map((cls: any) => ({
        ...cls,
        total_students: Number(cls.total_students) || 0,
        present: Number(cls.present) || 0,
        absent: Number(cls.absent) || 0,
        late: Number(cls.late) || 0,
        unmarked: Math.max(
          0,
          (Number(cls.total_students) || 0) -
            ((Number(cls.present) || 0) + (Number(cls.absent) || 0) + (Number(cls.late) || 0))
        ),
      }));

      setClassReport(transformedReport);
    } catch (error) {
      console.error('Error fetching class report:', error);
      generateMockData();
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (className: string) => {
    const selectedClass = classReport.find((cls) => cls.class_name === className);
    if (!selectedClass) return;

    if (onClassSelect) {
      onClassSelect(selectedClass.class_id.toString(), selectedClass.class_name, selectedDate);
      return;
    }

    localStorage.setItem('selectedClassId', selectedClass.class_id.toString());
    localStorage.setItem('selectedClassName', selectedClass.class_name);
    localStorage.setItem('selectedDate', selectedDate);
    window.location.href = '/admin/students/attendance';
  };

  const totalStudents = classReport.reduce((sum, cls) => sum + cls.total_students, 0);
  const totalPresent = classReport.reduce((sum, cls) => sum + cls.present, 0);
  const totalAbsent = classReport.reduce((sum, cls) => sum + cls.absent, 0);
  const totalLate = classReport.reduce((sum, cls) => sum + cls.late, 0);
  const totalUnmarked = classReport.reduce((sum, cls) => sum + (cls.unmarked || 0), 0);
  const overallAttendance = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;

  const chartData: AttendanceChartDataPoint[] = classReport.map((cls) => ({
    name: `Class ${cls.class_name}`,
    attendance: cls.attendance_percentage,
    present: cls.present,
    absent: cls.absent,
    late: cls.late,
    unmarked: cls.unmarked || 0,
    total: cls.total_students,
    class_name: cls.class_name,
  }));
  const inlineChartMinWidth = Math.max(700, chartData.length * 110);

  const AttendanceOverviewTooltip = ({ active, payload }: AttendanceOverviewTooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;
    const data = payload[0].payload;

    return (
      <div className="rounded-lg border px-3 py-2 shadow-md bg-[var(--color-bg-card)] border-[var(--color-border-secondary)]">
        <p className={combine('text-sm font-semibold', get('text', 'primary'))}>Class {data.class_name}</p>
        <p className={combine('text-xs', get('text', 'secondary'))}>Attendance: {data.attendance}%</p>
        <p className={combine('text-xs', get('text', 'secondary'))}>Total Students: {data.total}</p>
        <p className={combine('text-xs', get('text', 'secondary'))}>Present: {data.present}</p>
        <p className={combine('text-xs', get('text', 'secondary'))}>Absent: {data.absent}</p>
        <p className={combine('text-xs', get('text', 'secondary'))}>Late: {data.late}</p>
      </div>
    );
  };

  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return isToday ? `Today, ${formattedDate}` : formattedDate;
  };

  const containerClasses = combine(
    'attendance-card lg:col-span-2 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border shadow-sm relative overflow-hidden',
    get('bg', 'card'),
    get('border', 'primary')
  );

  if (loading) {
    return (
      <div className={containerClasses}>
        <div className="p-6 sm:p-8 text-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
            </div>
            <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading attendance...</p>
            <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing attendance records</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-accent-primary)] via-[var(--color-status-success)] to-[var(--color-accent-secondary)]" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 relative z-10">
        <div>
          <h2 className={combine('text-xl font-bold flex items-center gap-2', get('text', 'primary'))}>
            <FaChartBar className="text-[var(--color-accent-primary)]" />
            Class-wise Attendance Overview
          </h2>
          <p className={combine('text-sm mt-1', get('text', 'secondary'))}>
            Showing data for <span className={combine('font-medium', get('accent', 'primary'))}>{formatDisplayDate(selectedDate)}</span>
          </p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-[var(--color-accent-primary)]/10 to-[var(--color-accent-secondary)]/10 border border-[var(--color-border-primary)]">
            <FaCalendar className={combine('text-sm', get('accent', 'primary'))} />
            <span className={combine('font-medium', get('text', 'primary'))}>{formatDisplayDate(selectedDate)}</span>
          </div>
          <DatePicker
            selected={selectedDate ? new Date(selectedDate) : new Date()}
            onChange={(date: Date | null) => {
              if (date) {
                onDateChange(date.toISOString().split('T')[0]);
              }
            }}
            className="px-3 py-1.5 rounded-lg border text-sm bg-[var(--color-bg-card)] border-[var(--color-border-secondary)] text-[var(--color-text-primary)]"
            dateFormat="yyyy-MM-dd"
            wrapperClassName="w-auto"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 mb-6">
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Attendance</p>
          <p className={combine('text-2xl font-bold', get('accent', 'primary'))}>{overallAttendance}%</p>
          <div className="flex items-center gap-1 text-sm font-medium text-[var(--color-accent-primary)]">{overallAttendance > 85 ? <FaArrowUp /> : <FaArrowDown />}</div>
        </div>
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Present</p>
          <p className={combine('text-2xl font-bold', get('accent', 'success'))}>{totalPresent.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Absent</p>
          <p className={combine('text-2xl font-bold', get('accent', 'error'))}>{totalAbsent.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Late</p>
          <p className={combine('text-2xl font-bold', get('accent', 'warning'))}>{totalLate.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-gray-900/10' : 'from-white to-gray-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Not Marked</p>
          <p className={combine('text-2xl font-bold', get('text', 'tertiary'))}>{totalUnmarked.toLocaleString()}</p>
        </div>
        <div className={`rounded-xl p-4 border ${combine('bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50')}`}>
          <p className={combine('text-sm', get('text', 'secondary'))}>Total</p>
          <p className={combine('text-2xl font-bold', get('accent', 'primary'))}>{totalStudents.toLocaleString()}</p>
          <FaUsers className={theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'} />
        </div>
      </div>

      <div className="rounded-xl p-4 border" style={{ borderColor: 'var(--color-border-secondary)', backgroundColor: 'var(--color-bg-card)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={combine('font-medium', get('text', 'primary'))}>Class Attendance Chart</h3>
        </div>
        <div className="h-80 overflow-x-auto overflow-y-hidden">
          <div className="h-full" style={{ minWidth: `${inlineChartMinWidth}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                onClick={(e: any) => {
                  if (e.activeLabel) {
                    const className = e.activeLabel.replace('Class ', '');
                    handleClassClick(className);
                  }
                }}
              >
                <defs>
                  <linearGradient id="gradientThemeInline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent-primary)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--color-accent-primary)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-secondary)" strokeOpacity={0.3} horizontal vertical={false} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} fontSize={12} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} stroke="var(--color-text-secondary)" tick={{ fill: 'var(--color-text-secondary)' }} axisLine={false} tickLine={false} />
                <ReferenceLine y={overallAttendance} stroke="var(--color-text-tertiary)" strokeDasharray="3 3" />
                <Tooltip content={<AttendanceOverviewTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="attendance" name="Attendance %" stroke="var(--color-accent-primary)" strokeWidth={3} fillOpacity={0.4} fill="url(#gradientThemeInline)" />
                <Line type="monotone" dataKey="attendance" stroke="var(--color-border-secondary)" strokeWidth={0.5} strokeDasharray="3 3" dot={false} activeDot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function EnhancedAttendanceComponent ()  {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [overviewDate, setOverviewDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedClassName, setSelectedClassName] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [selectedSectionName, setSelectedSectionName] = useState<string>('');
  const [classes, setClasses] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [attendanceData, setAttendanceData] = useState<ClassAttendance | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'overview' | 'class-detail' | 'student-history'>('overview');
  const [classAttendanceStats, setClassAttendanceStats] = useState<ClassReport[]>([]);
  const [sectionStudents, setSectionStudents] = useState<StudentAttendance[]>([]);
  const [selectedSectionDetail, setSelectedSectionDetail] = useState<SectionDetail | null>(null);
  const [isRedirected, setIsRedirected] = useState(false);
  const [redirectedClassId, setRedirectedClassId] = useState<string>('');
  const [redirectedClassName, setRedirectedClassName] = useState<string>('');
  const [redirectedDate, setRedirectedDate] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [studentHistoryParams, setStudentHistoryParams] = useState<{studentId: string; studentName: string; year: string} | null>(null);
  const [showHistoryBackButton, setShowHistoryBackButton] = useState(false);
  const schoolScope = useSchoolScope({ storageKey: "student_attendance_school_scope" });

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsSmallScreen(width < 1024);
      // Auto-show filters on desktop
      if (width >= 1024) {
        setShowFilters(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Add this near the other useEffects in EnhancedAttendanceComponent
useEffect(() => {
  // Check if we're on the client side
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    
    const view = urlParams.get('view');
    const studentId = urlParams.get('studentId');
    const studentName = urlParams.get('studentName');
    const year = urlParams.get('year');
    const redirectedFrom = urlParams.get('redirectedFrom');
    
    // If we have the view parameter set to 'history' and student info
    if (view === 'history' && studentId && studentName) {
      console.log('URL params detected:', { studentId, studentName, year });
      
      // Set the student history params
      setStudentHistoryParams({
        studentId: studentId,
        studentName: studentName,
        year: year || '2025-2026'
      });
      setShowHistoryBackButton(redirectedFrom === 'allstudents');
      
      // Switch to student history view
      setViewMode('student-history');
      
      // Optional: Clean up the URL by removing the query parameters
      // This prevents the parameters from persisting on refresh
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
  }
}, []); // Run once on component mount

  const handleBackFromHistory = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/students/allstudents';
  };

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'attendance-card rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
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
    if (color === 'pink') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
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

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

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

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      pink: {
        bg: theme === 'dark' ? 'from-pink-900/30 to-pink-800/30' : 'from-pink-100 to-pink-200',
        text: theme === 'dark' ? 'text-pink-300' : 'text-pink-700',
        border: theme === 'dark' ? 'border-pink-800' : 'border-pink-200'
      },
      amber: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      indigo: {
        bg: theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/30' : 'from-indigo-100 to-indigo-200',
        text: theme === 'dark' ? 'text-indigo-300' : 'text-indigo-700',
        border: theme === 'dark' ? 'border-indigo-800' : 'border-indigo-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combine(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  // Check for URL parameters or localStorage for redirection
  useEffect(() => {
    console.log('Checking for redirection parameters...');
    const redirectedClassId = localStorage.getItem('selectedClassId');
    const redirectedClassName = localStorage.getItem('selectedClassName');
    const redirectedDate = localStorage.getItem('selectedDate');

    if (redirectedClassId && redirectedDate) {
      console.log('Found redirection parameters:', {
        classId: redirectedClassId,
        className: redirectedClassName,
        date: redirectedDate
      });

      setIsRedirected(true);
      setRedirectedClassId(redirectedClassId);
      setRedirectedClassName(redirectedClassName || '');
      setSelectedClassId(redirectedClassId);
      setSelectedClassName(redirectedClassName || '');
      setSelectedDate(new Date(redirectedDate));
      setViewMode('class-detail');

      // Clear localStorage after reading
      setTimeout(() => {
        localStorage.removeItem('selectedClassId');
        localStorage.removeItem('selectedClassName');
        localStorage.removeItem('selectedDate');
        console.log('Cleared localStorage parameters');
      }, 1000);
    }
  }, []);

  // Fetch all classes (standards) on mount
  useEffect(() => {
    fetchClasses();
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    setSelectedClassId('');
    setSelectedClassName('');
    setSelectedSectionId('');
    setSelectedSectionName('');
    setSections([]);
    setAttendanceData(null);
    setViewMode('overview');
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    fetchClassAttendanceReport(overviewDate);
  }, [overviewDate, schoolScope.selectedSchoolId]);

  // Fetch sections when class is selected
  useEffect(() => {
    if (selectedClassId) {
      console.log('Fetching sections for class ID:', selectedClassId);
      fetchSections(selectedClassId);
    }
  }, [selectedClassId]);

  // Auto-select first section when sections are loaded and we're in class-detail mode
  useEffect(() => {
    if (viewMode === 'class-detail' && selectedClassId && sections.length > 0 && !selectedSectionId) {
      const firstSection = sections[0];
      setSelectedSectionId(firstSection.id.toString());
      setSelectedSectionName(firstSection.name);
      console.log('Auto-selected section:', firstSection.name);
    }
  }, [sections, viewMode, selectedClassId, selectedSectionId]);

  const fetchClasses = async () => {
    try {
      const response = await adminApi.academics.standards(schoolScope.scopeParams);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setClasses(data);

        if (data.length > 0 && !selectedClassId && !isRedirected) {
          const firstClass = data[0];
          setSelectedClassId(firstClass.id.toString());
          setSelectedClassName(firstClass.name);
        }
      } else {
        console.error('Error fetching classes:', response.status);
        // Generate fallback data
        const fallbackClasses = [
          { id: 1, name: '6' },
          { id: 2, name: '7' },
          { id: 3, name: '8' },
          { id: 4, name: '9' },
          { id: 5, name: '10' }
        ];
        setClasses(fallbackClasses);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSections = async (classId: string) => {
    try {
      const response = await adminApi.academics.sections(classId, schoolScope.scopeParams);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        console.log('Sections fetched:', data);
        setSections(data);

        if (data.length > 0 && !selectedSectionId) {
          const firstSection = data[0];
          setSelectedSectionId(firstSection.id.toString());
          setSelectedSectionName(firstSection.name);
        }
      } else {
        console.error('Error fetching sections:', response.status);
        // Find the class to get its name for fallback
        const currentClass = classes.find(c => c.id.toString() === classId);
        const fallbackSections = ['A', 'B'].map((name, index) => ({
          id: index + 1,
          name: name,
          standard: {
            id: parseInt(classId),
            name: currentClass?.name || classId
          }
        }));
        setSections(fallbackSections);
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchClassAttendanceReport = async (dateStr: string) => {
  try {
    const response = await adminApi.attendance.classReport(dateStr, schoolScope.scopeParams);
    console.log('Class attendance report response:', response);
    
    // ✅ Proper status check
    if (response.status >= 200 && response.status < 300) {
      const data = response.data;
      setClassAttendanceStats(data.class_report || []);
    } else {
      console.error('Error fetching class report:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      generateMockClassData();
    }
  } catch (error) {
    console.error('Error fetching class report:', error);
    generateMockClassData();
  }
};

  // In fetchAttendanceData function, update the section student generation:

const fetchAttendanceData = async () => {
    setLoading(true);
    setError('');

    const dateStr = selectedDate.toISOString().split('T')[0];

    try {
      // Fetch class detail data
      const detailResponse = await adminApi.attendance.classDetail(selectedClassName, dateStr, schoolScope.scopeParams);
      const detailData: ClassDetailResponse | any = detailResponse.data;
      
      // If no section is selected, show overall class data
      if (!selectedSectionName) {
        // Create overall class attendance data from actual student data
        const overallStudents: AttendanceRecord[] = [];
        
        // Collect all students from all sections that have students
        detailData.section_details.forEach((section: { students: any[]; }) => {
          if (section.students && section.students.length > 0) {
            section.students.forEach(student => {
              overallStudents.push({
                student_id: student.student_id,
                student_name: student.student_name,
                status: student.attendance_status as 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Not Marked'
              });
            });
          }
        });

        const transformedData: ClassAttendance = {
          date: detailData.date,
          class: detailData.class,
          section: 'All Sections',
          summary: {
            Present: detailData.class_summary.total_present || 0,
            Absent: detailData.class_summary.total_absent || 0,
            Late: detailData.class_summary.total_late || 0,
            'On Leave': 0,
            'Not Marked': detailData.class_summary.total_unmarked || 0
          },
          students: overallStudents
        };

        setAttendanceData(transformedData);
        setSelectedSectionDetail(null);
        
      } else {
        // If section is selected, find the specific section detail
        const sectionDetail:any = detailData.section_details.find(
          (section: any) => section.section_name === selectedSectionName
        );

        if (sectionDetail) {
          setSelectedSectionDetail(sectionDetail);

          // Use actual student data from the API response
          const students: AttendanceRecord[] = sectionDetail.students && sectionDetail.students.length > 0 
            ? sectionDetail.students.map((student:any) => ({
                student_id: student.student_id,
                student_name: student.student_name,
                status: student.attendance_status as 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Not Marked'
              }))
            : []; // Empty array if no students

          const transformedData: ClassAttendance = {
            date: detailData.date,
            class: detailData.class,
            section: selectedSectionName,
            summary: {
              Present: sectionDetail.present || 0,
              Absent: sectionDetail.absent || 0,
              Late: sectionDetail.late || 0,
              'On Leave': 0,
              'Not Marked': sectionDetail.unmarked || 0
            },
            students: students
          };

          setAttendanceData(transformedData);
        } else {
          setError('Section details not found for selected section');
        }
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = async (studentId: string, newStatus: string) => {
    try {
      const dateStr = selectedDate.toISOString().split('T')[0];

      const response = await adminApi.attendance.update({
        student_id: studentId,
        date: dateStr,
        status: newStatus,
      });

      if (response.status >= 200 && response.status < 300) {
        fetchAttendanceData();
      } else {
        throw new Error(response.data?.error || 'Failed to update attendance');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error updating attendance:', err);
    }
  };

  const generateMockClassData = () => {
    const mockReport: ClassReport[] = classes.map((cls, index) => {
      const totalStudents = Math.floor(Math.random() * 40) + 20;
      const present = Math.floor(totalStudents * (0.85 + Math.random() * 0.1));
      const absent = Math.floor(totalStudents * (0.05 + Math.random() * 0.05));
      const late = Math.floor(totalStudents * (0.02 + Math.random() * 0.03));

      return {
        class_id: cls.id,
        class_name: cls.name,
        total_students: totalStudents,
        present: present,
        absent: absent,
        late: late,
        attendance_percentage: Math.round((present / totalStudents) * 100),
        section_count: cls.sections?.length || 2
      };
    });

    setClassAttendanceStats(mockReport);
  };

  const handleClassSelectFromChart = (classId: string, className: string, date: string) => {
    console.log('Class selected from chart:', { classId, className, date });

    // Find the class from the classes list
    const selectedClass = classes.find(c => c.id.toString() === classId);

    if (selectedClass) {
      // Set all necessary state
      setSelectedClassId(classId);
      setSelectedClassName(className);
      setSelectedDate(new Date(date));

      // Reset section selection
      setSelectedSectionId('');
      setSelectedSectionName('');

      // Switch to class-detail view
      setViewMode('class-detail');

      // Clear any existing attendance data
      setAttendanceData(null);
      setSelectedSectionDetail(null);

      // Force fetch sections for this class
      fetchSections(classId);
    } else {
      console.error('Class not found in classes list:', classId);
      // If class not found, add it to the list
      const newClass = { id: parseInt(classId), name: className, sections: [] };
      setClasses(prev => [...prev, newClass]);

      // Set the state and then fetch sections
      setSelectedClassId(classId);
      setSelectedClassName(className);
      setSelectedDate(new Date(date));
      setViewMode('class-detail');

      // Fetch sections with a delay to ensure state is updated
      setTimeout(() => {
        fetchSections(classId);
      }, 100);
    }
  };

  const exportToCSV = () => {
    if (!attendanceData || !attendanceData.students) return;

    const headers = ['Student ID', 'Name', 'Status', 'Date', 'Class', 'Section'];
    const rows = attendanceData.students.map(record => [
      record.student_id,
      record.student_name,
      record.status,
      attendanceData.date,
      attendanceData.class,
      attendanceData.section
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${attendanceData.date}_${attendanceData.class}_${attendanceData.section}.csv`;
    a.click();
  };

  const filteredAttendance = attendanceData?.students?.filter((record: AttendanceRecord) =>
    record.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.student_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Data for charts
  const pieChartData = attendanceData?.summary ? [
    { name: 'Present', value: attendanceData.summary.Present, color: '#10B981' },
    { name: 'Absent', value: attendanceData.summary.Absent, color: '#EF4444' },
    { name: 'Late', value: attendanceData.summary.Late, color: '#F59E0B' },
    { name: 'Not Marked', value: attendanceData.summary['Not Marked'], color: '#6B7280' }
  ] : [];

  const statusColors: { [key: string]: string } = {
    'Present': '#10B981',
    'Absent': '#EF4444',
    'Late': '#F59E0B',
    'On Leave': '#3B82F6',
    'Not Marked': '#6B7280'
  };

  const handleViewHistory = (studentId: string, studentName: string) => {
    const academicYear = '2025-2026'; // You might want to get this dynamically
    setStudentHistoryParams({
      studentId,
      studentName,
      year: academicYear
    });
    setViewMode('student-history');
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header with Navigation */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaUserGraduate className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  {viewMode === 'overview' && 'Attendance Dashboard'}
                  {viewMode === 'class-detail' && 'Class Attendance'}
                  {viewMode === 'student-history' && 'Student Attendance History'}
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1 flex items-center", get('text', 'secondary'))}>
                  <MdOutlineDashboard className="mr-1 sm:mr-2 text-xs sm:text-sm" />
                  {viewMode === 'overview' && 'Monitor attendance across all classes'}
                  {viewMode === 'class-detail' && `Tracking Class ${selectedClassName} - ${selectedSectionName ? `Section ${selectedSectionName}` : 'All Sections'}`}
                  {viewMode === 'student-history' && studentHistoryParams && `Viewing history for ${studentHistoryParams.studentName} (${studentHistoryParams.studentId})`}
                </p>
              </div>
            </div>
            {showHistoryBackButton && viewMode === 'student-history' && (
              <button
                onClick={handleBackFromHistory}
                className={combine(
                  getSecondaryButtonClass(),
                  'sm:ml-auto w-full sm:w-auto flex items-center justify-center'
                )}
              >
                Back
              </button>
            )}
            <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto sm:ml-auto" />
          </div>

          {/* View Mode Toggle - Three Tabs */}
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            <button
              onClick={() => setViewMode('overview')}
              className={combine(
                "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                viewMode === 'overview'
                  ? getPrimaryButtonClass()
                  : getSecondaryButtonClass()
              )}
            >
              <IoMdStats className="text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm">Overview</span>
            </button>
            <button
              onClick={() => setViewMode('class-detail')}
              className={combine(
                "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                viewMode === 'class-detail'
                  ? getPrimaryButtonClass()
                  : getSecondaryButtonClass()
              )}
            >
              <IoIosSchool className="text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm">Class Details</span>
            </button>
            <button
              onClick={() => setViewMode('student-history')}
              className={combine(
                "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm",
                viewMode === 'student-history'
                  ? getPrimaryButtonClass()
                  : getSecondaryButtonClass()
              )}
            >
              <FaHistory className="text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm">Student History</span>
            </button>
          </div>
        </div>

        {viewMode === 'overview' && (
          <>
            {/* Overview Dashboard */}
            {isRedirected && (
              <div className={combine(
                "mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg sm:rounded-xl border mb-4",
                theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-blue-800'
                  : 'bg-gradient-to-r from-blue-50 to-blue-100/30 border-blue-200'
              )}>
                <div className="flex items-center">
                  <FaExclamationTriangle className={combine(
                    "mr-2 text-xs sm:text-sm",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                  <span className={combine(
                    "text-xs sm:text-sm",
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  )}>
                    Showing details for Class {redirectedClassName} on {new Date(redirectedDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Stats Overview - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <div className={getCardGradientClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Classes</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{classes.length}</p>
                  </div>
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FiUsers className={combine(
                      "text-lg sm:text-xl md:text-2xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-2 sm:mt-4 text-xs", get('text', 'tertiary'))}>
                  <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-1.5 sm:h-2">
                    <div className="bg-[var(--color-accent-primary)] h-1.5 sm:h-2 rounded-full" style={{ width: '100%' }}></div>
                  </div>
                </div>
              </div>

              <div className={getCardGradientClass('emerald')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Students</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {classAttendanceStats.reduce((sum, cls) => sum + cls.total_students, 0)}
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaUserGraduate className={combine(
                      "text-lg sm:text-xl md:text-2xl",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-2 sm:mt-4 text-xs", get('text', 'tertiary'))}>
                  Across all classes & sections
                </div>
              </div>

              <div className={getCardGradientClass('amber')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Overall Attendance</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {classAttendanceStats.length > 0 ?
                        Math.round(
                          classAttendanceStats.reduce((sum, cls) => sum + cls.present, 0) /
                          classAttendanceStats.reduce((sum, cls) => sum + cls.total_students, 0) * 100
                        ) : 0
                      }%
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaCheckCircle className={combine(
                      "text-lg sm:text-xl md:text-2xl",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-2 sm:mt-4 text-xs", get('text', 'tertiary'))}>
                  Selected date average attendance rate
                </div>
              </div>

              <div className={getCardGradientClass('purple')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Date</p>
                    <p className={combine("text-lg sm:text-xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {new Date(overviewDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FiCalendar className={combine(
                      "text-lg sm:text-xl md:text-2xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                </div>
                <div className={combine("mt-2 sm:mt-4 text-xs", get('text', 'tertiary'))}>
                  Selected overview day
                </div>
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1">
              <AttendanceOverviewChartInline
                onClassSelect={handleClassSelectFromChart}
                selectedDate={overviewDate}
                onDateChange={setOverviewDate}
                schoolScopeParams={schoolScope.scopeParams}
                schoolScopeKey={schoolScope.selectedSchoolId}
              />
            </div>
          </>
        )}

        {viewMode === 'class-detail' && (
          <>
            {/* Class Detail View */}
            {/* Filter Card - Responsive */}
            <div className={combine(
              "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border mb-4 sm:mb-6 md:mb-8",
              getCardGradientClass('blue')
            )}>
              {/* Mobile Filter Toggle */}
              {isSmallScreen && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={combine(
                    getSecondaryButtonClass(),
                    "w-full flex items-center justify-center space-x-2 mb-4 text-sm"
                  )}
                >
                  <FiFilter className="text-sm" />
                  <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
                  {showFilters ? <FiChevronUp /> : <FiChevronDown />}
                </button>
              )}

              {/* Filters Container */}
              <div className={`${isSmallScreen && !showFilters ? 'hidden' : 'block'}`}>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 sm:gap-4 items-end">
                  {/* Date Picker */}
                  <div className="md:col-span-1">
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                      <FiCalendar className="inline mr-1 sm:mr-2 text-xs sm:text-sm" />
                      Select Date
                    </label>
                    <DatePicker
                      selected={selectedDate}
                      onChange={(date: Date | null) => date && setSelectedDate(date)}
                      className={getInputClass()}
                      dateFormat="yyyy-MM-dd"
                      wrapperClassName="w-full"
                    />
                  </div>

                  {/* Class Select */}
                  <div className="md:col-span-1">
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                      Class
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => {
                        const selectedClass = classes.find(c => c.id.toString() === e.target.value);
                        if (selectedClass) {
                          setSelectedClassId(e.target.value);
                          setSelectedClassName(selectedClass.name);
                          setSelectedSectionId('');
                          setSelectedSectionName('');
                        }
                      }}
                      className={getInputClass()}
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          Class {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Section Select */}
                  <div className="md:col-span-1">
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                      Section
                    </label>
                    <select
                      value={selectedSectionId}
                      onChange={(e) => {
                        if (e.target.value === 'overall') {
                          setSelectedSectionId('overall');
                          setSelectedSectionName('');
                        } else {
                          const selectedSection = sections.find(s => s.id.toString() === e.target.value);
                          if (selectedSection) {
                            setSelectedSectionId(e.target.value);
                            setSelectedSectionName(selectedSection.name);
                          }
                        }
                      }}
                      className={combine(getInputClass(), "disabled:opacity-50")}
                      disabled={!selectedClassId}
                    >
                      <option value="overall">Overall Class</option>
                      {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                          Section {sec.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Apply Filter Button */}
                  <div className="md:col-span-2">
                    <button
                      onClick={fetchAttendanceData}
                      disabled={loading || !selectedClassId}
                      className={combine(
                        getPrimaryButtonClass(),
                        "w-full flex items-center justify-center space-x-1 sm:space-x-2 py-2.5 text-xs sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                    >
                      <FiFilter className={loading ? 'animate-spin text-xs sm:text-sm' : 'text-xs sm:text-sm'} />
                      <span>{loading ? 'Loading...' : 'Apply Filters'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards - Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              {attendanceData && (
                <>
                  <div className={getCardGradientClass('emerald')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Present</p>
                        <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                          {selectedSectionDetail ? selectedSectionDetail.present : attendanceData.summary.Present}
                        </p>
                      </div>
                      <div className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                        theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                      )}>
                        <FiCheckCircle className={combine(
                          "text-lg sm:text-xl md:text-2xl",
                          theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                        )} />
                      </div>
                    </div>
                    <div className={combine("mt-2 sm:mt-3 md:mt-4 text-xs", get('accent', 'success'))}>
                      {selectedSectionDetail ? 
                        `${selectedSectionDetail.attendance_percentage}% of section total` :
                        `${Math.round((attendanceData.summary.Present / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class total`
                      }
                    </div>
                  </div>

                  <div className={getCardGradientClass('red')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Absent</p>
                        <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                          {selectedSectionDetail ? selectedSectionDetail.absent : attendanceData.summary.Absent}
                        </p>
                      </div>
                      <div className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                        theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                      )}>
                        <FiXCircle className={combine(
                          "text-lg sm:text-xl md:text-2xl",
                          theme === 'dark' ? 'text-red-400' : 'text-red-600'
                        )} />
                      </div>
                    </div>
                    <div className={combine("mt-2 sm:mt-3 md:mt-4 text-xs", get('accent', 'error'))}>
                      {selectedSectionDetail ? 
                        `${Math.round((selectedSectionDetail.absent / selectedSectionDetail.total_students) * 100)}% of section` :
                        `${Math.round((attendanceData.summary.Absent / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class`
                      }
                    </div>
                  </div>

                  <div className={getCardGradientClass('amber')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Late</p>
                        <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                          {selectedSectionDetail ? selectedSectionDetail.late : attendanceData.summary.Late}
                        </p>
                      </div>
                      <div className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                        theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                      )}>
                        <FiClock className={combine(
                          "text-lg sm:text-xl md:text-2xl",
                          theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                        )} />
                      </div>
                    </div>
                    <div className={combine("mt-2 sm:mt-3 md:mt-4 text-xs", get('accent', 'warning'))}>
                      {selectedSectionDetail ? 
                        `${Math.round((selectedSectionDetail.late / selectedSectionDetail.total_students) * 100)}% of section` :
                        `${Math.round((attendanceData.summary.Late / (attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}% of class`
                      }
                    </div>
                  </div>

                  <div className={getCardGradientClass('blue')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Students</p>
                        <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                          {selectedSectionDetail ? selectedSectionDetail.total_students : attendanceData.summary.Present + attendanceData.summary.Absent + attendanceData.summary.Late + attendanceData.summary['Not Marked']}
                        </p>
                      </div>
                      <div className={combine(
                        "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                        theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                      )}>
                        <FiUsers className={combine(
                          "text-lg sm:text-xl md:text-2xl",
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                        )} />
                      </div>
                    </div>
                    <div className={combine("mt-2 sm:mt-3 md:mt-4 text-xs", get('accent', 'primary'))}>
                      {selectedSectionDetail ? `Section ${selectedSectionName}` : 'All Sections'}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Charts and Data Grid - Responsive Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Bar Chart */}
              {attendanceData && (
    <div className={combine(getCardGradientClass(), "relative overflow-hidden h-[500px] flex flex-col")}>
      {/* Decorative wave elements */}
      <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full blur-xl"></div>
      </div>
      <div className="absolute bottom-0 left-0 w-32 h-32 sm:w-48 sm:h-48 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-tr from-green-400 to-cyan-400 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 flex flex-col h-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6">
          <div className="mb-3 sm:mb-0">
            <h3 className={combine("text-lg sm:text-xl font-bold mb-1", get('text', 'primary'))}>
              Attendance Overview - {selectedSectionName ? `Section ${selectedSectionName}` : 'All Sections'}
            </h3>
            <p className={combine("text-xs opacity-75", get('text', 'secondary'))}>
              {selectedSectionName 
                ? `Class ${selectedClassName}, Section ${selectedSectionName}` 
                : `Class ${selectedClassName} (All Sections combined)`}
            </p>
          </div>
          <div className={combine(
            "p-2 sm:p-2.5 rounded-lg sm:rounded-xl transform transition-transform duration-300 hover:scale-110 self-start sm:self-auto",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-amber-900/40 to-amber-800/30 border border-amber-800/30' 
              : 'bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200'
          )}>
            <IoMdStats className={combine(
              "text-lg sm:text-xl",
              theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
            )} />
          </div>
        </div>

        {/* Enhanced Chart - Fixed height */}
        <div className="h-[300px] transform transition-all duration-500 overflow-x-auto overflow-y-hidden">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={pieChartData}
              margin={{ top: 20, right: isMobile ? 10 : 30, left: isMobile ? 0 : 20, bottom: 20 }}
            >
              <defs>
                {/* Gradient definitions for bars */}
                <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.3"/>
                </linearGradient>
                <linearGradient id="absentGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#EF4444" stopOpacity="0.3"/>
                </linearGradient>
                <linearGradient id="lateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.8"/>
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.3"/>
                </linearGradient>
              </defs>
              
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
                vertical={false}
              />
              <XAxis
                dataKey="name"
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={isMobile ? 11 : 13}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                fontSize={isMobile ? 11 : 13}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value} students`, 'Count']}
                contentStyle={{
                  backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                  border: theme === 'dark' ? '1px solid #475569' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                  color: theme === 'dark' ? '#f1f5f9' : '#1f2937',
                  fontSize: isMobile ? '12px' : '14px'
                }}
                cursor={{ fill: theme === 'dark' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                animationDuration={300}
              />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]}
                animationBegin={300}
                animationDuration={500}
                animationEasing="ease-out"
              >
                {pieChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={
                      entry.name === 'Present' ? 'url(#presentGradient)' :
                      entry.name === 'Absent' ? 'url(#absentGradient)' :
                      'url(#lateGradient)'
                    }
                    strokeWidth={2}
                    stroke={entry.color}
                    className="transition-all duration-300 hover:opacity-90"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Legend - Responsive */}
        <div className="flex flex-wrap justify-center gap-3 sm:gap-6 mt-4 pt-4 border-t border-dashed border-gray-300 dark:border-gray-700">
          {pieChartData.map((item, index) => (
            <div key={index} className="flex items-center space-x-1.5 sm:space-x-2">
              <div 
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )}

  {/* Class Info Card - Fixed height with no scroll, matching the chart card */}
  {attendanceData && (
    <div className={combine(getCardGradientClass('indigo'), "relative overflow-hidden group h-[500px] flex flex-col")}>
      {/* Decorative elements */}
      <div className="absolute -top-8 -right-8 sm:-top-10 sm:-right-10 w-32 h-32 sm:w-40 sm:h-40 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full blur-2xl"></div>
      </div>
      <div className="absolute -bottom-8 -left-8 sm:-bottom-10 sm:-left-10 w-24 h-24 sm:w-32 sm:h-32 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-blue-400 rounded-full blur-xl"></div>
      </div>

      <div className="relative z-10 p-4 sm:p-6 flex flex-col h-full overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-8">
          <div className="mb-3 sm:mb-0">
            <h3 className={combine("text-lg sm:text-xl md:text-2xl font-bold mb-1 sm:mb-2", get('text', 'primary'))}>
              {selectedSectionDetail ? 'Section Information' : 'Class Information'}
            </h3>
            <p className={combine("text-xs sm:text-sm opacity-75", get('text', 'secondary'))}>
              {selectedSectionDetail 
                ? `Detailed overview of Class ${selectedClassName} - Section ${selectedSectionName}`
                : `Overall overview of Class ${selectedClassName} (All Sections)`}
            </p>
          </div>
          <div className={combine(
            "p-2 sm:p-3 rounded-lg sm:rounded-xl transform transition-transform duration-300 group-hover:scale-110 self-start sm:self-auto",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-indigo-900/40 to-purple-800/30 border border-indigo-800/30' 
              : 'bg-gradient-to-br from-indigo-100 to-purple-50 border border-indigo-200'
          )}>
            <IoIosSchool className={combine(
              "text-lg sm:text-xl md:text-2xl",
              theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
            )} />
          </div>
        </div>

        {/* Class Summary Grid - Responsive */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className={combine(
            "p-3 sm:p-4 rounded-lg sm:rounded-xl border",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/50 to-indigo-900/10 border-indigo-800/30' 
              : 'bg-gradient-to-br from-white to-indigo-50/50 border-indigo-100'
          )}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg",
                theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
              )}>
                <FiUsers className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                )} />
              </div>
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                  {selectedSectionDetail ? 'Section Students' : 'Total Students'}
                </p>
                <p className={combine("text-lg sm:text-xl font-bold mt-0.5 sm:mt-1", get('text', 'primary'))}>
                  {selectedSectionDetail 
                    ? selectedSectionDetail.total_students 
                    : attendanceData.summary.Present + attendanceData.summary.Absent + 
                      attendanceData.summary.Late + attendanceData.summary['Not Marked']}
                </p>
              </div>
            </div>
          </div>

          <div className={combine(
            "p-3 sm:p-4 rounded-lg sm:rounded-xl border",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-gray-800/50 to-blue-900/10 border-blue-800/30' 
              : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
          )}>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className={combine(
                "p-1.5 sm:p-2 rounded-lg",
                theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
              )}>
                <FaUserGraduate className={combine(
                  "text-base sm:text-lg",
                  theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                )} />
              </div>
              <div>
                <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                  {selectedSectionDetail ? 'Present Students' : 'Total Present'}
                </p>
                <p className={combine("text-lg sm:text-xl font-bold mt-0.5 sm:mt-1", get('text', 'primary'))}>
                  {selectedSectionDetail 
                    ? selectedSectionDetail.present 
                    : attendanceData.summary.Present}
                </p>
              </div>
            </div>
          </div>
        </div>

                    {/* Main Information Cards */}
                    <div className="space-y-3 sm:space-y-4">
                      {/* Class Teacher Card - Only show for section view */}
                      {selectedSectionDetail && selectedSectionDetail.class_teacher && (
                        <div className={combine(
                          "p-3 sm:p-4 rounded-lg sm:rounded-xl border transform transition-all duration-300 hover:scale-[1.02]",
                          theme === 'dark' 
                            ? 'bg-gradient-to-r from-indigo-900/20 to-purple-900/10 border-indigo-800/40 hover:border-indigo-700/60' 
                            : 'bg-gradient-to-r from-indigo-50/50 to-purple-50/30 border-indigo-200 hover:border-indigo-300'
                        )}>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={combine("text-xs font-medium uppercase tracking-wider", get('text', 'secondary'))}>Class Teacher</p>
                              <p className={combine("text-sm sm:text-lg font-semibold mt-0.5 sm:mt-1", get('accent', 'primary'))}>
                                {selectedSectionDetail.class_teacher.name}
                              </p>
                              {selectedSectionDetail.class_teacher.teacher_id && (
                                <p className={combine("text-xs mt-0.5 sm:mt-1", get('text', 'tertiary'))}>
                                  ID: {selectedSectionDetail.class_teacher.teacher_id}
                                </p>
                              )}
                            </div>
                            <div className={combine(
                              "p-1.5 sm:p-2 rounded-lg",
                              theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                            )}>
                              <FaUserGraduate className={combine(
                                "text-lg sm:text-xl",
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              )} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Attendance Rate Card with Animation */}
                      <div className={combine(
                        "p-3 sm:p-4 rounded-lg sm:rounded-xl border relative overflow-hidden",
                        theme === 'dark' 
                          ? 'bg-gradient-to-r from-emerald-900/20 to-green-900/10 border-emerald-800/40' 
                          : 'bg-gradient-to-r from-emerald-50/50 to-green-50/30 border-emerald-200'
                      )}>
                        {/* Animated background ring */}
                        <div className="absolute top-0 right-0 w-16 h-16 sm:w-24 sm:h-24 opacity-10">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-green-500 rounded-full"></div>
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                            <div>
                              <p className={combine("text-xs font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                {selectedSectionDetail ? 'Section Attendance Rate' : 'Class Attendance Rate'}
                              </p>
                              <div className="flex items-baseline flex-wrap gap-2 mt-1">
                                {selectedSectionDetail ? (
                                  <>
                                    <p className={combine("text-2xl sm:text-3xl font-bold", get('accent', 'success'))}>
                                      {selectedSectionDetail.attendance_percentage}%
                                    </p>
                                    <div className={combine(
                                      "px-2 py-1 rounded-full text-xs font-medium",
                                      selectedSectionDetail.attendance_percentage >= 80 
                                        ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                        : selectedSectionDetail.attendance_percentage >= 60
                                        ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                                        : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                                    )}>
                                      {selectedSectionDetail.attendance_percentage >= 80 ? 'Excellent' 
                                       : selectedSectionDetail.attendance_percentage >= 60 ? 'Good' 
                                       : 'Needs Improvement'}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p className={combine("text-2xl sm:text-3xl font-bold", get('accent', 'success'))}>
                                      {Math.round((attendanceData.summary.Present / 
                                        (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                         attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)}%
                                    </p>
                                    <div className={combine(
                                      "px-2 py-1 rounded-full text-xs font-medium",
                                      (attendanceData.summary.Present / 
                                       (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                        attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                                        ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                        : (attendanceData.summary.Present / 
                                           (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                            attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                                        ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                                        : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                                    )}>
                                      {(attendanceData.summary.Present / 
                                        (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                         attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 ? 'Excellent' 
                                       : (attendanceData.summary.Present / 
                                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                           attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60 ? 'Good' 
                                       : 'Needs Improvement'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="relative mt-2 sm:mt-0">
                              {/* Circular progress indicator */}
                              <div className="w-12 h-12 sm:w-16 sm:h-16 relative mx-auto sm:mx-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={theme === 'dark' ? '#374151' : '#e5e7eb'}
                                    strokeWidth="2"
                                  />
                                  <path
                                    d="M18 2.0845
                                      a 15.9155 15.9155 0 0 1 0 31.831
                                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={selectedSectionDetail 
                                      ? (selectedSectionDetail.attendance_percentage >= 80 ? '#10B981' 
                                         : selectedSectionDetail.attendance_percentage >= 60 ? '#F59E0B' 
                                         : '#EF4444')
                                      : ((attendanceData.summary.Present / 
                                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                           attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 ? '#10B981' 
                                         : (attendanceData.summary.Present / 
                                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                             attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60 ? '#F59E0B' 
                                         : '#EF4444')}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeDasharray={`${
                                      selectedSectionDetail 
                                        ? selectedSectionDetail.attendance_percentage
                                        : Math.round((attendanceData.summary.Present / 
                                            (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                             attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                                    }, 100`}
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={combine(
                                    "text-xs sm:text-sm font-bold",
                                    selectedSectionDetail 
                                      ? (selectedSectionDetail.attendance_percentage >= 80 
                                          ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600')
                                          : selectedSectionDetail.attendance_percentage >= 60
                                          ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-600')
                                          : (theme === 'dark' ? 'text-red-300' : 'text-red-600'))
                                      : ((attendanceData.summary.Present / 
                                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                           attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                                          ? (theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600')
                                          : (attendanceData.summary.Present / 
                                             (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                              attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                                          ? (theme === 'dark' ? 'text-amber-300' : 'text-amber-600')
                                          : (theme === 'dark' ? 'text-red-300' : 'text-red-600'))
                                  )}>
                                    {selectedSectionDetail 
                                      ? selectedSectionDetail.attendance_percentage
                                      : Math.round((attendanceData.summary.Present / 
                                          (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                           attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                                    }%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-3 sm:mt-4">
                            <div className={combine(
                              "w-full h-1.5 sm:h-2 rounded-full overflow-hidden",
                              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
                            )}>
                              <div 
                                className={combine(
                                  "h-1.5 sm:h-2 rounded-full transition-all duration-1000 ease-out",
                                  selectedSectionDetail 
                                    ? (selectedSectionDetail.attendance_percentage >= 80 
                                        ? (theme === 'dark' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-emerald-400 to-green-300')
                                        : selectedSectionDetail.attendance_percentage >= 60
                                        ? (theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300')
                                        : (theme === 'dark' ? 'bg-gradient-to-r from-red-500 to-pink-400' : 'bg-gradient-to-r from-red-400 to-pink-300'))
                                    : ((attendanceData.summary.Present / 
                                        (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                         attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 80 
                                        ? (theme === 'dark' ? 'bg-gradient-to-r from-emerald-500 to-green-400' : 'bg-gradient-to-r from-emerald-400 to-green-300')
                                        : (attendanceData.summary.Present / 
                                           (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                            attendanceData.summary.Late + attendanceData.summary['Not Marked']) * 100) >= 60
                                        ? (theme === 'dark' ? 'bg-gradient-to-r from-amber-500 to-yellow-400' : 'bg-gradient-to-r from-amber-400 to-yellow-300')
                                        : (theme === 'dark' ? 'bg-gradient-to-r from-red-500 to-pink-400' : 'bg-gradient-to-r from-red-400 to-pink-300'))
                                )}
                                style={{ 
                                  width: `${selectedSectionDetail 
                                    ? selectedSectionDetail.attendance_percentage
                                    : Math.round((attendanceData.summary.Present / 
                                        (attendanceData.summary.Present + attendanceData.summary.Absent + 
                                         attendanceData.summary.Late + attendanceData.summary['Not Marked'])) * 100)
                                  }%` 
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Date and Class Info Card - Responsive Grid */}
                      <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        <div className={combine(
                          "p-3 sm:p-4 rounded-lg sm:rounded-xl border",
                          theme === 'dark' 
                            ? 'bg-gradient-to-br from-gray-800/50 to-blue-900/10 border-blue-800/30' 
                            : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
                        )}>
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={combine(
                              "p-1.5 sm:p-2 rounded-lg",
                              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                            )}>
                              <FiCalendar className={combine(
                                "text-base sm:text-lg",
                                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                              )} />
                            </div>
                            <div>
                              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Date</p>
                              <p className={combine("text-sm font-semibold mt-0.5 sm:mt-1", get('text', 'primary'))}>
                                {new Date(selectedDate).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className={combine(
                          "p-3 sm:p-4 rounded-lg sm:rounded-xl border",
                          theme === 'dark' 
                            ? 'bg-gradient-to-br from-gray-800/50 to-purple-900/10 border-purple-800/30' 
                            : 'bg-gradient-to-br from-white to-purple-50/50 border-purple-100'
                        )}>
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={combine(
                              "p-1.5 sm:p-2 rounded-lg",
                              theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                            )}>
                              <IoIosSchool className={combine(
                                "text-base sm:text-lg",
                                theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                              )} />
                            </div>
                            <div>
                              <p className={combine("text-xs font-medium", get('text', 'secondary'))}>
                                {selectedSectionDetail ? 'Class & Section' : 'Class'}
                              </p>
                              <p className={combine("text-sm font-bold mt-0.5 sm:mt-1", get('accent', 'primary'))}>
                                {selectedClassName} {selectedSectionDetail ? `- ${selectedSectionName}` : '(All Sections)'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Unmarked Students Alert */}
                      {(selectedSectionDetail ? selectedSectionDetail.unmarked : attendanceData.summary['Not Marked']) > 0 && (
                        <div className={combine(
                          "p-3 sm:p-4 rounded-lg sm:rounded-xl border mt-2 sm:mt-4",
                          theme === 'dark' 
                            ? 'bg-gradient-to-r from-amber-900/20 to-yellow-900/10 border-amber-800/40' 
                            : 'bg-gradient-to-r from-amber-50/50 to-yellow-50/30 border-amber-200'
                        )}>
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <div className={combine(
                              "p-1.5 sm:p-2 rounded-lg flex-shrink-0",
                              theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                            )}>
                              <FaExclamationTriangle className={combine(
                                "text-base sm:text-lg",
                                theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                              )} />
                            </div>
                            <div>
                              <p className={combine("text-xs sm:text-sm font-medium", get('accent', 'warning'))}>
                                {(selectedSectionDetail ? selectedSectionDetail.unmarked : attendanceData.summary['Not Marked'])} student(s) not marked
                              </p>
                              <p className={combine("text-xs mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                                Update attendance status in the table below
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Student List Table - Only in class-detail view */}
            {viewMode === 'class-detail' && attendanceData && (
              <div className={combine(
                "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border mt-6",
                getCardGradientClass('indigo')
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                  <div>
                    <h3 className={combine("text-lg sm:text-xl font-bold mb-1", get('text', 'primary'))}>
                      Student Attendance List
                    </h3>
                    <p className={combine("text-xs opacity-75", get('text', 'secondary'))}>
                      {selectedSectionName 
                        ? `Class ${selectedClassName} - Section ${selectedSectionName}` 
                        : `Class ${selectedClassName} (All Sections)`} • {attendanceData.students.length} students
                    </p>
                  </div>
                  
                  {/* Search and Export */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-0">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search students..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={combine(
                          getInputClass(),
                          "pl-9 pr-3 py-2 text-sm w-full sm:w-64"
                        )}
                      />
                      <FaSearch className={combine(
                        "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                        get('text', 'tertiary')
                      )} />
                    </div>
                    <button
                      onClick={exportToCSV}
                      className={combine(
                        getSecondaryButtonClass(),
                        "flex items-center justify-center gap-2 px-4 py-2 text-sm"
                      )}
                    >
                      <FiDownload className="text-sm" />
                      Export CSV
                    </button>
                  </div>
                </div>

                {/* Student Table */}
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden border border-[var(--color-border-secondary)] rounded-lg">
                      <table className="min-w-full divide-y divide-[var(--color-border-secondary)]">
                        <thead className={combine(
                          "bg-gradient-to-r",
                          theme === 'dark' 
                            ? 'from-gray-800 to-gray-900' 
                            : 'from-gray-50 to-gray-100'
                        )}>
                          <tr>
                            <th scope="col" className={combine(
                              "px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'secondary')
                            )}>
                              Student ID
                            </th>
                            <th scope="col" className={combine(
                              "px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'secondary')
                            )}>
                              Student Name
                            </th>
                            <th scope="col" className={combine(
                              "px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'secondary')
                            )}>
                              Status
                            </th>
                            {/* <th scope="col" className={combine(
                              "px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'secondary')
                            )}>
                              Actions
                            </th> */}
                            <th scope="col" className={combine(
                              "px-4 sm:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider",
                              get('text', 'secondary')
                            )}>
                              History
                            </th>
                          </tr>
                        </thead>
                        <tbody className={combine(
                          "divide-y divide-[var(--color-border-secondary)]",
                          get('bg', 'card')
                        )}>
                          {filteredAttendance.length > 0 ? (
                            filteredAttendance.map((record: AttendanceRecord, index: number) => (
                              <tr 
                                key={`${record.student_id}-${index}`}
                                className={combine(
                                  "transition-colors duration-150",
                                  theme === 'dark' 
                                    ? 'hover:bg-gray-800/50' 
                                    : 'hover:bg-gray-50'
                                )}
                              >
                                <td className={combine(
                                  "px-4 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-mono",
                                  get('text', 'secondary')
                                )}>
                                  {record.student_id}
                                </td>
                                <td className={combine(
                                  "px-4 sm:px-6 py-3 whitespace-nowrap text-xs sm:text-sm font-medium",
                                  get('text', 'primary')
                                )}>
                                  {record.student_name}
                                </td>
                                <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                  <span className={getStatusBadgeClass(
                                    record.status === 'Present' ? 'emerald' :
                                    record.status === 'Absent' ? 'red' :
                                    record.status === 'Late' ? 'amber' :
                                    record.status === 'On Leave' ? 'blue' : 'gray'
                                  )}>
                                    {record.status}
                                  </span>
                                </td>
                               
                                <td className="px-4 sm:px-6 py-3 whitespace-nowrap">
                                  <button
                                    onClick={() => handleViewHistory(record.student_id, record.student_name)}
                                    className={combine(
                                      "px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-all duration-200 font-medium",
                                      "flex items-center gap-1.5",
                                      "border border-[var(--color-border-secondary)]",
                                      "hover:bg-[var(--color-bg-hover)]",
                                      "text-[var(--color-accent-primary)]",
                                      "hover:scale-[1.02] active:scale-[0.98]"
                                    )}
                                  >
                                    <FiClock className="text-xs" />
                                    <span className="hidden sm:inline">View History</span>
                                    <span className="sm:hidden">History</span>
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className={combine(
                                "px-4 sm:px-6 py-8 text-center",
                                get('text', 'secondary')
                              )}>
                                <div className="flex flex-col items-center justify-center">
                                  <FaUsers className={combine(
                                    "text-3xl sm:text-4xl mb-3",
                                    get('text', 'tertiary')
                                  )} />
                                  <p className="text-sm font-medium">No students found</p>
                                  <p className="text-xs mt-1">
                                    {searchTerm 
                                      ? 'Try adjusting your search term' 
                                      : selectedSectionName 
                                        ? `No students in Class ${selectedClassName} - Section ${selectedSectionName}` 
                                        : `No students in Class ${selectedClassName}`}
                                  </p>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Table Footer with Summary */}
                {filteredAttendance.length > 0 && (
                  <div className={combine(
                    "mt-4 pt-4 border-t border-[var(--color-border-secondary)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs",
                    get('text', 'secondary')
                  )}>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>Showing {filteredAttendance.length} of {attendanceData.students.length} students</span>
                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                          Present: {attendanceData.summary.Present}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span>
                          Absent: {attendanceData.summary.Absent}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span>
                          Late: {attendanceData.summary.Late}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#6B7280]"></span>
                          Not Marked: {attendanceData.summary['Not Marked']}
                        </span>
                      </div>
                    </div>
                    {searchTerm && filteredAttendance.length < attendanceData.students.length && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className={combine(
                          "text-[var(--color-accent-primary)] hover:underline",
                          "text-xs font-medium"
                        )}
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {viewMode === 'student-history' && (
          <StudentAttendanceHistory 
            initialStudentId={studentHistoryParams?.studentId}
            initialStudentName={studentHistoryParams?.studentName}
            initialYear={studentHistoryParams?.year}
          />
        )}
      </div>
    </div>
  );
}
