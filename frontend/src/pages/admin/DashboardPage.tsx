import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService, type Tenant } from '../../services/adminService';

interface Metrics {
  tenants: { total: number; active: number; suspended: number; archived: number };
  users: { total: number; active: number };
  sites: { total: number };
  equipment: { total: number; inWork: number };
  workOrders: { total: number; open: number; inProgress: number; completed: number };
}

interface TenantMetrics extends Tenant {
  workOrders: { total: number; open: number; inProgress: number; completed: number };
  equipment: { total: number; inWork: number };
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tenants, setTenants] = useState<TenantMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [overviewData, tenantsData] = await Promise.all([
        adminService.getMetricsOverview(),
        adminService.getTenants(),
      ]);
      setMetrics(overviewData);

      const tenantsWithMetrics = await Promise.all(
        tenantsData.map(async (t) => {
          try {
            const tm = await adminService.getTenantMetrics(t.id);
            return {
              ...t,
              workOrders: tm.workOrders,
              equipment: tm.equipment,
            };
          } catch {
            return {
              ...t,
              workOrders: { total: 0, open: 0, inProgress: 0, completed: 0 },
              equipment: { total: 0, inWork: 0 },
            };
          }
        })
      );
      setTenants(tenantsWithMetrics);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-surface-800 mb-6">סיכום מערכת</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">עסקים</div>
          <div className="text-2xl font-bold text-surface-800">{metrics?.tenants.active || 0}</div>
          <div className="text-xs text-surface-400">
            מתוך {metrics?.tenants.total || 0} פעילים
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">משתמשים</div>
          <div className="text-2xl font-bold text-surface-800">{metrics?.users.active || 0}</div>
          <div className="text-xs text-surface-400">
            מתוך {metrics?.users.total || 0} סה"כ
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">אתרים</div>
          <div className="text-2xl font-bold text-surface-800">{metrics?.sites.total || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">ציוד בעבודה</div>
          <div className="text-2xl font-bold text-surface-800">{metrics?.equipment.inWork || 0}</div>
          <div className="text-xs text-surface-400">
            מתוך {metrics?.equipment.total || 0} סה"כ
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">פניות</div>
          <div className="text-2xl font-bold text-surface-800">{metrics?.workOrders.total || 0}</div>
          <div className="text-xs text-surface-400">
            {metrics?.workOrders.open || 0} פתוחות
          </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-surface-200">
          <h3 className="font-semibold text-surface-800">נתוני עסקים</h3>
        </div>
        <table className="w-full">
          <thead className="bg-surface-50 border-b border-surface-200">
            <tr>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">עסק</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">משתמשים</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">אתרים</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">ציוד</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">פניות</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600">סטטוס</th>
              <th className="text-start px-4 py-2 text-sm font-medium text-surface-600"></th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-surface-100">
                <td className="px-4 py-2 text-surface-800">{t.name}</td>
                <td className="px-4 py-2 text-surface-600">{t.userCount}</td>
                <td className="px-4 py-2 text-surface-600">{t.workOrders.total}</td>
                <td className="px-4 py-2 text-surface-600">{t.equipment.total}</td>
                <td className="px-4 py-2 text-surface-600">
                  {t.workOrders.open + t.workOrders.inProgress} / {t.workOrders.total}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex px-2 py-0.5 text-xs rounded-full ${
                      t.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : t.status === 'suspended'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-surface-100 text-surface-500'
                    }`}
                  >
                    {t.status === 'active' ? 'פעיל' : t.status === 'suspended' ? 'מושהה' : 'בארכיון'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => navigate(`/admin/tenants/${t.id}`)}
                    className="text-xs px-2 py-1 text-primary-600 hover:text-primary-700"
                  >
                    פרטים
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}