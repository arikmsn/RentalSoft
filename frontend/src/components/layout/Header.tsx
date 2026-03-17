import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuthStore();
  const { isOnline, syncStatus, pendingActionsCount } = useAppStore();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLanguageChange = (lng: string) => {
    changeLanguage(lng);
    setShowLangMenu(false);
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case 'online':
        return '🟢';
      case 'offline':
        return '🔴';
      case 'syncing':
        return '🔄';
      case 'synced':
        return '☁️';
      case 'pending':
        return '⏳';
      case 'error':
        return '⚠️';
      default:
        return '☁️';
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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-primary-600">{t('app.title')}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sync status indicator */}
          <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm" title={getSyncText()}>
            <span>{getSyncIcon()}</span>
            <span className={`hidden xs:inline ${getSyncClass()}`}>
              {getSyncText()}
            </span>
            {pendingActionsCount > 0 && syncStatus !== 'offline' && (
              <span className="xs:hidden bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full text-xs">
                {pendingActionsCount}
              </span>
            )}
          </div>

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-100 min-h-[40px]"
            >
              <span className="text-lg">{i18n.language === 'he' ? '🇮🇱' : '🇬🇧'}</span>
              <span className="hidden sm:inline text-sm">{i18n.language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="absolute end-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[120px] z-50">
                <button
                  onClick={() => handleLanguageChange('he')}
                  className="w-full px-4 py-2 text-start hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🇮🇱</span> {t('language.hebrew')}
                </button>
                <button
                  onClick={() => handleLanguageChange('en')}
                  className="w-full px-4 py-2 text-start hover:bg-gray-100 flex items-center gap-2"
                >
                  <span>🇬🇧</span> {t('language.english')}
                </button>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 min-h-[40px]"
            >
              <div className="text-end hidden sm:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500">{t(`roles.${user?.role}`)}</p>
              </div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-600 font-medium text-sm">
                  {user?.name?.charAt(0) || '?'}
                </span>
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute end-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] z-50">
                <div className="px-4 py-2 border-b sm:hidden">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{t(`roles.${user?.role}`)}</p>
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full px-4 py-2 text-start hover:bg-gray-100 flex items-center gap-2 text-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  {t('auth.logout')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
