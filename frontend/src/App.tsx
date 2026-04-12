import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout';
import {
  LoginPage,
  DashboardPage,
  EquipmentListPage,
  EquipmentDetailsPage,
  SitesListPage,
  WorkOrdersListPage,
  WorkOrderDetailsPage,
  MapPage,
  AlertsPage,
  SettingsPage,
  MinimalScanner,
} from './pages';
import { AdminLoginPage, AdminLayout, TenantsPage, UsersPage } from './pages/admin';
import { useAuthStore } from './stores/authStore';

function SettingsRoute() {
  const { user } = useAuthStore();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <Navigate to="/sites" replace />;
  }
  return <SettingsPage />;
}

function TenantAppRoutes() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.isSuperAdmin === true;
  const userTenantSlug = user.tenantSlug || 'default';

  // Super admins can access any tenant
  if (!isSuperAdmin && userTenantSlug) {
    // For regular users, check if they should be redirect elsewhere
  }

  return (
    <Routes>
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="equipment" element={<EquipmentListPage />} />
      <Route path="equipment/:id" element={<EquipmentDetailsPage />} />
      <Route path="sites" element={<SitesListPage />} />
      <Route path="sites/:id" element={<SitesListPage />} />
      <Route path="workorders" element={<WorkOrdersListPage />} />
      <Route path="workorders/:id" element={<WorkOrderDetailsPage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="alerts" element={<AlertsPage />} />
      <Route path="settings" element={<SettingsRoute />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

function TenantRoutes() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.isSuperAdmin === true;
  const userTenantSlug = user.tenantSlug || 'default';

  // Redirect super admin to admin panel if they try to access regular tenant app
  if (isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return (
    <MainLayout tenantSlug={userTenantSlug}>
      <TenantAppRoutes />
    </MainLayout>
  );
}

function AdminRoutes() {
  const { user, isAuthenticated } = useAuthStore();

  // If not authenticated or not super admin, go to admin login
  if (!isAuthenticated || !user?.isSuperAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <AdminLayout>
      <Routes>
        <Route path="dashboard" element={<TenantsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
}

function App() {
  console.log('[BUILD] RentalSoft QR build 2026-04-12-admin');
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/qr-test" element={<MinimalScanner />} />
      
      {/* Tenant login */}
      <Route path="/:tenantSlug/login" element={<LoginPage />} />
      
      {/* Admin routes - dedicated entry */}
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin/*" element={<AdminRoutes />} />
      
      {/* Tenant app routes */}
      <Route path="/:tenantSlug/*" element={<TenantRoutes />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;