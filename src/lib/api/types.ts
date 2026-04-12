export interface AttendanceRecord {
  student_id: string;
  name: string;
  roll_no?: string;
  status: 'Present' | 'Absent' | 'Late' | 'On Leave' | 'Not Marked';
}

export interface AttendanceSummary {
  Present: number;
  Absent: number;
  Late: number;
  'On Leave'?: number;
  'Not Marked'?: number;
}

export interface AttendanceResponse {
  date: string;
  class: string;
  section: string;
  summary: AttendanceSummary;
  attendance_data: AttendanceRecord[];
}