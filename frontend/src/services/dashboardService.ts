import { api } from './api';
import type { Alert, ActivityLog } from '../types';

export type { Alert, ActivityLog };

export interface DashboardStats {
  totalEquipment: number;
  activeEquipment: number;
  warehouseEquipment: number;
  inRepairEquipment: number;
  totalSites: number;
  sitesWithEquipment: number;
  todayWorkOrders: number;
  openWorkOrders: number;
  overdueRemovals: number;
  upcomingRemovals: number;
}

export interface ActivityLogFilters {
  equipmentId?: string;
  siteId?: string;
  userId?: string;
  actionType?: string;
  fromDate?: Date;
  toDate?: Date;
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  async getAlerts(): Promise<Alert[]> {
    const response = await api.get<Alert[]>('/dashboard/alerts');
    return response.data;
  },

  async getAlertsByType(type: Alert['type']): Promise<Alert[]> {
    const response = await api.get<Alert[]>(`/dashboard/alerts?type=${type}`);
    return response.data;
  },

  async getActivityLogs(filters?: ActivityLogFilters): Promise<ActivityLog[]> {
    const params = new URLSearchParams();
    if (filters?.equipmentId) params.append('equipmentId', filters.equipmentId);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.actionType) params.append('actionType', filters.actionType);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate.toISOString());
    if (filters?.toDate) params.append('toDate', filters.toDate.toISOString());
    
    const response = await api.get<ActivityLog[]>(`/dashboard/activity?${params.toString()}`);
    return response.data;
  },
};
