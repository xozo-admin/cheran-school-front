// app/attendance/teacher/page.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock,
  FaHistory,
  FaCalendarDay,
  FaEdit,
  FaSearch,
  FaFilter,
  FaDownload,
  FaUsers,
  FaChartPie,
  FaRegCalendarCheck,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaMapMarkerAlt,
  FaBirthdayCake,
  FaVenusMars,
  FaSchool,
  FaTimes,
  FaExclamationTriangle,
  FaArrowUp,
  FaArrowDown,
  FaUserGraduate,
  FaSortUp,
  FaSortDown
} from 'react-icons/fa';
import { FiCalendar, FiFilter, FiDownload, FiChevronRight, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiMenu, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { MdAssignmentReturned, MdOutlineBarChart, MdOutlineDashboard } from 'react-icons/md';
import { IoIosSchool, IoMdStats } from 'react-icons/io';
import { teacherApi } from '@/lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
  PieController,
  LineController,
} from 'chart.js';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastError, toastSuccess } from '@/lib/toast';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  DoughnutController,
  PieController,
  LineController
);

// Define types
interface Student {
  student_id: string;
  student_name: string;
  roll_no?: number;
  name?: string;
  status?: string;
}

interface StudentProfile {
  student_id: string;
  student_name: string;
  student_email: string;
  father_phone: string;
  mother_phone: string;
  father_name: string;
  mother_name: string;
  address: string;
  date_of_birth: string;
  gender: string;
  class_name: string;
  section: string;
}

interface AttendanceSummary {
  Present: number;
  Absent: number;
  Late: number;
  'Not Marked': number;
  [key: string]: number;
}

interface ClassAttendanceData {
  date: string;
  class: string;
  section: string;
  summary: AttendanceSummary;
  attendance_data: Student[];
}

interface RollCallData {
  class: string;
  section: string;
  total_students: number;
  students: Student[];
}

interface StudentHistoryData {
  student_id: string;
  year: string;
  annual_summary: {
    present: number;
    absent: number;
    late: number;
  };
  calendar_data: {
    [month: string]: {
      stats: {
        present: number;
        absent: number;
        late: number;
      };
      dates: Array<{
        date: number;
        status: string;
        status_display: string;
      }>;
    };
  };
}

interface AttendanceRecord {
  student_id: string;
  status: string;
}

// API Functions
const getClassAttendance = async (date: string) => {
  try {
    const response = await teacherApi.attendance.myClass(date);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching class attendance:', error);
    throw error;
  }
};

const getRollCallList = async (date?: string) => {
  try {
    const response = await teacherApi.attendance.markList(date);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching roll call:', error);
    throw error;
  }
};

const submitBatchAttendance = async (date: string, attendanceList: any[]) => {
  try {
    const response = await teacherApi.attendance.mark({
      date,
      attendance_list: attendanceList,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error submitting attendance:', error);
    throw error;
  }
};

const getStudentHistory = async (studentId: string, year: string) => {
  try {
    const response = await teacherApi.attendance.history(studentId, year);
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching student history:', error);
    throw error;
  }
};

const getStudentProfile = async (studentId: string) => {
  try {
    const response = await teacherApi.studentPortal.details(studentId);
    const data = response.data;
    return data.data;
  } catch (error) {
    console.error('Error fetching student profile:', error);
    throw error;
  }
};

const updateAttendance = async (studentId: string, date: string, status: string) => {
  try {
    const response = await teacherApi.attendance.update({
      student_id: studentId,
      date,
      status,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error updating attendance:', error);
    throw error;
  }
};

const getDailyReport = async (date: string, className: string, section: string) => {
  try {
    const response = await teacherApi.attendance.dailyReport({
      date,
      class: className,
      section,
    });
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching daily report:', error);
    throw error;
  }
};

export default function TeacherAttendanceDashboard() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [attendanceData, setAttendanceData] = useState<ClassAttendanceData | null>(null);
  const [markingData, setMarkingData] = useState<RollCallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMarking, setLoadingMarking] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [sortConfig, setSortConfig] = useState<{ key: 'student_id' | 'name' | 'status'; direction: 'asc' | 'desc' }>({
    key: 'student_id',
    direction: 'asc'
  });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'mark' | 'history' | 'analysis'>('dashboard');
  const [studentHistory, setStudentHistory] = useState<StudentHistoryData | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [classStats, setClassStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [historyViewMode, setHistoryViewMode] = useState<'chart' | 'calendar'>('chart');
  
  // Ref for the chart
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsSmallScreen(width < 1024);
      if (width >= 1024) {
        setShowFilters(true);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Generate years for dropdown
  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  useEffect(() => {
    if (viewMode === 'dashboard') {
      fetchDailyAttendance();
    } else if (viewMode === 'analysis') {
      fetchMonthlyAnalysis();
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    if (viewMode === 'history' && studentHistory) {
      renderAttendanceChart();
    }
    
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [viewMode, studentHistory, selectedYear, historyViewMode]);

  // Theme-aware helper functions
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

  const getStatusBadgeClass = (status: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      Present: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      Absent: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
      Late: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      'Not Marked': {
        bg: theme === 'dark' ? 'from-gray-800 to-gray-700' : 'from-gray-100 to-gray-200',
        text: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
        border: theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      }
    };

    const colors = colorMap[status] || colorMap['Not Marked'];
    return combine(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getStatusIcon = (status: string, size: string = 'text-lg sm:text-xl md:text-2xl') => {
    switch (status) {
      case 'Present': return <FiCheckCircle className={`${size} ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`} />;
      case 'Absent': return <FiXCircle className={`${size} ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />;
      case 'Late': return <FiClock className={`${size} ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`} />;
      default: return <FiUsers className={`${size} ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Present': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
      case 'Absent': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
      case 'Late': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const renderAttendanceChart = () => {
    if (!studentHistory || historyViewMode !== 'chart') return;

    const ctx = document.getElementById('overallAttendanceChart') as HTMLCanvasElement;
    if (!ctx) return;

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const academicMonths = generateAcademicMonths(studentHistory.year || '2025-2026');
    
    const presentData: number[] = [];
    const absentData: number[] = [];
    const lateData: number[] = [];
    const attendanceRateData: number[] = [];

    academicMonths.forEach(({ monthNum }) => {
      const monthData = studentHistory.calendar_data?.[monthNum.toString()];
      
      if (monthData) {
        const present = monthData.stats?.present || 0;
        const absent = monthData.stats?.absent || 0;
        const late = monthData.stats?.late || 0;
        const totalDays = present + absent + late;
        
        presentData.push(present);
        absentData.push(absent);
        lateData.push(late);
        
        const rate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
        attendanceRateData.push(rate);
      } else {
        presentData.push(0);
        absentData.push(0);
        lateData.push(0);
        attendanceRateData.push(0);
      }
    });

    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels: academicMonths.map(m => m.month),
        datasets: [
          {
            label: 'Present',
            data: presentData,
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: 'rgb(16, 185, 129)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Absent',
            data: absentData,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: 'rgb(239, 68, 68)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Late',
            data: lateData,
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: true,
            pointBackgroundColor: 'rgb(245, 158, 11)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7
          },
          {
            label: 'Attendance Rate %',
            data: attendanceRateData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3,
            fill: false,
            borderDash: [5, 5],
            pointBackgroundColor: 'rgb(59, 130, 246)',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            grid: {
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            title: {
              display: true,
              text: `Academic Year (${studentHistory.year || '2025-2026'})`,
              font: {
                size: isMobile ? 12 : 14,
                weight: 'bold'
              },
              color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
            },
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#4b5563'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Number of Days',
              font: {
                size: isMobile ? 12 : 14,
                weight: 'bold'
              },
              color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
            },
            grid: {
              color: theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'
            },
            beginAtZero: true,
            ticks: {
              color: theme === 'dark' ? '#9ca3af' : '#4b5563'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Attendance Rate (%)',
              font: {
                size: isMobile ? 12 : 14,
                weight: 'bold'
              },
              color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
            },
            grid: {
              drawOnChartArea: false,
            },
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              },
              color: theme === 'dark' ? '#9ca3af' : '#4b5563'
            }
          }
        },
        plugins: {
          legend: {
            position: 'top' as const,
            labels: {
              font: {
                size: isMobile ? 11 : 12
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
              color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: theme === 'dark' ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            titleColor: theme === 'dark' ? '#f1f5f9' : '#1f2937',
            bodyColor: theme === 'dark' ? '#cbd5e1' : '#4b5563',
            borderColor: theme === 'dark' ? '#475569' : '#e5e7eb',
            borderWidth: 1,
            callbacks: {
              label: function(context: any) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.datasetIndex === 3) {
                  label += context.parsed.y + '%';
                } else {
                  label += context.parsed.y + ' days';
                }
                return label;
              },
              title: function(context: any) {
                const index = context[0].dataIndex;
                const academicMonth = academicMonths[index];
                return `${academicMonth.month} ${academicMonth.year}`;
              }
            }
          },
          title: {
            display: true,
            text: `Monthly Attendance Trend (Academic Year ${studentHistory.year || '2025-2026'})`,
            font: {
              size: isMobile ? 14 : 16,
              weight: 'bold'
            },
            padding: {
              top: 10,
              bottom: 30
            },
            color: theme === 'dark' ? '#e5e7eb' : '#1f2937'
          }
        }
      }
    });
  };

  const fetchDailyAttendance = async () => {
    try {
      setLoading(true);
      const data = await getClassAttendance(selectedDate);
      setAttendanceData(data);
      
      const className = data?.class || '';
      const section = data?.section || '';
      
      if (className && section) {
        try {
          const stats = await getDailyReport(selectedDate, className, section);
          setClassStats(stats);
        } catch (err) {
          console.error('Error fetching class stats:', err);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch attendance data');
      toastError(err.message || 'Failed to fetch attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkingData = async () => {
    try {
      setLoadingMarking(true);
      const data = await getRollCallList();
      setMarkingData(data);
      
      try {
        const todayAttendance = await getClassAttendance(selectedDate);
        
        if (todayAttendance && todayAttendance.attendance_data) {
          const existingAttendance = todayAttendance.attendance_data.map((student: Student) => ({
            student_id: student.student_id,
            status: student.status || 'Present'
          }));
          setAttendanceList(existingAttendance);
          toastSuccess('Loaded existing attendance for editing');
        } else {
          const initialList = data.students.map((student: Student) => ({
            student_id: student.student_id,
            status: 'Present'
          }));
          setAttendanceList(initialList);
        }
      } catch (err) {
        const initialList = data.students.map((student: Student) => ({
          student_id: student.student_id,
          status: 'Present'
        }));
        setAttendanceList(initialList);
      }
      
      setViewMode('mark');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch marking data');
      toastError(err.message || 'Failed to fetch marking data');
    } finally {
      setLoadingMarking(false);
    }
  };

  const fetchStudentHistory = async (studentId: string, year?: string) => {
    try {
      setLoadingHistory(true);
      const targetYear = '2025-2026';
      const data = await getStudentHistory(studentId, targetYear);
      setStudentHistory(data);
      setSelectedStudent(studentId);
      setHistoryViewMode('chart');
      setViewMode('history');
      toastSuccess(`Loaded history for student ${studentId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student history');
      toastError(err.message || 'Failed to fetch student history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchStudentProfile = async (studentId: string) => {
    try {
      setLoadingProfile(true);
      const profile = await getStudentProfile(studentId);
      setStudentProfile(profile);
      setShowProfileModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch student profile');
      toastError(err.message || 'Failed to fetch student profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchMonthlyAnalysis = async () => {
    try {
      setLoading(true);
      if (attendanceData) {
        const monthlyAnalysis = generateMonthlyAnalysisData(attendanceData);
        setMonthlyData(monthlyAnalysis);
      }
    } catch (err: any) {
      setError('Error fetching monthly analysis');
      toastError('Error fetching monthly analysis');
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyAnalysisData = (baseData: ClassAttendanceData) => {
    const statusDistribution = {
      labels: ['Present', 'Absent', 'Late'],
      datasets: [{
        data: [
          baseData?.summary?.Present || 0,
          baseData?.summary?.Absent || 0,
          baseData?.summary?.Late || 0,
        ],
        backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
      }]
    };

    const weeklyTrend = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        {
          label: 'Present',
          data: [85, 88, 92, 90],
          borderColor: '#10B981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
        },
        {
          label: 'Absent',
          data: [10, 8, 5, 7],
          borderColor: '#EF4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
        },
        {
          label: 'Late',
          data: [5, 4, 3, 3],
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          fill: true,
        }
      ]
    };

    return { statusDistribution, weeklyTrend };
  };

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendanceList(prev =>
      prev.map(item =>
        item.student_id === studentId ? { ...item, status } : item
      )
    );
  };

  const handleSubmitAttendance = async () => {
    if (!markingData) return;
    
    try {
      await submitBatchAttendance(selectedDate, attendanceList);
      toastSuccess('Attendance marked successfully!');
      setViewMode('dashboard');
      fetchDailyAttendance();
    } catch (err: any) {
      setError(err.message || 'Failed to submit attendance');
      toastError(err.message || 'Failed to submit attendance');
    }
  };

  const generateAcademicMonths = (yearRange: string) => {
    const [startYear, endYear] = yearRange.split('-').map(y => parseInt(y));
    
    const academicMonths = [];
    
    for (let month = 6; month <= 12; month++) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      academicMonths.push({
        month: monthNames[month - 1],
        year: startYear,
        monthNum: month
      });
    }
    
    for (let month = 1; month <= 5; month++) {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      academicMonths.push({
        month: monthNames[month - 1],
        year: endYear,
        monthNum: month
      });
    }
    
    return academicMonths;
  };

  const getAcademicMonthMeta = (yearRange: string, monthNumber: number) => {
    const [startYear, endYear] = yearRange.split('-').map(y => parseInt(y));
    const year = monthNumber >= 6 ? startYear : endYear;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return {
      year,
      monthName: monthNames[monthNumber - 1],
    };
  };

  const buildStudentHistoryCalendarCells = (yearRange: string, monthNumber: number, monthData: any) => {
    const { year } = getAcademicMonthMeta(yearRange, monthNumber);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const mondayFirstOffset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const cells: Array<{ type: 'empty' } | { type: 'day'; day: number; dayData?: any }> = [];

    for (let index = 0; index < mondayFirstOffset; index += 1) {
      cells.push({ type: 'empty' });
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dayData = monthData.dates?.find((entry: any) => entry.date === day);
      cells.push({ type: 'day', day, dayData });
    }

    return cells;
  };

  const exportAttendance = () => {
    if (!attendanceData) return;
    
    const csvContent = [
      ['Roll No', 'Student ID', 'Name', 'Status', 'Date'],
      ...attendanceData.attendance_data.map((student: Student) => [
        student.roll_no || '',
        student.student_id,
        student.student_name || student.name || '',
        student.status || 'Not Marked',
        selectedDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance_${attendanceData.class}_${attendanceData.section}_${selectedDate}.csv`;
    a.click();
    toastSuccess('Attendance data exported successfully');
  };

  const filteredStudents = attendanceData?.attendance_data?.filter((student: Student) => {
    const studentName = student.student_name || student.name || '';
    const matchesSearch = studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedStudents = (filteredStudents || []).slice().sort((a, b) => {
    const getName = (student: Student) => (student.student_name || student.name || '').toLowerCase();
    const getStatus = (student: Student) => (student.status || 'Not Marked').toLowerCase();
    const getId = (student: Student) => (student.student_id || '').toLowerCase();

    const aValue = sortConfig.key === 'name'
      ? getName(a)
      : sortConfig.key === 'status'
        ? getStatus(a)
        : getId(a);
    const bValue = sortConfig.key === 'name'
      ? getName(b)
      : sortConfig.key === 'status'
        ? getStatus(b)
        : getId(b);

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: 'student_id' | 'name' | 'status') => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Render Student Profile Modal
  const renderProfileModal = () => {
    if (!showProfileModal || !studentProfile) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={combine(
          "rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto",
          get('bg', 'card'),
          "border",
          get('border', 'primary')
        )}>
          <div className={combine("sticky top-0 border-b p-4 sm:p-6 rounded-t-2xl", get('bg', 'card'))}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={combine(
                  "p-2 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaUser className={combine("text-xl sm:text-2xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                </div>
                <div>
                  <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>Student Profile</h2>
                  <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Detailed information about the student</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className={combine(
                  "p-2 rounded-full transition-colors",
                  theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                )}
              >
                <FaTimes className={combine("text-lg sm:text-xl", get('text', 'secondary'))} />
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {loadingProfile ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className={combine(
                  "p-4 sm:p-6 rounded-xl",
                  theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/10' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
                )}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h3 className={combine("text-lg sm:text-xl font-bold mb-2", get('text', 'primary'))}>
                        {studentProfile.student_name}
                      </h3>
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="flex items-center gap-2">
                          <FaSchool className={combine("text-sm sm:text-base", get('text', 'secondary'))} />
                          <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                            Class {studentProfile.class_name} - Section {studentProfile.section}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaVenusMars className={combine("text-sm sm:text-base", get('text', 'secondary'))} />
                          <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>{studentProfile.gender}</span>
                        </div>
                      </div>
                    </div>
                    <div className={combine(
                      "px-4 py-2 rounded-lg shadow-sm border",
                      get('bg', 'card'),
                      get('border', 'primary')
                    )}>
                      <div className={combine("text-xs", get('text', 'tertiary'))}>Student ID</div>
                      <div className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>{studentProfile.student_id}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-4">
                    <h4 className={combine("font-bold flex items-center gap-2 text-sm sm:text-base", get('text', 'primary'))}>
                      <FaEnvelope className={combine("text-sm sm:text-base", get('accent', 'primary'))} />
                      Contact Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Email Address</div>
                        <div className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>{studentProfile.student_email}</div>
                      </div>
                      
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Father's Name</div>
                        <div className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>{studentProfile.father_name}</div>
                      </div>
                      
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Father's Phone</div>
                        <div className={combine("text-xs sm:text-sm font-medium", get('accent', 'primary'))}>
                          <a href={`tel:${studentProfile.father_phone}`}>
                            {studentProfile.father_phone}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className={combine("font-bold flex items-center gap-2 text-sm sm:text-base", get('text', 'primary'))}>
                      <FaPhone className={combine("text-sm sm:text-base", get('accent', 'success'))} />
                      Family Information
                    </h4>
                    
                    <div className="space-y-3">
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Mother's Name</div>
                        <div className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>{studentProfile.mother_name}</div>
                      </div>
                      
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Mother's Phone</div>
                        <div className={combine("text-xs sm:text-sm font-medium", get('accent', 'primary'))}>
                          <a href={`tel:${studentProfile.mother_phone}`}>
                            {studentProfile.mother_phone}
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <div className={combine("text-xs", get('text', 'tertiary'))}>Date of Birth</div>
                        <div className={combine("text-xs sm:text-sm font-medium flex items-center gap-2", get('text', 'primary'))}>
                          <FaBirthdayCake className={combine("text-sm sm:text-base", get('accent', 'warning'))} />
                          {new Date(studentProfile.date_of_birth).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className={combine("font-bold flex items-center gap-2 text-sm sm:text-base", get('text', 'primary'))}>
                    <FaMapMarkerAlt className={combine("text-sm sm:text-base", get('accent', 'error'))} />
                    Address
                  </h4>
                  <div className={combine(
                    "p-3 sm:p-4 rounded-lg",
                    get('bg', 'secondary')
                  )}>
                    <div className={combine("text-xs sm:text-sm whitespace-pre-line", get('text', 'primary'))}>
                      {studentProfile.address}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={combine("sticky bottom-0 border-t p-4 sm:p-6 rounded-b-2xl", get('bg', 'card'))}>
            <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
              <button
                onClick={() => {
                  fetchStudentHistory(studentProfile.student_id);
                  setShowProfileModal(false);
                }}
                className={getPrimaryButtonClass()}
              >
                <div className="flex items-center gap-2">
                  <FaHistory className="text-xs sm:text-sm" />
                  <span className="text-xs sm:text-sm">View Attendance History</span>
                </div>
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className={getSecondaryButtonClass()}
              >
                <span className="text-xs sm:text-sm">Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render different views based on mode
  const renderDashboard = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!attendanceData) {
      return (
        <div className={combine("text-center py-12", get('text', 'secondary'))}>
          <div className="text-5xl sm:text-6xl mb-4 opacity-50">📊</div>
          <p className="text-sm sm:text-base">No attendance data found for {selectedDate}</p>
        </div>
      );
    }

    const summary = attendanceData.summary || {};
    const totalStudents = Object.values(summary).reduce((a: number, b: number) => a + b, 0);

    return (
      <>
        <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
          {Object.entries(summary).map(([status, count]) => {
            if (status === 'On Leave') return null;
            
            return (
              <div key={status} className={getCardGradientClass(
                status === 'Present' ? 'emerald' :
                status === 'Absent' ? 'red' :
                status === 'Late' ? 'amber' : 'blue'
              )}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>{status}</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{count}</p>
                    <p className={combine("mt-2 sm:mt-4 text-xs", get('text', 'tertiary'))}>
                      {totalStudents ? Math.round((count / totalStudents) * 100) : 0}%
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                    status === 'Present'
                      ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')
                      : status === 'Absent'
                        ? (theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')
                        : status === 'Late'
                          ? (theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100')
                          : (theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')
                  )}>
                    {getStatusIcon(status)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className={combine(
          "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border mb-4 sm:mb-6 md:mb-8",
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className={combine(
                  "p-2 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <FaRegCalendarCheck className={combine("text-lg sm:text-xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                </div>
                <div>
                  <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>
                    {attendanceData.class} - Section {attendanceData.section}
                  </h2>
                  <p className={combine("text-xs sm:text-sm flex items-center gap-2", get('text', 'secondary'))}>
                    <FaCalendarDay className="text-xs sm:text-sm" />
                    Date: {attendanceData.date}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={exportAttendance}
                className={getSecondaryButtonClass()}
              >
                <div className="flex items-center gap-2">
                  <FaDownload className="text-xs sm:text-sm" />
                  <span className="text-xs sm:text-sm">Export</span>
                </div>
              </button>
            
              <button
                onClick={fetchMarkingData}
                className={getPrimaryButtonClass()}
              >
                <div className="flex items-center gap-2">
                  <FaEdit className="text-xs sm:text-sm" />
                  <span className="text-xs sm:text-sm">Mark Attendance</span>
                </div>
              </button>
            </div>
          </div>

          {isSmallScreen && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={combine(
                getSecondaryButtonClass(),
                "w-full flex items-center justify-center space-x-2 mb-4"
              )}
            >
              <FiFilter className="text-xs sm:text-sm" />
              <span className="text-xs sm:text-sm">{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
              {showFilters ? <FiChevronUp className="text-xs sm:text-sm" /> : <FiChevronDown className="text-xs sm:text-sm" />}
            </button>
          )}

          <div className={`${isSmallScreen && !showFilters ? 'hidden' : 'block'}`}>
            <div className="flex flex-col xl:flex-row gap-3 sm:gap-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <div className="flex-1">
  <div className="relative">
    <label htmlFor="student-search" className="sr-only">
      Search students
    </label>
    <FaSearch 
      className={combine(
        "absolute left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm", 
        get('text', 'tertiary')
      )}
      aria-hidden="true"
    />
    <input
      id="student-search"
      type="search"
      placeholder="Search students by name or ID..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className={combine(
        getInputClass(),
        "pl-8 sm:pl-9" // Add left padding to make room for icon
      )}
    />
  </div>
</div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 xl:w-auto">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={combine(getInputClass(), "min-w-0 sm:min-w-[180px]")}
                >
                  <option value="all">All Status</option>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                  }}
                  className={combine(
                    "px-4 py-2 rounded-lg font-medium flex items-center gap-2 text-xs sm:text-sm",
                    get('text', 'secondary'),
                    theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  )}
                >
                  <FaFilter className="text-xs sm:text-sm" />
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {sortedStudents?.map((student: Student) => {
              const studentName = student.student_name || student.name || '';
              const studentStatus = student.status || 'Not Marked';

              return (
                <div
                  key={student.student_id}
                  className={combine(
                    "rounded-xl border p-4 shadow-sm",
                    get('bg', 'card'),
                    get('border', 'primary')
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className={combine("text-[11px] uppercase tracking-wide", get('text', 'tertiary'))}>
                        Student ID
                      </div>
                      <div className={combine("text-sm font-semibold break-all", get('text', 'secondary'))}>
                        {student.student_id}
                      </div>
                    </div>
                    <span className={getStatusBadgeClass(studentStatus)}>
                      {studentStatus}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className={combine("text-[11px] uppercase tracking-wide", get('text', 'tertiary'))}>
                      Name
                    </div>
                    <div className={combine("text-sm font-semibold", get('text', 'primary'))}>
                      {studentName}
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => fetchStudentHistory(student.student_id)}
                      className={combine(
                        "w-full justify-center px-3 py-2 rounded-lg font-medium flex items-center gap-2 text-sm",
                        "border border-[var(--color-border-secondary)]",
                        "hover:bg-[var(--color-bg-hover)]",
                        "text-[var(--color-accent-primary)]",
                        "transition-all duration-200"
                      )}
                    >
                      <FaHistory className="text-sm" />
                      <span>View History</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden md:block overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--color-border-secondary)' }}>
            <table className="w-full">
              <thead>
                <tr className={combine("bg-gradient-to-r border-b", get('bg', 'secondary'), get('border', 'secondary'))}>
                  <th
                    className={combine("py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-xs sm:text-sm cursor-pointer", get('text', 'secondary'))}
                    onClick={() => handleSort('student_id')}
                  >
                    <div className="flex items-center gap-2">
                      Student ID
                      {sortConfig.key === 'student_id' && (
                        sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th
                    className={combine("py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-xs sm:text-sm cursor-pointer", get('text', 'secondary'))}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortConfig.key === 'name' && (
                        sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th
                    className={combine("py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-xs sm:text-sm cursor-pointer", get('text', 'secondary'))}
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {sortConfig.key === 'status' && (
                        sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                      )}
                    </div>
                  </th>
                  <th className={combine("py-3 sm:py-4 px-4 sm:px-6 text-left font-semibold text-xs sm:text-sm", get('text', 'secondary'))}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--color-border-secondary)' }}>
                {sortedStudents?.map((student: Student, index: number) => {
                  const studentName = student.student_name || student.name || '';
                  const studentStatus = student.status || 'Not Marked';
                  
                  return (
                    <tr 
                      key={student.student_id} 
                      className={combine(
                        'transition-colors',
                        index % 2 === 0 ? get('bg', 'card') : get('bg', 'secondary'),
                        theme === 'dark' ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                      )}
                    >
                      <td className="py-3 sm:py-4 px-4 sm:px-6">
                        <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>{student.student_id}</div>
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6">
                        <div className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>{studentName}</div>
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadgeClass(studentStatus)}>
                            {studentStatus}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 sm:py-4 px-4 sm:px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => fetchStudentHistory(student.student_id)}
                            className={combine(
                              "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium flex items-center gap-1 sm:gap-2 text-xs sm:text-sm",
                              "border border-[var(--color-border-secondary)]",
                              "hover:bg-[var(--color-bg-hover)]",
                              "text-[var(--color-accent-primary)]",
                              "transition-all duration-200 hover:scale-[1.02]"
                            )}
                          >
                            <FaHistory className="text-xs sm:text-sm" />
                            <span className="hidden sm:inline">View History</span>
                            <span className="sm:hidden">History</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredStudents?.length === 0 && (
            <div className={combine("text-center py-12", get('text', 'secondary'))}>
              <div className="text-5xl sm:text-6xl mb-4 opacity-50">📊</div>
              <p className="text-sm sm:text-base">No students match your search criteria</p>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderMarkingView = () => {
    if (loadingMarking) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!markingData) return null;

    const presentCount = attendanceList.filter(item => item.status === 'Present').length;
    const absentCount = attendanceList.filter(item => item.status === 'Absent').length;
    const lateCount = attendanceList.filter(item => item.status === 'Late').length;

    return (
      <div className={combine(
        "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border",
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>
              Mark Attendance - {markingData.class}-{markingData.section}
            </h2>
            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Date: {selectedDate}</p>
          </div>
          
          <div className="flex items-center gap-4 sm:gap-6">
              <div className="text-center">
                <div className={combine("text-2xl sm:text-3xl font-bold", get('accent', 'primary'))}>{markingData.total_students}</div>
                <div className={combine("text-xs", get('text', 'tertiary'))}>Total</div>
              </div>
              <div className="text-center">
                <div className={combine("text-xl sm:text-2xl font-bold", get('accent', 'success'))}>{presentCount}</div>
                <div className={combine("text-xs", get('text', 'tertiary'))}>Present</div>
              </div>
          </div>
        </div>

        <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className={combine(
            "p-3 sm:p-4 rounded-lg",
            presentCount > 0 ? getCardGradientClass('emerald') : get('bg', 'secondary')
          )}>
            <div className={combine("text-lg sm:text-2xl font-bold", get('accent', 'success'))}>{presentCount}</div>
            <div className={combine("text-xs", get('text', 'secondary'))}>Present</div>
          </div>
          <div className={combine(
            "p-3 sm:p-4 rounded-lg",
            absentCount > 0 ? getCardGradientClass('red') : get('bg', 'secondary')
          )}>
            <div className={combine("text-lg sm:text-2xl font-bold", get('accent', 'error'))}>{absentCount}</div>
            <div className={combine("text-xs", get('text', 'secondary'))}>Absent</div>
          </div>
          <div className={combine(
            "p-3 sm:p-4 rounded-lg",
            lateCount > 0 ? getCardGradientClass('amber') : get('bg', 'secondary')
          )}>
            <div className={combine("text-lg sm:text-2xl font-bold", get('accent', 'warning'))}>{lateCount}</div>
            <div className={combine("text-xs", get('text', 'secondary'))}>Late</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {markingData.students.map((student: Student) => {
            const studentName = student.student_name || student.name || '';
            const currentStatus = attendanceList.find(
              item => item.student_id === student.student_id
            )?.status || 'Present';
            
            return (
              <div 
                key={student.student_id} 
                className={combine(
                  "border rounded-xl p-3 sm:p-4 transition-all hover:shadow-lg",
                  getStatusColor(currentStatus).replace('text', 'border')
                )}
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div>
                    <div className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>{studentName}</div>
                    <div className={combine("text-xs", get('text', 'tertiary'))}>ID: {student.student_id}</div>
                  </div>
                  <span className={getStatusBadgeClass(currentStatus)}>
                    {currentStatus.charAt(0)}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-1 sm:gap-2">
                  {['Present', 'Absent', 'Late'].map(status => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(student.student_id, status)}
                      className={combine(
                        "py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all",
                        currentStatus === status 
                          ? getStatusColor(status)
                          : combine(
                              get('bg', 'secondary'),
                              get('text', 'secondary'),
                              'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
                            )
                      )}
                    >
                      {status.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-4 sm:pt-6 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
          <button
            onClick={() => setViewMode('dashboard')}
            className={getSecondaryButtonClass()}
          >
            <span className="text-xs sm:text-sm">Cancel</span>
          </button>
          <button
            onClick={() => {
              const allPresent = markingData.students.map((student: Student) => ({
                student_id: student.student_id,
                status: 'Present'
              }));
              setAttendanceList(allPresent);
              toastSuccess('All students marked as Present');
            }}
            className={combine(
              getSecondaryButtonClass(),
              "border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
            )}
          >
            <span className="text-xs sm:text-sm">Mark All Present</span>
          </button>
          <button
            onClick={handleSubmitAttendance}
            className={getPrimaryButtonClass()}
          >
            <span className="text-xs sm:text-sm">Submit Attendance</span>
          </button>
        </div>
      </div>
    );
  };

  const renderHistoryView = () => {
    if (loadingHistory) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!studentHistory) return null;

    const academicMonths = generateAcademicMonths(studentHistory.year || '2025-2026');
    
    let totalDays = 0;
    const present = studentHistory.annual_summary?.present || 0;
    const absent = studentHistory.annual_summary?.absent || 0;
    const late = studentHistory.annual_summary?.late || 0;
    
    if (studentHistory.calendar_data) {
      Object.values(studentHistory.calendar_data).forEach((monthData: any) => {
        if (monthData.dates && Array.isArray(monthData.dates)) {
          totalDays += monthData.dates.length;
        }
      });
    }
    
    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
    const presentPercentage = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0;
    const absentPercentage = totalDays > 0 ? Math.round((absent / totalDays) * 100) : 0;
    const latePercentage = totalDays > 0 ? Math.round((late / totalDays) * 100) : 0;

    return (
      <div className={combine(
        "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border",
        get('bg', 'card'),
        get('border', 'primary')
      )}>
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className={combine("text-xl sm:text-2xl font-bold", get('text', 'primary'))}>
              Attendance History - {selectedStudent}
            </h2>
            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
              {studentHistory.student_id} • Academic Year: {studentHistory.year}
            </p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4">
            <div className="flex w-full sm:w-auto p-1 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
              <button
                onClick={() => setHistoryViewMode('chart')}
                className={combine(
                  "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm",
                  historyViewMode === 'chart' 
                    ? combine(get('bg', 'card'), 'shadow-sm', get('accent', 'primary'))
                    : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
                )}
              >
                <MdOutlineBarChart className="text-sm sm:text-base" />
                <span className="hidden sm:inline">Chart</span>
              </button>
              <button
                onClick={() => setHistoryViewMode('calendar')}
                className={combine(
                  "flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm",
                  historyViewMode === 'calendar' 
                    ? combine(get('bg', 'card'), 'shadow-sm', get('accent', 'primary'))
                    : combine(get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]')
                )}
              >
                <FaCalendarAlt className="text-sm sm:text-base" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:flex-none">
                <input
                  type="text"
                  value={studentHistory.year}
                  readOnly
                  className={combine(getInputClass(), "w-full sm:w-32 cursor-not-allowed")}
                />
              </div>
              <button
                onClick={() => setViewMode('dashboard')}
                className={combine(getSecondaryButtonClass(), "w-full sm:w-auto justify-center")}
              >
                <span className="text-xs sm:text-sm">← Back</span>
              </button>
            </div>
          </div>
        </div>

        {historyViewMode === 'chart' && (
          <>
            <div className={combine(
              "rounded-xl p-4 sm:p-6 mb-6 sm:mb-8",
              get('bg', 'secondary')
            )}>
              <h3 className={combine("text-sm sm:text-base font-bold mb-3 sm:mb-4", get('text', 'primary'))}>
                Academic Year Performance Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg border",
                  theme === 'dark' ? 'bg-green-900/20 border-green-800/60 text-green-200' : 'bg-green-50 border-green-200 text-green-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{present}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Days Present</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{presentPercentage}%</div>
                </div>
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg border",
                  theme === 'dark' ? 'bg-red-900/20 border-red-800/60 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{absent}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Days Absent</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{absentPercentage}%</div>
                </div>
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg border",
                  theme === 'dark' ? 'bg-yellow-900/20 border-yellow-800/60 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{late}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Days Late</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{latePercentage}%</div>
                </div>
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg border",
                  theme === 'dark' ? 'bg-blue-900/20 border-blue-800/60 text-blue-200' : 'bg-blue-50 border-blue-200 text-blue-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{attendanceRate}%</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Attendance Rate</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{totalDays} total days</div>
                </div>
              </div>
            </div>

            <div className={combine(
              "rounded-xl p-4 sm:p-6 mb-6 sm:mb-8",
              get('bg', 'secondary')
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>
                  Monthly Attendance Trend (Academic Year {studentHistory.year})
                </h3>
                <button
                  onClick={() => renderAttendanceChart()}
                  className={combine(
                    "text-xs sm:text-sm flex items-center gap-1",
                    get('accent', 'primary'),
                    "hover:underline"
                  )}
                >
                  <FaChartPie className="text-xs sm:text-sm" />
                  Refresh Chart
                </button>
              </div>
              <div className={combine(
                "rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg",
                get('bg', 'card'),
                get('border', 'primary')
              )}>
                <div className="h-80 sm:h-96">
                  <div className="relative h-full w-full">
                    <canvas id="overallAttendanceChart"></canvas>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {historyViewMode === 'calendar' && (
          <div className="space-y-6 sm:space-y-8">
            <div className={combine(
              "rounded-xl p-4 sm:p-6",
              get('bg', 'secondary')
            )}>
              <h3 className={combine("text-sm sm:text-base font-bold mb-2", get('text', 'primary'))}>
                Monthly Calendar View - Academic Year {studentHistory.year}
              </h3>
              <p className={combine("text-xs mb-4", get('text', 'secondary'))}>
                Visualize attendance patterns across months with data
              </p>
              
              <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg text-center border",
                  theme === 'dark' ? 'bg-green-900/20 border-green-800/60 text-green-200' : 'bg-green-50 border-green-200 text-green-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{present}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Present</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{presentPercentage}%</div>
                </div>
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg text-center border",
                  theme === 'dark' ? 'bg-red-900/20 border-red-800/60 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{absent}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Absent</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{absentPercentage}%</div>
                </div>
                <div className={combine(
                  "p-3 sm:p-4 rounded-lg text-center border",
                  theme === 'dark' ? 'bg-yellow-900/20 border-yellow-800/60 text-yellow-200' : 'bg-yellow-50 border-yellow-200 text-yellow-700'
                )}>
                  <div className="text-lg sm:text-2xl font-bold">{late}</div>
                  <div className={combine("text-xs", get('text', 'secondary'))}>Late</div>
                  <div className={combine("text-xs", get('text', 'tertiary'))}>{latePercentage}%</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-green-100 border border-green-300"></div>
                  <span className={combine("text-xs", get('text', 'secondary'))}>Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-red-100 border border-red-300"></div>
                  <span className={combine("text-xs", get('text', 'secondary'))}>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-yellow-100 border border-yellow-300"></div>
                  <span className={combine("text-xs", get('text', 'secondary'))}>Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded bg-gray-100 border border-gray-300"></div>
                  <span className={combine("text-xs", get('text', 'secondary'))}>No Data</span>
                </div>
              </div>
            </div>

            {Object.keys(studentHistory.calendar_data || {}).length === 0 ? (
              <div className={combine("text-center py-12 rounded-xl", get('bg', 'secondary'))}>
                <FaCalendarAlt className={combine("text-3xl sm:text-4xl mx-auto mb-4", get('text', 'tertiary'))} />
                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                  No calendar data available for the academic year {studentHistory.year}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6">
                {(() => {
                  const monthsWithData = Object.entries(studentHistory.calendar_data || {});
                  const [startYear, endYear] = studentHistory.year.split('-').map(y => parseInt(y));
                  
                  const sortedMonths = monthsWithData.sort(([monthNumA], [monthNumB]) => {
                    const numA = parseInt(monthNumA);
                    const numB = parseInt(monthNumB);
                    
                    if ((numA >= 6 && numB >= 6) || (numA <= 5 && numB <= 5)) {
                      return numA - numB;
                    }
                    
                    if (numA >= 6 && numB <= 5) {
                      return -1;
                    }
                    
                    return 1;
                  });
                  
                  return sortedMonths.map(([monthNum, monthData]: [string, any]) => {
                    const monthNumber = parseInt(monthNum);
                    const { year, monthName } = getAcademicMonthMeta(studentHistory.year, monthNumber);
                    
                    const monthTotalDays = monthData.dates?.length || 0;
                    const monthPresent = monthData.stats?.present || 0;
                    const monthAbsent = monthData.stats?.absent || 0;
                    const monthLate = monthData.stats?.late || 0;
                    const calendarCells = buildStudentHistoryCalendarCells(studentHistory.year, monthNumber, monthData);
                    
                    return (
                      <div key={`${monthName}-${year}`} className={combine(
                        "border rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow",
                        get('bg', 'card'),
                        get('border', 'primary')
                      )}>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>
                            {monthName} {year}
                          </h4>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>
                            {monthPresent}P / {monthAbsent}A / {monthLate}L
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-3">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                            <div key={`${day}-${index}`} className={combine("text-center text-xs font-medium", get('text', 'tertiary'))}>{day}</div>
                          ))}
                          
                          {calendarCells.map((cell, index) => {
                            if (cell.type === 'empty') {
                              return <div key={`empty-${monthNumber}-${index}`} className="h-6 sm:h-8"></div>;
                            }

                            const { day, dayData } = cell;
                            return (
                                <div
                                  key={`${monthNumber}-${day}`}
                                  className={combine(
                                    "h-6 sm:h-8 rounded flex items-center justify-center text-xs font-medium cursor-help",
                                    dayData 
                                      ? dayData.status === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                        dayData.status === 'Absent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        dayData.status === 'Late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                                      : theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                                  )}
                                  title={dayData ? `${day}: ${dayData.status_display}` : `${day}: No attendance record`}
                                >
                                  {day}
                                </div>
                              );
                          })}
                        </div>
                        
                        <div className="pt-2 sm:pt-3 border-t" style={{ borderColor: 'var(--color-border-secondary)' }}>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className={get('text', 'secondary')}>Present: {monthPresent}</span>
                              </div>
                              <div className={get('text', 'tertiary')}>
                                {monthTotalDays > 0 ? Math.round((monthPresent / monthTotalDays) * 100) : 0}%
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className={get('text', 'secondary')}>Absent: {monthAbsent}</span>
                              </div>
                              <div className={get('text', 'tertiary')}>
                                {monthTotalDays > 0 ? Math.round((monthAbsent / monthTotalDays) * 100) : 0}%
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                                <span className={get('text', 'secondary')}>Late: {monthLate}</span>
                              </div>
                              <div className={get('text', 'tertiary')}>
                                {monthTotalDays > 0 ? Math.round((monthLate / monthTotalDays) * 100) : 0}%
                              </div>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className={get('text', 'secondary')}>Total days:</span>
                              <span className={get('text', 'primary')}>{monthTotalDays}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
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
                  <FaUserGraduate className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Teacher Attendance Portal</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <MdOutlineDashboard className="text-xs sm:text-sm" />
                    Manage, track, and analyze student attendance
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                {viewMode === 'mark' && (
                  <button
                    onClick={() => setViewMode('dashboard')}
                    className={combine(getSecondaryButtonClass(), "justify-center w-full sm:w-auto")}
                  >
                    <span className="text-xs sm:text-sm">← Back</span>
                  </button>
                )}

                <div className="relative w-full sm:w-auto">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className={combine(getInputClass(), "pr-10")}
                  />
                  <FiCalendar className={combine(
                    "absolute right-3 top-1/2 transform -translate-y-1/2 text-sm pointer-events-none",
                    get('text', 'tertiary')
                  )} />
                </div>
                
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Class</div>
                  <div className="text-sm sm:text-base font-bold">
                    {attendanceData ? `${attendanceData.class}-${attendanceData.section}` : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {viewMode === 'dashboard' && renderDashboard()}
        {viewMode === 'mark' && renderMarkingView()}
        {viewMode === 'history' && renderHistoryView()}

        {renderProfileModal()}

        {error && (
          <div className="fixed bottom-4 right-4 z-50 max-w-md">
            <div className={combine(
              "rounded-xl shadow-lg p-4 border",
              theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'
            )}>
              <div className="flex items-center gap-3">
                <FaTimesCircle className={combine("text-lg sm:text-xl", theme === 'dark' ? 'text-red-400' : 'text-red-600')} />
                <div>
                  <p className={combine("text-xs sm:text-sm font-medium", theme === 'dark' ? 'text-red-300' : 'text-red-800')}>Error</p>
                  <p className={combine("text-xs", theme === 'dark' ? 'text-red-400' : 'text-red-600')}>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
