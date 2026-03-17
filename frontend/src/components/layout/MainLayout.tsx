import { useState, useEffect, useCallback } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';

export function MainLayout() {
  const { isAuthenticated } = useAuthStore();
  const { setOnline, setSyncStatus } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close sidebar on navigation (for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Add body class when mobile sidebar is open to block map interactions
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.classList.add('mobile-sidebar-open');
    } else {
      document.body.classList.remove('mobile-sidebar-open');
    }
  }, [isMobile, sidebarOpen]);

  // Also close sidebar when window resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkConnection = () => {
      if (navigator.onLine) {
        setOnline(true);
        setSyncStatus('synced');
      } else {
        setOnline(false);
        setSyncStatus('offline');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [setOnline, setSyncStatus]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="min-h-screen">
      <Header onMenuToggle={toggleSidebar} />
      
      {/* Mobile sidebar backdrop - only on mobile when open */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-40 animate-fade-in"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar - always mounted on desktop */}
      {!isMobile && (
        <div className="fixed inset-y-0 start-0 z-50 lg:block">
          <Sidebar onClose={closeSidebar} />
        </div>
      )}

      {/* Mobile sidebar - ONLY rendered when open, hidden otherwise */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-y-0 start-0 z-[9999] w-72 animate-slide-up"
        >
          <Sidebar onClose={closeSidebar} />
        </div>
      )}

      {/* Main content - with left margin on large screens */}
      <main className="lg:ms-64 p-4 sm:p-5 pb-24 sm:pb-5 min-h-[calc(100vh-64px)]">
        <div className="animate-fade-in">
          <Outlet />
        </div>
      </main>
      
      <MobileNav />
    </div>
  );
}
