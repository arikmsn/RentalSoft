import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { DashboardStats, Alert } from '../services/dashboardService';
import { dashboardService } from '../services/dashboardService';
import { formatDate } from '../utils/date';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      
      let statsData = null;
      let alertsData: any[] = [];
      
      try {
        statsData = await dashboardService.getStats();
      } catch (statsErr) {
        console.error('Failed to fetch stats:', statsErr);
      }
      
      try {
        alertsData = await dashboardService.getAlerts();
      } catch (alertsErr) {
        console.error('Failed to fetch alerts:', alertsErr);
      }
      
      setStats(statsData || {
        totalEquipment: 0,
        availableEquipment: 0,
        atCustomerEquipment: 0,
        inRepairEquipment: 0,
        totalSites: 0,
        sitesWithEquipment: 0,
        todayWorkOrders: 0,
        openWorkOrders: 0,
        overdueRemovals: 0,
        upcomingRemovals: 0,
      });
      setAlerts(alertsData);
      
      if (!statsData) {
        setError('אירעה שגיאה בטעינת הנתונים');
      }
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      const message = err?.response?.data?.message || err?.message || 'אירעה שגיאה בטעינת הנתונים';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    const refresh = () => { fetchData(); };
    window.addEventListener('site-updated', refresh);
    return () => window.removeEventListener('site-updated', refresh);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'בוקר טוב';
    if (hour >= 12 && hour < 18) return 'צהריים טובים';
    return 'ערב טוב';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-danger-500 text-center px-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200"
        >
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  const statCards = [
    { value: stats?.availableEquipment || 0, label: t('dashboard.availableEquipment'), color: 'text-primary-600', bg: 'bg-primary-50', icon: '📦', onClick: () => navigate('/equipment?filter=available') },
    { value: stats?.sitesWithEquipment || 0, label: t('dashboard.sitesWithEquipment'), color: 'text-success-600', bg: 'bg-success-50', icon: '📍', onClick: () => navigate('/workorders?view=list') },
    { value: stats?.overdueRemovals || 0, label: t('dashboard.overdueRemovals'), color: 'text-surface-800', bg: 'bg-surface-100', icon: '⚫', onClick: () => navigate('/alerts?type=past_removal') },
    { value: stats?.upcomingRemovals || 0, label: t('dashboard.upcomingRemovals'), color: 'text-danger-600', bg: 'bg-danger-50', icon: '🔴', onClick: () => navigate('/map') },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">
          {getGreeting()}
        </h1>
        <p className="text-sm text-surface-400 mt-1">{user?.name} &middot; {formatDate(new Date())}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {statCards.map((card, i) => (
          <div
            key={i}
            onClick={card.onClick}
            className={`bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100 ${card.onClick !== undefined ? 'cursor-pointer active:scale-[0.98]' : ''}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center text-lg`}>{card.icon}</span>
            </div>
            <div className={`text-3xl sm:text-4xl font-bold ${card.color} leading-none`}>{card.value}</div>
            <div className="text-xs sm:text-sm text-surface-500 mt-2 leading-tight">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-surface-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-surface-800">{t('dashboard.alerts')}</h2>
          {alerts.length > 0 && (
            <Link
              to="/alerts"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
            >
              {t('app.actions')} &larr;
            </Link>
          )}
        </div>
        
        {alerts.length === 0 ? (
          <div className="text-center py-6 sm:py-8">
            <span className="text-3xl mb-2 block">✅</span>
            <p className="text-surface-400 text-sm">{t('dashboard.noAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => {
              const isBlack = alert.daysRemaining < 0;
              const isOrange = alert.daysRemaining >= 4 && alert.daysRemaining <= 7;
              const borderColor = isBlack ? 'border-surface-800' : isOrange ? 'border-warning-400' : 'border-danger-400';
              const dotColor = isBlack ? 'bg-surface-800' : isOrange ? 'bg-warning-500' : 'bg-danger-500';
              const textColor = isBlack ? 'text-surface-700' : isOrange ? 'text-warning-700' : 'text-danger-700';
              return (
              <Link
                key={alert.id}
                to={alert.workOrderId ? `/workorders/${alert.workOrderId}` : `/equipment/${alert.equipmentId}`}
                className="block"
              >
                <div className={`flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-surface-50 transition-colors border-2 ${borderColor}`}>
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${textColor}`}>
                      {alert.siteName || t('equipment.title')}
                    </p>
                    <p className="text-xs text-surface-500 truncate">
                      {alert.siteAddress}
                    </p>
                    <p className="text-xs font-medium mt-0.5 text-surface-600">
                      {alert.daysRemaining > 0
                        ? `${alert.daysRemaining} ${t('alerts.daysRemaining')}`
                        : alert.daysRemaining === 0
                          ? `היום`
                          : `${Math.abs(alert.daysRemaining)} ${t('alerts.daysOverdue')}`}
                    </p>
                  </div>
                  <span className="text-surface-400 text-lg shrink-0">&larr;</span>
                </div>
              </Link>
            );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
