'use client';

import { FormEvent, useEffect, useState } from 'react';
import { staffApi } from '@/lib/api';
import { resolveStaffRole } from '@/lib/staff-access';
import { toastError, toastSuccess } from '@/lib/toast';

interface AdminMeetingRequest {
  id: number;
  subject: string;
  message: string;
  preferred_start: string;
  duration_minutes: number;
  status: string;
  admin_note: string;
  final_start?: string;
}

interface IncomingAdminMeetingRequest {
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

interface AdminStaffRecipient {
  id: number;
  username: string;
  name: string;
  staff_id?: string;
  role?: string;
}

interface FormState {
  admin: number;
  subject: string;
  message: string;
  preferredStart: string;
  durationMinutes: number;
}

interface RescheduleForm {
  proposedStart: string;
  durationMinutes: number;
  note: string;
}

interface IncomingActionForm {
  finalStart: string;
  durationMinutes: number;
  adminNote: string;
}

const toLocalInput = (iso: string) => {
  const date = new Date(iso);
  const tzOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
};

export default function StaffMeetingsPage() {
  const [isAdminStaff, setIsAdminStaff] = useState(false);
  const [canManageIncoming, setCanManageIncoming] = useState(false);
  const [targetRoleLabel, setTargetRoleLabel] = useState<'admin' | 'admin staff'>('admin');
  const [adminStaffRecipients, setAdminStaffRecipients] = useState<AdminStaffRecipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [form, setForm] = useState<FormState>({
    admin: 0,
    subject: '',
    message: '',
    preferredStart: '',
    durationMinutes: 30,
  });
  const [requests, setRequests] = useState<AdminMeetingRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rescheduleById, setRescheduleById] = useState<Record<number, RescheduleForm>>({});
  const [rescheduleLoadingId, setRescheduleLoadingId] = useState<number | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<IncomingAdminMeetingRequest[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(false);
  const [incomingActionById, setIncomingActionById] = useState<Record<number, IncomingActionForm>>({});
  const [incomingActingId, setIncomingActingId] = useState<number | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await staffApi.meetings.myAdminMeetingRequests();
      const list: AdminMeetingRequest[] = response.data?.data || [];
      setRequests(list);
      setRescheduleById((prev) => {
        const next = { ...prev };
        list.forEach((item) => {
          if (!next[item.id]) {
            const preferred = new Date(item.final_start || item.preferred_start);
            const tzOffsetMs = preferred.getTimezoneOffset() * 60_000;
            next[item.id] = {
              proposedStart: new Date(preferred.getTime() - tzOffsetMs).toISOString().slice(0, 16),
              durationMinutes: item.duration_minutes || 30,
              note: '',
            };
          }
        });
        return next;
      });
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to load your meeting requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const loadIncomingRequests = async (force = false) => {
    if (!force && !isAdminStaff && !canManageIncoming) return;
    try {
      setIncomingLoading(true);
      const response = await staffApi.meetings.pendingAdminRequests({ status: 'ALL' });
      const list: IncomingAdminMeetingRequest[] = response.data?.data || [];
      setCanManageIncoming(true);
      setIncomingRequests(list);
      const next: Record<number, IncomingActionForm> = {};
      list.forEach((item) => {
        next[item.id] = {
          finalStart: toLocalInput(item.final_start || item.preferred_start),
          durationMinutes: item.duration_minutes || 30,
          adminNote: item.admin_note || '',
        };
      });
      setIncomingActionById(next);
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      if (force && (status === 401 || status === 403)) {
        setCanManageIncoming(false);
      } else {
        toastError(error?.response?.data?.error || 'Failed to load incoming requests');
      }
    } finally {
      setIncomingLoading(false);
    }
  };

  useEffect(() => {
    const resolveMeetingTarget = async () => {
      try {
        const response = await staffApi.profile.get();
        const profile = response.data?.data || response.data;
        const roleFromStorage =
          typeof window !== 'undefined'
            ? localStorage.getItem('staff_role') || localStorage.getItem('role')
            : '';
        const normalizedRole = resolveStaffRole(profile, roleFromStorage);
        const isAdminStaffRole = normalizedRole === 'admin_staff';
        setIsAdminStaff(isAdminStaffRole);
        setTargetRoleLabel(normalizedRole === 'admin_staff' ? 'admin' : 'admin staff');
        if (isAdminStaffRole) {
          setForm((prev) => ({ ...prev, admin: Number(profile?.user || 0) }));
        }
      } catch {
        const roleFromStorage =
          typeof window !== 'undefined'
            ? localStorage.getItem('staff_role') || localStorage.getItem('role')
            : '';
        const normalizedRole = resolveStaffRole(undefined, roleFromStorage);
        const isAdminStaffRole = normalizedRole === 'admin_staff';
        setIsAdminStaff(isAdminStaffRole);
        setTargetRoleLabel(normalizedRole === 'admin_staff' ? 'admin' : 'admin staff');
      }
    };

    resolveMeetingTarget();
  }, []);

  useEffect(() => {
    loadIncomingRequests(true);
  }, [isAdminStaff]);

  useEffect(() => {
    const loadAdminStaffRecipients = async () => {
      if (isAdminStaff) return;
      try {
        setRecipientsLoading(true);
        const response = await staffApi.meetings.adminStaffRecipients();
        const list: AdminStaffRecipient[] = response.data?.data || [];
        setAdminStaffRecipients(list);
        setForm((prev) => ({
          ...prev,
          admin: prev.admin || list[0]?.id || 0,
        }));
      } catch (error: any) {
        setAdminStaffRecipients([]);
        toastError(error?.response?.data?.error || 'Failed to load admin staff recipients');
      } finally {
        setRecipientsLoading(false);
      }
    };

    loadAdminStaffRecipients();
  }, [isAdminStaff]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      if (!isAdminStaff && !form.admin) {
        toastError('Please select admin staff recipient');
        return;
      }
      setSubmitting(true);
      await staffApi.meetings.requestAdminMeeting({
        admin: Number(form.admin),
        subject: form.subject,
        message: form.message,
        preferred_start: new Date(form.preferredStart).toISOString(),
        duration_minutes: Number(form.durationMinutes),
      });
      toastSuccess(`Meeting request sent to ${targetRoleLabel}`);
      setForm((prev) => ({
        ...prev,
        subject: '',
        message: '',
        preferredStart: '',
      }));
      await loadRequests();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to create request');
    } finally {
      setSubmitting(false);
    }
  };

  const updateRescheduleForm = (requestId: number, patch: Partial<RescheduleForm>) => {
    setRescheduleById((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || { proposedStart: '', durationMinutes: 30, note: '' }),
        ...patch,
      },
    }));
  };

  const requestReschedule = async (requestId: number) => {
    try {
      const form = rescheduleById[requestId];
      if (!form?.proposedStart) {
        toastError('Please select proposed date and time');
        return;
      }
      setRescheduleLoadingId(requestId);
      await staffApi.meetings.requestAdminMeetingReschedule(requestId, {
        proposed_start: new Date(form.proposedStart).toISOString(),
        duration_minutes: Number(form.durationMinutes) || 30,
        admin_note: form.note?.trim() || undefined,
      });
      toastSuccess(`Reschedule request sent to ${targetRoleLabel}`);
      await loadRequests();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to request reschedule');
    } finally {
      setRescheduleLoadingId(null);
    }
  };

  const updateIncomingActionForm = (requestId: number, patch: Partial<IncomingActionForm>) => {
    setIncomingActionById((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || { finalStart: '', durationMinutes: 30, adminNote: '' }),
        ...patch,
      },
    }));
  };

  const handleIncomingApprove = async (requestId: number) => {
    try {
      const form = incomingActionById[requestId];
      if (!form?.finalStart) {
        toastError('Please select final date and time');
        return;
      }
      setIncomingActingId(requestId);
      await staffApi.meetings.approveAdminRequest(requestId, {
        final_start: new Date(form.finalStart).toISOString(),
        duration_minutes: Number(form.durationMinutes) || 30,
        admin_note: form.adminNote?.trim() || undefined,
      });
      toastSuccess('Meeting request approved');
      await loadIncomingRequests();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to approve meeting request');
    } finally {
      setIncomingActingId(null);
    }
  };

  const handleIncomingReject = async (requestId: number) => {
    try {
      const form = incomingActionById[requestId];
      setIncomingActingId(requestId);
      await staffApi.meetings.rejectAdminRequest(requestId, {
        admin_note: form?.adminNote?.trim() || undefined,
      });
      toastSuccess('Meeting request rejected');
      await loadIncomingRequests();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to reject meeting request');
    } finally {
      setIncomingActingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create request and track status. Requests are routed to {targetRoleLabel}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 rounded border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-700">
          Meeting recipient: <span className="font-semibold">{targetRoleLabel}</span>
        </div>
        {!isAdminStaff ? (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Staff</label>
            <select
              required
              value={form.admin || ''}
              onChange={(e) => setForm((prev) => ({ ...prev, admin: Number(e.target.value) || 0 }))}
              className="w-full rounded border border-gray-300 px-3 py-2"
              disabled={recipientsLoading || adminStaffRecipients.length === 0}
            >
              <option value="">
                {recipientsLoading ? 'Loading admin staff...' : 'Select admin staff'}
              </option>
              {adminStaffRecipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            required
            value={form.subject}
            onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Date & Time</label>
          <input
            type="datetime-local"
            required
            value={form.preferredStart}
            onChange={(e) => setForm((prev) => ({ ...prev, preferredStart: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
          <input
            type="number"
            min={1}
            max={240}
            required
            value={form.durationMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) || 30 }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? 'Sending...' : 'Request Meeting'}
          </button>
        </div>
      </form>

      {isAdminStaff || canManageIncoming ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Requests From Staff</h2>
          {incomingLoading ? (
            <p className="text-gray-600">Loading incoming requests...</p>
          ) : incomingRequests.length === 0 ? (
            <p className="text-gray-600">No staff meeting requests.</p>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((item) => {
                const actionForm = incomingActionById[item.id] || {
                  finalStart: '',
                  durationMinutes: item.duration_minutes || 30,
                  adminNote: item.admin_note || '',
                };
                const closed = ['REJECTED', 'CANCELLED'].includes(item.status);
                return (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-wrap justify-between gap-2 items-center">
                      <h3 className="font-semibold text-gray-900">{item.subject}</h3>
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{item.status}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      Requested by: {item.requester_name || item.requester_username}
                    </p>
                    <p className="text-sm text-gray-600 mt-2">Preferred: {new Date(item.preferred_start).toLocaleString()}</p>
                    {item.final_start ? (
                      <p className="text-sm text-green-700 mt-1">Final: {new Date(item.final_start).toLocaleString()}</p>
                    ) : null}
                    {item.message ? <p className="text-sm text-gray-700 mt-2">{item.message}</p> : null}

                    <div className="mt-3 space-y-2">
                      <input
                        type="datetime-local"
                        value={actionForm.finalStart}
                        onChange={(e) => updateIncomingActionForm(item.id, { finalStart: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                        disabled={closed}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          max={240}
                          value={actionForm.durationMinutes}
                          onChange={(e) => updateIncomingActionForm(item.id, { durationMinutes: Number(e.target.value) || 30 })}
                          className="w-full rounded border border-gray-300 px-3 py-2"
                          placeholder="Duration minutes"
                          disabled={closed}
                        />
                        <input
                          type="text"
                          value={actionForm.adminNote}
                          onChange={(e) => updateIncomingActionForm(item.id, { adminNote: e.target.value })}
                          className="w-full rounded border border-gray-300 px-3 py-2"
                          placeholder="Admin note"
                          disabled={closed}
                        />
                      </div>
                      {!closed ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={incomingActingId === item.id}
                            onClick={() => handleIncomingApprove(item.id)}
                            className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
                          >
                            Approve
                          </button>
                          <button
                            disabled={incomingActingId === item.id}
                            onClick={() => handleIncomingReject(item.id)}
                            className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
                          >
                            Reject
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">My Requests</h2>
        {loading ? (
          <p className="text-gray-600">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="text-gray-600">No meeting requests yet.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((item) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                {(() => {
                  const formState = rescheduleById[item.id] || { proposedStart: '', durationMinutes: 30, note: '' };
                  const canReschedule = !['REJECTED', 'CANCELLED'].includes(item.status);
                  return (
                    <>
                <div className="flex flex-wrap justify-between gap-2 items-center">
                  <h3 className="font-semibold text-gray-900">{item.subject}</h3>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{item.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Preferred: {new Date(item.preferred_start).toLocaleString()}</p>
                {item.final_start ? (
                  <p className="text-sm text-green-700 mt-1">Final: {new Date(item.final_start).toLocaleString()}</p>
                ) : null}
                {item.message ? <p className="text-sm text-gray-700 mt-2">{item.message}</p> : null}
                {item.admin_note ? <p className="text-sm text-blue-700 mt-2">Admin Note: {item.admin_note}</p> : null}
                {canReschedule ? (
                  <div className="mt-3 space-y-2">
                    <input
                      type="datetime-local"
                      value={formState.proposedStart}
                      onChange={(e) => updateRescheduleForm(item.id, { proposedStart: e.target.value })}
                      className="w-full rounded border border-gray-300 px-3 py-2"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="number"
                        min={1}
                        max={240}
                        value={formState.durationMinutes}
                        onChange={(e) => updateRescheduleForm(item.id, { durationMinutes: Number(e.target.value) || 30 })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                        placeholder="Duration minutes"
                      />
                      <input
                        type="text"
                        value={formState.note}
                        onChange={(e) => updateRescheduleForm(item.id, { note: e.target.value })}
                        className="w-full rounded border border-gray-300 px-3 py-2"
                        placeholder="Comment"
                      />
                    </div>
                    <button
                      disabled={rescheduleLoadingId === item.id}
                      onClick={() => requestReschedule(item.id)}
                      className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      Request Reschedule
                    </button>
                  </div>
                ) : null}
                    </>
                  );
                })()}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
