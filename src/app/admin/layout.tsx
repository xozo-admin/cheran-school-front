// app/admin/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { Header, Sidebar } from '@/components/dashboard';
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
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // PREVENT BODY SCROLLING
  useEffect(() => {
    // Add class to html and body to prevent scrolling
    document.documentElement.classList.add('overflow-hidden');
    document.body.classList.add('overflow-hidden');
    
    return () => {
      // Clean up when component unmounts
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
      {/* Main container - takes full viewport */}
      <div className="h-screen flex flex-col bg-gradient-to-br from-[var(--color-bg-secondary)] via-[var(--color-bg-primary)] to-[var(--color-bg-tertiary)]">
        {/* Main flex row */}
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
            <Sidebar 
              collapsed={sidebarCollapsed} 
              onToggle={handleSidebarToggle}
              isMobile={isMobile}
              onCloseMobile={handleCloseMobileSidebar}
            />
          </div>
          
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Toggle Button */}
            {isMobile && (
              <div className="lg:hidden fixed top-4 left-4 z-30">
                <MobileSidebarToggle 
                  isOpen={mobileSidebarOpen}
                  onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                />
              </div>
            )}

            {/* Header */}
            <Header 
              onMenuClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            />
            
            {/* Main Content - THIS scrolls */}
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </div>

    
      </div>
    </ThemeProvider>
  );
}