'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { teacherAPI } from '@/lib/api/teacher';
import { useAuth } from '@/contexts/AuthContext';

interface TeacherProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  designation: string;
  subject: string;
  class_assigned?: string;
  section_assigned?: string;
  avatar?: string;
  department?: string;
  joining_date?: string;
  qualifications?: string[];
}

interface DashboardStats {
  pendingAssignments: number;
  pendingAttendance: number;
  upcomingClasses: number;
  unreadAnnouncements: number;
  todayTasks: number;
}

interface TeacherContextType {
  profile: TeacherProfile | null;
  stats: DashboardStats;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  refreshStats: () => Promise<void>;
  updateLocalProfile: (updates: Partial<TeacherProfile>) => void;
}

const TeacherContext = createContext<TeacherContextType | undefined>(undefined);

export const useTeacher = () => {
  const context = useContext(TeacherContext);
  if (context === undefined) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
};

interface TeacherProviderProps {
  children: React.ReactNode;
}

export const TeacherProvider = ({ children }: TeacherProviderProps) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    pendingAssignments: 0,
    pendingAttendance: 0,
    upcomingClasses: 0,
    unreadAnnouncements: 0,
    todayTasks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated || user?.user_type !== 'teacher') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    try {
      const response = await teacherAPI.getProfile();
      setProfile(response.data);
      
      // If no profile data, create a basic one from auth context
      if (!response.data && user) {
        setProfile({
          id: user.id,
          full_name: user.name || user.username,
          email: user.email || `${user.username}@school.com`,
          designation: 'Teacher',
          subject: 'General',
          class_assigned: 'N/A',
        });
      }
    } catch (err: any) {
      console.error('Error loading teacher profile:', err);
      setIsError(true);
      setError(err.response?.data?.message || 'Failed to load profile');
      
      // Create fallback profile if authenticated
      if (user) {
        setProfile({
          id: user.id,
          full_name: user.name || user.username,
          email: user.email || `${user.username}@school.com`,
          designation: 'Teacher',
          subject: 'General',
          class_assigned: 'N/A',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  const refreshStats = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch all stats in parallel
      const [
        assignmentsRes,
        attendanceRes,
        timetableRes,
        announcementsRes,
        tasksRes,
      ] = await Promise.allSettled([
        teacherAPI.getPendingAssignments(),
        teacherAPI.getClassAttendance(today),
        teacherAPI.getTimetable(today),
        teacherAPI.getAnnouncements({ date: today }),
        teacherAPI.getTasks({ date: today }),
      ]);

      const newStats: DashboardStats = {
        pendingAssignments: assignmentsRes.status === 'fulfilled' 
          ? assignmentsRes.value.data?.length || 0 
          : 0,
        pendingAttendance: attendanceRes.status === 'fulfilled' 
          ? attendanceRes.value.data?.attendance?.filter(
              (a: any) => !a.status || a.status === 'Not Marked'
            ).length || 0 
          : 0,
        upcomingClasses: timetableRes.status === 'fulfilled' 
          ? timetableRes.value.data?.length || 0 
          : 0,
        unreadAnnouncements: announcementsRes.status === 'fulfilled' 
          ? announcementsRes.value.data?.length || 0 
          : 0,
        todayTasks: tasksRes.status === 'fulfilled' 
          ? tasksRes.value.data?.length || 0 
          : 0,
      };

      setStats(newStats);
    } catch (err) {
      console.error('Error loading stats:', err);
      // Don't fail the whole context if stats fail
    }
  }, [isAuthenticated]);

  const updateLocalProfile = (updates: Partial<TeacherProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  // Load profile and stats when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.user_type === 'teacher') {
      refreshProfile();
      refreshStats();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, refreshProfile, refreshStats]);

  // Auto-refresh stats every 5 minutes
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(refreshStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshStats]);

  const value = {
    profile,
    stats,
    isLoading,
    isError,
    error,
    refreshProfile,
    refreshStats,
    updateLocalProfile,
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
};