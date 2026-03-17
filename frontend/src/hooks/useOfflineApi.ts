import { useState, useEffect, useCallback } from 'react';
import { offlineApi } from '../services/offlineApi';
import { useAppStore } from '../stores/appStore';
import type { DBWorkOrder } from '../offline/db';

export function useOfflineApi() {
  const { setSyncStatus } = useAppStore();
  
  const handleOfflineError = useCallback((error: unknown): { offline: boolean; error?: string } => {
    if (error instanceof Error && error.message === 'offline_queued') {
      setSyncStatus('pending');
      return { offline: true };
    }
    return { offline: false };
  }, [setSyncStatus]);

  return {
    offlineApi,
    handleOfflineError,
  };
}

export function useMyTasks(technicianId: string | undefined) {
  const [tasks, setTasks] = useState<DBWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!technicianId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await offlineApi.getMyTasks(technicianId);
      setTasks(response.data);
      setFromCache(!!response.fromCache);
    } catch (err: any) {
      if (err.fromCache) {
        setTasks(err.data);
        setFromCache(true);
      } else {
        setError(err.message || 'Failed to fetch tasks');
      }
    } finally {
      setLoading(false);
    }
  }, [technicianId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, fromCache, refetch: fetchTasks };
}

export function useWorkOrder(workOrderId: string | undefined) {
  const [workOrder, setWorkOrder] = useState<DBWorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchWorkOrder = useCallback(async () => {
    if (!workOrderId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await offlineApi.getWorkOrderWithDetails(workOrderId);
      setWorkOrder(response.data);
      setFromCache(!!response.fromCache);
    } catch (err: any) {
      if (err.fromCache) {
        setWorkOrder(err.data);
        setFromCache(true);
      } else {
        setError(err.message || 'Failed to fetch work order');
      }
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  useEffect(() => {
    fetchWorkOrder();
  }, [fetchWorkOrder]);

  return { workOrder, loading, error, fromCache, refetch: fetchWorkOrder };
}
