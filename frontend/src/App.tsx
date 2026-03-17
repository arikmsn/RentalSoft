import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout';
import {
  LoginPage,
  DashboardPage,
  EquipmentListPage,
  SitesListPage,
  WorkOrdersListPage,
  WorkOrderDetailsPage,
  MapPage,
  AlertsPage,
  MyTasksPage,
  SettingsPage,
} from './pages';
import { useAuthStore } from './stores/authStore';

function SettingsRoute() {
  const { user } = useAuthStore();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return <Navigate to="/dashboard" replace />;
  }
  return <SettingsPage />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<MainLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/:id" element={<EquipmentListPage />} />
        <Route path="/sites" element={<SitesListPage />} />
        <Route path="/sites/:id" element={<SitesListPage />} />
        <Route path="/workorders" element={<WorkOrdersListPage />} />
        <Route path="/workorders/:id" element={<WorkOrderDetailsPage />} />
        <Route path="/map" element={<MapPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/my-tasks" element={<MyTasksPage />} />
        <Route path="/settings" element={<SettingsRoute />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
