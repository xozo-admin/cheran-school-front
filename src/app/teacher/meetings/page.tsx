'use client';

import { FormEvent, useEffect, useState } from 'react';
import { teacherApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { FaCalendarAlt } from 'react-icons/fa';

type MeetingMode = 'ONLINE' | 'OFFLINE';

interface AdminRequestItem {
  id: number;
  subject: string;
  message: string;
  status: string;
  preferred_start: string;
  final_start?: string;
  admin_note?: string;
}

interface TeacherMeetingItem {
  id: number;
  subject: string;
  status: string;
  start_at: string;
  end_at: string;
  mode: MeetingMode;
  student_name: string;
  student_id_code: string;
}

interface AdminRequestForm {
  admin: number;
  subject: string;
  message: string;
  preferredStart: string;
  durationMinutes: number;
}

interface StudentMeetingForm {
  studentIdCode: string;
  subject: string;
  description: string;
  startAt: string;
  endAt: string;
  mode: MeetingMode;
  meetingLink: string;
  location: string;
}

interface MeetingActionForm {
  note: string;
  startAt: string;
  endAt: string;
}

interface AdminRescheduleForm {
  proposedStart: string;
  durationMinutes: number;
  note: string;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  RESCHEDULE_REQUESTED: 'bg-blue-100 text-blue-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

export default function TeacherMeetingsPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const [adminForm, setAdminForm] = useState<AdminRequestForm>({
    admin: 1,
    subject: '',
    message: '',
    preferredStart: '',
    durationMinutes: 30,
  });
  const [meetingForm, setMeetingForm] = useState<StudentMeetingForm>({
    studentIdCode: '',
    subject: '',
    description: '',
    startAt: '',
    endAt: '',
    mode: 'OFFLINE',
    meetingLink: '',
    location: '',
  });

  const [adminRequests, setAdminRequests] = useState<AdminRequestItem[]>([]);
  const [studentMeetings, setStudentMeetings] = useState<TeacherMeetingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyMeetingId, setBusyMeetingId] = useState<number | null>(null);
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [actionFormByMeetingId, setActionFormByMeetingId] = useState<Record<number, MeetingActionForm>>({});
  const [adminRescheduleById, setAdminRescheduleById] = useState<Record<number, AdminRescheduleForm>>({});
  const [busyAdminRescheduleId, setBusyAdminRescheduleId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [adminReqRes, studentMeetRes] = await Promise.all([
        teacherApi.meetings.myAdminMeetingRequests(),
        teacherApi.meetings.myStudentMeetings(),
      ]);
      const adminList: AdminRequestItem[] = adminReqRes.data?.data || [];
      setAdminRequests(adminList);
      setAdminRescheduleById((prev) => {
        const next = { ...prev };
        adminList.forEach((item) => {
          if (!next[item.id]) {
            const preferred = new Date(item.final_start || item.preferred_start);
            const tzOffsetMs = preferred.getTimezoneOffset() * 60_000;
            next[item.id] = {
              proposedStart: new Date(preferred.getTime() - tzOffsetMs).toISOString().slice(0, 16),
              durationMinutes: 30,
              note: '',
            };
          }
        });
        return next;
      });
      const meetings: TeacherMeetingItem[] = studentMeetRes.data?.data || [];
      setStudentMeetings(meetings);
      setActionFormByMeetingId((prev) => {
        const next = { ...prev };
        meetings.forEach((meeting) => {
          if (!next[meeting.id]) {
            next[meeting.id] = {
              note: '',
              startAt: '',
              endAt: '',
            };
          }
        });
        return next;
      });
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdminRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await teacherApi.meetings.requestAdminMeeting({
        admin: Number(adminForm.admin),
        subject: adminForm.subject,
        message: adminForm.message,
        preferred_start: new Date(adminForm.preferredStart).toISOString(),
        duration_minutes: Number(adminForm.durationMinutes),
      });
      toastSuccess('Admin meeting request created');
      setAdminForm((prev) => ({ ...prev, subject: '', message: '', preferredStart: '' }));
      await loadData();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to request admin meeting');
    }
  };

  const handleStudentMeetingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setCreatingMeeting(true);

      await teacherApi.meetings.createStudentMeeting({
        student_id: meetingForm.studentIdCode.trim(),
        subject: meetingForm.subject,
        description: meetingForm.description,
        start_at: new Date(meetingForm.startAt).toISOString(),
        end_at: new Date(meetingForm.endAt).toISOString(),
        mode: meetingForm.mode,
        meeting_link: meetingForm.mode === 'ONLINE' ? meetingForm.meetingLink : undefined,
        location: meetingForm.mode === 'OFFLINE' ? meetingForm.location : undefined,
      });

      toastSuccess('Teacher-student/parent meeting created');
      setMeetingForm((prev) => ({
        ...prev,
        studentIdCode: '',
        subject: '',
        description: '',
        startAt: '',
        endAt: '',
        meetingLink: '',
        location: '',
      }));
      await loadData();
    } catch (error: any) {
      toastError(error?.response?.data?.error || error?.message || 'Failed to create meeting');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const doMeetingAction = async (
    meetingId: number,
    action: 'confirm' | 'cancel' | 'complete' | 'reschedule'
  ) => {
    try {
      setBusyMeetingId(meetingId);
      const actionForm = actionFormByMeetingId[meetingId] || { note: '', startAt: '', endAt: '' };
      const payload: {
        action: 'confirm' | 'cancel' | 'complete' | 'reschedule';
        start_at?: string;
        end_at?: string;
        note?: string;
      } = {
        action,
        note: actionForm.note?.trim() || undefined,
      };

      if (action === 'reschedule') {
        if (!actionForm.startAt || !actionForm.endAt) {
          toastError('Please select new start and end time for reschedule');
          return;
        }
        payload.start_at = new Date(actionForm.startAt).toISOString();
        payload.end_at = new Date(actionForm.endAt).toISOString();
      }

      await teacherApi.meetings.actionOnStudentMeeting(meetingId, payload);
      toastSuccess(`Meeting ${action}ed`);
      await loadData();
    } catch (error: any) {
      toastError(error?.response?.data?.error || `Failed to ${action} meeting`);
    } finally {
      setBusyMeetingId(null);
    }
  };

  const updateMeetingActionForm = (meetingId: number, patch: Partial<MeetingActionForm>) => {
    setActionFormByMeetingId((prev) => ({
      ...prev,
      [meetingId]: {
        ...(prev[meetingId] || { note: '', startAt: '', endAt: '' }),
        ...patch,
      },
    }));
  };

  const updateAdminRescheduleForm = (requestId: number, patch: Partial<AdminRescheduleForm>) => {
    setAdminRescheduleById((prev) => ({
      ...prev,
      [requestId]: {
        ...(prev[requestId] || { proposedStart: '', durationMinutes: 30, note: '' }),
        ...patch,
      },
    }));
  };

  const handleRequesterReschedule = async (requestId: number) => {
    try {
      const form = adminRescheduleById[requestId];
      if (!form?.proposedStart) {
        toastError('Please select proposed date and time');
        return;
      }
      setBusyAdminRescheduleId(requestId);
      await teacherApi.meetings.requestAdminMeetingReschedule(requestId, {
        proposed_start: new Date(form.proposedStart).toISOString(),
        duration_minutes: Number(form.durationMinutes) || 30,
        admin_note: form.note?.trim() || undefined,
      });
      toastSuccess('Reschedule request sent to admin');
      await loadData();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to request reschedule');
    } finally {
      setBusyAdminRescheduleId(null);
    }
  };

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300',
      get('border', 'primary')
    );
    if (color === 'blue') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-blue-900/10'
        : 'from-white to-blue-50');
    }
    if (color === 'emerald') {
      return combine(base, 'bg-gradient-to-br', theme === 'dark'
        ? 'from-gray-800 to-emerald-900/10'
        : 'from-white to-emerald-50');
    }
    return combine(base, 'bg-gradient-to-br', theme === 'dark'
      ? 'from-gray-800 to-amber-900/10'
      : 'from-white to-amber-50');
  };

  const inputClass = combine(
    'w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border outline-none transition-all text-xs sm:text-sm',
    'focus:ring-2 focus:ring-blue-500',
    theme === 'dark'
      ? 'bg-gray-900/70 border-gray-600 text-gray-100 hover:border-gray-500'
      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
  );

  const primaryButtonClass = combine(
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl transition-all duration-200 font-medium text-white text-xs sm:text-sm',
    'shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60'
  );

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div
        className={combine(
          'rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white',
          theme === 'dark'
            ? 'bg-gradient-to-r from-blue-700 to-blue-800'
            : 'bg-gradient-to-r from-blue-500 to-blue-600'
        )}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
            <FaCalendarAlt className="text-2xl sm:text-3xl" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">Meetings</h1>
            <p className="text-xs sm:text-sm text-blue-100">Manage admin requests and schedule student/parent meetings</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <form onSubmit={handleAdminRequestSubmit} className={combine(getCardGradientClass('amber'), 'space-y-3 sm:space-y-4')}>
          <h2 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Request Meeting With Admin</h2>
          <input
            type="number"
            min={1}
            required
            value={adminForm.admin}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, admin: Number(e.target.value) || 1 }))}
            className={inputClass}
            placeholder="Admin User ID"
          />
          <input
            type="text"
            required
            value={adminForm.subject}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, subject: e.target.value }))}
            className={inputClass}
            placeholder="Subject"
          />
          <textarea
            rows={3}
            value={adminForm.message}
            onChange={(e) => setAdminForm((prev) => ({ ...prev, message: e.target.value }))}
            className={inputClass}
            placeholder="Message"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              required
              value={adminForm.preferredStart}
              onChange={(e) => setAdminForm((prev) => ({ ...prev, preferredStart: e.target.value }))}
              className={inputClass}
            />
            <input
              type="number"
              min={1}
              max={240}
              required
              value={adminForm.durationMinutes}
              onChange={(e) => setAdminForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) || 30 }))}
              className={inputClass}
              placeholder="Duration minutes"
            />
          </div>
          <button className={combine(primaryButtonClass, 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700')}>
            Send Request
          </button>
        </form>

        <form onSubmit={handleStudentMeetingSubmit} className={combine(getCardGradientClass('emerald'), 'space-y-3 sm:space-y-4')}>
          <h2 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Schedule Student/Parent Meeting</h2>
          <input
            type="text"
            required
            value={meetingForm.studentIdCode}
            onChange={(e) => setMeetingForm((prev) => ({ ...prev, studentIdCode: e.target.value }))}
            className={inputClass}
            placeholder="Student ID (e.g. STU10A01)"
          />
          <input
            type="text"
            required
            value={meetingForm.subject}
            onChange={(e) => setMeetingForm((prev) => ({ ...prev, subject: e.target.value }))}
            className={inputClass}
            placeholder="Meeting Subject"
          />
          <textarea
            rows={3}
            value={meetingForm.description}
            onChange={(e) => setMeetingForm((prev) => ({ ...prev, description: e.target.value }))}
            className={inputClass}
            placeholder="Description"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="datetime-local"
              required
              value={meetingForm.startAt}
              onChange={(e) => setMeetingForm((prev) => ({ ...prev, startAt: e.target.value }))}
              className={inputClass}
            />
            <input
              type="datetime-local"
              required
              value={meetingForm.endAt}
              onChange={(e) => setMeetingForm((prev) => ({ ...prev, endAt: e.target.value }))}
              className={inputClass}
            />
          </div>
          <select
            value={meetingForm.mode}
            onChange={(e) => setMeetingForm((prev) => ({ ...prev, mode: e.target.value as MeetingMode }))}
            className={inputClass}
          >
            <option value="OFFLINE">Offline</option>
            <option value="ONLINE">Online</option>
          </select>
          {meetingForm.mode === 'ONLINE' ? (
            <input
              type="url"
              required
              value={meetingForm.meetingLink}
              onChange={(e) => setMeetingForm((prev) => ({ ...prev, meetingLink: e.target.value }))}
              className={inputClass}
              placeholder="Meeting link"
            />
          ) : (
            <input
              type="text"
              required
              value={meetingForm.location}
              onChange={(e) => setMeetingForm((prev) => ({ ...prev, location: e.target.value }))}
              className={inputClass}
              placeholder="Location"
            />
          )}
          <button
            type="submit"
            disabled={creatingMeeting}
            className={combine(primaryButtonClass, 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700')}
          >
            {creatingMeeting ? 'Creating...' : 'Create Meeting'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        <div className={getCardGradientClass('amber')}>
          <h2 className={combine('text-base sm:text-lg font-semibold mb-3', get('text', 'primary'))}>My Admin Requests</h2>
          {loading ? (
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading...</p>
          ) : adminRequests.length === 0 ? (
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>No admin requests yet.</p>
          ) : (
            <div className="space-y-3">
              {adminRequests.map((item) => (
                <div key={item.id} className={combine('border rounded-lg sm:rounded-xl p-3 sm:p-4', get('border', 'primary'), get('bg', 'card'))}>
                  {(() => {
                    const resForm = adminRescheduleById[item.id] || { proposedStart: '', durationMinutes: 30, note: '' };
                    const canReschedule = !['REJECTED', 'CANCELLED'].includes(item.status);
                    return (
                      <>
                  <div className="flex items-center justify-between gap-2">
                    <p className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>{item.subject}</p>
                    <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">{item.status}</span>
                  </div>
                  <p className={combine('text-xs sm:text-sm mt-2', get('text', 'secondary'))}>Preferred: {new Date(item.preferred_start).toLocaleString()}</p>
                  {item.final_start ? <p className="text-xs sm:text-sm text-green-700 mt-1">Final: {new Date(item.final_start).toLocaleString()}</p> : null}
                  {item.message ? <p className={combine('text-xs sm:text-sm mt-2', get('text', 'secondary'))}>{item.message}</p> : null}
                  {item.admin_note ? <p className="text-sm text-blue-700 mt-2">Admin Note: {item.admin_note}</p> : null}
                  {canReschedule ? (
                    <div className="mt-3 space-y-2 sm:space-y-3">
                      <input
                        type="datetime-local"
                        value={resForm.proposedStart}
                        onChange={(e) => updateAdminRescheduleForm(item.id, { proposedStart: e.target.value })}
                        className={inputClass}
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          max={240}
                          value={resForm.durationMinutes}
                          onChange={(e) => updateAdminRescheduleForm(item.id, { durationMinutes: Number(e.target.value) || 30 })}
                          className={inputClass}
                          placeholder="Duration minutes"
                        />
                        <input
                          type="text"
                          value={resForm.note}
                          onChange={(e) => updateAdminRescheduleForm(item.id, { note: e.target.value })}
                          className={inputClass}
                          placeholder="Comment"
                        />
                      </div>
                      <button
                        disabled={busyAdminRescheduleId === item.id}
                        onClick={() => handleRequesterReschedule(item.id)}
                        className={combine(primaryButtonClass, 'px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700')}
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

        <div className={getCardGradientClass('emerald')}>
          <h2 className={combine('text-base sm:text-lg font-semibold mb-3', get('text', 'primary'))}>My Student Meetings</h2>
          {loading ? (
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Loading...</p>
          ) : studentMeetings.length === 0 ? (
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>No student meetings yet.</p>
          ) : (
            <div className="space-y-3">
              {studentMeetings.map((meeting) => (
                <div key={meeting.id} className={combine('border rounded-lg sm:rounded-xl p-3 sm:p-4', get('border', 'primary'), get('bg', 'card'))}>
                  {(() => {
                    const actionForm = actionFormByMeetingId[meeting.id] || { note: '', startAt: '', endAt: '' };
                    return (
                      <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className={combine('font-semibold text-sm sm:text-base', get('text', 'primary'))}>{meeting.subject}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[meeting.status] || 'bg-gray-100 text-gray-700'}`}>
                      {meeting.status}
                    </span>
                  </div>
                  <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>{meeting.student_name} ({meeting.student_id_code})</p>
                  <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
                    {new Date(meeting.start_at).toLocaleString()} - {new Date(meeting.end_at).toLocaleString()}
                  </p>
                  {meeting.status !== 'COMPLETED' ? (
                    <div className="mt-3 space-y-2 sm:space-y-3">
                      <input
                        type="text"
                        value={actionForm.note}
                        onChange={(e) => updateMeetingActionForm(meeting.id, { note: e.target.value })}
                        className={inputClass}
                        placeholder="Comment"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="datetime-local"
                          value={actionForm.startAt}
                          onChange={(e) => updateMeetingActionForm(meeting.id, { startAt: e.target.value })}
                          className={inputClass}
                          placeholder="New start time"
                        />
                        <input
                          type="datetime-local"
                          value={actionForm.endAt}
                          onChange={(e) => updateMeetingActionForm(meeting.id, { endAt: e.target.value })}
                          className={inputClass}
                          placeholder="New end time"
                        />
                      </div>
                    </div>
                  ) : null}
                  {meeting.status !== 'COMPLETED' ? (
                  <div className="flex flex-wrap gap-2 mt-3 sm:mt-4">
                    <button
                      disabled={busyMeetingId === meeting.id}
                      onClick={() => doMeetingAction(meeting.id, 'confirm')}
                      className={combine(primaryButtonClass, 'px-3 sm:px-4 py-2 text-xs sm:text-sm bg-green-600 hover:bg-green-700')}
                    >
                      Confirm
                    </button>
                    <button
                      disabled={busyMeetingId === meeting.id}
                      onClick={() => doMeetingAction(meeting.id, 'complete')}
                      className={combine(primaryButtonClass, 'px-3 sm:px-4 py-2 text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700')}
                    >
                        Complete
                      </button>
                      <button
                        disabled={busyMeetingId === meeting.id}
                        onClick={() => doMeetingAction(meeting.id, 'cancel')}
                        className={combine(primaryButtonClass, 'px-3 sm:px-4 py-2 text-xs sm:text-sm bg-red-600 hover:bg-red-700')}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={busyMeetingId === meeting.id}
                        onClick={() => doMeetingAction(meeting.id, 'reschedule')}
                        className={combine(primaryButtonClass, 'px-3 sm:px-4 py-2 text-xs sm:text-sm bg-blue-600 hover:bg-blue-700')}
                      >
                        Reschedule
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
    </div>
  );
}
