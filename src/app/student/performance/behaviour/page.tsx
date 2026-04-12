// app/student/performance/behavior/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  FaChartLine,
  FaFilter,
  FaSearch,
  FaBook,
  FaUser,
  FaStar,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaChartBar,
  FaCalendarAlt,
  FaDownload,
  FaPrint,
  FaLightbulb,
  FaComments,
  FaAward,
  FaTrophy,
  FaRegStar,
  FaRegChartBar,
  FaSpinner,
  FaTimes,
  FaInfoCircle
} from 'react-icons/fa';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { studentApi } from '@/lib/api';
import { ResponsiveContainer, AreaChart as ReAreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, BarChart as ReBarChart, Bar, Legend } from 'recharts';

interface BehaviorDataPoint {
  exam: string;
  value: number;
  change_percentage: number;
  trend: 'increase' | 'decrease' | 'neutral';
}

interface TermBreakdownItem {
  subject: string;
  aggregated_score: number;
  max_score: number;
}

interface BehaviorResponse {
  status: number;
  type?: string;
  student: string;
  view?: string;
  subject?: string;
  behaviour_category?: string;
  graph_data?: BehaviorDataPoint[];
  term?: string;
  breakdown?: TermBreakdownItem[];
  error?: string;
}

interface Subject {
  id: number;
  name: string;
  subject_code: string;
}

interface StudentProfile {
  student_id: string;
  student_name: string;
  student_email: string;
  father_phone: string;
  mother_phone: string;
  father_name: string;
  mother_name: string;
  address: string;
  date_of_birth: string;
  gender: string;
  class_name: string;
  section: string;
}

// Behavior traits mapping
const BEHAVIOR_TRAITS = [
  { key: 'participation', label: 'Participation', color: '#3B82F6' },
  { key: 'responsibility', label: 'Responsibility', color: '#10B981' },
  { key: 'discipline', label: 'Discipline', color: '#EF4444' },
  { key: 'attitude', label: 'Attitude', color: '#F59E0B' },
  { key: 'collaboration', label: 'Collaboration', color: '#8B5CF6' }
];

export default function BehaviorReportsPage() {
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [behaviorData, setBehaviorData] = useState<BehaviorResponse | null>(null);
  const [overallData, setOverallData] = useState<BehaviorResponse | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  
  // Filter states
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTrait, setSelectedTrait] = useState<string>('');
  const [viewType, setViewType] = useState<'overall' | 'subject' | 'trait' | 'term' | 'subject_trait'>('overall');
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch student subjects - using actual API
  const fetchStudentSubjects = async () => {
    try {
      setSubjectsLoading(true);
      const response = await studentApi.subjects.mySubjects();
      const data = response.data?.data || response.data;
      
      if (data.status === 200 && data.subjects) {
        setSubjects(data.subjects);
        
        // Extract available terms from subjects if available
        const terms:any = Array.from(new Set(data.subjects.map((subject: any) => subject.term || '').filter(Boolean)));
        if (terms.length > 0) {
          setAvailableTerms(terms);
        } else {
          // Default terms if none available
          setAvailableTerms(['Term 1', 'Term 2', 'Term 3', 'Term 4']);
        }
        
        // Set default subject if available
        if (data.subjects.length > 0 && !selectedSubject) {
          setSelectedSubject(data.subjects[0].name);
        }
      }

    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('Access Denied');
        return;
      }
      console.error('Error fetching subjects:', error);
      toastError(error.message || 'Failed to load subjects');
    } finally {
      setSubjectsLoading(false);
    }
  };

  // Fetch student profile - using actual API
  const fetchStudentProfile = async () => {
    try {
      const response = await studentApi.profile.get();
      const data = response.data?.data || response.data;
      
      setStudentProfile(data);

    } catch (error: any) {
      if (error?.response?.status === 403) {
        toastError('Access Denied');
        return;
      }
      console.error('Error fetching student profile:', error);
      toastError(error.message || 'Failed to load student profile');
    }
  };

  // Fetch behavior data with filters - using actual API
  const fetchBehaviorData = async () => {
    try {
      setLoading(true);
      
      const params: Record<string, string> = {};
      if (selectedTerm) params.term = selectedTerm;
      if (selectedSubject) params.subject = selectedSubject;
      if (selectedTrait) params.trait = selectedTrait;

      const response = await studentApi.behaviour.analytics(params);
      const data: BehaviorResponse = response.data?.data || response.data;
      
      // Check if there's an error in the response
      if (data.error) {
        setBehaviorData({
          status: data.status || response.status || 500,
          student: data.student || studentProfile?.student_name || '',
          error: data.error
        });
        return;
      }
      
      setBehaviorData(data);

      if (data.graph_data && data.graph_data.length > 0) {
        const terms = data.graph_data.map(point => point.exam).filter(Boolean);
        if (terms.length > 0) {
          setAvailableTerms(terms);
        }
      }
      
      // Determine view type based on response
      if (data.breakdown) {
        setViewType('term');
      } else if (data.subject && data.behaviour_category) {
        setViewType('subject_trait');
      } else if (data.subject) {
        setViewType('subject');
      } else if (data.behaviour_category) {
        setViewType('trait');
      } else {
        setViewType('overall');
      }

    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load behavior data';
      setBehaviorData({
        status: error?.response?.status || 500,
        student: studentProfile?.student_name || '',
        error: message
      });
      if (error?.response?.status === 403) {
        toastError('Access Denied or Not Enrolled');
        return;
      }
      if (error?.response?.status === 500) {
        toastError('No Active Academic Year');
        return;
      }
      console.error('Error fetching behavior data:', error);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOverallBehaviorData = async () => {
    try {
      const response = await studentApi.behaviour.analytics({});
      const data: BehaviorResponse = response.data?.data || response.data;
      if (data.error) {
        setOverallData({
          status: data.status || response.status || 500,
          student: data.student || studentProfile?.student_name || '',
          error: data.error
        });
        return;
      }
      setOverallData(data);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Failed to load overall behavior data';
      setOverallData({
        status: error?.response?.status || 500,
        student: studentProfile?.student_name || '',
        error: message
      });
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTerm('');
    setSelectedSubject('');
    setSelectedTrait('');
    setViewType('overall');
  };

  // Apply filters and fetch data
  const applyFilters = () => {
    fetchBehaviorData();
  };

  useEffect(() => {
    fetchStudentSubjects();
    fetchStudentProfile();
  }, []);

  useEffect(() => {
    fetchBehaviorData();
  }, []);

  useEffect(() => {
    fetchOverallBehaviorData();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increase': return <FaArrowUp className="text-green-500 animate-bounce" />;
      case 'decrease': return <FaArrowDown className="text-red-500 animate-pulse" />;
      default: return <FaMinus className="text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increase': return 'text-green-600 dark:text-green-400';
      case 'decrease': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getRatingColor = (value: number) => {
    if (value >= 4.5) return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (value >= 4.0) return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (value >= 3.5) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  const getStarRating = (value: number) => {
    const fullStars = Math.floor(value);
    const hasHalfStar = value % 1 >= 0.5;
    
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-lg">
            {i < fullStars ? (
              <FaStar className="text-yellow-500 animate-pulse" />
            ) : i === fullStars && hasHalfStar ? (
              <FaRegStar className="text-yellow-500" />
            ) : (
              <FaRegStar className="text-gray-300 dark:text-gray-600" />
            )}
          </span>
        ))}
        <span className="ml-2 font-medium text-gray-900 dark:text-white">
          {value.toFixed(1)}
        </span>
      </div>
    );
  };

  const calculateAverageRatingFrom = (data: BehaviorResponse | null) => {
    if (!data) return 0;
    
    if (data.breakdown) {
      const total = data.breakdown.reduce((sum, item) => sum + item.aggregated_score, 0);
      return total / data.breakdown.length;
    }
    
    if (data.graph_data && data.graph_data.length > 0) {
      const total = data.graph_data.reduce((sum, point) => sum + point.value, 0);
      return total / data.graph_data.length;
    }
    
    return 0;
  };

  const calculateAverageRating = () => calculateAverageRatingFrom(behaviorData);
  const calculateOverallAverageRating = () => calculateAverageRatingFrom(overallData);

  const calculateImprovement = () => {
    if (!behaviorData?.graph_data || behaviorData.graph_data.length < 2) return 0;
    
    const first = behaviorData.graph_data[0].value;
    const last = behaviorData.graph_data[behaviorData.graph_data.length - 1].value;
    return ((last - first) / first) * 100;
  };

  const getViewDescription = () => {
    if (!behaviorData) return 'Loading behavior analytics...';
    
    switch (viewType) {
      case 'term':
        return `Subject-wise breakdown for ${behaviorData.term || selectedTerm}`;
      case 'subject':
        return `Behavior trend for ${behaviorData.subject || selectedSubject}`;
      case 'trait':
        const traitLabel = BEHAVIOR_TRAITS.find(t => t.key === (behaviorData.behaviour_category || selectedTrait))?.label || 
                          behaviorData.behaviour_category || selectedTrait;
        return `Trend for ${traitLabel}`;
      case 'subject_trait':
        const traitLabel2 = BEHAVIOR_TRAITS.find(t => t.key === behaviorData.behaviour_category)?.label || 
                           behaviorData.behaviour_category;
        return `${traitLabel2} trend for ${behaviorData.subject}`;
      default:
        return behaviorData.view || 'Overall behavior trends across all assessments';
    }
  };

  const prepareSubjectBarData = () => {
    if (!behaviorData?.breakdown) return [];
    return behaviorData.breakdown.map(item => ({
      subject: item.subject,
      score: item.aggregated_score,
      maxScore: item.max_score
    }));
  };

  const prepareOverallLineChartData = () => {
    if (!overallData?.graph_data) return [];
    return overallData.graph_data.map(point => ({
      label: point.exam,
      value: point.value
    }));
  };

  const prepareTrendChartData = () => {
    if (!behaviorData?.graph_data) return [];
    return behaviorData.graph_data.map(point => ({
      label: point.exam,
      value: point.value
    }));
  };

  const handleDownloadReport = async () => {
    try {
      toastInfo('Generating behavior report...');
      // In a real app, you would generate and download PDF
      // For now, just show success message
      setTimeout(() => {
        toastSuccess('Behavior report downloaded successfully');
      }, 1500);
    } catch (error) {
      toastError('Failed to download report');
    }
  };

  const getBehaviorTraitLabel = (key: string) => {
    const trait = BEHAVIOR_TRAITS.find(t => t.key === key);
    return trait ? trait.label : key.replace('_', ' ');
  };

  if (loading && !behaviorData) {
    return (
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="flex-1 p-6">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <FaChartLine className="text-3xl text-blue-600" />
              </div>
            </div>
            <p className="mt-4 text-gray-600 dark:text-gray-400 animate-pulse">
              Loading behavior analytics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <main className="p-4 md:p-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="rounded-2xl p-5 sm:p-6 shadow-lg text-white bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="p-3 rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                  <FaChartLine className="text-2xl sm:text-3xl" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">
                    Student Behaviour
                  </h1>
                  <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-2">
                    <FaCalendarAlt className="text-xs sm:text-sm" />
                    {getViewDescription()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                
                <div className="px-3 sm:px-4 py-2 sm:py-3 rounded-xl border border-white/20 bg-white/15 backdrop-blur-sm w-full sm:w-auto">
                  <div className="text-[11px] sm:text-xs text-blue-100">Overall Score</div>
                  <div className="text-sm sm:text-base font-bold">
                    {calculateOverallAverageRating().toFixed(1)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Overall Summary (Top) */}
        {overallData?.graph_data && overallData.graph_data.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 mb-8"
          >
            {/* Summary Card */}
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white">
                    <FaAward />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Overall Behavior</div>
                    <div className="text-xl font-bold text-gray-900 dark:text-white">Current Score</div>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getRatingColor(calculateOverallAverageRating())}`}>
                  {calculateOverallAverageRating().toFixed(1)}/5.0
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                  Latest Term Score: {overallData.graph_data[overallData.graph_data.length - 1].value.toFixed(1)}
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Average Rating</div>
                {getStarRating(calculateOverallAverageRating())}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Best Term</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {overallData.graph_data.reduce((best, curr) => curr.value > best.value ? curr : best, overallData.graph_data[0]).exam}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Latest</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {overallData.graph_data[overallData.graph_data.length - 1].value.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-900/40 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Terms</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {overallData.graph_data.length}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">All Term Scores & Trend</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {overallData.graph_data.map((point) => (
                    <div
                      key={point.exam}
                      className="flex items-center justify-between rounded-xl bg-gray-50 dark:bg-gray-900/40 px-3 py-2"
                    >
                      <div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">{point.exam}</div>
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{point.value.toFixed(1)}</div>
                      </div>
                      <div className={`flex items-center gap-2 text-xs font-semibold ${getTrendColor(point.trend)}`}>
                        {getTrendIcon(point.trend)}
                        <span>
                          {point.change_percentage > 0 ? '+' : ''}{point.change_percentage.toFixed(1)}%
                        </span>
                        <span className="uppercase tracking-wide text-[10px]">
                          {point.trend}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Overall Trend Chart */}
            <div className="bg-white/90 dark:bg-gray-800/90 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Overall Trend</h3>
                  <p className="text-gray-600 dark:text-gray-400">Term-wise performance (area view)</p>
                </div>
                <FaChartLine className="text-2xl text-blue-600 dark:text-blue-400" />
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ReAreaChart data={prepareOverallLineChartData()}>
                    <defs>
                      <linearGradient id="overallScoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                    <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 5]} />
                    <Tooltip formatter={(value) => [`${value}`, 'Score']} />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fill="url(#overallScoreGradient)" name="Score" />
                  </ReAreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">All Terms</div>
                <div className="flex flex-wrap gap-2">
                  {overallData.graph_data.map((point) => (
                    <span
                      key={point.exam}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {point.exam}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-8 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <FaFilter className="text-blue-600 dark:text-blue-400 text-xl" />
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filter Analytics</h2>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2 transition-all"
              >
                <FaTimes /> Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Term Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaCalendarAlt className="inline mr-2" /> Academic Term
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">Select Term</option>
                {availableTerms.map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>

            {/* Subject Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaBook className="inline mr-2" /> Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                disabled={subjectsLoading}
              >
                <option value="">Select Subject</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.name}>{subject.name}</option>
                ))}
              </select>
            </div>

            {/* Behavior Trait Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FaUser className="inline mr-2" /> Behavior Trait
              </label>
              <select
                value={selectedTrait}
                onChange={(e) => setSelectedTrait(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="">All Traits</option>
                {BEHAVIOR_TRAITS.map(trait => (
                  <option key={trait.key} value={trait.key}>{trait.label}</option>
                ))}
              </select>
            </div>

            {/* Apply Button */}
            <div className="flex items-end">
              <button
                onClick={applyFilters}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-xl hover:from-purple-600 hover:to-purple-700 flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg"
              >
                <FaSearch /> Apply Filters
              </button>
            </div>
          </div>

          {/* Active Filters Display */}
          <div className="mt-6 flex flex-wrap gap-2">
            {selectedTerm && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm">
                Term: {selectedTerm} <button onClick={() => setSelectedTerm('')}><FaTimes /></button>
              </span>
            )}
            {selectedSubject && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm">
                Subject: {selectedSubject} <button onClick={() => setSelectedSubject('')}><FaTimes /></button>
              </span>
            )}
            {selectedTrait && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 text-sm">
                Trait: {BEHAVIOR_TRAITS.find(t => t.key === selectedTrait)?.label || selectedTrait} 
                <button onClick={() => setSelectedTrait('')}><FaTimes /></button>
              </span>
            )}
          </div>
        </motion.div>

        {/* Charts Section - Only show if we have data */}
        {viewType !== 'overall' && behaviorData && (behaviorData.graph_data?.length || behaviorData.breakdown?.length) ? (
          <div ref={chartRef} className="grid grid-cols-1 gap-8 mb-8">
            {/* Subject-wise Behavior Scores */}
            {viewType === 'term' && behaviorData.breakdown && behaviorData.breakdown.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Subject-wise Behavior Scores</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {behaviorData.term || 'Term Breakdown'}
                    </p>
                  </div>
                  <FaRegChartBar className="text-2xl text-blue-600 dark:text-blue-400" />
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart data={prepareSubjectBarData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="subject" stroke="#9CA3AF" fontSize={12} />
                      <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 5]} />
                      <Tooltip formatter={(value) => [`${value}`, 'Score']} />
                      <Legend />
                      <Bar dataKey="score" fill="#3B82F6" name="Score" radius={[6, 6, 0, 0]} />
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}

          </div>
        ) : null}

        {/* Data Display Section */}
        {behaviorData?.error ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center text-white text-4xl">
              <FaTimes />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Error Loading Data
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              {behaviorData.error === 'No Active Year' ? 
                'No active academic year configured. Please contact your administrator.' :
                behaviorData.error === 'Access Denied or Not Enrolled' ?
                'You are not enrolled in the current academic year.' :
                behaviorData.error}
            </p>
          </motion.div>
        ) : viewType === 'term' && behaviorData?.breakdown ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Subject Breakdown for {behaviorData.term || selectedTerm}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Detailed scores across all subjects
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold text-lg ${getRatingColor(calculateAverageRating())}`}>
                Avg: {calculateAverageRating().toFixed(1)}/5.0
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {behaviorData.breakdown.map((item, index) => (
                <motion.div
                  key={item.subject}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900/50 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all hover:scale-105"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                      <FaBook />
                    </div>
                    <div className={`px-3 py-1 rounded-full font-bold ${getRatingColor(item.aggregated_score)}`}>
                      {item.aggregated_score.toFixed(1)}
                    </div>
                  </div>
                  <div className="font-bold text-gray-900 dark:text-white mb-2">{item.subject}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Max Score: {item.max_score.toFixed(1)}
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${(item.aggregated_score / item.max_score) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                    {((item.aggregated_score / item.max_score) * 100).toFixed(0)}% of max score
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : viewType !== 'overall' && behaviorData?.graph_data && behaviorData.graph_data.length > 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {behaviorData.view || 'Trend Analysis'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {behaviorData.subject && `Subject: ${behaviorData.subject}`}
                  {behaviorData.behaviour_category && 
                    ` • Trait: ${getBehaviorTraitLabel(behaviorData.behaviour_category)}`}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Average Rating</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {calculateAverageRating().toFixed(1)}
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-lg ${getRatingColor(calculateAverageRating())}`}>
                  {getStarRating(calculateAverageRating())}
                </div>
              </div>
            </div>

            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <ReAreaChart data={prepareTrendChartData()}>
                  <defs>
                    <linearGradient id="trendScoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="label" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} domain={[0, 5]} />
                  <Tooltip formatter={(value) => [`${value}`, 'Score']} />
                  <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} fill="url(#trendScoreGradient)" name="Score" />
                </ReAreaChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-4">
              {behaviorData.graph_data.map((point, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex flex-col md:flex-row items-center justify-between p-6 bg-gradient-to-r from-gray-50 to-white dark:from-gray-900/30 dark:to-gray-800 rounded-xl hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-6 mb-4 md:mb-0">
                    <div className={`w-20 h-20 rounded-2xl flex flex-col items-center justify-center ${
                      point.trend === 'increase' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                      point.trend === 'decrease' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                      'bg-gradient-to-br from-blue-500 to-blue-600'
                    }`}>
                      <div className="text-2xl font-bold text-white">
                        {point.value.toFixed(1)}
                      </div>
                      <div className="text-xs text-white/80">Rating</div>
                    </div>
                    
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-xl mb-2">
                        {point.exam}
                      </div>
                      <div className="flex items-center gap-2">
                        {getStarRating(point.value)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className={`text-center ${getTrendColor(point.trend)}`}>
                      <div className="flex items-center justify-center gap-2 text-2xl font-bold">
                        {getTrendIcon(point.trend)}
                        <span>
                          {point.change_percentage > 0 ? '+' : ''}{point.change_percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-sm">Change</div>
                    </div>
                    
                    <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
                      point.trend === 'increase' ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 dark:from-green-900/30 dark:to-green-800/30 dark:text-green-400' :
                      point.trend === 'decrease' ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/30 dark:to-red-800/30 dark:text-red-400' :
                      'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/30 dark:to-blue-800/30 dark:text-blue-400'
                    }`}>
                      {point.trend.charAt(0).toUpperCase() + point.trend.slice(1)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : behaviorData ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-4xl">
              <FaChartLine />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Behavior Data Available
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Try adjusting your filters or check back later for updated behavior reports.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              Reset Filters
            </button>
          </motion.div>
        ) : null}

       
      </main>
    </div>
  );
}
