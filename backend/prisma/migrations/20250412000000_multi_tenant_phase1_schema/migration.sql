-- CreateTenantTable
CREATE TABLE "Tenant" (
    "id" VARCHAR(36) PRIMARY KEY,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL UNIQUE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTenantMembershipTable
CREATE TABLE "TenantMembership" (
    "id" VARCHAR(36) PRIMARY KEY,
    "userId" VARCHAR(36) NOT NULL,
    "tenantId" VARCHAR(36) NOT NULL,
    "role" VARCHAR(255) NOT NULL DEFAULT 'member',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("userId", "tenantId")
);

-- AddIsSuperAdminToUser
ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- AddTenantIdToSite
ALTER TABLE "Site" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToWorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToEquipment
ALTER TABLE "Equipment" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToActivityLog
ALTER TABLE "ActivityLog" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToSettingsChecklistItem
ALTER TABLE "SettingsChecklistItem" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToSettingsWorkOrderType
ALTER TABLE "SettingsWorkOrderType" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToSettingsEquipmentType
ALTER TABLE "SettingsEquipmentType" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToSettingsEquipmentStatus
ALTER TABLE "SettingsEquipmentStatus" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToSettingsEquipmentCondition
ALTER TABLE "SettingsEquipmentCondition" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToEquipmentLocation
ALTER TABLE "EquipmentLocation" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToTechnician
ALTER TABLE "Technician" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToChecklistItem
ALTER TABLE "ChecklistItem" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToWorkOrderStatusHistory
ALTER TABLE "WorkOrderStatusHistory" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToWorkOrderEquipment
ALTER TABLE "WorkOrderEquipment" ADD COLUMN "tenantId" VARCHAR(36);

-- AddTenantIdToEquipmentNote
ALTER TABLE "EquipmentNote" ADD COLUMN "tenantId" VARCHAR(36);

-- CreateTenantForeignKeys
ALTER TABLE "TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Site" ADD CONSTRAINT "Site_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettingsChecklistItem" ADD CONSTRAINT "SettingsChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettingsWorkOrderType" ADD CONSTRAINT "SettingsWorkOrderType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettingsEquipmentType" ADD CONSTRAINT "SettingsEquipmentType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettingsEquipmentStatus" ADD CONSTRAINT "SettingsEquipmentStatus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SettingsEquipmentCondition" ADD CONSTRAINT "SettingsEquipmentCondition_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipmentLocation" ADD CONSTRAINT "EquipmentLocation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Technician" ADD CONSTRAINT "Technician_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChecklistItem" ADD CONSTRAINT "ChecklistItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrderStatusHistory" ADD CONSTRAINT "WorkOrderStatusHistory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkOrderEquipment" ADD CONSTRAINT "WorkOrderEquipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EquipmentNote" ADD CONSTRAINT "EquipmentNote_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateMigrationLock
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "state") VALUES ('20250412000000', 'dummy', CURRENT_TIMESTAMP, '20250412000000_multi_tenant_phase1_schema', NULL, NULL, CURRENT_TIMESTAMP, 'APPLIED') ON CONFLICT DO NOTHING;