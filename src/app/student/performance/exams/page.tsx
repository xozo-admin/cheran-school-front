'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  FaChartLine, 
  FaCalendarAlt, 
  FaChartBar, 
  FaSearch,
  FaDownload,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaBook,
  FaCalendarCheck,
  FaClipboardCheck,
  FaTrophy,
  FaGraduationCap,
  FaPercentage,
  FaClock,
  FaCalendarDay,
  FaBookOpen,
  FaUserGraduate,
  FaCalendarWeek,
  FaTable,
  FaRegCalendarAlt,
  FaCalendarPlus,
  FaChartArea,
  FaChartPie,
  FaBookReader,
  FaChevronLeft,
  FaChevronRight,
  FaCalendarTimes
} from 'react-icons/fa';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { ResponsiveContainer, Area, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Legend, Bar, Cell } from 'recharts';

interface ExamSchedule {
  schedule_id: number;
  exam_type: string;
  term: string;
  start_date: string;
  end_date: string;
  status: string;
  subjects?: ExamSubject[];
}

interface ExamSubject {
  subject: string;
  marks: number | null;
  max_marks: number;
  grade: string;
  date?: string;
  session?: string;
  duration?: string;
}

interface ExamTimetable {
  exam_type: string;
  dates: string;
  timetable: {
    subject: string;
    date: string;
    session: string;
    duration: string;
  }[];
}

interface ExamAnalytics {
  exam: string;
  value: number;
  change_percentage: number;
  trend: 'increase' | 'decrease' | 'neutral';
}

interface ExamDashboardData {
  student: string;
  data: {
    ongoing: ExamSchedule[];
    upcoming: ExamSchedule[];
    completed: ExamSchedule[];
  };
}

interface ExamAnalyticsResponse {
  student: string;
  view: string;
  graph_data?: ExamAnalytics[];
  breakdown?: ExamSubject[];
  exam?: string;
}

interface ExamResult {
  status: number;
  student: string;
  exam: string;
  subjects: ExamSubject[];
}

interface StudentSubject {
  id: number;
  name: string;
  subject_code: string;
}

interface StudentSubjectsResponse {
  status: number;
  message: string;
  student: {
    name: string;
    student_id: string;
    class: string;
    section: string;
  };
  subjects: StudentSubject[];
  subject_count: number;
}

export default function ExamResultsPage() {
  const [loading, setLoading] = useState(true);
  const [examDashboard, setExamDashboard] = useState<ExamDashboardData | null>(null);
  const [examAnalytics, setExamAnalytics] = useState<ExamAnalyticsResponse | null | any>(null);
  const [timetable, setTimetable] = useState<ExamTimetable | null>(null);
  const [timetableScheduleId, setTimetableScheduleId] = useState<number | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubjectsResponse | null>(null);
  const [examDashboardError, setExamDashboardError] = useState<string | null>(null);
  const [examAnalyticsError, setExamAnalyticsError] = useState<string | null>(null);
  const [timetableError, setTimetableError] = useState<string | null>(null);
  const [examResultError, setExamResultError] = useState<string | null>(null);
  
  // Filters
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'completed'>('upcoming');
  const [examTypeFilter, setExamTypeFilter] = useState<string>('all');
  const [termFilter, setTermFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState<ExamSchedule | null>(null);
  const [selectedExamResult, setSelectedExamResult] = useState<ExamResult | null>(null);
  const [analyticsMode] = useState<'overall'>('overall');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [trendCarouselPage, setTrendCarouselPage] = useState(0);

  const trendCardsPerPage = 3;

  const getApiErrorMessage = (error: any, fallback: string) =>
    error?.response?.data?.error || error?.message || fallback;

  const normalizeDashboardData = (payload: any): ExamDashboardData => {
    const raw = payload?.data || payload || {};
    const normalizeBucket = (bucket: any) => {
      if (Array.isArray(bucket)) return bucket;
      if (bucket && typeof bucket === 'object') {
        return Object.values(bucket).flat();
      }
      return [];
    };
    return {
      student: payload?.student || raw?.student || '',
      data: {
        ongoing: normalizeBucket(raw.ongoing || raw.data?.ongoing),
        upcoming: normalizeBucket(raw.upcoming || raw.data?.upcoming),
        completed: normalizeBucket(raw.completed || raw.data?.completed),
      },
    };
  };

  const normalizeAnalytics = (payload: any): ExamAnalyticsResponse => {
    if (!payload) return payload;
    if (payload.breakdown) {
      const mapped = payload.breakdown.map((item: any) => ({
        subject: item.subject,
        marks: item.marks ?? item.mark ?? null,
        max_marks: item.max_marks ?? item.max_mark ?? 0,
        grade: item.grade ?? '-',
      }));
      return { ...payload, breakdown: mapped };
    }
    return payload;
  };

  const fetchExamDashboard = async () => {
    try {
      setExamDashboardError(null);
      const res = await studentApi.exams.dashboard();
      const data = res.data?.data || res.data;
      const normalized = normalizeDashboardData(data);
      setExamDashboard(normalized);
      return normalized;
    } catch (error: any) {
      console.error('Error fetching exam dashboard:', error);
      const message = getApiErrorMessage(error, 'Failed to load exam dashboard');
      setExamDashboardError(message);
      if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
      } else if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
      } else {
        toastError(message);
      }
      return null;
    }
  };

  const fetchStudentSubjects = async () => {
    try {
      setExamDashboardError(null);
      const res = await studentApi.subjects.mySubjects();
      const data = res.data?.data || res.data;
      setStudentSubjects(data);
      return data;
    } catch (error: any) {
      console.error('Error fetching student subjects:', error);
      const message = getApiErrorMessage(error, 'Failed to load student subjects');
      setExamDashboardError(message);
      if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
      } else if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
      } else {
        toastError(message);
      }
      return null;
    }
  };

  const fetchExamAnalytics = async (mode: 'overall' | 'subject' = 'overall', subject?: string) => {
    try {
      setExamAnalyticsError(null);
      const params: Record<string, string> = {};
      
      if (mode === 'subject' && subject) {
        params.subject = subject;
        params.compare = 'true';
      }

      const res = await studentApi.exams.analytics(params);
      const data = res.data?.data || res.data;
      setExamAnalytics(normalizeAnalytics(data));
    } catch (error: any) {
      console.error('Error fetching exam analytics:', error);
      const message = getApiErrorMessage(error, 'Failed to load exam analytics');
      setExamAnalyticsError(message);
      if (error?.response?.status === 404) {
        toastError(message);
      } else if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
      } else if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
      } else {
        toastError(message);
      }
    }
  };

  const fetchExamTimetable = async (scheduleId: number) => {
    try {
      setTimetableError(null);
      const res = await studentApi.exams.timetable(scheduleId);
      const data = res.data?.data || res.data;
      setTimetable(data);
      setTimetableScheduleId(scheduleId);
      return data;
    } catch (error: any) {
      console.error('Error fetching timetable:', error);
      const message = getApiErrorMessage(error, 'Failed to load timetable');
      setTimetableError(message);
      if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
      } else if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
      } else {
        toastError(message);
      }
      return null;
    }
  };

  const fetchExamResult = async (examType: string, term: string) => {
    try {
      setExamResultError(null);
      const studentId = studentSubjects?.student?.student_id;
      if (!studentId) {
        const message = 'Student ID not available';
        setExamResultError(message);
        toastError(message);
        return null;
      }
      const params = {
        student_id: studentId,
        exam_type: examType,
        term: term,
      };
      const res = await studentApi.exams.result(params);
      const data = res.data?.data || res.data;
      const normalizeSubjects = (subjects: any[]) =>
        subjects.map((s: any) => ({
          subject: s.subject,
          marks: s.marks ?? null,
          max_marks: s.max_marks ?? 0,
          grade: s.grade ?? '-',
        }));

      if (data?.exams && Array.isArray(data.exams) && data.exams.length > 0) {
        const first = data.exams[0];
        setSelectedExamResult({
          status: data.status || 200,
          student: data.student || '',
          exam: first.exam || data.exam || '',
          subjects: normalizeSubjects(first.subjects || []),
        });
      } else {
        setSelectedExamResult({
          ...data,
          subjects: normalizeSubjects(data.subjects || []),
        });
      }
      return data;
    } catch (error: any) {
      console.error('Error fetching exam result:', error);
      const message = getApiErrorMessage(error, 'Failed to load exam result');
      setExamResultError(message);
      if (error?.response?.status === 404) {
        toastError(message);
      } else if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
      } else if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
      } else {
        toastError(message);
      }
      return null;
    }
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchExamDashboard(),
        fetchStudentSubjects(),
        fetchExamAnalytics()
      ]);
    } catch (error) {
      console.error('Error fetching exam data:', error);
      toastError('Failed to load exam data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    fetchExamAnalytics('overall');
  }, []);

  useEffect(() => {
    setTermFilter('all');
    setExamTypeFilter('all');
  }, [activeTab]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
      case 'upcoming': return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 dark:from-yellow-900/30 dark:to-yellow-900/20 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increase': return <FaArrowUp className="text-green-500" />;
      case 'decrease': return <FaArrowDown className="text-red-500" />;
      default: return <FaMinus className="text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTrendBadgeClass = (trend: string) => {
    switch (trend) {
      case 'increase':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'decrease':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const getDashboardCount = (bucket: unknown): number => {
    if (Array.isArray(bucket)) return bucket.length;
    if (bucket && typeof bucket === 'object') {
      return Object.values(bucket as Record<string, unknown>).reduce<number>((sum, list) => {
        if (Array.isArray(list)) return sum + list.length;
        return sum;
      }, 0);
    }
    return 0;
  };

  const trendCarouselItems = useMemo(() => {
    if (!examAnalytics?.graph_data || examAnalytics.graph_data.length === 0) return [];
    return examAnalytics.graph_data.map((exam: any) => ({
      label: exam.exam,
      value: exam.value,
      change_percentage: exam.change_percentage,
      trend: exam.trend,
    }));
  }, [examAnalytics]);

  const totalTrendPages = Math.max(1, Math.ceil(trendCarouselItems.length / trendCardsPerPage));
  const safeTrendPage = Math.min(trendCarouselPage, totalTrendPages - 1);
  const visibleTrendItems = trendCarouselItems.slice(
    safeTrendPage * trendCardsPerPage,
    safeTrendPage * trendCardsPerPage + trendCardsPerPage
  );
  const trendFillCount = Math.max(0, trendCardsPerPage - visibleTrendItems.length);

  useEffect(() => {
    if (trendCarouselPage > totalTrendPages - 1) {
      setTrendCarouselPage(0);
    }
  }, [trendCarouselPage, totalTrendPages]);

  const getSubjectColor = (subjectName: string) => {
    const colors = [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'bg-gradient-to-r from-purple-500 to-purple-600',
      'bg-gradient-to-r from-green-500 to-green-600',
      'bg-gradient-to-r from-red-500 to-red-600',
      'bg-gradient-to-r from-yellow-500 to-yellow-600',
      'bg-gradient-to-r from-pink-500 to-pink-600',
      'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'bg-gradient-to-r from-teal-500 to-teal-600',
      'bg-gradient-to-r from-orange-500 to-orange-600',
      'bg-gradient-to-r from-cyan-500 to-cyan-600',
    ];
    
    const foundIndex = studentSubjects?.subjects.findIndex(s => s.name === subjectName);
    const subjectIndex = typeof foundIndex === 'number' && foundIndex >= 0 ? foundIndex : 0;
    return colors[subjectIndex % colors.length];
  };

  const getExamTermsForTab = (tab: 'ongoing' | 'upcoming' | 'completed') => {
    const terms = new Set<string>();
    const exams = examDashboard?.data?.[tab] || [];
    exams.forEach(exam => terms.add(exam.term));
    return Array.from(terms);
  };

  const getExamTypesForTabAndTerm = (tab: 'ongoing' | 'upcoming' | 'completed', term: string) => {
    const types = new Set<string>();
    const exams = examDashboard?.data?.[tab] || [];
    exams.forEach(exam => {
      if (term === 'all' || exam.term === term) {
        types.add(exam.exam_type);
      }
    });
    return Array.from(types);
  };

  const getActiveExams = () => {
    if (!examDashboard?.data) return [];
    
    let exams: ExamSchedule[] = [];
    switch (activeTab) {
      case 'ongoing':
        exams = examDashboard.data.ongoing || [];
        break;
      case 'upcoming':
        exams = examDashboard.data.upcoming || [];
        break;
      case 'completed':
        exams = examDashboard.data.completed || [];
        break;
    }

    // Apply filters
    if (examTypeFilter !== 'all') {
      exams = exams.filter(exam => exam.exam_type === examTypeFilter);
    }

    if (termFilter !== 'all') {
      exams = exams.filter(exam => exam.term === termFilter);
    }

    if (searchTerm) {
      exams = exams.filter(exam => 
        exam.exam_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.start_date.includes(searchTerm) ||
        exam.end_date.includes(searchTerm)
      );
    }

    return exams;
  };

  const calculateOverallPercentage = () => {
    if (!examAnalytics?.graph_data || examAnalytics.graph_data.length === 0) return 0;
    
    const total = examAnalytics.graph_data.reduce((sum:any, exam:any) => sum + exam.value, 0);
    return total / examAnalytics.graph_data.length;
  };

  const handleViewExamDetails = async (exam: ExamSchedule) => {
    setSelectedExam(exam);
    
    // Fetch timetable for the exam
    await fetchExamTimetable(exam.schedule_id);
    
    // If completed exam, fetch detailed results
    if (exam.status.toLowerCase() === 'completed') {
      await fetchExamResult(exam.exam_type, exam.term);
    }
    
    toastInfo(`Viewing details for ${exam.exam_type} exam`);
  };

  const handleViewTimetable = async (exam: ExamSchedule) => {
    setSelectedExam(exam);
    setSelectedExamResult(null);
    await fetchExamTimetable(exam.schedule_id);
    toastInfo(`Viewing timetable for ${exam.exam_type}`);
  };

  const handleViewResult = async (exam: ExamSchedule) => {
    setSelectedExam(exam);
    setTimetable(null);
    await fetchExamResult(exam.exam_type, exam.term);
    toastInfo(`Viewing results for ${exam.exam_type}`);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
    
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  };

  const getDaysUntilExam = (examDate: string) => {
    const today = new Date();
    const exam = new Date(examDate);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 0) return 'Completed';
    return `${diffDays} days`;
  };

  const getExamDay = (examDate: string) => {
    const date = new Date(examDate);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const handleDownloadReport = async () => {
    try {
      toastInfo('Generating exam report...');
      // In a real app, you would generate and download a PDF report
      setTimeout(() => {
        toastSuccess('Exam report downloaded successfully');
      }, 1500);
    } catch (error) {
      toastError('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex-1">
          <main className="flex-1 p-6">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6">
        <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="rounded-2xl p-5 sm:p-6 shadow-lg text-white bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaUserGraduate className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                    Student Exams
                  </h1>
                  <p className="text-[11px] sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    {examDashboard?.student || 'Student'} • Track your exam schedule and results
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Ongoing Exams</div>
                  <div className="text-sm sm:text-base font-bold">
                    {getDashboardCount(examDashboard?.data?.ongoing)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(examDashboardError || examAnalyticsError || timetableError || examResultError) && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
            {examDashboardError || examAnalyticsError || timetableError || examResultError}
          </div>
        )}

        {/* Dashboard Summary Cards */}
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-4">
              <FaCalendarAlt className="text-2xl opacity-80" />
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">Ongoing</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {getDashboardCount(examDashboard?.data?.ongoing)}
            </div>
            <div className="text-xs sm:text-sm opacity-90 font-medium">Ongoing Exams</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-4">
              <FaCalendarPlus className="text-2xl opacity-80" />
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">Upcoming</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {getDashboardCount(examDashboard?.data?.upcoming)}
            </div>
            <div className="text-xs sm:text-sm opacity-90 font-medium">Upcoming Exams</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white rounded-2xl p-4 sm:p-5 shadow-lg transform hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-4">
              <FaClipboardCheck className="text-2xl opacity-80" />
              <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">Completed</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {getDashboardCount(examDashboard?.data?.completed)}
            </div>
            <div className="text-xs sm:text-sm opacity-90 font-medium">Completed Exams</div>
          </div>
        </div>

        {/* Analytics Section */}
        {examAnalytics && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4 sm:p-6 mb-6">
            

            {examAnalytics.graph_data && examAnalytics.graph_data.length > 0 && (
              <>
                {/* Trend Cards Carousel */}
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="p-2 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30">
                        <FaChartLine className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                          Trend Summary
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                          Exam-wise score and change percentage
                        </p>
                      </div>
                    </div>
                    {trendCarouselItems.length > trendCardsPerPage && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTrendCarouselPage(prev => Math.max(prev - 1, 0))}
                          disabled={safeTrendPage === 0}
                          className={`p-2 rounded-lg border transition-all ${
                            safeTrendPage === 0
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:scale-105'
                          } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                          aria-label="Previous trend cards"
                        >
                          <FaChevronLeft className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                        </button>
                        <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                          {safeTrendPage + 1}/{totalTrendPages}
                        </span>
                        <button
                          onClick={() => setTrendCarouselPage(prev => Math.min(prev + 1, totalTrendPages - 1))}
                          disabled={safeTrendPage === totalTrendPages - 1}
                          className={`p-2 rounded-lg border transition-all ${
                            safeTrendPage === totalTrendPages - 1
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:scale-105'
                          } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                          aria-label="Next trend cards"
                        >
                          <FaChevronRight className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="overflow-hidden">
                    <div className="flex flex-nowrap gap-2 sm:gap-3 w-full">
                      {trendCarouselItems.length > 0 ? visibleTrendItems.map((item:any) => (
                        <div
                          key={item.label}
                          className="flex-1 min-w-0 rounded-lg sm:rounded-xl p-3 sm:p-4 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                              {item.label}
                            </span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${getTrendBadgeClass(item.trend)}`}>
                              {item.trend}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                              {item.value.toFixed(1)}%
                            </div>
                            <div className={`text-xs sm:text-sm font-semibold ${getTrendColor(item.trend)}`}>
                              {item.change_percentage > 0 ? '+' : ''}{item.change_percentage.toFixed(1)}%
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Score vs previous exam
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-4 sm:py-6 md:py-8 text-gray-600 dark:text-gray-400 w-full">
                          <p className="text-xs sm:text-sm font-medium">No trend data available</p>
                          <p className="text-xs mt-1">Trends will appear once results are available.</p>
                        </div>
                      )}
                      {trendCarouselItems.length > 0 && trendFillCount > 0 && (
                        Array.from({ length: trendFillCount }).map((_, idx) => (
                          <div
                            key={`trend-fill-${idx}`}
                            className="flex-1 min-w-0 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-transparent opacity-0 pointer-events-none"
                            aria-hidden="true"
                          />
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Visual Graph */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">Performance Trend</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="min-w-[640px] sm:min-w-0 h-56 sm:h-64 lg:h-72 px-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={examAnalytics.graph_data.map((exam: any) => ({
                          label: exam.exam,
                          value: exam.value,
                          change_percentage: exam.change_percentage,
                          trend: exam.trend,
                        }))}>
                          <defs>
                            <linearGradient id="examTrendGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                          <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                          <YAxis yAxisId="left" stroke="#9CA3AF" fontSize={12} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" fontSize={12} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === 'change_percentage' || name === 'Trend %') return [`${value}%`, 'Change %'];
                              return [`${value}%`, 'Score'];
                            }}
                          />
                          <Legend />
                          <Area yAxisId="left" type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#examTrendGradient)" name="Score" />
                          <Bar yAxisId="right" dataKey="change_percentage" name="Trend %" barSize={18}>
                            {examAnalytics.graph_data.map((exam: any, index: number) => (
                              <Cell
                                key={`trend-bar-${index}`}
                                fill={
                                  exam.trend === 'increase'
                                    ? '#10B981'
                                    : exam.trend === 'decrease'
                                    ? '#EF4444'
                                    : '#3B82F6'
                                }
                              />
                            ))}
                          </Bar>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}

          </div>
        )}

        {/* Exam Dashboard */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg mb-6 overflow-hidden">
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap">
              <button
                onClick={() => setActiveTab('ongoing')}
                className={`flex-1 min-w-[120px] py-4 text-center font-bold transition-all ${activeTab === 'ongoing'
                  ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FaCalendarAlt className={activeTab === 'ongoing' ? 'text-blue-600 dark:text-blue-400' : ''} />
                  <div className="text-left">
                    <div>Ongoing</div>
                    <div className="text-xs font-normal">
                      {getDashboardCount(examDashboard?.data?.ongoing)} exams
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('upcoming')}
                className={`flex-1 min-w-[120px] py-4 text-center font-bold transition-all ${activeTab === 'upcoming'
                  ? 'text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-600 dark:border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FaCalendarPlus className={activeTab === 'upcoming' ? 'text-yellow-600 dark:text-yellow-400' : ''} />
                  <div className="text-left">
                    <div>Upcoming</div>
                    <div className="text-xs font-normal">
                      {getDashboardCount(examDashboard?.data?.upcoming)} exams
                    </div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`flex-1 min-w-[120px] py-4 text-center font-bold transition-all ${activeTab === 'completed'
                  ? 'text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-center gap-3">
                  <FaClipboardCheck className={activeTab === 'completed' ? 'text-green-600 dark:text-green-400' : ''} />
                  <div className="text-left">
                    <div>Completed</div>
                    <div className="text-xs font-normal">
                      {getDashboardCount(examDashboard?.data?.completed)} exams
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Exams
                </label>
                <div className="relative">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search exam, term, or date..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Term
                </label>
                <select
                  value={termFilter}
                  onChange={(e) => setTermFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Terms</option>
                  {getExamTermsForTab(activeTab).map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Exam Type
                </label>
                <select
                  value={examTypeFilter}
                  onChange={(e) => setExamTypeFilter(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="all">All Exam Types</option>
                  {getExamTypesForTabAndTerm(activeTab, termFilter).map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  View
                </label>
                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex-1 px-3 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    List
                  </button>
                </div>
              </div>

            
            </div>
          </div>

          {/* Exams List */}
          <div className="p-4 sm:p-6">
            {getActiveExams().length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5' : 'space-y-4'}>
                {getActiveExams().map((exam) => (
                  <div
                    key={exam.schedule_id}
                    className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6 hover:shadow-xl transition-all duration-300 hover:border-blue-300 dark:hover:border-blue-700 ${
                      viewMode === 'list' ? 'flex flex-col' : ''
                    }`}
                  >
                    {(() => {
                      const accentSubject =
                        timetableScheduleId === exam.schedule_id
                          ? timetable?.timetable?.[0]?.subject
                          : exam.subjects?.[0]?.subject;
                      const accentClass = getSubjectColor(accentSubject || 'Math');

                      return (
                        <>
                    {/* Exam Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                            <FaBookOpen className="text-base sm:text-lg" />
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900 dark:text-white">
                              {exam.exam_type}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{exam.term}</p>
                          </div>
                        </div>
                      </div>

                      <div className={`px-3 py-1 rounded-full text-xs sm:text-sm font-bold ${getStatusColor(exam.status)}`}>
                        {exam.status}
                      </div>
                    </div>

                    {/* Exam Date Display - Improved */}
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-3 sm:p-4 mb-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
                            <FaCalendarDay className="text-blue-600 dark:text-blue-400 text-lg sm:text-xl" />
                          </div>
                          <div>
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Exam Period</div>
                            <div className="font-bold text-gray-900 dark:text-white">
                              {formatDateRange(exam.start_date, exam.end_date)}
                            </div>
                          </div>
                        </div>
                        
                        {activeTab === 'upcoming' && (
                          <div className="text-right">
                            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Starts In</div>
                            <div className="font-bold text-yellow-600 dark:text-yellow-400 text-base sm:text-lg">
                              {getDaysUntilExam(exam.start_date)}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Date Timeline */}
                      <div className="mt-3 flex items-center justify-between text-xs sm:text-sm">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <FaRegCalendarAlt />
                          <span>Start: {new Date(exam.start_date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                        <div className="h-px flex-1 bg-blue-200 dark:bg-blue-800 mx-4"></div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <FaRegCalendarAlt />
                          <span>End: {new Date(exam.end_date).toLocaleDateString('en-US', { 
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Duration Info */}
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
                        <div className="flex items-center justify-between text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <FaClock className="text-sm" />
                            <span className="text-xs font-medium">Duration</span>
                          </div>
                          <div className="font-bold text-gray-900 dark:text-white">
                            {Math.ceil((new Date(exam.end_date).getTime() - new Date(exam.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subject Count (if timetable available) */}
                    {timetable && timetableScheduleId === exam.schedule_id && (
                      <div className="mb-6">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                          <FaBookReader /> Subjects in this exam:
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {timetable.timetable.map((item, idx) => {
                            const subject = studentSubjects?.subjects.find(s => s.name === item.subject);
                            return (
                              <div 
                                key={idx}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white ${getSubjectColor(item.subject)}`}
                              >
                                {item.subject}
                                {subject?.subject_code && (
                                  <span className="text-xs ml-1 opacity-75">({subject.subject_code})</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => handleViewTimetable(exam)}
                        className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all text-white ${accentClass}`}
                      >
                        <FaTable /> View Timetable
                      </button>
                      
                      {activeTab === 'completed' && (
                        <button
                          onClick={() => handleViewResult(exam)}
                          className={`px-4 py-2.5 rounded-lg flex items-center gap-2 font-medium transition-all shadow hover:shadow-lg text-white ${accentClass}`}
                        >
                          <FaClipboardCheck /> View Result
                        </button>
                      )}
                    </div>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="inline-block p-6 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-2xl mb-6">
                  <FaGraduationCap className="text-5xl text-gray-400 dark:text-gray-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                  No {activeTab} exams found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                  {searchTerm || examTypeFilter !== 'all' || termFilter !== 'all'
                    ? 'No exams match your search criteria. Try adjusting your filters.'
                    : `You don't have any ${activeTab} exams scheduled at the moment.`}
                </p>
              </div>
            )}
          </div>
        </div>

        
        </div>
      </main>

      {/* Exam Details Modal */}
      {selectedExam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                      <FaBookOpen />
                    </div>
                    {selectedExam.exam_type} Exam Details
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                    {selectedExam.term} • {formatDateRange(selectedExam.start_date, selectedExam.end_date)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedExam(null);
                    setTimetable(null);
                    setSelectedExamResult(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 dark:text-gray-400"
                >
                  <FaCalendarTimes className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Quick Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <div className="text-xs sm:text-sm text-blue-600 dark:text-blue-400 mb-2 font-medium">Exam Type</div>
                  <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">{selectedExam.exam_type}</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-xl p-4 border border-green-200 dark:border-green-800">
                  <div className="text-xs sm:text-sm text-green-600 dark:text-green-400 mb-2 font-medium">Status</div>
                  <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">{selectedExam.status}</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <div className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-2 font-medium">Term</div>
                  <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">{selectedExam.term}</div>
                </div>
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-900/10 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
                  <div className="text-xs sm:text-sm text-orange-600 dark:text-orange-400 mb-2 font-medium">Duration</div>
                  <div className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                    {Math.ceil((new Date(selectedExam.end_date).getTime() - new Date(selectedExam.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
              </div>

              {/* Timetable Section */}
              {timetable && (
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FaTable /> Exam Timetable
                  </h3>
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/30 dark:to-gray-900/20 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-4">
                      <span className="font-medium">Schedule:</span> {timetable.dates}
                    </div>
                    <div className="space-y-3">
                      {timetable.timetable.map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`rounded-xl p-4 border border-white/20 text-white hover:shadow-md transition-shadow ${getSubjectColor(item.subject)}`}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/20 text-white">
                                <FaBook />
                              </div>
                              <div>
                                <div className="font-bold text-white">{item.subject}</div>
                                <div className="text-xs sm:text-sm text-white/80">
                                  {getExamDay(item.date)} • {new Date(item.date).toLocaleDateString('en-US', { 
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white text-sm sm:text-base">{item.session}</div>
                              <div className="text-xs sm:text-sm text-white/80">{item.duration}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {selectedExam?.status?.toLowerCase() === 'completed' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleViewResult(selectedExam)}
                        className={`px-4 py-2.5 text-white rounded-lg flex items-center gap-2 font-medium transition-all shadow hover:shadow-lg ${
                          getSubjectColor(timetable?.timetable?.[0]?.subject || selectedExamResult?.subjects?.[0]?.subject || 'Math')
                        }`}
                      >
                        <FaClipboardCheck /> View Result
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Results Section */}
              {selectedExam.status.toLowerCase() === 'completed' && selectedExamResult && (
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FaClipboardCheck /> Exam Results
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedExamResult.subjects.map((subject, idx) => (
                      <div key={idx} className={`rounded-xl p-5 border border-white/20 text-white ${getSubjectColor(subject.subject)}`}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white/20 text-white">
                              <FaBook className="text-lg" />
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm sm:text-base">{subject.subject}</div>
                              <div className="text-[11px] sm:text-xs text-white/80">Subject</div>
                            </div>
                          </div>
                          <div className={`px-3 py-1.5 rounded-lg font-bold ${
                            subject.marks && subject.marks >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                            subject.marks && subject.marks >= 75 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                            subject.marks && subject.marks >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                            {subject.grade || 'N/A'}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-white/80">Marks Obtained:</span>
                            <span className="font-bold text-white">
                              {subject.marks || 'N/A'}/{subject.max_marks}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-white/80">Percentage:</span>
                            <span className={`font-bold ${
                              subject.marks && subject.marks >= 90 ? 'text-green-600 dark:text-green-400' :
                              subject.marks && subject.marks >= 75 ? 'text-blue-600 dark:text-blue-400' :
                              subject.marks && subject.marks >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {subject.marks ? `${((subject.marks / subject.max_marks) * 100).toFixed(1)}%` : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
