import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/admin/tenants', icon: '🏢', label: 'Tenants' },
  { path: '/admin/users', icon: '👥', label: 'Users' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (!user?.isSuperAdmin) {
      navigate('/');
    } else {
      setLoading(false);
    }
  }, [user, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const tenantSlug = user?.tenantSlug || 'default';

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white shadow-sm border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-surface-800">Admin</h1>
            <NavLink
              to={`/${tenantSlug}/dashboard`}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              ← Back to App
            </NavLink>
          </div>
          <nav className="flex gap-4">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `text-sm font-medium ${
                    isActive ? 'text-primary-600' : 'text-surface-600 hover:text-surface-800'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}