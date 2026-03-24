import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api } from '../services/api';

interface SettingsItem {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
  sortOrder: number;
}

interface Technician {
  id: string;
  name: string;
  username: string;
  email: string;
  phone?: string;
  isActive: boolean;
}

interface EquipmentLocation {
  id: string;
  name: string;
  isSystem: boolean;
  isDefaultCustomer: boolean;
}

type TabType = 'workOrderTypes' | 'equipmentTypes' | 'technicians' | 'equipmentLocations';

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('workOrderTypes');
  const [items, setItems] = useState<(SettingsItem | Technician | EquipmentLocation)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SettingsItem | Technician | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<SettingsItem | Technician | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    isActive: true,
    sortOrder: 0,
    username: '',
    email: '',
    phone: '',
    password: '',
  });

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      let url = '';
      switch (activeTab) {
        case 'workOrderTypes':
          url = '/settings/work-order-types';
          break;
        case 'equipmentTypes':
          url = '/settings/equipment-types';
          break;
        case 'technicians':
          url = '/settings/technicians';
          break;
        case 'equipmentLocations':
          url = '/settings/equipment-locations';
          break;
      }
      const response = await api.get(url);
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let url = '';
      const isEdit = !!editingItem;
      
      switch (activeTab) {
        case 'workOrderTypes':
          url = '/settings/work-order-types';
          break;
        case 'equipmentTypes':
          url = '/settings/equipment-types';
          break;
        case 'technicians':
          url = '/settings/technicians';
          break;
        case 'equipmentLocations':
          url = '/settings/equipment-locations';
          break;
      }

      // Append ID for edit (except technicians which already has it in the switch)
      if (isEdit && activeTab !== 'technicians' && activeTab !== 'equipmentLocations') {
        url += `/${editingItem.id}`;
      }

      const payload = { ...formData };
      // Remove unused fields for technicians
      if (activeTab === 'technicians') {
        delete (payload as any).code;
        delete (payload as any).sortOrder;
        delete (payload as any).username;
        delete (payload as any).email;
        delete (payload as any).phone;
        delete (payload as any).password;
      }

      if (isEdit && activeTab === 'equipmentLocations') {
        await api.put(`${url}/${editingItem.id}`, payload);
      } else if (isEdit) {
        await api.put(`${url}/${editingItem.id}`, payload);
      } else {
        await api.post(url, payload);
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: '', code: '', isActive: true, sortOrder: 0, username: '', email: '', phone: '', password: '' });
      fetchItems();
      alert(isEdit ? 'עודכן בהצלחה' : 'נוסף בהצלחה');
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(error?.response?.data?.message || t('errors.serverError'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: SettingsItem | Technician) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: (item as SettingsItem).code || '',
      isActive: item.isActive,
      sortOrder: (item as SettingsItem).sortOrder || 0,
      username: '',
      email: '',
      phone: '',
      password: '',
    });
    setShowForm(true);
  };

  const handleDelete = (item: SettingsItem | Technician) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      let url = '';
      switch (activeTab) {
        case 'workOrderTypes':
          url = `/settings/work-order-types/${itemToDelete.id}`;
          break;
        case 'equipmentTypes':
          url = `/settings/equipment-types/${itemToDelete.id}`;
          break;
        case 'technicians':
          url = `/settings/technicians/${itemToDelete.id}`;
          break;
        case 'equipmentLocations':
          url = `/settings/equipment-locations/${itemToDelete.id}`;
          break;
      }
      await api.delete(url);
      fetchItems();
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(error?.response?.data?.message || t('errors.serverError'));
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const tabs: { key: TabType; label: string }[] = [
    { key: 'workOrderTypes', label: t('settings.workOrderTypes') },
    { key: 'equipmentTypes', label: t('settings.equipmentTypes') },
    { key: 'equipmentLocations', label: 'מיקומי ציוד' },
    { key: 'technicians', label: t('settings.technicians') },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('settings.title')}</h1>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            setEditingItem(null);
            setFormData({ name: '', code: '', isActive: true, sortOrder: 0, username: '', email: '', phone: '', password: '' });
            setShowForm(true);
          }}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 shadow-sm"
        >
          + {t('app.add')}
        </button>
      </div>

      {/* Items List */}
      <div className="bg-white rounded-2xl shadow-card border border-surface-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-500">{t('app.loading')}</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-surface-500">{t('errors.notFound')}</div>
        ) : (
          <div className="divide-y divide-surface-100">
            {items.map((item) => {
              const itemAny = item as any;
              const isSystemLocation = activeTab === 'equipmentLocations' && itemAny.isSystem;
              const isActive = activeTab === 'equipmentLocations' ? true : itemAny.isActive;
              return (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-50">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-success-500' : 'bg-surface-300'}`}></span>
                  <div>
                    <p className="font-medium text-surface-800">{item.name}</p>
                    {itemAny.username && (
                      <p className="text-sm text-surface-500">{itemAny.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => !isSystemLocation && handleEdit(itemAny)}
                    disabled={isSystemLocation}
                    className={`p-2 rounded-lg transition-colors ${isSystemLocation ? 'text-surface-300 cursor-not-allowed' : 'text-surface-600 hover:text-primary-600 hover:bg-primary-50'}`}
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => !isSystemLocation && handleDelete(itemAny)}
                    disabled={isSystemLocation}
                    className={`p-2 rounded-lg transition-colors ${isSystemLocation ? 'text-surface-300 cursor-not-allowed' : 'text-surface-600 hover:text-danger-600 hover:bg-danger-50'}`}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">
              {editingItem ? t('app.edit') : t('app.add')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeTab === 'technicians' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">{t('settings.technicianName')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">{t('settings.name')}</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                    />
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingItem(null); }}
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && itemToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={t('app.delete')}
          message={t('app.confirmDelete') + '?'}
          confirmLabel={t('app.delete')}
          onConfirm={confirmDelete}
          onCancel={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}
          variant="danger"
        />
      )}
    </div>
  );
}
