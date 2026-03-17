import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/dashboard', icon: '📊', label: 'dashboard', roles: ['manager', 'admin'] },
  { path: '/equipment', icon: '📦', label: 'equipment', roles: ['manager', 'technician', 'admin'] },
  { path: '/sites', icon: '📍', label: 'sites', roles: ['manager', 'technician', 'admin'] },
  { path: '/workorders', icon: '📋', label: 'workOrders', roles: ['manager', 'technician', 'admin'] },
  { path: '/my-tasks', icon: '✅', label: 'myTasks', roles: ['technician'] },
  { path: '/map', icon: '🗺️', label: 'map', roles: ['manager', 'admin'] },
  { path: '/alerts', icon: '🔔', label: 'alerts', roles: ['manager', 'admin'] },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const filteredItems = navItems.filter(
    item => user && item.roles.includes(user.role)
  );

  const handleLinkClick = () => {
    // Call onClose for mobile - the navigation happens via NavLink
    // The useEffect in MainLayout will close the sidebar on route change
    if (onClose) {
      onClose();
    }
  };

  return (
    <aside className="w-64 bg-white border-e border-gray-200 h-full flex flex-col">
      {/* Close button for mobile */}
      <div className="lg:hidden flex justify-end p-2">
        <button
          onClick={() => onClose?.()}
          className="p-2 rounded-lg hover:bg-gray-100"
          aria-label="Close menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 p-2 sm:p-4 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] ${
                isActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <span className="text-xl">{item.icon}</span>
            <span>{t(`navigation.${item.label}`)}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
