import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';
import { geocodeSiteAddress, isSiteLocationValid, geocodeAndUpdateSite, getSitesWithInvalidLocation } from '../services/geocode';

const router = Router();

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

    const sites = await prisma.site.findMany({
      where,
      include: {
        equipment: hasEquipment === 'true' ? { where: { status: 'at_customer' } } : false,
      },
      orderBy: { name: 'asc' },
    });

    let result = sites;
    if (hasEquipment === 'true') {
      result = sites.filter((s: any) => s.equipment && s.equipment.length > 0);
    }

    res.json(result.map((s: any) => ({
      ...s,
      hasValidLocation: isSiteLocationValid(s),
    })));
  } catch (error) {
    console.error('Get sites error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/with-equipment-status', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const sites = await prisma.site.findMany({
      include: {
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

    const sitesWithStatus = await Promise.all(
      sites.map(async (site) => {
        const hasValidLocation = isSiteLocationValid(site);

        const activeWorkOrders = site.workOrders.filter(wo => wo.status !== 'completed');
        const now = new Date();

        const workOrderRemovalDates = activeWorkOrders
          .map(wo => wo.plannedRemovalDate)
          .filter((d): d is Date => d !== null);

        let statusColor: 'red' | 'orange' | 'green' = 'green';
        let statusReason = 'no removal dates';

        if (workOrderRemovalDates.length > 0) {
          const earliestRemoval = new Date(Math.min(...workOrderRemovalDates.map(d => d.getTime())));
          const daysUntilRemoval = Math.ceil((earliestRemoval.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          if (daysUntilRemoval < 0) {
            statusColor = 'red';
            statusReason = `overdue by ${Math.abs(daysUntilRemoval)} days`;
          } else if (daysUntilRemoval <= 7) {
            statusColor = 'red';
            statusReason = `removal in ${daysUntilRemoval} days (≤7 days)`;
          } else if (daysUntilRemoval <= 10) {
            statusColor = 'orange';
            statusReason = `removal in ${daysUntilRemoval} days (8-10 days)`;
          } else {
            statusColor = 'green';
            statusReason = `removal in ${daysUntilRemoval} days (>10 days)`;
          }

          console.log(`[MapColor] Site ${site.name}:`, {
            siteId: site.id,
            workOrders: activeWorkOrders.map(wo => ({
              workOrderId: wo.id,
              plannedRemovalDate: wo.plannedRemovalDate,
            })),
            earliestRemovalDate: earliestRemoval,
            today: now,
            daysUntilRemoval,
            statusColor,
            statusReason
          });
        } else {
          console.log(`[MapColor] Site ${site.name}:`, {
            siteId: site.id,
            workOrders: activeWorkOrders.map(wo => ({
              workOrderId: wo.id,
              plannedRemovalDate: wo.plannedRemovalDate,
            })),
            statusColor,
            statusReason: 'no removal dates set'
          });
        }

        const equipmentCount = site.workOrders.reduce((sum, wo) => sum + wo.equipment.length, 0);

        return {
          ...site,
          equipment: undefined,
          equipmentCount,
          overallStatus: statusColor,
          hasValidLocation,
        };
      })
    );

    const validSites = sitesWithStatus.filter(s => 
      s.hasValidLocation && 
      s.latitude != null && 
      s.longitude != null &&
      s.workOrders.length > 0
    );

    console.log('[Map] Sites returned for map:', validSites.map(s => ({
      id: s.id,
      name: s.name,
      hasValidLocation: s.hasValidLocation,
      lat: s.latitude,
      lng: s.longitude,
      workOrderCount: s.workOrders.length,
      overallStatus: s.overallStatus
    })));

    console.log('[Map] Sites filtered out:', sitesWithStatus.filter(s => !validSites.includes(s)).map(s => ({
      id: s.id,
      name: s.name,
      hasValidLocation: s.hasValidLocation,
      lat: s.latitude,
      lng: s.longitude,
      workOrderCount: s.workOrders.length,
      reason: !s.hasValidLocation ? 'no valid location' : 
               s.latitude == null ? 'no latitude' : 
               s.longitude == null ? 'no longitude' : 
               s.workOrders.length === 0 ? 'no work orders' : 'unknown'
    })));

    res.json(validSites);
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
          hasValidLocation: { not: false },
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
            hasValidLocation: true,
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

router.get('/locations/needs-attention', authenticate, isManagerOrAdmin, async (req, res) => {
  try {
    const sites = await getSitesWithInvalidLocation();
    res.json(sites);
  } catch (error) {
    console.error('Get sites needing location attention error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/revalidate-location', authenticate, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { address, city } = req.body;

    const result = await geocodeAndUpdateSite(id, address, city);

    if (result.success) {
      const updatedSite = await prisma.site.findUnique({ where: { id } });
      res.json({
        success: true,
        site: updatedSite,
        message: 'Location updated successfully',
      });
    } else {
      const updatedSite = await prisma.site.findUnique({ where: { id } });
      res.status(400).json({
        success: false,
        site: updatedSite,
        error: result.error,
        reason: result.reason,
        message: result.reason === 'out_of_bounds'
          ? 'Address geocoded to location outside Israel. Please verify and enter coordinates manually.'
          : 'Could not geocode address. Please try a different address or enter coordinates manually.',
      });
    }
  } catch (error) {
    console.error('Revalidate site location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/coordinates', authenticate, isManagerOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.body;

    if (latitude == null || longitude == null) {
      return res.status(400).json({ message: 'Latitude and longitude are required' });
    }

    const isValid = latitude >= 29 && latitude <= 35 && longitude >= 33 && longitude <= 36;

    const site = await prisma.site.update({
      where: { id },
      data: {
        latitude,
        longitude,
        hasValidLocation: isValid,
      },
    });

    res.json({
      site,
      message: isValid ? 'Coordinates updated successfully' : 'Coordinates updated but flagged as outside Israel bounds',
    });
  } catch (error) {
    console.error('Update site coordinates error:', error);
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

    res.json({
      ...site,
      hasValidLocation: isSiteLocationValid(site),
    });
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

    let finalLat = latitude;
    let finalLng = longitude;
    let hasValidLocation: boolean | null = null;

    if (latitude != null && longitude != null) {
      const isInBounds = latitude >= 29 && latitude <= 35 && longitude >= 33 && longitude <= 36;
      hasValidLocation = isInBounds;
    } else {
      const geoResult = await geocodeSiteAddress(null, address, city);
      if (geoResult.success && geoResult.latitude !== undefined && geoResult.longitude !== undefined) {
        finalLat = geoResult.latitude;
        finalLng = geoResult.longitude;
        hasValidLocation = true;
      } else {
        hasValidLocation = false;
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
        hasValidLocation,
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

    const currentSite = await prisma.site.findUnique({ where: { id: req.params.id } });

    let finalLat = latitude ?? currentSite?.latitude;
    let finalLng = longitude ?? currentSite?.longitude;
    let newHasValidLocation: boolean | null | undefined = undefined;

    const addressChanged = (address && address !== currentSite?.address) || (city && city !== currentSite?.city);
    const coordsProvided = latitude !== undefined || longitude !== undefined;

    if (coordsProvided && latitude != null && longitude != null) {
      newHasValidLocation = latitude >= 29 && latitude <= 35 && longitude >= 33 && longitude <= 36;
      finalLat = latitude;
      finalLng = longitude;
    } else if (addressChanged && !coordsProvided) {
      const addr = address || currentSite?.address;
      const c = city || currentSite?.city;
      if (addr && c) {
        const geoResult = await geocodeSiteAddress(req.params.id, addr, c);
        if (geoResult.success && geoResult.latitude !== undefined && geoResult.longitude !== undefined) {
          finalLat = geoResult.latitude;
          finalLng = geoResult.longitude;
          newHasValidLocation = true;
        } else {
          newHasValidLocation = false;
        }
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (floor !== undefined) updateData.floor = floor;
    if (apartment !== undefined) updateData.apartment = apartment;
    if (contact1Name !== undefined) updateData.contact1Name = contact1Name;
    if (contact1Phone !== undefined) updateData.contact1Phone = contact1Phone;
    if (contact2Name !== undefined) updateData.contact2Name = contact2Name;
    if (contact2Phone !== undefined) updateData.contact2Phone = contact2Phone;
    if (rating !== undefined) updateData.rating = rating;
    if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted;
    if (finalLat !== undefined) updateData.latitude = finalLat;
    if (finalLng !== undefined) updateData.longitude = finalLng;
    if (newHasValidLocation !== undefined) updateData.hasValidLocation = newHasValidLocation;

    const site = await prisma.site.update({
      where: { id: req.params.id },
      data: updateData,
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

    const result = await geocodeSiteAddress(null, String(address), String(city));

    if (result.success) {
      res.json({
        success: true,
        latitude: result.latitude,
        longitude: result.longitude,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error,
        reason: result.reason,
      });
    }
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
