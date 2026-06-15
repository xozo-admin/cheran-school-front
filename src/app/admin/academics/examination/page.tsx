// components/examination/ExaminationManage.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { adminApi } from '@/lib/api';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Users,
  Download,
  Eye,
  BookOpen,
  AlertCircle,
  Filter,
  X,
  Check,
  Bookmark,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ChevronRight,
  Clock,
  BarChart3,
  FileText,
  Shield,
  Tag,
  List,
  Grid,
  Search,
  MoreVertical,
  ExternalLink,
  CalendarDays,
  Layers,
  GanttChart,
  CheckSquare,
  TrendingUp,
  Zap,
  GraduationCap,
  School,
  UserCheck,
  FileCheck,
  Upload,
  BarChart,
  User,
  Target,
  Award,
  TrendingDown,
  Minus,
  Percent
} from 'lucide-react';
import { format, parseISO, isBefore, isAfter } from 'date-fns';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { requestSidebarCountsRefresh } from '@/lib/sidebar-counts-sync';
import toast from 'react-hot-toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

// ==================== INTERFACES ====================
interface ExamTerm {
  id: number;
  name: string;
  rank: number;
  exams: ExamType[];
}

interface ExamType {
  id: number;
  name: string;
  max_marks: number;
  rank: number;
  term_name: string;
  term: number;
}

interface ExamSchedule {
  id: number;
  exam_type_id: number;
  exam_type_name: string;
  start_date: string;
  end_date: string;
  classes: string[];
  subjects: {
    id: number;
    subject_name: string;
    exam_date: string;
    duration: string;
    session: string;
  }[];
  created_at: string;
}

interface MarkChangeRequest {
  request_id: number;
  student: string;
  class: string;
  term: string;
  exam: string;
  subject: string;
  old_marks: number;
  new_marks: number;
  teacher: string;
  reason: string;
  date: string;
}

interface Class {
  id: number;
  name: string;
}

interface SubjectOption {
  id: number;
  name: string;
  subject_code?: string;
}

interface ExamStats {
  totalExams: number;
  totalSchedules: number;
  upcomingExams: number;
  ongoingExams: number;
  completedExams: number;
  pendingApprovals: number;
  totalClasses: number;
  totalSubjects: number;
}

interface ClassResult {
  status: number;
  class: string;
  exam: string;
  analytics: {
    total_students: number;
    total_pass: number;
    grade_breakdown: {
      [key: string]: number;
    };
  };
  data: Array<{
    student_id: string;
    name: string;
    summative_total: number;
    overall_grade: string;
  }>;
}

interface SubjectAnalysis {
  exam: string;
  class: string;
  subject: string;
  viewed_by: string;
  stats: {
    total_students: number;
    pass_percentage: string;
    grade_distribution: {
      [key: string]: number;
    };
    pass_count: number;
    fail_count: number;
  };
  students: Array<{
    student_id: string;
    name: string;
    mark: number;
    total: number;
    grade: string;
  }>;
}

interface StudentResult {
  status: number;
  student: string;
  exam: string;
  subjects: Array<{
    subject: string;
    marks: number | null;
    max_marks: number;
    grade: string;
  }>;
}

interface StudentMarksDetail {
  student_id: string;
  name: string;
  class: string;
  exam_type: string;
  summary: {
    total_obtained: number;
    total_max: number;
    percentage: string;
  };
  marks: Array<{
    subject: string;
    marks_obtained: number;
    total_marks: number;
    grade: string;
  }>;
}

// ==================== UTILITY FUNCTIONS ====================
const getExamStatus = (schedule: ExamSchedule) => {
  const today = new Date();
  const startDate = parseISO(schedule.start_date);
  const endDate = parseISO(schedule.end_date);
  
  if (isBefore(today, startDate)) return 'upcoming';
  if (isAfter(today, endDate)) return 'completed';
  return 'ongoing';
};

const formatDate = (dateString: string) => {
  return format(parseISO(dateString), 'MMM dd, yyyy');
};

const formatDateTime = (dateString: string) => {
  return format(parseISO(dateString), 'MMM dd, yyyy hh:mm a');
};

// ==================== MAIN COMPONENT ====================
export default function ExaminationManage ()  {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'academics_examination_school_scope' });
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'structure' | 'schedule' | 'results' | 'approvals'>('overview');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Exam Structure States
  const [examTerms, setExamTerms] = useState<ExamTerm[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<ExamTerm | null>(null);
  const [showTermDialog, setShowTermDialog] = useState(false);
  const [termForm, setTermForm] = useState({
    name: '',
    rank: 1,
    exams: [] as Array<{ name: string; max_marks: number; rank: number }>
  });
  
  // Schedule States
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [filterClass, setFilterClass] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ExamSchedule | null>(null);
  const [scheduleForm, setScheduleForm] = useState({
    exam_type: '',
    term: '',
    start_date: '',
    end_date: '',
    class_names: [] as string[],
    subjects: [] as Array<{
      subject_name: string;
      exam_date: string;
      duration: string;
      session: string;
    }>
  });
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  
  // Results States
  const [classResult, setClassResult] = useState<ClassResult | null>(null);
  const [subjectAnalysis, setSubjectAnalysis] = useState<SubjectAnalysis | null>(null);
  const [studentResult, setStudentResult] = useState<StudentResult | null>(null);
  const [studentMarksDetail, setStudentMarksDetail] = useState<StudentMarksDetail | null>(null);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedExamType, setSelectedExamType] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  
  // Approval States
  const [markRequests, setMarkRequests] = useState<MarkChangeRequest[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MarkChangeRequest[]>([]);
  
  // Loading States
  const [isCreatingTerm, setIsCreatingTerm] = useState(false);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  
  // Stats
  const [stats, setStats] = useState<ExamStats>({
    totalExams: 0,
    totalSchedules: 0,
    upcomingExams: 0,
    ongoingExams: 0,
    completedExams: 0,
    pendingApprovals: 0,
    totalClasses: 0,
    totalSubjects: 0,
  });

  // ==================== THEME CLASSES ====================
  // Helper function to combine classes with proper spacing
  const combineClasses = (...classes: (string | undefined)[]) => {
    return classes.filter(Boolean).join(' ');
  };

  const getBgClass = () => combineClasses(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combineClasses(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark' 
        ? 'from-gray-800 to-blue-900/10' 
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'pink') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-pink-900/10'
        : 'from-white to-pink-50');
    }
    if (color === 'indigo') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'purple') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-purple-900/10'
        : 'from-white to-purple-50');
    }
    if (color === 'green') {
      return combineClasses(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    return combineClasses(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' | 'green' = 'blue') => {
    return getCardGradientClass(color);
  };

  const getInputClass = () => combineClasses(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combineClasses(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combineClasses(
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
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      green: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
    };

    const colors = colorMap[type] || colorMap.blue;
    return combineClasses(
      'px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getTableHeaderClass = () => combineClasses(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combineClasses(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const getTabClass = (isActive: boolean) => {
    const base = 'flex items-center justify-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none min-w-[130px] sm:min-w-0';
    if (isActive) {
      return combineClasses(base, 'text-blue-600 border-b-2 border-blue-600', get('bg', 'secondary'));
    }
    return combineClasses(base, get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]');
  };

  // ==================== API FUNCTIONS ====================
  const flattenApiMessage = (payload: any): string => {
    if (payload == null) return '';
    if (typeof payload === 'string') return payload.trim();
    if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);

    if (Array.isArray(payload)) {
      const parts = payload.map(flattenApiMessage).filter(Boolean);
      return parts.join(', ');
    }

    if (typeof payload === 'object') {
      const preferredKeys = ['error', 'message', 'detail', 'non_field_errors'];
      for (const key of preferredKeys) {
        if (key in payload) {
          const msg = flattenApiMessage(payload[key]);
          if (msg) return msg;
        }
      }

      const entries = Object.entries(payload)
        .map(([k, v]) => {
          const msg = flattenApiMessage(v);
          return msg ? `${k}: ${msg}` : '';
        })
        .filter(Boolean);
      return entries.join(' | ');
    }

    return '';
  };

  const getSuccessMessage = (payload: any, fallback: string): string => {
    const msg = flattenApiMessage(payload);
    return msg || fallback;
  };

  const handleApiError = (error: any, defaultMessage: string) => {
    if (error?.name === 'TypeError' && error?.message === 'Failed to fetch') {
      toastError('Network error. Please check your connection.');
      return;
    }

    const responseData = error?.response?.data;
    const apiMessage = flattenApiMessage(responseData);
    const fallbackMessage = flattenApiMessage(error?.message) || defaultMessage;
    toastError(apiMessage || fallbackMessage);

    if (error?.response?.status === 401 || error?.status === 401) {
      window.location.href = '/login';
    }
  };

  // 1. ADMIN: EXAM TERM MANAGEMENT
  const fetchExamTerms = async () => {
    try {
      const response = await adminApi.exams.terms(schoolScope.scopeParams);
      const data = response.data;
      setExamTerms(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load exam terms');
      return [];
    }
  };

  const createExamTerm = async (termData: any) => {
    setIsCreatingTerm(true);
    try {
      const response = await adminApi.exams.createTerm({
        ...termData,
        ...schoolScope.scopeParams,
      });
      const result = response.data;
      toastSuccess(getSuccessMessage(result?.message, 'Exam term created successfully'));
      return result.data;
    } catch (error) {
      handleApiError(error, 'Failed to create exam term');
      return null;
    } finally {
      setIsCreatingTerm(false);
    }
  };

  const updateExamTerm = async (termId: number, termData: any) => {
    setIsCreatingTerm(true);
    try {
      const response = await adminApi.exams.updateTerm({
        id: termId,
        ...termData,
        ...schoolScope.scopeParams,
      });
      const result = response.data;
      toastSuccess(getSuccessMessage(result?.message, 'Exam term updated successfully'));
      return result;
    } catch (error) {
      handleApiError(error, 'Failed to update term');
      return null;
    } finally {
      setIsCreatingTerm(false);
    }
  };

  const deleteExamTerm = async (termId: number): Promise<boolean> => {
  // Remove the confirm dialog from here - it's now handled in the UI
  setIsDeleting(termId);
  try {
    const response = await adminApi.exams.deleteTerm(termId, schoolScope.scopeParams);
    const result = response.data;
    toastSuccess(getSuccessMessage(result?.message, 'Exam term deleted successfully'));
    return true;
  } catch (error) {
    handleApiError(error, 'Failed to delete term');
    return false;
  } finally {
    setIsDeleting(null);
  }
};

  // 2. EXAM DROPDOWN LIST
  const fetchExamList = async (termId?: number) => {
    try {
      const response = await adminApi.exams.list(termId);
      return response.data;
    } catch (error) {
      handleApiError(error, 'Failed to load exam list');
      return [];
    }
  };

  // 4. CLASS RESULTS VIEW
  const fetchClassResult = async (className: string, examType: string, term: string) => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams({
        class: className,
        exam_type: examType,
        term: term
      });
      if (schoolScope.scopeParams.school_id) params.set('school_id', String(schoolScope.scopeParams.school_id));

      const response = await adminApi.exams.classResult(params);
      const data = response.data;
      setClassResult(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load class results');
      return null;
    } finally {
      setIsLoadingResults(false);
    }
  };

  // 5. SUBJECT ANALYSIS
  const fetchSubjectAnalysis = async (className: string, section: string, subject: string, examType: string, term: string) => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams({
        class: className,
        section: section,
        subject: subject,
        exam_type: examType,
        term: term
      });
      if (schoolScope.scopeParams.school_id) params.set('school_id', String(schoolScope.scopeParams.school_id));

      const response = await adminApi.exams.subjectAnalysis(params);
      const data = response.data;
      setSubjectAnalysis(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load subject analysis');
      return null;
    } finally {
      setIsLoadingResults(false);
    }
  };

  // 6. STUDENT EXAM DETAIL
  const fetchStudentResult = async (studentId: string, examType: string, term: string) => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams({
        student_id: studentId,
        exam_type: examType,
        term: term
      });
      if (schoolScope.scopeParams.school_id) params.set('school_id', String(schoolScope.scopeParams.school_id));

      const response = await adminApi.exams.studentResult(params);
      const data = response.data;
      setStudentResult(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load student result');
      return null;
    } finally {
      setIsLoadingResults(false);
    }
  };

  // 8. CLASS TEACHER STUDENT MARKS
  const fetchStudentMarksDetail = async (studentId: string, examType: string, term: string) => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams({
        student_id: studentId,
        exam_type: examType,
        term: term
      });
      if (schoolScope.scopeParams.school_id) params.set('school_id', String(schoolScope.scopeParams.school_id));

      const response = await adminApi.exams.studentMarksDetail(params);
      const data = response.data;
      setStudentMarksDetail(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load student marks detail');
      return null;
    } finally {
      setIsLoadingResults(false);
    }
  };

  // 9. ADMIN: EXAM SCHEDULE MANAGEMENT
  const fetchExamSchedules = async () => {
    try {
      const params = new URLSearchParams();
      if (filterClass) params.append('class', filterClass);
      if (filterTerm) params.append('term', filterTerm);
      if (selectedExamType) params.append('exam_type', selectedExamType);
      if (schoolScope.scopeParams.school_id) params.append('school_id', String(schoolScope.scopeParams.school_id));

      const response = await adminApi.exams.schedule(params.toString());
      const data = response.data;
      setExamSchedules(data.data || []);
      return data.data || [];
    } catch (error) {
      handleApiError(error, 'Failed to load exam schedules');
      return [];
    }
  };

  const createExamSchedule = async (scheduleData: any) => {
    setIsCreatingSchedule(true);
    try {
      const response = await adminApi.exams.createSchedule({
        ...scheduleData,
        ...schoolScope.scopeParams,
      });
      const result = response.data;
      toastSuccess(getSuccessMessage(result?.message, 'Exam schedule created successfully'));
      if (Array.isArray(result?.errors) && result.errors.length > 0) {
        toastWarning(result.errors.join(' | '));
      }
      return result;
    } catch (error) {
      handleApiError(error, 'Failed to create schedule');
      return null;
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const updateExamSchedule = async (scheduleId: number, scheduleData: any) => {
    setIsCreatingSchedule(true);
    try {
      const response = await adminApi.exams.updateSchedule({
        schedule_id: scheduleId,
        ...scheduleData,
        ...schoolScope.scopeParams,
      });
      const result = response.data;
      toastSuccess(getSuccessMessage(result?.message, 'Exam schedule updated successfully'));
      return result;
    } catch (error) {
      handleApiError(error, 'Failed to update schedule');
      return null;
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  // Replace the existing deleteExamSchedule function with this:
const deleteExamSchedule = async (scheduleId: number): Promise<boolean> => {
  // Remove the confirm dialog from here - it's now handled in the UI
  setIsDeleting(scheduleId);
  try {
    const response = await adminApi.exams.deleteSchedule(scheduleId, schoolScope.scopeParams);
    const result = response.data;
    toastSuccess(getSuccessMessage(result?.message, 'Schedule deleted successfully'));
    return true;
  } catch (error) {
    handleApiError(error, 'Failed to delete schedule');
    return false;
  } finally {
    setIsDeleting(null);
  }
};

  // 14. ADMIN MARK APPROVAL
  const fetchApprovalRequests = async () => {
    try {
      const response = await adminApi.exams.approvals(schoolScope.scopeParams);
      const data = response.data;
      const pending = data.pending_approvals || [];
      setMarkRequests(pending);
      setPendingRequests(pending);
      return pending;
    } catch (error) {
      handleApiError(error, 'Failed to load approval requests');
      return [];
    }
  };

  const handleApprovalRequest = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      const response = await adminApi.exams.handleApproval({
        request_id: requestId,
        action,
      });
      const result = response.data;
      toastSuccess(getSuccessMessage(result?.message, `Request ${action.toLowerCase()}d successfully`));
      return true;
    } catch (error) {
      handleApiError(error, 'Failed to process request');
      return false;
    }
  };

  // Fetch classes
  const fetchClasses = async () => {
    try {
      const response = await adminApi.academics.standards(schoolScope.scopeParams);
      const data = response.data;
      setAvailableClasses(data);
      return data;
    } catch (error) {
      handleApiError(error, 'Failed to load classes');
      return [];
    }
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setIsLoadingStats(true);
    setLoading(true);
    
    try {
      const [terms, schedules, requests, classes] = await Promise.all([
        fetchExamTerms(),
        fetchExamSchedules(),
        fetchApprovalRequests(),
        fetchClasses()
      ]);

      const today = new Date();
      
      const scheduleStats = schedules.reduce((acc: { upcoming: number; ongoing: number; completed: number; }, schedule: ExamSchedule) => {
        const status = getExamStatus(schedule);
        if (status === 'upcoming') acc.upcoming++;
        else if (status === 'ongoing') acc.ongoing++;
        else acc.completed++;
        return acc;
      }, { upcoming: 0, ongoing: 0, completed: 0 });

      const totalSubjects = schedules.reduce((acc: any, schedule: { subjects: string | any[]; }) => {
        return acc + schedule.subjects.length;
      }, 0);

      const uniqueClasses = new Set(
        schedules.flatMap((schedule: { classes: any; }) => schedule.classes)
      );

      setStats({
        totalExams: terms.reduce((acc: any, term: { exams: string | any[]; }) => acc + term.exams.length, 0),
        totalSchedules: schedules.length,
        upcomingExams: scheduleStats.upcoming,
        ongoingExams: scheduleStats.ongoing,
        completedExams: scheduleStats.completed,
        pendingApprovals: requests.length,
        totalClasses: uniqueClasses.size,
        totalSubjects
      });
      
    } catch (error) {
      handleApiError(error, 'Failed to load data');
    } finally {
      setLoading(false);
      setIsLoadingStats(false);
    }
  }, [schoolScope.selectedSchoolId]);

  // ==================== EVENT HANDLERS ====================
  const handleCreateTerm = async () => {
    if (!termForm.name.trim()) {
      toastInfo('Please enter term name');
      return;
    }

    const result = await createExamTerm(termForm);
    if (result) {
      setShowTermDialog(false);
      setTermForm({ name: '', rank: 1, exams: [] });
      fetchAllData();
    }
  };

  const handleUpdateTerm = async () => {
    if (!selectedTerm) return;

    const result = await updateExamTerm(selectedTerm.id, termForm);
    if (result) {
      setShowTermDialog(false);
      setSelectedTerm(null);
      fetchAllData();
    }
  };

  const handleCreateSchedule = async () => {
    const result = await createExamSchedule(scheduleForm);
    if (result) {
      setShowScheduleDialog(false);
      setScheduleForm({
        exam_type: '',
        term: '',
        start_date: '',
        end_date: '',
        class_names: [],
        subjects: []
      });
      fetchAllData();
    }
  };

  const handleUpdateSchedule = async () => {
    if (!editingSchedule) return;

    const result = await updateExamSchedule(editingSchedule.id, {
      ...scheduleForm,
      subject_name: scheduleForm.subjects[0]?.subject_name || '',
      exam_date: scheduleForm.subjects[0]?.exam_date || '',
      class_name: scheduleForm.class_names[0] || ''
    });
    if (result) {
      setShowScheduleDialog(false);
      setEditingSchedule(null);
      setScheduleForm({
        exam_type: '',
        term: '',
        start_date: '',
        end_date: '',
        class_names: [],
        subjects: []
      });
      fetchAllData();
    }
  };

  const handleApproveReject = async (requestId: number, action: 'APPROVE' | 'REJECT') => {
    const result = await handleApprovalRequest(requestId, action);
    if (result) {
      fetchAllData();
      requestSidebarCountsRefresh();
    }
  };



  // ==================== EFFECTS ====================
  useEffect(() => {
    setFilterClass('');
    setFilterTerm('');
    setSelectedExamType('');
    setClassResult(null);
    setSubjectAnalysis(null);
    setStudentResult(null);
    setStudentMarksDetail(null);
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchExamSchedules();
  }, [filterClass, filterTerm, selectedExamType, schoolScope.selectedSchoolId]);

  // ==================== RENDER COMPONENTS ====================
  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${getBgClass()}`}>
        <div className="p-6 sm:p-8 text-center">
          <div className="text-center">
            <div className="relative mx-auto w-16 h-16">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <School className="h-8 w-8 text-blue-600 animate-pulse" />
              </div>
            </div>
            <p className={combineClasses("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
            Loading Examination System...
            </p>
            <p className={combineClasses("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing examination records</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5 sm:mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={combineClasses(
                "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700" 
                  : "bg-gradient-to-br from-indigo-500 to-indigo-600"
              )}>
                <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className={combineClasses("text-2xl sm:text-3xl font-bold", get('text', 'primary'))}>
                  Examination Management
                </h1>
                <p className={combineClasses("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  Manage exam terms, schedules, results, and teacher approvals
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full lg:w-auto">
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              <div className={combineClasses(
                "flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border w-full",
                get('bg', 'card'),
                get('border', 'secondary')
              )}>
                <Search className={combineClasses("h-4 w-4", get('icon', 'secondary'))} />
                <input
                  type="text"
                  placeholder="Search exams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={combineClasses(
                    "bg-transparent border-none outline-none w-32 md:w-48",
                    get('text', 'primary')
                  )}
                />
              </div>
              <button 
                onClick={fetchAllData}
                disabled={isLoadingStats}
                className={combineClasses(
                  getSecondaryButtonClass(),
                  "w-full sm:w-auto flex items-center justify-center gap-2"
                )}
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingStats ? 'animate-spin' : ''}`} />
                {isLoadingStats ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combineClasses("text-sm font-medium", get('text', 'secondary'))}>Total Exams</p>
                  <p className={combineClasses("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {stats.totalExams}
                  </p>
                </div>
                <div className={combineClasses(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <BookOpen className={combineClasses(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combineClasses("mt-4 text-xs", get('accent', 'primary'))}>
                Active exam types
              </div>
            </div>
            
            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combineClasses("text-sm font-medium", get('text', 'secondary'))}>Active Schedules</p>
                  <p className={combineClasses("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {stats.totalSchedules}
                  </p>
                </div>
                <div className={combineClasses(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <Calendar className={combineClasses(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combineClasses("mt-4 text-xs", get('accent', 'success'))}>
                Exam schedules
              </div>
            </div>
            
            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combineClasses("text-sm font-medium", get('text', 'secondary'))}>Upcoming Exams</p>
                  <p className={combineClasses("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {stats.upcomingExams}
                  </p>
                </div>
                <div className={combineClasses(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <Clock className={combineClasses(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combineClasses("mt-4 text-xs", get('accent', 'warning'))}>
                Starting soon
              </div>
            </div>
            
            <div className={getStatsCardClass('pink')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combineClasses("text-sm font-medium", get('text', 'secondary'))}>Pending Approvals</p>
                  <p className={combineClasses("text-2xl sm:text-3xl font-bold mt-2", get('text', 'primary'))}>
                    {stats.pendingApprovals}
                  </p>
                </div>
                <div className={combineClasses(
                  "p-2.5 sm:p-3 rounded-xl",
                  theme === 'dark' ? 'bg-pink-900/30' : 'bg-pink-100'
                )}>
                  <AlertCircle className={combineClasses(
                    "h-5 w-5 sm:h-6 sm:w-6",
                    theme === 'dark' ? 'text-pink-400' : 'text-pink-600'
                  )} />
                </div>
              </div>
              <div className={combineClasses("mt-4 text-xs", get('accent', 'warning'))}>
                Awaiting review
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={getCardGradientClass('blue')}>
          {/* Tabs */}
          <div className={combineClasses("border-b", get('border', 'primary'))}>
            <div className="flex overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('overview')}
                className={getTabClass(activeTab === 'overview')}
              >
                <BarChart3 className="h-4 w-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('structure')}
                className={getTabClass(activeTab === 'structure')}
              >
                <Layers className="h-4 w-4" />
                Exam Structure
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={getTabClass(activeTab === 'schedule')}
              >
                <CalendarDays className="h-4 w-4" />
                Schedule
              </button>
              
              <button
                onClick={() => setActiveTab('approvals')}
                className={getTabClass(activeTab === 'approvals')}
              >
                <Shield className="h-4 w-4" />
                Approvals
                {stats.pendingApprovals > 0 && (
                  <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                    {stats.pendingApprovals}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-6">
            {/* ========== OVERVIEW TAB ========== */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 mb-6">
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={combineClasses(
                      "p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] text-left",
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-blue-900/20 to-blue-800/10 hover:from-blue-800/20 hover:to-blue-700/10' 
                        : 'bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200',
                      get('border', 'primary')
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={combineClasses(
                        "p-3 rounded-lg",
                        "bg-gradient-to-br from-blue-500 to-blue-600"
                      )}>
                        <Plus className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className={combineClasses("font-bold text-lg", get('text', 'primary'))}>Create Exam Term</h3>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>
                          Define new exam structure
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={combineClasses(
                      "p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] text-left",
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 hover:from-emerald-800/20 hover:to-emerald-700/10' 
                        : 'bg-gradient-to-br from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-200',
                      get('border', 'primary')
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={combineClasses(
                        "p-3 rounded-lg",
                        "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      )}>
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className={combineClasses("font-bold text-lg", get('text', 'primary'))}>Schedule Exams</h3>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>
                          Plan exam dates
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className={combineClasses(
                      "p-6 rounded-xl border transition-all duration-300 hover:scale-[1.02] text-left",
                      theme === 'dark' 
                        ? 'bg-gradient-to-br from-amber-900/20 to-amber-800/10 hover:from-amber-800/20 hover:to-amber-700/10' 
                        : 'bg-gradient-to-br from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200',
                      get('border', 'primary')
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={combineClasses(
                        "p-3 rounded-lg",
                        "bg-gradient-to-br from-amber-500 to-amber-600"
                      )}>
                        <FileCheck className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className={combineClasses("font-bold text-lg", get('text', 'primary'))}>Review Approvals</h3>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>
                          {stats.pendingApprovals} pending requests
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Upcoming Exams */}
                <div className={getCardGradientClass('indigo')}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={combineClasses("text-xl font-bold", get('text', 'primary'))}>
                      Upcoming Exams
                    </h3>
                    <span className={getStatusBadgeClass('blue')}>
                      {stats.upcomingExams} scheduled
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {examSchedules
                      .filter(schedule => getExamStatus(schedule) === 'upcoming')
                      .slice(0, 3)
                      .map((schedule) => (
                        <div
                          key={schedule.id}
                          className={combineClasses(
                            "p-4 rounded-lg border transition-all duration-300 hover:scale-[1.01]",
                            get('border', 'primary'),
                            get('bg', 'card')
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Calendar className={combineClasses("h-5 w-5", get('accent', 'primary'))} />
                              <div>
                                <h4 className={combineClasses("font-bold", get('text', 'primary'))}>{schedule.exam_type_name}</h4>
                                <p className={combineClasses("text-sm", get('text', 'secondary'))}>
                                  {schedule.classes.join(', ')} • {schedule.subjects.length} subjects
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={combineClasses("font-bold", get('text', 'primary'))}>{formatDate(schedule.start_date)}</p>
                              <p className={combineClasses("text-sm", get('text', 'secondary'))}>to {formatDate(schedule.end_date)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    
                    {stats.upcomingExams === 0 && (
                      <div className="text-center py-8">
                        <Calendar className={combineClasses("h-12 w-12 mx-auto mb-3", get('icon', 'secondary'))} />
                        <p className={combineClasses(get('text', 'tertiary'))}>No upcoming exams scheduled</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className={getCardGradientClass('green')}>
                    <h3 className={combineClasses("text-xl font-bold mb-4", get('text', 'primary'))}>
                      Recent Exam Terms
                    </h3>
                    <div className="space-y-3">
                      {examTerms.slice(0, 3).map((term) => (
                        <div
                          key={term.id}
                          className={combineClasses(
                            "flex items-center justify-between p-3 rounded-lg",
                            get('bg', 'secondary')
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <BookOpen className={combineClasses("h-5 w-5", get('accent', 'success'))} />
                            <div>
                              <p className={combineClasses("font-medium", get('text', 'primary'))}>{term.name}</p>
                              <p className={combineClasses("text-sm", get('text', 'secondary'))}>{term.exams.length} exams</p>
                            </div>
                          </div>
                          <span className={getStatusBadgeClass('gray')}>
                            Rank: {term.rank}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className={getCardGradientClass('purple')}>
                    <h3 className={combineClasses("text-xl font-bold mb-4", get('text', 'primary'))}>
                      Quick Stats
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className={combineClasses(get('text', 'secondary'))}>Ongoing Exams</span>
                        <span className={combineClasses("font-bold text-lg", get('text', 'primary'))}>{stats.ongoingExams}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={combineClasses(get('text', 'secondary'))}>Classes Covered</span>
                        <span className={combineClasses("font-bold text-lg", get('text', 'primary'))}>{stats.totalClasses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={combineClasses(get('text', 'secondary'))}>Total Subjects</span>
                        <span className={combineClasses("font-bold text-lg", get('text', 'primary'))}>{stats.totalSubjects}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ========== EXAM STRUCTURE TAB ========== */}
            {activeTab === 'structure' && (
              <ExamStructureTab
                examTerms={examTerms}
                termForm={termForm}
                setTermForm={setTermForm}
                selectedTerm={selectedTerm}
                showTermDialog={showTermDialog}
                setShowTermDialog={setShowTermDialog}
                setSelectedTerm={setSelectedTerm}
                handleCreateTerm={handleCreateTerm}
                handleUpdateTerm={handleUpdateTerm}
                handleDeleteTerm={deleteExamTerm}
                isCreatingTerm={isCreatingTerm}
                isDeleting={isDeleting}
                theme={theme}
                getInputClass={getInputClass}
                getPrimaryButtonClass={getPrimaryButtonClass}
                getSecondaryButtonClass={getSecondaryButtonClass}
                getStatusBadgeClass={getStatusBadgeClass}
                getCardGradientClass={getCardGradientClass}
                combineClasses={combineClasses}
                get={get}
              />
            )}

            {/* ========== SCHEDULE TAB ========== */}
            {activeTab === 'schedule' && (
              <ScheduleTab
                examSchedules={examSchedules}
                examTerms={examTerms}
                availableClasses={availableClasses}
                schoolScopeParams={schoolScope.scopeParams}
                schoolScopeKey={schoolScope.selectedSchoolId}
                filterClass={filterClass}
                setFilterClass={setFilterClass}
                filterTerm={filterTerm}
                setFilterTerm={setFilterTerm}
                filterStatus={filterStatus}
                setFilterStatus={setFilterStatus}
                viewMode={viewMode}
                setViewMode={setViewMode}
                showScheduleDialog={showScheduleDialog}
                setShowScheduleDialog={setShowScheduleDialog}
                editingSchedule={editingSchedule}
                scheduleForm={scheduleForm}
                setScheduleForm={setScheduleForm}
                setEditingSchedule={setEditingSchedule}
                handleCreateSchedule={handleCreateSchedule}
                handleUpdateSchedule={handleUpdateSchedule}
                handleDeleteSchedule={deleteExamSchedule}
                isCreatingSchedule={isCreatingSchedule}
                isDeleting={isDeleting}
                theme={theme}
                getInputClass={getInputClass}
                getPrimaryButtonClass={getPrimaryButtonClass}
                getSecondaryButtonClass={getSecondaryButtonClass}
                getStatusBadgeClass={getStatusBadgeClass}
                getCardGradientClass={getCardGradientClass}
                getExamStatus={getExamStatus}
                formatDate={formatDate}
                combineClasses={combineClasses}
                get={get}
              />
            )}

            {/* ========== APPROVALS TAB ========== */}
            {activeTab === 'approvals' && (
              <ApprovalsTab
                pendingRequests={pendingRequests}
                handleApproveReject={handleApproveReject}
                theme={theme}
                getCardGradientClass={getCardGradientClass}
                getStatusBadgeClass={getStatusBadgeClass}
                getPrimaryButtonClass={getPrimaryButtonClass}
                getSecondaryButtonClass={getSecondaryButtonClass}
                formatDate={formatDate}
                combineClasses={combineClasses}
                get={get}
              />
            )}
          </div>
        </div>
      </div>

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// ==================== SUB-COMPONENTS ====================

interface ExamStructureTabProps {
  examTerms: ExamTerm[];
  termForm: any;
  setTermForm: (form: any) => void;
  selectedTerm: ExamTerm | null;
  showTermDialog: boolean;
  setShowTermDialog: (show: boolean) => void;
  setSelectedTerm: (term: ExamTerm | null) => void;
  handleCreateTerm: () => Promise<void>;
  handleUpdateTerm: () => Promise<void>;
  handleDeleteTerm: (id: number) => Promise<boolean>;
  isCreatingTerm: boolean;
  isDeleting: number | null;
  theme: string;
  getInputClass: () => string;
  getPrimaryButtonClass: () => string;
  getSecondaryButtonClass: () => string;
  getStatusBadgeClass: (type: string) => string;
  getCardGradientClass: (color?: string) => string;
  combineClasses: (...classes: (string | undefined)[]) => string;
  get: (type: any, value: any) => any;
}

const ExamStructureTab: React.FC<ExamStructureTabProps> = ({
  examTerms,
  termForm,
  setTermForm,
  selectedTerm,
  showTermDialog,
  setShowTermDialog,
  setSelectedTerm,
  handleCreateTerm,
  handleUpdateTerm,
  handleDeleteTerm,
  isCreatingTerm,
  isDeleting,
  theme,
  getInputClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getStatusBadgeClass,
  getCardGradientClass,
  combineClasses,
  get
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTermId, setDeletingTermId] = useState<number | null>(null);

  // Handle delete click with confirmation
  const handleDeleteClick = (termId: number) => {
    setDeletingTermId(termId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deletingTermId) {
      await handleDeleteTerm(deletingTermId);
      setShowDeleteConfirm(false);
      setDeletingTermId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal for Exam Term */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getCardGradientClass('red') + " max-w-md w-full shadow-2xl"}>
            <div className="text-center">
              <div className={combineClasses(
                "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <Trash2 className={combineClasses(
                  "h-4 sm:h-5 w-4 sm:w-5",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )} />
              </div>
              <h3 className={combineClasses("text-base sm:text-lg font-bold mb-1 sm:mb-1.5", get('text', 'primary'))}>
                Delete Exam Term
              </h3>
              <p className={combineClasses("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                Are you sure you want to delete this exam term and all its associated exams? This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={combineClasses(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
                  disabled={isDeleting === deletingTermId}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting === deletingTermId}
                  className={combineClasses(
                    getPrimaryButtonClass(),
                    "text-xs sm:text-sm flex-1",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  )}
                >
                  {isDeleting === deletingTermId ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTermDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={getCardGradientClass('blue') + " w-full max-w-2xl"}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={combineClasses("text-xl font-bold", get('text', 'primary'))}>
                {selectedTerm ? 'Edit Exam Term' : 'New Exam Term'}
              </h3>
              <button
                onClick={() => {
                  setShowTermDialog(false);
                  setSelectedTerm(null);
                  setTermForm({ name: '', rank: 1, exams: [] });
                }}
                className={combineClasses(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Term Name *</label>
                <input
                  type="text"
                  value={termForm.name}
                  onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                  placeholder="e.g., Term 1, Semester 1"
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Rank (Order) *</label>
                <input
                  type="number"
                  value={termForm.rank}
                  onChange={(e) => setTermForm({ ...termForm, rank: parseInt(e.target.value) || 1 })}
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Exams</label>
                {termForm.exams.map((exam: any, index: number) => (
                  <div key={index} className="flex gap-2 mb-3">
                    <input
                      value={exam.name}
                      onChange={(e) => {
                        const newExams = [...termForm.exams];
                        newExams[index].name = e.target.value;
                        setTermForm({ ...termForm, exams: newExams });
                      }}
                      placeholder="Exam name"
                      className={getInputClass()}
                    />
                    <input
                      type="number"
                      value={exam.max_marks}
                      onChange={(e) => {
                        const newExams = [...termForm.exams];
                        newExams[index].max_marks = parseFloat(e.target.value) || 100;
                        setTermForm({ ...termForm, exams: newExams });
                      }}
                      placeholder="Max marks"
                      className={getInputClass()}
                    />
                    <input
                      type="number"
                      value={exam.rank}
                      onChange={(e) => {
                        const newExams = [...termForm.exams];
                        newExams[index].rank = parseInt(e.target.value) || 1;
                        setTermForm({ ...termForm, exams: newExams });
                      }}
                      placeholder="Rank"
                      className={getInputClass()}
                    />
                    <button
                      onClick={() => {
                        const newExams = termForm.exams.filter((_: any, i: number) => i !== index);
                        setTermForm({ ...termForm, exams: newExams });
                      }}
                      className={combineClasses(
                        "p-3 rounded-xl transition-all",
                        theme === 'dark' 
                          ? 'text-red-400 hover:bg-red-900/30' 
                          : 'text-red-500 hover:bg-red-100'
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setTermForm({
                    ...termForm,
                    exams: [...termForm.exams, { name: '', max_marks: 100, rank: termForm.exams.length + 1 }]
                  })}
                  className={combineClasses(getSecondaryButtonClass(), "w-full")}
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Add Exam
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={selectedTerm ? handleUpdateTerm : handleCreateTerm}
                  disabled={isCreatingTerm || !termForm.name.trim()}
                  className={combineClasses(
                    getPrimaryButtonClass(),
                    (isCreatingTerm || !termForm.name.trim()) ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  {isCreatingTerm ? 'Saving...' : selectedTerm ? 'Update Term' : 'Create Term'}
                </button>
                <button
                  onClick={() => {
                    setShowTermDialog(false);
                    setSelectedTerm(null);
                    setTermForm({ name: '', rank: 1, exams: [] });
                  }}
                  className={getSecondaryButtonClass()}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className={combineClasses("text-xl font-bold", get('text', 'primary'))}>Exam Terms</h3>
          <p className={combineClasses("text-sm", get('text', 'secondary'))}>Manage all exam structures</p>
        </div>
        <button
          onClick={() => setShowTermDialog(true)}
          className={getPrimaryButtonClass()}
        >
          <span className='flex items-center'>
<Plus className="h-4 w-4 mr-2" />
          New Term
          </span>
          
        </button>
      </div>

      {/* Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {examTerms.map((term) => (
          <div key={term.id} className={getCardGradientClass()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className={combineClasses("font-bold text-lg mb-1", get('text', 'primary'))}>{term.name}</h4>
                <span className={getStatusBadgeClass('gray')}>
                  Rank: {term.rank}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedTerm(term);
                    setTermForm({
                      name: term.name,
                      rank: term.rank,
                      exams: term.exams.map(exam => ({
                        name: exam.name,
                        max_marks: exam.max_marks,
                        rank: exam.rank
                      }))
                    });
                    setShowTermDialog(true);
                  }}
                  className={combineClasses(
                    "p-2 rounded-xl transition-all",
                    theme === 'dark' 
                      ? 'hover:bg-blue-900/30 text-blue-300' 
                      : 'hover:bg-blue-50 text-blue-600'
                  )}
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteClick(term.id)}
                  disabled={isDeleting === term.id}
                  className={combineClasses(
                    "p-2 rounded-xl transition-all",
                    theme === 'dark' 
                      ? 'hover:bg-red-900/30 text-red-400' 
                      : 'hover:bg-red-50 text-red-500'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="space-y-2">
              {term.exams.map((exam) => (
                <div
                  key={exam.id}
                  className={combineClasses(
                    "p-3 rounded-lg border",
                    theme === 'dark' 
                      ? 'border-gray-700 bg-gray-800/50' 
                      : 'border-gray-200 bg-white/50'
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={combineClasses("font-medium", get('text', 'primary'))}>{exam.name}</p>
                      <p className={combineClasses("text-sm", get('text', 'secondary'))}>Max: {exam.max_marks} marks</p>
                    </div>
                    <span className={getStatusBadgeClass('blue')}>
                      Rank: {exam.rank}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {term.exams.length === 0 && (
              <div className={combineClasses("text-center py-4", get('text', 'tertiary'))}>
                No exams added yet
              </div>
            )}
          </div>
        ))}
        
        {examTerms.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <BookOpen className={combineClasses("h-12 w-12 mx-auto mb-3", get('icon', 'secondary'))} />
            <p className={combineClasses(get('text', 'tertiary'))}>No exam terms created yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface ScheduleTabProps {
  examSchedules: ExamSchedule[];
  examTerms: ExamTerm[];
  availableClasses: Class[];
  schoolScopeParams?: { school_id?: number };
  schoolScopeKey?: string;
  filterClass: string;
  setFilterClass: (cls: string) => void;
  filterTerm: string;
  setFilterTerm: (term: string) => void;
  filterStatus: string;
  setFilterStatus: (status: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  showScheduleDialog: boolean;
  setShowScheduleDialog: (show: boolean) => void;
  editingSchedule: ExamSchedule | null;
  scheduleForm: any;
  setScheduleForm: (form: any) => void;
  setEditingSchedule: (schedule: ExamSchedule | null) => void;
  handleCreateSchedule: () => Promise<void>;
  handleUpdateSchedule: () => Promise<void>;
  handleDeleteSchedule: (id: number) => Promise<boolean>;
  isCreatingSchedule: boolean;
  isDeleting: number | null;
  theme: string;
  getInputClass: () => string;
  getPrimaryButtonClass: () => string;
  getSecondaryButtonClass: () => string;
  getStatusBadgeClass: (type: string) => string;
  getCardGradientClass: (color?: string) => string;
  getExamStatus: (schedule: ExamSchedule) => string;
  formatDate: (date: string) => string;
  combineClasses: (...classes: (string | undefined)[]) => string;
  get: (type: any, value: any) => any;
}

const ScheduleTab: React.FC<ScheduleTabProps> = ({
  examSchedules,
  examTerms,
  availableClasses,
  schoolScopeParams,
  schoolScopeKey,
  filterClass,
  setFilterClass,
  filterTerm,
  setFilterTerm,
  filterStatus,
  setFilterStatus,
  viewMode,
  setViewMode,
  showScheduleDialog,
  setShowScheduleDialog,
  editingSchedule,
  scheduleForm,
  setScheduleForm,
  setEditingSchedule,
  handleCreateSchedule,
  handleUpdateSchedule,
  handleDeleteSchedule,
  isCreatingSchedule,
  isDeleting,
  theme,
  getInputClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  getStatusBadgeClass,
  getCardGradientClass,
  getExamStatus,
  formatDate,
  combineClasses,
  get
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingScheduleId, setDeletingScheduleId] = useState<number | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ExamSchedule | null>(null);
  const [classSubjects, setClassSubjects] = useState<SubjectOption[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  const selectedClassName = scheduleForm.class_names?.[0] || '';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'blue';
      case 'ongoing': return 'green';
      case 'completed': return 'gray';
      default: return 'blue';
    }
  };

  // Helper function to find term name from exam type
  const findTermFromExamType = (examTypeName: string, examTypeId?: number): string => {
    if (examTypeId) {
      for (const term of examTerms) {
        const foundById = term.exams.find(exam => exam.id === examTypeId);
        if (foundById) return term.name;
      }
    }

    for (const term of examTerms) {
      const found = term.exams.find(exam => exam.name === examTypeName);
      if (found) return term.name;
    }
    return '';
  };

  // Helper function to clean class name (remove "Class " prefix if present)
  const cleanClassName = (className: string): string => {
    return className.replace(/^Class\s+/, '');
  };

  const normalizeSubjectName = (subject: string): string => (
    subject
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, ' ')
      .replace(/[\/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mathematics: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    maths: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    english: { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' },
    science: { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'general science': { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'social studies': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    sanskrit: { bg: '#78350F', text: '#FFFFFF', border: '#78350F' },
    malayalam: { bg: '#047857', text: '#FFFFFF', border: '#047857' },
    telugu: { bg: '#0891B2', text: '#FFFFFF', border: '#0891B2' },
    kannada: { bg: '#115E59', text: '#FFFFFF', border: '#115E59' },
    urdu: { bg: '#064E3B', text: '#FFFFFF', border: '#064E3B' },
    french: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    'business studies': { bg: '#7F1D1D', text: '#FFFFFF', border: '#7F1D1D' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    commerce: { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    'commerce general': { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    civics: { bg: '#334155', text: '#FFFFFF', border: '#334155' },
    'political science': { bg: '#581C87', text: '#FFFFFF', border: '#581C87' },
    psychology: { bg: '#BE185D', text: '#FFFFFF', border: '#BE185D' },
    sociology: { bg: '#4D7C0F', text: '#FFFFFF', border: '#4D7C0F' },
    'physical education': { bg: '#059669', text: '#FFFFFF', border: '#059669' },
    yoga: { bg: '#2DD4BF', text: '#111827', border: '#2DD4BF' },
    art: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    drawing: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    'art drawing': { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value education': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'moral science value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'environmental studies': { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];

    const cleaned = normalized
      .replace(/\b(subject|theory|practical|lab|core|elective)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (SUBJECT_COLOR_MAP[cleaned]) return SUBJECT_COLOR_MAP[cleaned];

    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }
    return null;
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const selectedTermData = examTerms.find((term) => term.name === scheduleForm.term);
  const filteredExamTypes = selectedTermData?.exams || [];

  // Handle edit click
  const handleEditClick = (schedule: ExamSchedule) => {
    const termName = findTermFromExamType(schedule.exam_type_name, schedule.exam_type_id);
    
    // Clean class names (remove "Class " prefix)
    const cleanedClasses = schedule.classes.map(cls => cleanClassName(cls));
    
    setScheduleForm({
      exam_type: schedule.exam_type_name,
      term: termName,
      start_date: schedule.start_date,
      end_date: schedule.end_date,
      // New schedule UI supports one class selection via dropdown
      class_names: cleanedClasses.length ? [cleanedClasses[0]] : [],
      subjects: schedule.subjects.map(sub => ({
        subject_name: sub.subject_name,
        exam_date: sub.exam_date,
        duration: sub.duration,
        session: sub.session
      }))
    });
    setEditingSchedule(schedule);
    setShowScheduleDialog(true);
  };

  // Handle delete click with confirmation
  const handleDeleteClick = (scheduleId: number) => {
    setDeletingScheduleId(scheduleId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (deletingScheduleId) {
      await handleDeleteSchedule(deletingScheduleId);
      setShowDeleteConfirm(false);
      setDeletingScheduleId(null);
    }
  };

  useEffect(() => {
    const loadSubjectsByClass = async () => {
      if (!selectedClassName) {
        setClassSubjects([]);
        return;
      }

      setIsLoadingSubjects(true);
      try {
        const response = await adminApi.subjects.viewByClass(selectedClassName, schoolScopeParams);
        const payload = response?.data;
        const subjects = Array.isArray(payload?.subjects) ? payload.subjects : [];
        setClassSubjects(subjects);
      } catch {
        setClassSubjects([]);
        toastError('Failed to load subjects for selected class');
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadSubjectsByClass();
  }, [selectedClassName, schoolScopeKey]);

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={getCardGradientClass('red') + " max-w-md w-full shadow-2xl"}>
            <div className="text-center">
              <div className={combineClasses(
                "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-2 mb-3",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <Trash2 className={combineClasses(
                  "h-4 sm:h-5 w-4 sm:w-5",
                  theme === 'dark' ? 'text-red-400' : 'text-red-600'
                )} />
              </div>
              <h3 className={combineClasses("text-base sm:text-lg font-bold mb-1 sm:mb-1.5", get('text', 'primary'))}>
                Delete Schedule
              </h3>
              <p className={combineClasses("text-xs sm:text-sm mb-3 sm:mb-4", get('text', 'secondary'))}>
                Are you sure you want to delete this exam schedule? This action cannot be undone.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className={combineClasses(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
                  disabled={isDeleting === deletingScheduleId}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting === deletingScheduleId}
                  className={combineClasses(
                    getPrimaryButtonClass(),
                    "text-xs sm:text-sm flex-1",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                  )}
                >
                  {isDeleting === deletingScheduleId ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={combineClasses(getCardGradientClass('blue'), "w-full max-w-3xl max-h-[90vh] overflow-y-auto")}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h3 className={combineClasses("text-xl font-bold", get('text', 'primary'))}>
                  {selectedSchedule.exam_type_name} - Full Schedule
                </h3>
                <p className={combineClasses("text-sm mt-1", get('text', 'secondary'))}>
                  {formatDate(selectedSchedule.start_date)} - {formatDate(selectedSchedule.end_date)} • {selectedSchedule.subjects.length} subjects
                </p>
              </div>
              <button
                onClick={() => setSelectedSchedule(null)}
                className={combineClasses(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
                aria-label="Close schedule details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4">
              <p className={combineClasses("text-sm font-medium mb-2", get('text', 'primary'))}>Classes</p>
              <div className="flex flex-wrap gap-2">
                {selectedSchedule.classes.map((cls) => (
                  <span key={cls} className={getStatusBadgeClass('blue')}>
                    {cls}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className={combineClasses("text-sm font-medium mb-2", get('text', 'primary'))}>Subjects</p>
              {selectedSchedule.subjects.length === 0 ? (
                <p className={combineClasses("text-sm", get('text', 'tertiary'))}>No subjects scheduled.</p>
              ) : (
                <div className="space-y-2">
                  {selectedSchedule.subjects.map((sub, idx) => {
                    const subjectColor = getSubjectColor(sub.subject_name);
                    return (
                      <div
                        key={`${sub.subject_name}-${idx}`}
                        className={combineClasses(
                          "p-3 rounded-xl border",
                          !subjectColor ? combineClasses(get('border', 'secondary'), get('bg', 'card')) : ''
                        )}
                        style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                      >
                        <p
                          className={combineClasses("font-medium", !subjectColor ? get('text', 'primary') : '')}
                          style={subjectColor ? { color: subjectColor.text } : undefined}
                        >
                          {sub.subject_name}
                        </p>
                        <p
                          className={combineClasses("text-sm", !subjectColor ? get('text', 'secondary') : '')}
                          style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                        >
                          {formatDate(sub.exam_date)} • {sub.session} • {sub.duration}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showScheduleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className={combineClasses(getCardGradientClass('blue'), "w-full max-w-4xl max-h-[90vh] overflow-y-auto")}>
            <div className="flex items-center justify-between gap-3 mb-6">
              <h3 className={combineClasses("text-xl font-bold", get('text', 'primary'))}>
                {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
              </h3>
              <button
                onClick={() => {
                  setShowScheduleDialog(false);
                  setEditingSchedule(null);
                  setScheduleForm({
                    exam_type: '',
                    term: '',
                    start_date: '',
                    end_date: '',
                    class_names: [],
                    subjects: []
                  });
                }}
                className={combineClasses(
                  "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                  get('icon', 'secondary')
                )}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Term *</label>
                  <select
                    value={scheduleForm.term}
                    onChange={(e) => {
                      const nextTerm = e.target.value;
                      const nextTermData = examTerms.find(term => term.name === nextTerm);
                      const nextTermExamNames = new Set((nextTermData?.exams || []).map(exam => exam.name));
                      const keepExamType = scheduleForm.exam_type && nextTermExamNames.has(scheduleForm.exam_type);

                      setScheduleForm({
                        ...scheduleForm,
                        term: nextTerm,
                        exam_type: keepExamType ? scheduleForm.exam_type : ''
                      });
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select term</option>
                    {examTerms.map(term => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Exam Type *</label>
                  <select
                    value={scheduleForm.exam_type}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, exam_type: e.target.value })}
                    className={getInputClass()}
                    disabled={!scheduleForm.term}
                  >
                    <option value="">Select exam type</option>
                    {filteredExamTypes.map(exam => (
                      <option key={exam.id} value={exam.name}>
                        {exam.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Start Date *</label>
                  <input
                    type="date"
                    value={scheduleForm.start_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_date: e.target.value })}
                    className={getInputClass()}
                  />
                </div>
                <div>
                  <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>End Date *</label>
                  <input
                    type="date"
                    value={scheduleForm.end_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_date: e.target.value })}
                    className={getInputClass()}
                  />
                </div>
              </div>

              <div>
                <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Classes *</label>
                <select
                  value={selectedClassName}
                  onChange={(e) => {
                    const className = e.target.value;
                    setScheduleForm({
                      ...scheduleForm,
                      class_names: className ? [className] : [],
                      subjects: (scheduleForm.subjects || []).map((subject: any) => ({
                        ...subject,
                        subject_name: ''
                      }))
                    });
                  }}
                  className={getInputClass()}
                >
                  <option value="">Select class</option>
                  {availableClasses.map((cls) => (
                    <option key={cls.id} value={cls.name}>
                      Class {cls.name}
                    </option>
                  ))}
                </select>
                <p className={combineClasses("text-xs mt-2", get('text', 'tertiary'))}>
                  {selectedClassName ? `Selected: Class ${selectedClassName}` : 'No class selected'}
                </p>
              </div>

              <div>
                <label className={combineClasses("block text-sm font-medium mb-2", get('text', 'primary'))}>Subjects</label>
                {scheduleForm.subjects.map((subject: any, index: number) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                    <select
                      value={subject.subject_name}
                      onChange={(e) => {
                        const newSubjects = [...scheduleForm.subjects];
                        newSubjects[index].subject_name = e.target.value;
                        setScheduleForm({ ...scheduleForm, subjects: newSubjects });
                      }}
                      className={getInputClass()}
                      disabled={!selectedClassName || isLoadingSubjects}
                    >
                      <option value="">
                        {!selectedClassName
                          ? 'Select class first'
                          : isLoadingSubjects
                            ? 'Loading subjects...'
                            : 'Select subject'}
                      </option>
                      {classSubjects.map((subj) => (
                        <option key={subj.id} value={subj.name}>
                          {subj.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={subject.exam_date}
                      onChange={(e) => {
                        const newSubjects = [...scheduleForm.subjects];
                        newSubjects[index].exam_date = e.target.value;
                        setScheduleForm({ ...scheduleForm, subjects: newSubjects });
                      }}
                      className={getInputClass()}
                    />
                    <select
                      value={subject.session}
                      onChange={(e) => {
                        const newSubjects = [...scheduleForm.subjects];
                        newSubjects[index].session = e.target.value;
                        setScheduleForm({ ...scheduleForm, subjects: newSubjects });
                      }}
                      className={getInputClass()}
                    >
                      <option value="FN">Forenoon</option>
                      <option value="AN">Afternoon</option>
                    </select>
                    <div className="flex gap-2">
                      <input
                        value={subject.duration}
                        onChange={(e) => {
                          const newSubjects = [...scheduleForm.subjects];
                          newSubjects[index].duration = e.target.value;
                          setScheduleForm({ ...scheduleForm, subjects: newSubjects });
                        }}
                        placeholder="Duration"
                        className={getInputClass()}
                      />
                      <button
                        onClick={() => {
                          const newSubjects = scheduleForm.subjects.filter((_: any, i: number) => i !== index);
                          setScheduleForm({ ...scheduleForm, subjects: newSubjects });
                        }}
                        className={combineClasses(
                          "p-3 rounded-xl transition-all",
                          theme === 'dark' 
                            ? 'text-red-400 hover:bg-red-900/30' 
                            : 'text-red-500 hover:bg-red-100'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (!selectedClassName) {
                      toastWarning('Please select class first');
                      return;
                    }
                    setScheduleForm({
                      ...scheduleForm,
                      subjects: [...scheduleForm.subjects, {
                        subject_name: '',
                        exam_date: scheduleForm.start_date || '',
                        duration: '3 hours',
                        session: 'FN'
                      }]
                    });
                  }}
                  disabled={!selectedClassName}
                  className={combineClasses(
                    getSecondaryButtonClass(),
                    "w-full",
                    !selectedClassName ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  <Plus className="h-4 w-4 mr-2 inline" />
                  Add Subject
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                  disabled={isCreatingSchedule}
                  className={combineClasses(
                    getPrimaryButtonClass(),
                    "w-full sm:w-auto",
                    isCreatingSchedule ? 'opacity-50 cursor-not-allowed' : ''
                  )}
                >
                  {isCreatingSchedule ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                </button>
                <button
                  onClick={() => {
                    setShowScheduleDialog(false);
                    setEditingSchedule(null);
                    setScheduleForm({
                      exam_type: '',
                      term: '',
                      start_date: '',
                      end_date: '',
                      class_names: [],
                      subjects: []
                    });
                  }}
                  className={combineClasses(getSecondaryButtonClass(), "w-full sm:w-auto")}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters + View Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 sm:gap-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 w-full xl:w-auto">
          <div className={combineClasses(
            "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border h-10 w-full min-w-0",
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
            <Filter className={combineClasses("h-4 w-4", get('icon', 'secondary'))} />
            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className={combineClasses(
                "bg-transparent border-none outline-none text-xs sm:text-sm w-full min-w-0",
                get('text', 'primary')
              )}
            >
              <option value="">All Classes</option>
              {availableClasses.map(cls => (
                <option key={cls.id} value={cls.name}>Class {cls.name}</option>
              ))}
            </select>
          </div>
          
          <div className={combineClasses(
            "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border h-10 w-full min-w-0",
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
            <Tag className={combineClasses("h-4 w-4", get('icon', 'secondary'))} />
            <select
              value={filterTerm}
              onChange={(e) => setFilterTerm(e.target.value)}
              className={combineClasses(
                "bg-transparent border-none outline-none text-xs sm:text-sm w-full min-w-0",
                get('text', 'primary')
              )}
            >
              <option value="">All Terms</option>
              {examTerms.map(term => (
                <option key={term.id} value={term.name}>{term.name}</option>
              ))}
            </select>
          </div>
          
          <div className={combineClasses(
            "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border h-10 w-full min-w-0",
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
            <Clock className={combineClasses("h-4 w-4", get('icon', 'secondary'))} />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={combineClasses(
                "bg-transparent border-none outline-none text-xs sm:text-sm w-full min-w-0",
                get('text', 'primary')
              )}
            >
              <option value="">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 w-full xl:w-auto justify-between sm:justify-start">
          <div className={combineClasses(
            "flex rounded-xl border overflow-hidden h-10 flex-shrink-0",
            get('border', 'secondary')
          )}>
            <button
              onClick={() => setViewMode('grid')}
              className={combineClasses(
                "h-full px-3 transition-all",
                viewMode === 'grid' 
                  ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={combineClasses(
                "h-full px-3 transition-all",
                viewMode === 'list' 
                  ? theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                  : theme === 'dark' ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={() => setShowScheduleDialog(true)}
            className={combineClasses(getPrimaryButtonClass(), "px-4 whitespace-nowrap flex-shrink-0")}
          >
            New Schedule
          </button>
        </div>
      </div>

      {/* Schedules */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {examSchedules
            .filter(schedule => {
              if (filterClass) {
                // Clean class names for comparison
                const cleanClasses = schedule.classes.map(cls => cleanClassName(cls));
                if (!cleanClasses.includes(filterClass)) return false;
              }
              if (filterStatus) {
                const status = getExamStatus(schedule);
                if (status !== filterStatus) return false;
              }
              return true;
            })
            .map((schedule) => {
              const status = getExamStatus(schedule);
              const statusColor = getStatusColor(status);
              
              return (
                <div key={schedule.id} className={getCardGradientClass()}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={combineClasses("font-bold text-lg mb-1", get('text', 'primary'))}>{schedule.exam_type_name}</h4>
                      <div className="flex flex-wrap gap-1">
                        {schedule.classes.slice(0, 3).map(cls => (
                          <span key={cls} className={getStatusBadgeClass('blue')}>
                            {cls}
                          </span>
                        ))}
                        {schedule.classes.length > 3 && (
                          <span className={combineClasses("text-xs", get('text', 'tertiary'))}>
                            +{schedule.classes.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditClick(schedule)}
                        className={combineClasses(
                          "p-2 rounded-xl transition-all",
                          theme === 'dark' 
                            ? 'hover:bg-blue-900/30 text-blue-300' 
                            : 'hover:bg-blue-50 text-blue-600'
                        )}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(schedule.id)}
                        disabled={isDeleting === schedule.id}
                        className={combineClasses(
                          "p-2 rounded-xl transition-all",
                          theme === 'dark' 
                            ? 'hover:bg-red-900/30 text-red-400' 
                            : 'hover:bg-red-50 text-red-500'
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className={combineClasses("flex items-center gap-2 text-sm", get('text', 'secondary'))}>
                      <Calendar className="h-4 w-4" />
                      {formatDate(schedule.start_date)} - {formatDate(schedule.end_date)}
                    </div>
                    <div className="mt-2">
                      <span className={getStatusBadgeClass(statusColor)}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className={combineClasses("text-sm font-medium", get('text', 'primary'))}>Subjects:</p>
                    {schedule.subjects.slice(0, 3).map((sub, idx) => {
                      const subjectColor = getSubjectColor(sub.subject_name);
                      return (
                        <div
                          key={idx}
                          className={combineClasses(
                            "text-sm p-2 rounded border",
                            !subjectColor ? (theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50') : ''
                          )}
                          style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                        >
                          <div
                            className={combineClasses("font-medium", !subjectColor ? get('text', 'primary') : '')}
                            style={subjectColor ? { color: subjectColor.text } : undefined}
                          >
                            {sub.subject_name}
                          </div>
                          <div
                            className={combineClasses("text-xs", !subjectColor ? get('text', 'secondary') : '')}
                            style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                          >
                            {formatDate(sub.exam_date)} • {sub.session} • {sub.duration}
                          </div>
                        </div>
                      );
                    })}
                    {schedule.subjects.length > 3 && (
                      <button
                        type="button"
                        onClick={() => setSelectedSchedule(schedule)}
                        className={combineClasses(
                          "w-full text-center text-sm transition-colors hover:underline",
                          get('text', 'tertiary')
                        )}
                      >
                        +{schedule.subjects.length - 3} more subjects
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          
          {examSchedules.length === 0 && (
            <div className="col-span-3 text-center py-12">
              <Calendar className={combineClasses("h-12 w-12 mx-auto mb-3", get('icon', 'secondary'))} />
              <p className={combineClasses(get('text', 'tertiary'))}>No exam schedules found</p>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[900px] xl:min-w-full">
            <thead className={combineClasses(
              "",
              get('bg', 'secondary')
            )}>
              <tr>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Exam</th>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Classes</th>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Dates</th>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Subjects</th>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Status</th>
                <th className={combineClasses("px-3 sm:px-4 lg:px-6 py-3 text-left text-xs sm:text-sm font-semibold whitespace-nowrap", get('text', 'primary'))}>Actions</th>
              </tr>
            </thead>
            <tbody className={combineClasses(
              "divide-y",
              get('border', 'primary')
            )}>
              {examSchedules
                .filter(schedule => {
                  if (filterClass) {
                    const cleanClasses = schedule.classes.map(cls => cleanClassName(cls));
                    if (!cleanClasses.includes(filterClass)) return false;
                  }
                  if (filterStatus) {
                    const status = getExamStatus(schedule);
                    if (status !== filterStatus) return false;
                  }
                  return true;
                })
                .map((schedule) => {
                  const status = getExamStatus(schedule);
                  const statusColor = getStatusColor(status);
                  
                  return (
                    <tr key={schedule.id} className={combineClasses(
                      "hover:bg-[var(--color-bg-hover)]",
                      get('bg', 'card')
                    )}>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <div className={combineClasses("font-medium", get('text', 'primary'))}>{schedule.exam_type_name}</div>
                        <div className={combineClasses("text-sm", get('text', 'secondary'))}>
                          Created: {formatDate(schedule.created_at)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <div className="flex flex-wrap gap-1">
                          {schedule.classes.slice(0, 2).map(cls => (
                            <span key={cls} className={getStatusBadgeClass('blue')}>
                              {cls}
                            </span>
                          ))}
                          {schedule.classes.length > 2 && (
                            <span className={combineClasses("text-xs", get('text', 'tertiary'))}>
                              +{schedule.classes.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <div className={combineClasses("text-sm", get('text', 'primary'))}>
                          {formatDate(schedule.start_date)}<br/>
                          to {formatDate(schedule.end_date)}
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <div className={combineClasses("text-sm", get('text', 'primary'))}>
                          {schedule.subjects.length} subjects
                        </div>
                        {(() => {
                          const nextSubject = schedule.subjects[0]?.subject_name;
                          if (!nextSubject) {
                            return <div className={combineClasses("text-xs", get('text', 'tertiary'))}>Next: -</div>;
                          }
                          const subjectColor = getSubjectColor(nextSubject);
                          return (
                            <div className="mt-1">
                              <span
                                className={combineClasses(
                                  "inline-block text-xs px-2 py-1 rounded-full border",
                                  !subjectColor ? get('text', 'tertiary') : ''
                                )}
                                style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                              >
                                Next: {nextSubject}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <span className={getStatusBadgeClass(statusColor)}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSchedule(schedule)}
                            className={combineClasses(
                              "p-2 rounded-xl transition-all",
                              theme === 'dark'
                                ? 'hover:bg-gray-700 text-gray-300'
                                : 'hover:bg-gray-100 text-gray-700'
                            )}
                            title="View full schedule"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditClick(schedule)}
                            className={combineClasses(
                              "p-2 rounded-xl transition-all",
                              theme === 'dark' 
                                ? 'hover:bg-blue-900/30 text-blue-300' 
                                : 'hover:bg-blue-50 text-blue-600'
                            )}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(schedule.id)}
                            disabled={isDeleting === schedule.id}
                            className={combineClasses(
                              "p-2 rounded-xl transition-all",
                              theme === 'dark' 
                                ? 'hover:bg-red-900/30 text-red-400' 
                                : 'hover:bg-red-50 text-red-500'
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              
              {examSchedules.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Calendar className={combineClasses("h-12 w-12 mx-auto mb-3", get('icon', 'secondary'))} />
                    <p className={combineClasses(get('text', 'tertiary'))}>No exam schedules found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

interface ApprovalsTabProps {
  pendingRequests: MarkChangeRequest[];
  handleApproveReject: (id: number, action: 'APPROVE' | 'REJECT') => Promise<void>;
  theme: string;
  getCardGradientClass: (color?: string) => string;
  getStatusBadgeClass: (type: string) => string;
  getPrimaryButtonClass: () => string;
  getSecondaryButtonClass: () => string;
  formatDate: (date: string) => string;
  combineClasses: (...classes: (string | undefined)[]) => string;
  get: (type: any, value: any) => any;
}

const ApprovalsTab: React.FC<ApprovalsTabProps> = ({
  pendingRequests,
  handleApproveReject,
  theme,
  getCardGradientClass,
  getStatusBadgeClass,
  getPrimaryButtonClass,
  getSecondaryButtonClass,
  formatDate,
  combineClasses,
  get
}) => (
  <div className="space-y-6">
    <div className={getCardGradientClass('amber')}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <div>
          <h3 className={combineClasses("text-xl font-bold mb-2", get('text', 'primary'))}>Pending Approvals</h3>
          <p className={combineClasses("text-sm", get('text', 'secondary'))}>
            Review and approve mark change requests from teachers
          </p>
        </div>
        <span className={getStatusBadgeClass(pendingRequests.length > 0 ? 'amber' : 'green')}>
          {pendingRequests.length} pending
        </span>
      </div>
      
      {pendingRequests.length > 0 ? (
        <div className="space-y-4">
          {pendingRequests.map((request) => {
            const change = request.new_marks - request.old_marks;
            const isIncrease = change > 0;
            
            return (
              <div key={request.request_id} className={getCardGradientClass()}>
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className={combineClasses("font-bold text-lg", get('text', 'primary'))}>{request.student}</h4>
                      <span className={getStatusBadgeClass('blue')}>{request.class}</span>
                      <span className={getStatusBadgeClass('purple')}>
                        {request.exam} ({request.term})
                      </span>
                      <span className={getStatusBadgeClass('green')}>{request.subject}</span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>Teacher</p>
                        <p className={combineClasses("font-medium", get('text', 'primary'))}>{request.teacher}</p>
                      </div>
                      <div>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>Date Requested</p>
                        <p className={combineClasses("font-medium", get('text', 'primary'))}>{formatDate(request.date)}</p>
                      </div>
                      <div>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>Reason</p>
                        <p className={combineClasses("font-medium", get('text', 'primary'))}>{request.reason}</p>
                      </div>
                      <div>
                        <p className={combineClasses("text-sm", get('text', 'secondary'))}>Change</p>
                        <div className="flex items-center gap-3">
                          <span className={combineClasses("line-through font-medium", get('accent', 'danger'))}>
                            {request.old_marks}
                          </span>
                          <ChevronRight className={combineClasses("h-4 w-4", get('icon', 'secondary'))} />
                          <span className={combineClasses("font-bold", isIncrease ? get('accent', 'success') : get('accent', 'danger'))}>
                            {request.new_marks}
                          </span>
                          <span className={combineClasses("font-medium", isIncrease ? get('accent', 'success') : get('accent', 'danger'))}>
                            ({isIncrease ? '+' : ''}{change})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 w-full lg:w-auto">
                    <button
                      onClick={() => handleApproveReject(request.request_id, 'APPROVE')}
                      className={combineClasses(getPrimaryButtonClass(), "w-full")}
                    >
                      <CheckCircle className="h-4 w-4 mr-2 inline" />
                      Approve Change
                    </button>
                    <button
                      onClick={() => handleApproveReject(request.request_id, 'REJECT')}
                      className={combineClasses(
                        getSecondaryButtonClass(),
                        "w-full",
                        theme === 'dark' 
                          ? 'text-red-400 border-red-800 hover:bg-red-900/30' 
                          : 'text-red-500 border-red-200 hover:bg-red-50'
                      )}
                    >
                      <XCircle className="h-4 w-4 mr-2 inline" />
                      Reject Request
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle className={combineClasses("h-16 w-16 mx-auto mb-4", get('accent', 'success'))} />
          <h3 className={combineClasses("text-lg font-semibold mb-2", get('text', 'primary'))}>All Caught Up!</h3>
          <p className={combineClasses(get('text', 'tertiary'))}>No pending mark change requests</p>
        </div>
      )}
    </div>
  </div>
);
