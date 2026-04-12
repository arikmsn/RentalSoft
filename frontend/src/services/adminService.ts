import { api } from './api';
import type { UserRole } from '../types';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  userCount: number;
}

export interface AdminUser {
  id: string;
  name: string;
  username: string | null;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  memberships: {
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
  }[];
}

export const adminService = {
  async getTenants(): Promise<Tenant[]> {
    const response = await api.get<Tenant[]>('/admin/tenants');
    return response.data;
  },

  async createTenant(data: { name: string; slug: string; isActive?: boolean }): Promise<Tenant> {
    const response = await api.post<Tenant>('/admin/tenants', data);
    return response.data;
  },

  async updateTenant(id: string, data: { name?: string; slug?: string; isActive?: boolean }): Promise<Tenant> {
    const response = await api.patch<Tenant>(`/admin/tenants/${id}`, data);
    return response.data;
  },

  async getUsers(): Promise<AdminUser[]> {
    const response = await api.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  async createUser(data: {
    name: string;
    username?: string;
    email?: string;
    password: string;
    role: UserRole;
    tenantId?: string;
    isActive?: boolean;
  }): Promise<AdminUser> {
    const response = await api.post<AdminUser>('/admin/users', data);
    return response.data;
  },

  async updateUser(id: string, data: {
    name?: string;
    username?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
    password?: string;
    tenantId?: string;
  }): Promise<AdminUser> {
    const response = await api.patch<AdminUser>(`/admin/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },
};