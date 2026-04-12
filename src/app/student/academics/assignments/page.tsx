// app/student/academics/assignments/page.tsx
'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import { 
  FaFilter, 
  FaCalendarAlt, 
  FaUserTie,
  FaPaperPlane,
  FaFileAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaUpload,
  FaSearch,
  FaPlus,
  FaEye,
  FaDownload,
  FaBook,
  FaEdit,
  FaTrash,
  FaExclamationCircle,
  FaFilePdf,
  FaFileWord,
  FaChevronDown,
  FaChevronUp,
  FaChevronLeft,
  FaChevronRight,
  FaList,
  FaThLarge,
  FaCalendarCheck
} from 'react-icons/fa';
import { toastError, toastSuccess, toastInfo, toastWarning } from '@/lib/toast';
import { studentApi } from '@/lib/api';

interface Assignment {
  id: number;
  class_name: string;
  section: string;
  subject: string;
  title: string;
  description: string;
  due_date: string;
  attachment: string | null;
  posted_by: string;
  created_at: string;
  academic_year: string;
  status?: 'Pending' | 'Submitted';
  submission?: Submission | null;
}

interface StudentProfile {
  student_id: string;
  student_name: string;
  student_email: string;
  father_phone: string;
  mother_phone: string;
  father_name: string;
  mother_name: string;
  address: string;
  date_of_birth: string;
  gender: string;
  class_name: string;  // This is the student's class
  section: string;     // This is the student's section
}

interface Submission {
  id: number;
  assignment: number;
  assignment_title: string;
  subject_name: string;
  student_name: string;
  description: string;
  file: string;
  submitted_at: string;
  marks: number | null;
}

interface Subject {
  id: number;
  name: string;
  code?: string;
  description?: string;
}

interface AssignmentCalendarOverview {
  view_mode?: 'calendar_overview' | 'daily_assignments' | string;
  year?: string;
  data?: Record<string, string[]>;
  message?: string;
}

export default function AssignmentsPage() {
  const [loading, setLoading] = useState(true);
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Submitted' | 'Overdue'>('all');
  
  // Student's subjects
  const [studentSubjects, setStudentSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  
  // Modals
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Selected items
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  
  // Form states
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [submissionIdToDelete, setSubmissionIdToDelete] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'file' | 'complete'>('complete');
  
  // Loading states
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [viewingSubmission, setViewingSubmission] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Table states
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [isMobile, setIsMobile] = useState(false);
  const [subjectCarouselPage, setSubjectCarouselPage] = useState(0);
  const [subjectCardsPerPage, setSubjectCardsPerPage] = useState(6);
  const [calendarOverview, setCalendarOverview] = useState<AssignmentCalendarOverview | null>(null);
  const [calendarMonthIndex, setCalendarMonthIndex] = useState(0);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarInfo, setCalendarInfo] = useState('');
  const [calendarSubject, setCalendarSubject] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchStudentProfile = async () => {
    try {
      setProfileLoading(true);
      const response = await studentApi.profile.get();
      const data = response.data?.data || response.data;
      setStudentProfile(data);
      return data;
      
    } catch (error: any) {
      console.error('Error fetching student profile:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to load student profile';
      toastError(message);
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  // NEW: Fetch student's allocated subjects
  const fetchStudentSubjects = async () => {
    try {
      setLoadingSubjects(true);
      const response = await studentApi.subjects.mySubjects();
      const data = response.data?.data || response.data;
      console.log('Student subjects response:', data);
      
      if (data?.subjects && Array.isArray(data.subjects)) {
        setStudentSubjects(data.subjects);
        return data.subjects;
      }
      if (Array.isArray(data)) {
        setStudentSubjects(data);
        return data;
      }
      return [];
      
    } catch (error: any) {
      console.error('Error fetching student subjects:', error);
      // Don't show error toast for this as it's not critical
      return [];
    } finally {
      setLoadingSubjects(false);
    }
  };

  const extractAssignmentList = (payload: any): Assignment[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const extractSubmission = (payload: any): Submission | null => {
    if (!payload) return null;
    if (payload.data && typeof payload.data === 'object') return payload.data;
    if (payload.results && payload.results[0]) return payload.results[0];
    if (payload.id) return payload as Submission;
    return null;
  };

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await studentApi.assignments.myAssignmentsCombined();
      const data = response.data?.data || response.data;
      const list = extractAssignmentList(data);
      const normalized = list.map((assignment) => ({
        ...assignment,
        status: assignment.status || (assignment.submission ? 'Submitted' : 'Pending'),
        submission: assignment.submission || null,
      }));
      setAllAssignments(normalized);
      setAssignments(normalized);
      setFilteredAssignments(normalized);

    } catch (error: any) {
      console.error('Error fetching assignments:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to load assignments';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMySubmissions = async (assignmentId: number) => {
    try {
      setViewingSubmission(true);

      try {
        const response = await studentApi.assignments.submissionByAssignment(assignmentId);
        const data = response.data?.data || response.data;
        return extractSubmission(data);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          const response2 = await studentApi.assignments.submissionFallbackList(assignmentId);
          const data = response2.data?.data || response2.data;
          return extractSubmission(data);
        }
        throw err;
      }
    } catch (error: any) {
      console.error('Error fetching submission:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to load submission';
      toastError(message);
      return null;
    } finally {
      setViewingSubmission(false);
    }
  };

  useEffect(() => {
    // Fetch all necessary data on component mount
    const initializeData = async () => {
      await fetchStudentProfile();
      await fetchStudentSubjects();
      await fetchAssignments();
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    filterAndSortAssignments();
    setCurrentPage(1);
  }, [searchTerm, subjectFilter, dateFilter, statusFilter, sortOrder, assignments]);

  useEffect(() => {
    const checkIsMobile = () => {
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
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  const filterAndSortAssignments = () => {
    let filtered = [...assignments];

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(assignment =>
        assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assignment.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.subject.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply subject filter
    if (subjectFilter && subjectFilter !== 'all') {
      filtered = filtered.filter(assignment => assignment.subject === subjectFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(assignment => {
        const dueDate = new Date(assignment.due_date).toISOString().split('T')[0];
        return dueDate === dateFilter;
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'Overdue') {
        filtered = filtered.filter(
          assignment => isPastDue(assignment.due_date) && assignment.status === 'Pending'
        );
      } else {
        filtered = filtered.filter(assignment => assignment.status === statusFilter);
      }
    }

    // Apply sorting (Due Date only)
    filtered.sort((a, b) => {
      const aValue = new Date(a.due_date).getTime();
      const bValue = new Date(b.due_date).getTime();

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredAssignments(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800';
      case 'Submitted': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <FaClock className="text-yellow-500" />;
      case 'Submitted': return <FaCheckCircle className="text-green-500" />;
      default: return <FaFileAlt className="text-gray-500" />;
    }
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
    if (!overview?.year || !overview?.data) return [];
    const entries = new Set(Object.values(overview.data).flat().map((date) => toIsoDate(date)));
    const todayDate = new Date().toISOString().split('T')[0];

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

  const normalizeAssignments = (list: Assignment[]) =>
    list.map((assignment) => ({
      ...assignment,
      status: assignment.status || (assignment.submission ? 'Submitted' : 'Pending'),
      submission: assignment.submission || null,
    }));

  const loadCalendarOverview = async (subject: string) => {
    if (!subject) return;
    try {
      setCalendarLoading(true);
      const response = await studentApi.assignments.feedWithFilters({ subject });
      const raw = response.data;
      const payload = raw?.view_mode
        ? raw
        : raw?.data && raw.data.view_mode
          ? raw.data
          : raw;
      setCalendarOverview(payload || null);
      setCalendarInfo(payload?.message || '');
      setCalendarMonthIndex(0);
      setSelectedCalendarDate(null);
    } catch (error: any) {
      const message = extractApiError(error, 'Failed to load assignment calendar');
      toastError(message);
      setCalendarOverview(null);
      setCalendarInfo(message);
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadAssignmentsForSpecificDate = async (date: string, subject: string) => {
    if (!subject) {
      toastWarning('Select a subject to view assignments on the calendar.');
      return;
    }
    try {
      setCalendarLoading(true);
      setSelectedCalendarDate(date);
      const response = await studentApi.assignments.feedWithFilters({ subject, date });
      const payload = response.data?.data || response.data;
      const list = extractAssignmentList(payload);
      const normalized = normalizeAssignments(list);
      setAssignments(normalized);
      setFilteredAssignments(normalized);
      setCalendarInfo(
        normalized.length > 0
          ? `Showing assignments for ${new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`
          : 'No assignments found for the selected date.'
      );
    } catch (error: any) {
      const message = extractApiError(error, 'Failed to load assignments for the selected date');
      toastError(message);
      setCalendarInfo(message);
    } finally {
      setCalendarLoading(false);
    }
  };

  const clearCalendarFilter = () => {
    setAssignments(allAssignments);
    setFilteredAssignments(allAssignments);
    setSelectedCalendarDate(null);
    setCalendarInfo('');
  };

  // UPDATED: Get subjects from student's allocated subjects
  const getSubjects = () => {
    // If we have student's subjects, use them
    if (studentSubjects.length > 0) {
      return studentSubjects.map(subject => subject.name);
    }
    
    // Fallback: extract from assignments
    const subjects = new Set<string>();
    (allAssignments.length > 0 ? allAssignments : assignments).forEach((assignment) => subjects.add(assignment.subject));
    return Array.from(subjects);
  };

  useEffect(() => {
    const subjects = getSubjects();
    if (!calendarSubject && subjects.length > 0) {
      setCalendarSubject(subjects[0]);
    }
  }, [studentSubjects, assignments]);

  useEffect(() => {
    if (subjectFilter !== 'all' && subjectFilter !== calendarSubject) {
      setCalendarSubject(subjectFilter);
    }
  }, [subjectFilter, calendarSubject]);

  useEffect(() => {
    if (!calendarSubject) return;
    void loadCalendarOverview(calendarSubject);
  }, [calendarSubject]);

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: `Overdue by ${Math.abs(diffDays)} days`, color: 'text-red-600 dark:text-red-400' };
    if (diffDays === 0) return { text: 'Due today', color: 'text-orange-600 dark:text-orange-400' };
    if (diffDays === 1) return { text: 'Due tomorrow', color: 'text-orange-600 dark:text-orange-400' };
    if (diffDays <= 7) return { text: `Due in ${diffDays} days`, color: 'text-yellow-600 dark:text-yellow-400' };
    return { text: `Due in ${diffDays} days`, color: 'text-green-600 dark:text-green-400' };
  };

  const isPastDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    return due.getTime() < today.getTime();
  };

  const getDueDisplay = (assignment: Assignment) => {
    if (assignment.status === 'Submitted') {
      if (assignment.submission?.submitted_at) {
        return {
          text: `Submitted on ${formatDate(assignment.submission.submitted_at)}`,
          color: 'text-green-600 dark:text-green-400'
        };
      }
      return { text: 'Submitted', color: 'text-green-600 dark:text-green-400' };
    }
    return getDaysUntilDue(assignment.due_date);
  };

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleEditFileSelect = () => {
    editFileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toastError('File size must be less than 10MB');
        return;
      }
      setSubmissionFile(file);
    }
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        toastError('File size must be less than 10MB');
        return;
      }
      setEditFile(file);
    }
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) {
      toastError('No assignment selected');
      return;
    }

    if (!submissionFile) {
      toastError('Please upload a file to submit');
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('assignment_id', selectedAssignment.id.toString());
      if (submissionDescription) {
        formData.append('description', submissionDescription);
      }
      if (submissionFile) {
        formData.append('file', submissionFile);
      }

      let responseData: any = null;
      try {
        const response = await studentApi.assignments.submit(formData);
        responseData = response.data?.data || response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        responseData = error?.response?.data || {};
        if (status === 400 && responseData.error?.includes('Already submitted')) {
          toastError('Already submitted. Please use edit option.');
        } else if (status === 403 && responseData.error?.includes('not for your class')) {
          toastError('This assignment is not for your class.');
        } else if (status === 400 && responseData.error?.includes('not enrolled')) {
          toastError('You are not enrolled in any active class.');
        } else if (status === 400 && responseData.error?.includes('assignment_id and file are required')) {
          toastError('Assignment ID and file are required.');
        } else if (status === 400 && responseData.error?.includes('Assignment or Year error')) {
          toastError('Assignment or academic year error.');
        } else {
          throw new Error(responseData.error || 'Submission failed');
        }
        return;
      }
      
      toastSuccess('Assignment submitted successfully!');
      setShowSubmitModal(false);
      resetSubmissionForm();
      fetchAssignments();

    } catch (error: any) {
      console.error('Submission error:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to submit assignment';
      toastError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmission = async () => {
    if (!selectedSubmission) {
      toastError('No submission selected');
      return;
    }

    if (!editDescription && !editFile && !selectedSubmission.file) {
      toastError('Submission must have either a description or file');
      return;
    }

    try {
      setEditing(true);

      const formData = new FormData();
      formData.append('submission_id', selectedSubmission.id.toString());
      if (editDescription) {
        formData.append('description', editDescription);
      }
      if (editFile) {
        formData.append('file', editFile);
      }

      let responseData: any = null;
      try {
        const response = await studentApi.assignments.updateSubmission(formData);
        responseData = response.data?.data || response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        responseData = error?.response?.data || {};
        if (status === 403 && responseData.error?.includes('previous academic years')) {
          toastError('Cannot edit submissions from previous academic years.');
        } else if (status === 404) {
          toastError('Submission not found or you don\'t have permission.');
        } else {
          throw new Error(responseData.error || 'Update failed');
        }
        return;
      }
      
      toastSuccess('Submission updated successfully!');
      setShowEditModal(false);
      setShowViewModal(false);
      resetEditForm();
      fetchAssignments();

    } catch (error: any) {
      console.error('Edit error:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to update submission';
      toastError(message);
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submissionIdToDelete) {
      toastError('No submission selected for deletion');
      return;
    }

    try {
      setDeleting(true);

      let responseData: any = null;
      try {
        const response = await studentApi.assignments.deleteSubmission(
          submissionIdToDelete,
          deleteType === 'file' ? 'file' : undefined
        );
        responseData = response.data?.data || response.data;
      } catch (error: any) {
        const status = error?.response?.status;
        responseData = error?.response?.data || {};
        if (status === 403 && responseData.error?.includes('previous academic years')) {
          toastError('Cannot delete submissions from previous academic years.');
        } else if (status === 404) {
          toastError('Submission not found or you don\'t have permission.');
        } else {
          throw new Error(responseData.error || 'Deletion failed');
        }
        return;
      }

      toastSuccess(responseData.message || 'Deletion successful');
      
      setShowDeleteModal(false);
      setShowViewModal(false);
      setSubmissionIdToDelete(null);
      fetchAssignments();

    } catch (error: any) {
      console.error('Delete error:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to delete submission';
      toastError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleViewAssignment = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);

    if (assignment.submission) {
      setSelectedSubmission(assignment.submission);
      return;
    }

    try {
      setViewingSubmission(true);
      try {
        const response = await studentApi.assignments.submissionByAssignment(assignment.id);
        const data = response.data?.data || response.data;
        setSelectedSubmission(extractSubmission(data));
      } catch (error: any) {
        if (error?.response?.status === 404) {
          setSelectedSubmission(null);
          return;
        }
        const errorData = error?.response?.data || {};
        throw new Error(errorData.error || 'Failed to fetch submission');
      }
    } catch (error: any) {
      console.error('Error fetching submission:', error);
      const message = error?.response?.data?.error || error.message || 'Failed to load submission';
      toastError(message);
      setSelectedSubmission(null);
    } finally {
      setViewingSubmission(false);
    }
  };

  const handleEditSubmissionClick = (submission: Submission) => {
    setSelectedSubmission(submission);
    setEditDescription(submission.description || '');
    setEditFile(null);
    setShowEditModal(true);
  };

  const handleDeleteSubmissionClick = (submissionId: number, type: 'file' | 'complete' = 'complete') => {
    setSubmissionIdToDelete(submissionId);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const resetSubmissionForm = () => {
    setSubmissionDescription('');
    setSubmissionFile(null);
  };

  const resetEditForm = () => {
    setEditDescription('');
    setEditFile(null);
  };

  const downloadFile = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FaFilePdf className="text-red-500" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-500" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  const getSubjectBadgeStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  const baseAssignments = allAssignments.length > 0 ? allAssignments : assignments;

  const subjectStats = Array.from(
    baseAssignments.reduce((acc, assignment) => {
      const key = assignment.subject || 'Unknown';
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  )
    .map(([subject, count]) => ({
      subject,
      count,
      color: getSubjectColor(subject)
    }))
    .sort((a, b) => b.count - a.count);

  const totalSubjectPages = Math.max(1, Math.ceil(subjectStats.length / subjectCardsPerPage));
  const safeSubjectPage = Math.min(subjectCarouselPage, totalSubjectPages - 1);
  const visibleSubjectStats = subjectStats.slice(
    safeSubjectPage * subjectCardsPerPage,
    safeSubjectPage * subjectCardsPerPage + subjectCardsPerPage
  );

  useEffect(() => {
    if (subjectCarouselPage > totalSubjectPages - 1) {
      setSubjectCarouselPage(0);
    }
  }, [subjectCarouselPage, totalSubjectPages]);

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedAssignments = filteredAssignments.slice(startIndex, startIndex + pageSize);
  const academicCalendarMonths = getCalendarMonths(calendarOverview);
  const safeCalendarMonthIndex = academicCalendarMonths.length === 0
    ? 0
    : Math.min(calendarMonthIndex, academicCalendarMonths.length - 1);
  const activeCalendarMonth = academicCalendarMonths[safeCalendarMonthIndex] || null;
  const activeCalendarDates = activeCalendarMonth?.dates.filter((date) => date.hasAssignment) || [];
  const selectedCalendarDateMeta = activeCalendarMonth?.dates.find((date) => date.isoDate === selectedCalendarDate) || null;

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6">
        <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-700 dark:to-blue-800">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaBook className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Assignments</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    {studentProfile
                      ? `${studentProfile.class_name}-${studentProfile.section}`
                      : 'Track, submit, and manage your assignments'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Today Assignments</div>
                  <div className="text-sm sm:text-base font-bold">
                    {assignments.filter(a => (a.due_date || '').slice(0, 10) === new Date().toISOString().slice(0, 10)).length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Total Assignments</p>
                <p className="text-xl sm:text-2xl font-bold">{baseAssignments.length}</p>
              </div>
              <FaList className="text-2xl opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {assignments.filter(a => a.status === 'Pending').length}
                </p>
              </div>
              <FaClock className="text-2xl opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Submitted</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {assignments.filter(a => a.status === 'Submitted').length}
                </p>
              </div>
              <FaCheckCircle className="text-2xl opacity-80" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg p-5 sm:p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Overdue</p>
                <p className="text-xl sm:text-2xl font-bold">
                  {assignments.filter(a => isPastDue(a.due_date) && a.status === 'Pending').length}
                </p>
              </div>
              <FaExclamationCircle className="text-2xl opacity-80" />
            </div>
          </div>
        </div>

        {/* Subject-wise Assignments Carousel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <FaBook className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                  Subject-wise Assignments
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Assignment count across subjects
                </p>
              </div>
            </div>
            {subjectStats.length > subjectCardsPerPage && (
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

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
            {subjectStats.length > 0 ? visibleSubjectStats.map((item) => (
              <div
                key={item.subject}
                className={`rounded-lg sm:rounded-xl p-2 sm:p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02] ${
                  item.color ? '' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
                style={item.color ? getSubjectBadgeStyle(item.color) : undefined}
              >
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className={`font-bold text-xs sm:text-sm truncate ${item.color ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {item.subject}
                  </span>
                  {item.color ? (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border border-white/40 bg-white/20 text-white"
                    >
                      {item.count}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                      {item.count}
                    </span>
                  )}
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-4 sm:py-6 md:py-8 text-gray-600 dark:text-gray-400">
                <p className="text-xs sm:text-sm font-medium">No subjects available</p>
                <p className="text-xs mt-1">Subject distribution will appear once assignments are available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <FaFilter className="text-blue-500" /> Filter & Sort Assignments
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaSearch className="inline mr-2" /> Search
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Title, subject, or description..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Subject Filter - UPDATED */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaBook className="inline mr-2" /> Subject
                {loadingSubjects && (
                  <span className="ml-2 text-xs text-blue-500">Loading...</span>
                )}
              </label>
              <select
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Subjects</option>
                {getSubjects().map(subject => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              {studentSubjects.length > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Showing your {studentSubjects.length} enrolled subjects
                </p>
              )}
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaCalendarAlt className="inline mr-2" /> Due Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaCheckCircle className="inline mr-2" /> Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'Pending' | 'Submitted' | 'Overdue')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Submitted">Submitted</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>

        {/* Assignment Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaCalendarAlt className="text-blue-500" /> Academic Calendar
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Select a subject to view assignment dates in the academic year.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={calendarSubject}
                onChange={(e) => setCalendarSubject(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                {getSubjects().length === 0 && <option value="">No subjects</option>}
                {getSubjects().map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
              {selectedCalendarDate && (
                <button
                  type="button"
                  onClick={clearCalendarFilter}
                  className="px-3 py-2 rounded-lg text-sm border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {calendarLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
          ) : calendarOverview && academicCalendarMonths.length > 0 && activeCalendarMonth ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCalendarMonthIndex((prev) => Math.max(prev - 1, 0))}
                      disabled={safeCalendarMonthIndex === 0}
                      className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center disabled:opacity-50"
                      title="Previous month"
                    >
                      <FaChevronLeft />
                    </button>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">{activeCalendarMonth.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {activeCalendarDates.length} assignment date{activeCalendarDates.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCalendarMonthIndex((prev) => Math.min(prev + 1, academicCalendarMonths.length - 1))}
                    disabled={safeCalendarMonthIndex === academicCalendarMonths.length - 1}
                    className="h-9 w-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center disabled:opacity-50"
                    title="Next month"
                  >
                    <FaChevronRight />
                  </button>
                </div>

                <div className="p-3">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <div key={day} className="text-center text-[10px] font-semibold text-gray-400">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1 place-items-center">
                    {Array.from({ length: activeCalendarMonth.firstDayOffset }).map((_, index) => (
                      <div key={`${activeCalendarMonth.key}-blank-${index}`} className="h-9 w-9" />
                    ))}
                    {activeCalendarMonth.dates.map((date) => {
                      const isSelected = selectedCalendarDate === date.isoDate;
                      const baseClass = date.hasAssignment
                        ? 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800'
                        : 'bg-white text-gray-500 border-gray-200 dark:bg-gray-900/40 dark:text-gray-400 dark:border-gray-700';
                      return (
                        <button
                          key={date.isoDate}
                          type="button"
                          onClick={() => {
                            if (!date.hasAssignment) return;
                            void loadAssignmentsForSpecificDate(date.isoDate, calendarSubject);
                          }}
                          disabled={!date.hasAssignment}
                          className={`h-9 w-9 rounded-lg border text-xs font-medium transition-all relative ${baseClass} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
                        >
                          {date.dayNumber}
                          {date.hasAssignment && (
                            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-blue-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    <FaCalendarCheck className="text-blue-500" />
                    Month Summary
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Academic Year</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{calendarOverview.year || '-'}</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-900/40 p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400">Selected Month</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{activeCalendarMonth.label}</div>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-3 text-sm">
                    <div className="text-xs text-gray-500 dark:text-gray-400">Focused Date</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedCalendarDateMeta
                        ? new Date(selectedCalendarDateMeta.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                        : activeCalendarDates[0]
                          ? new Date(activeCalendarDates[0].isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'No dates in this month'}
                    </div>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    <FaCalendarAlt className="text-blue-500" />
                    Assignment Dates
                  </div>
                  <div className="space-y-2">
                    {activeCalendarDates.length > 0 ? activeCalendarDates.slice(0, 8).map((date) => (
                      <button
                        key={date.isoDate}
                        type="button"
                        onClick={() => {
                          void loadAssignmentsForSpecificDate(date.isoDate, calendarSubject);
                        }}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                          selectedCalendarDate === date.isoDate
                            ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-200'
                            : 'bg-white border-gray-200 dark:bg-gray-900/40 dark:border-gray-700'
                        }`}
                      >
                        <div className="font-medium text-sm">
                          {new Date(date.isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Tap to view assignments</div>
                      </button>
                    )) : (
                      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
                        No assignment dates in this month.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
              No calendar data available for the selected subject.
            </div>
          )}

          {calendarInfo && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
              {calendarInfo}
            </div>
          )}
        </div>

      

        {/* Assignments Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaList className="text-blue-500" /> Assignments
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Showing {paginatedAssignments.length} of {filteredAssignments.length} filtered assignments (total {baseAssignments.length})
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

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <FaFileAlt className="text-5xl text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">
                No assignments found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                {searchTerm || subjectFilter !== 'all' || dateFilter
                  ? 'Try adjusting your filters to find what you\'re looking for.'
                  : 'You\'re all caught up! No pending assignments at the moment.'}
              </p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Assignment Details
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        Due Date
                        <button
                          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                          className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
                          aria-label={`Sort by due date ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                        >
                          {sortOrder === 'asc' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                      </div>
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="py-3 px-6 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedAssignments.map((assignment) => {
                    const dueInfo = getDueDisplay(assignment);
                    const isExpanded = expandedRows.has(assignment.id);
                    const isOverdue = isPastDue(assignment.due_date) && assignment.status === 'Pending';

                    return (
                      <Fragment key={assignment.id}>
                        <tr 
                          className={`hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors ${
                            isOverdue ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                          }`}
                        >
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleRowExpansion(assignment.id)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                              >
                                {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-gray-900 dark:text-white truncate max-w-md">
                                    {assignment.title}
                                  </h4>
                                  {assignment.attachment && (
                                    <FaFileAlt className="text-blue-500 flex-shrink-0" />
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-lg">
                                  {assignment.description}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center gap-1">
                                    <FaUserTie className="text-purple-500" />
                                    {assignment.posted_by}
                                  </span>
                                  <span>
                                    Posted: {formatDate(assignment.created_at)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <FaBook className="text-blue-500" />
                              {(() => {
                                const subjectColor = getSubjectColor(assignment.subject);
                                if (subjectColor) {
                                  return (
                                    <span
                                      className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border"
                                      style={getSubjectBadgeStyle(subjectColor)}
                                    >
                                      {assignment.subject}
                                    </span>
                                  );
                                }
                                return <span className="font-medium">{assignment.subject}</span>;
                              })()}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {assignment.class_name} - {assignment.section}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <div className={`font-medium ${dueInfo.color}`}>
                              {dueInfo.text}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(assignment.due_date)}
                            </div>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(assignment.status || 'Pending')}`}>
                              {getStatusIcon(assignment.status || 'Pending')}
                              {assignment.status || 'Pending'}
                              {isOverdue && (
                                <FaExclamationCircle className="text-red-500 ml-1" />
                              )}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleViewAssignment(assignment)}
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"
                              >
                                <FaEye /> View
                              </button>
                              {assignment.status === 'Pending' && (
                                <button
                                  onClick={() => {
                                    setSelectedAssignment(assignment);
                                    setShowSubmitModal(true);
                                  }}
                                  className={`px-3 py-1 rounded-lg flex items-center gap-2 text-sm transition-all ${
                                    isOverdue
                                      ? 'bg-red-600 hover:bg-red-700 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}
                                >
                                  <FaPaperPlane /> {isOverdue ? 'Late Submit' : 'Submit'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-blue-50/20 dark:bg-blue-900/10">
                            <td colSpan={5} className="px-6 py-4">
                              <div className="pl-10 pr-4">
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                  <h5 className="font-semibold text-gray-900 dark:text-white mb-2">Assignment Details</h5>
                                  <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">
                                    {assignment.description}
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Academic Year</p>
                                      <p className="font-medium text-gray-900 dark:text-white">{assignment.academic_year}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Posted Date</p>
                                      <p className="font-medium text-gray-900 dark:text-white">{formatDate(assignment.created_at)}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Class Section</p>
                                      <p className="font-medium text-gray-900 dark:text-white">{assignment.class_name} - {assignment.section}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 dark:text-gray-400">Teacher</p>
                                      <p className="font-medium text-gray-900 dark:text-white">{assignment.posted_by}</p>
                                    </div>
                                  </div>
                                  {assignment.attachment && (
                                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          {getFileIcon(assignment.attachment)}
                                          <span className="text-gray-700 dark:text-gray-300">
                                            {assignment.attachment.split('/').pop()}
                                          </span>
                                        </div>
                                        <button
                                          onClick={() => downloadFile(assignment.attachment!, assignment.title)}
                                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 text-sm"
                                        >
                                          <FaDownload /> Download
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {paginatedAssignments.map((assignment) => {
                  const dueInfo = getDueDisplay(assignment);
                  const isOverdue = isPastDue(assignment.due_date) && assignment.status === 'Pending';
                  const subjectColor = getSubjectColor(assignment.subject);

                  return (
                    <div
                      key={assignment.id}
                      className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all ${
                        isOverdue ? 'border-red-200 bg-red-50/40 dark:border-red-800 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                            {assignment.title}
                          </h4>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {assignment.class_name} - {assignment.section}
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(assignment.status || 'Pending')}`}>
                          {getStatusIcon(assignment.status || 'Pending')}
                          {assignment.status || 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FaBook className="text-blue-500" />
                          {subjectColor ? (
                            <span
                              className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border"
                              style={getSubjectBadgeStyle(subjectColor)}
                            >
                              {assignment.subject}
                            </span>
                          ) : (
                            <span className="font-medium text-sm">{assignment.subject}</span>
                          )}
                        </div>
                        {assignment.attachment && (
                          <FaFileAlt className="text-blue-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center justify-between text-sm mb-4">
                        <div className={`font-medium ${dueInfo.color}`}>{dueInfo.text}</div>
                        <div className="text-gray-500 dark:text-gray-400">{formatDate(assignment.due_date)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewAssignment(assignment)}
                          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"
                        >
                          <FaEye /> View
                        </button>
                        {assignment.status === 'Pending' && (
                          <button
                            onClick={() => {
                              setSelectedAssignment(assignment);
                              setShowSubmitModal(true);
                            }}
                            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-all ${
                              isOverdue
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                            }`}
                          >
                            <FaPaperPlane /> {isOverdue ? 'Late Submit' : 'Submit'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {totalPages > 1 && (
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
        </div>
      </main>

      {/* Submit Assignment Modal */}
      {showSubmitModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div
              className="p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-xl"
              style={
                getSubjectColor(selectedAssignment.subject)
                  ? getSubjectBadgeStyle(getSubjectColor(selectedAssignment.subject)!)
                  : undefined
              }
            >
              <h2 className={`text-2xl font-bold flex items-center gap-2 ${getSubjectColor(selectedAssignment.subject) ? '' : 'text-gray-900 dark:text-white'}`}>
                <FaPaperPlane className={getSubjectColor(selectedAssignment.subject) ? '' : 'text-blue-500'} /> Submit Assignment
              </h2>
              <p className={`mt-1 ${getSubjectColor(selectedAssignment.subject) ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                {selectedAssignment.title} • {selectedAssignment.subject}
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong className="font-semibold">📋 Assignment Instructions:</strong><br />
                  {selectedAssignment.description}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <strong className="text-blue-700 dark:text-blue-400">Due Date:</strong><br />
                    <span className="text-blue-800 dark:text-blue-300">
                      {new Date(selectedAssignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <strong className="text-blue-700 dark:text-blue-400">Posted By:</strong><br />
                    <span className="text-blue-800 dark:text-blue-300">{selectedAssignment.posted_by}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📝 Submission Description
                  </label>
                  <textarea
                    value={submissionDescription}
                    onChange={(e) => setSubmissionDescription(e.target.value)}
                    placeholder="Describe your submission, add notes for the teacher, or explain your approach..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    📎 Attach File (PDF, DOC, PPT, Images)
                  </label>
                  <div
                    onClick={handleFileSelect}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/10"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    />
                    {submissionFile ? (
                      <div>
                        <FaFileAlt className="text-4xl text-green-500 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                          {submissionFile.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                          {(submissionFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSubmissionFile(null);
                            }}
                            className="text-red-500 text-sm hover:text-red-600 px-3 py-1 border border-red-200 dark:border-red-800 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            Remove File
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileSelect();
                            }}
                            className="text-blue-500 text-sm hover:text-blue-600 px-3 py-1 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            Change File
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <FaUpload className="text-4xl text-gray-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          Maximum file size: 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  resetSubmissionForm();
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAssignment}
                disabled={(!submissionFile && !submissionDescription) || submitting}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <FaPaperPlane /> Submit Assignment
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Assignment/Submission Modal */}
      {showViewModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div
              className="p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-xl"
              style={
                getSubjectColor(selectedAssignment.subject)
                  ? getSubjectBadgeStyle(getSubjectColor(selectedAssignment.subject)!)
                  : undefined
              }
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className={`text-2xl font-bold mb-1 ${getSubjectColor(selectedAssignment.subject) ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {selectedAssignment.title}
                  </h2>
                  <p className={`${getSubjectColor(selectedAssignment.subject) ? 'text-white/90' : 'text-gray-600 dark:text-gray-400'}`}>
                    {selectedAssignment.subject} • Posted by {selectedAssignment.posted_by}
                  </p>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className={getSubjectColor(selectedAssignment.subject) ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}
                >
                  <FaTimesCircle className="text-xl" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Due Date</p>
                  <p className="font-semibold text-blue-800 dark:text-blue-300">
                    {new Date(selectedAssignment.due_date).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {getDaysUntilDue(selectedAssignment.due_date).text}
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg p-4">
                  <p className="text-sm text-purple-700 dark:text-purple-400 mb-1">Class & Section</p>
                  <p className="font-semibold text-purple-800 dark:text-purple-300">
                    {selectedAssignment.class_name} - {selectedAssignment.section}
                  </p>
                </div>
                
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-4">
                  <p className="text-sm text-green-700 dark:text-green-400 mb-1">Academic Year</p>
                  <p className="font-semibold text-green-800 dark:text-green-300">
                    {selectedAssignment.academic_year}
                  </p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Assignment Description</h3>
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {selectedAssignment.description}
                  </p>
                </div>
              </div>

              {selectedAssignment.attachment && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Attachment</h3>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                    {getFileIcon(selectedAssignment.attachment)}
                    <span className="flex-1 text-gray-700 dark:text-gray-300">
                      {selectedAssignment.attachment.split('/').pop()}
                    </span>
                    <button
                      onClick={() => downloadFile(selectedAssignment.attachment!, selectedAssignment.title)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                    >
                      <FaDownload /> Download
                    </button>
                  </div>
                </div>
              )}

              {/* Submission Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Submission</h3>
                  {viewingSubmission && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  )}
                </div>

                {selectedSubmission ? (
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <FaCheckCircle /> Submitted
                            </div>
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Submitted on {new Date(selectedSubmission.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">
                          <strong>Your Notes:</strong> {selectedSubmission.description}
                        </p>
                      </div>
                    </div>

                    {selectedSubmission.file && (
                      <div className="mb-4">
                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
                          {getFileIcon(selectedSubmission.file)}
                          <span className="flex-1 text-gray-700 dark:text-gray-300">
                            {selectedSubmission.file.split('/').pop()}
                          </span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadFile(selectedSubmission.file, `Submission_${selectedAssignment.title}`)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 text-sm"
                            >
                              <FaDownload /> Download
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedSubmission.marks !== null && (
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Grade</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {selectedSubmission.marks}/100
                            </p>
                          </div>
                          <FaCheckCircle className="text-3xl text-green-500" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => handleEditSubmissionClick(selectedSubmission)}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                      >
                        <FaEdit /> Edit Submission
                      </button>
                      <button
                        onClick={() => handleDeleteSubmissionClick(selectedSubmission.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                      >
                        <FaTrash /> Delete Submission
                      </button>
                      {selectedSubmission.file && (
                        <button
                          onClick={() => handleDeleteSubmissionClick(selectedSubmission.id, 'file')}
                          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
                        >
                          <FaTrash /> Delete File Only
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-lg p-8 text-center">
                    <FaClock className="text-4xl text-yellow-500 mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Not Submitted Yet
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      You haven't submitted this assignment. Click the button below to submit.
                    </p>
                    <button
                      onClick={() => {
                        setShowViewModal(false);
                        setShowSubmitModal(true);
                      }}
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 flex items-center gap-2 mx-auto"
                    >
                      <FaPaperPlane /> Submit Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Submission Modal */}
      {showEditModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaEdit className="text-yellow-500" /> Edit Submission
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update your submission for "{selectedSubmission.assignment_title}"
              </p>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>Note:</strong> Editing will replace your current submission. You can update the description or upload a new file.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Updated Description
                  </label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Update your submission notes..."
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Update File (Optional)
                  </label>
                  <div
                    onClick={handleEditFileSelect}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-900/10"
                  >
                    <input
                      type="file"
                      ref={editFileInputRef}
                      onChange={handleEditFileChange}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                    />
                    {editFile ? (
                      <div>
                        <FaFileAlt className="text-3xl text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {editFile.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {(editFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditFile(null);
                          }}
                          className="text-red-500 text-sm mt-2 hover:text-red-600"
                        >
                          Remove File
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FaUpload className="text-3xl text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Click to upload new file (replaces old file)
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Leave empty to keep current file
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  resetEditForm();
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                disabled={editing}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmission}
                disabled={(!editDescription && !editFile) || editing}
                className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {editing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <FaEdit /> Update Submission
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaTrash className="text-red-500" /> Confirm Deletion
              </h2>
            </div>

            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <FaTrash className="text-red-500 text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {deleteType === 'file' ? 'Delete File Only' : 'Delete Entire Submission'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {deleteType === 'file' 
                      ? 'This will remove the attached file but keep your submission record.'
                      : 'This will permanently delete your submission and cannot be undone.'}
                  </p>
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Warning:</strong> {deleteType === 'file' 
                    ? 'You cannot submit a new file if you delete the current one without editing.'
                    : 'You will need to submit the assignment again if you want to complete it.'}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSubmissionIdToDelete(null);
                }}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubmission}
                disabled={deleting}
                className={`px-6 py-2 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                  deleteType === 'file' 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}
              >
                {deleting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Deleting...
                  </>
                ) : (
                  <>
                    <FaTrash /> {deleteType === 'file' ? 'Delete File' : 'Delete Submission'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
