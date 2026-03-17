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

type TabType = 'checklist' | 'workOrderTypes' | 'equipmentTypes' | 'equipmentStatuses' | 'equipmentConditions' | 'technicians';

export function SettingsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('checklist');
  const [items, setItems] = useState<SettingsItem[] | Technician[]>([]);
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
        case 'checklist':
          url = '/settings/checklist';
          break;
        case 'workOrderTypes':
          url = '/settings/work-order-types';
          break;
        case 'equipmentTypes':
          url = '/settings/equipment-types';
          break;
        case 'equipmentStatuses':
          url = '/settings/equipment-statuses';
          break;
        case 'equipmentConditions':
          url = '/settings/equipment-conditions';
          break;
        case 'technicians':
          url = '/settings/technicians';
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
      let method: 'post' | 'put' = 'post';
      switch (activeTab) {
        case 'checklist':
          url = '/settings/checklist';
          break;
        case 'workOrderTypes':
          url = '/settings/work-order-types';
          break;
        case 'equipmentTypes':
          url = '/settings/equipment-types';
          break;
        case 'equipmentStatuses':
          url = '/settings/equipment-statuses';
          break;
        case 'equipmentConditions':
          url = '/settings/equipment-conditions';
          break;
        case 'technicians':
          url = editingItem ? `/settings/technicians/${editingItem.id}` : '/settings/technicians';
          method = editingItem ? 'put' : 'post';
          break;
      }

      if (editingItem && activeTab !== 'technicians') {
        url += `/${editingItem.id}`;
      }

      if (method === 'post') {
        await api.post(url, formData);
      } else {
        await api.put(url, formData);
      }

      setShowForm(false);
      setEditingItem(null);
      setFormData({ name: '', code: '', isActive: true, sortOrder: 0, username: '', email: '', phone: '', password: '' });
      fetchItems();
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
      username: (item as Technician).username || '',
      email: (item as Technician).email || '',
      phone: (item as Technician).phone || '',
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
        case 'checklist':
          url = `/settings/checklist/${itemToDelete.id}`;
          break;
        case 'workOrderTypes':
          url = `/settings/work-order-types/${itemToDelete.id}`;
          break;
        case 'equipmentTypes':
          url = `/settings/equipment-types/${itemToDelete.id}`;
          break;
        case 'equipmentStatuses':
          url = `/settings/equipment-statuses/${itemToDelete.id}`;
          break;
        case 'equipmentConditions':
          url = `/settings/equipment-conditions/${itemToDelete.id}`;
          break;
        case 'technicians':
          url = `/settings/technicians/${itemToDelete.id}`;
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
    { key: 'checklist', label: t('settings.checklist') },
    { key: 'workOrderTypes', label: t('settings.workOrderTypes') },
    { key: 'equipmentTypes', label: t('settings.equipmentTypes') },
    { key: 'equipmentStatuses', label: t('settings.equipmentStatuses') },
    { key: 'equipmentConditions', label: t('settings.equipmentConditions') },
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
            {items.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-50">
                <div className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-success-500' : 'bg-surface-300'}`}></span>
                  <div>
                    <p className="font-medium text-surface-800">{item.name}</p>
                    {(item as Technician).username && (
                      <p className="text-sm text-surface-500">{(item as Technician).username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-surface-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 text-surface-600 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
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
                    <label className="block text-sm font-medium text-surface-700 mb-2">{t('auth.username')}</label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">{t('auth.email')}</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                    />
                  </div>
                  {!editingItem && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-2">{t('auth.password')}</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-surface-700 mb-2">{t('auth.phone')}</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  {(activeTab === 'equipmentTypes' || activeTab === 'equipmentStatuses' || activeTab === 'equipmentConditions') && (
                    <div>
                      <label className="block text-sm font-medium text-surface-700 mb-2">{t('settings.code')}</label>
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                      />
                    </div>
                  )}
                </>
              )}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="text-sm text-surface-700">{t('settings.active')}</label>
              </div>
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
