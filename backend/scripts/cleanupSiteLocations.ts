import { prisma } from '../src/config/database';
import { geocodeSiteAddress, revalidateSiteLocations } from '../src/services/geocode';

interface CleanupResult {
  success: number;
  failed: number;
  outOfBounds: number;
  total: number;
}

async function cleanupSiteLocations(): Promise<void> {
  console.log('🧹 Starting site location cleanup...\n');

  const result = await revalidateSiteLocations();
  
  console.log('\n📊 Cleanup Summary:');
  console.log(`   ✅ Successfully geocoded: ${result.success}`);
  console.log(`   ⚠️  Out of Israel bounds: ${result.outOfBounds}`);
  console.log(`   ❌ Failed to geocode: ${result.failed}`);

  const sitesWithIssues = await prisma.site.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { hasValidLocation: false },
      ],
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      hasValidLocation: true,
    },
    orderBy: { name: 'asc' },
  });

  if (sitesWithIssues.length > 0) {
    console.log('\n📋 Sites Still Needing Attention:');
    for (const site of sitesWithIssues) {
      console.log(`   - ${site.name} (${site.address}, ${site.city})`);
      console.log(`     Current: lat=${site.latitude ?? 'null'}, lng=${site.longitude ?? 'null'}, valid=${site.hasValidLocation}`);
    }
    console.log('\n💡 These sites need manual coordinate entry via the admin API:');
    console.log('   PATCH /api/sites/:id/coordinates');
  }

  console.log('\n✅ Cleanup complete!');
}

async function showLocationStats(): Promise<void> {
  const total = await prisma.site.count();
  const validLocations = await prisma.site.count({
    where: { hasValidLocation: true },
  });
  const invalidLocations = await prisma.site.count({
    where: { hasValidLocation: false },
  });
  const nullLocations = await prisma.site.count({
    where: {
      latitude: null,
    },
  });

  console.log('\n📊 Site Location Statistics:');
  console.log(`   Total sites: ${total}`);
  console.log(`   ✅ Valid locations: ${validLocations}`);
  console.log(`   ❌ Invalid locations (flagged): ${invalidLocations}`);
  console.log(`   ⚠️  Null locations: ${nullLocations}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || 'cleanup';

  if (command === 'stats') {
    await showLocationStats();
  } else if (command === 'cleanup') {
    await cleanupSiteLocations();
  } else {
    console.log('Usage:');
    console.log('  npx ts-node scripts/cleanupSiteLocations.ts        # Run cleanup');
    console.log('  npx ts-node scripts/cleanupSiteLocations.ts stats # Show statistics');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
