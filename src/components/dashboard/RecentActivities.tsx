// src/components/dashboard/RecentActivities.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Maximize2,
  Minimize2,
  Clock,
  User,
  Tag,
  ChevronRight,
  Filter,
  Calendar,
  RefreshCw,
  AlertCircle,
  Users,
  BookOpen,
  Package,
  Megaphone,
  ClipboardList,
  GraduationCap,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  Download,
  Printer,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { FaExpand } from 'react-icons/fa';

import { adminApi } from '@/lib/api';
import axios from 'axios'; // keep only for error type check

// Types based on API
interface ActivityItem {
  date: string;
  what_do: string;
  who_do: string;
  role: string;
  title: string;
  category: string;
  status?: string;
  status_color?: string;
  timestamp: string;
  message?: string;
  count?: number;
  quantity?: number;
  item?: string;
  action?: string;
  type?: string;
  target?: string;
  subject?: string;
  exam?: string;
  class?: string;
  section?: string;
  students_count?: number;
  average_percentage?: number;
}

interface RecentActivitiesResponse {
  status: number;
  message: string;
  date_range: {
    from: string;
    to: string;
  };
  summary: {
    total_activities: number;
    categories: Record<string, number>;
    roles: Record<string, number>;
  };
  activities: ActivityItem[];
}

interface ActivitySummaryResponse {
  status: number;
  date: string;
  data: {
    today: {
      teacher_attendance: { count: number; details: string; icon: string };
      staff_attendance: { count: number; details: string; icon: string };
      student_attendance: { count: number; details: string; section_wise: string[]; icon: string };
      substitutions: { count: number; details: string; icon: string };
      staff_tasks: { completed: number; pending: number; total: number; details: string; icon: string };
      leave_requests: { pending: number; approved: number; rejected: number; total: number; details: string; icon: string };
      inventory_updates: { count: number; details: string; icon: string };
      announcements: { count: number; details: string; breakdown: Record<string, number>; icon: string };
      exam_marks: { count: number; details: string; icon: string };
      mark_change_requests: { pending: number; details: string; icon: string };
      overall: { total_activities: number; details: string; icon: string };
    };
  };
}

// Category icons and colors mapping
const categoryConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  attendance: { icon: User, color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  student_attendance: { icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  substitution: { icon: RefreshCw, color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  staff_work: { icon: Briefcase, color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  leave: { icon: Calendar, color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  inventory: { icon: Package, color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  announcement: { icon: Megaphone, color: 'text-pink-600', bgColor: 'bg-pink-100 dark:bg-pink-900/30' },
  exam: { icon: BookOpen, color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  transport: { icon: ClipboardList, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
};

const StatusBadge = ({ status, color }: { status?: string; color?: string }) => {
  if (!status) return null;

  const statusColors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
    Late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
    Approved: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
    'In Progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400',
    Completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
    PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-400',
    error: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400',
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}`}>
      {status}
    </span>
  );
};

const ActivityCard = ({ activity }: { activity: ActivityItem }) => {
  const config = categoryConfig[activity.category] || {
    icon: Activity,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  };

  const Icon = config.icon;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-lg transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${config.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white mb-1">
                {activity.title || activity.what_do}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {activity.who_do}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5" />
                  {activity.role}
                </span>
                <span className="text-gray-400">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>

              {/* Additional details */}
              {activity.message && (
                <p className="mt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2.5 sm:p-3 rounded-lg border border-gray-100 dark:border-gray-800">
                  {activity.message}
                </p>
              )}

              {/* Stats for specific categories */}
              {activity.category === 'exam' && activity.average_percentage && (
                <div className="mt-2 flex items-center gap-4">
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Students:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{activity.students_count}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Average:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{activity.average_percentage}%</span>
                  </div>
                </div>
              )}

              {activity.quantity && activity.item && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs font-medium px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">
                    {activity.item}: {activity.quantity} units
                  </span>
                </div>
              )}
            </div>

            {/* Status badge */}
            {activity.status && <StatusBadge status={activity.status} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityCardMinimal = ({ activity }: { activity: ActivityItem }) => {
  const config = categoryConfig[activity.category] || {
    icon: Activity,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  };

  const Icon = config.icon;

  return (
    <div className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-lg transition-all duration-300 hover:border-gray-300 dark:hover:border-gray-600">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg ${config.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white truncate">
            {activity.title || activity.what_do}
          </h4>
          <div className="mt-1 flex items-center gap-1 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  title,
  count,
  details,
  icon: Icon,
  color
}: {
  title: string;
  count: number;
  details: string;
  icon: any;
  color: string;
}) => {
  if (count === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md transition-all">
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-lg ${color} bg-opacity-20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{details}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Full Screen Modal
const FullScreenActivitiesModal = ({
  isOpen,
  onClose,
  activities,
  summary,
  isMobileScreen = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  activities: ActivityItem[];
  summary: RecentActivitiesResponse['summary'] | null;
  isMobileScreen?: boolean;
}) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.category === filter;
    const matchesSearch = searchTerm === '' ||
      activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.who_do?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.message?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const categories = [
    { id: 'all', name: 'All Activities' },
    ...Object.entries(summary?.categories || {}).map(([key]) => ({
      id: key,
      name: key.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative z-10 bg-white dark:bg-gray-900 shadow-2xl flex flex-col ${isMobileScreen
            ? 'w-[100vw] h-[100dvh] rounded-none overflow-y-auto'
            : 'w-[96vw] sm:w-[94vw] lg:w-[90vw] xl:w-[84vw] h-[92vh] rounded-xl sm:rounded-2xl overflow-hidden'
          }`}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Recent Activities - Full View
                </h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {summary?.total_activities || 0} total activities • Real-time activity log
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Print"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={() => {/* Add export functionality */ }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4" />
              <span>Exit Full Screen</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">Filter:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilter(cat.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm rounded-lg transition-colors ${filter === cat.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            <div className="flex-1 flex justify-end">
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-auto px-3 sm:px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Activities Grid */}
        <div className="flex-1 overflow-auto p-3 sm:p-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
            {filteredActivities.map((activity, index) => (
              <ActivityCard key={index} activity={activity} />
            ))}
          </div>

          {filteredActivities.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No activities found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your filters or search term
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Last updated: {format(new Date(), 'PPpp')}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Press</span>
              <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd>
              <span className="text-xs">to exit</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Recent Activities Component
export const RecentActivities = ({
  isFullScreen = false,
  onCloseFullScreen = () => { }
}: {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [summary, setSummary] = useState<RecentActivitiesResponse['summary'] | null>(null);
  const [activitySummary, setActivitySummary] = useState<ActivitySummaryResponse['data']['today'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const previewListRef = useRef<HTMLDivElement | null>(null);
  const measureListRef = useRef<HTMLDivElement | null>(null);
  const [hasPreviewOverflow, setHasPreviewOverflow] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [isMobileScreen, setIsMobileScreen] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    const handleViewport = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  useEffect(() => {
  const viewport = previewListRef.current;
  const measureList = measureListRef.current;

  if (!viewport || !measureList || loading) {
    setHasPreviewOverflow(false);
    setVisibleCount(0);
    return;
  }

  const measureVisibleCards = () => {
    // Get the available height for cards (viewport height minus any potential padding/margin)
    const viewportHeight = viewport.clientHeight;
    measureList.style.width = `${viewport.clientWidth}px`;

    const cards = Array.from(
      measureList.querySelectorAll('[data-preview-card="true"]')
    ) as HTMLElement[];

    if (cards.length === 0) {
      setVisibleCount(0);
      setHasPreviewOverflow(false);
      return;
    }

    let fitCount = 0;
    let totalHeight = 0;
    const gap = 12; // 3 (space-y-3) = 12px gap between cards
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const cardHeight = card.offsetHeight;
      
      // Add card height plus gap (except for first card)
      if (i === 0) {
        totalHeight += cardHeight;
      } else {
        totalHeight += gap + cardHeight;
      }
      
      // Check if this card would fit within the viewport height
      // Leave some buffer (24px) for the "View more" button if needed
      const bufferForButton = 40; // Space for the button when it appears
      
      if (totalHeight <= viewportHeight - bufferForButton) {
        fitCount = i + 1;
      } else {
        break;
      }
    }

    if (fitCount === 0 && cards.length > 0) fitCount = 1;
    setVisibleCount(fitCount);
    setHasPreviewOverflow(cards.length > fitCount);
  };

  const rafId = requestAnimationFrame(measureVisibleCards);
  const observer = new ResizeObserver(measureVisibleCards);
  observer.observe(viewport);
  window.addEventListener('resize', measureVisibleCards);

  return () => {
    cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('resize', measureVisibleCards);
  };
}, [activities, loading]);

  const fetchActivities = async () => {
    const token = localStorage.getItem('token');

    try {
      setLoading(true);



      const [activitiesRes, summaryRes] = await Promise.all([
        adminApi.activities.recent(),
        adminApi.activities.summary(),
      ]);

      const activitiesData = activitiesRes.data;
      const summaryData = summaryRes.data;

      console.log('Fetched activities data:', activitiesData);
      console.log('Fetched summary data:', summaryData);

      if (activitiesData.status !== 200) {
        throw new Error(`Activities API error: ${activitiesData.status}`);
      }


      setActivities(activitiesData.activities || []);
      setSummary(activitiesData.summary);
      setDateRange(activitiesData.date_range);

      if (summaryData.status === 200) {
        setActivitySummary(summaryData.data.today);
      }

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recent activities');
      console.error('Error fetching activities:', err);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activities</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Unable to load activities</p>
            </div>
          </div>
          <button
            onClick={fetchActivities}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  const handleExpandClick = () => {
    setInternalFullScreen(true);
  };

  return (
    <>
      <div className="px-2 sm:px-3 h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[460px] lg:h-[450px] lg:max-h-none flex flex-col">

        {/* Activities List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Activity className="h-5 w-5 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading activities...</p>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Preparing recent updates</p>
              </div>
            </div>
          ) : (
            <>
              {activities.length === 0 ? (
  <div className="text-center h-full flex flex-col items-center justify-center">
    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
      <Activity className="w-8 h-8 text-gray-400" />
    </div>
    <h4 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
      No activities in last 24 hours
    </h4>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      There are no recent activities to display for the last 24 hours
    </p>
  </div>
) : (
  <div className="h-full flex flex-col">
    {/* Preview List Container */}
    <div ref={previewListRef} className="flex-1 overflow-hidden">
      <div className="space-y-3 pr-2">
        {activities.slice(0, visibleCount || 1).map((activity, index) => (
          <ActivityCardMinimal key={index} activity={activity} />
        ))}
      </div>
    </div>

    {/* View More Button - Only shown when there's overflow */}
    {hasPreviewOverflow && (
      <div className="pt-2 text-center border-t border-gray-100 dark:border-gray-800 mt-2">
        <button
          onClick={handleExpandClick}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          View more activities
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )}

    {/* Measurement List (hidden) */}
    <div
      ref={measureListRef}
      className="absolute left-0 top-0 opacity-0 pointer-events-none -z-10"
      aria-hidden="true"
    >
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={`measure-${index}`} data-preview-card="true">
            <ActivityCardMinimal activity={activity} />
          </div>
        ))}
      </div>
    </div>
  </div>
)}
            </>
          )}
        </div>
      </div>

      {/* Full Screen Modal - controlled by internal state OR parent props */}
      <FullScreenActivitiesModal
        isOpen={internalFullScreen || isFullScreen}
        onClose={() => {
          setInternalFullScreen(false);
          onCloseFullScreen();
        }}
        activities={activities}
        summary={summary}
        isMobileScreen={isMobileScreen}
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </>
  );
};
