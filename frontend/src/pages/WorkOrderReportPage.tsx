import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { siteService } from '../services/siteService';
import { api } from '../services/api';
import { formatDate } from '../utils/date';
import type { WorkOrder, Site } from '../types';

interface ReportFilters {
  startDate: string;
  endDate: string;
  status: string[];
  area: string;
  technicianId: string;
  siteId: string;
}

export function WorkOrderReportPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tenantSlug = location.pathname.split('/')[1] || user?.tenantSlug || 'default';

  const [loading, setLoading] = useState(true);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<{id: string; name: string}[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [areas, setAreas] = useState<string[]>([]);

  const [filters, setFilters] = useState<ReportFilters>({
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    status: searchParams.get('status') ? searchParams.get('status')!.split(',') : [],
    area: searchParams.get('area') || '',
    technicianId: searchParams.get('technicianId') || '',
    siteId: searchParams.get('siteId') || '',
  });

  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(filters);

  useEffect(() => {
    Promise.all([
      api.get('/settings/technicians').then(r => r.data),
      siteService.getAll(),
    ]).then(([techsData, sitesData]) => {
      setTechnicians((techsData as {id: string; name: string}[]).filter((t: any) => t.active !== false));
      setSites(sitesData);
      const uniqueAreas = [...new Set(sitesData.map((s: Site) => s.area).filter(Boolean))] as string[];
      setAreas(uniqueAreas.sort());
    }).catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setAppliedFilters(filters);
    try {
      const params = new URLSearchParams();
      if (filters.startDate && filters.endDate) {
        params.append('startDate', filters.startDate);
        params.append('endDate', filters.endDate);
      }
      if (filters.status.length > 0) {
        params.append('status', filters.status.join(','));
      }
      if (filters.technicianId) {
        params.append('technicianId', filters.technicianId);
      }
      if (filters.siteId) {
        params.append('siteId', filters.siteId);
      }
      const data = await api.get<WorkOrder[]>(`/workorders?${params.toString()}`).then(r => r.data);
      let filtered = data;
      if (filters.area) {
        filtered = filtered.filter((wo: WorkOrder) => wo.site?.area === filters.area);
      }
      setWorkOrders(filtered);
    } catch (err) {
      console.error('Failed to load report data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      fetchReport();
    }
  }, []);

  const stats = useMemo(() => {
    return {
      total: workOrders.length,
      open: workOrders.filter(wo => wo.status === 'open').length,
      inProgress: workOrders.filter(wo => wo.status === 'in_progress').length,
      completed: workOrders.filter(wo => wo.status === 'completed').length,
      withEquipment: workOrders.filter(wo => (wo as any).equipmentCount > 0).length,
    };
  }, [workOrders]);

  const getFilterSummary = () => {
    const parts: string[] = [];
    if (appliedFilters.startDate && appliedFilters.endDate) {
      parts.push(`${formatDate(appliedFilters.startDate)} - ${formatDate(appliedFilters.endDate)}`);
    }
    if (appliedFilters.status.length > 0) {
      parts.push(`סטטוס: ${appliedFilters.status.map(s => t(`workOrders.statuses.${s}`)).join(', ')}`);
    }
    if (appliedFilters.area) {
      parts.push(`אזור: ${appliedFilters.area}`);
    }
    if (appliedFilters.technicianId) {
      const tech = technicians.find(t => t.id === appliedFilters.technicianId);
      if (tech) parts.push(`טכנאי: ${tech.name}`);
    }
    if (appliedFilters.siteId) {
      const site = sites.find(s => s.id === appliedFilters.siteId);
      if (site) parts.push(`אתר: ${site.name}`);
    }
    return parts.length > 0 ? parts.join(' | ') : 'ללא סינון';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-surface-50 print:bg-white">
      {/* Print button - hidden when printing */}
      <div className="sticky top-0 z-10 bg-white border-b border-surface-200 px-4 py-3 flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate(`/${tenantSlug}/workorders`)}
          className="flex items-center gap-2 text-surface-600 hover:text-surface-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t('app.back')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-surface-500">
            {workOrders.length} עבודות
          </span>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {t('app.print')}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-surface-800">{t('reports.workOrderReport')}</h1>
          <p className="text-surface-500 text-sm mt-1">{getFilterSummary()}</p>
        </div>

        {/* Filter form */}
        <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6 print:hidden">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">מתאריך</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">עד תאריך</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">סטטוס</label>
              <select
                multiple
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: Array.from(e.target.selectedOptions, o => o.value) }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm min-h-[80px]"
              >
                <option value="open">{t('workOrders.statuses.open')}</option>
                <option value="in_progress">{t('workOrders.statuses.in_progress')}</option>
                <option value="completed">{t('workOrders.statuses.completed')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">טכנאי</label>
              <select
                value={filters.technicianId}
                onChange={e => setFilters(f => ({ ...f, technicianId: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm"
              >
                <option value="">הכל</option>
                {technicians.map(tech => (
                  <option key={tech.id} value={tech.id}>{tech.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">אזור</label>
              <select
                value={filters.area}
                onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}
                className="w-full px-3 py-2 border border-surface-200 rounded-lg text-sm"
              >
                <option value="">הכל</option>
                {areas.map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchReport}
                disabled={!filters.startDate || !filters.endDate}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
              >
                {t('reports.generate')}
              </button>
            </div>
          </div>
        </div>

        {/* Report content */}
        {loading ? (
          <div className="text-center py-12 text-surface-500">{t('app.loading')}</div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-12 text-surface-500">
            {appliedFilters.startDate ? t('errors.notFound') : 'בחר טווח תאריכים ולחץ על הפקה'}
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <div className="text-2xl font-bold text-surface-800">{stats.total}</div>
                <div className="text-xs text-surface-500 mt-1">{t('reports.total')}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
                <div className="text-xs text-surface-500 mt-1">{t('workOrders.statuses.open')}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
                <div className="text-xs text-surface-500 mt-1">{t('workOrders.statuses.in_progress')}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
                <div className="text-xs text-surface-500 mt-1">{t('workOrders.statuses.completed')}</div>
              </div>
              <div className="bg-white rounded-xl border border-surface-200 p-4 text-center">
                <div className="text-2xl font-bold text-primary-600">{stats.withEquipment}</div>
                <div className="text-xs text-surface-500 mt-1">עם ציוד</div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 border-b border-surface-200">
                  <tr>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">אתר</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">כתובת</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">אזור</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">סוג עבודה</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">טכנאי</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">תאריך</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">סטטוס</th>
                    <th className="text-right px-4 py-3 font-medium text-surface-600">ציוד</th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders.map((wo, idx) => (
                    <tr key={wo.id} className={`border-b border-surface-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-surface-50/50'}`}>
                      <td className="px-4 py-3 font-medium text-surface-800">{wo.site?.name || '-'}</td>
                      <td className="px-4 py-3 text-surface-600">{wo.site?.address || '-'}</td>
                      <td className="px-4 py-3 text-surface-600">{wo.site?.area || '-'}</td>
                      <td className="px-4 py-3 text-surface-600">{wo.workTypeName || wo.type || '-'}</td>
                      <td className="px-4 py-3 text-surface-600">{wo.technician?.name || '-'}</td>
                      <td className="px-4 py-3 text-surface-600">{formatDate(wo.plannedDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          wo.status === 'open' ? 'bg-blue-100 text-blue-700' :
                          wo.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {t(`workOrders.statuses.${wo.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-surface-600 text-center">{(wo as any).equipmentCount || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-surface-400">
              {t('reports.generatedAt')}: {new Date().toLocaleString('he-IL')}
            </div>
          </>
        )}
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:bg-white, .print\\:bg-white * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
