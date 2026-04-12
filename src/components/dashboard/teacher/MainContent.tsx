'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import {
  toastError,
  toastInfo,
  toastLoading,
  toastUpdateSuccess,
  toastUpdateError
} from '@/lib/toast';
import { teacherApi } from '@/lib/api';

// Components
import { ClassAttendance } from './ClassAttendance';
import { StudentPerformance } from './StudentPerformance';
import { ActivityMonitoring } from './ActivityMonitoring';
import { TodaySchedule } from './TodaySchedule';
import { UpcomingClasses } from './UpcomingClasses';
import { AssignmentStatus } from './AssignmentStatus';
import { RecentStudentSubmissions } from './RecentStudentSubmissions';
import { TeachingResources } from './TeachingResources';
import { QuickTeacherActions } from './QuickTeacherActions';

export const TeacherMainContent = () => {
  const today = new Date().toISOString().split('T')[0];
  const { get, combine } = useThemeClasses();

  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<any>(null);
  const [timetable, setTimetable] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [resources, setResources] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resolvePayload = (response: any) => response?.data?.data ?? response?.data ?? null;
  const resolveList = (response: any, keys: string[] = []) => {
    const payload = resolvePayload(response);
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === 'object') {
      for (const key of keys) {
        const value = (payload as Record<string, any>)[key];
        if (Array.isArray(value)) return value;
      }
    }
    return [];
  };

  const extractApiError = (err: any, fallback: string) => {
    const responseData = err?.response?.data;
    if (typeof responseData?.error === 'string') return responseData.error;
    if (typeof responseData?.message === 'string') return responseData.message;
    if (typeof responseData?.detail === 'string') return responseData.detail;
    if (Array.isArray(responseData)) return responseData.join(', ');
    if (responseData && typeof responseData === 'object') {
      const values = Object.values(responseData).flat().filter(Boolean);
      if (values.length) return values.map((value) => String(value)).join(', ');
    }
    if (typeof err?.message === 'string' && err.message.trim()) return err.message;
    return fallback;
  };

  const resolveSubjectForClassSection = (profileData: any, className?: string, section?: string) => {
    if (!className || !section) return '';
    const handled = profileData?.handled_subjects || {};
    for (const [subjectName, classMap] of Object.entries<any>(handled)) {
      const sections = classMap?.[className];
      if (Array.isArray(sections) && sections.includes(section)) {
        return subjectName;
      }
    }
    return '';
  };

  /* ---------------- LOAD DASHBOARD DATA ---------------- */

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setErrors({});

      // Load profile first to get class/section info
      let profileData: any = null;
      try {
        profileData = resolvePayload(await teacherApi.profile.get());
        setTeacher(profileData);
      } catch (err: any) {
        const message = extractApiError(err, 'Unable to load teacher profile');
        setErrors((prev) => ({ ...prev, profile: message }));
        setTeacher(null);
        toastError(message);
        return;
      }

      const className = profileData?.class || profileData?.class_name;
      const section = profileData?.section || profileData?.section_name;
      const subject = resolveSubjectForClassSection(profileData, className, section);

      if (className && section) {

        // Load all dashboard data in parallel
        await Promise.allSettled([
          // Timetable data
          (async () => {
            try {
              const timetableData = resolvePayload(
                await teacherApi.timetable.myClass(today)
              );
              setTimetable(timetableData);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load timetable');
              setErrors((prev) => ({ ...prev, timetable: message }));
            }
          })(),

          // Attendance data
          (async () => {
            try {
              const attendanceData = resolvePayload(
                await teacherApi.attendance.myClass(today)
              );
              setAttendance(attendanceData);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load attendance');
              setErrors((prev) => ({ ...prev, attendance: message }));
            }
          })(),

          // Assignments
          (async () => {
            try {
              const assignmentsData = resolveList(
                await teacherApi.assignments.list({ class_name: className, section }),
                ['data', 'assignments']
              );
              setAssignments(assignmentsData);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load assignments');
              setErrors((prev) => ({ ...prev, assignments: message }));
            }
          })(),

          // Class resources
          (async () => {
            try {
              const resourcesData = resolveList(
                await teacherApi.resources.list({ class_name: className, section }),
                ['data', 'resources']
              );
              setResources(resourcesData);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load resources');
              setErrors((prev) => ({ ...prev, resources: message }));
            }
          })(),

          // Today's tasks
          (async () => {
            try {
              if (!subject) {
                setTasks([]);
                setErrors((prev) => ({ ...prev, tasks: 'No subject allocation found for this class/section.' }));
                return;
              }
              const tasksData = resolveList(
                await teacherApi.tasks.list({ class: className, section, subject, date: today }),
                ['tasks', 'data']
              );
              setTasks(tasksData);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load tasks');
              setErrors((prev) => ({ ...prev, tasks: message }));
            }
          })(),

          // Recent announcements
          (async () => {
            try {
              const response = await teacherApi.announcements.teacherAdminBoard({ date: today });
              const payload = resolvePayload(response) || {};
              const merged = [
                ...(payload.common || []),
                ...(payload.all_teachers || []),
                ...(payload.class_teacher_updates || []),
                ...(payload.subject_teacher_updates || [])
              ];
              setAnnouncements(Array.isArray(merged) ? merged : []);
            } catch (error) {
              const message = extractApiError(error, 'Failed to load announcements');
              setErrors((prev) => ({ ...prev, announcements: message }));
            }
          })(),
        ]);
      } else {
        setErrors((prev) => ({
          ...prev,
          profile: 'Class and section are not assigned for this teacher.',
        }));
        toastInfo('Class and section are required to load dashboard data.');
      }

    } catch (err) {
      console.error('Dashboard load error:', err);
      toastError(extractApiError(err, 'Unable to load teacher dashboard'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  /* ---------------- HANDLERS ---------------- */

  const handleMarkAttendance = async (payload: any) => {
    const id = toastLoading('Marking attendance...');
    try {
      await teacherApi.attendance.mark(payload);
      toastUpdateSuccess(id, 'Attendance updated');
      
      // Refresh attendance data
      const refreshed = resolvePayload(await teacherApi.attendance.myClass(today));
      setAttendance(refreshed);
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Attendance marking failed'));
    }
  };

  const handleCreateAssignment = async (payload: any) => {
    const id = toastLoading('Creating assignment...');
    try {
      await teacherApi.assignments.create(payload);
      toastUpdateSuccess(id, 'Assignment created');
      
      // Refresh assignments data
      const className = teacher?.class || teacher?.class_name;
      const section = teacher?.section || teacher?.section_name;
      if (className && section) {
        const refreshed = resolveList(
          await teacherApi.assignments.list({ class_name: className, section }),
          ['data', 'assignments']
        );
        setAssignments(refreshed);
      }
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Assignment creation failed'));
    }
  };

  const handleGradeSubmission = async (submissionId: string, marks: number) => {
    const id = toastLoading('Grading submission...');
    try {
      await teacherApi.exams.upload({
        submission_id: submissionId,
        marks: marks,
        exam_type: 'assignment',
      });
      toastUpdateSuccess(id, 'Graded successfully');
      
      // Refresh assignments data
      const className = teacher?.class || teacher?.class_name;
      const section = teacher?.section || teacher?.section_name;
      if (className && section) {
        const refreshed = resolveList(
          await teacherApi.assignments.list({ class_name: className, section }),
          ['data', 'assignments']
        );
        setAssignments(refreshed);
      }
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Grading failed'));
    }
  };

  const handleCreateTask = async (taskData: any) => {
    const id = toastLoading('Creating task...');
    try {
      await teacherApi.tasks.create(taskData);
      toastUpdateSuccess(id, 'Task created successfully');
      
      // Refresh tasks
      const className = teacher?.class || teacher?.class_name;
      const section = teacher?.section || teacher?.section_name;
      const subject = resolveSubjectForClassSection(teacher, className, section);
      if (className && section) {
        if (!subject) {
          setTasks([]);
          return;
        }
        const refreshed = resolveList(
          await teacherApi.tasks.list({ class: className, section, subject, date: today }),
          ['tasks', 'data']
        );
        setTasks(refreshed);
      }
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Task creation failed'));
    }
  };

  const handleCreateAnnouncement = async (announcementData: any) => {
    const id = toastLoading('Creating announcement...');
    try {
      await teacherApi.announcements.create(announcementData);
      toastUpdateSuccess(id, 'Announcement posted');
      
      // Refresh announcements
      const response = await teacherApi.announcements.teacherAdminBoard({ date: today });
      const payload = resolvePayload(response) || {};
      const merged = [
        ...(payload.common || []),
        ...(payload.all_teachers || []),
        ...(payload.class_teacher_updates || []),
        ...(payload.subject_teacher_updates || [])
      ];
      setAnnouncements(Array.isArray(merged) ? merged : []);
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Announcement creation failed'));
    }
  };

  const handleUploadResource = async (resourceData: any) => {
    const id = toastLoading('Uploading resource...');
    try {
      await teacherApi.resources.create(resourceData);
      toastUpdateSuccess(id, 'Resource uploaded');
      
      // Refresh resources
      const className = teacher?.class || teacher?.class_name;
      const section = teacher?.section || teacher?.section_name;
      if (className && section) {
        const refreshed = resolveList(
          await teacherApi.resources.list({ class_name: className, section }),
          ['data', 'resources']
        );
        setResources(refreshed);
      }
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Resource upload failed'));
    }
  };

  const handlePostBehaviorReport = async (reportData: any) => {
    const id = toastLoading('Posting behavior report...');
    try {
      await teacherApi.reports.create(reportData);
      toastUpdateSuccess(id, 'Behavior report posted');
    } catch (err: any) {
      toastUpdateError(id, extractApiError(err, 'Report posting failed'));
    }
  };

  const handleViewStudent = (studentId: string) => {
    toastInfo(`Opening student profile: ${studentId}`);
    // Navigate to student profile page
    window.location.href = `/teacher/students/${studentId}`;
  };

  const handleRefreshDashboard = () => {
    loadDashboard();
  };

  /* ---------------- LOADING ---------------- */

  if (loading) {
    return (
      <div
        className={combine(
          'min-h-screen flex items-center justify-center',
          'bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)]'
        )}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className={combine('text-sm', get('text', 'secondary'))}>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={combine(
        'min-h-screen p-4 md:p-6 lg:p-8',
        'bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)]'
      )}
    >
      {/* Header */}
      <div
        className={combine(
          'rounded-2xl p-6 mb-6 border',
          get('bg', 'card'),
          get('border', 'primary'),
          get('shadow', 'sm')
        )}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={combine('text-2xl md:text-3xl font-bold', get('text', 'primary'))}>
              Welcome back, {teacher?.full_name || 'Teacher'} 👋
            </h1>
            <p className={combine('mt-2', get('text', 'secondary'))}>
              {teacher?.designation || 'Faculty'} • {teacher?.subject || 'All Subjects'}
              {teacher?.class && teacher?.section && (
                <> • Class: {teacher.class} - {teacher.section}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshDashboard}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg font-medium">
              Active
            </div>
          </div>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className={combine(
          'rounded-xl p-4 border mb-6',
          get('bg', 'card'),
          get('border', 'secondary')
        )}>
          <div className={combine('text-sm font-semibold mb-2', get('text', 'primary'))}>
            Some data could not be loaded
          </div>
          <ul className={combine('text-xs sm:text-sm space-y-1', get('text', 'secondary'))}>
            {Object.entries(errors).map(([key, message]) => (
              <li key={key}>
                {key}: {message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={combine('rounded-xl p-4 border', get('bg', 'card'), get('border', 'primary'), get('shadow', 'sm'))}>
          <p className={combine('text-sm', get('text', 'tertiary'))}>Pending Tasks</p>
          <p className={combine('text-2xl font-bold mt-1', get('text', 'primary'))}>{tasks.length}</p>
        </div>
        <div className={combine('rounded-xl p-4 border', get('bg', 'card'), get('border', 'primary'), get('shadow', 'sm'))}>
          <p className={combine('text-sm', get('text', 'tertiary'))}>Assignments</p>
          <p className={combine('text-2xl font-bold mt-1', get('text', 'primary'))}>{assignments.length}</p>
        </div>
        <div className={combine('rounded-xl p-4 border', get('bg', 'card'), get('border', 'primary'), get('shadow', 'sm'))}>
          <p className={combine('text-sm', get('text', 'tertiary'))}>Announcements</p>
          <p className={combine('text-2xl font-bold mt-1', get('text', 'primary'))}>{announcements.length}</p>
        </div>
        <div className={combine('rounded-xl p-4 border', get('bg', 'card'), get('border', 'primary'), get('shadow', 'sm'))}>
          <p className={combine('text-sm', get('text', 'tertiary'))}>Resources</p>
          <p className={combine('text-2xl font-bold mt-1', get('text', 'primary'))}>{resources.length}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <ClassAttendance
            attendanceData={attendance}
            onMarkAttendance={handleMarkAttendance}
          />

          <StudentPerformance
            teacherData={teacher}
            onViewStudent={handleViewStudent}
          />

          <ActivityMonitoring
            teacherData={teacher}
            tasks={tasks}
            announcements={announcements}
            onCreateTask={handleCreateTask}
            onCreateAnnouncement={handleCreateAnnouncement}
            onPostBehaviorReport={handlePostBehaviorReport}
            onRefresh={handleRefreshDashboard}
          />
        </div>

        {/* RIGHT COLUMN - Sidebar Content */}
        <div className="space-y-6">
          <TodaySchedule 
            timetable={timetable} 
            tasks={tasks}
          />
          
          <UpcomingClasses 
            timetable={timetable} 
          />

          <AssignmentStatus
            assignmentsData={assignments}
            onCreateAssignment={handleCreateAssignment}
          />

          <RecentStudentSubmissions
            assignmentsData={assignments}
            onGradeSubmission={handleGradeSubmission}
          />

          <TeachingResources
            resources={resources}
            onUploadResource={handleUploadResource}
          />

          {/* <QuickTeacherActions
            onMarkAttendance={() => {
              // Scroll to attendance section or open modal
              document.getElementById('attendance-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            onCreateAssignment={handleCreateAssignment}
            onCreateAnnouncement={handleCreateAnnouncement}
            onUploadResource={handleUploadResource}
          /> */}
        </div>
      </div>

      {/* Footer */}
      <div className={combine('mt-10 pt-6 border-t', get('border', 'primary'))}>
        <div className={combine('text-sm flex flex-col md:flex-row justify-between items-center gap-4', get('text', 'tertiary'))}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span>System Status: Active</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Teacher Portal v2.0</span>
            <span>© {new Date().getFullYear()} All rights reserved</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
