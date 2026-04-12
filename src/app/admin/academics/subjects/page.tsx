// app/components/management/SubjectsManager.tsx
'use client';

import { useState, useEffect, JSXElementConstructor, Key, PromiseLikeOfReactNode, ReactElement, ReactNode } from 'react';
import { adminApi } from '@/lib/api';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Users, 
  BookOpen,
  Filter,
  XCircle,
  Loader2,
  ChevronDown,
  RefreshCw,
  ChevronUp,
  Mail,
  Building,
  BookMarked,
  Hash,
  ExternalLink,
  User,
  Briefcase,
  Layers,
  Check,
  X,
  ArrowLeft,
  Download,
  Copy,
  Calendar,
  Clock,
  BarChart3,
  Percent,
  BookKey,
  Book,
  GraduationCap,
  School,
  Target,
  CheckSquare,
  Sparkles,
  Star,
  Award,
  Trophy,
  TrendingUp,
  CheckCheck
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { FaSchool } from 'react-icons/fa';

interface Subject {
  id: number;
  name: string;
  subject_code: string;
  standard_name?: string;
  standard_id?: number;
}

interface ClassSubjects {
  class_name: string;
  subject_count: number;
  subjects: Subject[];
}

interface Teacher {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
}

interface TeacherAllocation {
  teacher_id: string;
  teacher_name: string;
  teacher_department: string;
  teacher_email: string;
  total_subjects: number;
  total_classes: string[];
  subjects: {
    subject_name: string;
    subject_code: string;
    classes: string[];
    sections_display: string[];
  }[];
}

interface AllocationSummary {
  total_teachers: number;
  total_allocations: number;
  total_unique_subjects: number;
  total_classes: number;
}

interface Assignment {
  teacher_id: string;
  subject_name: string;
  classes: string[];
  sections?: string[];
}

interface ClassInfo {
  id: number;
  name: string;
  description?: string;
  total_subjects?: number;
  teachers_assigned?: number;
}

// New interface for the all-class subjects API response
interface AllClassSubjectsResponse {
  status: number;
  message: string;
  total_classes: number;
  total_subjects: number;
  classes: {
    class: string;
    subject_count: number;
    subjects: Subject[];
    message: string;
  }[];
}

export default function SubjectsManager() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  
  const [standards, setStandards] = useState<ClassInfo[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classSubjects, setClassSubjects] = useState<ClassSubjects | null | any>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teacherAllocations, setTeacherAllocations] = useState<TeacherAllocation[]>([]);
  const [allocationSummary, setAllocationSummary] = useState<AllocationSummary | null>(null);
  const [subjectsInput, setSubjectsInput] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([
    { teacher_id: '', subject_name: '', classes: [], sections: [] }
  ]);
  const [activeTab, setActiveTab] = useState<string>('classes');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState({
    classes: true,
    subjects: false,
    teachers: false,
    allocations: false,
    assigning: false,
    allClassSubjects: false // New loading state
  });
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [showTeacherSelect, setShowTeacherSelect] = useState<number[]>([]);
  const [expandedTeachers, setExpandedTeachers] = useState<string[]>([]);
  // New state for all class subjects data
  const [allClassSubjects, setAllClassSubjects] = useState<AllClassSubjectsResponse['classes']>([]);

  // Theme-aware CSS classes using the same system as allteachers and classessections
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl',
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

  const getStatsCardClass = (color: 'blue' | 'emerald' | 'amber' | 'pink' | 'indigo' | 'purple' | 'green' | 'red' = 'blue') => {
    return getCardGradientClass(color);
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
      red: {
        bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
        text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
        border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
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

  const getTabClass = (isActive: boolean) => {
    const base = 'flex items-center justify-center gap-2 px-3 sm:px-4 py-3 sm:py-4 font-medium text-xs sm:text-sm transition-all duration-200 whitespace-nowrap flex-1 sm:flex-none min-w-[140px] sm:min-w-0';
    if (isActive) {
      return combine(base, 'text-blue-600 border-b-2 border-blue-600', get('bg', 'secondary'));
    }
    return combine(base, get('text', 'secondary'), 'hover:text-[var(--color-text-primary)]');
  };

  // Fetch all initial data
  useEffect(() => {
    fetchClasses();
    fetchAllClassSubjects(); // New API call
    fetchTeachers();
    fetchTeacherAllocations();
  }, []);

  // Fetch subjects when class is selected
  useEffect(() => {
    if (selectedClass) {
      fetchClassSubjects(selectedClass);
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      setLoading(prev => ({ ...prev, classes: true }));
      const response = await adminApi.academics.standards();
      const data = response.data;
      setStandards(data.map((std: any) => ({ 
        id: std.id, 
        name: std.name,
        description: std.description 
      })));
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(prev => ({ ...prev, classes: false }));
    }
  };

  // New function to fetch all class subjects
  const fetchAllClassSubjects = async () => {
    try {
      setLoading(prev => ({ ...prev, allClassSubjects: true }));
      const response = await adminApi.subjects.viewAll(); // Using the new endpoint
      const data = response.data;
      
      if (data && data.classes) {
        setAllClassSubjects(data.classes);
        
        // Update standards with subject counts from the new API
        setStandards(prev => prev.map(std => {
          const classData = data.classes.find((c: any) => c.class === std.name);
          return {
            ...std,
            total_subjects: classData ? classData.subject_count : 0
          };
        }));
      }
    } catch (error) {
      console.error('Error fetching all class subjects:', error);
    } finally {
      setLoading(prev => ({ ...prev, allClassSubjects: false }));
    }
  };

  const fetchClassSubjects = async (className: string) => {
    try {
      setLoading(prev => ({ ...prev, subjects: true }));
      const response = await adminApi.subjects.viewByClass(className);
      const data = response.data;
      setClassSubjects(data);
    } catch (error) {
      console.error('Network error loading subjects for class');
    } finally {
      setLoading(prev => ({ ...prev, subjects: false }));
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoading(prev => ({ ...prev, teachers: true }));
      const response = await adminApi.teachers.setupList();
      setTeachers(response.data);
    } catch (error) {
      console.error('Network error loading teachers');
    } finally {
      setLoading(prev => ({ ...prev, teachers: false }));
    }
  };

  const fetchTeacherAllocations = async () => {
    try {
      setLoading(prev => ({ ...prev, allocations: true }));
      const response = await adminApi.teachers.allAllocations();
      const data = response.data;
      setTeacherAllocations(data.allocations);
      setAllocationSummary(data.summary);
      updateClassDataWithAllocations(data.allocations);
    } catch (error) {
      console.error('Network error loading teacher allocations');
    } finally {
      setLoading(prev => ({ ...prev, allocations: false }));
    }
  };

  const updateClassDataWithAllocations = (allocations: TeacherAllocation[]) => {
    const classDataMap: Record<string, { subjects: Set<string>, teachers: Set<string> }> = {};
    
    allocations.forEach(teacher => {
      teacher.subjects.forEach(subject => {
        subject.classes.forEach(className => {
          if (!classDataMap[className]) {
            classDataMap[className] = { subjects: new Set(), teachers: new Set() };
          }
          classDataMap[className].subjects.add(`${subject.subject_name} (${subject.subject_code})`);
          classDataMap[className].teachers.add(teacher.teacher_id);
        });
      });
    });

    setStandards(prev => prev.map(std => {
      const classData = classDataMap[std.name];
      // Preserve existing subject count from allClassSubjects if available
      const existingStd = allClassSubjects.find(c => c.class === std.name);
      return {
        ...std,
        total_subjects: existingStd?.subject_count || (classData ? classData.subjects.size : 0),
        teachers_assigned: classData ? classData.teachers.size : 0
      };
    }));
  };

  const handleAssignSubjects = async () => {
    if (!selectedClass || !subjectsInput.trim()) {
      toastInfo('Please select a class and enter subjects');
      return;
    }

    const subjects = subjectsInput.split(',').map(s => s.trim()).filter(s => s);
    
    try {
      setLoading(prev => ({ ...prev, assigning: true }));
      await adminApi.subjects.assignBulk({
        class_name: selectedClass,
        subjects,
      });
      toastSuccess(`Successfully assigned ${subjects.length} subjects to Class ${selectedClass}`);
      setSubjectsInput('');
      
      // Refresh data after assignment
      await fetchAllClassSubjects(); // Refresh all class subjects
      await fetchClassSubjects(selectedClass); // Refresh current class subjects
      
      setIsBulkAssignOpen(false);
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to assign subjects');
    } finally {
      setLoading(prev => ({ ...prev, assigning: false }));
    }
  };

  const filteredClasses = standards.map(std => {
    // Find matching class data from allClassSubjects
    const classData = allClassSubjects.find(c => c.class === std.name);
    return {
      ...std,
      total_subjects: classData?.subject_count || std.total_subjects || 0
    };
  }).filter(std =>
    std.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    std.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getClassColor = (className: string) => {
    const colors = [
      theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-800',
      theme === 'dark' ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-800',
      theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-800',
      theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-800',
      theme === 'dark' ? 'bg-pink-900/30 text-pink-300' : 'bg-pink-100 text-pink-800',
      theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
    ];
    const index = parseInt(className) % colors.length;
    return colors[index];
  };

  const getClassStatistics = (className: string) => {
    // Get subject count from allClassSubjects
    const classData = allClassSubjects.find(c => c.class === className);
    const subjectCount = classData?.subject_count || 0;
    
    const teachersForClass = new Set<string>();
    teacherAllocations.forEach(teacher => {
      teacher.subjects.forEach(subject => {
        if (subject.classes.includes(className)) {
          teachersForClass.add(teacher.teacher_id);
        }
      });
    });
    
    return {
      total_subjects: subjectCount,
      teachers_assigned: teachersForClass.size
    };
  };

  const getSubjectColor = (index: number) => {
    const colors = [
      theme === 'dark' ? 'from-blue-900/30 to-blue-800/20' : 'from-blue-50 to-blue-100',
      theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/20' : 'from-emerald-50 to-emerald-100',
      theme === 'dark' ? 'from-purple-900/30 to-purple-800/20' : 'from-purple-50 to-purple-100',
      theme === 'dark' ? 'from-amber-900/30 to-amber-800/20' : 'from-amber-50 to-amber-100',
      theme === 'dark' ? 'from-pink-900/30 to-pink-800/20' : 'from-pink-50 to-pink-100',
      theme === 'dark' ? 'from-indigo-900/30 to-indigo-800/20' : 'from-indigo-50 to-indigo-100',
      theme === 'dark' ? 'from-rose-900/30 to-rose-800/20' : 'from-rose-50 to-rose-100',
      theme === 'dark' ? 'from-cyan-900/30 to-cyan-800/20' : 'from-cyan-50 to-cyan-100',
    ];
    return colors[index % colors.length];
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

  const getSubjectColorByName = (subject: string) => {
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

  const getSubjectIcon = (index: number) => {
    const icons = [BookOpen, Book, BookMarked, GraduationCap, School, Target, Layers, BookKey];
    return icons[index % icons.length];
  };

  const getTeacherColor = (index: number) => {
    const colors = [
      theme === 'dark' ? 'text-blue-400 bg-blue-900/30' : 'text-blue-600 bg-blue-100',
      theme === 'dark' ? 'text-green-400 bg-green-900/30' : 'text-green-600 bg-green-100',
      theme === 'dark' ? 'text-purple-400 bg-purple-900/30' : 'text-purple-600 bg-purple-100',
      theme === 'dark' ? 'text-amber-400 bg-amber-900/30' : 'text-amber-600 bg-amber-100',
    ];
    return colors[index % colors.length];
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto max-w-[1600px]">
        {/* Header Section */}
        <div className="mb-3 sm:mb-4 md:mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex items-center space-x-3">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-blue-600 to-blue-700" 
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Subjects Management
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Manage subjects and assign teachers to classes
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
              <button
                onClick={() => {
                  setIsBulkAssignOpen(true);
                }}
                className={combine(getPrimaryButtonClass(), "w-full lg:w-auto flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]")}
              >
                <Plus className="h-4 w-4" />
                <span>Bulk Assign Subjects</span>
              </button>
              <button
                onClick={() => {
                  fetchAllClassSubjects();
                  fetchTeacherAllocations();
                }}
                className={combine(getSecondaryButtonClass(), "w-full lg:w-auto flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]")}
                disabled={loading.allClassSubjects || loading.allocations}
              >
                {(loading.allClassSubjects || loading.allocations) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Quick Stats - Updated to use allClassSubjects data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
            <div className={getStatsCardClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Classes</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {loading.classes ? '...' : allClassSubjects.length || standards.length}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                )}>
                  <Building className={combine(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-2 sm:mt-3 md:mt-4 text-xs", get('accent', 'primary'))}>
                Active academic classes
              </div>
            </div>
            
            <div className={getStatsCardClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Subjects</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {loading.allClassSubjects ? '...' : allClassSubjects.reduce((sum, cls) => sum + cls.subject_count, 0)}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                )}>
                  <Book className={combine(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'success'))}>
                Across all classes
              </div>
            </div>
            
            <div className={getStatsCardClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Teachers Assigned</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {teacherAllocations.length}
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                )}>
                  <GraduationCap className={combine(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'primary'))}>
                Teaching subjects
              </div>
            </div>
            
            <div className={getStatsCardClass('amber')}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Avg Subjects/Class</p>
                  <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                    {allClassSubjects.length > 0 
                      ? Math.round(allClassSubjects.reduce((sum, cls) => sum + cls.subject_count, 0) / allClassSubjects.length * 10) / 10 
                      : 0
                    }
                  </p>
                </div>
                <div className={combine(
                  "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                  theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                )}>
                  <TrendingUp className={combine(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                  )} />
                </div>
              </div>
              <div className={combine("mt-1 sm:mt-2 md:mt-3 text-xs", get('accent', 'warning'))}>
                Average distribution
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className={getCardGradientClass()}>
          {/* Tabs */}
          <div className={combine("border-b", get('border', 'primary'))}>
            <div className="flex sm:grid sm:grid-cols-2 overflow-x-auto pb-1">
              <button
                onClick={() => setActiveTab('classes')}
                className={getTabClass(activeTab === 'classes')}
              >
                <Building className="h-4 w-4 mr-2 inline" />
                Class Overview
              </button>
              <button
                onClick={() => setActiveTab('view')}
                className={getTabClass(activeTab === 'view')}
              >
                <BookOpen className="h-4 w-4 mr-2 inline" />
                View Subjects
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-6">
            {/* Tab 1: Class Overview */}
            {activeTab === 'classes' && (
              <div className="space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
  <div>
    <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
      Class Overview Dashboard
    </h3>
    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
      View all classes with their subject and teacher distribution
    </p>
  </div>
  <div className="w-full md:w-auto">
    <div className="relative w-full md:w-[340px]">
      <Search className={combine(
        "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4",
        get('icon', 'secondary')
      )} />
      <input
        type="text"
        placeholder="Search classes by name or description..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={combine(
          "w-full px-3 py-2.5 pl-10 rounded-lg border focus:ring-2 focus:ring-blue-500 outline-none transition-all",
          "text-sm",
          theme === 'dark'
            ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
          "placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]"
        )}
      />
    </div>
  </div>
</div>

                {/* Loading indicator for all class subjects */}
                {loading.allClassSubjects && (
                  <div className="p-6 sm:p-8 text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                      <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading subject data...</p>
                      <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Preparing class overview</p>
                    </div>
                  </div>
                )}

                <div className="space-y-3 sm:space-y-4">
                  {filteredClasses.map((standard) => {
                    const stats = getClassStatistics(standard.name);

                    return (
                      <div key={standard.id} className={combine(
                        "border rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200 hover:bg-[var(--color-bg-hover)]",
                        get('border', 'primary'),
                        get('bg', 'card')
                      )}>
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                            <div className={combine(
                              "h-10 w-10 sm:h-12 sm:w-12 rounded-lg flex items-center justify-center font-bold text-base sm:text-xl shrink-0",
                              getClassColor(standard.name)
                            )}>
                              {standard.name}
                            </div>
                            <div className="min-w-0">
                              <h4 className={combine("font-semibold text-sm sm:text-base truncate", get('text', 'primary'))}>
                                Class {standard.name}
                              </h4>
                              
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                            <div className="flex items-center gap-4 sm:gap-6">
                              <div className="text-left sm:text-center min-w-[72px]">
                                <div className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                                  {standard.total_subjects || stats.total_subjects}
                                </div>
                                <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>Subjects</div>
                              </div>

                              <div className="text-left sm:text-center min-w-[72px]">
                                <div className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                                  {stats.teachers_assigned}
                                </div>
                                <div className={combine("text-[11px] sm:text-xs", get('text', 'tertiary'))}>Teachers</div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-3">
                              <button
                                onClick={() => {
                                  setSelectedClass(standard.name);
                                  setActiveTab('view');
                                }}
                                className={combine(
                                  "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm",
                                  getSecondaryButtonClass(),
                                  "hover:scale-[1.02]"
                                )}
                              >
                                View
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedClass(standard.name);
                                  setIsBulkAssignOpen(true);
                                }}
                                className={combine(
                                  "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm",
                                  getPrimaryButtonClass(),
                                  "hover:scale-[1.02]"
                                )}
                              >
                                Add Subjects
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Empty State */}
                {!loading.allClassSubjects && filteredClasses.length === 0 && (
                  <div className={combine(
                    "text-center py-16 border-2 border-dashed rounded-2xl",
                    get('border', 'secondary'),
                    get('bg', 'secondary')
                  )}>
                    <div className={combine(
                      "h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <Building className={combine(
                        "h-10 w-10",
                        get('icon', 'secondary')
                      )} />
                    </div>
                    <h3 className={combine("text-xl font-semibold mb-2", get('text', 'primary'))}>
                      {searchTerm ? 'No matching classes found' : 'No classes available'}
                    </h3>
                    <p className={combine("mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                      {searchTerm 
                        ? 'Try adjusting your search terms or clear the search to view all classes'
                        : 'Add classes to start managing subjects and teacher allocations'
                      }
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button 
                        onClick={() => setSearchTerm('')}
                        className={combine(getSecondaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
                      >
                        Clear Search
                      </button>
                      <button 
                        onClick={fetchAllClassSubjects}
                        className={combine(getPrimaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
                      >
                        Refresh Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: View Subjects */}
            {activeTab === 'view' && (
              <div className="space-y-6">
                {/* Class Selection Header */}
                <div className={getCardGradientClass('blue')}>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <BookOpen className={combine("h-5 w-5", get('icon', 'primary'))} />
                        <label className={combine("block text-sm font-medium", get('text', 'primary'))}>
                          Select Class to View Subjects
                        </label>
                      </div>
                      <div className="relative">
                        <select
                          value={selectedClass}
                          onChange={(e) => setSelectedClass(e.target.value)}
                          className={combine(getInputClass(), "appearance-none")}
                        >
                          <option value="">Select a class</option>
                          {standards.map((standard) => (
                            <option key={standard.id} value={standard.name}>
                              Class {standard.name} {standard.description && `(${standard.description})`}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-end gap-3">
                      <button
                        onClick={() => selectedClass && fetchClassSubjects(selectedClass)}
                        disabled={loading.subjects}
                        className={combine(
                          "px-6 py-3.5 rounded-xl transition-all duration-200 font-medium flex items-center gap-2",
                          getSecondaryButtonClass(),
                          "hover:scale-[1.02] active:scale-[0.98]"
                        )}
                      >
                        {loading.subjects ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4" />
                            Refresh
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {loading.subjects && selectedClass ? (
                  <div className="p-6 sm:p-8 text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaSchool className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                      <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Loading subjects...</p>
                      <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>Fetching data for Class {selectedClass}</p>
                    </div>
                  </div>
                ) : classSubjects && selectedClass ? (
                  <div className="space-y-6">
                    {/* Class Header */}
                    <div className={getCardGradientClass('purple')}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={combine(
                            "h-16 w-16 rounded-2xl flex items-center justify-center font-bold text-2xl",
                            getClassColor(classSubjects.class)
                          )}>
                            {classSubjects.class}
                          </div>
                          <div>
                            <h3 className={combine("text-xl font-bold", get('text', 'primary'))}>
                              Class {classSubjects.class_name}
                            </h3>
                            <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                              {classSubjects.subject_count} subjects assigned • {classSubjects.subjects.length} active
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={combine(
                            "px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2",
                            theme === 'dark' 
                              ? 'bg-purple-900/30 text-purple-300 border border-purple-800' 
                              : 'bg-purple-100 text-purple-700 border border-purple-200'
                          )}>
                            <Book className="h-4 w-4" />
                            {classSubjects.subject_count} Subjects
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        <div className={combine("rounded-xl p-4", get('bg', 'secondary'))}>
                          <div className="flex items-center gap-2 mb-2">
                            <BookOpen className={combine("h-4 w-4", get('icon', 'primary'))} />
                            <span className="text-sm font-medium">Total Subjects</span>
                          </div>
                          <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                            {classSubjects.subject_count}
                          </div>
                        </div>
                        
                        <div className={combine("rounded-xl p-4", get('bg', 'secondary'))}>
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCheck className={combine("h-4 w-4", get('icon', 'primary'))} />
                            <span className="text-sm font-medium">Active</span>
                          </div>
                          <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                            {classSubjects.subjects.length}
                          </div>
                        </div>
                        
                        <div className={combine("rounded-xl p-4", get('bg', 'secondary'))}>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className={combine("h-4 w-4", get('icon', 'primary'))} />
                            <span className="text-sm font-medium">Teachers Assigned</span>
                          </div>
                          <div className={combine("text-2xl font-bold", get('text', 'primary'))}>
                            {getClassStatistics(selectedClass).teachers_assigned}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subjects Grid */}
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className={combine("text-lg font-semibold", get('text', 'primary'))}>
                          Subjects in Class {selectedClass}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={combine("text-sm", get('text', 'secondary'))}>
                            Showing {classSubjects.subjects.length} subjects
                          </span>
                        </div>
                      </div>
                      
                      {classSubjects.subjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          {classSubjects.subjects.map((subject: { name: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | PromiseLikeOfReactNode | null | undefined; id: Key | null | undefined; subject_code: string | number | boolean | ReactElement<any, string | JSXElementConstructor<any>> | Iterable<ReactNode> | PromiseLikeOfReactNode | null | undefined; }, index: number) => {
                            const SubjectIcon = getSubjectIcon(index);
                            const subjectColor = getSubjectColor(index);
                            const mappedSubjectColor = getSubjectColorByName(String(subject.name));
                            const teachersForSubject = teacherAllocations.filter(teacher =>
                              teacher.subjects.some(s => 
                                s.subject_name === subject.name && s.classes.includes(selectedClass)
                              )
                            );
                            
                            return (
                              <div key={subject.id} className={combine(
                                "border rounded-xl p-5 transition-all duration-300 hover:scale-[1.02] group",
                                get('border', 'primary'),
                                "hover:shadow-xl",
                                !mappedSubjectColor ? "bg-gradient-to-br" : '',
                                !mappedSubjectColor ? subjectColor : ''
                              )}
                              style={mappedSubjectColor ? getSubjectGradientStyle(mappedSubjectColor) : undefined}>
                                {/* Subject Header */}
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={combine(
                                      "p-2.5 rounded-lg",
                                      theme === 'dark' 
                                        ? 'bg-white/10' 
                                        : 'bg-white/80',
                                      mappedSubjectColor ? 'bg-white/20' : ''
                                    )}>
                                      <SubjectIcon className={combine(
                                        "h-5 w-5",
                                        theme === 'dark' ? 'text-white' : 'text-gray-700'
                                      )}
                                      style={mappedSubjectColor ? { color: mappedSubjectColor.text } : undefined}
                                      />
                                    </div>
                                    <div>
                                      <h4
                                        className={combine("font-semibold", !mappedSubjectColor ? get('text', 'primary') : '')}
                                        style={mappedSubjectColor ? { color: mappedSubjectColor.text } : undefined}
                                      >
                                        {subject.name}
                                      </h4>
                                    </div>
                                  </div>
                                  <span className={combine(
                                    "px-2.5 py-1 rounded-full text-xs font-medium",
                                    theme === 'dark' ? 'bg-black/30 text-gray-300' : 'bg-white text-gray-600',
                                    mappedSubjectColor ? 'bg-white/20' : ''
                                  )}
                                  style={mappedSubjectColor ? { color: mappedSubjectColor.text } : undefined}>
                                    {subject.subject_code}
                                  </span>
                                </div>
                                
                                {/* Subject Details */}
                                <div className="space-y-3 mb-6">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={combine("text-sm", !mappedSubjectColor ? get('text', 'tertiary') : '')}
                                      style={mappedSubjectColor ? { color: mappedSubjectColor.text, opacity: 0.95 } : undefined}
                                    >
                                      Code: {subject.subject_code}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <Users className={combine("h-3.5 w-3.5", get('icon', 'secondary'))} />
                                    <span
                                      className={combine("text-sm", !mappedSubjectColor ? get('text', 'tertiary') : '')}
                                      style={mappedSubjectColor ? { color: mappedSubjectColor.text, opacity: 0.95 } : undefined}
                                    >
                                      {teachersForSubject.length} teacher{teachersForSubject.length !== 1 ? 's' : ''} assigned
                                    </span>
                                  </div>
                                </div>
                                
                                {/* Teacher Badges */}
                                {teachersForSubject.length > 0 && (
                                  <div className="mb-4">
                                    <p className={combine("text-xs font-medium mb-2", get('text', 'secondary'))}>
                                      Assigned Teachers:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {teachersForSubject.slice(0, 2).map((teacher, idx) => (
                                        <span key={teacher.teacher_id} className={combine(
                                          "px-2 py-1 rounded-full text-xs flex items-center gap-1",
                                          getTeacherColor(idx)
                                        )}>
                                          <User className="h-2.5 w-2.5" />
                                          {teacher.teacher_name.split(' ')[0]}
                                        </span>
                                      ))}
                                      {teachersForSubject.length > 2 && (
                                        <span className={combine(
                                          "px-2 py-1 rounded-full text-xs",
                                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
                                        )}>
                                          +{teachersForSubject.length - 2} more
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={combine(
                          "text-center py-16 border-2 border-dashed rounded-2xl",
                          get('border', 'secondary'),
                          get('bg', 'secondary')
                        )}>
                          <div className={combine(
                            "h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                          )}>
                            <BookOpen className={combine(
                              "h-10 w-10",
                              get('icon', 'secondary')
                            )} />
                          </div>
                          <h3 className={combine("text-xl font-semibold mb-2", get('text', 'primary'))}>
                            No Subjects Found
                          </h3>
                          <p className={combine("mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                            Class {selectedClass} has no subjects assigned yet. Add subjects to start managing this class.
                          </p>
                          <button 
                            onClick={() => setIsBulkAssignOpen(true)}
                            className={combine(getPrimaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
                          >
                            <Plus className="h-4 w-4 mr-2 inline" />
                            Assign Subjects
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedClass ? (
                  <div className={combine(
                    "text-center py-16 border-2 border-dashed rounded-2xl",
                    get('border', 'secondary'),
                    get('bg', 'secondary')
                  )}>
                    <div className={combine(
                      "h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <BookOpen className={combine(
                        "h-10 w-10",
                        get('icon', 'secondary')
                      )} />
                    </div>
                    <h3 className={combine("text-xl font-semibold mb-2", get('text', 'primary'))}>
                      No Subjects Assigned
                    </h3>
                    <p className={combine("mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                      Class {selectedClass} has no subjects assigned yet. Add subjects to start managing this class.
                    </p>
                    <button 
                      onClick={() => setIsBulkAssignOpen(true)}
                      className={combine(getPrimaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
                    >
                      <Plus className="h-4 w-4 mr-2 inline" />
                      Assign Subjects
                    </button>
                  </div>
                ) : (
                  <div className={combine(
                    "text-center py-16 border-2 border-dashed rounded-2xl",
                    get('border', 'secondary'),
                    get('bg', 'secondary')
                  )}>
                    <div className={combine(
                      "h-20 w-20 rounded-full mx-auto mb-6 flex items-center justify-center",
                      theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                    )}>
                      <Building className={combine(
                        "h-10 w-10",
                        get('icon', 'secondary')
                      )} />
                    </div>
                    <h3 className={combine("text-xl font-semibold mb-2", get('text', 'primary'))}>
                      Select a Class
                    </h3>
                    <p className={combine("mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                      Choose a class from the dropdown to view and manage its subjects
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <button 
                        onClick={() => setActiveTab('classes')}
                        className={combine(getPrimaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
                      >
                        <Building className="h-4 w-4 mr-2 inline" />
                        View All Classes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Assign Subjects Modal */}
      {isBulkAssignOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className={combine(
            getCardGradientClass('green'),
            "max-w-md w-full shadow-2xl"
          )}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={combine("text-xl font-bold", get('text', 'primary'))}>Bulk Assign Subjects</h2>
              <button onClick={() => setIsBulkAssignOpen(false)} className={combine(
                "p-2 rounded-xl transition-all hover:bg-[var(--color-bg-hover)]",
                get('icon', 'secondary')
              )}>
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Select Class *
                </label>
                <div className="relative">
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className={combine(getInputClass(), "appearance-none")}
                  >
                    <option value="">Select a class</option>
                    {standards.map((standard) => (
                      <option key={standard.id} value={standard.name}>
                        Class {standard.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
              
              <div>
                <label className={combine("block text-sm font-medium mb-2", get('text', 'primary'))}>
                  Subjects *
                </label>
                <input
                  type="text"
                  value={subjectsInput}
                  onChange={(e) => setSubjectsInput(e.target.value)}
                  placeholder="Enter subjects separated by commas (e.g., Mathematics, Science, English)"
                  className={getInputClass()}
                />
                <p className={combine("text-sm mt-1", get('text', 'tertiary'))}>
                  Separate subjects with commas. Each subject will be created if it doesn't exist.
                </p>
              </div>
              
              {subjectsInput.trim() && (
                <div className={combine("rounded-xl p-3", get('bg', 'secondary'))}>
                  <h4 className={combine("font-medium mb-2", get('text', 'primary'))}>
                    Subjects to be assigned:
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {subjectsInput.split(',').map((subject, idx) => (
                      subject.trim() && (
                        <span key={idx} className={combine(
                          "px-3 py-1 rounded-full text-sm",
                          theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-white text-gray-700'
                        )}>
                          {subject.trim()}
                        </span>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsBulkAssignOpen(false)}
                className={combine(getSecondaryButtonClass(), "hover:scale-[1.02] active:scale-[0.98]")}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubjects}
                disabled={!selectedClass || !subjectsInput.trim() || loading.assigning}
                className={combine(
                  "flex-1 px-4 py-3 rounded-xl transition-all duration-200 font-medium flex items-center justify-center gap-2",
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white',
                  "disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {loading.assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Assign Subjects
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
