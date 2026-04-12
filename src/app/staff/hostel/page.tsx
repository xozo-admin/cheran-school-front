'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { staffApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { FaBed, FaExclamationTriangle, FaRedo, FaUsers } from 'react-icons/fa';
import AdminHostelPage from '@/app/admin/operations/hostel/page';
import { resolveStaffRole } from '@/lib/staff-access';

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

  const fieldMsg = Object.values(payload)
    .map((val) => (Array.isArray(val) ? val.join(', ') : typeof val === 'string' ? val : ''))
    .find(Boolean);

  return String(fieldMsg || fallback);
};

function WardenHostelDesk() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [dashboard, setDashboard] = useState<any>({ blocks: [], active_students: 0, pending_incidents: 0 });
  const [occupancy, setOccupancy] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);

  const [attendanceForm, setAttendanceForm] = useState<{
    allocation: string;
    date: string;
    status: 'present' | 'out_pass' | 'leave' | 'absent';
    remarks: string;
  }>({ allocation: '', date: '', status: 'present', remarks: '' });
  const [incidentForm, setIncidentForm] = useState<{
    allocation: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    occurred_at: string;
  }>({ allocation: '', title: '', description: '', severity: 'low', occurred_at: '' });

  const allocationOptions = useMemo(
    () =>
      occupancy.map((item) => ({
        id: item.id,
        label: `${item.student_id || item.student_name || 'Student'} - ${item.room_number || 'Room'} / ${item.bed_number || 'Bed'}`,
      })),
    [occupancy]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, occRes, incRes] = await Promise.all([
        staffApi.hostel.dashboard(),
        staffApi.hostel.occupancy({ is_active: 'true' }),
        staffApi.hostel.incidents.list(),
      ]);

      setDashboard(unwrap(dashRes, { blocks: [], active_students: 0, pending_incidents: 0 }));
      setOccupancy(asArray(unwrap<any>(occRes, [])));
      setIncidents(asArray(unwrap<any>(incRes, [])));
    } catch (err: any) {
      const message = extractApiError(err, 'Failed to load hostel data');
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const withSubmit = async (task: () => Promise<void>) => {
    setSubmitting(true);
    try {
      await task();
      await loadData();
    } catch (err: any) {
      toastError(extractApiError(err, 'Request failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hostel Desk</h1>
          <p className="text-sm text-gray-600">Manage your assigned hostel blocks, attendance, and incidents.</p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Assigned Blocks</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboard.blocks?.length || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Active Students</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboard.active_students || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending Incidents</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{dashboard.pending_incidents || 0}</p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 font-semibold">Your Blocks</h2>
        <div className="flex flex-wrap gap-2">
          {(dashboard.blocks || []).map((block: any) => (
            <span key={block.id} className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
              {block.name}
            </span>
          ))}
          {(dashboard.blocks || []).length === 0 && <p className="text-sm text-gray-500">No active block assignment.</p>}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="rounded-xl border bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!attendanceForm.allocation || !attendanceForm.date) return;
            withSubmit(async () => {
              await staffApi.hostel.attendance.upsert({ ...attendanceForm });
              toastSuccess('Attendance saved');
            });
          }}
        >
          <h2 className="mb-3 font-semibold">Mark Attendance</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded border px-3 py-2" value={attendanceForm.allocation} onChange={(e) => setAttendanceForm((p) => ({ ...p, allocation: e.target.value }))}>
              <option value="">Select allocation</option>
              {allocationOptions.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.label}</option>
              ))}
            </select>
            <input type="date" className="rounded border px-3 py-2" value={attendanceForm.date} onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))} />
            <select className="rounded border px-3 py-2" value={attendanceForm.status} onChange={(e) => setAttendanceForm((p) => ({ ...p, status: e.target.value as 'present' | 'out_pass' | 'leave' | 'absent' }))}>
              <option value="present">Present</option>
              <option value="out_pass">Out Pass</option>
              <option value="leave">Leave</option>
              <option value="absent">Absent</option>
            </select>
            <input className="rounded border px-3 py-2" placeholder="Remarks" value={attendanceForm.remarks} onChange={(e) => setAttendanceForm((p) => ({ ...p, remarks: e.target.value }))} />
          </div>
          <button className="mt-3 rounded bg-green-600 px-3 py-2 text-white" disabled={submitting}>Save Attendance</button>
        </form>

        <form
          className="rounded-xl border bg-white p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!incidentForm.allocation || !incidentForm.title.trim() || !incidentForm.description.trim() || !incidentForm.occurred_at) return;
            withSubmit(async () => {
              await staffApi.hostel.incidents.create({ ...incidentForm });
              setIncidentForm({ allocation: '', title: '', description: '', severity: 'low', occurred_at: '' });
              toastSuccess('Incident reported');
            });
          }}
        >
          <h2 className="mb-3 font-semibold">Report Incident</h2>
          <div className="grid grid-cols-2 gap-2">
            <select className="rounded border px-3 py-2" value={incidentForm.allocation} onChange={(e) => setIncidentForm((p) => ({ ...p, allocation: e.target.value }))}>
              <option value="">Select allocation</option>
              {allocationOptions.map((a) => (
                <option key={a.id} value={String(a.id)}>{a.label}</option>
              ))}
            </select>
            <select className="rounded border px-3 py-2" value={incidentForm.severity} onChange={(e) => setIncidentForm((p) => ({ ...p, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
            <input className="rounded border px-3 py-2" placeholder="Title" value={incidentForm.title} onChange={(e) => setIncidentForm((p) => ({ ...p, title: e.target.value }))} />
            <input type="datetime-local" className="rounded border px-3 py-2" value={incidentForm.occurred_at} onChange={(e) => setIncidentForm((p) => ({ ...p, occurred_at: e.target.value }))} />
          </div>
          <textarea className="mt-2 w-full rounded border px-3 py-2" rows={3} placeholder="Description" value={incidentForm.description} onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))} />
          <button className="mt-3 rounded bg-green-600 px-3 py-2 text-white" disabled={submitting}>Create Incident</button>
        </form>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Occupancy</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-600">
                <th className="py-2">Student</th>
                <th className="py-2">Block/Room/Bed</th>
                <th className="py-2">Academic Year</th>
              </tr>
            </thead>
            <tbody>
              {occupancy.slice(0, 20).map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.student_name || row.student_id}</td>
                  <td className="py-2">{row.block_name} / {row.room_number} / {row.bed_number}</td>
                  <td className="py-2">{row.academic_year_name || '-'}</td>
                </tr>
              ))}
              {occupancy.length === 0 && (
                <tr><td className="py-3 text-gray-500" colSpan={3}>No occupancy data found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="mb-3 text-lg font-semibold">Incidents</h2>
        <div className="space-y-2">
          {incidents.slice(0, 20).map((incident) => (
            <div key={incident.id} className="flex flex-col gap-2 rounded border p-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="font-medium">{incident.title} <span className="ml-2 text-xs uppercase text-gray-500">{incident.severity}</span></div>
                <div className="text-sm text-gray-600">{incident.student_name || incident.student_id} • {incident.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs ${incident.resolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {incident.resolved ? 'Resolved' : 'Open'}
                </span>
                {!incident.resolved && (
                  <button
                    className="rounded bg-blue-600 px-3 py-1 text-xs text-white"
                    onClick={() => withSubmit(async () => {
                      await staffApi.hostel.incidents.update({ incident_id: incident.id, resolved: true, resolution_note: 'Resolved by warden' });
                      toastSuccess('Incident marked resolved');
                    })}
                  >
                    Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
          {incidents.length === 0 && <p className="text-sm text-gray-500">No incidents found.</p>}
        </div>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaUsers className="mx-auto text-blue-600" />
            <p className="mt-2 text-sm text-gray-500">Assigned Students</p>
            <p className="text-xl font-semibold">{occupancy.length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaBed className="mx-auto text-green-600" />
            <p className="mt-2 text-sm text-gray-500">Active Allocations</p>
            <p className="text-xl font-semibold">{occupancy.filter((o) => o.is_active).length}</p>
          </div>
          <div className="rounded-xl border bg-white p-4 text-center">
            <FaExclamationTriangle className="mx-auto text-amber-600" />
            <p className="mt-2 text-sm text-gray-500">Open Incidents</p>
            <p className="text-xl font-semibold">{incidents.filter((i) => !i.resolved).length}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StaffHostelPage() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      try {
        const response = await staffApi.profile.get();
        const profile = response?.data?.data || response?.data || {};
        const fallbackRole =
          typeof window !== 'undefined'
            ? localStorage.getItem('staff_role') || localStorage.getItem('role') || ''
            : '';
        const resolved = resolveStaffRole(profile, fallbackRole);
        if (!mounted) return;
        setRole(String(resolved || ''));
      } catch (err: any) {
        const message = extractApiError(err, 'Failed to load staff profile');
        if (!mounted) return;
        setError(message);
      } finally {
        if (mounted) setCheckingRole(false);
      }
    };

    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  if (checkingRole) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-sm text-gray-600">Loading hostel access...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
        {error}
      </div>
    );
  }

  if (role === 'admin_staff' || role === 'hostel_warden') {
    return <AdminHostelPage />;
  }

  return <WardenHostelDesk />;
}
