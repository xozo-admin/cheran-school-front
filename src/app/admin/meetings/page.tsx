'use client';

import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { FaCalendarAlt, FaFilter } from 'react-icons/fa';
import { RefreshCw } from 'lucide-react';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';

interface AdminMeetingRequest {
  id: number;
  requester_username: string;
  requester_name: string;
  requester_id_code: string;
  requester_user_type: string;
  subject: string;
  message: string;
  preferred_start: string;
  final_start?: string;
  duration_minutes: number;
  status: string;
  admin_note: string;
}

interface ActionFormState {
  finalStart: string;
  durationMinutes: number;
  adminNote: string;
}

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

const toIso = (local: string) => new Date(local).toISOString();

const getApiMessage = (error: any, fallback: string) =>
  error?.response?.data?.error ||
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  fallback;

export default function AdminMeetingsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({ storageKey: 'meetings_school_scope' });
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [requests, setRequests] = useState<AdminMeetingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [formById, setFormById] = useState<Record<number, ActionFormState>>({});
  const [proposeDialogId, setProposeDialogId] = useState<number | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await adminApi.meetings.pendingAdminRequests({
        status: statusFilter,
        ...schoolScope.scopeParams,
      });
      const list: AdminMeetingRequest[] = response.data?.data || [];
      setRequests(list);
      const nextState: Record<number, ActionFormState> = {};
      list.forEach((item) => {
        nextState[item.id] = {
          finalStart: toLocalInput(item.final_start || item.preferred_start),
          durationMinutes: item.duration_minutes || 30,
          adminNote: item.admin_note || '',
        };
      });
      setFormById(nextState);
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to load meeting requests'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, schoolScope.selectedSchoolId]);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === 'PENDING' || item.status === 'RESCHEDULE_PROPOSED').length,
    [requests]
  );

  const updateForm = (id: number, partial: Partial<ActionFormState>) => {
    setFormById((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...partial,
      },
    }));
  };

  const handleApprove = async (id: number) => {
    try {
      setActingId(id);
      const state = formById[id];
      await adminApi.meetings.approveAdminRequest(id, {
        final_start: toIso(state.finalStart),
        duration_minutes: Number(state.durationMinutes),
        admin_note: state.adminNote,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Meeting approved');
      await loadRequests();
    } catch (error: any) {
      toastError(getApiMessage(error, 'Approval failed'));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: number) => {
    try {
      setActingId(id);
      const state = formById[id];
      await adminApi.meetings.rejectAdminRequest(id, {
        admin_note: state.adminNote,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Meeting rejected');
      await loadRequests();
    } catch (error: any) {
      toastError(getApiMessage(error, 'Reject failed'));
    } finally {
      setActingId(null);
    }
  };

  const openProposeDialog = (id: number) => {
    setProposeDialogId(id);
  };

  const closeProposeDialog = () => {
    setProposeDialogId(null);
  };

  const handleProposeAndApprove = async (id: number) => {
    try {
      setActingId(id);
      const state = formById[id];
      await adminApi.meetings.approveAdminRequest(id, {
        final_start: toIso(state.finalStart),
        duration_minutes: Number(state.durationMinutes),
        admin_note: state.adminNote,
        ...schoolScope.scopeParams,
      });
      toastSuccess('Meeting approved with new proposed time');
      closeProposeDialog();
      await loadRequests();
    } catch (error: any) {
      toastError(getApiMessage(error, 'Failed to set proposed time'));
    } finally {
      setActingId(null);
    }
  };

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' = 'blue') => {
    const baseClasses = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
    if (color === 'blue') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    return combine(baseClasses, 'bg-gradient-to-br', theme === 'dark'
      ? 'from-gray-800 to-amber-900/10'
      : 'from-white to-amber-50');
  };

  const inputClass = combine(
    'w-full rounded-lg sm:rounded-xl border px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm',
    'focus:ring-2 focus:ring-blue-500 outline-none transition-all',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100'
      : 'bg-white border-gray-300 text-gray-900'
  );

  const primaryButtonClass = combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium',
    'text-white shadow hover:shadow-md transition-all disabled:opacity-60',
    'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
  );

  const renderActionControls = (item: AdminMeetingRequest) => {
    const state = formById[item.id];
    return (
      <div className="space-y-2 sm:space-y-3">
        <input
          type="datetime-local"
          value={state?.finalStart || ''}
          onChange={(e) => updateForm(item.id, { finalStart: e.target.value })}
          className={inputClass}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input
            type="number"
            min={1}
            max={240}
            value={state?.durationMinutes || 30}
            onChange={(e) => updateForm(item.id, { durationMinutes: Number(e.target.value) || 30 })}
            className={inputClass}
            placeholder="Duration (minutes)"
          />
          <input
            type="text"
            value={state?.adminNote || ''}
            onChange={(e) => updateForm(item.id, { adminNote: e.target.value })}
            className={inputClass}
            placeholder="Admin note"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {item.status !== 'REJECTED' ? (
            <>
              {item.status !== 'APPROVED' ? (
                <button
                  disabled={actingId === item.id}
                  onClick={() => handleApprove(item.id)}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 text-xs sm:text-sm"
                >
                  Approve
                </button>
              ) : null}
              <button
                disabled={actingId === item.id}
                onClick={() => openProposeDialog(item.id)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 text-xs sm:text-sm"
              >
                Propose
              </button>
              <button
                disabled={actingId === item.id}
                onClick={() => handleReject(item.id)}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 text-xs sm:text-sm"
              >
                Reject
              </button>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className={getCardGradientClass('blue')}>
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:items-center lg:justify-between">
          <div>
            <h1 className={combine('text-lg sm:text-2xl font-bold flex items-center gap-2', get('text', 'primary'))}>
              <FaCalendarAlt className="text-blue-600" />
              Meeting Requests
            </h1>
            <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
              Filter: {statusFilter} • Pending in current view: {pendingCount}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <SchoolScopeSelector {...schoolScope} className="w-full sm:w-auto" />
            <button
              type="button"
              onClick={loadRequests}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 sm:text-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <label className={combine('text-xs sm:text-sm font-medium flex items-center gap-2', get('text', 'secondary'))}>
              <FaFilter />
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={combine(inputClass, 'sm:min-w-[190px]')}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="RESCHEDULE_PROPOSED">Reschedule Proposed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className={getCardGradientClass('emerald')}>
        {loading ? (
          <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>No meeting requests for selected status.</p>
        ) : (
          <>
            <div className="space-y-3 lg:hidden">
              {requests.map((item) => (
                <div key={item.id} className={combine('rounded-xl border p-3', get('border', 'primary'), get('bg', 'card'))}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={combine('text-sm font-semibold', get('text', 'primary'))}>{item.subject}</p>
                      <p className={combine('text-xs mt-1', get('text', 'secondary'))}>
                        {item.requester_name || item.requester_username} • {item.requester_id_code}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold">
                      {item.status}
                    </span>
                  </div>
                  <div className={combine('text-xs mt-2 space-y-1', get('text', 'secondary'))}>
                    <p>Preferred: {new Date(item.preferred_start).toLocaleString()}</p>
                    <p>
                      Requested:{' '}
                      {item.final_start ? new Date(item.final_start).toLocaleString() : '-'}
                    </p>
                    {item.message ? <p>Message: {item.message}</p> : null}
                  </div>
                  <div className="mt-3">{renderActionControls(item)}</div>
                </div>
              ))}
            </div>

            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className={combine('text-left border-b', get('text', 'secondary'), get('border', 'primary'))}>
                <th className="py-2">Requester</th>
                <th className="py-2">Subject</th>
                <th className="py-2">Preferred</th>
                <th className="py-2">Requested Time</th>
                <th className="py-2">Status</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((item) => {
                return (
                  <tr key={item.id} className={combine('border-b align-top', get('border', 'primary'))}>
                    <td className="py-3 pr-3">
                      <p className={combine('font-medium', get('text', 'primary'))}>{item.requester_name || item.requester_username}</p>
                      <p className={combine('text-xs mt-1', get('text', 'secondary'))}>{item.requester_id_code}</p>
                      <p className="text-xs text-blue-700 mt-1 uppercase">{item.requester_user_type}</p>
                    </td>
                    <td className="py-3 pr-3">
                      <p className={combine('font-medium', get('text', 'primary'))}>{item.subject}</p>
                      {item.message ? <p className={combine('mt-1', get('text', 'secondary'))}>{item.message}</p> : null}
                    </td>
                    <td className={combine('py-3 pr-3', get('text', 'secondary'))}>{new Date(item.preferred_start).toLocaleString()}</td>
                    <td className={combine('py-3 pr-3', get('text', 'secondary'))}>
                      {item.final_start ? (
                        <span>{new Date(item.final_start).toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-semibold">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 pr-3 space-y-2">
                      {renderActionControls(item)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
            </div>
          </>
        )}
      </div>

      {proposeDialogId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={combine('w-full max-w-lg rounded-xl border shadow-xl p-4 sm:p-5 space-y-3 sm:space-y-4', get('bg', 'card'), get('border', 'primary'))}>
            <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Propose New Timing</h3>
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
              Set new time and click OK. This will approve the meeting with this timing.
            </p>

            <input
              type="datetime-local"
              value={formById[proposeDialogId]?.finalStart || ''}
              onChange={(e) => updateForm(proposeDialogId, { finalStart: e.target.value })}
              className={inputClass}
            />
            <input
              type="number"
              min={1}
              max={240}
              value={formById[proposeDialogId]?.durationMinutes || 30}
              onChange={(e) => updateForm(proposeDialogId, { durationMinutes: Number(e.target.value) || 30 })}
              className={inputClass}
              placeholder="Duration minutes"
            />
            <input
              type="text"
              value={formById[proposeDialogId]?.adminNote || ''}
              onChange={(e) => updateForm(proposeDialogId, { adminNote: e.target.value })}
              className={inputClass}
              placeholder="Admin note"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeProposeDialog}
                className={combine('px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm border', get('border', 'primary'), get('text', 'secondary'), 'hover:bg-[var(--color-bg-hover)]')}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actingId === proposeDialogId}
                onClick={() => handleProposeAndApprove(proposeDialogId)}
                className={primaryButtonClass}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
