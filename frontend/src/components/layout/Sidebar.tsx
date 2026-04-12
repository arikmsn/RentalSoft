import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';
import { changeLanguage } from '../../i18n';

const navItems = [
  { path: 'dashboard', icon: '📊', label: 'dashboard', roles: ['manager', 'technician', 'admin'] },
  { path: 'equipment', icon: '📦', label: 'equipment', roles: ['manager', 'technician', 'admin'] },
  { path: 'sites', icon: '📍', label: 'sites', roles: ['manager', 'technician', 'admin'] },
  { path: 'workorders', icon: '📋', label: 'workOrders', roles: ['manager', 'technician', 'admin'] },
  { path: 'map', icon: '🗺️', label: 'map', roles: ['manager', 'technician', 'admin'] },
  { path: 'alerts', icon: '🔔', label: 'alerts', roles: ['manager', 'technician', 'admin'] },
  { path: 'settings', icon: '⚙️', label: 'settings', roles: ['manager', 'admin'] },
];

interface SidebarProps {
  tenantSlug?: string;
  onClose?: () => void;
}

export function Sidebar({ tenantSlug, onClose }: SidebarProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { isOnline, syncStatus, pendingActionsCount } = useAppStore();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(
    item => user && item.roles.includes(user.role)
  );

  const buildPath = (path: string) => {
    if (!tenantSlug) return `/${path}`;
    return `/${tenantSlug}/${path}`;
  };

  const handleLinkClick = () => {
    if (onClose) {
      onClose();
    }
  };

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng);
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'online': return '🟢';
      case 'offline': return '🔴';
      case 'syncing': return '🔄';
      case 'synced': return '☁️';
      case 'pending': return '⏳';
      case 'error': return '⚠️';
      default: return '☁️';
    }
  };

  const getSyncText = () => {
    if (!isOnline) return t('sync.offline');
    if (syncStatus === 'syncing') return t('sync.syncing');
    if (syncStatus === 'pending' && pendingActionsCount > 0) {
      return `${pendingActionsCount} ${t('sync.pending')}`;
    }
    return isOnline ? t('sync.online') : t('sync.offline');
  };

  const getSyncClass = () => {
    if (!isOnline) return 'text-red-600';
    if (syncStatus === 'syncing') return 'text-blue-600';
    if (syncStatus === 'pending') return 'text-yellow-600';
    if (syncStatus === 'error') return 'text-red-600';
    return 'text-green-600';
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    if (onClose) onClose();
  };

  return (
    <aside className="w-64 bg-white/95 backdrop-blur-md border-e border-surface-200/50 h-full flex flex-col shadow-lg">
      {/* Close button for mobile */}
      <div className="lg:hidden flex justify-end p-2">
        <button
          onClick={() => onClose?.()}
          className="p-2 rounded-xl hover:bg-surface-100 transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={buildPath(item.path)}
            onClick={handleLinkClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 min-h-[48px] ${
                isActive
                  ? 'bg-primary-500 text-white font-medium shadow-md shadow-primary-500/25'
                  : 'text-surface-600 hover:bg-surface-100 hover:text-surface-800'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            <span>{t(`navigation.${item.label}`)}</span>
          </NavLink>
        ))}
      </nav>

      {/* Desktop-only controls - bottom of sidebar */}
      <div className="hidden lg:block p-3 border-t border-surface-200 space-y-2">
        {/* Sync status */}
        <div className="flex items-center gap-2 px-4 py-2 text-sm" title={getSyncText()}>
          <span>{getSyncIcon()}</span>
          <span className={getSyncClass()}>{getSyncText()}</span>
        </div>

        {/* Language switcher */}
        <div className="flex items-center gap-1 px-4 py-2">
          <button
            onClick={() => handleLanguageChange('he')}
            className={`px-2 py-1 rounded ${i18n.language === 'he' ? 'bg-primary-100 text-primary-600' : 'hover:bg-surface-100'}`}
          >
            🇮🇱 HE
          </button>
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-primary-100 text-primary-600' : 'hover:bg-surface-100'}`}
          >
            🇬🇧 EN
          </button>
        </div>

        {/* User info and logout */}
        <div className="px-4 py-2">
          <p className="text-sm font-medium text-surface-700">{user?.name}</p>
          <p className="text-xs text-surface-500">{t(`roles.${user?.role}`)}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {t('auth.logout')}
        </button>
      </div>
    </aside>
  );
}
