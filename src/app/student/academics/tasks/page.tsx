// app/student/academics/tasks/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FaTasks, 
  FaClock, 
  FaExclamationTriangle, 
  FaUserTie, 
  FaBook,
  FaCalendarAlt,
  FaFilter,
  FaSort,
  FaSearch,
  FaPlus,
  FaEye,
  FaFlag,
  FaHourglassHalf,
  FaFileAlt,
  FaBookReader,
  FaCalendarDay,
  FaCalendarWeek,
  FaCalendar,
  FaCalendarCheck,
  FaChevronLeft,
  FaChevronRight,
  FaList,
  FaThLarge
} from 'react-icons/fa';
import { toastError, toastSuccess } from '@/lib/toast';
import { studentApi } from '@/lib/api';

interface Task {
  id: number;
  title: string;
  task_type: 'reading' | 'writing' | 'assignment' | 'project' | 'revision' | 'other';
  estimated_time: number;
  teacher_note: string;
  priority: 'normal' | 'important' | 'urgent' | 'low' | 'medium';
  subject_name: string;
  academic_year: string;
  date?: string;
  teacher_name?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'overdue';
  created_at: string;
}

interface Subject {
  id: number;
  name: string;
  subject_code: string;
}

interface PriorityOption {
  value: string;
  label: string;
  color: string;
  icon: JSX.Element;
}

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

export default function TasksPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [calendarDates, setCalendarDates] = useState<string[]>([]);
  const [calendarMode, setCalendarMode] = useState(false);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>('');
  const lastDateFilterRef = useRef<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [subjectCarouselPage, setSubjectCarouselPage] = useState(0);
  const [subjectCardsPerPage, setSubjectCardsPerPage] = useState(6);
  const [isMobile, setIsMobile] = useState(false);
  const [taskSummary, setTaskSummary] = useState<{ total: number; subjects: Array<{ subject: string; count: number }> }>({
    total: 0,
    subjects: []
  });
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [availablePriorities, setAvailablePriorities] = useState<PriorityOption[]>([
    { value: 'all', label: 'All Priorities', color: 'gray', icon: <FaFilter className="text-gray-500" /> },
    { value: 'urgent', label: 'Urgent', color: 'red', icon: <FaExclamationTriangle className="text-red-500" /> },
    { value: 'important', label: 'Important', color: 'orange', icon: <FaFlag className="text-orange-500" /> },
    { value: 'normal', label: 'Normal', color: 'yellow', icon: <FaHourglassHalf className="text-yellow-500" /> },
    { value: 'medium', label: 'Medium', color: 'yellow', icon: <FaHourglassHalf className="text-yellow-500" /> },
    { value: 'low', label: 'Low', color: 'green', icon: <FaFlag className="text-green-500" /> },
  ]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>(''); // Now this will store the date string directly
  const [sortBy, setSortBy] = useState<string>('priority');

  const extractSubjects = (payload: any): Subject[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.subjects)) return payload.subjects;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
  };

  const fetchSubjects = async () => {
    try {
      const response = await studentApi.subjects.mySubjects();
      const data = response.data?.data || response.data;
      setSubjects(extractSubjects(data));
    } catch (error: any) {
      console.error('Error fetching subjects:', error);
      const message = error?.response?.data?.error || 'Failed to load subjects';
      toastError(message);
    }
  };

  const extractTaskList = (payload: any): Task[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.tasks)) return payload.tasks;
    return [];
  };

  const extractCalendarDates = (payload: any): string[] => {
    if (!payload || typeof payload !== 'object') return [];
    const dates: string[] = [];
    Object.values(payload).forEach((value: any) => {
      if (Array.isArray(value)) {
        value.forEach((dateStr) => {
          if (typeof dateStr === 'string') dates.push(dateStr);
        });
      }
    });
    return dates;
  };

  const fetchCalendarDates = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const response = await studentApi.tasks.viewAll();
      const responseData = response.data;
      const payload = responseData?.data ?? responseData ?? {};
      let calendarData: string[] = [];

      if (responseData?.view_mode === 'calendar_overview') {
        calendarData = extractCalendarDates(responseData.data);
      } else if (payload && !Array.isArray(payload)) {
        calendarData = extractCalendarDates(payload);
      }

      const uniqueDates = Array.from(new Set(calendarData));
      uniqueDates.sort((a, b) => a.localeCompare(b));
      setCalendarDates(uniqueDates);
      setCalendarMode(true);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      const message = error?.response?.data?.error || 'Failed to load tasks';
      setErrorMessage(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksForDate = async (date: string) => {
    if (!date) {
      setTasks([]);
      setFilteredTasks([]);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const response = await studentApi.tasks.viewAll({ date });
      const responseData = response.data;
      const payload = responseData?.data ?? responseData ?? {};
      let tasksData: Task[] = extractTaskList(payload);

      const taskMap = new Map<number, Task>();
      tasksData.forEach((task) => {
        if (task?.id && !taskMap.has(task.id)) {
          taskMap.set(task.id, task);
        }
      });
      tasksData = Array.from(taskMap.values());

      // Extract unique priorities from API response
      const uniquePriorities = [...new Set(tasksData.map((task: Task) => task.priority))];

      // Create priority options from API data
      const priorityOptionsFromApi: PriorityOption[] = [
        { value: 'all', label: 'All Priorities', color: 'gray', icon: <FaFilter className="text-gray-500" /> }
      ];

      uniquePriorities.forEach(priority => {
        const priorityStr = String(priority);
        let icon, color;

        switch (priorityStr) {
          case 'urgent':
            icon = <FaExclamationTriangle className="text-red-500" />;
            color = 'red';
            break;
          case 'important':
            icon = <FaFlag className="text-orange-500" />;
            color = 'orange';
            break;
          case 'normal':
            icon = <FaHourglassHalf className="text-yellow-500" />;
            color = 'yellow';
            break;
          case 'medium':
            icon = <FaHourglassHalf className="text-yellow-500" />;
            color = 'yellow';
            break;
          case 'low':
            icon = <FaFlag className="text-green-500" />;
            color = 'green';
            break;
          default:
            icon = <FaFlag className="text-gray-500" />;
            color = 'gray';
        }

        priorityOptionsFromApi.push({
          value: priorityStr,
          label: priorityStr.charAt(0).toUpperCase() + priorityStr.slice(1),
          color,
          icon
        });
      });

      setAvailablePriorities(priorityOptionsFromApi);

      // Add status based on task date
      const tasksWithStatus = tasksData.map((task: Task) => ({
        ...task,
        date: task.date || date,
        created_at: task.created_at || date,
        status: getTaskStatus({ ...task, date: task.date || date }),
        teacher_name: task.teacher_name || 'Subject Teacher'
      }));

      setTasks(tasksWithStatus);
      setFilteredTasks(tasksWithStatus);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      const message = error?.response?.data?.error || 'Failed to load tasks';
      setErrorMessage(message);
      toastError(message);
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskSummary = async (date?: string) => {
    try {
      const response = await studentApi.tasks.summary(date ? { date } : undefined);
      const data = response.data?.data || response.data;
      const total = typeof data?.total === 'number' ? data.total : 0;
      const subjects = Array.isArray(data?.subjects) ? data.subjects : [];
      setTaskSummary({ total, subjects });
    } catch (error: any) {
      console.error('Error fetching task summary:', error);
      setTaskSummary({ total: 0, subjects: [] });
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchCalendarDates();
  }, []);

  useEffect(() => {
    fetchTasksForDate(dateFilter);
    fetchTaskSummary(dateFilter);
  }, [dateFilter]);

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      setIsMobile(width < 640);
      if (width < 640) {
        setSubjectCardsPerPage(2);
      } else if (width < 1024) {
        setSubjectCardsPerPage(3);
      } else if (width < 1280) {
        setSubjectCardsPerPage(4);
      } else {
        setSubjectCardsPerPage(6);
      }
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  useEffect(() => {
    filterAndSortTasks();
  }, [searchTerm, sortBy, priorityFilter, subjectFilter, tasks]);

  const getTaskStatus = (task: Task): Task['status'] => {
    if (task.date) {
      const due = new Date(task.date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      
      if (due < today) return 'overdue';
      
      // Check if in progress (due within 2 days)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      if (due <= twoDaysFromNow) return 'in_progress';
    }
    return 'pending';
  };

  const filterAndSortTasks = () => {
    let filtered = [...tasks];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.teacher_note || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.subject_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(task => task.priority === priorityFilter);
    }

    // Apply subject filter
    if (subjectFilter !== 'all') {
      filtered = filtered.filter(task => task.subject_name === subjectFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { urgent: 0, important: 1, normal: 2, medium: 3, low: 4 };
          return (priorityOrder[a.priority] || 4) - (priorityOrder[b.priority] || 4);
        case 'due_date':
          if (!a.date) return 1;
          if (!b.date) return -1;
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'estimated_time':
          return a.estimated_time - b.estimated_time;
        case 'subject':
          return a.subject_name.localeCompare(b.subject_name);
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredTasks(filtered);
  };

  const getPriorityColor = (priority: string) => {
    const priorityOption = availablePriorities.find(p => p.value === priority);
    if (!priorityOption) return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    
    switch (priorityOption.color) {
      case 'red': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'orange': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'yellow': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'green': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    const priorityOption = availablePriorities.find(p => p.value === priority);
    return priorityOption?.icon || <FaFlag className="text-gray-500" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
  };

  const getDisplayStatus = (status?: Task['status']) => {
    if (!status) return 'pending';
    if (status === 'overdue') return 'pending';
    return status;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'reading': return <FaBookReader className="text-blue-500" />;
      case 'writing': return <FaFileAlt className="text-teal-500" />;
      case 'assignment': return <FaFileAlt className="text-purple-500" />;
      case 'project': return <FaTasks className="text-green-500" />;
      case 'revision': return <FaBook className="text-orange-500" />;
      default: return <FaTasks className="text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'reading': return 'Reading';
      case 'writing': return 'Writing';
      case 'assignment': return 'Assignment';
      case 'project': return 'Project';
      case 'revision': return 'Revision';
      default: return 'Other Task';
    }
  };

  const handleViewDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleRetry = async () => {
    await Promise.all([
      fetchCalendarDates(),
      fetchTasksForDate(dateFilter),
      fetchTaskSummary(dateFilter),
    ]);
  };

  const handleSetToday = () => {
    const today = new Date().toISOString().split('T')[0];
    setDateFilter(today);
  };

  const handleSetTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDateFilter(tomorrow.toISOString().split('T')[0]);
  };

  const handleClearDate = () => {
    setDateFilter('');
  };

  // Format today's date for the input
  const today = new Date().toISOString().split('T')[0];

  const normalizeCalendarDate = (dateStr: string) => {
    if (!dateStr) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const [dd, mm, yyyy] = dateStr.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
    const parsed = new Date(dateStr);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return '';
  };

  const buildCalendarMonths = (dates: string[]) => {
    const normalized = dates
      .map(normalizeCalendarDate)
      .filter(Boolean);

    const byMonth = new Map<string, Set<string>>();
    normalized.forEach((isoDate) => {
      const [year, month] = isoDate.split('-');
      const key = `${year}-${month}`;
      if (!byMonth.has(key)) byMonth.set(key, new Set());
      byMonth.get(key)!.add(isoDate);
    });

    const months = Array.from(byMonth.keys()).sort().map((key) => {
      const [yearStr, monthStr] = key.split('-');
      const year = Number(yearStr);
      const monthIndex = Number(monthStr) - 1;
      const firstDay = new Date(year, monthIndex, 1);
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const firstDayOffset = firstDay.getDay();
      const datesSet = byMonth.get(key)!;

      const dates = Array.from({ length: daysInMonth }, (_, idx) => {
        const dayNumber = idx + 1;
        const isoDate = `${yearStr}-${monthStr}-${String(dayNumber).padStart(2, '0')}`;
        const todayIso = new Date().toISOString().split('T')[0];
        return {
          dayNumber,
          isoDate,
          hasTask: datesSet.has(isoDate),
          isToday: isoDate === todayIso
        };
      });

      return {
        key,
        label: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        year: yearStr,
        month: monthStr,
        firstDayOffset,
        dates,
        taskDates: Array.from(datesSet).sort()
      };
    });

    return months;
  };

  const calendarMonths = buildCalendarMonths(calendarDates);
  const safeCalendarMonthIndex = Math.min(calendarMonthIndex, Math.max(calendarMonths.length - 1, 0));
  const activeCalendarMonth = calendarMonths[safeCalendarMonthIndex];
  const activeCalendarTaskDates = activeCalendarMonth?.taskDates || [];
  const activeTaskDate = selectedCalendarDate || dateFilter;

  useEffect(() => {
    if (!calendarMonths.length) return;
    const lastDateFilter = lastDateFilterRef.current;

    if (dateFilter && dateFilter !== lastDateFilter) {
      const key = dateFilter.slice(0, 7);
      const idx = calendarMonths.findIndex(month => month.key === key);
      if (idx >= 0) setCalendarMonthIndex(idx);
      setSelectedCalendarDate(dateFilter);
    } else if (!dateFilter && lastDateFilter) {
      const todayKey = new Date().toISOString().slice(0, 7);
      const todayIndex = calendarMonths.findIndex(month => month.key === todayKey);
      setCalendarMonthIndex(todayIndex >= 0 ? todayIndex : 0);
      setSelectedCalendarDate('');
    } else if (!dateFilter && !lastDateFilter && calendarMonthIndex === 0) {
      const todayKey = new Date().toISOString().slice(0, 7);
      const todayIndex = calendarMonths.findIndex(month => month.key === todayKey);
      setCalendarMonthIndex(todayIndex >= 0 ? todayIndex : 0);
    }

    lastDateFilterRef.current = dateFilter;
  }, [calendarMonths, dateFilter]);

  const carouselItems = useMemo(() => ([
    { type: 'total' as const, label: 'Total', count: taskSummary.total },
    ...taskSummary.subjects.map(item => ({
      type: 'subject' as const,
      label: item.subject,
      count: item.count
    }))
  ]), [taskSummary]);

  const totalSubjectPages = Math.max(1, Math.ceil(carouselItems.length / subjectCardsPerPage));
  const safeSubjectPage = Math.min(subjectCarouselPage, totalSubjectPages - 1);
  const visibleCarouselItems = carouselItems.slice(
    safeSubjectPage * subjectCardsPerPage,
    safeSubjectPage * subjectCardsPerPage + subjectCardsPerPage
  );
  const carouselFillCount = Math.max(0, subjectCardsPerPage - visibleCarouselItems.length);

  useEffect(() => {
    if (subjectCarouselPage > totalSubjectPages - 1) {
      setSubjectCarouselPage(0);
    }
  }, [subjectCarouselPage, totalSubjectPages]);
  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / 10));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * 10;
  const paginatedTasks = filteredTasks.slice(startIndex, startIndex + 10);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, priorityFilter, subjectFilter, dateFilter, tasks]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800">
              <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                    <FaTasks className="text-2xl sm:text-3xl" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Tasks</h1>
                    <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                      View and manage your academic tasks
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                    <div className="text-[11px] sm:text-xs text-blue-100">Today Tasks</div>
                    <div className="text-sm sm:text-base font-bold">
                      {filteredTasks.filter(task => (task.date || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading tasks...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Subject-wise Tasks Carousel */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="p-2 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30">
                      <FaTasks className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        Subject-wise Tasks
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Total and subject distribution of tasks
                      </p>
                    </div>
                  </div>
                  {carouselItems.length > subjectCardsPerPage && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSubjectCarouselPage(prev => Math.max(prev - 1, 0))}
                        disabled={safeSubjectPage === 0}
                        className={`p-2 rounded-lg border transition-all ${
                          safeSubjectPage === 0
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-105'
                        } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                        aria-label="Previous subject cards"
                      >
                        <FaChevronLeft className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                      </button>
                      <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
                        {safeSubjectPage + 1}/{totalSubjectPages}
                      </span>
                      <button
                        onClick={() => setSubjectCarouselPage(prev => Math.min(prev + 1, totalSubjectPages - 1))}
                        disabled={safeSubjectPage === totalSubjectPages - 1}
                        className={`p-2 rounded-lg border transition-all ${
                          safeSubjectPage === totalSubjectPages - 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:scale-105'
                        } bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700`}
                        aria-label="Next subject cards"
                      >
                        <FaChevronRight className="text-xs sm:text-sm text-gray-700 dark:text-gray-300" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden">
                  <div className="flex flex-nowrap gap-2 sm:gap-3 w-full">
                    {carouselItems.length > 0 ? visibleCarouselItems.map((item) => {
                      const subjectColor = item.type === 'subject' ? getSubjectColor(item.label) : null;
                      const badgeClass = 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';

                      return (
                        <div
                          key={`${item.type}-${item.label}`}
                          className={`flex-1 min-w-0 rounded-lg sm:rounded-xl p-2 sm:p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02] ${
                            subjectColor ? '' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}
                          style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                        >
                          <div className="flex items-center justify-between mb-1 sm:mb-2">
                            <span className={`font-bold text-xs sm:text-sm truncate ${subjectColor ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                              {item.label}
                            </span>
                            {subjectColor && item.type === 'subject' ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border border-white/40 bg-white/20 text-white"
                              >
                                {item.count}
                              </span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${badgeClass}`}>
                                {item.count}
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${subjectColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {item.type === 'total'
                              ? 'all tasks'
                              : `task${item.count !== 1 ? 's' : ''}`}
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center py-4 sm:py-6 md:py-8 text-gray-600 dark:text-gray-400 w-full">
                        <p className="text-xs sm:text-sm font-medium">No tasks available</p>
                        <p className="text-xs mt-1">Subject distribution will appear once tasks are available.</p>
                      </div>
                    )}
                    {carouselItems.length > 0 && carouselFillCount > 0 && (
                      Array.from({ length: carouselFillCount }).map((_, idx) => (
                        <div
                          key={`carousel-fill-${idx}`}
                          className="flex-1 min-w-0 rounded-lg sm:rounded-xl p-2 sm:p-3 border border-transparent opacity-0 pointer-events-none"
                          aria-hidden="true"
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Search */}
                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Search Tasks
                    </label>
                    <div className="relative">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by title, subject, or notes"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  {/* Date Filter - Single Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filter by Date
                    </label>
                    <div className="relative">
                      <FaCalendarAlt className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="Select date or leave empty for all"
                      />
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {availablePriorities.map(priority => (
                        <option key={priority.value} value={priority.value}>
                          <span className="flex items-center gap-2">
                            {priority.label}
                          </span>
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subject Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Subject
                    </label>
                    <select
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="all">All Subjects</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.name}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                </div>
              </div>

              {calendarMode && (
                <div className="mb-6 rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
                  <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                          Academic Calendar
                        </h3>
                        <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                          Dates with tasks are highlighted. Select a date to view tasks.
                        </p>
                      </div>
                      {selectedCalendarDate && (
                        <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                          Selected: {new Date(selectedCalendarDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 sm:p-5">
                    {calendarMonths.length > 0 && activeCalendarMonth ? (
                      <div className="mx-auto grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-5 items-start">
                        <div className="rounded-xl sm:rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm overflow-hidden bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-gray-900/60 xl:h-[420px] flex flex-col">
                          <div className="px-4 sm:px-5 py-4 border-b border-blue-100 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/25 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setCalendarMonthIndex((prev) => Math.max(prev - 1, 0))}
                                disabled={safeCalendarMonthIndex === 0}
                                className="h-10 w-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                              >
                                <FaChevronLeft className="text-gray-600 dark:text-gray-300" />
                              </button>
                              <div>
                                <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                                  {activeCalendarMonth.label}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">
                                  {activeCalendarTaskDates.length} task date{activeCalendarTaskDates.length === 1 ? '' : 's'}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setCalendarMonthIndex((prev) => Math.min(prev + 1, calendarMonths.length - 1))}
                              disabled={safeCalendarMonthIndex === calendarMonths.length - 1}
                              className="h-10 w-10 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                            >
                              <FaChevronRight className="text-gray-600 dark:text-gray-300" />
                            </button>
                          </div>

                          <div className="p-3 overflow-auto flex-1">
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <div key={day} className="text-center text-[10px] sm:text-[11px] font-semibold py-1 rounded-lg text-gray-500 dark:text-gray-400">
                                  {day}
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-7 gap-0.5 sm:gap-1 place-items-center">
                              {Array.from({ length: activeCalendarMonth.firstDayOffset }).map((_, idx) => (
                                <div key={`blank-${idx}`} className="h-9 w-9 sm:h-11 sm:w-11" />
                              ))}
                              {activeCalendarMonth.dates.map(date => {
                                const isSelected = selectedCalendarDate === date.isoDate;
                                const buttonClass = date.hasTask
                                  ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/35 dark:text-blue-100 dark:border-blue-700 dark:hover:bg-blue-900/50'
                                  : 'bg-white text-gray-500 border-gray-200 dark:bg-gray-900/70 dark:text-gray-400 dark:border-gray-800';

                                return (
                                  <button
                                    key={date.isoDate}
                                    type="button"
                                    disabled={!date.hasTask}
                                    onClick={() => {
                                      if (!date.hasTask) return;
                                      setSelectedCalendarDate(date.isoDate);
                                      setDateFilter(date.isoDate);
                                    }}
                                    className={`h-9 w-9 sm:h-11 sm:w-11 rounded-lg border text-[11px] sm:text-xs font-medium transition-all duration-200 flex items-center justify-center relative ${
                                      date.hasTask ? 'cursor-pointer shadow-sm' : 'cursor-default'
                                    } ${buttonClass} ${date.isToday ? 'ring-2 ring-amber-400 ring-offset-1' : ''} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 scale-[1.03]' : ''}`}
                                  >
                                    <span>{date.dayNumber}</span>
                                    {date.hasTask && (
                                      <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-blue-500 dark:bg-blue-300" />
                                    )}
                                    {date.isToday && <span className="absolute top-0.5 right-0.5 h-1 w-1 rounded-full bg-amber-400" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4 xl:h-[420px] xl:overflow-auto pr-1">
                          <div className="rounded-xl sm:rounded-2xl border border-blue-100 dark:border-gray-700 p-3.5 sm:p-4 bg-white dark:bg-gray-900/70">
                            <div className="flex items-center gap-2 mb-3">
                              <FaCalendarCheck className="text-blue-600 dark:text-blue-400" />
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Month Summary</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="rounded-xl p-2.5 bg-gray-100 dark:bg-gray-800">
                                <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Selected Month</div>
                                <div className="mt-1 font-semibold text-sm text-gray-900 dark:text-white">{activeCalendarMonth.label}</div>
                              </div>
                              <div className="rounded-xl p-2.5 bg-gray-100 dark:bg-gray-800">
                                <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Task Dates</div>
                                <div className="mt-1 font-semibold text-sm text-gray-900 dark:text-white">{activeCalendarTaskDates.length}</div>
                              </div>
                            </div>
                            <div className="mt-3 rounded-xl p-2.5 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                              <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Focused Date</div>
                              <div className="mt-1 font-semibold text-sm text-gray-900 dark:text-white">
                                {activeTaskDate
                                  ? new Date(activeTaskDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                  : activeCalendarTaskDates[0]
                                    ? new Date(activeCalendarTaskDates[0]).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                                    : 'No dates in this month'}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-xl sm:rounded-2xl border border-blue-100 dark:border-gray-700 p-3.5 sm:p-4 bg-white dark:bg-gray-900/70">
                            <div className="flex items-center gap-2 mb-3">
                              <FaCalendarDay className="text-blue-600 dark:text-blue-400" />
                              <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Monthly Task Dates</h4>
                            </div>
                            <div className="space-y-2">
                              {activeCalendarTaskDates.length > 0 ? activeCalendarTaskDates.slice(0, 8).map((date) => (
                                <button
                                  key={date}
                                  type="button"
                                  onClick={() => {
                                    setSelectedCalendarDate(date);
                                    setDateFilter(date);
                                  }}
                                  className={`w-full rounded-xl border px-2.5 py-2 text-left transition-all flex items-center justify-between ${
                                    selectedCalendarDate === date
                                      ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700'
                                      : 'bg-gray-100 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                                  }`}
                                >
                                  <div>
                                    <div className="font-medium text-sm text-gray-900 dark:text-white">
                                      {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400">Tap to open that day&apos;s tasks</div>
                                  </div>
                                  <FaChevronRight className="text-xs text-gray-400 dark:text-gray-500" />
                                </button>
                              )) : (
                                <div className="rounded-xl p-3 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
                                  No task dates available for this month.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        No available dates returned for your subjects.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Tasks Table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FaList className="text-blue-500" /> Tasks
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Showing {paginatedTasks.length} of {filteredTasks.length} tasks
                        {dateFilter && ` • Date: ${dateFilter}`}
                        {subjectFilter !== 'all' && ` • Subject: ${subjectFilter}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1 w-fit">
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === 'list'
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <FaList className="inline mr-2" /> List
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                      >
                        <FaThLarge className="inline mr-2" /> Grid
                      </button>
                    </div>
                  </div>
                </div>

                {viewMode === 'list' ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Task
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Priority
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Due
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {paginatedTasks.map(task => {
                          const subjectColor = getSubjectColor(task.subject_name);
                          return (
                            <tr key={task.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-white dark:bg-gray-800 rounded-md shadow border border-gray-200 dark:border-gray-700">
                                    {getTypeIcon(task.task_type)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
                                      {task.title}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                      {task.teacher_note || 'No notes provided.'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                {subjectColor ? (
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border"
                                    style={getSubjectGradientStyle(subjectColor)}
                                  >
                                    {task.subject_name}
                                  </span>
                                ) : (
                                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    {task.subject_name}
                                  </span>
                                )}
                              </td>
                              <td className="py-4 px-6">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                  {getPriorityIcon(task.priority)}
                                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  {task.date ? new Date(task.date).toLocaleDateString() : 'No due date'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">
                                  {task.teacher_name}
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => handleViewDetails(task)}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 transition-all duration-200 text-xs"
                                >
                                  <FaEye size={12} /> View Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                      {paginatedTasks.map(task => {
                        const subjectColor = getSubjectColor(task.subject_name);
                        const cardStyle = subjectColor ? getSubjectGradientStyle(subjectColor) : undefined;
                        const hasSubjectColor = Boolean(subjectColor);

                        return (
                          <div
                            key={task.id}
                            className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
                              hasSubjectColor ? 'text-white border-white/30' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                            }`}
                            style={cardStyle}
                          >
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h4 className={`font-semibold truncate ${hasSubjectColor ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                                  {task.title}
                                </h4>
                                <div className={`text-xs mt-1 ${hasSubjectColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                  {task.teacher_name}
                                </div>
                              </div>
                              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityIcon(task.priority)}
                                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                              </span>
                            </div>

                            <p className={`${hasSubjectColor ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'} text-xs mb-3 line-clamp-2`}>
                              {task.teacher_note || 'No notes provided.'}
                            </p>

                            <div className="flex items-center justify-between mb-3 text-xs">
                              <div className="flex items-center gap-2">
                                <FaBook className={hasSubjectColor ? 'text-white' : 'text-blue-500'} />
                                {subjectColor ? (
                                  <span
                                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-semibold border"
                                    style={getSubjectGradientStyle(subjectColor)}
                                  >
                                    {task.subject_name}
                                  </span>
                                ) : (
                                  <span className="font-medium">{task.subject_name}</span>
                                )}
                              </div>
                              <span className={`${hasSubjectColor ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                {task.date ? new Date(task.date).toLocaleDateString() : 'No due date'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewDetails(task)}
                                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs transition-colors ${
                                  hasSubjectColor ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                              >
                                <FaEye size={12} /> View Details
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredTasks.length > 0 && totalPages > 1 && (
                  <div className="px-3 sm:px-4 py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Page {safePage} of {totalPages}
                      </p>
                      <div className="flex items-center space-x-1 sm:space-x-1.5">
                        <button
                          onClick={() => handlePageChange(safePage - 1)}
                          disabled={safePage === 1}
                          className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                          aria-label="Previous page"
                        >
                          <FaChevronLeft className="text-xs" />
                        </button>

                        <div className="flex space-x-0.5 sm:space-x-1">
                          {Array.from({ length: Math.min(isMobile ? 3 : 5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= (isMobile ? 3 : 5)) {
                              pageNum = i + 1;
                            } else if (safePage <= (isMobile ? 2 : 3)) {
                              pageNum = i + 1;
                            } else if (safePage >= totalPages - (isMobile ? 1 : 2)) {
                              pageNum = totalPages - (isMobile ? 2 : 4) + i;
                            } else {
                              pageNum = safePage - (isMobile ? 1 : 2) + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs ${
                                  safePage === pageNum
                                    ? 'bg-blue-600 text-white border border-blue-600'
                                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                                }`}
                                aria-label={`Go to page ${pageNum}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(safePage + 1)}
                          disabled={safePage === totalPages}
                          className="p-1 sm:p-1.5 rounded-lg sm:rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-xs sm:text-sm bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                          aria-label="Next page"
                        >
                          <FaChevronRight className="text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {filteredTasks.length === 0 && !calendarMode && (
                <div className="text-center py-12">
                  <FaTasks className="text-4xl text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {tasks.length === 0 ? 'No tasks found' : 'No tasks match your filters'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {searchTerm || priorityFilter !== 'all' || subjectFilter !== 'all' || dateFilter
                      ? 'Try changing your filters or search terms'
                      : 'No tasks available at the moment.'}
                  </p>
                  {tasks.length === 0 && (
                    <button
                      onClick={handleRetry}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Retry Loading Tasks
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {showTaskModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-2xl border border-white/20 bg-white dark:bg-gray-900">
            <div
              className="px-6 py-4"
              style={
                getSubjectColor(selectedTask.subject_name)
                  ? getSubjectGradientStyle(getSubjectColor(selectedTask.subject_name)!)
                  : undefined
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wide text-white/80">Task Details</div>
                  <h3 className="text-xl font-semibold text-white">
                    {selectedTask.title}
                  </h3>
                  <div className="mt-2 text-sm text-white/80">
                    {selectedTask.subject_name} · {selectedTask.teacher_name}
                  </div>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/30"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Type</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{getTypeLabel(selectedTask.task_type)}</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Priority</div>
                  <div className={`inline-flex items-center gap-2 mt-1 px-2 py-1 rounded ${getPriorityColor(selectedTask.priority)}`}>
                    {getPriorityIcon(selectedTask.priority)}
                    <span className="text-xs font-semibold">
                      {selectedTask.priority.charAt(0).toUpperCase() + selectedTask.priority.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Estimated Time</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{selectedTask.estimated_time} minutes</div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Date</div>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {selectedTask.date ? new Date(selectedTask.date).toLocaleDateString() : 'Not set'}
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Academic Year</div>
                  <div className="font-semibold text-gray-900 dark:text-white">{selectedTask.academic_year}</div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400">Teacher Note</div>
                <div className="mt-1 text-sm text-gray-900 dark:text-white">
                  {selectedTask.teacher_note || 'No notes provided.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
