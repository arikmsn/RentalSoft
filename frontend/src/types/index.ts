export type UserRole = 'manager' | 'technician' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  lastLogin?: Date;
}

export type EquipmentStatus = 'warehouse' | 'at_customer' | 'in_repair' | 'available';
export type EquipmentCondition = 'ok' | 'not_ok' | 'wearout';

export interface Equipment {
  id: string;
  qrTag: string;
  type: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  siteId?: string;
  lastScanDate?: Date;
  installationDate?: Date;
  plannedRemovalDate?: Date;
  actualRemovalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Site {
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
  latitude?: number;
  longitude?: number;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkOrderType = 'installation' | 'inspection' | 'removal' | 'general';
export type WorkOrderStatus = 'open' | 'in_progress' | 'completed';

export interface Technician {
  id: string;
  name: string;
  email: string;
}

export interface WorkOrder {
  id: string;
  type: WorkOrderType;
  siteId: string;
  technicianId: string;
  status: WorkOrderStatus;
  plannedDate: Date;
  actualDate?: Date;
  done?: string;
  todo?: string;
  plannedRemovalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  site?: Site;
  technician?: Technician;
  checklist?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  workOrderId: string;
  itemName: string;
  isChecked: boolean;
  value?: string;
}

export type ActionType = 
  | 'status_change'
  | 'location_change'
  | 'workorder_created'
  | 'workorder_completed'
  | 'checklist_update'
  | 'done_update'
  | 'todo_update'
  | 'planned_removal_change';

export interface ActivityLog {
  id: string;
  equipmentId?: string;
  siteId?: string;
  workOrderId?: string;
  userId: string;
  actionType: ActionType;
  timestamp: Date;
  notes?: string;
  locationLat?: number;
  locationLng?: number;
}

export interface Alert {
  id: string;
  equipmentId: string;
  type: 'past_removal' | 'close_to_removal' | 'long_stay';
  daysRemaining: number;
  createdAt: Date;
}

export interface EquipmentType {
  id: string;
  name: string;
  description?: string;
}
