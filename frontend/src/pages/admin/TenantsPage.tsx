import { useState, useEffect } from 'react';
import { adminService, type Tenant } from '../../services/adminService';

export function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', slug: '', isActive: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        <h2 className="text-2xl font-bold text-surface-800">Tenants</h2>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + New Tenant
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Create New Tenant</h3>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Name</label>
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
                {saving ? 'Creating...' : 'Create Tenant'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-surface-600 hover:text-surface-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-surface-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-surface-50 border-b border-surface-200">
            <tr>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">Name</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">Slug</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">Users</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="border-b border-surface-100">
                <td className="px-4 py-3 text-surface-800">{tenant.name}</td>
                <td className="px-4 py-3 text-surface-600 font-mono text-sm">{tenant.slug}</td>
                <td className="px-4 py-3 text-surface-600">{tenant.userCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      tenant.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-surface-100 text-surface-500'
                    }`}
                  >
                    {tenant.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-surface-500">
                  No tenants yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}