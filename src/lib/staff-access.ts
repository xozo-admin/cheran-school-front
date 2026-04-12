export type StaffRole =
  | 'external_staff'
  | 'transport_staff'
  | 'hostel_warden'
  | 'it_staff'
  | 'finance_staff'
  | 'operations_staff'
  | 'admin_staff'
  | string;

interface RoleCarrier {
  role?: string | null;
  staff_role?: string | null;
  user_type?: string | null;
}

const COMMON_STAFF_PATHS = [
  '/staff',
  '/staff/attendance',
  '/staff/tasks',
  '/staff/inventory',
  '/staff/announcements',
  '/staff/meetings',
  '/staff/leaves',
  '/staff/salary',
  '/staff/transport',
] as const;

const FINANCE_STAFF_PATHS = ['/staff/fees', '/staff/finance'] as const;
const HOSTEL_STAFF_PATHS = ['/staff/hostel'] as const;
const ACADEMICS_STAFF_PATHS = ['/staff/academics'] as const;

const matchPath = (pathname: string, path: string) => {
  if (path === '/staff') return pathname === '/staff';
  return pathname === path || pathname.startsWith(`${path}/`);
};

const isAllowedPath = (pathname: string, allowedPaths: readonly string[]) =>
  allowedPaths.some((path) => matchPath(pathname, path));

const KNOWN_ROLE_ALIASES: Record<string, StaffRole> = {
  'transport staff': 'transport_staff',
  transport: 'transport_staff',
  driver: 'transport_staff',
  'hostel warden': 'hostel_warden',
  warden: 'hostel_warden',
  hostel: 'hostel_warden',
  'finance staff': 'finance_staff',
  finance: 'finance_staff',
  'admin staff': 'admin_staff',
  admin: 'admin_staff',
  'it staff': 'it_staff',
  operations: 'operations_staff',
  'operations staff': 'operations_staff',
  external: 'external_staff',
  'external staff': 'external_staff',
};

export const normalizeStaffRole = (rawRole?: string | null): StaffRole => {
  if (!rawRole) return '';
  const normalized = String(rawRole).trim().toLowerCase().replace(/-/g, '_');
  if (KNOWN_ROLE_ALIASES[normalized]) return KNOWN_ROLE_ALIASES[normalized];
  return normalized.replace(/\s+/g, '_');
};

export const resolveStaffRole = (
  profile?: RoleCarrier | null,
  fallbackRole?: string | null
): StaffRole => {
  const preferred =
    profile?.staff_role ||
    profile?.role ||
    (profile?.user_type === 'transport_staff' ? 'transport_staff' : '') ||
    fallbackRole ||
    '';
  return normalizeStaffRole(preferred);
};

export const isTransportStaffRole = (role?: string | null): boolean =>
  normalizeStaffRole(role) === 'transport_staff';

export const canAccessFinanceOps = (role?: string | null): boolean => {
  const normalized = normalizeStaffRole(role);
  return normalized === 'admin_staff' || normalized === 'finance_staff';
};

export const canAccessHostelOps = (role?: string | null): boolean => {
  const normalized = normalizeStaffRole(role);
  return normalized === 'admin_staff' || normalized === 'hostel_warden';
};

export const canAccessAcademicsOps = (role?: string | null): boolean =>
  normalizeStaffRole(role) === 'admin_staff';

export const canAccessStaffPath = (pathname: string, role?: string | null): boolean => {
  if (!pathname.startsWith('/staff')) return true;

  if (isAllowedPath(pathname, COMMON_STAFF_PATHS)) return true;

  if (canAccessFinanceOps(role) && isAllowedPath(pathname, FINANCE_STAFF_PATHS)) return true;
  if (canAccessHostelOps(role) && isAllowedPath(pathname, HOSTEL_STAFF_PATHS)) return true;
  if (canAccessAcademicsOps(role) && isAllowedPath(pathname, ACADEMICS_STAFF_PATHS)) return true;

  return false;
};

export const formatStaffRoleLabel = (role?: string | null): string => {
  const normalized = normalizeStaffRole(role);
  if (!normalized) return 'Staff Member';
  return normalized.replace(/_/g, ' ').toUpperCase();
};
