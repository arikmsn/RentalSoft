"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/stats', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const [totalEquipment, activeEquipment, warehouseEquipment, inRepairEquipment, totalSites, sitesWithEquipment, todayWorkOrders, openWorkOrders, overdueRemovals, upcomingRemovals,] = await Promise.all([
            database_1.prisma.equipment.count(),
            database_1.prisma.equipment.count({ where: { status: 'at_customer' } }),
            database_1.prisma.equipment.count({ where: { status: 'warehouse' } }),
            database_1.prisma.equipment.count({ where: { status: 'in_repair' } }),
            database_1.prisma.site.count(),
            database_1.prisma.site.count({
                where: {
                    equipment: { some: { status: 'at_customer' } },
                },
            }),
            database_1.prisma.workOrder.count({
                where: {
                    plannedDate: { gte: today, lt: tomorrow },
                },
            }),
            database_1.prisma.workOrder.count({
                where: { status: { in: ['open', 'in_progress'] } },
            }),
            database_1.prisma.equipment.count({
                where: {
                    status: 'at_customer',
                    plannedRemovalDate: { lt: new Date() },
                },
            }),
            database_1.prisma.equipment.count({
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
            activeEquipment,
            warehouseEquipment,
            inRepairEquipment,
            totalSites,
            sitesWithEquipment,
            todayWorkOrders,
            openWorkOrders,
            overdueRemovals,
            upcomingRemovals,
        });
    }
    catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/alerts', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { type } = req.query;
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const where = {
            status: 'at_customer',
        };
        if (type === 'past_removal') {
            where.plannedRemovalDate = { lt: now };
        }
        else if (type === 'close_to_removal') {
            where.plannedRemovalDate = {
                gte: now,
                lte: weekFromNow,
            };
        }
        else {
            where.OR = [
                { plannedRemovalDate: { lt: now } },
                { plannedRemovalDate: { gte: now, lte: weekFromNow } },
            ];
        }
        const equipment = await database_1.prisma.equipment.findMany({
            where,
            include: { site: true },
        });
        const alerts = equipment.map((eq) => {
            const daysRemaining = eq.plannedRemovalDate
                ? Math.ceil((new Date(eq.plannedRemovalDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : 0;
            let alertType;
            if (daysRemaining < 0) {
                alertType = 'past_removal';
            }
            else if (daysRemaining <= 7) {
                alertType = 'close_to_removal';
            }
            else {
                alertType = 'long_stay';
            }
            return {
                id: `alert-${eq.id}`,
                equipmentId: eq.id,
                type: alertType,
                daysRemaining,
                createdAt: now,
            };
        });
        res.json(alerts);
    }
    catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/activity', auth_1.authenticate, async (req, res) => {
    try {
        const { equipmentId, siteId, userId, actionType, fromDate, toDate } = req.query;
        const where = {};
        if (equipmentId)
            where.equipmentId = String(equipmentId);
        if (siteId)
            where.siteId = String(siteId);
        if (userId)
            where.userId = String(userId);
        if (actionType)
            where.actionType = String(actionType);
        if (fromDate || toDate) {
            where.timestamp = {};
            if (fromDate)
                where.timestamp.gte = new Date(String(fromDate));
            if (toDate)
                where.timestamp.lte = new Date(String(toDate));
        }
        const activityLogs = await database_1.prisma.activityLog.findMany({
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
    }
    catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=dashboard.js.map