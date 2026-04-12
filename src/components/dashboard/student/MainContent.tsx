// components/dashboard/student/MainContent.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FaBook,
  FaCalendarAlt,
  FaFileAlt,
  FaChartLine,
  FaClipboardCheck,
  FaBell,
  FaGraduationCap,
  FaUserCircle,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBus,
  FaMoneyBill,
  FaTasks,
  FaVideo,
  FaBookOpen,
  FaChartBar,
  FaArrowRight,
  FaPlus
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toastError, toastInfo } from '@/lib/toast';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { studentApi } from '@/lib/api';

/* ---------------- TYPES ---------------- */

interface Assignment {
  id: number;
  title: string;
  subject: string;
  due_date: string;
  status: string;
  posted_by: string;
}

interface Exam {
  exam_type: string;
  start_date: string;
  end_date: string;
  status: string;
}

interface Announcement {
  announcement_number: number;
  description: string;
  posted_by: string;
  posted_time: string;
}

/* ---------------- COMPONENT ---------------- */

export const StudentMainContent = ({ profileData }: { profileData: any }) => {
  const { get, combine } = useThemeClasses();
  const cardClasses = combine(
    'rounded-2xl border p-6',
    get('bg', 'card'),
    get('border', 'primary'),
    get('shadow', 'sm')
  );
  const statCardClasses = combine(
    'rounded-xl p-4 border',
    get('bg', 'card'),
    get('border', 'primary'),
    get('shadow', 'sm')
  );
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingAssignments: 0,
    attendancePercentage: '0%',
    upcomingExams: 0,
    unreadAnnouncements: 0
  });

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timetable, setTimetable] = useState<any>(null);
  const [nextClass, setNextClass] = useState<any>(null);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentYear = new Date().getFullYear();

      // Load multiple data in parallel
      const [
        assignmentsData,
        timetableData,
        attendanceData,
        examsData,
        announcementsData,
        currentClassData
      ] = await Promise.allSettled([
        studentApi.assignments.feed(today),
        studentApi.timetable.myTimetable(),
        studentApi.attendance.self(currentYear),
        studentApi.exams.dashboard(),
        studentApi.announcements.board({ date: today }),
        studentApi.timetable.dashboardNow()
      ]);

      // Process assignments
      if (assignmentsData.status === 'fulfilled') {
        const assignmentsPayload = assignmentsData.value?.data?.data || assignmentsData.value?.data || [];
        const assignmentsList = Array.isArray(assignmentsPayload)
          ? assignmentsPayload
          : (Array.isArray(assignmentsPayload?.data) ? assignmentsPayload.data : []);
        setAssignments(assignmentsList.slice(0, 3));
        setStats(prev => ({
          ...prev,
          pendingAssignments: assignmentsList.filter((a: any) => a.status === 'Pending').length
        }));
      }

      // Process timetable
      if (timetableData.status === 'fulfilled') {
        setTimetable(timetableData.value?.data?.data || timetableData.value?.data || null);
      }

      // Process attendance
      if (attendanceData.status === 'fulfilled') {
        const attendancePayload = attendanceData.value?.data?.data || attendanceData.value?.data || {};
        setStats(prev => ({
          ...prev,
          attendancePercentage: attendancePayload?.attendance_percentage || '0%'
        }));
      }

      // Process exams
      if (examsData.status === 'fulfilled') {
        const examsPayload = examsData.value?.data?.data || examsData.value?.data || {};
        const ongoingExams = examsPayload?.ongoing || [];
        const upcomingExams = examsPayload?.upcoming || [];
        setExams([...ongoingExams, ...upcomingExams].slice(0, 2));
        setStats(prev => ({
          ...prev,
          upcomingExams: upcomingExams.length
        }));
      }

      // Process announcements
      if (announcementsData.status === 'fulfilled') {
        const announcementsPayload = announcementsData.value?.data?.data || announcementsData.value?.data || [];
        const announcementsList = Array.isArray(announcementsPayload)
          ? announcementsPayload
          : (Array.isArray(announcementsPayload?.data) ? announcementsPayload.data : []);
        setAnnouncements(announcementsList.slice(0, 3));
        setStats(prev => ({
          ...prev,
          unreadAnnouncements: announcementsList.length
        }));
      }

      // Process current/next class
      if (currentClassData.status === 'fulfilled') {
        setNextClass(currentClassData.value?.data?.data || currentClassData.value?.data || null);
      }

    } catch (err) {
      console.error('Dashboard data load error:', err);
      toastError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- HANDLERS ---------------- */

  const handleViewAssignments = () => {
    window.location.href = '/student/academics/assignments';
  };

  const handleViewTimetable = () => {
    window.location.href = '/student/academics/timetable';
  };

  const handleViewExams = () => {
    window.location.href = '/student/performance/exams';
  };

  const handleViewAnnouncements = () => {
    window.location.href = '/student/communications/announcements';
  };

  const handleSubmitAssignment = (id: number) => {
    window.location.href = `/student/academics/assignments/submit/${id}`;
  };

  const handleViewProfile = () => {
    window.location.href = '/student/profile';
  };

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={combine(
      'space-y-6 min-h-screen p-4 md:p-6',
      'bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)]'
    )}>
      {/* WELCOME SECTION */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {profileData?.student_name || 'Student'}! 👋
            </h1>
            <p className="text-blue-100 mt-2">
              {profileData?.class_name && profileData?.section_name 
                ? `Class ${profileData.class_name} - Section ${profileData.section_name}` 
                : 'Student Dashboard'}
            </p>
            {profileData?.student_id && (
              <p className="text-blue-200 text-sm mt-1">ID: {profileData.student_id}</p>
            )}
          </div>
          <button 
            onClick={handleViewProfile}
            className="mt-4 md:mt-0 px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
          >
            <FaUserCircle />
            View Profile
          </button>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Assignments</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.pendingAssignments}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FaFileAlt className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewAssignments}
            className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
          >
            View All <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.attendancePercentage}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaClipboardCheck className="text-green-600 dark:text-green-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={() => window.location.href = '/student/performance/attendance'}
            className="mt-4 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1"
          >
            View Details <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming Exams</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.upcomingExams}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <FaGraduationCap className="text-red-600 dark:text-red-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewExams}
            className="mt-4 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
          >
            View Schedule <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Announcements</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.unreadAnnouncements}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaBell className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewAnnouncements}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            View All <FaArrowRight className="text-xs" />
          </button>
        </motion.div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ASSIGNMENTS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaFileAlt className="text-blue-600" />
              Recent Assignments
            </h2>
            <button 
              onClick={handleViewAssignments}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View All <FaArrowRight />
            </button>
          </div>
          
          <div className="space-y-4">
            {assignments.length > 0 ? (
              assignments.map((assignment, index) => (
                <motion.div
                  key={assignment.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {assignment.subject} • Due: {assignment.due_date}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Posted by: {assignment.posted_by}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        assignment.status === 'Pending' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {assignment.status}
                      </span>
                      {assignment.status === 'Pending' && (
                        <button
                          onClick={() => handleSubmitAssignment(assignment.id)}
                          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors"
                        >
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaCheckCircle className="text-3xl mx-auto mb-3 text-green-500" />
                <p>No pending assignments</p>
              </div>
            )}
          </div>
        </div>

        {/* TIMETABLE & NEXT CLASS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaCalendarAlt className="text-purple-600" />
              Today's Schedule
            </h2>
            <button 
              onClick={handleViewTimetable}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
            >
              Full Timetable <FaArrowRight />
            </button>
          </div>

          {nextClass?.current_class ? (
            <div className="space-y-6">
              {/* CURRENT CLASS */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-green-600 dark:text-green-400">
                        Currently in class
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                      {nextClass.current_class.subject}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {nextClass.current_class.time} • {nextClass.current_class.teacher}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Period {nextClass.current_class.period}
                    </p>
                  </div>
                  <FaClock className="text-3xl text-blue-600 dark:text-blue-400" />
                </div>
              </div>

              {/* NEXT CLASS */}
              {nextClass.next_class && (
                <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                        <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                          Next Class
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {nextClass.next_class.subject}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {nextClass.next_class.time} • {nextClass.next_class.teacher}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Starts in</p>
                      <p className="text-xl font-bold text-gray-800 dark:text-white">45 min</p>
                    </div>
                  </div>
                </div>
              )}

              {/* QUICK TIMETABLE VIEW */}
              <div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Today's Classes
                </h4>
                <div className="space-y-2">
                  {timetable?.timetable?.Monday?.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-medium">{item.period}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 dark:text-white">{item.subject}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.teacher}</p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FaCalendarAlt className="text-3xl mx-auto mb-3 text-gray-400" />
              <p>No classes scheduled for today</p>
            </div>
          )}
        </div>

        {/* ANNOUNCEMENTS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaBell className="text-orange-600" />
              Latest Announcements
            </h2>
            <button 
              onClick={handleViewAnnouncements}
              className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 flex items-center gap-1"
            >
              View All <FaArrowRight />
            </button>
          </div>
          
          <div className="space-y-4">
            {announcements.length > 0 ? (
              announcements.map((announcement, index) => (
                <motion.div
                  key={announcement.announcement_number}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <FaBell className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 dark:text-white">
                        {announcement.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {announcement.posted_by}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {announcement.posted_time}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaBell className="text-3xl mx-auto mb-3 text-gray-400" />
                <p>No announcements</p>
              </div>
            )}
          </div>
        </div>

        {/* UPCOMING EXAMS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaGraduationCap className="text-red-600" />
              Upcoming Exams
            </h2>
            <button 
              onClick={handleViewExams}
              className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1"
            >
              View All <FaArrowRight />
            </button>
          </div>
          
          <div className="space-y-4">
            {exams.length > 0 ? (
              exams.map((exam, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {exam.exam_type} Exam
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {exam.start_date} to {exam.end_date}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      exam.status === 'Ongoing' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}>
                      {exam.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {exam.status === 'Ongoing' ? 'In Progress' : 'Upcoming'}
                    </span>
                    <button className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                      View Syllabus
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaGraduationCap className="text-3xl mx-auto mb-3 text-gray-400" />
                <p>No upcoming exams</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className={cardClasses}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/student/academics/assignments/submit'}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaPlus className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Submit Assignment</p>
          </button>

          <button
            onClick={() => window.location.href = '/student/study-materials'}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaBookOpen className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Study Materials</p>
          </button>

          <button
            onClick={() => window.location.href = '/student/services/fees'}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaMoneyBill className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Pay Fees</p>
          </button>

          <button
            onClick={() => window.location.href = '/student/services/transport'}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaBus className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Transport</p>
          </button>
        </div>
      </div>
    </div>
  );
};
