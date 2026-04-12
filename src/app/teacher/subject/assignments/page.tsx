'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaBook, FaChalkboardTeacher, FaFilter, FaCalendarAlt,
  FaFileAlt, FaPlus, FaEdit, FaTrash, FaDownload,
  FaUpload, FaCheckCircle, FaExclamationTriangle,
  FaSpinner, FaClock, FaUsers, FaSchool,
  FaTimes, FaEye, FaList, FaCalendarPlus, FaRegCalendarCheck,
  FaPaperclip, FaChartBar, FaFilePdf, FaFileWord, FaFileExcel,
  FaFileImage, FaFileArchive, FaThLarge, FaSort, FaSortUp,
  FaSortDown, FaUserTie, FaCalendarDay, FaTags, FaFile,
  FaEyeSlash, FaExclamationCircle, FaSortAmountDown,
  FaSortAmountUp, FaHistory, FaCheck, FaTimesCircle,
  FaPercent, FaStar, FaChevronLeft, FaChevronRight
} from 'react-icons/fa';
import Modal from 'react-modal';
import { teacherApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// API Service Functions
const apiService = {
  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getTeacherSubjectAllocations(teacherId: string) {
    const response = await teacherApi.subjects.allocations(teacherId);
    return response.data;
  },

  async getSubmissions(assignmentId: string) {
    const response = await teacherApi.assignments.submissions(assignmentId);
    return response.data;
  },

  async getAssignments(filters: any = {}) {
    const response = await teacherApi.assignments.list(filters);
    return response.data;
  },

  async createAssignment(formData: FormData) {
    const response = await teacherApi.assignments.create(formData);
    return response.data;
  },

  async updateAssignmentDescription(assignmentId: string, description: string) {
    const response = await teacherApi.assignments.update({
      assignment_id: assignmentId,
      description,
    });
    return response.data;
  },

  async deleteAssignment(assignmentId: string) {
    const response = await teacherApi.assignments.delete(assignmentId);
    return response.data;
  },

  async deleteAssignmentFile(assignmentId: string) {
    const response = await teacherApi.assignments.deleteFile(assignmentId);
    return response.data;
  },

  async uploadAssignmentFile(assignmentId: string, file: File) {
    const formData = new FormData();
    formData.append('assignment_id', assignmentId);
    formData.append('attachment', file);
    
    const response = await teacherApi.assignments.uploadFile(formData);
    return response.data;
  },

  async gradeSubmission(submissionId: string, marks: number) {
    const response = await teacherApi.assignments.grade({
      submission_id: submissionId,
      marks,
    });
    return response.data;
  },

  async getMonthlyReport(filters: any) {
    const response = await teacherApi.assignments.report(filters);
    return response.data;
  },
};

// Types
interface SubjectAllocation {
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
  sections_display?: string[];
}

interface Assignment {
  id: string;
  class_name: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  attachment: string | null;
  posted_by: string;
  created_at: string;
  status?: string;
  submission_count?: number;
  graded_count?: number;
  file_type?: string;
  file_size?: string;
}

interface Submission {
  id: string;
  student_name: string;
  student_id: string;
  file: string;
  submitted_at: string;
  marks: number | null;
  description?: string;
  status: 'pending' | 'graded' | 'late';
}

interface Filters {
  class_name: string;
  section: string;
  subject: string;
  view: 'assignments' | 'submissions' | 'reports';
}

interface SubjectOption {
  name: string;
  code: string;
}

// Modal Styles
const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    borderRadius: '20px',
    border: 'none',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '90vh',
    padding: '0',
    overflow: 'visible',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
  },
};

interface TeacherAllocationResponse {
  status: number;
  teacher_id: string;
  teacher_name: string;
  academic_year: string;
  allocations: SubjectAllocation[];
}

interface TeacherProfile {
  teacher_id?: string;
  name?: string;
  class_name?: string | null;
  assigned_class?: string | null;
  handled_subjects?: Record<string, Record<string, string[]>>;
}

interface SubmissionsResponse {
  status: number;
  assignment_title: string;
  class: string;
  total_students: number;
  submitted_count: number;
  pending_count: number;
  data: Array<{
    student_id: string;
    student_name: string;
    status: 'Completed' | 'Pending';
    submission_id: string | null;
    submitted_at: string | null;
    file_url: string | null;
    description: string | null;
  }>;
}

const isSubmissionsResponse = (payload: any): payload is SubmissionsResponse =>
  Boolean(
    payload &&
    typeof payload === 'object' &&
    'status' in payload &&
    'data' in payload &&
    Array.isArray(payload.data)
  );

interface AssignmentsListResponse {
  status?: number;
  message?: string;
  error?: string;
  detail?: string;
  view_mode?: 'daily_assignments' | 'calendar_overview' | string;
  year?: string;
  filters_applied?: Record<string, string>;
  data?: Assignment[] | Record<string, string[]>;
}

interface AssignmentCalendarOverview {
  year: string;
  data: Record<string, string[]>;
}

const isAssignmentsListResponse = (payload: any): payload is AssignmentsListResponse =>
  Boolean(
    payload &&
    typeof payload === 'object' &&
    (
      'view_mode' in payload ||
      'status' in payload ||
      (Array.isArray(payload.data)) ||
      (payload.data && typeof payload.data === 'object')
    )
  );

export default function TeacherAssignmentsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const getLocalDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayDate = getLocalDateString();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [error, setError] = useState('');
  const [assignmentsInfo, setAssignmentsInfo] = useState('');
  const [calendarOverview, setCalendarOverview] = useState<AssignmentCalendarOverview | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<SubjectAllocation[]>([]);
  const [filters, setFilters] = useState<Filters>({
    class_name: '',
    section: '',
    subject: '',
    view: 'assignments',
  });
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFileModal, setShowFileModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  
  // Form States
  const [newAssignment, setNewAssignment] = useState({
    class_name: '',
    section: '',
    subject: '',
    title: '',
    description: '',
    due_date: '',
    attachment: null as File | null,
  });
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editingDescription, setEditingDescription] = useState('');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [gradingData, setGradingData] = useState<{[key: string]: string}>({});
  
  // View controls
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);
  
  // State for Create Modal dropdowns
  const [createModalClasses, setCreateModalClasses] = useState<string[]>([]);
  const [createModalSections, setCreateModalSections] = useState<string[]>([]);
  const [createModalSubjects, setCreateModalSubjects] = useState<SubjectOption[]>([]);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    overdue: 0,
    graded: 0,
    submissions: 0,
  });

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
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

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

    return {
      bg: '#2563EB',
      text: '#FFFFFF',
      border: '#2563EB',
    };
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const resolveApiPayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined && payload.data !== null) {
      return payload.data as T;
    }
    return payload as T;
  };

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

  const extractApiMessage = (payload: any, fallback = '') => {
    if (typeof payload?.message === 'string' && payload.message.trim()) return payload.message;
    if (typeof payload?.detail === 'string' && payload.detail.trim()) return payload.detail;
    if (typeof payload?.error === 'string' && payload.error.trim()) return payload.error;
    return fallback;
  };

  const getAssignmentCalendarSummary = (calendarData: Record<string, string[]>) => {
    const totalDates = Object.values(calendarData || {}).reduce((sum, dates) => sum + dates.length, 0);
    if (!totalDates) return 'No assignment dates available for the selected filters.';

    const monthCount = Object.keys(calendarData).length;
    return `Assignments are available on ${totalDates} date${totalDates === 1 ? '' : 's'} across ${monthCount} month${monthCount === 1 ? '' : 's'}. Select a date to view daily assignments.`;
  };

  const toCalendarEntryDate = (date: string) => {
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  };

  const toIsoDate = (date: string) => {
    const [day, month, year] = date.split('-');
    return `${year}-${month}-${day}`;
  };

  const parseAcademicYearMonths = (academicYear: string) => {
    const [startYearText, endYearText] = academicYear.split('-');
    const startYear = Number(startYearText);
    const endYear = Number(endYearText);
    if (!startYear || !endYear) return [];

    const today = new Date();
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const months: Array<{ year: number; monthIndex: number }> = [];

    for (let monthIndex = 5; monthIndex <= 11; monthIndex += 1) {
      const monthDate = new Date(startYear, monthIndex, 1);
      if (monthDate <= currentMonthEnd) {
        months.push({ year: startYear, monthIndex });
      }
    }

    for (let monthIndex = 0; monthIndex <= 4; monthIndex += 1) {
      const monthDate = new Date(endYear, monthIndex, 1);
      if (monthDate <= currentMonthEnd) {
        months.push({ year: endYear, monthIndex });
      }
    }

    return months;
  };

  const getMonthDates = (year: number, monthIndex: number) => {
    const totalDays = new Date(year, monthIndex + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, index) => new Date(year, monthIndex, index + 1));
  };

  const formatMonthLabel = (year: number, monthIndex: number) =>
    new Date(year, monthIndex, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const getCalendarMonths = (overview: AssignmentCalendarOverview | null) => {
    if (!overview?.year) return [];

    const entries = new Set(
      Object.values(overview.data || {})
        .flat()
        .map((date) => toIsoDate(date))
    );

    return parseAcademicYearMonths(overview.year).map(({ year, monthIndex }) => ({
      key: `${year}-${monthIndex}`,
      year,
      monthIndex,
      label: formatMonthLabel(year, monthIndex),
      firstDayOffset: new Date(year, monthIndex, 1).getDay(),
      dates: getMonthDates(year, monthIndex).map((date) => {
        const isoDate = [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-');
        return {
          isoDate,
          dayNumber: date.getDate(),
          hasAssignment: entries.has(isoDate),
          isToday: isoDate === todayDate,
        };
      }),
    }));
  };

  const hasRequiredAssignmentFilters = (nextFilters: Partial<Filters>) => Boolean(
    nextFilters.class_name && nextFilters.section && nextFilters.subject
  );

  const getSectionsFromDisplay = (displayValues: string[] | undefined, className: string) => {
    const sections = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass, displaySection] = display.split(':');
      if (displayClass?.trim().replace(/^Class\s+/i, '') === className && displaySection?.trim()) {
        sections.add(displaySection.trim());
      }
    });
    return Array.from(sections).sort();
  };

  const getClassesFromDisplay = (displayValues: string[] | undefined) => {
    const classes = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass] = display.split(':');
      const normalizedClass = displayClass?.trim().replace(/^Class\s+/i, '');
      if (normalizedClass) classes.add(normalizedClass);
    });
    return Array.from(classes);
  };

  const getAssignedClassValue = (profile: TeacherProfile | null | undefined) =>
    profile?.assigned_class?.split(' - ')[0] || profile?.class_name || '';

  const getHandledSubjectsMap = (profile: TeacherProfile | null | undefined) =>
    profile?.handled_subjects || {};

  const hasHandledSubjects = (profile: TeacherProfile | null | undefined) =>
    Object.keys(getHandledSubjectsMap(profile)).length > 0;

  const getHandledClasses = (profile: TeacherProfile | null | undefined) => {
    const classes = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      Object.keys(classMap || {}).forEach((className) => classes.add(className));
    });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getHandledSectionsForClass = (profile: TeacherProfile | null | undefined, className: string) => {
    const sections = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      (classMap?.[className] || []).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getHandledSubjectsForClass = (profile: TeacherProfile | null | undefined, className: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if (classMap?.[className]?.length) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getHandledSubjectsForClassAndSection = (profile: TeacherProfile | null | undefined, className: string, sectionName: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if ((classMap?.[className] || []).includes(sectionName)) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getTeacherSubjectCount = () => {
    if (hasHandledSubjects(teacherProfile)) {
      return Object.keys(getHandledSubjectsMap(teacherProfile)).length;
    }

    return new Set(subjectAllocations.map((allocation) => allocation.subject_name)).size;
  };

  const allocationHandlesClass = (alloc: SubjectAllocation, className: string) =>
    alloc.classes.includes(className) || getClassesFromDisplay(alloc.sections_display).includes(className);

  const getAllocationSectionsForClass = (alloc: SubjectAllocation, className: string) => {
    const displaySections = getSectionsFromDisplay(alloc.sections_display, className);
    if (displaySections.length > 0) {
      return displaySections;
    }
    return [...new Set(alloc.sections || [])].sort();
  };

  const getSubjectCode = (subjectName: string) =>
    subjectAllocations.find((alloc) => alloc.subject_name === subjectName)?.subject_code || subjectName;

  const dedupeSubjectOptions = (subjects: SubjectOption[]) => Array.from(
    new Map(subjects.map((subject) => [subject.name, subject])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getSubjectsForClass = (className: string): SubjectOption[] => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClass(teacherProfile, className).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
        }))
      );
    }

    return dedupeSubjectOptions(
      subjectAllocations
        .filter((alloc) => allocationHandlesClass(alloc, className))
        .map((alloc) => ({ name: alloc.subject_name, code: alloc.subject_code }))
    );
  };

  const getSectionsForClass = (className: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      return getHandledSectionsForClass(teacherProfile, className);
    }
    const sections = new Set<string>();
    subjectAllocations.forEach((alloc) => {
      if (!allocationHandlesClass(alloc, className)) return;
      getAllocationSectionsForClass(alloc, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSectionsForClassAndSubject = (className: string, subjectName: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      const classMap = getHandledSubjectsMap(teacherProfile)[subjectName];
      return [...new Set(classMap?.[className] || [])].sort();
    }
    const sections = new Set<string>();
    subjectAllocations.forEach((alloc) => {
      if (!allocationHandlesClass(alloc, className) || alloc.subject_name !== subjectName) return;
      getAllocationSectionsForClass(alloc, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string): SubjectOption[] => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClassAndSection(teacherProfile, className, sectionName).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
        }))
      );
    }

    return dedupeSubjectOptions(
      subjectAllocations
        .filter((alloc) => {
          if (!allocationHandlesClass(alloc, className)) return false;
          const allocSections = new Set<string>(getAllocationSectionsForClass(alloc, className));
          return allocSections.size === 0 || allocSections.has(sectionName);
        })
        .map((alloc) => ({ name: alloc.subject_name, code: alloc.subject_code }))
    );
  };

  const getSubjectsForFilterSelection = (className: string, sectionName?: string) => {
    if (!className) return [];
    const assignedClass = getAssignedClassValue(teacherProfile);
    if (assignedClass) {
      if (assignedClass !== className && !getSectionsForClass(className).length) {
        return [];
      }
    }
    if (sectionName) {
      return getSubjectsForClassAndSection(className, sectionName);
    }
    return getSubjectsForClass(className);
  };

  useEffect(() => {
    loadInitialData();
    Modal.setAppElement('body');
  }, []);

  useEffect(() => {
    if (subjectAllocations.length > 0) {
      updateCreateModalDropdowns();
    }
  }, [subjectAllocations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters.class_name, filters.section, filters.subject, sortConfig.key, sortConfig.direction, viewMode]);

  useEffect(() => {
    if (!calendarOverview) {
      setCalendarMonthIndex(0);
      return;
    }

    const targetDate = selectedCalendarDate || todayDate;
    const targetMonthKey = (() => {
      const [year, month] = targetDate.split('-');
      return `${year}-${Number(month) - 1}`;
    })();

    const matchingMonthIndex = getCalendarMonths(calendarOverview).findIndex((month) => month.key === targetMonthKey);
    setCalendarMonthIndex(matchingMonthIndex >= 0 ? matchingMonthIndex : 0);
  }, [calendarOverview, selectedCalendarDate, todayDate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const profile = await apiService.getTeacherProfile();
      const profileData = resolveApiPayload<TeacherProfile>(profile);
      setTeacherProfile(profileData);

      const allocationsData = await apiService.getTeacherSubjectAllocations(profileData.teacher_id || '');
      await processTeacherAllocations(allocationsData, profileData);

    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = extractApiError(err, 'Failed to load teacher data');
      setError(errorMessage);
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialAssignments = async (defaultFilters?: Partial<Filters>) => {
    const filtersToUse = {
      class_name: defaultFilters?.class_name ?? filters.class_name,
      section: defaultFilters?.section ?? filters.section,
      subject: defaultFilters?.subject ?? filters.subject,
    };

    if (!hasRequiredAssignmentFilters(filtersToUse)) {
      setAssignments([]);
      setAssignmentsInfo('');
      setCalendarOverview(null);
      setSelectedCalendarDate(null);
      setStats({ total: 0, active: 0, overdue: 0, graded: 0, submissions: 0 });
      return;
    }

    try {
      setLoadingAssignments(true);
      const assignmentsData = await apiService.getAssignments({
        class_name: filtersToUse.class_name,
        section: filtersToUse.section,
        subject: filtersToUse.subject,
      });
      processAssignmentsData(assignmentsData, filtersToUse);
    } catch (err: any) {
      console.error('Error loading initial assignments:', err);
      toastError(extractApiError(err, 'Failed to load assignments'));
    } finally {
      setLoadingAssignments(false);
    }
  };

  const loadFilteredAssignments = async () => {
    if (!hasRequiredAssignmentFilters(filters)) {
      toastError('Select class, section, and subject to load assignments');
      return;
    }

    try {
      setLoadingAssignments(true);
      const assignmentsData = await apiService.getAssignments({
        class_name: filters.class_name,
        section: filters.section,
        subject: filters.subject,
      });
      processAssignmentsData(assignmentsData, filters);
    } catch (err: any) {
      console.error('Error loading filtered assignments:', err);
      toastError(extractApiError(err, 'Failed to load assignments'));
    } finally {
      setLoadingAssignments(false);
    }
  };

  const processAssignmentsData = (
    assignmentsData: any,
    activeFilters: Pick<Filters, 'class_name' | 'section' | 'subject'>
  ) => {
    const payload = isAssignmentsListResponse(assignmentsData)
      ? assignmentsData
      : resolveApiPayload<AssignmentsListResponse>(assignmentsData);
    const apiMessage = extractApiMessage(payload);

    if (payload?.view_mode === 'calendar_overview' && payload.data && !Array.isArray(payload.data)) {
      setAssignments([]);
      setCalendarOverview({
        year: payload.year || '',
        data: payload.data,
      });
      setSelectedCalendarDate(null);
      setStats({ total: 0, active: 0, overdue: 0, graded: 0, submissions: 0 });
      setAssignmentsInfo(apiMessage || getAssignmentCalendarSummary(payload.data));

      const todayEntry = toCalendarEntryDate(todayDate);
      const hasTodayAssignment = Object.values(payload.data).some((dates) => dates.includes(todayEntry));
      if (hasTodayAssignment) {
        setSelectedCalendarDate(todayDate);
        void loadAssignmentsForSpecificDate(todayDate, activeFilters);
      }
      return;
    }

    if (Array.isArray(payload?.data)) {
      setCalendarOverview(null);
      const assignmentsWithStats = payload.data.map((assignment: Assignment) => ({
        ...assignment,
        submission_count: 0,
        graded_count: 0,
        file_type: assignment.attachment ? getFileType(assignment.attachment) : 'unknown',
        file_size: '1.2 MB',
      }));

      setAssignments(assignmentsWithStats);
      setAssignmentsInfo(apiMessage || '');
      
      const total = assignmentsWithStats.length;
      const active = assignmentsWithStats.filter((a: Assignment) => 
        new Date(a.due_date) >= new Date()
      ).length;
      const overdue = assignmentsWithStats.filter((a: Assignment) => 
        new Date(a.due_date) < new Date()
      ).length;
      const graded = assignmentsWithStats.reduce((sum: number, a: Assignment) => sum + (a.graded_count || 0), 0);
      const submissions = assignmentsWithStats.reduce((sum: number, a: Assignment) => sum + (a.submission_count || 0), 0);
      
      setStats({ total, active, overdue, graded, submissions });

    } else {
      setAssignments([]);
      setAssignmentsInfo(apiMessage || '');
      setCalendarOverview(null);
      setSelectedCalendarDate(null);
      setStats({ total: 0, active: 0, overdue: 0, graded: 0, submissions: 0 });
    }
  };

  const loadAssignmentsForSpecificDate = async (
    date: string,
    activeFilters?: Pick<Filters, 'class_name' | 'section' | 'subject'>
  ) => {
    const filtersToUse = {
      class_name: activeFilters?.class_name ?? filters.class_name,
      section: activeFilters?.section ?? filters.section,
      subject: activeFilters?.subject ?? filters.subject,
    };

    if (!hasRequiredAssignmentFilters(filtersToUse)) {
      return;
    }

    try {
      const dailyData = await apiService.getAssignments({
        class_name: filtersToUse.class_name,
        section: filtersToUse.section,
        subject: filtersToUse.subject,
        date,
      });
      const payload = isAssignmentsListResponse(dailyData)
        ? dailyData
        : resolveApiPayload<AssignmentsListResponse>(dailyData);

      if (Array.isArray(payload?.data)) {
        const assignmentsWithStats = payload.data.map((assignment: Assignment) => ({
          ...assignment,
          submission_count: 0,
          graded_count: 0,
          file_type: assignment.attachment ? getFileType(assignment.attachment) : 'unknown',
          file_size: '1.2 MB',
        }));
        setAssignments(assignmentsWithStats);
        setSelectedCalendarDate(date);
        setAssignmentsInfo(
          assignmentsWithStats.length > 0
            ? `Showing assignments for ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
            : 'No assignments found for the selected date.'
        );
      }
    } catch (err: any) {
      console.error('Error loading today assignments:', err);
      toastError(extractApiError(err, 'Failed to load assignments for the selected date'));
    }
  };

  const processTeacherAllocations = async (allocationsData: any, profileData: any) => {
  try {
    const allocationPayload = resolveApiPayload<TeacherAllocationResponse>(allocationsData);
    setSubjectAllocations(allocationPayload.allocations || []);
    
    const classesSet = new Set<string>();
    const subjectsMap = new Map<string, {name: string, code: string}>();
    const classSectionMap = new Map<string, string[]>(); // Class -> Sections
    const assignedClass = getAssignedClassValue(profileData);
    
    allocationPayload.allocations.forEach((allocation: SubjectAllocation) => {
      allocation.classes.forEach((className: string) => {
        classesSet.add(className);
        subjectsMap.set(allocation.subject_name, {
          name: allocation.subject_name,
          code: allocation.subject_code
        });
        
        // Get sections for this class from sections_display
        if (allocation.sections_display) {
          const sectionsForClass: string[] = [];
          allocation.sections_display.forEach((display: string) => {
            // Parse "Class 9: A" to get section "A" for class "9"
            const match = display.match(/Class (\d+):\s*(\w+)/);
            if (match && match[1] === className) {
              sectionsForClass.push(match[2]);
            }
          });
          
          // Merge sections for this class across different subjects
          if (classSectionMap.has(className)) {
            const existingSections = classSectionMap.get(className) || [];
            classSectionMap.set(className, [...new Set([...existingSections, ...sectionsForClass])]);
          } else {
            classSectionMap.set(className, sectionsForClass);
          }
        }
      });

      getClassesFromDisplay(allocation.sections_display).forEach((className) => {
        classesSet.add(className);
        subjectsMap.set(allocation.subject_name, {
          name: allocation.subject_name,
          code: allocation.subject_code
        });

        const displaySections = getSectionsFromDisplay(allocation.sections_display, className);
        if (displaySections.length > 0) {
          if (classSectionMap.has(className)) {
            const existingSections = classSectionMap.get(className) || [];
            classSectionMap.set(className, [...new Set([...existingSections, ...displaySections])]);
          } else {
            classSectionMap.set(className, displaySections);
          }
        }
      });
    });

    const handledClasses = getHandledClasses(profileData);
    const classesArray = (handledClasses.length > 0
      ? handledClasses
      : Array.from(classesSet).filter((className) => !assignedClass || className === assignedClass || classSectionMap.has(className))
    ).sort((a, b) => parseInt(a) - parseInt(b));
    setAvailableClasses(classesArray);
    setAvailableSections([]);
    setAvailableSubjects([]);
    setFilters((prev) => ({
      ...prev,
      class_name: '',
      section: '',
      subject: '',
    }));

  } catch (err) {
    console.error('Error processing allocations:', err);
    throw err;
  }
};

  

  const updateCreateModalDropdowns = () => {
    const classesSet = new Set<string>();
    const assignedClass = getAssignedClassValue(teacherProfile);
    const handledClasses = getHandledClasses(teacherProfile);
    if (handledClasses.length > 0) {
      setCreateModalClasses(handledClasses);
      setCreateModalSections([]);
      setCreateModalSubjects([]);
      return;
    }
    subjectAllocations.forEach((allocation: SubjectAllocation) => {
      allocation.classes.forEach((className: string) => {
        if (!assignedClass || className === assignedClass || getClassesFromDisplay(allocation.sections_display).includes(className)) {
          classesSet.add(className);
        }
      });
      getClassesFromDisplay(allocation.sections_display).forEach((className) => {
        classesSet.add(className);
      });
    });
    const classesArray = Array.from(classesSet).sort((a, b) => parseInt(a) - parseInt(b));
    setCreateModalClasses(classesArray);
    
    setCreateModalSections([]);
    setCreateModalSubjects([]);
  };

  const updateFiltersForClass = (className: string, sectionName?: string) => {
  const uniqueSubjects = getSubjectsForFilterSelection(className, sectionName);
  setAvailableSubjects(uniqueSubjects);
  
  if (filters.subject && !uniqueSubjects.some(sub => sub.name === filters.subject)) {
    setFilters(prev => ({ ...prev, subject: '' }));
  }

  const sectionsArray = getSectionsForClass(className);
  setAvailableSections(sectionsArray);
  
  if (filters.section && !sectionsArray.includes(filters.section)) {
    setFilters(prev => ({ ...prev, section: '' }));
  }
};

  const updateSectionsForSubject = (className: string, subjectName: string) => {
    const sections = getSectionsForClassAndSubject(className, subjectName);

    if (sections.length > 0) {
      setAvailableSections(sections);
      
      if (filters.section && !sections.includes(filters.section)) {
        setFilters(prev => ({ ...prev, section: '' }));
      }
    } else {
      updateFiltersForClass(className, filters.section);
    }
  };

  const handleClassFilterChange = (className: string) => {
    const nextSections = className ? getSectionsForClass(className) : [];
    setAvailableSections(nextSections);
    setAvailableSubjects([]);
    setFilters((prev) => ({
      ...prev,
      class_name: className,
      section: '',
      subject: '',
    }));
  };

  const handleSectionFilterChange = (sectionName: string) => {
    const nextSubjects = filters.class_name
      ? getSubjectsForFilterSelection(filters.class_name, sectionName)
      : [];

    setAvailableSubjects(nextSubjects);
    setFilters((prev) => ({
      ...prev,
      section: sectionName,
      subject: '',
    }));
  };

  const handleSubjectFilterChange = (subjectName: string) => {
    setFilters((prev) => ({
      ...prev,
      subject: subjectName,
    }));
  };

  const handleCreateModalClassChange = (className: string) => {
    setNewAssignment({
      ...newAssignment,
      class_name: className,
      section: '',
      subject: ''
    });

    setCreateModalSections(className ? getSectionsForClass(className) : []);
    setCreateModalSubjects([]);
  };

  const handleCreateModalSectionChange = (sectionName: string) => {
    const nextSubjects = newAssignment.class_name
      ? getSubjectsForFilterSelection(newAssignment.class_name, sectionName)
      : [];

    setNewAssignment({
      ...newAssignment,
      section: sectionName,
      subject: ''
    });

    setCreateModalSubjects(nextSubjects);
  };

  const handleCreateModalSubjectChange = (subjectName: string) => {
    setNewAssignment({
      ...newAssignment,
      subject: subjectName,
    });
  };

  const getFileType = (filename: any): any => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    
    if (['pdf'].includes(ext)) return 'pdf';
    if (['doc', 'docx'].includes(ext)) return 'word';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
    if (['txt', 'text', 'md'].includes(ext)) return 'text';
    
    return 'other';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FaFilePdf className="text-red-500" />;
      case 'word': return <FaFileWord className="text-blue-500" />;
      case 'excel': return <FaFileExcel className="text-green-500" />;
      case 'image': return <FaFileImage className="text-purple-500" />;
      case 'archive': return <FaFileArchive className="text-yellow-500" />;
      case 'text': return <FaFileAlt className="text-gray-700" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'pdf': return 'bg-red-50 text-red-700 border-red-100';
      case 'word': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'excel': return 'bg-green-50 text-green-700 border-green-100';
      case 'image': return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'archive': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'text': return 'bg-gray-50 text-gray-700 border-gray-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const getAssignmentStatus = (assignment: Assignment) => {
    const dueDate = new Date(assignment.due_date);
    const today = new Date();
    
    if (dueDate < today) {
      if ((assignment.submission_count || 0) === 0) {
        return { 
          label: 'Overdue', 
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <FaExclamationCircle className="text-red-600" />
        };
      }
      return { 
        label: 'Closed', 
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: <FaTimesCircle className="text-gray-600" />
      };
    }
    
    if ((assignment.submission_count || 0) > 0) {
      return { 
        label: 'In Progress', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <FaClock className="text-blue-600" />
      };
    }
    
    return { 
      label: 'Active', 
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: <FaCheck className="text-green-600" />
    };
  };

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc'
    });
  };

  const getFilteredAndSortedAssignments = () => {
    let filtered = [...assignments];

    filtered.sort((a, b) => {
      if (sortConfig.key === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortConfig.direction === 'desc' ? dateB - dateA : dateA - dateB;
      } else if (sortConfig.key === 'title') {
        const titleA = a.title.toLowerCase();
        const titleB = b.title.toLowerCase();
        return sortConfig.direction === 'desc' 
          ? titleB.localeCompare(titleA) 
          : titleA.localeCompare(titleB);
      } else if (sortConfig.key === 'due_date') {
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        return sortConfig.direction === 'desc' ? dateB - dateA : dateA - dateB;
      }
      return 0;
    });

    return filtered;
  };

  const handleCreateAssignment = async () => {
    if (!newAssignment.class_name || !newAssignment.section || 
        !newAssignment.subject || !newAssignment.title || 
        !newAssignment.due_date) {
      toastError('Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const formData = new FormData();
      formData.append('class_name', newAssignment.class_name);
      formData.append('section', newAssignment.section);
      formData.append('subject', newAssignment.subject);
      formData.append('title', newAssignment.title);
      formData.append('description', newAssignment.description);
      formData.append('due_date', newAssignment.due_date);
      if (newAssignment.attachment) {
        formData.append('attachment', newAssignment.attachment);
      }

      const createdFilters = {
        class_name: newAssignment.class_name,
        section: newAssignment.section,
        subject: newAssignment.subject,
      };

      const result = await apiService.createAssignment(formData);
      toastSuccess(extractApiMessage(result, 'Assignment created successfully!'));

      setAvailableSections(getSectionsForClass(createdFilters.class_name));
      setAvailableSubjects(getSubjectsForFilterSelection(createdFilters.class_name, createdFilters.section));
      setFilters((prev) => ({
        ...prev,
        ...createdFilters,
      }));
      setShowCreateModal(false);
      resetNewAssignmentForm();
      await loadInitialAssignments(createdFilters);
      
    } catch (err: any) {
      console.error('Error creating assignment:', err);
      toastError(extractApiError(err, 'Failed to create assignment'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDescription = async () => {
    if (!editingAssignment || !editingDescription.trim()) {
      toastError('Description cannot be empty');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.updateAssignmentDescription(editingAssignment.id, editingDescription);
      
      toastSuccess(extractApiMessage(result, 'Description updated successfully!'));
      setShowEditModal(false);
      loadFilteredAssignments();
      
    } catch (err: any) {
      console.error('Error updating description:', err);
      toastError(extractApiError(err, 'Failed to update description'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!selectedAssignment) return;

    try {
      setLoading(true);
      const result = await apiService.deleteAssignment(selectedAssignment.id);
      
      toastSuccess(extractApiMessage(result, 'Assignment deleted successfully!'));
      setShowDeleteModal(false);
      loadFilteredAssignments();
      
    } catch (err: any) {
      console.error('Error deleting assignment:', err);
      toastError(extractApiError(err, 'Failed to delete assignment'));
    } finally {
      setLoading(false);
    }
  };

  const openFileModal = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSelectedFile(null);
    setShowFileModal(true);
  };

  const closeFileModal = () => {
    setShowFileModal(false);
    setSelectedFile(null);
  };

  const handleDeleteFile = async () => {
    if (!selectedAssignment) return;

    try {
      setLoading(true);
      const result = await apiService.deleteAssignmentFile(selectedAssignment.id);

      setAssignments((prev) => prev.map((assignment) => (
        assignment.id === selectedAssignment.id
          ? { ...assignment, attachment: null, file_type: 'unknown', file_size: '' }
          : assignment
      )));
      setSelectedAssignment((prev) => (prev ? { ...prev, attachment: null } : prev));
      toastSuccess(extractApiMessage(result, 'File removed successfully!'));
      closeFileModal();
      loadFilteredAssignments();
      
    } catch (err: any) {
      console.error('Error deleting file:', err);
      toastError(extractApiError(err, 'Failed to delete file'));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedAssignment || !selectedFile) {
      toastError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.uploadAssignmentFile(selectedAssignment.id, selectedFile);
      
      toastSuccess(extractApiMessage(result, 'File uploaded successfully!'));
      closeFileModal();
      loadFilteredAssignments();
      
    } catch (err: any) {
      console.error('Error uploading file:', err);
      toastError(extractApiError(err, 'Failed to upload file'));
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (submissionId: string, marks: string) => {
    const marksNum = parseInt(marks);
    if (isNaN(marksNum) || marksNum < 0 || marksNum > 100) {
      toastError('Please enter valid marks (0-100)');
      return;
    }

    try {
      setLoading(true);
      const result = await apiService.gradeSubmission(submissionId, marksNum);
      
      toastSuccess(extractApiMessage(result, 'Marks updated successfully!'));
      setSubmissions(prev => prev.map(sub => 
        sub.id === submissionId ? { ...sub, marks: marksNum } : sub
      ));
      
    } catch (err: any) {
      console.error('Error grading submission:', err);
      toastError(extractApiError(err, 'Failed to update marks'));
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async (assignment: Assignment) => {
  try {
    setLoading(true);
    setSelectedAssignment(assignment);
    
    const submissionsPayload = await apiService.getSubmissions(assignment.id);
    const submissionsData = isSubmissionsResponse(submissionsPayload)
      ? submissionsPayload
      : resolveApiPayload<SubmissionsResponse>(submissionsPayload);
    
    if (submissionsData?.status === 200 && Array.isArray(submissionsData.data)) {
      // Transform API response for the UI
      const submissionsList = submissionsData.data.map((item: any) => ({
        id: item.submission_id || `pending_${item.student_id}`,
        student_name: item.student_name,
        student_id: item.student_id,
        file: item.file_url,
        submitted_at: item.submitted_at || null,
        marks: null, // This will be handled separately
        description: item.description,
        status: item.status.toLowerCase() // "Pending" -> "pending"
      }));
      
      setSubmissions(submissionsList);
      setShowSubmissionsModal(true);
      
      toastSuccess(
        extractApiMessage(
          submissionsData,
          `${submissionsData.assignment_title || assignment.title}: ${submissionsData.submitted_count} submitted, ${submissionsData.pending_count} pending`
        )
      );
    } else {
      throw new Error(extractApiMessage(submissionsPayload, 'Unexpected submissions response from server'));
    }
    
  } catch (err: any) {
    console.error('Error loading submissions:', err);
    toastError(extractApiError(err, 'Failed to load submissions'));
  } finally {
    setLoading(false);
  }
};

  const resetNewAssignmentForm = () => {
    setNewAssignment({
      class_name: '',
      section: '',
      subject: '',
      title: '',
      description: '',
      due_date: '',
      attachment: null,
    });
    setCreateModalSections([]);
    setCreateModalSubjects([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && assignments.length === 0 && !error) {
    return (
      <div className={combine("flex flex-col items-center justify-center", getBgClass())}>
        <div className="text-center">
          <div className="relative">
            <FaSpinner className={combine("animate-spin text-5xl mb-4", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            <div className={combine("absolute inset-0 rounded-full animate-ping opacity-20", theme === 'dark' ? 'bg-blue-900/40' : 'bg-blue-100')}></div>
          </div>
          <h3 className={combine("text-lg sm:text-xl font-semibold mb-2", get('text', 'secondary'))}>Loading Teacher Data</h3>
          <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Fetching your teaching allocations...</p>
        </div>
      </div>
    );
  }

  const filteredAssignments = getFilteredAndSortedAssignments();
  const academicCalendarMonths = getCalendarMonths(calendarOverview);
  const teacherSubjectCount = getTeacherSubjectCount();
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedAssignments = viewMode === 'list'
    ? filteredAssignments.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)
    : filteredAssignments;
  const pageStart = filteredAssignments.length === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1;
  const pageEnd = viewMode === 'list'
    ? Math.min(safeCurrentPage * itemsPerPage, filteredAssignments.length)
    : filteredAssignments.length;
  const safeCalendarMonthIndex = academicCalendarMonths.length === 0
    ? 0
    : Math.min(calendarMonthIndex, academicCalendarMonths.length - 1);
  const activeCalendarMonth = academicCalendarMonths[safeCalendarMonthIndex] || null;
  const activeCalendarDates = activeCalendarMonth?.dates.filter((date) => date.hasAssignment) || [];
  const selectedCalendarDateMeta = activeCalendarMonth?.dates.find((date) => date.isoDate === selectedCalendarDate) || null;

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
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
                  <FaFileAlt className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Assignment Manager</h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    Create and manage assignments for your students
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Teacher</div>
                  <div className="text-sm sm:text-base font-bold">
                    {teacherProfile?.name || 'Teacher'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Subjects</div>
                  <div className="text-sm sm:text-base font-bold">
                    {teacherSubjectCount}
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetNewAssignmentForm();
                    setShowCreateModal(true);
                  }}
                  className={combine(getPrimaryButtonClass(), "w-full sm:w-auto justify-center flex items-center gap-2 font-bold")}
                >
                  <FaPlus /> Create New Assignment
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Filters Section */}
        <div className={getCardGradientClass('blue')}>
          <div className="flex items-center gap-2 mb-6">
            <FaFilter className={combine("text-sm sm:text-base", get('accent', 'primary'))} />
            <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>Filter Assignments</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mb-4 items-end">
            {/* Class Filter */}
            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                <div className="flex items-center gap-2">
                  <FaSchool /> Class
                </div>
              </label>
              <select
                value={filters.class_name}
                onChange={(e) => handleClassFilterChange(e.target.value)}
                className={combine(getInputClass(), "appearance-none")}
              >
                <option value="">Select Class</option>
                {availableClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    Class {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                <div className="flex items-center gap-2">
                  <FaChalkboardTeacher /> Section
                </div>
              </label>
              <select
                value={filters.section}
                onChange={(e) => handleSectionFilterChange(e.target.value)}
                className={combine(getInputClass(), "appearance-none")}
              >
                <option value="">Select Section</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec}>
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                <div className="flex items-center gap-2">
                  <FaBook /> Subject
                </div>
              </label>
              <select
                value={filters.subject}
                onChange={(e) => handleSubjectFilterChange(e.target.value)}
                className={combine(getInputClass(), "appearance-none")}
              >
                <option value="">Select Subject</option>
                {availableSubjects.map((subject) => (
                  <option key={subject.code} value={subject.name}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col justify-end h-full">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">
                Load
              </label>
              <button
                onClick={loadFilteredAssignments}
                disabled={loadingAssignments}
                className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-xs sm:text-sm ${
                  loadingAssignments
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : getPrimaryButtonClass()
                }`}
              >
                {loadingAssignments ? <FaSpinner className="animate-spin" /> : <FaFilter />}
                {loadingAssignments ? 'Loading...' : 'Load Assignments'}
              </button>
            </div>

            <div className="flex flex-col justify-end h-full">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">
                View
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`w-full p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="Grid View"
                >
                  <FaThLarge />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`w-full p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'list' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}
                  title="List View"
                >
                  <FaList />
                </button>
              </div>
            </div>

          </div>

          {/* Current Selection Info */}
          {(filters.class_name || filters.section || filters.subject) && (
            <div className={combine(
              "mt-6 p-4 rounded-xl border",
              theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-blue-800/10 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-blue-100/30 border-blue-200'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-wrap">
                  {filters.class_name && (
                    <div className="flex items-center gap-2">
                      <FaSchool className={combine("text-sm", get('accent', 'primary'))} />
                      <span className={combine("font-semibold text-sm", get('accent', 'primary'))}>
                        Class {filters.class_name}
                      </span>
                    </div>
                  )}
                  {filters.section && (
                    <>
                      <div className="text-gray-400">•</div>
                      <div className="flex items-center gap-2">
                        <FaChalkboardTeacher className={combine("text-sm", get('accent', 'primary'))} />
                        <span className={combine("font-semibold text-sm", get('accent', 'primary'))}>
                          Section {filters.section}
                        </span>
                      </div>
                    </>
                  )}
                  {filters.subject && (
                    <>
                      <div className="text-gray-400">•</div>
                      <div className="flex items-center gap-2">
                        <FaBook className={combine("text-sm", get('accent', 'primary'))} />
                        <span
                          className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs sm:text-sm font-semibold"
                          style={getSubjectGradientStyle(getSubjectColor(filters.subject))}
                        >
                          {filters.subject}
                        </span>
                      </div>
                    </>
                  )}
                </div>
                <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                  {filteredAssignments.length} assignments found
                </div>
              </div>
            </div>
          )}
        </div>

        

        {/* Assignments Display */}
        {calendarOverview && academicCalendarMonths.length > 0 && !loadingAssignments && activeCalendarMonth && (
          <div className={combine("mb-6 rounded-xl sm:rounded-2xl shadow-lg border overflow-hidden", get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine("px-4 sm:px-6 py-4 border-b", get('border', 'secondary'), get('bg', 'secondary'))}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={combine("text-base sm:text-lg font-semibold flex items-center gap-2", get('text', 'primary'))}>
                    <FaCalendarAlt className={combine(get('accent', 'primary'))} />
                    Academic Year Calendar
                  </h3>
                  <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>
                    {calendarOverview.year || 'Academic Year'} • Dates with assignments are highlighted.
                  </p>
                </div>
                {selectedCalendarDate && (
                  <div className={combine("text-xs sm:text-sm font-medium", get('accent', 'primary'))}>
                    Selected: {new Date(selectedCalendarDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div className="mx-auto grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start">
                <div
                  className={combine(
                    "rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden xl:h-[420px] flex flex-col",
                    theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900/70 border-gray-700' : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
                  )}
                >
                  <div className={combine(
                    "px-4 sm:px-5 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                    theme === 'dark' ? 'bg-blue-900/25 border-blue-900/40' : 'bg-blue-50 border-blue-100'
                  )}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCalendarMonthIndex((prev) => Math.max(prev - 1, 0))}
                        disabled={safeCalendarMonthIndex === 0}
                        className={combine(
                          "h-10 w-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                          get('border', 'secondary'),
                          get('bg', 'card')
                        )}
                        title="Previous month"
                      >
                        <FaChevronLeft />
                      </button>
                      <div>
                        <h4 className={combine("font-semibold text-sm sm:text-base", get('text', 'primary'))}>
                          {activeCalendarMonth.label}
                        </h4>
                        <p className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>
                          {activeCalendarDates.length} assignment date{activeCalendarDates.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCalendarMonthIndex((prev) => Math.min(prev + 1, academicCalendarMonths.length - 1))}
                      disabled={safeCalendarMonthIndex === academicCalendarMonths.length - 1}
                      className={combine(
                        "h-10 w-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                        get('border', 'secondary'),
                        get('bg', 'card')
                      )}
                      title="Next month"
                    >
                      <FaChevronRight />
                    </button>
                  </div>

                  <div className="p-3 overflow-auto flex-1">
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div
                          key={day}
                          className={combine("text-center text-[10px] sm:text-[11px] font-semibold py-1 rounded-lg", get('text', 'tertiary'))}
                        >
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 place-items-center">
                      {Array.from({ length: activeCalendarMonth.firstDayOffset }).map((_, index) => (
                        <div
                          key={`${activeCalendarMonth.key}-blank-${index}`}
                          className="h-9 w-9 sm:h-11 sm:w-11"
                        />
                      ))}
                      {activeCalendarMonth.dates.map((date) => {
                        const isSelected = selectedCalendarDate === date.isoDate;
                        const buttonClass = date.hasAssignment
                          ? theme === 'dark'
                            ? 'bg-blue-900/35 text-blue-100 border-blue-700 hover:bg-blue-900/50'
                            : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                          : theme === 'dark'
                            ? 'bg-gray-900/70 text-gray-400 border-gray-800'
                            : 'bg-white text-gray-500 border-gray-200';

                        return (
                          <button
                            key={date.isoDate}
                            type="button"
                            onClick={() => {
                              if (!date.hasAssignment) return;
                              void loadAssignmentsForSpecificDate(date.isoDate);
                            }}
                            disabled={!date.hasAssignment}
                            className={combine(
                              "h-9 w-9 sm:h-11 sm:w-11 rounded-lg border text-[11px] sm:text-xs font-medium transition-all duration-200 flex items-center justify-center relative",
                              date.hasAssignment ? 'cursor-pointer shadow-sm' : 'cursor-default',
                              buttonClass,
                              date.isToday ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.03]' : ''
                            )}
                            title={
                              date.hasAssignment
                                ? `Load assignments for ${new Date(date.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : undefined
                            }
                          >
                            <span>{date.dayNumber}</span>
                            {date.hasAssignment && (
                              <span className={combine(
                                "absolute bottom-0.5 h-1 w-1 rounded-full",
                                theme === 'dark' ? 'bg-blue-300' : 'bg-blue-500'
                              )} />
                            )}
                            {date.isToday && (
                              <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-amber-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:h-[420px] xl:overflow-auto pr-1">
                  <div className={combine(
                    "rounded-xl sm:rounded-2xl border p-3.5 sm:p-4",
                    theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-blue-100'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <FaRegCalendarCheck className={combine(get('accent', 'primary'))} />
                      <h4 className={combine("font-semibold text-sm sm:text-base", get('text', 'primary'))}>
                        Month Summary
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={combine("rounded-xl p-2.5", get('bg', 'secondary'))}>
                        <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>Academic Year</div>
                        <div className={combine("mt-1 font-semibold text-sm", get('text', 'primary'))}>{calendarOverview.year || '-'}</div>
                      </div>
                      <div className={combine("rounded-xl p-2.5", get('bg', 'secondary'))}>
                        <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>Selected Month</div>
                        <div className={combine("mt-1 font-semibold text-sm", get('text', 'primary'))}>{activeCalendarMonth.label}</div>
                      </div>
                    </div>
                    <div className={combine("mt-3 rounded-xl p-2.5 border", get('border', 'secondary'), get('bg', 'secondary'))}>
                      <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>Focused Date</div>
                      <div className={combine("mt-1 font-semibold text-sm", get('text', 'primary'))}>
                        {selectedCalendarDateMeta
                          ? new Date(selectedCalendarDateMeta.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : activeCalendarDates[0]
                            ? new Date(activeCalendarDates[0].isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'No dates in this month'}
                      </div>
                    </div>
                  </div>

                  <div className={combine(
                    "rounded-xl sm:rounded-2xl border p-3.5 sm:p-4",
                    theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-blue-100'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <FaCalendarDay className={combine(get('accent', 'primary'))} />
                      <h4 className={combine("font-semibold text-sm sm:text-base", get('text', 'primary'))}>
                        Assignment Dates
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {activeCalendarDates.length > 0 ? activeCalendarDates.slice(0, 8).map((date) => (
                        <button
                          key={date.isoDate}
                          type="button"
                          onClick={() => {
                            void loadAssignmentsForSpecificDate(date.isoDate);
                          }}
                          className={combine(
                            "w-full rounded-xl border px-2.5 py-2 text-left transition-all flex items-center justify-between",
                            selectedCalendarDate === date.isoDate
                              ? (theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200')
                              : combine(get('bg', 'secondary'), get('border', 'secondary'))
                          )}
                        >
                          <div>
                            <div className={combine("font-medium text-sm", get('text', 'primary'))}>
                              {new Date(date.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>
                              Tap to open that day&apos;s assignments
                            </div>
                          </div>
                          <FaChevronRight className={combine("text-xs", get('text', 'tertiary'))} />
                        </button>
                      )) : (
                        <div className={combine("rounded-xl border border-dashed px-3 py-6 text-center text-xs sm:text-sm", get('border', 'secondary'), get('text', 'tertiary'))}>
                          No assignment dates in this month.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {assignmentsInfo && !loadingAssignments && (
          <div className={combine(
            "mb-6 border px-4 sm:px-6 py-4 rounded-xl sm:rounded-2xl flex items-start gap-3 shadow-lg",
            theme === 'dark'
              ? 'bg-blue-900/20 border-blue-800 text-blue-200'
              : 'bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200 text-blue-700'
          )}>
            <div className={combine("mt-0.5", theme === 'dark' ? 'text-blue-300' : 'text-blue-600')}>
              <FaExclamationCircle className="text-lg sm:text-xl" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm sm:text-base">Assignment Response</h4>
              <p className="text-xs sm:text-sm">{assignmentsInfo}</p>
            </div>
          </div>
        )}

        {loadingAssignments ? (
          <div className={combine("text-center py-12 rounded-xl sm:rounded-2xl shadow-lg border", get('bg', 'card'), get('border', 'primary'))}>
            <FaSpinner className={combine("animate-spin text-4xl mx-auto mb-4", get('accent', 'primary'))} />
            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Loading assignments...</p>
          </div>
        ) : filteredAssignments.length > 0 ? (
          <div className={combine("rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border", get('bg', 'card'), get('border', 'primary'))}>
            <div className="p-4 sm:p-6 border-b" style={{ borderColor: 'var(--color-border-secondary)' }}>
              <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>
                  {viewMode === 'grid' ? 'Assignments Grid View' : 'Assignments List View'}
                </h3>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                    {viewMode === 'list'
                      ? `Showing ${pageStart}-${pageEnd} of ${filteredAssignments.length} assignments`
                      : `Showing ${filteredAssignments.length} of ${assignments.length} assignments`}
                  </div>
                 
                </div>
              </div>
            </div>
            
            {viewMode === 'grid' ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {filteredAssignments.map((assignment) => {
                    const status = getAssignmentStatus(assignment);
                    const subjectColor = getSubjectColor(assignment.subject);
                    return (
                      <div
                        key={assignment.id}
                        className={combine(
                          "rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden group",
                          theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200'
                        )}
                      >
                        {/* Content */}
                        <div className="p-4 sm:p-6">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <span
                              className="inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] sm:text-xs font-semibold"
                              style={getSubjectGradientStyle(subjectColor)}
                            >
                              <span className="truncate">{assignment.subject}</span>
                            </span>
                            <span className={combine("text-[11px] sm:text-xs whitespace-nowrap", get('text', 'tertiary'))}>
                              Class {assignment.class_name}-{assignment.section}
                            </span>
                          </div>
                          <div
                            className={combine("flex items-start justify-between gap-3 mb-4 pb-3 border-b", get('border', 'secondary'))}
                          >
                            <div className="flex-1 min-w-0">
                              <h3 className={combine("text-base sm:text-lg font-bold break-words", get('text', 'primary'))}>
                                {assignment.title}
                              </h3>
                              <div className={`mt-3 px-3 py-1 rounded-full border ${status.color} inline-flex items-center gap-2`}>
                                {status.icon}
                                <span className="text-xs font-semibold">{status.label}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => {
                                  setEditingAssignment(assignment);
                                  setEditingDescription(assignment.description || '');
                                  setShowEditModal(true);
                                }}
                                className={combine(getSecondaryButtonClass(), "px-2.5 py-2 flex items-center justify-center")}
                                title="Edit Assignment"
                              >
                                <FaEdit />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setShowDeleteModal(true);
                                }}
                                className={combine("px-2.5 py-2 rounded-lg transition-colors flex items-center justify-center text-xs sm:text-sm border", theme === 'dark' ? 'bg-red-900/20 text-red-300 border-red-800 hover:bg-red-900/30' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}
                                title="Delete Assignment"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                          
                          <div className="mb-4">
                            <p className={combine("text-xs sm:text-sm line-clamp-3", get('text', 'secondary'))}>
                              {assignment.description || 'No description'}
                            </p>
                          </div>

                          {/* Details */}
                          <div className="space-y-2 mb-6">
                            <div className={combine("flex items-center gap-2 text-xs sm:text-sm", get('text', 'secondary'))}>
                              <FaUserTie className="text-green-500" />
                              <span>Posted by: {assignment.posted_by}</span>
                            </div>
                            <div className={combine("flex items-center gap-2 text-xs sm:text-sm", get('text', 'secondary'))}>
                              <FaCalendarAlt className="text-purple-500" />
                              <span>Due: {formatDate(assignment.due_date)}</span>
                            </div>
                            <div className={combine("flex items-center gap-2 text-xs sm:text-sm", get('text', 'secondary'))}>
                              <FaClock className="text-blue-500" />
                              <span>Created: {formatDate(assignment.created_at)}</span>
                            </div>
                          </div>

                        

                          {/* File Info */}
                          {assignment.attachment && (
                            <div className={combine("mb-6 p-3 rounded-lg border", get('bg', 'secondary'), get('border', 'secondary'))}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {getFileIcon(assignment.file_type || 'unknown')}
                                  <div>
                                    <div className={combine("text-xs sm:text-sm font-medium truncate max-w-[150px]", get('text', 'secondary'))}>
                                      {assignment.attachment.split('/').pop()}
                                    </div>
                                    <div className={combine("text-xs", get('text', 'tertiary'))}>
                                      {assignment.file_size}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => loadSubmissions(assignment)}
                              className={combine(getPrimaryButtonClass(), "px-2 sm:px-3 py-2 flex items-center justify-center gap-1.5")}
                            >
                              <FaEye />
                              <span>Submissions</span>
                            </button>
                            <button
                              onClick={() => {
                                openFileModal(assignment);
                              }}
                              className={combine(getSecondaryButtonClass(), "px-2 sm:px-3 py-2 flex items-center justify-center gap-1.5")}
                            >
                              <FaUpload />
                              <span>File</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={combine("bg-gradient-to-r border-b", get('bg', 'secondary'), get('border', 'secondary'))}>
                        <th 
                          className={combine("py-4 px-6 text-left font-semibold cursor-pointer", get('text', 'secondary'))}
                          onClick={() => handleSort('title')}
                        >
                          <div className="flex items-center gap-2">
                            Title
                            {sortConfig.key === 'title' && (
                              sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                            )}
                          </div>
                        </th>
                        <th className={combine("py-4 px-6 text-left font-semibold", get('text', 'secondary'))}>Subject</th>
                        <th className={combine("py-4 px-6 text-left font-semibold", get('text', 'secondary'))}>Status</th>
                        <th 
                          className={combine("py-4 px-6 text-left font-semibold cursor-pointer", get('text', 'secondary'))}
                          onClick={() => handleSort('due_date')}
                        >
                          <div className="flex items-center gap-2">
                            Due Date
                            {sortConfig.key === 'due_date' && (
                              sortConfig.direction === 'asc' ? <FaSortUp /> : <FaSortDown />
                            )}
                          </div>
                        </th>
                        
                        <th className={combine("py-4 px-6 text-left font-semibold", get('text', 'secondary'))}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedAssignments.map((assignment) => {
                        const status = getAssignmentStatus(assignment);
                        return (
                          <tr key={assignment.id} className={combine("transition-colors border-b hover:bg-[var(--color-bg-hover)]", get('border', 'secondary'))}>
                            <td className="py-4 px-6">
                              <div>
                                <div className={combine("font-medium", get('text', 'primary'))}>{assignment.title}</div>
                                {assignment.description && (
                                  <div className={combine("text-xs sm:text-sm truncate max-w-xs", get('text', 'secondary'))}>
                                    {assignment.description}
                                  </div>
                                )}
                              </div>
                            </td>
                            
                            <td className="py-4 px-6">
                              <span
                                className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold"
                                style={getSubjectGradientStyle(getSubjectColor(assignment.subject))}
                              >
                                {assignment.subject}
                              </span>
                            </td>
                            
                            <td className="py-4 px-6">
                              <div className={`px-3 py-1 rounded-full border ${status.color} inline-flex items-center gap-2`}>
                                {status.icon}
                                <span className="text-xs font-semibold">{status.label}</span>
                              </div>
                            </td>
                            
                            <td className="py-4 px-6">
                              <div className={combine(get('text', 'secondary'))}>{new Date(assignment.due_date).toLocaleDateString()}</div>
                            </td>
                            
                           
                            
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => loadSubmissions(assignment)}
                                  className={combine("p-2 rounded-lg transition-colors", get('accent', 'primary'), 'hover:bg-[var(--color-bg-hover)]')}
                                  title="View Submissions"
                                >
                                  <FaEye />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingAssignment(assignment);
                                    setEditingDescription(assignment.description || '');
                                    setShowEditModal(true);
                                  }}
                                  className={combine("p-2 rounded-lg transition-colors", get('accent', 'warning'), 'hover:bg-[var(--color-bg-hover)]')}
                                  title="Edit Assignment"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  onClick={() => {
                                    openFileModal(assignment);
                                  }}
                                  className={combine("p-2 rounded-lg transition-colors", get('accent', 'success'), 'hover:bg-[var(--color-bg-hover)]')}
                                  title="Manage File"
                                >
                                  <FaUpload />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowDeleteModal(true);
                                  }}
                                  className={combine("p-2 rounded-lg transition-colors", get('accent', 'error'), 'hover:bg-[var(--color-bg-hover)]')}
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className={combine("px-3 sm:px-4 py-3 border-t", get('border', 'primary'))}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                      <p className={combine("text-xs", get('text', 'tertiary'))}>
                        Page {safeCurrentPage} of {totalPages}
                      </p>
                      <div className="flex items-center space-x-1 sm:space-x-1.5">
                        <button
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                          disabled={safeCurrentPage === 1}
                          className={combine(
                            "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm",
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
                            } else if (safeCurrentPage <= 3) {
                              pageNum = i + 1;
                            } else if (safeCurrentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = safeCurrentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={combine(
                                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium text-xs",
                                  safeCurrentPage === pageNum
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
                          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                          disabled={safeCurrentPage === totalPages}
                          className={combine(
                            "p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm",
                            getSecondaryButtonClass()
                          )}
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className={combine("text-center py-12 sm:py-16 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border", get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine("inline-flex items-center justify-center w-24 h-24 rounded-full mb-6", get('bg', 'secondary'))}>
              <FaFileAlt className={combine("text-4xl", get('accent', 'primary'))} />
            </div>
            <h3 className={combine("text-xl sm:text-2xl font-bold mb-3", get('text', 'primary'))}>
              No Assignments Found
            </h3>
            <p className={combine("text-xs sm:text-sm max-w-md mx-auto mb-8", get('text', 'secondary'))}>
              {assignmentsInfo
                ? assignmentsInfo
                : filters.class_name || filters.section || filters.subject
                ? 'No assignments match your current filters. Try changing your filter criteria.'
                : 'No assignments found. You can create assignments using the "Create New Assignment" button.'}
            </p>
            <button
              onClick={() => {
                resetNewAssignmentForm();
                setShowCreateModal(true);
              }}
              className={combine(getPrimaryButtonClass(), "flex items-center gap-2 mx-auto font-bold")}
            >
              <FaPlus /> Create New Assignment
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={combine(
            "mt-8 border px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg",
            theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700'
          )}>
            <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')}>
              <FaExclamationTriangle className={combine("text-2xl", theme === 'dark' ? 'text-red-400' : 'text-red-600')} />
            </div>
            <div className="flex-1">
              <h4 className="font-bold">Error Loading Data</h4>
              <p>{error}</p>
            </div>
            <button
              onClick={loadInitialData}
              className={combine(getPrimaryButtonClass(), "px-4 py-2")}
            >
              Retry
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className={combine("mt-8 pt-6 border-t text-center text-xs sm:text-sm", get('border', 'secondary'), get('text', 'tertiary'))}>
          <p>
            Assignment Manager • 
            Allocated Subjects: {teacherSubjectCount} • 
            Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </p>
          {(filters.class_name || filters.section || filters.subject) && (
            <p className={combine("mt-1", get('accent', 'primary'))}>
              {filters.class_name && `Class ${filters.class_name} `}
              {filters.section && `Section ${filters.section} `}
              {filters.subject && `${filters.subject}`}
            </p>
          )}
        </div>
      </div>

      {/* Modals - Same as before */}
      {/* Create Assignment Modal */}
      <Modal
        isOpen={showCreateModal}
        onRequestClose={() => setShowCreateModal(false)}
        style={{
          ...customStyles,
          content: {
            ...customStyles.content,
            maxWidth: '960px',
            width: '95%',
            padding: '0',
            overflow: 'hidden',
          }
        }}
        contentLabel="Create Assignment"
      >
        <div className={combine(get('bg', 'card'), "rounded-3xl overflow-hidden")}>
          <div className={combine(
            "sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200"
          )}>
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/15">
                  <FaPlus className="text-xl sm:text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Create New Assignment</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">Add new assignment for your students</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="self-end lg:self-auto text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                    <div className="flex items-center gap-2">
                      <FaSchool /> Class *
                    </div>
                  </label>
                  <select
                    value={newAssignment.class_name}
                    onChange={(e) => handleCreateModalClassChange(e.target.value)}
                    className={combine(getInputClass(), "appearance-none")}
                    required
                  >
                    <option value="">Select Class</option>
                    {createModalClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        Class {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                    <div className="flex items-center gap-2">
                      <FaChalkboardTeacher /> Section *
                    </div>
                  </label>
                  <select
                    value={newAssignment.section}
                    onChange={(e) => handleCreateModalSectionChange(e.target.value)}
                    className={combine(getInputClass(), "appearance-none")}
                    required
                    disabled={!newAssignment.class_name}
                  >
                    <option value="">Select Section</option>
                    {createModalSections.map((sec) => (
                      <option key={sec} value={sec}>
                        Section {sec}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                  <div className="flex items-center gap-2">
                    <FaBook /> Subject *
                  </div>
                </label>
                <select
                  value={newAssignment.subject}
                  onChange={(e) => handleCreateModalSubjectChange(e.target.value)}
                  className={combine(getInputClass(), "appearance-none")}
                  required
                  disabled={!newAssignment.class_name || !newAssignment.section}
                >
                  <option value="">Select Subject</option>
                  {createModalSubjects.map((subject) => (
                    <option key={subject.code} value={subject.name}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                  Title *
                </label>
                <input
                  type="text"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  className={getInputClass()}
                  placeholder="Enter assignment title"
                  required
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                  Description
                </label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  className={combine(getInputClass(), "min-h-[120px] resize-y")}
                  rows={4}
                  placeholder="Enter assignment description"
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                  <div className="flex items-center gap-2">
                    <FaCalendarAlt /> Due Date *
                  </div>
                </label>
                <input
                  type="date"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  className={getInputClass()}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                  Attachment (Optional)
                </label>
                <div className={combine(
                  "border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-colors",
                  theme === 'dark'
                    ? 'border-gray-700 hover:border-blue-500 bg-gray-900/30'
                    : 'border-gray-300 hover:border-blue-400 bg-gray-50/60'
                )}>
                  <input
                    type="file"
                    id="attachment"
                    onChange={(e) => setNewAssignment({ 
                      ...newAssignment, 
                      attachment: e.target.files?.[0] || null 
                    })}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                  />
                  <label htmlFor="attachment" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-3">
                      <FaUpload className={combine("text-3xl sm:text-4xl", get('text', 'tertiary'))} />
                      <div>
                        <span className={combine("font-medium text-sm sm:text-base", get('accent', 'primary'))}>Click to upload</span>
                        <span className={combine("text-xs sm:text-sm", get('text', 'secondary'))}> or drag and drop</span>
                      </div>
                      <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>
                        PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, ZIP, RAR (Max 10MB)
                      </p>
                    </div>
                  </label>
                  {newAssignment.attachment && (
                    <div className={combine(
                      "mt-4 p-3 rounded-lg sm:rounded-xl border",
                      theme === 'dark'
                        ? 'bg-emerald-950/20 border-emerald-900/40'
                        : 'bg-green-50 border-green-200'
                    )}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(getFileType(newAssignment.attachment.name))}
                          <div className="min-w-0">
                            <div className={combine("font-medium text-xs sm:text-sm truncate", get('text', 'primary'))}>
                              {newAssignment.attachment.name}
                            </div>
                            <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                              {(newAssignment.attachment.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setNewAssignment({ ...newAssignment, attachment: null })}
                          className={combine(get('accent', 'error'), "hover:opacity-80")}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Selection Info */}
              {newAssignment.class_name && newAssignment.section && newAssignment.subject && (
                <div className={combine(
                  "p-4 sm:p-6 rounded-xl sm:rounded-2xl border shadow-lg",
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-blue-950/40 to-gray-900/60 border-blue-900/40'
                    : 'bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200'
                )}>
                  <div className="text-center">
                    <div className={combine("text-xs sm:text-sm font-semibold mb-1", get('accent', 'primary'))}>
                      Creating assignment for:
                    </div>
                    <div className={combine("flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-xs sm:text-sm", get('text', 'secondary'))}>
                      <div className="flex items-center gap-1">
                        <FaSchool className={combine(get('accent', 'primary'))} />
                        <span>Class {newAssignment.class_name}</span>
                      </div>
                      <div className="text-gray-400">•</div>
                      <div className="flex items-center gap-1">
                        <FaChalkboardTeacher className={combine(get('accent', 'primary'))} />
                        <span>Section {newAssignment.section}</span>
                      </div>
                      <div className="text-gray-400">•</div>
                      <div className="flex items-center gap-1">
                        <FaBook className={combine(get('accent', 'primary'))} />
                        <span>{newAssignment.subject}</span>
                      </div>
                      {newAssignment.due_date && (
                        <>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1">
                            <FaCalendarAlt className={combine(get('accent', 'primary'))} />
                            <span>Due: {new Date(newAssignment.due_date).toLocaleDateString()}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className={combine("flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t", get('border', 'secondary'))}>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetNewAssignmentForm();
                  }}
                  className={combine(getSecondaryButtonClass(), "flex-1 px-6 py-3")}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAssignment}
                  disabled={loading || !newAssignment.title || !newAssignment.class_name || !newAssignment.section || !newAssignment.subject || !newAssignment.due_date}
                  className={`flex-1 px-6 py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm ${
                    loading || !newAssignment.title || !newAssignment.class_name || !newAssignment.section || !newAssignment.subject || !newAssignment.due_date
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : getPrimaryButtonClass()
                  }`}
                >
                  {loading ? 'Creating...' : 'Create Assignment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Edit Description Modal */}
      <Modal
        isOpen={showEditModal}
        onRequestClose={() => setShowEditModal(false)}
        style={{
          ...customStyles,
          content: {
            ...customStyles.content,
            maxWidth: '760px',
            width: '95%',
            padding: '0',
            overflow: 'hidden',
          }
        }}
        contentLabel="Edit Description"
      >
        <div className={combine(get('bg', 'card'), "rounded-3xl overflow-hidden")}>
          <div className={combine(
            "sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200"
          )}>
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/15">
                  <FaEdit className="text-xl sm:text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Edit Assignment</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">{editingAssignment?.title}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="self-end lg:self-auto text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div>
              <label className={combine("block text-xs sm:text-sm font-medium mb-2", get('text', 'primary'))}>
                Description
              </label>
              <textarea
                value={editingDescription}
                onChange={(e) => setEditingDescription(e.target.value)}
                className={combine(getInputClass(), "min-h-[160px] resize-y")}
                rows={6}
                placeholder="Enter assignment description"
              />
            </div>

            <div className={combine("flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 border-t", get('border', 'secondary'))}>
              <button
                onClick={() => setShowEditModal(false)}
                className={combine(getSecondaryButtonClass(), "px-6 py-3")}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateDescription}
                className={combine(getPrimaryButtonClass(), "px-6 py-3")}
              >
                Update Description
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Assignment Modal */}
      <Modal
        isOpen={showDeleteModal}
        onRequestClose={() => setShowDeleteModal(false)}
        style={{
          ...customStyles,
          content: {
            ...customStyles.content,
            maxWidth: '620px',
            width: '95%',
            padding: '0',
            overflow: 'hidden',
          }
        }}
        contentLabel="Delete Assignment"
      >
        <div className={combine(get('bg', 'card'), "rounded-3xl overflow-hidden")}>
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6">
              <div className={combine(
                "inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-4",
                theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
              )}>
                <FaExclamationTriangle className={combine("text-xl sm:text-2xl", theme === 'dark' ? 'text-red-300' : 'text-red-600')} />
              </div>
              <h2 className={combine("text-lg sm:text-xl md:text-2xl font-bold mb-2", get('text', 'primary'))}>Delete Assignment</h2>
              <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                Are you sure you want to delete "{selectedAssignment?.title}"?
              </p>
              {selectedAssignment?.attachment && (
                <p className={combine("mt-2 text-xs sm:text-sm", theme === 'dark' ? 'text-red-300' : 'text-red-600')}>
                  This will also delete the associated file
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={combine(getSecondaryButtonClass(), "px-6 py-3")}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAssignment}
                className={combine(
                  "px-6 py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm text-white",
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                )}
              >
                Delete Assignment
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* File Management Modal */}
      <Modal
        isOpen={showFileModal}
        onRequestClose={closeFileModal}
        style={{
          ...customStyles,
          content: {
            ...customStyles.content,
            maxWidth: '820px',
            width: '95%',
            padding: '0',
            overflow: 'hidden',
          }
        }}
        contentLabel="Manage File"
      >
        <div className={combine(get('bg', 'card'), "rounded-3xl overflow-hidden")}>
          <div className={combine(
            "sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60"
              : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200"
          )}>
            <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/15">
                  <FaPaperclip className="text-xl sm:text-2xl text-white" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Manage Assignment File</h2>
                  <p className="text-blue-100 text-xs sm:text-sm">{selectedAssignment?.title}</p>
                </div>
              </div>
              <button
                onClick={closeFileModal}
                className="self-end lg:self-auto text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-6">
              {/* Current File Section */}
              <div>
                <h3 className={combine("text-base sm:text-lg font-semibold mb-4", get('text', 'primary'))}>Current File</h3>
                {selectedAssignment?.attachment ? (
                  <div className={combine(
                    "p-4 rounded-xl sm:rounded-2xl border",
                    theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/40' : 'bg-green-50 border-green-200'
                  )}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {getFileIcon(selectedAssignment.file_type || 'unknown')}
                        <div className="min-w-0">
                          <div className={combine("font-medium text-xs sm:text-sm truncate", get('text', 'primary'))}>
                            {selectedAssignment.attachment.split('/').pop()}
                          </div>
                          <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Attached to assignment</div>
                        </div>
                      </div>
                      <a
                        href={selectedAssignment.attachment}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={combine(getPrimaryButtonClass(), "w-full sm:w-auto px-3 py-2 flex items-center justify-center gap-1")}
                      >
                        <FaDownload /> View
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className={combine("p-4 rounded-xl sm:rounded-2xl border text-center", get('bg', 'secondary'), get('border', 'secondary'))}>
                    <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>No file attached to this assignment</div>
                  </div>
                )}
              </div>

              {/* Delete File Section */}
              {selectedAssignment?.attachment && (
                <div className={combine(
                  "p-4 rounded-xl sm:rounded-2xl border",
                  theme === 'dark' ? 'bg-red-950/20 border-red-900/40' : 'bg-red-50 border-red-200'
                )}>
                  <h4 className={combine("font-bold text-sm sm:text-base mb-2", theme === 'dark' ? 'text-red-300' : 'text-red-800')}>Delete Current File</h4>
                  <p className={combine("text-xs sm:text-sm mb-4", theme === 'dark' ? 'text-red-200' : 'text-red-700')}>
                    This will remove only the file. The assignment description will remain.
                  </p>
                  <button
                    onClick={handleDeleteFile}
                    disabled={loading}
                    className={combine(
                      "w-full px-4 py-2 rounded-lg sm:rounded-xl transition-colors flex items-center justify-center gap-2 text-xs sm:text-sm font-medium",
                      theme === 'dark' ? 'bg-red-900/30 text-red-200 hover:bg-red-900/50' : 'bg-red-100 text-red-600 hover:bg-red-200'
                    )}
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                    {loading ? 'Deleting...' : 'Delete File Only'}
                  </button>
                </div>
              )}

              {/* Upload New File Section */}
              <div className={combine(
                "p-4 rounded-xl sm:rounded-2xl border",
                theme === 'dark' ? 'bg-blue-950/20 border-blue-900/40' : 'bg-blue-50 border-blue-200'
              )}>
                <h4 className={combine("font-bold text-sm sm:text-base mb-2", theme === 'dark' ? 'text-blue-300' : 'text-blue-800')}>Upload New File</h4>
                <p className={combine("text-xs sm:text-sm mb-4", theme === 'dark' ? 'text-blue-200' : 'text-blue-700')}>
                  Upload a new file to replace or add to this assignment.
                </p>
                
                <div className={combine(
                  "border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center transition-colors",
                  theme === 'dark' ? 'border-blue-900/40 hover:border-blue-700/60 bg-gray-900/20' : 'border-blue-300 hover:border-blue-400'
                )}>
                  <input
                    type="file"
                    id="new-attachment"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip,.rar"
                  />
                  <label htmlFor="new-attachment" className="cursor-pointer">
                    <FaUpload className={combine("text-3xl mx-auto mb-3", theme === 'dark' ? 'text-blue-300' : 'text-blue-400')} />
                    <div className={combine("mb-2 text-sm sm:text-base", theme === 'dark' ? 'text-blue-200' : 'text-blue-600')}>
                      {selectedFile 
                        ? selectedFile.name 
                        : 'Click to select a file'}
                    </div>
                    <div className={combine("text-xs sm:text-sm", theme === 'dark' ? 'text-blue-300/80' : 'text-blue-500')}>
                      Supported: PDF, DOC, Excel, Images, Archives
                    </div>
                  </label>
                </div>
                
                {selectedFile && (
                  <button
                    onClick={handleUploadFile}
                    disabled={loading}
                    className={combine(getPrimaryButtonClass(), "w-full mt-4 px-4 py-2 flex items-center justify-center gap-2")}
                  >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaUpload />}
                    {loading ? 'Uploading...' : 'Upload File'}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={closeFileModal}
              className={combine(getSecondaryButtonClass(), "w-full mt-6 px-6 py-3")}
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Submissions Modal */}
      {/* Submissions Modal */}
<Modal
  isOpen={showSubmissionsModal}
  onRequestClose={() => setShowSubmissionsModal(false)}
  style={{
    ...customStyles,
    content: {
      ...customStyles.content,
      maxWidth: '960px',
      width: '95%',
      padding: '0',
      overflow: 'hidden',
    }
  }}
  contentLabel="View Submissions"
>
  <div className={combine(get('bg', 'card'), "rounded-3xl overflow-hidden")}>
    <div className={combine(
      "sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10",
      theme === 'dark'
        ? "bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60"
        : "bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200"
    )}>
      <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">Assignment Submissions</h2>
        {selectedAssignment && (
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] sm:text-sm text-blue-100">
            <span className="px-2.5 sm:px-3 py-1 bg-white/15 text-white rounded-full font-medium">
              {selectedAssignment.title}
            </span>
            <span className="text-blue-200">•</span>
            <span className="font-medium">{selectedAssignment.subject}</span>
            <span className="text-blue-200">•</span>
            <span className="flex items-center gap-1">
              <FaSchool className="text-blue-100" />
              Class {selectedAssignment.class_name}-{selectedAssignment.section}
            </span>
          </div>
        )}
        </div>
        <button
          onClick={() => setShowSubmissionsModal(false)}
          className="self-end lg:self-auto text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
        >
          ×
        </button>
      </div>
    </div>

    <div className="p-4 sm:p-6">
      {/* Summary Stats */}
      {selectedAssignment && (
        <div className={combine(
          "mb-6 rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg",
          theme === 'dark'
            ? "bg-gradient-to-r from-blue-950/40 to-gray-900/60 border-blue-900/40"
            : "bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200"
        )}>
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <div className={getCardGradientClass('blue')}>
              <div className="text-center">
              <div className={combine("text-2xl sm:text-3xl font-bold mb-1.5", get('accent', 'primary'))}>
                {submissions.filter(s => s.file).length}
              </div>
              <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Submitted</div>
              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                {submissions.filter(s => s.file).length} out of {submissions.length}
              </div>
            </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="text-center">
              <div className={combine("text-2xl sm:text-3xl font-bold mb-1.5", get('accent', 'success'))}>
                {submissions.filter(s => s.submitted_at).length}
              </div>
              <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>On Time</div>
              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>Submitted before deadline</div>
            </div>
            </div>
            
            <div className={getCardGradientClass('amber')}>
              <div className="text-center">
              <div className={combine("text-2xl sm:text-3xl font-bold mb-1.5", get('accent', 'warning'))}>
                {submissions.filter(s => s.status === 'pending' && !s.file).length}
              </div>
              <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Pending</div>
              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>Awaiting submission</div>
            </div>
            </div>
            
            <div className={getCardGradientClass('purple')}>
              <div className="text-center">
              <div className={combine("text-2xl sm:text-3xl font-bold mb-1.5", theme === 'dark' ? 'text-purple-400' : 'text-purple-600')}>
                {submissions.length}
              </div>
              <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Students</div>
              <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>Enrolled in class</div>
            </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-6">
            <div className={combine("flex justify-between text-xs sm:text-sm mb-2", get('text', 'secondary'))}>
              <span>Submission Progress</span>
              <span>{submissions.filter(s => s.file).length}/{submissions.length}</span>
            </div>
            <div className={combine("h-3 rounded-full overflow-hidden", theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200')}>
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                style={{ 
                  width: `${submissions.length ? (submissions.filter(s => s.file).length / submissions.length) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
          <h3 className={combine("text-base sm:text-lg font-semibold flex items-center gap-2", get('text', 'primary'))}>
            <FaUsers className={combine(get('accent', 'primary'))} />
            Student Submissions
          </h3>
          <div className={combine("flex flex-wrap items-center gap-2 text-xs sm:text-sm", get('text', 'secondary'))}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              Submitted
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              Pending
            </div>
          </div>
        </div>

        {submissions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[420px] overflow-y-auto pr-1 sm:pr-2">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className={combine(
                  "rounded-xl sm:rounded-2xl p-4 sm:p-5 border shadow-md hover:shadow-lg transition-all duration-300",
                  submission.file 
                    ? (theme === 'dark' ? 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-700/50' : 'bg-white border-green-200 hover:border-green-300')
                    : (theme === 'dark' ? 'bg-amber-950/20 border-amber-900/40 hover:border-amber-700/50' : 'bg-white border-yellow-200 hover:border-yellow-300')
                )}
              >
                <div className="flex flex-col gap-3 sm:gap-4 mb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${
                        submission.file ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-green-100') : (theme === 'dark' ? 'bg-amber-900/30' : 'bg-yellow-100')
                      }`}>
                        <span className={`font-bold ${
                          submission.file ? (theme === 'dark' ? 'text-emerald-300' : 'text-green-700') : (theme === 'dark' ? 'text-amber-300' : 'text-yellow-700')
                        }`}>
                          {submission.student_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>{submission.student_name}</div>
                        <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>ID: {submission.student_id}</div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      {submission.file ? (
                        <div className="flex flex-col items-end">
                          <div className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                            submission.file 
                              ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-200' : 'bg-green-100 text-green-800') 
                              : (theme === 'dark' ? 'bg-amber-900/30 text-amber-200' : 'bg-yellow-100 text-yellow-800')
                          }`}>
                            <span className="flex items-center gap-1">
                              {submission.file ? (
                                <>
                                  <FaCheckCircle /> Submitted
                                </>
                              ) : (
                                <>
                                  <FaClock /> Pending
                                </>
                              )}
                            </span>
                          </div>
                          {submission.submitted_at && (
                            <div className={combine("text-xs", get('text', 'tertiary'))}>
                              {new Date(submission.submitted_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-medium ${
                          theme === 'dark' ? 'bg-amber-900/30 text-amber-200' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          Awaiting Submission
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submission Details */}
                {submission.file ? (
                  <div className="space-y-3">
                    {submission.description && (
                      <div className={combine("rounded-lg sm:rounded-xl p-3", get('bg', 'secondary'))}>
                        <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>{submission.description}</div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={combine("p-2 rounded-lg", theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50')}>
                          {getFileIcon(getFileType(submission.file))}
                        </div>
                        <div className="min-w-0">
                          <div className={combine("font-medium text-xs sm:text-sm truncate", get('text', 'primary'))}>
                            {submission.file.split('/').pop() || 'Submitted File'}
                          </div>
                          <div className={combine("text-xs", get('text', 'tertiary'))}>Student submission</div>
                        </div>
                      </div>
                      
                      <a
                        href={submission.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={combine(getPrimaryButtonClass(), "w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2")}
                      >
                        <FaDownload /> View File
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className={combine("mb-2 text-sm sm:text-base", get('text', 'secondary'))}>Student hasn't submitted yet</div>
                    <div className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>Awaiting assignment submission</div>
                  </div>
                )}

                {/* Grading Section - Only show for submitted assignments */}
                {submission.file && (
                  <div className={combine("mt-4 pt-4 border-t", get('border', 'secondary'))}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Grade Assignment:</div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={gradingData[submission.id] || ''}
                          onChange={(e) => setGradingData({
                            ...gradingData,
                            [submission.id]: e.target.value
                          })}
                          className={combine(getInputClass(), "w-full sm:w-24 px-3 py-2 text-center font-medium")}
                          placeholder="Marks"
                        />
                        <button
                          onClick={() => handleGradeSubmission(submission.id, gradingData[submission.id])}
                          className={combine(getPrimaryButtonClass(), "w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2")}
                        >
                          <FaCheck /> Grade
                        </button>
                      </div>
                    </div>
                    {gradingData[submission.id] && (
                      <div className={combine("mt-2 text-xs sm:text-sm", get('text', 'tertiary'))}>
                        Marks will be saved out of 100
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className={combine("text-center py-12 sm:py-16 p-6 sm:p-8 rounded-xl sm:rounded-2xl border", get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine("inline-flex items-center justify-center w-20 h-20 rounded-full mb-4", get('bg', 'secondary'))}>
              <FaUsers className={combine("text-3xl", get('text', 'tertiary'))} />
            </div>
            <h4 className={combine("text-lg sm:text-xl font-semibold mb-2", get('text', 'secondary'))}>No Student Data Available</h4>
            <p className={combine("text-xs sm:text-sm max-w-md mx-auto", get('text', 'tertiary'))}>
              Unable to load student data for this assignment. Please try again later.
            </p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className={combine("flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t", get('border', 'secondary'))}>
        <button
          onClick={() => setShowSubmissionsModal(false)}
          className={combine(getSecondaryButtonClass(), "flex-1 px-6 py-3")}
        >
          Close
        </button>
        {submissions.some(s => s.file) && (
          <button
            onClick={() => {
              // Export submissions functionality
              toastInfo('Export feature coming soon!');
            }}
            className={combine(getPrimaryButtonClass(), "flex-1 px-6 py-3 flex items-center justify-center gap-2")}
          >
            <FaDownload /> Export Submissions
          </button>
        )}
      </div>
    </div>
  </div>
</Modal>
    </div>
  );
}
