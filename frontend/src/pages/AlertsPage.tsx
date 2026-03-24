import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { Alert } from '../types';
import { dashboardService } from '../services/dashboardService';

export function AlertsPage() {
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Alert['type'] | 'all'>('all');

  const fetchAlerts = async () => {
    try {
      const data = await dashboardService.getAlerts();
      setAlerts(data);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  useEffect(() => {
    const refresh = () => { fetchAlerts(); };
    window.addEventListener('site-updated', refresh);
    return () => window.removeEventListener('site-updated', refresh);
  }, []);

  const filteredAlerts = alerts
    .filter((alert) => {
      return filter === 'all' || alert.type === filter;
    })
    .sort((a, b) => {
      // Sort by daysRemaining ascending (most overdue/earliest first)
      return a.daysRemaining - b.daysRemaining;
    });

  const getAlertDotColor = (alert: Alert) => {
    if (alert.daysRemaining < 0) return { dot: 'bg-surface-800', border: 'border-surface-800', bg: 'bg-surface-50', isHollow: false };
    if (alert.daysRemaining >= 0 && alert.daysRemaining <= 3) return { dot: 'bg-danger-500', border: 'border-danger-400', bg: 'bg-danger-50', isHollow: false };
    if (alert.daysRemaining >= 4 && alert.daysRemaining <= 7) return { dot: 'bg-warning-500', border: 'border-warning-400', bg: 'bg-warning-50', isHollow: false };
    return { dot: 'bg-success-500', border: 'border-success-400', bg: 'bg-success-50', isHollow: false };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('alerts.title')}</h1>

      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all' as const, label: t('equipment.filters.all'), activeClass: 'bg-primary-600 text-white shadow-sm' },
          { key: 'past_removal' as const, label: t('alerts.pastRemoval'), activeClass: 'bg-surface-800 text-white shadow-sm' },
          { key: 'close_to_removal' as const, label: t('alerts.closeToRemoval'), activeClass: 'bg-danger-600 text-white shadow-sm' },
        ]).map((btn) => (
          <button
            key={btn.key}
            onClick={() => setFilter(btn.key)}
            className={`px-4 py-2.5 rounded-xl transition-all duration-200 font-medium min-h-[44px] ${
              filter === btn.key
                ? btn.activeClass
                : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50 hover:border-surface-300'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => {
          const colors = getAlertDotColor(alert);
          return (
          <div
            key={alert.id}
            className={`p-4 rounded-2xl border-2 ${colors.border} ${colors.bg} transition-all duration-200`}
          >
            <div className="flex justify-between items-start gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className={`w-3 h-3 rounded-full mt-1.5 shrink-0 border-2 ${colors.isHollow ? `border-surface-400 bg-transparent` : `${colors.border} ${colors.dot}`}`} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-surface-800 text-sm sm:text-base">
                    {alert.siteName || t('equipment.title')}
                  </h3>
                  <p className="text-sm text-surface-500 mt-0.5 truncate">
                    {alert.siteAddress}
                  </p>
                  {alert.siteContact && (
                    <p className="text-xs text-surface-400 mt-0.5">
                      {t('sites.contact1')}: {alert.siteContact}
                    </p>
                  )}
                  <p className="text-sm font-medium mt-1.5 text-surface-700">
                    {alert.daysRemaining > 0
                      ? `${alert.daysRemaining} ${t('alerts.daysRemaining')}`
                      : `${Math.abs(alert.daysRemaining)} ${t('alerts.daysOverdue')}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {alert.sitePhone && (
                  <a
                    href={`tel:${alert.sitePhone}`}
                    className="px-3 py-2 bg-success-500 text-white rounded-xl text-sm font-medium hover:bg-success-600 transition-colors flex items-center gap-1.5 justify-center"
                  >
                    📞
                  </a>
                )}
                <Link
                  to={alert.workOrderId ? `/workorders/${alert.workOrderId}` : `/equipment/${alert.equipmentId}`}
                  className="px-3 py-2 bg-white border border-surface-200 rounded-xl text-sm font-medium text-surface-700 hover:bg-surface-50 transition-colors text-center"
                >
                  {alert.workOrderId ? t('workOrders.details') : t('equipment.details')}
                </Link>
              </div>
            </div>
          </div>
        );
        })}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12">
          <span className="text-3xl block mb-2">✅</span>
          <p className="text-surface-400 text-sm">{t('errors.notFound')}</p>
        </div>
      )}
    </div>
  );
}
