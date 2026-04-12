'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaFileUpload, 
  FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaDownload,
  FaFilter, FaCalendarDay, FaCalendarWeek, FaCalendarCheck,
  FaExclamationTriangle, FaSpinner, FaArrowLeft, FaArrowRight,
  FaChevronDown, FaChevronUp, FaPaperclip, FaClock, FaHistory,
  FaChartBar, FaUserClock, FaFileMedical, FaBriefcaseMedical,
  FaEye,
  FaTimes,
  FaCalendarPlus,
  FaUser,
  FaIdCard
} from 'react-icons/fa';
import { toast, Toaster } from 'react-hot-toast';
import { studentApi } from '@/lib/api';

// API Service Functions
const leaveApiService = {
  // GET - View leave history
  async getLeaveHistory(filters?: { month?: number; year?: number; status?: string }) {
    const response = await studentApi.leaves.history(filters);
    return response.data?.data || response.data;
  },

  // POST - Apply for leave
  async applyForLeave(formData: FormData) {
    const response = await studentApi.leaves.apply(formData);
    return response.data?.data || response.data;
  },

  // PUT - Edit leave
  async editLeave(formData: FormData) {
    const response = await studentApi.leaves.edit(formData);
    return response.data?.data || response.data;
  },

  // DELETE - Delete leave
  async deleteLeave(formData: any) {
    const response = await studentApi.leaves.delete(formData);
    return response.data?.data || response.data;
  },
};

// Interface Definitions
interface LeaveRequest {
  id: number;
  user_type: string;
  role: string;
  requester_name: string;
  requester_id: string;
  academic_year: number | null;
  academic_year_name: string | null;
  start_date: string;
  end_date: string;
  reason: string;
  proof_file: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  admin_comment: string;
  approved_by_name: string;
  created_at: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  thisMonth: number;
}

export default function StudentLeaveManagement() {
  const getApiErrorMessage = (error: any, fallback: string) => {
    const status = error?.response?.status;
    const data = error?.response?.data;

    if (status === 403) return 'Access denied. You do not have permission to view leave requests.';
    if (status === 404) return 'Leave request not found.';
    if (status === 500) return 'Server error. Please try again later.';
    if (error?.message === 'Network Error') return 'Network error. Please check your connection.';
    if (data?.error) return data.error;
    if (data?.message) return data.message;
    if (data?.detail) return data.detail;
    if (typeof data === 'string') return data;

    if (data && typeof data === 'object') {
      const firstKey = Object.keys(data)[0];
      if (firstKey) {
        const value = (data as any)[firstKey];
        if (Array.isArray(value) && value.length > 0) return value[0];
        if (typeof value === 'string') return value;
      }
    }

    return fallback;
  };

  const normalizeLeaveList = (payload: any): LeaveRequest[] => {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    return [];
  };

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [stats, setStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    thisMonth: 0
  });
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [monthFilter, setMonthFilter] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  // Modal states
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Form states
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequest | null>(null);
  const [formData, setFormData] = useState({
    leave_id: '',
    start_date: '',
    end_date: '',
    reason: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Load leave data on mount
  useEffect(() => {
    loadLeaveData();
  }, []);
  
  // Load leave data with optional filters
  const loadLeaveData = async () => {
    try {
      setLoading(true);
      setError('');
      setPermissionDenied(false);
      
      const response = await leaveApiService.getLeaveHistory();
      const data = normalizeLeaveList(response);
      setAllLeaveRequests(data);
      setLeaveRequests(data);
      calculateStats(data);
      
    } catch (err: any) {
      console.error('Error loading leave data:', err);
      const message = getApiErrorMessage(err, 'Failed to load leave requests');
      if (err?.response?.status === 403) {
        setPermissionDenied(true);
      }
      setError(message);
      toast.error(message);
      setAllLeaveRequests([]);
      setLeaveRequests([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate statistics from leave requests
  const calculateStats = (requests: LeaveRequest[]) => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    
    const stats: LeaveStats = {
      total: requests.length,
      pending: requests.filter(r => r.status === 'Pending').length,
      approved: requests.filter(r => r.status === 'Approved').length,
      rejected: requests.filter(r => r.status === 'Rejected').length,
      thisMonth: requests.filter(r => {
        const date = new Date(r.start_date);
        return date.getMonth() + 1 === currentMonth && 
               date.getFullYear() === currentYear;
      }).length
    };
    
    setStats(stats);
  };
  
  // Handle apply for leave
  const handleApplyLeave = async () => {
    if (permissionDenied) {
      toast.error('You do not have permission to apply for leave.');
      return;
    }
    // Validate form
    const errors: Record<string, string> = {};
    
    if (!formData.start_date) errors.start_date = 'Start date is required';
    if (!formData.end_date) errors.end_date = 'End date is required';
    if (!formData.reason.trim()) errors.reason = 'Reason is required';
    
    const startDate = new Date(formData.start_date);
    const endDate = new Date(formData.end_date);
    
    if (startDate > endDate) {
      errors.end_date = 'End date must be after start date';
    }
    
    // Check if dates are in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      errors.start_date = 'Start date cannot be in the past';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('start_date', formData.start_date);
      formDataObj.append('end_date', formData.end_date);
      formDataObj.append('reason', formData.reason);
      if (proofFile) {
        formDataObj.append('proof_file', proofFile);
      }
      
      await leaveApiService.applyForLeave(formDataObj);
      
      toast.success('Leave request submitted successfully!');
      setShowApplyModal(false);
      resetForm();
      loadLeaveData();
      
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to submit leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle edit leave
  const handleEditLeave = async () => {
    if (!selectedLeave) return;
    if (permissionDenied) {
      toast.error('You do not have permission to edit leave requests.');
      return;
    }
    
    try {
      setSubmitting(true);
      const formDataObj = new FormData();
      formDataObj.append('leave_id', selectedLeave.id.toString());
      
      if (formData.start_date) formDataObj.append('start_date', formData.start_date);
      if (formData.end_date) formDataObj.append('end_date', formData.end_date);
      if (formData.reason) formDataObj.append('reason', formData.reason);
      if (proofFile) {
        formDataObj.append('proof_file', proofFile);
      }
      
      await leaveApiService.editLeave(formDataObj);
      
      toast.success('Leave request updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadLeaveData();
      
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to update leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Handle delete leave
  const handleDeleteLeave = async () => {
    if (!selectedLeave) return;
    if (permissionDenied) {
      toast.error('You do not have permission to delete leave requests.');
      return;
    }
    const formDataObj = new FormData();
    formDataObj.append('leave_id', selectedLeave.id.toString());
    try {
      setSubmitting(true);
      await leaveApiService.deleteLeave(formDataObj);
      
      toast.success('Leave request deleted successfully!');
      setShowDeleteModal(false);
      loadLeaveData();
      
    } catch (err: any) {
      toast.error(getApiErrorMessage(err, 'Failed to delete leave request'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      leave_id: '',
      start_date: '',
      end_date: '',
      reason: '',
    });
    setProofFile(null);
    setFormErrors({});
    setSelectedLeave(null);
  };
  
  // Open apply modal
  const openApplyModal = () => {
    if (permissionDenied) {
      toast.error('You do not have permission to apply for leave.');
      return;
    }
    resetForm();
    setShowApplyModal(true);
  };
  
  // Open edit modal
  const openEditModal = (leave: LeaveRequest) => {
    if (permissionDenied) {
      toast.error('You do not have permission to edit leave requests.');
      return;
    }
    if (leave.status !== 'Pending') {
      toast.error('Only pending leave requests can be edited');
      return;
    }
    
    setSelectedLeave(leave);
    setFormData({
      leave_id: leave.id.toString(),
      start_date: leave.start_date,
      end_date: leave.end_date,
      reason: leave.reason,
    });
    setProofFile(null);
    setFormErrors({});
    setShowEditModal(true);
  };
  
  // Open delete modal
  const openDeleteModal = (leave: LeaveRequest) => {
    if (permissionDenied) {
      toast.error('You do not have permission to delete leave requests.');
      return;
    }
    if (leave.status !== 'Pending') {
      toast.error('Only pending leave requests can be deleted');
      return;
    }
    
    setSelectedLeave(leave);
    setShowDeleteModal(true);
  };
  
  // Open details modal
  const openDetailsModal = (leave: LeaveRequest) => {
    setSelectedLeave(leave);
    setShowDetailsModal(true);
  };
  
  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending': return <FaHourglassHalf className="inline mr-1" />;
      case 'Approved': return <FaCheckCircle className="inline mr-1" />;
      case 'Rejected': return <FaTimesCircle className="inline mr-1" />;
      default: return null;
    }
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Calculate duration in days
  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };
  
  const getFileUrl = (file?: string) => {
    if (!file) return '';
    if (file.startsWith('http')) return file;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    if (!baseUrl) return file;
    return file.startsWith('/') ? `${baseUrl}${file}` : `${baseUrl}/${file}`;
  };
  
  const academicMonthOptions = [
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' }
  ];

  const applyClientFilters = () => {
    let filtered = [...allLeaveRequests];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(r => r.status === statusFilter);
    }

    if (monthFilter) {
      filtered = filtered.filter(r => {
        const date = new Date(r.start_date);
        return date.getMonth() + 1 === monthFilter;
      });
    }

    setLeaveRequests(filtered);
    calculateStats(filtered);
  };

  useEffect(() => {
    applyClientFilters();
  }, [statusFilter, monthFilter, allLeaveRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, monthFilter, allLeaveRequests]);
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <FaCalendarAlt className="absolute inset-0 m-auto text-blue-600 text-2xl" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Loading Leave Requests</h3>
            <p className="text-gray-600">Fetching your leave history...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <Toaster position="top-right" />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaCalendarAlt className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                    Student Leave Management
                  </h1>
                  <p className="text-xs sm:text-sm text-blue-100">
                    Apply for leave and track your requests
                  </p>
                </div>
              </div>

              <button
                onClick={openApplyModal}
                disabled={permissionDenied}
                className="px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaPlus /> Apply for Leave
              </button>
            </div>
          </div>
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Requests</div>
                </div>
                <FaHistory className="text-blue-600 text-xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <FaHourglassHalf className="text-yellow-600 text-xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-sm text-gray-600">Approved</div>
                </div>
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-sm text-gray-600">Rejected</div>
                </div>
                <FaTimesCircle className="text-red-600 text-xl" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-600">{stats.thisMonth}</div>
                  <div className="text-sm text-gray-600">This Month</div>
                </div>
                <FaCalendarDay className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Filter Leave Requests</h3>
            
            <div className="flex flex-wrap gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
              
              {/* Month Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={monthFilter || ''}
                  onChange={(e) => setMonthFilter(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Months</option>
                  {academicMonthOptions.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Filter Buttons */}
              <div className="flex items-end gap-2">
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setMonthFilter(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {permissionDenied && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-yellow-600" />
              <div>
                <h4 className="font-bold text-gray-800">Permission Required</h4>
                <p className="text-gray-700">You do not have access to leave management. Please contact your administrator.</p>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests Table */}
        {leaveRequests.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leave Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applied On
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {leaveRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((request) => {
                    const duration = calculateDuration(request.start_date, request.end_date);
                    const isPending = request.status === 'Pending';
                    
                    return (
                      <tr key={request.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FaCalendarCheck className="text-blue-600" />
                              </div>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {formatDate(request.start_date)} - {formatDate(request.end_date)}
                              </div>
                              <div className="text-sm text-gray-500 truncate max-w-xs" title={request.reason}>
                                {request.reason}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <FaClock className="text-gray-400 mr-2" />
                            <span className="font-medium">{duration} day{duration > 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)} {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {new Date(request.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openDetailsModal(request)}
                              className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium flex items-center gap-1"
                            >
                              <FaEye /> View
                            </button>
                            
                            {isPending && (
                              <>
                                <button
                                  onClick={() => openEditModal(request)}
                                  className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center gap-1"
                                >
                                  <FaEdit /> Edit
                                </button>
                                
                                <button
                                  onClick={() => openDeleteModal(request)}
                                  className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium flex items-center gap-1"
                                >
                                  <FaTrash /> Delete
                                </button>
                              </>
                            )}
                            
                            {request.proof_file && (
                              <a
                                href={getFileUrl(request.proof_file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium flex items-center gap-1"
                              >
                                <FaDownload /> Proof
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <FaCalendarAlt className="text-2xl text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No Leave Requests Found</h3>
            <p className="text-gray-600 max-w-md mx-auto mb-6">
              {statusFilter !== 'all' || monthFilter
                ? 'No leave requests match the selected filters.'
                : 'You haven\'t applied for any leave yet.'}
            </p>
            <button 
              onClick={openApplyModal}
              disabled={permissionDenied}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium mx-auto disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FaPlus /> Apply for Leave
            </button>
          </div>
        )}

        {/* Pagination */}
        {leaveRequests.length > pageSize && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, leaveRequests.length)} of {leaveRequests.length} records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700">
                Page {currentPage} of {Math.ceil(leaveRequests.length / pageSize)}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(Math.ceil(leaveRequests.length / pageSize), p + 1))}
                disabled={currentPage >= Math.ceil(leaveRequests.length / pageSize)}
                className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
        
        {/* Error State */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <FaExclamationTriangle className="text-red-600" />
              <div>
                <h4 className="font-bold text-gray-800">Error Loading Data</h4>
                <p className="text-gray-700">{error}</p>
              </div>
              <button
                onClick={loadLeaveData}
                className="ml-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaCalendarPlus className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Apply for Leave</h2>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      if (formErrors.start_date) setFormErrors({ ...formErrors, start_date: '' });
                    }}
                    className={`w-full px-3 py-2 border ${formErrors.start_date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.start_date}</p>
                  )}
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      if (formErrors.end_date) setFormErrors({ ...formErrors, end_date: '' });
                    }}
                    className={`w-full px-3 py-2 border ${formErrors.end_date ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {formErrors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.end_date}</p>
                  )}
                </div>
                
                {/* Duration Display */}
                {formData.start_date && formData.end_date && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="text-sm text-blue-600 font-medium">Leave Duration</div>
                    <div className="font-semibold text-gray-800">
                      {calculateDuration(formData.start_date, formData.end_date)} day
                      {calculateDuration(formData.start_date, formData.end_date) > 1 ? 's' : ''}
                    </div>
                  </div>
                )}
                
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => {
                      setFormData({ ...formData, reason: e.target.value });
                      if (formErrors.reason) setFormErrors({ ...formErrors, reason: '' });
                    }}
                    rows={3}
                    className={`w-full px-3 py-2 border ${formErrors.reason ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="Enter the reason for your leave request..."
                  />
                  {formErrors.reason && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.reason}</p>
                  )}
                </div>
                
                {/* Proof File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supporting Document (Optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaFileUpload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  {proofFile && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaPaperclip className="text-green-600" />
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{proofFile.name}</div>
                          <div className="text-xs text-gray-600">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setProofFile(null)}
                        className="p-1 hover:bg-white rounded"
                      >
                        <FaTimes className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleApplyLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle /> Submit
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Leave Modal */}
      {showEditModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaEdit className="text-yellow-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Edit Leave Request</h2>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Current Status */}
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="text-sm text-yellow-600 font-medium mb-1">Current Status</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLeave.status)}`}>
                    {getStatusIcon(selectedLeave.status)} {selectedLeave.status}
                  </span>
                </div>
                
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter updated reason..."
                  />
                </div>
                
                {/* Proof File */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Update Supporting Document (Optional)
                  </label>
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FaFileUpload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span>
                        </p>
                        <p className="text-xs text-gray-500">PDF, DOC, JPG, PNG (MAX. 5MB)</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      />
                    </label>
                  </div>
                  {selectedLeave.proof_file && !proofFile && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-sm text-blue-600 font-medium mb-1">Current Document</div>
                      <a
                        href={getFileUrl(selectedLeave.proof_file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-blue-600"
                      >
                        <FaPaperclip /> View Current File
                      </a>
                    </div>
                  )}
                  {proofFile && (
                    <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FaPaperclip className="text-green-600" />
                        <div>
                          <div className="font-medium text-gray-800 text-sm">{proofFile.name}</div>
                          <div className="text-xs text-gray-600">
                            {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setProofFile(null)}
                        className="p-1 hover:bg-white rounded"
                      >
                        <FaTimes className="text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleEditLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Updating...
                    </>
                  ) : (
                    <>
                      <FaEdit /> Update
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Leave Modal */}
      {showDeleteModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaTrash className="text-red-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Delete Leave Request</h2>
                </div>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                  <FaExclamationTriangle className="text-2xl text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Confirm Deletion</h3>
                <p className="text-gray-600">
                  Are you sure you want to delete this leave request? This action cannot be undone.
                </p>
              </div>
              
              <div className="bg-red-50 rounded-lg border border-red-200 p-4 mb-6">
                <div className="font-medium text-gray-800 mb-2">Leave Details</div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Dates: {formatDate(selectedLeave.start_date)} - {formatDate(selectedLeave.end_date)}</div>
                  <div>Duration: {calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days</div>
                  <div>Reason: {selectedLeave.reason.substring(0, 50)}...</div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteLeave}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <FaSpinner className="animate-spin" /> Deleting...
                    </>
                  ) : (
                    <>
                      <FaTrash /> Delete
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Leave Details Modal */}
      {showDetailsModal && selectedLeave && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaCalendarCheck className="text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Leave Request Details</h2>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  {/* Status */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Status</div>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLeave.status)}`}>
                      {getStatusIcon(selectedLeave.status)} {selectedLeave.status}
                    </span>
                  </div>
                  
                  {/* Dates */}
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-sm text-blue-600 mb-2">Leave Period</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Start Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.start_date)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">End Date:</span>
                        <span className="font-medium">{formatDate(selectedLeave.end_date)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                        <span className="text-gray-700">Total Duration:</span>
                        <span className="font-bold text-blue-700">
                          {calculateDuration(selectedLeave.start_date, selectedLeave.end_date)} days
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Applied Information */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Request Information</div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Applied On:</span>
                        <span className="font-medium">{new Date(selectedLeave.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Applied By:</span>
                        <span className="font-medium">{selectedLeave.requester_name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-700">Student ID:</span>
                        <span className="font-medium">{selectedLeave.requester_id}</span>
                      </div>
                      {selectedLeave.approved_by_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">Processed By:</span>
                          <span className="font-medium">{selectedLeave.approved_by_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {/* Reason */}
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-sm text-green-600 mb-2">Reason for Leave</div>
                    <div className="text-gray-800 whitespace-pre-wrap">
                      {selectedLeave.reason}
                    </div>
                  </div>
                  
                  {/* Admin Comments */}
                  {selectedLeave.admin_comment && (
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-sm text-yellow-600 mb-2">Admin Comments</div>
                      <div className="text-gray-800">
                        {selectedLeave.admin_comment}
                      </div>
                    </div>
                  )}
                  
                  {/* Supporting Document */}
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-sm text-purple-600 mb-2">Supporting Document</div>
                    {selectedLeave.proof_file ? (
                      <a
                        href={getFileUrl(selectedLeave.proof_file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200 hover:border-purple-300"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-purple-100 rounded">
                            <FaPaperclip className="text-purple-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">
                              View Document
                            </div>
                            <div className="text-xs text-gray-600">
                              Click to download
                            </div>
                          </div>
                        </div>
                        <FaDownload className="text-purple-400" />
                      </a>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No supporting document attached
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3">
                {selectedLeave.status === 'Pending' && (
                  <>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openEditModal(selectedLeave);
                      }}
                      className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium flex items-center justify-center gap-2"
                    >
                      <FaEdit /> Edit Request
                    </button>
                    <button
                      onClick={() => {
                        setShowDetailsModal(false);
                        openDeleteModal(selectedLeave);
                      }}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                    >
                      <FaTrash /> Delete Request
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
