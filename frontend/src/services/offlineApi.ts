import { api } from './api';
import { useAppStore } from '../stores/appStore';
import {
  db,
  type DBSite,
  type DBEquipment,
  type DBWorkOrder,
  type DBChecklistItem,
  addQueuedAction,
  getQueuedActionsCount,
} from '../offline/db';

export interface ApiResponse<T> {
  data: T;
  fromCache?: boolean;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

async function fetchAndCache<T>(
  endpoint: string,
  dbTable: any
): Promise<ApiResponse<T>> {
  try {
    const response = await api.get<T>(endpoint);
    const now = new Date();
    
    if (Array.isArray(response.data)) {
      for (const item of response.data) {
        if (item && typeof item === 'object' && 'id' in item) {
          await dbTable.put({ ...item, cachedAt: now });
        }
      }
    } else if (response.data && typeof response.data === 'object' && 'id' in response.data) {
      await dbTable.put({ ...response.data, cachedAt: now });
    }
    
    return { data: response.data };
  } catch (error) {
    console.warn(`Network error for ${endpoint}, falling back to cache`);
    
    const cached = await dbTable.toArray();
    if (cached.length > 0) {
      const cachedData = cached.map((item: any) => {
        const { cachedAt, ...rest } = item;
        return rest;
      });
      return { data: cachedData as T, fromCache: true };
    }
    throw error;
  }
}

export const offlineApi = {
  async getSites(): Promise<ApiResponse<DBSite[]>> {
    return fetchAndCache<DBSite[]>(
      '/sites',
      db.sites
    );
  },

  async getSite(id: string): Promise<ApiResponse<DBSite | null>> {
    try {
      const response = await api.get<DBSite>(`/sites/${id}`);
      await db.sites.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      const cached = await db.sites.get(id);
      if (cached) {
        const { cachedAt, ...rest } = cached;
        return { data: rest as DBSite, fromCache: true };
      }
      throw error;
    }
  },

  async getEquipment(): Promise<ApiResponse<DBEquipment[]>> {
    return fetchAndCache<DBEquipment[]>(
      '/equipment',
      db.equipment
    );
  },

  async getEquipmentById(id: string): Promise<ApiResponse<DBEquipment | null>> {
    try {
      const response = await api.get<DBEquipment>(`/equipment/${id}`);
      await db.equipment.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      const cached = await db.equipment.get(id);
      if (cached) {
        const { cachedAt, ...rest } = cached;
        return { data: rest as DBEquipment, fromCache: true };
      }
      throw error;
    }
  },

  async getEquipmentByQr(qrTag: string): Promise<ApiResponse<DBEquipment | null>> {
    try {
      const response = await api.get<DBEquipment>(`/equipment/qr/${qrTag}`);
      await db.equipment.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      const cached = await db.equipment.where('qrTag').equals(qrTag).first();
      if (cached) {
        const { cachedAt, ...rest } = cached;
        return { data: rest as DBEquipment, fromCache: true };
      }
      throw error;
    }
  },

  async getWorkOrders(): Promise<ApiResponse<DBWorkOrder[]>> {
    return fetchAndCache<DBWorkOrder[]>(
      '/workorders',
      db.workOrders
    );
  },

  async getWorkOrder(id: string): Promise<ApiResponse<DBWorkOrder | null>> {
    try {
      const response = await api.get<DBWorkOrder>(`/workorders/${id}`);
      await db.workOrders.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      const cached = await db.workOrders.get(id);
      if (cached) {
        const { cachedAt, ...rest } = cached;
        return { data: rest as DBWorkOrder, fromCache: true };
      }
      throw error;
    }
  },

  async getWorkOrderWithDetails(id: string): Promise<ApiResponse<DBWorkOrder | null>> {
    try {
      const [workOrder, checklist] = await Promise.all([
        api.get<DBWorkOrder>(`/workorders/${id}`),
        api.get<DBChecklistItem[]>(`/workorders/${id}/checklist`),
      ]);
      
      const fullWorkOrder = { ...workOrder.data, checklist: checklist.data, cachedAt: new Date() };
      await db.workOrders.put(fullWorkOrder);
      for (const item of checklist.data) {
        await db.checklistItems.put({ ...item, cachedAt: new Date() });
      }
      
      return { data: fullWorkOrder };
    } catch (error) {
      const cached = await db.workOrders.get(id);
      if (cached) {
        const checklist = await db.checklistItems.where('workOrderId').equals(id).toArray();
        const { cachedAt, ...rest } = cached;
        return { data: { ...rest, checklist } as DBWorkOrder, fromCache: true };
      }
      throw error;
    }
  },

  async getMyTasks(technicianId: string): Promise<ApiResponse<DBWorkOrder[]>> {
    try {
      const response = await api.get<DBWorkOrder[]>(`/workorders/my-tasks/${technicianId}`);
      const now = new Date();
      for (const wo of response.data) {
        await db.workOrders.put({ ...wo, cachedAt: now });
      }
      return { data: response.data };
    } catch (error) {
      const cached = await db.workOrders
        .where('technicianId')
        .equals(technicianId)
        .toArray();
      
      if (cached.length > 0) {
        return { data: cached as DBWorkOrder[], fromCache: true };
      }
      throw error;
    }
  },

  async scanEquipment(equipmentId: string): Promise<ApiResponse<DBEquipment>> {
    const payload = { equipmentId };
    
    if (!isOnline()) {
      await addQueuedAction('scan_equipment', payload);
      const cached = await db.equipment.get(equipmentId);
      if (cached) {
        await db.equipment.update(equipmentId, {
          status: 'assigned_to_work',
          lastScanDate: new Date(),
          cachedAt: new Date(),
        });
      }
      throw new Error('offline_queued');
    }

    try {
      const response = await api.post<DBEquipment>(`/equipment/${equipmentId}/scan`, {});
      await db.equipment.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      await addQueuedAction('scan_equipment', payload);
      throw new Error('offline_queued');
    }
  },

  async updateChecklist(workOrderId: string, items: any[]): Promise<ApiResponse<DBChecklistItem[]>> {
    const payload = { workOrderId, items };
    
    if (!isOnline()) {
      await addQueuedAction('update_checklist', payload);
      for (const item of items) {
        if (item.id) {
          await db.checklistItems.update(item.id, { ...item, cachedAt: new Date() });
        } else {
          await db.checklistItems.add({ ...item, workOrderId, cachedAt: new Date() });
        }
      }
      throw new Error('offline_queued');
    }

    try {
      const response = await api.patch<DBChecklistItem[]>(`/workorders/${workOrderId}/checklist`, { items });
      for (const item of response.data) {
        await db.checklistItems.put({ ...item, cachedAt: new Date() });
      }
      return { data: response.data };
    } catch (error) {
      await addQueuedAction('update_checklist', payload);
      throw new Error('offline_queued');
    }
  },

  async completeWorkOrder(
    workOrderId: string, 
    data: { done?: string; todo?: string; equipmentIds?: string[] }
  ): Promise<ApiResponse<DBWorkOrder>> {
    const payload = { workOrderId, ...data };
    
    if (!isOnline()) {
      await addQueuedAction('complete_workorder', payload);
      await db.workOrders.update(workOrderId, {
        status: 'completed',
        done: data.done,
        todo: data.todo,
        actualDate: new Date(),
        cachedAt: new Date(),
      });
      throw new Error('offline_queued');
    }

    try {
      const response = await api.post<DBWorkOrder>(`/workorders/${workOrderId}/complete`, data);
      await db.workOrders.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      await addQueuedAction('complete_workorder', payload);
      throw new Error('offline_queued');
    }
  },

  async updateWorkOrderNotes(
    workOrderId: string, 
    data: { done?: string; todo?: string }
  ): Promise<ApiResponse<DBWorkOrder>> {
    const payload = { workOrderId, ...data };
    
    if (!isOnline()) {
      await addQueuedAction('update_workorder_notes', payload);
      await db.workOrders.update(workOrderId, {
        ...data,
        cachedAt: new Date(),
      });
      throw new Error('offline_queued');
    }

    try {
      const response = await api.patch<DBWorkOrder>(`/workorders/${workOrderId}`, data);
      await db.workOrders.put({ ...response.data, cachedAt: new Date() });
      return { data: response.data };
    } catch (error) {
      await addQueuedAction('update_workorder_notes', payload);
      throw new Error('offline_queued');
    }
  },
};

export async function updateSyncStatus(): Promise<{ pendingCount: number; isOnline: boolean }> {
  const pendingCount = await getQueuedActionsCount();
  const online = isOnline();
  useAppStore.getState().setSyncStatus(online ? (pendingCount > 0 ? 'pending' : 'synced') : 'offline');
  return { pendingCount, isOnline: online };
}
