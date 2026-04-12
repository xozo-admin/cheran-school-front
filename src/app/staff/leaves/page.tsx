// app/staff/leaves/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {LoadingSpinner} from '@/components/ui/LoadingSpinner';
import {
  FaCalendarDay,
  FaCalendarAlt,
  FaFileUpload,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFilter,
  FaSearch,
  FaArrowLeft,
  FaPlus,
  FaSync,
  FaHistory,
  FaExclamationTriangle,
  FaPaperPlane,
  FaDownload,
  FaEye,
  FaTrash,
  FaEdit
} from 'react-icons/fa';
import { motion } from 'framer-motion';
import { staffApi } from '@/lib/api';

interface Leave {
  id: number;
  user_type: string;
  requester_name: string;
  requester_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  created_at: string;
  proof_url?: string;
  approved_by?: string;
  approved_at?: string;
}

export default function StaffLeavesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyingLeave, setApplyingLeave] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1);

  // Load leaves data
  const loadLeavesData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiResponse = await staffApi.leaves.list();
      const response = apiResponse.data?.data || apiResponse.data;
      setLeaves(response.data || []);

    } catch (err: any) {
      if (err?.response?.status === 401) {
        logout();
        router.push('/');
        return;
      }
      console.error('Error loading leaves:', err);
      setError(err.message || 'Failed to load leaves data');
    } finally {
      setLoading(false);
    }
  };

  // Apply for leave
  const applyForLeave = async () => {
    if (!startDate || !endDate || !reason) {
      alert('Please fill all required fields');
      return;
    }

    try {
      setApplyingLeave(true);

      const formData = new FormData();
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', reason);
      if (proofFile) {
        formData.append('proof_file', proofFile);
      }

      const apiResponse = await staffApi.leaves.apply(formData);
      const response = apiResponse.data?.data || apiResponse.data;

      if (response.status === 200) {
        alert('Leave application submitted successfully!');
        setShowApplyForm(false);
        resetForm();
        loadLeavesData(); // Refresh leaves
      }
    } catch (err: any) {
      console.error('Error applying for leave:', err);
      alert(`Failed to apply for leave: ${err.message || 'Unknown error'}`);
    } finally {
      setApplyingLeave(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setStartDate('');
    setEndDate('');
    setReason('');
    setProofFile(null);
  };

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/');
      } else if (user?.user_type !== 'staff') {
        router.push(`/${user?.user_type}`);
      } else {
        loadLeavesData();
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Filter leaves
  const filteredLeaves = leaves.filter(leave => {
    const matchesSearch = leave.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         leave.requester_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || leave.status === statusFilter;
    const matchesYear = new Date(leave.start_date).getFullYear() === yearFilter;
    return matchesSearch && matchesStatus && matchesYear;
  });

  // Calculate stats
  const stats = {
    total: leaves.length,
    approved: leaves.filter(l => l.status === 'Approved').length,
    pending: leaves.filter(l => l.status === 'Pending').length,
    rejected: leaves.filter(l => l.status === 'Rejected').length,
  };

  // Calculate total leave days
  const calculateTotalDays = () => {
    return leaves.reduce((total, leave) => {
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return total + diffDays;
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/staff')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Leave Management
          </h1>
        </div>
        <button
          onClick={() => setShowApplyForm(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <FaPlus /> Apply for Leave
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Applications</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white mt-2">
                {stats.total}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FaCalendarAlt className="text-blue-600 dark:text-blue-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Approved</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">
                {stats.approved}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">
                {stats.pending}
              </p>
            </div>
            <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <FaClock className="text-amber-600 dark:text-amber-400 text-xl" />
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Leave Days</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {calculateTotalDays()}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <FaCalendarDay className="text-purple-600 dark:text-purple-400 text-xl" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* FILTERS */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by reason or name..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(parseInt(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {years.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadLeavesData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <FaSync /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* LEAVE APPLICATIONS TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FaHistory className="text-blue-600" />
            My Leave Applications ({filteredLeaves.length})
          </h2>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <div className="text-red-500 mb-4">
              <FaExclamationTriangle className="text-4xl mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">Error Loading Leaves</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadLeavesData}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredLeaves.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Application ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Leave Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Applied On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredLeaves.map((leave, index) => (
                  <tr 
                    key={leave.id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 dark:text-white">
                      #{leave.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-800 dark:text-white">
                        {leave.start_date} to {leave.end_date}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {(() => {
                          const start = new Date(leave.start_date);
                          const end = new Date(leave.end_date);
                          const diffTime = Math.abs(end.getTime() - start.getTime());
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                          return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-800 dark:text-white max-w-xs truncate">
                        {leave.reason}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        leave.status === 'Approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : leave.status === 'Pending'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {leave.status}
                      </span>
                      {leave.approved_by && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          By: {leave.approved_by}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {new Date(leave.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            alert(`Leave Application Details:\n\nID: ${leave.id}\nPeriod: ${leave.start_date} to ${leave.end_date}\nReason: ${leave.reason}\nStatus: ${leave.status}\nApplied On: ${new Date(leave.created_at).toLocaleString()}\n${leave.approved_by ? `Approved By: ${leave.approved_by}` : ''}`);
                          }}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        {leave.status === 'Pending' && (
                          <>
                            <button
                              className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              className="p-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                              title="Cancel"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                        {leave.proof_url && (
                          <a
                            href={leave.proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                            title="View Proof"
                          >
                            <FaFileUpload />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FaCalendarDay className="text-4xl text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 dark:text-white mb-2">No Leave Applications</h3>
            <p className="text-gray-600 dark:text-gray-400">
              You haven't applied for any leaves yet.
            </p>
            <button
              onClick={() => setShowApplyForm(true)}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <FaPlus /> Apply for Leave
            </button>
          </div>
        )}
      </div>

      {/* APPLY LEAVE MODAL */}
      {showApplyForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                Apply for Leave
              </h3>
              <button
                onClick={() => {
                  setShowApplyForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <FaTimesCircle className="text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Leave Period */}
              <div>
                <h4 className="text-lg font-medium text-gray-800 dark:text-white mb-4">
                  Leave Period
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      End Date *
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate || new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>
                {startDate && endDate && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <FaCalendarAlt className="inline mr-1" />
                    Leave Duration: {(() => {
                      const start = new Date(startDate);
                      const end = new Date(endDate);
                      const diffTime = Math.abs(end.getTime() - start.getTime());
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
                    })()}
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Leave *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="Please provide a detailed reason for your leave application..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              {/* Proof Document */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Proof Document (Optional)
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
                  <FaFileUpload className="text-3xl text-gray-400 mx-auto mb-3" />
                  <input
                    type="file"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full max-w-xs mx-auto"
                    accept="image/*,.pdf,.doc,.docx"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Upload medical certificate or other supporting documents
                  </p>
                  {proofFile && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                      Selected: {proofFile.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Terms */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Important Notes
                </h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Leave applications require minimum 2 days advance notice</li>
                  <li>• Medical leaves require proper documentation</li>
                  <li>• Application status will be updated within 24-48 hours</li>
                  <li>• Check your email for application updates</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowApplyForm(false);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={applyForLeave}
                  disabled={applyingLeave || !startDate || !endDate || !reason}
                  className={`flex-1 px-4 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
                    applyingLeave || !startDate || !endDate || !reason
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {applyingLeave ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FaPaperPlane /> Submit Application
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
