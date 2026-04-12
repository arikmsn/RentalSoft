import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';

interface TenantMetrics {
  tenant: { id: string; name: string; slug: string; status: string };
  users: { total: number; active: number };
  sites: { total: number };
  equipment: { total: number; inWork: number };
  workOrders: { total: number; open: number; inProgress: number; completed: number };
  lastLogin: string | null;
}

export function TenantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<TenantMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  const loadData = async (tenantId: string) => {
    try {
      const data = await adminService.getTenantMetrics(tenantId);
      setMetrics(data);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const getStatusLabel = (status: string) => {
    if (status === 'active') return 'פעיל';
    if (status === 'suspended') return 'מושהה';
    if (status === 'archived') return 'בארכיון';
    return status;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-sm text-surface-500 hover:text-surface-700 mb-2"
          >
            &larr; חזרה
          </button>
          <h2 className="text-2xl font-bold text-surface-800">{metrics.tenant.name}</h2>
          <p className="text-surface-500">/{metrics.tenant.slug}</p>
        </div>
        <span
          className={`inline-flex px-3 py-1 text-sm rounded-full ${
            metrics.tenant.status === 'active'
              ? 'bg-green-100 text-green-700'
              : metrics.tenant.status === 'suspended'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-surface-100 text-surface-500'
          }`}
        >
          {getStatusLabel(metrics.tenant.status)}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">משתמשים</div>
          <div className="text-2xl font-bold text-surface-800">
            {metrics.users.active} / {metrics.users.total}
          </div>
          <div className="text-xs text-surface-400">פעילים</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">אתרים</div>
          <div className="text-2xl font-bold text-surface-800">{metrics.sites.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">ציוד</div>
          <div className="text-2xl font-bold text-surface-800">{metrics.equipment.total}</div>
          <div className="text-xs text-surface-400">
            {metrics.equipment.inWork} בעבודה
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4">
          <div className="text-sm text-surface-500">כניסה אחרונה</div>
          <div className="text-lg font-medium text-surface-800">
            {metrics.lastLogin
              ? new Date(metrics.lastLogin).toLocaleDateString('he-IL')
              : '-'}
          </div>
        </div>
      </div>

      {/* Work Orders */}
      <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-surface-200">
          <h3 className="font-semibold text-surface-800">פניות</h3>
        </div>
        <div className="grid grid-cols-4 gap-4 p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-surface-800">{metrics.workOrders.total}</div>
            <div className="text-sm text-surface-500">סה"כ</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{metrics.workOrders.open}</div>
            <div className="text-sm text-surface-500">פתוחות</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{metrics.workOrders.inProgress}</div>
            <div className="text-sm text-surface-500">בטיפול</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{metrics.workOrders.completed}</div>
            <div className="text-sm text-surface-500">הושלמו</div>
          </div>
        </div>
      </div>
    </div>
  );
}