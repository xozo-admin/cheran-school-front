// src/app/admin/students/exams/page.tsx

'use client';

import { adminApi } from '@/lib/api';

import { useState, useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from 'react';
import {
  FaCalendarAlt,
  FaChartBar,
  FaFileExport,
  FaFilter,
  FaSearch,
  FaEye,
  FaClipboardList,
  FaChartPie,
  FaSchool,
  FaListOl,
  FaUserGraduate,
  FaRegCalendarCheck,
  FaBookOpen,
  FaChartLine,
  FaPercentage,
  FaUsers,
  FaCalendarPlus,
  FaCalendar,
  FaClock,
  FaLayerGroup,
  FaBook,
  FaCalendarDay,
  FaChalkboardTeacher,
  FaUniversity,
  FaEye as FaEyeIcon,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaTimes
} from 'react-icons/fa';
import { MdOutlineDashboard, MdClass, MdSubject, MdDateRange, MdSchedule } from 'react-icons/md';
import { FiCalendar, FiFilter, FiDownload, FiLayers, FiX } from 'react-icons/fi';
import { HiOutlineCollection } from 'react-icons/hi';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo } from '@/lib/toast';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, AreaChart, Area, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Interfaces based on API structure
interface ExamTerm {
  id: number;
  name: string;
  rank: number;
  exams: ExamType[];
}

interface ExamType {
  id: number;
  name: string;
  term: number;
  term_name: string;
  max_marks: string;
  rank: number;
}

interface ExamSchedule {
  id: number;
  exam_type_name: string;
  start_date: string;
  end_date: string;
  classes: string[];
  subjects: ExamSubject[];
  created_at: string;
  status?: 'upcoming' | 'ongoing' | 'finished';
}

interface ExamSubject {
  id: number;
  subject_name: string;
  exam_date: string;
  duration: string;
  session: string;
}

interface ExamWithSchedules {
  id: number;
  name: string;
  rank: number;
  max_marks: string;
  schedules: ExamSchedule[];
}

interface TermScheduleGroup {
  term_id: number;
  term_name: string;
  term_rank: number;
  total_exams: number;
  total_schedules: number;
  exams: ExamWithSchedules[];
}

interface ClassResult {
  status: number;
  class: string;
  exam: string;
  analytics: {
    total_students: number;
    total_pass: number;
    grade_breakdown: {
      S: number;
      A: number;
      B: number;
      C: number;
      D: number;
      E: number;
      F: number;
      'N/A': number;
    };
  };
  data: StudentResult[];
}

interface StudentResult {
  student_id: string;
  name: string;
  summative_total: number;
  overall_grade: string;
}

interface StudentExamDetail {
  status: number;
  student: string;
  exam: string;
  subjects: SubjectMark[];
}

interface StudentSearchExamGroup {
  exam: string;
  subjects: SubjectMark[];
}

interface StudentSearchResult {
  status: number;
  student: string;
  profile_image?: string | null;
  class?: string;
  section?: string;
  exam?: string;
  subjects?: SubjectMark[];
  exams?: {
    exam: string;
    subjects: SubjectMark[];
  }[];
}

interface SubjectMark {
  subject: string;
  marks: number | null;
  max_marks: number;
  grade: string;
}

// New interfaces for classes and sections
interface Section {
  id: number;
  name: string;
  standard: number;
  standard_name: string;
  class_teacher: number | null;
}

interface Standard {
  id: number;
  name: string;
  description: string;
  sections: Section[];
}

export default function AdminExamsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const isRedirectingToStudentTab = useRef(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'results' | 'student'>('overview');
  const [terms, setTerms] = useState<ExamTerm[]>([]);
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [termScheduleGroups, setTermScheduleGroups] = useState<TermScheduleGroup[]>([]);
  const [classResults, setClassResults] = useState<ClassResult | null>(null);
  const [studentDetail, setStudentDetail] = useState<StudentExamDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [overviewTermFilter, setOverviewTermFilter] = useState('');
  const [overviewStatusFilter, setOverviewStatusFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'finished'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [subjectsPopupSchedule, setSubjectsPopupSchedule] = useState<ExamSchedule | null>(null);

  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);

  // Add this new state near your other useState declarations
const [studentId, setStudentId] = useState('');
const [studentSearchResult, setStudentSearchResult] = useState<StudentSearchResult | null>(null);
const [selectedStudentExamLabel, setSelectedStudentExamLabel] = useState('');
const [expandedMultiExamIndex, setExpandedMultiExamIndex] = useState(0);
const [loadingStudentSearch, setLoadingStudentSearch] = useState(false);
const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);
const [expandedTerms, setExpandedTerms] = useState<number[]>([]);
const [expandedExams, setExpandedExams] = useState<number[]>([]);
const [expandedClassGroups, setExpandedClassGroups] = useState<string[]>([]);
const [autoOpenResultsFromOverview, setAutoOpenResultsFromOverview] = useState(false);

// Add this new state for student tab filtered exam types
const [studentAvailableExamTypes, setStudentAvailableExamTypes] = useState<string[]>([]);

// Add this effect to fetch exam types for student tab based on selected term
useEffect(() => {
  const fetchStudentExamTypes = async () => {
    if (!filterTerm) {
      setStudentAvailableExamTypes([]);
      return;
    }

    try {
      // Fetch schedules filtered by term to get available exam types
      const params = new URLSearchParams();
      if (filterTerm !== 'all') {
        params.set('term', filterTerm);
      }

      const response = await adminApi.exams.schedule(params.toString());

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        // Extract unique exam types only from completed schedules
        const today = new Date();
        const examTypes = new Set<string>();
        (data.data || []).forEach((schedule: ExamSchedule) => {
          const endDate = new Date(schedule.end_date);
          if (endDate < today) {
            examTypes.add(schedule.exam_type_name);
          }
        });
        setStudentAvailableExamTypes(Array.from(examTypes));

        // If current selected exam is not in available types, clear it
        if (filterExam && !Array.from(examTypes).includes(filterExam)) {
          setFilterExam('');
        }
      }
    } catch (error) {
      console.error('Error fetching exam types for student tab:', error);
      setStudentAvailableExamTypes([]);
    }
  };

  // Only fetch when in student tab and term is selected
  if (activeTab === 'student' && filterTerm) {
    fetchStudentExamTypes();
  } else if (activeTab === 'student') {
    setStudentAvailableExamTypes([]);
  }
}, [filterTerm, activeTab]);


// Add this new function to fetch student result by ID
const fetchStudentResultById = async () => {
  const normalizedStudentId = studentId.trim();

  if (!normalizedStudentId) {
    toastInfo('Please enter Student ID');
    return;
  }

  // Check if selected exam is valid for the term
  if (filterExam && filterExam !== 'all' && studentAvailableExamTypes.length > 0 && !studentAvailableExamTypes.includes(filterExam)) {
    toastInfo('Please select a valid exam type for the selected term');
    return;
  }

  setLoadingStudentSearch(true);
  try {
    const params = new URLSearchParams();
    params.set('student_id', normalizedStudentId);
    if (filterExam && filterExam !== 'all') {
      params.set('exam_type', filterExam);
    }
    if (filterTerm && filterTerm !== 'all') {
      params.set('term', filterTerm);
    }

    const response = await adminApi.exams.studentResult(params);

    if (response.status >= 200 && response.status < 300) {
      const data = response.data;
      setStudentSearchResult(data);
      const groups = Array.isArray(data?.exams) && data.exams.length > 0
        ? data.exams
        : (data?.exam && Array.isArray(data?.subjects) ? [{ exam: data.exam, subjects: data.subjects }] : []);
      setSelectedStudentExamLabel(groups[0]?.exam || '');
      setExpandedMultiExamIndex(0);
      toastSuccess('Student result fetched successfully');
    } else {
      toastError(response.data?.error || 'Failed to fetch student result');
      setStudentSearchResult(null);
    }
  } catch (error) {
    console.error('Error fetching student result:', error);
    const errorMessage =
      (error as any)?.response?.data?.error ||
      (error as any)?.response?.data?.message ||
      (error as any)?.message ||
      'Failed to fetch student result';
    toastError(errorMessage);
    setStudentSearchResult(null);
  } finally {
    setLoadingStudentSearch(false);
  }
};

const normalizeClassName = (value: string) => value.toLowerCase().replace(/^class\s+/, '').trim();

const openResultsFromOverview = (className: string, termName: string, examName: string) => {
  const normalizedClass = normalizeClassName(className);
  const matchedStandard = standards.find(
    (standard) => normalizeClassName(standard.name) === normalizedClass
  );

  setFilterClass(matchedStandard?.name || className.replace(/^class\s+/i, '').trim());
  setFilterSection('');
  setFilterTerm(termName);
  setFilterExam(examName);
  setActiveTab('results');
  setAutoOpenResultsFromOverview(true);
};

useEffect(() => {
  const fetchExamTypesForFilters = async () => {
      if (!filterClass || !filterTerm) {
        setAvailableExamTypes([]);
        return;
      }

      try {
        // Create params for the schedule API
        const params = new URLSearchParams({
          class: filterClass,
          term: filterTerm
        });

        const response = await adminApi.exams.schedule(params.toString());

        if (response.status >= 200 && response.status < 300) {
          const data = response.data;
          // Extract unique exam types from only finished schedules for results tab
          const today = new Date();
          const examTypes = new Set<string>();
          (data.data || []).forEach((schedule: ExamSchedule) => {
            const endDate = new Date(schedule.end_date);
            if (endDate < today) {
              examTypes.add(schedule.exam_type_name);
            }
          });
          setAvailableExamTypes(Array.from(examTypes));

          // If current selected exam is not in available types, clear it
          if (filterExam && !Array.from(examTypes).includes(filterExam)) {
            setFilterExam('');
          }
        }
      } catch (error) {
        console.error('Error fetching exam types for filters:', error);
        setAvailableExamTypes([]);
      }
    };

    fetchExamTypesForFilters();
}, [filterClass, filterTerm]);

useEffect(() => {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const redirectedFrom = params.get('redirectedFrom');
  const tab = params.get('tab');
  const redirectedStudentId = params.get('studentId');

  if (redirectedFrom === 'allstudents' && tab === 'student') {
    isRedirectingToStudentTab.current = true;
    setShowRedirectBackButton(true);
    setActiveTab('student');
    if (redirectedStudentId) {
      setStudentId(redirectedStudentId);
    }

    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }
}, []);

const handleRedirectBack = () => {
  if (typeof window === 'undefined') return;
  if (window.history.length > 1) {
    window.history.back();
    return;
  }
  window.location.href = '/admin/students/allstudents';
};

  // Theme-aware classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'grades-card min-w-0 h-full rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl',
      get('border', 'primary')
    );

    const gradients: Record<string, string> = {
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
      purple: theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
      pink: theme === 'dark' ? 'from-gray-800 to-pink-900/10' : 'from-white to-pink-50',
      cyan: theme === 'dark' ? 'from-gray-800 to-cyan-900/10' : 'from-white to-cyan-50',
      teal: theme === 'dark' ? 'from-gray-800 to-teal-900/10' : 'from-white to-teal-50',
      orange: theme === 'dark' ? 'from-gray-800 to-orange-900/10' : 'from-white to-orange-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color] || gradients.blue);
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

  // Fetch exam terms
  const fetchExamTerms = async () => {
    setLoading(true);
    try {
      const response = await adminApi.exams.terms();

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setTerms(data);
      } else {
        toastError('Failed to fetch exam terms');
      }
    } catch (error) {
      console.error('Error fetching exam terms:', error);
      toastError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch exam schedules
  const fetchExamSchedules = async (params?: string) => {
    setLoading(true);
    try {
      const response = await adminApi.exams.schedule(params);

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setSchedules(data.data || []);

        // Extract unique exam types from schedules
        const examTypes = new Set<string>();
        (data.data || []).forEach((schedule: ExamSchedule) => {
          examTypes.add(schedule.exam_type_name);
        });
        setAllExamTypesFromSchedules(Array.from(examTypes));
      } else {
        toastError('Failed to fetch exam schedules');
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toastError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchTermSchedules = async () => {
    setLoading(true);
    try {
      const response = await adminApi.exams.termSchedules();
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setTermScheduleGroups(data.data || []);
      } else {
        toastError('Failed to fetch term schedules');
      }
    } catch (error) {
      console.error('Error fetching term schedules:', error);
      toastError('Network error');
    } finally {
      setLoading(false);
    }
  };



  // Fetch standards (classes)
  const fetchStandards = async () => {
    try {
      const response = await adminApi.academics.standards();

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setStandards(data);
      } else {
        toastError('Failed to fetch classes');
      }
    } catch (error) {
      console.error('Error fetching standards:', error);
      toastError('Network error');
    }
  };

  // Fetch class results
  const fetchClassResults = async () => {
    if (!filterClass || !filterSection || !filterTerm || !filterExam) {
      toastInfo('Please select class, section, term, and exam type');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        class: filterClass,
        section: filterSection,
        exam_type: filterExam,
        term: filterTerm
      });

      const response = await adminApi.exams.classResult(params);

      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        setClassResults(data);
        // Reset expanded student when fetching new class results
        setExpandedStudentId(null);
        setStudentDetail(null);
      } else {
        toastError('Failed to fetch class results');
      }
    } catch (error) {
      console.error('Error fetching class results:', error);
      toastError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch student exam detail
  // Update the fetchStudentExamDetail function
const fetchStudentExamDetail = async (studentId: string, studentName: string) => {
  if (!filterTerm || !filterExam) {
    toastInfo('Please select term and exam type first');
    return;
  }

  // Set the student ID for the student tab
  setStudentId(studentId);
  
  // Switch to student tab
  setActiveTab('student');
  
  // Clear any previous search result and show loading
  setStudentSearchResult(null);
  setLoadingStudentSearch(true);
  
  try {
    const params = new URLSearchParams({
      student_id: studentId,
      exam_type: filterExam,
      term: filterTerm
    });

    const response = await adminApi.exams.studentResult(params);

    if (response.status >= 200 && response.status < 300) {
      const data = response.data;
      setStudentSearchResult(data);
      toastSuccess('Student result fetched successfully');
    } else {
      toastError(response.data?.error || 'Failed to fetch student details');
      setStudentSearchResult(null);
    }
  } catch (error) {
    console.error('Error fetching student detail:', error);
    toastError('Network error');
    setStudentSearchResult(null);
  } finally {
    setLoadingStudentSearch(false);
  }
};
  // Get unique exam types from schedules
  const [allExamTypesFromSchedules, setAllExamTypesFromSchedules] = useState<string[]>([]);

  // Get all exam types (from terms and schedules)
  const allExamTypes = useMemo(() => {
    const examTypes = new Set<string>();

    // Add exam types from terms
    terms.forEach(term => {
      term.exams.forEach(exam => {
        examTypes.add(exam.name);
      });
    });

    // Add exam types from schedules
    allExamTypesFromSchedules.forEach(examType => {
      examTypes.add(examType);
    });

    return Array.from(examTypes);
  }, [terms, allExamTypesFromSchedules]);

  // Get unique classes from schedules
  const allClasses = useMemo(() => {
    const classes: string[] = [];
    schedules.forEach(schedule => {
      schedule.classes.forEach(cls => {
        if (!classes.includes(cls)) {
          classes.push(cls);
        }
      });
    });
    return classes;
  }, [schedules]);

  const overviewClasses = useMemo(() => {
    const classSet = new Set<string>();
    termScheduleGroups.forEach((termGroup) => {
      termGroup.exams.forEach((exam) => {
        exam.schedules.forEach((schedule) => {
          schedule.classes.forEach((cls) => classSet.add(cls));
        });
      });
    });
    return Array.from(classSet);
  }, [termScheduleGroups]);

  // Update sections when class changes
useEffect(() => {
  if (filterClass) {
      const selectedStandard = standards.find(std => std.name === filterClass);
      if (selectedStandard) {
        setSections(selectedStandard.sections);
        // Auto-select first section if available
        if (selectedStandard.sections.length > 0 && !filterSection) {
          setFilterSection(selectedStandard.sections[0].name);
        }
      }
    } else {
      setSections([]);
      setFilterSection('');
  }
}, [filterClass, standards]);

useEffect(() => {
  if (
    autoOpenResultsFromOverview &&
    activeTab === 'results' &&
    filterClass &&
    filterSection &&
    filterTerm &&
    filterExam
  ) {
    fetchClassResults();
    setAutoOpenResultsFromOverview(false);
  }
}, [autoOpenResultsFromOverview, activeTab, filterClass, filterSection, filterTerm, filterExam]);

  // Handle tab change
 // Handle tab change - update this existing useEffect
useEffect(() => {
  // Only clear states when not switching to student tab with pre-filled data
  if (activeTab !== 'student' && !isRedirectingToStudentTab.current) {
    setExpandedStudentId(null);
    setStudentDetail(null);
    setStudentSearchResult(null);
    setStudentId('');
  }
  
  switch (activeTab) {
    case 'overview':
      fetchExamTerms();
      fetchExamSchedules();
      fetchTermSchedules();
      break;
    case 'results':
      fetchStandards();
      fetchExamSchedules();
      break;
    case 'student':
      isRedirectingToStudentTab.current = false;
      fetchExamTerms(); // Fetch terms for the dropdown
      fetchExamSchedules(); // Fetch schedules for exam types
      break;
  }
}, [activeTab]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSubjectsPopupSchedule(null);
      }
    };

    if (subjectsPopupSchedule) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [subjectsPopupSchedule]);

  const filteredTermScheduleGroups = useMemo(() => {
    const searchLower = searchTerm.trim().toLowerCase();
    const now = new Date();
    const normalizeClassName = (value: string) => value.toLowerCase().replace(/^class\s+/, '').trim();

    const getScheduleStatusLabel = (schedule: ExamSchedule): 'upcoming' | 'ongoing' | 'finished' => {
      if (schedule.status) return schedule.status;
      const start = new Date(schedule.start_date);
      const end = new Date(schedule.end_date);
      if (start > now) return 'upcoming';
      if (end < now) return 'finished';
      return 'ongoing';
    };

    return termScheduleGroups
      .filter((termGroup) => !overviewTermFilter || termGroup.term_name === overviewTermFilter)
      .map((termGroup) => {
        const filteredExams = termGroup.exams
          .map((exam) => {
            const examMatchesFilter = !filterExam || exam.name === filterExam;
            const examMatchesSearch = !searchLower || exam.name.toLowerCase().includes(searchLower);

            const schedulesForExam = exam.schedules.filter((schedule) => {
              const classMatches = !filterClass
                || schedule.classes.some((cls) => normalizeClassName(cls) === normalizeClassName(filterClass));
              const statusMatches = overviewStatusFilter === 'all' || getScheduleStatusLabel(schedule) === overviewStatusFilter;
              const scheduleMatchesSearch = !searchLower
                || schedule.exam_type_name.toLowerCase().includes(searchLower)
                || schedule.subjects.some((subject) => subject.subject_name.toLowerCase().includes(searchLower))
                || schedule.classes.some((className) => className.toLowerCase().includes(searchLower));
              return classMatches && statusMatches && scheduleMatchesSearch;
            });

            if (!examMatchesFilter) {
              return null;
            }

            if (!searchLower) {
              return { ...exam, schedules: schedulesForExam };
            }

            if (examMatchesSearch || schedulesForExam.length > 0) {
              return { ...exam, schedules: schedulesForExam };
            }

            return null;
          })
          .filter((exam): exam is ExamWithSchedules => exam !== null);

        return {
          ...termGroup,
          exams: filteredExams,
          total_schedules: filteredExams.reduce((total, exam) => total + exam.schedules.length, 0)
        };
      })
      .filter((termGroup) => {
        if (termGroup.exams.length > 0) return true;
        return !searchLower && !filterClass && !filterExam && overviewStatusFilter === 'all';
      });
  }, [termScheduleGroups, searchTerm, filterClass, filterExam, overviewTermFilter, overviewStatusFilter]);

  const overviewScheduleExportRows = useMemo(() => {
    return filteredTermScheduleGroups.flatMap((termGroup) =>
      termGroup.exams.flatMap((exam) =>
        exam.schedules.map((schedule) => ({
          term: termGroup.term_name,
          exam: exam.name,
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          classes: schedule.classes.join(', '),
          subjects_count: schedule.subjects.length,
          status: schedule.status || (
            new Date(schedule.start_date) > new Date()
              ? 'upcoming'
              : new Date(schedule.end_date) < new Date()
                ? 'finished'
                : 'ongoing'
          )
        }))
      )
    );
  }, [filteredTermScheduleGroups]);

  const toggleExpanded = <T extends string | number>(id: T, setter: Dispatch<SetStateAction<T[]>>) => {
    setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Export data
  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toastInfo('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header =>
        JSON.stringify(row[header] || '')
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('CSV exported successfully!');
  };

  const renderGradeDistributionLineChart = () => {
    if (!classResults?.analytics.grade_breakdown) return null;

    // Grade color mapping
    const getGradeColor = (grade: any) => {
      const gradeColors: any = {
        'S': '#10B981', // Emerald
        'A': '#3B82F6', // Blue
        'B': '#8B5CF6', // Violet
        'C': '#F59E0B', // Amber
        'D': '#EF4444', // Red
        'E': '#F97316', // Orange
        'F': '#DC2626', // Red-600
        'N/A': '#6B7280' // Gray
      };
      return gradeColors[grade] || '#6B7280';
    };

    // Wave shades for each grade
    const getWaveShade = (grade: string, theme: string) => {
      const waveShades: any = {
        'S': theme === 'dark' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
        'A': theme === 'dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
        'B': theme === 'dark' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
        'C': theme === 'dark' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(245, 158, 11, 0.1)',
        'D': theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
        'E': theme === 'dark' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.1)',
        'F': theme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : 'rgba(220, 38, 38, 0.1)',
        'N/A': theme === 'dark' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.1)'
      };
      return waveShades[grade] || (theme === 'dark' ? 'rgba(107, 114, 128, 0.15)' : 'rgba(107, 114, 128, 0.1)');
    };

    // Convert grade breakdown to line chart data
    const chartData = Object.entries(classResults.analytics.grade_breakdown)
      .filter(([grade]) => grade !== 'N/A') // Optional: filter out N/A grades
      .map(([grade, count]) => ({
        grade,
        students: count,
        percentage: (count / classResults.analytics.total_students * 100).toFixed(1),
        color: getGradeColor(grade),
        waveShade: getWaveShade(grade, theme)
      }))
      .sort((a, b) => {
        // Sort grades in a meaningful order (S, A, B, C, D, E, F)
        const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
        return gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade);
      });
    const chartMinWidth = chartData.length <= 4
      ? 520
      : Math.min(980, chartData.length * 95);

    if (chartData.length === 0) {
      return (
        <div className={getCardGradientClass('blue')}>
          <div className="text-center py-12">
            <FaChartLine className={combine("text-4xl mx-auto mb-4", get('icon', 'secondary'))} />
            <p className={combine(get('text', 'secondary'))}>No grade distribution data available</p>
          </div>
        </div>
      );
    }

    // Get blue color based on theme (for the line chart - using grade A color as default)
    const lineColor = theme === 'dark' ? '#3B82F6' : '#2563EB';
    const gradientStart = theme === 'dark' ? '#3B82F6' : '#60A5FA';
    const gradientEnd = theme === 'dark' ? '#1E40AF' : '#93C5FD';

    return (
      <div className={getCardGradientClass('blue')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
            Grade Distribution Analysis
          </h3>
          <div className={combine(
            "px-3 py-1.5 rounded-lg text-sm font-medium",
            theme === 'dark'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          )}>
            {classResults.analytics.total_students} Students
          </div>
        </div>

        <div className="h-80 w-full max-w-full overflow-x-auto overflow-y-hidden">
          <div className="h-full" style={{ minWidth: `${chartMinWidth}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 16, right: 20, left: 24, bottom: 24 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={theme === 'dark' ? '#374151' : '#E5E7EB'}
                  vertical={false}
                />

                {/* X Axis - Shows Grades */}
                <XAxis
                  dataKey="grade"
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  axisLine={{ stroke: theme === 'dark' ? '#4B5563' : '#D1D5DB' }}
                  tickLine={{ stroke: theme === 'dark' ? '#4B5563' : '#D1D5DB' }}
                  tick={{
                    fill: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                    fontSize: 12
                  }}
                  label={{
                    value: 'Grades',
                    position: 'bottom',
                    offset: 10,
                    style: {
                      fill: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                      fontSize: 12,
                      fontWeight: 500
                    }
                  }}
                />

                {/* Y Axis - Shows Number of Students */}
                <YAxis
                  stroke={theme === 'dark' ? '#9CA3AF' : '#6B7280'}
                  axisLine={{ stroke: theme === 'dark' ? '#4B5563' : '#D1D5DB' }}
                  tickLine={{ stroke: theme === 'dark' ? '#4B5563' : '#D1D5DB' }}
                  tick={{
                    fill: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                    fontSize: 11
                  }}
                  label={{
                    value: 'Number of Students',
                    angle: -90,
                    position: 'left',
                    offset: 0,
                    style: {
                      fill: theme === 'dark' ? '#9CA3AF' : '#6B7280',
                      fontSize: 12,
                      fontWeight: 500,
                      textAnchor: 'middle'
                    }
                  }}
                  domain={[0, 'dataMax + 1']}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#1F2937' : '#FFFFFF',
                    borderColor: theme === 'dark' ? '#374151' : '#E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  formatter={(value: any, name: any, props: any) => {
                    if (name === 'students') {
                      return [
                        <div key="students" className="space-y-1">
                          <div className="font-bold text-lg">{value} students</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {props.payload.percentage}% of class
                          </div>
                        </div>,
                        'Students'
                      ];
                    }
                    return value;
                  }}
                  labelFormatter={(label) => `Grade ${label}`}
                />

                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    paddingTop: '10px',
                    fontSize: '12px'
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="students"
                  name="Number of Students"
                  stroke={lineColor}
                  strokeWidth={3}
                  dot={{
                    r: 6,
                    fill: lineColor,
                    strokeWidth: 2,
                    stroke: theme === 'dark' ? '#1F2937' : '#FFFFFF'
                  }}
                  activeDot={{
                    r: 8,
                    fill: lineColor,
                    strokeWidth: 2,
                    stroke: theme === 'dark' ? '#1F2937' : '#FFFFFF'
                  }}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />

                {/* Blue gradient area under the line */}
                <Area
                  type="monotone"
                  dataKey="students"
                  fill="url(#blueGradient)"
                  fillOpacity={0.3}
                  stroke="transparent"
                />

                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={gradientStart}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={gradientEnd}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grade summary below chart with grade colors and wave shades */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
            {chartData.map((item) => (
              <div
                key={item.grade}
                className="text-center p-3 rounded-lg transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: item.waveShade,
                  border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`
                }}
              >
                <div
                  className="text-lg font-bold mb-1"
                  style={{ color: item.color }}
                >
                  {item.grade}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {item.students} students
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {item.percentage}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'S': '#10B981', // emerald
      'A': '#3B82F6', // blue
      'B': '#8B5CF6', // violet
      'C': '#F59E0B', // amber
      'D': '#EF4444', // red
      'E': '#F97316', // orange
      'F': '#6B7280', // gray
      'N/A': '#9CA3AF', // light gray
      '-': '#9CA3AF' // dash for no grade
    };
    return colors[grade] || '#6B7280';
  };

  // Add this utility function after the interfaces
  const getExamStatus = (startDate: string, endDate: string): { status: 'upcoming' | 'ongoing' | 'finished'; color: string; bgColor: string; textColor: string } => {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set time to start of day for date comparison
    now.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    if (now < start) {
      return {
        status: 'upcoming',
        color: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
        bgColor: theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100',
        textColor: theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
      };
    } else if (now >= start && now <= end) {
      return {
        status: 'ongoing',
        color: theme === 'dark' ? 'text-green-400' : 'text-green-600',
        bgColor: theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100',
        textColor: theme === 'dark' ? 'text-green-400' : 'text-green-700'
      };
    } else {
      return {
        status: 'finished',
        color: theme === 'dark' ? 'text-gray-400' : 'text-gray-600',
        bgColor: theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100',
        textColor: theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
      };
    }
  };

  // Get exam stats
  // Update the upcoming exams stat calculation (around line 1620-1630)
  const getExamStats = () => {
    const totalExams = terms.reduce((sum, term) => sum + term.exams.length, 0);
    const totalSchedules = schedules.length;
    const totalSubjects = schedules.reduce((sum, schedule) => sum + schedule.subjects.length, 0);
    const now = new Date();
    const upcomingSchedules = schedules.filter(s => new Date(s.start_date) > now).length;
    const ongoingSchedules = schedules.filter(s => {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      return now >= start && now <= end;
    }).length;
    const finishedSchedules = schedules.filter(s => new Date(s.end_date) < now).length;

    return { totalExams, totalSchedules, totalSubjects, upcomingSchedules, ongoingSchedules, finishedSchedules };
  };

  const studentExamGroups = useMemo(() => {
    if (!studentSearchResult) return [];
    if (Array.isArray(studentSearchResult.exams) && studentSearchResult.exams.length > 0) {
      return studentSearchResult.exams as StudentSearchExamGroup[];
    }
    if (studentSearchResult.exam && Array.isArray(studentSearchResult.subjects)) {
      return [{ exam: studentSearchResult.exam, subjects: studentSearchResult.subjects }];
    }
    return [];
  }, [studentSearchResult]);

  const activeStudentExamGroup = useMemo(() => {
    if (studentExamGroups.length === 0) return null;
    if (!selectedStudentExamLabel) return studentExamGroups[0];
    return studentExamGroups.find((group) => group.exam === selectedStudentExamLabel) || studentExamGroups[0];
  }, [studentExamGroups, selectedStudentExamLabel]);

  const exportAllStudentExamResults = () => {
    if (!studentSearchResult || studentExamGroups.length === 0) {
      toastInfo('No exam data to export');
      return;
    }

    const rows = studentExamGroups.flatMap((group) =>
      group.subjects
        .filter((subject) => subject.grade !== '-')
        .map((subject) => {
          const marksNum = subject.marks !== null && subject.marks !== undefined
            ? (typeof subject.marks === 'string' ? parseFloat(subject.marks) : subject.marks)
            : null;
          const maxMarksNum = subject.max_marks !== null && subject.max_marks !== undefined
            ? (typeof subject.max_marks === 'string' ? parseFloat(subject.max_marks) : subject.max_marks)
            : 0;
          const subjectPercentage = marksNum !== null && !isNaN(marksNum) && maxMarksNum > 0
            ? ((marksNum / maxMarksNum) * 100).toFixed(1)
            : 'N/A';

          return {
            student_id: studentId.trim(),
            student_name: studentSearchResult.student,
            exam: group.exam,
            subject: subject.subject,
            marks_obtained: marksNum !== null ? marksNum.toFixed(2) : 'Absent',
            max_marks: maxMarksNum.toFixed(2),
            percentage: subjectPercentage !== 'N/A' ? `${subjectPercentage}%` : 'N/A',
            grade: subject.grade,
          };
        })
    );

    exportToCSV(rows, `student_all_exams_${studentId.trim() || 'student'}`);
  };

  // Render student detail row
  // Render student detail row with dark/light theme support
  const renderStudentDetailRow = (studentId: string) => {
    if (!studentDetail || expandedStudentId !== studentId) return null;

    // Filter subjects that are actually part of the exam (grade not '-')
    const assignedSubjects = studentDetail.subjects.filter(subj => subj.grade !== '-');
    const totalSubjects = assignedSubjects.length;

    // Count attended subjects (marks not null and not undefined)
    const attendedSubjects = assignedSubjects.filter(subj =>
      subj.marks !== null && subj.marks !== undefined
    ).length;

    // Calculate total marks - convert string marks to number, treat null/undefined as 0
    const totalMarks = assignedSubjects.reduce((sum, subj) => {
      if (subj.marks === null || subj.marks === undefined) return sum;
      // Convert string to number, default to 0 if invalid
      const marksNum = typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks;
      return sum + (isNaN(marksNum) ? 0 : marksNum);
    }, 0);

    // Calculate max marks - convert string max_marks to number
    const maxMarks = assignedSubjects.reduce((sum, subj) => {
      const maxMarksNum = typeof subj.max_marks === 'string' ? parseFloat(subj.max_marks) : subj.max_marks;
      return sum + (isNaN(maxMarksNum) ? 0 : maxMarksNum);
    }, 0);

    // Calculate percentage with 1 decimal place
    const percentage = maxMarks > 0 ? (totalMarks / maxMarks * 100).toFixed(1) : '0.0';

    // Theme-aware classes for the detail row
    const detailRowBg = theme === 'dark'
      ? "bg-gradient-to-r from-blue-900/20 to-indigo-900/20"
      : "bg-gradient-to-r from-blue-50/20 to-indigo-50/20";

    const detailRowBorder = theme === 'dark'
      ? "border-blue-800"
      : "border-blue-100";

    // Stats card theme classes
    const statsCardBase = "p-4 rounded-xl border";

    const totalSubjectsCard = theme === 'dark'
      ? "bg-blue-900/20 border-blue-800"
      : "bg-blue-50 border-blue-200";

    const attendedSubjectsCard = theme === 'dark'
      ? "bg-emerald-900/20 border-emerald-800"
      : "bg-emerald-50 border-emerald-200";

    const totalMarksCard = theme === 'dark'
      ? "bg-amber-900/20 border-amber-800"
      : "bg-amber-50 border-amber-200";

    const percentageCard = theme === 'dark'
      ? "bg-purple-900/20 border-purple-800"
      : "bg-purple-50 border-purple-200";

    // Header theme
    const headerBg = theme === 'dark'
      ? "bg-gray-800"
      : "bg-gray-50";

    const tableHeaderBg = theme === 'dark'
      ? "bg-gray-800"
      : "bg-gray-50";

    const tableRowHover = theme === 'dark'
      ? "hover:bg-gray-800"
      : "hover:bg-gray-50";

    // Insights card theme
    const insightsCardBg = theme === 'dark'
      ? "bg-gray-800/50"
      : "bg-gray-50";

    return (
      <tr className={combine(detailRowBg, "border-b", detailRowBorder)}>
        <td colSpan={7} className="p-0">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                  {studentDetail.student} - Subject-wise Performance
                </h4>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  {studentDetail.exam}
                </p>
              </div>
            </div>

            {/* Stats Cards with theme support */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className={combine(statsCardBase, totalSubjectsCard)}>
                <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                  Total Subjects in Exam
                </div>
                <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                  {totalSubjects}
                </div>
              </div>

              <div className={combine(statsCardBase, attendedSubjectsCard)}>
                <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>
                  Attended Subjects
                </div>
                <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                  {attendedSubjects}
                </div>
                <div className={combine("text-xs mt-1", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                  {totalSubjects > 0 ? ((attendedSubjects / totalSubjects) * 100).toFixed(0) : 0}% attendance
                </div>
              </div>

              <div className={combine(statsCardBase, totalMarksCard)}>
                <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                  Total Marks
                </div>
                <div className={combine("text-base sm:text-2xl font-bold", get('text', 'primary'))}>
                  {totalMarks.toFixed(2)}/{maxMarks.toFixed(2)}
                </div>
              </div>

              <div className={combine(statsCardBase, percentageCard)}>
                <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-purple-400" : "text-purple-600")}>
                  Overall Percentage
                </div>
                <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                  {percentage}%
                </div>
              </div>
            </div>

            {/* Subjects Table with theme support */}
            <div className={combine(
              "rounded-xl border overflow-hidden mb-6",
              get('border', 'primary')
            )}>
              <div className={combine(
                "px-6 py-4 border-b",
                get('border', 'primary'),
                headerBg
              )}>
                <h5 className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>
                  Exam Subjects ({assignedSubjects.length} subjects)
                </h5>
              </div>

              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={combine(
                      "border-b",
                      get('border', 'primary'),
                      tableHeaderBg
                    )}>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Subject
                      </th>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Marks Obtained
                      </th>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Maximum Marks
                      </th>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Percentage
                      </th>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Grade
                      </th>
                      <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignedSubjects.map((subject, index) => {
                      // Parse marks and max_marks to numbers
                      const marksNum = subject.marks !== null && subject.marks !== undefined
                        ? (typeof subject.marks === 'string' ? parseFloat(subject.marks) : subject.marks)
                        : null;

                      const maxMarksNum = subject.max_marks !== null && subject.max_marks !== undefined
                        ? (typeof subject.max_marks === 'string' ? parseFloat(subject.max_marks) : subject.max_marks)
                        : 0;

                      const subjectPercentage = marksNum !== null && !isNaN(marksNum) && maxMarksNum > 0
                        ? ((marksNum / maxMarksNum) * 100).toFixed(1)
                        : 'N/A';

                      const isAbsent = marksNum === null;
                      const isExcellent = subject.grade === 'S' || subject.grade === 'A';
                      const isGood = subject.grade === 'B' || subject.grade === 'C';

                      // Theme-aware classes for subject rows
                      const subjectRowClasses = combine(
                        "border-b transition-colors",
                        get('border', 'primary'),
                        tableRowHover
                      );

                      // Grade badge theme
                      const gradeBadgeClasses = combine(
                        "px-3 py-1.5 rounded-full text-sm font-medium inline-flex items-center",
                        isAbsent
                          ? theme === 'dark'
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-gray-100 text-gray-700'
                          : isExcellent
                            ? theme === 'dark'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-green-100 text-green-700'
                            : isGood
                              ? theme === 'dark'
                                ? 'bg-blue-900/30 text-blue-400'
                                : 'bg-blue-100 text-blue-700'
                              : theme === 'dark'
                                ? 'bg-amber-900/30 text-amber-400'
                                : 'bg-amber-100 text-amber-700'
                      );

                      // Status badge theme
                      const statusBadgeClasses = combine(
                        "px-3 py-1 rounded text-xs font-medium",
                        isAbsent
                          ? theme === 'dark'
                            ? 'bg-gray-800 text-gray-400'
                            : 'bg-gray-100 text-gray-700'
                          : Number(subjectPercentage) >= 80
                            ? theme === 'dark'
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-green-100 text-green-700'
                            : Number(subjectPercentage) >= 60
                              ? theme === 'dark'
                                ? 'bg-blue-900/30 text-blue-400'
                                : 'bg-blue-100 text-blue-700'
                              : Number(subjectPercentage) >= 40
                                ? theme === 'dark'
                                  ? 'bg-amber-900/30 text-amber-400'
                                  : 'bg-amber-100 text-amber-700'
                                : theme === 'dark'
                                  ? 'bg-red-900/30 text-red-400'
                                  : 'bg-red-100 text-red-700'
                      );

                      // Percentage text color based on performance
                      const percentageColor = isAbsent
                        ? combine(get('text', 'secondary'), get('text', 'tertiary'))
                        : Number(subjectPercentage) >= 80
                          ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                          : Number(subjectPercentage) >= 60
                            ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                            : Number(subjectPercentage) >= 40
                              ? theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                              : theme === 'dark' ? 'text-red-400' : 'text-red-600';

                      return (
                        <tr
                          key={index}
                          className={subjectRowClasses}
                        >
                          <td className="py-4 px-6">
                            <div className={combine("font-medium", get('text', 'primary'))}>
                              {subject.subject}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={combine(
                              "font-bold",
                              isAbsent
                                ? combine(get('text', 'secondary'), get('text', 'tertiary'))
                                : get('text', 'primary')
                            )}>
                              {marksNum !== null ? marksNum.toFixed(2) : 'Absent'}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={combine(get('text', 'secondary'), get('text', 'tertiary'))}>
                              {maxMarksNum.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={combine("font-semibold", percentageColor)}>
                              {subjectPercentage !== 'N/A' ? subjectPercentage + '%' : subjectPercentage}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={gradeBadgeClasses}>
                              <span
                                className="w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: getGradeColor(subject.grade) }}
                              />
                              {subject.grade}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={statusBadgeClasses}>
                              {isAbsent ? 'Absent' :
                                Number(subjectPercentage) >= 80 ? 'Excellent' :
                                  Number(subjectPercentage) >= 60 ? 'Good' :
                                    Number(subjectPercentage) >= 40 ? 'Average' : 'Needs Improvement'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Insights with theme support */}
            <div className={combine(
              "p-6 rounded-xl border",
              get('border', 'primary'),
              insightsCardBg
            )}>
              <h5 className={combine("font-bold mb-4", get('text', 'primary'))}>
                Performance Insights
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className={combine("text-sm", get('text', 'secondary'))}>
                    Strongest Subject
                  </div>
                  <div className={combine("font-medium mt-1", theme === 'dark' ? "text-green-400" : "text-green-600")}>
                    {(() => {
                      const subjectsWithMarks = assignedSubjects.filter(subj => {
                        const marks = subj.marks !== null ? (typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks) : null;
                        return marks !== null && !isNaN(marks);
                      });

                      if (subjectsWithMarks.length === 0) return 'N/A';

                      const strongest = subjectsWithMarks.reduce((prev, current) => {
                        const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                        const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                        const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                        const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;

                        return (prevMarks / prevMax) > (currentMarks / currentMax) ? prev : current;
                      });

                      return `${strongest.subject} (${strongest.grade})`;
                    })()}
                  </div>
                </div>

                <div>
                  <div className={combine("text-sm", get('text', 'secondary'))}>
                    Needs Improvement
                  </div>
                  <div className={combine("font-medium mt-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                    {(() => {
                      const subjectsWithMarks = assignedSubjects.filter(subj => {
                        const marks = subj.marks !== null ? (typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks) : null;
                        return marks !== null && !isNaN(marks);
                      });

                      if (subjectsWithMarks.length === 0) return 'N/A';

                      const weakest = subjectsWithMarks.reduce((prev, current) => {
                        const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                        const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                        const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                        const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;

                        return (prevMarks / prevMax) < (currentMarks / currentMax) ? prev : current;
                      });

                      return weakest ? `${weakest.subject} (${weakest.grade})` : 'N/A';
                    })()}
                  </div>
                </div>

                <div>
                  <div className={combine("text-sm", get('text', 'secondary'))}>
                    Attendance Rate
                  </div>
                  <div className={combine("font-medium mt-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                    {totalSubjects > 0 ? ((attendedSubjects / totalSubjects) * 100).toFixed(1) : 0}%
                  </div>
                </div>

                <div>
                  <div className={combine("text-sm", get('text', 'secondary'))}>
                    Overall Performance
                  </div>
                  <div className={combine(
                    "font-bold mt-1",
                    Number(percentage) >= 80
                      ? theme === 'dark' ? "text-green-400" : "text-green-600"
                      : Number(percentage) >= 60
                        ? theme === 'dark' ? "text-blue-400" : "text-blue-600"
                        : Number(percentage) >= 40
                          ? theme === 'dark' ? "text-amber-400" : "text-amber-600"
                          : theme === 'dark' ? "text-red-400" : "text-red-600"
                  )}>
                    {Number(percentage) >= 80 ? 'Excellent' :
                      Number(percentage) >= 60 ? 'Good' :
                        Number(percentage) >= 40 ? 'Average' : 'Needs Improvement'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    );
  };


  return (
    <div className={`dashboard-typography overflow-x-hidden p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px] min-w-0">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark'
                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaClipboardList className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-2xl sm:text-3xl font-bold", get('text', 'primary'))}>
                  Exam Management
                </h1>
                <p className={combine("text-sm mt-1 flex items-center", get('text', 'secondary'))}>
                  <MdOutlineDashboard className="mr-2" />
                  Manage exams, schedules, and results
                </p>
              </div>
            </div>
            {showRedirectBackButton && (
              <button
                onClick={handleRedirectBack}
                className={combine(
                  getSecondaryButtonClass(),
                  'sm:ml-auto w-full sm:w-auto flex items-center justify-center'
                )}
              >
                Back
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
            {(['overview', 'results', 'student'] as const).map((tab:any) => (
  <button
    key={tab}
    onClick={() => setActiveTab(tab)}
    className={combine(
      "px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-2 whitespace-nowrap",
      activeTab === tab
        ? getPrimaryButtonClass()
        : combine(
          get('bg', 'card'),
          get('border', 'secondary'),
          get('text', 'secondary'),
          'border hover:bg-[var(--color-bg-hover)]'
        )
    )}
  >
    {tab === 'overview' && <FiLayers className="text-sm" />}
    {tab === 'results' && <FaChartBar className="text-sm" />}
    {tab === 'student' && <FaUserGraduate className="text-sm" />}
    <span className="text-sm capitalize">{tab}</span>
  </button>
))}
          </div>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            {/* Combined Stats */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3 sm:gap-4 lg:gap-5 mb-6 sm:mb-8 items-stretch">
              <div className={combine(getCardGradientClass('blue'), "flex min-h-[150px] sm:min-h-[168px] flex-col justify-between")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Academic Terms</p>
                    <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2 leading-none", get('text', 'primary'))}>{terms.length}</p>
                    <div className={combine("text-[11px] sm:text-xs mt-2 flex items-center", get('text', 'tertiary'))}>
                      <FaListOl className="mr-1" />
                      <span>Structured periods</span>
                    </div>
                  </div>
                  <div className={combine(
                    "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl shrink-0",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaUniversity className={combine(
                      "text-lg sm:text-xl",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
              </div>

              <div className={combine(getCardGradientClass('emerald'), "flex min-h-[150px] sm:min-h-[168px] flex-col justify-between")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Exam Types</p>
                    <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2 leading-none", get('text', 'primary'))}>
                      {getExamStats().totalExams}
                    </p>
                    <div className={combine("text-[11px] sm:text-xs mt-2 flex items-center", get('text', 'tertiary'))}>
                      <HiOutlineCollection className="mr-1" />
                      <span>Assessment types</span>
                    </div>
                  </div>
                  <div className={combine(
                    "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl shrink-0",
                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                  )}>
                    <FaClipboardList className={combine(
                      "text-lg sm:text-xl",
                      theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                    )} />
                  </div>
                </div>
              </div>

              <div className={combine(getCardGradientClass('purple'), "flex min-h-[150px] sm:min-h-[168px] flex-col justify-between")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Scheduled Exams</p>
                    <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2 leading-none", get('text', 'primary'))}>
                      {getExamStats().totalSchedules}
                    </p>
                    <div className={combine("text-[11px] sm:text-xs mt-2 flex items-center", get('text', 'tertiary'))}>
                      <FaCalendarDay className="mr-1" />
                      <span>Across all classes</span>
                    </div>
                  </div>
                  <div className={combine(
                    "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl shrink-0",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaCalendarAlt className={combine(
                      "text-lg sm:text-xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                </div>
              </div>

              <div className={combine(getCardGradientClass('amber'), "flex min-h-[150px] sm:min-h-[168px] flex-col justify-between")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Subjects</p>
                    <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2 leading-none", get('text', 'primary'))}>
                      {getExamStats().totalSubjects}
                    </p>
                    <div className={combine("text-[11px] sm:text-xs mt-2 flex items-center", get('text', 'tertiary'))}>
                      <FaBook className="mr-1" />
                      <span>Across all exams</span>
                    </div>
                  </div>
                  <div className={combine(
                    "w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl shrink-0",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaBookOpen className={combine(
                      "text-lg sm:text-xl",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Row */}
            <div className={getCardGradientClass('cyan')}>
              <div className="flex flex-col md:flex-row md:items-center md:space-x-6 space-y-4 md:space-y-0">
                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    <FaSearch className="inline mr-2" />
                    Search Everything
                  </label>
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search terms, exams, subjects..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Class Filter
                  </label>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="">All Classes</option>
                    {overviewClasses.map(cls => (
                      <option key={cls} value={cls}>
                        {cls.toLowerCase().startsWith('class ') ? cls : `Class ${cls}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Exam Filter
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => setFilterExam(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="">All Exams</option>
                    {allExamTypes.map(exam => (
                      <option key={exam} value={exam}>{exam}</option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Term Filter
                  </label>
                  <select
                    value={overviewTermFilter}
                    onChange={(e) => setOverviewTermFilter(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="">All Terms</option>
                    {termScheduleGroups.map((termGroup) => (
                      <option key={termGroup.term_id} value={termGroup.term_name}>
                        {termGroup.term_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Status Filter
                  </label>
                  <select
                    value={overviewStatusFilter}
                    onChange={(e) => setOverviewStatusFilter(e.target.value as 'all' | 'upcoming' | 'ongoing' | 'finished')}
                    className={getInputClass()}
                  >
                    <option value="all">All Status</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="finished">Finished</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Terms with nested schedules */}
            <div className={combine(getCardGradientClass('indigo'), "mt-4 sm:mt-6 border-2")}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
                  <div className={combine(
                    "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-md shrink-0",
                    theme === 'dark' ? 'bg-gradient-to-br from-indigo-700/40 to-blue-700/30' : 'bg-gradient-to-br from-indigo-100 to-blue-100'
                  )}>
                    <FaUniversity className={combine(
                      "text-base sm:text-xl",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={combine("text-base sm:text-lg lg:text-xl font-bold tracking-tight truncate", get('text', 'primary'))}>
                      Terms and Schedules
                    </h3>
                    <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                      Schedules are aligned under each term and exam type
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => exportToCSV(overviewScheduleExportRows, 'term_exam_schedules')}
                  className={combine(
                    "px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 shadow-sm hover:shadow-md transition-all w-full sm:w-auto",
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-indigo-800/60 to-blue-800/50 text-indigo-200 border border-indigo-700'
                      : 'bg-gradient-to-r from-indigo-100 to-blue-100 text-indigo-700 border border-indigo-200'
                  )}
                >
                  <FiDownload className="text-xs sm:text-sm" />
                  <span>Export</span>
                </button>
              </div>

              <div className="space-y-3 sm:space-y-4 max-h-[72dvh] overflow-y-auto pr-1 sm:pr-2">
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                      <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                        Loading terms and schedules...
                      </p>
                      <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing term schedules</p>
                    </div>
                  </div>
                ) : filteredTermScheduleGroups.length === 0 ? (
                  <div className="p-6 text-center">
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>
                      No matching term schedules
                    </h3>
                    <p className={combine("text-sm", get('text', 'secondary'))}>
                      Adjust search/class/exam filters to view schedules.
                    </p>
                  </div>
                ) : (
                  filteredTermScheduleGroups.map((termGroup) => (
                    <div
                      key={termGroup.term_id}
                      className={combine(
                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md",
                        theme === 'dark' ? 'bg-gradient-to-br from-gray-800/70 to-gray-900/40 border-indigo-800/40' : 'bg-gradient-to-br from-white to-indigo-50/40 border-indigo-100'
                      )}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex items-start gap-3">
                          <div>
                            <h4 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                              {termGroup.term_name}
                            </h4>
                            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                              {termGroup.total_exams} exam types • {termGroup.total_schedules} schedules
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={combine(
                            "px-2.5 sm:px-3 py-1 rounded-lg text-[11px] sm:text-xs font-semibold",
                            theme === 'dark' ? 'bg-indigo-900/40 text-indigo-200' : 'bg-indigo-100 text-indigo-700'
                          )}>
                            Rank {termGroup.term_rank}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(termGroup.term_id, setExpandedTerms)}
                            className={combine(
                              "p-2 rounded-lg transition-colors",
                              theme === 'dark' ? 'hover:bg-gray-700 text-indigo-300' : 'hover:bg-indigo-100 text-indigo-700'
                            )}
                            aria-label="Toggle term schedules"
                          >
                            {expandedTerms.includes(termGroup.term_id) ? (
                              <FaChevronUp className="text-xs" />
                            ) : (
                              <FaChevronDown className="text-xs" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className={combine("mt-3 h-px w-full", theme === 'dark' ? 'bg-gray-700/70' : 'bg-indigo-100')} />

                      {expandedTerms.includes(termGroup.term_id) && (
                        <div className="space-y-3 mt-3">
                          {termGroup.exams.map((exam) => (
                            <div
                              key={exam.id}
                              className={combine(
                                "rounded-xl border p-3 sm:p-3.5 transition-all duration-200 hover:scale-[1.003]",
                                theme === 'dark' ? 'border-gray-700 bg-gray-900/40' : 'border-gray-200 bg-white'
                              )}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                                <div className="min-w-0">
                                  <p className={combine("font-semibold text-sm sm:text-base truncate", get('text', 'primary'))}>{exam.name}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className={combine(
                                    "px-2 py-1 rounded text-[11px] sm:text-xs font-medium",
                                    theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                                  )}>
                                    Rank {exam.rank}
                                  </span>
                                  <span className={combine(
                                    "px-2 py-1 rounded text-[11px] sm:text-xs font-medium",
                                    theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'
                                  )}>
                                    Max {exam.max_marks}
                                  </span>
                                  <span className={combine(
                                    "px-2 py-1 rounded text-[11px] sm:text-xs font-medium",
                                    theme === 'dark' ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-700'
                                  )}>
                                    {exam.schedules.length} schedules
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => toggleExpanded(exam.id, setExpandedExams)}
                                    className={combine(
                                      "px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold ml-auto sm:ml-0",
                                      theme === 'dark' ? 'hover:bg-gray-700 bg-teal-900/30 text-teal-300' : 'hover:bg-teal-100 bg-teal-50 text-teal-700'
                                    )}
                                    aria-label="Toggle schedules"
                                  >
                                    <span className="inline-flex items-center gap-1">
                                      {expandedExams.includes(exam.id) ? 'Hide' : 'Show'}
                                      {expandedExams.includes(exam.id) ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                                    </span>
                                  </button>
                                </div>
                              </div>

                              {expandedExams.includes(exam.id) && (
                                <>
                                  {exam.schedules.length === 0 ? (
                                    <p className={combine("text-xs mt-2", get('text', 'tertiary'))}>
                                      No schedule created for this exam yet.
                                    </p>
                                  ) : (
                                    <div className="space-y-2 mt-3">
                                      {Array.from(
                                        exam.schedules.reduce((map, schedule) => {
                                          const normalizeClassName = (value: string) => value.toLowerCase().replace(/^class\s+/, '').trim();
                                          const classesForGrouping = filterClass
                                            ? schedule.classes.filter((cls) => normalizeClassName(cls) === normalizeClassName(filterClass))
                                            : schedule.classes;
                                          classesForGrouping.forEach((cls) => {
                                            if (!map.has(cls)) map.set(cls, []);
                                            map.get(cls)?.push(schedule);
                                          });
                                          return map;
                                        }, new Map<string, ExamSchedule[]>())
                                      ).map(([className, classSchedules]) => {
                                        const classKey = `${exam.id}::${className}`;
                                        const classExpanded = expandedClassGroups.includes(classKey);
                                        return (
                                          <div
                                            key={classKey}
                                            className={combine(
                                              "rounded-xl border p-3 sm:p-3.5",
                                              theme === 'dark' ? 'border-gray-700 bg-gray-900/35' : 'border-gray-200 bg-gray-50/80'
                                            )}
                                          >
                                            <div className="flex items-center justify-between gap-2">
                                              <div className="flex items-center gap-2">
                                                <span className={combine(
                                                  "px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold",
                                                  theme === 'dark' ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-100 text-blue-700'
                                                )}>
                                                  Class {className}
                                                </span>
                                               
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => toggleExpanded(classKey, setExpandedClassGroups)}
                                                className={combine(
                                                  "px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold",
                                                  theme === 'dark' ? 'hover:bg-gray-700 bg-blue-900/30 text-blue-300' : 'hover:bg-blue-100 bg-blue-50 text-blue-700'
                                                )}
                                                aria-label="Toggle class schedules"
                                              >
                                                <span className="inline-flex items-center gap-1">
                                                  {classExpanded ? 'Hide' : 'Show'}
                                                  {classExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                                                </span>
                                              </button>
                                            </div>

                                            {classExpanded && (
                                              <div className="space-y-2 mt-3">
                                                {classSchedules.map((schedule) => {
                                                  const status = getExamStatus(schedule.start_date, schedule.end_date);
                                                  const statusBorder = status.status === 'upcoming'
                                                    ? (theme === 'dark' ? 'border-l-blue-400' : 'border-l-blue-500')
                                                    : status.status === 'ongoing'
                                                      ? (theme === 'dark' ? 'border-l-green-400' : 'border-l-green-500')
                                                      : (theme === 'dark' ? 'border-l-gray-400' : 'border-l-gray-500');
                                                  return (
                                                    <div
                                                      key={`${classKey}::${schedule.id}`}
                                                      className={combine(
                                                        "rounded-xl border p-3 sm:p-3.5 border-l-4 transition-all duration-200 hover:shadow-sm",
                                                        statusBorder,
                                                        theme === 'dark' ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'
                                                      )}
                                                    >
                                                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                        <div className={combine("text-xs sm:text-sm", get('text', 'primary'))}>
                                                          {new Date(schedule.start_date).toLocaleDateString()} - {new Date(schedule.end_date).toLocaleDateString()}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                          <span className={combine(
                                                            "px-2 py-1 rounded text-[11px] sm:text-xs font-medium",
                                                            status.bgColor,
                                                            status.textColor
                                                          )}>
                                                            {status.status}
                                                          </span>
                                                          <span className={combine(
                                                            "px-2 py-1 rounded text-[11px] sm:text-xs font-medium",
                                                            theme === 'dark' ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                                                          )}>
                                                            {schedule.subjects.length} scheduled exams
                                                          </span>
                                                          {status.status === 'finished' && (
                                                            <button
                                                              type="button"
                                                              onClick={() => openResultsFromOverview(className, termGroup.term_name, exam.name)}
                                                              className={combine(
                                                                "px-2.5 py-1.5 rounded-lg transition-colors text-xs font-semibold ml-auto sm:ml-0",
                                                                theme === 'dark'
                                                                  ? 'hover:bg-gray-700 bg-blue-900/30 text-blue-300'
                                                                  : 'hover:bg-blue-100 bg-blue-50 text-blue-700'
                                                              )}
                                                            >
                                                              Show Results
                                                            </button>
                                                          )}
                                                        </div>
                                                      </div>

                                                      <div className={combine(
                                                        "mt-3 space-y-2 rounded-lg border p-2.5",
                                                        theme === 'dark' ? 'border-gray-700 bg-gray-900/30' : 'border-gray-200 bg-gray-50'
                                                      )}>
                                                        {schedule.subjects.map((subject) => {
                                                          const subjectColor = getSubjectColor(subject.subject_name);
                                                          return (
                                                            <div key={subject.id} className={combine("text-[11px] sm:text-xs flex items-center justify-between gap-2 sm:gap-3", get('text', 'secondary'))}>
                                                              <span
                                                                className={combine("font-medium px-1.5 sm:px-2 py-1 rounded-md border", !subjectColor ? get('text', 'primary') : '')}
                                                                style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                                              >
                                                                {subject.subject_name}
                                                              </span>
                                                              <span>{new Date(subject.exam_date).toLocaleDateString()} • {subject.session}</span>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Stats Row */}
            {/* Quick Stats Row - Enhanced with status breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
              <div className={getCardGradientClass('blue')}>
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-lg",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaCalendar className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                  <div>
                    <div className={combine("text-sm font-medium", get('text', 'secondary'))}>
                      Upcoming Exams
                    </div>
                    <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {getExamStats().upcomingSchedules}
                    </div>
                  </div>
                </div>
              </div>

              <div className={getCardGradientClass('green')}>
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-lg",
                    theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                  )}>
                    <FaClock className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    )} />
                  </div>
                  <div>
                    <div className={combine("text-sm font-medium", get('text', 'secondary'))}>
                      Ongoing Exams
                    </div>
                    <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {getExamStats().ongoingSchedules}
                    </div>
                  </div>
                </div>
              </div>

              <div className={getCardGradientClass('gray')}>
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-lg",
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                  )}>
                    <FaCheckCircle className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )} />
                  </div>
                  <div>
                    <div className={combine("text-sm font-medium", get('text', 'secondary'))}>
                      Finished Exams
                    </div>
                    <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {getExamStats().finishedSchedules}
                    </div>
                  </div>
                </div>
              </div>

              <div className={getCardGradientClass('purple')}>
                <div className="flex items-center space-x-3">
                  <div className={combine(
                    "p-2 rounded-lg",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaBookOpen className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                  <div>
                    <div className={combine("text-sm font-medium", get('text', 'secondary'))}>
                      Subjects per Exam
                    </div>
                    <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                      {schedules.length > 0
                        ? (getExamStats().totalSubjects / schedules.length).toFixed(1)
                        : 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'student' && (
  <div className="animate-fade-in">
    {/* Student Search Filters */}
    <div className={getCardGradientClass('purple')}>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
            <FaUserGraduate className="inline mr-2" />
            Student ID
          </label>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter Student ID (e.g., STU10A05)"
            className={getInputClass()}
          />
        </div>

        <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                    <FaCalendarAlt className="inline mr-2" />
                    Term
                  </label>
                  <select
                    value={filterTerm}
                    onChange={(e) => {
                      setFilterTerm(e.target.value);
                      setFilterExam('');
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Term</option>
                    <option value="all">All Terms</option>
                    {terms.map(term => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                  </select>
                </div>

        <div>
  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
    <FaClipboardList className="inline mr-2" />
    Exam Type
  </label>
  <select
    value={filterExam}
    onChange={(e) => setFilterExam(e.target.value)}
    className={getInputClass()}
    disabled={!filterTerm || studentAvailableExamTypes.length === 0}
  >
    <option value="">
      {!filterTerm
        ? 'Select term first'
        : studentAvailableExamTypes.length === 0
          ? 'No completed exams available'
          : 'Select Exam'}
    </option>
    <option value="all">All Exams</option>
    {studentAvailableExamTypes.map(exam => (
      <option key={exam} value={exam}>{exam}</option>
    ))}
  </select>
</div>

        <div className="flex items-end">
          <button
            onClick={fetchStudentResultById}
            disabled={
              loadingStudentSearch
              || !studentId.trim()
            }
            className={combine(
              getPrimaryButtonClass(),
              "w-full flex items-center justify-center space-x-2 text-xs sm:text-sm disabled:opacity-50"
            )}
          >
            <FaSearch />
            <span>Search Student</span>
          </button>
        </div>
      </div>

      <div className="mt-3 sm:mt-4 flex items-center justify-between">
        <div className={combine("text-xs", get('text', 'secondary'))}>
          {studentId.trim() ? (
            <span>
              Searching for: <span className="font-medium">{studentId.trim()}</span> •
              <span className="font-medium ml-2">{filterExam || 'All Exams'}</span> •
              <span className="font-medium ml-2">{filterTerm || 'All Terms'}</span>
            </span>
          ) : (
            <span>Please enter Student ID and select filters if needed</span>
          )}
        </div>
      </div>
    </div>

    {/* Student Result Display */}
    {loadingStudentSearch && (
      <div className={combine(getCardGradientClass('purple'), "mt-4 sm:mt-6 p-6 sm:p-12 text-center")}>
        <div className="text-center">
          <div className="relative mx-auto w-16 h-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
            Fetching student results...
          </p>
          <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing student results</p>
        </div>
      </div>
    )}

    {studentSearchResult && !loadingStudentSearch && (studentSearchResult.student || studentSearchResult.class || studentSearchResult.section) && (
      <div className={combine(getCardGradientClass('blue'), "mt-4 sm:mt-6 py-3 sm:py-4")}>
        <div className="flex items-center gap-3 flex-wrap">
          {studentSearchResult.profile_image && (
            <div className={combine(
              "h-10 w-10 rounded-full overflow-hidden border flex items-center justify-center",
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-100'
            )}>
              <img
    src={`${process.env.NEXT_PUBLIC_BACKEND_API}${studentSearchResult.profile_image}`}
    alt={studentSearchResult.student || 'Student'}
    className="h-full w-full object-cover"
    onError={(e) => {
      console.log('Image failed to load');
      // e.target.style.display = 'none';
    }}
    onLoad={() => console.log('Image loaded successfully')}
  />
            </div>
          )}
          {studentSearchResult.student && (
            <span className={combine(
              "inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border",
              theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
            )}>
              Student: {studentSearchResult.student}
            </span>
          )}
          {studentSearchResult.class && (
            <span className={combine(
              "inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border",
              theme === 'dark' ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-blue-100 text-blue-700 border-blue-200'
            )}>
              Class: {studentSearchResult.class}
            </span>
          )}
          {studentSearchResult.section && (
            <span className={combine(
              "inline-flex items-center px-2 py-1 text-xs rounded-full font-medium border",
              theme === 'dark' ? 'bg-purple-900/30 text-purple-300 border-purple-800' : 'bg-purple-100 text-purple-700 border-purple-200'
            )}>
              Section: {studentSearchResult.section}
            </span>
          )}
        </div>
      </div>
    )}

    {studentSearchResult && !loadingStudentSearch && activeStudentExamGroup && studentExamGroups.length === 1 && (
      <div className="mt-4 sm:mt-6">
        {/* Student Info Header */}
        <div className={getCardGradientClass('purple')}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                  {activeStudentExamGroup.exam}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {studentExamGroups.length > 1 && (
                <select
                  value={selectedStudentExamLabel}
                  onChange={(e) => setSelectedStudentExamLabel(e.target.value)}
                  className={combine(getInputClass(), "min-w-[180px] sm:min-w-[220px]")}
                >
                  {studentExamGroups.map((group) => (
                    <option key={group.exam} value={group.exam}>{group.exam}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => {
                  const exportData = {
                    student: studentSearchResult.student,
                    exam: activeStudentExamGroup.exam,
                    subjects: activeStudentExamGroup.subjects
                  };
                  exportToCSV([exportData], `student_result_${studentId}`);
                }}
                className={combine(
                  "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2",
                  theme === 'dark'
                    ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                    : 'bg-purple-100 text-purple-700 border border-purple-200'
                )}
              >
                <FiDownload className="text-xs sm:text-sm" />
                <span>Export Result</span>
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
            {(() => {
              const assignedSubjects = activeStudentExamGroup.subjects.filter(subj => subj.grade !== '-');
              const totalSubjects = assignedSubjects.length;
              const attendedSubjects = assignedSubjects.filter(subj => 
                subj.marks !== null && subj.marks !== undefined
              ).length;
              const totalMarks = assignedSubjects.reduce((sum, subj) => {
                if (subj.marks === null || subj.marks === undefined) return sum;
                const marksNum = typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks;
                return sum + (isNaN(marksNum) ? 0 : marksNum);
              }, 0);
              const maxMarks = assignedSubjects.reduce((sum, subj) => {
                const maxMarksNum = typeof subj.max_marks === 'string' ? parseFloat(subj.max_marks) : subj.max_marks;
                return sum + (isNaN(maxMarksNum) ? 0 : maxMarksNum);
              }, 0);
              const percentage = maxMarks > 0 ? (totalMarks / maxMarks * 100).toFixed(1) : '0.0';

              return (
                <>
                  <div className={combine(
                    "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                    theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                  )}>
                    <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                      Total Subjects
                    </div>
                    <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                      {totalSubjects}
                    </div>
                  </div>

                  <div className={combine(
                    "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                    theme === 'dark' ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
                  )}>
                    <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>
                      Attended
                    </div>
                    <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                      {attendedSubjects}
                    </div>
                    <div className={combine("text-xs mt-1", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                      {totalSubjects > 0 ? ((attendedSubjects / totalSubjects) * 100).toFixed(0) : 0}% attendance
                    </div>
                  </div>

                  <div className={combine(
                    "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                    theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
                  )}>
                    <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                      Total Marks
                    </div>
                    <div className={combine("text-base sm:text-2xl font-bold", get('text', 'primary'))}>
                      {totalMarks.toFixed(2)}/{maxMarks.toFixed(2)}
                    </div>
                  </div>

                  <div className={combine(
                    "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                    theme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'
                  )}>
                    <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-purple-400" : "text-purple-600")}>
                      Percentage
                    </div>
                    <div className={combine(
                      "text-lg sm:text-2xl font-bold",
                      Number(percentage) >= 80
                        ? theme === 'dark' ? "text-green-400" : "text-green-600"
                        : Number(percentage) >= 60
                          ? theme === 'dark' ? "text-blue-400" : "text-blue-600"
                          : Number(percentage) >= 40
                            ? theme === 'dark' ? "text-amber-400" : "text-amber-600"
                            : theme === 'dark' ? "text-red-400" : "text-red-600"
                    )}>
                      {percentage}%
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {/* Subjects Table */}
          <div className={combine(
            "rounded-xl border overflow-hidden",
            get('border', 'primary')
          )}>
            <div className={combine(
              "px-3 sm:px-6 py-3 sm:py-4 border-b",
              get('border', 'primary'),
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            )}>
              <h3 className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>
                Subject-wise Performance
              </h3>
            </div>

            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={combine(
                    "border-b",
                    get('border', 'primary'),
                    theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                  )}>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Subject</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Marks Obtained</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Maximum Marks</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Percentage</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Grade</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudentExamGroup.subjects
                    .filter(subj => subj.grade !== '-')
                    .map((subject, index) => {
                      const marksNum = subject.marks !== null && subject.marks !== undefined
                        ? (typeof subject.marks === 'string' ? parseFloat(subject.marks) : subject.marks)
                        : null;
                      const maxMarksNum = subject.max_marks !== null && subject.max_marks !== undefined
                        ? (typeof subject.max_marks === 'string' ? parseFloat(subject.max_marks) : subject.max_marks)
                        : 0;
                      const subjectPercentage = marksNum !== null && !isNaN(marksNum) && maxMarksNum > 0
                        ? ((marksNum / maxMarksNum) * 100).toFixed(1)
                        : 'N/A';
                      const isAbsent = marksNum === null;

                      return (
                        <tr key={index} className={combine(
                          "border-b transition-colors",
                          get('border', 'primary'),
                          theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                        )}>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            {(() => {
                              const subjectColor = getSubjectColor(subject.subject);
                              return (
                                <span
                                  className={combine("font-medium text-xs sm:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border inline-block", !subjectColor ? get('text', 'primary') : '')}
                                  style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                >
                                  {subject.subject}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <div className={combine(
                              "font-bold",
                              isAbsent ? combine(get('text', 'secondary'), get('text', 'tertiary')) : get('text', 'primary')
                            )}>
                              {marksNum !== null ? marksNum.toFixed(2) : 'Absent'}
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <div className={combine(get('text', 'secondary'), get('text', 'tertiary'))}>
                              {maxMarksNum.toFixed(2)}
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <div className={combine(
                              "font-semibold",
                              isAbsent
                                ? combine(get('text', 'secondary'), get('text', 'tertiary'))
                                : Number(subjectPercentage) >= 80
                                  ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                  : Number(subjectPercentage) >= 60
                                    ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    : Number(subjectPercentage) >= 40
                                      ? theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                      : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                            )}>
                              {subjectPercentage !== 'N/A' ? subjectPercentage + '%' : subjectPercentage}
                            </div>
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <span className={combine(
                              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium inline-flex items-center",
                              isAbsent
                                ? theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                                : subject.grade === 'S' || subject.grade === 'A'
                                  ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                  : subject.grade === 'B' || subject.grade === 'C'
                                    ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                    : theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                            )}>
                              <span
                                className="w-2 h-2 rounded-full mr-2"
                                style={{ backgroundColor: getGradeColor(subject.grade) }}
                              />
                              {subject.grade}
                            </span>
                          </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <span className={combine(
                              "px-3 py-1 rounded text-xs font-medium",
                              isAbsent
                                ? theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                                : Number(subjectPercentage) >= 80
                                  ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                  : Number(subjectPercentage) >= 60
                                    ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                    : Number(subjectPercentage) >= 40
                                      ? theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                                      : theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                            )}>
                              {isAbsent ? 'Absent' :
                                Number(subjectPercentage) >= 80 ? 'Excellent' :
                                  Number(subjectPercentage) >= 60 ? 'Good' :
                                    Number(subjectPercentage) >= 40 ? 'Average' : 'Needs Improvement'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Insights */}
          <div className={combine(
            "mt-4 sm:mt-6 p-4 sm:p-6 rounded-xl border",
            get('border', 'primary'),
            theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
          )}>
            <h4 className={combine("text-sm sm:text-base font-bold mb-3 sm:mb-4", get('text', 'primary'))}>
              Performance Insights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              {(() => {
                const assignedSubjects = activeStudentExamGroup.subjects.filter(subj => subj.grade !== '-');
                const subjectsWithMarks = assignedSubjects.filter(subj => {
                  const marks = subj.marks !== null ? (typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks) : null;
                  return marks !== null && !isNaN(marks);
                });

                const strongest = subjectsWithMarks.length > 0
                  ? subjectsWithMarks.reduce((prev, current) => {
                      const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                      const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                      const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                      const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;
                      return (prevMarks / prevMax) > (currentMarks / currentMax) ? prev : current;
                    })
                  : null;

                const weakest = subjectsWithMarks.length > 0
                  ? subjectsWithMarks.reduce((prev, current) => {
                      const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                      const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                      const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                      const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;
                      return (prevMarks / prevMax) < (currentMarks / currentMax) ? prev : current;
                    })
                  : null;

                const totalSubjects = assignedSubjects.length;
                const attendedSubjects = subjectsWithMarks.length;
                const attendanceRate = totalSubjects > 0 ? (attendedSubjects / totalSubjects * 100).toFixed(1) : 0;

                return (
                  <>
                    <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Strongest Subject</div>
                      <div className={combine("font-medium mt-1", theme === 'dark' ? "text-green-400" : "text-green-600")}>
                        {strongest ? `${strongest.subject} (${strongest.grade})` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Needs Improvement</div>
                      <div className={combine("font-medium mt-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                        {weakest ? `${weakest.subject} (${weakest.grade})` : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Attendance Rate</div>
                      <div className={combine("font-medium mt-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                        {attendanceRate}%
                      </div>
                    </div>
                    <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Total Subjects</div>
                      <div className={combine("font-medium mt-1", get('text', 'primary'))}>
                        {totalSubjects}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    )}

    {studentSearchResult && !loadingStudentSearch && studentExamGroups.length > 1 && (
      <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className={combine("px-1 text-xs sm:text-sm", get('text', 'secondary'))}>
            Showing exam-wise detailed performance: <span className={combine("font-semibold", get('text', 'primary'))}>{studentExamGroups.length}</span>
          </div>
          <button
            onClick={exportAllStudentExamResults}
            className={combine(
              "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2 w-full sm:w-auto justify-center",
              theme === 'dark'
                ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                : 'bg-purple-100 text-purple-700 border border-purple-200'
            )}
          >
            <FiDownload className="text-xs sm:text-sm" />
            <span>Export All Exams</span>
          </button>
        </div>
        {studentExamGroups.map((group, groupIndex) => (
          <div key={`${group.exam}-${groupIndex}`} className={getCardGradientClass('purple')}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <div>
                  <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                    {group.exam}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const exportData = {
                      student: studentSearchResult.student,
                      exam: group.exam,
                      subjects: group.subjects
                    };
                    exportToCSV([exportData], `student_result_${studentId}_${groupIndex + 1}`);
                  }}
                  className={combine(
                    "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2",
                    theme === 'dark'
                      ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
                      : 'bg-purple-100 text-purple-700 border border-purple-200'
                  )}
                >
                  <FiDownload className="text-xs sm:text-sm" />
                  <span>Export Result</span>
                </button>
                <button
                  onClick={() => setExpandedMultiExamIndex((prev) => (prev === groupIndex ? -1 : groupIndex))}
                  className={combine(
                    "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border",
                    theme === 'dark'
                      ? 'bg-gray-900/40 text-gray-300 border-gray-700'
                      : 'bg-white text-gray-700 border-gray-300'
                  )}
                  aria-label="Toggle exam details"
                >
                  {expandedMultiExamIndex === groupIndex ? <FaChevronUp /> : <FaChevronDown />}
                </button>
              </div>
            </div>

            {expandedMultiExamIndex === groupIndex && (
              <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {(() => {
                const assignedSubjects = group.subjects.filter(subj => subj.grade !== '-');
                const totalSubjects = assignedSubjects.length;
                const attendedSubjects = assignedSubjects.filter(subj =>
                  subj.marks !== null && subj.marks !== undefined
                ).length;
                const totalMarks = assignedSubjects.reduce((sum, subj) => {
                  if (subj.marks === null || subj.marks === undefined) return sum;
                  const marksNum = typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks;
                  return sum + (isNaN(marksNum) ? 0 : marksNum);
                }, 0);
                const maxMarks = assignedSubjects.reduce((sum, subj) => {
                  const maxMarksNum = typeof subj.max_marks === 'string' ? parseFloat(subj.max_marks) : subj.max_marks;
                  return sum + (isNaN(maxMarksNum) ? 0 : maxMarksNum);
                }, 0);
                const percentage = maxMarks > 0 ? (totalMarks / maxMarks * 100).toFixed(1) : '0.0';

                return (
                  <>
                    <div className={combine(
                      "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                      theme === 'dark' ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                    )}>
                      <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                        Total Subjects
                      </div>
                      <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                        {totalSubjects}
                      </div>
                    </div>

	                    <div className={combine(
	                      "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
	                      theme === 'dark' ? 'bg-emerald-900/20 border-emerald-800' : 'bg-emerald-50 border-emerald-200'
	                    )}>
                      <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-emerald-400" : "text-emerald-600")}>
                        Attended
                      </div>
                      <div className={combine("text-lg sm:text-2xl font-bold", get('text', 'primary'))}>
                        {attendedSubjects}
                      </div>
                      <div className={combine("text-xs mt-1", theme === 'dark' ? "text-gray-400" : "text-gray-500")}>
                        {totalSubjects > 0 ? ((attendedSubjects / totalSubjects) * 100).toFixed(0) : 0}% attendance
                      </div>
                    </div>

                    <div className={combine(
                      "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                      theme === 'dark' ? 'bg-amber-900/20 border-amber-800' : 'bg-amber-50 border-amber-200'
                    )}>
                      <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                        Total Marks
                      </div>
                      <div className={combine("text-base sm:text-2xl font-bold", get('text', 'primary'))}>
                        {totalMarks.toFixed(2)}/{maxMarks.toFixed(2)}
                      </div>
                    </div>

                    <div className={combine(
                      "p-3 sm:p-4 rounded-xl border min-h-[108px] sm:min-h-[120px]",
                      theme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'
                    )}>
                      <div className={combine("text-xs sm:text-sm font-medium mb-1", theme === 'dark' ? "text-purple-400" : "text-purple-600")}>
                        Percentage
                      </div>
                      <div className={combine(
                      "text-lg sm:text-2xl font-bold",
                        Number(percentage) >= 80
                          ? theme === 'dark' ? "text-green-400" : "text-green-600"
                          : Number(percentage) >= 60
                            ? theme === 'dark' ? "text-blue-400" : "text-blue-600"
                            : Number(percentage) >= 40
                              ? theme === 'dark' ? "text-amber-400" : "text-amber-600"
                              : theme === 'dark' ? "text-red-400" : "text-red-600"
                      )}>
                        {percentage}%
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className={combine(
              "rounded-xl border overflow-hidden",
              get('border', 'primary')
            )}>
              <div className={combine(
                "px-3 sm:px-6 py-3 sm:py-4 border-b",
                get('border', 'primary'),
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
              )}>
                  <h3 className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>
                    Subject-wise Performance
                  </h3>
                </div>

              <div className="w-full max-w-full overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={combine(
                      "border-b",
                      get('border', 'primary'),
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
                    )}>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Subject</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Marks Obtained</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Maximum Marks</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Percentage</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Grade</th>
                    <th className={combine("py-2.5 sm:py-3 px-3 sm:px-6 text-left text-xs sm:text-sm font-semibold", get('text', 'tertiary'))}>Status</th>
                  </tr>
                </thead>
                  <tbody>
                    {group.subjects
                      .filter(subj => subj.grade !== '-')
                      .map((subject, index) => {
                        const marksNum = subject.marks !== null && subject.marks !== undefined
                          ? (typeof subject.marks === 'string' ? parseFloat(subject.marks) : subject.marks)
                          : null;
                        const maxMarksNum = subject.max_marks !== null && subject.max_marks !== undefined
                          ? (typeof subject.max_marks === 'string' ? parseFloat(subject.max_marks) : subject.max_marks)
                          : 0;
                        const subjectPercentage = marksNum !== null && !isNaN(marksNum) && maxMarksNum > 0
                          ? ((marksNum / maxMarksNum) * 100).toFixed(1)
                          : 'N/A';
                        const isAbsent = marksNum === null;

                        return (
                          <tr key={index} className={combine(
                            "border-b transition-colors",
                            get('border', 'primary'),
                            theme === 'dark' ? 'hover:bg-gray-800' : 'hover:bg-gray-50'
                          )}>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                              {(() => {
                                const subjectColor = getSubjectColor(subject.subject);
                                return (
                                  <span
                                  className={combine("font-medium text-xs sm:text-sm px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg border inline-block", !subjectColor ? get('text', 'primary') : '')}
                                    style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                  >
                                    {subject.subject}
                                  </span>
                                );
                              })()}
                            </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                              <div className={combine(
                                "font-bold",
                                isAbsent ? combine(get('text', 'secondary'), get('text', 'tertiary')) : get('text', 'primary')
                              )}>
                                {marksNum !== null ? marksNum.toFixed(2) : 'Absent'}
                              </div>
                            </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                              <div className={combine(get('text', 'secondary'), get('text', 'tertiary'))}>
                                {maxMarksNum.toFixed(2)}
                              </div>
                            </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                              <div className={combine(
                                "font-semibold",
                                isAbsent
                                  ? combine(get('text', 'secondary'), get('text', 'tertiary'))
                                  : Number(subjectPercentage) >= 80
                                    ? theme === 'dark' ? 'text-green-400' : 'text-green-600'
                                    : Number(subjectPercentage) >= 60
                                      ? theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                      : Number(subjectPercentage) >= 40
                                        ? theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                        : theme === 'dark' ? 'text-red-400' : 'text-red-600'
                              )}>
                                {subjectPercentage !== 'N/A' ? subjectPercentage + '%' : subjectPercentage}
                              </div>
                            </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                            <span className={combine(
                              "px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium inline-flex items-center",
                                isAbsent
                                  ? theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                                  : subject.grade === 'S' || subject.grade === 'A'
                                    ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                    : subject.grade === 'B' || subject.grade === 'C'
                                      ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                      : theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                              )}>
                                <span
                                  className="w-2 h-2 rounded-full mr-2"
                                  style={{ backgroundColor: getGradeColor(subject.grade) }}
                                />
                                {subject.grade}
                              </span>
                            </td>
                          <td className="py-3 sm:py-4 px-3 sm:px-6 text-xs sm:text-sm">
                              <span className={combine(
                                "px-3 py-1 rounded text-xs font-medium",
                                isAbsent
                                  ? theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-700'
                                  : Number(subjectPercentage) >= 80
                                    ? theme === 'dark' ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700'
                                    : Number(subjectPercentage) >= 60
                                      ? theme === 'dark' ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'
                                      : Number(subjectPercentage) >= 40
                                        ? theme === 'dark' ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                                        : theme === 'dark' ? 'bg-red-900/30 text-red-400' : 'bg-red-100 text-red-700'
                              )}>
                                {isAbsent ? 'Absent' :
                                  Number(subjectPercentage) >= 80 ? 'Excellent' :
                                    Number(subjectPercentage) >= 60 ? 'Good' :
                                      Number(subjectPercentage) >= 40 ? 'Average' : 'Needs Improvement'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={combine(
            "mt-4 sm:mt-6 p-4 sm:p-6 rounded-xl border",
              get('border', 'primary'),
              theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50'
            )}>
            <h4 className={combine("text-sm sm:text-base font-bold mb-3 sm:mb-4", get('text', 'primary'))}>
              Performance Insights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                {(() => {
                  const assignedSubjects = group.subjects.filter(subj => subj.grade !== '-');
                  const subjectsWithMarks = assignedSubjects.filter(subj => {
                    const marks = subj.marks !== null ? (typeof subj.marks === 'string' ? parseFloat(subj.marks) : subj.marks) : null;
                    return marks !== null && !isNaN(marks);
                  });

                  const strongest = subjectsWithMarks.length > 0
                    ? subjectsWithMarks.reduce((prev, current) => {
                        const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                        const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                        const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                        const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;
                        return (prevMarks / prevMax) > (currentMarks / currentMax) ? prev : current;
                      })
                    : null;

                  const weakest = subjectsWithMarks.length > 0
                    ? subjectsWithMarks.reduce((prev, current) => {
                        const prevMarks = typeof prev.marks === 'string' ? parseFloat(prev.marks) : prev.marks || 0;
                        const prevMax = typeof prev.max_marks === 'string' ? parseFloat(prev.max_marks) : prev.max_marks || 1;
                        const currentMarks = typeof current.marks === 'string' ? parseFloat(current.marks) : current.marks || 0;
                        const currentMax = typeof current.max_marks === 'string' ? parseFloat(current.max_marks) : current.max_marks || 1;
                        return (prevMarks / prevMax) < (currentMarks / currentMax) ? prev : current;
                      })
                    : null;

                  const totalSubjects = assignedSubjects.length;
                  const attendedSubjects = subjectsWithMarks.length;
                  const attendanceRate = totalSubjects > 0 ? (attendedSubjects / totalSubjects * 100).toFixed(1) : 0;

                  return (
                    <>
                      <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Strongest Subject</div>
                        <div className={combine("font-medium mt-1", theme === 'dark' ? "text-green-400" : "text-green-600")}>
                          {strongest ? `${strongest.subject} (${strongest.grade})` : 'N/A'}
                        </div>
                      </div>
                      <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Needs Improvement</div>
                        <div className={combine("font-medium mt-1", theme === 'dark' ? "text-amber-400" : "text-amber-600")}>
                          {weakest ? `${weakest.subject} (${weakest.grade})` : 'N/A'}
                        </div>
                      </div>
                      <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Attendance Rate</div>
                        <div className={combine("font-medium mt-1", theme === 'dark' ? "text-blue-400" : "text-blue-600")}>
                          {attendanceRate}%
                        </div>
                      </div>
                      <div>
                      <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Total Subjects</div>
                        <div className={combine("font-medium mt-1", get('text', 'primary'))}>
                          {totalSubjects}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
              </>
            )}
          </div>
        ))}
      </div>
    )}

    {!studentSearchResult && !loadingStudentSearch && studentId.trim() && (
      <div className={combine(getCardGradientClass('purple'), "mt-4 sm:mt-6 p-6 sm:p-12 text-center")}>
        <div className={combine(
          "inline-block p-4 rounded-full mb-4",
          theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
        )}>
          <FaUserGraduate className={combine(
            "text-2xl sm:text-3xl",
            theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
          )} />
        </div>
        <h3 className={combine("text-base sm:text-lg font-medium mb-2", get('text', 'primary'))}>
          No results found
        </h3>
        <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
          No exam results found for Student ID: {studentId.trim()} with the selected filters
        </p>
      </div>
    )}
  </div>
)}

        {activeTab === 'results' && (
          <div className="animate-fade-in">
            {/* Results Filters */}
            <div className={getCardGradientClass('emerald')}>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                    <MdClass className="inline mr-2" />
                    Class
                  </label>
                  <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                    {standards.map(standard => (
                      <option key={standard.id} value={standard.name}>
                        {standard.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                    <MdClass className="inline mr-2" />
                    Section
                  </label>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    disabled={!filterClass}
                    className={getInputClass()}
                  >
                    <option value="">Select Section</option>
                    {sections.map(section => (
                      <option key={section.id} value={section.name}>
                        Section {section.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                    <FaCalendarAlt className="inline mr-2" />
                    Term
                  </label>
                  <select
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="">Select Term</option>
                    {terms.map(term => (
                      <option key={term.id} value={term.name}>{term.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                    <FaClipboardList className="inline mr-2" />
                    Exam Type
                  </label>
                  <select
                    value={filterExam}
                    onChange={(e) => setFilterExam(e.target.value)}
                    className={getInputClass()}
                    disabled={!filterClass || !filterTerm || availableExamTypes.length === 0}
                  >
                    <option value="">
                      {!filterClass || !filterTerm
                        ? 'Select class and term first'
                        : availableExamTypes.length === 0
                          ? 'No completed exams available'
                          : 'Select Exam'}
                    </option>
                    {availableExamTypes.map(exam => (
                      <option key={exam} value={exam}>{exam}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={fetchClassResults}
                    disabled={loading || !filterClass || !filterSection || !filterTerm || !filterExam}
                    className={combine(
                      getPrimaryButtonClass(),
                      "w-full flex items-center justify-center space-x-2 disabled:opacity-50"
                    )}
                  >
                    <FaChartBar />
                    <span>View Results</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className={combine("text-xs", get('text', 'secondary'))}>
                  {filterClass && filterTerm ? (
                    <span>
                      {availableExamTypes.length > 0 ? (
                        <>
                          Found <span className="font-medium">{availableExamTypes.length}</span> exam types for {filterClass} - {filterTerm}
                        </>
                      ) : (
                        <span>No exams available for selected class and term</span>
                      )}
                    </span>
                  ) : (
                    <span>Please select class and term to see available exams</span>
                  )}
                </div>
                {classResults && (
                  <button
                    onClick={() => exportToCSV(classResults.data, `results_${filterClass}_${filterSection}_${filterExam}`)}
                    className={combine(
                      "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2",
                      theme === 'dark'
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    )}
                  >
                    <FiDownload className="text-xs sm:text-sm" />
                    <span>Export Results</span>
                  </button>
                )}
              </div>
            </div>

            {/* Results Display */}
            {classResults && (
              <div className="mt-6 space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
                  <div className={getCardGradientClass('blue')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Students</p>
                        <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2", get('text', 'primary'))}>
                          {classResults.analytics.total_students}
                        </p>
                      </div>
                      <FaUsers className={combine(
                        "text-2xl",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    </div>
                  </div>

                  <div className={getCardGradientClass('emerald')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Passed Students</p>
                        <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2", get('text', 'primary'))}>
                          {classResults.analytics.total_pass}
                        </p>
                      </div>
                      <FaPercentage className={combine(
                        "text-2xl",
                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                      )} />
                    </div>
                    <div className={combine("mt-3 text-xs", get('accent', 'success'))}>
                      {((classResults.analytics.total_pass / classResults.analytics.total_students) * 100).toFixed(1)}% pass rate
                    </div>
                  </div>

                  <div className={getCardGradientClass('amber')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Top Grade (S)</p>
                        <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2", get('text', 'primary'))}>
                          {classResults.analytics.grade_breakdown.S || 0}
                        </p>
                      </div>
                      <FaChartBar className={combine(
                        "text-2xl",
                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                      )} />
                    </div>
                  </div>

                  <div className={getCardGradientClass('purple')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Average Score</p>
                        <p className={combine("text-xl sm:text-2xl lg:text-3xl font-bold mt-2", get('text', 'primary'))}>
                          {classResults.data.length > 0
                            ? (classResults.data.reduce((sum, student) => sum + student.summative_total, 0) / classResults.data.length).toFixed(1)
                            : 0}
                        </p>
                      </div>
                      <FaChartLine className={combine(
                        "text-2xl",
                        theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                      )} />
                    </div>
                  </div>
                </div>

                {/* Grade Distribution Line Chart */}
                <div className="w-full">
                  {renderGradeDistributionLineChart()}
                </div>

                {/* Detailed Results Table */}
                <div className={getCardGradientClass()}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
                    <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                      Detailed Results
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => exportToCSV(classResults.data, `results_${filterClass}_${filterSection}_${filterExam}`)}
                        className={combine(
                          "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium flex items-center space-x-2",
                          theme === 'dark'
                            ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                            : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        )}
                      >
                        <FiDownload className="text-xs sm:text-sm" />
                        <span>Export CSV</span>
                      </button>
                      <div className={combine(
                        "px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium",
                        theme === 'dark'
                          ? 'bg-blue-900/30 text-blue-400 border border-blue-800'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      )}>
                        Showing {classResults.data.length} students
                      </div>
                    </div>
                  </div>

                  <div className="w-full max-w-full overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className={combine("border-b", get('border', 'primary'))}>
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Rank
                          </th>
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Student ID
                          </th>
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Name
                          </th>
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Total Marks
                          </th>
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Grade
                          </th>
                          {/* <th className={combine("py-3 px-4 text-left text-sm font-medium", get('text', 'tertiary'))}>
                            Performance
                          </th> */}
                          <th className={combine("py-2.5 sm:py-3 px-3 sm:px-4 text-left text-xs sm:text-sm font-medium", get('text', 'tertiary'))}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {classResults.data
                          .sort((a, b) => b.summative_total - a.summative_total)
                          .map((student, index) => {
                            const avgScore = classResults.data.reduce((sum, s) => sum + s.summative_total, 0) / classResults.data.length;
                            const performance = student.summative_total > avgScore ? 'Above Average' :
                              student.summative_total < avgScore ? 'Below Average' : 'Average';
                            const isExpanded = expandedStudentId === student.student_id;

                            return (
                              <>
                                <tr key={student.student_id} className={combine(
                                  "border-b transition-colors",
                                  get('border', 'primary'),
                                  isExpanded
                                    ? theme === 'dark'
                                      ? 'bg-blue-900/20 border-l-4 border-l-blue-500'
                                      : 'bg-blue-50/50 border-l-4 border-l-blue-400'
                                    : theme === 'dark'
                                      ? 'hover:bg-gray-800/50'
                                      : 'hover:bg-gray-50/80'
                                )}>
                                  <td className="py-3 px-4">
                                    <div className={combine(
                                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                                      index < 3
                                        ? theme === 'dark'
                                          ? 'bg-amber-900/30 text-amber-400'
                                          : 'bg-amber-100 text-amber-700'
                                        : theme === 'dark'
                                          ? 'bg-gray-800 text-gray-400'
                                          : 'bg-gray-100 text-gray-700'
                                    )}>
                                      {index + 1}
                                    </div>
                                  </td>
                                  <td className={combine("py-3 px-4", get('text', 'primary'))}>
                                    {student.student_id}
                                  </td>
                                  <td className={combine("py-3 px-4", get('text', 'primary'))}>
                                    {student.name}
                                  </td>
                                  <td className={combine("py-3 px-4 font-medium", get('text', 'primary'))}>
                                    {student.summative_total}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={combine(
                                      "px-3 py-1 rounded-full text-sm font-medium",
                                      theme === 'dark'
                                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
                                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                    )}>
                                      {student.overall_grade}
                                    </span>
                                  </td>
                                  
                                  <td className="py-3 px-4">
                                    <button
                                      onClick={() => fetchStudentExamDetail(student.student_id, student.name)}
                                      disabled={loadingDetail === student.student_id}
                                      className={combine(
                                        "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center space-x-2 min-w-[120px]",
                                        "transition-all hover:scale-105 active:scale-95 disabled:opacity-50",
                                        theme === 'dark'
                                          ? 'bg-blue-900/30 text-blue-400 border border-blue-800 hover:bg-blue-800/40'
                                          : 'bg-blue-100 text-blue-700 border border-blue-200 hover:bg-blue-200'
                                      )}
                                    >
                                      {loadingDetail === student.student_id ? (
                                        <>
                                          <div className={combine(
                                            "animate-spin rounded-full h-4 w-4 border-2",
                                            theme === 'dark'
                                              ? 'border-blue-400 border-t-transparent'
                                              : 'border-blue-600 border-t-transparent'
                                          )}></div>
                                          <span>Loading...</span>
                                        </>
                                      ) : (
                                        <>
                                          {isExpanded ? (
                                            <>
                                              <FaChevronUp className="text-xs" />
                                              <span>Hide Details</span>
                                            </>
                                          ) : (
                                            <>
                                              <FaEyeIcon className="text-xs" />
                                              <span>View Details</span>
                                            </>
                                          )}
                                        </>
                                      )}
                                    </button>
                                  </td>
                                </tr>
                                {renderStudentDetailRow(student.student_id)}
                              </>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {subjectsPopupSchedule && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4"
            onClick={() => setSubjectsPopupSchedule(null)}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            <div
              className={combine(
                "relative w-full max-w-2xl rounded-2xl border shadow-2xl max-h-[85vh] overflow-hidden",
                get('border', 'primary'),
                get('bg', 'card')
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={combine(
                "flex items-start justify-between p-4 sm:p-5 border-b",
                get('border', 'primary'),
                get('bg', 'secondary')
              )}>
                <div>
                  <h3 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>
                    {subjectsPopupSchedule.exam_type_name} - Full Subject Schedule
                  </h3>
                  <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                    {new Date(subjectsPopupSchedule.start_date).toLocaleDateString()} - {new Date(subjectsPopupSchedule.end_date).toLocaleDateString()} • {subjectsPopupSchedule.subjects.length} subjects
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubjectsPopupSchedule(null)}
                  className={combine(
                    "p-2 rounded-lg transition-colors",
                    get('bg', 'hover'),
                    get('icon', 'primary')
                  )}
                  aria-label="Close subjects popup"
                >
                  <FiX className="text-base" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto max-h-[65vh]">
                {subjectsPopupSchedule.subjects.length === 0 ? (
                  <div className={combine("text-center py-8 text-sm", get('text', 'secondary'))}>
                    No subjects scheduled for this exam.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {subjectsPopupSchedule.subjects.map((subject, index) => (
                      <div
                        key={subject.id}
                        className={combine(
                          "p-3 sm:p-4 rounded-xl border",
                          get('border', 'primary'),
                          get('bg', 'secondary')
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={combine(
                                "px-2 py-0.5 rounded text-xs font-medium",
                                theme === 'dark' ? 'bg-teal-900/30 text-teal-400' : 'bg-teal-100 text-teal-700'
                              )}>
                                #{index + 1}
                              </span>
                              {(() => {
                                const subjectColor = getSubjectColor(subject.subject_name);
                                return (
                                  <h4
                                    className={combine("font-semibold text-sm sm:text-base px-2.5 py-1 rounded-lg border", !subjectColor ? get('text', 'primary') : '')}
                                    style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                  >
                                    {subject.subject_name}
                                  </h4>
                                );
                              })()}
                            </div>
                            <p className={combine("text-xs sm:text-sm mt-2 flex items-center", get('text', 'secondary'))}>
                              <FaCalendar className="mr-1.5" />
                              {new Date(subject.exam_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>
                              {subject.session}
                            </p>
                            <p className={combine("text-xs mt-1 flex items-center justify-end", get('text', 'tertiary'))}>
                              <FaClock className="mr-1.5" />
                              {subject.duration}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
