// src/components/dashboard/InventoryChart.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Package,
  AlertCircle,
  User,
  Clock,
  TrendingUp,
  TrendingDown,
  Minimize2,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { adminApi } from '@/lib/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface InventoryLog {
  id: number;
  staff_name: string | null;
  staff_id: string | null;
  action: string;
  timestamp: string;
  current_quantity: number;
  quantity_changed?: number;
  restocked_changed?: number;
}

interface InventoryItem {
  id: number;
  stock_name: string;
  staff_type: string;
  initial_quantity: number;
  timestamp: string;
  logs: InventoryLog[];
}

// Color mapping for different stock items
const STOCK_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#14b8a6', // teal
  '#f43f5e', // rose
];

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  const { theme } = useTheme();
  const [isCompact, setIsCompact] = useState(false);
  const [isTabletTooltip, setIsTabletTooltip] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      setIsCompact(width < 640);
      setIsTabletTooltip(width >= 640 && width < 1024);
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);
  
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    
    return (
      <div className={`rounded-lg shadow-xl border ${
        isCompact ? 'p-2 w-[min(200px,calc(100vw-1rem))]' : isTabletTooltip ? 'p-2.5 w-[240px]' : 'p-3 w-[260px]'
      } ${
        theme === 'dark' 
          ? 'bg-gray-800 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header with timestamp */}
        <div className={`flex items-center gap-2 border-b ${isCompact ? 'mb-2 pb-1.5' : 'mb-3 pb-2'}`}>
          <Clock className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
          <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            {new Date(data.display_timestamp || data.timestamp).toLocaleString([], {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {/* Stock Info */}
        <div className={isCompact ? 'mb-2' : 'mb-3'}>
          <div className="flex items-center justify-between">
            <span className={`${isCompact ? 'text-[11px]' : 'text-xs'} font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              {data.stock_name}
            </span>
            <span className={`${isCompact ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'} rounded-full ${
              theme === 'dark' 
                ? 'bg-gray-700 text-gray-300' 
                : 'bg-gray-100 text-gray-700'
            }`}>
              {data.staff_type}
            </span>
          </div>
        </div>

        {/* Event Details */}
        {data.action && (
          <div className={`${isCompact ? 'mb-2 space-y-1.5' : 'mb-3 space-y-2'}`}>
            <div className={`p-2 rounded-lg ${
              data.action === 'initial' 
                ? theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'
                : data.action === 'restocked'
                ? theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50'
                : data.action === 'used'
                ? theme === 'dark' ? 'bg-red-900/20' : 'bg-red-50'
                : data.action === 'damaged'
                ? theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50'
                : ''
            }`}>
              <p className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium mb-1 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Event Type
              </p>
              <p className={`${isCompact ? 'text-[11px]' : 'text-xs'} font-semibold ${
                data.action === 'initial' ? theme === 'dark' ? 'text-gray-400' : 'text-gray-600' :
                data.action === 'restocked' ? 'text-green-500' :
                data.action === 'used' ? 'text-red-500' :
                data.action === 'damaged' ? 'text-orange-500' :
                ''
              }`}>
                {data.action === 'initial' ? 'Initial Stock' : 
                 data.action.charAt(0).toUpperCase() + data.action.slice(1)}
              </p>
            </div>

            {/* Staff Info (if not null) */}
            {data.staff_name && data.staff_id && (
              <div className="flex items-center gap-1">
                <User className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  {data.staff_name} (ID: {data.staff_id})
                </span>
              </div>
            )}

            {/* Quantity Change */}
            {data.action !== 'initial' && (
              <div className="flex items-center gap-1">
                {data.action === 'restocked' ? (
                  <TrendingUp className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-green-500`} />
                ) : (
                  <TrendingDown className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-red-500`} />
                )}
                <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} ${
                  data.action === 'restocked' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {data.action === 'restocked' ? '+' : ''}
                  {data.restocked_changed || data.quantity_changed || 0} units
                </span>
              </div>
            )}
          </div>
        )}

        {/* Current Quantity */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className={`${isCompact ? 'text-[10px]' : 'text-xs'} font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
            Current Quantity:
          </span>
          <span className={`${isCompact ? 'text-sm' : 'text-base'} font-bold ${
            data.current_quantity < 3 ? 'text-red-500' :
            data.current_quantity < 5 ? 'text-yellow-500' :
            'text-green-500'
          }`}>
            {data.current_quantity}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export const InventoryChart = ({
  isFullScreen,
  onCloseFullScreen,
}: {
  isFullScreen?: boolean;
  onCloseFullScreen?: () => void;
}) => {
  const { theme } = useTheme();
  const { get } = useThemeClasses();
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<string>('');
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await adminApi.activities.inventoryChart();
        if (response.data && response.data.items) {
          setData(response.data.items);
          // Set first stock as default selected
          if (response.data.items.length > 0) {
            setSelectedStock(response.data.items[0].stock_name);
          }
        }
        setError(null);
      } catch (err) {
        console.error('Error fetching inventory chart data:', err);
        setError('Failed to load inventory data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const updateViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // Process data for selected stock - using exact timestamps from response
  const chartData = useMemo(() => {
    if (!data.length || !selectedStock) return [];

    // Find the selected stock item
    const selectedItem = data.find(item => item.stock_name === selectedStock);
    if (!selectedItem) return [];

    // Collect all timeline events in the exact order from the response
    const events: any[] = [];

    // Add initial event with its original timestamp
    events.push({
      display_timestamp: selectedItem.timestamp,
      stock_name: selectedItem.stock_name,
      staff_type: selectedItem.staff_type,
      current_quantity: selectedItem.initial_quantity,
      action: 'initial',
    });

    // Add all logs in the exact order they appear in the response
    selectedItem.logs.forEach(log => {
      events.push({
        display_timestamp: log.timestamp,
        stock_name: selectedItem.stock_name,
        staff_type: selectedItem.staff_type,
        current_quantity: log.current_quantity,
        action: log.action,
        staff_name: log.staff_name,
        staff_id: log.staff_id,
        quantity_changed: log.quantity_changed,
        restocked_changed: log.restocked_changed,
      });
    });

    // Do NOT sort - keep the exact order from the response
    // The logs array is already in chronological order from the API

    return events;
  }, [data, selectedStock]);

  const chartMinWidth = useMemo(() => {
    const points = Math.max(chartData.length, 1);
    const perPoint = isMobile ? 110 : isTablet ? 130 : 150;
    return points * perPoint;
  }, [chartData.length, isMobile, isTablet]);

  // Get unique stock names for filter
  const stockNames = data.map(item => item.stock_name);
  const currentStockCount = chartData[chartData.length - 1]?.current_quantity || 0;
  const controlledFullScreen = Boolean(isFullScreen && onCloseFullScreen);
  const isModalOpen = internalFullScreen || controlledFullScreen;

  useEffect(() => {
    if (!isModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalFullScreen(false);
        onCloseFullScreen?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen, onCloseFullScreen]);

  const handleCloseFullScreen = () => {
    setInternalFullScreen(false);
    onCloseFullScreen?.();
  };

  const formatXAxisTick = (timestamp: string) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    if (isMobile) {
      return date.toLocaleDateString([], {
        day: '2-digit',
        month: 'short',
      });
    }
    if (isTablet) {
      return date.toLocaleString([], {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
      });
    }
    return date.toLocaleString([], {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-[300px] sm:h-[340px] lg:h-[380px] px-3 sm:px-4 ${get('bg', 'card')} rounded-xl`}>
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-5 w-5 text-blue-600 animate-pulse" />
            </div>
          </div>
          <p className={`mt-4 text-sm ${get('text', 'secondary')}`}>Loading inventory timeline...</p>
          <p className={`mt-1 text-xs ${get('text', 'tertiary')}`}>Preparing stock movement data</p>
        </div>
      </div>
    );
  }

  if (error || !data.length) {
    return (
      <div className={`h-[300px] sm:h-[340px] lg:h-[380px] px-3 sm:px-4 text-center flex flex-col items-center justify-center ${get('bg', 'card')} rounded-xl`}>
        <div className={`${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'} rounded-full p-2.5 sm:p-3 w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 flex items-center justify-center`}>
          <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-red-500" />
        </div>
        <h3 className={`text-base sm:text-lg font-semibold mb-2 ${get('text', 'primary')}`}>No Inventory Timeline</h3>
        <p className={`text-xs sm:text-sm ${get('text', 'secondary')} mb-4`}>
          {error || 'No inventory data available to display chart'}
        </p>
      </div>
    );
  }

  const chartContent = (
    <div className={`w-full flex flex-col ${isModalOpen ? 'h-full p-3 sm:p-4 md:p-6 overflow-y-auto' : 'h-[420px] sm:h-[480px] md:h-[520px] lg:h-[560px] p-2 sm:p-3 md:p-4'}`}>
      {/* Header with Filter */}
      <div className="mb-3 sm:mb-4 flex flex-col gap-2 sm:gap-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className={`text-sm sm:text-base md:text-lg font-semibold truncate ${get('text', 'primary')}`}>
              Inventory Movement Timeline - {selectedStock}
            </h3>
            <p className={`text-[10px] sm:text-xs ${get('text', 'tertiary')} mt-1`}>
              Track quantity changes at exact timestamps
            </p>
          </div>
          {isModalOpen && (
            <button
              onClick={handleCloseFullScreen}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors whitespace-nowrap"
            >
              <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Exit Full Screen
            </button>
          )}
        </div>

        {/* Stock Filter - Only stock names */}
        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <div className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs sm:text-sm font-semibold ${
            theme === 'dark'
              ? 'bg-gray-800 border-gray-700 text-gray-100'
              : 'bg-gray-50 border-gray-200 text-gray-800'
          }`}>
            Current Stock: <span className={`ml-1 ${
              currentStockCount < 3 ? 'text-red-500' :
              currentStockCount < 5 ? 'text-yellow-500' :
              'text-green-500'
            }`}>{currentStockCount}</span>
          </div>
          <Package className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${get('text', 'secondary')}`} />
          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm rounded-lg border max-w-[180px] sm:max-w-[220px] ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 text-gray-200'
                : 'bg-white border-gray-300 text-gray-700'
            }`}
          >
            {stockNames.map(name => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Chart with Attendance-style legend */}
      {chartData.length > 0 && (
        <div className={`relative rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 ${isModalOpen ? 'h-[220px] sm:h-[260px] lg:h-[300px] flex-shrink-0' : 'flex-shrink-0'}`}>
          <div className="absolute top-0 left-0 right-0 z-10">
            <div className="flex justify-center pt-2 sm:pt-3 md:pt-4 pb-2 px-2">
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 sm:gap-x-4 md:gap-x-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Initial</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500"></div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Restocked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500"></div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Used</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-500"></div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Damaged</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-dashed border-gray-500"></div>
                  <span className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">Staff Action</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-14 sm:pt-16 px-1 sm:px-2 h-full">
            <div
              className="h-full overflow-x-auto overflow-y-hidden"
              style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
            >
              <div
                style={{
                  minWidth: `${Math.max(chartMinWidth, isMobile ? 360 : isTablet ? 520 : 640)}px`,
                  height: '100%',
                }}
              >
                <ResponsiveContainer width="100%" height={isModalOpen ? '100%' : (isMobile ? 220 : isTablet ? 260 : 320)}>
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 12, right: isMobile ? 8 : 20, left: isMobile ? 2 : 10, bottom: isMobile ? 14 : isTablet ? 18 : 22 }}
                  >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} 
                />
                <XAxis 
                  dataKey="display_timestamp"
                  tickFormatter={formatXAxisTick}
                  stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: isMobile ? 8 : isTablet ? 9 : 11 }}
                  angle={0}
                  textAnchor="middle"
                  height={isMobile ? 22 : isTablet ? 28 : 32}
                  interval={0}
                  minTickGap={isMobile ? 14 : isTablet ? 20 : 24}
                  padding={{ left: 6, right: 6 }}
                />
                <YAxis 
                  stroke={theme === 'dark' ? '#9ca3af' : '#6b7280'}
                  tick={{ fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: isMobile ? 9 : 11 }}
                  label={{ 
                    value: 'Quantity', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: theme === 'dark' ? '#9ca3af' : '#6b7280', fontSize: isMobile ? 10 : 12 }
                  }}
                  domain={[0, 'dataMax + 2']}
                />
                    <Tooltip content={<CustomTooltip />} />

                    <Line
                      type="linear"
                      dataKey="current_quantity"
                      stroke={STOCK_COLORS[0]}
                      strokeWidth={2}
                      name={selectedStock}
                      dot={(props: any) => {
                        const { payload, cx, cy } = props;
                        if (payload.action === 'initial') {
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={6} 
                              fill={STOCK_COLORS[0]}
                              stroke="white"
                              strokeWidth={2}
                            />
                          );
                        } else {
                          const color = payload.action === 'restocked' ? '#10b981' :
                                       payload.action === 'used' ? '#ef4444' :
                                       payload.action === 'damaged' ? '#f59e0b' : 
                                       STOCK_COLORS[0];
                          const isStaffAction = payload.staff_name && payload.staff_id;
                          return (
                            <circle 
                              cx={cx} 
                              cy={cy} 
                              r={isStaffAction ? 8 : 6} 
                              fill={color}
                              stroke="white"
                              strokeWidth={2}
                              strokeDasharray={isStaffAction ? "3 3" : "none"}
                            />
                          );
                        }
                      }}
                      activeDot={{ r: 8 }}
                      connectNulls={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs are shown only in full screen mode */}
      {isModalOpen && (
        <div className="mt-3 sm:mt-4 pt-0 border-t-0 min-h-[220px]">
          <div className={`mt-2 sm:mt-3 rounded-xl border p-3 sm:p-4 ${
            theme === 'dark'
              ? 'bg-gray-900/40 border-gray-700'
              : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <p className={`text-xs sm:text-sm font-semibold ${get('text', 'primary')}`}>
                Exact Events for {selectedStock}
              </p>
              <span className={`text-[10px] sm:text-xs px-2 py-1 rounded-full ${
                theme === 'dark'
                  ? 'bg-gray-800 text-gray-300'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {chartData.length} logs
              </span>
            </div>

            <div className="space-y-2 max-h-[38vh] sm:max-h-[40vh] overflow-y-auto pr-1">
              {chartData.map((event, index) => (
                <div
                  key={index}
                  className={`rounded-lg border px-2.5 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs ${
                    theme === 'dark'
                      ? 'bg-gray-800/60 border-gray-700'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className={`text-[10px] sm:text-xs ${get('text', 'tertiary')}`}>
                      {new Date(event.display_timestamp).toLocaleString()}
                    </span>
                    <span className={`font-semibold text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${
                      event.action === 'initial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      event.action === 'restocked' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      event.action === 'used' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      event.action === 'damaged' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {event.action}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className={`font-medium ${
                      event.action === 'initial' ? 'text-blue-500' :
                      event.action === 'restocked' ? 'text-green-500' :
                      event.action === 'used' ? 'text-red-500' :
                      event.action === 'damaged' ? 'text-orange-500' : ''
                    }`}>
                      {event.action === 'initial'
                        ? `Initial quantity = ${event.current_quantity}`
                        : `Quantity = ${event.current_quantity}`}
                    </span>

                    {event.restocked_changed && (
                      <span className="text-green-500 font-medium">
                        +{event.restocked_changed}
                      </span>
                    )}

                    {event.quantity_changed && event.action !== 'restocked' && (
                      <span className="text-red-500 font-medium">
                        {event.quantity_changed}
                      </span>
                    )}

                    {event.staff_name && event.staff_id && (
                      <span className={get('text', 'tertiary')}>
                        by {event.staff_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );

  if (isModalOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div
          className="absolute inset-0 bg-black/75 backdrop-blur-sm"
          onClick={handleCloseFullScreen}
        />
        <div className={`relative z-10 shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 ${
          isMobile
            ? 'w-[100vw] h-[100dvh] rounded-none overflow-y-auto'
            : 'w-[96vw] sm:w-[94vw] lg:w-[90vw] xl:w-[84vw] h-[92vh] rounded-xl sm:rounded-2xl overflow-hidden'
        }`}>
          {chartContent}
        </div>
      </div>
    );
  }

  return chartContent;
};
