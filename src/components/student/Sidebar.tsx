'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaUser,
  FaCalendarAlt,
  FaBook,
  FaClipboardCheck,
  FaChartLine,
  FaGraduationCap,
  FaBell,
  FaCog,
} from 'react-icons/fa';

export const StudentSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaChartLine className="w-5 h-5" />,
      link: '/student',
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <FaUser className="w-5 h-5" />,
      link: '/student/profile',
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: <FaCalendarAlt className="w-5 h-5" />,
      link: '/student/timetable',
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <FaClipboardCheck className="w-5 h-5" />,
      link: '/student/attendance',
    },
    {
      id: 'subjects',
      label: 'Subjects',
      icon: <FaBook className="w-5 h-5" />,
      link: '/student/subjects',
    },
    {
      id: 'grades',
      label: 'Grades',
      icon: <FaGraduationCap className="w-5 h-5" />,
      link: '/student/grades',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: <FaBell className="w-5 h-5" />,
      link: '/student/notifications',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <FaCog className="w-5 h-5" />,
      link: '/student/settings',
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-emerald-700 to-emerald-800 text-white h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-white/20 p-2 rounded-lg">
            <FaGraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Student Portal</h3>
            <p className="text-emerald-200 text-sm">Manage your academic journey</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.link;
            return (
              <Link
                key={item.id}
                href={item.link}
                className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/20 text-white shadow-lg'
                    : 'hover:bg-white/10 text-emerald-100'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-emerald-300'}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-emerald-600/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
              S
            </div>
            <div>
              <p className="text-sm font-medium">Student Panel</p>
              <p className="text-xs text-emerald-300">Academic Year 2024-25</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};