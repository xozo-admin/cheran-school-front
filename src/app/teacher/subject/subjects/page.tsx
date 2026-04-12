'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaBook, FaChalkboardTeacher, FaUsers, FaChartLine, 
  FaCalendarAlt, FaClipboardList, FaTasks, FaSpinner, 
  FaExclamationTriangle, FaUserGraduate, FaClock, 
  FaCheckCircle, FaRegCalendarCheck, FaFilter,
  FaFileAlt, FaChartBar, FaUserFriends, FaGraduationCap,
  FaCalendarDay, FaListAlt, FaChartPie, FaDoorOpen,
  FaTimes, FaChevronRight, FaPlusCircle, FaCalendarPlus,
  FaBell, FaCalendarWeek, FaHourglassHalf, FaMapMarkerAlt,
  FaCalendarTimes, FaChalkboard, FaThLarge, FaList
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { teacherApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// API Service Functions
const apiService = {
  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getTeacherSubjectAllocations(teacherId: any) {
    const response = await teacherApi.subjects.allocations(teacherId);
    return response.data;
  },

  async getTeacherTimetable() {
    const response = await teacherApi.timetable.mySchedule();
    return response.data;
  },
};

interface Subject {
  id: string;
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
  classSectionPairs: ClassSectionPair[];
  periods: Period[];
  teacher_name: string;
  allocation_type: string;
  total_classes: number;
  total_sections: number;
  total_periods: number;
  has_schedule: boolean;
  next_class?: Period;
  sections_display?: string[];
}

interface ClassSectionPair {
  id: string;
  class: string;
  section: string;
  display: string;
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  periods: Period[];
  has_schedule: boolean;
  next_class?: Period;
  weekly_hours: number;
  days_count: number;
}

interface Period {
  id: string;
  day: string;
  period_no: number;
  start_time: string;
  end_time: string;
  time?: string;
  class_name: string;
  section_name: string;
  location?: string;
  subject_name: string;
  duration: number;
}

interface TeacherProfile {
  teacher_id: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  joining_date?: string | null;
  assigned_class?: string | null;
  class_name?: string | null;
  section_name?: string | null;
}

export default function MySubjects() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classSections, setClassSections] = useState<ClassSectionPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClassSection, setSelectedClassSection] = useState<ClassSectionPair | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [academicYear, setAcademicYear] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');
  const [selectedSectionFilter, setSelectedSectionFilter] = useState<string>('all');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
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

  const getNormalizedTodayDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDisplayDate = (dateValue?: string | null) => {
    if (!dateValue) return 'Not Added';

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) return dateValue;

    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(parsedDate);
  };

  useEffect(() => {
    loadTeacherData();
  }, []);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      setError('');

      // 1. Fetch teacher profile
      const profileResponse = await apiService.getTeacherProfile();
      const profileData = resolveApiPayload<TeacherProfile>(profileResponse);
      setTeacherProfile(profileData);
      const teacherId = profileData.teacher_id;

      // 2. Fetch subject allocations
      const allocationsResponse = await apiService.getTeacherSubjectAllocations(teacherId);
      const allocationsData = resolveApiPayload<any>(allocationsResponse);
      
      // 3. Fetch timetable for schedule data
      const timetableResponse = await apiService.getTeacherTimetable();
      const timetableData = resolveApiPayload<any>(timetableResponse);

      setAcademicYear(allocationsData?.academic_year || timetableData?.year || '');

      // Transform and combine data
      const { transformedSubjects, allClassSections } = transformAllocationsToSubjects(
        allocationsData, 
        timetableData
      );

      setSubjects(transformedSubjects);
      setClassSections(allClassSections);

    } catch (err: any) {
      console.error('Error loading data:', err);
      const errorMessage = extractApiError(err, 'Failed to load teacher data');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const transformAllocationsToSubjects = (allocationsData: any, timetableData: any) => {
    if (!allocationsData.allocations || !Array.isArray(allocationsData.allocations)) {
      return { transformedSubjects: [], allClassSections: [] };
    }

    // Create timetable map for quick lookup by subject, class, and section
    const timetableMap = new Map<string, Period[]>();
    if (timetableData.timetable) {
      Object.entries(timetableData.timetable).forEach(([day, slots]: [string, any]) => {
        slots.forEach((slot: any) => {
          const subjectKey = slot.subject_name?.toLowerCase();
          const classKey = slot.class_name;
          const sectionKey = slot.section_name;
          const compositeKey = `${subjectKey}_${classKey}_${sectionKey}`;
          
            if (subjectKey && classKey && sectionKey) {
              if (!timetableMap.has(compositeKey)) {
                timetableMap.set(compositeKey, []);
              }
              const existingPeriods = timetableMap.get(compositeKey);
              if (!existingPeriods) {
                return;
              }
              const start = new Date(`1970-01-01T${slot.start_time}`);
              const end = new Date(`1970-01-01T${slot.end_time}`);
              const duration = (end.getTime() - start.getTime()) / (1000 * 60);
              
              existingPeriods.push({
                id: `${subjectKey}_${classKey}_${sectionKey}_${day}_${slot.period_no}`,
                day,
                period_no: slot.period_no,
              start_time: slot.start_time,
              end_time: slot.end_time,
              time: `${slot.start_time.slice(0, 5)} - ${slot.end_time.slice(0, 5)}`,
              class_name: slot.class_name,
              section_name: slot.section_name,
              subject_name: slot.subject_name,
              location: slot.room_no || `${slot.class_name}-${slot.section_name}`,
              duration
            });
          }
        });
      });
    }

    const parseAllocationPairs = (allocation: any) => {
      const pairMap = new Map<string, { class: string; section: string }>();

      if (Array.isArray(allocation.sections_display)) {
        allocation.sections_display.forEach((entry: string) => {
          const match = /^Class\s+(.+?):\s+(.+)$/.exec(entry);
          if (!match) return;

          const className = match[1].trim();
          const sections = match[2]
            .split(',')
            .map((section: string) => section.trim())
            .filter(Boolean);

          sections.forEach((section: string) => {
            pairMap.set(`${className}-${section}`, { class: className, section });
          });
        });
      }

      timetableMap.forEach((_periods, key) => {
        const [subjectKey, className, section] = key.split('_');
        if (subjectKey === allocation.subject_name?.toLowerCase() && className && section) {
          pairMap.set(`${className}-${section}`, { class: className, section });
        }
      });

      if (pairMap.size === 0) {
        const fallbackClasses = Array.isArray(allocation.classes) ? allocation.classes : [];
        const fallbackSections = Array.isArray(allocation.sections) ? allocation.sections : [];
        fallbackClasses.forEach((className: string) => {
          fallbackSections.forEach((section: string) => {
            pairMap.set(`${className}-${section}`, { class: className, section });
          });
        });
      }

      return Array.from(pairMap.values());
    };

    const allClassSections: ClassSectionPair[] = [];
    const transformedSubjects = allocationsData.allocations.map((allocation: any, index: number) => {
      // Generate class-section pairs with individual timetable data
      const classSectionPairs: ClassSectionPair[] = [];
      parseAllocationPairs(allocation).forEach(({ class: cls, section: sec }) => {
          const subjectKey = allocation.subject_name.toLowerCase();
          const compositeKey = `${subjectKey}_${cls}_${sec}`;
          const periods = timetableMap.get(compositeKey) || [];
          
          // Calculate weekly hours
          const weekly_hours = periods.reduce((acc: number, period: Period) => acc + period.duration, 0) / 60;
          const days_count = new Set(periods.map((p: Period) => p.day)).size;
          
          // Find next class for today for this specific class-section
          const today = new Date().getDay();
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const todayName = days[today];
          const now = new Date();
          const nextClass = periods
            .filter((p: Period) => p.day === todayName)
            .sort((a: Period, b: Period) => a.period_no - b.period_no)
            .find((period: Period) => {
              const [hours, minutes] = period.start_time.split(':');
              const periodTime = new Date();
              periodTime.setHours(parseInt(hours), parseInt(minutes), 0);
              return periodTime > now;
            });

          const classSection: ClassSectionPair = {
            id: `${allocation.subject_code}-${cls}-${sec}-${index}`,
            class: cls,
            section: sec,
            display: `${cls}-${sec}`,
            subject_name: allocation.subject_name,
            subject_code: allocation.subject_code,
            teacher_name: allocationsData.teacher_name,
            periods,
            has_schedule: periods.length > 0,
            next_class: nextClass,
            weekly_hours: Math.round(weekly_hours * 10) / 10,
            days_count
          };

          classSectionPairs.push(classSection);
          allClassSections.push(classSection);
      });

      // Calculate aggregate periods for the subject
      const allPeriods = classSectionPairs.flatMap(pair => pair.periods);
      const hasSchedule = classSectionPairs.some(pair => pair.has_schedule);
      const nextClass = classSectionPairs.find(pair => pair.next_class)?.next_class;
      const uniqueClasses = Array.from(new Set(classSectionPairs.map((pair) => pair.class))).sort((a, b) => Number(a) - Number(b));
      const uniqueSections = Array.from(new Set(classSectionPairs.map((pair) => pair.section))).sort();

      return {
        id: `${allocation.subject_code}-${index}`,
        subject_name: allocation.subject_name,
        subject_code: allocation.subject_code,
        classes: uniqueClasses,
        sections: uniqueSections,
        classSectionPairs,
        periods: allPeriods,
        teacher_name: allocationsData.teacher_name,
        allocation_type: 'allocated',
        total_classes: uniqueClasses.length,
        total_sections: uniqueSections.length,
        total_periods: allPeriods.length,
        has_schedule: hasSchedule,
        next_class: nextClass,
        sections_display: allocation.sections_display || []
      };
    });

    const dedupedClassSections = Array.from(
      new Map(allClassSections.map((pair) => [`${pair.subject_code}-${pair.class}-${pair.section}`, pair])).values()
    );

    return { transformedSubjects, allClassSections: dedupedClassSections };
  };

  const handleClassSectionClick = (pair: ClassSectionPair) => {
    setSelectedClassSection(pair);
  };

  const handleSubjectClick = (subject: Subject) => {
    setSelectedSubject(subject);
  };

  const handleSubjectAction = (action: string, pair?: ClassSectionPair) => {
    const targetPair = pair || selectedClassSection;
    if (!targetPair) {
      toast.error('No class/section information available');
      return;
    }

    const queryParams = new URLSearchParams({
      subject: targetPair.subject_name,
      class: targetPair.class,
      section: targetPair.section,
    });

    switch (action) {
      case 'view-students':
        window.location.href = `/students?${queryParams}`;
        break;
      case 'materials':
        window.location.href = `/subject-materials?${queryParams}`;
        break;
      case 'assignments':
        window.location.href = `/assignments?${queryParams}`;
        break;
      case 'attendance':
        window.location.href = `/attendance?${queryParams}&date=${getNormalizedTodayDate()}`;
        break;
      case 'performance':
        window.location.href = `/performance/subject?${queryParams}`;
        break;
      case 'timetable':
        window.location.href = `/timetable?subject=${targetPair.subject_name}`;
        break;
      default:
        break;
    }
  };

  const filterClassSections = () => {
    let filtered = classSections;

    // Filter by class
    if (selectedClassFilter !== 'all') {
      filtered = filtered.filter(pair => pair.class === selectedClassFilter);
    }

    // Filter by section
    if (selectedSectionFilter !== 'all') {
      filtered = filtered.filter(pair => pair.section === selectedSectionFilter);
    }

    // Filter by subject
    if (selectedSubjectFilter !== 'all') {
      filtered = filtered.filter(pair => pair.subject_name === selectedSubjectFilter);
    }

    // Filter by schedule status
    if (scheduleStatusFilter !== 'all') {
      filtered = filtered.filter(pair => 
        scheduleStatusFilter === 'scheduled' ? pair.has_schedule : !pair.has_schedule
      );
    }

    return filtered;
  };

  const getAvailableClasses = () => {
    const classes = new Set<string>();
    classSections
      .filter((pair) => selectedSectionFilter === 'all' || pair.section === selectedSectionFilter)
      .forEach(pair => {
      classes.add(pair.class);
      });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getAvailableSections = () => {
    const sections = new Set<string>();
    classSections
      .filter((pair) => selectedClassFilter === 'all' || pair.class === selectedClassFilter)
      .forEach(pair => {
      sections.add(pair.section);
      });
    return Array.from(sections).sort();
  };

  const getAvailableSubjects = () => {
    const subjectsSet = new Set<string>();
    classSections.forEach(pair => {
      subjectsSet.add(pair.subject_name);
    });
    return Array.from(subjectsSet).sort();
  };

  const getDayColor = (day: string) => {
    const colors: Record<string, string> = {
      Monday: 'bg-blue-100 text-blue-700 border-blue-200',
      Tuesday: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      Wednesday: 'bg-violet-100 text-violet-700 border-violet-200',
      Thursday: 'bg-amber-100 text-amber-700 border-amber-200',
      Friday: 'bg-rose-100 text-rose-700 border-rose-200',
      Saturday: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      Sunday: 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return colors[day] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${minutes} ${ampm}`;
  };

  const getCurrentDay = () => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  };

  const getPeriodsForToday = (pair: ClassSectionPair) => {
    const today = getCurrentDay();
    return pair.periods
      .filter(period => period.day === today)
      .sort((a, b) => a.period_no - b.period_no);
  };

  const getPeriodStatusForToday = (period: Period) => {
    const now = new Date();
    const [startHours, startMinutes] = period.start_time.split(':').map(Number);
    const [endHours, endMinutes] = period.end_time.split(':').map(Number);

    const start = new Date();
    start.setHours(startHours, startMinutes, 0, 0);

    const end = new Date();
    end.setHours(endHours, endMinutes, 0, 0);

    if (now >= start && now <= end) {
      return {
        label: 'Current',
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      };
    }

    if (now < start) {
      return {
        label: 'Upcoming',
        className: 'bg-blue-100 text-blue-700 border-blue-200',
      };
    }

    return {
      label: 'Completed',
      className: 'bg-gray-100 text-gray-600 border-gray-200',
    };
  };

  const getOrderedWeeklySchedule = (pair: ClassSectionPair) => {
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return dayOrder
      .map((day) => ({
        day,
        periods: pair.periods
          .filter((period) => period.day === day)
          .sort((a, b) => a.period_no - b.period_no),
      }))
      .filter((entry) => entry.periods.length > 0);
  };

  const renderNoTimetablePopup = (pair: ClassSectionPair) => {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl animate-slideUp">
          {/* Modal Header */}
          <div className="relative">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <FaCalendarTimes className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">
                      No Timetable Assigned
                    </h2>
                    <p className="text-white/80 text-sm">
                      {pair.subject_name} - Class {pair.class} - Section {pair.section}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClassSection(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full mb-4">
                <FaExclamationTriangle className="text-3xl text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Schedule Required</h3>
              <p className="text-gray-600 text-sm">
                This class-section pair doesn't have any scheduled periods in the timetable yet.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3">
                  <FaCalendarTimes className="text-amber-500" />
                  <div>
                    <div className="font-medium text-amber-800">No Scheduled Periods</div>
                    <div className="text-sm text-amber-600">
                      Contact the administrator to schedule periods for this subject
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-medium text-gray-800 mb-3">Class Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Subject</div>
                    <div className="font-medium">{pair.subject_name}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Subject Code</div>
                    <div className="font-medium">{pair.subject_code}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Class</div>
                    <div className="font-medium">{pair.class}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Section</div>
                    <div className="font-medium">{pair.section}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
  onClick={() => {
    if (pair.has_schedule) {
      handleSubjectAction('timetable');
      setSelectedClassSection(null);
    }
  }}
  className={`flex-1 px-4 py-3 rounded-xl transition-all duration-300 font-medium text-sm flex items-center justify-center ${
    pair.has_schedule
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 cursor-pointer'
      : 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-500 cursor-not-allowed opacity-70'
  }`}
  disabled={!pair.has_schedule}
  title={pair.has_schedule ? 'View full timetable' : 'No timetable available for this section'}
>
  <FaCalendarAlt className="inline mr-2" /> 
  {pair.has_schedule ? 'View Timetable' : 'No Timetable'}
</button>
              <button
                onClick={() => setSelectedClassSection(null)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 transition-all duration-300 font-medium text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTimetablePopup = (pair: ClassSectionPair) => {
    const todayPeriods = getPeriodsForToday(pair);
    const upcomingPeriod = pair.next_class;
    const weeklySchedule = getOrderedWeeklySchedule(pair);
    
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
        <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-slideUp">
          {/* Modal Header */}
          <div className="relative">
            <div className="p-6" style={getSubjectGradientStyle(getSubjectColor(pair.subject_name))}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <FaCalendarWeek className="text-2xl text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      Timetable Schedule
                    </h2>
                    <p className="text-white/80 text-sm">
                      {pair.subject_name} - Class {pair.class} - Section {pair.section}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedClassSection(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors"
                >
                  <FaTimes className="text-xl" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-700">{pair.periods.length}</div>
                    <div className="text-xs text-blue-600 font-medium">Total Periods</div>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <FaClock className="text-lg text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-emerald-700">{pair.days_count}</div>
                    <div className="text-xs text-emerald-600 font-medium">Days/Week</div>
                  </div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <FaCalendarDay className="text-lg text-emerald-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 border border-violet-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-violet-700">{pair.weekly_hours}</div>
                    <div className="text-xs text-violet-600 font-medium">Hours/Week</div>
                  </div>
                  <div className="p-2 bg-violet-500/10 rounded-lg">
                    <FaHourglassHalf className="text-lg text-violet-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-amber-700">{todayPeriods.length}</div>
                    <div className="text-xs text-amber-600 font-medium">Today's Periods</div>
                  </div>
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <FaCalendarAlt className="text-lg text-amber-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Schedule */}
            {todayPeriods.length > 0 && (
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaCalendarDay className="text-gray-400" /> Today's Schedule ({getCurrentDay()})
                </h3>
                <div className="space-y-3">
                  {todayPeriods.map((period) => {
                    const periodStatus = getPeriodStatusForToday(period);

                    return (
                    <div
                      key={period.id}
                      className="p-3 sm:p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl border border-blue-100/50 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex flex-col gap-3 sm:gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex flex-col min-[420px]:flex-row min-[420px]:items-center gap-2 sm:gap-3 min-w-0">
                            <div className={`px-2.5 sm:px-3 py-1 border rounded-lg text-xs sm:text-sm font-medium w-fit ${periodStatus.className}`}>
                              {periodStatus.label}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-sm sm:text-base text-gray-800 break-words">
                                {formatTime(period.start_time)} - {formatTime(period.end_time)}
                              </div>
                              <div className="text-xs sm:text-sm text-gray-600">
                                Duration: {period.duration} minutes
                              </div>
                            </div>
                          </div>
                          <div className="px-2.5 sm:px-3 py-1 bg-white border border-blue-200 rounded-full w-fit">
                            <span className="text-blue-600 font-semibold text-xs sm:text-sm">
                              Period {period.period_no}
                            </span>
                          </div>
                        </div>
                        {period.location && (
                          <div className="flex items-start gap-2 text-xs sm:text-sm text-gray-600">
                            <FaMapMarkerAlt className="text-gray-400 mt-0.5 shrink-0" />
                            <span className="break-words">{period.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Upcoming Class */}
            {upcomingPeriod && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FaBell className="text-gray-400" /> Next Class
                </h3>
                <div className="p-4 bg-gradient-to-r from-emerald-50/50 to-emerald-100/50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-100 rounded-xl">
                        <FaClock className="text-xl text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 text-lg">
                          {upcomingPeriod.day} - Period {upcomingPeriod.period_no}
                        </div>
                        <div className="text-gray-600">
                          {formatTime(upcomingPeriod.start_time)} - {formatTime(upcomingPeriod.end_time)}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">
                          Location: {upcomingPeriod.location || 'Regular Classroom'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-emerald-600">{upcomingPeriod.duration} min</div>
                      <div className="text-sm text-gray-600">Duration</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Full Weekly Schedule */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <FaCalendarWeek className="text-gray-400" /> Weekly Schedule
                </h3>
                <span className="text-sm text-gray-500">
                  {pair.periods.length} periods total
                </span>
              </div>
              
              {pair.periods.length > 0 ? (
                <div className="space-y-4">
                  {weeklySchedule.map(({ day, periods }) => (
                    <div
                      key={day}
                      className="p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-xl hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`px-3 py-1 ${getDayColor(day)} rounded-lg text-sm font-medium`}>
                          {day}
                        </div>
                        <span className="text-sm text-gray-600">
                          {periods.length} {periods.length === 1 ? 'period' : 'periods'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {periods.map((period) => (
                          <div key={period.id} className="p-3 bg-white rounded-lg border border-gray-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div>
                                <div className="font-medium text-gray-800">
                                  {formatTime(period.start_time)} - {formatTime(period.end_time)}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  Duration: {period.duration} min
                                </div>
                              </div>
                              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs font-medium rounded w-fit">
                                Period {period.period_no}
                              </span>
                            </div>
                            {period.location && (
                              <div className="text-xs text-gray-600 flex items-center gap-1">
                                <FaMapMarkerAlt className="text-xs" /> {period.location}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-4">
                    <FaCalendarTimes className="text-2xl text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No Scheduled Periods</h3>
                  <p className="text-gray-600">
                    This class-section doesn't have any scheduled periods in the timetable.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  handleSubjectAction('view-students', pair);
                  setSelectedClassSection(null);
                }}
                className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl hover:border-blue-300 transition-all text-center hover:scale-105 transform duration-200"
              >
                <FaUserFriends className="text-xl text-blue-600 mx-auto mb-2" />
                <div className="font-medium text-gray-800 text-sm">Students</div>
                <div className="text-xs text-gray-600">View roster</div>
              </button>
              
              <button
                onClick={() => {
                  handleSubjectAction('materials', pair);
                  setSelectedClassSection(null);
                }}
                className="p-3 bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl hover:border-emerald-300 transition-all text-center hover:scale-105 transform duration-200"
              >
                <FaFileAlt className="text-xl text-emerald-600 mx-auto mb-2" />
                <div className="font-medium text-gray-800 text-sm">Materials</div>
                <div className="text-xs text-gray-600">Study resources</div>
              </button>
              
              <button
                onClick={() => {
                  handleSubjectAction('assignments', pair);
                  setSelectedClassSection(null);
                }}
                className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl hover:border-amber-300 transition-all text-center hover:scale-105 transform duration-200"
              >
                <FaTasks className="text-xl text-amber-600 mx-auto mb-2" />
                <div className="font-medium text-gray-800 text-sm">Assignments</div>
                <div className="text-xs text-gray-600">Create & grade</div>
              </button>
              
              <button
                onClick={() => {
                  handleSubjectAction('attendance', pair);
                  setSelectedClassSection(null);
                }}
                className="p-3 bg-gradient-to-br from-violet-50 to-violet-100 border border-violet-200 rounded-xl hover:border-violet-300 transition-all text-center hover:scale-105 transform duration-200"
              >
                <FaClipboardList className="text-xl text-violet-600 mx-auto mb-2" />
                <div className="font-medium text-gray-800 text-sm">Attendance</div>
                <div className="text-xs text-gray-600">Mark attendance</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={combine(getBgClass(), 'flex items-center justify-center px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6')}>
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <FaChalkboardTeacher className="absolute inset-0 m-auto text-blue-600 text-2xl" />
          </div>
          <div>
            <h3 className={combine("text-2xl font-bold mb-2", get('text', 'primary'))}>Loading Your Classes</h3>
            <p className={get('text', 'secondary')}>Fetching your teaching schedule and subjects...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredPairs = filterClassSections();
  const availableClasses = getAvailableClasses();
  const availableSections = getAvailableSections();
  const availableSubjects = getAvailableSubjects();
  const uniqueSectionCount = new Set(classSections.map((pair) => `${pair.class}-${pair.section}`)).size;
  const scheduledSubjectCount = subjects.filter((subject) => subject.has_schedule).length;
  const filteredUniqueSectionCount = new Set(filteredPairs.map((pair) => `${pair.class}-${pair.section}`)).size;

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <Toaster position="top-right" toastOptions={{
        style: {
          borderRadius: '12px',
          background: '#1f2937',
          color: '#fff',
        },
      }} />

      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header Section */}
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
                  <FaBook className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Subjects</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    Manage your assigned class sections, timetables, and materials
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Joining Date</div>
                  <div className="text-sm sm:text-base font-bold">
                    {formatDisplayDate(teacherProfile?.joining_date)}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Assigned Class</div>
                  <div className="text-sm sm:text-base font-bold">
                    {teacherProfile?.assigned_class || 'Not Assigned'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Academic Year</div>
                  <div className="text-sm sm:text-base font-bold">
                    {academicYear || 'Not Available'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            <div className={getCardGradientClass('blue')}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>{uniqueSectionCount}</div>
                  <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Class Sections</div>
                </div>
                <div className={combine("p-2 sm:p-3 rounded-lg sm:rounded-xl", theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')}>
                  <FaUsers className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                </div>
              </div>
            </div>
            
            <div className={getCardGradientClass('emerald')}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>{scheduledSubjectCount}</div>
                  <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Scheduled Subjects</div>
                </div>
                <div className={combine("p-2 sm:p-3 rounded-lg sm:rounded-xl", theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                  <FaCheckCircle className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600')} />
                </div>
              </div>
            </div>
            
            <div className={getCardGradientClass('purple')}>
              <div className="flex items-center justify-between">
                <div>
                  <div className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                    {classSections.reduce((acc, p) => acc + p.periods.length, 0)}
                  </div>
                  <div className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Weekly Periods</div>
                </div>
                <div className={combine("p-2 sm:p-3 rounded-lg sm:rounded-xl", theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100')}>
                  <FaClock className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-purple-400' : 'text-purple-600')} />
                </div>
              </div>
            </div>
          </div>

          {/* Filters Section */}
          <div className={combine(getCardGradientClass('blue'), "mb-6")}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 sm:gap-4 md:gap-6 xl:items-end">
              {availableClasses.length > 0 && (
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                    Class
                  </label>
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Classes</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>
              )}

              {availableSections.length > 0 && (
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                    Section
                  </label>
                  <select
                    value={selectedSectionFilter}
                    onChange={(e) => setSelectedSectionFilter(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Sections</option>
                    {availableSections.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </div>
              )}

              {availableSubjects.length > 0 && (
                <div>
                  <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                    Subject
                  </label>
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className={getInputClass()}
                  >
                    <option value="all">All Subjects</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1.5", get('text', 'primary'))}>
                  Status
                </label>
                <select
                  value={scheduleStatusFilter}
                  onChange={(e) => setScheduleStatusFilter(e.target.value)}
                  className={getInputClass()}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="unscheduled">Unscheduled</option>
                </select>
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
          </div>
        </div>

        {/* Class Sections */}
        {filteredPairs.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-4 sm:gap-6">
              {filteredPairs.map((pair) => {
                const colorTheme = getSubjectColor(pair.subject_name);
                const todayPeriods = getPeriodsForToday(pair);
                
                return (
                  <div
                    key={pair.id}
                    className={combine(
                      "group relative rounded-xl sm:rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 border h-full flex flex-col cursor-pointer",
                      get('border', 'primary')
                    )}
                    style={getSubjectGradientStyle(colorTheme)}
                    onClick={() => handleClassSectionClick(pair)}
                  >
                    <div className="p-4 sm:p-6 flex-1">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block border"
                            style={{
                              backgroundColor: `${colorTheme.bg}22`,
                              color: colorTheme.text,
                              borderColor: `${colorTheme.border}99`
                            }}
                          >
                            {pair.subject_code}
                          </span>
                          <h3
                            className="text-sm sm:text-base lg:text-lg font-bold mt-2 truncate"
                            title={pair.subject_name}
                            style={{ color: colorTheme.text }}
                          >
                            {pair.subject_name}
                          </h3>
                          <p
                            className="text-xs sm:text-sm mt-1"
                            style={{ color: colorTheme.text, opacity: 0.92 }}
                          >
                            Class {pair.class} - Section {pair.section}
                          </p>
                        </div>
                        <div className="shrink-0">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border"
                            style={{
                              backgroundColor: pair.has_schedule ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                              color: colorTheme.text,
                              borderColor: pair.has_schedule ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)'
                            }}
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: pair.has_schedule ? '#34D399' : '#FBBF24' }}
                            />
                            {pair.has_schedule ? 'Scheduled' : 'Unscheduled'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4">
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                          <div className={combine(
                            "p-3 sm:p-4 rounded-xl border",
                            theme === 'dark' ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <FaClock className={combine("text-sm", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                              <span className={combine("text-xs sm:text-sm font-medium", theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>Periods</span>
                            </div>
                            <div className={combine("font-bold text-base sm:text-lg md:text-xl", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                              {pair.periods.length}
                            </div>
                          </div>
                          
                          <div className={combine(
                            "p-3 sm:p-4 rounded-xl border",
                            theme === 'dark' ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <FaCalendarDay className={combine("text-sm", theme === 'dark' ? 'text-violet-400' : 'text-violet-600')} />
                              <span className={combine("text-xs sm:text-sm font-medium", theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>Days</span>
                            </div>
                            <div className={combine("font-bold text-base sm:text-lg md:text-xl", theme === 'dark' ? 'text-white' : 'text-slate-900')}>
                              {pair.days_count}
                            </div>
                          </div>
                        </div>
                        
                        {pair.next_class && (
                          <div className={combine("p-3 sm:p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-900/70' : 'bg-white')}>
                            <div className="text-xs font-medium mb-1" style={{ color: colorTheme.bg }}>Next Class</div>
                            <div className={combine("text-xs sm:text-sm font-semibold truncate", get('text', 'primary'))}>
                              {pair.next_class.day} - Period {pair.next_class.period_no}
                            </div>
                            <div className={combine("text-xs", get('text', 'secondary'))}>
                              {formatTime(pair.next_class.start_time)}
                            </div>
                          </div>
                        )}

                        {todayPeriods.length > 0 && (
                          <div className={combine("p-3 sm:p-4 rounded-xl border", theme === 'dark' ? 'bg-gray-900/70' : 'bg-white')}>
                            <div className="text-xs font-medium mb-1" style={{ color: '#059669' }}>Today's Classes</div>
                            <div className={combine("text-xs sm:text-sm font-semibold", get('text', 'primary'))}>
                              {todayPeriods.length} {todayPeriods.length === 1 ? 'period' : 'periods'} today
                            </div>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl sm:rounded-2xl pointer-events-none"></div>
                    
                    {/* Click Indicator */}
                    <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 bg-white border border-gray-200 rounded-full shadow-sm">
                        <FaChevronRight className="text-gray-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPairs.map((pair) => {
                const colorTheme = getSubjectColor(pair.subject_name);
                const todayPeriods = getPeriodsForToday(pair);

                return (
                  <div
                    key={pair.id}
                    className={combine(
                      "rounded-xl border p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all cursor-pointer",
                      get('border', 'primary')
                    )}
                    style={getSubjectGradientStyle(colorTheme)}
                    onClick={() => handleClassSectionClick(pair)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full inline-block border"
                          style={{
                            backgroundColor: `${colorTheme.bg}22`,
                            color: colorTheme.text,
                            borderColor: `${colorTheme.border}99`
                          }}
                        >
                          {pair.subject_code}
                        </span>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border"
                          style={{
                            backgroundColor: pair.has_schedule ? 'rgba(16, 185, 129, 0.18)' : 'rgba(245, 158, 11, 0.18)',
                            color: colorTheme.text,
                            borderColor: pair.has_schedule ? 'rgba(16, 185, 129, 0.45)' : 'rgba(245, 158, 11, 0.45)'
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: pair.has_schedule ? '#34D399' : '#FBBF24' }}
                          />
                          {pair.has_schedule ? 'Scheduled' : 'Unscheduled'}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: colorTheme.text, opacity: 0.9 }}
                        >
                          Class {pair.class} - Section {pair.section}
                        </span>
                      </div>

                      <h3
                        className="text-sm sm:text-base lg:text-lg font-bold truncate"
                        title={pair.subject_name}
                        style={{ color: colorTheme.text }}
                      >
                        {pair.subject_name}
                      </h3>

                      {pair.next_class && (
                        <p className="text-xs sm:text-sm mt-1" style={{ color: colorTheme.text, opacity: 0.9 }}>
                          Next: {pair.next_class.day} • Period {pair.next_class.period_no} • {formatTime(pair.next_class.start_time)}
                        </p>
                      )}
                      {todayPeriods.length > 0 && (
                        <p className="text-xs sm:text-sm mt-1" style={{ color: colorTheme.text, opacity: 0.9 }}>
                          Today: {todayPeriods.length} {todayPeriods.length === 1 ? 'period' : 'periods'}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <div className={combine(
                        "flex-1 sm:flex-none px-3 py-2 rounded-lg border text-center",
                        theme === 'dark' ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      )}>
                        <div className={combine("text-[11px] sm:text-xs font-medium", theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>Periods</div>
                        <div className={combine("text-sm sm:text-base font-bold", theme === 'dark' ? 'text-white' : 'text-slate-900')}>{pair.periods.length}</div>
                      </div>
                      <div className={combine(
                        "flex-1 sm:flex-none px-3 py-2 rounded-lg border text-center",
                        theme === 'dark' ? 'bg-slate-950/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                      )}>
                        <div className={combine("text-[11px] sm:text-xs font-medium", theme === 'dark' ? 'text-slate-300' : 'text-slate-700')}>Days</div>
                        <div className={combine("text-sm sm:text-base font-bold", theme === 'dark' ? 'text-white' : 'text-slate-900')}>{pair.days_count}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className={combine(
            "text-center py-12 sm:py-16 p-6 sm:p-8 border rounded-xl sm:rounded-2xl shadow-lg",
            theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
          )}>
            <div className={combine(
              "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            )}>
              <FaUsers className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            </div>
            <h3 className={combine("text-lg sm:text-xl font-bold mb-3", get('text', 'primary'))}>No Class Sections Found</h3>
            <p className={combine("text-sm sm:text-lg max-w-md mx-auto mb-8", get('text', 'secondary'))}>
              No class sections match the selected filters. Try adjusting your filter criteria.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button 
                onClick={loadTeacherData}
                className={combine(getPrimaryButtonClass(), "w-full sm:w-auto flex items-center justify-center gap-2")}
              >
                <FaSpinner className="animate-spin" /> Refresh Data
              </button>
              <button 
                onClick={() => {
                  setSelectedClassFilter('all');
                  setSelectedSectionFilter('all');
                  setSelectedSubjectFilter('all');
                  setScheduleStatusFilter('all');
                }}
                className={combine(getSecondaryButtonClass(), "w-full sm:w-auto flex items-center justify-center gap-2")}
              >
                <FaFilter /> Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Selected Class-Section Modal */}
        {selectedClassSection && (
          selectedClassSection.has_schedule 
            ? renderTimetablePopup(selectedClassSection)
            : renderNoTimetablePopup(selectedClassSection)
        )}

        {/* Error State */}
        {error && (
          <div className={combine(
            "mt-6 sm:mt-8 p-4 sm:p-6 border rounded-xl sm:rounded-2xl shadow-lg animate-fadeIn",
            theme === 'dark' ? 'bg-gradient-to-r from-red-950/30 to-gray-900/40 border-red-900/50' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
          )}>
            <div className="flex items-center gap-4">
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')}>
                <FaExclamationTriangle className={combine("text-2xl", theme === 'dark' ? 'text-red-400' : 'text-red-600')} />
              </div>
              <div className="flex-1">
                <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>Error Loading Data</h4>
                <p className={combine("text-sm sm:text-base", get('text', 'secondary'))}>{error}</p>
              </div>
              <button
                onClick={loadTeacherData}
                className={combine(
                  'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900'
                    : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                )}
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {classSections.length > 0 && (
          <div className={combine("mt-8 sm:mt-12 pt-6 sm:pt-8 border-t", get('border', 'primary'))}>
            <div className={combine("text-center", get('text', 'secondary'))}>
              <p className="text-xs sm:text-sm mb-2">
                Showing {filteredUniqueSectionCount} of {uniqueSectionCount} class sections
                {(selectedClassFilter !== 'all' || selectedSectionFilter !== 'all' || selectedSubjectFilter !== 'all' || scheduleStatusFilter !== 'all') && (
                  <span className="ml-2">
                    {selectedClassFilter !== 'all' && `• Class ${selectedClassFilter} `}
                    {selectedSectionFilter !== 'all' && `• Section ${selectedSectionFilter} `}
                    {selectedSubjectFilter !== 'all' && `• ${selectedSubjectFilter} `}
                    {scheduleStatusFilter !== 'all' && `• ${scheduleStatusFilter}`}
                  </span>
                )}
              </p>
              <p className={combine("text-xs", get('text', 'tertiary'))}>
                {scheduledSubjectCount} scheduled subjects • 
                Last updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add CSS animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
