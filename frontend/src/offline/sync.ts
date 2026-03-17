import { api } from '../services/api';
import { getPendingActions, markActionSynced, removeQueuedAction, getQueuedActionsCount } from '../offline/db';
import { useAppStore } from '../stores/appStore';

let syncInterval: number | null = null;

export function startSyncService() {
  if (syncInterval) return;
  
  syncInterval = window.setInterval(async () => {
    await processQueuedActions();
  }, 30000);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
}

export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);
}

function handleOnline() {
  useAppStore.getState().setOnline(true);
  processQueuedActions();
}

function handleOffline() {
  useAppStore.getState().setOnline(false);
  useAppStore.getState().setSyncStatus('offline');
}

export async function processQueuedActions(): Promise<{ synced: number; failed: number }> {
  if (!navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  useAppStore.getState().setSyncStatus('syncing');
  
  const actions = await getPendingActions();
  let synced = 0;
  let failed = 0;

  for (const action of actions) {
    try {
      const payload = JSON.parse(action.payload);
      
      switch (action.type) {
        case 'scan_equipment':
          await api.post(`/equipment/${payload.equipmentId}/scan`, { siteId: payload.siteId });
          break;
          
        case 'update_checklist':
          await api.patch(`/workorders/${payload.workOrderId}/checklist`, { items: payload.items });
          break;
          
        case 'complete_workorder':
          await api.post(`/workorders/${payload.workOrderId}/complete`, {
            done: payload.done,
            todo: payload.todo,
            equipmentIds: payload.equipmentIds,
          });
          break;
          
        case 'update_workorder_notes':
          await api.patch(`/workorders/${payload.workOrderId}`, {
            done: payload.done,
            todo: payload.todo,
          });
          break;
          
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }

      await markActionSynced(action.id);
      await removeQueuedAction(action.id);
      synced++;
    } catch (error) {
      console.error(`Failed to sync action ${action.id}:`, error);
      failed++;
    }
  }

  const pendingCount = await getQueuedActionsCount();
  useAppStore.getState().setPendingActionsCount(pendingCount);
  
  if (pendingCount === 0) {
    useAppStore.getState().setSyncStatus('synced');
    useAppStore.getState().setLastSyncTime(new Date());
  } else {
    useAppStore.getState().setSyncStatus('pending');
  }

  return { synced, failed };
}

export async function initializeSync(): Promise<void> {
  const pendingCount = await getQueuedActionsCount();
  useAppStore.getState().setPendingActionsCount(pendingCount);
  
  if (pendingCount > 0) {
    useAppStore.getState().setSyncStatus('pending');
  }
  
  startSyncService();
  
  if (navigator.onLine) {
    await processQueuedActions();
  }
}
