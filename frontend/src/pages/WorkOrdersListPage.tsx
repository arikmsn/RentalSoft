import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { WorkOrder, WorkOrderStatus, Site } from '../types';
import { workOrderService } from '../services/workOrderService';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDate } from '../utils/date';

const statusColors: Record<WorkOrderStatus, string> = {
  open: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-warning-100 text-warning-700',
  completed: 'bg-success-100 text-success-700',
};

const statusDotColors: Record<string, string> = {
  black: 'bg-surface-800',
  red: 'bg-danger-500',
  orange: 'bg-warning-500',
  green: 'bg-success-500',
};

export function WorkOrdersListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; name: string; active: boolean}[]>([]);
  const [workTypes, setWorkTypes] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    workTypeId: '',
    siteId: '',
    technicianId: '',
    plannedDate: '',
    plannedRemovalDate: '',
    isNextVisitPotentialRemoval: false,
  });

  useEffect(() => {
    Promise.all([
      workOrderService.getAll(),
      siteService.getAll({ isActive: true }),
      api.get('/settings/technicians').then(res => res.data),
    ]).then(([woData, siteData, techData]) => {
      setWorkOrders(woData);
      // Deduplicate by ID
      const uniqueSites = siteData.filter((site, index, self) => 
        index === self.findIndex(s => s.id === site.id)
      );
      // Only show active technicians
      const activeTechs = (techData as {id: string; name: string; active: boolean}[])
        .filter(t => t.active !== false);
      const uniqueTechs = activeTechs.filter((tech, index, self) => 
        index === self.findIndex(t => t.id === tech.id)
      );
      setSites(uniqueSites);
      setTechnicians(uniqueTechs);
    }).catch((err) => {
      console.error('Failed to fetch data:', err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    api.get<{id: string; name: string; isActive: boolean}[]>('/settings/work-order-types').then(res => {
      setWorkTypes(res.data.filter((wt: any) => wt.isActive !== false));
    }).catch(err => console.error('Failed to fetch work types:', err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workOrderService.create({
        type: formData.type || undefined,
        workTypeId: formData.workTypeId || undefined,
        siteId: formData.siteId,
        technicianId: formData.technicianId,
        plannedDate: new Date(formData.plannedDate),
        plannedRemovalDate: formData.plannedRemovalDate ? new Date(formData.plannedRemovalDate) : undefined,
        isNextVisitPotentialRemoval: formData.isNextVisitPotentialRemoval,
      });
      setShowForm(false);
      setFormData({ type: '', workTypeId: '', siteId: '', technicianId: '', plannedDate: '', plannedRemovalDate: '', isNextVisitPotentialRemoval: false });
      const data = await workOrderService.getAll();
      setWorkOrders(data);
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      alert(err?.response?.data?.message || 'Failed to create work order');
    } finally {
      setSaving(false);
    }
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return wo.status === 'completed';
    if (filter === 'active') return wo.status === 'open' || wo.status === 'in_progress';
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  const canCreate = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('workOrders.title')}</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            + {t('workOrders.addNew')}
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-200 font-medium min-h-[44px] ${
            filter === 'active'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50 hover:border-surface-300'
          }`}
        >
          {t('workOrders.filters.active')}
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-200 font-medium min-h-[44px] ${
            filter === 'completed'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50 hover:border-surface-300'
          }`}
        >
          {t('workOrders.statuses.completed')}
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2.5 rounded-xl transition-all duration-200 font-medium min-h-[44px] ${
            filter === 'all'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50 hover:border-surface-300'
          }`}
        >
          {t('equipment.filters.all')}
        </button>
      </div>

      {/* View mode toggle - mobile: top-left, desktop: right side */}
      <div className="block lg:hidden mb-3">
        <div className="flex gap-2 bg-white border border-surface-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
              viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            📋 {t('workOrders.viewList')}
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
              viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            📅 {t('workOrders.viewCalendar')}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex gap-2 bg-white border border-surface-200 rounded-xl p-1 ml-auto w-fit">
        <button
          onClick={() => setViewMode('list')}
          className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
          }`}
        >
          📋 {t('workOrders.viewList')}
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
          }`}
        >
          📅 {t('workOrders.viewCalendar')}
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <WeeklyCalendar workOrders={filteredWorkOrders} t={t} />
      ) : (
        <>
          <div className="space-y-3">
            {filteredWorkOrders.map((wo) => (
              <Link
                key={wo.id}
                to={`/workorders/${wo.id}`}
                className="block bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div>
                      <h3 className="font-semibold text-surface-800 flex items-center gap-2">
                        {wo.status !== 'completed' && wo.statusColor && (wo.equipmentCount ? (
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[wo.statusColor] || 'bg-surface-300'}`}
                          />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-surface-400" />
                        ))}
                        {wo.site ? wo.site.name : ''}
                      </h3>
                      <p className="text-sm text-surface-500 mt-1">
                        {wo.workTypeName || wo.type || t('workOrders.workType')}
                        {wo.site ? `, ${wo.site.city}` : ''}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {t('workOrders.plannedDate')}: <span className="font-medium">{formatDate(wo.plannedDate)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[wo.status]}`}>
                      {t(`workOrders.statuses.${wo.status}`)}
                    </span>
                    {wo.equipmentCount !== undefined && wo.equipmentCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded-full">
                        <span>🔧</span>
                        <span>{wo.equipmentCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredWorkOrders.length === 0 && (
            <div className="text-center py-12 text-surface-500">
              {t('errors.notFound')}
            </div>
          )}
        </>
      )}

      {/* Add Work Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">{t('workOrders.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.workType')}</label>
                <select
                  required
                  value={formData.workTypeId}
                  onChange={(e) => {
                    const selected = workTypes.find(wt => wt.id === e.target.value);
                    if (selected) {
                      setFormData({ ...formData, type: selected.name, workTypeId: selected.id });
                    } else {
                      setFormData({ ...formData, type: '', workTypeId: '' });
                    }
                  }}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {workTypes.map(wt => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.site')}</label>
                <select
                  required
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.technician')}</label>
                <select
                  required
                  value={formData.technicianId}
                  onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.plannedDate')}</label>
                <input
                  type="date"
                  required
                  value={formData.plannedDate}
                  onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.nextVisit')}</label>
                <input
                  type="date"
                  value={formData.plannedRemovalDate}
                  onChange={(e) => setFormData({ ...formData, plannedRemovalDate: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNextVisitPotentialRemoval}
                    onChange={(e) => setFormData({ ...formData, isNextVisitPotentialRemoval: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600"
                  />
                  <span className="text-sm text-surface-700">{t('equipment.isPotentialRemoval')}</span>
                </label>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200"
                >
                  {saving ? t('app.loading') : t('app.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function WeeklyCalendar({ workOrders, t }: { workOrders: WorkOrder[]; t: any }) {
  const today = new Date();
  const [dateRange, setDateRange] = useState({ start: today, days: 6 });
  const [savingDate, setSavingDate] = useState<string | null>(null);

  const getDaysInRange = () => {
    const days: { date: Date; label: string }[] = [];
    for (let i = 0; i <= dateRange.days; i++) {
      const d = new Date(dateRange.start);
      d.setDate(dateRange.start.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        date: d,
        label: isToday ? `${t('app.today')}` : d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }),
      });
    }
    return days;
  };

  const days = getDaysInRange();

  const getWorkOrdersForDay = (date: Date) => {
    return workOrders.filter(wo => {
      if (!wo.plannedDate) return false;
      const woDate = new Date(wo.plannedDate);
      return woDate.toDateString() === date.toDateString();
    });
  };

  const handleRangeChange = (days: number) => {
    setDateRange({ start: today, days });
  };

  const handleDateChange = async (woId: string, newDate: string) => {
    setSavingDate(woId);
    try {
      await workOrderService.update(woId, {
        plannedDate: new Date(newDate),
      });
      window.location.reload();
    } catch (err) {
      console.error('Failed to update date:', err);
    } finally {
      setSavingDate(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-surface-800">{t('workOrders.weeklyCalendar')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleRangeChange(6)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 6 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            שבוע
          </button>
          <button
            onClick={() => handleRangeChange(13)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 13 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            שבועיים
          </button>
          <button
            onClick={() => handleRangeChange(29)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 29 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            חודש
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {days.map((day, idx) => {
          const dayWorkOrders = getWorkOrdersForDay(day.date);
          return (
            <div key={idx} className="border-b border-surface-100 pb-4 last:border-0">
              <div className="text-sm font-medium text-surface-700 mb-2 flex items-center gap-2">
                <span className={day.date.toDateString() === today.toDateString() ? 'text-primary-600' : ''}>
                  {day.label}
                </span>
                {dayWorkOrders.length > 0 && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    {dayWorkOrders.length}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {dayWorkOrders.map(wo => (
                  <div
                    key={wo.id}
                    className={`block p-3 rounded-xl text-sm ${
                      wo.status === 'completed' ? 'bg-success-50 border border-success-100' :
                      wo.status === 'in_progress' ? 'bg-warning-50 border border-warning-100' :
                      'bg-primary-50 border border-primary-100'
                    }`}
                  >
                    <Link to={`/workorders/${wo.id}`} className="block">
                      <div className="font-medium text-surface-800">{wo.workTypeName || wo.type}</div>
                      <div className="text-surface-600 text-xs mt-1">{wo.site?.address}</div>
                    </Link>
                    <div className="mt-2 pt-2 border-t border-surface-200 flex items-center gap-2">
                      <label className="text-xs text-surface-500">{t('equipment.nextVisit')}:</label>
                      <input
                        type="date"
                        value={wo.plannedDate ? new Date(wo.plannedDate).toISOString().split('T')[0] : ''}
                        onChange={(e) => handleDateChange(wo.id, e.target.value)}
                        disabled={savingDate === wo.id}
                        className="text-xs px-2 py-1 border border-surface-200 rounded focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                ))}
                {dayWorkOrders.length === 0 && (
                  <div className="text-xs text-surface-400 py-2">-</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-surface-200 text-sm text-surface-500">
        {t('workOrders.weeklyTotal')}: {workOrders.length} {t('workOrders.title').toLowerCase()}
      </div>
    </div>
  );
}
