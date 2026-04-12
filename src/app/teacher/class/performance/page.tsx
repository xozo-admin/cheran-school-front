// app/teacher/class/performance/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  FaChartLine,
  FaUserGraduate,
  FaSearch,
  FaFilter,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaCalendarAlt,
  FaBook,
  FaUsers,
  FaClipboardList,
  FaEye,
  FaGraduationCap,
  FaBookReader,
  FaChartArea,
  FaPercentage,
  FaCheckCircle,
  FaExclamationCircle,
  FaTrophy,
  FaSortAmountDown,
  FaSortAmountUp
  ,FaChartBar
} from 'react-icons/fa';
import { MdSubject } from 'react-icons/md';
import { FiTrendingUp } from 'react-icons/fi';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';
import { teacherApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// Types
interface TeacherProfile {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  qualification: string;
  department: string;
  address: string;
  user: number;
  assigned_class: string;
  section_name: string;
  class_name: string;
}

interface ExamDropdownItem {
  id: number;
  name: string;
  term: number;
  term_name: string;
  max_marks: string;
  rank: number;
}

interface Student {
  student_id: string;
  student_name: string;
  roll_no?: number;
  class_name?: string;
  section?: string;
}

interface ClassResult {
  student_id: string;
  name: string;
  summative_total: number;
  overall_grade: string;
}

interface ClassResultResponse {
  status: number;
  class: string;
  exam: string;
  analytics: {
    total_students: number;
    total_pass: number;
    grade_breakdown: Record<string, number>;
  };
  data: ClassResult[];
}

export default function ClassPerformanceDashboard() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');
  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine('rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300', get('border', 'primary'));
    if (color === 'emerald') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    if (color === 'amber') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    if (color === 'indigo') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
  };
  const getSoftCardClass = () => combine(
    'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-colors duration-200',
    get('bg', 'secondary'),
    get('border', 'secondary')
  );
  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );
  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );
  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)]'
  );
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<'overview' | 'results'>('overview');
  
  // Teacher and class info
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [className, setClassName] = useState<string>('');
  const [section, setSection] = useState<string>('');
  
  // Exam filters
  const [exams, setExams] = useState<ExamDropdownItem[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  
  // Student data
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [selectedStudentName, setSelectedStudentName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Behaviour trend (class teacher)
  const [behaviorTrend, setBehaviorTrend] = useState<Array<{ exam: string; value: number; change_percentage: number; trend: string }>>([]);
  const [behaviorLoading, setBehaviorLoading] = useState(false);
  const [behaviorError, setBehaviorError] = useState('');
  const [marksTrend, setMarksTrend] = useState<Array<{ exam: string; value: number; change_percentage: number; trend: string }>>([]);
  const [marksTrendLoading, setMarksTrendLoading] = useState(false);
  const [marksTrendError, setMarksTrendError] = useState('');
  const [examMarksBreakdown, setExamMarksBreakdown] = useState<Array<{ subject: string; mark: number; max_mark: number; grade: string }>>([]);
  const [examMarksLoading, setExamMarksLoading] = useState(false);
  const [examMarksError, setExamMarksError] = useState('');
  const [examBehaviourBreakdown, setExamBehaviourBreakdown] = useState<Array<{ subject: string; aggregated_score: number; max_score: number }>>([]);
  const [examBehaviourLoading, setExamBehaviourLoading] = useState(false);
  const [examBehaviourError, setExamBehaviourError] = useState('');
  const [dashboardOverview, setDashboardOverview] = useState<any>(null);
  const [dashboardOverviewError, setDashboardOverviewError] = useState('');
  const [reportDashboard, setReportDashboard] = useState<any>(null);
  const [reportDashboardError, setReportDashboardError] = useState('');
  const [behaviorDistribution, setBehaviorDistribution] = useState<Record<string, number> | null>(null);
  const [behaviorDistributionLoading, setBehaviorDistributionLoading] = useState(false);
  const [behaviorDistributionError, setBehaviorDistributionError] = useState('');
  
  // Class results
  const [classResults, setClassResults] = useState<ClassResultResponse | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: keyof ClassResult; direction: 'asc' | 'desc'}>({
    key: 'summative_total',
    direction: 'desc'
  });

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

  // Fetch teacher profile first
  useEffect(() => {
    fetchTeacherProfile();
  }, []);

  // Fetch teacher profile to get class info
  const fetchTeacherProfile = async () => {
    try {
      const response = await teacherApi.profile.get();
      const data = response.data?.data || response.data;
      if (data) {
          setTeacherProfile(data);
          const assignedClass = data.assigned_class && data.assigned_class !== 'Not Assigned';
          if (!assignedClass || !data.class_name || !data.section_name) {
            setError('You are not assigned as a Class Teacher for the current session.');
            setLoading(false);
            return;
          }
          setClassName(data.class_name);
          setSection(data.section_name);
          
          // Once we have class info, fetch exams and students
          fetchExamList();
          fetchStudentList(data.class_name, data.section_name);
          fetchDashboardOverview();
      }
    } catch (err: any) {
      setError(extractApiError(err, 'Failed to fetch teacher profile'));
      setLoading(false);
    }
  };

  // Fetch exam list for dropdown
  const fetchExamList = async () => {
    try {
      const response = await teacherApi.exams.list();
      const data = response.data?.data || response.data || [];
      if (Array.isArray(data)) {
        setExams(data);
        
        // Extract unique terms from exams
        const terms:any = [...new Set(data.map((exam: ExamDropdownItem) => exam.term_name))];
        setAvailableTerms(terms);
      }
    } catch (err: any) {
      console.error('Error fetching exam list:', err);
      setError(extractApiError(err, 'Failed to fetch exam list'));
    }
  };

  // Fetch student list for the class
  const fetchStudentList = async (className: string, section: string) => {
    try {
      const response = await teacherApi.studentPortal.list({ class: className, section });
      const data = response.data?.data || response.data || {};
      const list = data.students && Array.isArray(data.students)
        ? data.students
        : Array.isArray(data)
          ? data
          : [];
      if (list.length > 0) {
          setStudents(list);
          if (list.length > 0) {
            const firstStudent = list[0];
            setSelectedStudent(firstStudent.student_id);
            setSelectedStudentName(firstStudent.student_name);
          }
      } else {
        setStudents([]);
      }
    } catch (err: any) {
      console.error('Error fetching student list:', err);
      setError(extractApiError(err, 'Failed to fetch student list'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch class results when exam and term are selected
  const fetchClassResults = async () => {
    if (!selectedExam || !selectedTerm || !className || !section) return;
    
    try {
      const response = await teacherApi.exams.classResult({
        class: className,
        section,
        exam_type: selectedExam,
        term: selectedTerm,
      });
      const data = response.data;
      setClassResults(data);
      setView('results');
    } catch (err: any) {
      console.error('Error fetching class results:', err);
      setError(extractApiError(err, 'Failed to fetch class results'));
    }
  };

  const fetchDashboardOverview = async () => {
    try {
      setDashboardOverviewError('');
      const response = await teacherApi.request('performance/teacher/dashboard/overview/');
      setDashboardOverview(response.data?.data || response.data);
    } catch (err: any) {
      setDashboardOverviewError(extractApiError(err, 'Failed to load dashboard overview'));
    }
  };

  const fetchReportDashboard = async () => {
    if (!selectedExam) return;
    try {
      setReportDashboardError('');
      const response = await teacherApi.request('reports/dashboard/', {
        params: { exam_type: selectedExam, ...(selectedTerm ? { term: selectedTerm } : {}) },
      });
      setReportDashboard(response.data?.data || response.data);
    } catch (err: any) {
      setReportDashboardError(extractApiError(err, 'Failed to load report dashboard'));
      setReportDashboard(null);
    }
  };

  const fetchBehaviorDistribution = async () => {
    if (!selectedTerm) {
      setBehaviorDistribution(null);
      return;
    }
    try {
      setBehaviorDistributionLoading(true);
      setBehaviorDistributionError('');
      const response = await teacherApi.request('reports/behavior-dashboard/', {
        params: { term: selectedTerm },
      });
      const payload = response.data?.data || response.data;
      setBehaviorDistribution(payload?.behavior_distribution || null);
    } catch (err: any) {
      setBehaviorDistributionError(extractApiError(err, 'Failed to load behaviour distribution'));
      setBehaviorDistribution(null);
    } finally {
      setBehaviorDistributionLoading(false);
    }
  };

  const fetchMarksTrend = async (studentId: string) => {
    if (!studentId) return;
    try {
      setMarksTrendLoading(true);
      setMarksTrendError('');
      const response = await teacherApi.request('performance/class/marks/', {
        params: { student_id: studentId, ...(selectedTerm ? { term: selectedTerm } : {}) },
      });
      const payload = response.data?.data || response.data;
      setMarksTrend(payload?.graph_data || []);
    } catch (err: any) {
      setMarksTrendError(extractApiError(err, 'Failed to load marks trend'));
      setMarksTrend([]);
    } finally {
      setMarksTrendLoading(false);
    }
  };

  const fetchExamMarksBreakdown = async () => {
    if (!selectedStudent || !selectedExam) return;
    try {
      setExamMarksLoading(true);
      setExamMarksError('');
      const response = await teacherApi.request('performance/class/exam/marks/', {
        params: { student_id: selectedStudent, exam_type: selectedExam, ...(selectedTerm ? { term: selectedTerm } : {}) },
      });
      const payload = response.data?.data || response.data;
      setExamMarksBreakdown(payload?.breakdown || []);
    } catch (err: any) {
      setExamMarksError(extractApiError(err, 'Failed to load exam marks breakdown'));
      setExamMarksBreakdown([]);
    } finally {
      setExamMarksLoading(false);
    }
  };

  const fetchExamBehaviourBreakdown = async () => {
    if (!selectedStudent || !selectedTerm) return;
    try {
      setExamBehaviourLoading(true);
      setExamBehaviourError('');
      const response = await teacherApi.request('performance/class/exam/behaviour/', {
        params: { student_id: selectedStudent, term: selectedTerm },
      });
      const payload = response.data?.data || response.data;
      setExamBehaviourBreakdown(payload?.breakdown || []);
    } catch (err: any) {
      setExamBehaviourError(extractApiError(err, 'Failed to load exam behaviour breakdown'));
      setExamBehaviourBreakdown([]);
    } finally {
      setExamBehaviourLoading(false);
    }
  };

  const fetchBehaviorTrend = async (studentId: string) => {
    if (!studentId) return;
    try {
      setBehaviorLoading(true);
      setBehaviorError('');
      const response = await teacherApi.request('performance/class/behaviour/', {
        params: { student_id: studentId },
      });
      const payload = response.data?.data || response.data;
      setBehaviorTrend(payload?.graph_data || []);
    } catch (err: any) {
      console.error('Error fetching behavior trend:', err);
      setBehaviorError(extractApiError(err, 'Failed to fetch behaviour report'));
      setBehaviorTrend([]);
    } finally {
      setBehaviorLoading(false);
    }
  };

  // Handle student selection
  const handleStudentSelect = (studentId: string, studentName: string) => {
    setSelectedStudent(studentId);
    setSelectedStudentName(studentName);
  };

  // Handle exam selection
  const handleExamSelect = (examName: string) => {
    setSelectedExam(examName);
  };

  // Handle term selection
  const handleTermSelect = (term: string) => {
    setSelectedTerm(term);
    setSelectedExam('');
  };

  // Handle sort
  const handleSort = (key: keyof ClassResult) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const getExamTypesForSelection = () => {
    if (!selectedTerm) return [];
    const types = new Set<string>();
    exams.forEach((exam) => {
      if (exam.term_name !== selectedTerm) return;
      if (exam.name) types.add(exam.name);
    });
    return Array.from(types).sort();
  };

  // Sort class results
  const sortedResults = classResults?.data ? [...classResults.data].sort((a, b) => {
    if (sortConfig.key === 'name') {
      return sortConfig.direction === 'asc' 
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    } else if (sortConfig.key === 'summative_total') {
      return sortConfig.direction === 'asc'
        ? a.summative_total - b.summative_total
        : b.summative_total - a.summative_total;
    } else if (sortConfig.key === 'overall_grade') {
      return sortConfig.direction === 'asc'
        ? a.overall_grade.localeCompare(b.overall_grade)
        : b.overall_grade.localeCompare(a.overall_grade);
    }
    return 0;
  }) : [];

  // Get grade color
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-gradient-to-r from-green-500 to-emerald-600';
      case 'A': return 'bg-gradient-to-r from-blue-500 to-blue-600';
      case 'B': return 'bg-gradient-to-r from-purple-500 to-purple-600';
      case 'C': return 'bg-gradient-to-r from-yellow-500 to-yellow-600';
      case 'D': return 'bg-gradient-to-r from-red-500 to-red-600';
      case 'E': return 'bg-gradient-to-r from-red-600 to-red-700';
      case 'F': return 'bg-gradient-to-r from-gray-500 to-gray-600';
      default: return 'bg-gradient-to-r from-gray-400 to-gray-500';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increase') {
      return <FaArrowUp className={theme === 'dark' ? 'text-emerald-300' : 'text-green-600'} />;
    }
    if (trend === 'decrease') {
      return <FaArrowDown className={theme === 'dark' ? 'text-red-300' : 'text-red-600'} />;
    }
    return <FaMinus className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} />;
  };

  const behaviorChartData = behaviorTrend.map((item) => ({
    name: item.exam,
    value: item.value,
  }));

  const marksTrendChartData = marksTrend.map((item) => ({
    name: item.exam,
    value: item.value,
  }));

  const gradeChartData = reportDashboard?.class_stats
    ? Object.entries(reportDashboard.class_stats)
        .filter(([grade]) => ['S', 'A', 'B', 'C', 'D', 'E', 'F'].includes(grade))
        .map(([grade, count]) => ({ grade, count: Number(count) }))
    : classResults
      ? Object.entries(classResults.analytics.grade_breakdown)
          .filter(([grade]) => grade !== 'N/A')
          .map(([grade, count]) => ({ grade, count }))
      : [];

  const behaviorDistributionChartData = behaviorDistribution
    ? Object.entries(behaviorDistribution).map(([label, count]) => ({ label, count }))
    : [];

  const examMarksChartData = examMarksBreakdown.map((item) => ({
    subject: item.subject,
    value: item.mark,
    max: item.max_mark,
  }));

  const examBehaviourChartData = examBehaviourBreakdown.map((item) => ({
    subject: item.subject,
    value: item.aggregated_score,
  }));

  useEffect(() => {
    if (selectedStudent && className && section) {
      fetchBehaviorTrend(selectedStudent);
      fetchMarksTrend(selectedStudent);
    }
  }, [selectedStudent, className, section]);

  useEffect(() => {
    fetchBehaviorDistribution();
    if (selectedStudent) {
      fetchMarksTrend(selectedStudent);
      fetchExamBehaviourBreakdown();
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (selectedExam) {
      fetchReportDashboard();
      fetchExamMarksBreakdown();
    } else {
      setReportDashboard(null);
    }
  }, [selectedExam]);

  useEffect(() => {
    if (selectedExam) {
      fetchReportDashboard();
      fetchExamMarksBreakdown();
    }
  }, [selectedTerm]);

  useEffect(() => {
    if (selectedStudent && selectedExam) {
      fetchExamMarksBreakdown();
    }
  }, [selectedStudent, selectedExam]);

  // Render loading state
  if (loading) {
    return (
      <div className={combine('flex flex-col items-center justify-center min-h-screen', getBgClass())}>
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
        <p className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>Loading Performance Dashboard...</p>
        <p className={combine('text-xs sm:text-sm mt-2', get('text', 'secondary'))}>Fetching teacher and class information</p>
      </div>
    );
  }

  if (error && !className && !section) {
    return (
      <div className={combine('flex flex-col items-center justify-center min-h-screen px-4 text-center', getBgClass())}>
        <div className={combine('p-4 rounded-full mb-4', theme === 'dark' ? 'bg-red-900/20' : 'bg-red-100')}>
          <FaExclamationCircle className={combine('text-3xl', theme === 'dark' ? 'text-red-200' : 'text-red-600')} />
        </div>
        <p className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Access Restricted</p>
        <p className={combine('text-xs sm:text-sm mt-2 max-w-lg', get('text', 'secondary'))}>{error}</p>
      </div>
    );
  }

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaChartLine className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Class Performance</h1>
                  <p className="text-xs sm:text-sm text-blue-100">View and analyze exam results for your class</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm text-xs sm:text-sm text-blue-100">
                  <FaGraduationCap />
                  <span className="truncate">Class {className}-{section}</span>
                </span>
                <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm text-xs sm:text-sm text-blue-100">
                  <FaBook />
                  {exams.length} Exams
                </span>
                
              </div>
            </div>
          </div>

          {/* Filters under header */}
          <div className={combine(getCardGradientClass('blue'), 'mb-6')}>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h3 className={combine('text-base sm:text-lg font-semibold flex items-center gap-2', get('text', 'primary'))}>
                <FaUserGraduate className={combine(theme === 'dark' ? 'text-blue-200' : 'text-blue-600')} />
                Filters
              </h3>
              <span className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Class {className}-{section}</span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div>
                <label className={combine('block text-[11px] sm:text-xs font-medium mb-2', get('text', 'secondary'))}>Term</label>
                <select
                  value={selectedTerm}
                  onChange={(e) => handleTermSelect(e.target.value)}
                  className={getInputClass()}
                >
                  <option value="">Select Term</option>
                  {availableTerms.map((term, index) => (
                    <option key={index} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine('block text-[11px] sm:text-xs font-medium mb-2', get('text', 'secondary'))}>Exam Type</label>
                <select
                  value={selectedExam}
                  onChange={(e) => handleExamSelect(e.target.value)}
                  disabled={!selectedTerm}
                  className={getInputClass()}
                >
                  <option value="">Select Exam Type</option>
                  {getExamTypesForSelection().map((examType) => (
                    <option key={examType} value={examType}>
                      {examType}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine('block text-[11px] sm:text-xs font-medium mb-2', get('text', 'secondary'))}>Select Student</label>
                <select
                  value={selectedStudent}
                  onChange={(e) => {
                    const next = e.target.value;
                    const match = students.find((student) => student.student_id === next);
                    setSelectedStudent(next);
                    setSelectedStudentName(match?.student_name || '');
                  }}
                  className={getInputClass()}
                >
                  <option value="">Select Student</option>
                  {students.map((student) => (
                    <option key={student.student_id} value={student.student_id}>
                      {student.student_name} ({student.student_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchClassResults}
                  disabled={!selectedExam || !selectedTerm}
                  className={combine(
                    'w-full flex items-center justify-center gap-2',
                    selectedExam && selectedTerm
                      ? getPrimaryButtonClass()
                      : combine('px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl cursor-not-allowed text-xs sm:text-sm', get('bg', 'secondary'), get('text', 'muted'))
                  )}
                >
                  <FaChartArea />
                  View Results
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="flex flex-col gap-6">
          {/* Main Content */}
          <div className="w-full">
            {/* View Toggle */}
            <div className={combine(getSoftCardClass(), 'mb-6')}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setView('overview')}
                  className={combine(
                    'px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium flex items-center gap-2 transition-all text-xs sm:text-sm',
                    view === 'overview'
                      ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                      : combine(get('bg', 'card'), get('text', 'secondary'))
                  )}
                >
                  <FaChartArea />
                  Student Report
                </button>
                <button
                  onClick={() => setView('results')}
                  className={combine(
                    'px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium flex items-center gap-2 transition-all text-xs sm:text-sm',
                    view === 'results'
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                      : combine(get('bg', 'card'), get('text', 'secondary'))
                  )}
                >
                  <FiTrendingUp />
                  Exam Results
                </button>
              </div>
            </div>
            
            {/* Selected Student Info */}
            {selectedStudent && view === 'overview' && (
              <div className={combine(getSoftCardClass(), 'mb-6')}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={combine(
                      'w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg',
                      theme === 'dark' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                    )}>
                      {selectedStudentName?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <h2 className={combine('text-lg sm:text-2xl font-bold', get('text', 'primary'))}>{selectedStudentName}</h2>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Student ID: {selectedStudent}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={combine('text-xs sm:text-sm', get('text', 'muted'))}>Selected Student</div>
                    <div className={combine('text-sm sm:text-lg font-bold', get('text', 'primary'))}>{selectedStudentName}</div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Content based on view */}
            {view === 'overview' && (
              <div className="space-y-6">
                

                

                {/* Behaviour Report */}
                <div className={getCardGradientClass('emerald')}>
                  <h3 className={combine('text-base sm:text-lg font-semibold mb-6 flex items-center gap-2', get('text', 'primary'))}>
                    <FaBookReader className={combine(theme === 'dark' ? 'text-purple-200' : 'text-purple-600')} />
                    Behaviour Report
                  </h3>
                  <p className={combine('text-xs sm:text-sm mb-4', get('text', 'muted'))}>
                    Behaviour trend for your assigned class student across terms.
                  </p>

                  {!selectedStudent && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>
                      <FaUserGraduate className={combine('text-3xl sm:text-4xl mx-auto mb-3', get('text', 'muted'))} />
                      <p>Select a student to view behaviour trend.</p>
                    </div>
                  )}

                  {selectedStudent && behaviorLoading && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent mx-auto mb-3"></div>
                      <p>Loading behaviour report...</p>
                    </div>
                  )}

                  {selectedStudent && !behaviorLoading && behaviorError && (
                    <div className={combine(
                      'rounded-xl border p-4',
                      theme === 'dark' ? 'bg-red-900/30 text-red-200 border-red-800' : 'bg-red-50 text-red-700 border-red-200'
                    )}>
                      {behaviorError}
                    </div>
                  )}

                  {selectedStudent && !behaviorLoading && !behaviorError && (
                    <div className="space-y-3">
                      {behaviorTrend.length === 0 ? (
                        <div className={combine('text-center py-6', get('text', 'muted'))}>
                          <FaExclamationCircle className={combine('text-3xl mx-auto mb-3', get('text', 'muted'))} />
                          <p>No behaviour data found for this student.</p>
                        </div>
                      ) : (
                        <>
                          <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5', get('border', 'secondary'))}>
                            <div className="h-52 sm:h-60">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={behaviorChartData}>
                                  <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                                  <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} domain={[0, 5]} />
                                  <Tooltip
                                    contentStyle={{
                                      background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                      border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                      color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                      fontSize: '12px',
                                    }}
                                    itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                                    labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                                  />
                                  <Line type="monotone" dataKey="value" stroke={theme === 'dark' ? '#93C5FD' : '#2563EB'} strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                          {behaviorTrend.map((item) => (
                            <div key={item.exam} className={combine(
                              'flex items-center justify-between gap-4 p-3 rounded-xl border',
                              get('bg', 'secondary'),
                              get('border', 'secondary')
                            )}>
                              <div className="min-w-0">
                                <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{item.exam}</div>
                                <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Average Score</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>{item.value}</div>
                                <div className={combine('flex items-center gap-1 text-[11px] sm:text-xs', get('text', 'secondary'))}>
                                  {getTrendIcon(item.trend)}
                                  {item.change_percentage ? `${Math.abs(item.change_percentage)}%` : '0%'}
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Marks Trend */}
                <div className={getCardGradientClass('blue')}>
                  <h3 className={combine('text-base sm:text-lg font-semibold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                    <FaChartLine className={combine(theme === 'dark' ? 'text-blue-200' : 'text-blue-600')} />
                    Marks Trend (Aggregate)
                  </h3>

                  {marksTrendLoading && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>Loading marks trend...</div>
                  )}
                  {marksTrendError && (
                    <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'), get('text', 'muted'))}>
                      {marksTrendError}
                    </div>
                  )}
                  {!marksTrendLoading && !marksTrendError && marksTrendChartData.length === 0 && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>
                      Select a student to view marks trend.
                    </div>
                  )}

                  {marksTrendChartData.length > 0 && (
                    <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5', get('border', 'secondary'))}>
                      <div className="h-52 sm:h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={marksTrendChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                            <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                            <Tooltip
                              contentStyle={{
                                background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                fontSize: '12px',
                              }}
                              itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                              labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                            />
                            <Line type="monotone" dataKey="value" stroke={theme === 'dark' ? '#93C5FD' : '#2563EB'} strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Behaviour Distribution */}
                <div className={getCardGradientClass('blue')}>
                  <h3 className={combine('text-base sm:text-lg font-semibold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                    <FaChartBar className={combine(theme === 'dark' ? 'text-blue-200' : 'text-blue-600')} />
                    Behaviour Distribution {selectedTerm ? `• ${selectedTerm}` : ''}
                  </h3>

                  {behaviorDistributionLoading && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>Loading behaviour distribution...</div>
                  )}
                  {behaviorDistributionError && (
                    <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'), get('text', 'muted'))}>
                      {behaviorDistributionError}
                    </div>
                  )}
                  {!behaviorDistributionLoading && !behaviorDistributionError && behaviorDistributionChartData.length === 0 && (
                    <div className={combine('text-center py-6', get('text', 'muted'))}>
                      Select a term to view behaviour distribution.
                    </div>
                  )}

                  {behaviorDistributionChartData.length > 0 && (
                    <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5', get('border', 'secondary'))}>
                      <div className="h-52 sm:h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={behaviorDistributionChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                            <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                            <Tooltip
                              contentStyle={{
                                background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                fontSize: '12px',
                              }}
                              itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                              labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                            />
                            <Bar dataKey="count" fill={theme === 'dark' ? '#93C5FD' : '#2563EB'} radius={[6, 6, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
            )}
            
            {view === 'results' && classResults && (
              <div className="space-y-6">
                {/* Class Results Header */}
                <div className={getCardGradientClass('emerald')}>
                  <div className={combine(
                    'mb-6 p-4 rounded-xl border',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-emerald-900/20' : 'bg-green-50'
                  )}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className={combine('font-bold text-base sm:text-xl', get('text', 'primary'))}>{classResults.class} - {classResults.exam}</h4>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Term: {selectedTerm}</p>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                        <div className={combine(
                          'text-lg sm:text-2xl font-bold',
                          theme === 'dark' ? 'text-emerald-300' : 'text-green-600'
                        )}>
                          {classResults.analytics.total_students}
                        </div>
                        <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Students</div>
                      </div>
                      <div className="text-center">
                        <div className={combine(
                          'text-lg sm:text-2xl font-bold',
                          theme === 'dark' ? 'text-blue-300' : 'text-blue-600'
                        )}>
                          {classResults.analytics.total_pass}
                        </div>
                        <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Passed</div>
                      </div>
                      <div className="text-center">
                        <div className={combine(
                          'text-lg sm:text-2xl font-bold',
                          theme === 'dark' ? 'text-purple-300' : 'text-purple-600'
                        )}>
                          {((classResults.analytics.total_pass / classResults.analytics.total_students) * 100).toFixed(1)}%
                        </div>
                        <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Pass Rate</div>
                      </div>
                      <div className="text-center">
                        <div className={combine(
                          'text-lg sm:text-2xl font-bold',
                          theme === 'dark' ? 'text-amber-300' : 'text-yellow-600'
                        )}>
                          {classResults.data.length > 0 
                              ? Math.max(...classResults.data.map(s => s.summative_total))
                              : 0
                            }
                        </div>
                          <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>Top Score</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {reportDashboard && (
                    <div className={combine('mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3', get('text', 'secondary'))}>
                      <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'))}>
                        <div className="text-[11px] sm:text-xs">Total Pass</div>
                        <div className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                          {reportDashboard.class_stats?.Total_Pass ?? 0}
                        </div>
                      </div>
                      <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'))}>
                        <div className="text-[11px] sm:text-xs">Total Fail</div>
                        <div className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                          {reportDashboard.class_stats?.Total_Fail ?? 0}
                        </div>
                      </div>
                      <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'))}>
                        <div className="text-[11px] sm:text-xs">Exam</div>
                        <div className={combine('text-xs sm:text-sm font-semibold', get('text', 'primary'))}>
                          {reportDashboard.exam_type || '—'}
                        </div>
                      </div>
                      <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'))}>
                        <div className="text-[11px] sm:text-xs">Students</div>
                        <div className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                          {reportDashboard.students?.length ?? 0}
                        </div>
                      </div>
                    </div>
                  )}
                  {reportDashboardError && (
                    <div className={combine('mt-4 p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'), get('text', 'muted'))}>
                      {reportDashboardError}
                    </div>
                  )}
                  
                  {/* Grade Distribution */}
                  <div className="mb-8">
                    <h5 className={combine('font-medium mb-4 text-xs sm:text-sm', get('text', 'secondary'))}>Grade Distribution</h5>
                    {gradeChartData.length > 0 && (
                      <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5 mb-5', get('border', 'secondary'))}>
                        <div className="h-52 sm:h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={gradeChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                              <XAxis dataKey="grade" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                              <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                              <Tooltip
                                contentStyle={{
                                  background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                  color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                  fontSize: '12px',
                                }}
                                itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                                labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                              />
                              <Bar dataKey="count" fill={theme === 'dark' ? '#93C5FD' : '#2563EB'} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
                      {Object.entries(classResults.analytics.grade_breakdown)
                        .filter(([grade]) => grade !== 'N/A')
                        .map(([grade, count]) => (
                          <div key={grade} className="text-center">
                            <div className={combine(
                              `h-16 sm:h-20 ${getGradeColor(grade)} rounded-t-xl flex items-center justify-center text-white text-xl sm:text-2xl font-bold`,
                              theme === 'dark' ? 'opacity-90' : ''
                            )}>
                              {grade}
                            </div>
                            <div className={combine('p-2 rounded-b-xl', get('bg', 'secondary'))}>
                              <div className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>{count}</div>
                              <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>students</div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                  
                  {/* Results Table */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h5 className={combine('font-medium text-xs sm:text-sm', get('text', 'secondary'))}>Student Results</h5>
                      <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>
                        Showing {sortedResults.length} students
                      </div>
                    </div>
                    
                    <div className={combine('overflow-x-auto rounded-xl border', get('border', 'secondary'))}>
                      <table className="w-full">
                        <thead className={combine(get('bg', 'secondary'))}>
                          <tr>
                            <th 
                              className={combine('py-3 px-4 text-left font-medium cursor-pointer text-xs sm:text-sm', get('text', 'secondary'))}
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center gap-2">
                                Student Name
                                {sortConfig.key === 'name' && (
                                  sortConfig.direction === 'asc' 
                                    ? <FaSortAmountUp className={combine(get('accent', 'primary'))} />
                                    : <FaSortAmountDown className={combine(get('accent', 'primary'))} />
                                )}
                              </div>
                            </th>
                            <th 
                              className={combine('py-3 px-4 text-left font-medium cursor-pointer text-xs sm:text-sm', get('text', 'secondary'))}
                              onClick={() => handleSort('summative_total')}
                            >
                              <div className="flex items-center gap-2">
                                Total Marks
                                {sortConfig.key === 'summative_total' && (
                                  sortConfig.direction === 'asc' 
                                    ? <FaSortAmountUp className={combine(get('accent', 'primary'))} />
                                    : <FaSortAmountDown className={combine(get('accent', 'primary'))} />
                                )}
                              </div>
                            </th>
                            <th 
                              className={combine('py-3 px-4 text-left font-medium cursor-pointer text-xs sm:text-sm', get('text', 'secondary'))}
                              onClick={() => handleSort('overall_grade')}
                            >
                              <div className="flex items-center gap-2">
                                Grade
                                {sortConfig.key === 'overall_grade' && (
                                  sortConfig.direction === 'asc' 
                                    ? <FaSortAmountUp className={combine(get('accent', 'primary'))} />
                                    : <FaSortAmountDown className={combine(get('accent', 'primary'))} />
                                )}
                              </div>
                            </th>
                            
                            <th className={combine('py-3 px-4 text-left font-medium text-xs sm:text-sm', get('text', 'secondary'))}>Status</th>
                          </tr>
                        </thead>
                        <tbody className={combine('divide-y', theme === 'dark' ? 'divide-gray-800' : 'divide-gray-100')}>
                          {sortedResults.map((student, index) => (
                            <tr 
                              key={student.student_id}
                              className={`hover:bg-[var(--color-bg-hover)] ${
                                selectedStudent === student.student_id ? (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50') : ''
                              }`}
                            >
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={combine(
                                    'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold',
                                    theme === 'dark' ? 'bg-gradient-to-r from-blue-600 to-blue-700' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  )}>
                                    {student.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{student.name}</div>
                                    <div className={combine('text-[11px] sm:text-xs', get('text', 'muted'))}>{student.student_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>{student.summative_total}</div>
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium text-white ${getGradeColor(student.overall_grade)}`}>
                                  {student.overall_grade}
                                </span>
                              </td>
                             
                              <td className="py-3 px-4">
                                <span className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium ${
                                  student.overall_grade === 'F' || student.overall_grade === 'E'
                                    ? (theme === 'dark' ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800')
                                    : (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-200' : 'bg-green-100 text-green-800')
                                }`}>
                                  {student.overall_grade === 'F' || student.overall_grade === 'E' ? 'Fail' : 'Pass'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Exam Breakdowns */}
                <div className={getCardGradientClass('indigo')}>
                  <h3 className={combine('text-base sm:text-lg font-semibold mb-4 flex items-center gap-2', get('text', 'primary'))}>
                    <FaChartLine className={combine(theme === 'dark' ? 'text-blue-200' : 'text-blue-600')} />
                    Exam Breakdown (Selected Student)
                  </h3>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5', get('border', 'secondary'))}>
                      <div className={combine('text-xs sm:text-sm font-medium mb-3', get('text', 'secondary'))}>Marks by Subject</div>
                      {examMarksLoading && (
                        <div className={combine('text-center py-6', get('text', 'muted'))}>Loading exam marks breakdown...</div>
                      )}
                      {examMarksError && (
                        <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'), get('text', 'muted'))}>
                          {examMarksError}
                        </div>
                      )}
                      {!examMarksLoading && !examMarksError && examMarksChartData.length === 0 && (
                        <div className={combine('text-center py-6', get('text', 'muted'))}>
                          Select a student and exam to view marks breakdown.
                        </div>
                      )}
                      {examMarksChartData.length > 0 && (
                        <div className="h-52 sm:h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={examMarksChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                              <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                              <Tooltip
                                contentStyle={{
                                  background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                  color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                  fontSize: '12px',
                                }}
                                itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                                labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                              />
                              <Bar dataKey="value" fill={theme === 'dark' ? '#93C5FD' : '#2563EB'} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div className={combine(get('bg', 'secondary'), 'rounded-xl border p-4 sm:p-5', get('border', 'secondary'))}>
                      <div className={combine('text-xs sm:text-sm font-medium mb-3', get('text', 'secondary'))}>Behaviour by Subject</div>
                      {examBehaviourLoading && (
                        <div className={combine('text-center py-6', get('text', 'muted'))}>Loading behaviour breakdown...</div>
                      )}
                      {examBehaviourError && (
                        <div className={combine('p-3 rounded-xl border', get('border', 'secondary'), get('bg', 'secondary'), get('text', 'muted'))}>
                          {examBehaviourError}
                        </div>
                      )}
                      {!examBehaviourLoading && !examBehaviourError && examBehaviourChartData.length === 0 && (
                        <div className={combine('text-center py-6', get('text', 'muted'))}>
                          Select a student and term to view behaviour breakdown.
                        </div>
                      )}
                      {examBehaviourChartData.length > 0 && (
                        <div className="h-52 sm:h-60">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={examBehaviourChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#E5E7EB'} />
                              <XAxis dataKey="subject" tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} />
                              <YAxis tick={{ fontSize: 11, fill: theme === 'dark' ? '#E5E7EB' : '#374151' }} domain={[0, 5]} />
                              <Tooltip
                                contentStyle={{
                                  background: theme === 'dark' ? '#0F172A' : '#FFFFFF',
                                  border: theme === 'dark' ? '1px solid #334155' : '1px solid #E5E7EB',
                                  color: theme === 'dark' ? '#E5E7EB' : '#111827',
                                  fontSize: '12px',
                                }}
                                itemStyle={{ color: theme === 'dark' ? '#93C5FD' : '#2563EB' }}
                                labelStyle={{ color: theme === 'dark' ? '#E5E7EB' : '#111827' }}
                              />
                              <Bar dataKey="value" fill={theme === 'dark' ? '#93C5FD' : '#2563EB'} radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaExclamationCircle className="text-xl" />
                <div>
                  <p className="font-medium text-sm sm:text-base">Error</p>
                  <p className="text-xs sm:text-sm">{error}</p>
                </div>
              </div>
              <button
                onClick={() => setError('')}
                className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs sm:text-sm"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
