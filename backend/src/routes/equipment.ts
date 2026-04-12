import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to build tenant filter for equipment
function getEquipmentTenantFilter(tenantId: string | null, isSuperAdmin: boolean) {
  if (isSuperAdmin) {
    return {}; // No filter for super admin
  }
  if (!tenantId) {
    console.error('[Equipment] Missing tenantId for non-super-admin user');
    return { tenantId: 'invalid-missing-tenant' }; // Will return empty
  }
  return { tenantId };
}

router.get('/', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { status, type, search, available, locationId, conditionState } = req.query;
    const tenantFilter = getEquipmentTenantFilter(req.tenantId || null, req.isSuperAdmin || false);

    const where: any = { ...tenantFilter };
    if (status) where.status = status;
    if (type) where.type = type;
    if (locationId) where.currentLocationId = locationId;
    if (conditionState) where.conditionState = conditionState;
    if (search) {
      where.OR = [
        { qrTag: { contains: String(search), mode: 'insensitive' } },
        { type: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    
    if (available === 'true') {
      where.workOrders = {
        none: {
          workOrder: { status: { in: ['open', 'in_progress'] } },
        },
      };
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: { 
        workOrders: {
          where: {
            workOrder: {
              status: { in: ['open', 'in_progress'] },
            },
          },
          include: {
            workOrder: {
              select: { 
                id: true, 
                status: true, 
                type: true,
                plannedRemovalDate: true,
                site: { select: { id: true, name: true, city: true } },
              },
            },
          },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const equipmentWithAttachment = equipment.map(eq => {
      const activeWorkOrder = eq.workOrders[0]?.workOrder;
      const workOrdersWithDates = eq.workOrders.filter(wo => wo.workOrder.plannedRemovalDate);
      const nextPlannedRemovalDate = workOrdersWithDates.length > 0
        ? workOrdersWithDates.sort((a, b) => 
            new Date(a.workOrder.plannedRemovalDate!).getTime() - 
            new Date(b.workOrder.plannedRemovalDate!).getTime()
          )[0].workOrder.plannedRemovalDate
        : null;
      return {
        ...eq,
        activeWorkOrder: activeWorkOrder || null,
        nextPlannedRemovalDate,
      };
    });

    res.json(equipmentWithAttachment);
  } catch (error) {
    console.error('GET /api/equipment failed:', error);
    res.json([]);
  }
});

router.get('/types', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const types = await prisma.equipmentType.findMany();
    res.json(types.map((t: { name: string }) => t.name));
  } catch (error) {
    console.error('Get equipment types error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.id },
      include: { 
        workOrders: {
          where: {
            workOrder: { status: { in: ['open', 'in_progress'] } },
          },
          include: {
            workOrder: {
              include: { site: true },
            },
          },
          orderBy: { workOrder: { plannedRemovalDate: 'asc' } },
        },
      },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const activeWorkOrder = equipment.workOrders[0]?.workOrder;
    const workOrdersWithDates = equipment.workOrders.filter(wo => wo.workOrder.plannedRemovalDate);
    const nextPlannedRemovalDate = workOrdersWithDates.length > 0
      ? workOrdersWithDates.sort((a, b) => 
          new Date(a.workOrder.plannedRemovalDate!).getTime() - 
          new Date(b.workOrder.plannedRemovalDate!).getTime()
        )[0].workOrder.plannedRemovalDate
      : null;

    res.json({
      ...equipment,
      workOrders: undefined,
      site: undefined,
      activeWorkOrder: activeWorkOrder ? {
        id: activeWorkOrder.id,
        type: activeWorkOrder.type,
        status: activeWorkOrder.status,
        site: activeWorkOrder.site,
      } : null,
      nextPlannedRemovalDate,
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/qr/:qrTag', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { qrTag: req.params.qrTag },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    const activeWorkOrder = await prisma.workOrderEquipment.findFirst({
      where: {
        equipmentId: equipment.id,
        workOrder: { status: { in: ['open', 'in_progress'] } },
      },
      include: {
        workOrder: {
          include: { site: true },
        },
      },
    });

    res.json({
      ...equipment,
      site: undefined,
      activeWorkOrder: activeWorkOrder?.workOrder || null,
    });
  } catch (error) {
    console.error('Get equipment by QR error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { qrTag, type, status } = req.body;

    const existing = await prisma.equipment.findUnique({
      where: { qrTag },
    });

    if (existing) {
      return res.status(400).json({ message: 'QR tag already exists' });
    }

    let typeRecord = await prisma.equipmentType.findUnique({
      where: { name: type },
    });

    if (!typeRecord) {
      typeRecord = await prisma.equipmentType.create({
        data: { name: type },
      });
    }

    const equipment = await prisma.equipment.create({
      data: {
        qrTag,
        type,
        typeId: typeRecord.id,
        status: status || 'available',
        tenantId: req.tenantId || undefined,
      },
    });

    await prisma.activityLog.create({
      data: {
        equipmentId: equipment.id,
        userId: req.user!.id,
        actionType: 'status_change',
        notes: `Equipment created with status: ${equipment.status}`,
        tenantId: req.tenantId || undefined,
      },
    });

    res.status(201).json({ ...equipment, activeWorkOrder: null });
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authenticate, isManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { qrTag, type, status, condition, conditionState, purchaseDate, currentLocationId } = req.body;

    const updateData: any = {};
    if (qrTag) updateData.qrTag = qrTag;
    if (type) updateData.type = type;
    if (status) updateData.status = status;
    if (condition) updateData.condition = condition;
    if (conditionState) updateData.conditionState = conditionState;
    if (purchaseDate !== undefined) updateData.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
    if (currentLocationId !== undefined) updateData.currentLocationId = currentLocationId || null;

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: updateData,
    });

    // If setting to NOT_OK, unassign from any active work orders
    if (conditionState === 'NOT_OK') {
      const activeAssignments = await prisma.workOrderEquipment.findMany({
        where: {
          equipmentId: equipment.id,
          workOrder: { status: { in: ['open', 'in_progress'] } },
        },
      });
      for (const assignment of activeAssignments) {
        await prisma.workOrderEquipment.delete({ where: { id: assignment.id } });
      }
      await prisma.equipment.update({
        where: { id: equipment.id },
        data: { status: 'available', siteId: null },
      });
    }

    const activeWorkOrder = await prisma.workOrderEquipment.findFirst({
      where: {
        equipmentId: equipment.id,
        workOrder: { status: { in: ['open', 'in_progress'] } },
      },
      include: {
        workOrder: {
          include: { site: true },
        },
      },
    });

    res.json({
      ...equipment,
      activeWorkOrder: activeWorkOrder?.workOrder || null,
    });
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, authorize('manager', 'admin'), async (req, res) => {
  try {
    await prisma.equipment.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Equipment deleted' });
  } catch (error) {
    console.error('Delete equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/scan', authenticate, async (req: AuthRequest, res) => {
  try {
    const { location } = req.body;

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        lastScanDate: new Date(),
        installationDate: new Date(),
        status: 'assigned_to_work',
        ...(location && {
          latitude: location.lat,
          longitude: location.lng,
        }),
      },
    });

    const activeWorkOrder = await prisma.workOrderEquipment.findFirst({
      where: {
        equipmentId: equipment.id,
        workOrder: { status: { in: ['open', 'in_progress'] } },
      },
      include: {
        workOrder: {
          include: { site: true },
        },
      },
    });

    await prisma.activityLog.create({
      data: {
        equipmentId: equipment.id,
        userId: req.user!.id,
        actionType: 'location_change',
        notes: `Equipment scanned at customer location`,
        locationLat: location?.lat,
        locationLng: location?.lng,
      },
    });

    res.json({
      ...equipment,
      activeWorkOrder: activeWorkOrder?.workOrder || null,
    });
  } catch (error) {
    console.error('Scan equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Equipment notes
router.get('/:id/notes', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const notes = await prisma.equipmentNote.findMany({
      where: { equipmentId: id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching equipment notes:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/notes', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Text is required' });
    }
    const note = await prisma.equipmentNote.create({
      data: {
        equipmentId: id,
        text,
      },
    });
    res.json(note);
  } catch (error) {
    console.error('Error creating equipment note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:equipmentId/notes/:noteId', authenticate, async (req: AuthRequest, res) => {
  try {
    const { noteId } = req.params;
    await prisma.equipmentNote.delete({
      where: { id: noteId },
    });
    res.json({ message: 'Note deleted' });
  } catch (error) {
    console.error('Error deleting equipment note:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
