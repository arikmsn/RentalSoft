import { api } from './api';
import type { Site } from '../types';

export interface SiteFilters {
  search?: string;
  hasEquipment?: boolean;
  rating?: number;
  isActive?: boolean;
}

export interface CreateSiteRequest {
  name: string;
  address: string;
  city: string;
  floor?: string;
  apartment?: string;
  contact1Name?: string;
  contact1Phone?: string;
  contact2Name?: string;
  contact2Phone?: string;
  rating?: number;
  isHighlighted?: boolean;
  latitude?: number;
  longitude?: number;
}

export interface UpdateSiteRequest extends Partial<CreateSiteRequest> {}

export const siteService = {
  async getAll(filters?: SiteFilters): Promise<Site[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.hasEquipment !== undefined) params.append('hasEquipment', String(filters.hasEquipment));
    if (filters?.rating) params.append('rating', String(filters.rating));
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    
    const response = await api.get<Site[]>(`/sites?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Site> {
    const response = await api.get<Site>(`/sites/${id}`);
    return response.data;
  },

  async create(data: CreateSiteRequest): Promise<Site> {
    const response = await api.post<Site>('/sites', data);
    return response.data;
  },

  async update(id: string, data: UpdateSiteRequest): Promise<Site> {
    const response = await api.patch<Site>(`/sites/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sites/${id}`);
  },

  async toggleActive(id: string): Promise<Site> {
    const response = await api.patch<Site>(`/sites/${id}/toggle-active`);
    return response.data;
  },

  async getCoordinates(address: string): Promise<{ lat: number; lng: number }> {
    const response = await api.get<{ lat: number; lng: number }>(`/sites/geocode?address=${encodeURIComponent(address)}`);
    return response.data;
  },

  async getWithEquipmentStatus(): Promise<Site[]> {
    const response = await api.get<Site[]>('/sites/with-equipment-status');
    return response.data;
  },

  async getActiveWorkOrdersForMap(): Promise<any[]> {
    const response = await api.get<any[]>('/sites/active-work-orders');
    return response.data;
  },
};
