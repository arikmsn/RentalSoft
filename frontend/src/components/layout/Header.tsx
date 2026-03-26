import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useAuthStore } from '../../stores/authStore';
import { useAppStore } from '../../stores/appStore';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { isOnline, syncStatus, pendingActionsCount } = useAppStore();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu on route change
  useEffect(() => {
    setShowUserMenu(false);
  }, [location.pathname]);

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
    <header className="lg:hidden bg-white/80 backdrop-blur-md shadow-sm border-b border-surface-200/50 fixed top-0 left-0 right-0 z-50">
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center gap-2 sm:gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="p-2 rounded-xl hover:bg-surface-100 transition-all duration-200"
              aria-label="Menu"
            >
              <svg className="w-5 h-5 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-l from-primary-600 to-primary-500 bg-clip-text text-transparent">{t('app.title')}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 lg:hidden">
          {/* Sync status indicator - mobile only */}
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

          {/* Language selector - mobile only */}
          <div className="relative" ref={langMenuRef}>
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

          {/* User menu - mobile only */}
          <div className="relative" ref={userMenuRef}>
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
              <div className="absolute end-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[140px] z-[60]">
                <div className="px-4 py-2 border-b sm:hidden">
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-500">{t(`roles.${user?.role}`)}</p>
                </div>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); navigate('/'); }}
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
