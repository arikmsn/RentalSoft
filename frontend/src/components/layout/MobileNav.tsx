import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';

const mobileNavItems = [
  { path: '/workorders?filter=active', icon: '📋', label: 'workOrders', roles: ['manager', 'technician', 'admin'] },
  { path: '/sites', icon: '📍', label: 'sites', roles: ['manager', 'technician', 'admin'] },
  { path: '/equipment', icon: '📦', label: 'equipment', roles: ['manager', 'technician', 'admin'] },
  { path: '/map', icon: '🗺️', label: 'map', roles: ['manager', 'technician', 'admin'] },
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
    <nav className="lg:hidden fixed bottom-0 start-0 end-0 bg-white/95 backdrop-blur-md border-t border-surface-200/50 z-30 safe-area-bottom shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex justify-around py-1">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-[64px] min-h-[56px] justify-center ${
                isActive
                  ? 'text-primary-600 bg-primary-50/80 font-medium'
                  : 'text-surface-500 active:bg-surface-50'
              }`
            }
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className="text-[10px] sm:text-xs leading-tight">{t(`navigation.${item.label}`)}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
