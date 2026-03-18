import { prisma } from '../src/config/database';

const siteCoordinates: Record<string, { lat: number; lng: number }> = {
  'אברהם בן עמי 6': { lat: 31.9539, lng: 34.8517 },
  'הרב קוק 30': { lat: 32.0830, lng: 34.8879 },
  'הכלנית 3': { lat: 32.0550, lng: 34.8550 }, // Kiryat Ono
  'ז\'בוטינסקי 120': { lat: 32.0681, lng: 34.8111 },
};

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, Israel`);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=il`,
      { headers: { 'User-Agent': 'RentalSoft/1.0' } }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json() as Array<{ lat: string; lon: string }>;
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      if (lat >= 29 && lat <= 35 && lng >= 33 && lng <= 36) {
        return { lat, lng };
      }
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function populateCoordinates() {
  console.log('🔍 Starting coordinate population...\n');
  
  // First, update specific sites with better coordinates
  const betterCoords: Record<string, { lat: number; lng: number }> = {
    'הכלנית 3': { lat: 32.0550, lng: 34.8550 }, // Kiryat Ono - corrected coordinates
  };
  
  for (const [address, coords] of Object.entries(betterCoords)) {
    const site = await prisma.site.findFirst({
      where: { address: address },
    });
    
    if (site) {
      console.log(`Updating "${site.name}" (${address}) with coords:`, coords);
      await prisma.site.update({
        where: { id: site.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
      console.log('✅ Updated\n');
    }
  }
  
  // Then check for any remaining sites with missing coordinates
  const sites = await prisma.site.findMany({
    where: {
      OR: [
        { latitude: null },
        { latitude: 0 },
        { longitude: null },
        { longitude: 0 },
      ],
    },
  });
  
  console.log(`Found ${sites.length} sites with missing/zero coordinates\n`);
  
  for (const site of sites) {
    console.log(`Processing: "${site.name}"`);
    console.log(`  Address: ${site.address}, ${site.city}`);
    
    let coords: { lat: number; lng: number } | null = null;
    
    if (siteCoordinates[site.address]) {
      coords = siteCoordinates[site.address];
      console.log(`  ✅ Using hardcoded coords: lat=${coords.lat}, lng=${coords.lng}`);
    } else {
      const fullAddress = `${site.address}, ${site.city}, Israel`;
      coords = await geocodeAddress(fullAddress);
      if (coords) {
        console.log(`  ✅ Geocoded: lat=${coords.lat}, lng=${coords.lng}`);
      } else {
        console.log(`  ⚠️ Could not geocode address`);
      }
    }
    
    if (coords) {
      await prisma.site.update({
        where: { id: site.id },
        data: { latitude: coords.lat, longitude: coords.lng },
      });
      console.log(`  💾 Updated database`);
    }
    console.log('');
  }
  
  console.log('✅ Coordinate population complete!');
  
  const remaining = await prisma.site.count({
    where: {
      OR: [
        { latitude: null },
        { latitude: 0 },
      ],
    },
  });
  
  console.log(`Sites still missing coordinates: ${remaining}`);
}

populateCoordinates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
