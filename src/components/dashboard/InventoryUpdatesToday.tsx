'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { 
  Package, 
  RefreshCw, 
  AlertCircle, 
  Clock, 
  User, 
  Boxes, 
  Minimize2, 
  Calendar,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  PlusCircle,
  MinusCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { adminApi } from '@/lib/api';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { InventoryChart } from './InventoryChart';

interface InventoryUpdate {
  date: string;
  category: string;
  what_do: string;
  who_do: string;
  role: string;
  item_id: number;
  item: string;
  action: 'used' | 'damaged' | 'restocked' | 'added' | string;
  quantity: number;
  message: string;
  timestamp: string;
}

interface InventoryUpdatesResponse {
  status: number;
  message: string;
  date_range: {
    from: string;
    to: string;
  };
  summary: {
    total_updates: number;
    actions: {
      used: number;
      damaged: number;
      restocked: number;
      added: number;
    };
  };
  updates: InventoryUpdate[];
}

type TimeFilter = 'last-24-hours' | 'today' | 'this_week' | 'past_week' | 'this_month' | 'past_month';

const actionBadge = (action: string) => {
  switch (action) {
    case 'added':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    case 'restocked':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    case 'used':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800';
    case 'damaged':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700';
  }
};

const actionIcon = (action: string) => {
  switch (action) {
    case 'added':
    case 'restocked':
      return <PlusCircle className="w-3 h-3" />;
    case 'used':
      return <MinusCircle className="w-3 h-3" />;
    case 'damaged':
      return <AlertTriangle className="w-3 h-3" />;
    default:
      return <Activity className="w-3 h-3" />;
  }
};

const filterOptions: { value: TimeFilter; label: string }[] = [
  { value: 'last-24-hours', label: 'Last 24 Hours' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'past_week', label: 'Past Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'past_month', label: 'Past Month' },
];

export const InventoryUpdatesToday = ({
  isFullScreen = false,
  onCloseFullScreen = () => {},
}: {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}) => {
  const { get, combine } = useThemeClasses();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InventoryUpdatesResponse | null>(null);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('last-24-hours');
  const [viewMode, setViewMode] = useState<'updates' | 'chart'>('updates'); // Toggle between updates and chart
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const previewListRef = useRef<HTMLDivElement | null>(null);
  const measureListRef = useRef<HTMLDivElement | null>(null);
  const [visiblePreviewCount, setVisiblePreviewCount] = useState(0);
  const [hasPreviewOverflow, setHasPreviewOverflow] = useState(false);

  const fetchInventoryUpdates = async (filter: TimeFilter) => {
    try {
      setLoading(true);
      
      let response;
      
      // No params for last-24-hours (API defaults to last 24 hours)
      if (filter === 'last-24-hours') {
        response = await adminApi.activities.inventoryUpdates();
      } else {
        // For other filters, pass the filter value as a parameter
        response = await adminApi.activities.inventoryUpdates({ filter });
      }
      
      const payload = response.data as InventoryUpdatesResponse;
      console.log('Fetched inventory updates:', payload);
      setData(payload);
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load inventory updates');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventoryUpdates(selectedFilter);
  }, [selectedFilter]);

  useEffect(() => {
    const handleViewport = () => {
      setIsMobileScreen(window.innerWidth < 640);
    };

    handleViewport();
    window.addEventListener('resize', handleViewport);
    return () => window.removeEventListener('resize', handleViewport);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalFullScreen(false);
        onCloseFullScreen();
      }
    };

    if (internalFullScreen || isFullScreen) {
      document.addEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [internalFullScreen, isFullScreen, onCloseFullScreen]);

  // Sort updates by timestamp (newest first) to ensure consistent ordering
  const sortedUpdates = useMemo(() => {
    if (!data?.updates) return [];
    
    return [...data.updates].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [data?.updates]);

  const summary = data?.summary;
  const previewItems = sortedUpdates.slice(0, visiblePreviewCount || 1);

  const getRelativeTime = (timestamp: string) => {
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) return '-';
    return formatDistanceToNow(parsed, { addSuffix: true });
  };

  const getFilterLabel = () => {
    return filterOptions.find(opt => opt.value === selectedFilter)?.label || 'Last 24 Hours';
  };

  const totalUpdates = summary?.total_updates || 0;

  useEffect(() => {
    const viewport = previewListRef.current;
    const measureList = measureListRef.current;

    if (!viewport || !measureList || sortedUpdates.length === 0) {
      setVisiblePreviewCount(sortedUpdates.length === 0 ? 0 : 1);
      setHasPreviewOverflow(false);
      return;
    }

    const measureVisibleCards = () => {
      const viewportHeight = viewport.clientHeight;
      measureList.style.width = `${viewport.clientWidth}px`;

      const cards = Array.from(
        measureList.querySelectorAll('[data-preview-card="true"]')
      ) as HTMLElement[];

      if (cards.length === 0) {
        setVisiblePreviewCount(0);
        setHasPreviewOverflow(false);
        return;
      }

      let fitCount = 0;
      for (const card of cards) {
        const cardBottom = card.offsetTop + card.offsetHeight;
        if (cardBottom <= viewportHeight + 1) {
          fitCount += 1;
        } else {
          break;
        }
      }

      if (fitCount === 0) fitCount = 1;
      setVisiblePreviewCount(fitCount);
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
  }, [sortedUpdates, viewMode]);

  if (loading) {
    return (
      <div className="w-full h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[480px] md:h-[520px] lg:h-[560px] md:max-h-none p-2 sm:p-3 md:p-4">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600 animate-pulse" />
              </div>
            </div>
            <p className={combine('mt-4 text-sm', get('text', 'secondary'))}>Loading inventory updates...</p>
            <p className={combine('mt-1 text-xs', get('text', 'tertiary'))}>Preparing today&apos;s stock activity</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[480px] md:h-[520px] lg:h-[560px] md:max-h-none p-2 sm:p-3 md:p-4">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red-500" />
            <p className={combine('text-sm', get('text', 'secondary'))}>{error}</p>
          </div>
          <button
            onClick={() => fetchInventoryUpdates(selectedFilter)}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
            title="Retry"
          >
            <RefreshCw className={combine('w-4 h-4', get('icon', 'secondary'))} />
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (sortedUpdates.length === 0) {
    return (
      <div className="w-full h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[480px] md:h-[520px] lg:h-[560px] md:max-h-none p-2 sm:p-3 md:p-4 flex flex-col">
        {/* Header with Filter and View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Calendar className={combine('w-3.5 h-3.5 sm:w-4 sm:h-4', get('icon', 'secondary'))} />
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value as TimeFilter)}
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={combine('self-start sm:self-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-semibold', get('border', 'primary'), get('bg', 'secondary'), get('text', 'secondary'))}>
            Total: {totalUpdates}
          </div>

        </div>
        
        {/* Centered empty state */}
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Boxes className="w-7 h-7 sm:w-8 sm:h-8 text-gray-500" />
            </div>
            <p className={combine('font-medium text-base sm:text-lg', get('text', 'primary'))}>No inventory updates</p>
            <p className={combine('text-xs sm:text-sm mt-2', get('text', 'tertiary'))}>
              No add/use/restock/damage actions were recorded {getFilterLabel().toLowerCase()}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Data state with chart integration
  return (
    <>
    <div className="w-full h-[70vh] max-h-[420px] sm:h-[72vh] sm:max-h-[480px] md:h-[520px] lg:h-[560px] md:max-h-none p-2 sm:p-3 md:p-4 flex flex-col">
      {/* Header with Filter and View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Calendar className={combine('w-3.5 h-3.5 sm:w-4 sm:h-4', get('icon', 'secondary'))} />
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value as TimeFilter)}
            className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className={combine('self-start sm:self-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg border text-xs sm:text-sm font-semibold', get('border', 'primary'), get('bg', 'secondary'), get('text', 'secondary'))}>
          Total: {totalUpdates}
        </div>

      </div>

        <>
          {/* Updates list */}
          <div className="flex-1 min-h-0 overflow-hidden mb-3 sm:mb-4 relative">
            <div ref={previewListRef} className="space-y-2.5 sm:space-y-3 pr-1 h-full overflow-hidden">
              {previewItems.map((update, idx) => (
                <div
                  key={`${update.item_id}-${update.timestamp}-${idx}`}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800/50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium inline-flex items-center gap-1 ${actionBadge(update.action)}`}>
                          {actionIcon(update.action)}
                          {update.action}
                        </span>
                        <span className={combine('text-[10px] sm:text-xs font-medium', get('text', 'secondary'))}>
                          {update.quantity} units
                        </span>
                      </div>
                      <p className={combine('text-xs sm:text-sm font-medium truncate', get('text', 'primary'))}>
                        {update.item}
                      </p>
                      <div className={combine('flex items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs flex-wrap', get('text', 'tertiary'))}>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{update.who_do}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{getRelativeTime(update.timestamp)}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              ref={measureListRef}
              className="absolute left-0 top-0 opacity-0 pointer-events-none -z-10 flex flex-col gap-2.5 sm:gap-3"
              aria-hidden="true"
            >
              {sortedUpdates.map((update, idx) => (
                <div key={`measure-${update.item_id}-${update.timestamp}-${idx}`} data-preview-card="true">
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800/50">
                    <div className="flex items-start justify-between gap-2 sm:gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium inline-flex items-center gap-1 ${actionBadge(update.action)}`}>
                            {actionIcon(update.action)}
                            {update.action}
                          </span>
                          <span className={combine('text-[10px] sm:text-xs font-medium', get('text', 'secondary'))}>
                            {update.quantity} units
                          </span>
                        </div>
                        <p className={combine('text-xs sm:text-sm font-medium truncate', get('text', 'primary'))}>
                          {update.item}
                        </p>
                        <div className={combine('flex items-center gap-2 sm:gap-3 mt-2 text-[10px] sm:text-xs flex-wrap', get('text', 'tertiary'))}>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{update.who_do}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{getRelativeTime(update.timestamp)}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* View more button */}
          {hasPreviewOverflow && (
            <button
              onClick={() => setInternalFullScreen(true)}
              className="w-full text-center text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              View more...
            </button>
          )}
        </>
      
    </div>

    {/* Full Screen Modal */}
    {(internalFullScreen || isFullScreen) && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setInternalFullScreen(false);
            onCloseFullScreen();
          }}
        />
        <div
          className={`relative z-10 bg-white dark:bg-gray-900 shadow-2xl flex flex-col ${
            isMobileScreen
              ? 'w-[100vw] h-[100dvh] rounded-none overflow-y-auto'
              : 'w-[96vw] sm:w-[94vw] lg:w-[90vw] xl:w-[84vw] h-[92vh] rounded-xl sm:rounded-2xl overflow-hidden'
          }`}
        >
          {/* Modal Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                <Package className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h2 className={combine('text-lg sm:text-2xl font-bold', get('text', 'primary'))}>
                  Inventory Management - {getFilterLabel()}
                </h2>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                  {summary?.total_updates || 0} total updates
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Filter in Modal */}
              <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 sm:px-3 py-1.5 sm:py-2">
                <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as TimeFilter)}
                  className="bg-transparent border-none text-xs sm:text-sm focus:outline-none"
                >
                  {filterOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => {
                  setInternalFullScreen(false);
                  onCloseFullScreen();
                }}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Exit Full Screen</span>
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-3 sm:p-6 overflow-y-auto xl:overflow-hidden bg-gray-50 dark:bg-gray-900/50">
            {viewMode === 'updates' ? (
              <div className="h-full overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-3 sm:gap-4">
                {sortedUpdates.map((update, idx) => (
                  <div
                    key={`full-${update.item_id}-${update.timestamp}-${idx}`}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 bg-white dark:bg-gray-800/50 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-[10px] sm:text-xs font-medium inline-flex items-center gap-1 ${actionBadge(update.action)}`}>
                        {actionIcon(update.action)}
                        {update.action}
                      </span>
                      <span className={combine('text-[10px] sm:text-xs font-medium', get('text', 'secondary'))}>
                        {update.quantity} units
                      </span>
                    </div>
                    <p className={combine('text-sm sm:text-base font-semibold mb-2', get('text', 'primary'))}>
                      {update.item}
                    </p>
                    <div className={combine('space-y-1 text-xs sm:text-sm', get('text', 'secondary'))}>
                      <p className="flex items-center gap-2 flex-wrap">
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{update.who_do} • {update.role}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{getRelativeTime(update.timestamp)}</span>
                      </p>
                      <p className="flex items-start gap-2 mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="text-[11px] sm:text-xs">{update.message}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-full min-h-[320px]">
                <InventoryChart isFullScreen={true} />
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
};
