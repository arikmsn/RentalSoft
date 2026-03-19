import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';
import { geocodeSiteAddress, isSiteLocationValid, geocodeAndUpdateSite, getSitesWithInvalidLocation } from '../services/geocode';
import { computeWorkOrderStatus } from '../utils/status';

const router = Router();

router.get('/', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { search, hasEquipment, rating, isActive } = req.query;

    const where: any = {};
    if (isActive === 'true') where.isActive = true;
    else if (isActive === 'false') where.isActive = false;
    // no filter → all sites (active + inactive)
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
        equipment: hasEquipment === 'true' ? { where: { status: 'assigned_to_work' } } : false,
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
      where: { isActive: true },
      include: {
        workOrders: {
          where: { status: { not: 'completed' } },
          orderBy: { plannedDate: 'desc' },
          take: 5,
          include: {
            workType: { select: { name: true } },
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

        let statusColor: 'black' | 'red' | 'orange' | 'green' = 'green';
        let statusReason = 'no equipment';
        let earliestRemovalDate: Date | null = null;
        let daysUntilRemoval: number | null = null;
        let mostUrgentWorkOrder: typeof activeWorkOrders[0] | null = null;

        const equipmentCount = site.workOrders.reduce((sum, wo) => sum + wo.equipment.length, 0);

        if (equipmentCount === 0) {
          statusColor = 'green';
          statusReason = 'no equipment';
        } else if (activeWorkOrders.length > 0) {
          const ranked = activeWorkOrders
            .map(wo => ({
              wo,
              days: wo.plannedRemovalDate
                ? Math.ceil((new Date(wo.plannedRemovalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : Infinity,
            }))
            .sort((a, b) => a.days - b.days);

          const priority = ranked.map(r => r.days);

          if (priority.some(d => d < 0)) {
            statusColor = 'black';
            const entry = ranked.find(r => r.days < 0)!;
            mostUrgentWorkOrder = entry.wo;
            daysUntilRemoval = entry.days;
            statusReason = `overdue by ${Math.abs(entry.days)} days`;
          } else if (priority.some(d => d >= 0 && d <= 3)) {
            statusColor = 'red';
            const entry = ranked.find(r => r.days >= 0 && r.days <= 3)!;
            mostUrgentWorkOrder = entry.wo;
            daysUntilRemoval = entry.days;
            statusReason = `removal in ${entry.days} days (0-3 days)`;
          } else if (priority.some(d => d >= 4 && d <= 7)) {
            statusColor = 'orange';
            const entry = ranked.find(r => r.days >= 4 && r.days <= 7)!;
            mostUrgentWorkOrder = entry.wo;
            daysUntilRemoval = entry.days;
            statusReason = `removal in ${entry.days} days (4-7 days)`;
          } else {
            statusColor = 'green';
            const entry = ranked[0];
            mostUrgentWorkOrder = entry.wo;
            daysUntilRemoval = entry.days === Infinity ? null : entry.days;
            statusReason = entry.days === Infinity
              ? 'no removal dates set'
              : `removal in ${entry.days} days (>7 days)`;
          }

          earliestRemovalDate = mostUrgentWorkOrder.plannedRemovalDate
            ? new Date(mostUrgentWorkOrder.plannedRemovalDate)
            : null;

          console.log(`[MapColor] Site ${site.name}:`, {
            siteId: site.id,
            workOrders: activeWorkOrders.map(wo => ({
              workOrderId: wo.id,
              plannedRemovalDate: wo.plannedRemovalDate,
            })),
            mostUrgentWorkOrder: mostUrgentWorkOrder?.id,
            earliestRemovalDate,
            daysUntilRemoval,
            statusColor,
            statusReason
          });
        } else {
          console.log(`[MapColor] Site ${site.name}:`, {
            siteId: site.id,
            statusColor,
            statusReason: 'no active work orders'
          });
        }

        return {
          ...site,
          equipment: undefined,
          workOrders: site.workOrders.map(wo => ({
            id: wo.id,
            status: wo.status,
            type: wo.type,
            workTypeName: (wo as any).workType?.name || wo.type,
            plannedDate: wo.plannedDate,
            plannedRemovalDate: wo.plannedRemovalDate,
          })),
          equipmentCount,
          overallStatus: statusColor,
          hasEquipment: equipmentCount > 0,
          earliestRemovalDate,
          daysUntilRemoval,
          hasValidLocation,
        };
      })
    );

    const validSites = sitesWithStatus.filter(s => 
      s.hasValidLocation && 
      s.latitude != null && 
      s.longitude != null
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
               s.longitude == null ? 'no longitude' : 'unknown'
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
          isActive: true,
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
        equipment: { where: { status: 'assigned_to_work' } },
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
      houseNumber,
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
      console.log(`[SiteCreate] Coordinates provided: lat=${latitude}, lng=${longitude}, hasValidLocation=${hasValidLocation}`);
    } else {
      console.log(`[SiteCreate] No coordinates provided, attempting geocode for: ${address}, ${city}`);
      const geoResult = await geocodeSiteAddress(null, address, city);
      if (geoResult.success && geoResult.latitude !== undefined && geoResult.longitude !== undefined) {
        finalLat = geoResult.latitude;
        finalLng = geoResult.longitude;
        hasValidLocation = true;
        console.log(`[SiteCreate] Geocode SUCCESS: lat=${finalLat}, lng=${finalLng}`);
      } else {
        hasValidLocation = false;
        console.log(`[SiteCreate] Geocode FAILED: ${geoResult.error}, reason: ${geoResult.reason}`);
      }
    }

    const site = await prisma.site.create({
      data: {
        name,
        address,
        city,
        houseNumber,
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

    console.log(`[SiteCreate] Site created: id=${site.id}, name=${site.name}, lat=${site.latitude}, lng=${site.longitude}, hasValidLocation=${site.hasValidLocation}`);

    res.status(201).json({
      ...site,
      hasValidLocation,
    });
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
      houseNumber,
      floor,
      apartment,
      contact1Name,
      contact1Phone,
      contact2Name,
      contact2Phone,
      rating,
      isHighlighted,
      isActive,
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
    if (houseNumber !== undefined) updateData.houseNumber = houseNumber;
    if (floor !== undefined) updateData.floor = floor;
    if (apartment !== undefined) updateData.apartment = apartment;
    if (contact1Name !== undefined) updateData.contact1Name = contact1Name;
    if (contact1Phone !== undefined) updateData.contact1Phone = contact1Phone;
    if (contact2Name !== undefined) updateData.contact2Name = contact2Name;
    if (contact2Phone !== undefined) updateData.contact2Phone = contact2Phone;
    if (rating !== undefined) updateData.rating = rating;
    if (isHighlighted !== undefined) updateData.isHighlighted = isHighlighted;
    if (isActive !== undefined) updateData.isActive = isActive;
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

router.patch('/:id/toggle-active', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const site = await prisma.site.findUnique({ where: { id } });
    if (!site) return res.status(404).json({ message: 'Site not found' });

    const newIsActive = !site.isActive;

    if (!newIsActive) {
      const activeWorkOrders = await prisma.workOrder.findMany({
        where: { siteId: id, status: { in: ['open', 'in_progress'] } },
        include: {
          equipment: { include: { equipment: true } },
        },
      });

      for (const wo of activeWorkOrders) {
        await prisma.$transaction(async (tx) => {
          await tx.workOrder.update({
            where: { id: wo.id },
            data: { status: 'completed', actualDate: new Date() },
          });

          await tx.workOrderStatusHistory.create({
            data: {
              workOrderId: wo.id,
              previousStatus: wo.status,
              newStatus: 'completed',
              changedById: userId,
            },
          });

          for (const link of wo.equipment) {
            await tx.equipment.update({
              where: { id: link.equipment.id },
              data: {
                status: 'available',
                siteId: null,
                actualRemovalDate: new Date(),
                plannedRemovalDate: null,
              },
            });
          }

          await tx.activityLog.create({
            data: {
              workOrderId: wo.id,
              siteId: id,
              userId,
              actionType: 'workorder_completed',
              notes: `Work order auto-completed when site was deactivated`,
            },
          });
        });
      }

      await prisma.equipment.updateMany({
        where: { siteId: id, status: 'assigned_to_work' },
        data: { siteId: null, status: 'available' },
      });
    }

    const updated = await prisma.site.update({
      where: { id },
      data: { isActive: newIsActive },
    });

    res.json({ ...updated, message: newIsActive ? 'Site activated' : 'Site deactivated and all work orders completed' });
  } catch (error) {
    console.error('Toggle site active error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    const siteId = req.params.id;

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      include: {
        _count: {
          select: {
            workOrders: true,
            equipment: true,
            activityLogs: true,
          },
        },
      },
    });

    if (!site) {
      return res.status(404).json({ message: 'Site not found' });
    }

    console.log(`[SiteDelete] Site ${site.name} (${siteId}): workOrders=${site._count.workOrders}, equipment=${site._count.equipment}, activityLogs=${site._count.activityLogs}`);

    // Get all work order IDs for this site
    const workOrderIds = (await prisma.workOrder.findMany({ where: { siteId }, select: { id: true } })).map(wo => wo.id);

    // 1. Delete ALL activity logs that reference this site OR any of its work orders
    await prisma.activityLog.deleteMany({
      where: {
        OR: [
          { siteId },
          ...(workOrderIds.length > 0 ? [{ workOrderId: { in: workOrderIds } }] : []),
        ],
      },
    });

    // 2. Delete work order child records
    if (workOrderIds.length > 0) {
      await prisma.checklistItem.deleteMany({ where: { workOrderId: { in: workOrderIds } } });
      await prisma.workOrderStatusHistory.deleteMany({ where: { workOrderId: { in: workOrderIds } } });
      await prisma.workOrderEquipment.deleteMany({ where: { workOrderId: { in: workOrderIds } } });
    }

    // 3. Delete work orders
    if (workOrderIds.length > 0) {
      await prisma.workOrder.deleteMany({ where: { siteId } });
    }

    // 4. Release equipment (set siteId to null, status to available)
    await prisma.equipment.updateMany({ where: { siteId }, data: { siteId: null, status: 'available' } });

    // 5. Delete the site
    await prisma.site.delete({ where: { id: siteId } });

    console.log(`[SiteDelete] Site ${site.name} deleted successfully`);
    res.json({ message: 'Site deleted' });
  } catch (error: any) {
    console.error('Delete site error:', error);
    if (error.code === 'P2003') {
      console.error(`[SiteDelete] P2003 FK constraint error for site ${req.params.id}:`, error.meta);
      return res.status(409).json({
        message: 'לא ניתן למחוק את האתר – יש אליו רשומות מקושרות. נסה שוב או פנה למנהל.'
      });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Site not found' });
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
