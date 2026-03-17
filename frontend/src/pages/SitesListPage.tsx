import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Site } from '../types';
import { siteService } from '../services/siteService';
import { useAuthStore } from '../stores/authStore';

export function SitesListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    floor: '',
    contact1Name: '',
    contact1Phone: '',
    rating: 3,
    isHighlighted: false,
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: '',
    city: '',
    floor: '',
    contact1Name: '',
    contact1Phone: '',
    rating: 3,
    isHighlighted: false,
  });

  const canEdit = user?.role === 'manager' || user?.role === 'admin';
  const canDelete = user?.role === 'manager' || user?.role === 'admin';

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      setError(null);
      const data = await siteService.getAll();
      setSites(data);
    } catch (err: any) {
      console.error('Failed to fetch sites:', err);
      const message = err?.response?.data?.message || err?.message || 'Failed to fetch sites';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await siteService.create(formData);
      setShowForm(false);
      setFormData({ name: '', address: '', city: '', floor: '', contact1Name: '', contact1Phone: '', rating: 3, isHighlighted: false });
      fetchSites();
    } catch (err: any) {
      console.error('Failed to create site:', err);
      alert(err?.response?.data?.message || 'Failed to create site');
    } finally {
      setSaving(false);
    }
  };

  const handleEditClick = (site: Site) => {
    setEditingSite(site);
    setEditFormData({
      name: site.name,
      address: site.address,
      city: site.city,
      floor: site.floor || '',
      contact1Name: site.contact1Name || '',
      contact1Phone: site.contact1Phone || '',
      rating: site.rating || 3,
      isHighlighted: site.isHighlighted,
    });
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setSaving(true);
    try {
      await siteService.update(editingSite.id, editFormData);
      setShowEditForm(false);
      setEditingSite(null);
      fetchSites();
    } catch (err: any) {
      console.error('Failed to update site:', err);
      alert(err?.response?.data?.message || 'Failed to update site');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (site: Site) => {
    const hasEquipment = sites.some(s => s.id === site.id && (s as any)._count?.equipment > 0);
    const message = hasEquipment 
      ? t('sites.deleteWarning')
      : t('app.confirmDelete') + '?';
    if (!confirm(message)) return;
    setDeletingId(site.id);
    try {
      await siteService.delete(site.id);
      fetchSites();
    } catch (err: any) {
      console.error('Failed to delete site:', err);
      alert(err?.response?.data?.message || 'Failed to delete site');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredSites = sites.filter((site) => {
    return !search || 
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.address.toLowerCase().includes(search.toLowerCase()) ||
      site.city.toLowerCase().includes(search.toLowerCase());
  });

  const handleNavigate = (site: Site) => {
    if (site.latitude && site.longitude) {
      window.open(
        `https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`,
        '_blank'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-red-500 text-center px-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('sites.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          {t('sites.addNew')}
        </button>
      </div>

      <input
        type="text"
        placeholder={t('app.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => (
          <div
            key={site.id}
            onClick={() => canEdit && handleEditClick(site)}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow ${canEdit ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-lg">{site.name}</h3>
              {site.isHighlighted && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                  ⭐
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">{site.address}</p>
            <p className="text-gray-400 text-sm">{site.city}</p>
            
            <div className="mt-4 flex items-center justify-between">
              {site.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm text-gray-600">{site.rating}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                {site.latitude && site.longitude && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(site);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {t('sites.navigate')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          {t('errors.notFound')}
        </div>
      )}

      {/* Add Site Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">{t('sites.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.address')}</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.city')}</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.floor')}</label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.contact1')}</label>
                <input
                  type="text"
                  value={formData.contact1Name}
                  onChange={(e) => setFormData({ ...formData, contact1Name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.phone1')}</label>
                <input
                  type="tel"
                  value={formData.contact1Phone}
                  onChange={(e) => setFormData({ ...formData, contact1Phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.rating')}</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isHighlighted"
                  checked={formData.isHighlighted}
                  onChange={(e) => setFormData({ ...formData, isHighlighted: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label htmlFor="isHighlighted" className="text-sm text-gray-700">{t('sites.highlight')}</label>
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

      {showEditForm && editingSite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('app.edit')}</h2>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => handleDelete(editingSite)}
                  disabled={deletingId === editingSite.id}
                  className="text-red-600 hover:text-red-700 p-1"
                  title={t('app.delete')}
                >
                  🗑️
                </button>
              )}
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.name')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.address')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.city')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.floor')}</label>
                <input
                  type="text"
                  value={editFormData.floor}
                  onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.contact1')}</label>
                <input
                  type="text"
                  value={editFormData.contact1Name}
                  onChange={(e) => setEditFormData({ ...editFormData, contact1Name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.phone1')}</label>
                <input
                  type="tel"
                  value={editFormData.contact1Phone}
                  onChange={(e) => setEditFormData({ ...editFormData, contact1Phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('sites.rating')}</label>
                <select
                  value={editFormData.rating}
                  onChange={(e) => setEditFormData({ ...editFormData, rating: Number(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsHighlighted"
                  checked={editFormData.isHighlighted}
                  onChange={(e) => setEditFormData({ ...editFormData, isHighlighted: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <label htmlFor="editIsHighlighted" className="text-sm text-gray-700">{t('sites.highlight')}</label>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
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
