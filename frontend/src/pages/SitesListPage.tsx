import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Site } from '../types';
import { siteService } from '../services/siteService';
import { useAuthStore } from '../stores/authStore';
import { ConfirmDialog } from '../components/ConfirmDialog';

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
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

  const handleDeleteClick = (site: Site) => {
    setSiteToDelete(site);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!siteToDelete) return;
    try {
      await siteService.delete(siteToDelete.id);
      setShowEditForm(false);
      setEditingSite(null);
      fetchSites();
    } catch (err: any) {
      console.error('Failed to delete site:', err);
      alert(err?.response?.data?.message || 'Failed to delete site');
    } finally {
      setShowDeleteConfirm(false);
      setSiteToDelete(null);
    }
  };

  const filteredSites = sites
    .filter((site) => {
      return !search || 
        site.name.toLowerCase().includes(search.toLowerCase()) ||
        site.address.toLowerCase().includes(search.toLowerCase()) ||
        site.city.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

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
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-danger-500 text-center px-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200"
        >
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('sites.title')}</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          + {t('sites.addNew')}
        </button>
      </div>

      <input
        type="text"
        placeholder={t('app.search')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 placeholder:text-surface-400"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => (
          <div
            key={site.id}
            onClick={() => canEdit && handleEditClick(site)}
            className={`bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100 ${canEdit ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-surface-800">{site.name}</h3>
              {site.isHighlighted && (
                <span className="px-2.5 py-1 bg-warning-100 text-warning-700 text-xs rounded-full font-medium">
                  ⭐
                </span>
              )}
            </div>
            <p className="text-surface-500 text-sm">{site.address}</p>
            <p className="text-surface-400 text-sm mt-1">{site.city}</p>
            
            <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
              {site.rating && (
                <div className="flex items-center gap-1">
                  <span className="text-warning-500">★</span>
                  <span className="text-sm text-surface-600 font-medium">{site.rating}</span>
                </div>
              )}
              <div className="flex items-center gap-2 ms-auto">
                {site.latitude && site.longitude && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigate(site);
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 hover:bg-primary-50 rounded-lg transition-colors"
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
        <div className="text-center py-12 text-surface-500">
          {t('errors.notFound')}
        </div>
      )}

      {/* Add Site Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">{t('sites.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.name')}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.address')}</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.city')}</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.floor')}</label>
                <input
                  type="text"
                  value={formData.floor}
                  onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.contact1')}</label>
                <input
                  type="text"
                  value={formData.contact1Name}
                  onChange={(e) => setFormData({ ...formData, contact1Name: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.phone1')}</label>
                <input
                  type="tel"
                  value={formData.contact1Phone}
                  onChange={(e) => setFormData({ ...formData, contact1Phone: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.rating')}</label>
                <select
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isHighlighted"
                  checked={formData.isHighlighted}
                  onChange={(e) => setFormData({ ...formData, isHighlighted: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="isHighlighted" className="text-sm text-surface-700">{t('sites.highlight')}</label>
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

      {showEditForm && editingSite && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-surface-800">{t('app.edit')}</h2>
              {canDelete && editingSite && (
                <button
                  type="button"
                  onClick={() => handleDeleteClick(editingSite)}
                  className="text-danger-600 hover:text-danger-700 p-2 rounded-lg hover:bg-danger-50 transition-colors"
                  title={t('app.delete')}
                >
                  🗑️
                </button>
              )}
            </div>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.name')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.address')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.address}
                  onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.city')}</label>
                <input
                  type="text"
                  required
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.floor')}</label>
                <input
                  type="text"
                  value={editFormData.floor}
                  onChange={(e) => setEditFormData({ ...editFormData, floor: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.contact1')}</label>
                <input
                  type="text"
                  value={editFormData.contact1Name}
                  onChange={(e) => setEditFormData({ ...editFormData, contact1Name: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.phone1')}</label>
                <input
                  type="tel"
                  value={editFormData.contact1Phone}
                  onChange={(e) => setEditFormData({ ...editFormData, contact1Phone: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.rating')}</label>
                <select
                  value={editFormData.rating}
                  onChange={(e) => setEditFormData({ ...editFormData, rating: Number(e.target.value) })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="editIsHighlighted"
                  checked={editFormData.isHighlighted}
                  onChange={(e) => setEditFormData({ ...editFormData, isHighlighted: e.target.checked })}
                  className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                />
                <label htmlFor="editIsHighlighted" className="text-sm text-surface-700">{t('sites.highlight')}</label>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
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

      {showDeleteConfirm && siteToDelete && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          title={t('app.delete')}
          message={(siteToDelete as any)._count?.equipment > 0 ? t('sites.deleteWarning') : t('app.confirmDelete') + '?'}
          confirmLabel={t('app.delete')}
          onConfirm={confirmDelete}
          onCancel={() => { setShowDeleteConfirm(false); setSiteToDelete(null); }}
          variant="danger"
        />
      )}
    </div>
  );
}
