const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairTenant(tenantId, tenantName) {
  console.log(`\n=== Repairing tenant: ${tenantName} (${tenantId}) ===`);

  await prisma.settingsLocality.deleteMany({ where: { tenantId } });
  await prisma.settingsArea.deleteMany({ where: { tenantId } });

  const templateAreas = await prisma.systemAreaTemplate.findMany({
    orderBy: { displayOrder: 'asc' },
  });

  const areaIdMap = {};
  for (const templateArea of templateAreas) {
    const tenantArea = await prisma.settingsArea.create({
      data: { tenantId, name: templateArea.name },
    });
    areaIdMap[templateArea.name] = tenantArea.id;
  }

  const templateLocalities = await prisma.systemLocalityTemplate.findMany({
    include: { area: true },
  });

  let created = 0;
  const batch = [];
  for (const tl of templateLocalities) {
    if (!tl.area) continue;
    const tenantAreaId = areaIdMap[tl.area.name];
    if (!tenantAreaId) continue;
    batch.push({ tenantId, name: tl.name, areaId: tenantAreaId });
  }

  while (batch.length > 0) {
    const chunk = batch.splice(0, 100);
    await prisma.settingsLocality.createMany({ data: chunk, skipDuplicates: true });
    created += chunk.length;
  }

  const finalAreas = await prisma.settingsArea.findMany({
    where: { tenantId },
    include: { _count: { select: { localities: true } } },
    orderBy: { name: 'asc' },
  });

  console.log(`  Result for ${tenantName}:`);
  for (const a of finalAreas) {
    console.log(`    ${a.name}: ${a._count.localities} localities`);
  }
  console.log(`  Total: ${created} localities created`);
}

async function main() {
  console.log('=== Repairing all tenants from template ===');

  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } });

  if (tenants.length === 0) {
    const defaultTenant = await prisma.tenant.findFirst();
    if (defaultTenant) {
      await repairTenant(defaultTenant.id, defaultTenant.name || 'Default Tenant');
    }
  } else {
    for (const tenant of tenants) {
      await repairTenant(tenant.id, tenant.name || tenant.id);
    }
  }

  console.log('\n=== All tenants repaired ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
