-- Normalize work order type (remove enum, make nullable TEXT) and equipment status (available/assigned_to_work only)
-- WorkOrder.type: WorkOrderType enum -> nullable String
-- Equipment.status: EquipmentStatus enum -> available | assigned_to_work

-- Step 1: Update all equipment statuses to new values
UPDATE "Equipment" SET "status" = 'assigned_to_work' WHERE "status" IN ('at_customer');
UPDATE "Equipment" SET "status" = 'available' WHERE "status" IN ('warehouse', 'in_repair');

-- Step 2: Drop the old EquipmentStatus enum values that are no longer used
-- (This is done automatically by Prisma when the enum definition changes)

-- Step 3: Drop the WorkOrderType enum
-- (This is done automatically by Prisma when the enum is removed)
