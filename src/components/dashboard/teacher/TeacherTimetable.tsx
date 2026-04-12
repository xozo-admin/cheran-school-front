// teachertimetable.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCalendarAlt, FaClock, FaChalkboardTeacher, FaBook, FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { teacherAPI } from '@/lib/api/teacher';
import { toastError, toastSuccess } from '@/lib/toast';

interface TimetableSlot {
  day: string;
  period_no: number;
  start_time: string;
  end_time: string;
  class_name: string;
  section_name: string;
  subject_name: string;
}

interface TeacherTimetableProps {
  timetableData: any;
  onRefresh: () => void;
}

export const TeacherTimetable = ({ timetableData, onRefresh }: TeacherTimetableProps) => {
  const [currentWeek, setCurrentWeek] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timetable, setTimetable] = useState<Record<string, TimetableSlot[]>>({});

  useEffect(() => {
    loadTimetable();
  }, [currentWeek, timetableData]);

  const loadTimetable = async () => {
    try {
      setLoading(true);
      
      if (timetableData?.timetable) {
        // Format the timetable data from API
        const formattedTimetable: Record<string, TimetableSlot[]> = {};
        
        Object.entries(timetableData.timetable).forEach(([day, slots]: [string, any]) => {
          if (Array.isArray(slots)) {
            formattedTimetable[day] = slots.map((slot: any) => ({
              day,
              period_no: slot.period || slot.period_no || 1,
              start_time: slot.start_time || slot.time?.split(' - ')[0] || '9:00',
              end_time: slot.end_time || slot.time?.split(' - ')[1] || '10:00',
              class_name: slot.class_name || slot.class || 'Class',
              section_name: slot.section_name || slot.section || 'A',
              subject_name: slot.subject_name || slot.subject || 'Subject'
            }));
          }
        });
        
        setTimetable(formattedTimetable);
      } else {
        // If no data, show empty timetable
        setTimetable({});
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
      toastError('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + currentWeek * 7);

  const getWeekDates = () => {
    const dates = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay() + 1); // Start from Monday
    
    for (let i = 0; i < 6; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const weekDates = getWeekDates();

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => prev - 1);
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => prev + 1);
  };

  const handleToday = () => {
    setCurrentWeek(0);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'bg-blue-100 text-blue-600 border-blue-200',
      'Science': 'bg-green-100 text-green-600 border-green-200',
      'English': 'bg-purple-100 text-purple-600 border-purple-200',
      'Physics': 'bg-amber-100 text-amber-600 border-amber-200',
      'Chemistry': 'bg-red-100 text-red-600 border-red-200',
      'Biology': 'bg-emerald-100 text-emerald-600 border-emerald-200',
      'History': 'bg-orange-100 text-orange-600 border-orange-200',
      'Geography': 'bg-cyan-100 text-cyan-600 border-cyan-200'
    };
    return colors[subject] || 'bg-slate-100 text-slate-600 border-slate-200';
  };

  if (loading) {
    return (
      <div className="backdrop-blur-sm rounded-2xl border border-slate-200/50 bg-white/90 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-7 gap-2">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-24 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasTimetableData = Object.keys(timetable).length > 0;

  return (
    <div className="backdrop-blur-sm rounded-2xl border border-slate-200/50 bg-white/90 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg">
            <FaCalendarAlt className="text-indigo-600 w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Weekly Timetable</h3>
            <p className="text-sm text-slate-500">Your teaching schedule for the week</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handlePreviousWeek}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <FaArrowLeft className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleToday}
            className="px-4 py-2 border border-slate-300 text-slate-700 text-sm rounded-lg hover:bg-slate-50 transition-all"
          >
            Today
          </button>
          
          <button
            onClick={handleNextWeek}
            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
          >
            <FaArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {days.map((day, index) => {
          const date = weekDates[index];
          return (
            <div key={day} className="text-center">
              <div className={`text-sm font-medium mb-1 ${isToday(date) ? 'text-blue-600' : 'text-slate-600'}`}>
                {day.substring(0, 3)}
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm ${
                isToday(date) 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'text-slate-500'
              }`}>
                {date.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {hasTimetableData ? (
        <>
          {/* Timetable grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <div key={day} className="min-h-[300px]">
                <div className="text-center text-sm font-medium text-slate-600 mb-2">
                  {timetable[day]?.length || 0} classes
                </div>
                
                <div className="space-y-2">
                  {timetable[day]?.map((slot, index) => (
                    <motion.div
                      key={`${day}-${slot.period_no}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-3 rounded-lg border ${getSubjectColor(slot.subject_name)}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <FaClock className="w-3 h-3" />
                        <span className="text-xs font-medium">
                          {slot.start_time} - {slot.end_time}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-sm mb-1">{slot.subject_name}</h4>
                      
                      <div className="flex items-center gap-2 text-xs">
                        <FaChalkboardTeacher className="w-3 h-3" />
                        <span>{slot.class_name}-{slot.section_name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs mt-1">
                        <FaBook className="w-3 h-3" />
                        <span>Period {slot.period_no}</span>
                      </div>
                    </motion.div>
                  ))}
                  
                  {(!timetable[day] || timetable[day].length === 0) && (
                    <div className="text-center py-4">
                      <div className="text-slate-400 text-sm">No classes</div>
                      <p className="text-xs text-slate-500">Free period</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Total classes this week: {
                  Object.values(timetable).reduce((total, daySlots) => total + daySlots.length, 0)
                }
              </div>
              <button 
                onClick={onRefresh}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Refresh Timetable →
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-3">No timetable data available</div>
          <p className="text-sm text-slate-500 mb-6">Your timetable will appear here once scheduled</p>
          <button 
            onClick={onRefresh}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            Refresh Timetable
          </button>
        </div>
      )}
    </div>
  );
};