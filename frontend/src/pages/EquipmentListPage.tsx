import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Equipment, EquipmentStatus, Site } from '../types';
import { equipmentService } from '../services/equipmentService';
import { siteService } from '../services/siteService';
import { QRScanner } from '../components/qr/QRScanner';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api } from '../services/api';
import { formatDate } from '../utils/date';

interface SettingsEquipmentType {
  id: string;
  name: string;
  code?: string;
  isActive?: boolean;
}

const statusColors: Record<EquipmentStatus, string> = {
  warehouse: 'bg-primary-100 text-primary-700',
  at_customer: 'bg-success-100 text-success-700',
  in_repair: 'bg-danger-100 text-danger-700',
  available: 'bg-surface-100 text-surface-600',
};

export function EquipmentListPage() {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<SettingsEquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EquipmentStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    qrTag: '',
    type: '',
    status: 'warehouse' as EquipmentStatus,
    siteId: '',
    condition: 'ok' as 'ok' | 'not_ok' | 'wearout',
  });
  const [editFormData, setEditFormData] = useState({
    qrTag: '',
    type: '',
    status: 'warehouse' as EquipmentStatus,
    siteId: '',
    condition: 'ok' as 'ok' | 'not_ok' | 'wearout',
    plannedRemovalDate: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteEquipment = () => {
    if (!selectedEquipment) return;
    setShowDetails(false);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!selectedEquipment) return;
    try {
      await equipmentService.delete(selectedEquipment.id);
      setSelectedEquipment(null);
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (err: any) {
      console.error('Failed to delete equipment:', err);
      alert(err?.response?.data?.message || 'Failed to delete equipment');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  useEffect(() => {
    Promise.all([
      equipmentService.getAll(),
      siteService.getAll(),
      api.get<SettingsEquipmentType[]>('/settings/equipment-types').then(res => res.data),
    ]).then(([eqData, siteData, typesData]) => {
      setEquipment(eqData);
      setSites(siteData);
      setEquipmentTypes(typesData.filter((t: SettingsEquipmentType) => t.isActive !== false));
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
      await equipmentService.create({
        ...formData,
        siteId: formData.siteId || undefined,
      });
      setShowForm(false);
      setFormData({ qrTag: '', type: '', status: 'warehouse', siteId: '', condition: 'ok' });
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (err: any) {
      console.error('Failed to create equipment:', err);
      alert(err?.response?.data?.message || 'Failed to create equipment');
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetails = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setEditFormData({
      qrTag: eq.qrTag,
      type: eq.type,
      status: eq.status,
      siteId: eq.siteId || '',
      condition: eq.condition,
      plannedRemovalDate: eq.plannedRemovalDate ? new Date(eq.plannedRemovalDate).toISOString().split('T')[0] : '',
    });
    setShowDetails(true);
  };

  const handleUpdateEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEquipment) return;
    setSavingEdit(true);
    try {
      await equipmentService.update(selectedEquipment.id, {
        ...editFormData,
        siteId: editFormData.siteId || undefined,
        plannedRemovalDate: editFormData.plannedRemovalDate ? new Date(editFormData.plannedRemovalDate) : undefined,
      });
      setShowDetails(false);
      setSelectedEquipment(null);
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (err: any) {
      console.error('Failed to update equipment:', err);
      alert(err?.response?.data?.message || 'Failed to update equipment');
    } finally {
      setSavingEdit(false);
    }
  };

  const getProgressColor = (plannedRemoval?: Date) => {
    if (!plannedRemoval) return 'bg-gray-200';
    const now = new Date();
    const planned = new Date(plannedRemoval);
    const installed = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const total = planned.getTime() - installed.getTime();
    const elapsed = now.getTime() - installed.getTime();
    const percentage = (elapsed / total) * 100;

    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const filteredEquipment = equipment
    .filter((eq) => {
      const matchesFilter = filter === 'all' || eq.status === filter;
      const matchesSearch = !search || 
        eq.qrTag.toLowerCase().includes(search.toLowerCase()) ||
        eq.type.toLowerCase().includes(search.toLowerCase());
      return matchesFilter && matchesSearch;
    })
    .sort((a, b) => a.qrTag.localeCompare(b.qrTag, 'he'));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('equipment.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          + {t('equipment.addNew')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('app.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 placeholder:text-surface-400"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EquipmentStatus | 'all')}
          className="px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 min-h-[48px]"
        >
          <option value="all">{t('equipment.filters.all')}</option>
          <option value="at_customer">{t('equipment.filters.atCustomer')}</option>
          <option value="warehouse">{t('equipment.filters.inWarehouse')}</option>
          <option value="in_repair">{t('equipment.filters.inRepair')}</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredEquipment.map((eq) => (
          <div
            key={eq.id}
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1" onClick={() => handleViewDetails(eq)}>
                <h3 className="font-semibold text-lg text-surface-800 cursor-pointer">{eq.qrTag}</h3>
                <p className="text-surface-500 text-sm mt-0.5">{eq.type}</p>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleViewDetails(eq);
                  }}
                  className="p-2 hover:bg-surface-100 rounded-lg transition-colors"
                  title={t('app.actions')}
                >
                  <svg className="w-5 h-5 text-surface-500" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="19" r="2" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[eq.status]}`}>
                {t(`equipment.statuses.${eq.status}`)}
              </span>
              {eq.siteId && (
                <span className="text-xs text-surface-500">
                  {sites.find(s => s.id === eq.siteId)?.name}
                </span>
              )}
            </div>
            {eq.plannedRemovalDate && eq.status === 'at_customer' && (
              <div className="mt-4 pt-3 border-t border-surface-100">
                <div className="flex justify-between text-xs text-surface-500 mb-2">
                  <span>{t('equipment.plannedRemoval')}</span>
                  <span className="font-medium">{formatDate(eq.plannedRemovalDate)}</span>
                </div>
                <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(eq.plannedRemovalDate)} transition-all`}
                    style={{ width: '50%' }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEquipment.length === 0 && (
        <div className="text-center py-12 text-surface-500">
          {t('errors.notFound')}
        </div>
      )}

      {/* Add Equipment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">{t('equipment.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.qrTag')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.qrTag}
                    onChange={(e) => setFormData({ ...formData, qrTag: e.target.value })}
                    className="flex-1 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-3 bg-surface-100 border border-surface-200 rounded-xl hover:bg-surface-200 transition-colors"
                    title={t('workOrder.scanQR')}
                  >
                    📷
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.type')}</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="warehouse">{t('equipment.statuses.warehouse')}</option>
                  <option value="available">{t('equipment.statuses.available')}</option>
                  <option value="at_customer">{t('equipment.statuses.at_customer')}</option>
                  <option value="in_repair">{t('equipment.statuses.in_repair')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.site')}</label>
                <select
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
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.condition')}</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as 'ok' | 'not_ok' | 'wearout' })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="ok">{t('equipment.conditions.ok')}</option>
                  <option value="not_ok">{t('equipment.conditions.notOk')}</option>
                  <option value="wearout">{t('equipment.conditions.wearout')}</option>
                </select>
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

      {showScanner && (
        <QRScanner
          onScan={(qrValue) => {
            if (showDetails && selectedEquipment) {
              setEditFormData({ ...editFormData, qrTag: qrValue });
            } else {
              setFormData({ ...formData, qrTag: qrValue });
            }
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showDetails && selectedEquipment && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-surface-800">{t('equipment.details')}</h2>
              <button
                type="button"
                onClick={handleDeleteEquipment}
                className="text-danger-600 hover:text-danger-700 p-2 rounded-lg hover:bg-danger-50 transition-colors"
                title={t('app.delete')}
              >
                🗑️
              </button>
            </div>
            <form onSubmit={handleUpdateEquipment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.qrTag')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editFormData.qrTag}
                    onChange={(e) => setEditFormData({ ...editFormData, qrTag: e.target.value })}
                    className="flex-1 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-3 bg-surface-100 border border-surface-200 rounded-xl hover:bg-surface-200 transition-colors"
                    title={t('workOrder.scanQR')}
                  >
                    📷
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.type')}</label>
                <select
                  required
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {equipmentTypes.map((type) => (
                    <option key={type.id} value={type.name}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.status')}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as EquipmentStatus })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="warehouse">{t('equipment.statuses.warehouse')}</option>
                  <option value="available">{t('equipment.statuses.available')}</option>
                  <option value="at_customer">{t('equipment.statuses.at_customer')}</option>
                  <option value="in_repair">{t('equipment.statuses.in_repair')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.site')}</label>
                <select
                  value={editFormData.siteId}
                  onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.condition')}</label>
                <select
                  value={editFormData.condition}
                  onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value as 'ok' | 'not_ok' | 'wearout' })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="ok">{t('equipment.conditions.ok')}</option>
                  <option value="not_ok">{t('equipment.conditions.notOk')}</option>
                  <option value="wearout">{t('equipment.conditions.wearout')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.plannedRemoval')}</label>
                <input
                  type="date"
                  value={editFormData.plannedRemovalDate}
                  onChange={(e) => setEditFormData({ ...editFormData, plannedRemovalDate: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200"
                >
                  {savingEdit ? t('app.loading') : t('app.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedEquipment && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={t('app.delete')}
          message={selectedEquipment.siteId ? t('equipment.deleteWarning') : t('app.confirmDelete') + '?'}
          confirmLabel={t('app.delete')}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
          variant="danger"
        />
      )}
    </div>
  );
}
