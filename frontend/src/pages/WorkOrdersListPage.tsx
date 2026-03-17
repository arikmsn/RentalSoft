import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { WorkOrder, WorkOrderStatus, Site, User } from '../types';
import { workOrderService } from '../services/workOrderService';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const statusColors: Record<WorkOrderStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
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
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<WorkOrderStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: 'installation' as 'installation' | 'inspection' | 'removal' | 'general',
    siteId: '',
    technicianId: '',
    plannedDate: '',
    plannedRemovalDate: '',
  });

  useEffect(() => {
    Promise.all([
      workOrderService.getAll(),
      siteService.getAll(),
      api.get<User[]>('/users/technicians').then(res => res.data),
    ]).then(([woData, siteData, techData]) => {
      setWorkOrders(woData);
      // Deduplicate by ID
      const uniqueSites = siteData.filter((site, index, self) => 
        index === self.findIndex(s => s.id === site.id)
      );
      const uniqueTechs = techData.filter((tech, index, self) => 
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
      setFormData({ type: 'installation', siteId: '', technicianId: '', plannedDate: '', plannedRemovalDate: '' });
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
    return filter === 'all' || wo.status === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  const canCreate = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('workOrders.title')}</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            {t('workOrders.addNew')}
          </button>
        )}
      </div>

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
          onClick={() => setFilter('open')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'open'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('workOrders.statuses.open')}
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'in_progress'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('workOrders.statuses.inProgress')}
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            filter === 'completed'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
          }`}
        >
          {t('workOrders.statuses.completed')}
        </button>
      </div>

      <div className="space-y-3">
        {filteredWorkOrders.map((wo) => (
          <Link
            key={wo.id}
            to={`/workorders/${wo.id}`}
            className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{typeIcons[wo.type]}</span>
                <div>
                  <h3 className="font-semibold">
                    {t(`workOrders.types.${wo.type}`)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('workOrders.plannedDate')}: {new Date(wo.plannedDate).toLocaleDateString('he-IL')}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[wo.status]}`}>
                {t(`workOrders.statuses.${wo.status.replace('_', '')}`)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {filteredWorkOrders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('errors.notFound')}
        </div>
      )}

      {/* Add Work Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('workOrders.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.type')}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="installation">{t('workOrders.types.installation')}</option>
                  <option value="inspection">{t('workOrders.types.inspection')}</option>
                  <option value="removal">{t('workOrders.types.removal')}</option>
                  <option value="general">{t('workOrders.types.general')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.site')}</label>
                <select
                  required
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.technician')}</label>
                <select
                  required
                  value={formData.technicianId}
                  onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workOrders.plannedDate')}</label>
                <input
                  type="datetime-local"
                  required
                  value={formData.plannedDate}
                  onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {(formData.type === 'installation' || formData.type === 'removal') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.plannedRemoval')}</label>
                  <input
                    type="date"
                    value={formData.plannedRemovalDate}
                    onChange={(e) => setFormData({ ...formData, plannedRemovalDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
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
