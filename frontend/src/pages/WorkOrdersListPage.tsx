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

const typeIcons: Record<string, string> = {
  installation: '🔧',
  inspection: '🔍',
  removal: '📤',
  general: '📝',
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
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'installation' as string,
    siteId: '',
    technicianId: '',
    plannedDate: '',
    plannedRemovalDate: '',
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
        type: formData.type,
        siteId: formData.siteId,
        technicianId: formData.technicianId,
        plannedDate: new Date(formData.plannedDate),
        plannedRemovalDate: formData.plannedRemovalDate ? new Date(formData.plannedRemovalDate) : undefined,
      });
      setShowForm(false);
      setFormData({ type: workTypes.length > 0 ? workTypes[0].name : 'installation', siteId: '', technicianId: '', plannedDate: '', plannedRemovalDate: '' });
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

      <div className="space-y-3">
        {filteredWorkOrders.map((wo) => (
          <Link
            key={wo.id}
            to={`/workorders/${wo.id}`}
            className="block bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl sm:text-3xl">{typeIcons[wo.type]}</span>
                <div>
                  <h3 className="font-semibold text-surface-800 flex items-center gap-2">
                    {wo.status !== 'completed' && wo.statusColor && (
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[wo.statusColor] || 'bg-surface-300'}`}
                        title={`${wo.statusColor === 'black' ? 'עבר תאריך' : wo.statusColor === 'red' ? 'הגיע הזמן' : wo.statusColor === 'orange' ? 'קרוב לפירוק' : 'יש זמן'}`}
                      />
                    )}
                    {workTypes.find(wt => wt.name === wo.type)?.name || wo.type}
                  </h3>
                  <p className="text-sm text-surface-500 mt-1">
                    {wo.site ? wo.site.name : ''}
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

      {/* Add Work Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">{t('workOrders.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.type')}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  {workTypes.length > 0 ? (
                    workTypes.map(wt => (
                      <option key={wt.id} value={wt.name}>{wt.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="installation">{t('workOrders.types.installation')}</option>
                      <option value="inspection">{t('workOrders.types.inspection')}</option>
                      <option value="removal">{t('workOrders.types.removal')}</option>
                      <option value="general">{t('workOrders.types.general')}</option>
                    </>
                  )}
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
              {(formData.type === 'installation' || formData.type === 'removal') && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.plannedRemoval')}</label>
                  <input
                    type="date"
                    value={formData.plannedRemovalDate}
                    onChange={(e) => setFormData({ ...formData, plannedRemovalDate: e.target.value })}
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                  />
                </div>
              )}
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
