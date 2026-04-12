'use client';

import React, { useState, useEffect } from 'react';
import {
  FaBullhorn,
  FaCalendarAlt,
  FaUserTie,
  FaSpinner,
  FaSync,
  FaPlus,
  FaEdit,
  FaTrash,
  FaBook,
  FaUsers,
  FaEye,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaTimesCircle
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// --- Types based on API Responses ---
interface Announcement {
  announcement_number: number;
  posted_by: string;
  class_name: string;
  section_name: string;
  subject_name: string | null;
  announcement_type: string;
  description: string;
  posted_time: string;
  academic_year: string;
}

interface NoticeBoardResponse {
  status: number;
  viewing_class: string;
  year: string;
  date: string;
  mode: string;
  data: Announcement[];
}

interface TeacherProfile {
  id: number;
  teacher_id: string;
  name: string;
  email: string;
  assigned_class: string;
  section_name: string | null;
  class_name: string | null;
  handled_subjects?: Record<string, Record<string, string[]>>;
}

interface SubjectAllocation {
  subject_name: string;
  subject_code: string;
  classes: string[];
  sections: string[];
  sections_display: string[];
}

interface SubjectAllocationsResponse {
  status: number;
  teacher_id: string;
  teacher_name: string;
  academic_year: string;
  allocations: SubjectAllocation[];
}

interface SubjectOption {
  name: string;
  code: string;
}

interface CreateAnnouncementData {
  class_name: string;
  section_name: string;
  subject_name?: string;
  announcement_type: string;
  description: string;
}

// --- API Service ---
const apiService = {
  async fetchWithAuth(endpoint: string, options: any = {}) {
    const response = await teacherApi.request(endpoint, options);
    return response.data;
  },

  async getTeacherProfile() {
    const response = await teacherApi.profile.get();
    return response.data;
  },

  async getSubjectAllocations(teacherId: string) {
    const response = await teacherApi.subjects.allocations(teacherId);
    return response.data;
  },

  async getNoticeBoard(date: string, classParam?: string, section?: string) {
    const response = await teacherApi.announcements.noticeBoard({
      date,
      ...(classParam && section ? { class: classParam, section } : {}),
    });
    return response.data;
  },

  async getMyPosts(date: string, classParam?: string, section?: string, scope?: string) {
    const response = await teacherApi.announcements.myPosts({
      date,
      ...(classParam && section ? { class: classParam, section } : {}),
      ...(scope ? { scope } : {}),
    });
    return response.data;
  },

  async createAnnouncement(data: CreateAnnouncementData) {
    const response = await teacherApi.announcements.create(data);
    return response.data;
  },

  async updateAnnouncement(date: string, number: number, data: Partial<Announcement>) {
    const response = await teacherApi.announcements.updateMyPost(
      { date, number },
      data
    );
    return response.data;
  },

  async deleteAnnouncement(date: string, number: number) {
    const response = await teacherApi.announcements.deleteMyPost({ date, number });
    return response.data;
  }
};

export default function TeacherAnnouncements() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'indigo' | 'purple' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
    if (color === 'indigo') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50');
    if (color === 'purple') return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50');
    return combine(base, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
  };

  const getSoftCardClass = () => combine(
    'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-colors duration-200',
    get('bg', 'secondary'),
    get('border', 'secondary')
  );

  const getInputClass = () => combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-xs sm:text-sm border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSuccessButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    theme === 'dark'
      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800'
      : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
  );

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

  const resolvePayload = <T,>(payload: any): T => {
    if (payload && typeof payload === 'object' && 'data' in payload && payload.data !== undefined) {
      return payload.data as T;
    }
    return payload as T;
  };

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [subjectAllocations, setSubjectAllocations] = useState<SubjectAllocation[]>([]);
  const [activeTab, setActiveTab] = useState<'noticeBoard' | 'myPosts'>('noticeBoard');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [announcementScope, setAnnouncementScope] = useState<'class' | 'subject'>('subject');
  const [subjectClass, setSubjectClass] = useState<string>('');
  const [subjectSection, setSubjectSection] = useState<string>('');
  const [subjectName, setSubjectName] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<SubjectOption[]>([]);
  
  // Modal states - now using HTML dialogs
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Form states
  const [createForm, setCreateForm] = useState<Pick<CreateAnnouncementData, 'announcement_type' | 'description'>>({
    announcement_type: 'academic',
    description: ''
  });
  
  const [editForm, setEditForm] = useState<Partial<Announcement>>({
    description: '',
    announcement_type: 'academic'
  });
  
  const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const hasAssignedClass = Boolean(
    profile?.assigned_class &&
    profile.assigned_class !== 'Not Assigned' &&
    profile.class_name &&
    profile.section_name
  );
  const hasSubjectAllocations = subjectAllocations.length > 0;

  const getSectionsFromDisplay = (displayValues: string[] | undefined, className: string) => {
    const sections = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass, displaySection] = display.split(':');
      if (displayClass?.trim().replace(/^Class\\s+/i, '') === className && displaySection?.trim()) {
        sections.add(displaySection.trim());
      }
    });
    return Array.from(sections).sort();
  };

  const getClassesFromDisplay = (displayValues: string[] | undefined) => {
    const classes = new Set<string>();
    (displayValues || []).forEach((display) => {
      const [displayClass] = display.split(':');
      const normalizedClass = displayClass?.trim().replace(/^Class\\s+/i, '');
      if (normalizedClass) classes.add(normalizedClass);
    });
    return Array.from(classes);
  };

  const getAssignedClassValue = (profileData: TeacherProfile | null | undefined) =>
    profileData?.assigned_class?.split(' - ')[0] || profileData?.class_name || '';

  const getHandledSubjectsMap = (profileData: TeacherProfile | null | undefined) =>
    profileData?.handled_subjects || {};

  const hasHandledSubjects = (profileData: TeacherProfile | null | undefined) =>
    Object.keys(getHandledSubjectsMap(profileData)).length > 0;

  const getHandledClasses = (profileData: TeacherProfile | null | undefined) => {
    const classes = new Set<string>();
    Object.values(getHandledSubjectsMap(profileData)).forEach((classMap) => {
      Object.keys(classMap || {}).forEach((className) => classes.add(className));
    });
    return Array.from(classes).sort((a, b) => parseInt(a) - parseInt(b));
  };

  const getHandledSectionsForClass = (profileData: TeacherProfile | null | undefined, className: string) => {
    const sections = new Set<string>();
    Object.values(getHandledSubjectsMap(profileData)).forEach((classMap) => {
      (classMap?.[className] || []).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getHandledSubjectsForClass = (profileData: TeacherProfile | null | undefined, className: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profileData)).forEach(([subjectName, classMap]) => {
      if (classMap?.[className]?.length) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
  };

  const getHandledSubjectsForClassAndSection = (profileData: TeacherProfile | null | undefined, className: string, sectionName: string) => {
    const subjects = new Set<string>();
    Object.entries(getHandledSubjectsMap(profileData)).forEach(([subjectName, classMap]) => {
      if ((classMap?.[className] || []).includes(sectionName)) subjects.add(subjectName);
    });
    return Array.from(subjects).sort((a, b) => a.localeCompare(b));
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
    if (hasHandledSubjects(profile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClass(profile, className).map((subjectName) => ({
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
    if (hasHandledSubjects(profile)) {
      return getHandledSectionsForClass(profile, className);
    }
    const sections = new Set<string>();
    subjectAllocations.forEach((alloc) => {
      if (!allocationHandlesClass(alloc, className)) return;
      getAllocationSectionsForClass(alloc, className).forEach((section) => sections.add(section));
    });
    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = (className: string, sectionName: string): SubjectOption[] => {
    if (hasHandledSubjects(profile)) {
      return dedupeSubjectOptions(
        getHandledSubjectsForClassAndSection(profile, className, sectionName).map((subjectName) => ({
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
    const assignedClass = getAssignedClassValue(profile);
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

  const handleSubjectClassChange = (className: string) => {
    setSubjectClass(className);
    setSubjectSection('');
    setSubjectName('');
    setAvailableSections(className ? getSectionsForClass(className) : []);
    setAvailableSubjects([]);
  };

  const handleSubjectSectionChange = (sectionName: string) => {
    setSubjectSection(sectionName);
    setSubjectName('');
    const nextSubjects = subjectClass ? getSubjectsForFilterSelection(subjectClass, sectionName) : [];
    setAvailableSubjects(nextSubjects);
  };

  const handleSubjectNameChange = (subjectValue: string) => {
    setSubjectName(subjectValue);
  };

  const normalizeSubjectName = (value: string | null | undefined) => (value || '').trim().toLowerCase();

  const getFilteredAnnouncements = () => {
    if (announcementScope !== 'subject') return announcements;
    if (!subjectName) return announcements;
    const target = normalizeSubjectName(subjectName);
    return announcements.filter((announcement) => normalizeSubjectName(announcement.subject_name) === target);
  };

  // Load teacher data
  useEffect(() => {
    loadTeacherData();
  }, []);

  // Load announcements when dependencies change
  useEffect(() => {
    if (!loading && selectedDate) {
      loadAnnouncements();
    }
  }, [selectedDate, activeTab, subjectClass, subjectSection, announcementScope]);

  useEffect(() => {
    if (!subjectClass) return;
    const nextSections = getSectionsForClass(subjectClass);
    setAvailableSections(nextSections);
    if (subjectSection && !nextSections.includes(subjectSection)) {
      setSubjectSection('');
      setSubjectName('');
      setAvailableSubjects([]);
      return;
    }
    if (subjectSection) {
      const nextSubjects = getSubjectsForFilterSelection(subjectClass, subjectSection);
      setAvailableSubjects(nextSubjects);
      if (subjectName && !nextSubjects.some((item) => item.name === subjectName)) {
        setSubjectName('');
      }
    }
  }, [subjectClass, subjectSection, subjectName, subjectAllocations, profile]);

  const loadTeacherData = async () => {
    try {
      setLoading(true);
      const profileResponse = await apiService.getTeacherProfile();
      const resolvedProfile = resolvePayload<TeacherProfile>(profileResponse);
      if (!resolvedProfile?.teacher_id) {
        throw new Error('Teacher profile not available.');
      }
      setProfile(resolvedProfile);
      
      const allocationsResponse = await apiService.getSubjectAllocations(resolvedProfile.teacher_id);
      const resolvedAllocations = resolvePayload<SubjectAllocationsResponse>(allocationsResponse);
      const allocations = resolvedAllocations?.allocations || [];
      setSubjectAllocations(allocations);
      const assignedClassValue = getAssignedClassValue(resolvedProfile);
      const handledClasses = getHandledClasses(resolvedProfile);
      const classesSet = new Set<string>();
      const classSectionMap = new Map<string, string[]>();

      allocations.forEach((allocation) => {
        allocation.classes.forEach((className) => {
          classesSet.add(className);
          const sectionsForClass = getAllocationSectionsForClass(allocation, className);
          if (classSectionMap.has(className)) {
            const existingSections = classSectionMap.get(className) || [];
            classSectionMap.set(className, [...new Set([...existingSections, ...sectionsForClass])]);
          } else if (sectionsForClass.length > 0) {
            classSectionMap.set(className, sectionsForClass);
          }
        });

        getClassesFromDisplay(allocation.sections_display).forEach((className) => {
          classesSet.add(className);
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

      const classesArray = (handledClasses.length > 0
        ? handledClasses
        : Array.from(classesSet).filter((className) => !assignedClassValue || className === assignedClassValue || classSectionMap.has(className))
      ).sort((a, b) => parseInt(a) - parseInt(b));
      setAvailableClasses(classesArray);
      setAvailableSections([]);
      setAvailableSubjects([]);

      const hasClassAssignment = Boolean(
        resolvedProfile?.assigned_class &&
        resolvedProfile.assigned_class !== 'Not Assigned' &&
        resolvedProfile.class_name &&
        resolvedProfile.section_name
      );

      setAnnouncementScope(hasClassAssignment ? 'class' : 'subject');

      if (!subjectClass && classesArray.length > 0) {
        const defaultClass = classesArray[0];
        const sections = getSectionsForClass(defaultClass);
        const defaultSection = sections[0] || '';
        const subjects = defaultSection ? getSubjectsForFilterSelection(defaultClass, defaultSection) : [];
        setSubjectClass(defaultClass);
        setSubjectSection(defaultSection);
        setAvailableSections(sections);
        setAvailableSubjects(subjects);
        setSubjectName(subjects[0]?.name || '');
      }
      
    } catch (err: any) {
      console.error('Error loading teacher data:', err);
      toastError(extractApiError(err, 'Failed to load teacher data'));
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      if (announcementScope === 'class' && !hasAssignedClass) {
        setAnnouncements([]);
        toastError('No class assigned to your profile. Please contact the administration.');
        return;
      }
      if (announcementScope === 'subject' && (!subjectClass || !subjectSection)) {
        setAnnouncements([]);
        return;
      }

      if (activeTab === 'noticeBoard') {
        const data: NoticeBoardResponse = await apiService.getNoticeBoard(
          selectedDate,
          announcementScope === 'subject' ? subjectClass : undefined,
          announcementScope === 'subject' ? subjectSection : undefined
        );
        setAnnouncements(data.data || []);
      } else {
        const data = await apiService.getMyPosts(
          selectedDate,
          announcementScope === 'subject' ? subjectClass : undefined,
          announcementScope === 'subject' ? subjectSection : undefined,
          announcementScope === 'class' ? 'my_class' : undefined
        );
        const resolved = resolvePayload<{ my_posts?: Announcement[] }>(data);
        setAnnouncements(resolved.my_posts || []);
      }
    } catch (err: any) {
      console.error('Error loading announcements:', err);
      toastError(extractApiError(err, 'Failed to load announcements'));
      setAnnouncements([]);
    }
  };

  const handleCreateAnnouncement = async () => {
    try {
      // Validate form
      if (!createForm.description.trim()) {
        toastError('Description is required');
        return;
      }

      if (announcementScope === 'class') {
        if (!profile?.class_name || !profile?.section_name) {
          toastError('No class assigned to your profile. Please contact the administration.');
          return;
        }
      } else {
        if (!hasSubjectAllocations) {
          toastError('No subject allocations found for your profile.');
          return;
        }
        if (!subjectClass || !subjectSection || !subjectName) {
          toastError('Please select class, section, and subject before posting.');
          return;
        }
      }
      
      // Prepare data based on teacher type
      const data: CreateAnnouncementData = {
        class_name: announcementScope === 'class' ? profile?.class_name || '' : subjectClass,
        section_name: announcementScope === 'class' ? profile?.section_name || '' : subjectSection,
        announcement_type: createForm.announcement_type,
        description: createForm.description
      };
      
      // Add subject only for subject teachers
      if (announcementScope === 'subject') {
        data.subject_name = subjectName;
      }
      
      const response = await apiService.createAnnouncement(data);
      toastSuccess(extractApiMessage(response, 'Announcement created successfully!'));
      setShowCreateModal(false);
      resetCreateForm();
      loadAnnouncements();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to create announcement'));
    }
  };

  const handleUpdateAnnouncement = async () => {
    try {
      if (!currentAnnouncement || !editForm.description?.trim()) {
        toastError('Description is required');
        return;
      }
      
      const response = await apiService.updateAnnouncement(
        selectedDate,
        currentAnnouncement.announcement_number,
        editForm
      );
      
      toastSuccess(extractApiMessage(response, 'Announcement updated successfully!'));
      setShowEditModal(false);
      setCurrentAnnouncement(null);
      loadAnnouncements();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to update announcement'));
    }
  };

  const handleDeleteAnnouncement = async () => {
    try {
      if (!announcementToDelete) return;
      
      const response = await apiService.deleteAnnouncement(
        selectedDate,
        announcementToDelete.announcement_number
      );
      
      toastSuccess(extractApiMessage(response, 'Announcement deleted successfully!'));
      setShowDeleteModal(false);
      setAnnouncementToDelete(null);
      loadAnnouncements();
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to delete announcement'));
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      announcement_type: 'academic',
      description: ''
    });
  };

  const openEditModal = (announcement: Announcement) => {
    setCurrentAnnouncement(announcement);
    setEditForm({
      description: announcement.description,
      announcement_type: announcement.announcement_type
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setShowDeleteModal(true);
  };

  const getAnnouncementTypeColor = (type: string) => {
    switch(type.toLowerCase()) {
      case 'academic':
        return theme === 'dark'
          ? 'bg-blue-900/20 text-blue-200 border border-blue-700/40'
          : 'bg-blue-50 text-blue-800 border border-blue-100';
      case 'exam':
        return theme === 'dark'
          ? 'bg-red-900/20 text-red-200 border border-red-700/40'
          : 'bg-red-50 text-red-800 border border-red-100';
      case 'general':
        return theme === 'dark'
          ? 'bg-emerald-900/20 text-emerald-200 border border-emerald-700/40'
          : 'bg-emerald-50 text-emerald-800 border border-emerald-100';
      default:
        return theme === 'dark'
          ? 'bg-gray-800/40 text-gray-200 border border-gray-700/40'
          : 'bg-gray-50 text-gray-800 border border-gray-200';
    }
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  if (loading) {
    return (
      <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className={combine(getCardGradientClass('indigo'), 'text-center py-10 sm:py-12')}>
            <FaSpinner className={combine('animate-spin text-4xl sm:text-5xl mx-auto mb-4', get('accent', 'primary'))} />
            <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>Loading Announcements</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      
      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          {/* Background overlay */}
          <div 
            className={combine('fixed inset-0 transition-opacity', theme === 'dark' ? 'bg-black/70' : 'bg-gray-500/75')}
            onClick={() => setShowCreateModal(false)}
          ></div>

          {/* Modal panel */}
          <div className={combine(
            'relative z-10 w-full max-w-lg rounded-2xl text-left overflow-hidden shadow-xl transform transition-all border',
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>Create Announcement</h2>
                  <button 
                    onClick={() => setShowCreateModal(false)}
                    className={combine('transition-colors', get('text', 'muted'), 'hover:opacity-80')}
                  >
                    <FaTimesCircle className="text-2xl" />
                  </button>
                </div>

                <div className="space-y-4">
                  {announcementScope === 'class' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                          Class
                        </label>
                        <input
                          type="text"
                          value={profile?.class_name ? `Class ${profile.class_name}` : 'Not Assigned'}
                          className={combine(getInputClass(), 'cursor-not-allowed opacity-75')}
                          disabled
                        />
                      </div>
                      
                      <div>
                        <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                          Section
                        </label>
                        <input
                          type="text"
                          value={profile?.section_name ? `Section ${profile.section_name}` : 'Not Assigned'}
                          className={combine(getInputClass(), 'cursor-not-allowed opacity-75')}
                          disabled
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                            Class *
                          </label>
                          <select
                            value={subjectClass}
                            onChange={(e) => handleSubjectClassChange(e.target.value)}
                            className={getInputClass()}
                          >
                            <option value="">Select Class</option>
                            {availableClasses.map(cls => (
                              <option key={cls} value={cls}>Class {cls}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                            Section *
                          </label>
                          <select
                            value={subjectSection}
                            onChange={(e) => handleSubjectSectionChange(e.target.value)}
                            className={getInputClass()}
                          >
                            <option value="">Select Section</option>
                            {availableSections.map(sec => (
                              <option key={sec} value={sec}>Section {sec}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                          Subject *
                        </label>
                        <select
                          value={subjectName}
                          onChange={(e) => handleSubjectNameChange(e.target.value)}
                          className={getInputClass()}
                        >
                          <option value="">Select Subject</option>
                          {availableSubjects.map((subject) => (
                            <option key={subject.name} value={subject.name}>
                              {subject.name} ({subject.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                      Announcement Type *
                    </label>
                    <select
                      value={createForm.announcement_type}
                      onChange={(e) => setCreateForm({...createForm, announcement_type: e.target.value})}
                      className={getInputClass()}
                    >
                      <option value="academic">Academic</option>
                      <option value="exam">Exam</option>
                      <option value="general">General</option>
                      <option value="holiday">Holiday</option>
                      <option value="event">Event</option>
                    </select>
                  </div>

                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                      Description *
                    </label>
                    <textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({...createForm, description: e.target.value})}
                      className={combine(getInputClass(), 'h-32')}
                      placeholder="Enter announcement details..."
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={combine(get('bg', 'secondary'), 'px-6 py-4 flex gap-3 border-t', get('border', 'secondary'))}>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className={combine(getSecondaryButtonClass(), 'flex-1 justify-center')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateAnnouncement}
                  className={combine(getPrimaryButtonClass(), 'flex-1 justify-center')}
                >
                  Post Announcement
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Edit Announcement Modal */}
      {showEditModal && currentAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div 
            className={combine('fixed inset-0 transition-opacity', theme === 'dark' ? 'bg-black/70' : 'bg-gray-500/75')}
            onClick={() => setShowEditModal(false)}
          ></div>

          <div className={combine(
            'relative z-10 w-full max-w-lg rounded-2xl text-left overflow-hidden shadow-xl transform transition-all border',
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
              <div className="px-6 pt-6 pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h2 className={combine('text-lg sm:text-xl font-bold', get('text', 'primary'))}>Edit Announcement</h2>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className={combine('transition-colors', get('text', 'muted'), 'hover:opacity-80')}
                  >
                    <FaTimesCircle className="text-2xl" />
                  </button>
                </div>

                <div className={combine(get('bg', 'secondary'), 'mb-4 p-3 rounded-lg border', get('border', 'secondary'))}>
                  <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    <p><strong>Class:</strong> {currentAnnouncement.class_name}-{currentAnnouncement.section_name}</p>
                    {currentAnnouncement.subject_name && (
                      <p><strong>Subject:</strong> {currentAnnouncement.subject_name}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                      Announcement Type
                    </label>
                    <select
                      value={editForm.announcement_type || 'academic'}
                      onChange={(e) => setEditForm({...editForm, announcement_type: e.target.value})}
                      className={getInputClass()}
                    >
                      <option value="academic">Academic</option>
                      <option value="exam">Exam</option>
                      <option value="general">General</option>
                      <option value="holiday">Holiday</option>
                      <option value="event">Event</option>
                    </select>
                  </div>

                  <div>
                    <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                      Description *
                    </label>
                    <textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                      className={combine(getInputClass(), 'h-32')}
                      placeholder="Enter announcement details..."
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={combine(get('bg', 'secondary'), 'px-6 py-4 flex gap-3 border-t', get('border', 'secondary'))}>
                <button
                  onClick={() => setShowEditModal(false)}
                  className={combine(getSecondaryButtonClass(), 'flex-1 justify-center')}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateAnnouncement}
                  className={combine(getSuccessButtonClass(), 'flex-1 justify-center')}
                >
                  Update Announcement
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && announcementToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div 
            className={combine('fixed inset-0 transition-opacity', theme === 'dark' ? 'bg-black/70' : 'bg-gray-500/75')}
            onClick={() => setShowDeleteModal(false)}
          ></div>

          <div className={combine(
            'relative z-10 w-full max-w-lg rounded-2xl text-left overflow-hidden shadow-xl transform transition-all border',
            get('bg', 'card'),
            get('border', 'secondary')
          )}>
              <div className="px-6 pt-6 pb-4">
                <div className="text-center">
                  <div className={combine(
                    'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 border',
                    theme === 'dark' ? 'bg-red-900/20 border-red-700/40' : 'bg-red-50 border-red-100'
                  )}>
                    <FaExclamationTriangle className={combine(theme === 'dark' ? 'text-red-200' : 'text-red-600', 'text-2xl')} />
                  </div>
                  
                  <h2 className={combine('text-lg sm:text-xl font-bold mb-2', get('text', 'primary'))}>Delete Announcement</h2>
                  <p className={combine('text-xs sm:text-sm mb-6', get('text', 'secondary'))}>
                    Are you sure you want to delete this announcement? This action cannot be undone.
                  </p>

                  <div className={combine(get('bg', 'secondary'), 'mb-6 p-4 rounded-lg text-left border', get('border', 'secondary'))}>
                    <p className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>
                      {announcementToDelete.description.substring(0, 100)}...
                    </p>
                    <p className={combine('text-xs sm:text-sm mt-2', get('text', 'secondary'))}>
                      Class: {announcementToDelete.class_name}-{announcementToDelete.section_name} • 
                      Posted by: {announcementToDelete.posted_by}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className={combine(getSecondaryButtonClass(), 'flex-1 justify-center')}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAnnouncement}
                      className={combine(
                        'flex-1 justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
                        theme === 'dark'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                          : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                      )}
                    >
                      Delete Announcement
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
  <div className={combine(
    'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
    theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-gradient-to-r from-blue-600 to-indigo-700'
  )}>
    <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
          <FaBullhorn className="text-2xl sm:text-3xl" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Announcements</h1>
          <p className="text-xs sm:text-sm text-blue-100">
            {profile ? `Teacher - ${profile.name}` : 'Loading profile...'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
        <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm text-blue-100">
          <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm">
            <FaBook />
            {announcementScope === 'class' ? 'Class Announcements' : 'Subject Announcements'}
          </span>
          {announcementScope === 'class' && profile?.class_name && profile?.section_name && (
            <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 rounded-xl sm:rounded-2xl border border-white/20 backdrop-blur-sm">
              <FaUsers />
              <span className="truncate">Class {profile.class_name}-{profile.section_name}</span>
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className={combine(getInputClass(), 'w-auto')}
          />
          <button
            onClick={() => {
              resetCreateForm();
              setShowCreateModal(true);
            }}
            className={combine(getSuccessButtonClass(), 'whitespace-nowrap flex items-center gap-2')}
          >
            <FaPlus />
            Create
          </button>
        </div>
      </div>
    </div>
  </div>
</div>

        {/* Announcement Category Selection */}
        <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className={combine('text-base sm:text-lg font-semibold mb-1', get('text', 'primary'))}>Announcement Category</h2>
              <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                Choose between class and subject announcements
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => hasSubjectAllocations && setAnnouncementScope('subject')}
                className={combine(
                  'px-4 py-2 rounded-lg sm:rounded-xl flex items-center gap-2 transition-all border text-xs sm:text-sm font-medium',
                  announcementScope === 'subject'
                    ? (theme === 'dark' ? 'bg-blue-900/20 text-blue-200 border-blue-700/40' : 'bg-blue-50 text-blue-700 border-blue-200')
                    : combine(get('bg', 'card'), get('text', 'secondary'), get('border', 'secondary')),
                  !hasSubjectAllocations ? 'opacity-60 cursor-not-allowed' : ''
                )}
                disabled={!hasSubjectAllocations}
              >
                <FaBook /> Subject Announcements
              </button>
              
              {hasAssignedClass && (
                <button
                  onClick={() => setAnnouncementScope('class')}
                  className={combine(
                    'px-4 py-2 rounded-lg sm:rounded-xl flex items-center gap-2 transition-all border text-xs sm:text-sm font-medium',
                    announcementScope === 'class'
                      ? (theme === 'dark' ? 'bg-purple-900/20 text-purple-200 border-purple-700/40' : 'bg-purple-50 text-purple-700 border-purple-200')
                      : combine(get('bg', 'card'), get('text', 'secondary'), get('border', 'secondary'))
                  )}
                >
                  <FaUsers /> Class Announcements
                </button>
              )}
            </div>
          </div>

          {/* Subject Announcement Selection */}
          {announcementScope === 'subject' && hasSubjectAllocations && (
            <div className={combine(getSoftCardClass(), 'mt-4')}>
               
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <select
                    value={subjectClass}
                    onChange={(e) => {
                      handleSubjectClassChange(e.target.value);
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                    {availableClasses.map(cls => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>

                  <select
                    value={subjectSection}
                    onChange={(e) => {
                      handleSubjectSectionChange(e.target.value);
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Section</option>
                    {availableSections.map(sec => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>

                  <select
                    value={subjectName}
                    onChange={(e) => {
                      handleSubjectNameChange(e.target.value);
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Subject</option>
                    {availableSubjects.map((subject) => (
                      <option key={subject.name} value={subject.name}>
                        {subject.name} ({subject.code})
                      </option>
                    ))}
                  </select>
                </div>
            </div>
          )}

          {!hasSubjectAllocations && announcementScope === 'subject' && (
            <div className={combine(getSoftCardClass(), 'mt-4')}>
              <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                No subject allocations found for your profile. Please contact the administration.
              </div>
            </div>
          )}

          {/* Class Announcement Info */}
          {announcementScope === 'class' && profile?.class_name && profile?.section_name && (
            <div className={combine(getSoftCardClass(), 'mt-4')}>
              <div className="flex items-center gap-3">
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border', get('border', 'secondary'))}>
                  <FaUsers className={combine(theme === 'dark' ? 'text-purple-200' : 'text-purple-700')} />
                </div>
                <div>
                  <h3 className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>Class Announcement View</h3>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    Viewing announcements for Class {profile.class_name}-{profile.section_name}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs Navigation */}
        <div className={combine(
          'flex space-x-1 p-1 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 border shadow-lg',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <button
            onClick={() => setActiveTab('noticeBoard')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'noticeBoard'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaEye /> Notice Board
          </button>

          <button
            onClick={() => setActiveTab('myPosts')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'myPosts'
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaEdit /> My Posts
          </button>
        </div>

        {/* Announcements List */}
        <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>
                {activeTab === 'noticeBoard' ? 'All Announcements' : 'My Announcements'}
              </h2>
              <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={loadAnnouncements}
                className={combine(getSecondaryButtonClass(), 'px-3 py-2 sm:py-3 flex items-center justify-center')}
                title="Refresh"
              >
                <FaSync />
              </button>
              <span className={combine(
                'px-3 py-1 rounded-full text-xs sm:text-sm font-medium border',
                get('border', 'secondary'),
                get('bg', 'card'),
                get('text', 'secondary')
              )}>
                {getFilteredAnnouncements().length} Announcements
              </span>
            </div>
          </div>

          {getFilteredAnnouncements().length === 0 ? (
            <div className="text-center py-10 sm:py-12">
              <div className={combine(get('bg', 'secondary'), 'mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 border', get('border', 'secondary'))}>
                {activeTab === 'myPosts' ? (
                  <FaEdit className={combine(get('text', 'muted'), 'text-2xl')} />
                ) : (
                  <FaBullhorn className={combine(get('text', 'muted'), 'text-2xl')} />
                )}
              </div>
              <h3 className={combine('text-sm sm:text-base font-medium mb-2', get('text', 'primary'))}>No Announcements</h3>
              <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                No announcements found for {selectedDate}{subjectName ? ` (${subjectName})` : ''}
              </p>
              <p className={combine('text-xs sm:text-sm mt-2', get('text', 'muted'))}>
                {activeTab === 'myPosts' 
                  ? 'Create your first announcement using the "Create Announcement" button'
                  : 'Try selecting a different date or check back later'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {getFilteredAnnouncements().map((announcement, index) => (
                <AnnouncementCard
                  key={announcement.announcement_number}
                  announcement={announcement}
                  index={index}
                  activeTab={activeTab}
                  formatTime={formatTime}
                  getAnnouncementTypeColor={getAnnouncementTypeColor}
                  onEdit={openEditModal}
                  onDelete={openDeleteModal}
                  isOwner={activeTab === 'myPosts' || announcement.posted_by === profile?.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-component for Announcement Card
const AnnouncementCard = ({
  announcement,
  index,
  activeTab,
  formatTime,
  getAnnouncementTypeColor,
  onEdit,
  onDelete,
  isOwner
}: any) => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 hover:shadow-xl',
      get('bg', 'card'),
      get('border', 'secondary')
    )}>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          {/* Header with subject and type */}
          <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className={combine(
                'px-3 py-1 rounded-full text-xs font-medium',
                getAnnouncementTypeColor(announcement.announcement_type)
              )}>
                {announcement.announcement_type.toUpperCase()}
              </span>
              
              {announcement.subject_name && announcement.subject_name !== 'General' && (
                <span className={combine(
                  'px-3 py-1 rounded-full text-xs font-medium border inline-flex items-center gap-1',
                  get('border', 'secondary'),
                  theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-700'
                )}>
                  <FaBook className="inline mr-1" /> {announcement.subject_name}
                </span>
              )}
            </div>
            
            <span className={combine(
              'px-3 py-1 rounded-full text-xs border sm:ml-auto',
              get('border', 'secondary'),
              get('bg', 'secondary'),
              get('text', 'secondary')
            )}>
              Class {announcement.class_name}-{announcement.section_name}
            </span>
          </div>

          {/* Description */}
          <div className="mb-3">
            <div className={combine(get('text', 'secondary'), 'text-xs sm:text-sm leading-relaxed', !expanded ? 'line-clamp-2' : '')}>
              {announcement.description}
            </div>
            {announcement.description.length > 150 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={combine('text-xs sm:text-sm font-medium mt-2 flex items-center gap-1 hover:opacity-90', get('accent', 'primary'))}
              >
                {expanded ? (
                  <>
                    <FaChevronUp className="text-xs" /> Show Less
                  </>
                ) : (
                  <>
                    <FaChevronDown className="text-xs" /> Read More
                  </>
                )}
              </button>
            )}
          </div>

          {/* Footer info */}
          <div className={combine('flex flex-wrap items-center gap-4 text-xs sm:text-sm', get('text', 'muted'))}>
            <span className="flex items-center gap-1">
              <FaUserTie className="text-xs" /> {announcement.posted_by}
            </span>
            <span className="flex items-center gap-1">
              <FaCalendarAlt className="text-xs" /> {formatTime(announcement.posted_time)}
            </span>
            <span className={combine('text-xs px-2 py-1 rounded-lg border', get('border', 'secondary'), get('bg', 'secondary'))}>
              #{announcement.announcement_number}
            </span>
          </div>
        </div>

        {/* Actions for my posts */}
        {activeTab === 'myPosts' && isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(announcement)}
              className={combine(
                'p-2 rounded-lg transition-colors border',
                get('border', 'secondary'),
                theme === 'dark' ? 'bg-blue-900/20 text-blue-200 hover:bg-blue-900/30' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              )}
              title="Edit"
            >
              <FaEdit />
            </button>
            <button
              onClick={() => onDelete(announcement)}
              className={combine(
                'p-2 rounded-lg transition-colors border',
                get('border', 'secondary'),
                theme === 'dark' ? 'bg-red-900/20 text-red-200 hover:bg-red-900/30' : 'bg-red-50 text-red-700 hover:bg-red-100'
              )}
              title="Delete"
            >
              <FaTrash />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
