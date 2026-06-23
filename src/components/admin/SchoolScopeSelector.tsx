'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, RefreshCw, School } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeClasses } from '@/hooks/useThemeClasses';
import { adminApi } from '@/lib/api';

export type SchoolScopeOption = {
  id: number;
  name: string;
  code?: string | null;
  student_count?: number;
  teacher_count?: number;
  staff_count?: number;
};

type UseSchoolScopeOptions = {
  storageKey?: string;
  includeAll?: boolean;
};

export const useSchoolScope = ({
  storageKey = 'admin_school_scope',
  includeAll = true,
}: UseSchoolScopeOptions = {}) => {
  const { user, isLoading } = useAuth();
  const [schools, setSchools] = useState<SchoolScopeOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [schoolsError, setSchoolsError] = useState<string | null>(null);

  const isSuperAdmin = user?.user_type === 'super_admin' || user?.can_access_all_schools;
  const loggedAdminSchoolId = user?.school_id ? Number(user.school_id) : null;
  const loggedAdminSchoolName = user?.school_name || 'Assigned School';

  const loadSchools = useCallback(async () => {
    if (!isSuperAdmin) return;

    try {
      setSchoolsLoading(true);
      setSchoolsError(null);
      const response = await adminApi.school.schools.list();
      const rows = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
      setSchools(rows);

      const saved = typeof window !== 'undefined' ? window.localStorage.getItem(storageKey) : null;
      if (saved && (saved === 'all' || rows.some((school: SchoolScopeOption) => String(school.id) === saved))) {
        setSelectedSchoolId(saved);
      } else if (!includeAll && rows.length > 0) {
        setSelectedSchoolId(String(rows[0].id));
      } else {
        setSelectedSchoolId('all');
      }
    } catch (error: any) {
      setSchoolsError(error?.response?.data?.detail || error?.message || 'Schools could not be loaded');
      setSchools([]);
    } finally {
      setSchoolsLoading(false);
    }
  }, [includeAll, isSuperAdmin, storageKey]);

  useEffect(() => {
    if (isLoading) return;
    if (isSuperAdmin) {
      loadSchools();
    } else {
      setSelectedSchoolId(loggedAdminSchoolId ? String(loggedAdminSchoolId) : 'assigned');
      setSchools([]);
      setSchoolsError(null);
      setSchoolsLoading(false);
    }
  }, [isLoading, isSuperAdmin, loadSchools, loggedAdminSchoolId]);

  const selectedSchool = useMemo(
    () => schools.find((school) => String(school.id) === selectedSchoolId) || null,
    [schools, selectedSchoolId]
  );

  const selectedSchoolName = isSuperAdmin
    ? selectedSchoolId === 'all'
      ? 'All Schools'
      : selectedSchool?.name || 'Selected School'
    : loggedAdminSchoolName;

  const scopeParams = useMemo(() => {
    if (isSuperAdmin && selectedSchoolId !== 'all') {
      return { school_id: Number(selectedSchoolId) };
    }
    return {};
  }, [isSuperAdmin, selectedSchoolId]);

  const handleSchoolChange = (value: string) => {
    setSelectedSchoolId(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, value);
    }
  };

  return {
    user,
    isSuperAdmin,
    schools,
    selectedSchool,
    selectedSchoolId,
    selectedSchoolName,
    scopeParams,
    schoolsLoading,
    schoolsError,
    setSelectedSchoolId: handleSchoolChange,
    refreshSchools: loadSchools,
  };
};

type SchoolScopeSelectorProps = ReturnType<typeof useSchoolScope> & {
  className?: string;
  label?: string;
};

export const SchoolScopeSelector = ({
  className = '',
  label = 'School',
  isSuperAdmin,
  schools,
  selectedSchoolId,
  selectedSchoolName,
  schoolsLoading,
  schoolsError,
  setSelectedSchoolId,
  refreshSchools,
}: SchoolScopeSelectorProps) => {
  const { theme } = useTheme();
  const { get, combine } = useThemeClasses();

  if (!isSuperAdmin) {
    return (
      <div
        className={combine(
          'flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 shadow-sm',
          theme === 'dark' ? 'border-gray-700 bg-gray-900/80' : 'border-slate-200 bg-white',
          className
        )}
      >
        <School className="h-4 w-4 shrink-0 text-blue-600" />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${get('text', 'primary')}`}>{selectedSchoolName}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={combine('flex w-full flex-col gap-1 sm:w-auto', className)}>
      <label
        className={combine(
          'flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2 shadow-sm sm:min-w-[260px]',
          theme === 'dark' ? 'border-gray-700 bg-gray-900/80 text-gray-100' : 'border-slate-200 bg-white text-slate-700'
        )}
      >
        <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
        <select
          value={selectedSchoolId}
          onChange={(event) => setSelectedSchoolId(event.target.value)}
          disabled={schoolsLoading}
          className={`w-full bg-transparent text-sm font-semibold outline-none ${get('text', 'primary')}`}
        >
          <option value="all">All Schools</option>
          {schools.map((school) => (
            <option key={school.id} value={school.id}>
              {school.name}{school.code ? ` (${school.code})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={refreshSchools}
          disabled={schoolsLoading}
          className="ml-1 rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-wait dark:hover:bg-gray-800 dark:hover:text-gray-100"
          title="Refresh schools"
          aria-label="Refresh schools"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${schoolsLoading ? 'animate-spin' : ''}`} />
        </button>
      </label>
      {schoolsError && <p className="px-1 text-xs font-medium text-red-600">{schoolsError}</p>}
    </div>
  );
};
