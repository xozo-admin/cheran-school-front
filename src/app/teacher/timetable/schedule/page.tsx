'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  FaCalendar,
  FaCalendarAlt,
  FaClock,
  FaBuilding,
  FaPrint,
  FaUndo,
  FaArrowLeft,
  FaArrowRight,
  FaBook,
} from 'react-icons/fa';
import { teacherApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

type ViewMode = 'weekly' | 'daily';

interface ScheduleItem {
  day: string;
  period_no: number;
  start_time: string;
  end_time: string;
  class_name: string;
  section_name: string;
  subject_name: string;
}

interface TeacherScheduleResponse {
  teacher?: string;
  year?: string;
  timetable?: Record<string, ScheduleItem[]>;
}

export default function MySchedule() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleData, setScheduleData] = useState<TeacherScheduleResponse | null>(null);
  const [teacherProfile, setTeacherProfile] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [classCarouselPage, setClassCarouselPage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(6);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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
    music: { bg: '#7C3AED', text: '#FFFFFF', border: '#7C3AED' },
    dance: { bg: '#E11D48', text: '#FFFFFF', border: '#E11D48' },
    'moral science': { bg: '#0284C7', text: '#FFFFFF', border: '#0284C7' },
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
    loadScheduleData();
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

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError('');

      const [profileResponse, scheduleResponse] = await Promise.all([
        teacherApi.profile.get(),
        teacherApi.timetable.mySchedule(),
      ]);

      setTeacherProfile(profileResponse.data?.data || profileResponse.data || null);
      setScheduleData(scheduleResponse.data?.data || scheduleResponse.data || null);
    } catch {
      setError('Error fetching schedule data');
    } finally {
      setLoading(false);
    }
  };

  const getAllDays = () => days;

  const getPeriodsForDay = (day: string) => {
    if (!scheduleData?.timetable?.[day]) return [];
    return [...scheduleData.timetable[day]].sort((a, b) => a.period_no - b.period_no);
  };

  const isTimetableEmpty = () => getAllDays().every((day) => getPeriodsForDay(day).length === 0);

  const getAllPeriods = () => {
    const periods = new Set<number>();
    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((period) => periods.add(period.period_no));
    });

    if (periods.size === 0) {
      return [1, 2, 3, 4, 5, 6, 7, 8];
    }

    return Array.from(periods).sort((a, b) => a - b);
  };

  const getWeeklyTimeSlots = () => {
    const allTimeSlots = new Map<string, { period: number; start: string; end: string }>();

    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((item) => {
        const start = formatTimeForDisplay(item.start_time);
        const end = formatTimeForDisplay(item.end_time);
        allTimeSlots.set(`${item.period_no}-${start}-${end}`, {
          period: item.period_no,
          start,
          end,
        });
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
      getPeriodsForDay(day).forEach((item) => {
        allSlots.push({
          start: formatTimeForDisplay(item.start_time),
          end: formatTimeForDisplay(item.end_time),
        });
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
      return { label: 'No class today', isActive: false };
    }

    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
    const activePeriod = todayPeriods.find((item) => {
      const [startHour, startMinute] = formatTimeForDisplay(item.start_time).split(':').map(Number);
      const [endHour, endMinute] = formatTimeForDisplay(item.end_time).split(':').map(Number);

      const startTotal = (startHour * 60) + startMinute;
      const endTotal = (endHour * 60) + endMinute;

      return currentMinutes >= startTotal && currentMinutes < endTotal;
    });

    if (!activePeriod) {
      return { label: 'No active class right now', isActive: false };
    }

    return {
      label: `Period ${activePeriod.period_no} • ${activePeriod.subject_name} • ${formatTimeForDisplay(activePeriod.start_time)} - ${formatTimeForDisplay(activePeriod.end_time)}`,
      isActive: true,
    };
  };

  const getCurrentDayLabel = () => currentTime.toLocaleDateString('en-US', { weekday: 'long' });

  const isCurrentSlot = (day: string, slot: { start: string; end: string }) => {
    if (day !== getCurrentDayLabel()) return false;
    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);
    const startTotal = (startHour * 60) + startMinute;
    const endTotal = (endHour * 60) + endMinute;
    return currentMinutes >= startTotal && currentMinutes < endTotal;
  };

  const getSubjectSummaries = () => {
    const subjectMap = new Map<string, { count: number; classes: Set<string> }>();

    getAllDays().forEach((day) => {
      getPeriodsForDay(day).forEach((period) => {
        const current = subjectMap.get(period.subject_name) || { count: 0, classes: new Set<string>() };
        current.count += 1;
        current.classes.add(`${period.class_name}-${period.section_name}`);
        subjectMap.set(period.subject_name, current);
      });
    });

    return Array.from(subjectMap.entries())
      .map(([subject, value]) => ({
        subject,
        count: value.count,
        classes: Array.from(value.classes),
      }))
      .sort((a, b) => b.count - a.count || a.subject.localeCompare(b.subject));
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getDayIndex = () => days.indexOf(selectedDay);

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentIndex = getDayIndex();
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedDay(days[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < days.length - 1) {
      setSelectedDay(days[currentIndex + 1]);
    }
  };

  const getTimeSlotColor = (periodNo: number) => {
    const colors = [
      'from-blue-500 to-blue-600',
      'from-green-500 to-green-600',
      'from-purple-500 to-purple-600',
      'from-yellow-500 to-yellow-600',
      'from-red-500 to-red-600',
      'from-indigo-500 to-indigo-600',
      'from-pink-500 to-pink-600',
      'from-teal-500 to-teal-600'
    ];
    return colors[(periodNo - 1) % colors.length] || 'from-gray-500 to-gray-600';
  };

  const handlePrint = () => {
    window.print();
  };

  const weeklyTimeSlots = useMemo(() => getWeeklyTimeSlots(), [scheduleData]);
  const currentPeriodDetails = useMemo(() => getCurrentPeriodDetails(), [scheduleData, currentTime]);
  const subjectSummaries = useMemo(() => getSubjectSummaries(), [scheduleData]);
  const todaySchedule = useMemo(() => getPeriodsForDay(selectedDay), [scheduleData, selectedDay]);
  const totalSubjectPages = Math.max(1, Math.ceil(subjectSummaries.length / cardsPerPage));
  const safeSubjectPage = Math.min(classCarouselPage, totalSubjectPages - 1);
  const visibleSubjects = subjectSummaries.slice(
    safeSubjectPage * cardsPerPage,
    (safeSubjectPage + 1) * cardsPerPage
  );

  if (loading) {
    return (
      <div className={combine(getBgClass(), 'flex items-center justify-center px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6')}>
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
            <FaCalendar className="absolute inset-0 m-auto text-blue-600 text-2xl" />
          </div>
          <div>
            <h3 className={combine("text-2xl font-bold mb-2", get('text', 'primary'))}>Loading Your Schedule</h3>
            <p className={get('text', 'secondary')}>Fetching your timetable and subject allocations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
      <div className="mx-auto w-full max-w-[1600px]">
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
                  <FaCalendar className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Schedule</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    {scheduleData?.year || 'Current Academic Year'} • Personal timetable
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
                  <div className="text-[11px] sm:text-xs text-blue-100">Teacher</div>
                  <div className="text-sm sm:text-base font-bold">
                    {teacherProfile?.name || scheduleData?.teacher || '—'}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Now</div>
                  <div className="text-sm sm:text-base font-bold">
                    {currentPeriodDetails.label}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isTimetableEmpty() ? (
          <div className={combine(
            "text-center py-12 sm:py-16 p-6 sm:p-8 border rounded-xl sm:rounded-2xl shadow-lg",
            theme === 'dark' ? 'bg-gradient-to-r from-gray-800 to-gray-900/40 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-white border-gray-200'
          )}>
            <div className={combine(
              "inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full mb-6",
              theme === 'dark' ? 'bg-blue-900/30' : 'bg-blue-100'
            )}>
              <FaCalendar className={combine("text-2xl sm:text-3xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
            </div>
            <h3 className={combine("text-lg sm:text-xl font-bold mb-3", get('text', 'primary'))}>No Schedule Available</h3>
            <p className={combine("text-sm sm:text-lg max-w-md mx-auto mb-8", get('text', 'secondary'))}>
              Your teaching schedule has not been published yet. Check again after the timetable is assigned.
            </p>
            <button
              onClick={loadScheduleData}
              className={combine(getPrimaryButtonClass(), "w-full sm:w-auto inline-flex items-center justify-center gap-2")}
            >
              <FaUndo className="text-xs sm:text-sm" />
              Refresh Schedule
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 min-[520px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
              <div className={getCardGradientClass('purple')}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Subjects</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {subjectSummaries.length}
                    </p>
                    <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>Active timetable subjects</p>
                  </div>
                  <FaBook className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-purple-400' : 'text-purple-600')} />
                </div>
              </div>

              <div className={getCardGradientClass('emerald')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Total Classes Today</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>{todaySchedule.length}</p>
                    <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>{selectedDay}</p>
                  </div>
                  <FaCalendar className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-emerald-400' : 'text-emerald-500')} />
                </div>
              </div>

              <div className={getCardGradientClass('blue')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Teaching Hours</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {(todaySchedule.reduce((total, item) => {
                        const minutes = (new Date(`2000-01-01T${item.end_time}`).getTime() - new Date(`2000-01-01T${item.start_time}`).getTime()) / 60000;
                        return total + minutes;
                      }, 0) / 60).toFixed(2)} hrs
                    </p>
                    <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>For selected day</p>
                  </div>
                  <FaClock className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-blue-400' : 'text-blue-500')} />
                </div>
              </div>

              <div className={getCardGradientClass('amber')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={combine("text-xs sm:text-sm font-medium", get('text', 'secondary'))}>Different Classes</p>
                    <p className={combine("text-xl sm:text-2xl md:text-3xl font-bold mt-1 sm:mt-2", get('text', 'primary'))}>
                      {new Set(todaySchedule.map((item) => `${item.class_name}-${item.section_name}`)).size}
                    </p>
                    <p className={combine("mt-2 text-xs", get('text', 'tertiary'))}>Unique class sections</p>
                  </div>
                  <FaBuilding className={combine("text-lg sm:text-xl md:text-2xl", theme === 'dark' ? 'text-amber-400' : 'text-amber-500')} />
                </div>
              </div>
            </div>

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
                      <FaArrowLeft className={combine("text-xs sm:text-sm", get('icon', 'primary'))} />
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
                      <FaArrowRight className={combine("text-xs sm:text-sm", get('icon', 'primary'))} />
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
                        {item.classes.join(', ')}
                      </div>
                    </div>
                  );
                }) : (
                  <div className={combine(
                    "col-span-full text-center py-4 sm:py-6 md:py-8",
                    get('text', 'secondary')
                  )}>
                    No subjects available
                  </div>
                )}
              </div>
            </div>

            <div className={combine(getCardGradientClass('blue'), "mb-6")}>
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
                "rounded-xl sm:rounded-2xl overflow-hidden border",
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
                      <col className="w-[140px]" />
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
                              <span className={combine("text-xs font-medium", get('text', 'tertiary'))}>Period {slot.period}</span>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className={combine("divide-y", getTableRowClass())}>
                      {getAllDays().map((day) => {
                        const dayPeriods = getPeriodsForDay(day);
                        const isToday = day === getCurrentDayLabel();

                        const periodMap = new Map<string, ScheduleItem>();
                        dayPeriods.forEach((item) => {
                          const start = formatTimeForDisplay(item.start_time);
                          const end = formatTimeForDisplay(item.end_time);
                          periodMap.set(`${item.period_no}-${start}-${end}`, item);
                        });

                        return (
                          <tr key={day} className="transition-colors hover:bg-[var(--color-bg-hover)]">
                            <td className={combine(
                              "px-3 sm:px-4 py-3 sm:py-4",
                              isToday
                                ? combine(
                                    "animate-pulse",
                                    theme === 'dark' ? "bg-blue-950/30" : "bg-blue-50/60"
                                  )
                                : ""
                            )}>
                              <div className="flex items-center gap-2 min-w-0">
                                <FaCalendarAlt className={combine("h-4 w-4 shrink-0", theme === 'dark' ? 'text-blue-400' : 'text-blue-600')} />
                                <span className={combine("font-medium text-xs sm:text-sm", get('text', 'primary'))}>{day}</span>
                              </div>
                            </td>
                            {weeklyTimeSlots.map(([slotKey, slot]) => {
                              const period = periodMap.get(slotKey);
                              const isActiveSlot = isCurrentSlot(day, slot);
                              return (
                                <td
                                  key={`${day}-${slotKey}`}
                                  className={combine(
                                    "px-3 sm:px-4 py-3 sm:py-4 align-top",
                                    isActiveSlot
                                      ? (theme === 'dark' ? "bg-blue-950/40" : "bg-blue-50/70")
                                      : ""
                                  )}
                                >
                                  {period ? (() => {
                                    const subjectColor = getSubjectColor(period.subject_name);
                                    return (
                                      <div
                                        className={combine(
                                          "min-h-[86px] rounded-lg border p-2 flex flex-col justify-center",
                                          isActiveSlot ? "ring-2 ring-blue-400/60 animate-pulse" : ""
                                        )}
                                        style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                      >
                                        <div
                                          className={combine("font-medium text-xs sm:text-sm mb-1", !subjectColor ? get('text', 'primary') : '')}
                                          style={subjectColor ? { color: subjectColor.text } : undefined}
                                        >
                                          {period.subject_name}
                                        </div>
                                        <div
                                          className={combine("text-xs", !subjectColor ? get('text', 'secondary') : '')}
                                          style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                                        >
                                          Class {period.class_name}-{period.section_name}
                                        </div>
                                      </div>
                                    );
                                  })() : (
                                    <div className={combine(
                                      "min-h-[86px] rounded-lg border border-dashed p-2 flex items-center justify-center text-xs",
                                      get('text', 'tertiary'),
                                      get('border', 'primary'),
                                      isActiveSlot ? "ring-2 ring-blue-400/50 animate-pulse" : ""
                                    )}>
                                      Free
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6 mb-6">
                <div className={getCardGradientClass('blue')}>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => navigateDay('prev')}
                      disabled={getDayIndex() === 0}
                      className={combine(
                        "p-2 rounded-lg transition-colors",
                        getDayIndex() === 0
                          ? combine(get('text', 'tertiary'), 'cursor-not-allowed')
                          : combine(get('text', 'secondary'), 'hover:bg-[var(--color-bg-hover)]')
                      )}
                    >
                      <FaArrowLeft className="text-base sm:text-xl" />
                    </button>

                    <div className="flex flex-1 justify-center px-2">
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 w-full max-w-3xl">
                        {days.map((day) => (
                          <button
                            key={day}
                            onClick={() => setSelectedDay(day)}
                            className={combine(
                              "px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-200 w-full",
                              selectedDay === day
                                ? getPrimaryButtonClass()
                                : getSecondaryButtonClass()
                            )}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={() => navigateDay('next')}
                      disabled={getDayIndex() === days.length - 1}
                      className={combine(
                        "p-2 rounded-lg transition-colors",
                        getDayIndex() === days.length - 1
                          ? combine(get('text', 'tertiary'), 'cursor-not-allowed')
                          : combine(get('text', 'secondary'), 'hover:bg-[var(--color-bg-hover)]')
                      )}
                    >
                      <FaArrowRight className="text-base sm:text-xl" />
                    </button>
                  </div>
                </div>

                <div className={combine(
                  "rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white",
                  theme === 'dark'
                    ? "bg-gradient-to-r from-blue-700 to-blue-800"
                    : "bg-gradient-to-r from-blue-500 to-blue-600"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{selectedDay}'s Schedule</h2>
                      <p className="text-xs sm:text-sm opacity-90">
                        {todaySchedule.length} classes • {teacherProfile?.name || scheduleData?.teacher || 'Your'} Teaching Schedule
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl sm:text-3xl font-bold">
                        {todaySchedule.length > 0 ? formatTime(todaySchedule[0].start_time) : 'No classes'}
                      </div>
                      <p className="opacity-90 text-xs sm:text-sm">Start Time</p>
                    </div>
                  </div>
                </div>

                {todaySchedule.length > 0 ? (
                  todaySchedule.map((classItem, index) => {
                    const subjectColor = getSubjectColor(classItem.subject_name);

                    return (
                    <div
                      key={`${classItem.period_no}-${index}`}
                      className={combine(
                        "rounded-xl sm:rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 border",
                        !subjectColor ? get('bg', 'card') : '',
                        get('border', 'primary')
                      )}
                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                    >
                      <div className="flex items-start p-3 sm:p-4">
                        <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-white font-bold text-lg sm:text-xl bg-gradient-to-r ${getTimeSlotColor(classItem.period_no)} mr-3 sm:mr-4 flex-shrink-0`}>
                          {classItem.period_no}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                            <div className="min-w-0">
                              <h3
                                className={combine("text-base sm:text-lg font-bold break-words", !subjectColor ? get('text', 'primary') : '')}
                                style={subjectColor ? { color: subjectColor.text } : undefined}
                              >
                                {classItem.subject_name}
                              </h3>
                              <div className="flex flex-col lg:flex-row lg:items-center gap-1.5 sm:gap-2 lg:gap-4 mt-1.5 sm:mt-2">
                                <div
                                  className={combine("flex items-center gap-2 text-xs sm:text-sm", !subjectColor ? get('text', 'secondary') : '')}
                                  style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                                >
                                  <FaClock />
                                  <span>{formatTime(classItem.start_time)} - {formatTime(classItem.end_time)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="text-left sm:text-right">
                              <div
                                className={combine("text-xs", !subjectColor ? get('text', 'tertiary') : '')}
                                style={subjectColor ? { color: subjectColor.text, opacity: 0.84 } : undefined}
                              >
                                Period {classItem.period_no}
                              </div>
                              <div
                                className={combine("mt-1 sm:mt-1.5 text-xs sm:text-sm", !subjectColor ? get('text', 'secondary') : '')}
                                style={subjectColor ? { color: subjectColor.text, opacity: 0.92 } : undefined}
                              >
                                Duration: {Math.round((new Date(`2000-01-01T${classItem.end_time}`).getTime() - new Date(`2000-01-01T${classItem.start_time}`).getTime()) / 60000)} minutes
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                  })
                ) : (
                  <div className={combine(
                    "rounded-xl sm:rounded-2xl shadow-lg p-8 sm:p-10 text-center border",
                    get('bg', 'card'),
                    get('border', 'primary')
                  )}>
                    <FaCalendar className={combine("text-5xl sm:text-6xl mx-auto mb-4", get('text', 'tertiary'))} />
                    <h3 className={combine("text-lg sm:text-xl font-semibold", get('text', 'secondary'))}>No classes scheduled</h3>
                    <p className={combine("text-xs sm:text-sm", get('text', 'tertiary'))}>You have no classes scheduled for {selectedDay}</p>
                    <button
                      onClick={() => setSelectedDay(days[0])}
                      className={combine(getPrimaryButtonClass(), "mt-4")}
                    >
                      View Monday's Schedule
                    </button>
                  </div>
                )}
              </div>
            )}

          </>
        )}

        {error && (
          <div className={combine(
            "mt-6 sm:mt-8 p-4 sm:p-6 border rounded-xl sm:rounded-2xl shadow-lg",
            theme === 'dark' ? 'bg-gradient-to-r from-red-950/30 to-gray-900/40 border-red-900/50 text-red-300' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200 text-red-700'
          )}>
            <div className="flex items-center gap-4">
              <div className={combine("p-3 rounded-xl", theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100')}>
                <FaClock className={combine("text-xl", theme === 'dark' ? 'text-red-400' : 'text-red-600')} />
              </div>
              <div className="flex-1">
                <h4 className={combine("font-bold text-sm sm:text-base", get('text', 'primary'))}>Error Loading Schedule</h4>
                <p className="text-sm sm:text-base">{error}</p>
              </div>
              <button
                onClick={loadScheduleData}
                className={combine(getPrimaryButtonClass(), "w-auto")}
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
