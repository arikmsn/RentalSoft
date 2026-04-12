import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export const hasPermission = (user: User | null, requiredRole: UserRole): boolean => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role === 'manager' && requiredRole !== 'admin') return true;
  if (user.role === 'technician' && requiredRole === 'technician') return true;
  return false;
};

export const getTenantSlug = (): string | null => {
  const user = useAuthStore.getState().user;
  if (!user) return null;
  if (user.isSuperAdmin) return null;
  return user.tenantSlug || null;
};

export const getTenantId = (): string | null => {
  const user = useAuthStore.getState().user;
  if (!user) return null;
  if (user.isSuperAdmin) return null;
  return user.tenantId || null;
};

export const isSuperAdmin = (): boolean => {
  return useAuthStore.getState().user?.isSuperAdmin === true;
};

export const tenantAwarePath = (path: string): string => {
  const slug = getTenantSlug();
  if (!slug) return path;
  return `/${slug}${path}`;
};

export const tenantAwareRedirect = (navigate: (path: string) => void) => {
  const slug = getTenantSlug();
  if (slug) {
    navigate(`/${slug}/dashboard`);
  } else {
    navigate('/dashboard');
  }
};
