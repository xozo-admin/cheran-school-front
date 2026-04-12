// components/dashboard/staff/maincontent.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FaTasks,
  FaCalendarCheck,
  FaClipboardCheck,
  FaMoneyBill,
  FaTruck,
  FaBox,
  FaBullhorn,
  FaCalendarDay,
  FaUserCircle,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaPlus,
  FaHistory,
  FaFileAlt,
  FaChartLine,
  FaCalendarAlt,
  FaBell,
  FaBook,
  FaGraduationCap
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { toastError, toastInfo } from '@/lib/toast';
import { useThemeClasses } from '@/hooks/useThemeClasses';

/* ---------------- TYPES ---------------- */

interface Task {
  assignment_id: number;
  description: string;
  date: string;
  is_recurring: boolean;
  status: string;
  note: string;
  proof_url: string | null;
}

interface InventoryItem {
  id: number;
  stock_name: string;
  available: number;
  status: string;
}

interface Announcement {
  title: string;
  description: string;
  date: string;
  visibility?: string;
}

interface DashboardData {
  profile?: any;
  tasks?: Task[];
  inventory?: InventoryItem[];
  inventoryHistory?: any[];
  announcements?: Announcement[];
  commonAnnouncements?: Announcement[];
  attendanceSummary?: any;
  attendanceHistory?: any[];
  leaves?: any[];
  salary?: any;
  transport?: any;
}

interface StaffMainContentProps {
  profileData: any;
  dashboardData: DashboardData;
  onMarkAttendance?: () => void;
  onSubmitTask?: (assignmentId: number, notes: string, proofFile?: File) => void;
  onConsumeItem?: (itemId: number) => void;
  onApplyLeave?: (startDate: string, endDate: string, reason: string, proofFile?: File) => void;
  onRefresh?: () => void;
}

/* ---------------- COMPONENT ---------------- */

export const StaffMainContent = ({ 
  profileData, 
  dashboardData,
  onMarkAttendance,
  onSubmitTask,
  onConsumeItem,
  onApplyLeave,
  onRefresh 
}: StaffMainContentProps) => {
  const { get, combine } = useThemeClasses();
  const cardClasses = combine(
    'rounded-2xl p-6 border',
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
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTaskSubmitModal, setShowTaskSubmitModal] = useState(false);
  const [showLeaveApplyModal, setShowLeaveApplyModal] = useState(false);
  const [taskNotes, setTaskNotes] = useState('');

  /* ---------------- HANDLERS ---------------- */

  const handleSubmitTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskSubmitModal(true);
  };

  const handleTaskSubmit = () => {
    if (selectedTask && onSubmitTask) {
      onSubmitTask(selectedTask.assignment_id, taskNotes);
      setShowTaskSubmitModal(false);
      setSelectedTask(null);
      setTaskNotes('');
    }
  };

  const handleConsumeItem = (itemId: number) => {
    if (onConsumeItem) {
      if (window.confirm('Are you sure you want to mark this item as used?')) {
        onConsumeItem(itemId);
      }
    }
  };

  const handleApplyLeave = (startDate: string, endDate: string, reason: string) => {
    if (onApplyLeave) {
      onApplyLeave(startDate, endDate, reason);
      setShowLeaveApplyModal(false);
    }
  };

  const handleViewAttendance = () => {
    window.location.href = '/staff/attendance';
  };

  const handleViewTasks = () => {
    window.location.href = '/staff/tasks';
  };

  const handleViewInventory = () => {
    window.location.href = '/staff/inventory';
  };

  const handleViewAnnouncements = () => {
    window.location.href = '/staff/announcements';
  };

  const handleViewSalary = () => {
    window.location.href = '/staff/salary';
  };

  const handleViewLeaves = () => {
    window.location.href = '/staff/leaves';
  };

  const handleViewTransport = () => {
    window.location.href = '/staff/transport';
  };

  /* ---------------- UI ---------------- */

  const pendingTasks = dashboardData.tasks?.filter(t => t.status === 'Pending').length || 0;
  const unreadAnnouncements = dashboardData.announcements?.length || 0;
  const lowStockItems = dashboardData.inventory?.filter(i => i.available < 3).length || 0;

  return (
    <div className={combine(
      'space-y-6 min-h-screen p-4 md:p-6',
      'bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)]'
    )}>
      {/* WELCOME SECTION */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back, {profileData?.name || 'Staff'}! 👋
            </h1>
            <p className="text-blue-100 mt-2">
              {profileData?.role ? profileData.role.replace('_', ' ').toUpperCase() : 'Staff Dashboard'}
            </p>
            {profileData?.staff_id && (
              <p className="text-blue-200 text-sm mt-1">ID: {profileData.staff_id}</p>
            )}
            {profileData?.phone && (
              <p className="text-blue-200 text-sm mt-1">Phone: {profileData.phone}</p>
            )}
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <button 
              onClick={onMarkAttendance}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <FaCalendarCheck />
              Mark Attendance
            </button>
            <button 
              onClick={() => window.location.href = '/staff/profile'}
              className="px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors flex items-center gap-2"
            >
              <FaUserCircle />
              View Profile
            </button>
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PENDING TASKS */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending Tasks</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {pendingTasks}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaTasks className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewTasks}
            className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
          >
            View All Tasks <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        {/* ATTENDANCE */}
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
                {dashboardData.attendanceSummary?.attendance_percentage || '0%'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Present: {dashboardData.attendanceSummary?.present || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaClipboardCheck className="text-green-600 dark:text-green-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewAttendance}
            className="mt-4 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1"
          >
            View Details <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        {/* INVENTORY */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={statCardClasses}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Inventory Items</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {dashboardData.inventory?.length || 0}
              </p>
              {lowStockItems > 0 && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                  {lowStockItems} low stock
                </p>
              )}
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FaBox className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewInventory}
            className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
          >
            Manage Inventory <FaArrowRight className="text-xs" />
          </button>
        </motion.div>

        {/* ANNOUNCEMENTS */}
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
                {unreadAnnouncements}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FaBullhorn className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
          </div>
          <button 
            onClick={handleViewAnnouncements}
            className="mt-4 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
          >
            View All <FaArrowRight className="text-xs" />
          </button>
        </motion.div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TASKS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaTasks className="text-blue-600" />
              Today's Tasks
            </h2>
            <button 
              onClick={handleViewTasks}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
            >
              View All <FaArrowRight />
            </button>
          </div>
          
          <div className="space-y-4">
            {dashboardData.tasks && dashboardData.tasks.length > 0 ? (
              dashboardData.tasks.map((task, index) => (
                <motion.div
                  key={task.assignment_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {task.description}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Date: {task.date} • {task.is_recurring ? 'Recurring' : 'One-time'}
                      </p>
                      {task.note && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          Note: {task.note}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === 'Pending' 
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                      }`}>
                        {task.status}
                      </span>
                      {task.status === 'Pending' && (
                        <button
                          onClick={() => handleSubmitTaskClick(task)}
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
                <p>No tasks for today</p>
              </div>
            )}
          </div>
        </div>

        {/* INVENTORY SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaBox className="text-amber-600" />
              Inventory Status
            </h2>
            <button 
              onClick={handleViewInventory}
              className="text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
            >
              Manage <FaArrowRight />
            </button>
          </div>

          <div className="space-y-4">
            {dashboardData.inventory && dashboardData.inventory.length > 0 ? (
              dashboardData.inventory.slice(0, 4).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {item.stock_name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Available: {item.available} units
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.status === 'Good' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : item.status === 'Low'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {item.status}
                      </span>
                      <button
                        onClick={() => handleConsumeItem(item.id)}
                        disabled={item.available <= 0}
                        className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                          item.available > 0
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Use
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaBox className="text-3xl mx-auto mb-3 text-gray-400" />
                <p>No inventory items</p>
              </div>
            )}
          </div>

          {/* RECENT HISTORY */}
          {dashboardData.inventoryHistory && dashboardData.inventoryHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                Recent Activity
              </h4>
              <div className="space-y-2">
                {dashboardData.inventoryHistory.slice(0, 3).map((history, index) => (
                  <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-800 dark:text-white">{history.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(history.time).toLocaleString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      history.action === 'used' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {history.action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ANNOUNCEMENTS SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaBullhorn className="text-purple-600" />
              Announcements
            </h2>
            <button 
              onClick={handleViewAnnouncements}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1"
            >
              View All <FaArrowRight />
            </button>
          </div>
          
          <div className="space-y-4">
            {dashboardData.announcements && dashboardData.announcements.length > 0 ? (
              dashboardData.announcements.map((announcement, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 border border-gray-100 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <FaBullhorn className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 dark:text-white">
                        {announcement.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mt-2">
                        {announcement.description}
                      </p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {announcement.visibility || 'All Staff'}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {announcement.date}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <FaBullhorn className="text-3xl mx-auto mb-3 text-gray-400" />
                <p>No announcements</p>
              </div>
            )}
          </div>
        </div>

        {/* ATTENDANCE & SALARY SECTION */}
        <div className={cardClasses}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaChartLine className="text-green-600" />
              Attendance & Salary
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleViewAttendance}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 flex items-center gap-1"
              >
                Attendance
              </button>
              <span className="text-gray-400">|</span>
              <button 
                onClick={handleViewSalary}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                Salary
              </button>
            </div>
          </div>

          {/* ATTENDANCE SUMMARY */}
          {dashboardData.attendanceSummary && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <h3 className="font-medium text-gray-800 dark:text-white mb-3">This Month</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Working Days</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white">
                    {dashboardData.attendanceSummary.total_working_days || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {dashboardData.attendanceSummary.present || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Late</p>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {dashboardData.attendanceSummary.late || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {dashboardData.attendanceSummary.absent || 0}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">Attendance Percentage</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {dashboardData.attendanceSummary.attendance_percentage || '0%'}
                </p>
              </div>
            </div>
          )}

          {/* SALARY PREVIEW */}
          {dashboardData.salary && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800 dark:text-white">Salary Preview</h3>
                <FaMoneyBill className="text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Month: {dashboardData.salary.month}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                ₹{dashboardData.salary.net_payable?.toLocaleString('en-IN') || '0'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Net Payable
              </p>
              <button 
                onClick={handleViewSalary}
                className="mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1"
              >
                View Salary Details <FaArrowRight className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className={cardClasses}>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setShowLeaveApplyModal(true)}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaCalendarDay className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Apply Leave</p>
          </button>

          <button
            onClick={handleViewInventory}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaBox className="text-green-600 dark:text-green-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Manage Inventory</p>
          </button>

          <button
            onClick={handleViewTasks}
            className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-center"
          >
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
              <FaTasks className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">View Tasks</p>
          </button>

          {profileData?.role === 'transport_staff' ? (
            <button
              onClick={handleViewTransport}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center"
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaTruck className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
              <p className="font-medium text-gray-800 dark:text-white">Transport</p>
            </button>
          ) : (
            <button
              onClick={handleViewSalary}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-center"
            >
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
                <FaMoneyBill className="text-purple-600 dark:text-purple-400 text-xl" />
              </div>
              <p className="font-medium text-gray-800 dark:text-white">Salary</p>
            </button>
          )}
        </div>
      </div>

      {/* MODALS */}
      {/* Task Submit Modal */}
      {showTaskSubmitModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={combine('rounded-2xl p-6 w-full max-w-md', get('bg', 'card'), get('border', 'primary'), 'border')}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Submit Task: {selectedTask.description}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes
                </label>
                <textarea
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Add any notes about the task completion..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proof (Optional)
                </label>
                <input
                  type="file"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700"
                  accept="image/*,.pdf"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowTaskSubmitModal(false);
                  setSelectedTask(null);
                  setTaskNotes('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleTaskSubmit}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Apply Modal */}
      {showLeaveApplyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={combine('rounded-2xl p-6 w-full max-w-md', get('bg', 'card'), get('border', 'primary'), 'border')}>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
              Apply for Leave
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="leave-start"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="leave-end"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason
                </label>
                <textarea
                  id="leave-reason"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={3}
                  placeholder="Enter reason for leave..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proof Document (Optional)
                </label>
                <input
                  type="file"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700"
                  accept="image/*,.pdf"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowLeaveApplyModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const startDate = (document.getElementById('leave-start') as HTMLInputElement)?.value;
                  const endDate = (document.getElementById('leave-end') as HTMLInputElement)?.value;
                  const reason = (document.getElementById('leave-reason') as HTMLTextAreaElement)?.value;
                  
                  if (startDate && endDate && reason) {
                    handleApplyLeave(startDate, endDate, reason);
                  } else {
                    alert('Please fill all required fields');
                  }
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply for Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
