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

export type EquipmentStatus = 'available' | 'assigned_to_work';
export type EquipmentCondition = 'ok' | 'not_ok' | 'wearout';

export interface Equipment {
  id: string;
  qrTag: string;
  type: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  conditionState?: 'OK' | 'NOT_OK';
  purchaseDate?: Date | null;
  currentLocationId?: string | null;
  siteId?: string;
  lastScanDate?: Date;
  installationDate?: Date;
  plannedRemovalDate?: Date;
  actualRemovalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  activeWorkOrder?: {
    id: string;
    status: string;
    type: string;
    site: {
      name: string;
      city: string;
    };
  } | null;
  nextPlannedRemovalDate?: Date | null;
  location?: {
    id: string;
    name: string;
  } | null;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  city: string;
  houseNumber?: string;
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
  hasValidLocation?: boolean;
  createdAt: Date;
  updatedAt: Date;
  workOrders?: { id: string; title: string; status: WorkOrderStatus; plannedDate: Date }[];
}

export type WorkOrderStatus = 'open' | 'in_progress' | 'completed';
export type WorkOrderStatusColor = 'black' | 'red' | 'orange' | 'green';

export interface Technician {
  id: string;
  name: string;
  email: string;
}

export interface WorkOrder {
  id: string;
  type?: string;
  workTypeName?: string;
  workTypeId?: string;
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
  equipmentCount?: number;
  statusColor?: WorkOrderStatusColor;
  daysUntilRemoval?: number | null;
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
  equipmentId: string | null;
  workOrderId: string | null;
  type: 'past_removal' | 'close_to_removal';
  daysRemaining: number;
  createdAt: Date;
  siteName: string;
  siteAddress: string;
  siteContact: string;
  sitePhone: string;
}

export interface EquipmentType {
  id: string;
  name: string;
  description?: string;
}
