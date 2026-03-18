import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { status, siteId, type, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (siteId) where.siteId = siteId;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { qrTag: { contains: String(search), mode: 'insensitive' } },
        { type: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: { 
        site: true,
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
                site: { select: { name: true, city: true } },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Add computed field for active work order attachment
    const equipmentWithAttachment = equipment.map(eq => {
      const activeWorkOrder = eq.workOrders[0]?.workOrder;
      return {
        ...eq,
        activeWorkOrder: activeWorkOrder || null,
      };
    });

    res.json(equipmentWithAttachment);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
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

router.get('/:id', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { id: req.params.id },
      include: { site: true },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/qr/:qrTag', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const equipment = await prisma.equipment.findUnique({
      where: { qrTag: req.params.qrTag },
      include: { site: true },
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(equipment);
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
        status: status || 'warehouse',
      },
      include: { site: true },
    });

    await prisma.activityLog.create({
      data: {
        equipmentId: equipment.id,
        userId: req.user!.id,
        actionType: 'status_change',
        notes: `Equipment created with status: ${equipment.status}`,
      },
    });

    res.status(201).json(equipment);
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authenticate, isManagerOrAdmin, async (req: AuthRequest, res) => {
  try {
    const { qrTag, type, status, condition, siteId, plannedRemovalDate } = req.body;

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        ...(qrTag && { qrTag }),
        ...(type && { type }),
        ...(status && { status }),
        ...(condition && { condition }),
        ...(siteId !== undefined && { siteId }),
        ...(plannedRemovalDate && { plannedRemovalDate: new Date(plannedRemovalDate) }),
      },
      include: { site: true },
    });

    res.json(equipment);
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
    const { siteId, location } = req.body;

    const equipment = await prisma.equipment.update({
      where: { id: req.params.id },
      data: {
        siteId,
        lastScanDate: new Date(),
        installationDate: new Date(),
        status: 'at_customer',
        ...(location && {
          latitude: location.lat,
          longitude: location.lng,
        }),
      },
      include: { site: true },
    });

    await prisma.activityLog.create({
      data: {
        equipmentId: equipment.id,
        siteId,
        userId: req.user!.id,
        actionType: 'location_change',
        notes: `Equipment scanned at site`,
        locationLat: location?.lat,
        locationLng: location?.lng,
      },
    });

    res.json(equipment);
  } catch (error) {
    console.error('Scan equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
