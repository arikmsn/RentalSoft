import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import type { DashboardStats, Alert } from '../services/dashboardService';
import { dashboardService } from '../services/dashboardService';

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
        const [statsData, alertsData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getAlerts(),
        ]);
        setStats(statsData);
        setAlerts(alertsData);
      } catch (err: any) {
        console.error('Failed to fetch dashboard data:', err);
        const message = err?.response?.data?.message || err?.message || 'Failed to fetch dashboard data';
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
        <p className="text-sm text-surface-500 mt-1">{user?.name} • {new Date().toLocaleDateString('he-IL')}</p>
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
                to={`/equipment/${alert.equipmentId}`}
                className="block"
              >
                <div className="flex items-center justify-between p-2 sm:p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                  <div>
                    <p className="font-medium text-sm sm:text-base text-red-800">
                      {t(`alerts.${alert.type}`)}
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

      {/* Quick Actions for Manager */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <Link
          to="/workorders"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">📋</span>
          <span className="text-sm font-medium text-center">{t('navigation.workOrders')}</span>
        </Link>
        <Link
          to="/sites"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">📍</span>
          <span className="text-sm font-medium text-center">{t('navigation.sites')}</span>
        </Link>
        <Link
          to="/map"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">🗺️</span>
          <span className="text-sm font-medium text-center">{t('navigation.map')}</span>
        </Link>
        <Link
          to="/alerts"
          className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col items-center gap-2 min-h-[80px] justify-center"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-sm font-medium text-center">{t('navigation.alerts')}</span>
        </Link>
      </div>
    </div>
  );
}
