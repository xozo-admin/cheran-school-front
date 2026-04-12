// src/components/dashboard/ExamsOverview.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  BookOpen,
  Users,
  Percent,
  Award,
  BarChart3,
  CircleDot,
  AlertTriangle,
  CheckCheck,
  XCircle,
  PencilLine,
  Layers,
  Eye,
  GraduationCap,
  School,
  Trophy,
  Star,
  UserPlus,
  RefreshCw,
  Sparkles,
  Target,
  Zap,
  Activity,
  PieChart,
  TrendingUp as TrendingIcon
} from 'lucide-react';

import { adminApi } from '@/lib/api';

// Types for all possible responses
interface AcademicYear {
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
}

interface ExamOverviewSuccess {
  status: 200;
  message: string;
  academic_year: AcademicYear;
  timestamp: string;
  data: ExamData;
}

interface ExamData {
  quick_stats: QuickStats;
  exam_breakdown: ExamBreakdown;
  marks_upload_status: MarksUploadStatus;
  class_completion_summary: ClassCompletion[];
  top_performers?: TopPerformer[];
  recent_activity: RecentActivity;
  pending_tasks: PendingTasks;
  alerts: Alert[];
}

interface QuickStats {
  total_scheduled_exams: number;
  upcoming_exams: number;
  ongoing_exams: number;
  completed_exams: number;
  marks_completion_percentage: number;
  pending_approvals: number;
  subjects_without_marks: number;
  total_students_enrolled: number;
}

interface ExamBreakdown {
  by_status: {
    upcoming: number;
    ongoing: number;
    completed: number;
  };
  by_term: TermExam[];
}

interface TermExam {
  term: string;
  exams: Array<{
    name: string;
    count: number;
  }>;
  total: number;
}

interface MarksUploadStatus {
  total_marks_entered: number;
  total_marks_expected: number;
  completion_percentage: number;
  pending_subjects: PendingSubject[];
}

interface PendingSubject {
  exam: string;
  term: string;
  class: string;
  subject: string;
  students_pending: number;
}

interface ClassCompletion {
  class: string;
  total_students: number;
  marks_uploaded: number;
  marks_expected: number;
  completion_percentage: number;
}

interface TopPerformer {
  class: string;
  total_students: number;
  overall_toppers: StudentTopper[];
  subject_toppers: SubjectTopper[];
  class_average: number;
}

interface StudentTopper {
  student_id: string;
  student_name: string;
  section: string;
  total_marks: number;
  percentage: number;
  exams_attempted: number;
  grade: string;
}

interface SubjectTopper {
  subject: string;
  student_name: string;
  marks: string;
  percentage: number;
}

interface RecentActivity {
  new_exams_scheduled: NewExam[];
  recent_uploads: RecentUpload[];
  recently_completed_exams: CompletedExam[];
}

interface NewExam {
  id: number;
  exam: string;
  classes: string;
  start_date: string;
  created_at: string;
}

interface RecentUpload {
  exam: string;
  subject: string;
  marks_entered: number;
  last_updated: string;
}

interface CompletedExam {
  id: number;
  name: string;
  term: string;
  end_date: string;
  classes: string;
}

interface PendingTasks {
  approval_requests: number;
  marks_to_upload: number;
}

interface Alert {
  type: string;
  message: string;
}

interface ErrorResponse {
  error?: string;
  detail?: string;
}

type ApiResponse = ExamOverviewSuccess | ErrorResponse;

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

// Quick Stat Card Component
const ExamStatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = 'blue',
  subtitle = '',
  trend = null,
  trendType = 'neutral',
  prefix = '',
  suffix = ''
}: { 
  title: string; 
  value: string | number; 
  icon: any;
  color?: string;
  subtitle?: string;
  trend?: number | string | null;
  trendType?: 'increase' | 'decrease' | 'neutral';
  prefix?: string;
  suffix?: string;
}) => {
  const colors: any = {
    blue: 'text-blue-700 dark:text-blue-300 ring-1 ring-blue-200/80 dark:ring-blue-700/40',
    green: 'text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200/80 dark:ring-emerald-700/40',
    orange: 'text-orange-700 dark:text-orange-300 ring-1 ring-orange-200/80 dark:ring-orange-700/40',
    purple: 'text-violet-700 dark:text-violet-300 ring-1 ring-violet-200/80 dark:ring-violet-700/40',
    red: 'text-rose-700 dark:text-rose-300 ring-1 ring-rose-200/80 dark:ring-rose-700/40',
    indigo: 'text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200/80 dark:ring-indigo-700/40',
    yellow: 'text-amber-700 dark:text-amber-300 ring-1 ring-amber-200/80 dark:ring-amber-700/40',
    gray: 'text-slate-700 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-700/40',
  };

  const iconBgColors: any = {
    blue: 'bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/40 dark:to-sky-900/40',
    green: 'bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40',
    orange: 'bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40',
    purple: 'bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/40 dark:to-purple-900/40',
    red: 'bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/40 dark:to-red-900/40',
    indigo: 'bg-gradient-to-br from-indigo-100 to-blue-100 dark:from-indigo-900/40 dark:to-blue-900/40',
    yellow: 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/40 dark:to-amber-900/40',
    gray: 'bg-gradient-to-br from-slate-100 to-gray-100 dark:from-slate-800 dark:to-gray-800',
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50/70 to-indigo-50/60 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/40 p-3 sm:p-4 lg:p-5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 transition-all hover:shadow-lg shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5 sm:mb-2">{title}</p>
          <div className="flex items-baseline">
            {prefix && <span className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300 mr-1">{prefix}</span>}
            <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            {suffix && <span className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 ml-1">{suffix}</span>}
          </div>
          {subtitle && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`rounded-lg p-2 sm:p-2.5 ${iconBgColors[color] || iconBgColors.blue} ${colors[color] || colors.blue}`}>
          <Icon size={18} />
        </div>
      </div>
      {trend !== null && (
        <div className={`flex items-center mt-2.5 sm:mt-3 text-[10px] sm:text-xs font-medium ${
          trendType === 'increase' ? 'text-green-600 dark:text-green-400' : 
          trendType === 'decrease' ? 'text-red-600 dark:text-red-400' : 
          'text-gray-600 dark:text-gray-400'
        }`}>
          {trendType === 'increase' && <TrendingUp size={14} className="mr-1" />}
          {trendType === 'decrease' && <TrendingDown size={14} className="mr-1" />}
          {trend}
        </div>
      )}
    </div>
  );
};

// Progress Circle Component
const ProgressCircle = ({ percentage, size = 100, strokeWidth = 8 }: { percentage: number; size?: number; strokeWidth?: number }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  
  const getColor = () => {
    if (percentage >= 75) return '#22c55e';
    if (percentage >= 50) return '#eab308';
    if (percentage >= 25) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          className="dark:stroke-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{percentage}%</span>
      </div>
    </div>
  );
};

// Term Breakdown Component
const TermBreakdown = ({ termData }: { termData: TermExam[] }) => {
  const [expandedTerms, setExpandedTerms] = useState<string[]>(termData.map(t => t.term));

  const toggleTerm = (term: string) => {
    setExpandedTerms(prev => 
      prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
    );
  };

  const formatTermName = (term: string) => {
    return term.charAt(0).toUpperCase() + term.slice(1).replace(/_/g, ' ');
  };

  const getTermColor = (term: string) => {
    if (term.includes('1')) return 'blue';
    if (term.includes('2')) return 'green';
    if (term.includes('3')) return 'purple';
    return 'gray';
  };

  const getTermIcon = (term: string) => {
    if (term.includes('1')) return <Target size={16} />;
    if (term.includes('2')) return <Activity size={16} />;
    if (term.includes('3')) return <Zap size={16} />;
    return <Layers size={16} />;
  };

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Layers size={20} className="text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Exams by Term</h3>
      </div>
      
      <div className="space-y-3">
        {termData.map((term) => {
          const color = getTermColor(term.term);
          return (
            <div key={term.term} className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleTerm(term.term)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    color === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                    color === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                    'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                  }`}>
                    {getTermIcon(term.term)}
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatTermName(term.term)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {term.total} {term.total === 1 ? 'Exam' : 'Exams'}
                    </p>
                  </div>
                </div>
                {expandedTerms.includes(term.term) ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              
              {expandedTerms.includes(term.term) && (
                <div className="p-4 space-y-2">
                  {term.exams.map((exam, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{exam.name}</span>
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
                        {exam.count} {exam.count === 1 ? 'exam' : 'exams'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Upcoming</span>
            <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">{termData.reduce((acc, term) => acc + term.total, 0) * 0.2}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Ongoing</span>
            <p className="text-lg font-semibold text-green-600 dark:text-green-400">{termData.reduce((acc, term) => acc + term.total, 0) * 0.1}</p>
          </div>
          <div className="text-center">
            <span className="text-xs text-gray-500 dark:text-gray-400">Completed</span>
            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">{termData.reduce((acc, term) => acc + term.total, 0) * 0.7}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Pending Subjects Table - Updated to show message when empty
const PendingSubjectsTable = ({ pendingSubjects }: { pendingSubjects: PendingSubject[] }) => {
  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-purple-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-purple-950/20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={20} className="text-orange-600 dark:text-orange-400" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Marks Upload Status</h3>
        </div>
        {pendingSubjects.length > 0 && (
          <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">
            {pendingSubjects.length} subjects
          </span>
        )}
      </div>
      
      {pendingSubjects.length === 0 ? (
        <div className="text-center py-8">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full inline-flex mx-auto mb-4">
            <CheckCheck size={24} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-gray-900 dark:text-white font-medium">All marks uploaded!</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">No pending subjects to upload marks for</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1">
          {pendingSubjects.map((item, index) => {
            const subjectColor = getSubjectColor(item.subject);
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  !subjectColor ? 'bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50' : ''
                }`}
                style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className={`font-medium truncate ${!subjectColor ? 'text-gray-900 dark:text-white' : ''}`}
                      style={subjectColor ? { color: subjectColor.text } : undefined}
                    >
                      {item.subject}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full whitespace-nowrap">
                      Class {item.class}
                    </span>
                  </div>
                  <p
                    className={`text-xs truncate ${!subjectColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                    style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                  >
                    {item.exam} • {item.term.replace('_', ' ')}
                  </p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {item.students_pending}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-500">pending</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Class Completion Cards
const ClassCompletionCards = ({ classes }: { classes: ClassCompletion[] }) => {
  const [showAll, setShowAll] = useState(false);
  const displayedClasses = showAll ? classes : classes.slice(0, 5);

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-yellow-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-yellow-950/20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-purple-600 dark:text-purple-400" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Class-wise Progress</h3>
        </div>
        {classes.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            {showAll ? 'Show Less' : `View All (${classes.length})`}
            {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
      </div>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {displayedClasses.map((cls) => (
          <div key={cls.class} className="p-3 sm:p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold text-gray-900 dark:text-white">Class {cls.class}</span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {cls.total_students} students
                </p>
              </div>
              <div className="text-right">
                <span className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{cls.completion_percentage}%</span>
                <p className="text-xs text-gray-500 dark:text-gray-500">complete</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400">Marks uploaded</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {cls.marks_uploaded} / {cls.marks_expected}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${
                    cls.completion_percentage >= 75 ? 'bg-green-500' :
                    cls.completion_percentage >= 50 ? 'bg-yellow-500' :
                    cls.completion_percentage >= 25 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${cls.completion_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Top Performers Component
const TopPerformers = ({ topPerformers }: { topPerformers?: TopPerformer[] }) => {
  const [selectedClass, setSelectedClass] = useState<string>('');

  if (!topPerformers || topPerformers.length === 0) {
    return null;
  }

  const currentClass = selectedClass || topPerformers[0]?.class;
  const classData = topPerformers.find(c => c.class === currentClass);

  if (!classData) return null;

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-blue-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-blue-950/20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-yellow-600 dark:text-yellow-400" />
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Top Performers</h3>
        </div>
        {topPerformers.length > 1 && (
          <select
            value={currentClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="text-xs sm:text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 sm:px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {topPerformers.map((c) => (
              <option key={c.class} value={c.class}>Class {c.class}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-4">
        {/* Class Average with Progress */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-indigo-50 dark:from-gray-700/30 dark:to-indigo-900/20 rounded-lg">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Class Average</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-600 dark:bg-indigo-400 rounded-full"
                style={{ width: `${classData.class_average}%` }}
              ></div>
            </div>
            <span className="text-base font-bold text-indigo-600 dark:text-indigo-400">{classData.class_average}%</span>
          </div>
        </div>

        {/* Overall Toppers */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
            <Star size={14} className="text-yellow-500" />
            Overall Toppers
          </h4>
          <div className="space-y-2">
            {classData.overall_toppers?.map((topper, idx) => (
              <div key={topper.student_id} className="flex items-center justify-between p-2.5 sm:p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{topper.student_name}</span>
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                      Sec {topper.section}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full">
                      Grade {topper.grade}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {topper.exams_attempted} exams • {topper.total_marks.toFixed(1)} marks
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-base sm:text-lg font-bold text-yellow-600 dark:text-yellow-400">{topper.percentage.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Toppers */}
        {classData.subject_toppers && classData.subject_toppers.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
              <BookOpen size={14} className="text-blue-500" />
              Subject Toppers
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {classData.subject_toppers.map((topper, idx) => {
                const subjectColor = getSubjectColor(topper.subject);
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      !subjectColor ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30' : ''
                    }`}
                    style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                  >
                    <div>
                      <span
                        className={`text-sm font-medium ${!subjectColor ? 'text-gray-900 dark:text-white' : ''}`}
                        style={subjectColor ? { color: subjectColor.text } : undefined}
                      >
                        {topper.subject}
                      </span>
                      <p
                        className={`text-xs ${!subjectColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                        style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                      >
                        {topper.student_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-sm font-semibold ${!subjectColor ? 'text-blue-600 dark:text-blue-400' : ''}`}
                        style={subjectColor ? { color: subjectColor.text } : undefined}
                      >
                        {topper.marks}
                      </span>
                      <p
                        className={`text-xs ${!subjectColor ? 'text-gray-500 dark:text-gray-500' : ''}`}
                        style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                      >
                        {topper.percentage}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Recent Activity Component
const RecentActivity = ({ activity }: { activity: RecentActivity }) => {
  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-red-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-red-950/20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock size={20} className="text-blue-600 dark:text-blue-400" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
      </div>
      
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {/* New Exams Scheduled */}
        {activity.new_exams_scheduled?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 flex items-center gap-1">
              <Sparkles size={12} className="text-green-500" />
              New Exams Scheduled ({activity.new_exams_scheduled.length})
            </h4>
            {activity.new_exams_scheduled.map((exam) => (
              <div key={exam.id} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg mb-2 hover:bg-green-100 dark:hover:bg-green-900/20 transition-colors">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
                  <FileText size={14} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{exam.exam}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Class {exam.classes} • Starts {new Date(exam.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Recent Uploads */}
        {activity.recent_uploads?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 flex items-center gap-1">
              <PencilLine size={12} className="text-blue-500" />
              Recent Uploads ({activity.recent_uploads.length})
            </h4>
            {activity.recent_uploads.map((upload, idx) => {
              const subjectColor = getSubjectColor(upload.subject);
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg border mb-2 transition-colors ${
                    !subjectColor ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20' : ''
                  }`}
                  style={subjectColor ? getSubjectGradientStyle(subjectColor) : undefined}
                >
                  <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex-shrink-0">
                    <PencilLine size={14} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium truncate ${!subjectColor ? 'text-gray-900 dark:text-white' : ''}`}
                      style={subjectColor ? { color: subjectColor.text } : undefined}
                    >
                      {upload.exam}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${!subjectColor ? 'text-gray-600 dark:text-gray-400' : ''}`}
                      style={subjectColor ? { color: subjectColor.text, opacity: 0.95 } : undefined}
                    >
                      {upload.subject} • {upload.marks_entered} marks entered • {upload.last_updated}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Recently Completed Exams */}
        {activity.recently_completed_exams?.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider mb-2 sticky top-0 bg-white dark:bg-gray-800 py-1 flex items-center gap-1">
              <CheckCircle2 size={12} className="text-purple-500" />
              Recently Completed ({activity.recently_completed_exams.length})
            </h4>
            {activity.recently_completed_exams.map((exam) => (
              <div key={exam.id} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors">
                <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex-shrink-0">
                  <CheckCircle2 size={14} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{exam.name}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Class {exam.classes} • {exam.term}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Activity Message */}
        {activity.new_exams_scheduled?.length === 0 && 
         activity.recent_uploads?.length === 0 && 
         activity.recently_completed_exams?.length === 0 && (
          <div className="text-center py-8">
            <Clock size={32} className="mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">New activities will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Alerts Component
const AlertsSection = ({ alerts }: { alerts: Alert[] }) => {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-amber-50/30 dark:from-slate-900 dark:via-slate-800 dark:to-amber-950/20 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} className="text-amber-600 dark:text-amber-400" />
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Alerts & Notifications</h3>
      </div>
      
      <div className="space-y-3 max-h-[240px] sm:max-h-[300px] overflow-y-auto pr-1">
        {alerts.map((alert, index) => {
          let bgColor = 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30';
          let iconColor = 'text-blue-600 dark:text-blue-400';
          let Icon = AlertCircle;

          if (alert.type === 'warning') {
            bgColor = 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-900/30';
            iconColor = 'text-amber-600 dark:text-amber-400';
            Icon = AlertTriangle;
          } else if (alert.type === 'error') {
            bgColor = 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/30';
            iconColor = 'text-red-600 dark:text-red-400';
            Icon = XCircle;
          }

          return (
            <div 
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor}`}
            >
              <Icon size={14} className={`${iconColor} flex-shrink-0 mt-0.5`} />
              <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200">{alert.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Loading State
const LoadingState = () => (
  <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-5 sm:p-8">
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <School className="h-8 w-8 text-blue-600 animate-pulse" />
        </div>
      </div>
      <div className="mt-6 text-center">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Loading exam overview...</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Preparing your school analytics</p>
      </div>
    </div>
  </div>
);

// Error State Component
const ErrorState = ({ 
  error, 
  status, 
  onRetry 
}: { 
  error: string; 
  status?: number; 
  onRetry: () => void;
}) => {
  const getErrorConfig = () => {
    if (error.includes('Academic Year')) {
      return {
        icon: School,
        title: 'Academic Year Not Configured',
        message: 'Please set up an academic year to start managing exams.',
        actionLabel: 'Configure Academic Year'
      };
    }
    if (status === 403 || error.includes('permission')) {
      return {
        icon: AlertTriangle,
        title: 'Access Denied',
        message: "You don't have permission to view exam overview. Please contact your administrator.",
        actionLabel: 'Request Access'
      };
    }
    if (status === 401) {
      return {
        icon: XCircle,
        title: 'Authentication Required',
        message: 'Please log in to view exam overview.',
        actionLabel: 'Log In'
      };
    }
    return {
      icon: AlertCircle,
      title: 'Unable to Load Data',
      message: error || 'An unexpected error occurred. Please try again.',
      actionLabel: 'Retry'
    };
  };

  const config = getErrorConfig();

  return (
    <div className="bg-gradient-to-br from-white via-slate-50 to-rose-50/40 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 sm:p-10 text-center">
      <div className="flex flex-col items-center">
        <div className="p-3 sm:p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
          <config.icon size={28} className="text-red-600 dark:text-red-400" />
        </div>
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">{config.title}</h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">{config.message}</p>
        <button
          onClick={onRetry}
          className="w-full sm:w-auto px-5 sm:px-6 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
        >
          <RefreshCw size={18} />
          {config.actionLabel}
        </button>
      </div>
    </div>
  );
};

// Main ExamsOverview Component
export const ExamsOverview = () => {
  const [examData, setExamData] = useState<ExamOverviewSuccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.exams.overview();

      if (response.data?.status === 200) {
        setExamData(response.data);
      } else {
        setError({
          message: response.data?.message || 'Failed to load exam overview',
          status: response.status,
        });
      }
    } catch (err: any) {
      console.error('Exam Overview Error:', err);

      setError({
        message:
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Something went wrong',
        status: err?.response?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, []);

  const handleRetry = () => {
    fetchExamData();
  };

  // Loading State
  if (loading) {
    return <LoadingState />;
  }

  // Error State
  if (error) {
    return (
      <ErrorState 
        error={error.message}
        status={error.status}
        onRetry={fetchExamData}
      />
    );
  }

  // No Data State
  if (!examData) {
    return (
      <div className="bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950/30 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm p-6 text-center">
        <div className="flex flex-col items-center py-8">
          <FileText size={48} className="text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Exam Data Available</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">There are no exams scheduled or data to display at the moment.</p>
          <button
            onClick={() => window.location.href = '/admin/academics/examination'}
            className="px-6 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-lg hover:from-sky-700 hover:to-indigo-700 transition-colors"
          >
            Schedule Exam
          </button>
        </div>
      </div>
    );
  }

  const { data, academic_year, timestamp } = examData;
  const { quick_stats, marks_upload_status, pending_tasks, top_performers } = data;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with Academic Year */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-violet-600 dark:from-sky-700 dark:via-indigo-700 dark:to-violet-700 rounded-xl p-4 sm:p-6 text-white shadow-lg border border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2">Exams Overview</h2>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm opacity-90">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>Academic Year: {academic_year.name}</span>
              </div>
              {academic_year.is_current && (
                <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">Current</span>
              )}
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>Updated: {new Date(timestamp).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                })}</span>
              </div>
            </div>
          </div>
          
          {/* Compact View Toggle for Mobile */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="lg:hidden w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-sm"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            <span>{expanded ? 'Show Less' : 'Show More'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid - Always Visible */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ExamStatCard
          title="Total Exams"
          value={quick_stats.total_scheduled_exams}
          icon={FileText}
          color="blue"
          subtitle="Scheduled exams"
        />
        <ExamStatCard
          title="Completion Rate"
          value={quick_stats.marks_completion_percentage}
          icon={Percent}
          color={quick_stats.marks_completion_percentage >= 75 ? 'green' : quick_stats.marks_completion_percentage >= 50 ? 'yellow' : 'orange'}
          suffix="%"
          subtitle={`${marks_upload_status.total_marks_entered}/${marks_upload_status.total_marks_expected} marks`}
        />
        <ExamStatCard
          title="Pending Tasks"
          value={pending_tasks.marks_to_upload}
          icon={PencilLine}
          color="orange"
          subtitle={`${pending_tasks.approval_requests} approvals`}
        />
        <ExamStatCard
          title="Students"
          value={quick_stats.total_students_enrolled}
          icon={Users}
          color="purple"
          subtitle="Enrolled"
        />
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <ExamStatCard
          title="Upcoming"
          value={quick_stats.upcoming_exams}
          icon={Calendar}
          color="green"
        />
        <ExamStatCard
          title="Ongoing"
          value={quick_stats.ongoing_exams}
          icon={Clock}
          color="yellow"
        />
        <ExamStatCard
          title="Completed"
          value={quick_stats.completed_exams}
          icon={CheckCircle2}
          color="indigo"
        />
        <ExamStatCard
          title="Pending Subjects"
          value={quick_stats.subjects_without_marks}
          icon={BookOpen}
          color="red"
          subtitle="No marks uploaded"
        />
      </div>

      {/* Main Content - Responsive Grid */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 transition-all duration-300 ${
        !expanded ? 'hidden lg:grid' : 'grid'
      }`}>
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <TermBreakdown termData={data.exam_breakdown.by_term} />
          <PendingSubjectsTable pendingSubjects={marks_upload_status.pending_subjects} />
        </div>

        {/* Middle Column */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          <ClassCompletionCards classes={data.class_completion_summary} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <RecentActivity activity={data.recent_activity} />
            <AlertsSection alerts={data.alerts} />
          </div>
        </div>
      </div>

      {/* Top Performers Section - Full Width */}
      {top_performers && top_performers.length > 0 && (
        <div className={`${!expanded ? 'hidden lg:block' : 'block'}`}>
          <TopPerformers topPerformers={top_performers} />
        </div>
      )}

      {/* Mobile Expandable Content */}
      {!expanded && (
        <div className="lg:hidden text-center py-4">
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-slate-100 to-indigo-100 dark:from-slate-800 dark:to-indigo-900/40 rounded-lg text-sm sm:text-base text-slate-700 dark:text-slate-200 hover:from-slate-200 hover:to-indigo-200 dark:hover:from-slate-700 dark:hover:to-indigo-800/50 transition-all border border-slate-200/70 dark:border-slate-700/70"
          >
            <Eye size={18} />
            View Complete Exam Overview
            <ChevronDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
};
