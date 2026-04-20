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
    'ירושלים והסביבה': 'ירושלים והסביבה',
    'יהודה ושומרון': 'יהודה ושומרון',
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

const MD_CITY_VARIANTS = [
  ['מודיעין-מכבים-רעות', ['מודיעין מכבים רעות', 'מודיעין מכבים רעו', 'מודיעין-מכבים רעות', 'מודיעין-מכבים רעו']],
  ['כוכב יאיר-צור יגאל', ['כוכב יאיר', 'כוכב יאיר/צור יגאל', 'כוכב יאיר צור יגאל', 'צור יגאל']],
  ['באקה אל-גרבייה', ['באקה אל ע\'רביה', 'באקה אל ערביה', 'באקה אל-גרבייה']],
  ["מע'אר", ['מעאר', "מע'אר", 'מעאר']],
  ['קריית גת', ['קרית גת', 'קריית גת']],
  ['קריית אתא', ['קרית אתא', 'קריית אתא']],
  ['קריית מוצקין', ['קרית מוצקין', 'קריית מוצקין']],
  ['קריית ביאליק', ['קרית ביאליק', 'קריית ביאליק']],
  ['קריית ים', ['קרית ים', 'קריית ים']],
  ['קריית שמונה', ['קרית שמונה', 'קריית שמונה']],
  ['קריית עקרון', ['קרית עקרון', 'קריית עקרון']],
  ['קריית ארבע', ['קרית ארבע', 'קריית ארבע']],
  ['קריית אונו', ['קרית אונו', 'קריית אונו']],
  ['קריית מלאכי', ['קרית מלאכי', 'קריית מלאכי']],
  ['נוף הגליל', ['נוף הגליל', 'נוף הגליל']],
];

function normalizeCityName(name) {
  return name.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function buildExcelToMdMap(allExcelLocalities) {
  const excelToMdCity = new Map();

  for (const mdCity of MARKDOWN_CITY_MAP.keys()) {
    const normalizedMd = normalizeCityName(mdCity);

    if (allExcelLocalities.has(mdCity)) {
      excelToMdCity.set(mdCity, mdCity);
      continue;
    }

    let found = false;
    for (const excelCity of allExcelLocalities) {
      if (normalizeCityName(excelCity) === normalizedMd) {
        excelToMdCity.set(excelCity, mdCity);
        found = true;
        break;
      }
    }

    if (!found) {
      for (const [mdKey, variants] of MD_CITY_VARIANTS) {
        if (mdCity === mdKey) {
          for (const variant of variants) {
            if (allExcelLocalities.has(variant)) {
              excelToMdCity.set(variant, mdCity);
              found = true;
              break;
            }
          }
        }
      }
    }
  }

  return excelToMdCity;
}

async function seedTemplate() {
  console.log('=== Seeding System Area Template ===\n');

  await prisma.systemLocalityTemplate.deleteMany({});
  await prisma.systemAreaTemplate.deleteMany({});

  const OPERATIONAL_AREAS = [
    { name: 'צפון', displayOrder: 1 },
    { name: 'דרום', displayOrder: 2 },
    { name: 'מרכז', displayOrder: 3 },
    { name: 'השרון', displayOrder: 4 },
    { name: 'ירושלים והסביבה', displayOrder: 5 },
    { name: 'יהודה ושומרון', displayOrder: 6 },
  ];

  const areaIdMap = {};
  for (const area of OPERATIONAL_AREAS) {
    const created = await prisma.systemAreaTemplate.create({
      data: { name: area.name, displayOrder: area.displayOrder },
    });
    areaIdMap[area.name] = created.id;
    console.log(`  Created area: ${area.name}`);
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

  const excelToMdCity = buildExcelToMdMap(allExcelLocalities);

  const batches = [];
  const areaCounts = {};
  const fixedCities = [];
  const unmatchedMdCities = [];

  for (const loc of allExcelLocalities) {
    const mdCity = excelToMdCity.get(loc);
    let areaName = null;
    if (mdCity) {
      areaName = MARKDOWN_CITY_MAP.get(mdCity);
    }
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

  for (const [city, area] of MARKDOWN_CITY_MAP) {
    const normalized = normalizeCityName(city);
    let found = false;
    for (const loc of allExcelLocalities) {
      if (normalizeCityName(loc) === normalized) {
        found = true;
        break;
      }
    }
    if (!found) {
      let matchedViaVariant = false;
      for (const [mdKey, variants] of MD_CITY_VARIANTS) {
        if (city === mdKey) {
          for (const variant of variants) {
            if (allExcelLocalities.has(variant)) {
              matchedViaVariant = true;
              break;
            }
          }
        }
      }
      if (!matchedViaVariant) {
        unmatchedMdCities.push({ city, area });
      }
    }
  }

  while (batches.length > 0) {
    await prisma.systemLocalityTemplate.createMany({
      data: batches.splice(0, 100),
      skipDuplicates: true,
    });
  }

  console.log('\n=== Template locality counts by area ===');
  for (const [area, count] of Object.entries(areaCounts)) {
    const label = area === '_none' ? '(no area)' : area;
    console.log(`  ${label}: ${count}`);
  }
  console.log(`  Grand total: ${Object.values(areaCounts).reduce((a, b) => a + b, 0)}`);
  console.log(`  Fixed: ${fixedCities.length}`);

  console.log('\n=== Fixed localities (from MD file) ===');
  const byAreaGroup = {};
  for (const { city, area } of fixedCities) {
    if (!byAreaGroup[area]) byAreaGroup[area] = [];
    byAreaGroup[area].push(city);
  }
  for (const area of Object.keys(byAreaGroup).sort()) {
    console.log(`  ${area} (${byAreaGroup[area].length}):`);
    for (const city of byAreaGroup[area].sort()) {
      console.log(`    ${city}`);
    }
  }

  if (unmatchedMdCities.length > 0) {
    console.log('\n=== MD cities NOT found in Excel (no match) ===');
    for (const { city, area } of unmatchedMdCities) {
      console.log(`  ${city} -> ${area} (NOT IN EXCEL)`);
    }
  }
}

seedTemplate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());