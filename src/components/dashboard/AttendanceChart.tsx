// src/components/dashboard/AttendanceChart.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Rectangle,
} from 'recharts';

import { adminApi } from '@/lib/api';
import axios from 'axios';
import { Calendar, Filter, Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface DailySummary {
    date: string;
    day: string;
    total_students: number;
    present: number;
    absent: number;
    late: number;
    total_marked: number;
    unmarked: number;
    attendance_percentage: number;
}

interface AttendanceOverviewResponse {
    status: number;
    period: string;
    date_range: {
        start: string;
        end: string;
    };
    total_working_days: number;
    data: {
        type: string;
        class_summary?: any[];
        daily_summary?: DailySummary[]; // For "all" classes
        daily_data?: DailySummary[]; // For single class
        overall_totals?: {
            total_classes: number;
            total_students: number;
            total_present: number;
            total_absent: number;
            total_late: number;
            total_marked: number;
            average_attendance: number;
        };
        totals?: { // For single class
            total_present: number;
            total_absent: number;
            total_late: number;
            total_marked: number;
            average_attendance: number;
        };
        class?: string; // For single class
    };
}

interface AttendanceChartProps {
    initialPeriod?: string;
    initialClassName?: string;
    showSummaryToggle?: boolean;
}

interface Standard {
    id: number;
    name: string;
    description: string;
    sections: Array<{
        id: number;
        name: string;
        standard: number;
        standard_name: string;
    }>;
}

const periodOptions = [
    { value: 'this_week', label: 'This Week' },
    { value: 'past_week', label: 'Past Week' },
    { value: 'past_two_weeks', label: 'Past Two Weeks' },
    { value: 'this_month', label: 'This Month' },
    { value: 'past_month', label: 'Past Month' },
];

export const AttendanceChart = ({
    initialPeriod = 'this_week',
    initialClassName = 'all',
    showSummaryToggle = true,
}: AttendanceChartProps) => {
    const [data, setData] = useState<AttendanceOverviewResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [period, setPeriod] = useState(initialPeriod);
    const [className, setClassName] = useState(initialClassName);
    const [classOptions, setClassOptions] = useState<Array<{ value: string; label: string }>>([
        { value: 'all', label: 'All Classes' }
    ]);
    const [scrollPosition, setScrollPosition] = useState(0);
    const [chartPixelWidth, setChartPixelWidth] = useState<number | null>(null);
    const [showSummary, setShowSummary] = useState(false); // New state for toggling summary
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const [chartContainerWidth, setChartContainerWidth] = useState(0);

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartWrapperRef = useRef<HTMLDivElement>(null);
    const [isDraggingChart, setIsDraggingChart] = useState(false);

    const [visibleBars, setVisibleBars] = useState({
        present: true,
        absent: true,
        late: true,
    });

    const toggleBar = (key: 'present' | 'absent' | 'late') => {
        setVisibleBars(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    useEffect(() => {
        const updateViewport = () => {
            const width = window.innerWidth;
            setIsMobile(width < 640);
            setIsTablet(width >= 640 && width < 1024);
            setIsDesktop(width >= 1024);
        };

        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    // Helper function to get daily data based on response type
    const getDailyData = () => {
        if (!data?.data) return [];
        if (data.data.type === 'single_class' && data.data.daily_data) {
            return data.data.daily_data;
        }
        return data.data.daily_summary || [];
    };

    // Helper function to get totals based on response type
    const getTotals = () => {
        if (!data?.data) return null;
        if (data.data.type === 'single_class' && data.data.totals) {
            const totals = data.data.totals;
            return {
                total_classes: 1,
                total_students: getDailyData().length > 0 ? getDailyData()[0].total_students : 0,
                total_present: totals.total_present,
                total_absent: totals.total_absent,
                total_late: totals.total_late,
                total_marked: totals.total_marked,
                average_attendance: totals.average_attendance
            };
        }
        return data.data.overall_totals;
    };

    // Helper function to get class count
    const getClassCount = () => {
        if (!data?.data) return 0;
        if (data.data.type === 'single_class') {
            return 1;
        }
        return data.data.overall_totals?.total_classes || 0;
    };

    // Helper function to get total students
    const getTotalStudents = () => {
        const dailyData = getDailyData();
        if (dailyData.length > 0) {
            return dailyData[0].total_students;
        }
        return 0;
    };

    // Custom tooltip component
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dayData = payload[0].payload;
            return (
                <div
                    className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${
                        isMobile
                            ? 'p-2.5 w-[min(200px,calc(100vw-1rem))]'
                            : isTablet
                                ? 'p-3 w-[230px]'
                                : 'p-4 w-[270px]'
                    }`}
                >
                    <p className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xs mb-1.5' : 'text-sm mb-2'}`}>
                        {dayData.day}, {new Date(dayData.date).toLocaleDateString()}
                    </p>
                    <div className={`space-y-1 ${isMobile ? 'min-w-0' : 'min-w-[170px]'}`}>
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center">
                                <div className={`${isMobile ? 'w-2.5 h-2.5 mr-1.5' : 'w-3 h-3 mr-2'} rounded-full bg-green-500`}></div>
                                <span className={isMobile ? 'text-[11px]' : 'text-sm'}>Present</span>
                            </div>
                            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-medium text-green-600`}>{dayData.present}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center">
                                <div className={`${isMobile ? 'w-2.5 h-2.5 mr-1.5' : 'w-3 h-3 mr-2'} rounded-full bg-red-500`}></div>
                                <span className={isMobile ? 'text-[11px]' : 'text-sm'}>Absent</span>
                            </div>
                            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-medium text-red-600`}>{dayData.absent}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 sm:gap-4">
                            <div className="flex items-center">
                                <div className={`${isMobile ? 'w-2.5 h-2.5 mr-1.5' : 'w-3 h-3 mr-2'} rounded-full bg-yellow-500`}></div>
                                <span className={isMobile ? 'text-[11px]' : 'text-sm'}>Late</span>
                            </div>
                            <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-medium text-yellow-600`}>{dayData.late}</span>
                        </div>
                        <div className={`${isMobile ? 'pt-1.5 mt-1.5' : 'pt-2 mt-2'} border-t border-gray-200 dark:border-gray-700`}>
                            <div className="flex items-center justify-between">
                                <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-medium`}>Attendance Rate</span>
                                <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-bold ${dayData.attendance_percentage >= 80 ? 'text-green-600' :
                                    dayData.attendance_percentage >= 60 ? 'text-yellow-600' :
                                        'text-red-600'
                                    }`}>
                                    {dayData.attendance_percentage.toFixed(1)}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                                <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} text-gray-500`}>Marked</span>
                                <span className={`${isMobile ? 'text-[11px]' : 'text-sm'} font-medium`}>
                                    {dayData.total_marked}/{dayData.total_students}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom bar shape with rounded corners
    const CustomBar = (props: any) => {
        const { fill, x, y, width, height } = props;
        return (
            <Rectangle
                {...props}
                radius={[4, 4, 0, 0]}
                className="transition-all duration-300 hover:opacity-80"
            />
        );
    };

    const fetchData = async () => {
  try {
    setRefreshing(true);

    const response = await adminApi.attendance.overview(period, className);

    const result = response.data;

    setData(result);
    setError(null);
    setScrollPosition(0);

    const dailyData =
      result.data?.daily_data || result.data?.daily_summary || [];

    const MIN_BAR_WIDTH = isMobile ? 46 : isTablet ? 52 : 60;
    const containerWidth =
      chartContainerRef.current?.offsetWidth || chartContainerWidth || 800;

    const requiredWidth = dailyData.length * MIN_BAR_WIDTH;
    setChartContainerWidth(containerWidth);

    setChartPixelWidth(
      requiredWidth > containerWidth ? requiredWidth : containerWidth
    );
    setScrollPosition(0);
  } catch (err) {
    console.error('Attendance fetch error:', err);

    if (axios.isAxiosError(err)) {
      setError(err.response?.data?.detail || 'Failed to load attendance');
    } else {
      setError('Failed to load attendance');
    }
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};


    const fetchClasses = async () => {
  try {
    const response = await adminApi.academics.standards();

    const standards: Standard[] = response.data;

    const options = standards.map((standard) => ({
      value: standard.name,
      label: `Class ${standard.name}`,
    }));

    setClassOptions([
      { value: 'all', label: 'All Classes' },
      ...options,
    ]);
  } catch (err) {
    console.error('Error fetching classes:', err);
  }
};


    useEffect(() => {
        fetchData();
        fetchClasses();
    }, [period, className]);

    useEffect(() => {
        if (!data) return;

        const updateChartLayout = () => {
            const containerWidth = chartContainerRef.current?.offsetWidth || chartContainerWidth || 0;
            if (!containerWidth) return;

            const dailyData = getDailyData();
            const minBarWidth = isMobile ? 46 : isTablet ? 52 : 60;
            const requiredWidth = dailyData.length * minBarWidth;
            const nextChartWidth = requiredWidth > containerWidth ? requiredWidth : containerWidth;

            setChartContainerWidth(containerWidth);
            setChartPixelWidth(nextChartWidth);

            setScrollPosition((prev) => {
                const maxScroll = Math.max(0, nextChartWidth - containerWidth);
                return Math.min(prev, maxScroll);
            });
        };

        updateChartLayout();
        window.addEventListener('resize', updateChartLayout);

        let observer: ResizeObserver | null = null;
        if (chartContainerRef.current && typeof ResizeObserver !== 'undefined') {
            observer = new ResizeObserver(updateChartLayout);
            observer.observe(chartContainerRef.current);
        }

        return () => {
            window.removeEventListener('resize', updateChartLayout);
            observer?.disconnect();
        };
    }, [data, isMobile, isTablet, isDesktop]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (chartContainerRef.current?.contains(document.activeElement)) {
                if (e.key === 'r' || e.key === 'R') {
                    e.preventDefault();
                    handleRefresh();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const handleScrollChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScrollPosition(Number(e.target.value));
    };

    const handleChartDrag = (e: React.MouseEvent) => {
        if (chartPixelWidth === null || chartPixelWidth <= 100) return; // No drag if no overflow

        setIsDraggingChart(true);
        const startX = e.clientX;
        const startScroll = scrollPosition;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const containerWidth = chartContainerRef.current?.offsetWidth || 0;
            const maxScroll = chartPixelWidth ? chartPixelWidth - containerWidth : 0;

            const newScroll = Math.max(
                0,
                Math.min(maxScroll, startScroll - deltaX)
            );

            setScrollPosition(newScroll);
        };

        const handleMouseUp = () => {
            setIsDraggingChart(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleRefresh = () => {
        fetchData();
    };

    const handleExport = () => {
        if (!data) return;

        const dailyData = getDailyData();

        // Create CSV content
        const csvContent = [
            ['Date', 'Day', 'Total Students', 'Present', 'Absent', 'Late', 'Marked', 'Unmarked', 'Attendance %'],
            ...dailyData.map(day => [
                day.date,
                day.day,
                day.total_students,
                day.present,
                day.absent,
                day.late,
                day.total_marked,
                day.unmarked,
                day.attendance_percentage.toFixed(1)
            ])
        ].map(row => row.join(',')).join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_${period}_${className}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    if (loading && !refreshing) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-64 flex items-center justify-center">
                    <div className="text-center">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-blue-600 animate-pulse" />
                            </div>
                        </div>
                        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading chart data...</p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Preparing attendance insights</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-64 flex items-center justify-center text-center">
                    <div className="p-4 max-w-md">
                        <div className="text-red-500 mb-3">
                            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Unable to Load Data</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const dailyData = getDailyData();
    const totals = getTotals();

    if (!data || dailyData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-64 flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">No attendance data available for the selected filters</p>
                </div>
            </div>
        );
    }

    // Format chart data with proper labels
    const chartData = dailyData.map(day => {
        const date = new Date(day.date);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;

        return {
            ...day,
            dateLabel: `${dayName} ${dateLabel}`,
            shortDay: dayName,
            formattedDate: dateLabel
        };
    });

    const dateRange = data.date_range;
    const attendanceTrend = totals?.average_attendance ?
        (totals.average_attendance > 75 ? 'up' : totals.average_attendance > 50 ? 'stable' : 'down') :
        'stable';

    const totalStudents = getTotalStudents();
    const classCount = getClassCount();
    const activeContainerWidth = chartContainerRef.current?.offsetWidth || chartContainerWidth || 0;
    const maxScroll = Math.max(0, (chartPixelWidth || 0) - activeContainerWidth);
    const showScrollControls = maxScroll > 0;

    // Calculate max value for Y-axis domain
    const maxValue = Math.max(
        ...chartData.map(day => Math.max(day.present, day.absent, day.late))
    );
    // Round up to nearest multiple of 5 for cleaner Y-axis labels
    const maxYValue = Math.ceil(maxValue * 1.1 / 5) * 5;

    const yTicks = Array.from(
        { length: maxYValue + 1 },
        (_, i) => i
    );

    return (
        <div className="">
            {/* Header with filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
                <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-gray-600 dark:text-gray-400`}>
                        {new Date(dateRange.start).toLocaleDateString()} - {new Date(dateRange.end).toLocaleDateString()}
                        <span className="mx-2">•</span>
                        {data.total_working_days} working days
                        <span className="mx-2">•</span>
                        {className === 'all' ? `${classCount} classes` : `Class ${className}`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                    {/* Period Filter */}
                    <div className="relative flex-1 min-w-[130px] sm:min-w-[150px]">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                            <Calendar size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                        </div>
                        <select
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                        >
                            {periodOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Class Filter */}
                    <div className="relative flex-1 min-w-[130px] sm:min-w-[150px]">
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                            <Filter size={14} className="text-gray-400 sm:w-4 sm:h-4" />
                        </div>
                        <select
                            value={className}
                            onChange={(e) => setClassName(e.target.value)}
                            className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
                        >
                            {classOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                        title="Export CSV"
                    >
                        <Download size={14} className="sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </div>

            {/* Overall Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 p-3 sm:p-4 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Avg. Attendance</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                {totals?.average_attendance?.toFixed(1) || '0.0'}%
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {attendanceTrend === 'up' ? 'Good trend' : attendanceTrend === 'stable' ? 'Average' : 'Needs attention'}
                            </p>
                        </div>
                        <div className={`p-2 rounded-lg ${attendanceTrend === 'up' ? 'bg-green-100 dark:bg-green-900/30' : attendanceTrend === 'stable' ? 'bg-yellow-100 dark:bg-yellow-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                            {attendanceTrend === 'up' ? (
                                <TrendingUp className="text-green-600 dark:text-green-400" size={20} />
                            ) : attendanceTrend === 'stable' ? (
                                <div className="w-5 h-5 flex items-center justify-center text-yellow-600 dark:text-yellow-400">–</div>
                            ) : (
                                <TrendingDown className="text-red-600 dark:text-red-400" size={20} />
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 p-3 sm:p-4 rounded-xl border border-green-100 dark:border-green-900/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Present</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                {totals?.total_present?.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {totals?.total_marked && totals.total_marked > 0
                                    ? `${((totals.total_present / totals.total_marked) * 100).toFixed(1)}% of marked`
                                    : 'No data'
                                }
                            </p>
                        </div>
                        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                            <div className="text-green-600 dark:text-green-400 text-xl font-bold">
                                ✓
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10 p-3 sm:p-4 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 uppercase tracking-wider">Absent</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                {totals?.total_absent?.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {totals?.total_marked && totals.total_marked > 0
                                    ? `${((totals.total_absent / totals.total_marked) * 100).toFixed(1)}% of marked`
                                    : 'No data'
                                }
                            </p>
                        </div>
                        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                            <div className="text-red-600 dark:text-red-400 text-xl font-bold">
                                ✗
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 p-3 sm:p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 uppercase tracking-wider">Late</p>
                            <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                                {totals?.total_late?.toLocaleString() || '0'}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {totals?.total_marked && totals.total_marked > 0
                                    ? `${((totals.total_late / totals.total_marked) * 100).toFixed(1)}% of marked`
                                    : 'No data'
                                }
                            </p>
                        </div>
                        <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                            <div className="text-yellow-600 dark:text-yellow-400 text-xl font-bold">
                                ⏰
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart Container */}
            <div className="relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                {/* Interactive Legend */}
                <div className="absolute top-0 left-0 right-0 z-10">
                    <div className="flex justify-center pt-3 sm:pt-4 pb-2">
                        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            {/* Present */}
                            <div
                                onClick={() => toggleBar('present')}
                                className={`flex items-center gap-2 cursor-pointer transition-all ${visibleBars.present ? '' : 'opacity-40'
                                    }`}
                            >
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Present
                                </span>
                            </div>

                            {/* Absent */}
                            <div
                                onClick={() => toggleBar('absent')}
                                className={`flex items-center gap-2 cursor-pointer transition-all ${visibleBars.absent ? '' : 'opacity-40'
                                    }`}
                            >
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Absent
                                </span>
                            </div>

                            {/* Late */}
                            <div
                                onClick={() => toggleBar('late')}
                                className={`flex items-center gap-2 cursor-pointer transition-all ${visibleBars.late ? '' : 'opacity-40'
                                    }`}
                            >
                                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Late
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div
                    className="relative"
                    style={{
                        paddingTop: isMobile ? "72px" : isTablet ? "64px" : "60px",
                        paddingBottom: showScrollControls ? (isMobile ? "64px" : "70px") : "20px",
                        paddingLeft: isMobile ? "6px" : "10px",
                        paddingRight: isMobile ? "8px" : isTablet ? "14px" : "20px",
                    }}
                >
                    <div ref={chartContainerRef} className="overflow-hidden">
                        <div className="flex">
                            {/* Scrollable Chart Area */}
                            <div className="flex-1 overflow-hidden">
                                <div
                                    ref={chartWrapperRef}
                                    className="transition-all duration-200"
                                    style={{
                                        width: chartPixelWidth ? `${chartPixelWidth}px` : "100%",
                                        transform: `translateX(-${Math.min(scrollPosition, maxScroll)}px)`,
                                        minHeight: isMobile ? "240px" : isTablet ? "280px" : isDesktop ? "340px" : "300px",
                                    }}
                                >
                                    <ResponsiveContainer width="100%" height={isMobile ? 240 : isTablet ? 280 : isDesktop ? 340 : 300}>
                                        <BarChart
                                            data={chartData}
                                            margin={{ top: 5, right: isMobile ? 24 : isTablet ? 40 : 70, left: isMobile ? 0 : 10, bottom: 5 }}
                                            barCategoryGap="15%"
                                            barGap={3}
                                        >
                                            <YAxis
                                                domain={[0, maxYValue]}
                                                ticks={yTicks}
                                                axisLine={false}
                                                tickLine={false}
                                                allowDecimals={false}
                                                width={isMobile ? 34 : isTablet ? 42 : 50}
                                                tick={{ fill: "#6b7280", fontSize: isMobile ? 10 : isTablet ? 11 : 12 }}
                                            />
                                            <CartesianGrid
                                                stroke="#0b0b0c"
                                                strokeWidth={0.5}
                                                strokeOpacity={0.4}
                                                strokeDasharray="2 4"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="dateLabel"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: "#6b7280", fontSize: isMobile ? 9 : isTablet ? 10 : 11, fontWeight: 500 }}
                                                tickMargin={8}
                                                interval={0}
                                            />
                                            <Tooltip
                                                content={<CustomTooltip />}
                                                cursor={{ fill: "rgba(0, 0, 0, 0.05)" }}
                                            />
                                            {visibleBars.present && (
                                                <Bar
                                                    dataKey="present"
                                                    fill="#10b981"
                                                    shape={<CustomBar />}
                                                    animationDuration={1200}
                                                />
                                            )}
                                            {visibleBars.absent && (
                                                <Bar
                                                    dataKey="absent"
                                                    fill="#ef4444"
                                                    shape={<CustomBar />}
                                                    animationDuration={1200}
                                                    animationBegin={150}
                                                />
                                            )}
                                            {visibleBars.late && (
                                                <Bar
                                                    dataKey="late"
                                                    fill="#f59e0b"
                                                    shape={<CustomBar />}
                                                    animationDuration={1200}
                                                    animationBegin={300}
                                                />
                                            )}
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scroll Controls */}
                {showScrollControls && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white dark:from-gray-800 to-transparent border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {isDraggingChart ? "Dragging..." : "Drag chart or use scrollbar"}
                            </div>
                            <div className="flex-1 relative">
                                <input
                                    type="range"
                                    min="0"
                                    max={maxScroll}
                                    value={Math.min(scrollPosition, maxScroll)}
                                    onChange={handleScrollChange}
                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div
                                className={`cursor-grab active:cursor-grabbing p-2 rounded-md transition-colors ${isDraggingChart
                                    ? "bg-blue-100 dark:bg-blue-900/30"
                                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                    }`}
                                onMouseDown={handleChartDrag}
                            >
                                <svg
                                    className="w-4 h-4 text-gray-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                )}

                <div className="absolute top-12 right-2 sm:right-4">
                    <div className="text-xs text-gray-500 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2 py-1 rounded">
                        {chartData.length} days
                    </div>
                </div>
            </div>

            {showSummaryToggle && (
                <div className="mt-6 pt-0 border-t-0">
                    <div className="flex justify-center">
                        <button
                            onClick={() => setShowSummary(!showSummary)}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            {showSummary ? (
                                <>
                                    <ChevronUp size={16} />
                                    Hide Summary Statistics
                                </>
                            ) : (
                                <>
                                    <ChevronDown size={16} />
                                    Show Summary Statistics
                                </>
                            )}
                        </button>
                    </div>

                    {showSummary && (
                        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Coverage Rate</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                                <span>Attendance Marked</span>
                                                <span>
                                                    {totals?.total_marked && totalStudents > 0
                                                        ? `${((totals.total_marked / (totalStudents * data.total_working_days)) * 100).toFixed(1)}%`
                                                        : '0%'
                                                    }
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: totals?.total_marked && totalStudents > 0
                                                            ? `${(totals.total_marked / (totalStudents * data.total_working_days)) * 100}%`
                                                            : '0%'
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div className="text-sm font-semibold">
                                            {totals?.total_marked || 0}/{totalStudents * data.total_working_days}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Classes Analyzed</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-base">{classCount} {classCount === 1 ? 'class' : 'classes'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{className === 'all' ? 'All classes' : `Class ${className}`}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Students</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-base">{totalStudents} students</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{data.total_working_days} days average</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col justify-center">
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Data Summary</p>
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-base">{chartData.length} days</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(dateRange.start).toLocaleDateString('short')} - {new Date(dateRange.end).toLocaleDateString('short')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
