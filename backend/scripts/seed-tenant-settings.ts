import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BASELINE_WORK_ORDER_TYPES = [
  { name: 'כללי', sortOrder: 4 },
  { name: 'בדיקת רטיבות / חוות דעת', sortOrder: 0 },
  { name: 'פירוק ציוד ייבוש בלבד', sortOrder: 0 },
  { name: 'בניין / מוסד', sortOrder: 0 },
  { name: 'דירת מגורים', sortOrder: 0 },
  { name: 'וילה / בית פרטי', sortOrder: 0 },
  { name: 'פרויקט קבלן', sortOrder: 0 },
  { name: 'ייבוש סומסום', sortOrder: 0 },
  { name: 'ייבוש חול', sortOrder: 0 },
];

const BASELINE_EQUIPMENT_TYPES = [
  { name: 'מסיר רטיבות', code: '1000', sortOrder: 0 },
  { name: 'מפוח חום', code: '2000', sortOrder: 1 },
  { name: 'מד רטיבות', code: '3000', sortOrder: 2 },
  { name: 'משאבת בולמן', code: '4000', sortOrder: 3 },
];

const BASELINE_EQUIPMENT_STATUSES = [
  { name: 'זמין', code: 'AVAILABLE', sortOrder: 0 },
  { name: 'בעבודה', code: 'IN_USE', sortOrder: 1 },
  { name: 'תחזוקה', code: 'MAINTENANCE', sortOrder: 2 },
  { name: 'פגום', code: 'BROKEN', sortOrder: 3 },
];

const BASELINE_EQUIPMENT_CONDITIONS = [
  { name: 'תקין', code: 'OK', sortOrder: 0 },
  { name: 'לא תקין', code: 'NOT_OK', sortOrder: 1 },
  { name: 'בלאי', code: 'WEAROUT', sortOrder: 2 },
];

const BASELINE_CHECKLIST_ITEMS = [
  { name: 'בדיקת חיבור חשמל', sortOrder: 0 },
  { name: 'חיבור צינור ניקוז', sortOrder: 1 },
  { name: 'הפעלת מכונה', sortOrder: 2 },
  { name: 'בדיקת זרימת אוויר', sortOrder: 3 },
  { name: 'הדרכת לקוח', sortOrder: 4 },
];

const BASELINE_EQUIPMENT_LOCATIONS = [
  { name: 'לקוח', isDefaultCustomer: true, isSystem: false },
];

async function seedTenantSettings(tenantId: string, tenantName: string) {
  console.log(`\n=== Seeding settings for tenant: ${tenantName} (${tenantId}) ===`);

  // Seed Work Order Types
  for (const type of BASELINE_WORK_ORDER_TYPES) {
    const existing = await prisma.settingsWorkOrderType.findFirst({
      where: { tenantId, name: type.name },
    });
    if (!existing) {
      await prisma.settingsWorkOrderType.create({
        data: { ...type, tenantId, isActive: true },
      });
      console.log(`  + WorkOrderType: ${type.name}`);
    }
  }

  // Seed Equipment Types
  for (const type of BASELINE_EQUIPMENT_TYPES) {
    const existing = await prisma.settingsEquipmentType.findFirst({
      where: { tenantId, name: type.name },
    });
    if (!existing) {
      await prisma.settingsEquipmentType.create({
        data: { ...type, tenantId, isActive: true },
      });
      console.log(`  + EquipmentType: ${type.name}`);
    }
  }

  // Seed Equipment Statuses
  for (const status of BASELINE_EQUIPMENT_STATUSES) {
    const existing = await prisma.settingsEquipmentStatus.findFirst({
      where: { tenantId, name: status.name },
    });
    if (!existing) {
      await prisma.settingsEquipmentStatus.create({
        data: { ...status, tenantId, isActive: true },
      });
      console.log(`  + EquipmentStatus: ${status.name}`);
    }
  }

  // Seed Equipment Conditions
  for (const cond of BASELINE_EQUIPMENT_CONDITIONS) {
    const existing = await prisma.settingsEquipmentCondition.findFirst({
      where: { tenantId, name: cond.name },
    });
    if (!existing) {
      await prisma.settingsEquipmentCondition.create({
        data: { ...cond, tenantId, isActive: true },
      });
      console.log(`  + EquipmentCondition: ${cond.name}`);
    }
  }

  // Seed Checklist Items
  for (const item of BASELINE_CHECKLIST_ITEMS) {
    const existing = await prisma.settingsChecklistItem.findFirst({
      where: { tenantId, name: item.name },
    });
    if (!existing) {
      await prisma.settingsChecklistItem.create({
        data: { ...item, tenantId, isActive: true },
      });
      console.log(`  + ChecklistItem: ${item.name}`);
    }
  }

  // Seed Equipment Locations (non-system)
  for (const loc of BASELINE_EQUIPMENT_LOCATIONS) {
    const existing = await prisma.equipmentLocation.findFirst({
      where: { tenantId, name: loc.name },
    });
    if (!existing) {
      await prisma.equipmentLocation.create({
        data: { ...loc, tenantId, isSystem: false },
      });
      console.log(`  + EquipmentLocation: ${loc.name}`);
    }
  }

  console.log(`=== Done seeding ${tenantName} ===`);
}

async function main() {
  const tenants = await prisma.tenant.findMany();
  
  for (const tenant of tenants) {
    const existingTypes = await prisma.settingsWorkOrderType.findFirst({
      where: { tenantId: tenant.id },
    });
    
    if (!existingTypes) {
      await seedTenantSettings(tenant.id, tenant.name);
    } else {
      console.log(`\nSkipping ${tenant.name} - already has settings`);
    }
  }

  await prisma.$disconnect();
  console.log('\n=== Seeding complete ===');
}

main().catch(console.error);