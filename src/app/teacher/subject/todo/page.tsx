'use client';

import React, { useEffect, useState } from 'react';
import {
  FaBook,
  FaCalendarAlt,
  FaCalendarDay,
  FaChalkboardTeacher,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaEdit,
  FaExclamationTriangle,
  FaEye,
  FaFilter,
  FaList,
  FaPlus,
  FaSchool,
  FaSearch,
  FaSortDown,
  FaSortUp,
  FaSpinner,
  FaTasks,
  FaThLarge,
  FaTrash,
  FaUserTie,
  FaRegCalendarCheck,
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface TeacherProfile {
  teacher_id?: string;
  name?: string;
  class_name?: string | null;
  assigned_class?: string | null;
  handled_subjects?: Record<string, Record<string, string[]>>;
}

interface SubjectAllocation {
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
  sections_display?: string[];
}

interface SubjectOption {
  name: string;
  code: string;
}

interface TaskItem {
  task_number: number;
  title: string;
  teacher_note?: string;
  priority: 'urgent' | 'important' | 'normal';
  task_type?: string;
  estimated_time?: number;
  date?: string;
}

interface TaskDetail {
  task_number: number;
  title: string;
  task_type: string;
  estimated_time: number;
  teacher_note: string;
  priority: 'urgent' | 'important' | 'normal';
}

interface TaskListPayload {
  status?: number;
  message?: string;
  error?: string;
  detail?: string;
  view_mode?: 'daily_tasks' | 'calendar_overview' | string;
  count?: number;
  year?: string;
  tasks?: TaskItem[];
  data?: Record<string, string[]>;
}

interface TaskDetailsPayload {
  status?: number;
  message?: string;
  error?: string;
  detail?: string;
  data?: TaskDetail;
}

interface CalendarOverview {
  year: string;
  data: Record<string, string[]>;
}

interface FiltersState {
  class_name: string;
  section: string;
  subject: string;
  date: string;
}

const apiService = {
  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getTeacherSubjectAllocations(teacherId: string) {
    const response = await teacherApi.subjects.allocations(teacherId);
    return response.data;
  },

  async getTasks(params: Record<string, string>) {
    const response = await teacherApi.tasks.list(params);
    return response.data;
  },

  async createTask(data: Record<string, any>) {
    const response = await teacherApi.tasks.create(data);
    return response.data;
  },

  async getTaskDetails(date: string, taskNumber: string) {
    const response = await teacherApi.tasks.details({ date, task_number: taskNumber });
    return response.data;
  },

  async updateTask(date: string, taskNumber: string, data: Record<string, any>) {
    const response = await teacherApi.tasks.update({ date, task_number: taskNumber }, data);
    return response.data;
  },

  async deleteTask(date: string, taskNumber: string) {
    const response = await teacherApi.tasks.delete({ date, task_number: taskNumber });
    return response.data;
  },
};

const isTaskListPayload = (payload: any): payload is TaskListPayload =>
  Boolean(payload && typeof payload === 'object' && ('view_mode' in payload || 'tasks' in payload || 'data' in payload));

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All Priorities' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'important', label: 'Important' },
  { value: 'normal', label: 'Normal' },
];

const TASK_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'project', label: 'Project' },
];

export default function TeacherTodoPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState('');
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<SubjectAllocation[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [calendarOverview, setCalendarOverview] = useState<CalendarOverview | null>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [pageInfo, setPageInfo] = useState('');

  const [filters, setFilters] = useState<FiltersState>({
    class_name: '',
    section: '',
    subject: '',
    date: '',
  });

  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [taskForm, setTaskForm] = useState({
    class_name: '',
    section_name: '',
    subject_name: '',
    date: '',
    title: '',
    task_type: 'reading',
    estimated_time: 30,
    teacher_note: '',
    priority: 'normal' as 'urgent' | 'important' | 'normal',
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [taskTypeFilter, setTaskTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortConfig, setSortConfig] = useState({ key: 'task_number', direction: 'asc' as 'asc' | 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);

  const resolveApiPayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined && payload.data !== null && !Array.isArray(payload.data)) {
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

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine('rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300', get('border', 'primary'));
    if (color === 'blue') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
    if (color === 'emerald') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    if (color === 'amber') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50');
  };

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
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];
    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) return value;
    }
    return { bg: '#2563EB', text: '#FFFFFF', border: '#2563EB' };
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text,
  });

  const getClassesFromDisplay = (displayValues: string[] | undefined) => {
    const classes = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass] = display.split(':');
      const normalizedClass = displayClass?.trim().replace(/^Class\s+/i, '');
      if (normalizedClass) classes.add(normalizedClass);
    });
    return Array.from(classes);
  };

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

  const getAssignedClassValue = (profile: TeacherProfile | null) =>
    profile?.assigned_class?.split(' - ')[0] || profile?.class_name || '';

  const getHandledSubjectsMap = (profile: TeacherProfile | null) => profile?.handled_subjects || {};
  const hasHandledSubjects = (profile: TeacherProfile | null) => Object.keys(getHandledSubjectsMap(profile)).length > 0;

  const getHandledClasses = (profile: TeacherProfile | null) => {
    const classes = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      Object.keys(classMap || {}).forEach((className) => classes.add(className));
    });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getHandledSectionsForClass = (profile: TeacherProfile | null, className: string) => {
    const sections = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap) => {
      (classMap?.[className] || []).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getHandledSubjectsForClassAndSection = (profile: TeacherProfile | null, className: string, sectionName: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if ((classMap?.[className] || []).includes(sectionName)) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getHandledSubjectsForClass = (profile: TeacherProfile | null, className: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]) => {
      if (classMap?.[className]?.length) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getSubjectCode = (subjectName: string) =>
    subjectAllocations.find((allocation) => allocation.subject_name === subjectName)?.subject_code || subjectName;

  const allocationHandlesClass = (allocation: SubjectAllocation, className: string) =>
    allocation.classes.includes(className) || getClassesFromDisplay(allocation.sections_display).includes(className);

  const getAllocationSectionsForClass = (allocation: SubjectAllocation, className: string) => {
    const sections = getSectionsFromDisplay(allocation.sections_display, className);
    if (sections.length) return sections;
    return [...new Set(allocation.sections || [])].sort();
  };

  const dedupeSubjects = (subjects: SubjectOption[]) =>
    Array.from(new Map(subjects.map((subject) => [subject.name, subject])).values()).sort((a, b) => a.name.localeCompare(b.name));

  const getSectionsForClass = (className: string) => {
    if (hasHandledSubjects(teacherProfile)) return getHandledSectionsForClass(teacherProfile, className);
    const sections = new Set<string>();
    subjectAllocations.forEach((allocation) => {
      if (!allocationHandlesClass(allocation, className)) return;
      getAllocationSectionsForClass(allocation, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSubjectsForClass = (className: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjects(
        getHandledSubjectsForClass(teacherProfile, className).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
        }))
      );
    }
    return dedupeSubjects(
      subjectAllocations
        .filter((allocation) => allocationHandlesClass(allocation, className))
        .map((allocation) => ({ name: allocation.subject_name, code: allocation.subject_code }))
    );
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string) => {
    if (hasHandledSubjects(teacherProfile)) {
      return dedupeSubjects(
        getHandledSubjectsForClassAndSection(teacherProfile, className, sectionName).map((subjectName) => ({
          name: subjectName,
          code: getSubjectCode(subjectName),
        }))
      );
    }
    return dedupeSubjects(
      subjectAllocations
        .filter((allocation) => {
          if (!allocationHandlesClass(allocation, className)) return false;
          const sections = new Set<string>(getAllocationSectionsForClass(allocation, className));
          return sections.size === 0 || sections.has(sectionName);
        })
        .map((allocation) => ({ name: allocation.subject_name, code: allocation.subject_code }))
    );
  };

  const toLocalDate = (dateValue: Date) => {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayDate = toLocalDate(new Date());

  const formatCalendarDateToIso = (dateValue: string) => {
    const [day, month, year] = dateValue.split('-');
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

  const getCalendarMonths = (overview: CalendarOverview | null) => {
    if (!overview?.year) return [];

    const entries = new Set(
      Object.values(overview.data || {})
        .flat()
        .map((date) => formatCalendarDateToIso(date))
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
          hasTask: entries.has(isoDate),
          isToday: isoDate === todayDate,
        };
      }),
    }));
  };

  const hasRequiredFilters = (value: Pick<FiltersState, 'class_name' | 'section' | 'subject'>) =>
    Boolean(value.class_name && value.section && value.subject);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      const profileResponse = await apiService.getTeacherProfile();
      const profileData = resolveApiPayload<TeacherProfile>(profileResponse);
      setTeacherProfile(profileData);

      if (!profileData?.teacher_id) throw new Error('Teacher profile is missing teacher_id');

      const allocationsResponse = await apiService.getTeacherSubjectAllocations(profileData.teacher_id);
      const allocationPayload = resolveApiPayload<{ allocations?: SubjectAllocation[] }>(allocationsResponse);
      const allocations = allocationPayload?.allocations || [];
      setSubjectAllocations(allocations);

      const classValues = (hasHandledSubjects(profileData)
        ? getHandledClasses(profileData)
        : Array.from(new Set(allocations.flatMap((allocation) => [
            ...allocation.classes,
            ...getClassesFromDisplay(allocation.sections_display),
          ])))).sort((a, b) => parseInt(a) - parseInt(b));

      setAvailableClasses(classValues);
      setAvailableSections([]);
      setAvailableSubjects([]);
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load teacher data');
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, taskTypeFilter, viewMode, sortConfig.key, sortConfig.direction, tasks]);

  useEffect(() => {
    if (!calendarOverview) {
      setCalendarMonthIndex(0);
      return;
    }
    const activeDate = selectedCalendarDate || Object.values(calendarOverview.data).flat()[0];
    if (!activeDate) return;
    const isoDate = activeDate.length === 10 && activeDate[4] === '-' ? activeDate : formatCalendarDateToIso(activeDate);
    const [year, month] = isoDate.split('-');
    const targetKey = `${year}-${Number(month) - 1}`;
    const monthIndex = getCalendarMonths(calendarOverview).findIndex((monthInfo) => monthInfo.key === targetKey);
    setCalendarMonthIndex(monthIndex >= 0 ? monthIndex : 0);
  }, [calendarOverview, selectedCalendarDate, todayDate]);

  const handleClassChange = (className: string) => {
    const sections = className ? getSectionsForClass(className) : [];
    setAvailableSections(sections);
    setAvailableSubjects([]);
    setFilters((prev) => ({ ...prev, class_name: className, section: '', subject: '' }));
    setTasks([]);
    setCalendarOverview(null);
  };

  const handleSectionChange = (sectionName: string) => {
    const subjects = filters.class_name ? getSubjectsForClassAndSection(filters.class_name, sectionName) : [];
    setAvailableSubjects(subjects);
    setFilters((prev) => ({ ...prev, section: sectionName, subject: '' }));
    setTasks([]);
    setCalendarOverview(null);
  };

  const handleSubjectChange = (subjectName: string) => {
    setFilters((prev) => ({ ...prev, subject: subjectName }));
    setTasks([]);
    setCalendarOverview(null);
  };

  const processTaskListResponse = (payload: TaskListPayload, activeFilters: FiltersState) => {
    if (payload.view_mode === 'calendar_overview' && payload.data) {
      setTasks([]);
      setCalendarOverview({ year: payload.year || '', data: payload.data });
      setSelectedCalendarDate(null);
      setPageInfo('Task calendar loaded. Select a highlighted date to view tasks.');
      return;
    }

    if (payload.view_mode === 'daily_tasks' && Array.isArray(payload.tasks)) {
      const requestedDate = activeFilters.date || '';
      const normalizedTasks = payload.tasks.map((task) => ({
        ...task,
        task_type: task.task_type || 'reading',
        estimated_time: task.estimated_time || 30,
        teacher_note: task.teacher_note || '',
        // Prefer API-provided date, otherwise the requested date.
        date: task.date || requestedDate,
      }));
      setTasks(normalizedTasks);
      setPageInfo(() => {
        if (!requestedDate) return `${normalizedTasks.length} tasks for ${activeFilters.subject}.`;
        return `${normalizedTasks.length} tasks for ${activeFilters.subject} on ${new Date(requestedDate).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })}.`;
      });
      return;
    }

    setTasks([]);
    setPageInfo('');
  };

  const loadTasks = async (override?: Partial<FiltersState>) => {
    const nextFilters = { ...filters, ...override };
    if (!hasRequiredFilters(nextFilters)) {
      toastError('Select class, section, and subject to load tasks');
      return;
    }

    try {
      setLoadingTasks(true);
      setError('');

      const params: Record<string, string> = {
        class: nextFilters.class_name,
        section: nextFilters.section,
        subject: nextFilters.subject,
      };
      if (nextFilters.date) params.date = nextFilters.date;

      const response = await apiService.getTasks(params);
      const payload = isTaskListPayload(response) ? response : resolveApiPayload<TaskListPayload>(response);
      processTaskListResponse(payload, nextFilters);
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load tasks');
      setError(message);
      setTasks([]);
      toastError(message);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadTasksForSpecificDate = async (date: string) => {
    const nextFilters = { ...filters, date };
    setFilters(nextFilters);
    setSelectedCalendarDate(date);
    await loadTasks(nextFilters);
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTaskForm({
      class_name: filters.class_name || '',
      section_name: filters.section || '',
      subject_name: filters.subject || '',
      date: filters.date || toLocalDate(new Date()),
      title: '',
      task_type: 'reading',
      estimated_time: 30,
      teacher_note: '',
      priority: 'normal',
    });
    setShowTaskModal(true);
  };

  const closeTaskModal = () => {
    setShowTaskModal(false);
    setEditingTask(null);
  };

  const handleCreateTask = async () => {
    if (!taskForm.class_name || !taskForm.section_name || !taskForm.subject_name || !taskForm.title || !taskForm.date) {
      toastError('Please fill all required fields');
      return;
    }

    try {
      const response = await apiService.createTask(taskForm);
      toastSuccess(extractApiMessage(response, 'Task posted successfully'));

      const nextFilters = {
        class_name: taskForm.class_name,
        section: taskForm.section_name,
        subject: taskForm.subject_name,
        date: taskForm.date,
      };

      setAvailableSections(getSectionsForClass(nextFilters.class_name));
      setAvailableSubjects(getSubjectsForClassAndSection(nextFilters.class_name, nextFilters.section));
      setFilters(nextFilters);
      setSelectedCalendarDate(taskForm.date);
      closeTaskModal();
      await loadTasks(nextFilters);
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to create task'));
    }
  };

  const handleEditTask = async (task: TaskItem) => {
    if (!task.date) {
      toastError('Task date is missing');
      return;
    }

    try {
      const response = await apiService.getTaskDetails(task.date, String(task.task_number));
      const payload = resolveApiPayload<TaskDetailsPayload>(response);
      const detail = payload?.data || (response as TaskDetailsPayload)?.data;
      if (!detail) throw new Error('Task details not found');

      setEditingTask(task);
      setTaskForm({
        class_name: filters.class_name,
        section_name: filters.section,
        subject_name: filters.subject,
        date: task.date,
        title: detail.title,
        task_type: detail.task_type || 'reading',
        estimated_time: detail.estimated_time || 30,
        teacher_note: detail.teacher_note || '',
        priority: detail.priority || 'normal',
      });
      setShowTaskModal(true);
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to load task details'));
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !taskForm.date) return;

    try {
      const response = await apiService.updateTask(taskForm.date, String(editingTask.task_number), {
        title: taskForm.title,
        teacher_note: taskForm.teacher_note,
        priority: taskForm.priority,
        estimated_time: taskForm.estimated_time,
      });
      toastSuccess(extractApiMessage(response, 'Task updated successfully'));
      closeTaskModal();
      await loadTasks();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to update task'));
    }
  };

  const handleDeleteTask = async () => {
    if (!editingTask?.date) return;

    try {
      const response = await apiService.deleteTask(editingTask.date, String(editingTask.task_number));
      toastSuccess(extractApiMessage(response, 'Task deleted successfully'));
      setShowDeleteModal(false);
      setEditingTask(null);
      await loadTasks();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to delete task'));
    }
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'urgent') return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 'important') return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  };

  const getTaskTypeBadge = (taskType: string) => {
    if (taskType === 'reading') return 'bg-blue-50 text-blue-700 border-blue-100';
    if (taskType === 'writing') return 'bg-purple-50 text-purple-700 border-purple-100';
    if (taskType === 'assignment') return 'bg-orange-50 text-orange-700 border-orange-100';
    if (taskType === 'project') return 'bg-teal-50 text-teal-700 border-teal-100';
    return 'bg-gray-50 text-gray-700 border-gray-100';
  };

  const filteredTasks = [...tasks]
    .filter((task) => {
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.teacher_note || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
      const matchesTaskType = taskTypeFilter === 'all' || (task.task_type || 'reading') === taskTypeFilter;
      return matchesSearch && matchesPriority && matchesTaskType;
    })
    .sort((a, b) => {
      if (sortConfig.key === 'priority') {
        const order = { urgent: 0, important: 1, normal: 2 };
        return sortConfig.direction === 'asc'
          ? order[a.priority] - order[b.priority]
          : order[b.priority] - order[a.priority];
      }
      return sortConfig.direction === 'asc'
        ? a.task_number - b.task_number
        : b.task_number - a.task_number;
    });

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTasks = viewMode === 'list'
    ? filteredTasks.slice((safeCurrentPage - 1) * itemsPerPage, safeCurrentPage * itemsPerPage)
    : filteredTasks;
  const calendarMonths = getCalendarMonths(calendarOverview);
  const safeCalendarMonthIndex = calendarMonths.length === 0 ? 0 : Math.min(calendarMonthIndex, calendarMonths.length - 1);
  const activeCalendarMonth = calendarMonths[safeCalendarMonthIndex] || null;
  const activeCalendarDates = activeCalendarMonth?.dates.filter((date) => date.hasTask) || [];
  const selectedCalendarDateMeta = activeCalendarMonth?.dates.find((date) => date.isoDate === selectedCalendarDate) || null;

  if (loading) {
    return (
      <div className={combine(getBgClass(), 'flex flex-col items-center justify-center px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6')}>
        <div className="text-center">
          <div className="relative">
            <FaSpinner className={combine('animate-spin text-5xl mb-4', theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
          </div>
          <h3 className={combine('text-lg sm:text-xl font-semibold mb-2', get('text', 'primary'))}>Loading To-Do Tasks</h3>
          <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Fetching your teaching allocations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaTasks className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">To-Do Task Manager</h1>
                  <p className="text-xs sm:text-sm text-blue-100">Create and manage daily subject tasks for your classes</p>
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
                    {subjectAllocations.length}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Tasks</div>
                  <div className="text-sm sm:text-base font-bold">
                    {tasks.length}
                  </div>
                </div>
                <button
                  onClick={openCreateModal}
                  className={combine(getPrimaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2 font-bold')}
                >
                  <FaPlus /> Create New Task
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={combine(getCardGradientClass('blue'), 'mb-8')}>
          <div className="flex items-center gap-2 mb-6">
            <FaFilter className={combine('text-sm sm:text-base', get('accent', 'primary'))} />
            <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filter Tasks</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 mb-4 items-end">
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}><div className="flex items-center gap-2"><FaSchool /> Class *</div></label>
              <select value={filters.class_name} onChange={(e) => handleClassChange(e.target.value)} className={getInputClass()}>
                <option value="">Select Class</option>
                {availableClasses.map((className) => <option key={className} value={className}>Class {className}</option>)}
              </select>
            </div>
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}><div className="flex items-center gap-2"><FaChalkboardTeacher /> Section *</div></label>
              <select value={filters.section} onChange={(e) => handleSectionChange(e.target.value)} disabled={!filters.class_name} className={getInputClass()}>
                <option value="">Select Section</option>
                {availableSections.map((section) => <option key={section} value={section}>Section {section}</option>)}
              </select>
            </div>
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}><div className="flex items-center gap-2"><FaBook /> Subject *</div></label>
              <select value={filters.subject} onChange={(e) => handleSubjectChange(e.target.value)} disabled={!filters.class_name || !filters.section} className={getInputClass()}>
                <option value="">Select Subject</option>
                {availableSubjects.map((subject) => <option key={subject.code} value={subject.name}>{subject.name}</option>)}
              </select>
            </div>
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}><div className="flex items-center gap-2"><FaCalendarAlt /> Date</div></label>
              <input type="date" value={filters.date} onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))} className={getInputClass()} />
            </div>
            <div className="flex flex-col justify-end h-full">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">Load</label>
              <button
                onClick={() => loadTasks()}
                disabled={loadingTasks || !hasRequiredFilters(filters)}
                className={combine(
                  getPrimaryButtonClass(),
                  'w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed'
                )}
              >
                {loadingTasks ? <FaSpinner className="animate-spin" /> : <FaFilter />}
                {loadingTasks ? 'Loading...' : 'Load Tasks'}
              </button>
            </div>
          </div>

          {filters.class_name && filters.section && filters.subject && (
            <div className={combine('mt-6 p-4 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm', theme === 'dark' ? 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200')}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2"><FaSchool className={combine('text-sm', get('accent', 'primary'))} /><span className={combine('font-semibold text-sm', get('accent', 'primary'))}>Class {filters.class_name}</span></div>
                  <div className="flex items-center gap-2"><FaChalkboardTeacher className={combine('text-sm', get('accent', 'primary'))} /><span className={combine('font-semibold text-sm', get('accent', 'primary'))}>Section {filters.section}</span></div>
                  <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs sm:text-sm font-semibold" style={getSubjectGradientStyle(getSubjectColor(filters.subject))}>{filters.subject}</span>
                  {filters.date && <div className="flex items-center gap-2"><FaCalendarAlt className={combine('text-sm', get('accent', 'primary'))} /><span className={combine('font-semibold text-sm', get('accent', 'primary'))}>{new Date(filters.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>}
                </div>
                <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{pageInfo || `${tasks.length} tasks loaded`}</div>
              </div>
            </div>
          )}
        </div>


        {calendarOverview && calendarMonths.length > 0 && !loadingTasks && activeCalendarMonth && (
          <div className={combine('mb-6 rounded-xl sm:rounded-2xl shadow-lg border overflow-hidden', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('px-4 sm:px-6 py-4 border-b', get('border', 'secondary'), get('bg', 'secondary'))}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className={combine('text-base sm:text-lg font-semibold flex items-center gap-2', get('text', 'primary'))}>
                    <FaCalendarAlt className={combine(get('accent', 'primary'))} />
                    Academic Year Calendar
                  </h3>
                  <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
                    {calendarOverview.year || 'Academic Year'} • Dates with tasks are highlighted.
                  </p>
                </div>
                {selectedCalendarDate && (
                  <div className={combine('text-xs sm:text-sm font-medium', get('accent', 'primary'))}>
                    Selected: {new Date(selectedCalendarDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 sm:p-5">
              <div className="mx-auto grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start">
                <div
                  className={combine(
                    'rounded-xl sm:rounded-2xl border shadow-sm overflow-hidden xl:h-[420px] flex flex-col',
                    theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900/70 border-gray-700' : 'bg-gradient-to-br from-white to-blue-50/50 border-blue-100'
                  )}
                >
                  <div className={combine(
                    'px-4 sm:px-5 py-4 border-b flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                    theme === 'dark' ? 'bg-blue-900/25 border-blue-900/40' : 'bg-blue-50 border-blue-100'
                  )}>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCalendarMonthIndex((prev) => Math.max(prev - 1, 0))}
                        disabled={safeCalendarMonthIndex === 0}
                        className={combine(
                          'h-10 w-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                          get('border', 'secondary'),
                          get('bg', 'card')
                        )}
                      >
                        <FaChevronLeft />
                      </button>
                      <div>
                        <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>{activeCalendarMonth.label}</h4>
                        <p className={combine('text-[11px] sm:text-xs', get('text', 'tertiary'))}>
                          {activeCalendarDates.length} task date{activeCalendarDates.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCalendarMonthIndex((prev) => Math.min(prev + 1, calendarMonths.length - 1))}
                      disabled={safeCalendarMonthIndex === calendarMonths.length - 1}
                      className={combine(
                        'h-10 w-10 rounded-xl border flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed',
                        get('border', 'secondary'),
                        get('bg', 'card')
                      )}
                    >
                      <FaChevronRight />
                    </button>
                  </div>

                  <div className="p-3 overflow-auto flex-1">
                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className={combine('text-center text-[10px] sm:text-[11px] font-semibold py-1 rounded-lg', get('text', 'tertiary'))}>
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-0.5 sm:gap-1 place-items-center">
                      {Array.from({ length: activeCalendarMonth.firstDayOffset }).map((_, index) => (
                        <div key={`${activeCalendarMonth.key}-blank-${index}`} className="h-9 w-9 sm:h-11 sm:w-11" />
                      ))}
                      {activeCalendarMonth.dates.map((date) => {
                        const isSelected = selectedCalendarDate === date.isoDate;
                        const buttonClass = date.hasTask
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
                              if (!date.hasTask) return;
                              void loadTasksForSpecificDate(date.isoDate);
                            }}
                            disabled={!date.hasTask}
                            className={combine(
                              'h-9 w-9 sm:h-11 sm:w-11 rounded-lg border text-[11px] sm:text-xs font-medium transition-all duration-200 flex items-center justify-center relative',
                              date.hasTask ? 'cursor-pointer shadow-sm' : 'cursor-default',
                              buttonClass,
                              date.isToday ? 'ring-2 ring-amber-400 ring-offset-1' : '',
                              isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.03]' : ''
                            )}
                          >
                            <span>{date.dayNumber}</span>
                            {date.hasTask && (
                              <span className={combine('absolute bottom-0.5 h-1 w-1 rounded-full', theme === 'dark' ? 'bg-blue-300' : 'bg-blue-500')} />
                            )}
                            {date.isToday && <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-amber-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-4 xl:h-[420px] xl:overflow-auto pr-1">
                  <div className={combine(
                    'rounded-xl sm:rounded-2xl border p-3.5 sm:p-4',
                    theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-blue-100'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <FaRegCalendarCheck className={combine(get('accent', 'primary'))} />
                      <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Month Summary</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className={combine('rounded-xl p-2.5', get('bg', 'secondary'))}>
                        <div className={combine('text-[11px] sm:text-xs', get('text', 'tertiary'))}>Academic Year</div>
                        <div className={combine('mt-1 font-semibold text-sm', get('text', 'primary'))}>{calendarOverview.year || '-'}</div>
                      </div>
                      <div className={combine('rounded-xl p-2.5', get('bg', 'secondary'))}>
                        <div className={combine('text-[11px] sm:text-xs', get('text', 'tertiary'))}>Selected Month</div>
                        <div className={combine('mt-1 font-semibold text-sm', get('text', 'primary'))}>{activeCalendarMonth.label}</div>
                      </div>
                    </div>
                    <div className={combine('mt-3 rounded-xl p-2.5 border', get('border', 'secondary'), get('bg', 'secondary'))}>
                      <div className={combine('text-[11px] sm:text-xs', get('text', 'tertiary'))}>Focused Date</div>
                      <div className={combine('mt-1 font-semibold text-sm', get('text', 'primary'))}>
                        {selectedCalendarDateMeta
                          ? new Date(selectedCalendarDateMeta.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : activeCalendarDates[0]
                            ? new Date(activeCalendarDates[0].isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                            : 'No dates in this month'}
                      </div>
                    </div>
                  </div>

                  <div className={combine(
                    'rounded-xl sm:rounded-2xl border p-3.5 sm:p-4',
                    theme === 'dark' ? 'bg-gray-900/70 border-gray-700' : 'bg-white border-blue-100'
                  )}>
                    <div className="flex items-center gap-2 mb-3">
                      <FaCalendarDay className={combine(get('accent', 'primary'))} />
                      <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Monthly Task Dates</h4>
                    </div>
                    <div className="space-y-2">
                      {activeCalendarDates.length > 0 ? activeCalendarDates.slice(0, 8).map((date) => (
                        <button
                          key={date.isoDate}
                          type="button"
                          onClick={() => { void loadTasksForSpecificDate(date.isoDate); }}
                          className={combine(
                            'w-full rounded-xl border px-2.5 py-2 text-left transition-all flex items-center justify-between',
                            selectedCalendarDate === date.isoDate
                              ? (theme === 'dark' ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-200')
                              : combine(get('bg', 'secondary'), get('border', 'secondary'))
                          )}
                        >
                          <div>
                            <div className={combine('font-medium text-sm', get('text', 'primary'))}>
                              {new Date(date.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                            <div className={combine('text-[11px] sm:text-xs', get('text', 'tertiary'))}>Tap to open that day&apos;s tasks</div>
                          </div>
                          <FaChevronRight className={combine('text-xs', get('text', 'tertiary'))} />
                        </button>
                      )) : (
                        <div className={combine('rounded-xl p-3 text-sm', get('bg', 'secondary'), get('text', 'secondary'))}>
                          No task dates available for this month.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className={combine(getCardGradientClass('blue'), 'mb-6')}>
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_220px_220px_auto] gap-4 items-end">
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search tasks..." className={combine(getInputClass(), 'pl-8 sm:pl-9')} />
              </div>
            </div>
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Priority</label>
              <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className={getInputClass()}>
                {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div>
              <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>Task Type</label>
              <select value={taskTypeFilter} onChange={(e) => setTaskTypeFilter(e.target.value)} className={getInputClass()}>
                {TASK_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs sm:text-sm font-medium mb-2 opacity-0 pointer-events-none">View</label>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => setViewMode('grid')} className={`p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'grid' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}><FaThLarge /></button>
                <button onClick={() => setViewMode('list')} className={`p-2.5 sm:p-3 rounded-lg flex items-center justify-center ${viewMode === 'list' ? (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600') : combine(get('bg', 'secondary'), get('text', 'secondary'))}`}><FaList /></button>
              </div>
            </div>
          </div>
        </div>

        {loadingTasks ? (
          <div className={combine('text-center py-12 rounded-xl sm:rounded-2xl shadow-lg border', get('bg', 'card'), get('border', 'primary'))}>
            <FaSpinner className={combine('animate-spin text-4xl mx-auto mb-4', get('accent', 'primary'))} />
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading tasks...</p>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className={combine('rounded-xl sm:rounded-2xl shadow-lg overflow-hidden border', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('p-4 sm:p-6 border-b', get('border', 'primary'))}>
              <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>{viewMode === 'grid' ? 'Tasks Grid View' : 'Tasks List View'}</h3>
                <div className="flex items-center gap-4">
                  <div className={combine('text-xs sm:text-sm', get('text', 'tertiary'))}>
                    {viewMode === 'list'
                      ? `Showing ${(safeCurrentPage - 1) * itemsPerPage + 1}-${Math.min(safeCurrentPage * itemsPerPage, filteredTasks.length)} of ${filteredTasks.length} tasks`
                      : `Showing ${filteredTasks.length} of ${tasks.length} tasks`}
                  </div>
                </div>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 min-[520px]:grid-cols-2 2xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                  {filteredTasks.map((task) => {
                    const subjectColor = getSubjectColor(filters.subject);
                    return (
                      <div key={`${task.date}-${task.task_number}`} className={combine('rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border overflow-hidden group', theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-gray-900/50 border-gray-700' : 'bg-gradient-to-br from-white to-gray-50 border-gray-200')}>
                        <div className="p-4 sm:p-6">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <span className="inline-flex max-w-full items-center rounded-full border px-3 py-1 text-[11px] sm:text-xs font-semibold" style={getSubjectGradientStyle(subjectColor)}>
                              <span className="truncate">{filters.subject}</span>
                            </span>
                            <span className={combine('text-[11px] sm:text-xs whitespace-nowrap', get('text', 'tertiary'))}>Task {task.task_number}</span>
                          </div>
                          <div className={combine('flex items-start justify-between gap-3 mb-4 pb-3 border-b', get('border', 'secondary'))}>
                            <div className="flex-1 min-w-0">
                              <h3 className={combine('text-base sm:text-lg font-bold break-words', get('text', 'primary'))}>{task.title}</h3>
                              <div className={`mt-3 px-3 py-1 rounded-full border ${getPriorityBadge(task.priority)} inline-flex items-center gap-2`}>
                                <FaCheckCircle className="text-xs" />
                                <span className="text-xs font-semibold capitalize">{task.priority}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button onClick={() => handleEditTask(task)} className={combine(getSecondaryButtonClass(), 'px-2.5 py-2 flex items-center justify-center')}><FaEdit /></button>
                              <button onClick={() => { setEditingTask(task); setShowDeleteModal(true); }} className={combine('px-2.5 py-2 rounded-lg transition-colors flex items-center justify-center text-xs sm:text-sm border', theme === 'dark' ? 'bg-red-900/20 text-red-300 border-red-800 hover:bg-red-900/30' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100')}><FaTrash /></button>
                            </div>
                          </div>
                          <div className="mb-4 min-h-[3.75rem]"><p className={combine('text-xs sm:text-sm line-clamp-3', get('text', 'secondary'))}>{task.teacher_note || 'No teacher note'}</p></div>
                          <div className="space-y-2 mb-6">
                            <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}><FaClock className="text-purple-500" /><span>{task.estimated_time || 30} minutes</span></div>
                            <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}><FaCalendarAlt className="text-blue-500" /><span>{task.date ? new Date(task.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span></div>
                            <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}><FaEye className="text-emerald-500" /><span className={`px-3 py-1 rounded-lg border ${getTaskTypeBadge(task.task_type || 'reading')}`}>{task.task_type || 'reading'}</span></div>
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
                      <tr className={combine('border-b', theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200')}>
                        <th className={combine('py-4 px-6 text-left font-semibold cursor-pointer', get('text', 'secondary'))} onClick={() => setSortConfig((prev) => ({ key: 'task_number', direction: prev.key === 'task_number' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>Task No.</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Title</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Subject</th>
                        <th className={combine('py-4 px-6 text-left font-semibold cursor-pointer', get('text', 'secondary'))} onClick={() => setSortConfig((prev) => ({ key: 'priority', direction: prev.key === 'priority' && prev.direction === 'asc' ? 'desc' : 'asc' }))}>Priority</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Type</th>
                        <th className={combine('py-4 px-6 text-left font-semibold', get('text', 'secondary'))}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.map((task) => (
                        <tr key={`${task.date}-${task.task_number}`} className={combine('transition-colors border-b', theme === 'dark' ? 'hover:bg-gray-800 border-gray-700' : 'hover:bg-blue-50 border-gray-200')}>
                          <td className="py-4 px-6"><div className={combine('font-medium', get('text', 'primary'))}>{task.task_number}</div></td>
                          <td className="py-4 px-6"><div><div className={combine('font-medium text-sm sm:text-base', get('text', 'primary'))}>{task.title}</div>{task.teacher_note && <div className={combine('text-xs sm:text-sm truncate max-w-xs', get('text', 'secondary'))}>{task.teacher_note}</div>}</div></td>
                          <td className="py-4 px-6"><span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold" style={getSubjectGradientStyle(getSubjectColor(filters.subject))}>{filters.subject}</span></td>
                          <td className="py-4 px-6"><div className={`px-3 py-1 rounded-lg border ${getPriorityBadge(task.priority)} inline-flex items-center gap-2`}><span className="capitalize">{task.priority}</span></div></td>
                          <td className="py-4 px-6"><div className={`px-3 py-1 rounded-lg border ${getTaskTypeBadge(task.task_type || 'reading')} inline-flex items-center gap-2`}><span className="capitalize">{task.task_type || 'reading'}</span></div></td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button onClick={() => handleEditTask(task)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Edit"><FaEdit /></button>
                              <button onClick={() => { setEditingTask(task); setShowDeleteModal(true); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete"><FaTrash /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className={combine('px-3 sm:px-4 py-3 border-t', get('border', 'primary'))}>
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                      <p className={combine('text-xs', get('text', 'tertiary'))}>Page {safeCurrentPage} of {totalPages}</p>
                      <div className="flex items-center space-x-1 sm:space-x-1.5">
                        <button onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={safeCurrentPage === 1} className={combine('p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm', getSecondaryButtonClass())}><FaChevronLeft className="text-xs" /></button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                          const pageNumber = totalPages <= 5 ? index + 1 : safeCurrentPage <= 3 ? index + 1 : safeCurrentPage >= totalPages - 2 ? totalPages - 4 + index : safeCurrentPage - 2 + index;
                          return (
                            <button key={pageNumber} onClick={() => setCurrentPage(pageNumber)} className={combine('px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium text-xs', safeCurrentPage === pageNumber ? getPrimaryButtonClass() : getSecondaryButtonClass())}>{pageNumber}</button>
                          );
                        })}
                        <button onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={safeCurrentPage === totalPages} className={combine('p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm', getSecondaryButtonClass())}><FaChevronRight className="text-xs" /></button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className={combine('text-center py-12 sm:py-16 p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-lg border', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('inline-flex items-center justify-center w-24 h-24 rounded-full mb-6', theme === 'dark' ? 'bg-blue-900/30' : 'bg-gradient-to-r from-blue-100 to-indigo-100')}>
              <FaTasks className={combine('text-4xl', theme === 'dark' ? 'text-blue-300' : 'text-blue-600')} />
            </div>
            <h3 className={combine('text-xl sm:text-2xl font-bold mb-3', get('text', 'primary'))}>{filters.class_name && filters.section && filters.subject ? 'No Tasks Found' : 'Select Filters to View Tasks'}</h3>
            <p className={combine('max-w-md mx-auto mb-8 text-sm sm:text-base', get('text', 'secondary'))}>
              {filters.class_name && filters.section && filters.subject
                ? filters.date
                  ? `No tasks found for ${filters.subject} in Class ${filters.class_name}-${filters.section} on the selected date.`
                  : 'No tasks found. Load without a date to view the task calendar.'
                : 'Please select a class, section, and subject to view tasks'}
            </p>
          </div>
        )}

        {showTaskModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-[960px] w-[95%] shadow-2xl max-h-[90vh] overflow-hidden border', get('bg', 'card'), get('border', 'primary'))}>
              <div className={combine('sticky top-0 px-4 sm:px-6 py-4 sm:py-5 border-b z-10', theme === 'dark' ? 'bg-gradient-to-r from-blue-900 to-blue-950 text-white border-blue-900/60' : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-200')}>
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                    <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/15">
                      <FaPlus className="text-xl sm:text-2xl text-white" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
                      <p className="text-blue-100 text-xs sm:text-sm">{editingTask ? 'Update task details for your students' : 'Add a new daily task for your students'}</p>
                    </div>
                  </div>
                  <button onClick={closeTaskModal} className="shrink-0 text-white/80 hover:text-white text-3xl hover:bg-white/10 w-10 h-10 rounded-full flex items-center justify-center transition-colors">×</button>
                </div>
              </div>
              <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}><div className="flex items-center gap-2"><FaSchool /> Class *</div></label>
                      <select value={taskForm.class_name} onChange={(e) => setTaskForm((prev) => ({ ...prev, class_name: e.target.value, section_name: '', subject_name: '' }))} disabled={Boolean(editingTask)} className={getInputClass()}>
                        <option value="">Select Class</option>
                        {availableClasses.map((className) => <option key={className} value={className}>Class {className}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}><div className="flex items-center gap-2"><FaChalkboardTeacher /> Section *</div></label>
                      <select value={taskForm.section_name} onChange={(e) => setTaskForm((prev) => ({ ...prev, section_name: e.target.value, subject_name: '' }))} disabled={Boolean(editingTask) || !taskForm.class_name} className={getInputClass()}>
                        <option value="">Select Section</option>
                        {getSectionsForClass(taskForm.class_name).map((section) => <option key={section} value={section}>Section {section}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}><div className="flex items-center gap-2"><FaBook /> Subject *</div></label>
                      <select value={taskForm.subject_name} onChange={(e) => setTaskForm((prev) => ({ ...prev, subject_name: e.target.value }))} disabled={Boolean(editingTask) || !taskForm.class_name || !taskForm.section_name} className={getInputClass()}>
                        <option value="">Select Subject</option>
                        {getSubjectsForClassAndSection(taskForm.class_name, taskForm.section_name).map((subject) => <option key={subject.code} value={subject.name}>{subject.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}><div className="flex items-center gap-2"><FaCalendarAlt /> Date *</div></label>
                      <input type="date" value={taskForm.date} onChange={(e) => setTaskForm((prev) => ({ ...prev, date: e.target.value }))} className={getInputClass()} />
                    </div>
                  </div>
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>Title *</label>
                    <input type="text" value={taskForm.title} onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))} className={getInputClass()} placeholder="Enter task title" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>Task Type</label>
                      <select value={taskForm.task_type} onChange={(e) => setTaskForm((prev) => ({ ...prev, task_type: e.target.value }))} className={getInputClass()}>
                        {TASK_TYPE_OPTIONS.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>Priority</label>
                      <select value={taskForm.priority} onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value as 'urgent' | 'important' | 'normal' }))} className={getInputClass()}>
                        {PRIORITY_OPTIONS.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>Estimated Time (minutes)</label>
                    <input type="number" min={5} max={240} value={taskForm.estimated_time} onChange={(e) => setTaskForm((prev) => ({ ...prev, estimated_time: Number(e.target.value) || 30 }))} className={getInputClass()} />
                  </div>
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'primary'))}>Teacher Note</label>
                    <textarea value={taskForm.teacher_note} onChange={(e) => setTaskForm((prev) => ({ ...prev, teacher_note: e.target.value }))} className={combine(getInputClass(), 'min-h-[120px] resize-y')} rows={4} placeholder="Add instructions or notes for students" />
                  </div>
                  {taskForm.class_name && taskForm.section_name && taskForm.subject_name && (
                    <div className={combine('p-4 sm:p-6 rounded-xl sm:rounded-2xl border shadow-lg', theme === 'dark' ? 'bg-gradient-to-r from-blue-950/40 to-gray-900/60 border-blue-900/40' : 'bg-gradient-to-r from-blue-50 to-blue-100/70 border-blue-200')}>
                      <div className="text-center">
                        <div className={combine('text-xs sm:text-sm font-semibold mb-1', get('accent', 'primary'))}>{editingTask ? 'Updating task for:' : 'Creating task for:'}</div>
                        <div className={combine('flex flex-wrap justify-center items-center gap-2 sm:gap-3 text-xs sm:text-sm', get('text', 'secondary'))}>
                          <div className="flex items-center gap-1"><FaSchool className={combine(get('accent', 'primary'))} /><span>Class {taskForm.class_name}</span></div>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1"><FaChalkboardTeacher className={combine(get('accent', 'primary'))} /><span>Section {taskForm.section_name}</span></div>
                          <div className="text-gray-400">•</div>
                          <span className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold" style={getSubjectGradientStyle(getSubjectColor(taskForm.subject_name))}>{taskForm.subject_name}</span>
                          <div className="text-gray-400">•</div>
                          <div className="flex items-center gap-1"><FaCalendarAlt className={combine(get('accent', 'primary'))} /><span>{new Date(taskForm.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className={combine('flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6 border-t', get('border', 'secondary'))}>
                    <button onClick={closeTaskModal} className={combine(getSecondaryButtonClass(), 'flex-1 px-6 py-3')}>Cancel</button>
                    <button onClick={editingTask ? handleUpdateTask : handleCreateTask} className={combine(getPrimaryButtonClass(), 'flex-1 px-6 py-3')}>{editingTask ? 'Update Task' : 'Create Task'}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && editingTask && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className={combine('rounded-3xl max-w-md w-full shadow-2xl border', get('bg', 'card'), get('border', 'primary'))}>
              <div className="p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                    <FaExclamationTriangle className="text-2xl text-red-600" />
                  </div>
                  <h2 className={combine('text-2xl font-bold mb-2', get('text', 'primary'))}>Delete Task</h2>
                  <p className={get('text', 'secondary')}>Are you sure you want to delete "{editingTask.title}"?</p>
                </div>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setShowDeleteModal(false)} className={getSecondaryButtonClass()}>Cancel</button>
                  <button onClick={handleDeleteTask} className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700">Delete Task</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className={combine('mt-8 border px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg', theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700')}>
            <div className="p-3 bg-red-100 rounded-xl"><FaExclamationTriangle className="text-2xl text-red-600" /></div>
            <div className="flex-1"><h4 className="font-bold">Error Loading Data</h4><p>{error}</p></div>
            <button onClick={loadTeacherData} className={combine('px-4 py-2 rounded-lg text-white', theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700')}>Retry</button>
          </div>
        )}
      </div>
    </div>
  );
}
