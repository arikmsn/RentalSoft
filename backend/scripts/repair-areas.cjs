const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function repairTenant(tenantId, tenantName) {
  console.log(`\n=== Repairing tenant: ${tenantName} (${tenantId}) ===`);

  const overrides = await prisma.settingsLocalityOverride.findMany({
    where: { tenantId },
  });
  const overrideMap = new Map(overrides.map(o => [o.localityName, o.areaId]));

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
  let fixedCount = 0;
  const batch = [];
  for (const tl of templateLocalities) {
    const tenantAreaId = tl.area ? areaIdMap[tl.area.name] : null;
    batch.push({
      tenantId,
      name: tl.name,
      areaId: tenantAreaId,
      isFixed: tl.isFixed,
      isOverride: false,
    });
    if (tl.isFixed) fixedCount++;
  }

  while (batch.length > 0) {
    const chunk = batch.splice(0, 100);
    await prisma.settingsLocality.createMany({ data: chunk, skipDuplicates: true });
    created += chunk.length;
  }

  for (const [localityName, areaId] of overrideMap) {
    await prisma.settingsLocalityOverride.upsert({
      where: {
        tenantId_localityName: { tenantId, localityName },
      },
      update: { areaId },
      create: { tenantId, localityName, areaId },
    });
    const loc = await prisma.settingsLocality.findFirst({
      where: { tenantId, name: localityName },
    });
    if (loc) {
      await prisma.settingsLocality.update({
        where: { id: loc.id },
        data: { areaId, isOverride: true },
      });
    }
  }

  const finalAreas = await prisma.settingsArea.findMany({
    where: { tenantId },
    include: { _count: { select: { localities: true } } },
    orderBy: { name: 'asc' },
  });

  const noAreaCount = await prisma.settingsLocality.count({
    where: { tenantId, areaId: null },
  });

  console.log(`  Result for ${tenantName}:`);
  for (const a of finalAreas) {
    console.log(`    ${a.name}: ${a._count.localities} localities`);
  }
  console.log(`  No area: ${noAreaCount}`);
  console.log(`  Fixed localities: ${fixedCount}`);
  console.log(`  Total: ${created} localities`);
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
