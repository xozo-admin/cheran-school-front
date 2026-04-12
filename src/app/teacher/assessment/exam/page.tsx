'use client';

import React, { useState, useEffect } from 'react';
import {
  FaUpload, FaEdit, FaCalendarAlt, FaFilter,
  FaCheckCircle, FaTimesCircle, FaSpinner, FaExclamationTriangle,
  FaChartBar, FaClipboardCheck, FaBook, FaPlus, FaTrash,
  FaPaperPlane, FaEye, FaPercent, FaUsers, FaChartLine,
  FaSortAmountDown, FaSortAmountUp, FaDownload, FaUserGraduate,
  FaFileUpload, FaTable, FaUserCheck, FaCalendarDay, FaInfoCircle,
  FaCalendarCheck, FaClock
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { teacherApi } from '@/lib/api';
import { toastError, toastLoading, toastSuccess, toastUpdateError, toastUpdateSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// Teacher profile interface
interface TeacherProfile {
  id: number;
  name: string;
  email: string;
  teacher_id: string;
  role: 'subject_teacher' | 'class_teacher' | 'admin';
  // Backend `teacher/profile/` currently provides handled subjects as:
  // { [subjectName]: { [className]: [sectionName, ...] } }
  handled_subjects?: Record<string, Record<string, string[]>>;
  class_name?: string | null;
  section_name?: string | null;
  assigned_class?: string;

  // Legacy/alternate shapes (keep optional for compatibility)
  subjects_taught?: Array<{
    subject: string;
    classes: string[];
    sections: string[];
  }>;
  classes_assigned?: Array<{
    class: string;
    section: string;
    subject?: string;
  }>;
}

interface ExamSchedule {
  exam_type: string;
  term: string;
  subject: string;
  exam_date?: string;
  session?: string;
  duration?: string;
  standard?: string;
  sections?: string[];
  display_text?: string;
}

interface StudentMarks {
  student_id: string;
  marks: number;
  student_name?: string;
  status?: string;
}

interface EditRequest {
  student_id: string;
  term: string;
  exam_type: string;
  subject: string;
  marks: number;
  reason: string;
}

interface SubjectAnalysisResponse {
  exam: string;
  class: string;
  subject: string;
  stats: {
    total_students: number;
    pass_percentage: string;
    grade_distribution: { [key: string]: number };
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

interface ExamDropdownItem {
  id: number;
  name: string;
  term: number;
  term_name: string;
  max_marks: number;
  rank: number;
}

interface Student {
  student_id: string;
  name?: string;
  student_name?: string;
  roll_number?: string;
  email?: string;
  phone?: string;
  marks?: number;
  existing_marks?: number;
  grade?: string;
  mark?: number;
  total?: number;
  status?: string;
  raw_marks?: number | null;
  is_assigned?: boolean;
}

interface StudentListResponse {
  status: number;
  class: string;
  subject: string;
  exam: string;
  academic_year: string;
  data: Array<{
    student_id: string;
    name: string;
    marks: number | null;
  }>;
}

export default function ExamMarksPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

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

  const getSoftCardClass = () => combine(
    'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-colors duration-200',
    get('bg', 'secondary'),
    get('border', 'secondary')
  );

  const summarizeList = (values: string[], max = 2) => {
    const cleaned = values.map((value) => value.trim()).filter(Boolean);
    if (cleaned.length === 0) return '—';
    if (cleaned.length <= max) return cleaned.join(', ');
    return `${cleaned.slice(0, max).join(', ')} +${cleaned.length - max}`;
  };

  const getTeacherClassList = () => {
    const classes = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.values(teacherProfile.handled_subjects).forEach((classMap) => {
        if (!classMap || typeof classMap !== 'object') return;
        Object.keys(classMap).forEach((cls) => cls && classes.add(cls));
      });
    }
    if (teacherProfile?.class_name) classes.add(teacherProfile.class_name);
    availableClasses.forEach((cls) => cls && classes.add(cls));
    return Array.from(classes).sort();
  };

  const getTeacherSectionList = () => {
    const sections = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.values(teacherProfile.handled_subjects).forEach((classMap) => {
        if (!classMap || typeof classMap !== 'object') return;
        Object.values(classMap).forEach((sectionList) => {
          if (!Array.isArray(sectionList)) return;
          sectionList.forEach((sec) => sec && sections.add(sec));
        });
      });
    }
    if (teacherProfile?.section_name) sections.add(teacherProfile.section_name);
    availableSections.forEach((sec) => sec && sections.add(sec));
    return Array.from(sections).sort();
  };

  const getTeacherSubjectList = () => {
    const subjects = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.keys(teacherProfile.handled_subjects).forEach((subject) => subject && subjects.add(subject));
    }
    availableSubjects.forEach((subject) => subject && subjects.add(subject));
    return Array.from(subjects).sort();
  };

  // State for teacher profile
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);

  // State for filters
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    term: '',
    exam_type: '',
    subject: ''
  });

  // State for data
  const [examSchedules, setExamSchedules] = useState<ExamSchedule[]>([]);
  const [examDropdown, setExamDropdown] = useState<ExamDropdownItem[]>([]);

  // State for categorized exams
  const [todayExams, setTodayExams] = useState<ExamSchedule[]>([]);
  const [upcomingExams, setUpcomingExams] = useState<ExamSchedule[]>([]);
  const [finishedExams, setFinishedExams] = useState<ExamSchedule[]>([]);

  // State for available filters
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [availableExamTypes, setAvailableExamTypes] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  // State for marks management
  const [studentsList, setStudentsList] = useState<Student[]>([]);
  const [marksData, setMarksData] = useState<StudentMarks[]>([]);
  const [maxMarks, setMaxMarks] = useState<number>(100);
  const [uploading, setUploading] = useState(false);

  // State for subject analysis
  const [subjectAnalysis, setSubjectAnalysis] = useState<SubjectAnalysisResponse | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // State for edit requests
  const [editRequest, setEditRequest] = useState<EditRequest>({
    student_id: '',
    term: '',
    exam_type: '',
    subject: '',
    marks: 0,
    reason: ''
  });

  // State for view
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'schedule' | 'marks'>('schedule');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'student_id', direction: 'asc' });

  // Fetch teacher profile and initial data
  useEffect(() => {
    fetchTeacherProfile();
    fetchCombinedExams(); // Replace fetchExamDropdown with this
  }, []);


  useEffect(() => {
    fetchExamSchedules(); // This will now handle all filter options
  }, []);


  const fetchCombinedExams = async () => {
    try {
      setLoading(true);

      // Fetch both APIs in parallel
      const [dropdownResponse, scheduleResponse] = await Promise.all([
        teacherApi.exams.list(),
        teacherApi.exams.teacherSchedule(),
      ]);

      let examDropdownData: ExamDropdownItem[] = [];
      let examSchedulesData: ExamSchedule[] = [];
      let allExams: ExamSchedule[] = [];

      // Process dropdown data (all created exams)
      if (dropdownResponse?.data) {
        const dropdownData = resolveApiPayload<ExamDropdownItem[]>(dropdownResponse.data);
        examDropdownData = dropdownData;
        setExamDropdown(dropdownData);

        // Extract terms from dropdown
        const terms = new Set<string>();
        dropdownData.forEach(item => terms.add(item.term_name));
        setAvailableTerms(Array.from(terms));
      }

      // Process schedule data (exams scheduled for this teacher)
      if (scheduleResponse?.data) {
        const scheduleData: any = resolveApiPayload<any>(scheduleResponse.data);
        console.log('Scheduled exams for teacher:', scheduleData);

        let schedules: ExamSchedule[] = [];
        if (scheduleData.scheduled_exams) {
          schedules = scheduleData.scheduled_exams;
        } else if (scheduleData.data) {
          schedules = scheduleData.data;
        }

        examSchedulesData = schedules;
        setExamSchedules(schedules);

        // Add all scheduled exams to display
        allExams = [...schedules];
      }

      // Now identify unscheduled exams (created but not scheduled for this teacher)
      if (examDropdownData.length > 0) {
        const unscheduledExams: ExamSchedule[] = [];

        examDropdownData.forEach(dropdownItem => {
          // Check if this exam is already in scheduled exams
          const isScheduled = examSchedulesData.some(scheduledExam =>
            scheduledExam.exam_type === dropdownItem.name &&
            scheduledExam.term === dropdownItem.term_name
          );

          if (!isScheduled) {
            // This exam is created but not scheduled for this teacher
            unscheduledExams.push({
              exam_type: dropdownItem.name,
              term: dropdownItem.term_name,
              subject: 'Not assigned yet', // Will be populated if teacher has subject
              exam_date: undefined,
              session: undefined,
              duration: undefined,
              standard: undefined,
              sections: undefined,
              display_text: `${dropdownItem.name} (${dropdownItem.term_name}) - Not Scheduled`
            });
          }
        });

        // Combine scheduled and unscheduled exams
        allExams = [...allExams, ...unscheduledExams];

        // For unscheduled exams, try to enrich using teacher handled subjects/classes
        if (teacherProfile) {
          allExams = allExams.map(exam => {
            if (exam.subject !== 'Not assigned yet') return exam;

            // Prefer backend `handled_subjects` shape
            if (teacherProfile.handled_subjects && typeof teacherProfile.handled_subjects === 'object') {
              const subjectNames = Object.keys(teacherProfile.handled_subjects).filter(Boolean);
              const subjectName = subjectNames[0];
              const classMap = subjectName ? teacherProfile.handled_subjects[subjectName] : undefined;
              const classNames = classMap && typeof classMap === 'object' ? Object.keys(classMap).filter(Boolean) : [];
              const className = classNames[0];
              const sectionList = className && classMap ? classMap[className] : undefined;
              const sections = Array.isArray(sectionList) ? sectionList : undefined;

              if (subjectName) {
                return {
                  ...exam,
                  subject: subjectName,
                  standard: className || undefined,
                  sections,
                  display_text: exam.display_text?.replace('Not assigned yet', subjectName) ||
                    `${exam.exam_type} (${exam.term}) - ${subjectName} - Not Scheduled`
                };
              }
            }

            // Fallback legacy shape: subjects_taught
            if (teacherProfile.subjects_taught && teacherProfile.subjects_taught.length > 0) {
              const subject = teacherProfile.subjects_taught.find(s => s.subject) || teacherProfile.subjects_taught[0];
              return {
                ...exam,
                subject: subject.subject,
                standard: subject.classes?.[0] || undefined,
                sections: subject.sections || undefined,
                display_text: exam.display_text?.replace('Not assigned yet', subject.subject) ||
                  `${exam.exam_type} (${exam.term}) - ${subject.subject} - Not Scheduled`
              };
            }

            return exam;
          });
        }
      }

      // Categorize all exams
      categorizeExams(allExams);
      extractExamTypesFromSchedules(allExams);

      toastSuccess(`Loaded ${allExams.length} exams (${examSchedulesData.length} scheduled)`);

    } catch (err: any) {
      console.error('Error fetching combined exams:', err);
      toastError(extractApiError(err, 'Failed to load exam data'));
    } finally {
      setLoading(false);
    }
  };

  // Fetch teacher profile
  const fetchTeacherProfile = async () => {
    try {
      const response = await teacherApi.profile.get();
      if (response?.data) {
        const data = resolveApiPayload<TeacherProfile>(response.data);
        setTeacherProfile(data);

        // Extract classes/sections/subjects from profile
        const classes = new Set<string>();
        const subjects = new Set<string>();
        const sections = new Set<string>();

        // New backend shape: handled_subjects
        if (data.handled_subjects && typeof data.handled_subjects === 'object') {
          Object.entries(data.handled_subjects).forEach(([subjectName, classMap]) => {
            if (subjectName) subjects.add(subjectName);
            if (!classMap || typeof classMap !== 'object') return;

            Object.entries(classMap).forEach(([className, sectionList]) => {
              if (className) classes.add(className);
              if (Array.isArray(sectionList)) {
                sectionList.forEach((sec) => {
                  if (sec) sections.add(sec);
                });
              }
            });
          });
        }

        // Legacy/alternate shape: subjects_taught
        if (data.subjects_taught && Array.isArray(data.subjects_taught)) {
          data.subjects_taught.forEach(subject => {
            if (subject?.subject) subjects.add(subject.subject);
            if (Array.isArray(subject?.classes)) subject.classes.forEach(cls => cls && classes.add(cls));
            if (Array.isArray(subject?.sections)) subject.sections.forEach(sec => sec && sections.add(sec));
          });
        }

        if (data.classes_assigned) {
          data.classes_assigned.forEach(cls => {
            if (cls.class) classes.add(cls.class);
            if (cls.section) sections.add(cls.section);
            if (cls.subject) subjects.add(cls.subject);
          });
        }

        // Class teacher assignment (if present)
        if (data.class_name) classes.add(data.class_name);
        if (data.section_name) sections.add(data.section_name);

        setAvailableClasses(Array.from(classes).sort());
        setAvailableSubjects(Array.from(subjects).sort());
        setAvailableSections(Array.from(sections).sort());
      }
    } catch (err: any) {
      console.error('Error fetching teacher profile:', err);
      toastError(extractApiError(err, 'Failed to load teacher profile'));
    }
  };

  // Fetch exam dropdown list
  const fetchExamDropdown = async () => {
    try {
      const response = await teacherApi.exams.list();
      if (response?.data) {
        const data = resolveApiPayload<ExamDropdownItem[]>(response.data);
        setExamDropdown(data);

        // Extract additional terms from dropdown (if not already in scheduled exams)
        const additionalTerms = new Set<string>();
        data.forEach(item => additionalTerms.add(item.term_name));

        // Merge with existing terms
        setAvailableTerms(prev => {
          const allTerms = new Set([...prev, ...Array.from(additionalTerms)]);
          return Array.from(allTerms).sort();
        });
      }
    } catch (err: any) {
      console.error('Error fetching exam dropdown:', err);
      toastError(extractApiError(err, 'Failed to load exams list'));
    }
  };



  // Fetch exam schedules
  const fetchExamSchedules = async () => {
    try {
      setLoading(true);
      const response = await teacherApi.exams.teacherSchedule();
      if (response?.data) {
        const data: any = resolveApiPayload<any>(response.data);
        console.log('Exam schedules:', data);

        let schedules: ExamSchedule[] = [];
        if (data.scheduled_exams) {
          schedules = data.scheduled_exams;
        } else if (data.data) {
          schedules = data.data;
        }

        setExamSchedules(schedules);
        categorizeExams(schedules);

        // Extract filter options from scheduled exams
        extractFilterOptions(schedules);

        // Also fetch exam dropdown for additional exam types
        fetchExamDropdown();
      } else {
        toastError('Failed to fetch exam schedules');
      }
    } catch (err: any) {
      console.error('Error fetching schedules:', err);
      toastError(extractApiError(err, 'Failed to load exam schedules'));
    } finally {
      setLoading(false);
    }
  };

  const extractFilterOptions = (schedules: ExamSchedule[]) => {
    const classes = new Set<string>();
    const sections = new Set<string>();
    const subjects = new Set<string>();
    const examTypes = new Set<string>();
    const terms = new Set<string>();

    schedules.forEach((schedule: ExamSchedule) => {
      // Extract class
      if (schedule.standard) {
        classes.add(schedule.standard);
      }

      // Extract sections
      if (schedule.sections && schedule.sections.length > 0) {
        schedule.sections.forEach(section => sections.add(section));
      }

      // Extract subject
      if (schedule.subject) {
        subjects.add(schedule.subject);
      }

      // Extract exam type
      if (schedule.exam_type) {
        examTypes.add(schedule.exam_type);
      }

      // Extract term
      if (schedule.term) {
        terms.add(schedule.term);
      }
    });


    // Merge (don't overwrite profile-derived options with empty sets)
    setAvailableClasses(prev => Array.from(new Set([...prev, ...Array.from(classes)])).sort());
    setAvailableSections(prev => Array.from(new Set([...prev, ...Array.from(sections)])).sort());
    setAvailableSubjects(prev => Array.from(new Set([...prev, ...Array.from(subjects)])).sort());
    setAvailableExamTypes(prev => Array.from(new Set([...prev, ...Array.from(examTypes)])).sort());
    setAvailableTerms(prev => Array.from(new Set([...prev, ...Array.from(terms)])).sort());

    console.log('Filter options extracted:', {
      classes: Array.from(classes),
      sections: Array.from(sections),
      subjects: Array.from(subjects),
      examTypes: Array.from(examTypes),
      terms: Array.from(terms)
    });
  };





  // Categorize exams into today, upcoming, and finished
  const categorizeExams = (schedules: ExamSchedule[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayExamsList: ExamSchedule[] = [];
    const upcomingExamsList: ExamSchedule[] = [];
    const finishedExamsList: ExamSchedule[] = [];
    const unscheduledExamsList: ExamSchedule[] = [];

    schedules.forEach((schedule: any) => {
      // Check if it's an unscheduled exam
      const isUnscheduled = !schedule.exam_date ||
        schedule.display_text?.includes('Not Scheduled') ||
        schedule.exam_date === 'TBD';

      if (isUnscheduled) {
        unscheduledExamsList.push(schedule);
        return;
      }

      // For scheduled exams, check the date
      try {
        const examDate = new Date(schedule.exam_date);
        examDate.setHours(0, 0, 0, 0);

        if (examDate.getTime() === today.getTime()) {
          todayExamsList.push(schedule);
        } else if (examDate > today) {
          upcomingExamsList.push(schedule);
        } else {
          finishedExamsList.push(schedule);
        }
      } catch (error) {
        console.error('Error parsing date:', schedule.exam_date);
        // If date is invalid, treat as unscheduled
        unscheduledExamsList.push({
          ...schedule,
          display_text: `${schedule.display_text} (Invalid Date)`
        });
      }
    });

    setTodayExams(todayExamsList);
    setUpcomingExams([...upcomingExamsList, ...unscheduledExamsList]); // Show unscheduled in upcoming
    setFinishedExams(finishedExamsList);

    // You can also show unscheduled separately if you want
    console.log('Unscheduled exams:', unscheduledExamsList);
  };

  // Extract exam types from schedules
  const extractExamTypesFromSchedules = (schedules: ExamSchedule[]) => {
    const examTypes = new Set<string>();
    schedules.forEach(schedule => {
      if (schedule.exam_type) examTypes.add(schedule.exam_type);
    });
    setAvailableExamTypes(Array.from(examTypes));
  };

  const getSectionsForClass = () => {
    if (!filters.class) return availableSections;

    const sections = new Set<string>();

    // Prefer teacher handled subjects map (same shape used in /teacher/subject/assignments)
    if (teacherProfile?.handled_subjects) {
      Object.values(teacherProfile.handled_subjects).forEach((classMap) => {
        if (!classMap || typeof classMap !== 'object') return;
        const sectionList = classMap[filters.class];
        if (Array.isArray(sectionList)) sectionList.forEach((sec) => sec && sections.add(sec));
      });
    }

    // Also include from scheduled exams
    examSchedules.forEach(schedule => {
      if (schedule.standard === filters.class && schedule.sections) {
        schedule.sections.forEach(section => section && sections.add(section));
      }
    });

    // Fallback: keep any previously-known sections
    availableSections.forEach((sec) => sec && sections.add(sec));

    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = () => {
    if (!filters.class || !filters.section) return [];

    const subjects = new Set<string>();

    if (teacherProfile?.handled_subjects) {
      Object.entries(teacherProfile.handled_subjects).forEach(([subjectName, classMap]) => {
        const sectionList = classMap?.[filters.class];
        if (Array.isArray(sectionList) && sectionList.includes(filters.section)) {
          subjects.add(subjectName);
        }
      });
    }

    examSchedules.forEach((schedule) => {
      if (schedule.standard !== filters.class) return;
      if (!schedule.subject) return;
      if (Array.isArray(schedule.sections) && schedule.sections.includes(filters.section)) {
        subjects.add(schedule.subject);
      }
    });

    return Array.from(subjects).sort();
  };

  const getTermsForSelection = () => {
    if (!filters.class || !filters.section || !filters.subject) return availableTerms;

    const terms = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    examSchedules.forEach((schedule) => {
      if (schedule.standard !== filters.class) return;
      if (schedule.subject !== filters.subject) return;
      if (!schedule.term) return;
      if (Array.isArray(schedule.sections) && schedule.sections.includes(filters.section)) {
        // Only show completed exams (hide upcoming/unscheduled from filters)
        if (!schedule.exam_date) return;
        const examDate = new Date(schedule.exam_date);
        examDate.setHours(0, 0, 0, 0);
        if (Number.isNaN(examDate.getTime()) || examDate > today) return;
        terms.add(schedule.term);
      }
    });

    return Array.from(terms).sort();
  };

  const getExamTypesForSelection = () => {
    if (!filters.term) return [];

    const examTypes = new Set<string>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    examSchedules.forEach((schedule) => {
      if (filters.class && schedule.standard !== filters.class) return;
      if (filters.subject && schedule.subject !== filters.subject) return;
      if (schedule.term !== filters.term) return;
      if (filters.section && Array.isArray(schedule.sections) && !schedule.sections.includes(filters.section)) return;
      if (!schedule.exam_date) return;
      const examDate = new Date(schedule.exam_date);
      examDate.setHours(0, 0, 0, 0);
      if (Number.isNaN(examDate.getTime()) || examDate > today) return;
      if (schedule.exam_type) examTypes.add(schedule.exam_type);
    });

    return Array.from(examTypes).sort();
  };


  // Fetch subject analysis or marks list
  const fetchSubjectAnalysis = async () => {
    // Check if we have all required filters
    if (!filters.class || !filters.section || !filters.term || !filters.exam_type || !filters.subject) {
      toastError('Please select all filters (class, section, subject, term, exam type)');
      return;
    }

    await fetchMarksListWithFilters();
  };



  const fetchSubjectAnalysisWithFilters = async (currentFilters: typeof filters) => {
    try {
      setLoadingAnalysis(true);
      const response = await teacherApi.exams.subjectAnalysis({
        class: currentFilters.class,
        section: currentFilters.section,
        subject: currentFilters.subject,
        exam_type: currentFilters.exam_type,
        term: currentFilters.term,
      });

      if (response?.data) {
        const data = resolveApiPayload<SubjectAnalysisResponse>(response.data);
        console.log('Subject analysis data:', data);

        setSubjectAnalysis(data);

        // Prepare students list
        const studentsWithMarks = data.students.map((student) => ({
          student_id: student.student_id,
          name: student.name,
          student_name: student.name,
          roll_number: student.student_id,
          mark: student.mark,
          total: student.total,
          grade: student.grade,
          marks: student.mark,
          existing_marks: student.mark,
          status: student.mark >= (student.total * 0.4) ? 'pass' : 'fail'
        }));

        setStudentsList(studentsWithMarks);
        setMaxMarks(data.students[0]?.total || 100);

        const initialMarksData = data.students.map(student => ({
          student_id: student.student_id,
          marks: student.mark
        }));
        setMarksData(initialMarksData);

        toastSuccess(`Loaded marks for ${data.stats.total_students} students. Pass rate: ${data.stats.pass_percentage}`);

      } else if (response?.status === 404) {
        // If no analysis found, try to fetch marks list
        // await fetchMarksListWithFilters(currentFilters);
      } else {
        toastError('Failed to fetch subject analysis');
      }
    } catch (err: any) {
      console.error('Error fetching subject analysis:', err);
      toastError(extractApiError(err, 'Failed to load subject analysis'));
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const fetchMarksListWithFilters = async (): Promise<boolean> => {
    const toastId = toastLoading('Loading marks...');
    try {
      setLoadingAnalysis(true);
      const response = await teacherApi.exams.listMarks({
        class: filters.class,
        section: filters.section,
        subject: filters.subject,
        exam_type: filters.exam_type,
        term: filters.term,
      });

      if (response?.data) {
        const payload = response.data as any;
        const data: StudentListResponse = (() => {
          // Endpoint shape (as per backend): { status, class, subject, exam, academic_year, data: [...] }
          if (
            payload &&
            typeof payload === 'object' &&
            Array.isArray(payload.data) &&
            typeof payload.class === 'string' &&
            typeof payload.subject === 'string'
          ) {
            return payload as StudentListResponse;
          }

          // Wrapped shape: { status, data: { ...same shape... } }
          if (
            payload &&
            typeof payload === 'object' &&
            payload.data &&
            typeof payload.data === 'object' &&
            Array.isArray(payload.data.data)
          ) {
            return payload.data as StudentListResponse;
          }

          return resolveApiPayload<StudentListResponse>(payload);
        })();
        console.log('Marks list data:', data);

        if (!data || typeof data !== 'object' || !Array.isArray((data as any).data)) {
          throw new Error('Invalid marks response format');
        }

        // Process the marks list data
        processMarksListData(data);

        const missingCount = data.data.filter((s) => s.marks === null || s.marks === undefined).length;
        const uploadedCount = data.data.length - missingCount;

        if (data.data.length === 0) {
          toastUpdateSuccess(toastId, 'No students found for the selected filters.');
        } else if (uploadedCount === 0) {
          toastUpdateSuccess(toastId, `Loaded ${data.data.length} students. No marks uploaded yet.`);
        } else if (missingCount > 0) {
          toastUpdateSuccess(toastId, `Loaded marks for ${uploadedCount} students (${missingCount} pending).`);
        } else {
          toastUpdateSuccess(toastId, `Loaded marks for ${uploadedCount} students.`);
        }

        return true;
      } else if (response?.status === 404) {
        setSubjectAnalysis(null);
        setStudentsList([]);
        setMarksData([]);
        toastUpdateError(toastId, 'Requested data not found.');
        return false;
      } else {
        throw new Error('Failed to fetch marks list');
      }
    } catch (err: any) {
      console.error('Error fetching marks list:', err);
      const status = err?.response?.status;
      if (status === 404) {
        setSubjectAnalysis(null);
        setStudentsList([]);
        setMarksData([]);
        toastUpdateError(toastId, extractApiError(err, 'Requested data not found.'));
        return false;
      }
      if (status === 401) {
        toastUpdateError(toastId, 'Session expired. Please login again.');
        return false;
      }
      if (status === 403) {
        toastUpdateError(toastId, extractApiError(err, 'Access denied.'));
        return false;
      }
      toastUpdateError(toastId, extractApiError(err, 'Failed to load marks'));
      return false;
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const processMarksListData = (data: StudentListResponse) => {
    if (!Array.isArray(data?.data)) {
      throw new Error('Marks list is missing student records');
    }
    // Set max marks from exam dropdown
    const exam = examDropdown.find(e =>
      e.name === filters.exam_type && e.term_name === filters.term
    );
    const maxMarksValue = exam?.max_marks || 100;
    setMaxMarks(maxMarksValue);

    // Convert to students list
    const studentsWithMarks = data.data.map((student, index) => {
      const hasUploadedMarks = typeof student.marks === 'number' && Number.isFinite(student.marks);
      const marksValue = hasUploadedMarks ? (student.marks as number) : 0;
      const percentage = hasUploadedMarks ? (marksValue / maxMarksValue) * 100 : 0;
      const grade = hasUploadedMarks ? calculateGrade(percentage) : 'N/A';
      const isPass = hasUploadedMarks ? percentage >= 40 : false;

      return {
        student_id: student.student_id,
        name: student.name,
        student_name: student.name,
        roll_number: student.student_id,
        marks: marksValue,
        existing_marks: marksValue,
        mark: marksValue,
        raw_marks: student.marks,
        is_assigned: hasUploadedMarks,
        total: maxMarksValue,
        grade: grade,
        status: hasUploadedMarks ? (isPass ? 'pass' : 'fail') : 'pending',
        rank: index + 1,
        percentage: percentage
      };
    });

    setStudentsList(studentsWithMarks);

    // Prepare marks data for upload/edit
    const initialMarksData = data.data.map(student => ({
      student_id: student.student_id,
      marks: typeof student.marks === 'number' && Number.isFinite(student.marks) ? student.marks : 0
    }));
    setMarksData(initialMarksData);

    // Calculate statistics
    const stats = calculateStatistics(studentsWithMarks);

    // Create a subject analysis object for consistency
    const analysisData: SubjectAnalysisResponse = {
      exam: data.exam,
      class: data.class,
      subject: data.subject,
      stats: stats,
      students: studentsWithMarks.map(student => ({
        student_id: student.student_id,
        name: student.name,
        mark: student.marks,
        total: maxMarksValue,
        grade: student.grade
      }))
    };

    setSubjectAnalysis(analysisData);
  };


  const calculateGrade = (percentage: number): string => {
    if (percentage >= 90) return 'S';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    if (percentage >= 40) return 'E';
    return 'F';
  };

  const calculateStatistics = (students: any[]) => {
    const totalStudents = students.length;
    const passCount = students.filter(s => s.status === 'pass').length;
    const failCount = totalStudents - passCount;
    const passPercentage = totalStudents > 0 ? ((passCount / totalStudents) * 100).toFixed(1) + '%' : '0%';

    // Calculate grade distribution
    const gradeDistribution: { [key: string]: number } = {
      'S': 0, 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0
    };

    students.forEach(student => {
      if (student.grade in gradeDistribution) {
        gradeDistribution[student.grade]++;
      }
    });

    return {
      total_students: totalStudents,
      pass_percentage: passPercentage,
      grade_distribution: gradeDistribution,
      pass_count: passCount,
      fail_count: failCount
    };
  };

  const autoFillFiltersFromSchedule = (schedule: ExamSchedule) => {
    const newFilters = {
      class: schedule.standard || '',
      section: schedule.sections && schedule.sections.length > 0 ? schedule.sections[0] : '',
      term: schedule.term || '',
      exam_type: schedule.exam_type || '',
      subject: schedule.subject || ''
    };

    setFilters(newFilters);

    // Also update available exam types and subjects based on the schedule
    if (schedule.exam_type && !availableExamTypes.includes(schedule.exam_type)) {
      setAvailableExamTypes(prev => [...prev, schedule.exam_type]);
    }

    if (schedule.subject && !availableSubjects.includes(schedule.subject)) {
      setAvailableSubjects(prev => [...prev, schedule.subject]);
    }

    toastSuccess(`Filters set for ${schedule.exam_type} - ${schedule.subject}`);
  };

  // Fetch marks list using the marks list endpoint
  const fetchMarksList = async () => {
    const toastId = toastLoading('Loading marks...');
    try {
      const response = await teacherApi.exams.listMarks({
        class: filters.class,
        section: filters.section,
        subject: filters.subject,
        exam_type: filters.exam_type,
        term: filters.term,
      });

      if (response?.data) {
        const payload = response.data as any;
        const data: StudentListResponse = (() => {
          if (
            payload &&
            typeof payload === 'object' &&
            Array.isArray(payload.data) &&
            typeof payload.class === 'string' &&
            typeof payload.subject === 'string'
          ) {
            return payload as StudentListResponse;
          }
          if (
            payload &&
            typeof payload === 'object' &&
            payload.data &&
            typeof payload.data === 'object' &&
            Array.isArray(payload.data.data)
          ) {
            return payload.data as StudentListResponse;
          }
          return resolveApiPayload<StudentListResponse>(payload);
        })();
        console.log('Marks list data:', data);
        if (!data || typeof data !== 'object' || !Array.isArray((data as any).data)) {
          throw new Error('Invalid marks response format');
        }

        // Convert to students list
        const studentsWithMarks = data.data.map((student) => {
          const hasUploadedMarks = typeof student.marks === 'number' && Number.isFinite(student.marks);
          const marksValue = hasUploadedMarks ? (student.marks as number) : 0;
          return {
            student_id: student.student_id,
            name: student.name,
            student_name: student.name,
            roll_number: student.student_id,
            marks: marksValue,
            existing_marks: marksValue,
            raw_marks: student.marks,
            is_assigned: hasUploadedMarks,
            status: hasUploadedMarks ? (marksValue >= 40 ? 'pass' : 'fail') : 'pending' // Assuming 40% passing
          };
        });

        setStudentsList(studentsWithMarks);

        // Set max marks from exam dropdown
        const exam = examDropdown.find(e =>
          e.name === filters.exam_type && e.term_name === filters.term
        );
        setMaxMarks(exam?.max_marks || 100);

        const initialMarksData = data.data.map(student => ({
          student_id: student.student_id,
          marks: typeof student.marks === 'number' && Number.isFinite(student.marks) ? student.marks : 0
        }));
        setMarksData(initialMarksData);

        const missingCount = data.data.filter((s) => s.marks === null || s.marks === undefined).length;
        const uploadedCount = data.data.length - missingCount;

        if (data.data.length === 0) toastUpdateSuccess(toastId, 'No students found for the selected filters.');
        else if (uploadedCount === 0) toastUpdateSuccess(toastId, `Loaded ${data.data.length} students. No marks uploaded yet.`);
        else if (missingCount > 0) toastUpdateSuccess(toastId, `Loaded marks for ${uploadedCount} students (${missingCount} pending).`);
        else toastUpdateSuccess(toastId, `Loaded marks for ${uploadedCount} students.`);

      } else if (response?.status === 404) {
        setStudentsList([]);
        setMarksData([]);
        setSubjectAnalysis(null);
        toastUpdateError(toastId, 'Requested data not found.');
      } else {
        throw new Error('Failed to fetch marks list');
      }
    } catch (err: any) {
      console.error('Error fetching marks list:', err);
      const status = err?.response?.status;
      if (status === 404) {
        setStudentsList([]);
        setMarksData([]);
        setSubjectAnalysis(null);
        toastUpdateError(toastId, extractApiError(err, 'Requested data not found.'));
        return;
      }
      if (status === 401) {
        toastUpdateError(toastId, 'Session expired. Please login again.');
        return;
      }
      if (status === 403) {
        toastUpdateError(toastId, extractApiError(err, 'Access denied.'));
        return;
      }
      toastUpdateError(toastId, extractApiError(err, 'Failed to load marks'));
    }
  };

  // Upload marks
  const handleUploadMarks = async () => {
    if (!filters.class || !filters.section || !filters.term || !filters.exam_type || !filters.subject) {
      toastError('Please fill all required fields');
      return;
    }

    const editableStudentIds = new Set(
      studentsList.filter((student) => !student.is_assigned).map((student) => student.student_id)
    );
    if (editableStudentIds.size === 0) {
      toastError('Marks already uploaded. Use "Request Edit" to change marks.');
      return;
    }

    const editableMarksData = marksData.filter((mark) => editableStudentIds.has(mark.student_id));
    if (editableMarksData.length === 0 || editableMarksData.every((mark) => mark.marks === 0)) {
      toastError('Please enter marks for at least one student');
      return;
    }

    const invalidMarks = editableMarksData.filter(s => s.marks < 0 || s.marks > maxMarks);
    if (invalidMarks.length > 0) {
      toastError('Some marks are invalid. Please check values.');
      return;
    }

    const toastId = toastLoading('Uploading marks...');
    try {
      setUploading(true);

      const uploadData = {
        term: filters.term,
        exam_type: filters.exam_type,
        subject: filters.subject,
        students_marks: editableMarksData
      };

      const response = await teacherApi.exams.uploadByClass(
        { class: filters.class, section: filters.section },
        uploadData
      );
      if (!response?.data) {
        throw new Error('No response received from server');
      }
      const result = resolveApiPayload<any>(response.data);

      if (!result) throw new Error('Invalid upload response');

      toastUpdateSuccess(toastId, extractApiMessage(result, 'Marks uploaded successfully!'));
      setShowUploadModal(false);
      setMarksData([]);

      if (result.report) {
        const successCount = result.report.filter((r: any) => r.status === 'Success').length;
        toastSuccess(`${successCount} marks processed successfully`);
      }

      // Refresh data
      await fetchMarksListWithFilters();
    } catch (err: any) {
      console.error('Error uploading marks:', err);
      toastUpdateError(toastId, extractApiError(err, 'Failed to upload marks'));
    } finally {
      setUploading(false);
    }
  };

  const openUploadModal = async () => {
    if (!filters.class || !filters.section || !filters.term || !filters.exam_type || !filters.subject) {
      toastError('Please select all filters first.');
      return;
    }

    const ok = await fetchMarksListWithFilters();
    if (ok) setShowUploadModal(true);
  };

  const getExamStatus = (exam: ExamSchedule) => {
    if (!exam.exam_date) return 'unscheduled';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const examDate = new Date(exam.exam_date);
      examDate.setHours(0, 0, 0, 0);

      if (examDate.getTime() === today.getTime()) return 'today';
      if (examDate > today) return 'upcoming';
      return 'finished';
    } catch (error) {
      return 'unscheduled';
    }
  };

  // Submit edit request
  const handleSubmitEditRequest = async () => {
    if (!editRequest.student_id || !editRequest.term || !editRequest.exam_type ||
      !editRequest.subject || !editRequest.reason) {
      toastError('Please fill all required fields');
      return;
    }

    const toastId = toastLoading('Submitting edit request...');
    try {
      const response = await teacherApi.exams.editMarks(editRequest);
      if (!response?.data) {
        throw new Error('No response received from server');
      }
      const result = resolveApiPayload<any>(response.data);

      if (!result) throw new Error('Invalid edit request response');

      toastUpdateSuccess(toastId, extractApiMessage(result, 'Edit request submitted for admin approval'));
      setShowEditModal(false);
      setEditRequest({
        student_id: '',
        term: '',
        exam_type: '',
        subject: '',
        marks: 0,
        reason: ''
      });

      // Refresh analysis
      await fetchMarksListWithFilters();
    } catch (err: any) {
      console.error('Error submitting edit request:', err);
      toastUpdateError(toastId, extractApiError(err, 'Failed to submit edit request'));
    }
  };

  // Initialize edit request
  const initEditRequest = (student: any) => {
    const existingMark = student.existing_marks || student.mark || student.marks || 0;
    setSelectedStudent(student);
    setEditRequest({
      student_id: student.student_id,
      term: filters.term,
      exam_type: filters.exam_type,
      subject: filters.subject,
      marks: existingMark,
      reason: ''
    });
    setShowEditModal(true);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Date not set';
    try {
      return new Date(dateString).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  // Prepare chart data
  const getGradeDistributionData = () => {
    if (!subjectAnalysis) return [];

    const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
    const gradeColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#f97316', '#ef4444', '#dc2626'];

    return Object.entries(subjectAnalysis.stats.grade_distribution)
      .map(([grade, count], index) => ({
        grade,
        count,
        color: gradeColors[index] || '#6b7280'
      }))
      .sort((a, b) => gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade));
  };

  // Sort students
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedStudents = React.useMemo(() => {
    if (!subjectAnalysis) return [];

    return [...subjectAnalysis.students].sort((a, b) => {
      if (sortConfig.key === 'mark') {
        return sortConfig.direction === 'asc' ? a.mark - b.mark : b.mark - a.mark;
      }
      if (sortConfig.key === 'name') {
        return sortConfig.direction === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      if (sortConfig.key === 'grade') {
        const gradeOrder = ['S', 'A', 'B', 'C', 'D', 'E', 'F'];
        return sortConfig.direction === 'asc'
          ? gradeOrder.indexOf(a.grade) - gradeOrder.indexOf(b.grade)
          : gradeOrder.indexOf(b.grade) - gradeOrder.indexOf(a.grade);
      }
      return 0;
    });
  }, [subjectAnalysis, sortConfig]);

  // Render exam schedule section with categorization
  const renderExamSchedule = () => {
    const categories = [
      {
        title: 'Today\'s Exams',
        exams: todayExams,
        icon: FaCalendarDay,
        cardColor: 'blue' as const,
        description: 'Exams happening today'
      },
      {
        title: 'Upcoming Exams',
        exams: upcomingExams,
        icon: FaClock,
        cardColor: 'emerald' as const,
        description: 'Future exams and unscheduled exams'
      },
      {
        title: 'Finished Exams',
        exams: finishedExams,
        icon: FaCalendarCheck,
        cardColor: 'indigo' as const,
        description: 'Completed exams'
      }
    ];

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          {categories.map((category) => (
            <div key={category.title} className={getCardGradientClass(category.cardColor)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                    {category.title}
                  </h3>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    {category.exams.length} exam{category.exams.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className={combine('p-2.5 sm:p-3 rounded-xl sm:rounded-2xl', get('bg', 'card'))}>
                  <category.icon className={combine('text-xl sm:text-2xl', get('accent', 'primary'))} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Exam Lists */}
        {categories.map((category, index) => (
          <div key={index} className={getCardGradientClass(category.cardColor)}>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-3">
                <div className={combine('p-2.5 sm:p-3 rounded-xl sm:rounded-2xl', get('bg', 'card'))}>
                  <category.icon className={combine('text-lg sm:text-xl', get('accent', 'primary'))} />
                </div>
                <div className="min-w-0">
                  <h3 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>{category.title}</h3>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{category.description}</p>
                </div>
              </div>
              <span className={combine(
                'mt-2 sm:mt-0 text-xs sm:text-sm px-3 py-1 rounded-full border w-fit',
                get('border', 'secondary'),
                get('bg', 'card'),
                get('text', 'secondary')
              )}>
                {category.exams.length} {category.exams.length === 1 ? 'Exam' : 'Exams'}
              </span>
            </div>

            <div>
              {category.exams.length > 0 ? (
                <div className="space-y-4 sm:space-y-6">
                  {category.exams.map((schedule, idx) => {
                    const isUnscheduled = !schedule.exam_date ||
                      schedule.display_text?.includes('Not Scheduled');
                    const isScheduled = schedule.exam_date && !isUnscheduled;

                    const scheduleCardClass = (() => {
                      const base = combine(
                        'border rounded-xl sm:rounded-2xl p-4 sm:p-6 transition-all hover:shadow-lg',
                        get('border', 'secondary'),
                        get('bg', 'card')
                      );
                      if (isUnscheduled) {
                        return combine(
                          base,
                          theme === 'dark'
                            ? 'border-yellow-700/60 bg-yellow-900/10'
                            : 'border-yellow-200 bg-yellow-50'
                        );
                      }
                      if (isScheduled) {
                        return combine(
                          base,
                          theme === 'dark'
                            ? 'border-emerald-700/50 bg-emerald-900/10'
                            : 'border-emerald-200 bg-emerald-50'
                        );
                      }
                      return base;
                    })();

                    return (
                      <div
                        key={idx}
                        className={scheduleCardClass}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={combine(
                                'p-3 rounded-xl sm:rounded-2xl',
                                isUnscheduled
                                  ? (theme === 'dark' ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                                  : isScheduled
                                    ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                    : (theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700')
                              )}>
                                {isUnscheduled ? (
                                  <FaExclamationTriangle />
                                ) : isScheduled ? (
                                  <FaCalendarAlt />
                                ) : (
                                  <FaBook />
                                )}
                              </div>
                              <div>
                                <h4 className={combine('font-bold text-base sm:text-lg', get('text', 'primary'))}>
                                  {schedule.exam_type}
                                </h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={combine(
                                    'text-xs sm:text-sm font-medium px-2 py-1 rounded-full border',
                                    get('border', 'secondary'),
                                    isUnscheduled
                                      ? (theme === 'dark' ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-100 text-yellow-800')
                                      : isScheduled
                                        ? (theme === 'dark' ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800')
                                        : (theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-100 text-blue-800')
                                  )}>
                                    {schedule.term}
                                  </span>
                                  {isUnscheduled && (
                                    <span className={combine(
                                      'text-xs sm:text-sm font-medium px-2 py-1 rounded-full border',
                                      get('border', 'secondary'),
                                      theme === 'dark' ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                                    )}>
                                      Awaiting Schedule
                                    </span>
                                  )}
                                  {isScheduled && (
                                    <span className={combine(
                                      'text-xs sm:text-sm font-medium px-2 py-1 rounded-full border',
                                      get('border', 'secondary'),
                                      theme === 'dark' ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
                                    )}>
                                      Scheduled
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className={combine('text-xs sm:text-sm', get('text', 'muted'))}>Subject</div>
                                <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{schedule.subject}</div>
                              </div>

                              {schedule.standard && (
                                <div>
                                  <div className={combine('text-xs sm:text-sm', get('text', 'muted'))}>Class & Section</div>
                                  <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>
                                    Class {schedule.standard}
                                    {schedule.sections && schedule.sections.length > 0 &&
                                      ` - Section ${schedule.sections.join(', ')}`}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 lg:mt-0 lg:ml-6 lg:text-right">
                            {isScheduled && schedule.exam_date ? (
                              <>
                                <div className={combine('text-base sm:text-lg font-bold mb-1', get('text', 'primary'))}>
                                  {formatDate(schedule.exam_date)}
                                </div>
                                <div className="space-y-1">
                                  {schedule.session && (
                                    <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                                      Session: {schedule.session}
                                    </div>
                                  )}
                                  {schedule.duration && (
                                    <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                                      Duration: {schedule.duration}
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="text-center">
                                <div className={combine('text-base sm:text-lg font-bold mb-1', get('accent', 'warning'))}>
                                  Not Scheduled
                                </div>
                                <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                                  Date to be announced
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      
                        {isScheduled && (
                          <div className={combine('mt-4 pt-4 border-t', get('border', 'secondary'))}>
                            <div className="flex items-center justify-between">
                              <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                                <FaInfoCircle className={get('text', 'muted')} />
                                {(() => {
                                  if (schedule.exam_date) {
                                    const examDate = new Date(schedule.exam_date);
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    examDate.setHours(0, 0, 0, 0);

                                    if (examDate < today) {
                                      return <span>Exam completed. Ready for marks upload/editing.</span>;
                                    } else if (examDate.getTime() === today.getTime()) {
                                      return <span>Exam happening today.</span>;
                                    } else {
                                      return <span>Upcoming exam. Marks upload available after exam date.</span>;
                                    }
                                  }
                                  return <span>Scheduled exam</span>;
                                })()}
                              </div>

                              {/* Only show button if exam date has passed (is in the past) */}
                              {schedule.exam_date && (() => {
                                const examDate = new Date(schedule.exam_date);
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                examDate.setHours(0, 0, 0, 0);

                                // Show button only if exam date is today or in the past
                                if (examDate <= today) {
                                  return (
                                    <button
                                      onClick={() => {
                                        autoFillFiltersFromSchedule(schedule);
                                        setActiveTab('marks');

                                        // Auto-load marks after a delay
                                        setTimeout(() => {
                                          fetchSubjectAnalysis();
                                        }, 500);
                                      }}
                                      className={combine(getPrimaryButtonClass(), 'px-4 sm:px-5 py-2 sm:py-2.5')}
                                    >
                                      View/Edit Marks
                                    </button>
                                  );
                                }

                                // Don't show any button for future exams
                                return null;
                              })()}
                            </div>
                          </div>
                        )}

                        {isScheduled && category.title === 'Finished Exams' && (
                          <div className={combine('mt-4 pt-4 border-t', get('border', 'secondary'))}>
                            <div className="flex items-center justify-between">
                              <div className={combine('flex items-center gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                                <FaInfoCircle className={get('text', 'muted')} />
                                <span>Exam completed. View or edit marks.</span>
                              </div>
                              <button
                                onClick={() => {
                                  // Auto-fill filters for this exam
                                  if (schedule.standard && schedule.sections && schedule.sections.length > 0) {
                                    setFilters({
                                      class: schedule.standard,
                                      section: schedule.sections[0],
                                      term: schedule.term,
                                      exam_type: schedule.exam_type,
                                      subject: schedule.subject
                                    });
                                    setActiveTab('marks');
                                    toastSuccess('Filters set for this exam');

                                    // Auto-load marks for finished exams
                                    setTimeout(() => {
                                      fetchSubjectAnalysis();
                                    }, 500);
                                  }
                                }}
                                className={combine(getPrimaryButtonClass(), 'px-4 sm:px-5 py-2 sm:py-2.5')}
                              >
                                View Marks
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 sm:py-12">
                  <category.icon className={combine('text-4xl sm:text-5xl mx-auto mb-4', get('text', 'muted'))} />
                  <h4 className={combine('text-base sm:text-lg font-semibold mb-2', get('text', 'primary'))}>
                    No {category.title.toLowerCase()}
                  </h4>
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    {category.title === 'Today\'s Exams'
                      ? 'No exams scheduled for today.'
                      : category.title === 'Upcoming Exams'
                        ? 'No upcoming or unscheduled exams.'
                        : 'No completed exams yet.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={combine('dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6', getBgClass())}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6',
            theme === 'dark' ? 'bg-gradient-to-r from-blue-700 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-600'
          )}>
	            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
	              <div className="flex items-start gap-3 sm:gap-4">
	                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
	                  <FaClipboardCheck className="text-2xl sm:text-3xl" />
	                </div>
	                <div className="min-w-0">
	                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Exam Management</h1>
	                  <p className="text-xs sm:text-sm text-blue-100">
	                    {teacherProfile ? `Subject Teacher - ${teacherProfile.name}` : 'Loading profile...'}
	                  </p>
	                </div>
	              </div>

	              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full lg:w-auto">
	                <div className="rounded-xl sm:rounded-2xl px-3 py-2 border border-white/20 bg-white/15 backdrop-blur-sm min-w-0">
	                  <div className="text-[11px] sm:text-xs text-blue-100">Class</div>
	                  <div className="text-xs sm:text-sm font-semibold text-white truncate">
	                    {filters.class ? `Class ${filters.class}` : summarizeList(getTeacherClassList())}
	                  </div>
	                </div>
	                <div className="rounded-xl sm:rounded-2xl px-3 py-2 border border-white/20 bg-white/15 backdrop-blur-sm min-w-0">
	                  <div className="text-[11px] sm:text-xs text-blue-100">Section</div>
	                  <div className="text-xs sm:text-sm font-semibold text-white truncate">
	                    {filters.section ? `Section ${filters.section}` : summarizeList(getTeacherSectionList())}
	                  </div>
	                </div>
	                <div className="rounded-xl sm:rounded-2xl px-3 py-2 border border-white/20 bg-white/15 backdrop-blur-sm min-w-0">
	                  <div className="text-[11px] sm:text-xs text-blue-100">Subject</div>
	                  <div className="text-xs sm:text-sm font-semibold text-white truncate">
	                    {filters.subject || summarizeList(getTeacherSubjectList())}
	                  </div>
	                </div>
	              </div>
	            </div>
	          </div>
	        </div>

        {/* Tabs */}
        <div className={combine(
          'flex space-x-1 p-1 rounded-xl sm:rounded-2xl mb-6 sm:mb-8 border shadow-lg',
          get('bg', 'card'),
          get('border', 'primary')
        )}>
          <button
            onClick={() => setActiveTab('schedule')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'schedule'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaCalendarAlt />
            Exam Schedule
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'marks'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaClipboardCheck />
            Marks Management
          </button>
        </div>

        {/* Filters Section - Visible for Marks tab */}
        {activeTab === 'marks' && (
          <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
            <div className="flex items-center gap-2 mb-4">
              <FaFilter className={combine('text-sm sm:text-base', get('accent', 'primary'))} />
              <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filters</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
              {/* Class Filter */}
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Class *
                </label>
                <select
                  value={filters.class}
                  onChange={(e) => setFilters({
                    ...filters,
                    class: e.target.value,
                    section: '',
                    subject: '',
                    term: '',
                    exam_type: '',
                  })}
                  className={getInputClass()}
                >
                  <option value="">Select Class</option>
                  {availableClasses.map(cls => (
                    <option key={cls} value={cls}>Class {cls}</option>
                  ))}
                </select>
              </div>

              {/* Section Filter */}
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Section *
                </label>
                <select
                  value={filters.section}
                  onChange={(e) => setFilters({
                    ...filters,
                    section: e.target.value,
                    subject: '',
                    term: '',
                    exam_type: '',
                  })}
                  disabled={!filters.class}
                  className={getInputClass()}
                >
                  <option value="">Select Section</option>
                  {getSectionsForClass().map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>

              {/* Subject Filter */}
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Subject *
                </label>
                <select
                  value={filters.subject}
                  onChange={(e) => setFilters({
                    ...filters,
                    subject: e.target.value,
                    term: '',
                    exam_type: '',
                  })}
                  disabled={!filters.section}
                  className={getInputClass()}
                >
                  <option value="">Select Subject</option>
                  {getSubjectsForClassAndSection().map(subject => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </div>

              {/* Term Filter */}
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Term *
                </label>
                <select
                  value={filters.term}
                  onChange={(e) => setFilters({ ...filters, term: e.target.value, exam_type: '' })}
                  disabled={!filters.subject}
                  className={getInputClass()}
                >
                  <option value="">Select Term</option>
                  {getTermsForSelection().map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>

              {/* Exam Type Filter */}
              <div>
                <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                  Exam Type *
                </label>
                <select
                  value={filters.exam_type}
                  onChange={(e) => setFilters({ ...filters, exam_type: e.target.value })}
                  disabled={!filters.term}
                  className={getInputClass()}
                >
                  <option value="">Select Exam Type</option>
                  {getExamTypesForSelection().map(examType => (
                    <option key={examType} value={examType}>{examType}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className={combine('flex flex-col sm:flex-row gap-2 sm:gap-4 mt-6 pt-6 border-t', get('border', 'secondary'))}>
              <button
                onClick={fetchSubjectAnalysis}
                disabled={!filters.class || !filters.section || !filters.subject || !filters.term || !filters.exam_type || loadingAnalysis}
                className={
                  !filters.class || !filters.section || !filters.subject || !filters.term || !filters.exam_type || loadingAnalysis
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm'
                    : combine(getPrimaryButtonClass(), 'w-full sm:w-auto flex items-center justify-center gap-2')
                }
              >
                {loadingAnalysis ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <FaClipboardCheck />
                    Load Marks
                  </>
                )}
              </button>

              {activeTab === 'marks' && (
                <button
                  onClick={openUploadModal}
                  className={combine('px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm shadow-lg hover:shadow-xl flex items-center justify-center gap-2', theme === 'dark' ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800' : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700')}
                >
                  <FaFileUpload />
                  Upload/Edit Marks
                </button>
              )}

              <button
                onClick={() => {
                  setFilters({
                    class: '',
                    section: '',
                    term: '',
                    exam_type: '',
                    subject: ''
                  });
                  setSubjectAnalysis(null);
                  setStudentsList([]);
                  setMarksData([]);
                }}
                className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center')}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'schedule' && renderExamSchedule()}

        {activeTab === 'marks' && (
          <>
            {/* Marks Summary */}
            {subjectAnalysis && (
              <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <h3 className={combine('text-base sm:text-lg lg:text-xl font-bold', get('text', 'primary'))}>
                      Marks Summary - {subjectAnalysis.subject}
                    </h3>
                    <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      {subjectAnalysis.exam} • {subjectAnalysis.class}
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={openUploadModal}
                      className={combine(getPrimaryButtonClass(), 'px-4 sm:px-5 py-2 sm:py-2.5 flex items-center gap-2')}
                    >
                      <FaEdit />
                      Edit Marks
                    </button>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
                  <div className={combine(
                    'p-4 sm:p-5 rounded-xl sm:rounded-2xl border backdrop-blur-sm',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-gray-900/40' : 'bg-white/70'
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={combine('p-2 rounded-lg sm:rounded-xl', theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100')}>
                        <FaUsers className={combine('text-lg sm:text-xl', get('accent', 'primary'))} />
                      </div>
                      <div>
                        <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Total Students</h4>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Class strength</p>
                      </div>
                    </div>
                    <div className={combine('text-2xl sm:text-3xl font-bold', get('accent', 'primary'))}>
                      {subjectAnalysis.stats.total_students}
                    </div>
                  </div>

                  <div className={combine(
                    'p-4 sm:p-5 rounded-xl sm:rounded-2xl border backdrop-blur-sm',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-gray-900/40' : 'bg-white/70'
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={combine('p-2 rounded-lg sm:rounded-xl', theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                        <FaPercent className={combine('text-lg sm:text-xl', get('accent', 'success'))} />
                      </div>
                      <div>
                        <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Pass Percentage</h4>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Overall performance</p>
                      </div>
                    </div>
                    <div className={combine('text-2xl sm:text-3xl font-bold', get('accent', 'success'))}>
                      {subjectAnalysis.stats.pass_percentage}
                    </div>
                  </div>

                  <div className={combine(
                    'p-4 sm:p-5 rounded-xl sm:rounded-2xl border backdrop-blur-sm',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-gray-900/40' : 'bg-white/70'
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={combine('p-2 rounded-lg sm:rounded-xl', theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100')}>
                        <FaCheckCircle className={combine('text-lg sm:text-xl', get('accent', 'success'))} />
                      </div>
                      <div>
                        <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Passed</h4>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Students who passed</p>
                      </div>
                    </div>
                    <div className={combine('text-2xl sm:text-3xl font-bold', get('accent', 'success'))}>
                      {subjectAnalysis.stats.pass_count}
                    </div>
                  </div>

                  <div className={combine(
                    'p-4 sm:p-5 rounded-xl sm:rounded-2xl border backdrop-blur-sm',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-gray-900/40' : 'bg-white/70'
                  )}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={combine('p-2 rounded-lg sm:rounded-xl', theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')}>
                        <FaTimesCircle className={combine('text-lg sm:text-xl', get('accent', 'error'))} />
                      </div>
                      <div>
                        <h4 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Failed</h4>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Need improvement</p>
                      </div>
                    </div>
                    <div className={combine('text-2xl sm:text-3xl font-bold', get('accent', 'error'))}>
                      {subjectAnalysis.stats.fail_count}
                    </div>
                  </div>
                </div>

                {/* Grade Distribution Chart (moved from Performance tab) */}
                <div className={combine(getSoftCardClass(), 'mb-6 sm:mb-8')}>
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h4 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>
                      Grade Distribution
                    </h4>
                    <div className={combine('text-xs sm:text-sm', get('text', 'muted'))}>
                      {subjectAnalysis.stats.total_students} students
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getGradeDistributionData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                        <XAxis dataKey="grade" />
                        <YAxis />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                            background: theme === 'dark' ? '#111827' : '#ffffff',
                            color: theme === 'dark' ? '#f9fafb' : '#111827',
                          }}
                          formatter={(value) => [value, 'Students']}
                        />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Students Table */}
                <div className={getSoftCardClass()}>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>Student Marks</h4>
                    <div className={combine('text-xs sm:text-sm', get('text', 'muted'))}>
                      {subjectAnalysis.stats.total_students} students
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={get('bg', 'tertiary')}>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Student Name
                          </th>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Marks
                          </th>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Grade
                          </th>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Percentage
                          </th>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Status
                          </th>
                          <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((student) => {
                          const percentage = (student.mark / student.total) * 100;
                          const isPass = percentage >= 40;

                          return (
                            <tr
                              key={student.student_id}
                              className={combine('border-b transition-colors', get('border', 'secondary'), get('bg', 'hover'))}
                            >
                              <td className="py-3 px-4">
                                <div>
                                  <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{student.name}</div>
                                  <div className={combine('text-xs', get('text', 'muted'))}>{student.student_id}</div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className={combine('font-bold text-xs sm:text-sm', get('text', 'primary'))}>
                                  {student.mark} / {student.total}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full font-bold ${student.grade === 'S' ? 'bg-emerald-100 text-emerald-800' :
                                    student.grade === 'A' ? 'bg-green-100 text-green-800' :
                                      student.grade === 'B' ? 'bg-blue-100 text-blue-800' :
                                        student.grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                                          student.grade === 'D' ? 'bg-orange-100 text-orange-800' :
                                            student.grade === 'E' ? 'bg-red-100 text-red-800' :
                                              'bg-red-200 text-red-900'
                                  }`}>
                                  {student.grade}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={combine('w-24 rounded-full h-2', theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200')}>
                                    <div
                                      className={`h-2 rounded-full ${percentage >= 80 ? 'bg-emerald-500' :
                                          percentage >= 60 ? 'bg-green-500' :
                                            percentage >= 40 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                        }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className={`font-medium ${percentage >= 80 ? 'text-emerald-600' :
                                      percentage >= 60 ? 'text-green-600' :
                                        percentage >= 40 ? 'text-yellow-600' :
                                          'text-red-600'
                                    }`}>
                                    {percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isPass
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                  }`}>
                                  {isPass ? (
                                    <><FaCheckCircle className="mr-1" /> Pass</>
                                  ) : (
                                    <><FaTimesCircle className="mr-1" /> Fail</>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <button
                                  onClick={() => {
                                    const studentData = studentsList.find(s => s.student_id === student.student_id);
                                    if (studentData) initEditRequest(studentData);
                                  }}
                                  className={combine(
                                    'px-3 py-1 text-xs sm:text-sm rounded-lg sm:rounded-xl transition-colors flex items-center gap-1 border',
                                    get('border', 'secondary'),
                                    get('bg', 'card'),
                                    get('text', 'secondary'),
                                    'hover:bg-[var(--color-bg-hover)]'
                                  )}
                                >
                                  <FaEdit size={12} />
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State for Marks */}
            {!subjectAnalysis && !loadingAnalysis && (
              <div className={combine(getCardGradientClass('blue'), 'text-center py-12 sm:py-16')}>
                <div className={combine(
                  'w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 rounded-full flex items-center justify-center',
                  theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-100'
                )}>
                  <FaClipboardCheck className={combine('text-2xl sm:text-3xl', get('accent', 'primary'))} />
                </div>
                <h3 className={combine('text-base sm:text-lg font-semibold mb-3', get('text', 'primary'))}>No Marks Loaded</h3>
                <p className={combine('text-xs sm:text-sm max-w-md mx-auto', get('text', 'secondary'))}>
                  Select your class, section, subject, term, and exam type to load marks data.
                  You can then upload new marks or edit existing ones.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Upload Marks Modal */}
      {showUploadModal && (
        <div
          className={combine(
            'fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm',
            'bg-black/70'
          )}
        >
          <div className={combine(
            'rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border shadow-lg',
            get('bg', 'card'),
            get('border', 'primary')
          )}>
            <div className={combine(
              'sticky top-0 border-b px-4 sm:px-6 py-4 flex justify-between items-start gap-4',
              get('bg', 'card'),
              get('border', 'secondary')
            )}>
              <div>
                <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>
                  {studentsList.some((s) => s.is_assigned) ? 'Edit Existing Marks' : 'Upload New Marks'}
                </h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  {filters.class}-{filters.section} • {filters.subject} • {filters.exam_type} ({filters.term})
                  {subjectAnalysis && ` • Pass Rate: ${subjectAnalysis.stats.pass_percentage}`}
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className={combine('text-2xl leading-none', get('text', 'secondary'), 'hover:opacity-80')}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {/* Students Marks Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className={get('bg', 'tertiary')}>
                      <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                        Student ID
                      </th>
                      <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                        Student Name
                      </th>
                      <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                        Marks (out of {maxMarks})
                      </th>
                      <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentsList.length > 0 ? studentsList.map((student) => {
                      const isAssigned = Boolean(student.is_assigned);
                      const existingMarks = (student.existing_marks ?? student.mark ?? 0);
                      const currentMarks = marksData.find(s => s.student_id === student.student_id)?.marks ?? existingMarks;
                      const hasChanges = !isAssigned && currentMarks !== existingMarks;

                      const rowHighlight = hasChanges
                        ? (theme === 'dark' ? 'bg-yellow-900/10' : 'bg-yellow-50')
                        : '';

                      return (
                        <tr
                          key={student.student_id}
                          className={combine(
                            'border-b transition-colors',
                            get('border', 'secondary'),
                            get('bg', 'hover'),
                            rowHighlight
                          )}
                        >
                          <td className="py-3 px-4">
                            <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{student.student_id}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className={combine('font-medium text-xs sm:text-sm', get('text', 'primary'))}>{student.name || student.student_name}</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="relative">
                              <input
                                type="number"
                                value={Number.isFinite(currentMarks) ? currentMarks : ''}
                                onChange={(e) => {
                                  const marksValue = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                  setMarksData(prev => {
                                    const existing = prev.find(s => s.student_id === student.student_id);
                                    if (existing) {
                                      return prev.map(s =>
                                        s.student_id === student.student_id ? { ...s, marks: marksValue } : s
                                      );
                                    } else {
                                      return [...prev, { student_id: student.student_id, marks: marksValue }];
                                    }
                                  });
                                }}
                                disabled={isAssigned}
                                className={combine(
                                  getInputClass(),
                                  'w-32 !px-3 !py-2',
                                  isAssigned
                                    ? (theme === 'dark'
                                      ? 'bg-gray-800/60 text-gray-400 border-gray-700 cursor-not-allowed'
                                      : 'bg-gray-100 text-gray-500 border-gray-300 cursor-not-allowed')
                                    : '',
                                  hasChanges
                                    ? (theme === 'dark'
                                      ? 'border-yellow-500 bg-yellow-900/10'
                                      : 'border-yellow-400 bg-yellow-50')
                                    : ''
                                )}
                                min="0"
                                max={maxMarks}
                                step="0.01"
                              />
                              {hasChanges && (
                                <span className={combine(
                                  'absolute -bottom-6 left-0 text-xs',
                                  theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'
                                )}>
                                  Changed: {currentMarks - existingMarks > 0 ? '+' : ''}{currentMarks - existingMarks}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => initEditRequest(student)}
                              className={combine(getSecondaryButtonClass(), 'px-3 py-1 text-xs sm:text-sm flex items-center gap-1')}
                            >
                              <FaEdit size={12} />
                              Request Edit
                            </button>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={4} className={combine('py-8 text-center text-xs sm:text-sm', get('text', 'muted'))}>
                          No students found. Please load marks first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary and Actions */}
              <div className={combine('mt-8 pt-6 border-t', get('border', 'secondary'))}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                  <div>
                    <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Total Students: {studentsList.length}</div>
                    <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      Marks Entered: {marksData.filter(s => s.marks > 0).length}
                    </div>
                    <div className={combine('text-xs sm:text-sm', theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700')}>
                      Changes Made: {marksData.filter(s => {
                        const student = studentsList.find(st => st.student_id === s.student_id);
                        return s.marks !== (student?.existing_marks || student?.mark || 0);
                      }).length}
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className={combine('text-sm sm:text-base font-bold', get('text', 'primary'))}>
                      Maximum Marks: {maxMarks}
                    </div>
                    {subjectAnalysis && (
                      <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                        Current Pass Rate: {subjectAnalysis.stats.pass_percentage}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className={combine(getSecondaryButtonClass(), 'px-6 py-3 justify-center')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadMarks}
                    disabled={uploading || marksData.length === 0}
                    className={combine(
                      getPrimaryButtonClass(),
                      'px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {uploading ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        Uploading...
                      </>
                    ) : studentsList.some((s) => s.is_assigned) ? (
                      <>
                        <FaEdit />
                        Update Marks
                      </>
                    ) : (
                      <>
                        <FaUpload />
                        Upload Marks
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {showEditModal && (
        <div
          className={combine(
            'fixed inset-0 flex items-center justify-center p-4 z-50 backdrop-blur-sm',
            'bg-black/70'
          )}
        >
          <div className={combine('rounded-2xl max-w-md w-full border shadow-lg', get('bg', 'card'), get('border', 'primary'))}>
            <div className={combine('border-b px-4 sm:px-6 py-4', get('border', 'secondary'))}>
              <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>Submit Edit Request</h3>
            </div>

            <div className="p-4 sm:p-6">
              {selectedStudent && (
                <div className={combine(getSoftCardClass(), 'mb-6')}>
                  <div className={combine('font-medium text-sm sm:text-base', get('text', 'primary'))}>{selectedStudent.name || selectedStudent.student_name}</div>
                  <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>ID: {selectedStudent.student_id}</div>
                  <div className={combine('text-xs sm:text-sm mt-2', get('text', 'secondary'))}>
                    Current Marks: {selectedStudent.existing_marks || selectedStudent.mark || selectedStudent.marks || 0} / {maxMarks}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Reason for Edit *
                  </label>
                  <textarea
                    value={editRequest.reason}
                    onChange={(e) => setEditRequest({ ...editRequest, reason: e.target.value })}
                    className={combine(getInputClass(), '!px-4 !py-3')}
                    rows={3}
                    placeholder="Explain why you need to edit these marks..."
                  />
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    New Marks *
                  </label>
                  <input
                    type="number"
                    value={editRequest.marks}
                    onChange={(e) => setEditRequest({ ...editRequest, marks: parseFloat(e.target.value) || 0 })}
                    className={combine(getInputClass(), '!px-4 !py-3')}
                    min="0"
                    max={maxMarks}
                    step="0.01"
                  />
                </div>
              </div>

              <div className={combine('mt-8 pt-6 border-t', get('border', 'secondary'))}>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className={combine(getSecondaryButtonClass(), 'px-6 py-3 justify-center')}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitEditRequest}
                    disabled={!editRequest.reason.trim()}
                    className={combine(
                      getPrimaryButtonClass(),
                      'px-6 py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <FaPaperPlane />
                    Submit for Approval
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
