import { useState, useEffect } from 'react';
import { adminService, type AdminUser, type Tenant } from '../../services/adminService';

export function UsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    role: 'technician' as const,
    tenantId: '',
    isActive: true,
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended' | 'archived'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, tenantsData] = await Promise.all([
        adminService.getUsers(),
        adminService.getTenants(),
      ]);
      setUsers(usersData);
      setTenants(tenantsData);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await adminService.createUser(formData);
      setShowForm(false);
      setFormData({
        name: '',
        username: '',
        email: '',
        password: '',
        role: 'technician',
        tenantId: '',
        isActive: true,
      });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('האם להשהות את המשתמש?')) return;
    try {
      await adminService.suspendUser(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to suspend');
    }
  };

  const handleReactivate = async (id: string) => {
    if (!confirm('האם להפעיל מחדש את המשתמש?')) return;
    try {
      await adminService.reactivateUser(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reactivate');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('האם להעביר לארכיון? (לא יימחק)')) return;
    try {
      await adminService.deleteUser(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to archive');
    }
  };

  const filteredUsers = users.filter(u => {
    if (filter === 'all') return true;
    return u.status === filter;
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
        <h2 className="text-2xl font-bold text-surface-800">משתמשים</h2>
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
            + משתמש חדש
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-surface-200 p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">משתמש חדש</h3>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">שם *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">שם משתמש *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">סיסמה *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">תפקיד</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                >
                  <option value="technician">טכנאי</option>
                  <option value="manager">מנהל</option>
                  <option value="admin">מנהל מערכת</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">עסק</label>
                <select
                  value={formData.tenantId}
                  onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
                  className="w-full px-3 py-2 border border-surface-200 rounded-lg"
                >
                  <option value="">בחר עסק...</option>
                  {tenants.filter(t => t.status === 'active').map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'יוצר...' : 'צור משתמש'}
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
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">שם משתמש</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">תפקיד</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">עסק</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">סטטוס</th>
              <th className="text-start px-4 py-3 text-sm font-medium text-surface-600">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-surface-100">
                <td className="px-4 py-3 text-surface-800">
                  {user.name}
                  {user.isSuperAdmin && (
                    <span className="ms-2 px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">מנהל</span>
                  )}
                </td>
                <td className="px-4 py-3 text-surface-600 font-mono text-sm">{user.username || '-'}</td>
                <td className="px-4 py-3 text-surface-600">
                  {user.role === 'technician' && 'טכנאי'}
                  {user.role === 'manager' && 'מנהל'}
                  {user.role === 'admin' && 'מנהל מערכת'}
                </td>
                <td className="px-4 py-3 text-surface-600">
                  {user.memberships.map(m => m.tenantSlug).join(', ') || '-'}
                </td>
                <td className="px-4 py-3">{getStatusBadge(user.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {user.status === 'active' && !user.isSuperAdmin && (
                      <>
                        <button
                          onClick={() => handleSuspend(user.id)}
                          className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                        >
                          השהה
                        </button>
                        <button
                          onClick={() => handleArchive(user.id)}
                          className="text-xs px-2 py-1 bg-surface-100 text-surface-600 rounded hover:bg-surface-200"
                        >
                          ארכיון
                        </button>
                      </>
                    )}
                    {user.status === 'suspended' && (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        הפעל מחדש
                      </button>
                    )}
                    {user.status === 'archived' && (
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        שחזר
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-surface-500">
                  אין משתמשים
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}