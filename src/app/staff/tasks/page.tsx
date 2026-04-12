// app/staff/tasks/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  FaTasks,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaFileUpload,
  FaFilter,
  FaArrowLeft,
  FaSync,
  FaHistory,
  FaExclamationTriangle,
  FaEdit,
  FaUndo,
  FaEye,
  FaCloudUploadAlt,
  FaInfoCircle,
  FaRedo,
  FaRedoAlt, // For recurring icon
  FaCalendarDay // For normal tasks icon
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';
import { staffApi } from '@/lib/api';

interface Task {
  assignment_id: number;
  description: string;
  date: string;
  is_recurring: boolean;
  status: string;
  note: string;
  proof_url: string | null;
  submitted_at?: string;
  operation_id?: number;
}

interface ModalState {
  isOpen: boolean;
  type: 'submit' | 'update' | 'reset' | null;
  task: Task | null;
}

export default function StaffTasksPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all'); // New filter state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: null,
    task: null
  });
  const [taskNotes, setTaskNotes] = useState<string>('');
  const [taskProofFile, setTaskProofFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tasks with enhanced error handling
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const responseApi = await staffApi.work.operations(
        selectedDate ? { date: selectedDate } : undefined
      );
      const response = responseApi.data?.data || responseApi.data;
      
      if (response.tasks) {
        // Mark overdue tasks
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const processedTasks = response.tasks.map((task: Task) => {
          const taskDate = new Date(task.date);
          taskDate.setHours(0, 0, 0, 0);
          const isOverdue = task.status === 'Pending' && taskDate < today;
          return {
            ...task,
            status: isOverdue ? 'Overdue' : task.status
          };
        });
        
        setTasks(processedTasks);
        if (processedTasks.length > 0) {
          toastSuccess(`Loaded ${processedTasks.length} tasks successfully!`);
        }
      } else {
        setTasks([]);
        toastInfo('No tasks found for the selected date.');
      }

    } catch (err: any) {
      console.error('Error loading tasks:', err);
      const errorMsg = err.message || 'Failed to load tasks';
      setError(errorMsg);
      toastError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle task submission (POST)
  const handleSubmitTask = async () => {
    if (!modal.task) return;

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('assignment_id', modal.task.assignment_id.toString());
      if (taskNotes.trim()) {
        formData.append('notes', taskNotes);
      }
      if (taskProofFile) {
        formData.append('proof_file', taskProofFile);
      }

      await staffApi.work.submit(formData);

      toastSuccess('Task submitted successfully!');
      closeModal();
      loadTasks();
    } catch (err: any) {
      console.error('Error submitting task:', err);
      toastError(err.message || 'Failed to submit task');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle task update (PUT)
  const handleUpdateTask = async () => {
    if (!modal.task) return;

    try {
      setSubmitting(true);
      
      const formData = new FormData();
      formData.append('assignment_id', modal.task.assignment_id.toString());
      if (taskNotes.trim()) {
        formData.append('notes', taskNotes);
      }
      if (taskProofFile) {
        formData.append('proof_file', taskProofFile);
      }

      // Include operation_id if available (for update)
      if (modal.task.operation_id) {
        formData.append('operation_id', modal.task.operation_id.toString());
      }

      await staffApi.work.update(formData);

      toastSuccess('Task updated successfully!');
      closeModal();
      loadTasks();
    } catch (err: any) {
      console.error('Error updating task:', err);
      toastError(err.message || 'Failed to update task');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle task reset (DELETE) - Fixed endpoint
  const handleResetTask = async () => {
    if (!modal.task) return;

    try {
      setSubmitting(true);
      
      // For DELETE, we need to send form-data or query parameters
      const formData = new FormData();
      formData.append('assignment_id', modal.task.assignment_id.toString());
      
      // If operation_id exists, include it for reset
      if (modal.task.operation_id) {
        formData.append('operation_id', modal.task.operation_id.toString());
      }

      await staffApi.work.reset(formData);

      toastSuccess('Task reset to pending successfully!');
      closeModal();
      loadTasks();
    } catch (err: any) {
      console.error('Error resetting task:', err);
      toastError(err.message || 'Failed to reset task');
    } finally {
      setSubmitting(false);
    }
  };

  // Open modal with specific action
  const openModal = (type: 'submit' | 'update' | 'reset', task: Task) => {
    setModal({
      isOpen: true,
      type,
      task
    });
    setTaskNotes(task.note || '');
    setTaskProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Close modal and reset state
  const closeModal = () => {
    setModal({
      isOpen: false,
      type: null,
      task: null
    });
    setTaskNotes('');
    setTaskProofFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Filter tasks based on status and task type
  const filteredTasks = tasks.filter(task => {
    // Apply status filter
    if (selectedStatus !== 'all' && task.status.toLowerCase() !== selectedStatus.toLowerCase()) {
      return false;
    }
    
    // Apply task type filter
    if (selectedTaskType !== 'all') {
      if (selectedTaskType === 'normal' && task.is_recurring) {
        return false;
      }
      if (selectedTaskType === 'recurring' && !task.is_recurring) {
        return false;
      }
    }
    
    return true;
  });

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'Pending').length,
    completed: tasks.filter(t => t.status === 'Completed').length,
    overdue: tasks.filter(t => t.status === 'Overdue').length,
    normal: tasks.filter(t => !t.is_recurring).length,
    recurring: tasks.filter(t => t.is_recurring).length
  };

  useEffect(() => {
    loadTasks();
  }, [selectedDate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
        
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
              Task Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
              Manage and submit your daily tasks
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaSync className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-2"
          >
            <FaCalendarAlt /> Today
          </button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-blue-900/20 rounded-xl p-5 shadow-lg border border-blue-100 dark:border-blue-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <FaTasks className="text-blue-600 dark:text-blue-400 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-amber-50 dark:from-gray-800 dark:to-amber-900/20 rounded-xl p-5 shadow-lg border border-amber-100 dark:border-amber-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {stats.pending}
              </p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-xl">
              <FaClock className="text-amber-600 dark:text-amber-400 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-green-50 dark:from-gray-800 dark:to-green-900/20 rounded-xl p-5 shadow-lg border border-green-100 dark:border-green-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats.completed}
              </p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-xl">
              <FaCheckCircle className="text-green-600 dark:text-green-400 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-red-50 dark:from-gray-800 dark:to-red-900/20 rounded-xl p-5 shadow-lg border border-red-100 dark:border-red-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {stats.overdue}
              </p>
            </div>
            <div className="p-3 bg-red-500/10 rounded-xl">
              <FaExclamationTriangle className="text-red-600 dark:text-red-400 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-indigo-50 dark:from-gray-800 dark:to-indigo-900/20 rounded-xl p-5 shadow-lg border border-indigo-100 dark:border-indigo-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Normal Tasks</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                {stats.normal}
              </p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-xl">
              <FaCalendarDay className="text-indigo-600 dark:text-indigo-400 text-2xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -5 }}
          className="bg-gradient-to-br from-white to-purple-50 dark:from-gray-800 dark:to-purple-900/20 rounded-xl p-5 shadow-lg border border-purple-100 dark:border-purple-800/30"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recurring Tasks</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {stats.recurring}
              </p>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <FaRedoAlt className="text-purple-600 dark:text-purple-400 text-2xl" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <FaFilter className="text-gray-600 dark:text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-800 dark:text-white">Filters</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Filter tasks by date, status and type</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <div className="flex items-center gap-2">
                  <FaCalendarAlt /> Date
                </div>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Task Type
              </label>
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="all">All Types</option>
                <option value="normal">Normal Tasks</option>
                <option value="recurring">Recurring Tasks</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadTasks}
                disabled={loading}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading...
                  </>
                ) : (
                  'Apply Filters'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TASKS LIST */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaTasks className="text-blue-600 dark:text-blue-400" />
            </div>
            My Tasks - {selectedDate ? formatDate(selectedDate) : 'All Dates'}
            {selectedTaskType === 'normal' && ' (Normal Tasks)'}
            {selectedTaskType === 'recurring' && ' (Recurring Tasks)'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm">
            Showing {filteredTasks.length} of {tasks.length} tasks
            {selectedTaskType !== 'all' && ` (${selectedTaskType === 'normal' ? 'Normal' : 'Recurring'} tasks only)`}
          </p>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full mb-4"
            >
              <FaExclamationTriangle className="text-2xl text-red-600 dark:text-red-400" />
            </motion.div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Error Loading Tasks</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={loadTasks}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
            >
              Try Again
            </button>
          </div>
        ) : filteredTasks.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            <AnimatePresence>
              {filteredTasks.map((task, index) => (
                <motion.div
                  key={task.assignment_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-200"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    {/* Task Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${getStatusBadgeStyle(task.status)}`}>
                          {task.is_recurring ? (
                            <FaRedoAlt className="text-xl" />
                          ) : (
                            <FaTasks className="text-xl" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                              {task.description}
                            </h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeStyle(task.status)}`}>
                              {task.status}
                            </span>
                            {task.is_recurring && (
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                <FaRedoAlt className="inline mr-1" /> Recurring
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <FaCalendarAlt />
                              <span>{formatDate(task.date)}</span>
                              
                            </div>
                            
                            {task.note && (
                              <div className="flex items-start gap-2 max-w-md">
                                <FaInfoCircle className="mt-0.5" />
                                <span className="italic">{task.note}</span>
                              </div>
                            )}
                            
                            {task.submitted_at && (
                              <div className="flex items-center gap-2">
                                <FaHistory />
                                <span>Submitted: {new Date(task.submitted_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          
                          {task.proof_url && (
                            <div className="mt-4">
                              <a
                                href={task.proof_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                              >
                                <FaEye /> View Proof
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                      {task.status === 'Pending' || task.status === 'Overdue' ? (
                        <button
                          onClick={() => openModal('submit', task)}
                          className={`px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg ${
                            task.status === 'Overdue' ? 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' : ''
                          }`}
                        >
                          <FaCheckCircle /> 
                          {task.status === 'Overdue' ? 'Submit Overdue Task' : 'Submit Task'}
                        </button>
                      ) : task.status === 'Completed' ? (
                        <>
                          <button
                            onClick={() => openModal('update', task)}
                            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                          >
                            <FaEdit /> Update
                          </button>
                          <button
                            onClick={() => openModal('reset', task)}
                            className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                          >
                            <FaUndo /> Reset
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="p-12 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mb-6"
            >
              <FaTasks className="text-3xl text-gray-400" />
            </motion.div>
            <h3 className="text-xl font-medium text-gray-800 dark:text-white mb-3">No Tasks Found</h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
              {selectedDate === new Date().toISOString().split('T')[0]
                ? "You don't have any tasks assigned for today."
                : "No tasks available for the selected date and filters."}
              {selectedTaskType !== 'all' && ` Try changing the task type filter.`}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  setSelectedDate(new Date().toISOString().split('T')[0]);
                  setSelectedStatus('all');
                  setSelectedTaskType('all');
                }}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 font-medium"
              >
                View All Today's Tasks
              </button>
              <button
                onClick={() => setSelectedTaskType('all')}
                className="px-6 py-2.5 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors font-medium"
              >
                Reset Task Type Filter
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL */}
      <AnimatePresence>
        {modal.isOpen && modal.task && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6">
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 rounded-lg ${
                      modal.type === 'submit' ? 'bg-green-100 dark:bg-green-900/30' :
                      modal.type === 'update' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      {modal.type === 'submit' && <FaCheckCircle className="text-green-600 dark:text-green-400" />}
                      {modal.type === 'update' && <FaEdit className="text-blue-600 dark:text-blue-400" />}
                      {modal.type === 'reset' && <FaUndo className="text-amber-600 dark:text-amber-400" />}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                      {modal.type === 'submit' && 'Submit Task'}
                      {modal.type === 'update' && 'Update Task'}
                      {modal.type === 'reset' && 'Reset Task'}
                    </h3>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">
                    {modal.task.description}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Due: {formatDate(modal.task.date)}
                    {modal.task.is_recurring && (
                      <span className="ml-2 text-purple-600 dark:text-purple-400">
                        <FaRedoAlt className="inline mr-1" /> Recurring Daily Task
                      </span>
                    )}
                  </p>
                  {modal.type === 'reset' && modal.task.is_recurring && (
                    <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
                        <FaInfoCircle /> Note: This is a recurring task. Resetting will only affect today's instance.
                      </p>
                    </div>
                  )}
                </div>

                {/* Content based on modal type */}
                {modal.type !== 'reset' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                        <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                      </label>
                      <textarea
                        value={taskNotes}
                        onChange={(e) => setTaskNotes(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        rows={3}
                        placeholder="Add completion notes..."
                        defaultValue={modal.task.note || ''}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Proof File
                        <span className="text-gray-400 text-xs ml-2">(Optional)</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-4 text-center hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer"
                           onClick={() => fileInputRef.current?.click()}>
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={(e) => setTaskProofFile(e.target.files?.[0] || null)}
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx"
                        />
                        <FaCloudUploadAlt className="text-3xl text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {taskProofFile ? taskProofFile.name : 'Click to upload proof file'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports: Images, PDF, Word docs
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FaExclamationTriangle className="text-2xl text-amber-600 dark:text-amber-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Are you sure you want to reset this task to pending status?
                      {modal.task.proof_url && " This will remove the uploaded proof file."}
                    </p>
                    {modal.task.is_recurring && (
                      <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Recurring Task:</strong> This task is assigned daily. Resetting will only affect today's instance.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (modal.type === 'submit') handleSubmitTask();
                      else if (modal.type === 'update') handleUpdateTask();
                      else if (modal.type === 'reset') handleResetTask();
                    }}
                    disabled={submitting}
                    className={`flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-all duration-200 ${
                      modal.type === 'submit' ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' :
                      modal.type === 'update' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                      'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {submitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : modal.type === 'reset' ? (
                      'Confirm Reset'
                    ) : modal.type === 'update' ? (
                      'Update Task'
                    ) : (
                      'Submit Task'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUICK ACTIONS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <FaHistory /> Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedDate(new Date().toISOString().split('T')[0]);
              setSelectedStatus('all');
              setSelectedTaskType('all');
            }}
            className="p-4 bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-blue-600 group-hover:to-blue-700 transition-all">
              <FaCalendarAlt className="text-white text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Today's Tasks</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View current tasks</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setSelectedStatus('Pending');
              setSelectedTaskType('all');
            }}
            className="p-4 bg-gradient-to-br from-white to-amber-50 dark:from-gray-700 dark:to-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-amber-600 group-hover:to-amber-700 transition-all">
              <FaClock className="text-white text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Pending</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View pending tasks</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedTaskType('normal')}
            className="p-4 bg-gradient-to-br from-white to-indigo-50 dark:from-gray-700 dark:to-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 rounded-xl hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-indigo-600 group-hover:to-indigo-700 transition-all">
              <FaCalendarDay className="text-white text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Normal Tasks</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View normal tasks only</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedTaskType('recurring')}
            className="p-4 bg-gradient-to-br from-white to-purple-50 dark:from-gray-700 dark:to-purple-900/20 border border-purple-100 dark:border-purple-800/30 rounded-xl hover:shadow-lg transition-all duration-200 text-center group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:from-purple-600 group-hover:to-purple-700 transition-all">
              <FaRedoAlt className="text-white text-xl" />
            </div>
            <p className="font-medium text-gray-800 dark:text-white">Recurring Tasks</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">View recurring tasks only</p>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
