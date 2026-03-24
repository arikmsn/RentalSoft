import { api } from './api';
import type { Equipment, EquipmentStatus, EquipmentCondition } from '../types';

export interface EquipmentFilters {
  status?: EquipmentStatus;
  siteId?: string;
  type?: string;
  search?: string;
  available?: boolean;
}

export interface CreateEquipmentRequest {
  qrTag: string;
  type: string;
  status?: EquipmentStatus;
  siteId?: string | null;
  condition?: EquipmentCondition;
}

export interface UpdateEquipmentRequest {
  qrTag?: string;
  type?: string;
  status?: EquipmentStatus;
  condition?: EquipmentCondition;
  conditionState?: 'OK' | 'NOT_OK';
  purchaseDate?: string | null;
  currentLocationId?: string | null;
  siteId?: string;
  plannedRemovalDate?: Date;
}

export const equipmentService = {
  async getAll(filters?: EquipmentFilters): Promise<Equipment[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.available) params.append('available', 'true');
    
    const response = await api.get<Equipment[]>(`/equipment?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Equipment> {
    const response = await api.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },

  async getByQrTag(qrTag: string): Promise<Equipment> {
    const response = await api.get<Equipment>(`/equipment/qr/${qrTag}`);
    return response.data;
  },

  async create(data: CreateEquipmentRequest): Promise<Equipment> {
    const response = await api.post<Equipment>('/equipment', data);
    return response.data;
  },

  async update(id: string, data: UpdateEquipmentRequest): Promise<Equipment> {
    const response = await api.patch<Equipment>(`/equipment/${id}`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/equipment/${id}`);
  },

  async scanAtSite(id: string, siteId: string, location?: { lat: number; lng: number }): Promise<Equipment> {
    const response = await api.post<Equipment>(`/equipment/${id}/scan`, { siteId, location });
    return response.data;
  },

  async getTypes(): Promise<string[]> {
    const response = await api.get<string[]>('/equipment/types');
    return response.data;
  },
};
