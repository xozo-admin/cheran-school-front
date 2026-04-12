'use client';

import { useState, useEffect } from 'react';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowDownTrayIcon,
  FunnelIcon,
  EyeIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

interface LeaveApplication {
  id: number;
  teacher_id: string;
  teacher_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  applied_date: string;
  department: string;
  contact_number: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  this_month: number;
  by_type: Record<string, number>;
}

export const TeacherLeaveManagementPage = () => {
  const [loading, setLoading] = useState(true);
  const [leaves, setLeaves] = useState<LeaveApplication[]>([]);
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveApplication[]>([]);
  const [stats, setStats] = useState<LeaveStats | null>(null);
  const [selectedLeave, setSelectedLeave] = useState<LeaveApplication | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [remarks, setRemarks] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch leaves data
  useEffect(() => {

      fetchLeaves();
  });

  // Apply filters
  useEffect(() => {
    let filtered = [...leaves];

    if (statusFilter !== 'all') {
      filtered = filtered.filter(leave => leave.status === statusFilter);
    }

    if (leaveTypeFilter !== 'all') {
      filtered = filtered.filter(leave => leave.leave_type === leaveTypeFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(leave => leave.applied_date === dateFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(leave =>
        leave.teacher_name.toLowerCase().includes(query) ||
        leave.teacher_id.toLowerCase().includes(query) ||
        leave.reason.toLowerCase().includes(query)
      );
    }

    setFilteredLeaves(filtered);
  }, [leaves, statusFilter, leaveTypeFilter, dateFilter, searchQuery]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      // API call to fetch leave applications
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leave/all/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Transform API response to match our interface
        const formattedLeaves: LeaveApplication[] = data.leaves?.map((leave: any) => ({
          id: leave.id,
          teacher_id: leave.teacher?.teacher_id || leave.teacher_id,
          teacher_name: leave.teacher?.name || leave.teacher_name,
          leave_type: leave.leave_type,
          start_date: leave.start_date,
          end_date: leave.end_date,
          total_days: leave.total_days,
          reason: leave.reason,
          status: leave.status,
          applied_date: leave.applied_date,
          department: leave.teacher?.department || 'General',
          contact_number: leave.contact_number || 'N/A'
        })) || [];
        
        setLeaves(formattedLeaves);
        setFilteredLeaves(formattedLeaves);
        calculateStats(formattedLeaves);
      } else {
        // Fallback to mock data if API not available
        loadMockData();
      }
    } catch (error) {
      console.error('Error fetching leaves:', error);
      loadMockData();
    } finally {
      setLoading(false);
    }
  };

  const loadMockData = () => {
    const mockLeaves: LeaveApplication[] = [
      {
        id: 1,
        teacher_id: 'TCH-001',
        teacher_name: 'Dr. Rajesh Kumar',
        leave_type: 'Sick Leave',
        start_date: '2024-12-20',
        end_date: '2024-12-21',
        total_days: 2,
        reason: 'High fever and doctor appointment',
        status: 'pending',
        applied_date: '2024-12-18',
        department: 'Mathematics',
        contact_number: '9876543210'
      },
      {
        id: 2,
        teacher_id: 'TCH-002',
        teacher_name: 'Ms. Priya Sharma',
        leave_type: 'Casual Leave',
        start_date: '2024-12-25',
        end_date: '2024-12-26',
        total_days: 2,
        reason: 'Family wedding ceremony',
        status: 'approved',
        applied_date: '2024-12-15',
        department: 'English',
        contact_number: '9876543211'
      },
      {
        id: 3,
        teacher_id: 'TCH-003',
        teacher_name: 'Mr. Arjun Singh',
        leave_type: 'Earned Leave',
        start_date: '2024-12-28',
        end_date: '2025-01-02',
        total_days: 6,
        reason: 'Vacation with family',
        status: 'rejected',
        applied_date: '2024-12-10',
        department: 'Science',
        contact_number: '9876543212'
      },
      {
        id: 4,
        teacher_id: 'TCH-004',
        teacher_name: 'Mrs. Sunita Patel',
        leave_type: 'Maternity Leave',
        start_date: '2025-01-15',
        end_date: '2025-04-15',
        total_days: 90,
        reason: 'Maternity leave as per policy',
        status: 'approved',
        applied_date: '2024-12-01',
        department: 'Social Studies',
        contact_number: '9876543213'
      },
      {
        id: 5,
        teacher_id: 'TCH-005',
        teacher_name: 'Mr. Vikram Mehta',
        leave_type: 'Sick Leave',
        start_date: '2024-12-22',
        end_date: '2024-12-23',
        total_days: 2,
        reason: 'Medical checkup',
        status: 'pending',
        applied_date: '2024-12-20',
        department: 'Physics',
        contact_number: '9876543214'
      }
    ];
    
    setLeaves(mockLeaves);
    setFilteredLeaves(mockLeaves);
    calculateStats(mockLeaves);
  };

  const calculateStats = (leaveData: LeaveApplication[]) => {
    const total = leaveData.length;
    const pending = leaveData.filter(l => l.status === 'pending').length;
    const approved = leaveData.filter(l => l.status === 'approved').length;
    const rejected = leaveData.filter(l => l.status === 'rejected').length;
    
    const thisMonth = leaveData.filter(l => {
      const appliedDate = new Date(l.applied_date);
      const now = new Date();
      return appliedDate.getMonth() === now.getMonth() && 
             appliedDate.getFullYear() === now.getFullYear();
    }).length;
    
    const byType: Record<string, number> = {};
    leaveData.forEach(leave => {
      byType[leave.leave_type] = (byType[leave.leave_type] || 0) + 1;
    });
    
    setStats({
      total,
      pending,
      approved,
      rejected,
      this_month: thisMonth,
      by_type: byType
    });
  };

  const handleApproveLeave = async (leaveId: number) => {
    try {
      const token = localStorage.getItem('token');
      // API call to approve leave
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leave/${leaveId}/status/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          remarks: remarks || 'Leave approved by admin'
        }),
      });
      
      if (response.ok) {
        // Update local state
        setLeaves(prev => prev.map(leave =>
          leave.id === leaveId ? { ...leave, status: 'approved' } : leave
        ));
        setIsModalOpen(false);
        setSelectedLeave(null);
        setRemarks('');
        
        alert('Leave approved successfully!');
      } else {
        alert('Failed to approve leave');
      }
    } catch (error) {
      console.error('Error approving leave:', error);
      alert('Error approving leave');
    }
  };

  const handleRejectLeave = async (leaveId: number) => {
    if (!remarks.trim()) {
      alert('Please provide remarks for rejection');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      // API call to reject leave
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/leave/${leaveId}/status/`, {
        method: 'PUT',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          remarks: remarks
        }),
      });
      
      if (response.ok) {
        // Update local state
        setLeaves(prev => prev.map(leave =>
          leave.id === leaveId ? { ...leave, status: 'rejected' } : leave
        ));
        setIsModalOpen(false);
        setSelectedLeave(null);
        setRemarks('');
        
        alert('Leave rejected successfully!');
      } else {
        alert('Failed to reject leave');
      }
    } catch (error) {
      console.error('Error rejecting leave:', error);
      alert('Error rejecting leave');
    }
  };

  const handleViewDetails = (leave: LeaveApplication) => {
    setSelectedLeave(leave);
    setIsModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    const icons = {
      pending: <ClockIcon className="h-4 w-4 mr-1" />,
      approved: <CheckCircleIcon className="h-4 w-4 mr-1" />,
      rejected: <XCircleIcon className="h-4 w-4 mr-1" />
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'Sick Leave': 'bg-red-100 text-red-800',
      'Casual Leave': 'bg-blue-100 text-blue-800',
      'Earned Leave': 'bg-green-100 text-green-800',
      'Maternity Leave': 'bg-purple-100 text-purple-800',
      'Paternity Leave': 'bg-indigo-100 text-indigo-800'
    };
    
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const exportToCSV = () => {
    const headers = ['Teacher ID', 'Name', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Applied Date'];
    const csvData = filteredLeaves.map(leave => [
      leave.teacher_id,
      leave.teacher_name,
      leave.leave_type,
      leave.start_date,
      leave.end_date,
      leave.total_days,
      leave.status,
      leave.reason,
      leave.applied_date
    ]);
    
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave-applications-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Teacher Leave Management</h1>
            <p className="text-gray-600 mt-2">Manage and approve leave applications from teachers</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {/* Total Applications */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Applications</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.total || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">
                {stats?.pending || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Approved */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {stats?.approved || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Rejected */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {stats?.rejected || 0}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <XCircleIcon className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">
                {stats?.this_month || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <UserGroupIcon className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Teacher/Reason
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID or reason..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="absolute left-3 top-3.5">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Leave Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Leave Type
            </label>
            <select
              value={leaveTypeFilter}
              onChange={(e) => setLeaveTypeFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Earned Leave">Earned Leave</option>
              <option value="Maternity Leave">Maternity Leave</option>
              <option value="Paternity Leave">Paternity Leave</option>
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Applied Date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Leave Applications Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">
              Leave Applications ({filteredLeaves.length})
            </h3>
            <button
              onClick={fetchLeaves}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teacher Details
                </th>
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
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {leave.teacher_name}
                      </div>
                      <div className="text-sm text-gray-500">{leave.teacher_id}</div>
                      <div className="text-xs text-gray-400">{leave.department}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="mb-2">{getLeaveTypeBadge(leave.leave_type)}</div>
                      <p className="text-sm text-gray-600 line-clamp-2">{leave.reason}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        Applied: {leave.applied_date}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {leave.start_date} to {leave.end_date}
                    </div>
                    <div className="text-sm text-gray-500">{leave.total_days} days</div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(leave.status)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewDetails(leave)}
                        className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </button>
                      
                      {leave.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setRemarks('');
                              setIsModalOpen(true);
                            }}
                            className="flex items-center px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Approve
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedLeave(leave);
                              setRemarks('');
                              setIsModalOpen(true);
                            }}
                            className="flex items-center px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Leave Details/Actions */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">
                  {selectedLeave?.status === 'pending' ? 'Review Leave Application' : 'Leave Details'}
                </h3>
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedLeave(null);
                    setRemarks('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {selectedLeave && (
                <div className="space-y-6">
                  {/* Teacher Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">Teacher Information</h4>
                      <p className="text-lg font-semibold text-gray-800">{selectedLeave.teacher_name}</p>
                      <p className="text-sm text-gray-600">ID: {selectedLeave.teacher_id}</p>
                      <p className="text-sm text-gray-600">Department: {selectedLeave.department}</p>
                      <p className="text-sm text-gray-600">Contact: {selectedLeave.contact_number}</p>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-green-800 mb-2">Leave Information</h4>
                      <div className="flex items-center space-x-2 mb-2">
                        {getLeaveTypeBadge(selectedLeave.leave_type)}
                        {getStatusBadge(selectedLeave.status)}
                      </div>
                      <p className="text-sm text-gray-600">Applied: {selectedLeave.applied_date}</p>
                      <p className="text-sm text-gray-600">Days: {selectedLeave.total_days}</p>
                    </div>
                  </div>

                  {/* Leave Dates */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Leave Period</h4>
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Start Date</p>
                        <p className="text-lg font-semibold text-gray-800">{selectedLeave.start_date}</p>
                      </div>
                      <div className="text-gray-400">→</div>
                      <div className="text-center">
                        <p className="text-xs text-gray-500">End Date</p>
                        <p className="text-lg font-semibold text-gray-800">{selectedLeave.end_date}</p>
                      </div>
                    </div>
                  </div>

                  {/* Reason */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-800 mb-2">Reason for Leave</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-gray-700">{selectedLeave.reason}</p>
                    </div>
                  </div>

                  {/* Action Section for Pending Leaves */}
                  {selectedLeave.status === 'pending' && (
                    <>
                      <div>
                        <h4 className="text-sm font-medium text-gray-800 mb-2">
                          Remarks (Required for Rejection)
                        </h4>
                        <textarea
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          placeholder="Enter remarks for approval/rejection..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={3}
                        />
                      </div>

                      <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={() => handleApproveLeave(selectedLeave.id)}
                          className="px-6 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          Approve Leave
                        </button>
                        <button
                          onClick={() => handleRejectLeave(selectedLeave.id)}
                          disabled={!remarks.trim()}
                          className={`px-6 py-2 font-medium rounded-lg focus:outline-none focus:ring-2 ${
                            remarks.trim()
                              ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          }`}
                        >
                          Reject Leave
                        </button>
                        <button
                          onClick={() => {
                            setIsModalOpen(false);
                            setSelectedLeave(null);
                            setRemarks('');
                          }}
                          className="px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLeaveManagementPage;