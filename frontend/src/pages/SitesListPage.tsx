import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Site } from '../types';
import { siteService } from '../services/siteService';
import { useAuthStore } from '../stores/authStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AddressAutocomplete } from '../components/AddressAutocomplete';

interface SiteFormData {
  name: string;
  address: string;
  streetName: string;
  city: string;
  houseNumber: string;
  floor: string;
  contact1Name: string;
  contact1Phone: string;
  rating: number;
  isHighlighted: boolean;
  latitude?: number;
  longitude?: number;
}

const emptyForm: SiteFormData = {
  name: '',
  address: '',
  streetName: '',
  city: '',
  houseNumber: '',
  floor: '',
  contact1Name: '',
  contact1Phone: '',
  rating: 3,
  isHighlighted: false,
};

type ActiveFilter = 'active' | 'inactive' | 'all';

export function SitesListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>({ ...emptyForm });
  const [editFormData, setEditFormData] = useState<SiteFormData>({ ...emptyForm });

  const canEdit = user?.role === 'manager' || user?.role === 'admin';
  const canDelete = user?.role === 'manager' || user?.role === 'admin';

  const fetchSites = async (searchTerm?: string, filter?: ActiveFilter) => {
    try {
      setError(null);
      const s = searchTerm !== undefined ? searchTerm : search;
      const f = filter !== undefined ? filter : activeFilter;
      const filters: { search?: string; isActive?: boolean } = {};
      if (s) filters.search = s;
      if (f === 'active') filters.isActive = true;
      else if (f === 'inactive') filters.isActive = false;
      const data = await siteService.getAll(filters);
      setSites(data);
    } catch (err: any) {
      console.error('Failed to fetch sites:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchSites(search), 300);
    return () => clearTimeout(timeout);
  }, [search, activeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...formData };
      console.log('[SiteCreate] Submitting:', { address: payload.address, city: payload.city, houseNumber: payload.houseNumber, lat: payload.latitude, lng: payload.longitude });
      await siteService.create(payload);
      setShowForm(false);
      setFormData({ ...emptyForm });
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
      streetName: site.address,
      city: site.city,
      houseNumber: site.houseNumber || '',
      floor: site.floor || '',
      contact1Name: site.contact1Name || '',
      contact1Phone: site.contact1Phone || '',
      rating: site.rating || 3,
      isHighlighted: site.isHighlighted,
      latitude: site.latitude,
      longitude: site.longitude,
    });
    setShowEditForm(true);
  };

  const handleToggleActive = async (site: Site, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await siteService.toggleActive(site.id);
      await fetchSites(search, activeFilter);
      window.dispatchEvent(new CustomEvent('site-updated'));
      if (editingSite?.id === site.id) {
        setEditingSite({ ...editingSite, isActive: !site.isActive });
      }
    } catch (err: any) {
      console.error('Failed to toggle site active:', err);
      alert(err?.response?.data?.message || 'Failed to toggle site active/inactive');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSite) return;
    setSaving(true);
    try {
      const payload: any = { ...editFormData };
      console.log('[SiteUpdate] Submitting:', { address: payload.address, city: payload.city, houseNumber: payload.houseNumber, lat: payload.latitude, lng: payload.longitude });
      await siteService.update(editingSite.id, payload);
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
    setShowEditForm(false);
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
      const errorMsg = err?.response?.data?.message || err?.response?.data || 'Failed to delete site';
      setErrorMessage(typeof errorMsg === 'string' ? errorMsg : t('sites.deleteError'));
      setShowErrorDialog(true);
    } finally {
      setShowDeleteConfirm(false);
      setSiteToDelete(null);
    }
  };

  const filteredSites = sites
    .filter((site) =>
      !search ||
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.address.toLowerCase().includes(search.toLowerCase()) ||
      site.city.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const handleNavigate = (site: Site) => {
    if (site.latitude && site.longitude) {
      window.open(`https://www.waze.com/ul?ll=${site.latitude},${site.longitude}&q=${encodeURIComponent(site.address)}`, '_blank');
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
        <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200">
          {t('app.refresh')}
        </button>
      </div>
    );
  }

  const inputClasses = "w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800";

  const renderSiteForm = (
    data: SiteFormData,
    setData: React.Dispatch<React.SetStateAction<SiteFormData>>,
    onSubmit: (e: React.FormEvent) => void,
    onCancel: () => void,
    title: string,
    isEdit: boolean = false,
  ) => (
    <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-surface-800">{title}</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-surface-500">{t('sites.rating')}:</span>
              <select
                value={data.rating}
                onChange={(e) => setData({ ...data, rating: Number(e.target.value) })}
                className="px-2 py-1 border border-surface-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {isEdit && canDelete && editingSite && (
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
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {/* Site name */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.name')}</label>
            <input type="text" required value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} className={inputClasses} />
          </div>

          {/* Address (autocomplete) */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.address')}</label>
            <AddressAutocomplete
              value={data.address}
              onChange={(val) => setData((prev) => ({ ...prev, address: val }))}
              onSelect={(sel) => {
                setData((prev) => {
                  const streetName = sel.address.split(',')[0].trim();
                  const composite = sel.houseNumber
                    ? `${streetName} ${sel.houseNumber}, ${sel.city}`
                    : sel.address;
                  return {
                    ...prev,
                    address: composite,
                    streetName,
                    city: sel.city || prev.city,
                    houseNumber: sel.houseNumber || prev.houseNumber,
                    latitude: sel.latitude,
                    longitude: sel.longitude,
                  };
                });
              }}
              required
              className={inputClasses}
            />
            {data.latitude && data.longitude && (
              <p className="text-xs text-success-600 mt-1">&#x2713; {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}</p>
            )}
          </div>

          {/* Floor */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.floor')}</label>
            <input
              type="text"
              value={data.floor}
              onChange={(e) => setData({ ...data, floor: e.target.value })}
              className={inputClasses}
            />
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.contact1')}</label>
            <input type="text" value={data.contact1Name} onChange={(e) => setData({ ...data, contact1Name: e.target.value })} className={inputClasses} />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">{t('sites.phone1')}</label>
            <input type="tel" value={data.contact1Phone} onChange={(e) => setData({ ...data, contact1Phone: e.target.value })} className={inputClasses} />
          </div>

          {/* Highlight (edit only) */}
          {isEdit && (
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="editIsHighlighted"
                checked={data.isHighlighted}
                onChange={(e) => setData({ ...data, isHighlighted: e.target.checked })}
                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="editIsHighlighted" className="text-sm text-surface-700">{t('sites.highlight')}</label>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-3">
            <button type="button" onClick={onCancel} className="flex-1 px-4 py-3 border border-surface-200 rounded-xl hover:bg-surface-50 transition-colors text-surface-700 font-medium">
              {t('app.cancel')}
            </button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 font-medium transition-all duration-200">
              {saving ? t('app.loading') : t('app.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

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

      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'active' as ActiveFilter, label: 'פעילים', activeClass: 'bg-success-600 text-white shadow-sm' },
          { key: 'inactive' as ActiveFilter, label: 'לא פעילים', activeClass: 'bg-surface-600 text-white shadow-sm' },
          { key: 'all' as ActiveFilter, label: 'הכל', activeClass: 'bg-primary-600 text-white shadow-sm' },
        ]).map((btn) => (
          <button
            key={btn.key}
            onClick={() => setActiveFilter(btn.key)}
            className={`px-4 py-2 rounded-xl transition-all font-medium text-sm ${
              activeFilter === btn.key
                ? btn.activeClass
                : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSites.map((site) => (
          <div
            key={site.id}
            onClick={() => canEdit && handleEditClick(site)}
            className={`bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100 ${canEdit ? 'cursor-pointer' : ''}`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold text-lg ${site.isActive ? 'text-surface-800' : 'text-surface-400'}`}>{site.name}</h3>
                {!site.isActive && (
                  <span className="px-2 py-0.5 bg-surface-200 text-surface-600 text-xs rounded-full font-medium">לא פעיל</span>
                )}
              </div>
              {site.isHighlighted && (
                <span className="px-2.5 py-1 bg-warning-100 text-warning-700 text-xs rounded-full font-medium">⭐</span>
              )}
            </div>
            <p className="text-surface-500 text-sm">{site.address}</p>

            <div className="mt-4 pt-3 border-t border-surface-100 flex items-center justify-between">
              {site.rating && (
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div key={level} className={`w-4 h-2 rounded-sm ${level <= site.rating! ? 'bg-warning-500' : 'bg-surface-200'}`} />
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 ms-auto">
                {(site.hasValidLocation || (site.latitude && site.longitude)) && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigate(site); }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium px-3 py-1.5 hover:bg-primary-50 rounded-lg transition-colors"
                  >
                    {t('sites.navigate')}
                  </button>
                )}
                {canEdit && (
                  <button
                    onClick={(e) => handleToggleActive(site, e)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-medium border transition-colors ${
                      site.isActive
                        ? 'border-surface-300 text-surface-500 hover:border-danger-300 hover:text-danger-600 hover:bg-danger-50'
                        : 'border-success-300 text-success-600 hover:bg-success-50'
                    }`}
                  >
                    {site.isActive ? 'השבת' : 'הפעל'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSites.length === 0 && (
        <div className="text-center py-12 text-surface-500">{t('errors.notFound')}</div>
      )}

      {/* Add Site Modal */}
      {showForm && renderSiteForm(formData, setFormData, handleSubmit, () => setShowForm(false), t('sites.addNew'))}

      {/* Edit Site Modal */}
      {showEditForm && editingSite && renderSiteForm(editFormData, setEditFormData, handleUpdate, () => setShowEditForm(false), t('app.edit'), true)}

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

      {showErrorDialog && (
        <ConfirmDialog
          isOpen={showErrorDialog}
          title={t('app.error')}
          message={errorMessage}
          confirmLabel={t('app.cancel')}
          onConfirm={() => setShowErrorDialog(false)}
          onCancel={() => setShowErrorDialog(false)}
          variant="default"
        />
      )}
    </div>
  );
}
