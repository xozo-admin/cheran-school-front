'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { studentApi } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { FaBed, FaBuilding, FaCalendarAlt, FaExclamationTriangle, FaRedo, FaUserFriends } from 'react-icons/fa';

const unwrap = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

const asArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  return [];
};

const extractApiError = (error: any, fallback: string): string => {
  const payload = error?.response?.data;
  if (!payload) return error?.message || fallback;
  if (typeof payload === 'string') return payload;
  if (payload.error) return String(payload.error);
  if (payload.message) return String(payload.message);
  if (payload.detail) return String(payload.detail);
  return fallback;
};

export default function StudentHostelPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payload, setPayload] = useState<any>({ has_hostel: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentApi.hostel.myHostel();
      setPayload(unwrap(res, { has_hostel: false }));
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load hostel details');
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const roommates = useMemo(() => asArray<any>(payload.roommates), [payload]);
  const attendanceRecent = useMemo(() => asArray<any>(payload.attendance_recent), [payload]);
  const incidentsRecent = useMemo(() => asArray<any>(payload.incidents_recent), [payload]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Hostel</h1>
          <p className="text-sm text-gray-600">Your hostel allocation, roommates, attendance, and incident history.</p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          disabled={loading}
        >
          <FaRedo className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {!loading && !payload?.has_hostel && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-blue-800">
          <h2 className="text-lg font-semibold">No active hostel allocation</h2>
          <p className="mt-2 text-sm">
            You are currently not assigned to any hostel bed. Please contact administration for allotment.
          </p>
        </div>
      )}

      {!loading && payload?.has_hostel && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Block</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{payload.allocation?.block_name || '-'}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Room</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{payload.allocation?.room_number || '-'}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Bed</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{payload.allocation?.bed_number || '-'}</p>
            </div>
            <div className="rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Academic Year</p>
              <p className="mt-2 text-lg font-semibold text-gray-900">{payload.allocation?.academic_year_name || '-'}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FaUserFriends /> Roommates</h2>
              {roommates.length === 0 && <p className="text-sm text-gray-500">No roommates found.</p>}
              <div className="space-y-2">
                {roommates.map((mate: any, index: number) => (
                  <div key={`${mate.student_id}-${index}`} className="rounded border p-2 text-sm">
                    <p className="font-medium text-gray-900">{mate.student_name || '-'}</p>
                    <p className="text-gray-600">{mate.student_id || '-'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FaCalendarAlt /> Recent Attendance</h2>
              {attendanceRecent.length === 0 && <p className="text-sm text-gray-500">No attendance records yet.</p>}
              <div className="space-y-2">
                {attendanceRecent.slice(0, 12).map((row: any) => (
                  <div key={row.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span>{row.date}</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${row.status === 'present' ? 'bg-green-100 text-green-700' : row.status === 'absent' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-4">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><FaExclamationTriangle /> Recent Incidents</h2>
            {incidentsRecent.length === 0 && <p className="text-sm text-gray-500">No incidents reported.</p>}
            <div className="space-y-2">
              {incidentsRecent.slice(0, 12).map((incident: any) => (
                <div key={incident.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{incident.title}</p>
                    <span className={`rounded-full px-2 py-1 text-xs ${incident.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                      {incident.resolved ? 'Resolved' : 'Open'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-700">{incident.description}</p>
                  <p className="mt-1 text-xs text-gray-500">Severity: {incident.severity} • {incident.occurred_at}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!loading && payload?.has_hostel && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaBuilding className="mx-auto text-blue-600" />
            <p className="mt-2 text-sm text-gray-500">Block & Room</p>
            <p className="text-lg font-semibold">{payload.allocation?.block_name} / {payload.allocation?.room_number}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaBed className="mx-auto text-green-600" />
            <p className="mt-2 text-sm text-gray-500">Bed</p>
            <p className="text-lg font-semibold">{payload.allocation?.bed_number || '-'}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaExclamationTriangle className="mx-auto text-amber-600" />
            <p className="mt-2 text-sm text-gray-500">Open Incidents</p>
            <p className="text-lg font-semibold">{incidentsRecent.filter((x: any) => !x.resolved).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
