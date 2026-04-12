'use client';

import { useState, useEffect, Key } from 'react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, parseISO, isBefore, startOfDay } from 'date-fns';
import { adminApi } from '@/lib/api';
import axios from 'axios'; // keep only for error type check
import { ChevronRight, Minimize2 } from 'lucide-react';


export const CalendarWidget = ({ 
  isFullScreen = false, 
  onCloseFullScreen = () => {} 
}: { 
  isFullScreen?: boolean; 
  onCloseFullScreen?: () => void;
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internalFullScreen, setInternalFullScreen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [calendarMeta, setCalendarMeta] = useState({
    month_name: '',
    active_academic_year: '',
    total_events: 0,
    summary: { exams: 0, holidays: 0, announcements: 0 }
  });

  // Fetch calendar events from API - ONLY holidays and common announcements
  const fetchCalendarEvents = async (year: number, month: number) => {
    try {
      setIsLoading(true);
      const response = await adminApi.calendar.getAdminCalendar(
  year,
  month + 1
);


      if (response.data.status === 200) {
        // Store calendar metadata
        setCalendarMeta({
          month_name: response.data.month_name,
          active_academic_year: response.data.active_academic_year,
          total_events: response.data.total_events,
          summary: response.data.summary
        });

        // Transform API response to match frontend format - ONLY HOLIDAYS AND ANNOUNCEMENTS
        const apiEvents: any = [];

        // Process events_by_date from API response
        Object.entries(response.data.events_by_date || {}).forEach(([dateStr, dayEvents]: any) => {
          dayEvents.forEach((event: any) => {
            // ONLY include holidays and common_announcements
            if (event.type === 'holiday' || event.type === 'common_announcement') {
              let frontendType = 'event'; // default
              let frontendTitle = event.description || 'Untitled Event';

              // Map API event types to your component's event types
              if (event.type === 'holiday') {
                frontendType = 'holiday';
                frontendTitle = event.description || 'Holiday';
              } else if (event.type === 'common_announcement') {
                frontendType = 'announcement';
                frontendTitle = event.description || 'Announcement';
              }

              apiEvents.push({
                date: parseISO(dateStr),
                title: frontendTitle,
                type: frontendType,
                description: event.detailed_description || event.description || 'No description',
                source: 'api',
                // Store original API data for navigation
                originalType: event.type,
                originalData: event
              });
            }
          });
        });

        setEvents(apiEvents);
      }
    } catch (error: any) {
      console.error('Error fetching calendar events:', error);

      // If API returns 404 or other error for current month/year, try without params for current month
      if (error.response?.status === 404 || error.response?.status >= 400) {
        try {
          const currentResponse = await adminApi.calendar.getAdminCalendar();


          if (currentResponse.data.status === 200) {
            // Store calendar metadata from current month response
            setCalendarMeta({
              month_name: currentResponse.data.month_name,
              active_academic_year: currentResponse.data.active_academic_year,
              total_events: currentResponse.data.total_events,
              summary: currentResponse.data.summary
            });

            // Transform API response - ONLY HOLIDAYS AND ANNOUNCEMENTS
            const apiEvents: any = [];
            Object.entries(currentResponse.data.events_by_date || {}).forEach(([dateStr, dayEvents]: any) => {
              dayEvents.forEach((event: any) => {
                // ONLY include holidays and common_announcements
                if (event.type === 'holiday' || event.type === 'common_announcement') {
                  let frontendType = 'event';
                  let frontendTitle = event.description || 'Untitled Event';

                  if (event.type === 'holiday') {
                    frontendType = 'holiday';
                    frontendTitle = event.description || 'Holiday';
                  } else if (event.type === 'common_announcement') {
                    frontendType = 'announcement';
                    frontendTitle = event.description || 'Announcement';
                  }

                  apiEvents.push({
                    date: parseISO(dateStr),
                    title: frontendTitle,
                    type: frontendType,
                    description: event.detailed_description || event.description || 'No description',
                    source: 'api',
                    originalType: event.type,
                    originalData: event
                  });
                }
              });
            });

            setEvents(apiEvents);
          }
        } catch (secondError) {
          console.error('Error fetching current month events:', secondError);
          // Fallback to mock data - ONLY HOLIDAYS AND ANNOUNCEMENTS
          setEvents(getMockEvents(year, month));
        }
      } else {
        // Fallback to mock data if API fails - ONLY HOLIDAYS AND ANNOUNCEMENTS
        setEvents(getMockEvents(year, month));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mock data fallback function - ONLY holidays and announcements
  const getMockEvents: any = (year: number, month: number) => {
    const mockEvents = [
      {
        date: new Date(year, month, 14),
        title: 'Valentines Day',
        type: 'holiday',
        description: 'Holiday - Everyone (School Closed)',
        source: 'mock',
        originalType: 'holiday',
        originalData: { id: 1 }
      },
      {
        date: new Date(year, month, 17),
        title: 'Special Holiday',
        type: 'holiday',
        description: 'Holiday - Teachers Only',
        source: 'mock',
        originalType: 'holiday',
        originalData: { id: 2 }
      },
      {
        date: new Date(year, month, 12),
        title: 'Sports Day Announcement',
        type: 'announcement',
        description: 'Annual Sports Day will be held on...',
        source: 'mock',
        originalType: 'common_announcement',
        originalData: { id: 3 }
      },
    ];

    // Filter to current month
    return mockEvents.filter(event =>
      event.date.getFullYear() === year &&
      event.date.getMonth() === month
    );
  };

  // Handle event click - redirect based on type
  const handleEventClick = (event: any) => {
    if (!event || !event.originalType) return;

    // Prevent navigation if we're in fullscreen mode (for better UX)
    if (internalFullScreen || isFullScreen) {
      setSelectedEvent(event);
      return;
    }

    // Redirect based on event type
    switch (event.originalType) {
      case 'holiday':
        window.location.href = '/admin/operations/holidays';
        break;
      case 'common_announcement':
        window.location.href = '/admin/communications/announcements';
        break;
      default:
        // For other event types (shouldn't happen now), you can handle differently or do nothing
        console.log('Clicked event:', event);
        break;
    }
  };

  // Handle day click - show all events for that day in fullscreen mode
  const handleDayClick = (day: Date) => {
    const dayEventsList = dayEvents(day);
    if (dayEventsList.length > 0 || internalFullScreen || isFullScreen) {
      if (internalFullScreen || isFullScreen) {
        setSelectedDate(day);
        setSelectedEvent(null);
      } else {
        setInternalFullScreen(true);
        setSelectedDate(day);
        setSelectedEvent(null);
      }
    }
  };

  // Fetch events when month changes
  useEffect(() => {
    fetchCalendarEvents(currentDate.getFullYear(), currentDate.getMonth());
  }, [currentDate]);

  useEffect(() => {
    const isModalOpen = internalFullScreen || isFullScreen;
    if (!isModalOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setInternalFullScreen(false);
        onCloseFullScreen();
        setSelectedDate(null);
        setSelectedEvent(null);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [internalFullScreen, isFullScreen, onCloseFullScreen]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const prevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const nextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const getEventTypeColor = (type: any) => {
    switch (type) {
      case 'announcement':
      case 'event': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300';
      case 'holiday': return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getEventTypeLabel = (type: any) => {
    switch (type) {
      case 'announcement':
      case 'event': return 'Announcement';
      case 'holiday': return 'Holiday';
      default: return 'Event';
    }
  };

  const dayEvents = (day: Date) => {
    return events.filter((event: any) =>
      event.date.getDate() === day.getDate() &&
      event.date.getMonth() === day.getMonth() &&
      event.date.getFullYear() === day.getFullYear()
    );
  };

  // Function to get dominant event type for a day (for background color)
  const getDayEventType = (day: Date) => {
    const todayEvents: any = dayEvents(day);
    if (todayEvents.length === 0) return null;

    // Check for specific event types in priority order
    const priorityTypes = ['holiday', 'announcement', 'event'];
    for (const type of priorityTypes) {
      if (todayEvents.some((event: any) => event.type === type)) {
        return type;
      }
    }

    return todayEvents[0].type;
  };

  // Function to get background color for a day based on events
  const getDayBackgroundColor = (day: Date) => {
    const eventType = getDayEventType(day);

    if (!eventType) return '';

    switch (eventType) {
      case 'holiday':
        return 'bg-purple-50 border border-purple-100 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800 dark:hover:bg-purple-900/30';
      case 'announcement':
      case 'event':
        return 'bg-blue-50 border border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:hover:bg-blue-900/30';
      default:
        return 'bg-slate-50 border border-slate-100 hover:bg-slate-100 dark:bg-gray-900/40 dark:border-gray-700 dark:hover:bg-gray-800';
    }
  };

  // Get upcoming events (next 7 days)

const upcomingEvents = events
  .sort((a: any, b: any) => {
    const today = new Date();
    const aDate = a.date;
    const bDate = b.date;
    
    // Check if dates are today
    const aIsToday = isToday(aDate);
    const bIsToday = isToday(bDate);
    
    // Check if dates are future
    const aIsFuture = aDate > today && !aIsToday;
    const bIsFuture = bDate > today && !bIsToday;
    
    // Check if dates are past
    const aIsPast = aDate < today && !aIsToday;
    const bIsPast = bDate < today && !bIsToday;
    
    // Priority 1: Today comes first
    if (aIsToday && !bIsToday) return -1;
    if (!aIsToday && bIsToday) return 1;
    
    // Priority 2: Future dates come next (closest first)
    if (aIsFuture && bIsPast) return -1;
    if (aIsPast && bIsFuture) return 1;
    if (aIsFuture && bIsFuture) return aDate - bDate; // Ascending (closest future first)
    
    // Priority 3: Past dates come last (most recent first)
    if (aIsPast && bIsPast) return bDate - aDate; // Descending (most recent past first)
    
    return aDate - bDate;
  })
  .slice(0, 5); // Show exactly 3 events

  // Get all events for the current month
  const allMonthEvents = events
    .filter((event: any) => isSameMonth(event.date, currentDate))
    .sort((a: any, b: any) => a.date - b.date);

  // Categorize events for full screen view
  const today = new Date();
  const todayEventsList = dayEvents(today);
  const pastEvents = allMonthEvents.filter((event: any) =>
    isBefore(event.date, startOfDay(today))
  );
  const futureEvents = allMonthEvents.filter((event: any) =>
    event.date > today
  );

  const closeFullScreen = () => {
    setInternalFullScreen(false);
    onCloseFullScreen();
    setSelectedDate(null);
    setSelectedEvent(null);
  };

  // Full Screen Modal Component
  const FullScreenView = () => {
    if (!internalFullScreen && !isFullScreen) return null;

    const today = new Date();
    const currentDateEvents = selectedDate ? dayEvents(selectedDate) : [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closeFullScreen} />
        <div className="relative z-10 w-[100vw] h-[100dvh] md:w-[96vw] md:h-[92vh] xl:w-[88vw] 2xl:w-[82vw] bg-white dark:bg-gray-900 rounded-none md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex flex-col gap-3 md:gap-4 p-3 sm:p-4 md:p-5 border-b border-slate-200 dark:border-gray-700">
            <div className="flex items-start sm:items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-900/20 rounded-lg">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-300 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-slate-900 dark:text-gray-100">Calendar Details</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                    {calendarMeta.active_academic_year || 'School Calendar'}
                  </p>
                </div>
              </div>

              <button
                onClick={closeFullScreen}
                className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-white text-[11px] sm:text-sm whitespace-nowrap"
              ><Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Exit Full Screen</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors border border-slate-200 dark:border-gray-700"
              >
                <FaChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-gray-300" />
              </button>
              <span className="font-bold text-slate-900 dark:text-gray-100 min-w-36 sm:min-w-40 text-center text-sm sm:text-base md:text-lg bg-slate-50 dark:bg-gray-800 py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg border border-slate-200 dark:border-gray-700">
                {format(currentDate, 'MMMM yyyy')}
              </span>
              <button
                onClick={nextMonth}
                className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors border border-slate-200 dark:border-gray-700"
              >
                <FaChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-gray-300" />
              </button>
            </div>
          </div>

          {/* Content - Two columns */}
          <div className="flex-1 overflow-y-auto xl:overflow-hidden grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 p-3 sm:p-4 md:p-5">
            {/* Left column - Calendar */}
            <div className="xl:col-span-2 min-h-0">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-3 sm:mb-4">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="text-center font-semibold text-[10px] sm:text-xs md:text-sm text-slate-700 dark:text-gray-300 py-1.5 sm:py-2 md:py-3 bg-slate-50 dark:bg-gray-800 rounded-lg">
                    {day}
                  </div>
                ))}

                {Array.from({ length: new Date(monthStart).getDay() }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="h-11 sm:h-14 md:h-16 lg:h-20 rounded-lg" />
                ))}

                {days.map(day => {
                  const dayEventsList: any = dayEvents(day);
                  const hasEvents = dayEventsList.length > 0;
                  const isTodayDate = isToday(day);
                  const isSelected = selectedDate &&
                    day.getDate() === selectedDate.getDate() &&
                    day.getMonth() === selectedDate.getMonth() &&
                    day.getFullYear() === selectedDate.getFullYear();
                  const isPast = isBefore(day, startOfDay(today)) && !isTodayDate;

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={`
                        h-11 sm:h-14 md:h-16 lg:h-20 rounded-lg p-1 sm:p-1.5 md:p-2 border flex flex-col cursor-pointer relative
                        ${hasEvents ? getDayBackgroundColor(day) : 'border-slate-200 dark:border-gray-700'}
                        ${!isTodayDate && !hasEvents ? 'hover:bg-slate-50 dark:hover:bg-gray-800' : ''}
                        ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                        ${isTodayDate ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md' : ''}
                        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                        ${isPast ? 'opacity-60' : ''}
                        transition-all duration-200
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`
                          font-bold text-xs sm:text-sm md:text-base
                          ${isTodayDate ? 'text-white' :
                            hasEvents ? 'text-slate-900 dark:text-gray-100' : 'text-slate-700 dark:text-gray-300'}
                          ${isPast ? 'text-slate-500 dark:text-gray-500' : ''}
                        `}>
                          {format(day, 'd')}
                        </span>
                        {hasEvents && (
                          <span className={`
                            text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded-full min-w-4 sm:min-w-5 text-center
                            ${isTodayDate ? 'bg-white text-blue-600 dark:bg-gray-900 dark:text-blue-300' : 'bg-slate-200 text-slate-700 dark:bg-gray-800 dark:text-gray-300'}
                            ${isPast ? 'bg-slate-300 text-slate-600 dark:bg-gray-700 dark:text-gray-400' : ''}
                          `}>
                            {dayEventsList.length}
                          </span>
                        )}
                      </div>

                      {/* Event indicators - Only show counts in full screen */}
                      {hasEvents && (
                        <div className="mt-1.5 sm:mt-2 flex justify-center gap-1">
                          {dayEventsList.slice(0, 4).map((event: any, idx: number) => (
                            <div
                              key={idx}
                              className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${getEventTypeColor(event.type).split(' ')[0]}`}
                              title={`${event.title}: ${event.description}`}
                            />
                          ))}
                          {dayEventsList.length > 4 && (
                            <div className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400">+{dayEventsList.length - 4}</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 md:gap-4 p-2.5 sm:p-3 md:p-4 bg-slate-50 dark:bg-gray-800 rounded-xl">
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-gray-100">{pastEvents.length}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Past Events</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-blue-600">{todayEventsList.length}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-green-600">{futureEvents.length}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Upcoming</div>
                </div>
                <div className="text-center">
                  <div className="text-base sm:text-lg font-bold text-purple-600">{allMonthEvents.length}</div>
                  <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Total This Month</div>
                </div>
              </div>
            </div>

            {/* Right column - Event Details */}
            <div className="bg-slate-50 dark:bg-gray-800 rounded-xl p-3 sm:p-4 md:p-5 flex flex-col min-h-0">
              <h3 className="font-bold text-slate-900 dark:text-gray-100 text-sm sm:text-base md:text-lg mb-3 sm:mb-4">
                {selectedEvent ? 'Event Details' :
                  selectedDate ? `Events on ${format(selectedDate, 'MMMM d, yyyy')}` :
                    'All Events'}
              </h3>

              {/* Date selector tabs */}
              <div className="flex gap-2 mb-3 sm:mb-4">
                <button
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedEvent(null);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${!selectedDate && !selectedEvent
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                    }`}
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setSelectedDate(today);
                    setSelectedEvent(null);
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${selectedDate && isToday(selectedDate)
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                    }`}
                >
                  Today
                </button>
              </div>

              <div className="space-y-2.5 sm:space-y-3 flex-1 min-h-0 pr-1 sm:pr-2 overflow-y-auto">
                {selectedEvent ? (
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-3 gap-2">
                      <div>
                        <div className={`inline-flex px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium mb-2 ${getEventTypeColor(selectedEvent.type)}`}>
                          {getEventTypeLabel(selectedEvent.type)}
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-gray-100 text-base sm:text-lg">{selectedEvent.title}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-gray-200">
                          {format(selectedEvent.date, 'EEEE')}
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-blue-600">
                          {format(selectedEvent.date, 'd')}
                        </div>
                        <div className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                          {format(selectedEvent.date, 'MMM yyyy')}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm sm:text-base text-slate-600 dark:text-gray-400 mb-4">{selectedEvent.description}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Navigate based on event type
                          if (selectedEvent.originalType === 'holiday') {
                            window.location.href = '/admin/operations/holidays';
                          } else if (selectedEvent.originalType === 'common_announcement') {
                            window.location.href = '/admin/communications/announcements';
                          }
                        }}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-xs sm:text-sm"
                      >
                        Go to {getEventTypeLabel(selectedEvent.type)}s
                      </button>
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="px-3 sm:px-4 py-2 rounded-lg border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors font-medium text-xs sm:text-sm"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Show events for selected date or all events */}
                    {(selectedDate ? currentDateEvents : allMonthEvents).map((event: any, idx: number) => {
                      const isPastEvent = isBefore(event.date, startOfDay(today));
                      const isTodayEvent = isToday(event.date);

                      return (
                        <div
                          key={idx}
                          onClick={() => setSelectedEvent(event)}
                          className={`bg-white dark:bg-gray-900 rounded-xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer border ${isPastEvent ? 'border-slate-200 dark:border-gray-700 opacity-80' :
                              isTodayEvent ? 'border-blue-200 dark:border-blue-700' :
                                'border-slate-200 dark:border-gray-700'
                            }`}
                        >
                          <div className="flex items-center justify-between mb-2 gap-2">
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded-full text-[10px] sm:text-xs ${getEventTypeColor(event.type)} font-medium`}>
                                {getEventTypeLabel(event.type)}
                              </div>
                              <span className={`text-[10px] sm:text-xs font-medium ${isPastEvent ? 'text-slate-500 dark:text-gray-400' :
                                  isTodayEvent ? 'text-blue-600 dark:text-blue-300' :
                                    'text-slate-700 dark:text-gray-300'
                                }`}>
                                {format(event.date, 'MMM d')}
                              </span>
                            </div>
                            {isPastEvent && (
                              <span className="text-[10px] sm:text-xs text-slate-400 dark:text-gray-500">Past</span>
                            )}
                          </div>
                          <h5 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-gray-100 mb-1">{event.title}</h5>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 line-clamp-2">{event.description}</p>
                        </div>
                      );
                    })}

                    {(!selectedDate ? allMonthEvents : currentDateEvents).length === 0 && (
                      <div className="text-center py-8 text-sm text-slate-500 dark:text-gray-400">
                        No events found
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Summary - UPDATED to show only holidays and announcements */}
              <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-300 dark:border-gray-700">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-purple-600">{calendarMeta.summary.holidays}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Holidays</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-base sm:text-lg font-bold text-blue-600">{calendarMeta.summary.announcements}</div>
                    <div className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Announcements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="h-[70vh] flex flex-col w-full px-1 sm:px-2">
        {/* Header */}
        <div className="flex items-center justify-center mb-4 sm:mb-5 lg:mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              <FaChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-gray-300" />
            </button>
            <span className="font-medium text-sm sm:text-base text-slate-900 dark:text-gray-100 min-w-28 sm:min-w-32 text-center">
              {isLoading ? 'Loading...' : format(currentDate, 'MMMM yyyy')}
            </span>
            <button
              onClick={nextMonth}
              className="p-1.5 sm:p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              <FaChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Calendar Grid - Scrollable section */}
        <div className="mb-4 sm:mb-5 lg:mb-6 flex-shrink-0">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-[10px] sm:text-xs font-medium text-slate-500 dark:text-gray-400 py-1.5 sm:py-2">
                {day}
              </div>
            ))}

            {Array.from({ length: new Date(monthStart).getDay() }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-9 sm:h-10" />
            ))}

            {days.map(day => {
              const todayEvents: any = dayEvents(day);
              const hasEvents = todayEvents.length > 0;
              const isTodayDate = isToday(day);
              const isPast = isBefore(day, startOfDay(new Date())) && !isTodayDate;

              return (
                <div
                  key={day.toString()}
                  onClick={() => handleDayClick(day)}
                  className={`
                    h-9 sm:h-10 rounded-lg flex flex-col items-center justify-center relative cursor-pointer
                    ${hasEvents ? getDayBackgroundColor(day) : ''}
                    ${!isTodayDate && !hasEvents ? 'hover:bg-slate-100 dark:hover:bg-gray-800' : ''}
                    ${!isSameMonth(day, currentDate) ? 'opacity-30' : ''}
                    ${isTodayDate ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm' : ''}
                    ${hasEvents && !isTodayDate ? 'shadow-xs' : ''}
                    ${isPast ? 'opacity-60' : ''}
                    transition-all duration-200
                  `}
                >
                  <span className={`
                    text-xs sm:text-sm font-medium relative z-10
                    ${isTodayDate ? 'text-white' :
                      hasEvents ? 'font-semibold text-slate-800 dark:text-gray-100' : 'text-slate-700 dark:text-gray-300'}
                    ${isPast ? 'text-slate-500 dark:text-gray-500' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>

                  {/* Event indicator dots - only show if not today */}
                  {hasEvents && !isTodayDate && (
                    <div className="absolute -bottom-1 flex gap-0.5">
                      {todayEvents.slice(0, 3).map((event: { type: any; title: any; description: any; }, idx: Key | null | undefined) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(event.type).split(' ')[0]}`}
                          title={`${event.title}: ${event.description}`}
                        />
                      ))}
                      {todayEvents.length > 3 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-gray-600" title={`${todayEvents.length - 3} more events`} />
                      )}
                    </div>
                  )}

                  {/* Event count badge for today if it has events */}
                  {isTodayDate && hasEvents && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] sm:text-xs font-bold text-white">{todayEvents.length}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend for event types - UPDATED to show only holidays and announcements */}
          <div className="flex flex-wrap gap-2 mt-3 sm:mt-4 justify-center">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-purple-100"></div>
              <span className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-blue-100"></div>
              <span className="text-[10px] sm:text-xs text-slate-600 dark:text-gray-400">Announcement</span>
            </div>
          </div>
        </div>

        {/* Events List - Scrollable section */}
        <div className="space-y-2 sm:space-y-3 flex-grow overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-900 dark:text-gray-100 text-xs sm:text-sm">Upcoming Events</h4>
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400">
              {isLoading ? 'Loading...' : `${events.length} total events`}
            </span>
          </div>

          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <FaCalendarAlt className="h-5 w-5 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-gray-300">Loading events...</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-gray-400">Preparing calendar data</p>
              </div>
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-2 sm:space-y-3 h-full pr-1 overflow-hidden">
              {upcomingEvents.map((event: any, idx) => (
                <div
                  key={idx}
                  onClick={() => handleEventClick(event)}
                  className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 hover:from-slate-50 hover:to-slate-100 dark:hover:from-gray-700 dark:hover:to-gray-800 border border-slate-100 dark:border-gray-700 transition-all duration-300 cursor-pointer group"
                >
                  <div className={`px-2.5 sm:px-3 py-1.5 rounded-lg ${getEventTypeColor(event.type)} text-[10px] sm:text-xs font-medium min-w-10 sm:min-w-12 text-center`}>
                    {format(event.date, 'd')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-gray-100 text-xs sm:text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                      {event.title}
                    </p>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 truncate" title={event.description}>
                      {event.description}
                    </p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[10px] sm:text-xs ${getEventTypeColor(event.type)} whitespace-nowrap`}>
                    {getEventTypeLabel(event.type)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-slate-500 dark:text-gray-400 text-sm flex flex-col items-center justify-center h-full">
              No upcoming holidays or announcements
            </div>
          )}
        </div>

        {/* View more link */}
        <div className="pt-2 text-center border-t border-gray-100 dark:border-gray-800 mt-2">
          <button
            className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors inline-flex items-center gap-1"
            onClick={() => {
              setInternalFullScreen(true);
              setSelectedDate(null);
              setSelectedEvent(null);
            }}
          >
             View more events
              <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Full Screen Modal */}
      <FullScreenView />
    </>
  );
};
