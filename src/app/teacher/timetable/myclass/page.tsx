'use client';

import React, { useState, useEffect } from 'react';
import {
  FaCalendarAlt, 
  FaClock, 
  FaBook, 
  FaChalkboardTeacher,
  FaUsers,
  FaCoffee,
  FaUndo,
  FaTimesCircle,
  FaCalendarPlus,
  FaExclamationTriangle,
  FaRegCalendarTimes,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import Substitution from '../substitution/page';

export default function MyClassTimetable() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timetableData, setTimetableData] = useState<any>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [activeTab, setActiveTab] = useState<'timetable' | 'substitution'>('timetable');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [classCarouselPage, setClassCarouselPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(6);

  const getBgClass = () => combine(
    get('bg', 'primary'),
    'min-h-screen transition-colors duration-200'
  );

  const getCardGradientClass = (color: string = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );

    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-blue-900/10' : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-emerald-900/10' : 'from-white to-emerald-50');
    }
    if (color === 'amber') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-amber-900/10' : 'from-white to-amber-50');
    }
    if (color === 'purple') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-purple-900/10' : 'from-white to-purple-50');
    }
    if (color === 'indigo') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark' ? 'from-gray-800 to-indigo-900/10' : 'from-white to-indigo-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', get('bg', 'card'));
  };

  const getPrimaryButtonClass = () => combine(
    'px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
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

  const getInputClass = () => combine(
    'px-3 sm:px-4 py-2.5 sm:py-3.5 rounded-lg sm:rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-all w-full',
    'text-xs sm:text-sm',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500 focus:border-blue-400'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-blue-500'
  );

  const getTableHeaderClass = () => combine(
    get('bg', 'secondary'),
    'divide-y',
    get('border', 'primary')
  );

  const getTableRowClass = () => combine(
    get('bg', 'card'),
    'divide-y',
    get('border', 'primary')
  );

  const formatTimeForDisplay = (time: string) => time.substring(0, 5);

  const normalizeSubjectName = (subject: string): string => (
    subject
      .toLowerCase()
      .replace(/&/g, 'and')
      .replace(/[()]/g, ' ')
      .replace(/[\/_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );

  const SUBJECT_COLOR_MAP: Record<string, { bg: string; text: string; border: string }> = {
    mathematics: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    maths: { bg: '#1E40AF', text: '#FFFFFF', border: '#1E40AF' },
    english: { bg: '#B91C1C', text: '#FFFFFF', border: '#B91C1C' },
    science: { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'general science': { bg: '#166534', text: '#FFFFFF', border: '#166534' },
    'social science': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'social studies': { bg: '#EA580C', text: '#FFFFFF', border: '#EA580C' },
    'computer science': { bg: '#6D28D9', text: '#FFFFFF', border: '#6D28D9' },
    physics: { bg: '#3730A3', text: '#FFFFFF', border: '#3730A3' },
    chemistry: { bg: '#DB2777', text: '#FFFFFF', border: '#DB2777' },
    biology: { bg: '#15803D', text: '#FFFFFF', border: '#15803D' },
    tamil: { bg: '#0F766E', text: '#FFFFFF', border: '#0F766E' },
    hindi: { bg: '#CA8A04', text: '#111827', border: '#CA8A04' },
    sanskrit: { bg: '#78350F', text: '#FFFFFF', border: '#78350F' },
    malayalam: { bg: '#047857', text: '#FFFFFF', border: '#047857' },
    telugu: { bg: '#0891B2', text: '#FFFFFF', border: '#0891B2' },
    kannada: { bg: '#115E59', text: '#FFFFFF', border: '#115E59' },
    urdu: { bg: '#064E3B', text: '#FFFFFF', border: '#064E3B' },
    french: { bg: '#8B5CF6', text: '#FFFFFF', border: '#8B5CF6' },
    accountancy: { bg: '#1E3A8A', text: '#FFFFFF', border: '#1E3A8A' },
    'business studies': { bg: '#7F1D1D', text: '#FFFFFF', border: '#7F1D1D' },
    economics: { bg: '#B45309', text: '#FFFFFF', border: '#B45309' },
    commerce: { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    'commerce general': { bg: '#92400E', text: '#FFFFFF', border: '#92400E' },
    history: { bg: '#C2410C', text: '#FFFFFF', border: '#C2410C' },
    geography: { bg: '#365314', text: '#FFFFFF', border: '#365314' },
    civics: { bg: '#334155', text: '#FFFFFF', border: '#334155' },
    'political science': { bg: '#581C87', text: '#FFFFFF', border: '#581C87' },
    psychology: { bg: '#BE185D', text: '#FFFFFF', border: '#BE185D' },
    sociology: { bg: '#4D7C0F', text: '#FFFFFF', border: '#4D7C0F' },
    'physical education': { bg: '#059669', text: '#FFFFFF', border: '#059669' },
    yoga: { bg: '#2DD4BF', text: '#111827', border: '#2DD4BF' },
    art: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    drawing: { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    'art drawing': { bg: '#C026D3', text: '#FFFFFF', border: '#C026D3' },
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'value education': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'moral science value ed': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
    'environmental studies': { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
    evs: { bg: '#4ADE80', text: '#111827', border: '#4ADE80' },
  };

  const getSubjectColor = (subject: string) => {
    const normalized = normalizeSubjectName(subject);
    if (SUBJECT_COLOR_MAP[normalized]) return SUBJECT_COLOR_MAP[normalized];

    const cleaned = normalized
      .replace(/\b(subject|theory|practical|lab|core|elective)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (SUBJECT_COLOR_MAP[cleaned]) return SUBJECT_COLOR_MAP[cleaned];

    for (const [key, value] of Object.entries(SUBJECT_COLOR_MAP)) {
      if (cleaned.includes(key) || key.includes(cleaned)) {
        return value;
      }
    }

    return null;
  };

  const getSubjectGradientStyle = (color: { bg: string; text: string; border: string }) => ({
    backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.04) 42%, rgba(0,0,0,0.14) 100%), linear-gradient(135deg, ${color.bg} 0%, ${color.bg} 100%)`,
    borderColor: color.border,
    color: color.text
  });

  useEffect(() => {
    fetchClassTimetable();
    fetchTeacherProfile();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateCardsPerPage = () => {
      if (window.innerWidth < 640) {
        setCardsPerPage(2);
      } else if (window.innerWidth < 1024) {
        setCardsPerPage(3);
      } else if (window.innerWidth < 1280) {
        setCardsPerPage(4);
      } else {
        setCardsPerPage(6);
      }
    };

    updateCardsPerPage();
    window.addEventListener('resize', updateCardsPerPage);
    return () => window.removeEventListener('resize', updateCardsPerPage);
  }, []);

  const fetchClassTimetable = async () => {
    try {
      setLoading(true);
      const response = await teacherApi.timetable.myClass();
      const data = response.data?.data || response.data;
      setTimetableData(data);
      setError('');
    } catch (err) {
      setError('Error fetching timetable data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherProfile = async () => {
    try {
      const response = await teacherApi.profile.get();
      const data = response.data?.data || response.data;
      setTeacherProfile(data);
    } catch (err) {
      // Non-blocking; header will fallback if profile fetch fails.
    }
  };

  // Always show all weekdays, regardless of data
  const getAllDays = () => {
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  };

  const getPeriodsForDay = (day: string) => {
    if (!timetableData?.timetable?.[day]) return [];
    return timetableData.timetable[day];
  };

  const getDayColor = (day: string) => {
    const colors = {
      Monday: 'from-blue-500 to-blue-600',
      Tuesday: 'from-green-500 to-green-600',
      Wednesday: 'from-purple-500 to-purple-600',
      Thursday: 'from-yellow-500 to-yellow-600',
      Friday: 'from-red-500 to-red-600',
      Saturday: 'from-indigo-500 to-indigo-600',
      Sunday: 'from-gray-500 to-gray-600'
    };
    return colors[day as keyof typeof colors] || 'from-blue-500 to-blue-600';
  };

  // Check if timetable is empty
  const isTimetableEmpty = () => {
    if (!timetableData || !timetableData.timetable) return true;
    const days = getAllDays();
    return days.every(day => getPeriodsForDay(day).length === 0);
  };

  // Get all possible periods (1-8) or based on data
  const getAllPeriods = () => {
    if (isTimetableEmpty()) {
      return [1, 2, 3, 4, 5, 6, 7, 8]; // Default periods when empty
    }
    
    const periods = new Set<number>();
    
    // First, get periods from data
    if (timetableData?.timetable) {
      getAllDays().forEach(day => {
        getPeriodsForDay(day).forEach((period: any) => {
          periods.add(period.period);
        });
      });
    }
    
    // If no periods in data, default to 1-8
    if (periods.size === 0) {
      return [1, 2, 3, 4, 5, 6, 7, 8];
    }
    
    return Array.from(periods).sort((a, b) => a - b);
  };

  const getWeeklyTimeSlots = () => {
    const allTimeSlots = new Map<string, { period: number; start: string; end: string }>();

    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((item: any) => {
        const [startRaw, endRaw] = (item.time || '').split(' - ');
        const start = startRaw?.substring(0, 5) || '';
        const end = endRaw?.substring(0, 5) || '';
        const key = `${item.period}-${start}-${end}`;
        if (start && end && !allTimeSlots.has(key)) {
          allTimeSlots.set(key, { period: item.period, start, end });
        }
      });
    });

    if (allTimeSlots.size === 0) {
      getAllPeriods().forEach((period) => {
        const startHour = 8 + (period - 1);
        const endHour = startHour + 1;
        const start = `${String(startHour).padStart(2, '0')}:00`;
        const end = `${String(endHour).padStart(2, '0')}:00`;
        allTimeSlots.set(`${period}-${start}-${end}`, { period, start, end });
      });
    }

    return Array.from(allTimeSlots.entries()).sort((a, b) => {
      const aVal = a[1];
      const bVal = b[1];
      if (aVal.start === bVal.start) return aVal.period - bVal.period;
      return aVal.start.localeCompare(bVal.start);
    });
  };


  const getSchoolHoursLabel = () => {
    const allSlots: Array<{ start: string; end: string }> = [];

    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((item: any) => {
        const [startRaw, endRaw] = (item.time || '').split(' - ');
        const start = startRaw ? formatTimeForDisplay(startRaw) : '';
        const end = endRaw ? formatTimeForDisplay(endRaw) : '';

        if (start && end) {
          allSlots.push({ start, end });
        }
      });
    });

    if (allSlots.length === 0) {
      return 'School hours: Not available';
    }

    const sortedStarts = [...allSlots].sort((a, b) => a.start.localeCompare(b.start));
    const sortedEnds = [...allSlots].sort((a, b) => b.end.localeCompare(a.end));

    return `School hours: ${sortedStarts[0].start} - ${sortedEnds[0].end}`;
  };

  const getCurrentPeriodDetails = () => {
    const today = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    const todayPeriods = getPeriodsForDay(today);

    if (!todayPeriods.length) {
      return { label: 'Current period: No class today', isActive: false };
    }

    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();

    const activePeriod = todayPeriods.find((item: any) => {
      const [startRaw, endRaw] = (item.time || '').split(' - ');
      if (!startRaw || !endRaw) return false;

      const [startHour, startMinute] = formatTimeForDisplay(startRaw).split(':').map(Number);
      const [endHour, endMinute] = formatTimeForDisplay(endRaw).split(':').map(Number);

      const startTotal = (startHour * 60) + startMinute;
      const endTotal = (endHour * 60) + endMinute;

      return currentMinutes >= startTotal && currentMinutes < endTotal;
    });

    if (!activePeriod) {
      return { label: 'Current period: No active class right now', isActive: false };
    }

    if (activePeriod.is_break) {
      return {
        label: `Current period: Break • ${formatTimeForDisplay(activePeriod.time.split(' - ')[0])} - ${formatTimeForDisplay(activePeriod.time.split(' - ')[1])}`,
        isActive: true,
      };
    }

    return {
      label: `Current period: Period ${activePeriod.period} • ${activePeriod.subject} • ${formatTimeForDisplay(activePeriod.time.split(' - ')[0])} - ${formatTimeForDisplay(activePeriod.time.split(' - ')[1])}`,
      isActive: true,
    };
  };

  const isCurrentPeriod = (day: string, period: any, slot?: { start: string; end: string }) => {
    const today = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    if (day !== today || !period) return false;

    const [startRaw, endRaw] = (period.time || '').split(' - ');
    const startStr = startRaw ? formatTimeForDisplay(startRaw) : slot?.start;
    const endStr = endRaw ? formatTimeForDisplay(endRaw) : slot?.end;
    if (!startStr || !endStr) return false;

    const [startHour, startMinute] = startStr.split(':').map(Number);
    const [endHour, endMinute] = endStr.split(':').map(Number);
    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
    const startTotal = (startHour * 60) + startMinute;
    const endTotal = (endHour * 60) + endMinute;

    return currentMinutes >= startTotal && currentMinutes < endTotal;
  };

  const getSubjectSummaries = () => {
    const subjectMap = new Map<string, { count: number; teachers: Set<string> }>();

    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((period: any) => {
        if (!period?.subject || period.is_break) return;

        const current = subjectMap.get(period.subject) || { count: 0, teachers: new Set<string>() };
        current.count += 1;

        if (period.teacher) {
          current.teachers.add(period.teacher);
        }

        subjectMap.set(period.subject, current);
      });
    });

    return Array.from(subjectMap.entries())
      .map(([subject, value]) => ({
        subject,
        count: value.count,
        teachers: Array.from(value.teachers),
      }))
      .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject));
  };

  const handleRequestTimetable = () => {
    // This function would typically navigate to a request page or show a modal
    alert('Redirecting to timetable request page...');
    // You can implement navigation logic here
  };

  const weeklyTimeSlots = getWeeklyTimeSlots();
  const currentPeriodDetails = getCurrentPeriodDetails();
  const subjectSummaries = getSubjectSummaries();
  const totalSubjectPages = Math.max(1, Math.ceil(subjectSummaries.length / cardsPerPage));
  const safeSubjectPage = Math.min(classCarouselPage, totalSubjectPages - 1);
  const visibleSubjects = subjectSummaries.slice(
    safeSubjectPage * cardsPerPage,
    safeSubjectPage * cardsPerPage + cardsPerPage
  );
  const assignedSplit = (teacherProfile?.assigned_class || '').split('-').map((part: string) => part.trim()).filter(Boolean);
  const classSplit = (timetableData?.class || '').split('-').map((part: string) => part.trim()).filter(Boolean);
  const classLabel =
    timetableData?.viewing_class ||
    timetableData?.class_name ||
    classSplit[0] ||
    teacherProfile?.class_name ||
    assignedSplit[0] ||
    'Class';
  const sectionLabel =
    timetableData?.viewing_section ||
    timetableData?.section_name ||
    timetableData?.section ||
    classSplit[1] ||
    teacherProfile?.section_name ||
    assignedSplit[1] ||
    'Section';

  useEffect(() => {
    if (classCarouselPage > totalSubjectPages - 1) {
      setClassCarouselPage(0);
    }
  }, [classCarouselPage, totalSubjectPages]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className={combine(
            "rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white mb-6",
            theme === 'dark'
              ? "bg-gradient-to-r from-blue-700 to-blue-800"
              : "bg-gradient-to-r from-blue-500 to-blue-600"
          )}>
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaCalendarAlt className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Class Timetable</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaChalkboardTeacher className="text-xs sm:text-sm" />
                    {classLabel} {sectionLabel !== 'Section' ? `• ${sectionLabel}` : ''} • {timetableData?.view_type || 'Weekly Template'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Total Subjects</div>
                  <div className="text-sm sm:text-base font-bold">
                    {subjectSummaries.length}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Class</div>
                  <div className="text-sm sm:text-base font-bold">
                    {timetableData ? classLabel : 'Loading...'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Section</div>
                  <div className="text-sm sm:text-base font-bold">
                    {timetableData ? sectionLabel : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          <button
            onClick={() => setActiveTab('timetable')}
            className={activeTab === 'timetable' ? getPrimaryButtonClass() : getSecondaryButtonClass()}
          >
            My Class Timetable
          </button>
          <button
            onClick={() => setActiveTab('substitution')}
            className={activeTab === 'substitution' ? getPrimaryButtonClass() : getSecondaryButtonClass()}
          >
            Substitution
          </button>
        </div>

        {/* Empty State */}
        {activeTab === 'substitution' ? (
          <Substitution />
        ) : isTimetableEmpty() ? (
          <div className={getCardGradientClass('blue')}>
            <div className="p-5 sm:p-8 lg:p-10 text-center">
              <div className="max-w-2xl mx-auto">
                {/* Animated Illustration */}
                <div className="relative mx-auto h-40 w-40 sm:h-52 sm:w-52 lg:h-64 lg:w-64 mb-6 sm:mb-8">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full animate-pulse"></div>
                  <div className={combine(
                    "absolute inset-8 rounded-full flex items-center justify-center",
                    theme === 'dark' ? 'bg-gradient-to-r from-blue-900/30 to-purple-900/30' : 'bg-gradient-to-r from-blue-50 to-purple-50'
                  )}>
                    <FaRegCalendarTimes className={combine("text-4xl sm:text-5xl lg:text-6xl", get('text', 'tertiary'))} />
                  </div>
                  <div className="absolute top-3 left-3 h-10 w-10 sm:h-14 sm:w-14 lg:h-16 lg:w-16 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full animate-bounce"></div>
                  <div className="absolute bottom-3 right-3 h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-gradient-to-r from-pink-100 to-pink-200 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                
                {/* Title */}
                <h2 className={combine("text-2xl sm:text-3xl font-bold mb-4", get('text', 'primary'))}>
                  No Timetable Allocated Yet
                </h2>
                
                {/* Description */}
                <p className={combine("text-sm sm:text-base mb-8 max-w-md mx-auto", get('text', 'secondary'))}>
                  Your class timetable hasn't been set up yet. Don't worry! This can be arranged by the school administration.
                </p>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 min-[520px]:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-8 sm:mb-10">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-blue-200">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-600 mb-2">0</div>
                    <div className="text-sm sm:text-base text-gray-700 font-medium">Allocated Periods</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-2">Waiting for schedule</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-purple-200">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-600 mb-2">6</div>
                    <div className="text-sm sm:text-base text-gray-700 font-medium">School Days</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-2">Monday to Saturday</div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 sm:p-5 lg:p-6 rounded-xl sm:rounded-2xl border border-green-200">
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 mb-2">8</div>
                    <div className="text-sm sm:text-base text-gray-700 font-medium">Daily Periods</div>
                    <div className="text-xs sm:text-sm text-gray-500 mt-2">8:00 AM - 3:30 PM</div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <button
                    onClick={handleRequestTimetable}
                    className={combine(getPrimaryButtonClass(), "px-8 py-3 flex items-center gap-3 group")}
                  >
                    <FaCalendarPlus className="text-xl group-hover:scale-110 transition-transform" />
                    Request Timetable Setup
                  </button>
                  
                  <button
                    onClick={fetchClassTimetable}
                    className={combine(getSecondaryButtonClass(), "px-8 py-3 flex items-center gap-3")}
                  >
                    <FaUndo />
                    Check Again
                  </button>
                </div>
                
                {/* Help Text */}
                <div className="mt-10 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 max-w-lg mx-auto">
                  <div className="flex items-center gap-3">
                    <FaExclamationTriangle className="text-xl text-yellow-600 flex-shrink-0" />
                    <div className="text-left">
                      <div className="font-medium text-yellow-800">What happens next?</div>
                      <div className="text-sm text-yellow-700">
                        Once requested, your timetable will be reviewed by the administration and should be available within 24-48 hours.
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Preview of Week Structure */}
                <div className="mt-12">
                  <h3 className="text-xl font-semibold text-gray-700 mb-6">Weekly Structure Preview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
                    {getAllDays().map((day) => (
                      <div key={day} className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                        <div className={`text-center px-3 py-1 rounded-lg bg-gradient-to-r ${getDayColor(day)} bg-opacity-10 text-gray-700 text-xs sm:text-sm font-medium mb-3`}>
                          {day.substring(0, 3)}
                        </div>
                        <div className="text-center">
                          <div className="text-xl sm:text-2xl font-bold text-gray-300">0</div>
                          <div className="text-xs sm:text-sm text-gray-500">periods</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Timetable View */
          <>
            <div className={getCardGradientClass('indigo')}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={combine(
                    "p-1.5 sm:p-2 rounded-lg sm:rounded-xl",
                    theme === 'dark' ? 'bg-indigo-900/30' : 'bg-indigo-100'
                  )}>
                    <FaBook className={combine(
                      "text-base sm:text-lg",
                      theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'
                    )} />
                  </div>
                  <div>
                    <h3 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>Active Subjects</h3>
                    <p className={combine("text-xs sm:text-sm mt-0.5 sm:mt-1", get('text', 'secondary'))}>
                      Timetable subjects and allocation count
                    </p>
                  </div>
                </div>
                {subjectSummaries.length > cardsPerPage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setClassCarouselPage(prev => Math.max(prev - 1, 0))}
                      disabled={safeSubjectPage === 0}
                      className={combine(
                        "p-2 rounded-lg border transition-all",
                        get('border', 'primary'),
                        get('bg', 'card'),
                        safeSubjectPage === 0
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105"
                      )}
                      aria-label="Previous subject cards"
                    >
                      <FaChevronLeft className={combine("text-xs sm:text-sm", get('icon', 'primary'))} />
                    </button>
                    <span className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>
                      {safeSubjectPage + 1}/{totalSubjectPages}
                    </span>
                    <button
                      onClick={() => setClassCarouselPage(prev => Math.min(prev + 1, totalSubjectPages - 1))}
                      disabled={safeSubjectPage === totalSubjectPages - 1}
                      className={combine(
                        "p-2 rounded-lg border transition-all",
                        get('border', 'primary'),
                        get('bg', 'card'),
                        safeSubjectPage === totalSubjectPages - 1
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:scale-105"
                      )}
                      aria-label="Next subject cards"
                    >
                      <FaChevronRight className={combine("text-xs sm:text-sm", get('icon', 'primary'))} />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3">
                {subjectSummaries.length > 0 ? visibleSubjects.map((item) => {
                  const subjectColor = getSubjectColor(item.subject);
                  return (
                    <div
                      key={item.subject}
                      className={combine(
                        "rounded-lg sm:rounded-xl p-2 sm:p-3 border shadow-sm hover:shadow-md transition-all hover:scale-[1.02]",
                        get('bg', 'card'),
                        get('border', 'primary')
                      )}
                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                    >
                      <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span
                          className={combine("font-bold text-xs sm:text-sm truncate", !subjectColor ? get('text', 'primary') : '')}
                          style={subjectColor ? { color: subjectColor.text } : undefined}
                        >
                          {item.subject}
                        </span>
                        <span
                          className={combine(
                            "px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold",
                            theme === 'dark' ? 'bg-indigo-900/30 text-indigo-200' : 'bg-indigo-100 text-indigo-700'
                          )}
                        >
                          {item.count}
                        </span>
                      </div>
                      <div
                        className={combine("text-xs", !subjectColor ? get('text', 'tertiary') : '')}
                        style={subjectColor ? { color: subjectColor.text, opacity: 0.85 } : undefined}
                      >
                        {item.teachers.length ? item.teachers.join(', ') : 'Teacher not assigned'}
                      </div>
                    </div>
                  );
                }) : (
                  <div className={combine(
                    "col-span-full text-center py-4 sm:py-6 md:py-8",
                    get('text', 'secondary')
                  )}>
                    <p className="text-xs sm:text-sm font-medium">No subjects available</p>
                    <p className="text-xs mt-1">Active subjects will appear once the timetable is published.</p>
                  </div>
                )}
              </div>
              {subjectSummaries.length > cardsPerPage && (
                <div className="mt-3 flex items-center justify-center gap-1.5">
                  {Array.from({ length: totalSubjectPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setClassCarouselPage(idx)}
                      className={combine(
                        "h-2 rounded-full transition-all",
                        idx === safeSubjectPage
                          ? "w-5 bg-indigo-500"
                          : combine("w-2", theme === 'dark' ? "bg-gray-600" : "bg-gray-300")
                      )}
                      aria-label={`Go to subject page ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className={getCardGradientClass('blue')}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={combine(
                      "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium",
                      viewMode === 'weekly' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                    )}
                  >
                    Weekly View
                  </button>
                  <button
                    onClick={() => setViewMode('daily')}
                    className={combine(
                      "px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium",
                      viewMode === 'daily' ? getPrimaryButtonClass() : getSecondaryButtonClass()
                    )}
                  >
                    Daily View
                  </button>
                </div>
                
                <div className={combine("text-xs sm:text-sm w-full lg:w-auto", get('text', 'secondary'))}>
                  <div className="flex flex-col items-start lg:items-end gap-1">
                    <span className="inline-flex w-full lg:w-auto items-center justify-start lg:justify-end gap-1 whitespace-nowrap">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      {getSchoolHoursLabel()}
                    </span>
                    <span className="inline-flex w-full lg:w-auto items-center justify-start lg:justify-end gap-1 text-xs sm:text-sm">
                      <span className={combine(
                        "w-2 h-2 rounded-full",
                        currentPeriodDetails.isActive ? 'bg-blue-500' : 'bg-gray-400'
                      )}></span>
                      <span className="break-words">{currentPeriodDetails.label}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {viewMode === 'weekly' ? (
              <div className={combine(
                "rounded-xl overflow-hidden border",
                get('bg', 'card'),
                get('border', 'primary')
              )}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 sm:p-5 border-b" style={{ borderColor: 'var(--color-border-primary)' }}>
                  <h4 className={combine("font-bold text-lg sm:text-xl", get('text', 'primary'))}>Weekly Timetable</h4>
                  <div className={combine("flex items-center gap-2", get('text', 'tertiary'))}>
                    <FaCalendarAlt className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">6 days</span>
                  </div>
                </div>

                <div className="w-full overflow-x-auto">
                  <table className="w-full min-w-[920px] table-fixed">
                    <colgroup>
                      <col className="w-[120px]" />
                      {weeklyTimeSlots.map(([slotKey]) => (
                        <col key={`col-${slotKey}`} className="w-[150px]" />
                      ))}
                    </colgroup>
                    <thead className={getTableHeaderClass()}>
                      <tr>
                        <th className={combine("px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>
                          Day
                        </th>
                        {weeklyTimeSlots.map(([slotKey, slot]) => (
                          <th key={slotKey} className={combine("px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>
                            <div className="flex flex-col">
                              <span>{slot.start} - {slot.end}</span>
                              
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={combine("divide-y", getTableRowClass())}>
                      {(() => {
                        const daysWithData = getAllDays().filter((day) => getPeriodsForDay(day).length > 0);
                        const periodZeroSample = daysWithData.reduce<any | null>((found, day) => {
                          if (found) return found;
                          return getPeriodsForDay(day).find((p: any) => p.period === 0) || null;
                        }, null);

                        return daysWithData.map((day, dayIndex) => {
                          const dayPeriods = getPeriodsForDay(day);
                          if (dayPeriods.length === 0) return null;

                          const periodMap = new Map<string, any>();
                          dayPeriods.forEach((item: any) => {
                            const [startRaw, endRaw] = (item.time || '').split(' - ');
                            const start = startRaw ? formatTimeForDisplay(startRaw) : '';
                            const end = endRaw ? formatTimeForDisplay(endRaw) : '';
                            periodMap.set(`${item.period}-${start}-${end}`, item);
                          });

                          return (
                            <tr key={day} className="transition-colors hover:bg-[var(--color-bg-hover)]">
                              <td className="px-3 sm:px-4 py-3 sm:py-4">
                                <div className="flex items-center gap-2">
                                  <FaCalendarAlt className={combine("h-4 w-4", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                                  <span className={combine("font-medium text-xs sm:text-sm", get('text', 'primary'))}>{day}</span>
                                </div>
                              </td>
                              {weeklyTimeSlots.map(([slotKey, slot]) => {
                                if (slot.period === 0) {
                                  if (dayIndex !== 0) return null;
                                  const displayPeriod = periodZeroSample || periodMap.get(slotKey);
                                  const isActive = displayPeriod ? isCurrentPeriod(day, displayPeriod, slot) : false;
                                  const subjectColor = displayPeriod && !displayPeriod.is_break
                                    ? getSubjectColor(displayPeriod.subject)
                                    : null;
                                  return (
                                    <td
                                      key={`${day}-${slotKey}-period0`}
                                      rowSpan={daysWithData.length}
                                      className="px-3 sm:px-4 py-3 sm:py-4 align-middle"
                                    >
                                      <div
                                        className={combine(
                                          "min-h-[86px] rounded-lg border p-2 flex flex-col items-center justify-center text-center transition-all duration-200",
                                          isActive ? (theme === 'dark' ? 'ring-2 ring-blue-400/70 shadow-lg' : 'ring-2 ring-blue-500/70 shadow-lg') : '',
                                          displayPeriod?.is_break
                                            ? theme === 'dark' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
                                            : !subjectColor ? combine(get('bg', 'secondary'), get('border', 'secondary')) : ''
                                        )}
                                        style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                      >
                                        {displayPeriod?.is_break && (
                                          <div
                                            className={combine("font-medium text-xs sm:text-sm mb-1", !subjectColor ? get('text', 'primary') : '')}
                                            style={subjectColor ? { color: subjectColor.text } : undefined}
                                          >
                                            {displayPeriod.subject}
                                          </div>
                                        )}
                                        <div
                                          className={combine("text-xs", !subjectColor ? get('text', 'secondary') : '')}
                                          style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                                        >
                                          {slot.start} - {slot.end}
                                        </div>
                                        <div
                                          className={combine("text-xs mt-1", !subjectColor ? get('text', 'tertiary') : '')}
                                          style={subjectColor ? { color: subjectColor.text, opacity: 0.84 } : undefined}
                                        >
                                          {displayPeriod?.teacher || 'All days'}
                                        </div>
                                      </div>
                                    </td>
                                  );
                                }
                                const period = periodMap.get(slotKey);
                                const isActive = period ? isCurrentPeriod(day, period, slot) : false;
                                return (
                                  <td key={`${day}-${slotKey}`} className="px-3 sm:px-4 py-3 sm:py-4 align-top">
                                    {period ? (
                                      period.is_break ? (
                                        <div className={combine(
                                          "min-h-[86px] rounded-lg p-2 border flex flex-col justify-center transition-all duration-200",
                                          isActive ? (theme === 'dark' ? 'ring-2 ring-blue-400/70 shadow-lg' : 'ring-2 ring-blue-500/70 shadow-lg') : '',
                                          theme === 'dark' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
                                        )}>
                                          <div className="flex items-center gap-1 mb-1">
                                            <FaCoffee className={combine("h-3 w-3", theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
                                            <span className={combine("text-xs font-medium", get('text', 'primary'))}>{period.subject}</span>
                                          </div>
                                        </div>
                                      ) : (() => {
                                        const subjectColor = getSubjectColor(period.subject);
                                        return (
                                          <div
                                            className={combine(
                                              "min-h-[86px] rounded-lg border p-2 flex flex-col justify-center transition-all duration-200",
                                              isActive ? (theme === 'dark' ? 'ring-2 ring-blue-400/70 shadow-lg' : 'ring-2 ring-blue-500/70 shadow-lg') : ''
                                            )}
                                            style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                          >
                                            <div
                                              className={combine("font-medium text-xs sm:text-sm mb-1", !subjectColor ? get('text', 'primary') : '')}
                                              style={subjectColor ? { color: subjectColor.text } : undefined}
                                            >
                                              {period.subject}
                                            </div>
                                            <div
                                              className={combine("text-xs", !subjectColor ? get('text', 'secondary') : '')}
                                              style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                                            >
                                              {period.teacher}
                                            </div>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                      <div className={combine(
                                        "min-h-[86px] rounded-lg border flex items-center justify-center text-center",
                                        get('border', 'secondary'),
                                        get('bg', 'secondary')
                                      )}>
                                        <span className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>-</span>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div>
                <div className={getCardGradientClass('blue')}>
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:overflow-x-auto sm:gap-2 sm:pb-1 sm:justify-center">
                    {getAllDays().map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={combine(
                          "px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium whitespace-nowrap transition-all text-xs sm:text-sm",
                          selectedDay === day
                            ? combine(getPrimaryButtonClass(), "shadow-lg")
                            : getSecondaryButtonClass()
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 my-4">
                  <h4 className={combine("font-bold text-lg sm:text-xl flex items-center gap-3 justify-center sm:justify-start text-center sm:text-left", get('text', 'primary'))}>
                    <FaCalendarAlt className="h-5 w-5 sm:h-6 sm:w-6" />
                    {selectedDay}
                  </h4>
                  <div className={combine("flex items-center gap-2", get('text', 'tertiary'))}>
                    <FaClock className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{getPeriodsForDay(selectedDay).filter((p: any) => !p.is_break).length || 0} periods</span>
                  </div>
                </div>

                {getPeriodsForDay(selectedDay).length > 0 ? (
                  <div className={combine(
                    "rounded-xl overflow-hidden border",
                    get('bg', 'card'),
                    get('border', 'primary')
                  )}>
                    <div className="sm:hidden p-3 space-y-2">
                      {getPeriodsForDay(selectedDay).map((period: any, index: number) => (
                        <div key={`mobile-${index}`} className={combine("rounded-lg border p-3", get('border', 'primary'), get('bg', 'card'))}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={combine(
                                "h-7 w-7 rounded-lg flex items-center justify-center font-bold text-xs",
                                period.is_break
                                  ? theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-600'
                                  : theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                              )}>
                                {period.is_break ? <FaCoffee className="h-4 w-4" /> : period.period}
                              </div>
                              <span className={combine("font-medium text-sm", get('text', 'primary'))}>
                                {period.is_break ? period.subject : `Period ${period.period}`}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                            <div className={combine("flex items-center gap-1.5", get('text', 'secondary'))}>
                              <FaClock className="h-3.5 w-3.5" />
                              <span>{formatTimeForDisplay(period.time.split(' - ')[0])} - {formatTimeForDisplay(period.time.split(' - ')[1])}</span>
                            </div>
                            <div>
                              {(() => {
                                const subjectColor = period.is_break ? null : getSubjectColor(period.subject);
                                return (
                                  <div
                                    className={combine(
                                      "flex items-center gap-2 rounded-lg px-2.5 py-2 border mt-1",
                                      period.is_break
                                        ? theme === 'dark' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
                                        : !subjectColor ? combine(get('bg', 'secondary'), get('border', 'secondary')) : ''
                                    )}
                                    style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                  >
                                    <FaBook className={combine("h-3.5 w-3.5", !subjectColor ? get('text', 'secondary') : '')} />
                                    <span
                                      className={combine("text-xs font-medium", !subjectColor ? get('text', 'primary') : '')}
                                      style={subjectColor ? { color: subjectColor.text } : undefined}
                                    >
                                      {period.subject}
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div className={combine("text-xs", get('text', 'secondary'))}>
                              {period.is_break ? 'Break' : period.teacher}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="hidden sm:block w-full overflow-x-auto">
                      <table className="w-full min-w-[760px] xl:min-w-full">
                        <thead className={getTableHeaderClass()}>
                          <tr>
                            <th className={combine("px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>Period</th>
                            <th className={combine("px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>Time</th>
                            <th className={combine("px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>Subject</th>
                            <th className={combine("px-3 sm:px-6 py-2 sm:py-4 text-left text-xs sm:text-sm font-semibold", get('text', 'primary'))}>Teacher</th>
                          </tr>
                        </thead>
                        <tbody className={combine("divide-y", getTableRowClass())}>
                          {getPeriodsForDay(selectedDay).map((period: any, index: number) => (
                            <tr key={index} className="transition-colors hover:bg-[var(--color-bg-hover)]">
                              <td className="px-3 sm:px-6 py-2 sm:py-4">
                                <div className="flex items-center gap-3">
                                  <div className={combine(
                                    "h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm",
                                    period.is_break
                                      ? theme === 'dark' ? 'bg-amber-900/30 text-amber-300' : 'bg-amber-100 text-amber-600'
                                      : theme === 'dark' ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-600'
                                  )}>
                                    {period.is_break ? <FaCoffee className="h-5 w-5" /> : period.period}
                                  </div>
                                  <span className={combine("font-medium text-xs sm:text-sm", get('text', 'primary'))}>
                                    {period.is_break ? period.subject : `Period ${period.period}`}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-2 sm:py-4">
                                <div className={combine("flex items-center gap-2 text-xs sm:text-sm", get('text', 'primary'))}>
                                  <FaClock className="h-4 w-4" />
                                  <span>{formatTimeForDisplay(period.time.split(' - ')[0])} - {formatTimeForDisplay(period.time.split(' - ')[1])}</span>
                                </div>
                              </td>
                              <td className="px-3 sm:px-6 py-2 sm:py-4">
                                {(() => {
                                  const subjectColor = period.is_break ? null : getSubjectColor(period.subject);
                                  return (
                                    <div
                                      className={combine(
                                        "flex items-center gap-3 rounded-xl px-3 py-2 border",
                                        period.is_break
                                          ? theme === 'dark' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
                                          : !subjectColor ? (theme === 'dark' ? 'bg-emerald-900/20 border-emerald-700/40' : 'bg-emerald-100 border-emerald-200') : ''
                                      )}
                                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                    >
                                      <div
                                        className={combine(
                                          "p-2 rounded-xl",
                                          period.is_break
                                            ? theme === 'dark' ? 'bg-amber-900/30' : 'bg-amber-100'
                                            : !subjectColor ? (theme === 'dark' ? 'bg-emerald-900/30' : 'bg-emerald-100') : ''
                                        )}
                                        style={subjectColor ? { backgroundColor: 'rgba(255, 255, 255, 0.2)' } : undefined}
                                      >
                                        {period.is_break ? (
                                          <FaCoffee className={combine("h-4 w-4", theme === 'dark' ? 'text-amber-400' : 'text-amber-600')} />
                                        ) : (
                                          <FaBook className={combine("h-4 w-4", !subjectColor ? (theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600') : '')} />
                                        )}
                                      </div>
                                      <span
                                        className={combine("font-medium text-xs sm:text-sm", !subjectColor ? get('text', 'primary') : '')}
                                        style={subjectColor ? { color: subjectColor.text } : undefined}
                                      >
                                        {period.subject}
                                      </span>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td className="px-3 sm:px-6 py-2 sm:py-4">
                                <div className="flex items-center gap-3">
                                  <div className={combine(
                                    "p-2 rounded-xl",
                                    period.is_break
                                      ? theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                                      : theme === 'dark' ? 'bg-purple-900/30' : 'bg-purple-100'
                                  )}>
                                    <FaUsers className={combine(
                                      "h-4 w-4",
                                      period.is_break
                                        ? theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                                        : theme === 'dark' ? 'text-purple-400' : 'text-purple-600'
                                    )} />
                                  </div>
                                  <span className={combine("text-xs sm:text-sm", get('text', 'primary'))}>
                                    {period.is_break ? 'Break' : period.teacher}
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className={combine(
                    "text-center py-12 border-2 border-dashed rounded-xl",
                    get('border', 'secondary'),
                    get('bg', 'secondary')
                  )}>
                    <FaCalendarAlt className={combine("h-12 w-12 mx-auto mb-4", get('icon', 'secondary'))} />
                    <p className={combine("font-medium mb-2", get('text', 'primary'))}>
                      No timetable entries for {selectedDay}
                    </p>
                    <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>
                      No schedule has been created for this day yet.
                    </p>
                  </div>
                )}
              </div>
            )}

          </>
        )}

        {error && (
          <div className={combine(
            "mt-6 px-4 py-3 rounded-lg border text-xs sm:text-sm",
            theme === 'dark' ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          )}>
            <div className="flex items-center gap-2">
              <FaTimesCircle />
              {error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
