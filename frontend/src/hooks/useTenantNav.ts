import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export function useTenantPath() {
  const location = useLocation();
  const { user } = useAuthStore();
  
  // Derive tenantSlug from URL path (e.g., /client3/workorders/123 -> client3)
  const tenantSlug = location.pathname.split('/')[1] || user?.tenantSlug || 'default';
  
  // Build tenant-aware path
  const pathTo = (path: string) => `/${tenantSlug}/${path.replace(/^\//, '')}`;
  
  return { tenantSlug, pathTo };
}