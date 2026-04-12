'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { toastError, toastInfo, toastSuccess } from '@/lib/toast';

type AcademicYear = {
  id: number;
  name: string;
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

const toClassLabel = (name: string) => `Class ${name}`;
const money = (value: string | number) => Number(value || 0).toFixed(2);

export default function StudentPromotionPage() {
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(true);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [standards, setStandards] = useState<Standard[]>([]);
  const [fromYearId, setFromYearId] = useState<number | null>(null);
  const [toYearId, setToYearId] = useState<number | null>(null);
  const [sectionMode, setSectionMode] = useState<'same_if_exists' | 'none'>('same_if_exists');
  const [unmappedAction, setUnmappedAction] = useState<'detain' | 'left' | 'error'>('detain');
  const [notes, setNotes] = useState('');
  const [classMappings, setClassMappings] = useState<Record<number, number | ''>>({});
  const [batch, setBatch] = useState<PromotionBatch | null>(null);
  const [batches, setBatches] = useState<PromotionBatch[]>([]);

  const standardsSorted = useMemo(
    () => [...standards].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [standards]
  );

  const loadMeta = async () => {
    setMetaLoading(true);
    try {
      const res = await adminApi.promotions.meta();
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

  const loadBatches = async () => {
    try {
      const res = await adminApi.promotions.batches();
      setBatches(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Failed to load promotion batches:', error);
    }
  };

  useEffect(() => {
    loadMeta();
    loadBatches();
  }, []);

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
      const res = await adminApi.promotions.applyBatch(batch.id);
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
      const res = await adminApi.promotions.batchDetail(batchId);
      setBatch(res.data as PromotionBatch);
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
      await adminApi.promotions.deleteBatch(batch.id);
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student Promotion</h1>
        <p className="text-sm text-gray-500">
          Create a preview, verify records, then apply promotion from one academic year to the next.
        </p>
      </div>

      <div className="rounded-xl border p-4 md:p-5 space-y-4">
        <h2 className="text-lg font-semibold">Promotion Setup</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">From Academic Year</label>
            <select
              className="w-full rounded-lg border px-3 py-2"
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
              className="w-full rounded-lg border px-3 py-2"
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
              className="w-full rounded-lg border px-3 py-2"
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
              className="w-full rounded-lg border px-3 py-2"
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
            className="w-full rounded-lg border px-3 py-2 min-h-[72px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes for this promotion batch"
          />
        </div>

        <div className="rounded-lg border">
          <div className="px-3 py-2 border-b text-sm font-semibold">Class Mapping</div>
          <div className="max-h-64 overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-3 py-2">From Class</th>
                  <th className="text-left px-3 py-2">To Class</th>
                </tr>
              </thead>
              <tbody>
                {standardsSorted.map((std) => (
                  <tr key={std.id} className="border-t">
                    <td className="px-3 py-2">{toClassLabel(std.name)}</td>
                    <td className="px-3 py-2">
                      <select
                        className="rounded-lg border px-2 py-1"
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
                    <td className="px-3 py-3 text-gray-500" colSpan={2}>
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
            className="rounded-lg bg-blue-600 text-white px-4 py-2 disabled:opacity-60"
            onClick={handlePreview}
            disabled={loading || metaLoading}
          >
            {loading ? 'Processing...' : 'Generate Preview'}
          </button>
          <button
            className="rounded-lg border px-4 py-2 disabled:opacity-60"
            onClick={handleApply}
            disabled={loading || !batch || batch.ready_count === 0 || batch.status === 'APPLIED'}
          >
            Apply Promotion
          </button>
        </div>
      </div>

      <div className="rounded-xl border p-4 md:p-5 space-y-3">
        <h2 className="text-lg font-semibold">Preview / Batch Detail</h2>
        {!batch ? (
          <p className="text-sm text-gray-500">No batch selected yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Status</div>
                <div className="font-semibold">{batch.status}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Total</div>
                <div className="font-semibold">{batch.total_students}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Ready</div>
                <div className="font-semibold">{batch.ready_count}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Errors</div>
                <div className="font-semibold">{batch.error_count}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Applied</div>
                <div className="font-semibold">{batch.applied_count}</div>
              </div>
              <div className="rounded-lg border p-2">
                <div className="text-gray-500">Failed</div>
                <div className="font-semibold">{batch.failed_count}</div>
              </div>
            </div>

            <div className="text-sm text-gray-600">
              {batch.from_year_name} to {batch.to_year_name}
            </div>

            <div className="rounded-lg border overflow-auto max-h-[460px]">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Student</th>
                    <th className="text-left px-3 py-2">From</th>
                    <th className="text-left px-3 py-2">To</th>
                    <th className="text-left px-3 py-2">Fees</th>
                    <th className="text-left px-3 py-2">Outcome</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {(batch.records || []).map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.student_name}</div>
                        <div className="text-xs text-gray-500">{r.student_id}</div>
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
                        <div className="text-xs text-gray-500">
                          Pending Items: {r.fee_pending_items} | Cleared Items: {r.fee_cleared_items}
                        </div>
                        <div className="text-xs text-gray-500">
                          Due: ₹{money(r.fee_total_due)} | Paid: ₹{money(r.fee_total_paid)}
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.outcome}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2 text-red-600">{r.error_message || '-'}</td>
                    </tr>
                  ))}
                  {!batch.records?.length && (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={7}>
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

      <div className="rounded-xl border p-4 md:p-5">
        <h2 className="text-lg font-semibold mb-3">Recent Promotion Batches</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2">Batch</th>
                <th className="text-left px-3 py-2">Years</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Total</th>
                <th className="text-left px-3 py-2">Ready</th>
                <th className="text-left px-3 py-2">Errors</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">#{b.id}</td>
                  <td className="px-3 py-2">
                    {b.from_year_name} to {b.to_year_name}
                  </td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2">{b.total_students}</td>
                  <td className="px-3 py-2">{b.ready_count}</td>
                  <td className="px-3 py-2">{b.error_count}</td>
                  <td className="px-3 py-2">
                    <button className="rounded border px-2 py-1" onClick={() => openBatch(b.id)}>
                      Open
                    </button>
                    <button
                      className="rounded border border-red-300 text-red-600 px-2 py-1 ml-2 disabled:opacity-60"
                      onClick={() => handleDeleteBatch(b)}
                      disabled={b.status === 'APPLIED'}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!batches.length && (
                <tr>
                  <td className="px-3 py-3 text-gray-500" colSpan={7}>
                    No promotion batches yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
