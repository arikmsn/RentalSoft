import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const fullAddress = `${address}, ${city}, Israel`;
    console.log(`[Geocode] Query: "${fullAddress}"`);
    const query = encodeURIComponent(fullAddress);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=il`, {
      headers: {
        'User-Agent': 'RentalSoft/1.0',
      },
    });
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.status);
      return null;
    }
    
    const data = await response.json() as Array<{ lat: string; lon: string }>;
    
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      
      // Validate coordinates are in Israel range (lat 29-35, lng 33-36)
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

function isValidIsraelCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return false;
  return lat >= 29 && lat <= 35 && lng >= 33 && lng <= 36;
}

router.get('/', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { search, hasEquipment, rating } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { address: { contains: String(search), mode: 'insensitive' } },
        { city: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    if (rating) where.rating = Number(rating);

    let sites = await prisma.site.findMany({
      where,
      include: {
        equipment: hasEquipment === 'true' ? { where: { status: 'at_customer' } } : false,
      },
      orderBy: { name: 'asc' },
    });

    if (hasEquipment === 'true') {
      sites = sites.filter((s: any) => s.equipment && s.equipment.length > 0);
    }

    res.json(sites);
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/with-equipment-status', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: {
        equipment: true,
        workOrders: {
          where: { status: { not: 'completed' } },
          orderBy: { plannedDate: 'desc' },
          take: 5,
          include: {
            equipment: {
              include: {
                equipment: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const now = new Date();

    // Geocode sites that don't have valid coordinates
    const sitesWithCoords = await Promise.all(
      sites.map(async (site) => {
        if (!isValidIsraelCoords(site.latitude, site.longitude)) {
          console.log(`[Geocode] Site "${site.name}" missing/invalid coords, geocoding: ${site.address}, ${site.city}`);
          const coords = await geocodeAddress(site.address, site.city);
          if (coords) {
            console.log(`[Geocode] Found coords for "${site.name}":`, coords);
            // Update the database with the new coordinates
            await prisma.site.update({
              where: { id: site.id },
              data: { latitude: coords.lat, longitude: coords.lng },
            });
            return { ...site, latitude: coords.lat, longitude: coords.lng };
          } else {
            console.warn(`[Geocode] Could not geocode "${site.name}": ${site.address}, ${site.city}`);
          }
        }
        return site;
      })
    );

    const sitesWithStatus = sitesWithCoords.map(site => {
      // Get all equipment from active work orders at this site
      const activeWorkOrderEquipment: any[] = [];
      for (const wo of site.workOrders) {
        for (const woEq of wo.equipment) {
          activeWorkOrderEquipment.push(woEq.equipment);
        }
      }
      
      // Also include equipment directly at site (legacy)
      const atCustomerEquipment = [
        ...site.equipment.filter((eq: any) => eq.status === 'at_customer'),
        ...activeWorkOrderEquipment.filter((eq: any) => eq.status === 'at_customer'),
      ];
      
      let redCount = 0;
      let orangeCount = 0;
      let greenCount = 0;

      for (const eq of atCustomerEquipment) {
        // Use work order's plannedRemovalDate if equipment doesn't have one
        const removalDate = eq.plannedRemovalDate || 
          site.workOrders.find(wo => 
            wo.equipment.some((woEq: any) => woEq.equipmentId === eq.id)
          )?.plannedRemovalDate;
          
        if (!removalDate) {
          greenCount++;
          continue;
        }

        const daysRemaining = Math.ceil((new Date(removalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 7) {
          redCount++;
        } else if (daysRemaining <= 10) {
          orangeCount++;
        } else {
          greenCount++;
        }
      }

      let overallStatus: 'red' | 'orange' | 'green' = 'green';
      if (redCount > 0) {
        overallStatus = 'red';
      } else if (orangeCount > 0) {
        overallStatus = 'orange';
      }

      return {
        ...site,
        equipment: undefined,
        statusCounts: {
          red: redCount,
          orange: orangeCount,
          green: greenCount,
        },
        overallStatus,
      };
    });

    res.json(sitesWithStatus);
  } catch (error) {
    console.error('Get sites with equipment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/active-work-orders', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
        site: {
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            latitude: true,
            longitude: true,
            contact1Phone: true,
          },
        },
        technician: {
          select: { id: true, name: true },
        },
      },
      orderBy: { plannedDate: 'asc' },
    });

    const workOrdersWithLocation = workOrders.map(wo => ({
      id: wo.id,
      type: wo.type,
      status: wo.status,
      plannedDate: wo.plannedDate,
      plannedRemovalDate: wo.plannedRemovalDate,
      site: wo.site,
      technician: wo.technician,
    }));

    res.json(workOrdersWithLocation);
  } catch (error) {
    console.error('Get active work orders for map error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const site = await prisma.site.findUnique({
      where: { id: req.params.id },
      include: {
        equipment: { where: { status: 'at_customer' } },
        workOrders: { orderBy: { plannedDate: 'desc' }, take: 10 },
      },
    });

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    res.json(site);
  } catch (error) {
    console.error('Get site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      address,
      city,
      floor,
      apartment,
      contact1Name,
      contact1Phone,
      contact2Name,
      contact2Phone,
      rating,
      isHighlighted,
      latitude,
      longitude,
    } = req.body;

    // Geocode address if no coordinates provided
    let finalLat = latitude;
    let finalLng = longitude;
    
    if (!isValidIsraelCoords(latitude, longitude)) {
      console.log(`[Create Site] Geocoding: ${address}, ${city}`);
      const coords = await geocodeAddress(address, city);
      if (coords) {
        finalLat = coords.lat;
        finalLng = coords.lng;
        console.log(`[Create Site] Geocoded successfully:`, coords);
      }
    }

    const site = await prisma.site.create({
      data: {
        name,
        address,
        city,
        floor,
        apartment,
        contact1Name,
        contact1Phone,
        contact2Name,
        contact2Phone,
        rating,
        isHighlighted: isHighlighted || false,
        latitude: finalLat,
        longitude: finalLng,
      },
    });

    res.status(201).json(site);
  } catch (error) {
    console.error('Create site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      address,
      city,
      floor,
      apartment,
      contact1Name,
      contact1Phone,
      contact2Name,
      contact2Phone,
      rating,
      isHighlighted,
      latitude,
      longitude,
    } = req.body;

    // Get current site to check if we need to geocode
    const currentSite = await prisma.site.findUnique({ where: { id: req.params.id } });
    
    let finalLat = latitude;
    let finalLng = longitude;
    
    // Geocode if address changed and no coordinates provided
    if ((address || city) && !isValidIsraelCoords(latitude, longitude)) {
      const addr = address || currentSite?.address;
      const c = city || currentSite?.city;
      if (addr && c) {
        console.log(`[Update Site] Geocoding: ${addr}, ${c}`);
        const coords = await geocodeAddress(addr, c);
        if (coords) {
          finalLat = coords.lat;
          finalLng = coords.lng;
        }
      }
    }

    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(address && { address }),
        ...(city && { city }),
        ...(floor !== undefined && { floor }),
        ...(apartment !== undefined && { apartment }),
        ...(contact1Name !== undefined && { contact1Name }),
        ...(contact1Phone !== undefined && { contact1Phone }),
        ...(contact2Name !== undefined && { contact2Name }),
        ...(contact2Phone !== undefined && { contact2Phone }),
        ...(rating !== undefined && { rating }),
        ...(isHighlighted !== undefined && { isHighlighted }),
        ...(latitude !== undefined && { latitude: finalLat }),
        ...(longitude !== undefined && { longitude: finalLng }),
      },
    });

    res.json(site);
  } catch (error) {
    console.error('Update site error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    await prisma.site.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Site deleted' });
  } catch (error: any) {
    console.error('Delete site error:', error);
    // P2003 is the Prisma error code for FK constraint violation
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        message: 'Cannot delete site - it has related equipment or work orders. Please remove all related records first.' 
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/geocode', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const { address, city } = req.query;
    
    if (!address || !city) {
      return res.status(400).json({ message: 'Address and city are required' });
    }
    
    const coords = await geocodeAddress(String(address), String(city));
    
    if (coords) {
      res.json({ lat: coords.lat, lng: coords.lng });
    } else {
      res.status(404).json({ message: 'Could not geocode address' });
    }
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
