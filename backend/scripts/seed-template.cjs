const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const excelPath = path.join(__dirname, '..', '..', 'Info', 'public-zones.xlsx');
const mdPath = path.join(__dirname, '..', '..', 'Info', '100-Israel-City.md');

const wb = XLSX.readFile(excelPath);
const sh = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sh);

const byArea = {};
data.forEach(r => {
  const area = r['אזור גאוגרפי']?.trim();
  const loc = r['שם יישוב']?.trim();
  if (!area || !loc) return;
  if (!byArea[area]) byArea[area] = new Set();
  byArea[area].add(loc);
});

const excelTzfon = byArea['צפון'] || new Set();
const excelMarkaz = byArea['מרכז'] || new Set();
const excelGolanHula = byArea['החולה ורמת הגולן'] || new Set();
const excelJordanValley = byArea['עמק בית שאן ובקעת הירדן'] || new Set();
const excelEilatArava = byArea['אילת ים המלח והערבה'] || new Set();
const excelDrom = byArea['דרום'] || new Set();
const excelNeguev = byArea['נגב'] || new Set();

function parseMarkdownCityMap(mdPath) {
  const content = fs.readFileSync(mdPath, 'utf8');
  const lines = content.split('\n');
  const cityToArea = new Map();

  const areaNormalize = {
    'ירושלים והסביבה': 'ירושלים ויהודה ושומרון',
    'יהודה ושומרון': 'ירושלים ויהודה ושומרון',
    'מרכז': 'מרכז',
    'השרון': 'השרון',
    'צפון': 'צפון',
    'דרום': 'דרום',
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = trimmed.split('|').map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length < 2) continue;
    if (cells[0] === 'עיר' || cells[0] === ':------------') continue;

    const cityRaw = cells[0];
    const areaRaw = cells[1];
    const areaNorm = areaNormalize[areaRaw];
    if (!areaNorm) continue;

    cityToArea.set(cityRaw, areaNorm);
  }

  return cityToArea;
}

const MARKDOWN_CITY_MAP = parseMarkdownCityMap(mdPath);

function normalizeCityName(name) {
  return name.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function findAreaForCity(cityName) {
  if (MARKDOWN_CITY_MAP.has(cityName)) {
    return MARKDOWN_CITY_MAP.get(cityName);
  }
  const normalized = normalizeCityName(cityName);
  for (const [key, value] of MARKDOWN_CITY_MAP) {
    if (normalizeCityName(key) === normalized) {
      return value;
    }
  }
  return null;
}

async function seedTemplate() {
  console.log('=== Seeding System Area Template from 100-Israel-City.md ===\n');

  await prisma.systemLocalityTemplate.deleteMany({});
  await prisma.systemAreaTemplate.deleteMany({});

  const OPERATIONAL_AREAS = [
    { name: 'צפון', displayOrder: 1 },
    { name: 'השרון', displayOrder: 2 },
    { name: 'מרכז', displayOrder: 3 },
    { name: 'ירושלים ויהודה ושומרון', displayOrder: 4 },
    { name: 'דרום', displayOrder: 5 },
    { name: 'אילת והערבה', displayOrder: 6 },
  ];

  const areaIdMap = {};
  for (const area of OPERATIONAL_AREAS) {
    const created = await prisma.systemAreaTemplate.create({
      data: { name: area.name, displayOrder: area.displayOrder },
    });
    areaIdMap[area.name] = created.id;
  }

  const allExcelLocalities = new Set([
    ...[...excelTzfon],
    ...[...excelMarkaz],
    ...[...excelGolanHula],
    ...[...excelJordanValley],
    ...[...excelEilatArava],
    ...[...excelNeguev],
    ...[...excelDrom],
  ]);

  const batches = [];
  const areaCounts = {};
  const fixedCities = [];

  for (const loc of allExcelLocalities) {
    const areaName = findAreaForCity(loc);
    const isFixed = areaName !== null;

    if (!areaCounts[areaName || '_none']) {
      areaCounts[areaName || '_none'] = 0;
    }
    areaCounts[areaName || '_none']++;

    batches.push({
      name: loc,
      areaId: areaName ? areaIdMap[areaName] : null,
      isFixed,
      excelAreaRaw: '',
    });

    if (isFixed) {
      fixedCities.push({ city: loc, area: areaName });
    }
  }

  while (batches.length > 0) {
    await prisma.systemLocalityTemplate.createMany({
      data: batches.splice(0, 100),
      skipDuplicates: true,
    });
  }

  console.log('=== Template locality counts by area ===');
  for (const [area, count] of Object.entries(areaCounts)) {
    const label = area === '_none' ? '(no area)' : area;
    console.log(`  ${label}: ${count}`);
  }
  console.log(`  Grand total: ${Object.values(areaCounts).reduce((a, b) => a + b, 0)}`);
  console.log(`  Fixed: ${fixedCities.length}`);

  console.log('\n=== Fixed localities from 100-Israel-City.md ===');
  for (const { city, area } of fixedCities.sort((a, b) => a.area.localeCompare(b.area))) {
    console.log(`  ${city} -> ${area}`);
  }
}

seedTemplate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());