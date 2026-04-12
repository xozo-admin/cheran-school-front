// app/student/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { StudentHeader, StudentSidebar } from '@/components/dashboard/student';
import { ThemeProvider } from '@/contexts/ThemeContext';
import MobileSidebarToggle from '@/components/dashboard/MobileSidebarToggle';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    
    return () => {
      document.documentElement.classList.remove('overflow-hidden');
      document.body.classList.remove('overflow-hidden');
    };
  }, []);

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
            h-full
          `}>
            <StudentSidebar 
              collapsed={sidebarCollapsed} 
              onToggle={handleSidebarToggle}
              isMobile={isMobile}
              onCloseMobile={handleCloseMobileSidebar}
            />
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {isMobile && (
              <div className="lg:hidden fixed top-4 left-4 z-30">
                <MobileSidebarToggle 
                  isOpen={mobileSidebarOpen}
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                />
              </div>
            )}

            {/* Header */}
            <StudentHeader onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
            
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
