import { useState, useEffect } from 'react';
import { adminService, type Tenant } from '../../services/adminService';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', isActive: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'archived'>('all');

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      const data = await adminService.getTenants();
      setTenants(data);
    } catch (err) {
      console.error('Load tenants error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await adminService.createTenant(formData);
      setShowForm(false);
      setFormData({ name: '', slug: '', isActive: true });
      loadTenants();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/[+]/g, '');
    setFormData({ ...formData, name: value, slug });
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('האם להשהות את העסק?')) return;
    try {
      await adminService.suspendTenant(id);
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to suspend');
    }
  };

  const handleReactivate = async (id: string) => {
    if (!confirm('האם להפעיל מחדש את העסק?')) return;
    try {
      await adminService.reactivateTenant(id);
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('האם להעביר לארכיון? (לא יימחק)')) return;
    try {
      await adminService.archiveTenant(id);
      loadTenants();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive');
    }
  };

  const filteredTenants = tenants.filter(t => {
    if (filter === 'all') return true;
    return t.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-yellow-100 text-yellow-700',
      archived: 'bg-surface-100 text-surface-500',
    };
    const labels: Record<string, string> = {
      active: 'פעיל',
      suspended: 'מושהה',
      archived: 'בארכיון',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${styles[status] || styles.active}`}>
        {labels[status] || status}
      </span>
    );
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-surface-800">עסקים</h2>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-surface-200 rounded-lg text-sm"
          >
            <option value="all">הכל</option>
            <option value="active">פעילים</option>
            <option value="suspended">מושהים</option>
            <option value="archived">בארכיון</option>
          </select>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            + עסק חדש
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-4 mb-6">
          <h3 className="text-lg font-semibold mb-4">עסק חדש</h3>
          {error && <div className="mb-4 text-danger-600 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">שם העסק</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                  placeholder="Company Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                  placeholder="company"
                  required
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'יוצר...' : 'צור עסק'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-surface-600 hover:text-surface-800"
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-50 border-b border-surface-200">
            <tr>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">שם</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">Slug</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">משתמשים</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">סטטוס</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredTenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-surface-100">
                <td className="px-4 py-3 text-surface-800">{tenant.name}</td>
                <td className="px-4 py-3 text-surface-600 font-mono text-sm">/{tenant.slug}</td>
                <td className="px-4 py-3 text-surface-600">{tenant.userCount}</td>
                <td className="px-4 py-3">{getStatusBadge(tenant.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {tenant.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleSuspend(tenant.id)}
                          className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          השהה
                        </button>
                        <button
                          onClick={() => handleArchive(tenant.id)}
                          className="text-xs px-2 py-1 bg-surface-100 text-surface-600 rounded hover:bg-surface-200"
                        >
                          ארכיון
                        </button>
                      </>
                    )}
                    {tenant.status === 'suspended' && (
                      <button
                        onClick={() => handleReactivate(tenant.id)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        הפעל מחדש
                      </button>
                    )}
                    {tenant.status === 'archived' && (
                      <button
                        onClick={() => handleReactivate(tenant.id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        שחזר
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredTenants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-surface-500">
                  אין עסקים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}