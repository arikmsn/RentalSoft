import { prisma } from '../config/database';

export interface GeocodeResult {
  success: boolean;
  latitude?: number;
  longitude?: number;
  error?: string;
  reason?: 'geocoding_failed' | 'out_of_bounds' | 'network_error';
}

export interface SiteAddress {
  address: string;
  city: string;
}

const ISRAEL_BOUNDS = {
  minLat: 29,
  maxLat: 35,
  minLng: 33,
  maxLng: 36,
};

function isValidIsraelCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  return lat >= ISRAEL_BOUNDS.minLat && lat <= ISRAEL_BOUNDS.maxLat && 
         lng >= ISRAEL_BOUNDS.minLng && lng <= ISRAEL_BOUNDS.maxLng;
}

function isOutOfBounds(lat: number, lng: number): boolean {
  return lat < ISRAEL_BOUNDS.minLat || lat > ISRAEL_BOUNDS.maxLat ||
         lng < ISRAEL_BOUNDS.minLng || lng > ISRAEL_BOUNDS.maxLng;
}

function buildQueryString(address: string, city: string): string {
  const normalizedAddress = address.trim();
  const normalizedCity = city.trim();
  return `${normalizedAddress}, ${normalizedCity}, Israel`;
}

export async function geocodeSiteAddress(
  siteId: string | null,
  address: string,
  city: string
): Promise<GeocodeResult> {
  const queryString = buildQueryString(address, city);
  
  console.log(`[Geocode] Request { siteId: ${siteId ?? 'new'}, query: "${queryString}" }`);

  try {
    const query = encodeURIComponent(queryString);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=il`,
      {
        headers: {
          'User-Agent': 'RentalSoft/1.0',
        },
      }
    );

    if (!response.ok) {
      console.error(`[Geocode] Error { siteId: ${siteId ?? 'new'}, query: "${queryString}", reason: "http_error_${response.status}" }`);
      return {
        success: false,
        error: `Geocoding service returned status ${response.status}`,
        reason: 'geocoding_failed',
      };
    }

    const data = await response.json() as Array<{ lat: string; lon: string; display_name?: string }>;

    if (!data || data.length === 0) {
      console.warn(`[Geocode] Error { siteId: ${siteId ?? 'new'}, query: "${queryString}", reason: "no_results" }`);
      return {
        success: false,
        error: 'No results found for this address',
        reason: 'geocoding_failed',
      };
    }

    const lat = parseFloat(data[0].lat);
    const lng = parseFloat(data[0].lon);

    if (isOutOfBounds(lat, lng)) {
      console.warn(`[Geocode] Error { siteId: ${siteId ?? 'new'}, query: "${queryString}", reason: "out_of_bounds", coords: { lat: ${lat}, lng: ${lng} }, displayName: "${data[0].display_name}" }`);
      return {
        success: false,
        latitude: lat,
        longitude: lng,
        error: `Coordinates (${lat}, ${lng}) are outside Israel bounds`,
        reason: 'out_of_bounds',
      };
    }

    console.log(`[Geocode] Success { siteId: ${siteId ?? 'new'}, query: "${queryString}", lat: ${lat}, lng: ${lng} }`);
    return {
      success: true,
      latitude: lat,
      longitude: lng,
    };
  } catch (error) {
    console.error(`[Geocode] Error { siteId: ${siteId ?? 'new'}, query: "${queryString}", reason: "network_error", error: ${error} }`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error during geocoding',
      reason: 'network_error',
    };
  }
}

export async function geocodeAndUpdateSite(
  siteId: string,
  address?: string,
  city?: string
): Promise<GeocodeResult> {
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { address: true, city: true },
  });

  if (!site) {
    return {
      success: false,
      error: 'Site not found',
      reason: 'geocoding_failed',
    };
  }

  const addr = address ?? site.address;
  const c = city ?? site.city;

  const result = await geocodeSiteAddress(siteId, addr, c);

  if (result.success && result.latitude !== undefined && result.longitude !== undefined) {
    await prisma.site.update({
      where: { id: siteId },
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
        hasValidLocation: true,
      },
    });
  } else if (result.reason === 'out_of_bounds') {
    await prisma.site.update({
      where: { id: siteId },
      data: {
        latitude: result.latitude,
        longitude: result.longitude,
        hasValidLocation: false,
      },
    });
  }

  return result;
}

export function isSiteLocationValid(site: { latitude?: number | null; longitude?: number | null; hasValidLocation?: boolean | null }): boolean {
  if (site.hasValidLocation === false) return false;
  return isValidIsraelCoords(site.latitude, site.longitude);
}

export async function getSitesWithInvalidLocation(): Promise<any[]> {
  return prisma.site.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { hasValidLocation: false },
      ],
    },
    orderBy: { name: 'asc' },
  });
}

export async function revalidateSiteLocations(): Promise<{ success: number; failed: number; outOfBounds: number }> {
  const sites = await prisma.site.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
        { hasValidLocation: null },
      ],
    },
  });

  let success = 0;
  let failed = 0;
  let outOfBounds = 0;

  for (const site of sites) {
    const result = await geocodeSiteAddress(site.id, site.address, site.city);

    if (result.success) {
      await prisma.site.update({
        where: { id: site.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          hasValidLocation: true,
        },
      });
      success++;
    } else if (result.reason === 'out_of_bounds') {
      await prisma.site.update({
        where: { id: site.id },
        data: {
          latitude: result.latitude,
          longitude: result.longitude,
          hasValidLocation: false,
        },
      });
      outOfBounds++;
    } else {
      await prisma.site.update({
        where: { id: site.id },
        data: {
          latitude: null,
          longitude: null,
          hasValidLocation: false,
        },
      });
      failed++;
    }
  }

  return { success, failed, outOfBounds };
}
