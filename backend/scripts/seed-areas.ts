import { PrismaClient } from '@prisma/client';
import * as xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const prisma = new PrismaClient();

interface ExcelRow {
  'שם יישוב': string;
  'אזור גאוגרפי': string;
}

interface BaselineData {
  areas: { name: string; localities: string[] }[];
}

function readExcelData(): BaselineData {
  const excelPath = path.join(__dirname, '..', 'Info', 'public-zones.xlsx');
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json<ExcelRow>(worksheet);

  const areaMap = new Map<string, string[]>();

  for (const row of data) {
    const locality = row['שם יישוב']?.trim();
    const area = row['אזור גאוגרפי']?.trim();

    if (!locality || !area) continue;

    if (!areaMap.has(area)) {
      areaMap.set(area, []);
    }
    areaMap.get(area)!.push(locality);
  }

  const areas = Array.from(areaMap.entries()).map(([name, localities]) => ({
    name,
    localities,
  }));

  return { areas };
}

export async function seedAreasAndLocalitiesForTenant(tenantId: string): Promise<void> {
  console.log(`Seeding areas and localities for tenant: ${tenantId}`);

  const baseline = readExcelData();
  console.log(`Found ${baseline.areas.length} areas in baseline data`);

  const areaIdMap = new Map<string, string>();

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
      await prisma.settingsLocality.create({
        data: {
          tenantId,
          name: localityName,
          areaId,
        },
      });
      localityCount++;
    }
  }

  console.log(`Created ${areaIdMap.size} areas and ${localityCount} localities`);
}

export async function backfillExistingTenants(): Promise<void> {
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

if (import.meta.url === `file://${process.argv[1]}`) {
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
      console.error('Usage: npx tsx seed-areas.ts seed <tenantId>');
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
    console.log('  npx tsx seed-areas.ts backfill  - Seed all existing tenants');
    console.log('  npx tsx seed-areas.ts seed <tenantId>  - Seed a specific tenant');
  }
}