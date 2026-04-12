'use client';

import React, { useEffect, useState } from 'react';
import { 
  FaUserFriends,
  FaCalendarAlt,
  FaClock,
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaTimesCircle,
  FaPaperPlane,
  FaBell,
  FaExclamationTriangle
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastError, toastSuccess } from '@/lib/toast';

export default function Substitution() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<any[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{ name: string; code?: string }[]>([]);
  const [periodSubjects, setPeriodSubjects] = useState<{ name: string; code?: string }[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [substitutionRequests, setSubstitutionRequests] = useState<any[]>([]);
  
  // Form state
  const [searchForm, setSearchForm] = useState({
    date: new Date().toISOString().split('T')[0],
    period: '5',
    class_name: '',
    section: ''
  });

  const [assignForm, setAssignForm] = useState({
    date: new Date().toISOString().split('T')[0],
    class_name: '',
    section: '',
    period_no: '',
    subject: '',
    teacher_id: ''
  });

  const loadAvailableTeachers = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      setAssignForm((prev) => ({
        ...prev,
        date: searchForm.date,
        period_no: searchForm.period,
        class_name: searchForm.class_name,
        section: searchForm.section,
        subject: '',
        teacher_id: ''
      }));

      if (searchForm.class_name) {
        updateFiltersForClass(searchForm.class_name);
        if (searchForm.section) {
          updateSubjectsForSection(searchForm.class_name, searchForm.section);
        }
      }

      const response = await teacherApi.timetable.substitutionFreeTeachers({
        date: searchForm.date,
        period: searchForm.period,
      });

      const payload = response.data?.data || response.data || {};
      const teachers = payload.teachers || [];
      const count = payload.count ?? teachers.length;

      setAvailableTeachers(teachers);

      if (teachers.length === 0) {
        const message = 'No teachers available for the selected criteria';
        setError(message);
        toastError(message);
      } else {
        const message = `Found ${count} available teachers`;
        setSuccess(message);
        toastSuccess(message);
      }
    } catch (err) {
      const message = 'Error finding available teachers';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentSubstitutions = async () => {
    try {
      const response = await teacherApi.timetable.substitutionRecent({ limit: 10 });
      const payload = response.data?.data || response.data || {};
      const subs = payload.substitutions || payload.data || [];
      setSubstitutionRequests(Array.isArray(subs) ? subs : []);
    } catch (err) {
      setSubstitutionRequests([]);
    }
  };

  const loadFreeTeachersForPeriod = async (date: string, period: string | number) => {
    try {
      setLoading(true);
      setError('');
      const response = await teacherApi.timetable.substitutionFreeTeachers({
        date,
        period,
      });
      const payload = response.data?.data || response.data || {};
      const teachers = payload.teachers || [];
      const subjects = payload.subjects || [];

      setAvailableTeachers(teachers);
      setPeriodSubjects(
        Array.isArray(subjects)
          ? subjects.map((subject: any) => ({
              name: subject?.name || subject?.subject_name || String(subject),
              code: subject?.code || subject?.subject_code,
            }))
          : []
      );

      if (!teachers.length) {
        const message = 'No teachers available for the selected period';
        setError(message);
        toastError(message);
      }
    } catch (err) {
      const message = 'Error finding available teachers';
      setError(message);
      toastError(message);
      setAvailableTeachers([]);
      setPeriodSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInitialData = async () => {
    try {
      const profileResponse = await teacherApi.profile.get();
      const profileData = profileResponse.data?.data || profileResponse.data || null;
      setTeacherProfile(profileData);

      if (!profileData?.teacher_id) {
        setSubjectAllocations([]);
        setAvailableClasses([]);
        setAvailableSections([]);
        setAvailableSubjects([]);
        return;
      }

      const allocationsResponse = await teacherApi.subjects.allocations(profileData.teacher_id);
      const allocationsPayload = allocationsResponse.data?.data || allocationsResponse.data || {};
      const allocations = Array.isArray(allocationsPayload?.allocations)
        ? allocationsPayload.allocations
        : Array.isArray(allocationsPayload)
          ? allocationsPayload
          : [];

      setSubjectAllocations(allocations);

      const assignedClass = getAssignedClassValue(profileData);
      const assignedSection = getAssignedSectionValue(profileData);

      setAvailableClasses(assignedClass ? [assignedClass] : []);
      setAvailableSections(assignedSection ? [assignedSection] : []);
      setAvailableSubjects(
        assignedClass && assignedSection
          ? getSubjectsForFilterSelection(assignedClass, assignedSection)
          : []
      );
      setSearchForm((prev) => ({
        ...prev,
        class_name: assignedClass || '',
        section: assignedSection || ''
      }));
      setAssignForm((prev) => ({
        ...prev,
        class_name: assignedClass || '',
        section: assignedSection || '',
        subject: '',
        teacher_id: ''
      }));
    } catch (err) {
      setSubjectAllocations([]);
      setAvailableClasses([]);
      setAvailableSections([]);
      setAvailableSubjects([]);
    }
  };

  const findAvailableTeachers = async (e: React.FormEvent) => {
    e.preventDefault();
    await loadAvailableTeachers();
  };

  const assignSubstitute = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assignForm.class_name || !assignForm.section || !assignForm.teacher_id || !assignForm.period_no || !assignForm.subject) {
      const message = 'Please fill all required fields';
      setError(message);
      toastError(message);
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const response = await teacherApi.timetable.substitutionAssign(
        { date: assignForm.date },
        {
          period_no: Number(assignForm.period_no),
          subject: assignForm.subject,
          teacher_id: assignForm.teacher_id,
        }
      );

      const payload = response.data?.data || response.data || {};
      const successMessage = payload.message || 'Substitute teacher assigned successfully!';
      setSuccess(successMessage);
      toastSuccess(successMessage);

      // Reset form
      setAssignForm({
        date: new Date().toISOString().split('T')[0],
        class_name: '',
        section: '',
        period_no: '',
        subject: '',
        teacher_id: ''
      });

      // Refresh available teachers
      await loadAvailableTeachers();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message;
      const errorMessage = message || 'Error assigning substitute teacher';
      setError(errorMessage);
      toastError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherSelect = (teacher: any) => {
    setAssignForm(prev => ({
      ...prev,
      teacher_id: teacher.teacher_id,
      subject: teacher.default_subject || ''
    }));
  };

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <FaCheckCircle className={theme === 'dark' ? 'text-emerald-300' : 'text-green-500'} />
    ) : (
      <FaTimesCircle className={theme === 'dark' ? 'text-red-300' : 'text-red-500'} />
    );
  };

  const getStatusColor = (available: boolean) => {
    if (available) {
      return theme === 'dark' ? 'bg-emerald-900/30 text-emerald-200' : 'bg-green-100 text-green-800';
    }
    return theme === 'dark' ? 'bg-red-900/30 text-red-200' : 'bg-red-100 text-red-800';
  };

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'orange' | 'purple' = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-900/80 to-emerald-900/10' : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-900/80 to-amber-900/10' : 'from-white to-amber-50');
    }
    if (color === 'orange') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-900/80 to-orange-900/10' : 'from-white to-orange-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-900/80 to-purple-900/10' : 'from-white to-purple-50');
    }

    return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-900/80 to-blue-900/10' : 'from-white to-blue-50');
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getPrimaryButtonClass = (tone: 'blue' | 'orange' = 'blue') => {
    const base = combine(
      'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
      'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
      'text-xs sm:text-sm'
    );

    if (tone === 'orange') {
      return combine(
        base,
        theme === 'dark'
          ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
          : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
      );
    }

    return combine(
      base,
      theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
    );
  };

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary')
  );

  const getAlertClass = (variant: 'error' | 'success') => {
    if (variant === 'success') {
      return combine(
        'mt-6 border px-4 py-3 rounded-lg text-sm',
        theme === 'dark' ? 'bg-emerald-900/20 border-emerald-800 text-emerald-200' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
      );
    }

    return combine(
      'mt-6 border px-4 py-3 rounded-lg text-sm',
      theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
    );
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

  const getClassesFromDisplay = (displayValues: string[] | undefined) => {
    const classes = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass] = display.split(':');
      const normalizedClass = displayClass?.trim().replace(/^Class\s+/i, '');
      if (normalizedClass) classes.add(normalizedClass);
    });
    return Array.from(classes);
  };

  const getAssignedClassValue = (profile: any) =>
    profile?.assigned_class?.split(' - ')[0] || profile?.class_name || '';

  const getAssignedSectionValue = (profile: any) =>
    profile?.assigned_class?.split(' - ')[1] || profile?.section_name || '';

  const getHandledSubjectsMap = (profile: any) =>
    profile?.handled_subjects || {};

  const hasHandledSubjects = (profile: any) =>
    Object.keys(getHandledSubjectsMap(profile)).length > 0;

  const getHandledClasses = (profile: any) => {
    const classes = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap: any) => {
      Object.keys(classMap || {}).forEach((className) => classes.add(className));
    });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getHandledSectionsForClass = (profile: any, className: string) => {
    const sections = new Set<string>();
    Object.values(getHandledSubjectsMap(profile)).forEach((classMap: any) => {
      (classMap?.[className] || []).forEach((section: string) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getHandledSubjectsForClass = (profile: any, className: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]: [string, any]) => {
      if (classMap?.[className]?.length) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getHandledSubjectsForClassAndSection = (profile: any, className: string, sectionName: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profile)).forEach(([subjectName, classMap]: [string, any]) => {
      if ((classMap?.[className] || []).includes(sectionName)) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const allocationHandlesClass = (alloc: any, className: string) =>
    (alloc?.classes || []).includes(className) || getClassesFromDisplay(alloc?.sections_display).includes(className);

  const getAllocationSectionsForClass = (alloc: any, className: string): string[] => {
    const displaySections = getSectionsFromDisplay(alloc?.sections_display, className);
    if (displaySections.length > 0) {
      return displaySections;
    }
    const rawSections = Array.isArray(alloc?.sections) ? alloc.sections : [];
    const normalizedSections = rawSections.filter((section: unknown): section is string => typeof section === 'string');
    return Array.from(new Set<string>(normalizedSections)).sort((a, b) => a.localeCompare(b));
  };

  const getSubjectCode = (subjectName: string) =>
    subjectAllocations.find((alloc) => alloc.subject_name === subjectName)?.subject_code || subjectName;

  const dedupeSubjectOptions = (subjects: { name: string; code?: string }[]) => Array.from(
    new Map(subjects.map((subject) => [subject.name, subject])).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const getSubjectsForClass = (className: string): { name: string; code?: string }[] => {
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
      getAllocationSectionsForClass(alloc, className).forEach((section: string) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string) => {
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

  const updateFiltersForClass = (className: string) => {
    const sectionsArray = className ? getSectionsForClass(className) : [];
    const subjectsArray = className ? getSubjectsForFilterSelection(className) : [];
    setAvailableSections(sectionsArray);
    setAvailableSubjects(subjectsArray);
    setPeriodSubjects([]);
  };

  const updateSubjectsForSection = (className: string, sectionName: string) => {
    const subjectsArray = className ? getSubjectsForFilterSelection(className, sectionName) : [];
    setAvailableSubjects(subjectsArray);
    setPeriodSubjects([]);
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

  useEffect(() => {
    loadInitialData();
    loadRecentSubstitutions();
  }, []);

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()}`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div
            className={combine(
              "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6",
              theme === 'dark'
                ? "bg-gradient-to-r from-blue-700 to-blue-800"
                : "bg-gradient-to-r from-blue-500 to-blue-600"
            )}
          >
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaUserFriends className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Substitution Management</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    {searchForm.date} • Find and assign substitute teachers
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Available</div>
                  <div className="text-sm sm:text-base font-bold">
                    {availableTeachers.length}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Requests</div>
                  <div className="text-sm sm:text-base font-bold">
                    {substitutionRequests.length}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Period</div>
                  <div className="text-sm sm:text-base font-bold">
                    {searchForm.period}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Find Available Teachers */}
          <div className="lg:col-span-3">
            <div className={`${getCardGradientClass('blue')} mb-6`}>
              <form onSubmit={findAvailableTeachers}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <h2 className={combine("text-lg sm:text-xl font-bold flex items-center gap-2", get('text', 'primary'))}>
                    <FaSearch className={theme === 'dark' ? 'text-blue-300' : 'text-blue-500'} />
                    Find Available Teachers
                  </h2>
                  
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 items-end">
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={searchForm.date}
                      onChange={(e) => setSearchForm({...searchForm, date: e.target.value})}
                      className={getInputClass()}
                    />
                  </div>
                  
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                      Class *
                    </label>
                    <select
                      required
                      value={searchForm.class_name}
                      onChange={(e) => {
                        const className = e.target.value;
                        setSearchForm((prev) => ({
                          ...prev,
                          class_name: className,
                          section: ''
                        }));
                        updateFiltersForClass(className);
                      }}
                      className={getInputClass()}
                    >
                      <option value="">Select Class</option>
                      {availableClasses.map((className) => (
                        <option key={className} value={className}>
                          Class {className}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                      Period *
                    </label>
                    <select
                      required
                      value={searchForm.period}
                      onChange={(e) => setSearchForm({...searchForm, period: e.target.value})}
                      className={getInputClass()}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                        <option key={period} value={period}>Period {period}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex md:justify-end">
                    <button
                      type="submit"
                      disabled={loading}
                      className={combine(getPrimaryButtonClass('blue'), "disabled:opacity-50 flex items-center gap-2 w-full md:w-auto")}
                    >
                      {loading ? 'Searching...' : (
                        <>
                          <FaSearch />
                          Find Available Teachers
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Available Teachers Results */}
            {availableTeachers.length > 0 && (
              <div className={getCardGradientClass('blue')}>
                <h2 className={combine("text-lg sm:text-xl font-bold mb-4 flex items-center gap-2", get('text', 'primary'))}>
                  <FaUserFriends className={theme === 'dark' ? 'text-blue-300' : 'text-blue-500'} />
                  Available Teachers ({availableTeachers.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className={getTableHeaderClass()}>
                      <tr>
                        <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Teacher</th>
                        <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Department</th>
                        <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Teacher ID</th>
                        <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Default Subject</th>
                        <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Status</th>
                        <th className={combine("py-3 px-4 text-right text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Action</th>
                      </tr>
                    </thead>
                    <tbody className={getTableRowClass()}>
                      {availableTeachers.map((teacher) => {
                        const isSelected = assignForm.teacher_id === teacher.teacher_id;
                        return (
                          <tr
                            key={teacher.teacher_id}
                            className={combine(
                              'transition-colors',
                              isSelected
                                ? theme === 'dark'
                                  ? 'bg-blue-900/30'
                                  : 'bg-blue-50'
                                : ''
                            )}
                          >
                            <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                  {teacher.name?.charAt(0) || 'T'}
                                </div>
                                <span className="font-medium">{teacher.name}</span>
                              </div>
                            </td>
                            <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>{teacher.department || '—'}</td>
                            <td className={combine("py-3 px-4 text-sm font-mono", get('text', 'primary'))}>{teacher.teacher_id}</td>
                            <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>
                              {teacher.default_subject ? (
                                (() => {
                                  const subjectColor = getSubjectColor(teacher.default_subject);
                                  return (
                                    <span
                                      className={combine(
                                        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                                        !subjectColor ? get('text', 'primary') : ''
                                      )}
                                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                    >
                                      {teacher.default_subject}
                                    </span>
                                  );
                                })()
                              ) : (
                                <span className={get('text', 'secondary')}>Not specified</span>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(true)}`}>
                                Available
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  handleTeacherSelect(teacher);
                                  setIsAssignOpen(true);
                                }}
                                className={combine(getSecondaryButtonClass(), "inline-flex items-center justify-center")}
                              >
                                {isSelected ? 'Selected' : 'Select'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        

        {/* Recent Substitutions */}
        <div className={`${getCardGradientClass('purple')} mt-6`}>
          <h2 className={combine("text-lg sm:text-xl font-bold mb-4 flex items-center gap-2", get('text', 'primary'))}>
            <FaBell className={theme === 'dark' ? 'text-purple-300' : 'text-purple-500'} />
            Recent Substitution Requests
          </h2>
          
          {substitutionRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={getTableHeaderClass()}>
                  <tr>
                    <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Date</th>
                    <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Period</th>
                    <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Subject</th>
                    <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Substitute Teacher</th>
                    <th className={combine("py-3 px-4 text-left text-xs sm:text-sm font-semibold", get('text', 'secondary'))}>Status</th>
                  </tr>
                </thead>
                <tbody className={getTableRowClass()}>
                  {substitutionRequests.map((sub: any, index: number) => {
                    const subjectName = sub.subject || sub.subject_name || '—';
                    const subjectColor = subjectName !== '—' ? getSubjectColor(subjectName) : null;
                    const statusLabel = sub.status || 'Assigned';
                    return (
                      <tr key={`${sub.date || 'date'}-${sub.period_no || index}`}>
                        <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>{sub.date || '—'}</td>
                        <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>
                          {sub.period_no ? `Period ${sub.period_no}` : '—'}
                        </td>
                        <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>
                          {subjectName !== '—' ? (
                            <span
                              className={combine(
                                'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
                                !subjectColor ? get('text', 'primary') : ''
                              )}
                              style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                            >
                              {subjectName}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className={combine("py-3 px-4 text-sm", get('text', 'primary'))}>
                          {sub.substitute_teacher || sub.substitute_teacher_name || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className={combine(
                            "px-3 py-1 rounded-full text-xs font-medium",
                            theme === 'dark' ? 'bg-emerald-900/30 text-emerald-200' : 'bg-green-100 text-green-800'
                          )}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={combine(
              "text-center py-10 sm:py-12 p-6 sm:p-8 border rounded-xl sm:rounded-2xl",
              theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
            )}>
              <div className={combine(
                "inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full mb-5",
                theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
              )}>
                <FaUserFriends className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-purple-300' : 'text-purple-600')} />
              </div>
              <p className={combine("text-base sm:text-lg font-semibold", get('text', 'primary'))}>No recent substitution requests</p>
              <p className={combine("text-sm mt-1", get('text', 'secondary'))}>Your substitution requests will appear here</p>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className={getAlertClass('error')}>{error}</div>
        )}

        {success && (
          <div className={getAlertClass('success')}>{success}</div>
        )}
      </div>

      {isAssignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            className={combine(
              "absolute inset-0",
              theme === 'dark' ? "bg-slate-950/70" : "bg-slate-900/50"
            )}
            onClick={() => setIsAssignOpen(false)}
          />
          <div className={combine(
            "relative w-full max-w-lg rounded-2xl shadow-2xl border p-5 sm:p-6",
            theme === 'dark' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
          )}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className={combine("text-lg sm:text-xl font-bold", get('text', 'primary'))}>Assign Substitute Teacher</h3>
                <p className={combine("text-xs sm:text-sm mt-1", get('text', 'secondary'))}>Fill details and confirm assignment.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignOpen(false)}
                className={combine(
                  "px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border",
                  get('border', 'secondary'),
                  get('text', 'secondary'),
                  "hover:bg-[var(--color-bg-hover)]"
                )}
              >
                Close
              </button>
            </div>

            <form onSubmit={assignSubstitute} className="space-y-4">
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Date *
                </label>
                <input
                  type="date"
                  required
                  value={assignForm.date}
                  onChange={(e) => setAssignForm({...assignForm, date: e.target.value})}
                  className={getInputClass()}
                />
              </div>

              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Class *
                </label>
                <select
                  required
                  value={assignForm.class_name}
                  onChange={(e) => {
                    const className = e.target.value;
                    setAssignForm((prev) => ({
                      ...prev,
                      class_name: className,
                      section: '',
                      subject: '',
                      teacher_id: ''
                    }));
                    updateFiltersForClass(className);
                  }}
                  className={getInputClass()}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map((className) => (
                    <option key={className} value={className}>
                      Class {className}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Section *
                </label>
                <select
                  required
                  value={assignForm.section}
                  onChange={(e) => {
                    const sectionName = e.target.value;
                    setAssignForm((prev) => ({
                      ...prev,
                      section: sectionName,
                      subject: '',
                      teacher_id: ''
                    }));
                    updateSubjectsForSection(assignForm.class_name, sectionName);
                  }}
                  className={getInputClass()}
                  disabled={!assignForm.class_name}
                >
                  <option value="">Select Section</option>
                  {availableSections.map((section) => (
                    <option key={section} value={section}>
                      Section {section}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Period Number *
                </label>
                <select
                  required
                  value={assignForm.period_no}
                  onChange={(e) => {
                    const period = e.target.value;
                    setAssignForm((prev) => ({
                      ...prev,
                      period_no: period,
                      subject: '',
                      teacher_id: ''
                    }));
                    if (period) {
                      loadFreeTeachersForPeriod(assignForm.date, period);
                    } else {
                      setAvailableTeachers([]);
                      setPeriodSubjects([]);
                    }
                  }}
                  className={getInputClass()}
                >
                  <option value="">Select Period</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                    <option key={period} value={period}>Period {period}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Subject *
                </label>
                <select
                  required
                  value={assignForm.subject}
                  onChange={(e) => {
                    const subject = e.target.value;
                    setAssignForm((prev) => ({
                      ...prev,
                      subject,
                      teacher_id: subject ? prev.teacher_id : ''
                    }));
                  }}
                  className={getInputClass()}
                  disabled={!assignForm.class_name || !assignForm.section}
                >
                  <option value="">Select Subject</option>
                  {(periodSubjects.length > 0 ? periodSubjects : availableSubjects).map((subject) => (
                    <option key={subject.name} value={subject.name}>{subject.name}</option>
                  ))}
                  {assignForm.subject && !availableSubjects.some((subject) => subject.name === assignForm.subject) && (
                    <option value={assignForm.subject}>{assignForm.subject}</option>
                  )}
                </select>
              </div>
              
              {assignForm.subject && (
                <div>
                <label className={combine("block text-xs sm:text-sm font-medium mb-1", get('text', 'secondary'))}>
                  Teacher ID *
                </label>
                <select
                  required
                  value={assignForm.teacher_id}
                  onChange={(e) => setAssignForm({...assignForm, teacher_id: e.target.value})}
                  className={getInputClass()}
                >
                  <option value="">Select Teacher</option>
                  {availableTeachers.length === 0 && (
                    <option value="" disabled>No available teachers</option>
                  )}
                    {availableTeachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.name ? `${teacher.name} (${teacher.teacher_id})` : teacher.teacher_id}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className={combine(getPrimaryButtonClass('blue'), "w-full disabled:opacity-50 flex items-center justify-center gap-2")}
                >
                  {loading ? 'Assigning...' : (
                    <>
                      <FaPaperPlane />
                      Assign Substitute
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
