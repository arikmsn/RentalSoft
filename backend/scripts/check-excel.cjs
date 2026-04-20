const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const XLSX = require('xlsx');
const path = require('path');

const excelPath = path.join(__dirname, '..', '..', 'Info', 'public-zones.xlsx');
const wb = XLSX.readFile(excelPath);
const sh = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sh);

const allExcelLocalities = new Set();
data.forEach(r => {
  const loc = r['שם יישוב']?.trim();
  if (loc) allExcelLocalities.add(loc);
});

function normalizeCityName(name) {
  return name.replace(/[_\-]/g, ' ').replace(/\s+/g, ' ').trim();
}

function check() {
  console.log('=== Search for specific terms ===\n');
  const searchTerms = ['מודיעין', 'נוף', 'באקה', 'מעאר', 'כוכב', 'צור', 'גרבייה'];
  for (const term of searchTerms) {
    const matches = [];
    for (const loc of allExcelLocalities) {
      if (loc.includes(term)) matches.push(loc);
    }
    if (matches.length > 0) {
      console.log(`"${term}": ${JSON.stringify(matches)}`);
    }
  }

  console.log('\n=== All localities containing "כוכב" or "צור" ===');
  const found = [];
  for (const loc of allExcelLocalities) {
    if (loc.includes('כוכב') || loc.includes('צור')) found.push(loc);
  }
  console.log(JSON.stringify(found));

  console.log('\n=== All localities containing "מעאר" ===');
  for (const loc of allExcelLocalities) {
    if (loc.includes('מעאר') || loc.includes("מע'אר")) console.log(loc);
  }

  console.log('\n=== All localities containing "באקה" ===');
  for (const loc of allExcelLocalities) {
    if (loc.includes('באקה')) console.log(loc);
  }
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());