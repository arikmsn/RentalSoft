const { PrismaClient } = require('@prisma/client');
const xlsx = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

async function readExcelData() {
  const excelPath = path.join(__dirname, '..', '..', 'Info', 'public-zones.xlsx');
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const areaMap = new Map();

  for (const row of data) {
    const locality = row['שם יישוב']?.trim();
    const area = row['אזור גאוגרפי']?.trim();

    if (!locality || !area) continue;

    if (!areaMap.has(area)) {
      areaMap.set(area, []);
    }
    areaMap.get(area).push(locality);
  }

  const areas = Array.from(areaMap.entries()).map(([name, localities]) => ({
    name,
    localities,
  }));

  return { areas };
}

async function seedAreasAndLocalitiesForTenant(tenantId) {
  console.log(`Seeding areas and localities for tenant: ${tenantId}`);

  const baseline = await readExcelData();
  console.log(`Found ${baseline.areas.length} areas in baseline data`);

  const areaIdMap = new Map();

  for (const areaData of baseline.areas) {
    const area = await prisma.settingsArea.create({
      data: {
        tenantId,
        name: areaData.name,
      },
    });
    areaIdMap.set(areaData.name, area.id);
    console.log(`  Created area: ${areaData.name}`);
  }

  let localityCount = 0;
  for (const areaData of baseline.areas) {
    const areaId = areaIdMap.get(areaData.name);
    if (!areaId) continue;

    for (const localityName of areaData.localities) {
      await prisma.settingsLocality.upsert({
        where: {
          tenantId_name: { tenantId, name: localityName },
        },
        create: {
          tenantId,
          name: localityName,
          areaId,
        },
        update: {},
      });
      localityCount++;
    }
  }

  console.log(`Created ${areaIdMap.size} areas and ${localityCount} localities`);
}

async function backfillExistingTenants() {
  console.log('Backfilling areas and localities for existing tenants...');

  const tenants = await prisma.tenant.findMany({
    where: {
      status: 'active',
    },
  });

  for (const tenant of tenants) {
    const existingAreas = await prisma.settingsArea.count({
      where: { tenantId: tenant.id },
    });

    if (existingAreas > 0) {
      console.log(`Tenant ${tenant.name} already has ${existingAreas} areas, skipping...`);
      continue;
    }

    console.log(`Seeding tenant: ${tenant.name} (${tenant.id})`);
    await seedAreasAndLocalitiesForTenant(tenant.id);
  }

  console.log('Backfill complete!');
}

const command = process.argv[2];

if (command === 'backfill') {
  backfillExistingTenants()
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
} else if (command === 'seed') {
  const tenantId = process.argv[3];
  if (!tenantId) {
    console.error('Usage: node seed-areas.js seed <tenantId>');
    process.exit(1);
  }
  seedAreasAndLocalitiesForTenant(tenantId)
    .then(() => {
      console.log('Done');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Error:', err);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  node seed-areas.js backfill  - Seed all existing tenants');
  console.log('  node seed-areas.js seed <tenantId>  - Seed a specific tenant');
}