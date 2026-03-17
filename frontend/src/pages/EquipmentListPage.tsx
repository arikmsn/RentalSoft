import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Equipment, EquipmentStatus, Site } from '../types';
import { equipmentService } from '../services/equipmentService';
import { siteService } from '../services/siteService';
import { QRScanner } from '../components/qr/QRScanner';

const statusColors: Record<EquipmentStatus, string> = {
  warehouse: 'bg-blue-100 text-blue-800',
  at_customer: 'bg-green-100 text-green-800',
  in_repair: 'bg-red-100 text-red-800',
  available: 'bg-gray-100 text-gray-800',
};

export function EquipmentListPage() {
  const { t } = useTranslation();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
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
  const [deleting, setDeleting] = useState(false);

  const handleDeleteEquipment = async () => {
    if (!selectedEquipment) return;
    const hasSite = selectedEquipment.siteId;
    const message = hasSite 
      ? t('equipment.deleteWarning')
      : t('app.confirmDelete') + '?';
    if (!confirm(message)) return;
    setDeleting(true);
    try {
      await equipmentService.delete(selectedEquipment.id);
      setShowDetails(false);
      setSelectedEquipment(null);
      const data = await equipmentService.getAll();
      setEquipment(data);
    } catch (err: any) {
      console.error('Failed to delete equipment:', err);
      alert(err?.response?.data?.message || 'Failed to delete equipment');
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    Promise.all([
      equipmentService.getAll(),
      siteService.getAll(),
    ]).then(([eqData, siteData]) => {
      setEquipment(eqData);
      setSites(siteData);
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

  const filteredEquipment = equipment.filter((eq) => {
    const matchesFilter = filter === 'all' || eq.status === filter;
    const matchesSearch = !search || 
      eq.qrTag.toLowerCase().includes(search.toLowerCase()) ||
      eq.type.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('equipment.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {t('equipment.addNew')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('app.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as EquipmentStatus | 'all')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
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
            onClick={() => handleViewDetails(eq)}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-semibold text-lg">{eq.qrTag}</h3>
                <p className="text-gray-500 text-sm">{eq.type}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[eq.status]}`}>
                {t(`equipment.statuses.${eq.status}`)}
              </span>
            </div>
            {eq.plannedRemovalDate && eq.status === 'at_customer' && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{t('equipment.plannedRemoval')}</span>
                  <span>{new Date(eq.plannedRemovalDate).toLocaleDateString('he-IL')}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
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
        <div className="text-center py-12 text-gray-500">
          {t('errors.notFound')}
        </div>
      )}

      {/* Add Equipment Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('equipment.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.qrTag')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={formData.qrTag}
                    onChange={(e) => setFormData({ ...formData, qrTag: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                    title={t('workOrder.scanQR')}
                  >
                    📷
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.type')}</label>
                <input
                  type="text"
                  required
                  list="equipmentTypes"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="equipmentTypes">
                  <option value="מכונה גדולה" />
                  <option value="מכונה בינונית" />
                  <option value="מכונה קטנה" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.status')}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as EquipmentStatus })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="warehouse">{t('equipment.statuses.warehouse')}</option>
                  <option value="available">{t('equipment.statuses.available')}</option>
                  <option value="at_customer">{t('equipment.statuses.at_customer')}</option>
                  <option value="in_repair">{t('equipment.statuses.in_repair')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.site')}</label>
                <select
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.condition')}</label>
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value as 'ok' | 'not_ok' | 'wearout' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ok">{t('equipment.conditions.ok')}</option>
                  <option value="not_ok">{t('equipment.conditions.notOk')}</option>
                  <option value="wearout">{t('equipment.conditions.wearout')}</option>
                </select>
              </div>
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

      {showScanner && (
        <QRScanner
          onScan={(qrValue) => {
            setFormData({ ...formData, qrTag: qrValue });
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showDetails && selectedEquipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('equipment.details')}</h2>
              <button
                type="button"
                onClick={handleDeleteEquipment}
                disabled={deleting}
                className="text-red-600 hover:text-red-700 p-1"
                title={t('app.delete')}
              >
                🗑️
              </button>
            </div>
            <form onSubmit={handleUpdateEquipment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.qrTag')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.qrTag}
                  onChange={(e) => setEditFormData({ ...editFormData, qrTag: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.type')}</label>
                <input
                  type="text"
                  required
                  list="equipmentTypes"
                  value={editFormData.type}
                  onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <datalist id="equipmentTypes">
                  <option value="מכונה גדולה" />
                  <option value="מכונה בינונית" />
                  <option value="מכונה קטנה" />
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.status')}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as EquipmentStatus })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="warehouse">{t('equipment.statuses.warehouse')}</option>
                  <option value="available">{t('equipment.statuses.available')}</option>
                  <option value="at_customer">{t('equipment.statuses.at_customer')}</option>
                  <option value="in_repair">{t('equipment.statuses.in_repair')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.site')}</label>
                <select
                  value={editFormData.siteId}
                  onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>{site.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.condition')}</label>
                <select
                  value={editFormData.condition}
                  onChange={(e) => setEditFormData({ ...editFormData, condition: e.target.value as 'ok' | 'not_ok' | 'wearout' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="ok">{t('equipment.conditions.ok')}</option>
                  <option value="not_ok">{t('equipment.conditions.notOk')}</option>
                  <option value="wearout">{t('equipment.conditions.wearout')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('equipment.plannedRemoval')}</label>
                <input
                  type="date"
                  value={editFormData.plannedRemovalDate}
                  onChange={(e) => setEditFormData({ ...editFormData, plannedRemovalDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('app.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {savingEdit ? t('app.loading') : t('app.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
