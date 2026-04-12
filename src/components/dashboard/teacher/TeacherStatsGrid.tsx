// teachersstatsgrid.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaUsers, 
  FaBook, 
  FaClipboardCheck, 
  FaChartLine,
  FaGraduationCap,
  FaCalendarCheck,
  FaFileAlt,
  FaBell
} from 'react-icons/fa';
import { teacherAPI } from '@/lib/api/teacher';
import { toastError } from '@/lib/toast';

interface StatsCard {
  id: string;
  title: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  color: string;
  trend: 'up' | 'down' | 'neutral';
}

interface TeacherStatsGridProps {
  teacherData: any;
  timeRange: string;
  attendanceData: any;
  assignmentsData: any;
  announcementsData: any;
}

export const TeacherStatsGrid = ({ 
  teacherData, 
  timeRange, 
  attendanceData, 
  assignmentsData, 
  announcementsData 
}: TeacherStatsGridProps) => {
  const [stats, setStats] = useState<StatsCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [timeRange, attendanceData, assignmentsData, announcementsData]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Calculate stats from provided data
      let totalStudents = 0;
      let presentStudents = 0;
      let attendanceRate = 0;
      
      if (attendanceData?.summary) {
        totalStudents = Object.values(attendanceData.summary).reduce((acc: number, curr: any) => acc + curr, 0);
        presentStudents = attendanceData.summary.Present || 0;
        attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;
      } else if (attendanceData?.attendance_data) {
        totalStudents = attendanceData.attendance_data.length || 0;
        presentStudents = attendanceData.attendance_data.filter((a: any) => 
          a.status?.toLowerCase() === 'present'
        ).length;
        attendanceRate = totalStudents > 0 ? Math.round((presentStudents / totalStudents) * 100) : 0;
      }
      
      const pendingAssignments = assignmentsData?.data?.filter((a: any) => 
        !a.graded || a.status === 'pending'
      ).length || 0;
      
      const totalAssignments = assignmentsData?.data?.length || 0;
      
      const totalAnnouncements = announcementsData?.data?.length || 0;

      const statsCards: StatsCard[] = [
        {
          id: 'students',
          title: 'Total Students',
          value: totalStudents || '0',
          change: totalStudents > 0 ? '+2 from last week' : 'No data',
          icon: <FaUsers className="w-6 h-6" />,
          color: 'blue',
          trend: totalStudents > 0 ? 'up' : 'neutral'
        },
        {
          id: 'attendance',
          title: 'Attendance Rate',
          value: `${attendanceRate}%`,
          change: attendanceRate > 0 ? '+5% this week' : 'No data',
          icon: <FaClipboardCheck className="w-6 h-6" />,
          color: 'green',
          trend: attendanceRate > 0 ? 'up' : 'neutral'
        },
        {
          id: 'assignments',
          title: 'Pending Assignments',
          value: pendingAssignments,
          change: `${totalAssignments} total`,
          icon: <FaFileAlt className="w-6 h-6" />,
          color: 'amber',
          trend: pendingAssignments > 0 ? 'down' : 'neutral'
        },
        {
          id: 'performance',
          title: 'Avg Performance',
          value: '84%',
          change: '+3% from last term',
          icon: <FaChartLine className="w-6 h-6" />,
          color: 'purple',
          trend: 'up'
        },
        {
          id: 'classes',
          title: 'Today\'s Classes',
          value: teacherData?.timetable?.length || '0',
          change: '2 completed',
          icon: <FaBook className="w-6 h-6" />,
          color: 'indigo',
          trend: 'neutral'
        },
        {
          id: 'grading',
          title: 'Grading Progress',
          value: '78%',
          change: '12 to review',
          icon: <FaGraduationCap className="w-6 h-6" />,
          color: 'pink',
          trend: 'up'
        },
        {
          id: 'schedule',
          title: 'Schedule Adherence',
          value: '92%',
          change: 'Perfect this week',
          icon: <FaCalendarCheck className="w-6 h-6" />,
          color: 'teal',
          trend: 'up'
        },
        {
          id: 'announcements',
          title: 'Recent Announcements',
          value: totalAnnouncements,
          change: totalAnnouncements > 0 ? '3 unread' : 'No announcements',
          icon: <FaBell className="w-6 h-6" />,
          color: 'orange',
          trend: totalAnnouncements > 0 ? 'up' : 'neutral'
        }
      ];

      setStats(statsCards);
    } catch (error) {
      console.error('Error loading stats:', error);
      toastError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (color: string) => {
    const classes = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-emerald-600',
      amber: 'from-amber-500 to-orange-600',
      purple: 'from-purple-500 to-purple-600',
      indigo: 'from-indigo-500 to-indigo-600',
      pink: 'from-pink-500 to-rose-600',
      teal: 'from-teal-500 to-cyan-600',
      orange: 'from-orange-500 to-orange-600'
    };
    return classes[color as keyof typeof classes] || classes.blue;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return '↗';
    if (trend === 'down') return '↘';
    return '→';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white/50 border border-slate-200 rounded-2xl p-6 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group"
        >
          <div className="bg-gradient-to-br from-white to-white/90 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${getColorClasses(stat.color)} bg-opacity-10`}>
                <div className={`text-${stat.color}-500`}>
                  {stat.icon}
                </div>
              </div>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'bg-green-100 text-green-600' :
                stat.trend === 'down' ? 'bg-red-100 text-red-600' :
                'bg-slate-100 text-slate-600'
              }`}>
                {getTrendIcon(stat.trend)} {stat.trend}
              </span>
            </div>
            
            <h3 className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</h3>
            <p className="text-sm text-slate-600 mb-2">{stat.title}</p>
            <p className="text-xs text-slate-500">{stat.change}</p>
            
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>View details</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};