// app/student/layout.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { StaffHeader, StaffSidebar } from '@/components/dashboard/staff';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { staffApi } from '@/lib/api';
import { toastError } from '@/lib/toast';
import { canAccessStaffPath, resolveStaffRole, type StaffRole } from '@/lib/staff-access';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>('');
  const deniedPathRef = useRef<string>('');
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Keep page scroll behavior consistent with admin layout.
  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');

    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const checkRole = async () => {
      try {
        const response = await staffApi.profile.get();
        const payload = response?.data?.data || response?.data || {};
        const fromStorage =
          typeof window !== 'undefined' ? localStorage.getItem('staff_role') : '';
        if (!mounted) return;
        const resolvedRole = resolveStaffRole(payload, fromStorage);
        setStaffRole(resolvedRole);
      } catch {
        const fromStorage =
          typeof window !== 'undefined' ? localStorage.getItem('staff_role') : '';
        if (!mounted) return;
        setStaffRole(resolveStaffRole(undefined, fromStorage));
      } finally {
        if (mounted) setRoleChecked(true);
      }
    };

    checkRole();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!roleChecked) return;
    if (canAccessStaffPath(pathname || '/staff', staffRole)) return;
    if (deniedPathRef.current === pathname) return;
    deniedPathRef.current = pathname || '';
    toastError('You do not have access to this page for your staff role.');
    router.replace('/staff');
  }, [pathname, roleChecked, router, staffRole]);

  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileSidebarOpen(!mobileSidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleCloseMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  if (!roleChecked) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
    <div className="h-screen flex flex-col bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)] transition-colors duration-300">
      <div className="flex flex-1 overflow-hidden">
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={handleCloseMobileSidebar}
          />
        )}

        {/* Sidebar */}
        <div className={`
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:block
          fixed inset-y-0 left-0 z-50
          transition-transform duration-300 ease-in-out
          h-screen
        `}>
          <StaffSidebar
            collapsed={sidebarCollapsed}
            onToggle={handleSidebarToggle}
            isMobile={isMobile}
            onCloseMobile={handleCloseMobileSidebar}
          />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
          {/* Header */}
          <StaffHeader onMenuClick={() => setMobileSidebarOpen((prev) => !prev)} />
          
          {/* Dynamic Content */}
          <main className="flex-1 overflow-y-auto transition-colors duration-300">
            {children}
          </main>
        </div>
      </div>
    </div>
    </ThemeProvider>
  );
}
