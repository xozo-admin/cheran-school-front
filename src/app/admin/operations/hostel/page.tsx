'use client';

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { adminApi, staffApi } from '@/lib/api';
import { toastError, toastSuccess } from '@/lib/toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { resolveStaffRole } from '@/lib/staff-access';
import {
  AlertTriangle,
  Bed,
  Building2,
  Check,
  Edit3,
  FileText,
  ListChecks,
  Plus,
  RefreshCw,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react';

type TabKey = 'overview' | 'structure' | 'allocations' | 'attendance' | 'incidents' | 'fees';
type StructureTabKey = 'blocks' | 'warden' | 'rooms' | 'beds';
type AttendanceSubTabKey = 'attendance' | 'inout';

type Option = { id: number | string; label: string };
type GenderPolicy = 'boys' | 'girls';
type StudentGenderPolicy = GenderPolicy | null;
type NormalizedBlockPolicy = GenderPolicy | 'coed' | null;

type DashboardData = {
  total_blocks: number;
  total_rooms: number;
  total_beds: number;
  occupied_beds: number;
  available_beds: number;
  active_allocations: number;
  pending_incidents: number;
};

type ConfirmState = {
  open: boolean;
  kind: 'block' | 'room' | 'bed' | 'allocation';
  id: number | null;
  title: string;
  message: string;
};

const DEFAULT_DASHBOARD: DashboardData = {
  total_blocks: 0,
  total_rooms: 0,
  total_beds: 0,
  occupied_beds: 0,
  available_beds: 0,
  active_allocations: 0,
  pending_incidents: 0,
};

const unwrap = <T,>(response: any, fallback: T): T => {
  if (response?.data?.data !== undefined) return response.data.data as T;
  if (response?.data !== undefined) return response.data as T;
  return fallback;
};

const asArray = <T,>(value: any): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.results)) return value.results as T[];
  if (Array.isArray(value?.data)) return value.data as T[];
  if (Array.isArray(value?.data?.results)) return value.data.results as T[];
  return [];
};

const extractApiError = (error: any, fallback: string): string => {
  const payload = error?.response?.data;
  if (!payload) return error?.message || fallback;
  if (typeof payload === 'string') return payload;
  if (payload.error) return String(payload.error);
  if (payload.message) return String(payload.message);
  if (payload.detail) return String(payload.detail);

  const fieldMessage = Object.entries(payload)
    .map(([field, value]) => {
      if (Array.isArray(value)) return `${field}: ${value.join(', ')}`;
      if (typeof value === 'string') return `${field}: ${value}`;
      return '';
    })
    .find(Boolean);

  return fieldMessage || fallback;
};

const toOptions = (items: any[], idKey: string, labelKey: string): Option[] =>
  items.map((item) => ({ id: item[idKey], label: item[labelKey] }));

const toNonNegativeInt = (value: string, fallback = 0): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(0, Math.trunc(parsed));
};

const toMinInt = (value: string, min: number): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return min;
  return Math.max(min, Math.trunc(parsed));
};

const toPkNumber = (value: string | number | null | undefined): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const displayCreatedBy = (item: any): string =>
  String(
    item?.created_by_name ||
    item?.recorded_by_name ||
    item?.reported_by_name ||
    item?.marked_by_name ||
    '-'
  );

const normalizeStudentGenderPolicy = (value: unknown): StudentGenderPolicy => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized.includes('female') ||
    normalized.includes('girl') ||
    normalized.includes('woman') ||
    normalized === 'f' ||
    normalized === 'girls' ||
    normalized === 'girl'
  ) {
    return 'girls';
  }
  if (
    normalized.includes('male') ||
    normalized.includes('boy') ||
    normalized.includes('man') ||
    normalized === 'm' ||
    normalized === 'boys' ||
    normalized === 'boy'
  ) {
    return 'boys';
  }
  return null;
};

const normalizeBlockGenderPolicy = (value: unknown): NormalizedBlockPolicy => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;
  if (
    normalized.includes('coed') ||
    normalized.includes('co-ed') ||
    normalized.includes('mixed') ||
    normalized.includes('common')
  ) {
    return 'coed';
  }
  if (
    normalized.includes('female') ||
    normalized.includes('girl') ||
    normalized === 'f'
  ) {
    return 'girls';
  }
  if (
    normalized.includes('male') ||
    normalized.includes('boy') ||
    normalized === 'm'
  ) {
    return 'boys';
  }
  return null;
};

type FormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
};

type HostelFeeClassReport = {
  class: string;
  section: string;
  fee_type: string;
  academic_year: string;
  statistics: {
    total_students: number;
    paid: number;
    unpaid: number;
    overdue: number;
    collection_rate: number;
    total_collected: number | string;
    total_pending: number | string;
    total_assigned?: number | string;
  };
  students: Array<{
    student_id: string;
    student_name: string;
    student_roll?: string;
    parent_mobile?: string;
    student_class?: string;
    student_section?: string;
    total_amount: number | string;
    concession_amount: number | string;
    effective_total?: number | string;
    paid_amount: number | string;
    due_amount: number | string;
    payment_status: string;
    installments_count: number;
    last_payment_date?: string | null;
  }>;
};

type HostelFeeDueReport = {
  academic_year: string;
  fee_type: string;
  summary: {
    total_students_in_school: number;
    due_students_count: number;
    total_pending_amount: number | string;
    coverage_percentage: number;
  };
  dues_by_class: Array<{
    class: string;
    total_due_students: number;
    total_due_amount: number | string;
    students: Array<{
      student_id: string;
      student_name: string;
      roll_number?: string;
      section?: string;
      parent_phone?: string;
      due_amount: number | string;
      paid_amount: number | string;
      total_amount: number | string;
      concession: number | string;
      installments_paid: number;
      last_payment_date?: string | null;
      status: string;
    }>;
  }>;
};

export default function AdminHostelPage() {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();
  const pathname = usePathname();
  const todayDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [staffRoleContext, setStaffRoleContext] = useState('');
  const [staffRoleResolved, setStaffRoleResolved] = useState(false);
  const isStaffHostelRoute = pathname?.startsWith('/staff');
  const normalizedStaffRole = useMemo(
    () => String(staffRoleContext || '').trim().toLowerCase().replace(/\s+/g, '_'),
    [staffRoleContext]
  );
  const isAdminStaffMode = isStaffHostelRoute && normalizedStaffRole === 'admin_staff';
  const isWardenMode = isStaffHostelRoute && normalizedStaffRole === 'hostel_warden';
  const isRestrictedStaffStructureMode = isStaffHostelRoute && !isAdminStaffMode;

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    kind: 'block',
    id: null,
    title: '',
    message: '',
  });

  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [beds, setBeds] = useState<any[]>([]);
  const [wardenAssignments, setWardenAssignments] = useState<any[]>([]);
  const [allocations, setAllocations] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [inOutLogs, setInOutLogs] = useState<any[]>([]);

  const [students, setStudents] = useState<Option[]>([]);
  const [studentsById, setStudentsById] = useState<Record<string, { gender: string; label: string }>>({});
  const [hostelStudentMetaById, setHostelStudentMetaById] = useState<Record<string, { class_name: string; section: string; academic_year: string }>>({});
  const [staff, setStaff] = useState<Option[]>([]);
  const [academicYears, setAcademicYears] = useState<Option[]>([]);
  const [hostelFeeFilters, setHostelFeeFilters] = useState({
    academic_year: '',
    class_name: '',
    section: '',
  });
  const [hostelFeeClassReport, setHostelFeeClassReport] = useState<HostelFeeClassReport | null>(null);
  const [hostelFeeDueReport, setHostelFeeDueReport] = useState<HostelFeeDueReport | null>(null);
  const [hostelFeesLoading, setHostelFeesLoading] = useState(false);

  const [blockName, setBlockName] = useState('');
  const [blockGenderPolicy, setBlockGenderPolicy] = useState<GenderPolicy>('boys');
  const [blockDescription, setBlockDescription] = useState('');
  const [roomForm, setRoomForm] = useState({
    block: '',
    room_number: '',
    floor: 0,
    capacity: 1,
    monthly_fee: '',
    room_type: 'standard',
  });
  const [bedForm, setBedForm] = useState({ room: '', bed_number: '' });
  const [wardenForm, setWardenForm] = useState({ block: '', staff: '' });
  const [allocationForm, setAllocationForm] = useState({
    student: '',
    bed: '',
    academic_year: '',
    check_in_date: '',
  });
  const [attendanceForm, setAttendanceForm] = useState<{
    allocation: string;
    date: string;
    status: 'present' | 'out_pass' | 'leave' | 'absent';
    remarks: string;
  }>({
    allocation: '',
    date: '',
    status: 'present',
    remarks: '',
  });
  const [incidentForm, setIncidentForm] = useState<{
    allocation: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    occurred_at: string;
  }>({
    allocation: '',
    title: '',
    description: '',
    severity: 'low',
    occurred_at: '',
  });
  const [attendanceFilterDate, setAttendanceFilterDate] = useState(todayDate);
  const [attendanceFilterStatus, setAttendanceFilterStatus] = useState<'all' | 'present' | 'out_pass' | 'leave' | 'absent'>('all');
  const [inOutFilterFromDate, setInOutFilterFromDate] = useState(todayDate);
  const [inOutFilterToDate, setInOutFilterToDate] = useState(todayDate);
  const [inOutFilterType, setInOutFilterType] = useState<'all' | 'in' | 'out'>('all');
  const [inOutForm, setInOutForm] = useState<{
    allocation: string;
    movement_type: 'in' | 'out';
    moved_at: string;
    reason: string;
  }>({
    allocation: '',
    movement_type: 'out',
    moved_at: '',
    reason: '',
  });

  const [editingBlock, setEditingBlock] = useState<any | null>(null);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [editingBed, setEditingBed] = useState<any | null>(null);
  const [editingWarden, setEditingWarden] = useState<any | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<any | null>(null);
  const [activeStructureTab, setActiveStructureTab] = useState<StructureTabKey>(isRestrictedStaffStructureMode ? 'rooms' : 'blocks');
  const [activeAttendanceSubTab, setActiveAttendanceSubTab] = useState<AttendanceSubTabKey>('attendance');
  const [activeStructureForm, setActiveStructureForm] = useState<'block' | 'room' | 'bed' | 'warden' | null>(null);
  const [showAttendanceFormModal, setShowAttendanceFormModal] = useState(false);
  const [showInOutFormModal, setShowInOutFormModal] = useState(false);
  const [showIncidentFormModal, setShowIncidentFormModal] = useState(false);
  const [showAllocationCreateModal, setShowAllocationCreateModal] = useState(false);

  useEffect(() => {
    let mounted = true;

    const resolveRoleContext = async () => {
      if (!isStaffHostelRoute) {
        if (!mounted) return;
        setStaffRoleContext('');
        setStaffRoleResolved(true);
        return;
      }

      const fromStorage =
        typeof window !== 'undefined'
          ? localStorage.getItem('staff_role') || localStorage.getItem('role') || ''
          : '';

      try {
        const response = await staffApi.profile.get();
        const payload = response?.data?.data || response?.data || {};
        if (!mounted) return;
        setStaffRoleContext(resolveStaffRole(payload, fromStorage));
      } catch {
        if (!mounted) return;
        setStaffRoleContext(resolveStaffRole(undefined, fromStorage));
      } finally {
        if (mounted) setStaffRoleResolved(true);
      }
    };

    resolveRoleContext();
    return () => {
      mounted = false;
    };
  }, [isStaffHostelRoute]);

  const blockOptions = useMemo(() => toOptions(blocks, 'id', 'name'), [blocks]);
  const roomOptions = useMemo(() => toOptions(rooms, 'id', 'room_number'), [rooms]);
  const roomLookupById = useMemo(() => {
    const map = new Map<number, any>();
    rooms.forEach((room) => map.set(Number(room.id), room));
    return map;
  }, [rooms]);
  const blockLookupById = useMemo(() => {
    const map = new Map<number, any>();
    blocks.forEach((block) => map.set(Number(block.id), block));
    return map;
  }, [blocks]);
  const blockLookupByName = useMemo(() => {
    const map = new Map<string, any>();
    blocks.forEach((block) => {
      const key = String(block?.name || '').trim().toLowerCase();
      if (key) map.set(key, block);
    });
    return map;
  }, [blocks]);

  const getStudentAllowedBlockPolicy = useCallback((studentId: string): StudentGenderPolicy => {
    const student = studentsById[String(studentId)];
    return normalizeStudentGenderPolicy(student?.gender);
  }, [studentsById]);

  const resolveBlockPolicyFromBed = useCallback(
    (bed: any): NormalizedBlockPolicy => {
      const roomPk = toPkNumber(
        bed?.room ?? bed?.room_id ?? bed?.room_pk ?? (typeof bed?.room === 'object' ? bed?.room?.id : null)
      );
      const room = roomPk ? roomLookupById.get(roomPk) : null;
      const blockPk = toPkNumber(
        room?.block ?? room?.block_id ?? room?.block_pk ?? (typeof room?.block === 'object' ? room?.block?.id : null)
      );
      const blockById = blockPk ? blockLookupById.get(blockPk) : null;
      const blockByName = blockLookupByName.get(
        String(bed?.block_name || room?.block_name || '').trim().toLowerCase()
      );

      return (
        normalizeBlockGenderPolicy(blockById?.gender_policy) ||
        normalizeBlockGenderPolicy(blockByName?.gender_policy) ||
        normalizeBlockGenderPolicy(room?.gender_policy) ||
        normalizeBlockGenderPolicy(bed?.block_gender_policy) ||
        null
      );
    },
    [roomLookupById, blockLookupById, blockLookupByName]
  );

  const selectedStudentPolicy = useMemo(
    () => (allocationForm.student ? getStudentAllowedBlockPolicy(allocationForm.student) : null),
    [allocationForm.student, getStudentAllowedBlockPolicy]
  );

  const allocationBedOptions = useMemo(() => {
    return beds.filter((bed) => {
      if (!selectedStudentPolicy) return true;
      const blockPolicy = resolveBlockPolicyFromBed(bed);
      if (!blockPolicy) return false;
      if (blockPolicy === 'coed') return true;
      return blockPolicy === selectedStudentPolicy;
    });
  }, [beds, selectedStudentPolicy, resolveBlockPolicyFromBed]);
  const formatAllocationLabel = useCallback((item: any): string => {
    const studentName = String(item?.student_name || 'Student').trim();
    const studentCode = String(item?.student_id || '').trim();
    const studentPart = studentCode ? `${studentName} (${studentCode})` : studentName;
    const roomPart = `${item?.room_number || 'Room'} / ${item?.bed_number || 'Bed'}`;
    return `${studentPart} - ${roomPart}`;
  }, []);
  const allocationOptions = useMemo(
    () =>
      allocations.map((item) => ({
        id: item.id,
        label: formatAllocationLabel(item),
      })),
    [allocations, formatAllocationLabel]
  );
  const activeAllocationOptions = useMemo(
    () =>
      allocations
        .filter((item) => Boolean(item?.is_active))
        .map((item) => ({
          id: item.id,
          label: formatAllocationLabel(item),
        })),
    [allocations, formatAllocationLabel]
  );
  const hostelFeeClassOptions = useMemo(() => {
    const classes = new Set<string>();
    allocations.forEach((allocation) => {
      const studentPk = toPkNumber(allocation?.student);
      if (!studentPk) return;
      const meta = hostelStudentMetaById[String(studentPk)];
      if (!meta) return;
      if (hostelFeeFilters.academic_year && meta.academic_year !== hostelFeeFilters.academic_year) return;
      if (meta.class_name) classes.add(meta.class_name);
    });
    return Array.from(classes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allocations, hostelStudentMetaById, hostelFeeFilters.academic_year]);
  const hostelFeeSectionOptions = useMemo(() => {
    if (!hostelFeeFilters.class_name) return [];
    const sections = new Set<string>();
    allocations.forEach((allocation) => {
      const studentPk = toPkNumber(allocation?.student);
      if (!studentPk) return;
      const meta = hostelStudentMetaById[String(studentPk)];
      if (!meta) return;
      if (hostelFeeFilters.academic_year && meta.academic_year !== hostelFeeFilters.academic_year) return;
      if (meta.class_name !== hostelFeeFilters.class_name) return;
      if (meta.section) sections.add(meta.section);
    });
    return Array.from(sections).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [allocations, hostelStudentMetaById, hostelFeeFilters.academic_year, hostelFeeFilters.class_name]);
  const activeAllocationStudentIds = useMemo(() => {
    const ids = new Set<number>();
    allocations.forEach((allocation) => {
      if (!allocation?.is_active) return;
      const studentPk = toPkNumber(allocation?.student);
      if (studentPk) ids.add(studentPk);
    });
    return ids;
  }, [allocations]);
  const activeAllocationBedIds = useMemo(() => {
    const ids = new Set<number>();
    allocations.forEach((allocation) => {
      if (!allocation?.is_active) return;
      const bedPk = toPkNumber(allocation?.bed);
      if (bedPk) ids.add(bedPk);
    });
    return ids;
  }, [allocations]);
  const wardenAllowedStudentPolicies = useMemo(() => {
    if (!isWardenMode) return null;
    const policies = new Set<GenderPolicy | 'coed'>();
    blocks.forEach((block) => {
      const policy = normalizeBlockGenderPolicy(
        block?.gender_policy ??
        block?.block_gender_policy ??
        block?.gender ??
        block?.allowed_gender
      );
      if (policy) policies.add(policy);
    });
    return policies;
  }, [blocks, isWardenMode]);
  const availableStudents = useMemo(
    () =>
      students.filter((s) => {
        if (activeAllocationStudentIds.has(Number(s.id))) return false;
        if (!isWardenMode) return true;
        const allowedPolicies = wardenAllowedStudentPolicies;
        if (!allowedPolicies || allowedPolicies.size === 0) return false;
        if (allowedPolicies.has('coed')) return true;
        const studentPolicy = getStudentAllowedBlockPolicy(String(s.id));
        if (!studentPolicy) return false;
        return allowedPolicies.has(studentPolicy);
      }),
    [students, activeAllocationStudentIds, isWardenMode, wardenAllowedStudentPolicies, getStudentAllowedBlockPolicy]
  );
  const availableAllocationBedOptions = useMemo(
    () => allocationBedOptions.filter((b) => !activeAllocationBedIds.has(Number(b.id))),
    [allocationBedOptions, activeAllocationBedIds]
  );
  const filteredAttendanceRecords = useMemo(
    () =>
      attendanceRecords.filter((record) => {
        if (attendanceFilterStatus === 'all') return true;
        return String(record?.status || '').toLowerCase() === attendanceFilterStatus;
      }),
    [attendanceRecords, attendanceFilterStatus]
  );

  const showRoleContextLoading = isStaffHostelRoute && !staffRoleResolved;

  const getCardGradientClass = (color: 'blue' | 'emerald' | 'amber' | 'indigo' = 'blue') => {
    const base = combine(
      'rounded-xl sm:rounded-2xl p-4 sm:p-6 border shadow-lg transition-all duration-300 group hover:shadow-xl',
      get('border', 'primary')
    );
    const map: Record<string, string> = {
      blue: theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-blue-900/10' : 'bg-gradient-to-br from-white to-blue-50',
      emerald: theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-emerald-900/10' : 'bg-gradient-to-br from-white to-emerald-50',
      amber: theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-amber-900/10' : 'bg-gradient-to-br from-white to-amber-50',
      indigo: theme === 'dark' ? 'bg-gradient-to-br from-gray-800 to-indigo-900/10' : 'bg-gradient-to-br from-white to-indigo-50',
    };
    return combine(base, map[color]);
  };

  const panelClass = combine(
    'rounded-xl sm:rounded-2xl border p-4 sm:p-6 shadow-sm',
    get('border', 'primary'),
    get('bg', 'card')
  );

  const inputClass = combine(
    'px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border w-full text-xs sm:text-sm',
    get('bg', 'card'),
    get('border', 'secondary'),
    get('text', 'primary'),
    'focus:ring-2 focus:ring-blue-500 outline-none transition-all'
  );

  const primaryButtonClass = combine(
    'px-4 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-white shadow-lg',
    'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
  );

  const secondaryButtonClass = combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium border transition-all hover:scale-[1.02] active:scale-[0.98]',
    get('border', 'secondary'),
    get('text', 'secondary'),
    'hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)]'
  );
  const fieldLabelClass = combine('text-xs font-medium', get('text', 'secondary'));
  const FormField = ({ label, children, className = 'space-y-1', required = false }: FormFieldProps) => (
    <label className={className}>
      <span className={fieldLabelClass}>
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );

  const dangerButtonClass = combine(
    'px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium border transition-all',
    theme === 'dark'
      ? 'border-red-700 text-red-300 hover:bg-red-900/20'
      : 'border-red-300 text-red-700 hover:bg-red-50'
  );

  const getStatusBadgeClass = (ok: boolean) =>
    ok
      ? theme === 'dark'
        ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-800'
        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
      : theme === 'dark'
        ? 'bg-amber-900/30 text-amber-300 border border-amber-800'
        : 'bg-amber-100 text-amber-700 border border-amber-200';

  const getTabClass = (isActive: boolean) =>
    combine(
      'flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all',
      'whitespace-nowrap min-w-[130px] sm:min-w-0',
      isActive
        ? 'bg-blue-600 text-white shadow-md'
        : combine(get('text', 'secondary'), get('bg', 'secondary'), 'hover:text-[var(--color-text-primary)]')
    );
  const getStructureTabClass = (isActive: boolean) =>
    combine(
      'flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg sm:rounded-xl transition-all',
      'whitespace-nowrap',
      isActive
        ? 'bg-blue-600 text-white'
        : combine(get('text', 'secondary'), get('bg', 'secondary'), 'hover:text-[var(--color-text-primary)]')
    );
  const structureTabs: Array<{ key: StructureTabKey; label: string }> = isRestrictedStaffStructureMode
    ? [
        { key: 'rooms', label: 'Rooms' },
        { key: 'beds', label: 'Beds' },
      ]
    : [
        { key: 'blocks', label: 'Blocks' },
        { key: 'warden', label: 'Warden' },
        { key: 'rooms', label: 'Rooms' },
        { key: 'beds', label: 'Beds' },
      ];

  const tableHeadClass = combine(
    'text-left text-[11px] sm:text-xs uppercase tracking-wide',
    get('bg', 'secondary'),
    get('text', 'tertiary'),
    'border-b',
    get('border', 'primary')
  );
  const tableRowClass = combine(
    'text-xs sm:text-sm border-b transition-colors',
    get('border', 'primary'),
    'hover:bg-[var(--color-bg-hover)]'
  );

  const handleRequest = async (task: () => Promise<void>, successMessage?: string) => {
    setSubmitting(true);
    try {
      await task();
      if (successMessage) toastSuccess(successMessage);
      await loadData();
    } catch (err: any) {
      toastError(extractApiError(err, 'Request failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        dashboardRes,
        blocksRes,
        roomsRes,
        bedsRes,
        wardenAssignmentsRes,
        allocationsRes,
        attendanceRes,
        incidentsRes,
        inOutRes,
        enrollmentsRes,
        staffRes,
        yearsRes,
      ] = await Promise.all([
        adminApi.hostel.dashboard(),
        adminApi.hostel.blocks.list(),
        adminApi.hostel.rooms.list(),
        adminApi.hostel.beds.list(),
        isRestrictedStaffStructureMode ? Promise.resolve({ data: { data: [] } }) : adminApi.hostel.wardenAssignments.list(),
        adminApi.hostel.allocations.list(),
        adminApi.hostel.attendance.list(attendanceFilterDate ? { date: attendanceFilterDate } : undefined),
        adminApi.hostel.incidents.list(),
        adminApi.hostel.inOut.list({
          ...(inOutFilterFromDate ? { date_from: inOutFilterFromDate } : {}),
          ...(inOutFilterToDate ? { date_to: inOutFilterToDate } : {}),
          ...(inOutFilterType !== 'all' ? { movement_type: inOutFilterType } : {}),
        }),
        adminApi.students.enrollments({ page: 1, page_size: 1000 }),
        isRestrictedStaffStructureMode
          ? Promise.resolve({ data: { data: [] } })
          : adminApi.staff.listPaginated({ page: 1, page_size: 300, role: 'hostel_warden' }),
        adminApi.school.academicYears(),
      ]);

      setDashboard({ ...DEFAULT_DASHBOARD, ...unwrap<DashboardData>(dashboardRes, DEFAULT_DASHBOARD) });
      setBlocks(asArray(unwrap<any>(blocksRes, [])));
      setRooms(asArray(unwrap<any>(roomsRes, [])));
      setBeds(asArray(unwrap<any>(bedsRes, [])));
      setWardenAssignments(asArray(unwrap<any>(wardenAssignmentsRes, [])));
      setAllocations(asArray(unwrap<any>(allocationsRes, [])));
      setAttendanceRecords(asArray(unwrap<any>(attendanceRes, [])));
      setIncidents(asArray(unwrap<any>(incidentsRes, [])));
      setInOutLogs(asArray(unwrap<any>(inOutRes, [])));

      const enrollmentRows = asArray<any>(unwrap<any>(enrollmentsRes, []));
      const staffRows = asArray<any>(unwrap<any>(staffRes, []));
      const yearRows = asArray<any>(unwrap<any>(yearsRes, []));

      const studentOptionsByPk = new Map<string, Option>();
      const studentMap: Record<string, { gender: string; label: string }> = {};
      const hostelStudentMeta: Record<string, { class_name: string; section: string; academic_year: string }> = {};
      enrollmentRows.forEach((row) => {
        const rawStudent = row?.student;
        const studentPk =
          rawStudent && typeof rawStudent === 'object'
            ? rawStudent?.id ?? rawStudent?.pk ?? null
            : rawStudent;
        if (!studentPk) return;
        const accommodation = String(row?.student_accommodation || '').toLowerCase();
        if (accommodation !== 'hosteller') return;
        const key = String(studentPk);
        const studentName = row.student_name || row?.student?.student_name || row?.student?.name || 'Student';
        const studentCode = row.student_code || row?.student?.student_id || studentPk;
        if (!studentOptionsByPk.has(key)) {
          studentOptionsByPk.set(key, {
            id: studentPk,
            label: `${studentName} (${studentCode})`,
          });
        }
        studentMap[key] = {
          gender:
            row?.student_gender ||
            row?.gender ||
            row?.student?.gender ||
            row?.student?.sex ||
            row?.student?.student_gender ||
            '',
          label: `${studentName} (${studentCode})`,
        };
        hostelStudentMeta[key] = {
          class_name:
            row?.class_name ||
            row?.standard_name ||
            row?.standard?.name ||
            row?.student?.standard?.name ||
            '',
          section:
            row?.section_name ||
            row?.section?.name ||
            row?.student?.section?.name ||
            '',
          academic_year:
            row?.academic_year_name ||
            row?.academic_year?.name ||
            '',
        };
      });
      setStudents(Array.from(studentOptionsByPk.values()));
      setStudentsById(studentMap);
      setHostelStudentMetaById(hostelStudentMeta);
      setStaff(
        staffRows
          .filter((s) => String(s.role || s.staff_role || '').toLowerCase() === 'hostel_warden')
          .map((s) => ({
          id: s.id,
          label: `${s.name || s.full_name || s.staff_id} (${s.staff_id || s.id})`,
          }))
      );
      setAcademicYears(yearRows.map((y) => ({ id: y.id, label: y.name || `${y.start_year}-${y.end_year}` })));
      const currentYear = yearRows.find((y) => Boolean(y?.is_current)) || yearRows[0];
      setHostelFeeFilters((prev) => ({
        ...prev,
        academic_year: prev.academic_year || currentYear?.name || '',
      }));
    } catch (err: any) {
      const msg = extractApiError(err, 'Failed to load hostel data');
      setError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  }, [attendanceFilterDate, inOutFilterFromDate, inOutFilterToDate, inOutFilterType, isRestrictedStaffStructureMode]);

  useEffect(() => {
    if (!isRestrictedStaffStructureMode) return;
    if (activeStructureTab === 'blocks' || activeStructureTab === 'warden') {
      setActiveStructureTab('rooms');
    }
    if (activeStructureForm === 'block' || activeStructureForm === 'warden') {
      setActiveStructureForm(null);
    }
  }, [activeStructureForm, activeStructureTab, isRestrictedStaffStructureMode]);

  useEffect(() => {
    if (showRoleContextLoading) return;
    loadData();
  }, [showRoleContextLoading, loadData]);

  useEffect(() => {
    if (hostelFeeFilters.class_name && !hostelFeeClassOptions.includes(hostelFeeFilters.class_name)) {
      setHostelFeeFilters((prev) => ({ ...prev, class_name: '', section: '' }));
      return;
    }
    if (hostelFeeFilters.section && !hostelFeeSectionOptions.includes(hostelFeeFilters.section)) {
      setHostelFeeFilters((prev) => ({ ...prev, section: '' }));
    }
  }, [hostelFeeFilters.class_name, hostelFeeFilters.section, hostelFeeClassOptions, hostelFeeSectionOptions]);

  const statCards = [
    { label: 'Blocks', value: dashboard.total_blocks, icon: Building2, color: 'blue' as const },
    { label: 'Rooms', value: dashboard.total_rooms, icon: Building2, color: 'indigo' as const },
    { label: 'Beds', value: dashboard.total_beds, icon: Bed, color: 'emerald' as const },
    { label: 'Occupied', value: dashboard.occupied_beds, icon: UserRound, color: 'amber' as const },
    { label: 'Available', value: dashboard.available_beds, icon: Bed, color: 'emerald' as const },
    { label: 'Allocations', value: dashboard.active_allocations, icon: UserCheck, color: 'blue' as const },
    { label: 'Pending Incidents', value: dashboard.pending_incidents, icon: AlertTriangle, color: 'amber' as const },
  ];
  const tabSummaryCards = useMemo(() => {
    if (activeTab === 'structure') {
      return [
        { label: 'Total Blocks', value: blocks.length, icon: Building2, color: 'blue' as const },
        { label: 'Total Rooms', value: rooms.length, icon: Building2, color: 'indigo' as const },
        { label: 'Total Beds', value: beds.length, icon: Bed, color: 'emerald' as const },
        {
          label: 'Active Wardens',
          value: wardenAssignments.filter((w) => Boolean(w?.is_active)).length,
          icon: UserCheck,
          color: 'amber' as const,
        },
      ];
    }
    if (activeTab === 'allocations') {
      return [
        { label: 'Total Allocations', value: allocations.length, icon: UserCheck, color: 'blue' as const },
        { label: 'Active', value: allocations.filter((a) => Boolean(a?.is_active)).length, icon: Check, color: 'emerald' as const },
        { label: 'Inactive', value: allocations.filter((a) => !a?.is_active).length, icon: X, color: 'amber' as const },
        { label: 'Available Beds', value: dashboard.available_beds, icon: Bed, color: 'indigo' as const },
      ];
    }
    if (activeTab === 'attendance') {
      return [
        { label: 'Records', value: filteredAttendanceRecords.length, icon: UserRound, color: 'blue' as const },
        {
          label: 'Present',
          value: filteredAttendanceRecords.filter((r) => String(r?.status || '').toLowerCase() === 'present').length,
          icon: Check,
          color: 'emerald' as const,
        },
        {
          label: 'Out/Leave',
          value: filteredAttendanceRecords.filter((r) => ['out_pass', 'leave'].includes(String(r?.status || '').toLowerCase())).length,
          icon: UserRound,
          color: 'indigo' as const,
        },
        {
          label: 'Absent',
          value: filteredAttendanceRecords.filter((r) => String(r?.status || '').toLowerCase() === 'absent').length,
          icon: AlertTriangle,
          color: 'amber' as const,
        },
      ];
    }
    if (activeTab === 'incidents') {
      return [
        { label: 'Total Incidents', value: incidents.length, icon: AlertTriangle, color: 'blue' as const },
        { label: 'Open', value: incidents.filter((i) => !i?.resolved).length, icon: AlertTriangle, color: 'amber' as const },
        { label: 'Resolved', value: incidents.filter((i) => Boolean(i?.resolved)).length, icon: Check, color: 'emerald' as const },
        {
          label: 'High/Critical Open',
          value: incidents.filter((i) => !i?.resolved && ['high', 'critical'].includes(String(i?.severity || '').toLowerCase())).length,
          icon: AlertTriangle,
          color: 'indigo' as const,
        },
      ];
    }
    if (activeTab === 'fees') {
      return [
        {
          label: 'Reported Students',
          value: hostelFeeClassReport?.statistics?.total_students || 0,
          icon: UserRound,
          color: 'blue' as const,
        },
        {
          label: 'Paid',
          value: hostelFeeClassReport?.statistics?.paid || 0,
          icon: Check,
          color: 'emerald' as const,
        },
        {
          label: 'Due Students',
          value: hostelFeeDueReport?.summary?.due_students_count || 0,
          icon: AlertTriangle,
          color: 'amber' as const,
        },
        {
          label: 'Pending Amount',
          value: hostelFeeDueReport?.summary?.total_pending_amount || 0,
          icon: FileText,
          color: 'indigo' as const,
        },
      ];
    }
    return [];
  }, [activeTab, blocks.length, rooms.length, beds.length, wardenAssignments, allocations, dashboard.available_beds, filteredAttendanceRecords, incidents, hostelFeeClassReport, hostelFeeDueReport]);

  const openDeleteConfirm = (kind: ConfirmState['kind'], id: number, title: string, message: string) => {
    setConfirmState({ open: true, kind, id, title, message });
  };

  const confirmDelete = async () => {
    if (!confirmState.id) return;
    const id = confirmState.id;

    await handleRequest(async () => {
      if (confirmState.kind === 'block') await adminApi.hostel.blocks.delete(id);
      if (confirmState.kind === 'room') await adminApi.hostel.rooms.delete(id);
      if (confirmState.kind === 'bed') await adminApi.hostel.beds.delete(id);
      if (confirmState.kind === 'allocation') await adminApi.hostel.allocations.delete(id);
    }, 'Deleted successfully');

    setConfirmState({ open: false, kind: 'block', id: null, title: '', message: '' });
  };

  const loadHostelClassFeeReport = async () => {
    if (!hostelFeeFilters.academic_year) {
      toastError('Please select an academic year for the hostel fee report.');
      return;
    }

    setHostelFeesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academic_year', hostelFeeFilters.academic_year);
      params.append('fee_type', 'Hostel');
      if (hostelFeeFilters.class_name) params.append('class', hostelFeeFilters.class_name);
      if (hostelFeeFilters.section) params.append('section', hostelFeeFilters.section);

      const response = await adminApi.fees.feeGetReport(params);
      setHostelFeeClassReport(unwrap<HostelFeeClassReport | null>(response, null));
      toastSuccess('Hostel class fee report loaded.');
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to load hostel class fee report.'));
    } finally {
      setHostelFeesLoading(false);
    }
  };

  const loadHostelDueReport = async () => {
    if (!hostelFeeFilters.academic_year) {
      toastError('Please select an academic year for the hostel due report.');
      return;
    }

    setHostelFeesLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('academic_year', hostelFeeFilters.academic_year);
      params.append('fee_type', 'Hostel');

      const response = await adminApi.fees.feeGetReportDue(params);
      setHostelFeeDueReport(unwrap<HostelFeeDueReport | null>(response, null));
      toastSuccess('Hostel due report loaded.');
    } catch (err: any) {
      toastError(extractApiError(err, 'Failed to load hostel due report.'));
    } finally {
      setHostelFeesLoading(false);
    }
  };

  return (
    <div className={combine(get('bg', 'primary'), 'min-h-screen transition-colors duration-200')}>
      <div className="dashboard-typography p-3 md:p-4 xl:p-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-4 sm:space-y-6">
        <div className={combine(panelClass, 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between')}>
          <div className="flex items-center gap-3">
            <div className={combine(
              'p-2 sm:p-3 rounded-xl sm:rounded-2xl shadow-lg',
              theme === 'dark'
                ? 'bg-gradient-to-br from-blue-600 to-blue-700'
                : 'bg-gradient-to-br from-blue-500 to-blue-600'
            )}>
              <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
            <h1 className={combine('text-xl sm:text-2xl md:text-3xl font-bold', get('text', 'primary'))}>Hostel Management</h1>
            <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
              Manage structure, allocations, attendance, in/out and incidents in one place.
            </p>
            </div>
          </div>
          <button onClick={loadData} className={primaryButtonClass} disabled={loading}>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </span>
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700 text-xs sm:text-sm">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <div className={combine(panelClass, 'flex min-w-max sm:min-w-0 gap-2 p-2')}>
            {[
              { key: 'overview', label: 'Overview', icon: Building2 },
              { key: 'structure', label: 'Structure', icon: ListChecks },
              { key: 'allocations', label: 'Allocations', icon: UserCheck },
              { key: 'attendance', label: 'Attendance', icon: UserRound },
              { key: 'incidents', label: 'Incidents', icon: AlertTriangle },
              { key: 'fees', label: 'Fees Reports', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  className={getTabClass(activeTab === tab.key)}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTab !== 'overview' && tabSummaryCards.length > 0 && (
          <div className="space-y-2">
            <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
              Quick summary for {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {tabSummaryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={getCardGradientClass(card.color)}>
                    <div className={combine('flex items-center justify-between text-xs sm:text-sm', get('text', 'secondary'))}>
                      <span>{card.label}</span>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={combine('mt-2 text-xl sm:text-2xl font-bold', get('text', 'primary'))}>{card.value}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 sm:gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={getCardGradientClass(card.color)}>
                    <div className={combine('flex items-center justify-between text-xs sm:text-sm', get('text', 'secondary'))}>
                      <span>{card.label}</span>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className={combine('mt-2 text-xl sm:text-2xl font-bold', get('text', 'primary'))}>{card.value}</div>
                    <p className={combine('mt-1 text-[11px] sm:text-xs', get('text', 'tertiary'))}>
                      {card.label === 'Blocks' && 'Hostel blocks configured'}
                      {card.label === 'Rooms' && 'Rooms across all blocks'}
                      {card.label === 'Beds' && 'Total bed inventory'}
                      {card.label === 'Occupied' && 'Currently allotted beds'}
                      {card.label === 'Available' && 'Free beds for allocation'}
                      {card.label === 'Allocations' && 'Active student allocations'}
                      {card.label === 'Pending Incidents' && 'Open issues needing action'}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className={combine(panelClass, 'p-0')}>
                <div className={combine('p-4 sm:p-5 border-b', get('border', 'primary'), get('bg', 'secondary'))}>
                <h3 className={combine('text-base sm:text-lg font-semibold mb-3', get('text', 'primary'))}>Recent Allocations</h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Latest hostel room allotments.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className={tableHeadClass}>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Room</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocations.slice(0, 10).map((a) => (
                        <tr key={a.id} className={tableRowClass}>
                          <td className="px-4 py-3">{a.student_name || a.student_id}</td>
                          <td className="px-4 py-3">{a.block_name} / {a.room_number} / {a.bed_number}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(Boolean(a.is_active))}`}>
                              {a.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-4 py-3">{displayCreatedBy(a)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={combine(panelClass, 'p-0')}>
                <div className={combine('p-4 sm:p-5 border-b', get('border', 'primary'), get('bg', 'secondary'))}>
                <h3 className={combine('text-base sm:text-lg font-semibold mb-2', get('text', 'primary'))}>Recent Incidents</h3>
                <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>Most recent hostel incidents and status.</p>
                </div>
                <div className="space-y-2 p-4 sm:p-5">
                  {incidents.slice(0, 10).map((incident) => (
                    <div key={incident.id} className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                      <div className="flex items-center justify-between">
                        <p className={combine('font-medium text-sm sm:text-base', get('text', 'primary'))}>{incident.title}</p>
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(Boolean(incident.resolved))}`}>
                          {incident.resolved ? 'Resolved' : 'Open'}
                        </span>
                      </div>
                      <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>{incident.description}</p>
                      <p className={combine('text-[11px] sm:text-xs mt-1', get('text', 'tertiary'))}>
                        Created by: {displayCreatedBy(incident)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'structure' && (
          <div className="space-y-4">
            <div className={combine(panelClass, 'p-3 sm:p-4')}>
              <div className="flex flex-wrap gap-2">
                {structureTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={getStructureTabClass(activeStructureTab === tab.key)}
                    onClick={() => setActiveStructureTab(tab.key as StructureTabKey)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {!isRestrictedStaffStructureMode && activeStructureTab === 'blocks' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Blocks</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setActiveStructureForm('block')}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create Block</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="p-3">Name</th>
                        <th className="p-3">Gender</th>
                        <th className="p-3">Rooms</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blocks.map((block) => (
                        <tr key={block.id} className={tableRowClass}>
                          <td className="p-3">{block.name}</td>
                          <td className="p-3 uppercase">{block.gender_policy || '-'}</td>
                          <td className="p-3">{block.room_count ?? '-'}</td>
                          <td className="p-3">{displayCreatedBy(block)}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className={secondaryButtonClass}
                                type="button"
                                onClick={() =>
                                  setEditingBlock({
                                    id: block.id,
                                    name: block.name || '',
                                    gender_policy: block.gender_policy || 'boys',
                                    description: block.description || '',
                                    is_active: Boolean(block.is_active),
                                  })
                                }
                              >
                                <Edit3 className="w-4 h-4 inline" />
                              </button>
                              <button
                                className={dangerButtonClass}
                                type="button"
                                onClick={() => openDeleteConfirm('block', block.id, 'Delete Block', `Delete block "${block.name}"?`)}
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {!isRestrictedStaffStructureMode && activeStructureTab === 'warden' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Warden Assignments</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setActiveStructureForm('warden')}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Assign Warden</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="p-3">Block</th>
                        <th className="p-3">Warden</th>
                        <th className="p-3">Staff ID</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wardenAssignments.map((w) => (
                        <tr key={w.id} className={tableRowClass}>
                          <td className="p-3">{w.block_name || '-'}</td>
                          <td className="p-3">{w.staff_name || '-'}</td>
                          <td className="p-3">{w.staff_id || '-'}</td>
                          <td className="p-3">{w.is_active ? 'Active' : 'Inactive'}</td>
                          <td className="p-3">{displayCreatedBy(w)}</td>
                          <td className="p-3 text-right">
                            <button
                              className={secondaryButtonClass}
                              type="button"
                              onClick={() =>
                                setEditingWarden({
                                  id: w.id,
                                  block: String(w.block || ''),
                                  staff: String(w.staff || ''),
                                  is_primary: Boolean(w.is_primary),
                                  is_active: Boolean(w.is_active),
                                })
                              }
                            >
                              <Edit3 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeStructureTab === 'rooms' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Rooms</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setActiveStructureForm('room')}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create Room</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px]">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="p-3">Block</th>
                        <th className="p-3">Room</th>
                        <th className="p-3">Floor</th>
                        <th className="p-3">Capacity</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rooms.map((room) => (
                        <tr key={room.id} className={tableRowClass}>
                          <td className="p-3">{room.block_name}</td>
                          <td className="p-3">{room.room_number}</td>
                          <td className="p-3">{room.floor}</td>
                          <td className="p-3">{room.capacity}</td>
                          <td className="p-3">{displayCreatedBy(room)}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className={secondaryButtonClass}
                                type="button"
                                onClick={() =>
                                  setEditingRoom({
                                    id: room.id,
                                    block: String(room.block || ''),
                                    room_number: room.room_number || '',
                                    floor: Number(room.floor ?? 0),
                                    capacity: Number(room.capacity ?? 1),
                                    monthly_fee: room.monthly_fee ?? '',
                                    room_type: room.room_type || 'standard',
                                    is_active: Boolean(room.is_active),
                                  })
                                }
                              >
                                <Edit3 className="w-4 h-4 inline" />
                              </button>
                              <button
                                className={dangerButtonClass}
                                type="button"
                                onClick={() => openDeleteConfirm('room', room.id, 'Delete Room', `Delete room "${room.room_number}"?`)}
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeStructureTab === 'beds' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Beds</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setActiveStructureForm('bed')}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Create Bed</span>
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="p-3">Block</th>
                        <th className="p-3">Room</th>
                        <th className="p-3">Bed</th>
                        <th className="p-3">Occupied</th>
                        <th className="p-3">Created By</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {beds.map((bed) => (
                        <tr key={bed.id} className={tableRowClass}>
                          <td className="p-3">{bed.block_name}</td>
                          <td className="p-3">{bed.room_number}</td>
                          <td className="p-3">{bed.bed_number}</td>
                          <td className="p-3">{bed.is_occupied ? 'Yes' : 'No'}</td>
                          <td className="p-3">{displayCreatedBy(bed)}</td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className={secondaryButtonClass}
                                type="button"
                                onClick={() =>
                                  setEditingBed({
                                    id: bed.id,
                                    room: String(bed.room || ''),
                                    bed_number: bed.bed_number || '',
                                    is_active: Boolean(bed.is_active),
                                  })
                                }
                              >
                                <Edit3 className="w-4 h-4 inline" />
                              </button>
                              <button
                                className={dangerButtonClass}
                                type="button"
                                onClick={() => openDeleteConfirm('bed', bed.id, 'Delete Bed', `Delete bed "${bed.bed_number}"?`)}
                              >
                                <Trash2 className="w-4 h-4 inline" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeStructureForm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-4xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>
                  {activeStructureForm === 'block'
                        ? 'Create Block'
                        : activeStructureForm === 'room'
                          ? 'Create Room'
                          : activeStructureForm === 'bed'
                            ? 'Create Bed'
                            : 'Assign Warden'}
                    </h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setActiveStructureForm(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {!isWardenMode && activeStructureForm === 'block' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!blockName.trim()) return;
                        handleRequest(async () => {
                          await adminApi.hostel.blocks.create({
                            name: blockName.trim(),
                            gender_policy: blockGenderPolicy,
                            description: blockDescription.trim(),
                          });
                          setBlockName('');
                          setBlockGenderPolicy('boys');
                          setBlockDescription('');
                          setActiveStructureForm(null);
                        }, 'Block created');
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-3">
                        <FormField label="Block Name" required>
                          <input className={inputClass} placeholder="Block name" value={blockName} onChange={(e) => setBlockName(e.target.value)} />
                        </FormField>
                        <FormField label="Gender Policy" required>
                          <select className={inputClass} value={blockGenderPolicy} onChange={(e) => setBlockGenderPolicy(e.target.value as GenderPolicy)}>
                            <option value="boys">Boys Block</option>
                            <option value="girls">Girls Block</option>
                          </select>
                        </FormField>
                        <FormField label="Description">
                          <input className={inputClass} placeholder="Description (optional)" value={blockDescription} onChange={(e) => setBlockDescription(e.target.value)} />
                        </FormField>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className={primaryButtonClass} disabled={submitting} type="submit">Create Block</button>
                        <button className={secondaryButtonClass} type="button" onClick={() => setActiveStructureForm(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {activeStructureForm === 'room' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!roomForm.block || !roomForm.room_number.trim()) return;
                        const blockPk = toPkNumber(roomForm.block);
                        if (!blockPk) return toastError('Please select a valid block.');
                        if (Number(roomForm.floor) < 0) return toastError('Floor cannot be negative.');
                        if (Number(roomForm.capacity) < 1) return toastError('Capacity must be at least 1.');
                        handleRequest(async () => {
                          await adminApi.hostel.rooms.create({
                            block: blockPk,
                            room_number: roomForm.room_number.trim(),
                            floor: Number(roomForm.floor || 0),
                            capacity: Number(roomForm.capacity || 1),
                            monthly_fee: roomForm.monthly_fee || 0,
                            room_type: roomForm.room_type as 'standard' | 'ac' | 'deluxe',
                          });
                          setRoomForm({ block: '', room_number: '', floor: 0, capacity: 1, monthly_fee: '', room_type: 'standard' });
                          setActiveStructureForm(null);
                        }, 'Room created');
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <FormField label="Block" required>
                          <select className={inputClass} value={roomForm.block} onChange={(e) => setRoomForm((p) => ({ ...p, block: e.target.value }))}>
                            <option value="">Select block</option>
                            {blockOptions.map((b) => <option key={b.id} value={String(b.id)}>{b.label}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Room Number" required>
                          <input className={inputClass} placeholder="Room number" value={roomForm.room_number} onChange={(e) => setRoomForm((p) => ({ ...p, room_number: e.target.value }))} />
                        </FormField>
                        <FormField label="Floor">
                          <input className={inputClass} type="number" min={0} step={1} value={roomForm.floor} onChange={(e) => setRoomForm((p) => ({ ...p, floor: toNonNegativeInt(e.target.value, 0) }))} />
                        </FormField>
                        <FormField label="Capacity" required>
                          <input className={inputClass} type="number" min={1} step={1} value={roomForm.capacity} onChange={(e) => setRoomForm((p) => ({ ...p, capacity: toMinInt(e.target.value, 1) }))} />
                        </FormField>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className={primaryButtonClass} disabled={submitting} type="submit">Create Room</button>
                        <button className={secondaryButtonClass} type="button" onClick={() => setActiveStructureForm(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {activeStructureForm === 'bed' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!bedForm.room || !bedForm.bed_number.trim()) return;
                        const roomPk = toPkNumber(bedForm.room);
                        if (!roomPk) return toastError('Please select a valid room.');
                        handleRequest(async () => {
                          await adminApi.hostel.beds.create({ room: roomPk, bed_number: bedForm.bed_number.trim() });
                          setBedForm({ room: '', bed_number: '' });
                          setActiveStructureForm(null);
                        }, 'Bed created');
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField label="Room" required>
                          <select className={inputClass} value={bedForm.room} onChange={(e) => setBedForm((p) => ({ ...p, room: e.target.value }))}>
                            <option value="">Select room</option>
                            {roomOptions.map((r) => <option key={r.id} value={String(r.id)}>{r.label}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Bed Number" required>
                          <input className={inputClass} placeholder="Bed number" value={bedForm.bed_number} onChange={(e) => setBedForm((p) => ({ ...p, bed_number: e.target.value }))} />
                        </FormField>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button className={primaryButtonClass} disabled={submitting} type="submit">Create Bed</button>
                        <button className={secondaryButtonClass} type="button" onClick={() => setActiveStructureForm(null)}>Cancel</button>
                      </div>
                    </form>
                  )}

                  {!isWardenMode && activeStructureForm === 'warden' && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!wardenForm.block || !wardenForm.staff) return;
                        const blockPk = toPkNumber(wardenForm.block);
                        const staffPk = toPkNumber(wardenForm.staff);
                        if (!blockPk || !staffPk) return toastError('Please select valid block and staff.');
                        handleRequest(async () => {
                          await adminApi.hostel.wardenAssignments.create({ block: blockPk, staff: staffPk });
                          setWardenForm({ block: '', staff: '' });
                          setActiveStructureForm(null);
                        }, 'Warden assigned');
                      }}
                    >
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField label="Block" required>
                          <select className={inputClass} value={wardenForm.block} onChange={(e) => setWardenForm((p) => ({ ...p, block: e.target.value }))}>
                            <option value="">Select block</option>
                            {blockOptions.map((b) => <option key={b.id} value={String(b.id)}>{b.label}</option>)}
                          </select>
                        </FormField>
                        <FormField label="Warden" required>
                          <select className={inputClass} value={wardenForm.staff} onChange={(e) => setWardenForm((p) => ({ ...p, staff: e.target.value }))}>
                            <option value="">Select staff</option>
                            {staff.map((s) => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
                          </select>
                        </FormField>
                      </div>
                      {staff.length === 0 && (
                        <p className={combine('text-xs mt-2', get('text', 'secondary'))}>
                          No hostel wardens found. Add staff with role <span className="font-medium">hostel_warden</span>.
                        </p>
                      )}
                      <div className="mt-4 flex gap-2">
                        <button className={primaryButtonClass} disabled={submitting} type="submit">Assign Warden</button>
                        <button className={secondaryButtonClass} type="button" onClick={() => setActiveStructureForm(null)}>Cancel</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {editingBlock && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Edit Block</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingBlock(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!editingBlock.name?.trim()) return;
                      handleRequest(async () => {
                        await adminApi.hostel.blocks.update(editingBlock.id, {
                          name: editingBlock.name.trim(),
                          description: String(editingBlock.description || '').trim(),
                          gender_policy: editingBlock.gender_policy,
                          is_active: Boolean(editingBlock.is_active),
                        });
                        setEditingBlock(null);
                      }, 'Block updated');
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Block Name" required>
                        <input
                          className={inputClass}
                          placeholder="Block name"
                          value={editingBlock.name || ''}
                          onChange={(e) => setEditingBlock((p: any) => ({ ...p, name: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Gender Policy" required>
                        <select
                          className={inputClass}
                          value={editingBlock.gender_policy || 'boys'}
                          onChange={(e) => setEditingBlock((p: any) => ({ ...p, gender_policy: e.target.value }))}
                        >
                          <option value="boys">Boys Block</option>
                          <option value="girls">Girls Block</option>
                          <option value="coed">Co-Ed Block</option>
                        </select>
                      </FormField>
                      <FormField label="Description">
                        <input
                          className={inputClass}
                          placeholder="Description (optional)"
                          value={editingBlock.description || ''}
                          onChange={(e) => setEditingBlock((p: any) => ({ ...p, description: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Status" required>
                        <select
                          className={inputClass}
                          value={editingBlock.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditingBlock((p: any) => ({ ...p, is_active: e.target.value === 'true' }))}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save Block</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setEditingBlock(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingWarden && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Edit Warden Assignment</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingWarden(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const blockPk = toPkNumber(editingWarden.block);
                      const staffPk = toPkNumber(editingWarden.staff);
                      if (!blockPk || !staffPk) return toastError('Please select valid block and staff.');
                      handleRequest(async () => {
                        await adminApi.hostel.wardenAssignments.update({
                          assignment_id: editingWarden.id,
                          block: blockPk,
                          staff: staffPk,
                          is_primary: Boolean(editingWarden.is_primary),
                          is_active: Boolean(editingWarden.is_active),
                        });
                        setEditingWarden(null);
                      }, 'Warden assignment updated');
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Block" required>
                        <select
                          className={inputClass}
                          value={editingWarden.block || ''}
                          onChange={(e) => setEditingWarden((p: any) => ({ ...p, block: e.target.value }))}
                        >
                          <option value="">Select block</option>
                          {blockOptions.map((b) => <option key={b.id} value={String(b.id)}>{b.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Warden" required>
                        <select
                          className={inputClass}
                          value={editingWarden.staff || ''}
                          onChange={(e) => setEditingWarden((p: any) => ({ ...p, staff: e.target.value }))}
                        >
                          <option value="">Select staff</option>
                          {staff.map((s) => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Assignment Type" required>
                        <select
                          className={inputClass}
                          value={editingWarden.is_primary ? 'true' : 'false'}
                          onChange={(e) => setEditingWarden((p: any) => ({ ...p, is_primary: e.target.value === 'true' }))}
                        >
                          <option value="false">Secondary</option>
                          <option value="true">Primary</option>
                        </select>
                      </FormField>
                      <FormField label="Status" required>
                        <select
                          className={inputClass}
                          value={editingWarden.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditingWarden((p: any) => ({ ...p, is_active: e.target.value === 'true' }))}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save Assignment</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setEditingWarden(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingRoom && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-3xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Edit Room</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingRoom(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const blockPk = toPkNumber(editingRoom.block);
                      if (!blockPk || !String(editingRoom.room_number || '').trim()) return toastError('Please fill required fields.');
                      handleRequest(async () => {
                        await adminApi.hostel.rooms.update(editingRoom.id, {
                          block: blockPk,
                          room_number: String(editingRoom.room_number || '').trim(),
                          floor: toNonNegativeInt(String(editingRoom.floor ?? 0), 0),
                          capacity: toMinInt(String(editingRoom.capacity ?? 1), 1),
                          monthly_fee: editingRoom.monthly_fee || 0,
                          room_type: editingRoom.room_type || 'standard',
                          is_active: Boolean(editingRoom.is_active),
                        });
                        setEditingRoom(null);
                      }, 'Room updated');
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      <FormField label="Block" required>
                        <select className={inputClass} value={editingRoom.block || ''} onChange={(e) => setEditingRoom((p: any) => ({ ...p, block: e.target.value }))}>
                          <option value="">Select block</option>
                          {blockOptions.map((b) => <option key={b.id} value={String(b.id)}>{b.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Room Number" required>
                        <input className={inputClass} placeholder="Room number" value={editingRoom.room_number || ''} onChange={(e) => setEditingRoom((p: any) => ({ ...p, room_number: e.target.value }))} />
                      </FormField>
                      <FormField label="Floor">
                        <input className={inputClass} type="number" min={0} step={1} value={editingRoom.floor ?? 0} onChange={(e) => setEditingRoom((p: any) => ({ ...p, floor: toNonNegativeInt(e.target.value, 0) }))} />
                      </FormField>
                      <FormField label="Capacity" required>
                        <input className={inputClass} type="number" min={1} step={1} value={editingRoom.capacity ?? 1} onChange={(e) => setEditingRoom((p: any) => ({ ...p, capacity: toMinInt(e.target.value, 1) }))} />
                      </FormField>
                      <FormField label="Status" required>
                        <select className={inputClass} value={editingRoom.is_active ? 'true' : 'false'} onChange={(e) => setEditingRoom((p: any) => ({ ...p, is_active: e.target.value === 'true' }))}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save Room</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setEditingRoom(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingBed && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Edit Bed</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingBed(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const roomPk = toPkNumber(editingBed.room);
                      if (!roomPk || !String(editingBed.bed_number || '').trim()) return toastError('Please fill required fields.');
                      handleRequest(async () => {
                        await adminApi.hostel.beds.update(editingBed.id, {
                          room: roomPk,
                          bed_number: String(editingBed.bed_number || '').trim(),
                          is_active: Boolean(editingBed.is_active),
                        });
                        setEditingBed(null);
                      }, 'Bed updated');
                    }}
                  >
                    <div className="grid gap-3 md:grid-cols-2">
                      <FormField label="Room" required>
                        <select className={inputClass} value={editingBed.room || ''} onChange={(e) => setEditingBed((p: any) => ({ ...p, room: e.target.value }))}>
                          <option value="">Select room</option>
                          {roomOptions.map((r) => <option key={r.id} value={String(r.id)}>{r.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Bed Number" required>
                        <input className={inputClass} placeholder="Bed number" value={editingBed.bed_number || ''} onChange={(e) => setEditingBed((p: any) => ({ ...p, bed_number: e.target.value }))} />
                      </FormField>
                      <FormField label="Status" required>
                        <select className={inputClass} value={editingBed.is_active ? 'true' : 'false'} onChange={(e) => setEditingBed((p: any) => ({ ...p, is_active: e.target.value === 'true' }))}>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save Bed</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setEditingBed(null)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'allocations' && (
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Allocations</h3>
                <button className={primaryButtonClass} type="button" onClick={() => setShowAllocationCreateModal(true)}>
                  <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Allocate Bed</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px]">
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className="p-3">Student</th>
                      <th className="p-3">Block</th>
                      <th className="p-3">Room / Bed</th>
                      <th className="p-3">Check In</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Created By</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations.map((a) => (
                      <tr key={a.id} className={tableRowClass}>
                        <td className="p-3">{a.student_name || a.student_id}</td>
                        <td className="p-3">{a.block_name}</td>
                        <td className="p-3">{a.room_number} / {a.bed_number}</td>
                        <td className="p-3">{a.check_in_date || '-'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(Boolean(a.is_active))}`}>
                            {a.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-3">{displayCreatedBy(a)}</td>
                        <td className="p-3 text-right">
                          <div className="flex justify-end gap-2">
                            <button className={secondaryButtonClass} type="button" onClick={() => setEditingAllocation({ ...a })}>
                              <Edit3 className="w-4 h-4 inline" />
                            </button>
                            <button
                              className={dangerButtonClass}
                              type="button"
                              onClick={() =>
                                openDeleteConfirm(
                                  'allocation',
                                  a.id,
                                  'Delete Allocation',
                                  `Delete allocation for "${a.student_name || a.student_id}"?`
                                )
                              }
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {showAllocationCreateModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-3xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Allocate Bed</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setShowAllocationCreateModal(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!allocationForm.student || !allocationForm.bed || !allocationForm.academic_year || !allocationForm.check_in_date) return;
                      const studentPk = toPkNumber(allocationForm.student);
                      const bedPk = toPkNumber(allocationForm.bed);
                      const yearPk = toPkNumber(allocationForm.academic_year);
                      if (!studentPk || !bedPk || !yearPk) {
                        toastError('Please select valid student, bed, and academic year.');
                        return;
                      }
                      handleRequest(async () => {
                        await adminApi.hostel.allocations.create({
                          student: studentPk,
                          bed: bedPk,
                          academic_year: yearPk,
                          check_in_date: allocationForm.check_in_date,
                        });
                        setAllocationForm({ student: '', bed: '', academic_year: '', check_in_date: '' });
                        setShowAllocationCreateModal(false);
                      }, 'Allocation created');
                    }}
                  >
                    <div className="space-y-2">
                      <FormField label="Student" required>
                        <select
                          className={inputClass}
                          value={allocationForm.student}
                          onChange={(e) =>
                            setAllocationForm((p) => ({
                              ...p,
                              student: e.target.value,
                              bed: '',
                            }))
                          }
                        >
                          <option value="">Select student</option>
                          {availableStudents.map((s) => <option key={s.id} value={String(s.id)}>{s.label}</option>)}
                        </select>
                      </FormField>
                      {isWardenMode && availableStudents.length === 0 && (
                        <p className={combine('text-xs', get('text', 'secondary'))}>
                          No eligible students found for your assigned block gender policy.
                        </p>
                      )}
                      <FormField label="Bed" required>
                        <select className={inputClass} value={allocationForm.bed} onChange={(e) => setAllocationForm((p) => ({ ...p, bed: e.target.value }))}>
                          <option value="">Select bed</option>
                          {availableAllocationBedOptions.map((b) => <option key={b.id} value={String(b.id)}>{`${b.block_name || ''} ${b.room_number || ''} / ${b.bed_number || ''}`}</option>)}
                        </select>
                      </FormField>
                      {allocationForm.student && availableAllocationBedOptions.length === 0 && (
                        <p className={combine('text-xs', get('text', 'secondary'))}>
                          No available beds found for the selected student gender policy.
                        </p>
                      )}
                      {allocationForm.student && selectedStudentPolicy && (
                        <p className={combine('text-xs', get('text', 'secondary'))}>
                          Showing beds for{' '}
                          <span className="font-medium">
                            {selectedStudentPolicy === 'boys' ? 'boys blocks' : 'girls blocks'}
                          </span>{' '}
                          based on student gender.
                        </p>
                      )}
                      <FormField label="Academic Year" required>
                        <select className={inputClass} value={allocationForm.academic_year} onChange={(e) => setAllocationForm((p) => ({ ...p, academic_year: e.target.value }))}>
                          <option value="">Academic year</option>
                          {academicYears.map((y) => <option key={y.id} value={String(y.id)}>{y.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Check In Date" required>
                        <input type="date" className={inputClass} value={allocationForm.check_in_date} onChange={(e) => setAllocationForm((p) => ({ ...p, check_in_date: e.target.value }))} />
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Allocate</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setShowAllocationCreateModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {editingAllocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Edit Allocation</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingAllocation(null)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <p className={combine('text-xs sm:text-sm font-medium', get('text', 'primary'))}>
                      {editingAllocation.student_name || editingAllocation.student_id} - {editingAllocation.block_name}/{editingAllocation.room_number}/{editingAllocation.bed_number}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="Status" required>
                        <select
                          className={inputClass}
                          value={editingAllocation.is_active ? 'true' : 'false'}
                          onChange={(e) => setEditingAllocation((p: any) => ({ ...p, is_active: e.target.value === 'true' }))}
                        >
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </FormField>
                      <FormField label="Check Out Date">
                        <input
                          className={inputClass}
                          type="date"
                          value={editingAllocation.check_out_date || ''}
                          onChange={(e) => setEditingAllocation((p: any) => ({ ...p, check_out_date: e.target.value }))}
                        />
                      </FormField>
                    </div>
                    <FormField label="Notes" className="space-y-1 block">
                      <textarea
                        className={inputClass}
                        rows={2}
                        value={editingAllocation.notes || ''}
                        onChange={(e) => setEditingAllocation((p: any) => ({ ...p, notes: e.target.value }))}
                      />
                    </FormField>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className={secondaryButtonClass} type="button" onClick={() => setEditingAllocation(null)}>Cancel</button>
                    <button
                      className={primaryButtonClass}
                      type="button"
                      onClick={() =>
                        handleRequest(async () => {
                          await adminApi.hostel.allocations.update({
                            allocation_id: editingAllocation.id,
                            is_active: editingAllocation.is_active,
                            check_out_date: editingAllocation.check_out_date || null,
                            notes: editingAllocation.notes || '',
                          });
                          setEditingAllocation(null);
                        }, 'Allocation updated')
                      }
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className={combine(panelClass, 'p-3 sm:p-4')}>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: 'attendance', label: 'Attendance' },
                  { key: 'inout', label: 'Student In/Out' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={getStructureTabClass(activeAttendanceSubTab === tab.key)}
                    onClick={() => setActiveAttendanceSubTab(tab.key as AttendanceSubTabKey)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeAttendanceSubTab === 'attendance' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Attendance History</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setShowAttendanceFormModal(true)}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Mark Attendance</span>
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <FormField label="Attendance Date">
                    <input
                      type="date"
                      className={inputClass}
                      value={attendanceFilterDate}
                      onChange={(e) => setAttendanceFilterDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Status Filter">
                    <select
                      className={inputClass}
                      value={attendanceFilterStatus}
                      onChange={(e) =>
                        setAttendanceFilterStatus(
                          e.target.value as 'all' | 'present' | 'out_pass' | 'leave' | 'absent'
                        )
                      }
                    >
                      <option value="all">All Status</option>
                      <option value="present">Present</option>
                      <option value="out_pass">Out Pass</option>
                      <option value="leave">Leave</option>
                      <option value="absent">Absent</option>
                    </select>
                  </FormField>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px]">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Student</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Remarks</th>
                        <th className="p-3">Marked By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAttendanceRecords.length === 0 && (
                        <tr className={tableRowClass}>
                          <td className="p-3" colSpan={5}>No attendance history found.</td>
                        </tr>
                      )}
                      {filteredAttendanceRecords.map((record) => (
                        <tr key={record.id} className={tableRowClass}>
                          <td className="p-3">{record.date || '-'}</td>
                          <td className="p-3">{record.student_name || record.student_id || '-'}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700 border border-blue-200">
                              {String(record.status || '-').replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3">{record.remarks || '-'}</td>
                          <td className="p-3">{displayCreatedBy(record)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeAttendanceSubTab === 'inout' && (
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Recent In/Out Logs</h3>
                  <button className={primaryButtonClass} type="button" onClick={() => setShowInOutFormModal(true)}>
                    <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Add In/Out</span>
                  </button>
                </div>
                <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <FormField label="From Date">
                    <input
                      type="date"
                      className={inputClass}
                      value={inOutFilterFromDate}
                      onChange={(e) => setInOutFilterFromDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="To Date">
                    <input
                      type="date"
                      className={inputClass}
                      value={inOutFilterToDate}
                      onChange={(e) => setInOutFilterToDate(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Movement Type">
                    <select
                      className={inputClass}
                      value={inOutFilterType}
                      onChange={(e) => setInOutFilterType(e.target.value as 'all' | 'in' | 'out')}
                    >
                      <option value="all">All Type</option>
                      <option value="in">IN</option>
                      <option value="out">OUT</option>
                    </select>
                  </FormField>
                </div>
                <div className="space-y-2 max-h-[22rem] overflow-auto">
                  {inOutLogs.length === 0 && (
                    <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>No in/out records yet.</p>
                  )}
                  {inOutLogs.map((log) => (
                    <div key={log.id} className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={combine('text-xs sm:text-sm font-medium', get('text', 'primary'))}>
                            {log.student_name || log.student_id} • {log.block_name || '-'} / {log.room_number || '-'} / {log.bed_number || '-'}
                          </p>
                          <p className={combine('text-xs', get('text', 'secondary'))}>
                            {new Date(log.moved_at).toLocaleString()} • Marked by {displayCreatedBy(log)}
                          </p>
                          {log.reason && (
                            <p className={combine('text-xs mt-1', get('text', 'secondary'))}>{log.reason}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${log.movement_type === 'in' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                          {String(log.movement_type || '').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showAttendanceFormModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Mark Attendance</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setShowAttendanceFormModal(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!attendanceForm.allocation || !attendanceForm.date) return;
                      const allocationPk = toPkNumber(attendanceForm.allocation);
                      if (!allocationPk) {
                        toastError('Please select a valid allocation.');
                        return;
                      }
                      handleRequest(async () => {
                        await adminApi.hostel.attendance.upsert({ ...attendanceForm, allocation: allocationPk });
                        setShowAttendanceFormModal(false);
                      }, 'Attendance saved');
                    }}
                  >
                    <div className="space-y-2">
                      <FormField label="Allocation" required>
                        <select className={inputClass} value={attendanceForm.allocation} onChange={(e) => setAttendanceForm((p) => ({ ...p, allocation: e.target.value }))}>
                          <option value="">Select allocation</option>
                          {allocationOptions.map((a) => <option key={a.id} value={String(a.id)}>{a.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Date" required>
                        <input type="date" className={inputClass} value={attendanceForm.date} onChange={(e) => setAttendanceForm((p) => ({ ...p, date: e.target.value }))} />
                      </FormField>
                      <FormField label="Status" required>
                        <select className={inputClass} value={attendanceForm.status} onChange={(e) => setAttendanceForm((p) => ({ ...p, status: e.target.value as 'present' | 'out_pass' | 'leave' | 'absent' }))}>
                          <option value="present">Present</option>
                          <option value="out_pass">Out Pass</option>
                          <option value="leave">Leave</option>
                          <option value="absent">Absent</option>
                        </select>
                      </FormField>
                      <FormField label="Remarks">
                        <input className={inputClass} placeholder="Remarks" value={attendanceForm.remarks} onChange={(e) => setAttendanceForm((p) => ({ ...p, remarks: e.target.value }))} />
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save Attendance</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setShowAttendanceFormModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showInOutFormModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Add Student In/Out</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setShowInOutFormModal(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!inOutForm.allocation || !inOutForm.moved_at) return;
                      const allocationPk = toPkNumber(inOutForm.allocation);
                      if (!allocationPk) {
                        toastError('Please select a valid allocation.');
                        return;
                      }
                      handleRequest(async () => {
                        await adminApi.hostel.inOut.create({
                          allocation: allocationPk,
                          movement_type: inOutForm.movement_type,
                          moved_at: inOutForm.moved_at,
                          reason: inOutForm.reason.trim(),
                        });
                        setInOutForm({
                          allocation: '',
                          movement_type: 'out',
                          moved_at: '',
                          reason: '',
                        });
                        setShowInOutFormModal(false);
                      }, 'In/Out entry saved');
                    }}
                  >
                    <div className="space-y-2">
                      <FormField label="Allocation" required>
                        <select
                          className={inputClass}
                          value={inOutForm.allocation}
                          onChange={(e) => setInOutForm((p) => ({ ...p, allocation: e.target.value }))}
                        >
                          <option value="">Select allocation</option>
                          {activeAllocationOptions.map((a) => <option key={a.id} value={String(a.id)}>{a.label}</option>)}
                        </select>
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Movement Type" required>
                          <select
                            className={inputClass}
                            value={inOutForm.movement_type}
                            onChange={(e) => setInOutForm((p) => ({ ...p, movement_type: e.target.value as 'in' | 'out' }))}
                          >
                            <option value="out">OUT</option>
                            <option value="in">IN</option>
                          </select>
                        </FormField>
                        <FormField label="Moved At" required>
                          <input
                            type="datetime-local"
                            className={inputClass}
                            value={inOutForm.moved_at}
                            onChange={(e) => setInOutForm((p) => ({ ...p, moved_at: e.target.value }))}
                          />
                        </FormField>
                      </div>
                      <FormField label="Reason">
                        <input
                          className={inputClass}
                          placeholder="Reason (optional)"
                          value={inOutForm.reason}
                          onChange={(e) => setInOutForm((p) => ({ ...p, reason: e.target.value }))}
                        />
                      </FormField>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Save In/Out</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setShowInOutFormModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'fees' && (
          <div className="space-y-4">
            <div className={panelClass}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Hostel Fees Reports</h3>
                  <p className={combine('text-xs sm:text-sm mt-1', get('text', 'secondary'))}>
                    Hostel-only fee reporting using the selected academic year and hostel allocation based class filters.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className={secondaryButtonClass} type="button" onClick={() => setHostelFeeFilters((prev) => ({ ...prev, class_name: '', section: '' }))}>
                    Clear Class Filter
                  </button>
                  <button className={primaryButtonClass} type="button" onClick={loadHostelDueReport} disabled={hostelFeesLoading}>
                    <span className="inline-flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Load Due Report
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Academic Year" required>
                  <select
                    className={inputClass}
                    value={hostelFeeFilters.academic_year}
                    onChange={(e) => setHostelFeeFilters((prev) => ({ ...prev, academic_year: e.target.value, class_name: '', section: '' }))}
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={String(year.label)}>{year.label}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Class">
                  <select
                    className={inputClass}
                    value={hostelFeeFilters.class_name}
                    onChange={(e) => setHostelFeeFilters((prev) => ({ ...prev, class_name: e.target.value, section: '' }))}
                    disabled={!hostelFeeFilters.academic_year}
                  >
                    <option value="">All hostel classes</option>
                    {hostelFeeClassOptions.map((className) => (
                      <option key={className} value={className}>{className}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Section">
                  <select
                    className={inputClass}
                    value={hostelFeeFilters.section}
                    onChange={(e) => setHostelFeeFilters((prev) => ({ ...prev, section: e.target.value }))}
                    disabled={!hostelFeeFilters.academic_year || !hostelFeeFilters.class_name}
                  >
                    <option value="">All sections</option>
                    {hostelFeeSectionOptions.map((section) => (
                      <option key={section} value={section}>{section}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className={primaryButtonClass} type="button" onClick={loadHostelClassFeeReport} disabled={hostelFeesLoading}>
                  <span className="inline-flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Load Class Report
                  </span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Class Fee Report</h3>
                  {hostelFeeClassReport && (
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      {hostelFeeClassReport.academic_year} • {hostelFeeClassReport.class || 'ALL'} • {hostelFeeClassReport.section || 'ALL'}
                    </span>
                  )}
                </div>
                {!hostelFeeClassReport ? (
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    Load a hostel class fee report to view paid, unpaid, overdue, and student-wise collection details.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                        <p className={combine('text-xs', get('text', 'secondary'))}>Collection Rate</p>
                        <p className={combine('mt-1 text-lg font-semibold', get('text', 'primary'))}>
                          {hostelFeeClassReport.statistics.collection_rate}%
                        </p>
                      </div>
                      <div className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                        <p className={combine('text-xs', get('text', 'secondary'))}>Pending Amount</p>
                        <p className={combine('mt-1 text-lg font-semibold', get('text', 'primary'))}>
                          {hostelFeeClassReport.statistics.total_pending}
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px]">
                        <thead className={tableHeadClass}>
                          <tr>
                            <th className="p-3">Student</th>
                            <th className="p-3">Class</th>
                            <th className="p-3">Section</th>
                            <th className="p-3">Paid</th>
                            <th className="p-3">Due</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {hostelFeeClassReport.students.length === 0 && (
                            <tr className={tableRowClass}>
                              <td className="p-3" colSpan={6}>No hostel fee records found for these filters.</td>
                            </tr>
                          )}
                          {hostelFeeClassReport.students.map((student) => (
                            <tr key={student.student_id} className={tableRowClass}>
                              <td className="p-3">{student.student_name} ({student.student_id})</td>
                              <td className="p-3">{student.student_class || '-'}</td>
                              <td className="p-3">{student.student_section || '-'}</td>
                              <td className="p-3">{student.paid_amount}</td>
                              <td className="p-3">{student.due_amount}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(String(student.payment_status || '').toUpperCase() === 'PAID')}`}>
                                  {student.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className={panelClass}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Due Report</h3>
                  {hostelFeeDueReport && (
                    <span className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                      {hostelFeeDueReport.academic_year} • Hostel
                    </span>
                  )}
                </div>
                {!hostelFeeDueReport ? (
                  <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                    Load the hostel due report to view outstanding amounts grouped by class.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                        <p className={combine('text-xs', get('text', 'secondary'))}>Due Students</p>
                        <p className={combine('mt-1 text-lg font-semibold', get('text', 'primary'))}>
                          {hostelFeeDueReport.summary.due_students_count}
                        </p>
                      </div>
                      <div className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                        <p className={combine('text-xs', get('text', 'secondary'))}>Pending Amount</p>
                        <p className={combine('mt-1 text-lg font-semibold', get('text', 'primary'))}>
                          {hostelFeeDueReport.summary.total_pending_amount}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[30rem] overflow-auto">
                      {hostelFeeDueReport.dues_by_class.length === 0 && (
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          No hostel dues found for the selected academic year.
                        </p>
                      )}
                      {hostelFeeDueReport.dues_by_class.map((group) => (
                        <div key={group.class} className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className={combine('text-sm font-medium', get('text', 'primary'))}>Class {group.class}</p>
                              <p className={combine('text-xs', get('text', 'secondary'))}>
                                {group.total_due_students} students • Pending {group.total_due_amount}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className={panelClass}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Incident History</h3>
              <button className={primaryButtonClass} type="button" onClick={() => setShowIncidentFormModal(true)}>
                <span className="inline-flex items-center gap-2"><Plus className="w-4 h-4" /> Report Incident</span>
              </button>
            </div>
            <div>
              <div className="space-y-2 max-h-[30rem] overflow-auto">
                {incidents.map((incident) => (
                  <div key={incident.id} className={combine('rounded-lg border p-3', get('border', 'primary'))}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className={combine('font-medium text-sm sm:text-base', get('text', 'primary'))}>
                          {incident.title} <span className="ml-1 text-xs uppercase text-gray-500">{incident.severity}</span>
                        </p>
                        <p className={combine('text-xs sm:text-sm', get('text', 'secondary'))}>
                          {incident.student_name || incident.student_id} • {incident.description}
                        </p>
                        <p className={combine('text-xs', get('text', 'tertiary'))}>
                          Created by: {displayCreatedBy(incident)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusBadgeClass(Boolean(incident.resolved))}`}>
                          {incident.resolved ? 'Resolved' : 'Open'}
                        </span>
                        {!incident.resolved && (
                          <button
                            className={secondaryButtonClass}
                            onClick={() =>
                              handleRequest(
                                async () => {
                                  await adminApi.hostel.incidents.update({
                                    incident_id: incident.id,
                                    resolved: true,
                                    resolution_note: 'Resolved by admin',
                                  });
                                },
                                'Incident resolved'
                              )
                            }
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {showIncidentFormModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                <div className={combine(panelClass, 'w-full max-w-2xl')}>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className={combine('text-base sm:text-lg font-semibold', get('text', 'primary'))}>Report Incident</h3>
                    <button className={secondaryButtonClass} type="button" onClick={() => setShowIncidentFormModal(false)}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!incidentForm.allocation || !incidentForm.title.trim() || !incidentForm.description.trim() || !incidentForm.occurred_at) return;
                      const allocationPk = toPkNumber(incidentForm.allocation);
                      if (!allocationPk) {
                        toastError('Please select a valid allocation.');
                        return;
                      }
                      handleRequest(async () => {
                        await adminApi.hostel.incidents.create({ ...incidentForm, allocation: allocationPk });
                        setIncidentForm({ allocation: '', title: '', description: '', severity: 'low', occurred_at: '' });
                        setShowIncidentFormModal(false);
                      }, 'Incident created');
                    }}
                  >
                    <div className="space-y-2">
                      <FormField label="Allocation" required>
                        <select className={inputClass} value={incidentForm.allocation} onChange={(e) => setIncidentForm((p) => ({ ...p, allocation: e.target.value }))}>
                          <option value="">Select allocation</option>
                          {allocationOptions.map((a) => <option key={a.id} value={String(a.id)}>{a.label}</option>)}
                        </select>
                      </FormField>
                      <FormField label="Title" required>
                        <input className={inputClass} placeholder="Title" value={incidentForm.title} onChange={(e) => setIncidentForm((p) => ({ ...p, title: e.target.value }))} />
                      </FormField>
                      <FormField label="Description" required className="space-y-1 block">
                        <textarea className={inputClass} rows={3} placeholder="Description" value={incidentForm.description} onChange={(e) => setIncidentForm((p) => ({ ...p, description: e.target.value }))} />
                      </FormField>
                      <div className="grid grid-cols-2 gap-2">
                        <FormField label="Severity" required>
                          <select className={inputClass} value={incidentForm.severity} onChange={(e) => setIncidentForm((p) => ({ ...p, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' }))}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                          </select>
                        </FormField>
                        <FormField label="Occurred At" required>
                          <input type="datetime-local" className={inputClass} value={incidentForm.occurred_at} onChange={(e) => setIncidentForm((p) => ({ ...p, occurred_at: e.target.value }))} />
                        </FormField>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button className={primaryButtonClass} disabled={submitting} type="submit">Create Incident</button>
                      <button className={secondaryButtonClass} type="button" onClick={() => setShowIncidentFormModal(false)}>Cancel</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {confirmState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className={combine(panelClass, 'w-full max-w-md')}>
            <div className="flex items-center justify-between">
              <h3 className={combine('text-lg font-semibold', get('text', 'primary'))}>{confirmState.title}</h3>
              <button onClick={() => setConfirmState((p) => ({ ...p, open: false }))} className={secondaryButtonClass}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className={combine('mt-2 text-sm', get('text', 'secondary'))}>{confirmState.message}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className={secondaryButtonClass} onClick={() => setConfirmState((p) => ({ ...p, open: false }))}>Cancel</button>
              <button className={dangerButtonClass} onClick={confirmDelete}>
                <span className="inline-flex items-center gap-1"><Trash2 className="w-4 h-4" /> Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
