-- Add "workTypeId" column to WorkOrder
ALTER TABLE "WorkOrder" ADD COLUMN "workTypeId" TEXT REFERENCES "SettingsWorkOrderType"(id);
