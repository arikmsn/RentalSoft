import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, AuthRequest } from '../middleware/auth';
import { computeWorkOrderStatus } from '../utils/status';

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
      sites,
    ] = await Promise.all([
      prisma.equipment.count(),
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
      prisma.site.findMany({
        include: {
          workOrders: {
            where: { status: { not: 'completed' } },
          },
        },
      }),
    ]);

    let overdueRemovals = 0;
    let upcomingRemovals = 0;
    for (const site of sites) {
      const removalDates = site.workOrders
        .map((wo) => wo.plannedRemovalDate)
        .filter((d): d is Date => d !== null);
      if (removalDates.length === 0) continue;
      const earliest = new Date(Math.min(...removalDates.map((d) => d.getTime())));
      const { statusColor } = computeWorkOrderStatus(earliest, new Date());
      if (statusColor === 'black') overdueRemovals++;
      else if (statusColor === 'red') upcomingRemovals++;
    }

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

    const sites = await prisma.site.findMany({
      include: {
        workOrders: {
          where: { status: { not: 'completed' } },
          orderBy: { plannedRemovalDate: 'asc' },
        },
      },
    });

    const alerts = sites
      .map((site) => {
        const activeWorkOrders = site.workOrders;
        const removalDates = activeWorkOrders
          .map((wo) => wo.plannedRemovalDate)
          .filter((d): d is Date => d !== null);

        if (removalDates.length === 0) return null;

        const earliestRemovalDate = new Date(Math.min(...removalDates.map((d) => d.getTime())));
        const { statusColor, daysUntilRemoval } = computeWorkOrderStatus(earliestRemovalDate, now);

        if (statusColor !== 'black' && statusColor !== 'red') return null;
        if (type === 'past_removal' && statusColor !== 'black') return null;
        if (type === 'close_to_removal' && statusColor !== 'red') return null;

        const firstWorkOrder = activeWorkOrders.find(
          (wo) => wo.plannedRemovalDate?.getTime() === earliestRemovalDate.getTime()
        ) || activeWorkOrders[0];

        if (!firstWorkOrder) return null;

        return {
          id: `alert-${site.id}`,
          equipmentId: null,
          workOrderId: firstWorkOrder?.id || null,
          type: statusColor === 'black' ? 'past_removal' : 'close_to_removal',
          daysRemaining: daysUntilRemoval!,
          createdAt: now,
          siteName: site.name,
          siteAddress: site.address,
          siteContact: site.contact1Name || '',
          sitePhone: site.contact1Phone || '',
        };
      })
      .filter(Boolean);

    res.json(alerts);
  } catch (error) {
    console.error('Get alerts error:', error);
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
