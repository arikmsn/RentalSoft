import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Authentication required for all routes
router.use(authenticate);

// GET routes are accessible to all authenticated users (admin, manager, tech)
// POST/PUT/DELETE routes require admin or manager
router.get('/', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Settings API' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Checklist Items - GET is open, mutations require admin/manager
router.get('/checklist', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const items = await prisma.settingsChecklistItem.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(items);
  } catch (error) {
    console.error('Error fetching checklist items:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/checklist', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, isActive, sortOrder } = req.body;
    const item = await prisma.settingsChecklistItem.create({
      data: { name, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json(item);
  } catch (error) {
    console.error('Error creating checklist item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/checklist/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, sortOrder } = req.body;
    const item = await prisma.settingsChecklistItem.update({
      where: { id },
      data: { name, isActive, sortOrder },
    });
    res.json(item);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/checklist/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.settingsChecklistItem.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Work Order Types - GET is open, mutations require admin/manager
router.get('/work-order-types', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const types = await prisma.settingsWorkOrderType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching work order types:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/work-order-types', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, isActive, sortOrder } = req.body;
    const type = await prisma.settingsWorkOrderType.create({
      data: { name, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json(type);
  } catch (error) {
    console.error('Error creating work order type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/work-order-types/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive, sortOrder } = req.body;
    const type = await prisma.settingsWorkOrderType.update({
      where: { id },
      data: { name, isActive, sortOrder },
    });
    res.json(type);
  } catch (error) {
    console.error('Error updating work order type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/work-order-types/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.settingsWorkOrderType.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting work order type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Equipment Types - GET is open, mutations require admin/manager
router.get('/equipment-types', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const types = await prisma.settingsEquipmentType.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch (error) {
    console.error('Error fetching equipment types:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/equipment-types', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, code, isActive, sortOrder } = req.body;
    const type = await prisma.settingsEquipmentType.create({
      data: { name, code, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json(type);
  } catch (error) {
    console.error('Error creating equipment type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/equipment-types/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, isActive, sortOrder } = req.body;
    const type = await prisma.settingsEquipmentType.update({
      where: { id },
      data: { name, code, isActive, sortOrder },
    });
    res.json(type);
  } catch (error) {
    console.error('Error updating equipment type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/equipment-types/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.settingsEquipmentType.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting equipment type:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Equipment Statuses
router.get('/equipment-statuses', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const statuses = await prisma.settingsEquipmentStatus.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(statuses);
  } catch (error) {
    console.error('Error fetching equipment statuses:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/equipment-statuses', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, code, isActive, sortOrder } = req.body;
    const status = await prisma.settingsEquipmentStatus.create({
      data: { name, code, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json(status);
  } catch (error) {
    console.error('Error creating equipment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/equipment-statuses/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, isActive, sortOrder } = req.body;
    const status = await prisma.settingsEquipmentStatus.update({
      where: { id },
      data: { name, code, isActive, sortOrder },
    });
    res.json(status);
  } catch (error) {
    console.error('Error updating equipment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/equipment-statuses/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.settingsEquipmentStatus.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting equipment status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Equipment Conditions
router.get('/equipment-conditions', async (req: Request, res: Response) => {
  try {
    const { isActive } = req.query;
    const where = isActive !== undefined ? { isActive: isActive === 'true' } : {};
    const conditions = await prisma.settingsEquipmentCondition.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
    res.json(conditions);
  } catch (error) {
    console.error('Error fetching equipment conditions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/equipment-conditions', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, code, isActive, sortOrder } = req.body;
    const condition = await prisma.settingsEquipmentCondition.create({
      data: { name, code, isActive: isActive ?? true, sortOrder: sortOrder ?? 0 },
    });
    res.json(condition);
  } catch (error) {
    console.error('Error creating equipment condition:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/equipment-conditions/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, isActive, sortOrder } = req.body;
    const condition = await prisma.settingsEquipmentCondition.update({
      where: { id },
      data: { name, code, isActive, sortOrder },
    });
    res.json(condition);
  } catch (error) {
    console.error('Error updating equipment condition:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/equipment-conditions/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.settingsEquipmentCondition.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting equipment condition:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Technicians (separate lookup table)
router.get('/technicians', async (req: Request, res: Response) => {
  try {
    const technicians = await prisma.technician.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/technicians', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name, active } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const technician = await prisma.technician.create({
      data: {
        name,
        active: active ?? true,
      },
    });
    res.json(technician);
  } catch (error) {
    console.error('Error creating technician:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/technicians/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (active !== undefined) updateData.active = active;
    
    const technician = await prisma.technician.update({
      where: { id },
      data: updateData,
    });
    res.json(technician);
  } catch (error) {
    console.error('Error updating technician:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/technicians/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if technician is referenced by any work orders
    const workOrdersCount = await prisma.workOrder.count({
      where: { technicianId: id },
    });
    
    if (workOrdersCount > 0) {
      return res.status(400).json({ 
        message: 'לא ניתן למחוק טכנאי שמקושר לעבודות קיימות. יש להסיר את הקישור תחילה.' 
      });
    }
    
    await prisma.technician.delete({
      where: { id },
    });
    res.json({ message: 'Technician deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting technician:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Technician not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

// Equipment Locations
router.get('/equipment-locations', async (req: Request, res: Response) => {
  try {
    const locations = await prisma.equipmentLocation.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(locations);
  } catch (error) {
    console.error('Error fetching equipment locations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/equipment-locations', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    const existing = await prisma.equipmentLocation.findUnique({ where: { name } });
    if (existing) {
      return res.status(400).json({ message: 'Location name already exists' });
    }
    const location = await prisma.equipmentLocation.create({
      data: { name, isDefaultCustomer: false, isSystem: false },
    });
    res.json(location);
  } catch (error) {
    console.error('Error creating equipment location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/equipment-locations/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const existing = await prisma.equipmentLocation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Location not found' });
    }
    if (existing.isSystem) {
      return res.status(400).json({ message: 'Cannot edit system location' });
    }
    if (name && name !== existing.name) {
      const duplicate = await prisma.equipmentLocation.findUnique({ where: { name } });
      if (duplicate) {
        return res.status(400).json({ message: 'Location name already exists' });
      }
    }
    const location = await prisma.equipmentLocation.update({
      where: { id },
      data: { name },
    });
    res.json(location);
  } catch (error) {
    console.error('Error updating equipment location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/equipment-locations/:id', authorize('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.equipmentLocation.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'Location not found' });
    }
    if (existing.isSystem) {
      return res.status(400).json({ message: 'Cannot delete system location' });
    }
    const inUse = await prisma.equipment.count({ where: { currentLocationId: id } });
    if (inUse > 0) {
      return res.status(400).json({ message: 'Location is in use by equipment' });
    }
    await prisma.equipmentLocation.delete({ where: { id } });
    res.json({ message: 'Location deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting equipment location:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Location not found' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});
