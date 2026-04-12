import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillDefaultTenant() {
  console.log('=== Phase 2: Backfill Default Tenant ===\n');

  // 1. Find or create default tenant
  console.log('1. Setting up default tenant...');
  let tenant = await prisma.tenant.findUnique({
    where: { slug: 'default' },
  });

  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Default Tenant',
        slug: 'default',
        isActive: true,
      },
    });
    console.log(`   Created new tenant: ${tenant.id} (${tenant.name})`);
  } else {
    console.log(`   Using existing tenant: ${tenant.id} (${tenant.name})`);
  }

  const tenantId = tenant.id;

  // 2. Backfill users into TenantMembership
  console.log('\n2. Backfilling user memberships...');
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true },
  });

  let membershipsCreated = 0;
  for (const user of users) {
    const existing = await prisma.tenantMembership.findUnique({
      where: {
        userId_tenantId: {
          userId: user.id,
          tenantId: tenantId,
        },
      },
    });

    if (!existing) {
      await prisma.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenantId,
          role: user.role,
        },
      });
      membershipsCreated++;
    }
  }
  console.log(`   Users with memberships: ${membershipsCreated}/${users.length}`);

  // 3. Backfill tenantId for each entity
  const entities = [
    { name: 'Site', count: await prisma.site.count({ where: { tenantId: null } }) },
    { name: 'WorkOrder', count: await prisma.workOrder.count({ where: { tenantId: null } }) },
    { name: 'Equipment', count: await prisma.equipment.count({ where: { tenantId: null } }) },
    { name: 'ActivityLog', count: await prisma.activityLog.count({ where: { tenantId: null } }) },
    { name: 'SettingsChecklistItem', count: await prisma.settingsChecklistItem.count({ where: { tenantId: null } }) },
    { name: 'SettingsWorkOrderType', count: await prisma.settingsWorkOrderType.count({ where: { tenantId: null } }) },
    { name: 'SettingsEquipmentType', count: await prisma.settingsEquipmentType.count({ where: { tenantId: null } }) },
    { name: 'SettingsEquipmentStatus', count: await prisma.settingsEquipmentStatus.count({ where: { tenantId: null } }) },
    { name: 'SettingsEquipmentCondition', count: await prisma.settingsEquipmentCondition.count({ where: { tenantId: null } }) },
    { name: 'EquipmentLocation', count: await prisma.equipmentLocation.count({ where: { tenantId: null } }) },
    { name: 'Technician', count: await prisma.technician.count({ where: { tenantId: null } }) },
    { name: 'ChecklistItem', count: await prisma.checklistItem.count({ where: { tenantId: null } }) },
    { name: 'WorkOrderStatusHistory', count: await prisma.workOrderStatusHistory.count({ where: { tenantId: null } }) },
    { name: 'WorkOrderEquipment', count: await prisma.workOrderEquipment.count({ where: { tenantId: null } }) },
    { name: 'EquipmentNote', count: await prisma.equipmentNote.count({ where: { tenantId: null } }) },
  ];

  for (const entity of entities) {
    if (entity.count > 0) {
      const update: Record<string, unknown> = { tenantId };
      
      // Dynamic update based on model name
      switch (entity.name) {
        case 'Site':
          await prisma.site.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'WorkOrder':
          await prisma.workOrder.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'Equipment':
          await prisma.equipment.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'ActivityLog':
          await prisma.activityLog.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'SettingsChecklistItem':
          await prisma.settingsChecklistItem.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'SettingsWorkOrderType':
          await prisma.settingsWorkOrderType.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'SettingsEquipmentType':
          await prisma.settingsEquipmentType.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'SettingsEquipmentStatus':
          await prisma.settingsEquipmentStatus.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'SettingsEquipmentCondition':
          await prisma.settingsEquipmentCondition.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'EquipmentLocation':
          await prisma.equipmentLocation.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'Technician':
          await prisma.technician.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'ChecklistItem':
          await prisma.checklistItem.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'WorkOrderStatusHistory':
          await prisma.workOrderStatusHistory.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'WorkOrderEquipment':
          await prisma.workOrderEquipment.updateMany({ where: { tenantId: null }, data: update });
          break;
        case 'EquipmentNote':
          await prisma.equipmentNote.updateMany({ where: { tenantId: null }, data: update });
          break;
      }
      console.log(`   ${entity.name}: ${entity.count} rows backfilled`);
    } else {
      console.log(`   ${entity.name}: already populated`);
    }
  }

  console.log('\n=== Backfill Complete ===');
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);
  console.log(`Users with memberships: ${membershipsCreated}`);

  // Final summary
  console.log('\nFinal tenantId population:');
  for (const entity of entities) {
    const populated = await (prisma as any)[entity.name.charAt(0).toLowerCase() + entity.name.slice(1)].count({
      where: { tenantId: tenantId },
    });
    console.log(`   ${entity.name}: ${populated}`);
  }
}

backfillDefaultTenant()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });