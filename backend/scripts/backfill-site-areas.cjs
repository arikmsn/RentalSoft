const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function backfillSiteAreas() {
  console.log('=== Backfilling Site.area from SettingsLocality ===\n');

  const tenants = await prisma.tenant.findMany({ orderBy: { name: 'asc' } });
  console.log(`Found ${tenants.length} tenants\n`);

  let totalProcessed = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const tenant of tenants) {
    console.log(`--- Tenant: ${tenant.name} (${tenant.id}) ---`);

    const localities = await prisma.settingsLocality.findMany({
      where: { tenantId: tenant.id, areaId: { not: null } },
      include: { area: true },
    });

    const cityToAreaName = new Map();
    for (const loc of localities) {
      if (loc.area) {
        cityToAreaName.set(loc.name, loc.area.name);
      }
    }

    const sites = await prisma.site.findMany({
      where: { tenantId: tenant.id },
    });

    let tenantUpdated = 0;
    let tenantSkipped = 0;

    for (const site of sites) {
      const areaFromSettings = cityToAreaName.get(site.city);
      totalProcessed++;

      if (areaFromSettings && areaFromSettings !== site.area) {
        await prisma.site.update({
          where: { id: site.id },
          data: { area: areaFromSettings },
        });
        tenantUpdated++;
        totalUpdated++;
        console.log(`  UPDATED: ${site.name} (${site.city}) -> ${areaFromSettings}`);
      } else if (!areaFromSettings && site.area) {
        console.log(`  NO MATCH IN SETTINGS: ${site.name} (${site.city}) has area="${site.area}" in DB but city not in SettingsLocality with area`);
      } else {
        tenantSkipped++;
        totalSkipped++;
      }
    }

    console.log(`  Sites processed: ${sites.length}, Updated: ${tenantUpdated}, Skipped: ${tenantSkipped}`);
    console.log(`  Localities with area in settings: ${localities.length}\n`);
  }

  console.log(`=== Summary ===`);
  console.log(`  Total sites processed: ${totalProcessed}`);
  console.log(`  Total updated: ${totalUpdated}`);
  console.log(`  Total skipped (no change needed): ${totalSkipped}`);
}

backfillSiteAreas()
  .catch(console.error)
  .finally(() => prisma.$disconnect());