'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { studentApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { FaCalendarAlt } from 'react-icons/fa';

type ResponseType = 'ACCEPT' | 'RESCHEDULE';

interface StudentMeetingItem {
  id: number;
  subject: string;
  description: string;
  status: string;
  mode: 'ONLINE' | 'OFFLINE';
  meeting_link?: string;
  location?: string;
  start_at: string;
  end_at: string;
  teacher_name: string;
}

interface ResponseForm {
  response: ResponseType;
  comment: string;
  proposedStart: string;
  proposedEnd: string;
}

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-green-100 text-green-800',
  RESCHEDULE_REQUESTED: 'bg-blue-100 text-blue-800',
  DECLINED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
};

export default function StudentMeetingsPage() {
  const [meetings, setMeetings] = useState<StudentMeetingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [formById, setFormById] = useState<Record<number, ResponseForm>>({});

  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await studentApi.meetings.inbox();
      const list: StudentMeetingItem[] = response.data?.data || [];
      setMeetings(list);

      const nextForms: Record<number, ResponseForm> = {};
      list.forEach((item) => {
        nextForms[item.id] = {
          response: 'ACCEPT',
          comment: '',
          proposedStart: '',
          proposedEnd: '',
        };
      });
      setFormById(nextForms);
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to load meeting inbox');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const upcomingCount = useMemo(() => meetings.filter((m) => ['REQUESTED', 'CONFIRMED', 'RESCHEDULE_REQUESTED'].includes(m.status)).length, [meetings]);

  const updateForm = (id: number, partial: Partial<ResponseForm>) => {
    setFormById((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...partial,
      },
    }));
  };

  const handleRespond = async (event: FormEvent, meetingId: number) => {
    event.preventDefault();
    const form = formById[meetingId];
    try {
      setSubmittingId(meetingId);
      await studentApi.meetings.respond(meetingId, {
        actor_type: 'STUDENT',
        response: form.response,
        comment: form.comment,
        proposed_start: form.response === 'RESCHEDULE' && form.proposedStart ? new Date(form.proposedStart).toISOString() : undefined,
        proposed_end: form.response === 'RESCHEDULE' && form.proposedEnd ? new Date(form.proposedEnd).toISOString() : undefined,
      });
      toastSuccess('Meeting response submitted');
      await loadMeetings();
    } catch (error: any) {
      toastError(error?.response?.data?.error || 'Failed to submit response');
    } finally {
      setSubmittingId(null);
    }
  };

  const inputClass =
    'w-full rounded-lg sm:rounded-xl border border-gray-300 px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500';

  const primaryButtonClass =
    'px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl bg-blue-600 text-white font-medium text-xs sm:text-sm hover:bg-blue-700 disabled:opacity-60 transition-colors';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg text-white bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg bg-white/20 backdrop-blur-sm">
                <FaCalendarAlt className="text-2xl sm:text-3xl" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1.5 sm:mb-2">My Meetings</h1>
                <p className="text-xs sm:text-sm text-blue-100">Respond as student or parent from this same login</p>
              </div>
            </div>
            <div className="px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl bg-white/20 text-xs sm:text-sm font-medium">
              Upcoming: {upcomingCount}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 p-4 sm:p-6 shadow-sm">
          {loading ? (
            <p className="text-xs sm:text-sm text-gray-600">Loading...</p>
          ) : meetings.length === 0 ? (
            <p className="text-xs sm:text-sm text-gray-600">No meetings available.</p>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {meetings.map((meeting) => {
                const form = formById[meeting.id];
                return (
                  <form key={meeting.id} onSubmit={(event) => handleRespond(event, meeting.id)} className="border border-gray-200 rounded-lg sm:rounded-xl p-3 sm:p-4 space-y-3">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-gray-900">{meeting.subject}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">Teacher: {meeting.teacher_name}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[meeting.status] || 'bg-gray-100 text-gray-700'}`}>
                        {meeting.status}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-gray-700">
                      {new Date(meeting.start_at).toLocaleString()} - {new Date(meeting.end_at).toLocaleString()}
                    </p>
                    {meeting.description ? <p className="text-xs sm:text-sm text-gray-700">{meeting.description}</p> : null}
                    {meeting.mode === 'ONLINE' && meeting.meeting_link ? (
                      <p className="text-xs sm:text-sm text-blue-700 break-all">Link: {meeting.meeting_link}</p>
                    ) : null}
                    {meeting.mode === 'OFFLINE' && meeting.location ? (
                      <p className="text-xs sm:text-sm text-gray-700">Location: {meeting.location}</p>
                    ) : null}

                    {meeting.status !== 'COMPLETED' ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => updateForm(meeting.id, { response: 'ACCEPT' })}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${
                              form?.response === 'ACCEPT'
                                ? 'bg-green-600 text-white'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => updateForm(meeting.id, { response: 'RESCHEDULE' })}
                            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium ${
                              form?.response === 'RESCHEDULE'
                                ? 'bg-blue-600 text-white'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            Request Reschedule
                          </button>
                        </div>

                        <input
                          type="text"
                          value={form?.comment || ''}
                          onChange={(e) => updateForm(meeting.id, { comment: e.target.value })}
                          className={inputClass}
                          placeholder="Comment"
                        />

                        {form?.response === 'RESCHEDULE' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <input
                              type="datetime-local"
                              value={form?.proposedStart || ''}
                              onChange={(e) => updateForm(meeting.id, { proposedStart: e.target.value })}
                              className={inputClass}
                              required
                            />
                            <input
                              type="datetime-local"
                              value={form?.proposedEnd || ''}
                              onChange={(e) => updateForm(meeting.id, { proposedEnd: e.target.value })}
                              className={inputClass}
                              required
                            />
                          </div>
                        ) : null}

                        <button
                          type="submit"
                          disabled={submittingId === meeting.id}
                          className={primaryButtonClass}
                        >
                          {submittingId === meeting.id ? 'Submitting...' : 'Submit Response'}
                        </button>
                      </>
                    ) : null}
                  </form>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
