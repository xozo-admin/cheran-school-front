// src/app/admin/teachers/allocations/page.tsx

'use client';

import { adminApi } from '@/lib/api';

import { useEffect, useState, useCallback } from 'react';
import {
  FaUserTie,
  FaBook,
  FaSchool,
  FaUsers,
  FaSearch,
  FaDownload,
  FaSync,
  FaPlus,
  FaChalkboardTeacher,
  FaClipboardList,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaTimes,
  FaCalendarAlt,
  FaCheckCircle,
  FaUserCheck,
  FaUserTimes,
  FaBookOpen,
  FaUserGraduate,
  FaBuilding,
  FaInfoCircle,
  FaExclamationCircle,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface TeacherAllocation {
  teacher: number;
  teacher_id: string;
  teacher_name: string;
  subject: string;
  subject_code?: string;
  class: string;
  sections: string[];
  class_level?: string;
  academic_year?: string;
}

interface ClassTeacherAllocation {
  id: number;
  teacher_id: string;
  teacher_name: string;
  class_name: string;
  section_name: string;
  section_id?: number;
  class_standard?: string;
  academic_year?: string;
  is_active?: boolean;
}

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  assigned_class?: string | null;
  section_name?: string | null;
  class_name?: string | null;
  date_of_birth?: string;
  qualification?: string;
  address?: string;
  user?: number;
}

interface ClassSection {
  id: number;
  name: string;
  standard: {
    id: number;
    name: string;
  };
  class_teacher?: string;
}

interface SubjectOption {
  id: number;
  name: string;
  subject_code: string;
  standard_name: string;
  standard_id?: number;
}

interface ClassSubjectGroup {
  class: string;
  subject_count: number;
  subjects: SubjectOption[];
}

type ViewMode = 'subject-allocations' | 'class-teacher-allocation';
type SortFieldAllocations = 'teacher_name' | 'subject' | 'class' | 'sections';
type SortFieldClassTeachers = 'teacher_name' | 'class_name' | 'section_name' | 'academic_year';
type SortDirection = 'asc' | 'desc';

export default function TeacherAllocationsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'teacher_allocations_school_scope' });

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('subject-allocations');
  
  // State for subject allocations
  const [allocations, setAllocations] = useState<TeacherAllocation[]>([]);
  const [classTeacherAllocations, setClassTeacherAllocations] = useState<ClassTeacherAllocation[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSections, setClassSections] = useState<ClassSection[]>([]);
  const [classSubjectGroups, setClassSubjectGroups] = useState<ClassSubjectGroup[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [loadingSubjectAllocations, setLoadingSubjectAllocations] = useState(false);
  const [loadingClassTeachers, setLoadingClassTeachers] = useState(false);
  
  // State for filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterTeacher, setFilterTeacher] = useState('all');
  const [filterClassTeacherClass, setFilterClassTeacherClass] = useState('all');
  const [filterClassTeacherTeacher, setFilterClassTeacherTeacher] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  
  // State for sorting
  const [sortField, setSortField] = useState<SortFieldAllocations>('teacher_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [sortFieldClassTeachers, setSortFieldClassTeachers] = useState<SortFieldClassTeachers>('teacher_name');
  const [sortDirectionClassTeachers, setSortDirectionClassTeachers] = useState<SortDirection>('asc');
  
  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageClassTeachers, setCurrentPageClassTeachers] = useState(1);
  const itemsPerPage = 10;
  
  // State for modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showClassTeacherModal, setShowClassTeacherModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    teacher_id: '',
    subject_name: '',
    class_name: '',
    sections: '' as string | string[],
  });
  
  const [classTeacherForm, setClassTeacherForm] = useState({
    teacher_id: '',
    class_name: '',
    section_name: '',
    academic_year: new Date().getFullYear().toString(),
  });
  
  const [saving, setSaving] = useState(false);
  const [showRedirectBackButton, setShowRedirectBackButton] = useState(false);


  /* ================= READ URL PARAMETERS ================= */
useEffect(() => {
  if (typeof window === 'undefined') return;
  // Get URL parameters
  const params = new URLSearchParams(window.location.search);
  const teacherName = params.get('teacherName');
  const teacherId = params.get('teacherId');
  const tab = params.get('tab');
  const redirectedFrom = params.get('redirectedFrom');
  const openAssignClassModal = params.get('openAssignClassModal') === '1';
  if (redirectedFrom) {
    setShowRedirectBackButton(redirectedFrom === 'allteachers');
  }
  
  // Set the view mode based on tab parameter
  if (tab === 'subject-allocations') {
    setViewMode('subject-allocations');
  } else if (tab === 'class-teacher-allocation') {
    setViewMode('class-teacher-allocation');
  }

  // Set search term and teacher filter if teacher is provided
  if (teacherName) {
    setSearchTerm(teacherName);
  }

  if (tab === 'class-teacher-allocation') {
    const resolvedTeacherId =
      teacherId ||
      teachers.find(t => teacherName && t.name.toLowerCase() === teacherName.toLowerCase())?.teacher_id ||
      '';

    if (resolvedTeacherId) {
      setFilterClassTeacherTeacher(resolvedTeacherId);
    }

    if (openAssignClassModal) {
      setClassTeacherForm((prev) => ({
        ...prev,
        teacher_id: resolvedTeacherId || prev.teacher_id,
        class_name: '',
        section_name: '',
      }));
      setShowClassTeacherModal(true);
    }
  }

  // Clean URL params after consuming redirect context so this won't re-trigger on later state refreshes
  if (teacherName || teacherId || tab || redirectedFrom || openAssignClassModal) {
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [teachers]); // Add teachers to dependency array since we need it for finding teacher ID

  const handleRedirectBack = () => {
    if (typeof window === 'undefined') return;
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    window.location.href = '/admin/teachers/allteachers';
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (!value.trim()) {
      setFilterTeacher('all');
      setFilterClassTeacherTeacher('all');
    }
  };

  // Theme-aware CSS classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardClass = (color: string = 'default') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' 
        ? 'from-gray-800 to-purple-900/10' 
        : 'from-white to-purple-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-purple-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-purple-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-purple-500',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'disabled:opacity-50 disabled:cursor-not-allowed'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800'
      : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700'
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

  const getCardGradientClass = (color: string = 'purple') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' 
        ? 'from-gray-800 to-purple-900/10' 
        : 'from-white to-purple-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-amber-900/10'
        : 'from-white to-amber-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-indigo-900/10'
        : 'from-white to-indigo-50');
    }
    if (color === 'green') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-green-900/10'
        : 'from-white to-green-50');
    }
    if (color === 'red') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-red-900/10'
        : 'from-white to-red-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getStatusBadgeClass = (type: string) => {
    const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
      purple: {
        bg: theme === 'dark' ? 'from-purple-900/30 to-purple-800/30' : 'from-purple-100 to-purple-200',
        text: theme === 'dark' ? 'text-purple-300' : 'text-purple-700',
        border: theme === 'dark' ? 'border-purple-800' : 'border-purple-200'
      },
      emerald: {
        bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
        text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
        border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
      },
      blue: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
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
      green: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
      red: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
      success: {
        bg: theme === 'dark' ? 'from-green-900/30 to-green-800/30' : 'from-green-100 to-green-200',
        text: theme === 'dark' ? 'text-green-300' : 'text-green-700',
        border: theme === 'dark' ? 'border-green-800' : 'border-green-200'
      },
      warning: {
        bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
        text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
        border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
      },
      info: {
        bg: theme === 'dark' ? 'from-blue-900/30 to-blue-800/30' : 'from-blue-100 to-blue-200',
        text: theme === 'dark' ? 'text-blue-300' : 'text-blue-700',
        border: theme === 'dark' ? 'border-blue-800' : 'border-blue-200'
      },
      error: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
      },
      gray: {
        bg: theme === 'dark' ? 'from-gray-800/30 to-gray-700/30' : 'from-gray-100 to-gray-200',
        text: theme === 'dark' ? 'text-gray-300' : 'text-gray-700',
        border: theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
      },
    };

    const colors = colorMap[type] || colorMap.purple;
    return combine(
      'px-3 py-1.5 text-sm font-medium rounded-full bg-gradient-to-r',
      colors.bg,
      colors.text,
      'border',
      colors.border
    );
  };

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary'),
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

  /* ================= FETCH ALL DATA ================= */
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSubjectAllocations(),
        fetchClassTeacherAllocations(),
        fetchTeachers(),
        fetchClassSections(),
        fetchClassSubjects()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toastError('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [schoolScope.selectedSchoolId]);

  /* ================= FETCH SUBJECT ALLOCATIONS ================= */
  const fetchSubjectAllocations = async () => {
    setLoadingSubjectAllocations(true);
    try {
      const response = await adminApi.teachers.allocationsByClass(schoolScope.scopeParams);
      const data = response.data;
      console.log('Subject Allocations API Response:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        // Transform API data to match our interface
        const transformedAllocations: TeacherAllocation[] = data.map((item: any) => ({
          teacher: item.teacher,
          teacher_id: item.teacher_id,
          teacher_name: item.teacher_name,
          subject: item.subject,
          subject_code: item.subject_code,
          class: item.class,
          sections: Array.isArray(item.sections) ? item.sections : [item.sections].filter(Boolean),
          class_level: item.class_level,
          academic_year: item.academic_year
        }));
        
        setAllocations(transformedAllocations);
      } else {
        setAllocations([]);
        // toastInfo('No subject allocations found. Add allocations to get started.');
      }
    } catch (error) {
      console.error('Error fetching subject allocations:', error);
      toastError('Failed to fetch subject allocations.');
    } finally {
      setLoadingSubjectAllocations(false);
    }
  };

  /* ================= FETCH CLASS TEACHER ALLOCATIONS ================= */
  const fetchClassTeacherAllocations = async () => {
    setLoadingClassTeachers(true);
    try {
      const response = await adminApi.teachers.list(schoolScope.scopeParams);
      if (response.status >= 200 && response.status < 300) {
        const teachersData = response.data;
        console.log('Teachers API Response for Class Teachers:', teachersData);
        
        // Transform teachers data to class teacher allocations
        // Use assigned_class field to identify class teachers
        const classTeacherAllocationsData: ClassTeacherAllocation[] = [];
        
        teachersData.forEach((teacher: Teacher) => {
          if (teacher.assigned_class && teacher.assigned_class !== 'Not Assigned') {
            // Parse assigned_class format like "9 - A"
            const parts = teacher.assigned_class.split(' - ');
            if (parts.length === 2) {
              classTeacherAllocationsData.push({
                id: teacher.id,
                teacher_id: teacher.teacher_id,
                teacher_name: teacher.name,
                class_name: parts[0].trim(),
                section_name: parts[1].trim(),
                academic_year: new Date().getFullYear().toString(),
                is_active: true
              });
            }
          }
        });
        
        console.log('Class Teacher Allocations:', classTeacherAllocationsData);
        setClassTeacherAllocations(classTeacherAllocationsData);
        
        if (classTeacherAllocationsData.length === 0) {
          // toastInfo('No class teachers assigned yet. Assign class teachers to get started.');
        }
      }
    } catch (error) {
      console.error('Error fetching class teacher allocations:', error);
      toastError('Failed to fetch class teacher allocations.');
    } finally {
      setLoadingClassTeachers(false);
    }
  };

  /* ================= FETCH TEACHERS ================= */
  const fetchTeachers = async () => {
    try {
      const response = await adminApi.teachers.list(schoolScope.scopeParams);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        const teachersList = Array.isArray(data) ? data : [];
        setTeachers(teachersList);
        
        if (teachersList.length === 0) {
          toastWarning('No teachers found in the system.');
        }
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toastError('Failed to fetch teachers list.');
    }
  };

  /* ================= FETCH CLASS SECTIONS ================= */
  const fetchClassSections = async () => {
    try {
      const response = await adminApi.academics.standards(schoolScope.scopeParams);
      if (response.status >= 200 && response.status < 300) {
        const data = response.data;
        console.log('Class Sections API Response:', data);
        
        // Transform API data to ClassSection interface
        const classSectionsData: ClassSection[] = [];
        
        if (Array.isArray(data)) {
          data.forEach((standard: any) => {
            if (standard.sections && Array.isArray(standard.sections)) {
              standard.sections.forEach((section: any) => {
                classSectionsData.push({
                  id: section.id,
                  name: section.name,
                  standard: {
                    id: standard.id,
                    name: standard.name
                  },
                  class_teacher: section.class_teacher || undefined
                });
              });
            }
          });
        }
        
        setClassSections(classSectionsData);
        
        if (classSectionsData.length === 0) {
          toastInfo('No class sections found in the system.');
        }
      }
    } catch (error) {
      console.error('Error fetching class sections:', error);
      toastError('Failed to fetch class sections.');
    }
  };

  /* ================= FETCH CLASS SUBJECTS ================= */
  const fetchClassSubjects = async () => {
    try {
      const response = await adminApi.subjects.viewAll(schoolScope.scopeParams);
      const classes = response.data?.classes;
      setClassSubjectGroups(Array.isArray(classes) ? classes : []);
    } catch (error) {
      console.error('Error fetching class subjects:', error);
      toastError('Failed to fetch class subjects.');
    }
  };

  /* ================= INITIAL DATA LOAD ================= */
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  /* ================= ADD SUBJECT ALLOCATION ================= */
  const addAllocation = async () => {
    if (!formData.teacher_id || !formData.subject_name || !formData.class_name) {
      toastInfo('Teacher, Class, and Subject are required.');
      return;
    }

    if (!getSubjectsForClass(formData.class_name).some(subject => subject.name === formData.subject_name)) {
      toastWarning('Please select a valid subject for the selected class.');
      return;
    }

    setSaving(true);

    const payload = {
      teacher_id: formData.teacher_id,
      subject_name: formData.subject_name,
      classes: [formData.class_name],
      sections: typeof formData.sections === 'string' 
        ? formData.sections.split(',').map(s => s.trim()).filter(Boolean)
        : formData.sections,
      ...schoolScope.scopeParams,
    };

    try {
      const response = await adminApi.teachers.assignSubject(payload);

      toastSuccess('Subject allocated successfully!');
      setShowAddModal(false);
      setFormData({
        teacher_id: '',
        subject_name: '',
        class_name: '',
        sections: '',
      });
      fetchSubjectAllocations();
    } catch (error: any) {
      console.error('Error adding allocation:', error);
      toastError(error.message || 'Failed to add allocation.');
    } finally {
      setSaving(false);
    }
  };

  /* ================= ASSIGN CLASS TEACHER ================= */
  const assignClassTeacher = async () => {
    if (!classTeacherForm.teacher_id || !classTeacherForm.class_name || !classTeacherForm.section_name) {
      toastInfo('Teacher, Class, and Section are required.');
      return;
    }

    const teacherAssignment = getTeacherClassAssignment(classTeacherForm.teacher_id);
    if (teacherAssignment) {
      toastWarning(`${teacherAssignment.teacher_name} is already assigned to Class ${teacherAssignment.class_name}-${teacherAssignment.section_name}.`);
      return;
    }

    const sectionAssignment = getSectionClassAssignment(classTeacherForm.class_name, classTeacherForm.section_name);
    if (sectionAssignment) {
      toastWarning(`Class ${sectionAssignment.class_name}-${sectionAssignment.section_name} already has ${sectionAssignment.teacher_name} assigned.`);
      return;
    }

    setSaving(true);

    const payload = {
      teacher_id: classTeacherForm.teacher_id,
      class_name: classTeacherForm.class_name,
      section: classTeacherForm.section_name,
      academic_year: classTeacherForm.academic_year,
      ...schoolScope.scopeParams,
    };

    try {
      const response = await adminApi.teachers.assignClassTeacher(payload);

      toastSuccess('Class teacher assigned successfully!');
      setShowClassTeacherModal(false);
      setClassTeacherForm({
        teacher_id: '',
        class_name: '',
        section_name: '',
        academic_year: new Date().getFullYear().toString(),
      });
      fetchClassTeacherAllocations();
      fetchTeachers();
    } catch (error: any) {
      console.error('Error assigning class teacher:', error);
      toastError(error.message || 'Failed to assign class teacher.');
    } finally {
      setSaving(false);
    }
  };

  /* ================= FILTER AND SORT ================= */
  // Subject Allocations Filtering
  const filteredAllocations = allocations.filter(allocation => {
    const matchesSearch = 
      allocation.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.teacher_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClass === 'all' || allocation.class === filterClass;
    const matchesSubject = filterSubject === 'all' || allocation.subject === filterSubject;
    const matchesTeacher = filterTeacher === 'all' || allocation.teacher_id === filterTeacher;
    
    return matchesSearch && matchesClass && matchesSubject && matchesTeacher;
  });

  const sortedAllocations = [...filteredAllocations].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'sections') {
      aValue = a.sections.join(', ');
      bValue = b.sections.join(', ');
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Class Teacher Allocations Filtering
  const filteredClassTeachers = classTeacherAllocations.filter(allocation => {
    const matchesSearch = 
      allocation.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.section_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      allocation.teacher_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClass = filterClassTeacherClass === 'all' || allocation.class_name === filterClassTeacherClass;
    const matchesTeacher = filterClassTeacherTeacher === 'all' || allocation.teacher_id === filterClassTeacherTeacher;
    const matchesStatus = filterStatus === 'all' ||
      (filterStatus === 'assigned' && allocation.is_active !== false) ||
      (filterStatus === 'unassigned' && allocation.is_active === false);
    
    return matchesSearch && matchesClass && matchesTeacher && matchesStatus;
  });

  const sortedClassTeachers = [...filteredClassTeachers].sort((a, b) => {
    let aValue: any = a[sortFieldClassTeachers];
    let bValue: any = b[sortFieldClassTeachers];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }
    
    if (aValue < bValue) return sortDirectionClassTeachers === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirectionClassTeachers === 'asc' ? 1 : -1;
    return 0;
  });

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(sortedAllocations.length / itemsPerPage);
  const totalPagesClassTeachers = Math.ceil(sortedClassTeachers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const indexOfLastItemClassTeachers = currentPageClassTeachers * itemsPerPage;
  const indexOfFirstItemClassTeachers = indexOfLastItemClassTeachers - itemsPerPage;
  
  const currentAllocations = sortedAllocations.slice(indexOfFirstItem, indexOfLastItem);
  const currentClassTeachers = sortedClassTeachers.slice(indexOfFirstItemClassTeachers, indexOfLastItemClassTeachers);

  /* ================= GET UNIQUE VALUES FOR FILTERS ================= */
  const getClassSortValue = (className: string) => {
    const numeric = Number(className);
    return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
  };

  const sortClassNames = (classes: string[]) => (
    [...classes].sort((a, b) => getClassSortValue(a) - getClassSortValue(b) || a.localeCompare(b))
  );

  const allClassOptions = sortClassNames(Array.from(new Set([
    ...classSections.map(section => section.standard.name),
    ...classSubjectGroups.map(group => group.class),
  ].filter(Boolean))));

  const getSubjectsForClass = (className: string) => (
    (classSubjectGroups.find(group => group.class === className)?.subjects || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  const getSectionsForClass = (className: string) => (
    classSections
      .filter(section => !className || section.standard.name === className)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
  );

  const getTeacherClassAssignment = (teacherId: string) => (
    classTeacherAllocations.find(allocation => allocation.teacher_id === teacherId && allocation.is_active !== false)
  );

  const getSectionClassAssignment = (className: string, sectionName: string) => (
    classTeacherAllocations.find(allocation =>
      allocation.class_name === className &&
      allocation.section_name === sectionName &&
      allocation.is_active !== false
    )
  );

  const isClassFullyAssigned = (className: string) => {
    const sections = getSectionsForClass(className);
    return sections.length > 0 && sections.every(section => Boolean(getSectionClassAssignment(className, section.name)));
  };

  const selectedClassSubjects = getSubjectsForClass(formData.class_name);
  const selectedClassSections = getSectionsForClass(classTeacherForm.class_name);
  const selectedTeacherClassAssignment = classTeacherForm.teacher_id
    ? getTeacherClassAssignment(classTeacherForm.teacher_id)
    : undefined;
  const selectedSectionClassAssignment = classTeacherForm.class_name && classTeacherForm.section_name
    ? getSectionClassAssignment(classTeacherForm.class_name, classTeacherForm.section_name)
    : undefined;

  const uniqueClasses = sortClassNames(Array.from(new Set(allocations.map(a => a.class).filter(Boolean))));
  const uniqueSubjects = Array.from(new Set(allocations.map(a => a.subject).filter(Boolean)));
  const uniqueClassTeacherClasses = sortClassNames(Array.from(
    new Set(classTeacherAllocations.map(allocation => allocation.class_name).filter(Boolean))
  ));

  /* ================= STATS ================= */
  const totalSubjectAllocations = allocations.length;
  const totalTeachersAllocated = Array.from(new Set(allocations.map(a => a.teacher_id))).length;
  const totalSubjects = uniqueSubjects.length;
  const totalClasses = uniqueClasses.length;
  const totalClassTeacherAllocations = classTeacherAllocations.filter(a => a.is_active !== false).length;
  const unassignedTeachers = teachers.filter(t => !t.assigned_class || t.assigned_class === 'Not Assigned').length;
  const totalSections = classSections.length;
  const unassignedClassTeachers = classSections.filter(section => !section.class_teacher).length;

  /* ================= SORT HANDLERS ================= */
  const handleSort = (field: SortFieldAllocations) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSortClassTeachers = (field: SortFieldClassTeachers) => {
    if (sortFieldClassTeachers === field) {
      setSortDirectionClassTeachers(sortDirectionClassTeachers === 'asc' ? 'desc' : 'asc');
    } else {
      setSortFieldClassTeachers(field);
      setSortDirectionClassTeachers('asc');
    }
  };

  /* ================= EXPORT CSV ================= */
  const exportToCSV = () => {
    let headers: string[] = [];
    let csvData: any[][] = [];
    
    if (viewMode === 'subject-allocations') {
      if (allocations.length === 0) {
        toastInfo('No data to export');
        return;
      }
      
      headers = ['Teacher ID', 'Teacher Name', 'Subject', 'Class', 'Sections', 'Academic Year'];
      csvData = allocations.map(allocation => [
        allocation.teacher_id,
        allocation.teacher_name,
        allocation.subject,
        allocation.class,
        allocation.sections.length > 0 ? allocation.sections.join(', ') : 'All Sections',
        allocation.academic_year || 'N/A'
      ]);
    } else {
      if (classTeacherAllocations.length === 0) {
        toastError('No data to export');
        return;
      }
      
      headers = ['Teacher ID', 'Teacher Name', 'Class', 'Section', 'Academic Year', 'Status'];
      csvData = classTeacherAllocations.map(allocation => [
        allocation.teacher_id,
        allocation.teacher_name,
        allocation.class_name,
        allocation.section_name,
        allocation.academic_year || 'N/A',
        allocation.is_active === false ? 'Inactive' : 'Active'
      ]);
    }
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${viewMode}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toastSuccess('CSV exported successfully!');
  };

  /* ================= RESET FORM ================= */
  const resetForm = () => {
    setFormData({
      teacher_id: '',
      subject_name: '',
      class_name: '',
      sections: '',
    });
  };

  const resetClassTeacherForm = () => {
    setClassTeacherForm({
      teacher_id: '',
      class_name: '',
      section_name: '',
      academic_year: new Date().getFullYear().toString(),
    });
  };

  /* ================= HANDLE FORM CHANGE ================= */
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'class_name') {
      setFormData({
        ...formData,
        class_name: e.target.value,
        subject_name: '',
        sections: '',
      });
      return;
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleClassTeacherFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === 'class_name') {
      setClassTeacherForm({
        ...classTeacherForm,
        class_name: e.target.value,
        section_name: '',
      });
      return;
    }

    setClassTeacherForm({
      ...classTeacherForm,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1920px]">
        {/* HEADER SECTION */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center justify-between w-full lg:w-auto">
              <div className="flex items-center space-x-4">
                <div className={combine(
                  "p-3 rounded-2xl shadow-lg",
                  theme === 'dark' 
                    ? "bg-gradient-to-br from-purple-600 to-purple-700" 
                    : "bg-gradient-to-br from-purple-500 to-purple-600"
                )}>
                  <FaClipboardList className="text-2xl text-white" />
                </div>
                <div>
                  <h1 className={combine("text-3xl font-bold", get('text', 'primary'))}>
                    Teacher Allocations
                  </h1>
                  <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                    Manage teacher subject allocations and class teacher assignments
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3"> 
              <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
              {showRedirectBackButton && (
                <button
                  onClick={handleRedirectBack}
                  className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                >
                  <span>Back</span>
                </button>
              )}
              <button
                onClick={fetchAllData}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                disabled={loading}
              >
                <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={exportToCSV}
                className={combine(getSecondaryButtonClass(), "flex items-center space-x-2")}
                disabled={(viewMode === 'subject-allocations' ? allocations.length : classTeacherAllocations.length) === 0}
              >
                <FaDownload className="text-xs" />
                <span className="inline">Export CSV</span>
              </button>
              
              <button
                onClick={() => {
                  if (viewMode === 'subject-allocations') {
                    resetForm();
                    setShowAddModal(true);
                  } else {
                    resetClassTeacherForm();
                    setShowClassTeacherModal(true);
                  }
                }}
                className={combine(getPrimaryButtonClass(), "flex items-center space-x-2")}
              >
                <FaPlus className="text-xs" />
                <span>
                  {viewMode === 'subject-allocations' ? 'Add Allocation' : 'Assign Class Teacher'}
                </span>
              </button>
            </div>
          </div>

          {/* VIEW MODE TABS */}
          <div className="mb-6 sm:mb-8">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex overflow-x-auto whitespace-nowrap gap-4 sm:gap-8">
                <button
                  onClick={() => setViewMode('subject-allocations')}
                  className={combine(
                    "py-2 px-1 border-b-2 font-medium text-xs sm:text-sm",
                    viewMode === 'subject-allocations'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaBookOpen className="inline mr-2 text-sm" />
                  Subject Allocations 
                </button>
                <button
                  onClick={() => setViewMode('class-teacher-allocation')}
                  className={combine(
                    "py-2 px-1 border-b-2 font-medium text-xs sm:text-sm",
                    viewMode === 'class-teacher-allocation'
                      ? 'border-purple-500 text-purple-600 dark:text-purple-400 dark:border-purple-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  )}
                >
                  <FaUserGraduate className="inline mr-2 text-sm" />
                  Class Teachers 
                </button>
              </nav>
            </div>
          </div>

          {/* QUICK STATS */}
          {viewMode === 'subject-allocations' ? (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <div className={getCardClass('purple')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Allocations</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalSubjectAllocations}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaClipboardList className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Teachers Allocated</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalTeachersAllocated}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaUserTie className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Subjects</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalSubjects}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaBook className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('green')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Classes</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalClasses}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                  )}>
                    <FaSchool className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    )} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              <div className={getCardClass('purple')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Class Teachers</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{totalClassTeacherAllocations}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaUserGraduate className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Teachers</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{teachers.length}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                  )}>
                    <FaBuilding className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('green')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Assigned Teachers</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>
                      {teachers.filter(t => t.assigned_class && t.assigned_class !== 'Not Assigned').length}
                    </p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-green-900/30' : 'bg-green-100'
                  )}>
                    <FaUserCheck className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-green-400' : 'text-green-600'
                    )} />
                  </div>
                </div>
              </div>
              
              <div className={getCardClass('amber')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Unassigned Teachers</p>
                    <p className={combine("text-2xl font-bold mt-2", get('text', 'primary'))}>{unassignedTeachers}</p>
                  </div>
                  <div className={combine(
                    "p-2 rounded-xl",
                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                  )}>
                    <FaUserTimes className={combine(
                      "text-lg",
                      theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                    )} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MAIN CONTENT */}
          <div className={getCardGradientClass('purple')}>
            {/* SEARCH & FILTERS */}
            <div className="mb-6">
              {viewMode === 'subject-allocations' ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* In the search input section, add a clear button when searchTerm exists */}
<div className="md:col-span-2">
  <div className="relative">
    <FaSearch className={combine(
      "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
      get('icon', 'secondary')
    )} />
    <input
      type="text"
      placeholder="Search allocations by teacher, subject, class..."
      value={searchTerm}
      onChange={(e) => handleSearchChange(e.target.value)}
      className={getInputClass()}
      style={{ paddingLeft: '2.5rem', paddingRight: searchTerm ? '2.5rem' : '1rem' }}
    />
    {searchTerm && (
      <button
        onClick={() => handleSearchChange('')}
        className={combine(
          "absolute right-4 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-[var(--color-bg-hover)]",
          get('icon', 'secondary')
        )}
        title="Clear search"
      >
        <FaTimes className="text-xs" />
      </button>
    )}
  </div>
</div>
                  <div>
                    <select
                      value={filterClass}
                      onChange={(e) => setFilterClass(e.target.value)}
                      className={getInputClass()}
                    >
                      <option value="all">All Classes</option>
                      {uniqueClasses.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={filterSubject}
                      onChange={(e) => setFilterSubject(e.target.value)}
                      className={getInputClass()}
                    >
                      <option value="all">All Subjects</option>
                      {uniqueSubjects.map(subject => (
                        <option key={subject} value={subject}>{subject}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className="relative">
                      <FaSearch className={combine(
                        "absolute left-4 top-1/2 transform -translate-y-1/2 text-sm",
                        get('icon', 'secondary')
                      )} />
                      <input
                        type="text"
                        placeholder="Search by teacher name, class, or section..."
                        value={searchTerm}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        className={getInputClass()}
                        style={{ paddingLeft: '2.5rem' }}
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      value={filterClassTeacherClass}
                      onChange={(e) => setFilterClassTeacherClass(e.target.value)}
                      className={getInputClass()}
                    >
                      <option value="all">All Classes</option>
                      {uniqueClassTeacherClasses.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className={getInputClass()}
                    >
                      <option value="all">All Status</option>
                      <option value="assigned">Assigned</option>
                      <option value="unassigned">Unassigned</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* ALLOCATIONS TABLES */}
            {loading ? (
              <div className="p-8 text-center">
                <div className="text-center">
                  <div className="relative mx-auto w-16 h-16">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                    </div>
                  </div>
                  <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading allocations...</p>
                  <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing teacher records</p>
                </div>
              </div>
            ) : viewMode === 'subject-allocations' ? (
              loadingSubjectAllocations ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading subject allocations...</p>
                    <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing teacher records</p>
                  </div>
                </div>
              ) : currentAllocations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 rounded-full mb-3",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaBookOpen className={combine(
                      "text-xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                    )} />
                  </div>
                  <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No subject allocations found</h3>
                  <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                    {searchTerm || filterClass !== 'all' || filterSubject !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'No subject allocations have been created yet. Add your first allocation to get started.'}
                  </p>
                  {allocations.length === 0 && !searchTerm && filterClass === 'all' && filterSubject === 'all' && (
                    <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start">
                        <FaInfoCircle className="text-blue-500 dark:text-blue-400 mt-0.5 mr-3 text-lg flex-shrink-0" />
                        <div className="text-left">
                          <p className={combine("text-sm font-medium mb-1", get('text', 'primary'))}>How to add subject allocations</p>
                          <ul className={combine("text-xs space-y-1", get('text', 'secondary'))}>
                            <li>• Subject allocations allow teachers to teach specific subjects to classes</li>
                            <li>• Teachers can teach all sections of a class or specific sections</li>
                            <li>• Use the "Add Allocation" button above to get started</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      resetForm();
                      setShowAddModal(true);
                    }}
                    className={combine(getPrimaryButtonClass(), "inline-flex items-center space-x-2")}
                  >
                    <FaPlus className="text-sm" />
                    <span className="text-sm">Add Subject Allocation</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[860px] xl:min-w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={getTableHeaderClass()}>
                        <tr>
                          <th className={combine(
                            "w-[34%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSort('teacher_name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs">Teacher</span>
                              <div className="ml-1">
                                {sortField === 'teacher_name' ? (
                                  sortDirection === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "w-[24%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSort('subject')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaBook className="text-xs" />
                              <span className="text-xs">Subject</span>
                              <div className="ml-1">
                                {sortField === 'subject' ? (
                                  sortDirection === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "w-[18%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSort('class')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaSchool className="text-xs" />
                              <span className="text-xs">Class</span>
                              <div className="ml-1">
                                {sortField === 'class' ? (
                                  sortDirection === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "w-[24%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSort('sections')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUsers className="text-xs" />
                              <span className="text-xs">Sections</span>
                              <div className="ml-1">
                                {sortField === 'sections' ? (
                                  sortDirection === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                       
                        </tr>
                      </thead>
                      <tbody className={getTableRowClass()}>
                        {currentAllocations.map((allocation, index) => (
                          <tr key={`${allocation.teacher_id}-${allocation.subject}-${allocation.class}-${index}`} 
                            className="hover:bg-[var(--color-bg-hover)] transition-colors duration-150">
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <div className="flex items-center min-h-[44px] min-w-0">
                                <div className={combine(
                                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center mr-2 sm:mr-3 shrink-0",
                                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                )}>
                                  <FaUserTie className={combine(
                                    "text-sm",
                                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                  )} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-xs sm:text-sm truncate">{allocation.teacher_name}</div>
                                  <div className={combine("text-[11px] sm:text-xs truncate", get('text', 'tertiary'))}>{allocation.teacher_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <div>
                                {(() => {
                                  const subjectColor = getSubjectColor(allocation.subject);
                                  return (
                                    <span
                                      className={combine(
                                        getStatusBadgeClass('info'),
                                        subjectColor ? '!text-white border' : ''
                                      )}
                                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                    >
                                      {allocation.subject}
                                    </span>
                                  );
                                })()}
                                {allocation.subject_code && (
                                  <div className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                                    Code: {allocation.subject_code}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <span className={getStatusBadgeClass('success')}>
                                Class {allocation.class}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <div className="flex flex-wrap gap-1">
                                {allocation.sections.length > 0 ? (
                                  allocation.sections.map((section, idx) => (
                                    <span 
                                      key={idx}
                                      className={getStatusBadgeClass('gray')}
                                    >
                                      Section {section}
                                    </span>
                                  ))
                                ) : (
                                  <span className={getStatusBadgeClass('purple')}>
                                    <FaUsers className="inline mr-1 text-xs" />
                                    All Sections
                                  </span>
                                )}
                              </div>
                            </td>
                            
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  {totalPages > 1 && (
                    <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className={combine("text-xs", get('text', 'tertiary'))}>
                          Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredAllocations.length)} of {filteredAllocations.length} allocations
                        </p>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={combine(
                              "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                              getSecondaryButtonClass()
                            )}
                          >
                            <FaChevronLeft className="text-xs" />
                          </button>
                          
                          <div className="flex space-x-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPage(pageNum)}
                                  className={combine(
                                    "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                    currentPage === pageNum
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
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={combine(
                              "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
              )
            ) : (
              // CLASS TEACHER ALLOCATIONS VIEW
              loadingClassTeachers ? (
                <div className="p-8 text-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-16 h-16">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <FaSchool className="h-8 w-8 text-purple-600 animate-pulse" />
                      </div>
                    </div>
                    <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading class teachers...</p>
                    <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing teacher records</p>
                  </div>
                </div>
              ) : currentClassTeachers.length === 0 ? (
                <div className="p-8 text-center">
                  <div className={combine(
                    "inline-block p-3 rounded-full mb-3",
                    theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                  )}>
                    <FaUserGraduate className={combine(
                      "text-xl",
                      theme === 'dark' ? 'text-purple-400' : 'text-purple-500'
                    )} />
                  </div>
                  <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No class teachers assigned</h3>
                  <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                    {searchTerm || filterClassTeacherClass !== 'all' || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'No class teachers have been assigned yet. Assign your first class teacher to get started.'}
                  </p>
                  {classTeacherAllocations.length === 0 && !searchTerm && filterClassTeacherClass === 'all' && filterStatus === 'all' && (
                    <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-start">
                        <FaInfoCircle className="text-green-500 dark:text-green-400 mt-0.5 mr-3 text-lg flex-shrink-0" />
                        <div className="text-left">
                          <p className={combine("text-sm font-medium mb-1", get('text', 'primary'))}>About Class Teachers</p>
                          <ul className={combine("text-xs space-y-1", get('text', 'secondary'))}>
                            <li>• Class teachers are responsible for specific class sections (e.g., 9 - A)</li>
                            <li>• Each section can have only one class teacher</li>
                            <li>• Class teachers manage attendance, student issues, and parent communication</li>
                            <li>• Use the "Assign Class Teacher" button above to get started</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      resetClassTeacherForm();
                      setShowClassTeacherModal(true);
                    }}
                    className={combine(getPrimaryButtonClass(), "inline-flex items-center space-x-2")}
                  >
                    <FaPlus className="text-sm" />
                    <span className="text-sm">Assign Class Teacher</span>
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[760px] xl:min-w-full table-auto divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className={getTableHeaderClass()}>
                        <tr>
                          <th className={combine(
                            "w-[38%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSortClassTeachers('teacher_name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUserTie className="text-xs" />
                              <span className="text-xs">Teacher</span>
                              <div className="ml-1">
                                {sortFieldClassTeachers === 'teacher_name' ? (
                                  sortDirectionClassTeachers === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "w-[22%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSortClassTeachers('class_name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaSchool className="text-xs" />
                              <span className="text-xs">Class</span>
                              <div className="ml-1">
                                {sortFieldClassTeachers === 'class_name' ? (
                                  sortDirectionClassTeachers === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                          <th className={combine(
                            "w-[22%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}
                            onClick={() => handleSortClassTeachers('section_name')}
                          >
                            <div className="flex items-center space-x-2">
                              <FaUsers className="text-xs" />
                              <span className="text-xs">Section</span>
                              <div className="ml-1">
                                {sortFieldClassTeachers === 'section_name' ? (
                                  sortDirectionClassTeachers === 'asc' ? 
                                    <FaSortUp className={combine("text-xs", get('accent', 'primary'))} /> : 
                                    <FaSortDown className={combine("text-xs", get('accent', 'primary'))} />
                                ) : (
                                  <FaSort className={combine("text-xs", get('icon', 'secondary'))} />
                                )}
                              </div>
                            </div>
                          </th>
                         
                          <th className={combine(
                            "w-[18%] px-3 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium uppercase tracking-wider whitespace-nowrap",
                            get('text', 'tertiary'),
                            "hover:bg-[var(--color-bg-hover)]"
                          )}>
                            <div className="flex items-center space-x-2">
                              <FaCheckCircle className="text-xs" />
                              <span className="text-xs">Status</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className={getTableRowClass()}>
                        {currentClassTeachers.map((allocation) => (
                          <tr key={`${allocation.teacher_id}-${allocation.class_name}-${allocation.section_name}`} 
                            className="hover:bg-[var(--color-bg-hover)] transition-colors duration-150">
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <div className="flex items-center min-h-[44px] min-w-0">
                                <div className={combine(
                                  "h-9 w-9 sm:h-10 sm:w-10 rounded-full flex items-center justify-center mr-2 sm:mr-3 shrink-0",
                                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                )}>
                                  <FaChalkboardTeacher className={combine(
                                    "text-sm",
                                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                  )} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-xs sm:text-sm truncate">{allocation.teacher_name}</div>
                                  <div className={combine("text-[11px] sm:text-xs truncate", get('text', 'tertiary'))}>{allocation.teacher_id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <span className={getStatusBadgeClass('purple')}>
                                Class {allocation.class_name}
                              </span>
                            </td>
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              <span className={getStatusBadgeClass('info')}>
                                Section {allocation.section_name}
                              </span>
                            </td>
                            
                            <td className="px-3 sm:px-4 lg:px-6 py-3 align-middle">
                              {allocation.is_active === false ? (
                                <span className={getStatusBadgeClass('error')}>
                                  Inactive
                                </span>
                              ) : (
                                <span className={getStatusBadgeClass('success')}>
                                  <FaCheckCircle className="inline mr-1 text-xs" />
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  {totalPagesClassTeachers > 1 && (
                    <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                        <p className={combine("text-xs", get('text', 'tertiary'))}>
                          Showing {indexOfFirstItemClassTeachers + 1} to {Math.min(indexOfLastItemClassTeachers, filteredClassTeachers.length)} of {filteredClassTeachers.length} allocations
                        </p>
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setCurrentPageClassTeachers(prev => Math.max(prev - 1, 1))}
                            disabled={currentPageClassTeachers === 1}
                            className={combine(
                              "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                              getSecondaryButtonClass()
                            )}
                          >
                            <FaChevronLeft className="text-xs" />
                          </button>
                          
                          <div className="flex space-x-1">
                            {Array.from({ length: Math.min(5, totalPagesClassTeachers) }, (_, i) => {
                              let pageNum: number;
                              if (totalPagesClassTeachers <= 5) {
                                pageNum = i + 1;
                              } else if (currentPageClassTeachers <= 3) {
                                pageNum = i + 1;
                              } else if (currentPageClassTeachers >= totalPagesClassTeachers - 2) {
                                pageNum = totalPagesClassTeachers - 4 + i;
                              } else {
                                pageNum = currentPageClassTeachers - 2 + i;
                              }
                              
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setCurrentPageClassTeachers(pageNum)}
                                  className={combine(
                                    "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                    currentPageClassTeachers === pageNum
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
                            onClick={() => setCurrentPageClassTeachers(prev => Math.min(prev + 1, totalPagesClassTeachers))}
                            disabled={currentPageClassTeachers === totalPagesClassTeachers}
                            className={combine(
                              "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
              )
            )}
          </div>
        </div>

        {/* MODALS */}
        {/* ADD SUBJECT ALLOCATION MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardClass('purple'),
              "max-w-lg w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Add Subject Allocation</h2>
                <button 
                  onClick={() => setShowAddModal(false)} 
                  className={combine(
                    "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary')
                  )}
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Teacher *
                  </label>
                  <select
                    name="teacher_id"
                    value={formData.teacher_id}
                    onChange={handleFormChange}
                    required
                    className={getInputClass()}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.teacher_id}>
                        {teacher.name} ({teacher.teacher_id}) - {teacher.department}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Class *
                  </label>
                  <select
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleFormChange}
                    required
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                  {allClassOptions.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>
                
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Subject *
                  </label>
                  <select
                    name="subject_name"
                    value={formData.subject_name}
                    onChange={handleFormChange}
                    required
                    className={getInputClass()}
                    disabled={!formData.class_name || selectedClassSubjects.length === 0}
                  >
                    <option value="">
                      {!formData.class_name
                        ? 'Select class first'
                        : selectedClassSubjects.length === 0
                          ? 'No subjects for selected class'
                          : 'Select Subject'}
                    </option>
                    {selectedClassSubjects.map(subject => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name} ({subject.subject_code})
                      </option>
                    ))}
                  </select>
                </div>

                {formData.class_name && (
                  <div className={combine(
                    "rounded-xl border p-3",
                    theme === 'dark' ? 'bg-purple-900/20 border-purple-800' : 'bg-purple-50 border-purple-200'
                  )}>
                    <div className="flex items-start gap-3">
                      <FaBookOpen className={combine("mt-0.5 text-sm", theme === 'dark' ? 'text-purple-300' : 'text-purple-600')} />
                      <div>
                        <p className={combine("text-xs font-semibold", get('text', 'primary'))}>
                          Class {formData.class_name} Subjects
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {selectedClassSubjects.length > 0 ? selectedClassSubjects.map(subject => {
                            const subjectColor = getSubjectColor(subject.name);
                            return (
                              <span
                                key={subject.id}
                                className={combine(
                                  "rounded-full px-2 py-1 text-[11px] font-medium border",
                                  subjectColor ? '' : getStatusBadgeClass('info')
                                )}
                                style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                              >
                                {subject.name}
                              </span>
                            );
                          }) : (
                            <span className={combine("text-xs", get('text', 'secondary'))}>
                              Add subjects for this class before allocation.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={addAllocation}
                  disabled={saving || !formData.teacher_id || !formData.class_name || !formData.subject_name}
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 flex items-center justify-center gap-2 text-sm",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {saving ? (
                    <>
                      <div className={combine(
                        "animate-spin rounded-full h-4 w-4 border-b-2",
                        theme === 'dark' ? 'border-white' : 'border-white'
                      )}></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaPlus className="text-sm" />
                      <span>Add Allocation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ASSIGN CLASS TEACHER MODAL */}
        {showClassTeacherModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardClass('green'),
              "max-w-lg w-full shadow-2xl"
            )}>
              <div className="flex justify-between items-center mb-4">
                <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>Assign Class Teacher</h2>
                <button 
                  onClick={() => setShowClassTeacherModal(false)} 
                  className={combine(
                    "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                    get('icon', 'secondary')
                  )}
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Teacher *
                  </label>
                  <select
                    name="teacher_id"
                    value={classTeacherForm.teacher_id}
                    onChange={handleClassTeacherFormChange}
                    required
                    className={getInputClass()}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map(teacher => {
                      const assignment = getTeacherClassAssignment(teacher.teacher_id);
                      return (
                        <option
                          key={teacher.id}
                          value={teacher.teacher_id}
                          disabled={Boolean(assignment)}
                        >
                          {teacher.name} ({teacher.teacher_id}) - {teacher.department}
                          {assignment ? ` - Assigned to Class ${assignment.class_name}-${assignment.section_name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  {selectedTeacherClassAssignment && (
                    <p className={combine("text-xs mt-1", theme === 'dark' ? 'text-amber-300' : 'text-amber-700')}>
                      Already assigned to Class {selectedTeacherClassAssignment.class_name}-{selectedTeacherClassAssignment.section_name}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Class *
                  </label>
                  <select
                    name="class_name"
                    value={classTeacherForm.class_name}
                    onChange={handleClassTeacherFormChange}
                    required
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                    {allClassOptions.map(cls => {
                      const fullyAssigned = isClassFullyAssigned(cls);
                      return (
                        <option key={cls} value={cls} disabled={fullyAssigned}>
                          Class {cls}{fullyAssigned ? ' - All sections assigned' : ''}
                        </option>
                      );
                    })}
                  </select>
                  {classTeacherForm.class_name && selectedClassSections.length === 0 && (
                    <p className={combine("text-xs mt-1", theme === 'dark' ? 'text-amber-300' : 'text-amber-700')}>
                      No sections found for this class.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                    Section *
                  </label>
                  <select
                    name="section_name"
                    value={classTeacherForm.section_name}
                    onChange={handleClassTeacherFormChange}
                    required
                    className={getInputClass()}
                  >
                    <option value="">Select Section</option>
                    {selectedClassSections.map(section => {
                      const assignment = getSectionClassAssignment(section.standard.name, section.name);
                      return (
                        <option key={section.id} value={section.name} disabled={Boolean(assignment)}>
                          Section {section.name} - Class {section.standard.name}
                          {assignment ? ` - ${assignment.teacher_name}` : ''}
                        </option>
                      );
                    })}
                  </select>
                  <p className={combine("text-xs mt-1", get('text', 'tertiary'))}>
                    Assigned teachers and occupied sections stay visible but disabled.
                  </p>
                  {selectedSectionClassAssignment && (
                    <p className={combine("text-xs mt-1", theme === 'dark' ? 'text-amber-300' : 'text-amber-700')}>
                      This section already has {selectedSectionClassAssignment.teacher_name}.
                    </p>
                  )}
                </div>

                <div className={combine(
                  "rounded-xl border p-3",
                  theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'
                )}>
                  <div className="flex items-start gap-3">
                    <FaInfoCircle className={combine("mt-0.5 text-sm", theme === 'dark' ? 'text-green-300' : 'text-green-600')} />
                    <div>
                      <p className={combine("text-xs font-semibold", get('text', 'primary'))}>
                        Assignment Rules
                      </p>
                      <p className={combine("text-xs mt-1", get('text', 'secondary'))}>
                        One teacher can be class teacher for one section, and each section can have only one class teacher in the active academic year.
                      </p>
                    </div>
                  </div>
                </div>
               
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowClassTeacherModal(false)}
                  className={combine(getSecondaryButtonClass(), "flex-1 text-sm")}
                >
                  Cancel
                </button>
                <button
                  onClick={assignClassTeacher}
                  disabled={
                    saving ||
                    !classTeacherForm.teacher_id ||
                    !classTeacherForm.class_name ||
                    !classTeacherForm.section_name ||
                    Boolean(selectedTeacherClassAssignment) ||
                    Boolean(selectedSectionClassAssignment)
                  }
                  className={combine(
                    getPrimaryButtonClass(),
                    "flex-1 flex items-center justify-center gap-2 text-sm",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {saving ? (
                    <>
                      <div className={combine(
                        "animate-spin rounded-full h-4 w-4 border-b-2",
                        theme === 'dark' ? 'border-white' : 'border-white'
                      )}></div>
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <FaChalkboardTeacher className="text-sm" />
                      <span>Assign Teacher</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
