import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/stats', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEquipment,
      availableEquipment,
      atCustomerEquipment,
      inRepairEquipment,
      totalSites,
      sitesWithEquipment,
      todayWorkOrders,
      openWorkOrders,
      overdueRemovals,
      upcomingRemovals,
    ] = await Promise.all([
      prisma.equipment.count(),
      // Available = not attached to any active work order
      prisma.equipment.count({
        where: {
          NOT: {
            workOrders: {
              some: {
                workOrder: { status: { in: ['open', 'in_progress'] } }
              }
            }
          }
        }
      }),
      prisma.equipment.count({ where: { status: 'at_customer' } }),
      prisma.equipment.count({ where: { status: 'in_repair' } }),
      prisma.site.count(),
      prisma.site.count({
        where: {
          workOrders: { some: { status: { in: ['open', 'in_progress'] } } },
        },
      }),
      prisma.workOrder.count({
        where: {
          plannedDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.workOrder.count({
        where: { status: { in: ['open', 'in_progress'] } },
      }),
      prisma.equipment.count({
        where: {
          status: 'at_customer',
          plannedRemovalDate: { lt: new Date() },
        },
      }),
      prisma.equipment.count({
        where: {
          status: 'at_customer',
          plannedRemovalDate: {
            gte: new Date(),
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    res.json({
      totalEquipment,
      availableEquipment,
      atCustomerEquipment,
      inRepairEquipment,
      totalSites,
      sitesWithEquipment,
      todayWorkOrders,
      openWorkOrders,
      overdueRemovals,
      upcomingRemovals,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/alerts', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { type } = req.query;
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where: any = {
      status: 'at_customer',
    };

    if (type === 'past_removal') {
      where.plannedRemovalDate = { lt: now };
    } else if (type === 'close_to_removal') {
      where.plannedRemovalDate = {
        gte: now,
        lte: weekFromNow,
      };
    } else {
      where.OR = [
        { plannedRemovalDate: { lt: now } },
        { plannedRemovalDate: { gte: now, lte: weekFromNow } },
      ];
    }

    const equipment = await prisma.equipment.findMany({
      where,
      include: { 
        site: true,
        workOrders: {
          where: {
            workOrder: { status: { in: ['open', 'in_progress'] } },
          },
          take: 1,
        },
      },
    });

    // Get work orders for these equipment
    const workOrders = await prisma.workOrder.findMany({
      where: {
        status: { in: ['open', 'in_progress'] },
      },
      select: { id: true, siteId: true },
    });

    // Create a map of siteId to workOrderId
    const siteToWorkOrder = new Map<string, string>();
    workOrders.forEach(wo => {
      if (!siteToWorkOrder.has(wo.siteId)) {
        siteToWorkOrder.set(wo.siteId, wo.id);
      }
    });

    const alerts = equipment.map((eq: any) => {
      const daysRemaining = eq.plannedRemovalDate
        ? Math.ceil((new Date(eq.plannedRemovalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      let alertType: 'past_removal' | 'close_to_removal';
      if (daysRemaining < 0) {
        alertType = 'past_removal';
      } else if (daysRemaining <= 2) {
        alertType = 'close_to_removal';
      } else {
        return null;
      }

      // Get active work order for this equipment
      const activeWorkOrder = eq.workOrders?.[0]?.workOrder;
      const workOrderId = activeWorkOrder?.id || (eq.siteId ? siteToWorkOrder.get(eq.siteId) || null : null);

      return {
        id: `alert-${eq.id}`,
        equipmentId: eq.id,
        workOrderId,
        type: alertType,
        daysRemaining,
        createdAt: now,
        siteName: eq.site?.name || '',
        siteAddress: eq.site?.address || '',
        siteContact: eq.site?.contact1Name || '',
        sitePhone: eq.site?.contact1Phone || '',
      };
    });

    res.json(alerts.filter(Boolean));
  } catch (error) {
    console.error('Get alerts error:', error);
    // Return empty array instead of 500 to keep dashboard working
    res.json([]);
  }
});

router.get('/activity', authenticate, async (req: AuthRequest, res) => {
  try {
    const { equipmentId, siteId, userId, actionType, fromDate, toDate } = req.query;

    const where: any = {};
    if (equipmentId) where.equipmentId = String(equipmentId);
    if (siteId) where.siteId = String(siteId);
    if (userId) where.userId = String(userId);
    if (actionType) where.actionType = String(actionType);
    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = new Date(String(fromDate));
      if (toDate) where.timestamp.lte = new Date(String(toDate));
    }

    const activityLogs = await prisma.activityLog.findMany({
      where,
      include: {
        equipment: { select: { qrTag: true, type: true } },
        site: { select: { name: true, address: true } },
        user: { select: { name: true } },
        workOrder: { select: { type: true } },
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    res.json(activityLogs);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
