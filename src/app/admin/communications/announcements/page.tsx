'use client';

import { adminApi } from '@/lib/api';

import { useEffect, useMemo, useState } from 'react';
import {
  FaBullhorn,
  FaUserTie,
  FaGlobe,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSave,
  FaArrowLeft,
  FaCalendarAlt,
  FaSearch,
  FaFilter,
  FaTimes,
  FaCheck,
  FaEye,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaChevronLeft,
  FaChevronRight,
  FaBuilding,
  FaMoneyBillWave,
  FaLaptop,
  FaTools,
  FaTruck,
  FaUsers,
  FaFileAlt,
  FaUsersCog,
  FaBroadcastTower,
  FaBell,
  FaExclamationCircle,
  FaInfoCircle
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError, toastInfo, toastWarning } from '@/lib/toast';

interface CommonAnnouncement {
  id: number;
  title: string;
  description: string;
  date: string;
  created_at: string;
}

interface StaffAnnouncement {
  id: number;
  title: string;
  description: string;
  date: string;
  visibility: 'ALL_STAFF' | 'ROLE_SPECIFIC';
  target_role: string | null;
  created_at: string;
}

interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

type AnnouncementMode = 'common' | 'staff';
type ViewMode = 'list' | 'add' | 'edit';

export default function AnnouncementsPage ()  {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [announcementType, setAnnouncementType] = useState<AnnouncementMode>('common');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [commonAnnouncements, setCommonAnnouncements] = useState<CommonAnnouncement[]>([]);
  const [staffAnnouncements, setStaffAnnouncements] = useState<StaffAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortField, setSortField] = useState<'date' | 'title'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [commonPagination, setCommonPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [staffPagination, setStaffPagination] = useState<PaginationMeta>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 1,
    has_next: false,
    has_previous: false,
  });
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<CommonAnnouncement | StaffAnnouncement | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const [commonFormData, setCommonFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [staffFormData, setStaffFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    visibility: 'ALL_STAFF' as 'ALL_STAFF' | 'ROLE_SPECIFIC',
    target_role: '',
  });

  const itemsPerPage = 10;

  // Theme classes
  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl my-2',
      get('border', 'primary')
    );

    const gradients = {
      emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/20' : 'from-white to-emerald-50',
      blue: theme === 'dark' ? 'from-gray-800 to-blue-900/20' : 'from-white to-blue-50',
      amber: theme === 'dark' ? 'from-gray-800 to-amber-900/20' : 'from-white to-amber-50',
      indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/20' : 'from-white to-indigo-50',
      red: theme === 'dark' ? 'from-gray-800 to-red-900/20' : 'from-white to-red-50',
      gray: theme === 'dark' ? 'from-gray-800 to-gray-900/20' : 'from-white to-gray-50',
    };

    return combine(baseClasses, 'bg-gradient-to-br', gradients[color as keyof typeof gradients] || gradients.blue);
  };

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border outline-none transition-all w-full',
    theme === 'dark' ? '[color-scheme:dark]' : '[color-scheme:light]',
    'text-xs sm:text-sm',
    '!bg-[var(--color-bg-card)]',
    '!text-[var(--color-text-primary)]',
    'border-[var(--color-border-secondary)]',
    'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]',
    'hover:border-[var(--color-border-strong)]',
    'focus:ring-2 focus:ring-blue-500',
    'focus:border-[var(--color-accent-primary)]'
  );

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
    'text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
  );

  const getSecondaryButtonClass = () => combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
    'text-xs sm:text-sm',
    'border',
    get('border', 'secondary'),
    get('bg', 'card'),
    get('text', 'secondary'),
    'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
  );

  // Staff roles matching your model
  const roleOptions = [
    { value: 'admin_staff', label: 'Admin Staff', icon: FaBuilding, color: 'blue' },
    { value: 'finance_staff', label: 'Finance Staff', icon: FaMoneyBillWave, color: 'emerald' },
    { value: 'it_staff', label: 'IT Staff', icon: FaLaptop, color: 'blue' },
    { value: 'operations_staff', label: 'Operations Staff', icon: FaTools, color: 'amber' },
    { value: 'transport_staff', label: 'Transport Staff', icon: FaTruck, color: 'indigo' },
    { value: 'external_staff', label: 'External Staff', icon: FaUsers, color: 'gray' },
  ];

  // Get badge class for visibility
  const getVisibilityBadgeClass = (visibility: string) => {
    const color = visibility === 'ALL_STAFF' ? 'emerald' : 'blue';
    
    const colorMap: Record<string, string> = {
      'emerald': theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30 text-emerald-300 border-emerald-800' : 'from-emerald-100 to-emerald-200 text-emerald-700 border-emerald-200',
      'blue': theme === 'dark' ? 'from-blue-900/30 to-blue-800/30 text-blue-300 border-blue-800' : 'from-blue-100 to-blue-200 text-blue-700 border-blue-200',
    };

    return combine(
      'px-3 py-1.5 text-xs font-medium rounded-full bg-gradient-to-r border flex items-center gap-1.5',
      colorMap[color] || colorMap.emerald
    );
  };

  const applyPagination = (
    payload: any,
    fallbackPage: number,
    fallbackPageSize: number
  ): PaginationMeta => {
    const pagination = payload?.pagination;
    if (pagination) {
      return {
        page: pagination.page ?? fallbackPage,
        page_size: pagination.page_size ?? fallbackPageSize,
        total: pagination.total ?? 0,
        total_pages: pagination.total_pages ?? 1,
        has_next: Boolean(pagination.has_next),
        has_previous: Boolean(pagination.has_previous),
      };
    }
    const total = payload?.count ?? (Array.isArray(payload?.data) ? payload.data.length : 0);
    const totalPages = Math.max(1, Math.ceil(total / fallbackPageSize));
    return {
      page: fallbackPage,
      page_size: fallbackPageSize,
      total,
      total_pages: totalPages,
      has_next: fallbackPage < totalPages,
      has_previous: fallbackPage > 1,
    };
  };

  // Fetch common announcements
  const fetchCommonAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await adminApi.announcements.commonListPaginated({
        q: searchQuery.trim() || undefined,
        date: filterDate || undefined,
        sort_by: sortField,
        sort_dir: sortDirection,
        page: currentPage,
        page_size: itemsPerPage,
      });
      const data = response.data;
      
      if (data.data && Array.isArray(data.data)) {
        setCommonAnnouncements(data.data);
      } else {
        setCommonAnnouncements([]);
      }
      const nextPagination = applyPagination(data, currentPage, itemsPerPage);
      setCommonPagination(nextPagination);
      if (nextPagination.page !== currentPage) {
        setCurrentPage(nextPagination.page);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.detail || error.message || 'Failed to fetch common announcements');
      setCommonAnnouncements([]);
      setCommonPagination({
        page: 1,
        page_size: itemsPerPage,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch staff announcements
  const fetchStaffAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await adminApi.announcements.staffListPaginated({
        q: searchQuery.trim() || undefined,
        date: filterDate || undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
        sort_by: sortField,
        sort_dir: sortDirection,
        page: currentPage,
        page_size: itemsPerPage,
      });
      const data = response.data;
      
      if (data.data && Array.isArray(data.data)) {
        setStaffAnnouncements(data.data);
      } else {
        setStaffAnnouncements([]);
      }
      const nextPagination = applyPagination(data, currentPage, itemsPerPage);
      setStaffPagination(nextPagination);
      if (nextPagination.page !== currentPage) {
        setCurrentPage(nextPagination.page);
      }
    } catch (error: any) {
      toastError(error?.response?.data?.detail || error.message || 'Failed to fetch staff announcements');
      setStaffAnnouncements([]);
      setStaffPagination({
        page: 1,
        page_size: itemsPerPage,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // Create common announcement
  const createCommonAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    
    // Validate required fields
    if (!commonFormData.title || !commonFormData.description || !commonFormData.date) {
      toastError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const response = await adminApi.announcements.commonCreate(commonFormData);
      const data = response.data;


      if (response.status === 200) {
        // Success! Show success message from response
        toastSuccess(data.message || 'Common announcement posted successfully');
        setViewMode('list');
        resetCommonForm();
        fetchCommonAnnouncements(); // Refresh the list
      } else {
        // Handle different error formats
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          toastError(errorMessages);
        } else if (data.message) {
          toastError(data.message);
        } else if (data.detail) {
          toastError(data.detail);
        } else if (data.error) {
          toastError(data.error);
        } else {
          toastError('Failed to create announcement');
        }
      }
    } catch (error: any) {
      console.error('Error creating common announcement:', error);
      const data = error?.response?.data;
      if (data?.errors) {
        const errorMessages = Object.values(data.errors).flat().join(', ');
        toastError(errorMessages);
      } else {
        toastError(data?.message || data?.detail || data?.error || error.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Create staff announcement
  const createStaffAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    
    // Validate required fields
    if (!staffFormData.title || !staffFormData.description || !staffFormData.date) {
      toastError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    // Prepare payload
    const payload = {
      ...staffFormData,
      target_role: staffFormData.visibility === 'ROLE_SPECIFIC' ? staffFormData.target_role : ''
    };

    try {
      const response = await adminApi.announcements.staffCreate(payload);
      const data = response.data;

      if (response.status === 201) {
        toastSuccess(data.message || 'Staff announcement created successfully');
        setViewMode('list');
        resetStaffForm();
        fetchStaffAnnouncements();
      } else {
        // Display validation errors
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          toastError(errorMessages);
        } else if (data.message) {
          toastError(data.message);
        } else if (data.detail) {
          toastError(data.detail);
        } else {
          toastError('Failed to create staff announcement');
        }
      }
    } catch (error: any) {
      console.error('Error creating staff announcement:', error);
      const data = error?.response?.data;
      if (data?.errors) {
        const errorMessages = Object.values(data.errors).flat().join(', ');
        toastError(errorMessages);
      } else {
        toastError(data?.message || data?.detail || error.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Update staff announcement
  const updateStaffAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    if (!selectedAnnouncement || !('visibility' in selectedAnnouncement)) return;
    
    
    // Validate required fields
    if (!staffFormData.title || !staffFormData.description) {
      toastError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    try {
      const response = await adminApi.announcements.staffUpdate(selectedAnnouncement.id, {
        title: staffFormData.title,
        description: staffFormData.description,
      });
      const data = response.data;

      if (response.status >= 200 && response.status < 300) {
        toastSuccess(data.message || 'Announcement updated successfully');
        setViewMode('list');
        resetStaffForm();
        fetchStaffAnnouncements();
      } else {
        if (data.errors) {
          const errorMessages = Object.values(data.errors).flat().join(', ');
          toastError(errorMessages);
        } else if (data.message) {
          toastError(data.message);
        } else if (data.detail) {
          toastError(data.detail);
        } else {
          toastError('Failed to update announcement');
        }
      }
    } catch (error: any) {
      console.error('Error updating staff announcement:', error);
      const data = error?.response?.data;
      if (data?.errors) {
        const errorMessages = Object.values(data.errors).flat().join(', ');
        toastError(errorMessages);
      } else {
        toastError(data?.message || data?.detail || error.message || 'Network error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Delete staff announcement
  const deleteStaffAnnouncement = async (id: number) => {
    try {
      const response = await adminApi.announcements.staffDelete(id);
      if (response.status >= 200 && response.status < 300) {
        toastSuccess('Announcement deleted successfully');
        fetchStaffAnnouncements();
        setShowDeleteConfirm(null);
        setSelectedAnnouncement(null);
      } else {
        const data = response.data || {};
        toastError(data.detail || 'Failed to delete announcement');
      }
    } catch (error: any) {
      console.error('Error deleting staff announcement:', error);
      toastError(error?.response?.data?.detail || error.message || 'Network error');
    }
  };

  const resetCommonForm = () => {
    setCommonFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
    setSelectedAnnouncement(null);
  };

  const resetStaffForm = () => {
    setStaffFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      visibility: 'ALL_STAFF',
      target_role: '',
    });
    setSelectedAnnouncement(null);
  };

  const startEdit = (announcement: StaffAnnouncement) => {
    setStaffFormData({
      title: announcement.title,
      description: announcement.description,
      date: announcement.date,
      visibility: announcement.visibility,
      target_role: announcement.target_role || '',
    });
    setSelectedAnnouncement(announcement);
    setViewMode('edit');
  };

  const startAdd = () => {
    if (announcementType === 'common') {
      resetCommonForm();
    } else {
      resetStaffForm();
    }
    setViewMode('add');
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [announcementType, filterDate, filterRole, searchQuery, sortField, sortDirection]);

  useEffect(() => {
    if (announcementType === 'common') {
      fetchCommonAnnouncements();
    } else {
      fetchStaffAnnouncements();
    }
  }, [announcementType, filterDate, filterRole, searchQuery, sortField, sortDirection, currentPage]);

  const currentItems = announcementType === 'common' ? commonAnnouncements : staffAnnouncements;
  const activePagination = useMemo(
    () => (announcementType === 'common' ? commonPagination : staffPagination),
    [announcementType, commonPagination, staffPagination]
  );
  const totalPages = activePagination.total_pages || 1;

  const handleSort = (field: 'date' | 'title') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get role display name
  const getRoleDisplayName = (roleValue: string) => {
    const role = roleOptions.find(r => r.value === roleValue);
    return role?.label || roleValue.replace('_', ' ').toUpperCase();
  };

  return (
    <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()}`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className={combine(
                "p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg",
                theme === 'dark' 
                  ? "bg-gradient-to-br from-blue-600 to-blue-700" 
                  : "bg-gradient-to-br from-blue-500 to-blue-600"
              )}>
                <FaBullhorn className="text-xl sm:text-2xl text-white" />
              </div>
              <div>
                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                  Announcements
                </h1>
                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                  Manage announcements for everyone and staff members
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
              {viewMode === 'list' ? (
                <button
                  onClick={startAdd}
                  className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                >
                  <FaPlus className="text-sm" />
                  <span className="text-sm">New Announcement</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setViewMode('list');
                    announcementType === 'common' ? resetCommonForm() : resetStaffForm();
                  }}
                  className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                >
                  <FaArrowLeft className="text-sm" />
                  <span className="text-sm">Back to List</span>
                </button>
              )}
            </div>
          </div>

          {/* Type Selector - Stats Cards Removed */}
          <div className={getCardGradientClass('gray')}>
            <div className="flex space-x-1 overflow-x-auto p-1">
              <button
                onClick={() => {
                  setAnnouncementType('common');
                  setViewMode('list');
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterRole('all');
                }}
                className={combine(
                  "flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium whitespace-nowrap text-xs sm:text-sm",
                  announcementType === 'common' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : getSecondaryButtonClass()
                )}
              >
                <FaGlobe className="text-sm" />
                <span className="text-sm">Common Announcements</span>
              </button>
              <button
                onClick={() => {
                  setAnnouncementType('staff');
                  setViewMode('list');
                  setSearchTerm('');
                  setFilterDate('');
                  setFilterRole('all');
                }}
                className={combine(
                  "flex items-center space-x-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium whitespace-nowrap text-xs sm:text-sm",
                  announcementType === 'staff' 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : getSecondaryButtonClass()
                )}
              >
                <FaUserTie className="text-sm" />
                <span className="text-sm">Staff Announcements</span>
              </button>
            </div>
          </div>
        </div>

        {/* List View */}
        {viewMode === 'list' && (
          <>
            {/* Search & Filters */}
            <div className={getCardGradientClass('blue')}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <FaSearch className={combine(
                      "absolute left-3 top-1/2 transform -translate-y-1/2 text-sm",
                      get('icon', 'secondary')
                    )} />
                    <input
                      type="text"
                      placeholder="Search announcements..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={getInputClass()}
                      style={{ paddingLeft: '2.5rem' }}
                    />
                  </div>
                </div>
                
                {announcementType === 'common' ? (
                  <div>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className={getInputClass()}
                    />
                  </div>
                ) : (
                  <div>
                    <select
                      value={filterRole}
                      onChange={(e) => setFilterRole(e.target.value)}
                      className={getInputClass()}
                    >
                      <option value="all">All Staff</option>
                      {roleOptions.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setFilterDate('');
                      setFilterRole('all');
                    }}
                    className={combine(getSecondaryButtonClass(), "w-full flex items-center justify-center space-x-2")}
                  >
                    <FaTimes className="text-sm" />
                    <span className="text-sm">Clear Filters</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Announcements Table/List */}
            <div className={getCardGradientClass()}>
              {/* Table Header */}
              <div className={combine("p-4 border-b", get('border', 'primary'))}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0">
                  <div>
                    <h3 className={combine("text-lg font-bold", get('text', 'primary'))}>
                      {announcementType === 'common' ? 'Common' : 'Staff'} Announcements
                    </h3>
                    <p className={combine("text-sm mt-1", get('text', 'secondary'))}>
                      {activePagination.total} announcements found
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleSort('title')}
                      className={combine(getSecondaryButtonClass(), "flex items-center space-x-2 text-xs")}
                    >
                      <span>Sort by Title</span>
                      {sortField === 'title' && (
                        sortDirection === 'asc' ? 
                          <FaSortUp className="text-xs" /> : 
                          <FaSortDown className="text-xs" />
                      )}
                    </button>
                    <button
                      onClick={() => handleSort('date')}
                      className={combine(getSecondaryButtonClass(), "flex items-center space-x-2 text-xs")}
                    >
                      <span>Sort by Date</span>
                      {sortField === 'date' && (
                        sortDirection === 'asc' ? 
                          <FaSortUp className="text-xs" /> : 
                          <FaSortDown className="text-xs" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div>
                {loading ? (
                  <div className="p-8 text-center">
                    <div className="text-center">
                      <div className="relative mx-auto w-16 h-16">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <FaBullhorn className="h-8 w-8 text-blue-600 animate-pulse" />
                        </div>
                      </div>
                      <p className={combine("mt-6 text-sm font-medium", get('text', 'secondary'))}>
                        Loading announcements...
                      </p>
                      <p className={combine("text-sm mt-2", get('text', 'tertiary'))}>
                        Preparing announcement records
                      </p>
                    </div>
                  </div>
                ) : currentItems.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className={combine(
                      "inline-block p-3 rounded-full mb-3",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      {announcementType === 'common' ? (
                        <FaGlobe className={combine(
                          "text-xl",
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                        )} />
                      ) : (
                        <FaUserTie className={combine(
                          "text-xl",
                          theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                        )} />
                      )}
                    </div>
                    <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>No announcements found</h3>
                    <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                      {searchTerm || filterDate || filterRole !== 'all' 
                        ? 'Try adjusting your search or filters'
                        : `Create your first ${announcementType} announcement`}
                    </p>
                    {!searchTerm && !filterDate && filterRole === 'all' && (
                      <button
                        onClick={startAdd}
                        className={combine(getPrimaryButtonClass(), "mt-2")}
                      >
                        Create Announcement
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {currentItems.map((announcement:any) => (
                        <div 
                          key={announcement.id} 
                          className="p-4 transition-colors duration-150 hover:bg-[var(--color-bg-hover)]"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between space-y-3 md:space-y-0">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className={combine(
                                  "h-10 w-10 rounded-full flex items-center justify-center",
                                  theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                                )}>
                                  {announcementType === 'common' ? (
                                    <FaGlobe className={combine(
                                      "text-sm",
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    )} />
                                  ) : (
                                    <FaUserTie className={combine(
                                      "text-sm",
                                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                    )} />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h4 className={combine("font-semibold text-sm", get('text', 'primary'))}>
                                      {announcement.title}
                                    </h4>
                                    <span className={combine(
                                      "px-2 py-0.5 text-xs rounded-full",
                                      theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-700'
                                    )}>
                                      {formatDate(announcement.date)}
                                    </span>
                                  </div>
                                  <p className={combine("text-xs mt-1 line-clamp-2", get('text', 'secondary'))}>
                                    {announcement.description}
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {announcementType === 'staff' && 'visibility' in announcement && (
                                <span className={getVisibilityBadgeClass(announcement.visibility)}>
                                  {announcement.visibility === 'ALL_STAFF' ? 'All Staff' : 
                                   announcement.target_role ? getRoleDisplayName(announcement.target_role) : 'Role Specific'}
                                </span>
                              )}
                              
                              {announcementType === 'staff' && (
                                <div className="flex space-x-1">
                                  <button
                                    onClick={() => startEdit(announcement as StaffAnnouncement)}
                                    className={combine(
                                      "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Edit"
                                  >
                                    <FaEdit className="text-sm" />
                                  </button>
                                  <button
                                    onClick={() => setShowDeleteConfirm(announcement.id)}
                                    className={combine(
                                      "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
                                      get('icon', 'primary') + " text-sm"
                                    )}
                                    title="Delete"
                                  >
                                    <FaTrash className="text-sm" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className={combine("text-xs mt-2 flex items-center", get('text', 'tertiary'))}>
                            <FaCalendarAlt className="mr-1" />
                            Created: {new Date(announcement.created_at).toLocaleDateString()} at{' '}
                            {new Date(announcement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                          <p className={combine("text-xs", get('text', 'tertiary'))}>
                            Page {currentPage} of {totalPages}
                          </p>
                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              disabled={!activePagination.has_previous}
                              className={combine(
                                "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronLeft className="text-xs" />
                            </button>
                            
                            <div className="flex space-x-1">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number;
                                if (totalPages <= 5) {
                                  pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                  pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i;
                                } else {
                                  pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={combine(
                                      "px-3 py-1.5 rounded-lg transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                      currentPage === pageNum
                                        ? getPrimaryButtonClass()
                                        : getSecondaryButtonClass()
                                    )}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              disabled={!activePagination.has_next}
                              className={combine(
                                "p-1.5 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                getSecondaryButtonClass()
                              )}
                            >
                              <FaChevronRight className="text-xs" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Form */}
        {(viewMode === 'add' || viewMode === 'edit') && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className={getCardGradientClass()}>
              {/* Form Header */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={combine(
                      "p-3 rounded-lg",
                      theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                    )}>
                      <FaBullhorn className={combine(
                        "text-lg",
                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                      )} />
                    </div>
                    <div>
                      <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                        {viewMode === 'edit' ? 'Edit' : 'Create'} {announcementType === 'common' ? 'Common' : 'Staff'} Announcement
                      </h2>
                      <p className={combine("text-sm mt-0.5", get('text', 'secondary'))}>
                        {viewMode === 'edit' 
                          ? 'Update announcement details'
                          : 'Create a new announcement for ' + (announcementType === 'common' ? 'everyone' : 'staff members')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={announcementType === 'common' ? createCommonAnnouncement : 
                              viewMode === 'add' ? createStaffAnnouncement : updateStaffAnnouncement} 
                    className="space-y-6">
                
                {/* Common Fields */}
                <div className="space-y-4">
                  <div>
                    <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={announcementType === 'common' ? commonFormData.title : staffFormData.title}
                      onChange={(e) => announcementType === 'common' 
                        ? setCommonFormData({...commonFormData, title: e.target.value})
                        : setStaffFormData({...staffFormData, title: e.target.value})}
                      required
                      className={getInputClass()}
                      placeholder="Enter announcement title"
                    />
                  </div>

                  <div>
                    <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                      Description *
                    </label>
                    <textarea
                      value={announcementType === 'common' ? commonFormData.description : staffFormData.description}
                      onChange={(e) => announcementType === 'common' 
                        ? setCommonFormData({...commonFormData, description: e.target.value})
                        : setStaffFormData({...staffFormData, description: e.target.value})}
                      required
                      rows={4}
                      className={combine(getInputClass(), "resize-none")}
                      placeholder="Enter announcement description"
                    />
                  </div>

                  {viewMode === 'add' && (
                    <div>
                      <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                        Date *
                      </label>
                      <input
                        type="date"
                        value={announcementType === 'common' ? commonFormData.date : staffFormData.date}
                        onChange={(e) => announcementType === 'common' 
                          ? setCommonFormData({...commonFormData, date: e.target.value})
                          : setStaffFormData({...staffFormData, date: e.target.value})}
                        required
                        className={getInputClass()}
                      />
                    </div>
                  )}

                  {/* Staff Specific Fields */}
                  {announcementType === 'staff' && viewMode === 'add' && (
                    <>
                      <div>
                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                          Visibility *
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setStaffFormData({...staffFormData, visibility: 'ALL_STAFF'})}
                            className={combine(
                              "py-2.5 rounded-lg transition-all duration-200 font-medium text-sm flex items-center justify-center space-x-2",
                              staffFormData.visibility === 'ALL_STAFF'
                                ? combine(
                                    "text-white",
                                    theme === 'dark'
                                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                                      : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                                  )
                                : getSecondaryButtonClass()
                            )}
                          >
                            <FaUsers className="text-sm" />
                            <span>All Staff</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setStaffFormData({...staffFormData, visibility: 'ROLE_SPECIFIC'})}
                            className={combine(
                              "py-2.5 rounded-lg transition-all duration-200 font-medium text-sm flex items-center justify-center space-x-2",
                              staffFormData.visibility === 'ROLE_SPECIFIC'
                                ? combine(
                                    "text-white",
                                    theme === 'dark'
                                      ? 'bg-gradient-to-r from-blue-600 to-blue-700'
                                      : 'bg-gradient-to-r from-blue-500 to-blue-600'
                                  )
                                : getSecondaryButtonClass()
                            )}
                          >
                            <FaUsersCog className="text-sm" />
                            <span>Role Specific</span>
                          </button>
                        </div>
                      </div>

                      {staffFormData.visibility === 'ROLE_SPECIFIC' && (
                        <div>
                          <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                            Target Role *
                          </label>
                          <select
                            value={staffFormData.target_role}
                            onChange={(e) => setStaffFormData({...staffFormData, target_role: e.target.value})}
                            required={staffFormData.visibility === 'ROLE_SPECIFIC'}
                            className={getInputClass()}
                          >
                            <option value="">Select Role</option>
                            {roleOptions.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Form Actions */}
                <div className={combine("flex space-x-3 pt-6 border-t", get('border', 'primary'))}>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      announcementType === 'common' ? resetCommonForm() : resetStaffForm();
                    }}
                    className={combine(getSecondaryButtonClass(), "text-sm")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className={combine(
                      getPrimaryButtonClass(),
                      "flex items-center space-x-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    {loading ? (
                      <>
                        <div className={combine(
                          "animate-spin rounded-full h-4 w-4 border-b-2",
                          theme === 'dark' ? 'border-white' : 'border-white'
                        )}></div>
                        <span className="text-sm">
                          {viewMode === 'edit' ? 'Updating...' : 'Creating...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <FaSave className="text-sm" />
                        <span className="text-sm">
                          {viewMode === 'edit' ? 'Update' : 'Create'} Announcement
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
            <div className={combine(
              getCardGradientClass('red'),
              "max-w-md w-full"
            )}>
              <div className="text-center">
                <div className={combine(
                  "mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-3",
                  theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                )}>
                  <FaTrash className={combine(
                    "h-5 w-5",
                    theme === 'dark' ? 'text-red-400' : 'text-red-600'
                  )} />
                </div>
                <h3 className={combine("text-lg font-bold mb-1.5", get('text', 'primary'))}>Delete Announcement</h3>
                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                  Are you sure you want to delete this announcement? This action cannot be undone.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className={combine(getSecondaryButtonClass(), "text-sm flex-1")}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteStaffAnnouncement(showDeleteConfirm)}
                    className={combine(
                      getPrimaryButtonClass(),
                      "text-sm flex-1",
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                    )}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
