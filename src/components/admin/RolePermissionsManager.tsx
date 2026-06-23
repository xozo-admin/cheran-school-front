'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from 'lucide-react';
import { SchoolScopeSelector, useSchoolScope } from '@/components/admin/SchoolScopeSelector';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { adminApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';

type RoleManagerKind = 'teacher' | 'staff' | 'student';

type PermissionRecord = {
  id?: number;
  teacher_id?: string;
  name?: string;
  department?: string;
  role?: string;
  role_label?: string;
  school_name?: string;
  enabled_count?: number;
  role_permissions?: Record<string, boolean>;
  permission_groups?: Record<string, string[]>;
  permission_labels?: Record<string, string>;
};

type RolePermissionsManagerProps = {
  kind: RoleManagerKind;
};

const teacherFallbackLabels: Record<string, string> = {
  leave_approvals: 'Leave Approvals',
  assignments: 'Assignments',
  performance: 'Performance',
  exams: 'Exams',
  students: 'Students',
  attendance: 'Class Attendance',
  teacher_attendance: 'Teacher Attendance',
  attendance_logs: 'View Logs',
  todo: 'To-Do List',
  announcements: 'Announcements',
  timetable: 'Timetable',
  reports: 'Reports',
  salary: 'Salary',
  transport: 'Transport',
  meetings: 'Meetings',
};

const staffFallbackLabels: Record<string, string> = {
  home: 'Home',
  actions: 'Actions',
  announcements: 'Notices',
  profile: 'Profile',
  meetings: 'Meetings',
  attendance: 'Attendance',
  tasks: 'Tasks',
  salary: 'Salary',
  inventory: 'Inventory',
  transport_expenses: 'Transport Expenses',
  route_map: 'Route Map',
  notifications: 'Notifications',
};

const studentFallbackLabels: Record<string, string> = {
  transport: 'Transport',
  timetable: 'Timetable',
  assignments: 'Assignments',
  todo: 'To-Do List',
  attendance: 'Attendance',
  fee: 'Fee',
  exam_schedule: 'Exam Schedule',
  performance: 'Performance',
  meetings: 'Meetings',
  updates: 'Updates',
};

const teacherFallbackGroups: Record<string, string[]> = {
  class: ['leave_approvals', 'assignments', 'performance', 'exams', 'students', 'attendance'],
  actions: ['teacher_attendance', 'attendance_logs', 'todo', 'announcements', 'timetable', 'reports', 'salary', 'transport', 'meetings'],
};

const staffFallbackGroups: Record<string, string[]> = {
  bottom: ['home', 'actions', 'announcements', 'profile'],
  common: ['meetings', 'attendance', 'tasks', 'salary', 'inventory', 'notifications'],
  transport: ['transport_expenses', 'route_map'],
};

const studentFallbackGroups: Record<string, string[]> = {
  home: ['transport'],
  tasks: ['timetable', 'assignments', 'todo', 'attendance', 'fee'],
  exams: ['exam_schedule', 'performance'],
  meetings: ['meetings'],
  updates: ['updates'],
};

const fallbackLabelsFor = (kind: RoleManagerKind) => {
  if (kind === 'teacher') return teacherFallbackLabels;
  if (kind === 'student') return studentFallbackLabels;
  return staffFallbackLabels;
};

const fallbackGroupsFor = (kind: RoleManagerKind) => {
  if (kind === 'teacher') return teacherFallbackGroups;
  if (kind === 'student') return studentFallbackGroups;
  return staffFallbackGroups;
};

const groupTitle = (key: string) => {
  const titles: Record<string, string> = {
    class: 'Class Pages',
    actions: 'Action Pages',
    bottom: 'Staff Navigation',
    common: 'Common Pages',
    transport: 'Transport Pages',
    home: 'Home Page',
    tasks: 'Task Pages',
    exams: 'Exam Pages',
    meetings: 'Meetings',
    updates: 'Updates',
  };
  return titles[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

const itemTitle = (item: PermissionRecord, kind: RoleManagerKind) => {
  if (kind === 'teacher') return item.name || item.teacher_id || 'Teacher';
  if (kind === 'student') return item.role_label || 'All Students';
  return item.role_label || item.role || 'Staff Role';
};

const itemSubtitle = (item: PermissionRecord, kind: RoleManagerKind) => {
  if (kind === 'teacher') {
    return [item.teacher_id, item.department].filter(Boolean).join(' • ') || 'Teacher permissions';
  }
  if (kind === 'student') {
    return [item.school_name, 'One setting affects every student login'].filter(Boolean).join(' • ');
  }
  return [item.role, item.school_name].filter(Boolean).join(' • ') || 'Applies to every staff login with this role';
};

const normalizePermissions = (
  source: Record<string, boolean> | undefined,
  labels: Record<string, string>
) => {
  const normalized: Record<string, boolean> = {};
  Object.keys(labels).forEach((key) => {
    normalized[key] = source?.[key] ?? true;
  });
  return normalized;
};

export default function RolePermissionsManager({ kind }: RolePermissionsManagerProps) {
  const { get, combine } = useThemeClasses();
  const schoolScope = useSchoolScope({
    storageKey: `${kind}_role_permissions_school_scope`,
    includeAll: kind === 'teacher',
  });

  const [records, setRecords] = useState<PermissionRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [permissionLabels, setPermissionLabels] = useState<Record<string, string>>(
    fallbackLabelsFor(kind)
  );
  const [permissionGroups, setPermissionGroups] = useState<Record<string, string[]>>(
    fallbackGroupsFor(kind)
  );
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecord = useMemo(
    () =>
      records.find((item) =>
        kind === 'teacher' ? item.teacher_id === selectedId : item.role === selectedId
      ) || null,
    [kind, records, selectedId]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;
    return records.filter((item) =>
      [itemTitle(item, kind), itemSubtitle(item, kind), item.school_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [kind, records, search]);

  const enabledCount = Object.values(permissions).filter(Boolean).length;
  const totalCount = Object.keys(permissionLabels).length;

  const applySelectedRecord = (item: PermissionRecord | null, labels: Record<string, string>) => {
    if (!item) {
      setPermissions(normalizePermissions(undefined, labels));
      return;
    }
    setPermissions(normalizePermissions(item.role_permissions, labels));
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (kind !== 'teacher' && schoolScope.isSuperAdmin && schoolScope.selectedSchoolId === 'all') {
      setRecords([]);
      setSelectedId('');
      setPermissions(normalizePermissions(undefined, fallbackLabelsFor(kind)));
      setError(`Select one school to manage ${kind} role permissions.`);
      setLoading(false);
      return;
    }
    try {
      const response = await (kind === 'teacher'
        ? adminApi.teachers.rolePermissions.list(schoolScope.scopeParams)
        : kind === 'student'
          ? adminApi.students.rolePermissions.list(schoolScope.scopeParams)
          : adminApi.staff.rolePermissions.list(schoolScope.scopeParams));

      const payload = response.data || {};
      const studentRecord: PermissionRecord | null =
        kind === 'student' && payload.data
          ? {
              ...(payload.data || {}),
              role: 'students',
              role_label: 'All Students',
              role_permissions: payload.data.role_permissions,
              permission_groups: payload.permission_groups || payload.data.permission_groups,
              permission_labels: payload.permission_labels || payload.data.permission_labels,
            }
          : null;
      const list: PermissionRecord[] =
        kind === 'student'
          ? studentRecord
            ? [studentRecord]
            : []
          : Array.isArray(payload.data)
            ? payload.data
            : [];
      const labels =
        payload.permission_labels ||
        list[0]?.permission_labels ||
        fallbackLabelsFor(kind);
      const groups =
        payload.permission_groups ||
        list[0]?.permission_groups ||
        fallbackGroupsFor(kind);

      setRecords(list);
      setPermissionLabels(labels);
      setPermissionGroups(groups);

      const nextSelected = list[0] || null;
      const nextId = nextSelected
        ? kind === 'teacher'
          ? nextSelected.teacher_id || ''
          : nextSelected.role || ''
        : '';

      setSelectedId(nextId);
      applySelectedRecord(nextSelected, labels);
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Role permissions could not be loaded';
      setError(message);
      setRecords([]);
      setSelectedId('');
      setPermissions(normalizePermissions(undefined, fallbackLabelsFor(kind)));
    } finally {
      setLoading(false);
    }
  }, [kind, schoolScope.isSuperAdmin, schoolScope.scopeParams, schoolScope.selectedSchoolId]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords, schoolScope.selectedSchoolId]);

  const selectRecord = (item: PermissionRecord) => {
    const id = kind === 'teacher' ? item.teacher_id || '' : item.role || '';
    setSelectedId(id);
    applySelectedRecord(item, permissionLabels);
  };

  const togglePermission = (key: string) => {
    setPermissions((current) => ({ ...current, [key]: !current[key] }));
  };

  const setAll = (value: boolean) => {
    setPermissions(Object.fromEntries(Object.keys(permissionLabels).map((key) => [key, value])));
  };

  const savePermissions = async () => {
    if (!selectedRecord || !selectedId) return;
    setSaving(true);
    try {
      if (kind === 'teacher') {
        await adminApi.teachers.rolePermissions.update({
          teacher_id: selectedId,
          role_permissions: permissions,
          ...schoolScope.scopeParams,
        });
      } else if (kind === 'student') {
        await adminApi.students.rolePermissions.update({
          role_permissions: permissions,
          ...schoolScope.scopeParams,
        });
      } else {
        await adminApi.staff.rolePermissions.update({
          role: selectedId,
          role_permissions: permissions,
          ...schoolScope.scopeParams,
        });
      }
      toastSuccess(`${itemTitle(selectedRecord, kind)} permissions updated`);
      await loadRecords();
    } catch (err: any) {
      toastError(
        err?.response?.data?.error ||
          err?.response?.data?.role_permissions?.[0] ||
          err?.message ||
          'Failed to update role permissions'
      );
    } finally {
      setSaving(false);
    }
  };

  const title =
    kind === 'teacher' ? 'Teacher Roles' : kind === 'student' ? 'Student Roles' : 'Staff Roles';
  const description =
    kind === 'teacher'
      ? 'Enable or disable teacher app pages for each teacher login.'
      : kind === 'student'
        ? 'Enable or disable student app pages for every student login in the selected school.'
        : 'Enable or disable staff app pages for every staff login under each staff role.';

  return (
    <div className={combine('min-h-screen p-4 sm:p-6', get('bg', 'primary'))}>
      <div className="mx-auto flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/40 dark:text-blue-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Role Permissions
            </div>
            <h1 className={`text-2xl font-extrabold sm:text-3xl ${get('text', 'primary')}`}>{title}</h1>
            <p className={`mt-1 max-w-2xl text-sm ${get('text', 'secondary')}`}>{description}</p>
          </div>
          <SchoolScopeSelector {...schoolScope} className="w-full lg:w-auto" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className={combine('rounded-lg border p-4 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className={`text-base font-bold ${get('text', 'primary')}`}>
                  {kind === 'teacher' ? 'Teachers' : kind === 'student' ? 'Students' : 'Staff Roles'}
                </h2>
                <p className={`text-xs ${get('text', 'tertiary')}`}>
                  {loading
                    ? 'Loading...'
                    : `${records.length} ${kind === 'teacher' ? 'teachers' : kind === 'student' ? 'student setting' : 'roles'}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadRecords()}
                disabled={loading}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-wait dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <label className="mb-3 flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-700">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={kind === 'teacher' ? 'Search teacher' : kind === 'student' ? 'Search students' : 'Search staff role'}
                className={`w-full bg-transparent text-sm outline-none ${get('text', 'primary')}`}
              />
            </label>

            {error && (
              <div className="mb-3 flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
              {loading ? (
                <div className="flex min-h-44 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : filteredRecords.length ? (
                filteredRecords.map((item) => {
                  const id = kind === 'teacher' ? item.teacher_id || '' : item.role || '';
                  const active = id === selectedId;
                  const itemEnabled = item.enabled_count ?? Object.values(item.role_permissions || {}).filter(Boolean).length;
                  const itemTotal = Object.keys(item.role_permissions || permissionLabels).length;
                  return (
                    <button
                      key={id || item.id}
                      type="button"
                      onClick={() => selectRecord(item)}
                      className={combine(
                        'w-full rounded-lg border p-3 text-left transition',
                        active
                          ? 'border-blue-500 bg-blue-50 shadow-sm dark:border-blue-400 dark:bg-blue-950/30'
                          : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/70'
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className={`truncate text-sm font-bold ${get('text', 'primary')}`}>{itemTitle(item, kind)}</p>
                          <p className={`mt-0.5 truncate text-xs ${get('text', 'tertiary')}`}>{itemSubtitle(item, kind)}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {itemEnabled}/{itemTotal}
                        </span>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
                  <Users className="mx-auto mb-2 h-7 w-7 text-slate-400" />
                  <p className={`text-sm font-semibold ${get('text', 'secondary')}`}>No records found</p>
                </div>
              )}
            </div>
          </section>

          <section className={combine('rounded-lg border p-4 shadow-sm', get('bg', 'card'), get('border', 'primary'))}>
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={`text-lg font-extrabold ${get('text', 'primary')}`}>
                  {selectedRecord ? itemTitle(selectedRecord, kind) : 'Select a record'}
                </h2>
                <p className={`text-sm ${get('text', 'secondary')}`}>
                  {selectedRecord ? itemSubtitle(selectedRecord, kind) : 'Choose from the list to edit page access.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {enabledCount}/{totalCount} enabled
                </span>
                <button
                  type="button"
                  onClick={() => setAll(true)}
                  disabled={!selectedRecord || saving}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Enable all
                </button>
                <button
                  type="button"
                  onClick={() => setAll(false)}
                  disabled={!selectedRecord || saving}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Disable all
                </button>
                <button
                  type="button"
                  onClick={() => void savePermissions()}
                  disabled={!selectedRecord || saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {Object.entries(permissionGroups).map(([group, keys]) => {
                const visibleKeys = keys.filter((key) => permissionLabels[key]);
                if (!visibleKeys.length) return null;
                return (
                  <div key={group} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-3 flex items-center gap-2">
                      <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                      <h3 className={`text-sm font-extrabold ${get('text', 'primary')}`}>{groupTitle(group)}</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {visibleKeys.map((key) => {
                        const enabled = permissions[key] ?? true;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => togglePermission(key)}
                            disabled={!selectedRecord || saving}
                            className={combine(
                              'flex min-h-16 items-center justify-between gap-3 rounded-lg border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-50',
                              enabled
                                ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/70 dark:bg-emerald-950/20'
                                : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                            )}
                          >
                            <span>
                              <span className={`block text-sm font-bold ${get('text', 'primary')}`}>{permissionLabels[key]}</span>
                              <span className={`text-xs ${get('text', 'tertiary')}`}>{enabled ? 'Enabled' : 'Disabled'}</span>
                            </span>
                            <span
                              className={combine(
                                'relative h-6 w-11 rounded-full transition',
                                enabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                              )}
                            >
                              <span
                                className={combine(
                                  'absolute top-1 h-4 w-4 rounded-full bg-white shadow transition',
                                  enabled ? 'left-6' : 'left-1'
                                )}
                              />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
