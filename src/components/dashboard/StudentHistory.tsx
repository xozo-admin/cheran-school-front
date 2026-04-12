// src/components/students/attendance/StudentAttendanceHistory.tsx
'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import { FiCalendar, FiFilter, FiRefreshCw, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { FaUserGraduate, FaChartBar, FaCheckCircle, FaTimesCircle, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import { Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import "react-datepicker/dist/react-datepicker.css";
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface AttendanceHistoryData {
    student_id: string;
    student_name?: string;
    class?: string;
    section?: string;
    year: string;
    annual_summary: {
        present: number;
        absent: number;
        late: number;
    };
    calendar_data: {
        [key: string]: {
            stats: {
                present: number;
                absent: number;
                late: number;
            };
            dates: Array<{
                date: number;
                status: string;
                status_display: string;
            }>;
        };
    };
}

interface MonthlyChartData {
    month: string;
    monthNumber: number;
    present: number;
    absent: number;
    late: number;
    total: number;
    year: number;
    hasData: boolean;
}

interface StudentAttendanceHistoryProps {
    initialStudentId?: string;
    initialStudentName?: string;
    initialYear?: string;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const StudentAttendanceHistory = ({
    initialStudentId = '',
    initialStudentName = '',
    initialYear = '2025-2026'
}: StudentAttendanceHistoryProps) => {
    const { theme } = useTheme();
    const { get, combine } = useThemeClasses();

    // State
    const [studentId, setStudentId] = useState(initialStudentId);
    const [studentName, setStudentName] = useState(initialStudentName);
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [attendanceData, setAttendanceData] = useState<AttendanceHistoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [availableYears] = useState(['2023-2024', '2024-2025', '2025-2026']);
    const [searchInput, setSearchInput] = useState(initialStudentId);
    const [studentNameInput, setStudentNameInput] = useState(initialStudentName);
    
    // Calendar state
    const [currentMonth, setCurrentMonth] = useState(6); // Start with June (first month of academic year)
    const [currentYear, setCurrentYear] = useState(2025); // Start with first year

    // Parse academic year
    const parseAcademicYear = (yearStr: string) => {
        const [startYear, endYear] = yearStr.split('-').map(Number);
        return { startYear, endYear };
    };

    // Prefer today's month/year when it falls in selected academic year; otherwise default to June/start year.
    const getInitialAcademicMonthYear = (yearStr: string) => {
        const { startYear, endYear } = parseAcademicYear(yearStr);
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayYear = today.getFullYear();

        const isInAcademicRange =
            (todayMonth >= 6 && todayYear === startYear) ||
            (todayMonth <= 5 && todayYear === endYear);

        if (isInAcademicRange) {
            return { month: todayMonth, year: todayYear };
        }

        return { month: 6, year: startYear };
    };

    // Get ordered months for academic year (June to December of start year, January to May of end year)
    const getAcademicYearMonths = () => {
        const { startYear, endYear } = parseAcademicYear(selectedYear);
        
        // Months from June to December (6-12) of start year
        const firstHalfMonths = [6, 7, 8, 9, 10, 11, 12].map(month => ({
            monthNumber: month,
            monthName: monthNames[month - 1],
            monthShort: monthNamesShort[month - 1],
            year: startYear
        }));
        
        // Months from January to May (1-5) of end year
        const secondHalfMonths = [1, 2, 3, 4, 5].map(month => ({
            monthNumber: month,
            monthName: monthNames[month - 1],
            monthShort: monthNamesShort[month - 1],
            year: endYear
        }));
        
        return [...firstHalfMonths, ...secondHalfMonths];
    };

    // Theme-aware classes (same as before)
    const getBgClass = () => combine(
        get('bg', 'primary'),
        'min-h-0 transition-colors duration-200'
    );

    const getCardGradientClass = (color: string = 'blue') => {
        const baseClasses = combine(
            'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 hover:shadow-xl',
            get('border', 'primary')
        );

        if (color === 'blue') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-blue-900/10'
                : 'from-white to-blue-50');
        }
        if (color === 'emerald') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-emerald-900/10'
                : 'from-white to-emerald-50');
        }
        if (color === 'amber') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-amber-900/10'
                : 'from-white to-amber-50');
        }
        if (color === 'purple') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-purple-900/10'
                : 'from-white to-purple-50');
        }
        if (color === 'indigo') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-indigo-900/10'
                : 'from-white to-indigo-50');
        }
        if (color === 'pink') {
            return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
                ? 'from-gray-800 to-pink-900/10'
                : 'from-white to-pink-50');
        }
        return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
    };

    const getInputClass = () => combine(
        'px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
        'text-xs sm:text-sm',
        theme === 'dark'
            ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
            : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500',
        'placeholder:text-xs sm:placeholder:text-sm placeholder:text-[var(--color-text-tertiary)]'
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
        'px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-[1.02] active:scale-[0.98]',
        'text-xs sm:text-sm',
        'border',
        get('border', 'secondary'),
        get('bg', 'card'),
        get('text', 'secondary'),
        'hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
    );

    const getStatusBadgeClass = (status: string) => {
        const colorMap: { [key: string]: { bg: string; text: string; border: string } } = {
            'Present': {
                bg: theme === 'dark' ? 'from-emerald-900/30 to-emerald-800/30' : 'from-emerald-100 to-emerald-200',
                text: theme === 'dark' ? 'text-emerald-300' : 'text-emerald-700',
                border: theme === 'dark' ? 'border-emerald-800' : 'border-emerald-200'
            },
            'Absent': {
                bg: theme === 'dark' ? 'from-red-900/30 to-red-800/30' : 'from-red-100 to-red-200',
                text: theme === 'dark' ? 'text-red-300' : 'text-red-700',
                border: theme === 'dark' ? 'border-red-800' : 'border-red-200'
            },
            'Late': {
                bg: theme === 'dark' ? 'from-amber-900/30 to-amber-800/30' : 'from-amber-100 to-amber-200',
                text: theme === 'dark' ? 'text-amber-300' : 'text-amber-700',
                border: theme === 'dark' ? 'border-amber-800' : 'border-amber-200'
            }
        };

        const colors = colorMap[status] || colorMap['Present'];
        return combine(
            'px-2 py-1 text-xs font-medium rounded-full bg-gradient-to-r',
            colors.bg,
            colors.text,
            'border',
            colors.border
        );
    };

    // Fetch attendance history
    const fetchAttendanceHistory = async (id?: string, year?: string) => {
        const studentIdToUse = id || studentId;
        const yearToUse = year || selectedYear;

        if (!studentIdToUse) {
            setError('Please enter a Student ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await adminApi.attendance.studentHistory(studentIdToUse, yearToUse);

            if (response.status >= 200 && response.status < 300) {
                setAttendanceData(response.data);
                if (response.data.student_name) {
                    setStudentName(response.data.student_name);
                    setStudentNameInput(response.data.student_name);
                }

                const initialMonthYear = getInitialAcademicMonthYear(response.data.year);
                setCurrentMonth(initialMonthYear.month);
                setCurrentYear(initialMonthYear.year);
            } else {
                setError(response.data?.error || 'Failed to fetch attendance history');
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred while fetching data');
            console.error('Error fetching attendance history:', err);
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount if initialStudentId is provided
    useEffect(() => {
        if (initialStudentId) {
            fetchAttendanceHistory(initialStudentId, initialYear);
        }
    }, []);

    // Transform data for charts - ordered by academic year
    const prepareChartData = (): MonthlyChartData[] => {
        if (!attendanceData?.calendar_data) return [];

        const academicMonths = getAcademicYearMonths();
        
        return academicMonths.map(({ monthNumber, monthShort, year }) => {
            const monthData = attendanceData.calendar_data[monthNumber.toString()];
            
            if (monthData) {
                return {
                    month: monthShort,
                    monthNumber,
                    present: monthData.stats.present || 0,
                    absent: monthData.stats.absent || 0,
                    late: monthData.stats.late || 0,
                    total: (monthData.stats.present || 0) + (monthData.stats.absent || 0) + (monthData.stats.late || 0),
                    year,
                    hasData: true
                };
            } else {
                return {
                    month: monthShort,
                    monthNumber,
                    present: 0,
                    absent: 0,
                    late: 0,
                    total: 0,
                    year,
                    hasData: false
                };
            }
        });
    };

    // Get days in month
    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month, 0).getDate();
    };

    // Get first day of month (0 = Sunday, 1 = Monday, etc.) - adjusted for Monday first
    const getFirstDayOfMonth = (month: number, year: number) => {
        const day = new Date(year, month - 1, 1).getDay();
        // Convert Sunday (0) to 6, Monday (1) to 0, etc. for Monday-first calendar
        return day === 0 ? 6 : day - 1;
    };

    // Handle month navigation with academic year boundaries
    const goToPreviousMonth = () => {
        const { startYear, endYear } = parseAcademicYear(selectedYear);
        
        if (currentMonth === 6) {
            // Can't go before June of start year
            return;
        } else if (currentMonth === 1) {
            // Going from January to December of previous year
            setCurrentMonth(12);
            setCurrentYear(currentYear === endYear ? startYear : currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const goToNextMonth = () => {
        const { endYear } = parseAcademicYear(selectedYear);
        
        if (currentMonth === 5) {
            // Can't go after May of end year
            return;
        } else if (currentMonth === 12) {
            // Going from December to January of next year
            setCurrentMonth(1);
            setCurrentYear(currentYear === endYear - 1 ? endYear : currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    // Check if current month is within academic year
    const isWithinAcademicYear = (): boolean => {
        const { startYear, endYear } = parseAcademicYear(selectedYear);
        
        if (currentMonth >= 6 && currentMonth <= 12 && currentYear === startYear) {
            return true;
        }
        if (currentMonth >= 1 && currentMonth <= 5 && currentYear === endYear) {
            return true;
        }
        return false;
    };

    // Check if there's data for current month
    const hasCurrentMonthData = () => {
        if (!attendanceData?.calendar_data) return false;
        return attendanceData.calendar_data[currentMonth.toString()] !== undefined;
    };

    const handleSearch = () => {
        const normalizedStudentId = searchInput.trim();
        if (!normalizedStudentId) {
            setError('Please enter a Student ID');
            return;
        }

        setStudentId(normalizedStudentId);
        fetchAttendanceHistory(normalizedStudentId, selectedYear);
    };

    const chartData = prepareChartData();
    const totalDays = attendanceData?.annual_summary
        ? attendanceData.annual_summary.present + attendanceData.annual_summary.absent + attendanceData.annual_summary.late
        : 0;
    const attendancePercentage = totalDays > 0
        ? Math.round((attendanceData?.annual_summary.present || 0) / totalDays * 100)
        : 0;

    // Pie chart data for annual summary
    const pieData = attendanceData?.annual_summary ? [
        { name: 'Present', value: attendanceData.annual_summary.present, color: '#10B981' },
        { name: 'Absent', value: attendanceData.annual_summary.absent, color: '#EF4444' },
        { name: 'Late', value: attendanceData.annual_summary.late, color: '#F59E0B' }
    ] : [];
    const hasAnnualData = pieData.some(item => item.value > 0);

    // Generate calendar days
    const renderCalendar = () => {
        if (!attendanceData) return null;

        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDayIndex = getFirstDayOfMonth(currentMonth, currentYear);
        const monthData = attendanceData.calendar_data[currentMonth.toString()];
        
        const days = [];
        
        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDayIndex; i++) {
            days.push(<div key={`empty-${i}`} className="aspect-square" />);
        }
        
        // Add cells for each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = monthData?.dates.find(d => d.date === day);
            
            let statusColor = '';
            let textColor = '';
            
            if (dayData) {
                switch(dayData.status) {
                    case 'Present':
                        statusColor = theme === 'dark' ? 'bg-emerald-900/60' : 'bg-emerald-500';
                        textColor = theme === 'dark' ? 'text-emerald-300' : 'text-white';
                        break;
                    case 'Absent':
                        statusColor = theme === 'dark' ? 'bg-red-900/60' : 'bg-red-500';
                        textColor = theme === 'dark' ? 'text-red-300' : 'text-white';
                        break;
                    case 'Late':
                        statusColor = theme === 'dark' ? 'bg-amber-900/60' : 'bg-amber-500';
                        textColor = theme === 'dark' ? 'text-amber-300' : 'text-white';
                        break;
                    default:
                        statusColor = theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
                        textColor = theme === 'dark' ? 'text-gray-500' : 'text-gray-400';
                }
            } else {
                statusColor = theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-50';
                textColor = theme === 'dark' ? 'text-gray-600' : 'text-gray-300';
            }
            
            days.push(
                <div
                    key={`day-${day}`}
                    className={combine(
                        "aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200",
                        statusColor,
                        textColor,
                        dayData ? 'hover:scale-105 cursor-pointer' : '',
                        'border',
                        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
                    )}
                    title={dayData ? `${dayData.status_display}` : 'No data'}
                >
                    {day}
                </div>
            );
        }
        
        return days;
    };

    const currentMonthData = attendanceData?.calendar_data?.[currentMonth.toString()];
    const isValidMonth = isWithinAcademicYear();

    return (
        <div className={getBgClass()}>
            <div className="w-full">

                {/* Search and Filter Card */}
                <div className={getCardGradientClass('blue') + " mb-4 sm:mb-6"}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                                <FaUserGraduate className="inline mr-2" />
                                Student ID
                            </label>
                            <input
                                type="text"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                placeholder="Enter Student ID"
                                className={getInputClass()}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                                Student Name (Optional)
                            </label>
                            <input
                                type="text"
                                value={studentNameInput}
                                onChange={(e) => setStudentNameInput(e.target.value)}
                                placeholder="Enter Student Name"
                                className={getInputClass()}
                            />
                        </div>
                        <div className="md:col-span-1">
                            <label className={combine("block text-xs sm:text-sm font-medium mb-1.5 sm:mb-2", get('text', 'primary'))}>
                                <FiCalendar className="inline mr-2" />
                                Academic Year
                            </label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className={getInputClass()}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <button
                                onClick={handleSearch}
                                disabled={loading}
                                className={combine(
                                    getPrimaryButtonClass(),
                                    "w-full flex items-center justify-center gap-2 text-xs sm:text-sm"
                                )}
                            >
                                {loading ? <FiRefreshCw className="animate-spin" /> : <FiFilter />}
                                <span>{loading ? 'Loading...' : 'View History'}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className={combine(
                        "mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border flex items-center gap-2 sm:gap-3",
                        theme === 'dark'
                            ? 'bg-red-900/20 border-red-800 text-red-300'
                            : 'bg-red-50 border-red-200 text-red-700'
                    )}>
                        <FaExclamationTriangle className="text-base sm:text-lg" />
                        <span className="text-xs sm:text-sm">{error}</span>
                    </div>
                )}

                {/* Attendance Data Display */}
                {attendanceData && (
                    <>
                        {/* Student Info Header */}
                        <div className={getCardGradientClass('purple') + " mb-4 sm:mb-6"}>
                            <div className="flex flex-col md:flex-row md:items-center justify-between">
                                <div className="flex items-center gap-2 sm:gap-4">
                                    <div className={combine(
                                        "p-2.5 sm:p-4 rounded-xl",
                                        theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                    )}>
                                        <FaUserGraduate className={combine(
                                            "text-xl sm:text-3xl",
                                            theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                        )} />
                                    </div>
                                    <div>
                                        <h2 className={combine("text-lg sm:text-xl lg:text-2xl font-bold", get('text', 'primary'))}>
                                            {studentName || `Student ${attendanceData.student_id}`}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                                            <span className={combine("text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full",
                                                theme === 'dark' ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                                            )}>
                                                ID: {attendanceData.student_id}
                                            </span>
                                            {attendanceData.class && (
                                                <span className={combine("text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full",
                                                    theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                                )}>
                                                    Class: {attendanceData.class}
                                                </span>
                                            )}
                                            {attendanceData.section && (
                                                <span className={combine("text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full",
                                                    theme === 'dark' ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-100 text-purple-700'
                                                )}>
                                                    Section: {attendanceData.section}
                                                </span>
                                            )}
                                            <span className={combine("text-xs sm:text-sm px-2.5 sm:px-3 py-1 rounded-full",
                                                theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                                            )}>
                                                Year: {attendanceData.year}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 md:mt-0">
                                    <div className={combine(
                                        "px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl text-center",
                                        theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                                    )}>
                                        <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Overall Attendance</p>
                                        <p className={combine(
                                            "text-2xl sm:text-3xl font-bold",
                                            attendancePercentage >= 75 ? get('accent', 'success') :
                                                attendancePercentage >= 60 ? get('accent', 'warning') : get('accent', 'error')
                                        )}>
                                            {attendancePercentage}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-6 mb-4 sm:mb-6">
                            <div className={getCardGradientClass('emerald')}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Present Days</p>
                                        <p className={combine("text-2xl sm:text-3xl font-bold mt-1 sm:mt-2", get('accent', 'success'))}>
                                            {attendanceData.annual_summary.present}
                                        </p>
                                    </div>
                                    <div className={combine(
                                        "p-2 sm:p-3 rounded-xl",
                                        theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100'
                                    )}>
                                        <FaCheckCircle className={combine(
                                            "text-xl sm:text-2xl",
                                            theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'
                                        )} />
                                    </div>
                                </div>
                                <div className={combine("mt-2 sm:mt-4 text-xs sm:text-sm", get('text', 'tertiary'))}>
                                    {Math.round((attendanceData.annual_summary.present / totalDays) * 100)}% of total days
                                </div>
                            </div>

                            <div className={getCardGradientClass('red')}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Absent Days</p>
                                        <p className={combine("text-2xl sm:text-3xl font-bold mt-1 sm:mt-2", get('accent', 'error'))}>
                                            {attendanceData.annual_summary.absent}
                                        </p>
                                    </div>
                                    <div className={combine(
                                        "p-2 sm:p-3 rounded-xl",
                                        theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'
                                    )}>
                                        <FaTimesCircle className={combine(
                                            "text-xl sm:text-2xl",
                                            theme === 'dark' ? 'text-red-400' : 'text-red-600'
                                        )} />
                                    </div>
                                </div>
                                <div className={combine("mt-2 sm:mt-4 text-xs sm:text-sm", get('text', 'tertiary'))}>
                                    {Math.round((attendanceData.annual_summary.absent / totalDays) * 100)}% of total days
                                </div>
                            </div>

                            <div className={getCardGradientClass('amber')}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Late Arrivals</p>
                                        <p className={combine("text-2xl sm:text-3xl font-bold mt-1 sm:mt-2", get('accent', 'warning'))}>
                                            {attendanceData.annual_summary.late}
                                        </p>
                                    </div>
                                    <div className={combine(
                                        "p-2 sm:p-3 rounded-xl",
                                        theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                                    )}>
                                        <FaClock className={combine(
                                            "text-xl sm:text-2xl",
                                            theme === 'dark' ? 'text-amber-400' : 'text-amber-600'
                                        )} />
                                    </div>
                                </div>
                                <div className={combine("mt-2 sm:mt-4 text-xs sm:text-sm", get('text', 'tertiary'))}>
                                    {Math.round((attendanceData.annual_summary.late / totalDays) * 100)}% of total days
                                </div>
                            </div>
                        </div>

                        {/* Charts Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
                            {/* Interactive Calendar View */}
                            <div className={getCardGradientClass('indigo')}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                                    <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                                        <FiCalendar className="inline mr-2" />
                                        Attendance Calendar
                                    </h3>
                                    
                                    {/* Month Navigation */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={goToPreviousMonth}
                                            disabled={currentMonth === 6 && currentYear === parseAcademicYear(selectedYear).startYear}
                                            className={combine(
                                                "p-2 rounded-lg transition-all duration-200",
                                                theme === 'dark' 
                                                    ? 'hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent' 
                                                    : 'hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent'
                                            )}
                                        >
                                            <FiChevronLeft />
                                        </button>
                                        <span className={combine(
                                            "text-xs sm:text-sm font-semibold px-3 py-1 rounded-lg",
                                            theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
                                        )}>
                                            {monthNames[currentMonth - 1]} {currentYear}
                                        </span>
                                        <button
                                            onClick={goToNextMonth}
                                            disabled={currentMonth === 5 && currentYear === parseAcademicYear(selectedYear).endYear}
                                            className={combine(
                                                "p-2 rounded-lg transition-all duration-200",
                                                theme === 'dark' 
                                                    ? 'hover:bg-gray-700 text-gray-400 disabled:opacity-30 disabled:hover:bg-transparent' 
                                                    : 'hover:bg-gray-200 text-gray-600 disabled:opacity-30 disabled:hover:bg-transparent'
                                            )}
                                        >
                                            <FiChevronRight />
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar */}
                                <div className="mb-4">
                                    {/* Week days header */}
                                    <div className="grid grid-cols-7 gap-1 mb-2">
                                        {weekDays.map(day => (
                                            <div key={day} className={combine(
                                                "text-center text-[11px] sm:text-xs font-medium py-1.5 sm:py-2",
                                                get('text', 'secondary')
                                            )}>
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar grid */}
                                    <div className="grid grid-cols-7 gap-1">
                                        {isValidMonth ? renderCalendar() : (
                                            <div className="col-span-7 py-8 text-center">
                                                <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                                    This month is outside the academic year
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Month Stats */}
                                {isValidMonth && currentMonthData && (
                                    <div className={combine(
                                        "mt-4 p-4 rounded-lg border",
                                        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={combine("font-semibold", get('text', 'primary'))}>
                                                {monthNames[currentMonth - 1]} {currentYear} Statistics
                                            </span>
                                            <span className={combine(
                                                "text-sm px-3 py-1 rounded-full",
                                                (currentMonthData.stats.present / 
                                                (currentMonthData.stats.present + currentMonthData.stats.absent + currentMonthData.stats.late) * 100) >= 75
                                                    ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                                    : (currentMonthData.stats.present / 
                                                      (currentMonthData.stats.present + currentMonthData.stats.absent + currentMonthData.stats.late) * 100) >= 60
                                                        ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                                                        : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700')
                                            )}>
                                                {Math.round((currentMonthData.stats.present / 
                                                    (currentMonthData.stats.present + currentMonthData.stats.absent + currentMonthData.stats.late)) * 100)}% Attendance
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className={get('accent', 'success')}>Present: {currentMonthData.stats.present}</span>
                                            <span className={get('accent', 'error')}>Absent: {currentMonthData.stats.absent}</span>
                                            <span className={get('accent', 'warning')}>Late: {currentMonthData.stats.late}</span>
                                            <span className={get('text', 'secondary')}>
                                                Total: {currentMonthData.stats.present + currentMonthData.stats.absent + currentMonthData.stats.late}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {isValidMonth && !currentMonthData && (
                                    <div className={combine(
                                        "mt-4 p-4 rounded-lg border text-center",
                                        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
                                    )}>
                                        <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                            No attendance data available for {monthNames[currentMonth - 1]} {currentYear}
                                        </p>
                                    </div>
                                )}

                                {/* Legend */}
                                <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                                        <span className={combine("text-xs", get('text', 'secondary'))}>Present</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-red-500" />
                                        <span className={combine("text-xs", get('text', 'secondary'))}>Absent</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-amber-500" />
                                        <span className={combine("text-xs", get('text', 'secondary'))}>Late</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-700" />
                                        <span className={combine("text-xs", get('text', 'secondary'))}>No Data</span>
                                    </div>
                                </div>
                            </div>

                            {/* Pie Chart - Annual Summary */}
                            <div className={getCardGradientClass('purple')}>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>
                                        Annual Attendance Distribution
                                    </h3>
                                </div>
                                {hasAnnualData ? (
                                    <div className="grid grid-cols-1 xl:grid-cols-1 gap-3 sm:gap-4 items-center min-h-[280px] sm:min-h-[320px]">
                                        <div className="h-[260px] sm:h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        cx="50%"
                                                        cy="48%"
                                                        innerRadius={62}
                                                        outerRadius={98}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                                                            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
                                                            borderRadius: '8px'
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-3">
                                            {pieData.map((item) => (
                                                <div
                                                    key={item.name}
                                                    className={combine(
                                                        "p-3 rounded-xl border flex items-center justify-between",
                                                        theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/70 border-gray-200'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                                                        <span className={combine("text-xs sm:text-sm font-medium", get('text', 'primary'))}>{item.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={combine("text-sm sm:text-base font-bold", get('text', 'primary'))}>{item.value}</p>
                                                        <p className={combine("text-xs", get('text', 'secondary'))}>
                                                            {totalDays > 0 ? `${Math.round((item.value / totalDays) * 100)}%` : '0%'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className={combine(
                                                "p-3 rounded-xl border",
                                                theme === 'dark' ? 'bg-gray-800/50 border-gray-700' : 'bg-white/70 border-gray-200'
                                            )}>
                                                <p className={combine("text-xs", get('text', 'secondary'))}>Total Recorded Days</p>
                                                <p className={combine("text-lg font-bold", get('text', 'primary'))}>{totalDays}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={combine(
                                        "min-h-[220px] rounded-xl border flex items-center justify-center text-center px-4",
                                        theme === 'dark' ? 'bg-gray-800/40 border-gray-700' : 'bg-gray-50 border-gray-200'
                                    )}>
                                        <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                            No annual distribution data available for this academic year.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Monthly Details Table */}
                        <div className={getCardGradientClass('blue')}>
                            <h3 className={combine("text-base sm:text-lg font-bold mb-3 sm:mb-4", get('text', 'primary'))}>
                                Monthly Attendance Details - Academic Year {selectedYear}
                            </h3>
                            
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-[var(--color-border-secondary)]">
                                    <thead className={theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}>
                                        <tr>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Month
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Year
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Present
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Absent
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Late
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Total
                                            </th>
                                            <th className={combine("px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 text-left text-xs sm:text-sm font-medium uppercase tracking-wider", get('text', 'secondary'))}>
                                                Attendance %
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className={combine("divide-y divide-[var(--color-border-secondary)]", get('bg', 'card'))}>
                                        {chartData.map((month, index) => (
                                            <tr 
                                                key={index} 
                                                className={combine(
                                                    theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50',
                                                    currentMonth === month.monthNumber && currentYear === month.year ? (theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50/50') : '',
                                                    !month.hasData ? (theme === 'dark' ? 'opacity-60' : 'opacity-70') : ''
                                                )}
                                            >
                                                <td className={combine(
                                                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium",
                                                    currentMonth === month.monthNumber && currentYear === month.year ? get('accent', 'primary') : get('text', 'primary')
                                                )}>
                                                    {month.month}
                                                    {currentMonth === month.monthNumber && currentYear === month.year && (
                                                        <span className="ml-2 text-xs opacity-60">(Current)</span>
                                                    )}
                                                </td>
                                                <td className={combine("px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm", get('text', 'secondary'))}>
                                                    {month.year}
                                                </td>
                                                <td className={combine(
                                                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm",
                                                    month.hasData ? get('accent', 'success') : get('text', 'tertiary')
                                                )}>
                                                    {month.hasData ? month.present : '-'}
                                                </td>
                                                <td className={combine(
                                                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm",
                                                    month.hasData ? get('accent', 'error') : get('text', 'tertiary')
                                                )}>
                                                    {month.hasData ? month.absent : '-'}
                                                </td>
                                                <td className={combine(
                                                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm",
                                                    month.hasData ? get('accent', 'warning') : get('text', 'tertiary')
                                                )}>
                                                    {month.hasData ? month.late : '-'}
                                                </td>
                                                <td className={combine(
                                                    "px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm",
                                                    month.hasData ? get('text', 'secondary') : get('text', 'tertiary')
                                                )}>
                                                    {month.hasData ? month.total : '-'}
                                                </td>
                                                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 whitespace-nowrap">
                                                    {month.hasData ? (
                                                        <span className={combine(
                                                            "px-2 py-1 text-xs font-medium rounded-full",
                                                            month.total > 0
                                                                ? (month.present / month.total * 100 >= 75
                                                                    ? (theme === 'dark' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700')
                                                                    : month.present / month.total * 100 >= 60
                                                                        ? (theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-700')
                                                                        : (theme === 'dark' ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'))
                                                                : (theme === 'dark' ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600')
                                                        )}>
                                                            {month.total > 0 ? `${Math.round((month.present / month.total) * 100)}%` : 'N/A'}
                                                        </span>
                                                    ) : (
                                                        <span className={combine(
                                                            "px-2 py-1 text-xs font-medium rounded-full",
                                                            theme === 'dark' ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                                                        )}>
                                                            No Data
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* No Data State */}
                {!attendanceData && !loading && !error && (
                    <div className={getCardGradientClass('indigo') + " text-center py-8 sm:py-12"}>
                        <div className="flex flex-col items-center">
                            <FaUserGraduate className={combine("text-4xl sm:text-5xl mb-3 sm:mb-4", get('text', 'tertiary'))} />
                            <h3 className={combine("text-lg sm:text-xl font-bold mb-2", get('text', 'primary'))}>
                                No Attendance Data
                            </h3>
                            <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                                Enter a Student ID and select an academic year to view attendance history
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
