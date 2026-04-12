'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaClipboardCheck,
  FaFilter,
  FaChartLine,
  FaSyncAlt,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
} from 'react-icons/fa';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { studentApi } from '@/lib/api';
import { toastError, toastInfo } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';

interface StudentSubject {
  id: number;
  name: string;
  subject_code: string;
}

interface ClassTestPoint {
  exam: string;
  value: number;
  original_marks: number;
  max_marks: number;
  change_percentage: number;
  trend: 'increase' | 'decrease' | 'neutral';
}

interface ClassTestAnalytics {
  type: string;
  student: string;
  term: string;
  subject: string;
  graph_data: ClassTestPoint[];
}

interface ClassTestSubjectSummary {
  subject: string;
  total_tests: number;
  average_score: number;
  best_score: number;
}

interface ClassTestSummary {
  type: string;
  student: string;
  total_tests: number;
  average_score: number;
  best_score: number;
  latest_change: number;
  subject_wise: ClassTestSubjectSummary[];
}

const extractApiError = (err: any, fallback: string) =>
  err?.response?.data?.error ||
  err?.response?.data?.detail ||
  err?.message ||
  fallback;

const extractDashboard = (payload: any) => {
  if (!payload) return null;
  if (payload?.ongoing || payload?.upcoming || payload?.completed) return payload;
  if (payload?.data && (payload.data.ongoing || payload.data.upcoming || payload.data.completed)) {
    return payload.data;
  }
  return null;
};

export default function StudentClassTestPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [analytics, setAnalytics] = useState<ClassTestAnalytics | null>(null);
  const [summary, setSummary] = useState<ClassTestSummary | null>(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCardClass = () =>
    combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg',
      get('border', 'primary'),
      theme === 'dark' ? 'bg-gray-900/40' : 'bg-white'
    );

  const getInputClass = () =>
    combine(
      'w-full rounded-lg border px-3 py-2 text-sm bg-transparent',
      get('border', 'primary'),
      get('text', 'primary')
    );

  const getPrimaryButtonClass = () =>
    combine(
      'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
      'text-white shadow-md hover:shadow-lg',
      theme === 'dark'
        ? 'bg-gradient-to-r from-blue-600 to-blue-700'
        : 'bg-gradient-to-r from-blue-500 to-blue-600'
    );

  const getSecondaryButtonClass = () =>
    combine(
      'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
      get('border', 'secondary'),
      get('text', 'secondary'),
      'hover:text-[var(--color-text-primary)]'
    );

  const loadInitialData = useCallback(async () => {
    try {
      setLoadingInitial(true);
      const [subjectsRes, examsRes] = await Promise.all([
        studentApi.subjects.mySubjects(),
        studentApi.exams.dashboard(),
      ]);

      const subjectsPayload = subjectsRes?.data?.data || subjectsRes?.data;
      const subjectList = subjectsPayload?.subjects || subjectsPayload?.data?.subjects || [];
      setSubjects(Array.isArray(subjectList) ? subjectList : []);

      const dashboardPayload = examsRes?.data?.data || examsRes?.data;
      const dashboard = extractDashboard(dashboardPayload);
      const nextTerms: string[] = [];
      if (dashboard) {
        ['ongoing', 'upcoming', 'completed'].forEach((bucket) => {
          const group = dashboard?.[bucket];
          if (!group || typeof group !== 'object') return;
          Object.keys(group).forEach((term) => {
            if (term && !nextTerms.includes(term)) nextTerms.push(term);
          });
        });
      }
      setTerms(nextTerms);
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load class test filters');
      setError(message);
      toastError(message);
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (term: string, subject: string) => {
    if (!term || !subject) return;
    setLoadingAnalytics(true);
    setError(null);
    try {
      const res = await studentApi.request('performance/analytics/class-test/', {
        params: { term, subject },
      });
      const payload = res?.data?.data || res?.data;
      setAnalytics(payload || null);
      if (!payload?.graph_data?.length) {
        toastInfo('No class test data found for this selection.');
      }
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load class test analytics');
      setError(message);
      setAnalytics(null);
      toastError(message);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const res = await studentApi.request('performance/analytics/class-test/summary/');
      const payload = res?.data?.data || res?.data;
      setSummary(payload || null);
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load class test summary');
      setError(message);
      setSummary(null);
      toastError(message);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    fetchSummary();
  }, [loadInitialData, fetchSummary]);

  useEffect(() => {
    if (!selectedTerm && terms.length) setSelectedTerm(terms[0]);
  }, [terms, selectedTerm]);

  useEffect(() => {
    if (!selectedSubject && subjects.length) setSelectedSubject(subjects[0]?.name || '');
  }, [subjects, selectedSubject]);

  useEffect(() => {
    if (selectedTerm && selectedSubject) {
      fetchAnalytics(selectedTerm, selectedSubject);
    }
  }, [selectedTerm, selectedSubject, fetchAnalytics]);

  const graphData = analytics?.graph_data || [];

  const fallbackSummary = useMemo(() => {
    if (!graphData.length) {
      return { total_tests: 0, average_score: 0, best_score: 0, latest_change: 0 };
    }
    const total = graphData.length;
    const average = Number(
      (graphData.reduce((sum, item) => sum + (item.value || 0), 0) / total).toFixed(1)
    );
    const best = Math.max(...graphData.map((item) => item.value || 0));
    const lastChange = graphData[graphData.length - 1]?.change_percentage ?? 0;
    return { total_tests: total, average_score: average, best_score: best, latest_change: lastChange };
  }, [graphData]);

  const cardSummary = summary || fallbackSummary;

  const getTrendIcon = (trend: ClassTestPoint['trend']) => {
    if (trend === 'increase') return <FaArrowUp className="text-emerald-500" />;
    if (trend === 'decrease') return <FaArrowDown className="text-red-500" />;
    return <FaMinus className="text-gray-400" />;
  };

  return (
    <div className={combine(get('bg', 'primary'), 'min-h-screen px-3 py-3 sm:px-4 sm:py-4 xl:px-6 xl:py-6')}>
      <div className="mx-auto w-full max-w-[1600px]">
        <main className="space-y-6">
          <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 sm:p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/15 p-3">
                    <FaClipboardCheck className="text-2xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Class Tests</h1>
                    <p className="text-sm sm:text-base text-blue-100">
                      Track your class test performance by term and subject.
                    </p>
                  </div>
                </div>
              </div>
              <button
                className={combine('inline-flex items-center gap-2', getPrimaryButtonClass())}
                onClick={() => fetchAnalytics(selectedTerm, selectedSubject)}
                disabled={loadingAnalytics || !selectedTerm || !selectedSubject}
              >
                <FaSyncAlt className={loadingAnalytics ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </section>

          <section className={getCardClass()}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FaFilter className={combine(get('text', 'secondary'))} />
                <span className={combine(get('text', 'primary'))}>Filters</span>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-2 text-sm font-medium">
                  <span className={combine(get('text', 'secondary'))}>Term</span>
                  <select
                    className={getInputClass()}
                    value={selectedTerm}
                    onChange={(e) => setSelectedTerm(e.target.value)}
                    disabled={loadingInitial || terms.length === 0}
                  >
                    {terms.length === 0 && <option value="">No terms found</option>}
                    {terms.map((term) => (
                      <option key={term} value={term}>
                        {term}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium">
                  <span className={combine(get('text', 'secondary'))}>Subject</span>
                  <select
                    className={getInputClass()}
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    disabled={loadingInitial || subjects.length === 0}
                  >
                    {subjects.length === 0 && <option value="">No subjects found</option>}
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.name}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    className={combine('w-full justify-center', getSecondaryButtonClass())}
                    onClick={() => fetchAnalytics(selectedTerm, selectedSubject)}
                    disabled={loadingAnalytics || !selectedTerm || !selectedSubject}
                  >
                    {loadingAnalytics ? 'Loading...' : 'Apply'}
                  </button>
                </div>
              </div>
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className={getCardClass()}>
              <div className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Total Tests</div>
              <div className="mt-2 text-2xl font-bold">
                {loadingSummary ? '...' : cardSummary.total_tests}
              </div>
            </div>
            <div className={getCardClass()}>
              <div className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Average Score</div>
              <div className="mt-2 text-2xl font-bold">
                {loadingSummary ? '...' : `${cardSummary.average_score}%`}
              </div>
            </div>
            <div className={getCardClass()}>
              <div className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Best Score</div>
              <div className="mt-2 text-2xl font-bold">
                {loadingSummary ? '...' : `${cardSummary.best_score}%`}
              </div>
            </div>
            <div className={getCardClass()}>
              <div className={combine('text-xs uppercase tracking-wide', get('text', 'secondary'))}>Latest Change</div>
              <div className="mt-2 text-2xl font-bold">
                {loadingSummary ? '...' : `${cardSummary.latest_change}%`}
              </div>
            </div>
          </section>

          <section className={getCardClass()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FaClipboardCheck className={combine(get('text', 'secondary'))} />
                <span className={combine(get('text', 'primary'))}>Subject-wise Tests</span>
              </div>
              <button
                className={combine('text-xs', getSecondaryButtonClass())}
                onClick={fetchSummary}
                disabled={loadingSummary}
              >
                {loadingSummary ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {(summary?.subject_wise || []).length === 0 ? (
                <div className="text-sm text-gray-500">No subject-wise data available.</div>
              ) : (
                (summary?.subject_wise || []).map((item) => (
                  <div
                    key={item.subject}
                    className={combine(
                      'min-w-[220px] rounded-xl border p-4',
                      get('border', 'primary'),
                      theme === 'dark' ? 'bg-gray-900/50' : 'bg-white'
                    )}
                  >
                    <div className="text-sm font-semibold">{item.subject}</div>
                    <div className={combine('text-xs mt-1', get('text', 'secondary'))}>
                      Tests: {item.total_tests}
                    </div>
                    <div className={combine('text-xs mt-1', get('text', 'secondary'))}>
                      Avg: {item.average_score}%
                    </div>
                    <div className={combine('text-xs mt-1', get('text', 'secondary'))}>
                      Best: {item.best_score}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className={getCardClass()}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FaChartLine className={combine(get('text', 'secondary'))} />
              <span className={combine(get('text', 'primary'))}>Performance Trend</span>
            </div>
            <div className="mt-4 h-72">
              {graphData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  No class test data available for this selection.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1f2937' : '#e5e7eb'} />
                    <XAxis dataKey="exam" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className={getCardClass()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <FaClipboardCheck className={combine(get('text', 'secondary'))} />
                <span className={combine(get('text', 'primary'))}>Class Test Breakdown</span>
              </div>
              <div className="text-xs text-gray-500">
                {selectedSubject && selectedTerm ? `${selectedSubject} • ${selectedTerm}` : 'Select filters'}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className={combine('text-left', get('text', 'secondary'))}>
                    <th className="py-2 pr-4">Test</th>
                    <th className="py-2 pr-4">Score</th>
                    <th className="py-2 pr-4">Percentage</th>
                    <th className="py-2 pr-4">Change</th>
                    <th className="py-2 pr-4">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {graphData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-500">
                        No class tests recorded for this subject and term.
                      </td>
                    </tr>
                  ) : (
                    graphData.map((item, index) => (
                      <tr key={`${item.exam}-${index}`} className={combine('border-t', get('border', 'primary'))}>
                        <td className="py-3 pr-4 font-medium">{item.exam}</td>
                        <td className="py-3 pr-4">
                          {item.original_marks} / {item.max_marks}
                        </td>
                        <td className="py-3 pr-4">{item.value}%</td>
                        <td className="py-3 pr-4">
                          {item.change_percentage > 0 ? '+' : ''}
                          {item.change_percentage}%
                        </td>
                        <td className="py-3 pr-4">{getTrendIcon(item.trend)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
