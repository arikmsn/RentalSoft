import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Site } from '../types';
import { siteService } from '../services/siteService';
import { useAuthStore } from '../stores/authStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SiteForm, emptySiteForm } from '../components/SiteForm';
import type { SiteFormData } from '../components/SiteForm';

type ActiveFilter = 'active' | 'inactive' | 'all';

interface SiteFilters {
  status: ActiveFilter;
  cities: string[];
  nearMe: boolean;
  radiusKm: number;
  favoritesOnly: boolean;
  userLat?: number;
  userLng?: number;
}

const defaultFilters: SiteFilters = {
  status: 'active',
  cities: [],
  nearMe: false,
  radiusKm: 10,
  favoritesOnly: false,
};

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
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);
  const [siteToDeactivate, setSiteToDeactivate] = useState<Site | null>(null);
  const [formData, setFormData] = useState<SiteFormData>({ ...emptySiteForm });
  const [editFormData, setEditFormData] = useState<SiteFormData>({ ...emptySiteForm });

  // Advanced filters
  const [filters, setFilters] = useState<SiteFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [, setLocationError] = useState<string | null>(null);

  // Calculate distance between two coordinates (km)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Request user location
  const requestUserLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('הדפדפן אינו תומך במיקום');
      return;
    }
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLocationLoading(false);
      },
      (error) => {
        let errorMsg = 'שגיאה בקבלת מיקום';
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = 'הרשאת מיקום נדחתה';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'המיקום אינו זמין';
        }
        setLocationError(errorMsg);
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Toggle near me filter
  const toggleNearMe = () => {
    if (filters.nearMe) {
      setFilters(prev => ({ ...prev, nearMe: false, userLat: undefined, userLng: undefined }));
      setLocationError(null);
    } else {
      setLocationError(null);
      setFilters(prev => ({ ...prev, nearMe: true }));
      if (!userLocation) {
        requestUserLocation();
      }
    }
  };

  // Apply near me when location is ready
  useEffect(() => {
    if (userLocation && filters.nearMe) {
      setFilters(prev => ({ ...prev, userLat: userLocation.lat, userLng: userLocation.lng }));
    }
  }, [userLocation, filters.nearMe]);

  // Get unique cities from sites
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    sites.forEach(site => {
      if (site.city) citySet.add(site.city);
    });
    return Array.from(citySet).sort();
  }, [sites]);

  // Count active filters (always show indicator when any filter is active including default status)
  const activeFilterCount = 
    (filters.status !== 'all' ? 1 : 0) +
    filters.cities.length +
    (filters.nearMe ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0);

  const canEdit = user?.role === 'manager' || user?.role === 'admin';

  const fetchSites = async (searchTerm?: string, filter?: ActiveFilter) => {
    try {
      setError(null);
      const s = searchTerm !== undefined ? searchTerm : search;
      const f = filter !== undefined ? filter : filters.status;
      const apiFilters: { search?: string; isActive?: boolean } = {};
      if (s) apiFilters.search = s;
      if (f === 'active') apiFilters.isActive = true;
      else if (f === 'inactive') apiFilters.isActive = false;
      const data = await siteService.getAll(apiFilters);
      setSites(data);
    } catch (err: any) {
      console.error('Failed to fetch sites:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch sites');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => fetchSites(search, filters.status), 300);
    return () => clearTimeout(timeout);
  }, [search, filters.status]);

  // Apply filters to sites
  const filteredSites = sites
    .filter(site => {
      // City filter
      if (filters.cities.length > 0) {
        if (!filters.cities.includes(site.city)) return false;
      }
      return true;
    })
    .filter(site => {
      // Favorites filter
      if (filters.favoritesOnly) {
        if (!site.isFavorite) return false;
      }
      return true;
    })
    .filter(site => {
      // Near me filter
      if (filters.nearMe && userLocation && site.latitude && site.longitude) {
        const distance = calculateDistance(userLocation.lat, userLocation.lng, Number(site.latitude), Number(site.longitude));
        if (distance > filters.radiusKm) return false;
      }
      return true;
    })
    .filter(site =>
      !search ||
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.address.toLowerCase().includes(search.toLowerCase()) ||
      site.city.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'he'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload: any = { ...formData };
      console.log('[SiteCreate] Submitting:', { address: payload.address, city: payload.city, houseNumber: payload.houseNumber, lat: payload.latitude, lng: payload.longitude });
      await siteService.create(payload);
      setShowForm(false);
      setFormData({ ...emptySiteForm });
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
      latitude: site.latitude,
      longitude: site.longitude,
    });
    setShowEditForm(true);
  };

  const handleToggleActive = async (site: Site, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await siteService.toggleActive(site.id);
      await fetchSites(search, filters.status);
      window.dispatchEvent(new CustomEvent('site-updated'));
      if (editingSite?.id === site.id) {
        setEditingSite({ ...editingSite, isActive: !site.isActive });
      }
    } catch (err: any) {
      console.error('Failed to toggle site active:', err);
      alert(err?.response?.data?.message || 'Failed to toggle site active/inactive');
    }
  };

  const handleToggleFavorite = async (site: Site) => {
    try {
      await siteService.update(site.id, { isFavorite: !site.isFavorite });
      setSites(prev => prev.map(s => s.id === site.id ? { ...s, isFavorite: !site.isFavorite } : s));
      if (editingSite?.id === site.id) {
        setEditingSite({ ...editingSite, isFavorite: !site.isFavorite });
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
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

      <div className="flex flex-row gap-3">
        <input
          type="text"
          placeholder={t('app.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 placeholder:text-surface-400"
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 border rounded-xl transition-all flex items-center gap-2 shrink-0 min-h-[48px] ${
            showFilters || activeFilterCount > 0
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-surface-200 bg-white text-surface-700 hover:bg-surface-50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          סינון
          {activeFilterCount > 0 && (
            <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
          )}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-4">
          {/* Status Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">סטטוס</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'active' as ActiveFilter, label: 'פעילים' },
                { key: 'inactive' as ActiveFilter, label: 'לא פעילים' },
                { key: 'all' as ActiveFilter, label: 'הכל' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setFilters(prev => ({ ...prev, status: btn.key }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.status === btn.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cities Filter */}
          {cities.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-surface-700 mb-2">ערים</h3>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {cities.slice(0, 20).map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setFilters(prev => ({
                        ...prev,
                        cities: prev.cities.includes(city)
                          ? prev.cities.filter(c => c !== city)
                          : [...prev.cities, city]
                      }));
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      filters.cities.includes(city)
                        ? 'bg-primary-600 text-white'
                        : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">מועדפים</h3>
            <button
              onClick={() => setFilters(prev => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filters.favoritesOnly
                  ? 'bg-warning-500 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
              </svg>
              מועדפים בלבד
            </button>
          </div>

          {/* Near Me Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">מיקום</h3>
            <button
              onClick={toggleNearMe}
              disabled={locationLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filters.nearMe
                  ? 'bg-primary-600 text-white'
                  : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {locationLoading ? 'מאתר...' : 'מיקום'}
            </button>
            {filters.nearMe && (
              <div className="mt-3 px-3 py-2 bg-surface-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-surface-600">רדיוס</span>
                  <span className="text-sm font-medium text-surface-800">{filters.radiusKm} ק"מ</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="30"
                  value={filters.radiusKm}
                  onChange={(e) => setFilters(prev => ({ ...prev, radiusKm: parseInt(e.target.value) }))}
                  className="w-full h-2 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="flex justify-between text-xs text-surface-400 mt-1">
                  <span>1 ק"מ</span>
                  <span>30 ק"מ</span>
                </div>
                </div>
              )}
            </div>

          {/* Clear Filters */}
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(defaultFilters)}
              className="text-sm text-danger-600 hover:text-danger-700"
            >
              נקה פילטרים
            </button>
          )}
        </div>
      )}

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
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(site);
                  }}
                  className="p-1 hover:bg-surface-100 rounded transition-colors"
                  title={site.isFavorite ? 'הסר ממועדפים' : 'הוסף למועדפים'}
                >
                  <svg className={`w-5 h-5 ${site.isFavorite ? 'text-warning-500 fill-warning-500' : 'text-surface-400'}`} fill={site.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </button>
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
                    onClick={(e) => { e.stopPropagation(); setSiteToDeactivate(site); }}
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
      {showForm && (
        <SiteForm
          data={formData}
          setData={setFormData}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          saving={saving}
          title={t('sites.addNew')}
          showRating={true}
        />
      )}

      {/* Edit Site Modal */}
      {showEditForm && editingSite && (
        <SiteForm
          data={editFormData}
          setData={setEditFormData}
          onSubmit={handleUpdate}
          onCancel={() => setShowEditForm(false)}
          saving={saving}
          title={t('app.edit')}
          showRating={true}
        />
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

      {siteToDeactivate && (
        <ConfirmDialog
          isOpen={true}
          title="השבתת אתר"
          message={`האם אתה בטוח שברצונך להשבית את האתר "${siteToDeactivate.name}"? כל העבודות הפעילות יושלמו והציוד יהפוך לזמין.`}
          confirmLabel="אישור"
          onConfirm={async () => {
            await handleToggleActive(siteToDeactivate);
            setSiteToDeactivate(null);
          }}
          onCancel={() => setSiteToDeactivate(null)}
          variant="danger"
        />
      )}
    </div>
  );
}
