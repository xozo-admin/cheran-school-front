'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaUserFriends, FaComments, FaChartLine, FaChartBar,
  FaFilter, FaSpinner, FaExclamationTriangle, FaPaperPlane,
  FaCheckCircle, FaEye, FaSearch, FaChartPie, FaBullseye,
  FaStar, FaStarHalf, FaRegStar, FaChevronUp, FaChevronDown,
  FaSortAmountDown, FaSortAmountUp, FaDownload, FaEdit, FaTimesCircle, FaBook
} from 'react-icons/fa';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { teacherApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

// Behavior Report Interfaces
interface BehaviorReport {
  student_id: string;
  student_name?: string;
  class_participation: number;
  homework_responsibility: number;
  classroom_discipline: number;
  learning_attitude: number;
  social_behaviour: number;
  remarks: string;
  average_score?: number;
  type?: string;
  is_submitted?: boolean;
  submitted_at?: string;
}

interface BehaviorReportRequest {
  term: string;
  class: string;
  section: string;
  subject: string;
  reports: BehaviorReport[];
}

interface BehaviorTrendResponse {
  status: number;
  type: string;
  subject: string;
  viewed_by: string;
  graph_data: Array<{
    exam: string;
    value: number;
    change_percentage: number;
    trend: 'increase' | 'decrease' | 'neutral';
  }>;
}

interface SpecificBehaviorTrendResponse {
  status: number;
  student: string;
  subject: string;
  viewed_by: string;
  graph_data: Array<{
    exam: string;
    value: number;
    change_percentage: number;
    trend: 'increase' | 'decrease' | 'neutral';
  }>;
}

interface MyReportsResponse {
  class: string;
  section: string;
  term: string;
  subject: string;
  total_students: number;
  submitted_reports: number;
  pending_reports: number;
  summary: {
    average_participation: number;
    average_responsibility: number;
    average_discipline: number;
    average_attitude: number;
    average_collaboration: number;
    average_overall: number;
  };
  reports: BehaviorReport[];
}

interface TeacherScheduleResponse {
  status: string;
  view_type: string;
  scheduled_exams: Array<{
    exam_type: string;
    term: string;
    subject: string;
    exam_date: string;
    session: string;
    duration: string;
    standard: string;
    sections: string[];
    display_text: string;
  }>;
}

interface TeacherProfile {
  name?: string;
  handled_subjects?: Record<string, Record<string, string[]>>;
  class_name?: string | null;
  section_name?: string | null;
}

export default function BehaviorReportsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const getBgClass = () => combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200');

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
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

  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null);
  const [examSchedules, setExamSchedules] = useState<TeacherScheduleResponse['scheduled_exams']>([]);

  // State for filters
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    term: '',
    subject: ''
  });

  // State for trend analysis
  const [trendAnalysis, setTrendAnalysis] = useState<{
    selectedStudent: string;
    selectedStudentName: string;
    selectedBehavior: 'overall' | 'participation' | 'responsibility' | 'discipline' | 'attitude' | 'collaboration';
    showTrends: boolean;
    expandedStudentId: string | null;
  }>({
    selectedStudent: '',
    selectedStudentName: '',
    selectedBehavior: 'overall',
    showTrends: false,
    expandedStudentId: null
  });

  // State for data
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableClasses, setAvailableClasses] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);
  
  // State for behavior reports
  const [behaviorReports, setBehaviorReports] = useState<BehaviorReport[]>([]);
  const [myReports, setMyReports] = useState<MyReportsResponse | null>(null);
  const [behaviorTrendData, setBehaviorTrendData] = useState<BehaviorTrendResponse | null>(null);
  const [specificBehaviorTrend, setSpecificBehaviorTrend] = useState<SpecificBehaviorTrendResponse | null>(null);
  const [submittingBehavior, setSubmittingBehavior] = useState(false);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'submit' | 'myreports' | 'trends'>('submit');
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc' | 'desc'}>({ key: 'average_score', direction: 'desc' });
  const [showBehaviorTable, setShowBehaviorTable] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const getSectionsForClass = () => {
    if (!filters.class) return availableSections;

    const norm = (value: string) => value.trim().toLowerCase();
    const sections = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.values(teacherProfile.handled_subjects).forEach((classMap) => {
        const sectionList = classMap?.[filters.class];
        if (Array.isArray(sectionList)) sectionList.forEach((sec) => sec && sections.add(sec));
      });
    }
    examSchedules.forEach((schedule) => {
      if (!schedule.standard || norm(schedule.standard) !== norm(filters.class)) return;
      if (!Array.isArray(schedule.sections)) return;
      schedule.sections.forEach((sec) => sec && sections.add(sec));
    });
    availableSections.forEach((sec) => sec && sections.add(sec));

    return Array.from(sections).sort();
  };

  const getSubjectsForClassAndSection = () => {
    if (!filters.class || !filters.section) return [];

    const norm = (value: string) => value.trim().toLowerCase();
    const subjects = new Set<string>();
    if (teacherProfile?.handled_subjects) {
      Object.entries(teacherProfile.handled_subjects).forEach(([subjectName, classMap]) => {
        const sectionList = classMap?.[filters.class];
        if (Array.isArray(sectionList) && sectionList.some((sec) => norm(sec) === norm(filters.section))) {
          subjects.add(subjectName);
        }
      });
    }
    examSchedules.forEach((schedule) => {
      if (!schedule.standard || norm(schedule.standard) !== norm(filters.class)) return;
      if (!schedule.subject) return;
      if (Array.isArray(schedule.sections) && schedule.sections.some((sec) => norm(sec) === norm(filters.section))) {
        subjects.add(schedule.subject);
      }
    });

    return Array.from(subjects).sort();
  };

  const getTermsForSelection = () => {
    if (!filters.class || !filters.section || !filters.subject) return availableTerms;

    const norm = (value: string) => value.trim().toLowerCase();
    const terms = new Set<string>();

    examSchedules.forEach((schedule) => {
      if (!schedule.standard || norm(schedule.standard) !== norm(filters.class)) return;
      if (!schedule.subject || norm(schedule.subject) !== norm(filters.subject)) return;
      if (!Array.isArray(schedule.sections) || !schedule.sections.some((sec) => norm(sec) === norm(filters.section))) return;
      if (!schedule.term) return;

      terms.add(schedule.term);
    });

    // Behavior reports are term-based; if schedule-based filtering returns nothing,
    // fall back to the overall available terms list.
    return terms.size ? Array.from(terms).sort() : availableTerms;
  };

  const fetchFilterOptions = async () => {
    try {
      const [profileResponse, scheduleResponse] = await Promise.all([
        teacherApi.profile.get(),
        teacherApi.exams.teacherSchedule(),
      ]);

      const profilePayload: any = profileResponse?.data;
      const profile: TeacherProfile | null = profilePayload?.data ?? profilePayload ?? null;
      setTeacherProfile(profile);

      if (!scheduleResponse?.data) {
        toastError('Failed to fetch schedule data');
        return;
      }

      const scheduleData: TeacherScheduleResponse = scheduleResponse.data;
      if (scheduleData.status !== 'success' || !Array.isArray(scheduleData.scheduled_exams)) {
        toastError('Failed to fetch schedule data');
        return;
      }

      setExamSchedules(scheduleData.scheduled_exams);

      const terms = new Set<string>();
      const subjects = new Set<string>();
      const classes = new Set<string>();
      const sections = new Set<string>();

      scheduleData.scheduled_exams.forEach((exam) => {
        if (exam.term) terms.add(exam.term);
        if (exam.subject) subjects.add(exam.subject);
        if (exam.standard) classes.add(exam.standard);
        if (exam.sections && Array.isArray(exam.sections)) {
          exam.sections.forEach(section => section && sections.add(section));
        }
      });

      if (profile?.handled_subjects) {
        Object.entries(profile.handled_subjects).forEach(([subjectName, classMap]) => {
          if (subjectName) subjects.add(subjectName);
          if (!classMap || typeof classMap !== 'object') return;
          Object.entries(classMap).forEach(([cls, sectionList]) => {
            if (cls) classes.add(cls);
            if (Array.isArray(sectionList)) sectionList.forEach((sec) => sec && sections.add(sec));
          });
        });
      }
      if (profile?.class_name) classes.add(profile.class_name);
      if (profile?.section_name) sections.add(profile.section_name);

      setAvailableTerms(Array.from(terms).sort());
      setAvailableSubjects(Array.from(subjects).sort());
      setAvailableClasses(Array.from(classes).sort());
      setAvailableSections(Array.from(sections).sort());
    } catch (error) {
      console.error('Error fetching filter options:', error);
      toastError('Error loading filter options');
    }
  };

  const fetchStudentsForBehaviorReport = async () => {
    if (!filters.class || !filters.section || !filters.term || !filters.subject) {
      toastError('Please select all filters first.');
      return;
    }

    try {
      setLoading(true);
      const response = await teacherApi.reports.submitted({
        class: filters.class,
        section: filters.section,
        term: filters.term,
        subject: filters.subject,
      });

      if (response?.data) {
        const data = response.data;
        
        if (data.status === 'success') {
          const behaviorReports = data.reports.map((report:any) => ({
            student_id: report.student_id,
            student_name: report.student_name,
            class_participation: report.class_participation,
            homework_responsibility: report.homework_responsibility,
            classroom_discipline: report.classroom_discipline,
            learning_attitude: report.learning_attitude,
            social_behaviour: report.social_behaviour,
            remarks: report.remarks || '',
            average_score: report.average_score,
            type: report.type,
            is_submitted: report.is_submitted
          }));
          
          setBehaviorReports(behaviorReports);
          setShowBehaviorTable(true);
          
          if (data.submitted_reports > 0) {
            toastSuccess(
              `Found ${data.submitted_reports} submitted reports. ${data.pending_reports} pending.`,
              { autoClose: 3000 }
            );
          } else {
            toastSuccess(`Prepared behavior reports for ${data.total_students} students.`, { autoClose: 3000 });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      toastError('Error fetching behavior reports');
    } finally {
      setLoading(false);
    }
  };

  const handleBehaviorChange = (studentId: string, field: keyof BehaviorReport, value: string | number) => {
    setBehaviorReports(prev => 
      prev.map(report => 
        report.student_id === studentId 
          ? { ...report, [field]: value }
          : report
      )
    );
  };

  const submitBehaviorReports = async () => {
    if (!filters.class || !filters.section || !filters.term || !filters.subject) {
      toastError('Please fill all required fields');
      return;
    }

    const invalidReports = behaviorReports.filter(report => 
      report.class_participation < 1 || report.class_participation > 5 ||
      report.homework_responsibility < 1 || report.homework_responsibility > 5 ||
      report.classroom_discipline < 1 || report.classroom_discipline > 5 ||
      report.learning_attitude < 1 || report.learning_attitude > 5 ||
      report.social_behaviour < 1 || report.social_behaviour > 5
    );

    if (invalidReports.length > 0) {
      toastError('All behavior scores must be between 1 and 5');
      return;
    }

    try {
      setSubmittingBehavior(true);
      
      const requestData: BehaviorReportRequest = {
        term: filters.term,
        class: filters.class,
        section: filters.section,
        subject: filters.subject,
        reports: behaviorReports.map(({ student_name, average_score, type, is_submitted, submitted_at, ...rest }) => rest)
      };

      const response = await teacherApi.reports.create(requestData);
      const result = response.data;
      
      if (result) {
        toastSuccess(result.message || 'Behavior reports submitted successfully!');
        // Refresh the reports after submission
        await fetchStudentsForBehaviorReport();
      }
    } catch (error) {
      console.error('Error submitting behavior reports:', error);
      toastError('Error submitting behavior reports');
    } finally {
      setSubmittingBehavior(false);
    }
  };

  const fetchMyReports = async () => {
    if (!filters.class || !filters.section || !filters.term || !filters.subject) {
      toastError('Please select all filters first.');
      return;
    }

    try {
      setLoading(true);
      const response = await teacherApi.reports.submitted({
        class: filters.class,
        section: filters.section,
        term: filters.term,
        subject: filters.subject,
      });

      if (response?.data) {
        const data: MyReportsResponse | any = response.data;
        
        if (data.status === 'success') {
          setMyReports(data);
          setTrendAnalysis(prev => ({ 
            ...prev, 
            showTrends: false,
            expandedStudentId: null 
          }));
          
          toastSuccess(
            `Found ${data.submitted_reports} submitted reports for ${data.total_students} students`,
            { autoClose: 3000 }
          );
        }
      }
    } catch (error) {
      console.error('Error fetching my reports:', error);
      toastError('Error loading reports');
    } finally {
      setLoading(false);
    }
  };

  const fetchBehaviorTrends = async (studentId: string, studentName: string, behaviorType: string = 'overall') => {
    if (!studentId || !filters.subject) {
      toastError('Please select a student and ensure subject is selected');
      return;
    }

    try {
      setLoadingTrends(true);
      if (behaviorType === 'overall') {
        const response = await teacherApi.reports.behaviorTrend({
          student_id: studentId,
          subject: filters.subject,
        });
        if (response?.data) {
          const data: BehaviorTrendResponse = response.data;
          setBehaviorTrendData(data);
        }
      } else {
        const response = await teacherApi.reports.behaviorTypeTrend({
          student_id: studentId,
          subject: filters.subject,
          behaviour_type: behaviorType,
        });
        if (response?.data) {
          const data: SpecificBehaviorTrendResponse = response.data;
          setSpecificBehaviorTrend(data);
        }
      }
    } catch (error) {
      console.error('Error fetching behavior trends:', error);
      toastError('Error loading behavior trend data');
    } finally {
      setLoadingTrends(false);
    }
  };

  const handleLoadTrendsFromInput = async () => {
    if (!filters.class || !filters.section || !filters.subject || !filters.term) {
      toastError('Please select all filters first.');
      return;
    }
    const studentId = trendAnalysis.selectedStudent.trim();
    if (!studentId) {
      toastError('Please enter a student ID');
      return;
    }

    const reportsMatchFilters = Boolean(
      myReports &&
      normalizeValue(myReports.class) === normalizeValue(filters.class) &&
      normalizeValue(myReports.section) === normalizeValue(filters.section) &&
      normalizeValue(myReports.subject) === normalizeValue(filters.subject) &&
      normalizeValue(myReports.term) === normalizeValue(filters.term)
    );
    const matchedReport = reportsMatchFilters && myReports
      ? myReports.reports.find((r) => normalizeValue(r.student_id) === normalizeValue(studentId))
      : undefined;
    const studentName = matchedReport?.student_name || studentId;

    setBehaviorTrendData(null);
    setSpecificBehaviorTrend(null);
    setTrendAnalysis((prev) => ({
      ...prev,
      selectedStudent: studentId,
      selectedStudentName: studentName,
      showTrends: true,
    }));

    await fetchBehaviorTrends(studentId, studentName, trendAnalysis.selectedBehavior);
  };

  const handleViewTrends = async (studentId: string, studentName: string) => {
    if (!studentId) {
      toastError('Please select a student');
      return;
    }

    setActiveTab('trends');
    setTrendAnalysis(prev => ({
      ...prev,
      selectedStudent: studentId,
      selectedStudentName: studentName,
      selectedBehavior: 'overall',
      showTrends: true,
      expandedStudentId: null
    }));

    await fetchBehaviorTrends(studentId, studentName, 'overall');
  };

  const handleBehaviorTypeChange = async (behaviorType: typeof trendAnalysis.selectedBehavior) => {
    setTrendAnalysis(prev => ({ ...prev, selectedBehavior: behaviorType }));
    await fetchBehaviorTrends(trendAnalysis.selectedStudent, trendAnalysis.selectedStudentName, behaviorType);
  };

  const getBehaviorTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'overall': 'Overall Behavior',
      'participation': 'Class Participation',
      'responsibility': 'Homework Responsibility',
      'discipline': 'Classroom Discipline',
      'attitude': 'Learning Attitude',
      'collaboration': 'Social Behaviour/Collaboration',
      'class_participation': 'Class Participation',
      'homework_responsibility': 'Homework Responsibility',
      'classroom_discipline': 'Classroom Discipline',
      'learning_attitude': 'Learning Attitude',
      'social_behaviour': 'Social Behaviour'
    };
    return labels[type] || type;
  };

  const normalizeExamName = (name: string) => {
    if (!name) return 'Unknown';
    return name.trim().replace(/\s+/g, ' ');
  };

  const normalizeValue = (value?: string) => (value || '').trim().toLowerCase();

  const getStarRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={i} className="text-yellow-500" />);
    }
    
    if (hasHalfStar) {
      stars.push(<FaStarHalf key="half" className="text-yellow-500" />);
    }
    
    const remainingStars = 5 - stars.length;
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<FaRegStar key={`empty-${i}`} className={theme === 'dark' ? 'text-gray-600' : 'text-gray-300'} />);
    }
    
    return stars;
  };

  const getBehaviorCategoryData = (reports: BehaviorReport[]) => {
    if (!reports || reports.length === 0) return [];
    
    const categories = [
      { key: 'class_participation', name: 'Participation', color: '#10b981' },
      { key: 'homework_responsibility', name: 'Responsibility', color: '#3b82f6' },
      { key: 'classroom_discipline', name: 'Discipline', color: '#8b5cf6' },
      { key: 'learning_attitude', name: 'Attitude', color: '#f59e0b' },
      { key: 'social_behaviour', name: 'Collaboration', color: '#ec4899' }
    ];
    
    return categories.map((category) => {
      const total = reports.reduce((sum, report) => sum + (report[category.key as keyof BehaviorReport] as number), 0);
      const average = total / reports.length;
      
      return {
        category: category.name,
        average: parseFloat(average.toFixed(2)),
        fullName: category.name,
        color: category.color
      };
    });
  };

  const getStudentPerformanceData = (reports: BehaviorReport[]) => {
    if (!reports || reports.length === 0) return [];
    
    return reports.slice(0, 10).map((report, index) => ({
      name: report.student_name?.split(' ')[0] || report.student_id,
      average: report.average_score || 0,
      participation: report.class_participation,
      responsibility: report.homework_responsibility,
      discipline: report.classroom_discipline,
      attitude: report.learning_attitude,
      collaboration: report.social_behaviour
    }));
  };

  const getTrendChartData = () => {
    const data = trendAnalysis.selectedBehavior === 'overall' ? behaviorTrendData : specificBehaviorTrend;
    if (!data || !data.graph_data || data.graph_data.length === 0) return [];
    
    return data.graph_data.map((item, index) => {
      const normalizedExam = normalizeExamName(item.exam);
      
      let trend: 'increase' | 'decrease' | 'neutral' = 'neutral';
      if (item.change_percentage > 5) trend = 'increase';
      else if (item.change_percentage < -5) trend = 'decrease';
      else trend = 'neutral';
      
      return {
        name: normalizedExam,
        value: parseFloat(item.value.toFixed(2)),
        trend: item.trend || trend,
        change: Math.abs(item.change_percentage || 0),
        index: index + 1,
        originalExam: item.exam
      };
    }).sort((a, b) => a.index - b.index);
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedReports = React.useMemo(() => {
    if (!myReports?.reports) return [];
    
    return [...myReports.reports].sort((a, b) => {
      const aAvg = a.average_score || 0;
      const bAvg = b.average_score || 0;
      
      if (sortConfig.key === 'average_score') {
        return sortConfig.direction === 'asc' ? aAvg - bAvg : bAvg - aAvg;
      }
      if (sortConfig.key === 'student_name') {
        const aName = a.student_name || '';
        const bName = b.student_name || '';
        return sortConfig.direction === 'asc' 
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      }
      return 0;
    });
  }, [myReports, sortConfig]);

  const clearAllFilters = () => {
    setFilters({
      class: '',
      section: '',
      term: '',
      subject: ''
    });
    setTrendAnalysis({
      selectedStudent: '',
      selectedStudentName: '',
      selectedBehavior: 'overall',
      showTrends: false,
      expandedStudentId: null
    });
    setMyReports(null);
    setBehaviorTrendData(null);
    setSpecificBehaviorTrend(null);
    setBehaviorReports([]);
    setShowBehaviorTable(false);
  };

  const getTrendColor = (trend: 'increase' | 'decrease' | 'neutral') => {
    switch (trend) {
      case 'increase':
        return {
          bg: theme === 'dark' ? 'bg-emerald-900/20' : 'bg-emerald-50',
          text: theme === 'dark' ? 'text-emerald-200' : 'text-emerald-800',
          border: theme === 'dark' ? 'border-emerald-700/40' : 'border-emerald-200',
        };
      case 'decrease':
        return {
          bg: theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50',
          text: theme === 'dark' ? 'text-red-200' : 'text-red-800',
          border: theme === 'dark' ? 'border-red-700/40' : 'border-red-200',
        };
      default:
        return {
          bg: theme === 'dark' ? 'bg-gray-800/40' : 'bg-gray-50',
          text: theme === 'dark' ? 'text-gray-200' : 'text-gray-800',
          border: theme === 'dark' ? 'border-gray-700/40' : 'border-gray-200',
        };
    }
  };

  const getTrendIcon = (trend: 'increase' | 'decrease' | 'neutral') => {
    switch (trend) {
      case 'increase': return <FaChevronUp className={theme === 'dark' ? 'text-emerald-300' : 'text-emerald-600'} />;
      case 'decrease': return <FaChevronDown className={theme === 'dark' ? 'text-red-300' : 'text-red-600'} />;
      default: return <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>→</span>;
    }
  };

  const getScoreTone = (score: number) => {
    if (score >= 4.5) return 'excellent' as const;
    if (score >= 3.5) return 'good' as const;
    if (score >= 2.5) return 'average' as const;
    return 'low' as const;
  };

  const getScoreBadgeClass = (score: number) => {
    const tone = getScoreTone(score);
    const base = 'text-center font-bold px-3 py-1 rounded-lg border';
    if (tone === 'excellent') {
      return combine(
        base,
        theme === 'dark'
          ? 'bg-emerald-900/20 text-emerald-200 border-emerald-700/40'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      );
    }
    if (tone === 'good') {
      return combine(
        base,
        theme === 'dark'
          ? 'bg-green-900/20 text-green-200 border-green-700/40'
          : 'bg-green-50 text-green-800 border-green-200'
      );
    }
    if (tone === 'average') {
      return combine(
        base,
        theme === 'dark'
          ? 'bg-yellow-900/20 text-yellow-200 border-yellow-700/40'
          : 'bg-yellow-50 text-yellow-800 border-yellow-200'
      );
    }
    return combine(
      base,
      theme === 'dark'
        ? 'bg-red-900/20 text-red-200 border-red-700/40'
        : 'bg-red-50 text-red-800 border-red-200'
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
                  <FaUserFriends className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Behavior Reports</h1>
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
            onClick={() => {
              setActiveTab('submit');
              setMyReports(null);
              setBehaviorTrendData(null);
              setSpecificBehaviorTrend(null);
            }}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'submit'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaPaperPlane />
            Submit Reports
          </button>
          <button
            onClick={() => {
              setActiveTab('myreports');
              fetchMyReports();
              setTrendAnalysis(prev => ({ 
                ...prev, 
                showTrends: false,
                expandedStudentId: null 
              }));
            }}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'myreports'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaEye />
            My Reports & Trends
          </button>

          <button
            onClick={() => {
              setActiveTab('trends');
            }}
            className={combine(
              'flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-lg sm:rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-xs sm:text-sm',
              activeTab === 'trends'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                : combine(get('text', 'secondary'), 'hover:opacity-90')
            )}
          >
            <FaChartLine />
            Trends
          </button>
        </div>

        {/* Filters Section */}
        {activeTab !== 'trends' && (
          <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
            <div className="flex items-center gap-2 mb-4">
              <FaFilter className={combine('text-sm sm:text-base', get('accent', 'primary'))} />
              <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Filters</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5">
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
                  })}
                  disabled={!filters.class}
                  className={combine(getInputClass(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
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
                  onChange={(e) => setFilters({ ...filters, term: e.target.value })}
                  disabled={!filters.subject}
                  className={getInputClass()}
                >
                  <option value="">Select Term</option>
                  {getTermsForSelection().map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Action Buttons based on active tab */}
            <div className={combine('flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 pt-6 border-t', get('border', 'secondary'))}>
              {activeTab === 'submit' && (
                <button
                  onClick={fetchStudentsForBehaviorReport}
                  disabled={!filters.class || !filters.section || !filters.term || !filters.subject || loading}
                  className={combine(
                    getPrimaryButtonClass(),
                    'w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Loading...
                    </>
                  ) : showBehaviorTable ? (
                    <>
                      <FaTimesCircle />
                      Refresh Reports
                    </>
                  ) : (
                    <>
                      <FaEye />
                      View/Edit Behavior Reports
                    </>
                  )}
                </button>
              )}
              
              {activeTab === 'myreports' && (
                <button
                  onClick={fetchMyReports}
                  disabled={!filters.class || !filters.section || !filters.term || !filters.subject || loading}
                  className={combine(
                    getPrimaryButtonClass(),
                    'w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <FaEye />
                      View My Reports
                    </>
                  )}
                </button>
              )}
              
              <button
                onClick={clearAllFilters}
                className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center')}
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Behavior Reports Table - Only shown in Submit tab when reports are loaded */}
        {activeTab === 'submit' && showBehaviorTable && (
          <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h3 className={combine('text-base sm:text-lg lg:text-xl font-bold', get('text', 'primary'))}>
                  {behaviorReports.some(r => r.is_submitted) ? 'Edit' : 'Submit'} Behavior Reports
                </h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  {filters.class}-{filters.section} • {filters.subject} ({filters.term})
                </p>
                <div className="flex items-center gap-4 mt-1">
                  <span className={combine(
                    'text-xs sm:text-sm px-2 py-1 rounded-lg border',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-50 text-emerald-800'
                  )}>
                    Submitted: {behaviorReports.filter(r => r.is_submitted).length}
                  </span>
                  <span className={combine(
                    'text-xs sm:text-sm px-2 py-1 rounded-lg border',
                    get('border', 'secondary'),
                    theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-800'
                  )}>
                    Pending: {behaviorReports.filter(r => !r.is_submitted).length}
                  </span>
                </div>
              </div>
            </div>

            <div className={combine(getSoftCardClass(), 'mb-6')}>
              <div className={combine('flex items-center gap-2 mb-2', get('text', 'secondary'))}>
                <FaExclamationTriangle />
                <span className="font-medium">Scoring Guide (1-5):</span>
              </div>
              <div className={combine('grid grid-cols-2 md:grid-cols-5 gap-2', get('text', 'secondary'))}>
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border text-center', get('border', 'secondary'))}>
                  <div className="font-bold text-red-600">1</div>
                  <div className="text-xs">Unsatisfactory</div>
                </div>
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border text-center', get('border', 'secondary'))}>
                  <div className="font-bold text-orange-600">2</div>
                  <div className="text-xs">Needs Improvement</div>
                </div>
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border text-center', get('border', 'secondary'))}>
                  <div className="font-bold text-yellow-600">3</div>
                  <div className="text-xs">Meets Expectations</div>
                </div>
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border text-center', get('border', 'secondary'))}>
                  <div className="font-bold text-blue-600">4</div>
                  <div className="text-xs">Exceeds Expectations</div>
                </div>
                <div className={combine(get('bg', 'card'), 'p-2 rounded-lg border text-center', get('border', 'secondary'))}>
                  <div className="font-bold text-green-600">5</div>
                  <div className="text-xs">Outstanding</div>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={get('bg', 'tertiary')}>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Student Name / ID
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Participation (1-5)
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Responsibility (1-5)
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Discipline (1-5)
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Attitude (1-5)
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Collaboration (1-5)
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Remarks
                    </th>
                    <th className={combine('py-3 px-4 text-left text-xs sm:text-sm font-semibold', get('text', 'secondary'))}>
                      Avg Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {behaviorReports.map((report) => {
                    const avgScore = (
                      report.class_participation +
                      report.homework_responsibility +
                      report.classroom_discipline +
                      report.learning_attitude +
                      report.social_behaviour
                    ) / 5;
                    
                    return (
                      <tr
                        key={report.student_id}
                        className={combine('border-b transition-colors hover:bg-[var(--color-bg-hover)]', get('border', 'secondary'))}
                      >
                        <td className="py-3 px-4">
                          <div className={combine('font-medium', get('text', 'primary'))}>{report.student_name}</div>
                          <div className={combine('text-xs', get('text', 'muted'))}>{report.student_id}</div>
                          {report.is_submitted && (
                            <div className={combine(
                              'text-xs mt-1 flex items-center gap-1',
                              theme === 'dark' ? 'text-emerald-200' : 'text-emerald-700'
                            )}>
                              <FaCheckCircle size={10} />
                              Submitted
                            </div>
                          )}
                        </td>
                        
                        {['class_participation', 'homework_responsibility', 'classroom_discipline', 'learning_attitude', 'social_behaviour'].map((field) => (
                          <td key={field} className="py-3 px-4">
                            <select
                              value={report[field as keyof BehaviorReport] as number}
                              onChange={(e) => handleBehaviorChange(report.student_id, field as keyof BehaviorReport, parseInt(e.target.value))}
                              className={getInputClass()}
                            >
                              {[1, 2, 3, 4, 5].map(num => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </td>
                        ))}
                        
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={report.remarks}
                            onChange={(e) => handleBehaviorChange(report.student_id, 'remarks', e.target.value)}
                            className={getInputClass()}
                            placeholder="Optional remarks..."
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className={getScoreBadgeClass(avgScore)}>
                            {avgScore.toFixed(1)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className={combine('mt-8 pt-6 border-t', get('border', 'secondary'))}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className={combine('text-sm', get('text', 'secondary'))}>Total Students: {behaviorReports.length}</div>
                  <div className={combine('text-sm', get('text', 'secondary'))}>
                    Average Scores: {
                      behaviorReports.length > 0 ? (
                        Object.entries({
                          Participation: behaviorReports.reduce((sum, r) => sum + r.class_participation, 0) / behaviorReports.length,
                          Responsibility: behaviorReports.reduce((sum, r) => sum + r.homework_responsibility, 0) / behaviorReports.length,
                          Discipline: behaviorReports.reduce((sum, r) => sum + r.classroom_discipline, 0) / behaviorReports.length,
                          Attitude: behaviorReports.reduce((sum, r) => sum + r.learning_attitude, 0) / behaviorReports.length,
                          Collaboration: behaviorReports.reduce((sum, r) => sum + r.social_behaviour, 0) / behaviorReports.length
                        }).map(([key, value]) => `${key}: ${value.toFixed(1)}`).join(' • ')
                      ) : 'N/A'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={submitBehaviorReports}
                  disabled={submittingBehavior || behaviorReports.length === 0}
                  className={combine(
                    getPrimaryButtonClass(),
                    'flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {submittingBehavior ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      {behaviorReports.some(r => r.is_submitted) ? 'Updating...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <FaPaperPlane />
                      {behaviorReports.some(r => r.is_submitted) ? 'Update Behavior Reports' : 'Submit Behavior Reports'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* My Reports Tab with Trend Analysis */}
        {activeTab === 'myreports' && (
          <div className="space-y-6 sm:space-y-8">
            {myReports ? (
              <>
                {/* Summary Section */}
                <div className={getCardGradientClass('blue')}>
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
                    <div>
                      <h3 className={combine('text-base sm:text-lg lg:text-xl font-bold', get('text', 'primary'))}>
                        My Subject Behavior Reports
                      </h3>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                        Class {myReports.class}-{myReports.section} • {myReports.subject} ({myReports.term})
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className={combine(
                          'text-xs sm:text-sm px-3 py-1 rounded-full flex items-center gap-1 border',
                          get('border', 'secondary'),
                          theme === 'dark' ? 'bg-emerald-900/20 text-emerald-200' : 'bg-emerald-50 text-emerald-800'
                        )}>
                          <FaCheckCircle size={12} />
                          {myReports.submitted_reports} Reports Submitted
                        </span>
                        <span className={combine(
                          'text-xs sm:text-sm px-3 py-1 rounded-full border',
                          get('border', 'secondary'),
                          theme === 'dark' ? 'bg-blue-900/20 text-blue-200' : 'bg-blue-50 text-blue-800'
                        )}>
                          Total Students: {myReports.total_students}
                        </span>
                        <span className={combine(
                          'text-xs sm:text-sm px-3 py-1 rounded-full border',
                          get('border', 'secondary'),
                          theme === 'dark' ? 'bg-yellow-900/20 text-yellow-200' : 'bg-yellow-50 text-yellow-800'
                        )}>
                          Pending: {myReports.pending_reports}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          toastInfo('Export feature coming soon!');
                        }}
                        className={combine(getSecondaryButtonClass(), 'px-4 py-2 flex items-center gap-2')}
                      >
                        <FaDownload />
                        Export
                      </button>
                      <button
                        onClick={fetchMyReports}
                        disabled={loading}
                        className={combine(
                          getPrimaryButtonClass(),
                          'px-4 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        {loading ? <FaSpinner className="animate-spin" /> : <FaSearch />}
                        Refresh
                      </button>
                    </div>
                  </div>

                  {/* Summary Statistics Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {[
                      { 
                        title: 'Participation', 
                        value: myReports.summary.average_participation,
                        color: 'from-green-500 to-emerald-600',
                        icon: <FaUserFriends />
                      },
                      { 
                        title: 'Responsibility', 
                        value: myReports.summary.average_responsibility,
                        color: 'from-blue-500 to-cyan-600',
                        icon: <FaCheckCircle />
                      },
                      { 
                        title: 'Discipline', 
                        value: myReports.summary.average_discipline,
                        color: 'from-purple-500 to-violet-600',
                        icon: <FaChartBar />
                      },
                      { 
                        title: 'Attitude', 
                        value: myReports.summary.average_attitude,
                        color: 'from-orange-500 to-amber-600',
                        icon: <FaChartLine />
                      },
                      { 
                        title: 'Collaboration', 
                        value: myReports.summary.average_collaboration,
                        color: 'from-pink-500 to-rose-600',
                        icon: <FaComments />
                      },
                      { 
                        title: 'Overall', 
                        value: myReports.summary.average_overall,
                        color: 'from-indigo-500 to-purple-600',
                        icon: <FaStar />
                      }
                    ].map((stat, index) => (
                      <div 
                        key={stat.title} 
                        className={`bg-gradient-to-r ${stat.color} text-white rounded-xl p-4 shadow-lg`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm opacity-90">{stat.title}</div>
                          <div>{stat.icon}</div>
                        </div>
                        <div className="text-2xl font-bold">{stat.value.toFixed(1)}</div>
                        <div className="text-xs opacity-90 mt-1">
                          {stat.value >= 4.5 ? 'Excellent' : 
                           stat.value >= 3.5 ? 'Good' : 
                           stat.value >= 2.5 ? 'Average' : 'Needs Improvement'}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Behavior Distribution Charts */}
                  <div className="mb-8">
                    <h4 className={combine('text-base sm:text-lg font-semibold mb-4', get('text', 'primary'))}>
                      Behavior Distribution Analysis
                    </h4>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className={getSoftCardClass()}>
                        <h5 className={combine('font-semibold text-xs sm:text-sm mb-4 text-center', get('text', 'secondary'))}>
                          Category Performance Radar
                        </h5>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart data={getBehaviorCategoryData(myReports.reports)}>
                              <PolarGrid stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                              <PolarAngleAxis 
                                dataKey="category" 
                                tick={{ fill: theme === 'dark' ? '#d1d5db' : '#4b5563', fontSize: 12 }}
                              />
                              <PolarRadiusAxis 
                                domain={[0, 5]} 
                                tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: 10 }}
                              />
                              <Radar
                                name="Average Score"
                                dataKey="average"
                                stroke="#10b981"
                                fill="#10b981"
                                fillOpacity={0.6}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                                  borderRadius: '8px',
                                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  color: theme === 'dark' ? '#f9fafb' : '#111827',
                                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                                formatter={(value) => [`${value}/5`, 'Score']}
                              />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div className={getSoftCardClass()}>
                        <h5 className={combine('font-semibold text-xs sm:text-sm mb-4 text-center', get('text', 'secondary'))}>
                          Student Performance Overview
                        </h5>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getStudentPerformanceData(myReports.reports)}>
                              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#d1d5db'} />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
                              />
                              <YAxis 
                                domain={[0, 5]} 
                                tick={{ fontSize: 12, fill: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
                              />
                              <Tooltip
                                contentStyle={{ 
                                  backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                                  borderRadius: '8px',
                                  border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                  color: theme === 'dark' ? '#f9fafb' : '#111827',
                                }}
                                formatter={(value) => [`${value}/5`, 'Average Score']}
                                labelFormatter={(label) => `Student: ${label}`}
                              />
                              <Legend />
                              <Bar 
                                dataKey="average" 
                                name="Average Score"
                                fill="#8b5cf6"
                                radius={[4, 4, 0, 0]}
                                animationDuration={1500}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Reports Table */}
                <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className={combine('text-sm sm:text-base font-semibold', get('text', 'primary'))}>Detailed Behavior Reports</h4>
                    <div className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      Showing {myReports.reports.length} students
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className={get('bg', 'tertiary')}>
                          <th className="py-4 px-6 text-left">
                            <button
                              onClick={() => handleSort('student_name')}
                              className={combine('flex items-center gap-2 font-semibold text-xs sm:text-sm', get('text', 'secondary'))}
                            >
                              Student
                              {sortConfig.key === 'student_name' && (
                                sortConfig.direction === 'asc' ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          {[
                            { key: 'class_participation', label: 'Participation', icon: <FaUserFriends size={14} /> },
                            { key: 'homework_responsibility', label: 'Responsibility', icon: <FaCheckCircle size={14} /> },
                            { key: 'classroom_discipline', label: 'Discipline', icon: <FaChartBar size={14} /> },
                            { key: 'learning_attitude', label: 'Attitude', icon: <FaChartLine size={14} /> },
                            { key: 'social_behaviour', label: 'Collaboration', icon: <FaComments size={14} /> }
                          ].map((header) => (
                            <th key={header.key} className="py-4 px-6 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <div className={get('text', 'muted')}>{header.icon}</div>
                                <div className={combine('text-xs font-semibold', get('text', 'secondary'))}>{header.label}</div>
                              </div>
                            </th>
                          ))}
                          <th className="py-4 px-6 text-left">
                            <button
                              onClick={() => handleSort('average_score')}
                              className={combine('flex items-center gap-2 font-semibold text-xs sm:text-sm hover:opacity-90', get('text', 'secondary'))}
                            >
                              Overall
                              {sortConfig.key === 'average_score' && (
                                sortConfig.direction === 'asc' ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />
                              )}
                            </button>
                          </th>
                          <th className={combine('py-4 px-6 text-left font-semibold text-xs sm:text-sm', get('text', 'secondary'))}>Remarks</th>
                          <th className={combine('py-4 px-6 text-left font-semibold text-xs sm:text-sm', get('text', 'secondary'))}>Actions</th>
                        </tr>
                      </thead>
                      <tbody className={combine('divide-y', theme === 'dark' ? 'divide-gray-700/60' : 'divide-gray-200')}>
                        {sortedReports.map((report) => {
                          const avgScore = report.average_score || 0;
                          const type = avgScore >= 4.5 ? 'Excellent' : 
                                    avgScore >= 3.5 ? 'Good' : 
                                    avgScore >= 2.5 ? 'Average' : 'Needs Improvement';
                          
                          return (
                            <React.Fragment key={report.student_id}>
                              <tr className="transition-colors hover:bg-[var(--color-bg-hover)]">
                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                      {report.student_name?.charAt(0) || report.student_id.charAt(0)}
                                    </div>
                                    <div>
                                      <div className={combine('font-medium', get('text', 'primary'))}>{report.student_name}</div>
                                      <div className={combine('text-sm', get('text', 'muted'))}>{report.student_id}</div>
                                    </div>
                                  </div>
                                </td>
                                
                                {[
                                  'class_participation',
                                  'homework_responsibility',
                                  'classroom_discipline',
                                  'learning_attitude',
                                  'social_behaviour'
                                ].map((field:any) => {
                                  const value = report[field as keyof BehaviorReport] as number;

                                  return (
                                    <td key={field} className="py-4 px-6">
                                      <div className="flex flex-col items-center">
                                        <div className={`text-lg font-bold ${
                                          value >= 4 ? 'text-green-600' :
                                          value >= 3 ? 'text-yellow-600' :
                                          'text-red-600'
                                        }`}>
                                          {value}
                                        </div>
                                        <div className="flex mt-1">
                                          {getStarRating(value)}
                                        </div>
                                        <div className={combine('text-xs mt-1', get('text', 'muted'))}>
                                          {value >= 4 ? 'Good' :
                                           value >= 3 ? 'Avg' : 'Low'}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}
                                
                                <td className="py-4 px-6">
                                  <div className={combine(get('bg', 'card'), 'p-3 rounded-xl border flex flex-col items-center', get('border', 'secondary'))}>
                                    <div className={combine(getScoreBadgeClass(avgScore), 'w-full')}>{avgScore.toFixed(1)}</div>
                                    <div className={combine('text-xs font-semibold mt-2', get('text', 'secondary'))}>{type}</div>
                                    <div className="flex mt-2">{getStarRating(avgScore)}</div>
                                  </div>
                                </td>
                                
                                <td className="py-4 px-6 max-w-xs">
                                  <div className={combine(get('bg', 'card'), 'text-sm p-3 rounded-lg border', get('border', 'secondary'), get('text', 'secondary'))}>
                                    {report.remarks || (
                                      <span className={combine('italic', get('text', 'muted'))}>No remarks provided</span>
                                    )}
                                  </div>
                                </td>
                                
                                <td className="py-4 px-6">
                                  <button
                                    onClick={() => handleViewTrends(report.student_id, report.student_name || '')}
                                    className={combine(getPrimaryButtonClass(), 'px-4 py-2 flex items-center gap-2')}
                                  >
                                    <FaChartLine />
                                    View Trends
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Trend Analysis Section for this student */}
                              {false && trendAnalysis.expandedStudentId === report.student_id && (
                                <tr>
                                  <td colSpan={9} className="p-0">
                                    <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-xl m-4 p-6 shadow-inner">
                                      <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                          <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg text-white">
                                            <FaChartLine size={20} />
                                          </div>
                                          <div>
                                            <h4 className="text-lg font-bold text-gray-800">Behavior Trend Analysis</h4>
                                            <p className="text-gray-600 text-sm">
                                              Student: {report.student_name} • 
                                              Subject: {filters.subject}
                                            </p>
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => setTrendAnalysis(prev => ({ ...prev, expandedStudentId: null }))}
                                          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                          Close Analysis
                                        </button>
                                      </div>

                                      {/* Trend Analysis Controls */}
                                      <div className="bg-white rounded-xl p-6 mb-8 border border-green-200">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Selected Student
                                            </label>
                                            <div className="relative">
                                              <FaUserFriends className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                              <div className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-green-300 rounded-lg shadow-sm">
                                                <div className="text-lg font-semibold text-gray-800">
                                                  {report.student_name}
                                                </div>
                                                <div className="text-xs text-green-600 mt-1">
                                                  Student ID: {report.student_id}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              Behavior Type
                                            </label>
                                            <div className="relative">
                                              <FaChartBar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                              <select
                                                value={trendAnalysis.selectedBehavior}
                                                onChange={(e) => handleBehaviorTypeChange(e.target.value as typeof trendAnalysis.selectedBehavior)}
                                                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm appearance-none"
                                              >
                                                <option value="overall">Overall Behavior</option>
                                                <option value="participation">Class Participation</option>
                                                <option value="responsibility">Homework Responsibility</option>
                                                <option value="discipline">Classroom Discipline</option>
                                                <option value="attitude">Learning Attitude</option>
                                                <option value="collaboration">Social Behaviour/Collaboration</option>
                                              </select>
                                              <FaChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                          </div>
                                          
                                          <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                              View Details
                                            </label>
                                            <div className="relative">
                                              <FaBook className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                              <div className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-blue-300 rounded-lg shadow-sm">
                                                <div className="text-lg font-semibold text-gray-800">
                                                  {getBehaviorTypeLabel(trendAnalysis.selectedBehavior)}
                                                </div>
                                                <div className="text-xs text-blue-600 mt-1">
                                                  Trend Analysis: {behaviorTrendData?.viewed_by || specificBehaviorTrend?.viewed_by || 'Loading...'}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                        
                                        <div className="flex gap-4 mt-6 pt-6 border-t border-green-200">
                                          <button
                                            onClick={() => fetchBehaviorTrends(report.student_id, report.student_name || '', trendAnalysis.selectedBehavior)}
                                            disabled={loadingTrends}
                                            className={`px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
                                              loadingTrends
                                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                                            }`}
                                          >
                                            {loadingTrends ? (
                                              <>
                                                <FaSpinner className="animate-spin" />
                                                Loading Trends...
                                              </>
                                            ) : (
                                              <>
                                                <FaChartLine />
                                                Refresh Trends
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </div>

                                      {/* Trend Visualization */}
                                      {loadingTrends ? (
                                        <div className="flex justify-center items-center py-16">
                                          <div className="text-center">
                                            <FaSpinner className="animate-spin text-4xl text-green-600 mx-auto mb-4" />
                                            <p className="text-gray-600">Loading trend data...</p>
                                          </div>
                                        </div>
                                      ) : behaviorTrendData?.graph_data || specificBehaviorTrend?.graph_data ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                          {/* Trend Chart */}
                                          <div className="space-y-4">
                                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                                              <div className="flex items-center justify-between mb-4">
                                                <h5 className="font-semibold text-gray-700">Trend Visualization</h5>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-sm text-gray-500">
                                                    {trendAnalysis.selectedBehavior === 'overall' ? 'Overall Behavior' : 
                                                     getBehaviorTypeLabel(trendAnalysis.selectedBehavior)}
                                                  </span>
                                                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                                                    behaviorTrendData?.viewed_by === 'Class Teacher' 
                                                      ? 'bg-blue-100 text-blue-800' 
                                                      : 'bg-green-100 text-green-800'
                                                  }`}>
                                                    {behaviorTrendData?.viewed_by || specificBehaviorTrend?.viewed_by || 'Teacher View'}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="h-64">
                                                <ResponsiveContainer width="100%" height="100%">
                                                  <LineChart data={getTrendChartData()}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                                    <XAxis 
                                                      dataKey="name" 
                                                      tick={{ fill: '#4a5568', fontSize: 12 }}
                                                      axisLine={{ stroke: '#cbd5e0' }}
                                                    />
                                                    <YAxis 
                                                      domain={[1, 5]} 
                                                      tick={{ fill: '#4a5568', fontSize: 12 }}
                                                      axisLine={{ stroke: '#cbd5e0' }}
                                                      tickCount={5}
                                                      label={{ 
                                                        value: 'Score (1-5)', 
                                                        angle: -90, 
                                                        position: 'insideLeft',
                                                        offset: 10,
                                                        style: { fill: '#718096', fontSize: 12 }
                                                      }}
                                                    />
                                                    <Tooltip
                                                      contentStyle={{ 
                                                        backgroundColor: 'white',
                                                        borderRadius: '8px',
                                                        border: '1px solid #e2e8f0',
                                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                        padding: '12px'
                                                      }}
                                                      formatter={(value) => [`${value}/5`, 'Score']}
                                                      labelFormatter={(label) => `Term: ${label}`}
                                                    />
                                                    <Legend 
                                                      verticalAlign="top" 
                                                      height={36}
                                                      iconType="circle"
                                                    />
                                                    <Line 
                                                      type="monotone" 
                                                      dataKey="value" 
                                                      name="Behavior Score"
                                                      stroke="#10b981"
                                                      strokeWidth={3}
                                                      dot={{ r: 6, fill: '#10b981', stroke: 'white', strokeWidth: 2 }}
                                                      activeDot={{ r: 8, fill: '#059669' }}
                                                      animationDuration={1500}
                                                      animationEasing="ease-in-out"
                                                    />
                                                    <Line 
                                                      type="monotone" 
                                                      dataKey="change" 
                                                      name="Change %"
                                                      stroke="#8b5cf6"
                                                      strokeWidth={2}
                                                      strokeDasharray="5 5"
                                                      dot={{ r: 4, fill: '#8b5cf6' }}
                                                      animationDuration={1500}
                                                      animationEasing="ease-in-out"
                                                    />
                                                  </LineChart>
                                                </ResponsiveContainer>
                                              </div>
                                              <div className="mt-4 text-sm text-gray-600 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                                    <span>Behavior Score</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 bg-purple-500 rounded-full" style={{ border: '2px dashed #8b5cf6' }}></div>
                                                    <span>Change Percentage</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            
                                            {/* Current Status Cards */}
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                                                <div className="text-sm text-gray-600 mb-1">Current Score</div>
                                                <div className="text-2xl font-bold text-green-700">
                                                  {getTrendChartData().length > 0 
                                                    ? getTrendChartData()[getTrendChartData().length - 1]?.value.toFixed(1)
                                                    : 'N/A'}
                                                  <span className="text-lg text-gray-500">/5</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  Latest: {getTrendChartData().length > 0 ? getTrendChartData()[getTrendChartData().length - 1]?.name : 'N/A'}
                                                </div>
                                              </div>
                                              
                                              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                                                <div className="text-sm text-gray-600 mb-1">Average Score</div>
                                                <div className="text-2xl font-bold text-blue-700">
                                                  {getTrendChartData().length > 0
                                                    ? (getTrendChartData().reduce((sum, d) => sum + d.value, 0) / getTrendChartData().length).toFixed(1)
                                                    : 'N/A'}
                                                  <span className="text-lg text-gray-500">/5</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {getTrendChartData().length} data points
                                                </div>
                                              </div>
                                              
                                              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                                                <div className="text-sm text-gray-600 mb-1">Best Score</div>
                                                <div className="text-2xl font-bold text-purple-700">
                                                  {getTrendChartData().length > 0
                                                    ? Math.max(...getTrendChartData().map(d => d.value)).toFixed(1)
                                                    : 'N/A'}
                                                  <span className="text-lg text-gray-500">/5</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {getTrendChartData().length > 0 
                                                    ? getTrendChartData().find(d => d.value === Math.max(...getTrendChartData().map(d => d.value)))?.name 
                                                    : 'N/A'}
                                                </div>
                                              </div>
                                              
                                              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                                <div className="text-sm text-gray-600 mb-1">Latest Change</div>
                                                <div className="text-2xl font-bold text-amber-700">
                                                  {getTrendChartData().length > 1
                                                    ? `${getTrendChartData()[getTrendChartData().length - 1]?.trend === 'increase' ? '+' : ''}${
                                                      getTrendChartData()[getTrendChartData().length - 1]?.change.toFixed(1)
                                                    }%`
                                                    : 'N/A'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                  {getTrendChartData().length > 0 && 
                                                   getTrendChartData()[getTrendChartData().length - 1]?.trend === 'increase' 
                                                   ? <FaChevronUp className="text-green-600" />
                                                   : getTrendChartData()[getTrendChartData().length - 1]?.trend === 'decrease'
                                                   ? <FaChevronDown className="text-red-600" />
                                                   : <span className="text-gray-600">→</span>}
                                                  <span>
                                                    {getTrendChartData().length > 0 
                                                      ? getTrendChartData()[getTrendChartData().length - 1]?.trend || 'Neutral'
                                                      : 'N/A'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Trend Details */}
                                          <div className="space-y-4">
                                            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                                              <div className="flex items-center justify-between mb-4">
                                                <h5 className="font-semibold text-gray-700">Detailed Trend Analysis</h5>
                                                <div className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                                                  {report.student_name}
                                                </div>
                                              </div>
                                              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                                                {getTrendChartData().map((item, index) => {
                                                  const trendColors = getTrendColor(item.trend);
                                                  const prevValue = index > 0 ? getTrendChartData()[index - 1]?.value : null;
                                                  
                                                  return (
                                                    <div 
                                                      key={`${item.name}-${index}`} 
                                                      className={`p-4 rounded-xl border-2 transition-all hover:shadow-md ${trendColors.border} ${trendColors.bg}`}
                                                    >
                                                      <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-3">
                                                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                                                            item.trend === 'increase' ? 'bg-green-100 text-green-800' :
                                                            item.trend === 'decrease' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'
                                                          }`}>
                                                            <span className="font-bold">{item.index}</span>
                                                          </div>
                                                          <div>
                                                            <div className="font-bold text-gray-800">{item.name}</div>
                                                            <div className="text-xs text-gray-600">Term/Exam Assessment</div>
                                                          </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                          <div className="text-right">
                                                            <div className="text-2xl font-bold text-gray-800">{item.value.toFixed(1)}</div>
                                                            <div className="text-xs text-gray-500">Score (1-5)</div>
                                                          </div>
                                                          <div className={`p-2 rounded-lg ${
                                                            item.trend === 'increase' ? 'bg-green-100 text-green-800 border border-green-200' : 
                                                            item.trend === 'decrease' ? 'bg-red-100 text-red-800 border border-red-200' : 
                                                            'bg-gray-100 text-gray-800 border border-gray-200'
                                                          }`}>
                                                            {getTrendIcon(item.trend)}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      
                                                      <div className="grid grid-cols-3 gap-4 mb-3">
                                                        <div className="text-center">
                                                          <div className="text-xs text-gray-500">Stars</div>
                                                          <div className="flex justify-center mt-1">
                                                            {getStarRating(item.value)}
                                                          </div>
                                                        </div>
                                                        <div className="text-center">
                                                          <div className="text-xs text-gray-500">Change</div>
                                                          <div className={`text-sm font-semibold mt-1 ${trendColors.text}`}>
                                                            {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}%
                                                          </div>
                                                        </div>
                                                        <div className="text-center">
                                                          <div className="text-xs text-gray-500">Status</div>
                                                          <div className={`text-sm font-medium mt-1 px-2 py-1 rounded-full inline-block ${
                                                            item.value >= 4 ? 'bg-green-100 text-green-800' :
                                                            item.value >= 3 ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                          }`}>
                                                            {item.value >= 4 ? 'Excellent' :
                                                             item.value >= 3 ? 'Good' :
                                                             item.value >= 2.5 ? 'Average' : 'Needs Improvement'}
                                                          </div>
                                                        </div>
                                                      </div>
                                                      
                                                      {prevValue !== null && (
                                                        <div className="pt-3 border-t border-gray-200 border-opacity-50">
                                                          <div className="flex items-center justify-between text-sm">
                                                            <span className="text-gray-600">Previous: {prevValue.toFixed(1)}</span>
                                                            <span className={`font-medium ${
                                                              item.value > prevValue ? 'text-green-600' :
                                                              item.value < prevValue ? 'text-red-600' :
                                                              'text-gray-600'
                                                            }`}>
                                                              {item.value > prevValue ? '↑ Improvement' :
                                                               item.value < prevValue ? '↓ Decline' :
                                                               '→ No Change'}
                                                            </span>
                                                            <span className="text-gray-600">
                                                              Diff: {(item.value - prevValue).toFixed(1)}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      )}
                                                      
                                                      {item.value < 3 && (
                                                        <div className="mt-3 pt-3 border-t border-yellow-200">
                                                          <div className="text-xs text-amber-700 flex items-center gap-1">
                                                            <FaExclamationTriangle />
                                                            <span>Attention: Score below average. Consider intervention or support.</span>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                            
                                            {/* Performance Summary */}
                                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white">
                                              <h5 className="font-semibold mb-4">Performance Summary</h5>
                                              <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.value >= 4).length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Excellent</div>
                                                  <div className="text-xs opacity-70 mt-1">
                                                    ≥4.0
                                                  </div>
                                                </div>
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.value >= 3 && d.value < 4).length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Good</div>
                                                  <div className="text-xs opacity-70 mt-1">
                                                    3.0-3.9
                                                  </div>
                                                </div>
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.value < 3).length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Needs Help</div>
                                                  <div className="text-xs opacity-70 mt-1">
                                                    &lt;3.0
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="grid grid-cols-3 gap-3 mt-3">
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.trend === 'increase').length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Improving</div>
                                                  <div className="text-xs opacity-70 mt-1 flex items-center justify-center">
                                                    <FaChevronUp className="text-green-300" />
                                                  </div>
                                                </div>
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.trend === 'neutral').length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Stable</div>
                                                  <div className="text-xs opacity-70 mt-1 flex items-center justify-center">
                                                    <span className="text-gray-300">→</span>
                                                  </div>
                                                </div>
                                                <div className="bg-white/20 p-3 rounded-lg backdrop-blur-sm">
                                                  <div className="text-2xl font-bold">
                                                    {getTrendChartData().filter(d => d.trend === 'decrease').length}
                                                  </div>
                                                  <div className="text-xs opacity-90">Declining</div>
                                                  <div className="text-xs opacity-70 mt-1 flex items-center justify-center">
                                                    <FaChevronDown className="text-red-300" />
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              <div className="mt-4 pt-4 border-t border-white/30">
                                                <div className="text-sm">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span>Overall Trend Analysis:</span>
                                                    <span className="font-semibold">
                                                      {getTrendChartData().filter(d => d.trend === 'increase').length > 
                                                       getTrendChartData().filter(d => d.trend === 'decrease').length 
                                                       ? '📈 Improving' 
                                                       : getTrendChartData().filter(d => d.trend === 'decrease').length > 
                                                         getTrendChartData().filter(d => d.trend === 'increase').length 
                                                       ? '📉 Declining' 
                                                       : '➡️ Stable'}
                                                    </span>
                                                  </div>
                                                  <div className="text-xs opacity-90">
                                                    Based on {getTrendChartData().length} assessments in {filters.subject}
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className={combine(getSoftCardClass(), 'text-center py-10 sm:py-12')}>
                                          <FaChartLine className={combine('text-4xl mx-auto mb-4', get('text', 'muted'))} />
                                          <h3 className={combine('text-sm sm:text-base font-semibold mb-2', get('text', 'primary'))}>
                                            No Trend Data Available
                                          </h3>
                                          <p className={combine('text-xs sm:text-sm mb-4', get('text', 'secondary'))}>
                                            {specificBehaviorTrend?.student 
                                              ? `No trend data found for ${specificBehaviorTrend?.student || report.student_name || report.student_id} in ${filters.subject}`
                                              : `No trend data available for this student in ${filters.subject}`}
                                          </p>
                                          <button
                                            onClick={() => fetchBehaviorTrends(report.student_id, report.student_name || '', trendAnalysis.selectedBehavior)}
                                            className={combine(getPrimaryButtonClass(), 'px-4 py-2')}
                                          >
                                            Try Loading Again
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className={combine(get('bg', 'tertiary'), 'px-4 sm:px-6 py-4 border-t mt-6', get('border', 'secondary'))}>
                    <div className={combine('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm', get('text', 'secondary'))}>
                      <div>
                        Showing {sortedReports.length} of {myReports.total_students} students
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <span>Excellent (4.5+)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span>Good (3.5-4.4)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                          <span>Average (2.5-3.4)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                          <span>Needs Improvement (&lt;2.5)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
                <div className="text-center py-10 sm:py-12">
                  <FaEye className={combine('text-4xl sm:text-5xl mx-auto mb-4', get('text', 'muted'))} />
                  <h3 className={combine('text-sm sm:text-base font-semibold mb-2', get('text', 'primary'))}>No Reports Found</h3>
                  <p className={combine('text-xs sm:text-sm mb-6', get('text', 'secondary'))}>
                    Select your class, section, term, and subject to view your submitted behavior reports.
                  </p>
                  <button
                    onClick={fetchMyReports}
                    disabled={!filters.class || !filters.section || !filters.term || !filters.subject}
                    className={combine(
                      getPrimaryButtonClass(),
                      'px-6 py-3 flex items-center gap-2 mx-auto disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <FaSearch />
                    Load My Reports
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Trends Tab - Student specific */}
        {activeTab === 'trends' && (
          <div className="space-y-6 sm:space-y-8">
            <div className={combine(getCardGradientClass('blue'), 'mb-6 sm:mb-8')}>
              <div className="flex items-center gap-2 mb-4">
                <FaFilter className={combine('text-sm sm:text-base', get('accent', 'primary'))} />
                <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Trends Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5">
                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Class *
                  </label>
                  <select
                    value={filters.class}
                    onChange={(e) => {
                      setFilters({
                        class: e.target.value,
                        section: '',
                        subject: '',
                        term: '',
                      });
                      setMyReports(null);
                      setBehaviorTrendData(null);
                      setSpecificBehaviorTrend(null);
                      setTrendAnalysis((prev) => ({
                        ...prev,
                        selectedStudent: '',
                        selectedStudentName: '',
                        showTrends: false,
                      }));
                    }}
                    className={getInputClass()}
                  >
                    <option value="">Select Class</option>
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>Class {cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Section *
                  </label>
                  <select
                    value={filters.section}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        section: e.target.value,
                        subject: '',
                        term: '',
                      }));
                      setMyReports(null);
                      setBehaviorTrendData(null);
                      setSpecificBehaviorTrend(null);
                      setTrendAnalysis((prev) => ({
                        ...prev,
                        selectedStudent: '',
                        selectedStudentName: '',
                        showTrends: false,
                      }));
                    }}
                    disabled={!filters.class}
                    className={combine(getInputClass(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
                  >
                    <option value="">Select Section</option>
                    {getSectionsForClass().map((sec) => (
                      <option key={sec} value={sec}>Section {sec}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Subject *
                  </label>
                  <select
                    value={filters.subject}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        subject: e.target.value,
                        term: '',
                      }));
                      setMyReports(null);
                      setBehaviorTrendData(null);
                      setSpecificBehaviorTrend(null);
                      setTrendAnalysis((prev) => ({
                        ...prev,
                        selectedStudent: '',
                        selectedStudentName: '',
                        showTrends: false,
                      }));
                    }}
                    disabled={!filters.section}
                    className={combine(getInputClass(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
                  >
                    <option value="">Select Subject</option>
                    {getSubjectsForClassAndSection().map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Term *
                  </label>
                  <select
                    value={filters.term}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, term: e.target.value }));
                      setMyReports(null);
                      setBehaviorTrendData(null);
                      setSpecificBehaviorTrend(null);
                      setTrendAnalysis((prev) => ({
                        ...prev,
                        selectedStudent: '',
                        selectedStudentName: '',
                        showTrends: false,
                      }));
                    }}
                    disabled={!filters.subject}
                    className={combine(getInputClass(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
                  >
                    <option value="">Select Term</option>
                    {getTermsForSelection().map((term) => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                    Student ID *
                  </label>
                  <input
                    list="trend-student-options"
                    value={trendAnalysis.selectedStudent}
                    onChange={(e) => {
                      const studentId = e.target.value;
                      setBehaviorTrendData(null);
                      setSpecificBehaviorTrend(null);
                      setTrendAnalysis((prev) => ({
                        ...prev,
                        selectedStudent: studentId,
                        selectedStudentName: '',
                        showTrends: false,
                      }));
                    }}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') await handleLoadTrendsFromInput();
                    }}
                    disabled={!filters.term || loading}
                    placeholder="Enter student ID (e.g., STU001)"
                    className={combine(getInputClass(), 'disabled:opacity-50 disabled:cursor-not-allowed')}
                  />
                  <datalist id="trend-student-options">
                    {(() => {
                      const reportsMatchFilters = Boolean(
                        myReports &&
                        normalizeValue(myReports.class) === normalizeValue(filters.class) &&
                        normalizeValue(myReports.section) === normalizeValue(filters.section) &&
                        normalizeValue(myReports.subject) === normalizeValue(filters.subject) &&
                        normalizeValue(myReports.term) === normalizeValue(filters.term)
                      );
                      const reports = reportsMatchFilters && myReports ? myReports.reports : [];
                      return reports
                        .slice()
                        .sort((a, b) => (a.student_name || a.student_id).localeCompare(b.student_name || b.student_id))
                        .map((report) => (
                          <option key={report.student_id} value={report.student_id}>
                            {report.student_name || report.student_id}
                          </option>
                        ));
                    })()}
                  </datalist>
                </div>
              </div>

              <div className={combine('flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 pt-6 border-t', get('border', 'secondary'))}>
                <button
                  onClick={async () => {
                    if (!filters.class || !filters.section || !filters.subject || !filters.term) {
                      toastError('Please select all filters first.');
                      return;
                    }
                    await fetchMyReports();
                  }}
                  disabled={!filters.class || !filters.section || !filters.subject || !filters.term || loading}
                  className={combine(
                    getPrimaryButtonClass(),
                    'w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <FaSpinner className={loading ? 'animate-spin' : ''} />
                  {loading ? 'Loading...' : 'Load Students'}
                </button>

                <button
                  onClick={handleLoadTrendsFromInput}
                  disabled={!filters.class || !filters.section || !filters.subject || !filters.term || !trendAnalysis.selectedStudent.trim() || loadingTrends}
                  className={combine(
                    getPrimaryButtonClass(),
                    'w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <FaChartLine className={loadingTrends ? 'animate-spin' : ''} />
                  {loadingTrends ? 'Loading...' : 'View Trends'}
                </button>

                <button
                  onClick={() => setActiveTab('myreports')}
                  className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2')}
                >
                  Back to My Reports
                </button>

                <button
                  onClick={clearAllFilters}
                  className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center')}
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {!myReports ? (
              <div className={combine(getCardGradientClass('blue'), 'text-center')}>
                <FaChartLine className={combine('text-4xl sm:text-5xl mx-auto mb-4', get('text', 'muted'))} />
                <h3 className={combine('text-sm sm:text-base font-semibold mb-2', get('text', 'primary'))}>
                  Load your reports first
                </h3>
                <p className={combine('text-xs sm:text-sm mb-6', get('text', 'secondary'))}>
                  Select filters and load “My Reports” before viewing trends.
                </p>
                <button
                  onClick={() => {
                    setActiveTab('myreports');
                    fetchMyReports();
                  }}
                  className={combine(getPrimaryButtonClass(), 'px-6 py-3 mx-auto')}
                >
                  <FaEye />
                  View My Reports
                </button>
              </div>
            ) : !trendAnalysis.selectedStudent ? (
              <div className={combine(getCardGradientClass('blue'), 'text-center')}>
                <FaChartLine className={combine('text-4xl sm:text-5xl mx-auto mb-4', get('text', 'muted'))} />
                <h3 className={combine('text-sm sm:text-base font-semibold mb-2', get('text', 'primary'))}>
                  Select a student to view trends
                </h3>
                <p className={combine('text-xs sm:text-sm mb-6', get('text', 'secondary'))}>
                  Enter a student ID above and click “View Trends”.
                </p>
                <button
                  onClick={() => setActiveTab('myreports')}
                  className={combine(getSecondaryButtonClass(), 'px-6 py-3 mx-auto justify-center flex items-center gap-2')}
                >
                  Back to My Reports
                </button>
              </div>
            ) : (() => {
              const selectedReport = myReports.reports.find((r) => r.student_id === trendAnalysis.selectedStudent);
              const trendData = getTrendChartData();
              const hasTrendData = trendData.length > 0;

              return (
                <>
                  <div className={getCardGradientClass('blue')}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>
                          Trends • {trendAnalysis.selectedStudentName || trendAnalysis.selectedStudent}
                        </h3>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          {filters.class}-{filters.section} • {filters.subject} ({filters.term})
                        </p>
                      </div>
                      <button
                        onClick={() => setActiveTab('myreports')}
                        className={combine(getSecondaryButtonClass(), 'w-full sm:w-auto justify-center flex items-center gap-2')}
                      >
                        Back
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className={combine(getSoftCardClass(), 'lg:col-span-2')}>
                      <h4 className={combine('text-sm sm:text-base font-semibold mb-4', get('text', 'primary'))}>
                        Student Report
                      </h4>
                      {selectedReport ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                          {[
                            { label: 'Participation', value: selectedReport.class_participation },
                            { label: 'Responsibility', value: selectedReport.homework_responsibility },
                            { label: 'Discipline', value: selectedReport.classroom_discipline },
                            { label: 'Attitude', value: selectedReport.learning_attitude },
                            { label: 'Collaboration', value: selectedReport.social_behaviour },
                            { label: 'Average', value: selectedReport.average_score ?? 0 },
                          ].map((item) => (
                            <div key={item.label} className={combine(get('bg', 'card'), 'p-3 rounded-xl border', get('border', 'secondary'))}>
                              <div className={combine('text-xs', get('text', 'muted'))}>{item.label}</div>
                              <div className={combine('text-base sm:text-lg font-bold', get('text', 'primary'))}>
                                {Number(item.value).toFixed(1)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          Student report not found in the loaded list.
                        </p>
                      )}
                    </div>

                    <div className={getSoftCardClass()}>
                      <h4 className={combine('text-sm sm:text-base font-semibold mb-4', get('text', 'primary'))}>
                        Remarks
                      </h4>
                      <div className={combine(get('bg', 'card'), 'p-3 rounded-xl border', get('border', 'secondary'))}>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          {selectedReport?.remarks?.trim() ? selectedReport.remarks : 'No remarks provided.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={getCardGradientClass('blue')}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-end">
                      <div className="lg:col-span-2">
                        <label className={combine('block text-xs sm:text-sm font-medium mb-2', get('text', 'secondary'))}>
                          Behavior Type
                        </label>
                        <select
                          value={trendAnalysis.selectedBehavior}
                          onChange={(e) => handleBehaviorTypeChange(e.target.value as typeof trendAnalysis.selectedBehavior)}
                          className={getInputClass()}
                        >
                          <option value="overall">Overall Behavior</option>
                          <option value="participation">Class Participation</option>
                          <option value="responsibility">Homework Responsibility</option>
                          <option value="discipline">Classroom Discipline</option>
                          <option value="attitude">Learning Attitude</option>
                          <option value="collaboration">Social Behaviour/Collaboration</option>
                        </select>
                      </div>
                      <button
                        onClick={() => fetchBehaviorTrends(
                          trendAnalysis.selectedStudent,
                          trendAnalysis.selectedStudentName,
                          trendAnalysis.selectedBehavior
                        )}
                        disabled={loadingTrends}
                        className={combine(
                          getPrimaryButtonClass(),
                          'w-full justify-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <FaSpinner className={loadingTrends ? 'animate-spin' : ''} />
                        {loadingTrends ? 'Loading...' : 'Refresh Trends'}
                      </button>
                    </div>
                  </div>

                  <div className={getCardGradientClass('blue')}>
                    <h4 className={combine('text-sm sm:text-base font-semibold mb-4', get('text', 'primary'))}>
                      Trend Chart
                    </h4>

                    {hasTrendData ? (
                      <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                            <YAxis domain={[1, 5]} tick={{ fontSize: 12 }} />
                            <Tooltip
                              contentStyle={{
                                borderRadius: '8px',
                                border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                background: theme === 'dark' ? '#111827' : '#ffffff',
                                color: theme === 'dark' ? '#f9fafb' : '#111827',
                              }}
                              formatter={(value) => [`${value}/5`, 'Score']}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              name="Behavior Score"
                              stroke="#3b82f6"
                              strokeWidth={3}
                              dot={{ r: 5, fill: '#3b82f6', stroke: 'white', strokeWidth: 2 }}
                              activeDot={{ r: 7 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                        No trend data available for this student.
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
