// lib/utils/apiHelpers.ts

// Helper to format timetable data
export const formatTimetableData = (data: any[]) => {
  return data.map(item => ({
    id: item.id,
    subject: item.subject_name,
    teacher: item.teacher_name,
    time: `${item.start_time} - ${item.end_time}`,
    room: item.room_number,
    day: item.day_of_week,
    type: item.class_type || 'Lecture',
  }));
};

// Helper to format assignment data
export const formatAssignmentData = (data: any[]) => {
  return data.map(item => ({
    id: item.id,
    title: item.title,
    subject: item.subject_name,
    dueDate: new Date(item.due_date).toLocaleDateString(),
    status: item.status || 'pending',
    description: item.description,
    attachments: item.attachments || [],
  }));
};

// Helper to format grade data
export const formatGradeData = (data: any[]) => {
  return data.map(item => ({
    id: item.id,
    subject: item.subject_name,
    score: item.score,
    grade: calculateGrade(item.score),
    percentage: item.percentage,
    remarks: item.remarks,
    examType: item.exam_type,
  }));
};

// Calculate letter grade based on score
export const calculateGrade = (score: number): string => {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  return 'F';
};

// Helper to handle API errors
export const handleApiError = (error: any): string => {
  if (error.response) {
    // Server responded with error
    return error.response.data.error || 'Server error occurred';
  } else if (error.request) {
    // No response received
    return 'Network error. Please check your connection';
  } else {
    // Something else happened
    return 'An unexpected error occurred';
  }
};