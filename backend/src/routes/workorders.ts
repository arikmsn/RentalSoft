import { Router } from 'express';
import { prisma } from '../config/database';
import { authenticate, isManagerOrAdmin, isTechnicianOrHigher, authorize, AuthRequest } from '../middleware/auth';
import { computeWorkOrderStatus } from '../utils/status';

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
        technician: { select: { id: true, name: true } },
        equipment: { select: { id: true } },
      },
      orderBy: { plannedDate: 'asc' },
    });

    const now = new Date();
    const workOrdersWithCount = workOrders.map(wo => {
      const { statusColor, daysUntilRemoval } = computeWorkOrderStatus(
        wo.plannedRemovalDate ? new Date(wo.plannedRemovalDate) : null,
        now
      );
      return {
        ...wo,
        statusColor,
        daysUntilRemoval,
        equipmentCount: wo.equipment.length,
        equipment: undefined,
      };
    });

    res.json(workOrdersWithCount);
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
        technician: { select: { id: true, name: true } },
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
        technician: { select: { id: true, name: true } },
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

// Helper function to update equipment status based on work order
async function updateEquipmentStatusForWorkOrder(workOrderId: string) {
  const workOrder = await prisma.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
      equipment: true,
    },
  });

  if (!workOrder) return;

  const activeStatuses = ['open', 'in_progress'];
  const isActive = activeStatuses.includes(workOrder.status);

  const equipmentIds = workOrder.equipment.map(e => e.equipmentId);

  if (equipmentIds.length === 0) {
    console.log(`[WorkOrder ${workOrderId}] Status change to ${workOrder.status}: No equipment attached, skipping`);
    return;
  }

  console.log(`[WorkOrder ${workOrderId}] Status change to ${workOrder.status}: Updating ${equipmentIds.length} equipment items to ${isActive ? 'at_customer' : 'warehouse'}`);

  if (isActive) {
    await prisma.equipment.updateMany({
      where: { id: { in: equipmentIds } },
      data: { status: 'at_customer' },
    });
  } else if (workOrder.status === 'completed') {
    await prisma.equipment.updateMany({
      where: { id: { in: equipmentIds } },
      data: { status: 'warehouse' },
    });
  }
}

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
        technician: { select: { id: true, name: true } },
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

    // Update equipment status based on work order
    if (equipmentIds && equipmentIds.length > 0) {
      await updateEquipmentStatusForWorkOrder(workOrder.id);
    }

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
      if (status !== 'open' && status !== 'in_progress') {
        console.warn(`[WorkOrder PATCH] 400 - Cannot change status of completed work order ${req.params.id} to ${status}`);
        return res.status(400).json({ message: 'Cannot change status of a completed work order to anything other than open or in_progress' });
      }
    } else if (existingWorkOrder.status === 'completed' && (type || technicianId || plannedDate || done || todo || plannedRemovalDate)) {
      console.warn(`[WorkOrder PATCH] 400 - Cannot edit completed work order ${req.params.id}, attempted fields:`, { type, technicianId, plannedDate, done, todo, plannedRemovalDate });
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
        technician: { select: { id: true, name: true } },
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
      // Update equipment status when work order status changes
      await updateEquipmentStatusForWorkOrder(workOrder.id);
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
        technician: { select: { id: true, name: true } },
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
        await prisma.equipment.update({
          where: { id: equipmentId },
          data: {
            status: 'available',
            siteId: null,
            plannedRemovalDate: null,
            actualRemovalDate: new Date(),
          },
        });
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

// Add equipment to work order
router.post('/:id/equipment', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { equipmentId } = req.body;
    const workOrderId = req.params.id;

    // Check if already linked to this work order
    const existing = await prisma.workOrderEquipment.findFirst({
      where: { workOrderId, equipmentId },
    });

    if (existing) {
      console.warn(`[WorkOrder Equipment] 400 - Equipment ${equipmentId} already linked to work order ${workOrderId}`);
      return res.status(400).json({ message: 'Equipment already linked to this work order' });
    }

    // Check if equipment is already attached to another active work order
    const otherActiveLink = await prisma.workOrderEquipment.findFirst({
      where: {
        equipmentId,
        workOrder: {
          status: { in: ['open', 'in_progress'] },
        },
      },
      include: {
        workOrder: {
          include: {
            site: { select: { name: true } },
          },
        },
      },
    });

    if (otherActiveLink) {
      console.warn(`[WorkOrder Equipment] 400 - Equipment ${equipmentId} already attached to active work order ${otherActiveLink.workOrder.id}`);
      return res.status(400).json({ 
        message: `Equipment is already attached to active work order #${otherActiveLink.workOrder.id} (${otherActiveLink.workOrder.site?.name || 'unknown site'})` 
      });
    }

    await prisma.workOrderEquipment.create({
      data: { workOrderId, equipmentId },
    });

    // Update equipment status to at_customer and set currentWorkOrderId
    await prisma.equipment.update({
      where: { id: equipmentId },
      data: { status: 'at_customer' },
    });

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        equipment: { include: { equipment: true } },
      },
    });

    res.json(workOrder);
  } catch (error) {
    console.error('Add equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove equipment from work order
router.delete('/:id/equipment/:equipmentId', authenticate, authorize('manager', 'admin'), async (req: AuthRequest, res) => {
  try {
    const { id, equipmentId } = req.params;

    await prisma.workOrderEquipment.deleteMany({
      where: { workOrderId: id, equipmentId },
    });

    // Check if equipment is linked to any other active work orders
    const otherLinks = await prisma.workOrderEquipment.findFirst({
      where: {
        equipmentId,
        workOrder: {
          status: { in: ['open', 'in_progress'] },
        },
      },
    });

    // If not linked to any active work order, set back to available
    if (!otherLinks) {
      await prisma.equipment.update({
        where: { id: equipmentId },
        data: { status: 'available' },
      });
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
      include: {
        equipment: { include: { equipment: true } },
      },
    });

    res.json(workOrder);
  } catch (error) {
    console.error('Remove equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, isManagerOrAdmin, async (req, res) => {
  try {
    const workOrderId = req.params.id;

    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        equipment: { include: { equipment: true } },
      },
    });

    if (!workOrder) {
      return res.status(404).json({ message: 'Work order not found' });
    }

    console.log(`[WODelete] Deleting work order ${workOrderId}, type=${workOrder.type}, equipmentCount=${workOrder.equipment.length}`);

    // 1. Release all equipment attached to this work order
    for (const woEq of workOrder.equipment) {
      await prisma.equipment.update({
        where: { id: woEq.equipmentId },
        data: { status: 'warehouse', siteId: null },
      });
    }

    // 2. Delete child records in correct order
    await prisma.activityLog.deleteMany({ where: { workOrderId } });
    await prisma.checklistItem.deleteMany({ where: { workOrderId } });
    await prisma.workOrderStatusHistory.deleteMany({ where: { workOrderId } });
    await prisma.workOrderEquipment.deleteMany({ where: { workOrderId } });

    // 3. Delete the work order
    await prisma.workOrder.delete({ where: { id: workOrderId } });

    console.log(`[WODelete] Work order ${workOrderId} deleted, equipment released`);
    res.json({ message: 'Work order deleted' });
  } catch (error: any) {
    console.error('Delete work order error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Work order not found' });
    }
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
