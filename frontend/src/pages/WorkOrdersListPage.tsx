import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router-dom';
import type { WorkOrder, WorkOrderStatus, Site } from '../types';
import { workOrderService } from '../services/workOrderService';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatDate } from '../utils/date';
import { SiteForm, emptySiteForm } from '../components/SiteForm';
import type { SiteFormData } from '../components/SiteForm';

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

export function WorkOrdersListPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; name: string; active: boolean}[]>([]);
  const [workTypes, setWorkTypes] = useState<{id: string; name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'active' | 'completed' | 'all'>('active');
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
  console.log('[Page] filteredWorkOrders count:', workOrders.length);
  const filteredWorkOrders = workOrders
    .filter((wo) => {
      if (filter === 'all') return true;
      if (filter === 'completed') return wo.status === 'completed';
      if (filter === 'active') return wo.status === 'open' || wo.status === 'in_progress';
      return true;
    })
    .filter((wo) => {
      if (!search) return true;
      const searchLower = search.toLowerCase();
      return (
        (wo.site?.name || '').toLowerCase().includes(searchLower) ||
        (wo.site?.address || '').toLowerCase().includes(searchLower) ||
        (wo.workTypeName || '').toLowerCase().includes(searchLower) ||
        (wo.type || '').toLowerCase().includes(searchLower)
      );
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

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder={t('app.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-0 px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800 placeholder:text-surface-400"
        />
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'active' as const, label: t('workOrders.filters.active'), activeClass: 'bg-success-600 text-white shadow-sm' },
            { key: 'completed' as const, label: t('workOrders.statuses.completed'), activeClass: 'bg-surface-600 text-white shadow-sm' },
            { key: 'all' as const, label: t('equipment.filters.all'), activeClass: 'bg-primary-600 text-white shadow-sm' },
          ]).map((btn) => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-xl transition-all font-medium text-sm ${
                filter === btn.key
                  ? btn.activeClass
                  : 'bg-white text-surface-600 border border-surface-200 hover:bg-surface-50'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

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
        <WeeklyCalendar workOrders={filteredWorkOrders} t={t} onRefresh={() => {
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
                <input
                  type="date"
                  required
                  value={formData.plannedDate}
                  onChange={(e) => setFormData({ ...formData, plannedDate: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">{t('equipment.nextVisit')}</label>
                <input
                  type="date"
                  value={formData.plannedRemovalDate}
                  onChange={(e) => setFormData({ ...formData, plannedRemovalDate: e.target.value })}
                  className="w-full px-4 py-3 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white text-surface-800"
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

function WeeklyCalendar({ workOrders, t, onRefresh }: { workOrders: WorkOrder[]; t: any; onRefresh?: () => void }) {
  console.log('[Calendar] WeeklyCalendar rendered, received workOrders count:', workOrders.length);
  console.log('[Calendar] First 3 workOrders dates:', 
    workOrders.slice(0, 3).map(wo => ({ 
      id: wo.id, 
      plannedRemovalDate: wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString().split('T')[0] : 'null' 
    }))
  );
  const today = new Date();
  const [dateRange, setDateRange] = useState({ start: today, days: 6 });
  const [savingDate, setSavingDate] = useState<string | null>(null);
  const [editingDateId, setEditingDateId] = useState<string | null>(null);
  const [localWorkOrders, setLocalWorkOrders] = useState<WorkOrder[]>(workOrders);
  const [refreshKey, setRefreshKey] = useState(0);

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

  const handleRangeChange = (days: number) => {
    setDateRange({ start: today, days });
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
        <div className="flex gap-2">
          <button
            onClick={() => handleRangeChange(6)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 6 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            שבוע
          </button>
          <button
            onClick={() => handleRangeChange(13)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 13 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            שבועיים
          </button>
          <button
            onClick={() => handleRangeChange(29)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              dateRange.days === 29 ? 'bg-primary-100 text-primary-700' : 'text-surface-600 hover:bg-surface-50'
            }`}
          >
            חודש
          </button>
        </div>
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
              <div className="space-y-2">
                {dayWorkOrders.map(wo => (
                  <div
                    key={wo.id}
                    className="block p-3 rounded-xl text-sm bg-surface-50 border border-surface-100"
                  >
                    <Link to={`/workorders/${wo.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-surface-800">{wo.site?.name}</div>
                      </div>
                      <div className="text-surface-600 text-xs">{wo.workTypeName || wo.type}</div>
                      <div className="text-surface-500 text-xs mt-0.5">{wo.site?.address}</div>
                    </Link>
                    <div className="mt-2 pt-2 border-t border-surface-200 space-y-1">
                      {wo.plannedDate && (
                        <div className="text-xs text-surface-500">
                          תאריך התקנה: {new Date(wo.plannedDate).toLocaleDateString('he-IL')}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        {(wo as any).isNextVisitPotentialRemoval && (
                          <span className="px-1 py-0.5 bg-orange-100 text-orange-700 text-xs rounded font-bold">פ</span>
                        )}
                        <label className="text-xs text-surface-500">{t('equipment.nextVisit')}:</label>
                        <input
                          type="date"
                          defaultValue={wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate).toISOString().split('T')[0] : ''}
                          onBlur={(e) => handleDateBlur(wo.id, e.target.value)}
                          disabled={savingDate === wo.id}
                          className="text-xs px-2 py-1 border border-surface-200 rounded focus:ring-1 focus:ring-primary-500 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
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
