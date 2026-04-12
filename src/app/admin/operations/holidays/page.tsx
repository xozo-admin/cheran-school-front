'use client';

import { adminApi } from '@/lib/api';

import { useCallback, useEffect, useState } from 'react';
import {
    FaCalendarAlt,
    FaPlus,
    FaEdit,
    FaTrash,
    FaSearch,
    FaSave,
    FaUsers,
    FaUserGraduate,
    FaUserTie,
    FaCalendarDay,
    FaCalendarCheck,
    FaChevronLeft,
    FaChevronRight,
    FaDownload,
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { toastSuccess, toastError } from '@/lib/toast';

interface Holiday {
    id: number;
    date: string; // Format: "2026-01-26"
    name: string;
    applicable_for: 'everyone' | 'students_only' | 'staff' | 'teachers';
    created_at?: string;
    updated_at?: string;
}

interface HolidayFormData {
    name: string;
    date: string;
    applicable_for: 'everyone' | 'students_only' | 'staff' | 'teachers';
}

interface HolidaySummary {
    total: number;
    everyone: number;
    students_only: number;
    staff: number;
    teachers: number;
}

interface HolidayPaginationMeta {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
}

interface HolidayFilterParams {
    search?: string;
    year?: string;
    month?: string;
    applicable_for?: string;
    page?: number;
    page_size?: number;
}

export default function HolidaysManagementPage() {
    const { theme } = useTheme();
    const { get, combine } = useThemeClasses();

    // State management
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState<string>('');
    const [filterMonth, setFilterMonth] = useState<string>('');
    const [filterApplicableFor, setFilterApplicableFor] = useState<string>('');
    const [showForm, setShowForm] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [summary, setSummary] = useState<HolidaySummary>({
        total: 0,
        everyone: 0,
        students_only: 0,
        staff: 0,
        teachers: 0,
    });
    const [pagination, setPagination] = useState<HolidayPaginationMeta>({
        page: 1,
        page_size: 10,
        total: 0,
        total_pages: 1,
        has_next: false,
        has_previous: false,
    });
    const [appliedFilters, setAppliedFilters] = useState<HolidayFilterParams>({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [itemToDelete, setItemToDelete] = useState<number | null>(null);
const [deleting, setDeleting] = useState(false);

const handleDeleteClick = (holidayId: number) => {
  setItemToDelete(holidayId);
  setShowDeleteConfirm(true);
};

    // Form state
    const [formData, setFormData] = useState<HolidayFormData>({
        name: '',
        date: '',
        applicable_for: 'everyone',
    });

    // Theme classes
    const getBgClass = () => combine(
        get('bg', 'primary'),
        'min-h-screen transition-colors duration-200'
    );

    const getCardGradientClass = (color: string = 'blue') => {
        const baseClasses = combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 hover:shadow-xl my-2',
            get('border', 'primary')
        );

        const gradients = {
            purple: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
            emerald: theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50',
            blue: theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50',
            amber: theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50',
            red: theme === 'dark' ? 'from-gray-800 to-red-900/10' : 'from-white to-red-50',
            indigo: theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50',
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
        '[&>option]:bg-[var(--color-bg-card)] [&>option]:text-[var(--color-text-primary)]',
        'hover:border-[var(--color-border-strong)]',
        'focus:ring-2 focus:ring-blue-500',
        'focus:border-[var(--color-accent-primary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
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

    const getBadgeClass = (type: string) => {
        const baseClasses = 'px-3 py-1 rounded-full text-xs font-medium';

        switch (type) {
            case 'everyone':
                return combine(
                    baseClasses,
                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                );
            case 'students_only':
                return combine(
                    baseClasses,
                    theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                );
            case 'staff':
                return combine(
                    baseClasses,
                    theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700'
                );
            case 'teachers':
                return combine(
                    baseClasses,
                    theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                );
            default:
                return baseClasses;
        }
    };

    // API Functions
    const fetchHolidays = useCallback(async (params?: HolidayFilterParams, targetPage?: number) => {
        setLoading(true);
        try {
            const queryParams: HolidayFilterParams = {
                page: targetPage || params?.page || 1,
                page_size: itemsPerPage,
            };
            if (params?.search) queryParams.search = params.search;
            if (params?.year) queryParams.year = params.year;
            if (params?.month) queryParams.month = params.month;
            if (params?.applicable_for) queryParams.applicable_for = params.applicable_for;

            const response = await adminApi.holidays.listPaginated(queryParams);
            const data = response.data;

            if (data.status === 200) {
                setHolidays(Array.isArray(data.data) ? data.data : []);
                setSummary(data.summary || {
                    total: 0,
                    everyone: 0,
                    students_only: 0,
                    staff: 0,
                    teachers: 0,
                });
                if (data.pagination) {
                    setPagination(data.pagination);
                    if (data.pagination.page !== currentPage) {
                        setCurrentPage(data.pagination.page);
                    }
                }
            } else {
                toastError(data.message || 'Failed to fetch holidays');
                setHolidays([]);
                setSummary({ total: 0, everyone: 0, students_only: 0, staff: 0, teachers: 0 });
            }
        } catch (error: any) {
            console.error('Error fetching holidays:', error);
            toastError(error?.response?.data?.error || error.message || 'Network error');
            setHolidays([]);
            setSummary({ total: 0, everyone: 0, students_only: 0, staff: 0, teachers: 0 });
        } finally {
            setLoading(false);
        }
    }, [itemsPerPage]);

    const createHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {

            const response = await adminApi.holidays.create(formData);
            const data = response.data;

            if (data.status === 200) {
                toastSuccess('Holiday created successfully');
                setShowForm(false);
                resetForm();
                fetchHolidays(appliedFilters, currentPage);
            } else {
                toastError(data.errors || data.message || 'Failed to create holiday');
            }
        } catch (error: any) {
            console.error('Error creating holiday:', error);
            toastError(error?.response?.data?.errors || error?.response?.data?.message || error.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const updateHoliday = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingHoliday) return;

        setLoading(true);

        try {

            const payload = {
                holiday_id: editingHoliday.id,
                ...formData
            };

            const response = await adminApi.holidays.update(payload);
            const data = response.data;

            if (data.status === 200) {
                toastSuccess('Holiday updated successfully');
                setShowForm(false);
                setEditingHoliday(null);
                resetForm();
                fetchHolidays(appliedFilters, currentPage);
            } else {
                toastError(data.errors || data.message || 'Failed to update holiday');
            }
        } catch (error: any) {
            console.error('Error updating holiday:', error);
            toastError(error?.response?.data?.errors || error?.response?.data?.message || error.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const deleteHoliday = async () => {
  if (!itemToDelete) return;
  
  setDeleting(true);
  try {
    const response = await adminApi.holidays.delete(itemToDelete);
    const data = response.data;

    if (data.status === 200) {
      toastSuccess('Holiday deleted successfully');
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchHolidays(appliedFilters, currentPage);
    } else {
      toastError(data.message || 'Failed to delete holiday');
    }
  } catch (error: any) {
    console.error('Error deleting holiday:', error);
    toastError(error?.response?.data?.message || error.message || 'Network error');
  } finally {
    setDeleting(false);
  }
};
    // Helper functions
    const resetForm = () => {
        setFormData({
            name: '',
            date: '',
            applicable_for: 'everyone',
        });
        setEditingHoliday(null);
    };

    const handleEdit = (holiday: Holiday) => {
        setEditingHoliday(holiday);
        setFormData({
            name: holiday.name,
            date: holiday.date,
            applicable_for: holiday.applicable_for,
        });
        setShowForm(true);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getApplicableText = (type: string) => {
        switch (type) {
            case 'everyone':
                return 'Everyone (School Closed)';
            case 'students_only':
                return 'Students Only';
            case 'staff':
                return 'Staff Only';
            case 'teachers':
                return 'Teachers Only';
            default:
                return type;
        }
    };

    const getApplicableIcon = (type: string) => {
        switch (type) {
            case 'everyone':
                return <FaUsers className="text-sm" />;
            case 'students_only':
                return <FaUserGraduate className="text-sm" />;
            case 'staff':
                return <FaUserTie className="text-sm" />;
            case 'teachers':
                return <FaUserTie className="text-sm" />;
            default:
                return <FaUsers className="text-sm" />;
        }
    };

    const applyFilters = useCallback(() => {
        const params: HolidayFilterParams = {
            page: 1,
            page_size: itemsPerPage,
        };

        if (searchTerm.trim()) params.search = searchTerm.trim();
        if (filterYear) params.year = filterYear;
        if (filterMonth) params.month = filterMonth;
        if (filterApplicableFor) params.applicable_for = filterApplicableFor;

        setAppliedFilters(params);
        setCurrentPage(1);
        fetchHolidays(params, 1);
    }, [searchTerm, filterYear, filterMonth, filterApplicableFor, fetchHolidays, itemsPerPage]);

    useEffect(() => {
        fetchHolidays({ page: 1, page_size: itemsPerPage }, 1);
    }, [fetchHolidays, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters();
        }, 400);

        return () => clearTimeout(timer);
    }, [applyFilters]);

    // Generate year options (current year ± 5 years)
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    // Generate month options
    const months = [
        { value: '1', label: 'January' },
        { value: '2', label: 'February' },
        { value: '3', label: 'March' },
        { value: '4', label: 'April' },
        { value: '5', label: 'May' },
        { value: '6', label: 'June' },
        { value: '7', label: 'July' },
        { value: '8', label: 'August' },
        { value: '9', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' },
    ];

    // Generate applicable for options
    const applicableForOptions = [
        { value: '', label: 'All Types' },
        { value: 'everyone', label: 'Everyone (School Closed)' },
        { value: 'students_only', label: 'Students Only' },
        { value: 'staff', label: 'Staff Only' },
        { value: 'teachers', label: 'Teachers Only' },
    ];

    const totalPages = pagination.total_pages || 1;
    const activePage = pagination.page || currentPage;
    const indexOfFirstItem = pagination.total > 0 ? ((activePage - 1) * itemsPerPage) + 1 : 0;
    const indexOfLastItem = pagination.total > 0 ? ((activePage - 1) * itemsPerPage) + holidays.length : 0;

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
            const nextFilters: HolidayFilterParams = {
                ...appliedFilters,
                page,
                page_size: itemsPerPage,
            };
            setAppliedFilters(nextFilters);
            fetchHolidays(nextFilters, page);
        }
    };

    const exportToCSV = async () => {
        try {
            const allHolidays: Holiday[] = [];
            let page = 1;
            let hasMore = true;
            const exportPageSize = 200;

            while (hasMore) {
                const queryParams: HolidayFilterParams = {
                    page,
                    page_size: exportPageSize,
                };

                if (searchTerm.trim()) queryParams.search = searchTerm.trim();
                if (filterYear) queryParams.year = filterYear;
                if (filterMonth) queryParams.month = filterMonth;
                if (filterApplicableFor) queryParams.applicable_for = filterApplicableFor;

                const response = await adminApi.holidays.listPaginated(queryParams);
                const data = response.data || {};
                const pageRows = Array.isArray(data.data) ? data.data : [];
                allHolidays.push(...pageRows);

                hasMore = Boolean(data?.pagination?.has_next);
                page = Number(data?.pagination?.page || page) + 1;
            }

            if (allHolidays.length === 0) {
                toastError('No holidays to export');
                return;
            }

            const headers = ['Holiday Name', 'Date', 'Applicable For', 'Created At'];
            const csvRows = allHolidays.map((holiday) => [
                holiday.name || '',
                holiday.date || '',
                getApplicableText(holiday.applicable_for || ''),
                holiday.created_at ? new Date(holiday.created_at).toLocaleDateString() : '',
            ]);

            const csvContent = [
                headers.join(','),
                ...csvRows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(',')),
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `holidays_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toastSuccess(`CSV exported successfully! (${allHolidays.length} holidays)`);
        } catch (error: any) {
            console.error('Error exporting holidays CSV:', error);
            toastError('Failed to export CSV');
        }
    };

    return (
        <div className={`dashboard-typography p-3 md:p-4 xl:p-6 ${getBgClass()} transition-colors duration-200`}>
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
                                <FaCalendarAlt className="text-xl sm:text-2xl text-white" />
                            </div>
                            <div>
                                <h1 className={combine("text-xl sm:text-2xl md:text-3xl font-bold", get('text', 'primary'))}>
                                    Holidays Management
                                </h1>
                                <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                                    Manage school holidays and special days
                                </p>
                            </div>
                        </div>

                        {!showForm && (
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                                <button
                                    onClick={exportToCSV}
                                    className={combine(getSecondaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                                >
                                    <FaDownload className="text-xs sm:text-sm" />
                                    <span>Export CSV</span>
                                </button>
                                <button
                                    onClick={() => {
                                        resetForm();
                                        setShowForm(true);
                                    }}
                                    className={combine(getPrimaryButtonClass(), "flex items-center justify-center space-x-2 w-full sm:w-auto")}
                                >
                                    <FaPlus className="text-xs sm:text-sm" />
                                    <span>Add Holiday</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                        <div className={getCardGradientClass('blue')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Total Holidays</p>
                                    <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{summary.total}</p>
                                </div>
                                <div className={combine(
                                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                )}>
                                    <FaCalendarAlt className={combine(
                                        "text-base sm:text-lg",
                                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className={getCardGradientClass('blue')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>School Closed</p>
                                    <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                                        {summary.everyone}
                                    </p>
                                </div>
                                <div className={combine(
                                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                )}>
                                    <FaUsers className={combine(
                                        "text-base sm:text-lg",
                                        theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className={getCardGradientClass('emerald')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Student Holidays</p>
                                    <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                                        {summary.students_only}
                                    </p>
                                </div>
                                <div className={combine(
                                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                                    theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                                )}>
                                    <FaUserGraduate className={combine(
                                        "text-base sm:text-lg",
                                        theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className={getCardGradientClass('amber')}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={combine("text-xs font-medium", get('text', 'secondary'))}>Staff Holidays</p>
                                    <p className={combine("text-lg sm:text-xl md:text-2xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                                        {summary.staff}
                                    </p>
                                </div>
                                <div className={combine(
                                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                                    theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                                )}>
                                    <FaUserTie className={combine(
                                        "text-base sm:text-lg",
                                        theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                    )} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Holiday Form */}
                {showForm && (
                    <div className="animate-fade-in max-w-2xl mx-auto mb-4 sm:mb-6 md:mb-8">
                        <div className={getCardGradientClass()}>
                            <div className="mb-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className={combine(
                                            "p-2 sm:p-3 rounded-lg sm:rounded-xl",
                                            theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                        )}>
                                            <FaCalendarDay className={combine(
                                                "text-base sm:text-lg",
                                                theme === 'dark' ? 'text-blue-400' : 'text-blue-600'
                                            )} />
                                        </div>
                                        <div>
                                            <h2 className={combine("text-lg font-bold", get('text', 'primary'))}>
                                                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                                            </h2>
                                            <p className={combine("text-xs sm:text-sm mt-0.5", get('text', 'secondary'))}>
                                                {editingHoliday ? 'Update holiday information' : 'Create a new school holiday'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowForm(false);
                                            resetForm();
                                        }}
                                        className={combine(getSecondaryButtonClass(), "text-sm")}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={editingHoliday ? updateHoliday : createHoliday} className="space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                                            Holiday Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            required
                                            className={getInputClass()}
                                            placeholder="e.g., Republic Day"
                                        />
                                    </div>

                                    <div>
                                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                                            Date *
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.date}
                                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                            required
                                            className={getInputClass()}
                                            min={new Date().toISOString().split('T')[0]}
                                        />
                                    </div>

                                    <div>
                                        <label className={combine("block text-xs font-medium mb-2", get('text', 'primary'))}>
                                            Applicable For *
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, applicable_for: 'everyone' })}
                                                className={combine(
                                                    "p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 flex flex-col items-center justify-center space-y-2",
                                                    formData.applicable_for === 'everyone'
                                                        ? combine(
                                                            getPrimaryButtonClass(),
                                                            'border-blue-500 text-white'
                                                        )
                                                        : combine(
                                                            getSecondaryButtonClass(),
                                                            'hover:border-blue-300'
                                                        )
                                                )}
                                            >
                                                <FaUsers className="text-base sm:text-lg" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">Everyone</p>
                                                    <p className="text-xs opacity-75">School Closed</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, applicable_for: 'students_only' })}
                                                className={combine(
                                                    "p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 flex flex-col items-center justify-center space-y-2",
                                                    formData.applicable_for === 'students_only'
                                                        ? combine(
                                                            "bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500",
                                                            theme === 'dark' ? 'from-blue-700 to-blue-800' : 'from-blue-600 to-blue-700'
                                                        )
                                                        : combine(
                                                            getSecondaryButtonClass(),
                                                            'hover:border-blue-300'
                                                        )
                                                )}
                                            >
                                                <FaUserGraduate className="text-base sm:text-lg" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">Students Only</p>
                                                    <p className="text-xs opacity-75">Staff Working</p>
                                                </div>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, applicable_for: 'staff' })}
                                                className={combine(
                                                    "p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 flex flex-col items-center justify-center space-y-2",
                                                    formData.applicable_for === 'staff'
                                                        ? combine(
                                                            "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-500",
                                                            theme === 'dark' ? 'from-amber-700 to-amber-800' : 'from-amber-600 to-amber-700'
                                                        )
                                                        : combine(
                                                            getSecondaryButtonClass(),
                                                            'hover:border-amber-300'
                                                        )
                                                )}
                                            >
                                                <FaUserTie className="text-base sm:text-lg" />
                                                <div className="text-center">
                                                    <p className="text-sm font-medium">Staff Only</p>
                                                    <p className="text-xs opacity-75">School Open</p>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className={combine("flex space-x-3 pt-6 border-t", get('border', 'primary'))}>
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
                                                <span className="text-sm">Saving...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="text-sm" />
                                                <span className="text-sm">{editingHoliday ? 'Update Holiday' : 'Save Holiday'}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Filters and Search */}
                {!showForm && (
                    <div className={combine(getCardGradientClass('blue'), "mb-4 sm:mb-6 md:mb-8")}>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-end">
        {/* Search field - takes more space */}
        <div className="flex-1 min-w-0">
            <div className="relative">
                <FaSearch className={combine(
                    "absolute left-3 top-1/2 transform -translate-y-1/2 text-xs sm:text-sm",
                    get('icon', 'secondary')
                )} />
                <input
                    type="text"
                    placeholder="Search holidays by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={getInputClass()}
                    style={{ paddingLeft: '2.5rem' }}
                />
            </div>
        </div>
        
        {/* Year filter */}
        <div className="w-full">
            <label className={combine("block text-xs font-medium mb-1", get('text', 'primary'))}>
                Year
            </label>
            <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className={getInputClass() + " w-full"}
            >
                <option value="">All Years</option>
                {years.map(year => (
                    <option key={year} value={year.toString()}>
                        {year}
                    </option>
                ))}
            </select>
        </div>
        
        {/* Month filter */}
        <div className="w-full">
            <label className={combine("block text-xs font-medium mb-1", get('text', 'primary'))}>
                Month
            </label>
            <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                className={getInputClass() + " w-full"}
            >
                <option value="">All Months</option>
                {months.map(month => (
                    <option key={month.value} value={month.value}>
                        {month.label}
                    </option>
                ))}
            </select>
        </div>
        
        {/* Applicable For filter */}
        <div className="w-full">
            <label className={combine("block text-xs font-medium mb-1", get('text', 'primary'))}>
                Applicable For
            </label>
            <select
                value={filterApplicableFor}
                onChange={(e) => setFilterApplicableFor(e.target.value)}
                className={getInputClass() + " w-full"}
            >
                {applicableForOptions.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    </div>
</div>
                )}

                {/* Holidays List */}
                {!showForm && (
                    <div className={getCardGradientClass()}>
                        {loading ? (
                            <div className="p-8 text-center">
                                <div className="text-center">
                                    <div className="relative mx-auto w-16 h-16">
                                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FaCalendarCheck className="h-8 w-8 text-indigo-600 animate-pulse" />
                                        </div>
                                    </div>
                                    <p className={combine("mt-4 sm:mt-6 text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                                        Loading holidays...
                                    </p>
                                    <p className={combine("text-xs sm:text-sm mt-1 sm:mt-2", get('text', 'tertiary'))}>
                                        Preparing holiday records
                                    </p>
                                </div>
                            </div>
                        ) : holidays.length === 0 ? (
                            <div className="p-8 text-center">
                                <div className={combine(
                                    "inline-block p-3 rounded-full mb-3",
                                    theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
                                )}>
                                    <FaCalendarCheck className={combine(
                                        "text-xl",
                                        theme === 'dark' ? 'text-blue-400' : 'text-blue-500'
                                    )} />
                                </div>
                                <h3 className={combine("text-base font-medium mb-1", get('text', 'primary'))}>
                                    No holidays found
                                </h3>
                                <p className={combine("text-sm mb-4", get('text', 'secondary'))}>
                                    {searchTerm || filterYear || filterMonth || filterApplicableFor
                                        ? 'Try adjusting your filters'
                                        : 'Add your first holiday to get started'}
                                </p>
                                {!(searchTerm || filterYear || filterMonth || filterApplicableFor) && (
                                    <button
                                        onClick={() => {
                                            resetForm();
                                            setShowForm(true);
                                        }}
                                        className={combine(getPrimaryButtonClass(), "mt-2")}
                                    >
                                        Add First Holiday
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className={combine("bg-[var(--color-bg-secondary)]", get('border', 'primary'))}>
                                            <tr>
                                                <th className={combine(
                                                    "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                                                    get('text', 'tertiary')
                                                )}>
                                                    Date
                                                </th>
                                                <th className={combine(
                                                    "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                                                    get('text', 'tertiary')
                                                )}>
                                                    Holiday Name
                                                </th>
                                                <th className={combine(
                                                    "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                                                    get('text', 'tertiary')
                                                )}>
                                                    Applicable For
                                                </th>
                                                <th className={combine(
                                                    "px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium uppercase tracking-wider",
                                                    get('text', 'tertiary')
                                                )}>
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className={combine("divide-y", get('border', 'primary'))}>
                                            {holidays.map((holiday) => (
                                                <tr key={holiday.id} className="transition-colors duration-150 hover:bg-[var(--color-bg-hover)]">
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                        <div className="text-xs sm:text-sm font-semibold">
                                                            {formatDate(holiday.date)}
                                                        </div>
                                                        <div className={combine("text-xs mt-0.5", get('text', 'secondary'))}>
                                                            {holiday.date}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                        <div className="font-semibold text-xs sm:text-sm">{holiday.name}</div>
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                        <div className="flex items-center space-x-2">
                                                            {getApplicableIcon(holiday.applicable_for)}
                                                            <span className={getBadgeClass(holiday.applicable_for)}>
                                                                {getApplicableText(holiday.applicable_for)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-3 sm:px-4 py-2.5 sm:py-3">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => handleEdit(holiday)}
                                                                className={combine(
                                                                    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-success)]",
                                                                    get('icon', 'primary')
                                                                )}
                                                                title="Edit Holiday"
                                                            >
                                                                <FaEdit className="text-sm" />
                                                            </button>
                                                            <button
  onClick={() => handleDeleteClick(holiday.id)}
  className={combine(
    "p-1.5 rounded-lg transition-all duration-200 hover:text-[var(--color-accent-error)]",
    get('icon', 'primary')
  )}
  title="Delete Holiday"
>
  <FaTrash className="text-sm" />
</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <div className={combine("px-4 py-3 border-t", get('border', 'primary'))}>
                                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                                            <p className={combine("text-xs", get('text', 'tertiary'))}>
                                                Showing {indexOfFirstItem} to {indexOfLastItem} of {pagination.total} holidays
                                            </p>
                                            <div className="flex items-center space-x-1.5">
                                                <button
                                                    onClick={() => handlePageChange(activePage - 1)}
                                                    disabled={!pagination.has_previous}
                                                    className={combine(
                                                        "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
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
                                                        } else if (activePage <= 3) {
                                                            pageNum = i + 1;
                                                        } else if (activePage >= totalPages - 2) {
                                                            pageNum = totalPages - 4 + i;
                                                        } else {
                                                            pageNum = activePage - 2 + i;
                                                        }

                                                        return (
                                                            <button
                                                                key={pageNum}
                                                                onClick={() => handlePageChange(pageNum)}
                                                                className={combine(
                                                                    "px-3 py-1.5 rounded-xl transition-all font-medium hover:scale-[1.02] active:scale-[0.98] text-xs",
                                                                    activePage === pageNum
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
                                                    onClick={() => handlePageChange(activePage + 1)}
                                                    disabled={!pagination.has_next}
                                                    className={combine(
                                                        "p-1.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] text-sm",
                                                        getSecondaryButtonClass()
                                                    )}
                                                >
                                                    <FaChevronRight className="text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in backdrop-blur-sm">
    <div className={combine(
      getCardGradientClass('red'),
      "max-w-md w-full shadow-2xl"
    )}>
      <div className="text-center">
        <div className={combine(
          "mx-auto flex items-center justify-center h-10 sm:h-12 w-10 sm:w-12 rounded-full mb-3",
          theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
        )}>
          <FaTrash className={combine(
            "h-4 sm:h-5 w-4 sm:w-5",
            theme === 'dark' ? 'text-red-400' : 'text-red-600'
          )} />
        </div>
        <h3 className={combine("text-base sm:text-lg font-bold mb-1.5", get('text', 'primary'))}>
          Delete Holiday
        </h3>
        <p className={combine("text-xs sm:text-sm mb-4", get('text', 'secondary'))}>
          Are you sure you want to delete "{holidays.find(h => h.id === itemToDelete)?.name}"? 
          This action cannot be undone and will remove the holiday permanently.
        </p>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setShowDeleteConfirm(false);
              setItemToDelete(null);
            }}
            className={combine(getSecondaryButtonClass(), "text-xs sm:text-sm flex-1")}
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={deleteHoliday}
            disabled={deleting}
            className={combine(
              getPrimaryButtonClass(),
              "text-xs sm:text-sm flex-1",
              theme === 'dark'
                ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
            )}
          >
            {deleting ? (
              <div className="flex items-center justify-center">
                <div className={combine(
                  "animate-spin h-4 w-4 border-2 rounded-full mr-2",
                  "border-white border-t-transparent"
                )}></div>
                <span>Deleting...</span>
              </div>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
            </div>
        </div>
    );
}
