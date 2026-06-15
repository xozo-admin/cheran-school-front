// contexts/AuthContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { clearAllCookies } from '@/lib/auth';

interface User {
  id: string;
  username: string;
  user_type: 'super_admin' | 'admin' | 'teacher' | 'student' | 'staff';
  email?: string;
  name?: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  class?: string;
  section?: string;
  teacher_type?: string;
  role?: string;
  staff_role?: string;
  department?: string;
  school_id?: number | null;
  school_name?: string | null;
  institution_id?: number | null;
  institution_name?: string | null;
  can_access_all_schools?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: any, rememberMe?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getCookieOptions = (expirationDays?: number) => ({
  ...(expirationDays ? { expires: expirationDays } : {}),
  secure: typeof window !== 'undefined' ? window.location.protocol === 'https:' : true,
  sameSite: 'strict' as const,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore auth state from cookies on refresh
    const token = Cookies.get('token');
    const sessionKey = Cookies.get('session_key');
    const userCookie = Cookies.get('auth_user');

    if (token && sessionKey) {
      if (userCookie) {
        try {
          setUser(JSON.parse(userCookie));
        } catch (error) {
          console.error('Failed to parse auth_user cookie:', error);
          Cookies.remove('auth_user');
          Cookies.remove('auth_user_type');
        }
      }
    }

    setIsLoading(false);
  }, []);

  const login = (data: any, rememberMe: boolean = false) => {
    const expirationDays = rememberMe ? 30 : 1;

    // Store auth data in cookies
    if (data.token) {
      Cookies.set('token', data.token, getCookieOptions(expirationDays));
    }
    
    if (data.session_key) {
      Cookies.set('session_key', data.session_key, getCookieOptions(expirationDays));
    }

    // Save user in state (memory only, not persisted)
    const userData: User = {
      id: data.username || data.id || '',
      username: data.username || data.id || '',
      user_type: data.user_type || 'admin',
      name: data.name,
      full_name: data.full_name || data.name,
      first_name: data.first_name,
      last_name: data.last_name,
      class: data.class,
      section: data.section,
      teacher_type: data.teacher_type,
      role: data.role || data.staff_role,
      staff_role: data.staff_role || data.role,
      department: data.department,
      school_id: data.school_id ?? null,
      school_name: data.school_name ?? null,
      institution_id: data.institution_id ?? null,
      institution_name: data.institution_name ?? null,
      can_access_all_schools: Boolean(data.can_access_all_schools),
    };
    setUser(userData);
    Cookies.set('auth_user', JSON.stringify(userData), getCookieOptions(expirationDays));
    Cookies.set('auth_user_type', userData.user_type, getCookieOptions(expirationDays));
  };

  const logout = () => {
    clearAllCookies();

    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
