import Dexie, { type Table } from 'dexie';

export interface DBSite {
  id: string;
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
  isHighlighted: boolean;
  isActive: boolean;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
  cachedAt?: Date;
}

export interface DBEquipment {
  id: string;
  qrTag: string;
  type: string;
  status: 'available' | 'assigned_to_work';
  condition: 'ok' | 'not_ok' | 'wearout';
  siteId?: string;
  lastScanDate?: Date;
  installationDate?: Date;
  plannedRemovalDate?: Date;
  actualRemovalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  cachedAt?: Date;
}

export interface DBWorkOrder {
  id: string;
  type?: string;
  siteId: string;
  technicianId: string;
  status: 'open' | 'in_progress' | 'completed';
  plannedDate: Date;
  actualDate?: Date;
  done?: string;
  todo?: string;
  plannedRemovalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  site?: DBSite;
  technician?: { id: string; name: string; email: string };
  checklist?: DBChecklistItem[];
  cachedAt?: Date;
}

export interface DBChecklistItem {
  id: string;
  workOrderId: string;
  itemName: string;
  isChecked: boolean;
  value?: string;
  cachedAt?: Date;
}

export interface DBActivityLog {
  id: string;
  equipmentId?: string;
  siteId?: string;
  workOrderId?: string;
  userId: string;
  actionType: string;
  timestamp: Date;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
  cachedAt?: Date;
}

export interface DBQueuedAction {
  id: string;
  type: 'scan_equipment' | 'update_checklist' | 'complete_workorder' | 'update_workorder_notes' | 'create_workorder';
  payload: string;
  createdAt: Date;
  synced: boolean;
  syncedAt?: Date;
  error?: string;
}

export class RentalSoftDB extends Dexie {
  sites!: Table<DBSite>;
  equipment!: Table<DBEquipment>;
  workOrders!: Table<DBWorkOrder>;
  checklistItems!: Table<DBChecklistItem>;
  activityLogs!: Table<DBActivityLog>;
  queuedActions!: Table<DBQueuedAction>;

  constructor() {
    super('RentalSoftDB');
    this.version(1).stores({
      sites: 'id, name, city, cachedAt',
      equipment: 'id, qrTag, type, status, siteId, cachedAt',
      workOrders: 'id, type, status, siteId, technicianId, cachedAt',
      checklistItems: 'id, workOrderId, cachedAt',
      activityLogs: 'id, equipmentId, siteId, workOrderId, userId, cachedAt',
      queuedActions: 'id, type, synced, createdAt',
    });
  }
}

export const db = new RentalSoftDB();

export async function clearOldCache(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeMs);
  await Promise.all([
    db.sites.where('cachedAt').below(cutoff).delete(),
    db.equipment.where('cachedAt').below(cutoff).delete(),
    db.workOrders.where('cachedAt').below(cutoff).delete(),
    db.checklistItems.where('cachedAt').below(cutoff).delete(),
    db.activityLogs.where('cachedAt').below(cutoff).delete(),
  ]);
}

export async function getPendingActions(): Promise<DBQueuedAction[]> {
  return db.queuedActions.where('synced').equals(0).toArray();
}

export async function markActionSynced(id: string): Promise<void> {
  await db.queuedActions.update(id, { synced: true, syncedAt: new Date() });
}

export async function addQueuedAction(type: DBQueuedAction['type'], payload: object): Promise<string> {
  const id = crypto.randomUUID();
  await db.queuedActions.add({
    id,
    type,
    payload: JSON.stringify(payload),
    createdAt: new Date(),
    synced: false,
  });
  return id;
}

export async function removeQueuedAction(id: string): Promise<void> {
  await db.queuedActions.delete(id);
}

export async function getQueuedActionsCount(): Promise<number> {
  return db.queuedActions.where('synced').equals(0).count();
}
