"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { type, status, technicianId, siteId, plannedDate } = req.query;
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (technicianId)
            where.technicianId = technicianId;
        if (siteId)
            where.siteId = siteId;
        if (plannedDate) {
            const date = new Date(String(plannedDate));
            const nextDay = new Date(date);
            nextDay.setDate(nextDay.getDate() + 1);
            where.plannedDate = {
                gte: date,
                lt: nextDay,
            };
        }
        const workOrders = await database_1.prisma.workOrder.findMany({
            where,
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true } },
            },
            orderBy: { plannedDate: 'asc' },
        });
        res.json(workOrders);
    }
    catch (error) {
        console.error('Get work orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/my-tasks/:technicianId', auth_1.authenticate, async (req, res) => {
    try {
        const requestingUserId = req.user.id;
        const requestedTechnicianId = req.params.technicianId;
        if (req.user.role === 'technician' && requestingUserId !== requestedTechnicianId) {
            return res.status(403).json({ message: 'Forbidden: You can only view your own tasks' });
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const workOrders = await database_1.prisma.workOrder.findMany({
            where: {
                technicianId: requestedTechnicianId,
                plannedDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { not: 'completed' },
            },
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true } },
            },
            orderBy: { plannedDate: 'asc' },
        });
        res.json(workOrders);
    }
    catch (error) {
        console.error('Get my tasks error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const workOrder = await database_1.prisma.workOrder.findUnique({
            where: { id: req.params.id },
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true, phone: true } },
                checklist: true,
            },
        });
        if (!workOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }
        res.json(workOrder);
    }
    catch (error) {
        console.error('Get work order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/', auth_1.authenticate, (0, auth_1.authorize)('manager', 'admin'), async (req, res) => {
    try {
        const { type, siteId, technicianId, plannedDate, plannedRemovalDate } = req.body;
        const workOrder = await database_1.prisma.workOrder.create({
            data: {
                type,
                siteId,
                technicianId,
                plannedDate: new Date(plannedDate),
                plannedRemovalDate: plannedRemovalDate ? new Date(plannedRemovalDate) : null,
            },
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true } },
            },
        });
        await database_1.prisma.activityLog.create({
            data: {
                workOrderId: workOrder.id,
                siteId,
                userId: req.user.id,
                actionType: 'workorder_created',
                notes: `Work order created: ${type}`,
            },
        });
        res.status(201).json(workOrder);
    }
    catch (error) {
        console.error('Create work order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.patch('/:id', auth_1.authenticate, async (req, res) => {
    try {
        const { type, status, technicianId, plannedDate, actualDate, done, todo, plannedRemovalDate } = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;
        const existingWorkOrder = await database_1.prisma.workOrder.findUnique({
            where: { id: req.params.id },
            select: { technicianId: true }
        });
        if (!existingWorkOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }
        if (userRole === 'technician' && existingWorkOrder.technicianId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You can only update your own work orders' });
        }
        if (userRole === 'technician' && (type || technicianId || plannedDate)) {
            return res.status(403).json({ message: 'Forbidden: Only managers can reassign or reschedule work orders' });
        }
        const workOrder = await database_1.prisma.workOrder.update({
            where: { id: req.params.id },
            data: {
                ...(type && userRole !== 'technician' && { type }),
                ...(status && { status }),
                ...(technicianId && userRole !== 'technician' && { technicianId }),
                ...(plannedDate && userRole !== 'technician' && { plannedDate: new Date(plannedDate) }),
                ...(actualDate && { actualDate: new Date(actualDate) }),
                ...(done !== undefined && { done }),
                ...(todo !== undefined && { todo }),
                ...(plannedRemovalDate && { plannedRemovalDate: new Date(plannedRemovalDate) }),
            },
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true } },
            },
        });
        res.json(workOrder);
    }
    catch (error) {
        console.error('Update work order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.post('/:id/complete', auth_1.authenticate, async (req, res) => {
    try {
        const { done, todo, equipmentIds, newStatus } = req.body;
        const userRole = req.user.role;
        const userId = req.user.id;
        const existingWorkOrder = await database_1.prisma.workOrder.findUnique({
            where: { id: req.params.id },
            select: { technicianId: true }
        });
        if (!existingWorkOrder) {
            return res.status(404).json({ message: 'Work order not found' });
        }
        if (userRole === 'technician' && existingWorkOrder.technicianId !== userId) {
            return res.status(403).json({ message: 'Forbidden: You can only complete your own work orders' });
        }
        const workOrder = await database_1.prisma.workOrder.update({
            where: { id: req.params.id },
            data: {
                status: 'completed',
                actualDate: new Date(),
                done,
                todo,
            },
            include: {
                site: true,
                technician: { select: { id: true, name: true, email: true } },
            },
        });
        if (equipmentIds && equipmentIds.length > 0) {
            for (const equipmentId of equipmentIds) {
                const equipment = await database_1.prisma.equipment.findUnique({
                    where: { id: equipmentId },
                });
                if (equipment) {
                    if (workOrder.type === 'removal') {
                        await database_1.prisma.equipment.update({
                            where: { id: equipmentId },
                            data: {
                                status: 'warehouse',
                                siteId: null,
                                actualRemovalDate: new Date(),
                                plannedRemovalDate: null,
                            },
                        });
                    }
                    else if (workOrder.type === 'installation' && workOrder.plannedRemovalDate) {
                        await database_1.prisma.equipment.update({
                            where: { id: equipmentId },
                            data: {
                                plannedRemovalDate: workOrder.plannedRemovalDate,
                            },
                        });
                    }
                    else if (newStatus && ['warehouse', 'at_customer', 'in_repair', 'available'].includes(newStatus)) {
                        await database_1.prisma.equipment.update({
                            where: { id: equipmentId },
                            data: {
                                status: newStatus,
                            },
                        });
                    }
                }
            }
        }
        await database_1.prisma.activityLog.create({
            data: {
                workOrderId: workOrder.id,
                siteId: workOrder.siteId,
                userId: req.user.id,
                actionType: 'workorder_completed',
                notes: `Work order completed: ${workOrder.type}`,
            },
        });
        res.json(workOrder);
    }
    catch (error) {
        console.error('Complete work order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.delete('/:id', auth_1.authenticate, auth_1.isManagerOrAdmin, async (req, res) => {
    try {
        await database_1.prisma.workOrder.delete({
            where: { id: req.params.id },
        });
        res.json({ message: 'Work order deleted' });
    }
    catch (error) {
        console.error('Delete work order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/:id/checklist', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const checklist = await database_1.prisma.checklistItem.findMany({
            where: { workOrderId: req.params.id },
        });
        res.json(checklist);
    }
    catch (error) {
        console.error('Get checklist error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
router.patch('/:id/checklist', auth_1.authenticate, auth_1.isTechnicianOrHigher, async (req, res) => {
    try {
        const { items } = req.body;
        for (const item of items) {
            await database_1.prisma.checklistItem.upsert({
                where: { id: item.id || '' },
                create: {
                    workOrderId: req.params.id,
                    itemName: item.itemName,
                    isChecked: item.isChecked,
                    value: item.value,
                },
                update: {
                    isChecked: item.isChecked,
                    value: item.value,
                },
            });
        }
        const checklist = await database_1.prisma.checklistItem.findMany({
            where: { workOrderId: req.params.id },
        });
        res.json(checklist);
    }
    catch (error) {
        console.error('Update checklist error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
//# sourceMappingURL=workorders.js.map