const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('=== DB Verification ===\n');

  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } });
  console.log(`Found ${tenants.length} tenants\n`);

  for (const tenant of tenants) {
    console.log(`--- Tenant: ${tenant.name} (${tenant.id}) ---`);

    const areas = await prisma.settingsArea.findMany({
      where: { tenantId: tenant.id },
      orderBy: { name: 'asc' },
    });

    const areaCounts = {};
    let totalWithArea = 0;
    let totalWithoutArea = 0;

    for (const area of areas) {
      const count = await prisma.settingsLocality.count({
        where: { tenantId: tenant.id, areaId: area.id },
      });
      if (count > 0) {
        areaCounts[area.name] = count;
        totalWithArea += count;
      }
    }

    totalWithoutArea = await prisma.settingsLocality.count({
      where: { tenantId: tenant.id, areaId: null },
    });

    console.log('  Areas with localities:');
    for (const [areaName, count] of Object.entries(areaCounts)) {
      console.log(`    ${areaName}: ${count}`);
    }
    console.log(`  No area: ${totalWithoutArea}`);
    console.log(`  Total with area: ${totalWithArea}`);
    console.log(`  Grand total: ${totalWithArea + totalWithoutArea}`);

    const mdCities = ['תל אביב יפו', 'חיפה', 'נתניה', 'ירושלים', 'באר שבע', 'ראשון לציון', 'נצרת', 'כפר סבא', 'רעננה', 'הרצליה'];
    console.log('\n  Sample MD cities (should have area):');
    for (const city of mdCities) {
      const loc = await prisma.settingsLocality.findFirst({
        where: { tenantId: tenant.id, name: city },
        include: { area: true },
      });
      if (loc) {
        console.log(`    ${city}: ${loc.area?.name || '(no area)'}`);
      } else {
        console.log(`    ${city}: NOT FOUND`);
      }
    }

    const nonMdCities = ['צור יצחק', 'צור יגאל', 'כפר סבא', 'נתניה', 'הרצליה'];
    console.log('\n  Non-MD cities (should have no area unless override):');
    for (const city of nonMdCities) {
      const loc = await prisma.settingsLocality.findFirst({
        where: { tenantId: tenant.id, name: city },
        include: { area: true },
      });
      if (loc) {
        const override = await prisma.settingsLocalityOverride.findFirst({
          where: { tenantId: tenant.id, localityName: city },
        });
        const overrideNote = override ? ' [OVERRIDE]' : '';
        console.log(`    ${city}: ${loc.area?.name || '(no area)'}${overrideNote}`);
      } else {
        console.log(`    ${city}: NOT FOUND`);
      }
    }
    console.log('');
  }

  const templateFixed = await prisma.systemLocalityTemplate.count({
    where: { isFixed: true, areaId: { not: null } },
  });
  const templateTotal = await prisma.systemLocalityTemplate.count();
  const templateNoArea = await prisma.systemLocalityTemplate.count({
    where: { areaId: null },
  });
  console.log(`--- SystemLocalityTemplate ---`);
  console.log(`  Total: ${templateTotal}`);
  console.log(`  With area (isFixed=true): ${templateFixed}`);
  console.log(`  No area: ${templateNoArea}`);
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());