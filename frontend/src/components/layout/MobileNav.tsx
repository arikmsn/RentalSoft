import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const mobileNavItems = [
  { path: '/my-tasks', icon: '✅', label: 'myTasks', roles: ['technician'] },
  { path: '/workorders', icon: '📋', label: 'workOrders', roles: ['technician'] },
  { path: '/equipment', icon: '📦', label: 'equipment', roles: ['technician'] },
  { path: '/sites', icon: '📍', label: 'sites', roles: ['manager', 'technician', 'admin'] },
  { path: '/dashboard', icon: '📊', label: 'dashboard', roles: ['manager', 'admin'] },
];

export function MobileNav() {
  const { t } = useTranslation();
  const { user } = useAuthStore();

  const filteredItems = mobileNavItems.filter(
    item => user && item.roles.includes(user.role)
  );

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <nav className="lg:hidden fixed bottom-0 start-0 end-0 bg-white border-t border-gray-200 z-30 safe-area-bottom">
      <div className="flex justify-around py-1.5">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors min-w-[60px] min-h-[56px] justify-center ${
                isActive
                  ? 'text-primary-600 bg-primary-50'
                  : 'text-gray-600'
              }`
            }
          >
            <span className="text-xl sm:text-2xl">{item.icon}</span>
            <span className="text-[10px] sm:text-xs">{t(`navigation.${item.label}`)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
