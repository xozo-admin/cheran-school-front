// src/types/index.ts

export interface User {
  id: string;
  username: string;
  user_type: 'admin' | 'teacher' | 'student' | 'staff';
  email?: string;
  name?: string;
  full_name?: string;
  department?: string;
}

export interface LoginData {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface AdminRegistrationData {
  admin_name: string;
  admin_phone: string;
  admin_email: string;
  admin_password: string;
}

export interface SchoolRegistrationData {
  school_name: string;
  total_students: number;
  total_staffs: number;
  total_teachers: number;
}