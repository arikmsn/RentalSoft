import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/admin/tenants', icon: '🏢', label: 'עסקים' },
  { path: '/admin/users', icon: '👥', label: 'משתמשים' },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white shadow-sm border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-surface-800">מנהל מערכת</h1>
            <span className="text-sm text-surface-500">
              {user?.name || user?.email || 'Admin'}
            </span>
          </div>
          <nav className="flex gap-4 items-center">
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
            <button
              onClick={handleLogout}
              className="text-sm text-danger-600 hover:text-danger-700 mr-4"
            >
              יציאה
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}