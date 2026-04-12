// lib/api/teacher.ts
import api from './axios';

interface Assignment {
  id: string;
  title: string;
  description: string;
  due_date: string;
  subject: string;
  is_graded: boolean;
  status: string;
  class_name: string;
  section: string;
}

interface Student {
  id: string;
  name: string;
  roll_number: string;
  class_name: string;
  section: string;
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  status: 'Present' | 'Absent' | 'Late' | 'Not Marked';
  date: string;
}

interface TimetableSlot {
  id: string;
  subject: string;
  teacher_name: string;
  class_name: string;
  section: string;
  start_time: string;
  end_time: string;
  day: string;
}

interface ExamMark {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  exam_type: string;
  marks_obtained: number;
  total_marks: number;
}

export const teacherAPI = {
  /* ---------- AUTH ---------- */
  login: (data: { username: string; password: string }) =>
    api.post('/api/accounts/login/', data),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_type');
    localStorage.removeItem('username');
    localStorage.removeItem('token_expiry');
    return Promise.resolve();
  },

  /* ---------- PROFILE ---------- */
  getProfile: () =>
    api.get('/api/teachers/profile/'),

  updateProfile: (data: any) =>
    api.put('/api/teachers/profile/', data),

  /* ---------- DASHBOARD DATA ---------- */
  getDashboardData: (date: string = new Date().toISOString().split('T')[0]) =>
    Promise.all([
      api.get('/api/timetable/student/dashboard/now/'),
      api.get('/api/announcements/staff/dashboard/', { params: { date } }),
      api.get('/api/tasks/list/', { 
        params: { 
          date,
          class: 'all',
          subject: 'all' 
        } 
      })
    ]).then(([timetableRes, announcementsRes, tasksRes]) => ({
      currentClass: timetableRes.data,
      announcements: announcementsRes.data,
      tasks: tasksRes.data
    })),

  /* ---------- TIMETABLE ---------- */
  getTimetable: (date?: string) =>
    api.get('/api/timetable/teacher/my-class-timetable/', {
      params: date ? { date } : {}
    }),

  getWeeklyTimetable: (week_start: string) =>
    api.get('/api/timetable/teacher/my-class-timetable/', {
      params: { week_start }
    }),

  /* ---------- ATTENDANCE ---------- */
  getClassAttendance: (date: string) =>
    api.get<{ attendance: AttendanceRecord[]; class_info: any }>('/api/attendance/teacher-my-class/', { 
      params: { date } 
    }),

  markAttendance: (data: { 
    date: string; 
    attendance: Array<{ student_id: string; status: string }>;
    class_name: string;
    section: string;
  }) =>
    api.post('/api/attendance/mark/', data),

  getAttendanceReport: (params: { 
    month?: string; 
    year?: string; 
    class_name?: string;
    section?: string;
  }) =>
    api.get('/api/attendance/reports/', { params }),

  /* ---------- ASSIGNMENTS ---------- */
  getAssignments: (params?: { 
    class_name?: string; 
    section?: string; 
    subject?: string; 
    date?: string;
    status?: 'pending' | 'completed' | 'all';
  }) =>
    api.get<Assignment[]>('/api/assignments/teacher/manage/', { params }),

  getPendingAssignments: () =>
    api.get<Assignment[]>('/api/assignments/teacher/manage/', { 
      params: { status: 'pending' } 
    }),

  createAssignment: (data: FormData | any) => {
    const isFormData = data instanceof FormData;
    return api.post('/api/assignments/teacher/manage/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },

  updateAssignment: (data: any) =>
    api.put('/api/assignments/teacher/manage/', data),

  deleteAssignment: (assignment_id: string) =>
    api.delete('/api/assignments/teacher/manage/', {
      params: { assignment_id }
    }),

  /* ---------- EXAMS & MARKS ---------- */
  uploadMarks: (params: { class: string; section: string }, data: any) =>
    api.post('/api/exams/upload/', data, { params }),

  getStudentMarks: (params: { 
    student_id?: string; 
    exam_type?: string;
    class?: string;
    section?: string;
    subject?: string;
  }) =>
    api.get<ExamMark[]>('/api/exams/student-marks-detail/', { params }),

  getSubjectAnalysis: (params: { 
    class: string; 
    section: string; 
    subject: string; 
    exam_type: string;
  }) =>
    api.get('/api/exams/subject-analysis/', { params }),

  /* ---------- STUDENTS ---------- */
  getMyClassStudents: () =>
    api.get<Student[]>('/api/students/list/'),

  getSubjectStudents: (params: { 
    class: string; 
    section: string; 
    subject: string;
  }) =>
    api.get<Student[]>('/api/students/subject-teacher-list/', { params }),

  /* ---------- BEHAVIOR REPORTS ---------- */
  postBehaviorReport: (data: {
    student_id: string;
    title: string;
    description: string;
    type: 'positive' | 'negative' | 'neutral';
    date: string;
  }) =>
    api.post('/api/reports/post/', data),

  getMyBehaviorReports: (params?: {
    class?: string;
    section?: string;
    subject?: string;
    exam_type?: string;
    start_date?: string;
    end_date?: string;
  }) =>
    api.get('/api/reports/view-my-reports/', { params }),

  updateBehaviorReport: (data: any) =>
    api.put('/api/reports/edit/', data),

  /* ---------- ANNOUNCEMENTS ---------- */
  getAnnouncements: (params?: { 
    date?: string; 
    class?: string; 
    section?: string;
  }) =>
    api.get('/api/announcements/notice-board/', { params }),

  getMyAnnouncements: (params?: {
    date?: string;
    class?: string;
    section?: string;
  }) =>
    api.get('/api/announcements/my-posts/', { params }),

  createAnnouncement: (data: {
    title: string;
    content: string;
    target_class?: string;
    target_section?: string;
    priority: 'high' | 'medium' | 'low';
  }) =>
    api.post('/api/announcements/create/', data),

  updateAnnouncement: (data: any) =>
    api.put('/api/announcements/my-posts/', data),

  deleteAnnouncement: (announcement_id: string) =>
    api.delete('/api/announcements/my-posts/', {
      params: { announcement_id }
    }),

  /* ---------- TASKS ---------- */
  getTasks: (params?: {
    class?: string;
    section?: string;
    subject?: string;
    date?: string;
  }) =>
    api.get('/api/tasks/list/', { params }),

  createTask: (data: any) =>
    api.post('/api/tasks/create/', data),

  updateTask: (data: any) =>
    api.put('/api/tasks/detail/', data),

  deleteTask: (task_id: string) =>
    api.delete('/api/tasks/detail/', {
      params: { task_id }
    }),

  /* ---------- CLASS RESOURCES ---------- */
  getClassResources: (params?: {
    class_name?: string;
    section?: string;
    subject?: string;
    date?: string;
  }) =>
    api.get('/api/class-resources/manage/', { params }),

  createClassResource: (data: FormData | any) => {
    const isFormData = data instanceof FormData;
    return api.post('/api/class-resources/manage/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },

  updateClassResource: (data: any) =>
    api.put('/api/class-resources/manage/', data),

  deleteClassResource: (resource_id: string) =>
    api.delete('/api/class-resources/manage/', {
      params: { resource_id }
    }),

  /* ---------- SUBJECT MATERIALS ---------- */
  getSubjectMaterials: (params?: {
    class_name?: string;
    section?: string;
    subject?: string;
    date?: string;
  }) =>
    api.get('/api/subject-materials/manage/', { params }),

  createSubjectMaterial: (data: FormData | any) => {
    const isFormData = data instanceof FormData;
    return api.post('/api/subject-materials/manage/', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
  },

  updateSubjectMaterial: (data: any) =>
    api.put('/api/subject-materials/manage/', data),

  deleteSubjectMaterial: (material_id: string) =>
    api.delete('/api/subject-materials/manage/', {
      params: { material_id }
    }),
};