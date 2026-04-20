import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';

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

interface Area {
  id: string;
  name: string;
  localities: Locality[];
}

interface Locality {
  id: string;
  name: string;
  areaId: string | null;
  area?: { id: string; name: string } | null;
  isFixed?: boolean;
  isOverride?: boolean;
}

type TabType = 'workOrderTypes' | 'equipmentTypes' | 'technicians' | 'equipmentLocations' | 'whatsappTemplate' | 'leadSources' | 'areasAndLocalities';

export function SettingsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('workOrderTypes');
  const [items, setItems] = useState<(SettingsItem | Technician | EquipmentLocation | {id: string; name: string})[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [leadSourceInput, setLeadSourceInput] = useState('');

  const [areas, setAreas] = useState<Area[]>([]);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [localitySearch, setLocalitySearch] = useState('');
  const [newLocalityName, setNewLocalityName] = useState('');
  const [newLocalityAreaId, setNewLocalityAreaId] = useState('');
  const [newAreaName, setNewAreaName] = useState('');
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [savingArea, setSavingArea] = useState(false);
  const [savingLocality, setSavingLocality] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'areasAndLocalities') {
      fetchAreasAndLocalities();
    }
  }, [activeTab]);

  const addLeadSource = async () => {
    if (!leadSourceInput.trim()) return;
    try {
      await api.post('/settings/lead-sources', { name: leadSourceInput.trim() });
      setLeadSourceInput('');
      fetchItems();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'שגיאה בהוספה');
    }
  };

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
        case 'leadSources':
          url = '/settings/lead-sources';
          break;
        case 'whatsappTemplate':
          url = '/settings/whatsapp-template';
          break;
        case 'areasAndLocalities':
          url = '/settings/areas';
          break;
      }
      if (activeTab === 'whatsappTemplate') {
        const response = await api.get<{template?: string}>(url);
        setWhatsappTemplate(response.data?.template || '');
      } else if (activeTab === 'leadSources') {
        const response = await api.get<{id: string; name: string}[]>(url);
        setItems(response.data);
      } else {
        const response = await api.get(url);
        setItems(response.data);
      }
    } catch (error) {
      console.error('Error fetching items:', error);
      if (activeTab === 'whatsappTemplate') {
        setWhatsappTemplate('');
      } else {
        setError('session_expired');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAreasAndLocalities = async () => {
    setLoading(true);
    try {
      const [areasRes, localitiesRes] = await Promise.all([
        api.get<Area[]>('/settings/areas'),
        api.get<Locality[]>('/settings/localities'),
      ]);
      setAreas(areasRes.data);
      setLocalities(localitiesRes.data);
    } catch (err) {
      console.error('Error fetching areas/localities:', err);
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
        case 'leadSources':
          url = '/settings/lead-sources';
          break;
      }

      if (isEdit && activeTab !== 'technicians' && activeTab !== 'equipmentLocations') {
        url += `/${editingItem.id}`;
      }

      const payload = { ...formData };
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
        case 'leadSources':
          url = `/settings/lead-sources/${itemToDelete.id}`;
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

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    setSavingArea(true);
    try {
      await api.post('/settings/areas', { name: newAreaName.trim() });
      setNewAreaName('');
      fetchAreasAndLocalities();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'שגיאה בהוספה');
    } finally {
      setSavingArea(false);
    }
  };

  const handleUpdateArea = async (areaId: string, newName: string) => {
    if (!newName.trim()) return;
    setSavingArea(true);
    try {
      await api.put(`/settings/areas/${areaId}`, { name: newName.trim() });
      setEditingArea(null);
      fetchAreasAndLocalities();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'שגיאה בעדכון');
    } finally {
      setSavingArea(false);
    }
  };

  const handleAddLocality = async () => {
    if (!newLocalityName.trim()) return;
    setSavingLocality(true);
    try {
      await api.post('/settings/localities', {
        name: newLocalityName.trim(),
        areaId: newLocalityAreaId || null,
      });
      setNewLocalityName('');
      setNewLocalityAreaId('');
      fetchAreasAndLocalities();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'שגיאה בהוספה');
    } finally {
      setSavingLocality(false);
    }
  };

  const handleChangeLocalityArea = async (localityId: string, newAreaId: string) => {
    try {
      await api.patch(`/settings/localities/${localityId}/area`, { areaId: newAreaId || null });
      fetchAreasAndLocalities();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'שגיאה בעדכון');
    }
  };

  const filteredLocalities = useMemo(() => {
    if (!localitySearch.trim()) return localities;
    const search = localitySearch.toLowerCase().trim();
    return localities.filter(l => l.name.toLowerCase().includes(search));
  }, [localities, localitySearch]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'workOrderTypes', label: t('settings.workOrderTypes') },
    { key: 'equipmentTypes', label: t('settings.equipmentTypes') },
    { key: 'equipmentLocations', label: 'מיקומי ציוד' },
    { key: 'technicians', label: t('settings.technicians') },
  ];

  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  if (isManagerOrAdmin) {
    tabs.push(
      { key: 'whatsappTemplate', label: 'הודעת ווטסאפ' },
      { key: 'leadSources', label: 'מקורות לידים' },
      { key: 'areasAndLocalities', label: 'ערים ואזורים' }
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('settings.title')}</h1>

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

      {activeTab !== 'whatsappTemplate' && activeTab !== 'leadSources' && activeTab !== 'areasAndLocalities' && (
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
      )}

      <div className="bg-white rounded-2xl shadow-card border border-surface-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-surface-500">{t('app.loading')}</div>
        ) : error ? (
          <div className="p-8 text-center text-danger-600">{error === 'session_expired' ? 'מערכת עודכנה, נא להתחבר מחדש' : t('errors.serverError')}</div>
        ) : activeTab === 'whatsappTemplate' ? (
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h2 className="text-lg font-semibold mb-4">הודעת ווטסאפ לאתרים</h2>
            <textarea
              value={whatsappTemplate}
              onChange={(e) => setWhatsappTemplate(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
              placeholder="הזן תבנית הודעה..."
            />
            <button
              onClick={async () => {
                try {
                  await api.put('/settings/whatsapp-template', { template: whatsappTemplate });
                  alert('נשמר בהצלחה');
                } catch (err: any) {
                  alert(err?.response?.data?.message || 'שגיאה בשמירה');
                }
              }}
              className="mt-4 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-medium"
            >
              {t('app.save')}
            </button>
          </div>
        ) : activeTab === 'leadSources' ? (
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h2 className="text-lg font-semibold mb-4">מקורות לידים</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={leadSourceInput}
                onChange={(e) => setLeadSourceInput(e.target.value)}
                placeholder="הוסף מקור חדש..."
                className="flex-1 px-4 py-2 border border-surface-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLeadSource())}
              />
              <button
                onClick={addLeadSource}
                disabled={!leadSourceInput.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {t('app.add')}
              </button>
            </div>
            <div className="divide-y divide-surface-100">
              {items.map((item: any) => (
                <div key={item.id} className="p-3 flex items-center justify-between">
                  <span className="font-medium">{item.name}</span>
                  <button
                    onClick={async () => {
                      try {
                        await api.delete(`/settings/lead-sources/${item.id}`);
                        fetchItems();
                      } catch (err: any) {
                        alert(err?.response?.data?.message || 'שגיאה במחיקה');
                      }
                    }}
                    className="text-danger-600 hover:text-danger-700 p-1"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'areasAndLocalities' ? (
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">יישובים</h2>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={localitySearch}
                      onChange={(e) => setLocalitySearch(e.target.value)}
                      placeholder="חיפוש יישוב..."
                      className="px-3 py-1.5 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>
                </div>

                <div className="bg-surface-50 rounded-xl p-4">
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newLocalityName}
                      onChange={(e) => setNewLocalityName(e.target.value)}
                      placeholder="שם יישוב חדש..."
                      className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocality())}
                    />
                    <select
                      value={newLocalityAreaId}
                      onChange={(e) => setNewLocalityAreaId(e.target.value)}
                      className="px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                      <option value="">ללא אזור</option>
                      {areas.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddLocality}
                      disabled={!newLocalityName.trim() || savingLocality}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {savingLocality ? '...' : '+ הוסף'}
                    </button>
                  </div>

                  <div className="max-h-[400px] overflow-y-auto space-y-1">
                    {filteredLocalities.length === 0 ? (
                      <div className="text-center text-surface-500 py-4">אין יישובים</div>
                    ) : (
                      filteredLocalities.map(locality => (
                        <div key={locality.id} className="flex items-center gap-2 p-2 hover:bg-surface-100 rounded-lg">
                          <span className="flex-1 text-sm font-medium text-surface-800 truncate">{locality.name}</span>
                          {locality.isOverride && (
                            <span className="text-xs text-amber-600" title="התאמה ידנית">✎</span>
                          )}
                          <select
                            value={locality.areaId || ''}
                            onChange={(e) => handleChangeLocalityArea(locality.id, e.target.value)}
                            className="px-2 py-1 border border-surface-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                          >
                            <option value="">ללא אזור</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">אזורים</h2>
                </div>

                <div className="bg-surface-50 rounded-xl p-4">
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newAreaName}
                      onChange={(e) => setNewAreaName(e.target.value)}
                      placeholder="שם אזור חדש..."
                      className="flex-1 px-3 py-2 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddArea())}
                    />
                    <button
                      onClick={handleAddArea}
                      disabled={!newAreaName.trim() || savingArea}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
                    >
                      {savingArea ? '...' : '+'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    {areas.map(area => (
                      <div key={area.id} className="flex items-center gap-2 p-2 hover:bg-surface-100 rounded-lg group">
                        {editingArea?.id === area.id ? (
                          <>
                            <input
                              type="text"
                              defaultValue={editingArea.name}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdateArea(area.id, (e.target as HTMLInputElement).value);
                                if (e.key === 'Escape') setEditingArea(null);
                              }}
                              onBlur={(e) => handleUpdateArea(area.id, e.target.value)}
                              autoFocus
                              className="flex-1 px-2 py-1 border border-surface-200 rounded text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                            />
                            <button
                              onClick={() => setEditingArea(null)}
                              className="text-surface-400 hover:text-surface-600 text-sm"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="flex-1 text-sm font-medium text-surface-800">{area.name}</span>
                            <span className="text-xs text-surface-500 bg-surface-200 px-2 py-0.5 rounded-full">
                              {area.localities.length}
                            </span>
                            <button
                              onClick={() => setEditingArea(area)}
                              className="opacity-0 group-hover:opacity-100 text-surface-400 hover:text-primary-600 text-sm transition-opacity"
                            >
                              ✏️
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
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