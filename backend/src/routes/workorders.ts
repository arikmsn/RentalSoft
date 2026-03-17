import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { type, status, technicianId, siteId, plannedDate } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (technicianId) where.technicianId = technicianId;
    if (siteId) where.siteId = siteId;
    if (plannedDate) {
      const date = new Date(String(plannedDate));
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.plannedDate = {
        gte: date,
        lt: nextDay,
      };
    }

    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        site: true,
        technician: { select: { id: true, name: true, email: true } },
      },
      orderBy: { plannedDate: 'asc' },
    });

    res.json(workOrders);
  } catch (error) {
    console.error('Get work orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my-tasks/:technicianId', authenticate, async (req: AuthRequest, res) => {
  try {
    const requestingUserId = req.user!.id;
    const requestedTechnicianId = req.params.technicianId;
    
    if (req.user!.role === 'technician' && requestingUserId !== requestedTechnicianId) {
      return res.status(403).json({ message: 'Forbidden: You can only view your own tasks' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const workOrders = await prisma.workOrder.findMany({
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
  } catch (error) {
    console.error('Get my tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      include: {
        site: true,
        technician: { select: { id: true, name: true, email: true, phone: true } },
        checklist: true,
        equipment: { include: { equipment: true } },
      },
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('Get work order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { type, siteId, technicianId, plannedDate, plannedRemovalDate, equipmentIds } = req.body;

    const workOrder = await prisma.workOrder.create({
      data: {
        type,
        siteId,
        technicianId,
        plannedDate: new Date(plannedDate),
        plannedRemovalDate: plannedRemovalDate ? new Date(plannedRemovalDate) : null,
        equipment: equipmentIds && equipmentIds.length > 0 ? {
          create: equipmentIds.map((eqId: string) => ({ equipmentId: eqId }))
        } : undefined,
      },
      include: {
        site: true,
        technician: { select: { id: true, name: true, email: true } },
        equipment: { include: { equipment: true } },
      },
    });

    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        siteId,
        userId: req.user!.id,
        actionType: 'workorder_created',
        notes: `Work order created: ${type}`,
      },
    });

    res.status(201).json(workOrder);
  } catch (error) {
    console.error('Create work order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { type, status, technicianId, plannedDate, actualDate, done, todo, plannedRemovalDate } = req.body;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      select: { 
        technicianId: true,
        status: true,
      }
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

    // B7: Prevent editing completed work orders except for status changes
    if (existingWorkOrder.status === 'completed' && status) {
      // Allow changing status from completed to open/in_progress
      if (status !== 'open' && status !== 'in_progress') {
        return res.status(400).json({ message: 'Cannot change status of a completed work order to anything other than open or in_progress' });
      }
    } else if (existingWorkOrder.status === 'completed' && (type || technicianId || plannedDate || done || todo || plannedRemovalDate)) {
      // Block other field changes on completed work orders
      return res.status(400).json({ message: 'Cannot edit a completed work order. Only status can be changed.' });
    }

    // Track status change for history
    const previousStatus = existingWorkOrder.status;
    const isStatusChange = status && status !== previousStatus;

    const workOrder = await prisma.workOrder.update({
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

    // B8: Create status history entry when status changes
    if (isStatusChange) {
      await prisma.workOrderStatusHistory.create({
        data: {
          workOrderId: workOrder.id,
          previousStatus,
          newStatus: status,
          changedById: userId,
        },
      });
    }

    res.json(workOrder);
  } catch (error) {
    console.error('Update work order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// B8: Get work order status history
router.get('/:id/history', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const history = await prisma.workOrderStatusHistory.findMany({
      where: { workOrderId: req.params.id },
      include: {
        changedBy: { select: { name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    res.json(history);
  } catch (error) {
    console.error('Get work order history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/complete', authenticate, async (req: AuthRequest, res) => {
  try {
    const { done, todo, equipmentIds, newStatus } = req.body;
    const userRole = req.user!.role;
    const userId = req.user!.id;

    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: { id: req.params.id },
      select: { technicianId: true, status: true }
    });

    if (!existingWorkOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    if (userRole === 'technician' && existingWorkOrder.technicianId !== userId) {
      return res.status(403).json({ message: 'Forbidden: You can only complete your own work orders' });
    }

    const previousStatus = existingWorkOrder.status;

    const workOrder = await prisma.workOrder.update({
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

    // B8: Create status history entry for completion
    await prisma.workOrderStatusHistory.create({
      data: {
        workOrderId: workOrder.id,
        previousStatus,
        newStatus: 'completed',
        changedById: userId,
      },
    });

    if (equipmentIds && equipmentIds.length > 0) {
      for (const equipmentId of equipmentIds) {
        const equipment = await prisma.equipment.findUnique({
          where: { id: equipmentId },
        });

        if (equipment) {
          if (workOrder.type === 'removal') {
            await prisma.equipment.update({
              where: { id: equipmentId },
              data: {
                status: 'warehouse',
                siteId: null,
                actualRemovalDate: new Date(),
                plannedRemovalDate: null,
              },
            });
          } else if (workOrder.type === 'installation' && workOrder.plannedRemovalDate) {
            await prisma.equipment.update({
              where: { id: equipmentId },
              data: {
                plannedRemovalDate: workOrder.plannedRemovalDate,
              },
            });
          } else if (newStatus && ['warehouse', 'at_customer', 'in_repair', 'available'].includes(newStatus)) {
            await prisma.equipment.update({
              where: { id: equipmentId },
              data: {
                status: newStatus,
              },
            });
          }
        }
      }
    }

    await prisma.activityLog.create({
      data: {
        workOrderId: workOrder.id,
        siteId: workOrder.siteId,
        userId: req.user!.id,
        actionType: 'workorder_completed',
        notes: `Work order completed: ${workOrder.type}`,
      },
    });

    res.json(workOrder);
  } catch (error) {
    console.error('Complete work order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, isManagerOrAdmin, async (req, res) => {
  try {
    await prisma.workOrder.delete({
      where: { id: req.params.id },
    });

    res.json({ message: 'Work order deleted' });
  } catch (error) {
    console.error('Delete work order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id/checklist', authenticate, isTechnicianOrHigher, async (req, res) => {
  try {
    const checklist = await prisma.checklistItem.findMany({
      where: { workOrderId: req.params.id },
    });

    res.json(checklist);
  } catch (error) {
    console.error('Get checklist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.patch('/:id/checklist', authenticate, isTechnicianOrHigher, async (req: AuthRequest, res) => {
  try {
    const { items } = req.body;

    for (const item of items) {
      await prisma.checklistItem.upsert({
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

    const checklist = await prisma.checklistItem.findMany({
      where: { workOrderId: req.params.id },
    });

    res.json(checklist);
  } catch (error) {
    console.error('Update checklist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
