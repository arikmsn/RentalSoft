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
  const location = useLocation();

  // Close sidebar on navigation (for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

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
    <div className="min-h-screen bg-gray-50">
      <Header onMenuToggle={toggleSidebar} />
      
      {/* Sidebar backdrop for mobile */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}
      
      {/* Sidebar - drawer on mobile (hidden off-canvas), always visible on desktop */}
      <div 
        className={`
          fixed inset-y-0 start-0 z-50
          transform transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Main content - with left margin on large screens */}
      <main className="lg:ms-64 p-3 sm:p-4 pb-24 sm:pb-4 min-h-[calc(100vh-64px)]">
        <Outlet />
      </main>
      
      <MobileNav />
    </div>
  );
}
