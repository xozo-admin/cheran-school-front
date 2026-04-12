'use client';

import { AttendanceConfigManager } from '@/components/dashboard/AttendanceConfigManager';
import { Suspense } from 'react';
import { useThemeClasses } from '@/hooks/useThemeClasses';

export default function AttendanceConfigPageClient() {
  const { get, combine } = useThemeClasses();

  return (
    <div className={combine("min-h-screen transition-colors duration-200", get('bg', 'primary'))}>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading attendance configuration...</p>
          </div>
        </div>
      }>
        <AttendanceConfigManager />
      </Suspense>
    </div>
  );
}
