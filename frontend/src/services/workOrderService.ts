import { api } from './api';
import type { WorkOrder, WorkOrderType, WorkOrderStatus, ChecklistItem } from '../types';

export interface WorkOrderFilters {
  type?: WorkOrderType;
  status?: WorkOrderStatus;
  technicianId?: string;
  siteId?: string;
  plannedDate?: Date;
}

export interface CreateWorkOrderRequest {
  type: WorkOrderType;
  siteId: string;
  technicianId: string;
  plannedDate: Date;
  plannedRemovalDate?: Date;
}

export interface UpdateWorkOrderRequest {
  type?: WorkOrderType;
  status?: WorkOrderStatus;
  siteId?: string;
  technicianId?: string;
  plannedDate?: Date;
  actualDate?: Date;
  done?: string;
  todo?: string;
  plannedRemovalDate?: Date;
}

export interface CompleteWorkOrderRequest {
  done?: string;
  todo?: string;
  equipmentIds?: string[];
  newStatus?: string;
}

export interface ChecklistUpdate {
  id?: string;
  itemName: string;
  isChecked: boolean;
  value?: string;
}

export const workOrderService = {
  async getAll(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.technicianId) params.append('technicianId', filters.technicianId);
    if (filters?.siteId) params.append('siteId', filters.siteId);
    if (filters?.plannedDate) params.append('plannedDate', filters.plannedDate.toISOString());
    
    const response = await api.get<WorkOrder[]>(`/workorders?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<WorkOrder> {
    const response = await api.get<WorkOrder>(`/workorders/${id}`);
    return response.data;
  },

  async getWithDetails(id: string): Promise<WorkOrder> {
    const [workOrder, checklist] = await Promise.all([
      api.get<WorkOrder>(`/workorders/${id}`),
      api.get<ChecklistItem[]>(`/workorders/${id}/checklist`),
    ]);
    return { ...workOrder.data, checklist: checklist.data };
  },

  async getMyTasks(technicianId: string): Promise<WorkOrder[]> {
    const response = await api.get<WorkOrder[]>(`/workorders/my-tasks/${technicianId}`);
    return response.data;
  },

  async create(data: CreateWorkOrderRequest): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>('/workorders', data);
    return response.data;
  },

  async update(id: string, data: UpdateWorkOrderRequest): Promise<WorkOrder> {
    const response = await api.patch<WorkOrder>(`/workorders/${id}`, data);
    return response.data;
  },

  async complete(id: string, data: CompleteWorkOrderRequest): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(`/workorders/${id}/complete`, data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/workorders/${id}`);
  },

  async getChecklist(workOrderId: string): Promise<ChecklistItem[]> {
    const response = await api.get<ChecklistItem[]>(`/workorders/${workOrderId}/checklist`);
    return response.data;
  },

  async updateChecklist(workOrderId: string, items: ChecklistUpdate[]): Promise<ChecklistItem[]> {
    const response = await api.patch<ChecklistItem[]>(`/workorders/${workOrderId}/checklist`, { items });
    return response.data;
  },

  async addEquipment(workOrderId: string, equipmentId: string): Promise<WorkOrder> {
    const response = await api.post<WorkOrder>(`/workorders/${workOrderId}/equipment`, { equipmentId });
    return response.data;
  },

  async removeEquipment(workOrderId: string, equipmentId: string): Promise<WorkOrder> {
    const response = await api.delete<WorkOrder>(`/workorders/${workOrderId}/equipment/${equipmentId}`);
    return response.data;
  },
};
