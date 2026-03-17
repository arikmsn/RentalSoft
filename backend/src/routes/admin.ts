import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.post('/reset-demo-data', async (req: Request, res: Response) => {
  try {
    const results: Record<string, number> = {};

    // Delete in correct order to respect FK constraints
    // 1. WorkOrderEquipment
    const deletedWOE = await prisma.workOrderEquipment.deleteMany({});
    results.workOrderEquipment = deletedWOE.count;

    // 2. WorkOrderStatusHistory
    const deletedHistory = await prisma.workOrderStatusHistory.deleteMany({});
    results.workOrderStatusHistory = deletedHistory.count;

    // 3. ChecklistItem (dependent on WorkOrder)
    const deletedChecklist = await prisma.checklistItem.deleteMany({});
    results.checklistItem = deletedChecklist.count;

    // 4. ActivityLog
    const deletedActivity = await prisma.activityLog.deleteMany({});
    results.activityLog = deletedActivity.count;

    // 5. WorkOrder
    const deletedWorkOrders = await prisma.workOrder.deleteMany({});
    results.workOrder = deletedWorkOrders.count;

    // 6. Equipment
    const deletedEquipment = await prisma.equipment.deleteMany({});
    results.equipment = deletedEquipment.count;

    // 7. Site
    const deletedSites = await prisma.site.deleteMany({});
    results.site = deletedSites.count;

    res.json({
      message: 'Demo data cleared successfully. Settings and users preserved.',
      deleted: results,
    });
  } catch (error) {
    console.error('Error resetting demo data:', error);
    res.status(500).json({ message: 'Server error while resetting data' });
  }
});

export default router;
