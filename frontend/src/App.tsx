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
import { useAuthStore } from './stores/authStore';

function SettingsRoute() {
  const { user } = useAuthStore();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <Navigate to="/sites" replace />;
  }
  return <SettingsPage />;
}

function App() {
  console.log('[BUILD] RentalSoft QR build 2026-03-18-QR2');
  
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/qr-test" element={<MinimalScanner />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailsPage />} />
        <Route path="/sites" element={<SitesListPage />} />
        <Route path="/sites/:id" element={<SitesListPage />} />
        <Route path="/workorders" element={<WorkOrdersListPage />} />
        <Route path="/workorders/:id" element={<WorkOrderDetailsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/settings" element={<SettingsRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
