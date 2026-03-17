import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useMyTasks } from '../hooks/useOfflineApi';
import { useAuthStore } from '../stores/authStore';
import type { DBSite } from '../offline/db';
import { formatDate } from '../utils/date';

const typeIcons: Record<string, string> = {
  installation: '🔧',
  inspection: '🔍',
  removal: '📤',
  general: '📝',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
};

export function MyTasksPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { tasks, loading, error, fromCache, refetch } = useMyTasks(user?.id);

  const todaysTasks = tasks
    .filter((task) => {
      const planned = new Date(task.plannedDate);
      const today = new Date();
      return (
        planned.toDateString() === today.toDateString() &&
        task.status !== 'completed'
      );
    })
    .sort((a, b) => {
      if (a.status !== b.status) {
        const statusOrder: Record<string, number> = { open: 0, in_progress: 1 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime();
    });

  const upcomingTasks = tasks
    .filter((task) => {
      const planned = new Date(task.plannedDate);
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      return planned > today && planned <= nextWeek && task.status !== 'completed';
    })
    .slice(0, 5);

  const handleNavigate = (site: DBSite | undefined) => {
    if (!site) return;
    let wazeUrl = '';
    if (site.latitude && site.longitude) {
      wazeUrl = `https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`;
    } else {
      wazeUrl = `https://www.waze.com/ul?q=${encodeURIComponent(`${site.address}, ${site.city}`)}`;
    }
    window.open(wazeUrl, '_blank');
  };

  const handleCall = (phone: string | undefined) => {
    if (!phone) return;
    window.open(`tel:${phone}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error && !fromCache) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center px-4">{error}</div>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg min-h-[44px]"
        >
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Offline indicator */}
      {fromCache && (
        <div className="bg-yellow-50 text-yellow-700 px-3 py-2 rounded-lg text-sm flex items-center gap-2">
          <span>⚠️</span>
          <span>{t('sync.offline')} - {t('sync.syncedLater')}</span>
        </div>
      )}

      <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('navigation.myTasks')}</h1>

      {/* Today's Tasks */}
      <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
        <h2 className="text-base sm:text-lg font-semibold mb-3">{t('dashboard.todaysTasks')}</h2>
        
        {todaysTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4 sm:py-6">{t('myTasks.noTasksForToday')}</p>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="p-3 sm:p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                {/* Header: Type + Status + Time */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{typeIcons[task.type]}</span>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">
                        {t(`workOrders.types.${task.type}`)}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status]}`}>
                        {t(`workOrders.statuses.${task.status.replace('_', '')}`)}
                      </span>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(task.plannedDate).toLocaleTimeString('he-IL', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Site Info */}
                {task.site && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                    <p className="font-medium text-sm">{task.site.name}</p>
                    <p className="text-xs text-gray-500">{task.site.address}, {task.site.city}</p>
                    {task.site.contact1Phone && (
                      <button
                        onClick={() => handleCall(task.site?.contact1Phone)}
                        className="mt-1 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        📞 {task.site.contact1Phone}
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleNavigate(task.site)}
                    className="flex-1 px-3 py-2.5 sm:py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
                  >
                    <span>🚗</span>
                    <span className="hidden xs:inline">{t('sites.navigate')}</span>
                    <span className="xs:hidden">נווט</span>
                  </button>
                  <button
                    onClick={() => navigate(`/workorders/${task.id}`)}
                    className="flex-1 px-3 py-2.5 sm:py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors min-h-[44px]"
                  >
                    {t('app.actions')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold mb-3">{t('myTasks.upcoming')}</h2>
          <div className="space-y-2">
            {upcomingTasks.map((task) => (
              <Link
                key={task.id}
                to={`/workorders/${task.id}`}
                className="block p-2 sm:p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span>{typeIcons[task.type]}</span>
                    <span className="text-sm">{t(`workOrders.types.${task.type}`)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {task.site && (
                      <span className="text-xs text-gray-500 hidden sm:inline">{task.site.name}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(task.plannedDate)}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
