'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  Layers3,
  PlusCircle,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

type AcademicYear = {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
};

type Section = {
  id: number;
  name: string;
  standard_id: number;
};

type Standard = {
  id: number;
  name: string;
  sections: Section[];
};

type PromotionRecord = {
  id: number;
  student_id: string;
  student_name: string;
  from_standard_name: string;
  from_section_name: string | null;
  target_standard_name: string | null;
  target_section_name: string | null;
  outcome: 'PROMOTED' | 'DETAINED' | 'GRADUATED' | 'LEFT';
  status: 'READY' | 'ERROR' | 'APPLIED';
  error_message: string;
  fee_total_amount: string | number;
  fee_total_paid: string | number;
  fee_total_due: string | number;
  fee_pending_items: number;
  fee_cleared_items: number;
  fee_status: 'PENDING' | 'CLEARED' | 'NO_FEES' | string;
};

type PromotionBatch = {
  id: number;
  from_year_name: string;
  to_year_name: string;
  status: 'PREVIEW' | 'APPLIED' | 'PARTIAL' | 'FAILED';
  total_students: number;
  ready_count: number;
  error_count: number;
  applied_count: number;
  failed_count: number;
  created_at: string;
  applied_at: string | null;
  notes?: string;
  records?: PromotionRecord[];
};

type PromotionMetaResponse = {
  academic_years: AcademicYear[];
  standards: Standard[];
};

type RowStatus = 'READY' | 'PENDING' | 'LEFT' | 'ERROR' | 'APPLIED';
type RowSelectableStatus = 'READY' | 'PENDING' | 'LEFT';

const toClassLabel = (name: string) => `Class ${name}`;
const money = (value: string | number) => Number(value || 0).toFixed(2);
const MANUAL_PENDING_MARKER = 'MANUAL_PENDING_BY_ADMIN';

const getRecordDisplayStatus = (record: PromotionRecord): RowStatus => {
  // Pending should represent explicit admin hold only, not fee pending.
  if (record.status === 'ERROR' && (record.error_message || '').includes(MANUAL_PENDING_MARKER)) return 'PENDING';
  if (record.status === 'ERROR') return 'ERROR';
  if (record.status === 'APPLIED') return 'APPLIED';
  if (record.outcome === 'LEFT') return 'LEFT';
  return 'READY';
};

const getStatusMessage = (record: PromotionRecord, rowStatus: RowStatus): string => {
  if (rowStatus === 'APPLIED') {
    return record.outcome === 'LEFT'
      ? 'Left. Student is not enrolled in target academic year.'
      : 'Enrolled in target academic year.';
  }
  if (rowStatus === 'PENDING') return 'Pending hold. Student will not be enrolled until released.';
  if (rowStatus === 'LEFT') return 'Marked left. Student will not be enrolled.';
  if (rowStatus === 'ERROR') return 'Needs admin action before apply.';
  return 'Ready for apply.';
};

const getBatchStatusBadgeClass = (status: PromotionBatch['status']) => {
  if (status === 'APPLIED') return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
  if (status === 'PARTIAL') return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
  if (status === 'FAILED') return 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800';
  return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
};

export default function StudentPromotionPage() {
  const schoolScope = useSchoolScope({ storageKey: 'student_promotions_school_scope' });
  const [activeTab, setActiveTab] = useState<'academic_year' | 'promotion'>('promotion');
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [yearCrudLoading, setYearCrudLoading] = useState(false);
  const [yearCountsLoading, setYearCountsLoading] = useState(false);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [yearStudentCounts, setYearStudentCounts] = useState<Record<number, number>>({});
  const [overallUniqueStudentCount, setOverallUniqueStudentCount] = useState(0);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [fromYearId, setFromYearId] = useState<number | null>(null);
  const [toYearId, setToYearId] = useState<number | null>(null);
  const [sectionMode, setSectionMode] = useState<'same_if_exists' | 'none'>('same_if_exists');
  const [unmappedAction, setUnmappedAction] = useState<'detain' | 'left' | 'error'>('detain');
  const [notes, setNotes] = useState('');
  const [classMappings, setClassMappings] = useState<Record<number, number | ''>>({});
  const [batch, setBatch] = useState<PromotionBatch | null>(null);
  const [batches, setBatches] = useState<PromotionBatch[]>([]);
  const [rowStatusByRecordId, setRowStatusByRecordId] = useState<Record<number, RowStatus>>({});
  const [rowUpdatingByRecordId, setRowUpdatingByRecordId] = useState<Record<number, boolean>>({});
  const [yearForm, setYearForm] = useState<{
    id: number | null;
    name: string;
    start_date: string;
    end_date: string;
    is_current: boolean;
  }>({
    id: null,
    name: '',
    start_date: '',
    end_date: '',
    is_current: false,
  });

  const standardsSorted = useMemo(
    () => [...standards].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [standards]
  );

  const selectedBatchRecords = batch?.records || [];
  const totalBatchCount = batches.length;
  const selectedTotalCount = selectedBatchRecords.length;
  const selectedReadyCount = selectedBatchRecords.filter(
    (record) => getRecordDisplayStatus(record) === 'READY'
  ).length;
  const pendingHoldCount = selectedBatchRecords.filter(
    (record) => getRecordDisplayStatus(record) === 'PENDING'
  ).length;
  const selectedAppliedCount = selectedBatchRecords.filter(
    (record) => getRecordDisplayStatus(record) === 'APPLIED'
  ).length;
  const hasNonAppliedRows = selectedTotalCount > 0 && selectedAppliedCount < selectedTotalCount;
  const currentAcademicYear = years.find((y) => y.is_current) || null;
  const mappedClassCount = Object.values(classMappings).filter(Boolean).length;
  const batchesAppliedCount = batches.filter((b) => b.status === 'APPLIED').length;
  const batchesPreviewCount = batches.filter((b) => b.status === 'PREVIEW').length;
  const batchesPartialCount = batches.filter((b) => b.status === 'PARTIAL').length;
  const batchesFailedCount = batches.filter((b) => b.status === 'FAILED').length;

  useEffect(() => {
    const records = batch?.records || [];
    if (!records.length) {
      setRowStatusByRecordId({});
      return;
    }

    const next: Record<number, RowStatus> = {};
    records.forEach((record) => {
      next[record.id] = getRecordDisplayStatus(record);
    });
    setRowStatusByRecordId(next);
  }, [batch?.id, batch?.records]);

  const loadMeta = async () => {
    setMetaLoading(true);
    try {
      const res = await adminApi.promotions.meta(schoolScope.scopeParams);
      const data = (res.data || {}) as PromotionMetaResponse;
      const apiYears = Array.isArray(data.academic_years) ? data.academic_years : [];
      const apiStandards = Array.isArray(data.standards) ? data.standards : [];

      setYears(apiYears);
      setStandards(apiStandards);

      if (apiYears.length > 0) {
        const current = apiYears.find((y) => y.is_current);
        const fromYear = current || apiYears[0];
        setFromYearId(fromYear.id);

        const toYearCandidate = apiYears.find((y) => y.id !== fromYear.id) || null;
        setToYearId(toYearCandidate?.id || null);
      }

      const numericByValue = new Map<number, Standard>();
      apiStandards.forEach((std) => {
        const n = Number(std.name);
        if (!Number.isNaN(n)) numericByValue.set(n, std);
      });

      const initialMappings: Record<number, number | ''> = {};
      apiStandards.forEach((std) => {
        const n = Number(std.name);
        if (!Number.isNaN(n) && numericByValue.has(n + 1)) {
          initialMappings[std.id] = numericByValue.get(n + 1)!.id;
        } else {
          initialMappings[std.id] = '';
        }
      });
      setClassMappings(initialMappings);
    } catch (error) {
      console.error('Failed to load promotion meta:', error);
      toastError('Failed to load promotion setup data');
    } finally {
      setMetaLoading(false);
    }
  };

  const resetYearForm = () => {
    setYearForm({
      id: null,
      name: '',
      start_date: '',
      end_date: '',
      is_current: false,
    });
  };

  const handleSaveAcademicYear = async () => {
    if (!yearForm.name.trim() || !yearForm.start_date || !yearForm.end_date) {
      toastInfo('Please fill name, start date, and end date.');
      return;
    }

    if (new Date(yearForm.start_date) > new Date(yearForm.end_date)) {
      toastInfo('Start date must be before or equal to end date.');
      return;
    }

    setYearCrudLoading(true);
    try {
      const payload = {
        name: yearForm.name.trim(),
        start_date: yearForm.start_date,
        end_date: yearForm.end_date,
        is_current: yearForm.is_current,
      };

      if (yearForm.id) {
        await adminApi.school.updateAcademicYear(yearForm.id, {
          ...payload,
          ...schoolScope.scopeParams,
        });
        toastSuccess('Academic year updated successfully');
      } else {
        await adminApi.school.createAcademicYear({
          ...payload,
          ...schoolScope.scopeParams,
        });
        toastSuccess('Academic year created successfully');
      }

      resetYearForm();
      await loadMeta();
    } catch (error: any) {
      console.error('Academic year save failed:', error);
      toastError(error?.response?.data?.error || 'Failed to save academic year');
    } finally {
      setYearCrudLoading(false);
    }
  };

  const handleEditAcademicYear = (year: AcademicYear) => {
    setYearForm({
      id: year.id,
      name: year.name || '',
      start_date: year.start_date,
      end_date: year.end_date,
      is_current: Boolean(year.is_current),
    });
  };

  const handleDeleteAcademicYear = async (year: AcademicYear) => {
    const confirmed = window.confirm(`Delete academic year "${year.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setYearCrudLoading(true);
    try {
      await adminApi.school.deleteAcademicYear(year.id, schoolScope.scopeParams);
      toastSuccess('Academic year deleted successfully');
      if (yearForm.id === year.id) resetYearForm();
      await loadMeta();
    } catch (error: any) {
      console.error('Academic year delete failed:', error);
      toastError(error?.response?.data?.error || 'Failed to delete academic year');
    } finally {
      setYearCrudLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await adminApi.promotions.batches(schoolScope.scopeParams);
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load promotion batches:', error);
    }
  };

  useEffect(() => {
    setBatch(null);
    setBatches([]);
    setYears([]);
    setStandards([]);
    setClassMappings({});
    setFromYearId(null);
    setToYearId(null);
    loadMeta();
    loadBatches();
  }, [schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!years.length) {
      setYearStudentCounts({});
      return;
    }

    let cancelled = false;
    const fetchYearCounts = async () => {
      setYearCountsLoading(true);
      try {
        const entries = await Promise.all(
          years.map(async (year) => {
            const res = await adminApi.students.listPaginated({
              page: 1,
              page_size: 1,
              academic_year: year.id,
              ...schoolScope.scopeParams,
            });
            const payload = res?.data || {};
            const count =
              Number(payload?.count) ||
              Number(payload?.total_count) ||
              Number(payload?.results_count) ||
              (Array.isArray(payload?.results) ? payload.results.length : 0) ||
              (Array.isArray(payload) ? payload.length : 0);
            return [year.id, Number.isFinite(count) ? count : 0] as const;
          })
        );
        if (!cancelled) {
          setYearStudentCounts(Object.fromEntries(entries));
        }
      } catch (error) {
        console.error('Failed to fetch academic year student counts:', error);
        if (!cancelled) setYearStudentCounts({});
      } finally {
        if (!cancelled) setYearCountsLoading(false);
      }
    };

    fetchYearCounts();
    return () => {
      cancelled = true;
    };
  }, [years, schoolScope.selectedSchoolId]);

  useEffect(() => {
    let cancelled = false;
    const fetchOverallUniqueStudents = async () => {
      try {
        const res = await adminApi.students.listPaginated({
          page: 1,
          page_size: 1,
          ...schoolScope.scopeParams,
        });
        const payload = res?.data || {};
        const count =
          Number(payload?.count) ||
          Number(payload?.total_count) ||
          Number(payload?.results_count) ||
          (Array.isArray(payload?.results) ? payload.results.length : 0) ||
          (Array.isArray(payload) ? payload.length : 0);
        if (!cancelled) {
          setOverallUniqueStudentCount(Number.isFinite(count) ? count : 0);
        }
      } catch (error) {
        console.error('Failed to fetch overall unique student count:', error);
        if (!cancelled) setOverallUniqueStudentCount(0);
      }
    };

    fetchOverallUniqueStudents();
    return () => {
      cancelled = true;
    };
  }, [schoolScope.selectedSchoolId]);

  const buildMappingsPayload = () =>
    Object.entries(classMappings)
      .filter(([, target]) => Boolean(target))
      .map(([fromId, toId]) => ({
        from_standard_id: Number(fromId),
        to_standard_id: Number(toId),
      }));

  const handlePreview = async () => {
    if (!fromYearId || !toYearId) {
      toastInfo('Please select both source and target academic years.');
      return;
    }
    if (fromYearId === toYearId) {
      toastInfo('From year and To year must be different.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.promotions.preview({
        from_year_id: fromYearId,
        to_year_id: toYearId,
        ...schoolScope.scopeParams,
        class_mappings: buildMappingsPayload(),
        section_mode: sectionMode,
        unmapped_action: unmappedAction,
        notes: notes.trim(),
      });
      setBatch(res.data as PromotionBatch);
      toastSuccess('Promotion preview generated successfully');
      loadBatches();
    } catch (error: any) {
      console.error('Preview failed:', error);
      toastError(error?.response?.data?.error || 'Failed to generate promotion preview');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!batch?.id) {
      toastInfo('Create a preview batch before applying.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.promotions.applyBatch(batch.id, schoolScope.scopeParams);
      setBatch(res.data as PromotionBatch);
      toastSuccess('Promotion batch applied successfully');
      loadBatches();
    } catch (error: any) {
      console.error('Apply failed:', error);
      toastError(error?.response?.data?.error || 'Failed to apply promotion batch');
    } finally {
      setLoading(false);
    }
  };

  const openBatch = async (batchId: number) => {
    setLoading(true);
    try {
      const res = await adminApi.promotions.batchDetail(batchId, schoolScope.scopeParams);
      setBatch(res.data as PromotionBatch);
      setActiveTab('promotion');
    } catch (error) {
      console.error('Failed to open batch detail:', error);
      toastError('Failed to load selected batch');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBatch = async (batch: PromotionBatch) => {
    if (batch.status === 'APPLIED') {
      toastInfo('Applied batches cannot be deleted.');
      return;
    }

    const confirmed = window.confirm(
      `Delete batch #${batch.id} (${batch.from_year_name} to ${batch.to_year_name})? This cannot be undone.`
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      await adminApi.promotions.deleteBatch(batch.id, schoolScope.scopeParams);
      setBatch((current) => (current?.id === batch.id ? null : current));
      toastSuccess('Promotion batch deleted successfully');
      loadBatches();
    } catch (error: any) {
      console.error('Delete batch failed:', error);
      toastError(error?.response?.data?.error || 'Failed to delete promotion batch');
    } finally {
      setLoading(false);
    }
  };

  const handleRowStatusChange = async (record: PromotionRecord, nextStatus: RowSelectableStatus) => {
    if (!batch?.id || record.status === 'APPLIED') {
      return;
    }

    const prevStatus = rowStatusByRecordId[record.id] || getRecordDisplayStatus(record);
    setRowStatusByRecordId((prev) => ({ ...prev, [record.id]: nextStatus }));
    setRowUpdatingByRecordId((prev) => ({ ...prev, [record.id]: true }));

    try {
      const res = await adminApi.promotions.updateRecordStatus(batch.id, record.id, nextStatus);
      setBatch(res.data as PromotionBatch);
    } catch (error: any) {
      console.error('Failed to update student status:', error);
      setRowStatusByRecordId((prev) => ({ ...prev, [record.id]: prevStatus }));
      toastError(error?.response?.data?.error || 'Failed to update student status');
    } finally {
      setRowUpdatingByRecordId((prev) => ({ ...prev, [record.id]: false }));
    }
  };

  return (
    <div className="p-3 md:p-4 xl:p-6 space-y-6 bg-slate-50 dark:bg-slate-950">
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/30 via-white to-indigo-50/40 p-5 md:p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/40">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Student Promotion</h1>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Review, hold, and apply promotions with clear status tracking per student.
              </p>
            </div>
          </div>
          <SchoolScopeSelector {...schoolScope} className="w-full lg:w-auto" />
        </div>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2">
        {[
          { key: 'academic_year' as const, label: 'Academic Year', icon: CalendarDays },
          { key: 'promotion' as const, label: 'Promotion', icon: Sparkles },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-3 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'academic_year' && (
      <div className="rounded-xl border bg-white p-4 md:p-5 space-y-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-blue-600" />
          Academic Year Management
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4 dark:from-slate-900 dark:to-slate-800/70 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Academic Years</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{years.length}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configured in system</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-sky-50 p-4 dark:from-slate-900 dark:to-sky-900/20 dark:border-sky-800">
            <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">Current Academic Year</p>
            <p className="mt-2 text-lg font-bold text-sky-800 dark:text-sky-200">{currentAcademicYear?.name || 'Not set'}</p>
            <p className="text-xs text-sky-700 dark:text-sky-300">Active session</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-indigo-50 p-4 dark:from-slate-900 dark:to-indigo-900/20 dark:border-indigo-800">
            <p className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Current Year Students</p>
            <p className="mt-2 text-2xl font-bold text-indigo-800 dark:text-indigo-200">
              {currentAcademicYear ? (yearStudentCounts[currentAcademicYear.id] ?? 0) : 0}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">Enrolled students</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-emerald-50 p-4 dark:from-slate-900 dark:to-emerald-900/20 dark:border-emerald-800">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">All Year Students</p>
            <p className="mt-2 text-2xl font-bold text-emerald-800 dark:text-emerald-200">{overallUniqueStudentCount}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Unique students across all years</p>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 dark:bg-slate-900 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Student Count by Academic Year</h3>
            {yearCountsLoading && <span className="text-xs text-slate-500 dark:text-slate-400">Refreshing...</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {years.map((year) => (
              <div key={year.id} className="rounded-lg border bg-gradient-to-br from-white to-slate-50 p-3 dark:from-slate-900 dark:to-slate-800/70 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{year.name}</p>
                  {year.is_current && (
                    <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-300">
                      Current
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xl font-bold text-slate-900 dark:text-slate-100">{yearStudentCounts[year.id] ?? 0}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">students</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={yearForm.name}
              onChange={(e) => setYearForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="2026-2027"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={yearForm.start_date}
              onChange={(e) => setYearForm((prev) => ({ ...prev, start_date: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={yearForm.end_date}
              onChange={(e) => setYearForm((prev) => ({ ...prev, end_date: e.target.value }))}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={yearForm.is_current}
                onChange={(e) => setYearForm((prev) => ({ ...prev, is_current: e.target.checked }))}
              />
              Set as current year
            </label>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-sky-600 text-white px-4 py-2 disabled:opacity-60 inline-flex items-center gap-2"
            onClick={handleSaveAcademicYear}
            disabled={yearCrudLoading}
          >
            {yearForm.id ? <CheckCircle2 className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
            {yearCrudLoading ? 'Saving...' : yearForm.id ? 'Update Academic Year' : 'Create Academic Year'}
          </button>
          <button
            className="rounded-lg border px-4 py-2 disabled:opacity-60 text-slate-700 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={resetYearForm}
            disabled={yearCrudLoading}
          >
            Clear
          </button>
        </div>

        <div className="rounded-lg border overflow-auto dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="text-left px-3 py-2">Name</th>
                <th className="text-left px-3 py-2">Start</th>
                <th className="text-left px-3 py-2">End</th>
                <th className="text-left px-3 py-2">Current</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => (
                <tr key={year.id} className="border-t dark:border-slate-700">
                  <td className="px-3 py-2">{year.name}</td>
                  <td className="px-3 py-2">{year.start_date}</td>
                  <td className="px-3 py-2">{year.end_date}</td>
                  <td className="px-3 py-2">{year.is_current ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2">
                    <button
                      className="rounded border px-2 py-1"
                      onClick={() => handleEditAcademicYear(year)}
                      disabled={yearCrudLoading}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded border border-red-300 text-red-600 px-2 py-1 ml-2"
                      onClick={() => handleDeleteAcademicYear(year)}
                      disabled={yearCrudLoading}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!years.length && (
                <tr>
                  <td className="px-3 py-3 text-gray-500 dark:text-slate-400" colSpan={5}>
                    No academic years found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'promotion' && (
      <div className="rounded-xl border bg-white p-4 md:p-5 space-y-4 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" />
          Promotion Setup
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          <div className="rounded-xl border bg-gradient-to-br from-white to-indigo-50 p-4 dark:from-slate-900 dark:to-indigo-900/20 dark:border-indigo-800">
            <p className="text-xs uppercase tracking-wide text-indigo-700 dark:text-indigo-300">From Year</p>
            <p className="mt-2 text-lg font-bold text-indigo-900 dark:text-indigo-200">
              {years.find((y) => y.id === fromYearId)?.name || '-'}
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300">Source enrollments</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-sky-50 p-4 dark:from-slate-900 dark:to-sky-900/20 dark:border-sky-800">
            <p className="text-xs uppercase tracking-wide text-sky-700 dark:text-sky-300">To Year</p>
            <p className="mt-2 text-lg font-bold text-sky-900 dark:text-sky-200">
              {years.find((y) => y.id === toYearId)?.name || '-'}
            </p>
            <p className="text-xs text-sky-700 dark:text-sky-300">Target enrollments</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-emerald-50 p-4 dark:from-slate-900 dark:to-emerald-900/20 dark:border-emerald-800">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Mapped Classes</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{mappedClassCount}</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Class mappings configured</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-amber-50 p-4 dark:from-slate-900 dark:to-amber-900/20 dark:border-amber-800">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Current Preview Rows</p>
            <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{selectedTotalCount}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300">In selected preview batch</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From Academic Year</label>
            <select
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={fromYearId ?? ''}
              onChange={(e) => setFromYearId(Number(e.target.value))}
              disabled={metaLoading}
            >
              <option value="">Select</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To Academic Year</label>
            <select
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={toYearId ?? ''}
              onChange={(e) => setToYearId(Number(e.target.value))}
              disabled={metaLoading}
            >
              <option value="">Select</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Section Carry Forward</label>
            <select
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={sectionMode}
              onChange={(e) => setSectionMode(e.target.value as 'same_if_exists' | 'none')}
            >
              <option value="same_if_exists">Same section if exists</option>
              <option value="none">No section (manual assignment later)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">If Class Mapping Missing</label>
            <select
              className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
              value={unmappedAction}
              onChange={(e) => setUnmappedAction(e.target.value as 'detain' | 'left' | 'error')}
            >
              <option value="detain">Detain student in same class</option>
              <option value="left">Mark student as left</option>
              <option value="error">Mark as preview error</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Notes (optional)</label>
          <textarea
            className="w-full rounded-lg border px-3 py-2 min-h-[72px] bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this promotion batch"
          />
        </div>

        <div className="rounded-lg border dark:border-slate-700">
          <div className="px-3 py-2 border-b text-sm font-semibold">Class Mapping</div>
          <div className="max-h-64 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-slate-800">
                  <th className="text-left px-3 py-2">From Class</th>
                  <th className="text-left px-3 py-2">To Class</th>
                </tr>
              </thead>
              <tbody>
                {standardsSorted.map((std) => (
                  <tr key={std.id} className="border-t dark:border-slate-700">
                    <td className="px-3 py-2">{toClassLabel(std.name)}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border px-2 py-1 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                        value={classMappings[std.id] ?? ''}
                        onChange={(e) =>
                          setClassMappings((prev) => ({
                            ...prev,
                            [std.id]: e.target.value ? Number(e.target.value) : '',
                          }))
                        }
                      >
                        <option value="">No mapping</option>
                        {standardsSorted.map((target) => (
                          <option key={target.id} value={target.id}>
                            {toClassLabel(target.name)}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
                {!standardsSorted.length && (
                  <tr>
                    <td className="px-3 py-3 text-gray-500 dark:text-slate-400" colSpan={2}>
                      No class master data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-indigo-600 text-white px-4 py-2 disabled:opacity-60 inline-flex items-center gap-2"
            onClick={handlePreview}
            disabled={loading || metaLoading}
          >
            <Eye className="h-4 w-4" />
            {loading ? 'Processing...' : 'Generate Preview'}
          </button>
          <button
            className="rounded-lg border border-emerald-300 text-emerald-700 px-4 py-2 disabled:opacity-60 inline-flex items-center gap-2 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
            onClick={handleApply}
            disabled={loading || !batch || !hasNonAppliedRows}
          >
            <UserCheck className="h-4 w-4" />
            Apply Promotion
          </button>
        </div>
      </div>
      )}

      {activeTab === 'promotion' && (
      <div className="rounded-xl border bg-white p-4 md:p-5 space-y-3 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers3 className="h-5 w-5 text-blue-600" />
          Preview / Batch Detail
        </h2>
        {!batch ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">No batch selected yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-sm">
              <div className="rounded-lg border bg-gradient-to-br from-white to-slate-50 p-3 dark:from-slate-900 dark:to-slate-800/70 dark:border-slate-700">
                <div className="text-gray-500 text-xs">Status</div>
                <div className="font-semibold mt-1">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${getBatchStatusBadgeClass(batch.status)}`}>
                    {batch.status}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-white to-slate-50 p-3 dark:from-slate-900 dark:to-slate-800/70 dark:border-slate-700">
                <div className="text-gray-500 text-xs flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Total</div>
                <div className="font-semibold text-lg">{selectedTotalCount}</div>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-white to-emerald-50 p-3 dark:from-slate-900 dark:to-emerald-900/20 dark:border-emerald-800">
                <div className="text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Ready</div>
                <div className="font-semibold text-lg text-emerald-700 dark:text-emerald-300">{selectedReadyCount}</div>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-white to-indigo-50 p-3 dark:from-slate-900 dark:to-indigo-900/20 dark:border-indigo-800">
                <div className="text-indigo-700 dark:text-indigo-300 text-xs flex items-center gap-1"><UserCheck className="h-3.5 w-3.5" /> Applied</div>
                <div className="font-semibold text-lg text-indigo-700 dark:text-indigo-300">{selectedAppliedCount}</div>
              </div>
              <div className="rounded-lg border bg-gradient-to-br from-white to-amber-50 p-3 dark:from-slate-900 dark:to-amber-900/20 dark:border-amber-800">
                <div className="text-amber-700 dark:text-amber-300 text-xs flex items-center gap-1"><XCircle className="h-3.5 w-3.5" /> Failed</div>
                <div className="font-semibold text-lg text-amber-700 dark:text-amber-300">{batch.failed_count}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600 dark:text-slate-300">
              {batch.from_year_name} to {batch.to_year_name}
            </div>

            <div className="rounded-lg border overflow-auto max-h-[460px] bg-white dark:border-slate-700 dark:bg-slate-900">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0 dark:bg-slate-800">
                  <tr>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">From</th>
                    <th className="text-left px-3 py-2">To</th>
                    <th className="text-left px-3 py-2">Fees</th>
                    <th className="text-left px-3 py-2">Outcome</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Status Message</th>
                  </tr>
                </thead>
                <tbody>
                  {(batch.records || []).map((r) => (
                    <tr key={r.id} className="border-t dark:border-slate-700">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.student_name}</div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">{r.student_id}</div>
                      </td>
                      <td className="px-3 py-2">
                        {r.from_standard_name}
                        {r.from_section_name ? ` - ${r.from_section_name}` : ''}
                      </td>
                      <td className="px-3 py-2">
                        {r.target_standard_name ? `${r.target_standard_name}${r.target_section_name ? ` - ${r.target_section_name}` : ''}` : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">
                          {r.fee_status === 'PENDING' ? 'Pending' : r.fee_status === 'CLEARED' ? 'Cleared' : 'No Fees'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          Pending Items: {r.fee_pending_items} | Cleared Items: {r.fee_cleared_items}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          Due: ₹{money(r.fee_total_due)} | Paid: ₹{money(r.fee_total_paid)}
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.outcome}</td>
                      <td className="px-3 py-2">
                        <select
                          className="rounded-md border px-2 py-1 bg-white text-xs font-semibold dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                          value={rowStatusByRecordId[r.id] || getRecordDisplayStatus(r)}
                          onChange={(e) => handleRowStatusChange(r, e.target.value as RowSelectableStatus)}
                          disabled={Boolean(rowUpdatingByRecordId[r.id]) || r.status === 'APPLIED'}
                        >
                          <option value="READY">READY</option>
                          <option value="PENDING">PENDING</option>
                          <option value="LEFT">LEFT</option>
                          {r.status === 'APPLIED' && <option value="APPLIED">APPLIED</option>}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span
                          className={`inline-flex rounded-full px-2 py-1 font-medium ${
                            (rowStatusByRecordId[r.id] || getRecordDisplayStatus(r)) === 'APPLIED'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : (rowStatusByRecordId[r.id] || getRecordDisplayStatus(r)) === 'PENDING'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                : (rowStatusByRecordId[r.id] || getRecordDisplayStatus(r)) === 'LEFT'
                                  ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                                  : (rowStatusByRecordId[r.id] || getRecordDisplayStatus(r)) === 'ERROR'
                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          }`}
                        >
                          {getStatusMessage(r, rowStatusByRecordId[r.id] || getRecordDisplayStatus(r))}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!batch.records?.length && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500 dark:text-slate-400" colSpan={7}>
                        No records found in this batch.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      )}

      {activeTab === 'promotion' && (
      <div className="rounded-xl border bg-white p-4 md:p-5 shadow-sm dark:bg-slate-900 dark:border-slate-800">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock3 className="h-5 w-5 text-slate-600" />
          Recent Promotion Batches
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 mb-4">
          <div className="rounded-xl border bg-gradient-to-br from-white to-slate-50 p-4 dark:from-slate-900 dark:to-slate-800/70 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Batches</p>
            <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{totalBatchCount}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-emerald-50 p-4 dark:from-slate-900 dark:to-emerald-900/20 dark:border-emerald-800">
            <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Applied</p>
            <p className="mt-2 text-2xl font-bold text-emerald-900 dark:text-emerald-200">{batchesAppliedCount}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-blue-50 p-4 dark:from-slate-900 dark:to-blue-900/20 dark:border-blue-800">
            <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300">Preview</p>
            <p className="mt-2 text-2xl font-bold text-blue-900 dark:text-blue-200">{batchesPreviewCount}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-amber-50 p-4 dark:from-slate-900 dark:to-amber-900/20 dark:border-amber-800">
            <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300">Partial</p>
            <p className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">{batchesPartialCount}</p>
          </div>
          <div className="rounded-xl border bg-gradient-to-br from-white to-rose-50 p-4 dark:from-slate-900 dark:to-rose-900/20 dark:border-rose-800">
            <p className="text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">Failed</p>
            <p className="mt-2 text-2xl font-bold text-rose-900 dark:text-rose-200">{batchesFailedCount}</p>
          </div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800">
              <tr>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="text-left px-3 py-2">Years</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Ready</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t dark:border-slate-700">
                  <td className="px-3 py-2">#{b.id}</td>
                  <td className="px-3 py-2">
                    {b.from_year_name} to {b.to_year_name}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${getBatchStatusBadgeClass(b.status)}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{b.total_students}</td>
                  <td className="px-3 py-2">{b.ready_count}</td>
                  <td className="px-3 py-2">
                    <button className="rounded border px-2 py-1 inline-flex items-center gap-1 dark:border-slate-700 dark:text-slate-100" onClick={() => openBatch(b.id)}>
                      <Eye className="h-3.5 w-3.5" />
                      Open
                    </button>
                    <button
                      className="rounded border border-red-300 text-red-600 px-2 py-1 ml-2 disabled:opacity-60 inline-flex items-center gap-1"
                      onClick={() => handleDeleteBatch(b)}
                      disabled={b.status === 'APPLIED'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!batches.length && (
                <tr>
                  <td className="px-3 py-3 text-gray-500 dark:text-slate-400" colSpan={6}>
                    No promotion batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}
