import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, AuthRequest } from '../middleware/auth';
import { computeWorkOrderStatus } from '../utils/status';

const router = Router();

router.get('/stats', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalEquipment,
      availableEquipment,
      atCustomerEquipment,
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
      prisma.equipment.count({ where: { status: 'assigned_to_work' } }),
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
        where: { isActive: true },
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
      console.log('[Stats] site:', site.id, 'earliest:', earliest.toISOString());
      const { statusColor, daysUntilRemoval } = computeWorkOrderStatus(earliest, today);
      console.log('[Stats] statusColor:', statusColor, 'daysUntilRemoval:', daysUntilRemoval);
      if (statusColor === 'black') overdueRemovals++;
      else if (statusColor === 'red') upcomingRemovals++;
    }

    res.json({
      totalEquipment,
      availableEquipment,
      atCustomerEquipment,
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
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    console.log('[Alerts] today:', today.toISOString(), 'local:', today.toString());

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

        let statusColor: 'black' | 'red' | 'orange' | 'green' = 'green';
        let daysUntilRemoval: number | null = null;
        let mostUrgentWO: typeof activeWorkOrders[0] | null = null;

        if (activeWorkOrders.length > 0) {
          const ranked = activeWorkOrders
            .map(wo => {
              console.log('[Alerts] workOrder:', wo.id, 'plannedRemovalDate:', wo.plannedRemovalDate?.toISOString());
              const result = computeWorkOrderStatus(wo.plannedRemovalDate, today);
              console.log('[Alerts] result:', result);
              return {
                wo,
                days: result.daysUntilRemoval ?? Infinity,
                statusColor: result.statusColor,
              };
            })
            .sort((a, b) => a.days - b.days);

          const priorities = ranked.map(r => r.days);
          if (priorities.some(d => d < 0)) {
            statusColor = 'black';
            const entry = ranked.find(r => r.days < 0)!;
            mostUrgentWO = entry.wo;
            daysUntilRemoval = entry.days;
          } else if (priorities.some(d => d >= 0 && d <= 3)) {
            statusColor = 'red';
            const entry = ranked.find(r => r.days >= 0 && r.days <= 3)!;
            mostUrgentWO = entry.wo;
            daysUntilRemoval = entry.days;
          } else {
            return null;
          }
        } else {
          return null;
        }

        if (type === 'past_removal' && statusColor !== 'black') return null;
        if (type === 'close_to_removal' && statusColor !== 'red') return null;

        return {
          id: `alert-${site.id}`,
          equipmentId: null,
          workOrderId: mostUrgentWO?.id || null,
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
