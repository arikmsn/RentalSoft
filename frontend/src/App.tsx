import { Routes, Route, Navigate, useParams } from 'react-router-dom';
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
import { useAuthStore } from './stores/authStore';

function SettingsRoute() {
  const { user } = useAuthStore();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <Navigate to="/sites" replace />;
  }
  return <SettingsPage />;
}

function TenantAppRoutes() {
  const { tenantSlug } = useParams();
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.isSuperAdmin === true;
  const userTenantSlug = user.tenantSlug || 'default';

  if (!isSuperAdmin && tenantSlug !== userTenantSlug) {
    return <Navigate to={`/${userTenantSlug}/dashboard`} replace />;
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
  const { tenantSlug } = useParams();
  const { user } = useAuthStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isSuperAdmin = user.isSuperAdmin === true;
  const userTenantSlug = user.tenantSlug || 'default';

  if (!isSuperAdmin && tenantSlug !== userTenantSlug) {
    return <Navigate to={`/${userTenantSlug}/dashboard`} replace />;
  }

  return (
    <MainLayout tenantSlug={tenantSlug || userTenantSlug}>
      <TenantAppRoutes />
    </MainLayout>
  );
}

function App() {
  console.log('[BUILD] RentalSoft QR build 2026-03-18-QR2');
  
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/qr-test" element={<MinimalScanner />} />
      <Route path="/:tenantSlug/login" element={<LoginPage />} />
      <Route path="/:tenantSlug/*" element={<TenantRoutes />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
