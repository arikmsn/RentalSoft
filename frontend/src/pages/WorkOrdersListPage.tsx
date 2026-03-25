import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import type { WorkOrder, WorkOrderStatus, Site } from '../types';
import { workOrderService } from '../services/workOrderService';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDate } from '../utils/date';
import { SiteForm, emptySiteForm } from '../components/SiteForm';
import { CustomDatePicker } from '../components/CustomDatePicker';
import type { SiteFormData } from '../components/SiteForm';

interface WorkOrderFilters {
  status: ('open' | 'in_progress' | 'completed')[];
  cities: string[];
  colors: ('black' | 'red' | 'orange' | 'green')[];
  nearMe: boolean;
  radiusKm: number;
  timeRange: 'week' | '2weeks' | 'month' | 'lastMonth' | 'all';
  userLat?: number;
  userLng?: number;
}

const defaultFilters: WorkOrderFilters = {
  status: ['open', 'in_progress'],
  cities: [],
  colors: [],
  nearMe: false,
  radiusKm: 10,
  timeRange: 'week',
};

const emptyFilters: WorkOrderFilters = {
  status: [],
  cities: [],
  colors: [],
  nearMe: false,
  radiusKm: 10,
  timeRange: 'week',
};

const statusColors: Record<WorkOrderStatus, string> = {
  open: 'bg-primary-100 text-primary-700',
  in_progress: 'bg-warning-100 text-warning-700',
  completed: 'bg-success-100 text-success-700',
};

const statusDotColors: Record<string, string> = {
  black: 'bg-surface-800',
  red: 'bg-danger-500',
  orange: 'bg-warning-500',
  green: 'bg-success-500',
};

function getStatusColor(wo: WorkOrder): 'black' | 'red' | 'orange' | 'green' {
  if (!wo.plannedRemovalDate) return 'green';
  const days = Math.ceil((new Date(wo.plannedRemovalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'black';
  if (days <= 3) return 'red';
  if (days <= 7) return 'orange';
  return 'green';
}

export function WorkOrdersListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; name: string; active: boolean}[]>([]);
  const [workTypes, setWorkTypes] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>(searchParams.get('view') === 'calendar' ? 'calendar' : 'list');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: '',
    workTypeId: '',
    siteId: '',
    technicianId: '',
    plannedDate: '',
    plannedRemovalDate: '',
    isNextVisitPotentialRemoval: false,
  });
  const [isCreatingInlineSite, setIsCreatingInlineSite] = useState(false);
  const [inlineSiteData, setInlineSiteData] = useState<SiteFormData>({ ...emptySiteForm });
  const [savingInlineSite, setSavingInlineSite] = useState(false);
  
  // Advanced filters
  const [filters, setFilters] = useState<WorkOrderFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number; lng: number} | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      workOrderService.getAll(),
      siteService.getAll({ isActive: true }),
      api.get('/settings/technicians').then(res => res.data),
    ]).then(([woData, siteData, techData]) => {
      setWorkOrders(woData);
      // Deduplicate by ID
      const uniqueSites = siteData.filter((site, index, self) => 
        index === self.findIndex(s => s.id === site.id)
      );
      // Only show active technicians
      const activeTechs = (techData as {id: string; name: string; active: boolean}[])
        .filter(t => t.active !== false);
      const uniqueTechs = activeTechs.filter((tech, index, self) => 
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

  useEffect(() => {
    api.get<{id: string; name: string; isActive: boolean}[]>('/settings/work-order-types').then(res => {
      setWorkTypes(res.data.filter((wt: any) => wt.isActive !== false));
    }).catch(err => console.error('Failed to fetch work types:', err));
  }, []);

  // Get unique cities from sites
  const cities = useMemo(() => {
    const citySet = new Set<string>();
    sites.forEach(site => {
      if (site.city) citySet.add(site.city);
    });
    return Array.from(citySet).sort();
  }, [sites]);

  // Calculate distance between two coordinates (km)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
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
  }, [userLocation]);

  // Apply near me filter
  useEffect(() => {
    if (filters.nearMe && userLocation) {
      setFilters(prev => ({ ...prev, userLat: userLocation.lat, userLng: userLocation.lng }));
    }
  }, [filters.nearMe, userLocation]);

  const handleCreateInlineSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineSiteData.name.trim() || !inlineSiteData.address.trim() || !inlineSiteData.city.trim()) {
      return;
    }
    setSavingInlineSite(true);
    try {
      const newSite = await siteService.create({
        name: inlineSiteData.name,
        address: inlineSiteData.address,
        streetName: inlineSiteData.streetName,
        city: inlineSiteData.city,
        houseNumber: inlineSiteData.houseNumber,
        floor: inlineSiteData.floor || undefined,
        contact1Name: inlineSiteData.contact1Name || undefined,
        contact1Phone: inlineSiteData.contact1Phone || undefined,
        latitude: inlineSiteData.latitude,
        longitude: inlineSiteData.longitude,
      });
      setSites(prev => [...prev, newSite as Site]);
      setFormData(prev => ({ ...prev, siteId: (newSite as Site).id }));
      setIsCreatingInlineSite(false);
      setInlineSiteData({ ...emptySiteForm });
    } catch (err) {
      console.error('Failed to create site:', err);
      alert('Failed to create site');
    } finally {
      setSavingInlineSite(false);
    }
  };

  const handleCancelInlineSite = () => {
    setIsCreatingInlineSite(false);
    setInlineSiteData({ ...emptySiteForm });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await workOrderService.create({
        type: formData.type || undefined,
        workTypeId: formData.workTypeId || undefined,
        siteId: formData.siteId,
        technicianId: formData.technicianId,
        plannedDate: new Date(formData.plannedDate),
        plannedRemovalDate: formData.plannedRemovalDate ? new Date(formData.plannedRemovalDate) : undefined,
        isNextVisitPotentialRemoval: formData.isNextVisitPotentialRemoval,
      });
      setShowForm(false);
      setFormData({ type: '', workTypeId: '', siteId: '', technicianId: '', plannedDate: '', plannedRemovalDate: '', isNextVisitPotentialRemoval: false });
      setIsCreatingInlineSite(false);
      setInlineSiteData({ ...emptySiteForm });
      const data = await workOrderService.getAll();
      setWorkOrders(data);
    } catch (err: any) {
      console.error('Failed to create work order:', err);
      alert(err?.response?.data?.message || 'Failed to create work order');
    } finally {
      setSaving(false);
    }
  };

  // DEBUG: Log filteredWorkOrders
  console.log('[Page] filteredWorkOrders count:', workOrders.length, 'filters:', filters);
  
  const filteredWorkOrders = workOrders
    .filter((wo) => {
      // Status filter
      if (filters.status.length > 0) {
        if (!filters.status.includes(wo.status as any)) return false;
      }
      return true;
    })
    .filter((wo) => {
      // City filter
      if (filters.cities.length > 0) {
        const woCity = wo.site?.city || '';
        if (!filters.cities.includes(woCity)) return false;
      }
      return true;
    })
    .filter((wo) => {
      // Color filter
      if (filters.colors.length > 0) {
        const woColor = getStatusColor(wo);
        if (!filters.colors.includes(woColor)) return false;
      }
      return true;
    })
    .filter((wo) => {
      // Near me filter
      if (filters.nearMe && filters.userLat !== undefined && filters.userLng !== undefined) {
        const siteLat = wo.site?.latitude;
        const siteLng = wo.site?.longitude;
        if (!siteLat || !siteLng) return false;
        const distance = calculateDistance(filters.userLat, filters.userLng, siteLat, siteLng);
        if (distance > filters.radiusKm) return false;
      }
      return true;
    })
    .filter((wo) => {
      // Search filter
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        (wo.site?.name || '').toLowerCase().includes(searchLower) ||
        (wo.site?.address || '').toLowerCase().includes(searchLower) ||
        (wo.workTypeName || '').toLowerCase().includes(searchLower) ||
        (wo.type || '').toLowerCase().includes(searchLower)
      );
    })
    .filter((wo) => {
      // Time range filter
      if (filters.timeRange === 'all') return true;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate) : (wo.plannedDate ? new Date(wo.plannedDate) : null);
      if (!targetDate) return true;
      targetDate.setHours(0, 0, 0, 0);
      
      const diffDays = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filters.timeRange === 'week') {
        return diffDays >= 0 && diffDays <= 7;
      } else if (filters.timeRange === '2weeks') {
        return diffDays >= 0 && diffDays <= 14;
      } else if (filters.timeRange === 'month') {
        return diffDays >= 0 && diffDays <= 30;
      } else if (filters.timeRange === 'lastMonth') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const firstDayOfLastMonth = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1);
        const lastDayOfLastMonth = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 12 : currentMonth, 0);
        return targetDate >= firstDayOfLastMonth && targetDate <= lastDayOfLastMonth;
      }
      return true;
    })
    .sort((a, b) => {
      // Sort by next visit date (plannedRemovalDate) ascending - earliest first
      const dateA = a.plannedRemovalDate ? new Date(a.plannedRemovalDate).getTime() : 0;
      const dateB = b.plannedRemovalDate ? new Date(b.plannedRemovalDate).getTime() : 0;
      // Works without next visit date go to the end
      if (dateA === 0 && dateB === 0) return 0;
      if (dateA === 0) return 1;
      if (dateB === 0) return -1;
      return dateA - dateB;
    });

  // Count active filters
  const activeFilterCount = 
    filters.status.length + 
    filters.cities.length + 
    filters.colors.length + 
    (filters.nearMe ? 1 : 0) +
    (filters.timeRange !== 'all' ? 1 : 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-surface-500">{t('app.loading')}</div>
      </div>
    );
  }

  const canCreate = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-surface-800">{t('workOrders.title')}</h1>
        {canCreate && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-all duration-200 shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            + {t('workOrders.addNew')}
          </button>
        )}
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
                { key: 'open' as const, label: 'פתוח' },
                { key: 'in_progress' as const, label: 'בביצוע' },
                { key: 'completed' as const, label: 'הושלם' },
              ].map((status) => (
                <button
                  key={status.key}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      status: prev.status.includes(status.key)
                        ? prev.status.filter(s => s !== status.key)
                        : [...prev.status, status.key]
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.status.includes(status.key)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">צבע (דחיפות)</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'black' as const, label: 'שחור', color: 'bg-surface-800' },
                { key: 'red' as const, label: 'אדום', color: 'bg-danger-500' },
                { key: 'orange' as const, label: 'כתום', color: 'bg-warning-500' },
                { key: 'green' as const, label: 'ירוק', color: 'bg-success-500' },
              ].map((color) => (
                <button
                  key={color.key}
                  onClick={() => {
                    setFilters(prev => ({
                      ...prev,
                      colors: prev.colors.includes(color.key)
                        ? prev.colors.filter(c => c !== color.key)
                        : [...prev.colors, color.key]
                    }));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    filters.colors.includes(color.key)
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${color.color}`}></span>
                  {color.label}
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

          {/* Time Range Filter */}
          <div>
            <h3 className="text-sm font-medium text-surface-700 mb-2">טווח זמן</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'week' as const, label: 'שבוע' },
                { key: '2weeks' as const, label: 'שבועיים' },
                { key: 'month' as const, label: 'חודש' },
                { key: 'lastMonth' as const, label: 'חודש קודם' },
                { key: 'all' as const, label: 'הכל' },
              ].map((range) => (
                <button
                  key={range.key}
                  onClick={() => setFilters(prev => ({ ...prev, timeRange: range.key }))}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    filters.timeRange === range.key
                      ? 'bg-primary-600 text-white'
                      : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>
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
              onClick={() => setFilters(emptyFilters)}
              className="text-sm text-danger-600 hover:text-danger-700"
            >
              נקה פילטרים
            </button>
          )}
        </div>
      )}

      {/* View mode toggle - mobile: top-left, desktop: right side */}
      <div className="block lg:hidden mb-3">
        <div className="flex gap-2 bg-white border border-surface-200 rounded-xl p-1 w-fit">
          <button
            onClick={() => { setViewMode('list'); setSearchParams({ view: 'list' }); }}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
              viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            📋 {t('workOrders.viewList')}
          </button>
          <button
            onClick={() => { setViewMode('calendar'); setSearchParams({ view: 'calendar' }); }}
            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
              viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            📅 {t('workOrders.viewCalendar')}
          </button>
        </div>
      </div>

      <div className="hidden lg:flex gap-2 bg-white border border-surface-200 rounded-xl p-1 ml-auto w-fit">
        <button
          onClick={() => { setViewMode('list'); setSearchParams({ view: 'list' }); }}
          className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
          }`}
        >
          📋 {t('workOrders.viewList')}
        </button>
        <button
          onClick={() => { setViewMode('calendar'); setSearchParams({ view: 'calendar' }); }}
          className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium ${
            viewMode === 'calendar' ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
          }`}
        >
          📅 {t('workOrders.viewCalendar')}
        </button>
      </div>

      {viewMode === 'calendar' ? (
        <WeeklyCalendar workOrders={filteredWorkOrders} timeRange={filters.timeRange} t={t} onRefresh={() => {
          workOrderService.getAll().then(data => {
            setWorkOrders(data);
          }).catch(console.error);
        }} />
      ) : (
        <>
          <div className="space-y-3">
            {filteredWorkOrders.map((wo) => (
              <Link
                key={wo.id}
                to={`/workorders/${wo.id}`}
                className="block bg-white rounded-2xl p-4 sm:p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-surface-100"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div>
                      <h3 className="font-semibold text-surface-800 flex items-center gap-2">
                        {wo.status !== 'completed' && wo.statusColor && (wo.equipmentCount ? (
                          <span
                            className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusDotColors[wo.statusColor] || 'bg-surface-300'}`}
                          />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 border-2 border-surface-400" />
                        ))}
                        {wo.site ? wo.site.name : ''}
                      </h3>
                      <p className="text-sm text-surface-500 mt-1">
                        {wo.workTypeName || wo.type || t('workOrders.workType')}
                        {wo.site ? `, ${wo.site.city}` : ''}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">
                        {t('workOrders.plannedDate')}: <span className="font-medium">{formatDate(wo.plannedDate)}</span>
                        {wo.plannedRemovalDate && (
                          <> | {t('equipment.nextVisit')}: <span className="font-medium">{formatDate(wo.plannedRemovalDate)}</span>
                            {(wo as any).isNextVisitPotentialRemoval && (
                              <span className="mr-1 px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-bold">פ</span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[wo.status]}`}>
                      {t(`workOrders.statuses.${wo.status}`)}
                    </span>
                    {wo.equipmentCount !== undefined && wo.equipmentCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-surface-500 bg-surface-100 px-2 py-1 rounded-full">
                        <span>🔧</span>
                        <span>{wo.equipmentCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredWorkOrders.length === 0 && (
            <div className="text-center py-12 text-surface-500">
              {t('errors.notFound')}
            </div>
          )}
        </>
      )}

      {/* Add Work Order Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-surface-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-float">
            <h2 className="text-xl font-bold mb-5 text-surface-800">{t('workOrders.addNew')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.workType')}</label>
                <select
                  required
                  value={formData.workTypeId}
                  onChange={(e) => {
                    const selected = workTypes.find(wt => wt.id === e.target.value);
                    if (selected) {
                      setFormData({ ...formData, type: selected.name, workTypeId: selected.id });
                    } else {
                      setFormData({ ...formData, type: '', workTypeId: '' });
                    }
                  }}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {workTypes.map(wt => (
                    <option key={wt.id} value={wt.id}>{wt.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.site')}</label>
                {isCreatingInlineSite ? (
                  <SiteForm
                    data={inlineSiteData}
                    setData={setInlineSiteData}
                    onSubmit={handleCreateInlineSite}
                    onCancel={handleCancelInlineSite}
                    saving={savingInlineSite}
                    title={t('sites.addNew')}
                    showRating={false}
                    inline={true}
                  />
                ) : (
                  <select
                    required
                    value={formData.siteId}
                    onChange={(e) => {
                      if (e.target.value === '__NEW_SITE__') {
                        setIsCreatingInlineSite(true);
                      } else {
                        setFormData({ ...formData, siteId: e.target.value });
                      }
                    }}
                    className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                  >
                    <option value="">-- {t('app.select')} --</option>
                    {sites.map((site) => (
                      <option key={site.id} value={site.id}>{site.name}</option>
                    ))}
                    <option value="__NEW_SITE__">+ אתר חדש</option>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.technician')}</label>
                <select
                  required
                  value={formData.technicianId}
                  onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                >
                  <option value="">-- {t('app.select')} --</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('workOrders.plannedDate')}</label>
                <CustomDatePicker
                  value={formData.plannedDate}
                  onDateSelect={(date) => setFormData({ ...formData, plannedDate: date })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.nextVisit')}</label>
                <CustomDatePicker
                  value={formData.plannedRemovalDate}
                  onDateSelect={(date) => setFormData({ ...formData, plannedRemovalDate: date })}
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isNextVisitPotentialRemoval}
                    onChange={(e) => setFormData({ ...formData, isNextVisitPotentialRemoval: e.target.checked })}
                    className="w-4 h-4 rounded text-primary-600"
                  />
                  <span className="text-sm text-surface-700">{t('equipment.isPotentialRemoval')}</span>
                </label>
              </div>
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setIsCreatingInlineSite(false); setInlineSiteData({ ...emptySiteForm }); }}
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
    </div>
  );
}

function WeeklyCalendar({ workOrders, timeRange, t, onRefresh }: { workOrders: WorkOrder[]; timeRange: string; t: any; onRefresh?: () => void }) {
  console.log('[Calendar] WeeklyCalendar rendered, received workOrders count:', workOrders.length, 'timeRange:', timeRange);
  console.log('[Calendar] First 3 workOrders dates:', 
    workOrders.slice(0, 3).map(wo => ({ 
      id: wo.id, 
      plannedRemovalDate: wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString().split('T')[0] : 'null' 
    }))
  );
  const today = new Date();
  const daysMap: Record<string, number> = { 'week': 6, '2weeks': 13, 'month': 29, 'lastMonth': 31, 'all': 29 };
  
  const getDateRangeForTimeRange = (range: string) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    if (range === 'lastMonth') {
      const firstDayOfLastMonth = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 11 : currentMonth - 1, 1);
      const lastDayOfLastMonth = new Date(currentMonth === 0 ? currentYear - 1 : currentYear, currentMonth === 0 ? 12 : currentMonth, 0);
      const days = Math.ceil((lastDayOfLastMonth.getTime() - firstDayOfLastMonth.getTime()) / (1000 * 60 * 60 * 24));
      return { start: firstDayOfLastMonth, days };
    }
    return { start: today, days: daysMap[range] || 6 };
  };
  
  const [dateRange, setDateRange] = useState(getDateRangeForTimeRange(timeRange));
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [localWorkOrders, setLocalWorkOrders] = useState<WorkOrder[]>(workOrders);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sync with parent filtered work orders when they change
  useEffect(() => {
    setLocalWorkOrders(workOrders);
  }, [workOrders]);

  // Update date range when timeRange filter changes
  useEffect(() => {
    setDateRange(getDateRangeForTimeRange(timeRange));
  }, [timeRange]);

  // Debug: log when localWorkOrders changes
  useEffect(() => {
    console.log('[Calendar] localWorkOrders updated, count:', localWorkOrders.length);
    console.log('[Calendar] localWorkOrders sample:', 
      localWorkOrders.slice(0, 5).map(wo => ({ 
        id: wo.id, 
        plannedRemovalDate: wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString().split('T')[0] : 'null' 
      }))
    );
  }, [localWorkOrders]);

  const getDaysInRange = () => {
    const days: { date: Date; label: string }[] = [];
    for (let i = 0; i <= dateRange.days; i++) {
      const d = new Date(dateRange.start);
      d.setDate(dateRange.start.getDate() + i);
      const isToday = d.toDateString() === today.toDateString();
      days.push({
        date: d,
        label: isToday ? `${t('app.today')}` : d.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'numeric' }),
      });
    }
    return days;
  };

  const days = getDaysInRange();

  const getWorkOrdersForDay = (date: Date) => {
    // Calendar shows only OPEN and IN_PROGRESS works
    const filtered = localWorkOrders.filter(wo => {
      if (wo.status === 'completed') return false;
      // Keep work visible if it's being edited (date picker open)
      if (editingDateId === wo.id) return true;
      // Use plannedRemovalDate (next visit date) for grouping
      if (!wo.plannedRemovalDate) return false;
      const woDate = new Date(wo.plannedRemovalDate);
      return woDate.toDateString() === date.toDateString();
    });
    return filtered;
  };

  const handleDateBlur = async (woId: string, newDate: string) => {
    if (!newDate) {
      setEditingDateId(null);
      return;
    }
    const newDateObj = new Date(newDate);
    console.log('[Calendar] handleDateBlur: woId=', woId, 'newDate=', newDateObj.toISOString());
    setSavingDate(woId);
    try {
      await workOrderService.update(woId, {
        plannedRemovalDate: newDateObj,
      });
      console.log('[Calendar] API update succeeded, updating local state');
      // Update local state with a NEW array reference to trigger re-render
      setLocalWorkOrders(prev => {
        const updated = prev.map(wo => 
          wo.id === woId ? { ...wo, plannedRemovalDate: newDateObj } : wo
        );
        console.log('[Calendar] Updated localWorkOrders, first 5 items:', 
          updated.slice(0, 5).map(wo => ({ id: wo.id, plannedRemovalDate: wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString() : null }))
        );
        return updated;
      });
      // Force refresh to ensure list re-renders
      setRefreshKey(k => {
        console.log('[Calendar] Incrementing refreshKey from', k, 'to', k + 1);
        return k + 1;
      });
      setEditingDateId(null);
      // Notify parent to refresh
      if (onRefresh) {
        console.log('[Calendar] Calling onRefresh callback');
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to update date:', err);
    } finally {
      setSavingDate(null);
      setEditingDateId(null);
    }
  };

  return (
    <div key={refreshKey} className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-surface-800">{t('workOrders.weeklyCalendar')}</h2>
      </div>

      <div className="space-y-4">
        {days.map((day, idx) => {
          const dayWorkOrders = getWorkOrdersForDay(day.date);
          return (
            <div key={idx} className="border-b border-surface-100 pb-4 last:border-0">
              <div className="text-sm font-medium text-surface-700 mb-2 flex items-center gap-2">
                <span className={day.date.toDateString() === today.toDateString() ? 'text-primary-600' : ''}>
                  {day.label}
                </span>
                {dayWorkOrders.length > 0 && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    {dayWorkOrders.length}
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {dayWorkOrders.map(wo => {
                  const statusColor = getStatusColor(wo);
                  return (
                  <div
                    key={wo.id}
                    className="block p-4 sm:p-5 rounded-2xl text-sm bg-white shadow-card border border-surface-100 hover:shadow-card-hover transition-all duration-300"
                  >
                    <Link to={`/workorders/${wo.id}`} className="block">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {wo.status !== 'completed' && wo.equipmentCount ? (
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${statusDotColors[statusColor]}`} />
                          ) : (
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 border-2 border-surface-400" />
                          )}
                          <div>
                            <div className="font-semibold text-surface-800 text-base">{wo.site?.name}</div>
                            <div className="text-surface-600 text-sm mt-1">
                              {wo.workTypeName || wo.type}
                            </div>
                            <div className="text-surface-500 text-xs mt-0.5">{wo.site?.address}{wo.site?.city ? `, ${wo.site.city}` : ''}</div>
                          </div>
                        </div>
                        <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${statusColors[wo.status]}`}>
                          {t(`workOrders.statuses.${wo.status}`)}
                        </span>
                      </div>
                    </Link>
                    <div className="mt-3 pt-3 border-t border-surface-200 space-y-2">
                      {wo.plannedDate && (
                        <div className="text-sm text-surface-500">
                          <span className="font-medium">{t('workOrders.plannedDate')}:</span> {new Date(wo.plannedDate).toLocaleDateString('he-IL')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(wo as any).isNextVisitPotentialRemoval && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded font-bold">פירוק</span>
                        )}
                        <label className="text-sm text-surface-600 font-medium">{t('equipment.nextVisit')}:</label>
                        <CustomDatePicker
                          value={wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString().split('T')[0] : ''}
                          onDateSelect={(date) => handleDateBlur(wo.id, date)}
                          disabled={savingDate === wo.id}
                        />
                      </div>
                    </div>
                  </div>
                  );
                })}
                {dayWorkOrders.length === 0 && (
                  <div className="text-xs text-surface-400 py-2">-</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-surface-200 text-sm text-surface-500">
        {t('workOrders.weeklyTotal')}: {workOrders.length} {t('workOrders.title').toLowerCase()}
      </div>
    </div>
  );
}
