import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { DashboardStats, Alert } from '../services/dashboardService';
import { dashboardService } from '../services/dashboardService';
import { formatDate } from '../utils/date';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        
        // Fetch stats and alerts separately so one failure doesn't block the other
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
          // Don't block the whole dashboard for alerts failure
        }
        
        setStats(statsData || {
          totalEquipment: 0,
          activeEquipment: 0,
          warehouseEquipment: 0,
          inRepairEquipment: 0,
          totalSites: 0,
          sitesWithEquipment: 0,
          todayWorkOrders: 0,
          openWorkOrders: 0,
          overdueRemovals: 0,
          upcomingRemovals: 0,
        });
        setAlerts(alertsData);
        
        // Only show error if both failed
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
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center px-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">
          {t('dashboard.title')}
        </h1>
        <p className="text-sm text-surface-500 mt-1">{user?.name} • {formatDate(new Date())}</p>
      </div>

      {/* Stats Grid - 2x2 on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-surface-100">
          <div className="text-3xl sm:text-4xl font-bold text-primary-600">{stats?.activeEquipment || 0}</div>
          <div className="text-xs sm:text-sm text-surface-500 mt-1">{t('dashboard.activeEquipment')}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-surface-100">
          <div className="text-3xl sm:text-4xl font-bold text-success-600">{stats?.sitesWithEquipment || 0}</div>
          <div className="text-xs sm:text-sm text-surface-500 mt-1">{t('dashboard.sitesWithEquipment')}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-surface-100">
          <div className="text-3xl sm:text-4xl font-bold text-danger-600">{stats?.overdueRemovals || 0}</div>
          <div className="text-xs sm:text-sm text-surface-500 mt-1">{t('dashboard.overdueRemovals')}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-shadow duration-300 border border-surface-100">
          <div className="text-3xl sm:text-4xl font-bold text-warning-500">{stats?.upcomingRemovals || 0}</div>
          <div className="text-xs sm:text-sm text-surface-500 mt-1">{t('dashboard.upcomingRemovals')}</div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-surface-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base sm:text-lg font-semibold text-surface-800">{t('dashboard.alerts')}</h2>
          {alerts.length > 0 && (
            <Link
              to="/alerts"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('app.actions')} →
            </Link>
          )}
        </div>
        
        {alerts.length === 0 ? (
          <p className="text-gray-500 text-center py-4 sm:py-8 text-sm">{t('dashboard.noAlerts')}</p>
        ) : (
          <div className="space-y-2 sm:space-y-3 max-h-[300px] overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <Link
                key={alert.id}
                to={alert.workOrderId ? `/workorders/${alert.workOrderId}` : `/equipment/${alert.equipmentId}`}
                className="block"
              >
                <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-red-800">
                      {alert.siteName || t('equipment.title')}
                    </p>
                    <p className="text-xs text-red-600 truncate">
                      {alert.siteAddress}
                    </p>
                    <p className="text-xs sm:text-sm text-red-600">
                      {alert.daysRemaining > 0
                        ? `${alert.daysRemaining} ${t('alerts.daysRemaining')}`
                        : `${Math.abs(alert.daysRemaining)} ${t('alerts.daysOverdue')}`}
                    </p>
                  </div>
                  <span className="text-red-400">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions - only show אתרים and ציוד */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4">
        <Link
          to="/sites"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">📍</span>
          <span className="text-sm font-medium text-center">{t('navigation.sites')}</span>
        </Link>
        <Link
          to="/equipment"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">📦</span>
          <span className="text-sm font-medium text-center">{t('navigation.equipment')}</span>
        </Link>
      </div>
    </div>
  );
}
