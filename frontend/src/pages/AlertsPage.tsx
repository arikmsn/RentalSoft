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

  useEffect(() => {
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
    fetchAlerts();
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    return filter === 'all' || alert.type === filter;
  });

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'past_removal':
        return 'bg-red-50 border-red-200';
      case 'close_to_removal':
        return 'bg-orange-50 border-orange-200';
      case 'long_stay':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t('alerts.title')}</h1>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('equipment.filters.all')}
        </button>
        <button
          onClick={() => setFilter('past_removal')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'past_removal'
              ? 'bg-red-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('alerts.pastRemoval')}
        </button>
        <button
          onClick={() => setFilter('close_to_removal')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'close_to_removal'
              ? 'bg-orange-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('alerts.closeToRemoval')}
        </button>
      </div>

      <div className="space-y-3">
        {filteredAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-4 rounded-xl border ${getAlertColor(alert.type)}`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">
                  {t(`alerts.${alert.type.replace('_', '')}`)}
                </h3>
                <p className="text-sm mt-1">
                  {alert.daysRemaining > 0
                    ? `${alert.daysRemaining} ${t('alerts.daysRemaining')}`
                    : `${Math.abs(alert.daysRemaining)} ${t('alerts.daysOverdue')}`}
                </p>
              </div>
              <Link
                to={`/equipment/${alert.equipmentId}`}
                className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
              >
                {t('equipment.details')}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredAlerts.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          ✅ {t('errors.notFound')}
        </div>
      )}
    </div>
  );
}
