'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FaChalkboardTeacher,
  FaUserGraduate,
  FaCalendarAlt,
  FaClipboardCheck,
  FaBook,
  FaChartBar,
  FaBell,
  FaCog,
} from 'react-icons/fa';

export const TeacherSidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <FaChalkboardTeacher className="w-5 h-5" />,
      link: '/teacher',
    },
    {
      id: 'attendance',
      label: 'Mark Attendance',
      icon: <FaClipboardCheck className="w-5 h-5" />,
      link: '/teacher/attendance',
    },
    {
      id: 'students',
      label: 'My Students',
      icon: <FaUserGraduate className="w-5 h-5" />,
      link: '/teacher/students',
    },
    {
      id: 'timetable',
      label: 'Timetable',
      icon: <FaCalendarAlt className="w-5 h-5" />,
      link: '/teacher/timetable',
    },
    {
      id: 'subjects',
      label: 'Subjects',
      icon: <FaBook className="w-5 h-5" />,
      link: '/teacher/subjects',
    },
    {
      id: 'grades',
      label: 'Grades',
      icon: <FaChartBar className="w-5 h-5" />,
      link: '/teacher/grades',
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <FaChartBar className="w-5 h-5" />,
      link: '/teacher/reports',
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <FaCog className="w-5 h-5" />,
      link: '/teacher/settings',
    },
  ];

  return (
    <aside className="w-64 bg-gradient-to-b from-amber-700 to-amber-800 text-white h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="bg-white/20 p-2 rounded-lg">
            <FaChalkboardTeacher className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-lg">Teacher Portal</h3>
            <p className="text-amber-200 text-sm">Manage your class and students</p>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              href={item.link}
              className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                pathname === item.link
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'hover:bg-white/10 text-amber-100'
              }`}
            >
              <span className={pathname === item.link ? 'text-white' : 'text-amber-300'}>
                {item.icon}
              </span>
              <span className="font-medium">{item.label}</span>
              {pathname === item.link && (
                <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
              )}
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};