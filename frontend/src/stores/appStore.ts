import { create } from 'zustand';

type SyncStatus = 'online' | 'offline' | 'syncing' | 'synced' | 'error' | 'pending';

interface AppState {
  isOnline: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  pendingActionsCount: number;
  setOnline: (isOnline: boolean) => void;
  setSyncStatus: (status: SyncStatus) => void;
  setLastSyncTime: (time: Date) => void;
  setPendingActionsCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isOnline: navigator.onLine,
  syncStatus: 'synced',
  lastSyncTime: null,
  pendingActionsCount: 0,
  setOnline: (isOnline) => set({ isOnline }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setPendingActionsCount: (pendingActionsCount) => set({ pendingActionsCount }),
}));
