// app/student/academics/timetable/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  FaCalendarAlt, 
  FaClock, 
  FaUserTie, 
  FaBook,
  FaSync,
  FaChevronLeft,
  FaChevronRight,
  FaPrint,
  FaDownload,
  FaTimes
} from 'react-icons/fa';
import { toastError, toastInfo } from '@/lib/toast';
import { studentApi } from '@/lib/api';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface ClassPeriod {
  period: number;
  time: string;
  subject: string;
  teacher: string;
  room?: string;
  is_break?: boolean;
  is_substitution?: boolean;
}

interface TimetableDay {
  [day: string]: ClassPeriod[];
}

interface TimetableResponse {
  class: string;
  timetable: TimetableDay;
}

interface CurrentClass {
  subject: string;
  time: string;
  teacher: string;
  period?: number;
  is_substitution: boolean;
  is_break?: boolean;
}

interface CurrentClassResponse {
  status: number;
  day: string;
  current_class: CurrentClass | null;
  next_class: CurrentClass | null;
}

// Remove Sunday from days
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetablePage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(true);
  const [timetable, setTimetable] = useState<TimetableResponse | null>(null);
  const [currentClass, setCurrentClass] = useState<CurrentClassResponse | null>(null);
  const [currentWeek, setCurrentWeek] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noClassAssigned, setNoClassAssigned] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date());

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
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl transition-all duration-200 font-medium',
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

  const fetchTimetableData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setNoClassAssigned(false);
      
      // Fetch weekly timetable
      const timetableRes = await studentApi.timetable.myTimetable();
      const timetableData = timetableRes.data?.data || timetableRes.data;
      if (timetableData?.error) {
        setTimetable(null);
        setErrorMessage(timetableData.error);
        if (timetableRes.status === 400 && timetableData.error === 'No class assigned') {
          setNoClassAssigned(true);
        }
      } else {
        setTimetable(timetableData);
      }

      // Fetch current/next class
      try {
        const currentRes = await studentApi.timetable.dashboardNow();
        const currentData = currentRes.data?.data || currentRes.data;
        setCurrentClass(currentData);
      } catch (err: any) {
        if (err?.response?.status === 404) {
          // No current/next class found
          setCurrentClass({
            status: 404,
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            current_class: null,
            next_class: null
          });
          return;
        }
        if (err?.response?.status === 400) {
          setCurrentClass({
            status: 400,
            day: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
            current_class: null,
            next_class: null
          });
          return;
        }
        throw err;
      }

    } catch (error: any) {
      console.error('Error fetching timetable:', error);
      const message = error?.response?.data?.error || error?.message || 'Failed to load timetable';
      setErrorMessage(message);
      if (error?.response?.status === 400 && error?.response?.data?.error === 'No class assigned') {
        setNoClassAssigned(true);
      }
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetableData();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchTimetableData();
  };

  const handlePrintTimetable = () => {
    window.print();
  };

  const handleDownloadTimetable = async () => {
    try {
      toastInfo('Downloading timetable...');
      // In a real app, you would generate a PDF here
      setTimeout(() => {
        toastInfo('Timetable downloaded successfully');
      }, 1000);
    } catch (error) {
      toastError('Failed to download timetable');
    }
  };

  const parseTimeToMinutes = (timeString: string) => {
    const clean = timeString.trim();
    if (!clean) return 0;

    const ampmMatch = clean.match(/(AM|PM)$/i);
    if (ampmMatch) {
      const [timePart, meridiem] = clean.split(' ');
      const [hRaw, mRaw = '0', sRaw = '0'] = timePart.split(':');
      let hours = Number(hRaw);
      const minutes = Number(mRaw);
      if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
      if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes + Number(sRaw) / 60;
    }

    const [hours, minutes = '0'] = clean.split(':');
    return Number(hours) * 60 + Number(minutes);
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const clean = timeString.trim();
    if (/(AM|PM)$/i.test(clean)) return clean.toUpperCase();
    const [hours, minutes = '0'] = clean.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes));
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatTimeRange = (timeRange: string) => {
    if (!timeRange) return '';
    const [start, end] = timeRange.split(' - ').map(part => part.trim());
    if (!end) return formatTime(start);
    return `${formatTime(start)} - ${formatTime(end)}`;
  };

  const getTimeRangeKey = (timeRange: string) => {
    if (!timeRange) return '';
    const [start, end] = timeRange.split(' - ').map(part => part.trim());
    const startKey = parseTimeToMinutes(start);
    const endKey = parseTimeToMinutes(end || start);
    return `${startKey}-${endKey}`;
  };

  const getAllTimeSlots = () => {
    if (!timetable?.timetable) return [];
    const timeSet = new Set<string>();
    daysOfWeek.forEach(day => {
      const dayClasses = timetable.timetable[day] || [];
      dayClasses.forEach(cls => {
        if (cls.time) timeSet.add(cls.time);
      });
    });
    return Array.from(timeSet).sort((a, b) => {
      const aStart = parseTimeToMinutes(a.split(' - ')[0] || a);
      const bStart = parseTimeToMinutes(b.split(' - ')[0] || b);
      return aStart - bStart;
    });
  };

  const getTimeSlotMeta = () => {
    if (!timetable?.timetable) return {};
    const meta: Record<string, { period?: number; is_break?: boolean }> = {};
    daysOfWeek.forEach(day => {
      const dayClasses = timetable.timetable[day] || [];
      dayClasses.forEach(cls => {
        if (!cls.time) return;
        if (!meta[cls.time]) {
          meta[cls.time] = { period: cls.period, is_break: !!cls.is_break };
        } else {
          if ((meta[cls.time].period ?? 0) === 0 && cls.period > 0) {
            meta[cls.time].period = cls.period;
          }
          meta[cls.time].is_break = meta[cls.time].is_break || !!cls.is_break;
        }
      });
    });
    return meta;
  };

  const getClassForDayAndTime = (day: string, timeSlot: string) => {
    if (!timetable?.timetable) return null;
    const dayClasses = timetable.timetable[day] || [];
    return dayClasses.find(cls => cls.time === timeSlot) || null;
  };

  const getInstructionalPeriods = () => {
    if (!timetable?.timetable) return [];
    const periodsSet = new Set<number>();
    daysOfWeek.forEach(day => {
      const dayClasses = timetable.timetable[day] || [];
      dayClasses.forEach(cls => {
        if (cls.period > 0) periodsSet.add(cls.period);
      });
    });
    return Array.from(periodsSet).sort((a, b) => a - b);
  };

  const getAllDays = () => daysOfWeek;

  const getPeriodsForDay = (day: string) => {
    if (!timetable?.timetable?.[day]) return [];
    return timetable.timetable[day];
  };

  const formatTimeForDisplay = (time: string) => time.substring(0, 5);

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
      getInstructionalPeriods().forEach((period) => {
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

  const isCurrentPeriod = (day: string, period: any, slot?: { start: string; end: string }) => {
    const today = currentTime.toLocaleDateString('en-US', { weekday: 'long' });
    if (day !== today || !period) return false;

    const [startRaw, endRaw] = (period.time || '').split(' - ');
    const startStr = startRaw ? formatTimeForDisplay(startRaw) : slot?.start;
    const endStr = endRaw ? formatTimeForDisplay(endRaw) : slot?.end;
    if (!startStr || !endStr) return false;

    const startTotal = parseTimeToMinutes(startStr);
    const endTotal = parseTimeToMinutes(endStr);
    const currentMinutes = (currentTime.getHours() * 60) + currentTime.getMinutes();

    return currentMinutes >= startTotal && currentMinutes < endTotal;
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

      const startTotal = parseTimeToMinutes(formatTimeForDisplay(startRaw));
      const endTotal = parseTimeToMinutes(formatTimeForDisplay(endRaw));

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

  if (loading) {
    return (
      <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className={`dashboard-typography px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6 ${getBgClass()} transition-colors duration-200`}>
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="flex items-center justify-center h-96">
            <div className={combine(
              "p-8 rounded-xl shadow-lg text-center max-w-md",
              get('bg', 'card'),
              get('border', 'primary'),
              'border'
            )}>
              <h2 className={combine("text-xl font-bold mb-2", get('text', 'primary'))}>
                {noClassAssigned ? 'No Class Assigned' : 'Failed to Load Timetable'}
              </h2>
              <p className={combine("mb-6", get('text', 'secondary'))}>
                {errorMessage}
              </p>
              <button
                onClick={fetchTimetableData}
                className={getPrimaryButtonClass()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const timeSlots = getAllTimeSlots();
  const timeSlotMeta = getTimeSlotMeta();
  const instructionalPeriods = getInstructionalPeriods();
  const weeklyTimeSlots = getWeeklyTimeSlots();
  const currentPeriodDetails = getCurrentPeriodDetails();
  const schoolHoursLabel = getSchoolHoursLabel();
  const nextPeriodLabel = currentClass?.next_class
    ? `${currentClass.next_class.is_break ? 'Break' : currentClass.next_class.period ? `Period ${currentClass.next_class.period}` : 'Next Period'} • ${currentClass.next_class.subject || 'Subject'} • ${formatTimeRange(currentClass.next_class.time)}`
    : 'No next class';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });

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
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Timetable</h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    {timetable?.class || 'Your Class'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-3">
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto min-w-0">
                  <div className="text-[11px] sm:text-xs text-blue-100">School Hours</div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold leading-tight break-words">
                    {schoolHoursLabel.replace('School hours: ', '')}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto min-w-0">
                  <div className="text-[11px] sm:text-xs text-blue-100">Current Period</div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold leading-tight break-words max-w-[240px] sm:max-w-none">
                    {currentPeriodDetails.label.replace('Current period: ', '')}
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto min-w-0">
                  <div className="text-[11px] sm:text-xs text-blue-100">Next Period</div>
                  <div className="text-xs sm:text-sm lg:text-base font-bold leading-tight break-words max-w-[240px] sm:max-w-none">
                    {nextPeriodLabel}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current/Next Class Card */}
          {currentClass && (currentClass.current_class || currentClass.next_class) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Current Class Card */}
              {currentClass.current_class ? (
                <div className={getCardGradientClass('blue')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-lg">
                      <FaClock className={combine('text-lg sm:text-xl', get('icon', 'primary'))} />
                    </div>
                    <div>
                      <h3 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Current Class</h3>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{currentClass.day}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {(() => {
                      const color = getSubjectColor(currentClass.current_class.subject || '');
                      return (
                        <div
                          className={combine(
                            'rounded-lg p-3 border text-sm sm:text-base font-semibold',
                            color ? '' : combine(get('bg', 'card'), get('border', 'primary'), get('text', 'primary'))
                          )}
                          style={color ? getSubjectGradientStyle(color) : undefined}
                        >
                          {currentClass.current_class.subject}
                        </div>
                      );
                    })()}

                    <div className={combine('grid gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                      <div className="flex items-center gap-2">
                        <FaClock className="opacity-80" />
                        <span>{formatTimeRange(currentClass.current_class.time)}</span>
                      </div>
                      {!currentClass.current_class.is_break && (
                        <div className="flex items-center gap-2">
                          <FaUserTie className="opacity-80" />
                          <span>{currentClass.current_class.teacher}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FaBook className="opacity-80" />
                        <span>
                          {currentClass.current_class.is_break
                            ? 'Break'
                            : currentClass.current_class.period
                              ? `Period ${currentClass.current_class.period}`
                              : 'Period -'}
                        </span>
                        {currentClass.current_class.is_substitution && (
                          <span
                            className={combine(
                              "text-[10px] sm:text-xs px-2 py-0.5 rounded-full",
                              theme === 'dark'
                                ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/40"
                                : "bg-yellow-500 text-white"
                            )}
                          >
                            Substitution
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={getCardGradientClass('indigo')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-lg">
                      <FaClock className={combine('text-lg sm:text-xl', get('icon', 'primary'))} />
                    </div>
                    <div>
                      <h3 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Current Class</h3>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{currentClass.day}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>No Class Currently</h4>
                    <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>No classes are currently in session.</p>
                  </div>
                </div>
              )}

              {/* Next Class Card */}
              {currentClass.next_class ? (
                <div className={getCardGradientClass('purple')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-lg">
                      <FaClock className={combine('text-lg sm:text-xl', get('icon', 'primary'))} />
                    </div>
                    <div>
                      <h3 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Next Class</h3>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{currentClass.day}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {(() => {
                      const color = getSubjectColor(currentClass.next_class.subject || '');
                      return (
                        <div
                          className={combine(
                            'rounded-lg p-3 border text-sm sm:text-base font-semibold',
                            color ? '' : combine(get('bg', 'card'), get('border', 'primary'), get('text', 'primary'))
                          )}
                          style={color ? getSubjectGradientStyle(color) : undefined}
                        >
                          {currentClass.next_class.subject}
                        </div>
                      );
                    })()}

                    <div className={combine('grid gap-2 text-xs sm:text-sm', get('text', 'secondary'))}>
                      <div className="flex items-center gap-2">
                        <FaClock className="opacity-80" />
                        <span>{formatTimeRange(currentClass.next_class.time)}</span>
                      </div>
                      {!currentClass.next_class.is_break && (
                        <div className="flex items-center gap-2">
                          <FaUserTie className="opacity-80" />
                          <span>{currentClass.next_class.teacher}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <FaBook className="opacity-80" />
                        <span>
                          {currentClass.next_class.is_break
                            ? 'Break'
                            : currentClass.next_class.period
                              ? `Period ${currentClass.next_class.period}`
                              : 'Period -'}
                        </span>
                        {currentClass.next_class.is_substitution && (
                          <span
                            className={combine(
                              "text-[10px] sm:text-xs px-2 py-0.5 rounded-full",
                              theme === 'dark'
                                ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/40"
                                : "bg-yellow-500 text-white"
                            )}
                          >
                            Substitution
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={getCardGradientClass('indigo')}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 sm:p-3 bg-purple-500/10 rounded-lg">
                      <FaClock className={combine('text-lg sm:text-xl', get('icon', 'primary'))} />
                    </div>
                    <div>
                      <h3 className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>Next Class</h3>
                      <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>{currentClass.day}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className={combine("text-base sm:text-lg font-bold", get('text', 'primary'))}>No Upcoming Class</h4>
                    <p className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>No more classes scheduled for today.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          


          {/* Timetable Grid View */}
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

            {weeklyTimeSlots.length === 0 ? (
              <div className={combine("p-10 text-center text-sm sm:text-base", get('text', 'secondary'))}>
                No timetable data available for your class.
              </div>
            ) : (
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
                                        isActive ? (theme === 'dark' ? 'ring-2 ring-blue-400/70 shadow-lg animate-pulse' : 'ring-2 ring-blue-500/70 shadow-lg animate-pulse') : '',
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
                                      {!displayPeriod?.is_break && (
                                        <>
                                          <div className={combine("font-semibold text-xs sm:text-sm", subjectColor ? '' : get('text', 'primary'))}>
                                            {displayPeriod?.subject || 'Period'}
                                          </div>
                                          {displayPeriod?.teacher && (
                                            <div className={combine("text-[10px] sm:text-xs mt-1", subjectColor ? '' : get('text', 'tertiary'))}>
                                              {displayPeriod.teacher}
                                            </div>
                                          )}
                                        </>
                                      )}
                                      {displayPeriod?.is_substitution && (
                                        <div
                                          className={combine(
                                            "mt-2 text-[10px] sm:text-xs px-2 py-0.5 rounded-full",
                                            theme === 'dark'
                                              ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/40"
                                              : "bg-yellow-500 text-white"
                                          )}
                                        >
                                          Substitution
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                );
                              }

                              const period = periodMap.get(slotKey);
                              const isActive = period ? isCurrentPeriod(day, period, slot) : false;
                              const subjectColor = period && !period.is_break
                                ? getSubjectColor(period.subject)
                                : null;

                              return (
                                <td key={`${day}-${slotKey}`} className="px-3 sm:px-4 py-3 sm:py-4 align-top">
                                  {period ? (
                                    <div
                                      className={combine(
                                        "min-h-[86px] rounded-lg border p-2 flex flex-col items-start justify-between text-left transition-all duration-200",
                                        isActive ? (theme === 'dark' ? 'ring-2 ring-blue-400/70 shadow-lg animate-pulse' : 'ring-2 ring-blue-500/70 shadow-lg animate-pulse') : '',
                                        period.is_break
                                          ? theme === 'dark' ? 'bg-amber-900/20 border-amber-700/40' : 'bg-amber-50 border-amber-200'
                                          : !subjectColor ? combine(get('bg', 'secondary'), get('border', 'secondary')) : ''
                                      )}
                                      style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                                    >
                                      <div className="flex flex-col gap-1">
                                        <span className={combine("text-xs sm:text-sm font-semibold", subjectColor ? '' : get('text', 'primary'))}>
                                          {period.subject}
                                        </span>
                                        {!period.is_break && period.teacher && (
                                          <span className={combine("text-[10px] sm:text-xs", subjectColor ? '' : get('text', 'tertiary'))}>
                                            {period.teacher}
                                          </span>
                                        )}
                                        {period.is_break && (
                                          <span className={combine("text-[10px] sm:text-xs", subjectColor ? '' : get('text', 'tertiary'))}>
                                            Break
                                          </span>
                                        )}
                                      </div>
                                      {period.is_substitution && (
                                        <span
                                          className={combine(
                                            "mt-2 text-[10px] sm:text-xs px-2 py-0.5 rounded-full",
                                            theme === 'dark'
                                              ? "bg-yellow-400/20 text-yellow-200 border border-yellow-400/40"
                                              : "bg-yellow-500 text-white"
                                          )}
                                        >
                                          Substitution
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <div className={combine(
                                      "min-h-[86px] rounded-lg border p-2 flex items-center justify-center text-xs sm:text-sm text-center",
                                      get('bg', 'secondary'),
                                      get('border', 'secondary'),
                                      get('text', 'tertiary')
                                    )}>
                                      Not Allocated
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
            )}
          </div>

          {/* Summary Statistics */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className={getCardGradientClass('blue')}>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {instructionalPeriods.length}
              </div>
              <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Total Periods</div>
            </div>
            <div className={getCardGradientClass('emerald')}>
              <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {daysOfWeek.reduce((total, day) => {
                  if (!timetable?.timetable) return total;
                  const dayClasses = timetable.timetable[day] || [];
                  const allocated = dayClasses.filter(cls => !cls.is_break).length;
                  return total + allocated;
                }, 0)}
              </div>
              <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Allocated Classes</div>
            </div>
            <div className={getCardGradientClass('amber')}>
              <div className="text-2xl sm:text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                {daysOfWeek.reduce((total, day) => {
                  const totalPeriods = instructionalPeriods.length;
                  if (!timetable?.timetable) return total + totalPeriods;
                  const dayClasses = timetable.timetable[day] || [];
                  const allocated = dayClasses.filter(cls => !cls.is_break).length;
                  return total + (totalPeriods - allocated);
                }, 0)}
              </div>
              <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Free Periods</div>
            </div>
            <div className={getCardGradientClass('purple')}>
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
                {currentClass?.current_class ? 1 : 0}
              </div>
              <div className={combine("text-xs sm:text-sm", get('text', 'secondary'))}>Ongoing Now</div>
            </div>
          </div>
      </div>
    </div>
  );
}
