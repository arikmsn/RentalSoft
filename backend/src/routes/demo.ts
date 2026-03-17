import { Router } from 'express';
import { PrismaClient, EquipmentStatus, EquipmentCondition, WorkOrderType, WorkOrderStatus, ActionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = Router();
const prisma = new PrismaClient();

router.post('/populate', async (req, res) => {
  try {
    console.log('📦 Populating demo data...');

    const hashedPassword = await bcrypt.hash('demo123', 10);

    const admin = await prisma.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: {
        name: 'מנהל מערכת',
        email: 'admin@demo.com',
        password: hashedPassword,
        role: 'admin',
        phone: '050-1234567',
      },
    });

    const manager = await prisma.user.upsert({
      where: { email: 'manager@demo.com' },
      update: {},
      create: {
        name: 'דוד כהן',
        email: 'manager@demo.com',
        password: hashedPassword,
        role: 'manager',
        phone: '050-2345678',
      },
    });

    const tech1 = await prisma.user.upsert({
      where: { email: 'tech1@demo.com' },
      update: {},
      create: {
        name: 'אבי לוי',
        email: 'tech1@demo.com',
        password: hashedPassword,
        role: 'technician',
        phone: '050-3456789',
      },
    });

    const tech2 = await prisma.user.upsert({
      where: { email: 'tech2@demo.com' },
      update: {},
      create: {
        name: 'משה פרידמן',
        email: 'tech2@demo.com',
        password: hashedPassword,
        role: 'technician',
        phone: '050-4567890',
      },
    });

    const equipmentTypes = [
      { name: 'מזגן', description: 'מזגן עילוי' },
      { name: 'מקרר', description: 'מקרר תעשייתי' },
      { name: 'מכונת כביסה', description: 'מכונת כביסה תעשייתית' },
      { name: 'מקפיא', description: 'מקפיא תעשייתי' },
      { name: 'מדיח', description: 'מדיח כלים תעשייתי' },
    ];

    for (const type of equipmentTypes) {
      await prisma.equipmentType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }

    const sites = [
      { name: 'קניון גבעתיים', address: 'רחוב רמת גן 15', city: 'גבעתיים', floor: '2', apartment: 'מתחם המזון', contact1Name: 'ישראל ישראלי', contact1Phone: '03-1234567', contact2Name: 'שרה ישראלי', contact2Phone: '03-1234568', rating: 5, isHighlighted: true, latitude: 32.0675, longitude: 34.8094 },
      { name: 'סופר דומא', address: 'רחוב הרצל 25', city: 'תל אביב', floor: '1', contact1Name: 'דוד דוד', contact1Phone: '03-2345678', rating: 4, latitude: 32.0853, longitude: 34.7818 },
      { name: 'בית ספר יסודי אופק', address: 'רחוב הגיא 10', city: 'ירושלים', floor: '1', contact1Name: 'רחל רחלי', contact1Phone: '02-3456789', rating: 3, latitude: 31.7683, longitude: 35.2137 },
      { name: 'מרכז מסחרי שורש', address: 'רחוב הלוחמים 50', city: 'חיפה', floor: '3', contact1Name: 'אברהם אברהם', contact1Phone: '04-4567890', rating: 4, isHighlighted: true, latitude: 32.7940, longitude: 34.9896 },
      { name: 'מתחם ספורט ברמה', address: 'רחוב הספורט 8', city: 'באר שבע', contact1Name: 'גד גד', contact1Phone: '08-5678901', rating: 5, latitude: 31.2530, longitude: 34.7915 },
      { name: 'קניון השרון', address: 'רחוב ויצמן 1', city: 'נתניה', floor: '1', contact1Name: 'מיכל מיכל', contact1Phone: '09-6789012', rating: 4, latitude: 32.3280, longitude: 34.8550 },
      { name: 'מרכז רפואי הדסה', address: 'רחוב הרצוג 20', city: 'ירושלים', floor: '2', contact1Name: 'רונית רונית', contact1Phone: '02-4567890', rating: 5, latitude: 31.7950, longitude: 35.1850 },
      { name: 'מסעדת השף', address: 'רחוב דיזנגוף 50', city: 'תל אביב', floor: '1', contact1Name: 'שלום שלום', contact1Phone: '03-9876543', rating: 4, latitude: 32.0760, longitude: 34.7860 },
    ];

    const createdSites = [];
    for (const site of sites) {
      const created = await prisma.site.upsert({
        where: { id: site.name },
        update: {},
        create: site,
      });
      createdSites.push(created);
    }

    const typeRecords = await prisma.equipmentType.findMany();

    const equipmentData = [
      { qrTag: 'EQ001', type: 'מזגן', status: EquipmentStatus.at_customer, siteId: createdSites[0].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ002', type: 'מזגן', status: EquipmentStatus.at_customer, siteId: createdSites[0].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ003', type: 'מקרר', status: EquipmentStatus.at_customer, siteId: createdSites[1].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ004', type: 'מקרר', status: EquipmentStatus.at_customer, siteId: createdSites[1].id, condition: EquipmentCondition.wearout },
      { qrTag: 'EQ005', type: 'מקפיא', status: EquipmentStatus.at_customer, siteId: createdSites[2].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ006', type: 'מכונת כביסה', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
      { qrTag: 'EQ007', type: 'מזגן', status: EquipmentStatus.in_repair, condition: EquipmentCondition.not_ok },
      { qrTag: 'EQ008', type: 'מדיח', status: EquipmentStatus.at_customer, siteId: createdSites[3].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ009', type: 'מקרר', status: EquipmentStatus.at_customer, siteId: createdSites[4].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ010', type: 'מזגן', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
      { qrTag: 'EQ011', type: 'מקפיא', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
      { qrTag: 'EQ012', type: 'מכונת כביסה', status: EquipmentStatus.at_customer, siteId: createdSites[3].id, condition: EquipmentCondition.wearout },
      { qrTag: 'EQ013', type: 'מזגן', status: EquipmentStatus.at_customer, siteId: createdSites[5].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ014', type: 'מקרר', status: EquipmentStatus.at_customer, siteId: createdSites[6].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ015', type: 'מדיח', status: EquipmentStatus.at_customer, siteId: createdSites[7].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ016', type: 'מזגן', status: EquipmentStatus.available, condition: EquipmentCondition.ok },
      { qrTag: 'EQ017', type: 'מקרר', status: EquipmentStatus.available, condition: EquipmentCondition.ok },
      { qrTag: 'EQ018', type: 'מכונת כביסה', status: EquipmentStatus.in_repair, condition: EquipmentCondition.not_ok },
      { qrTag: 'EQ019', type: 'מקפיא', status: EquipmentStatus.at_customer, siteId: createdSites[0].id, condition: EquipmentCondition.ok },
      { qrTag: 'EQ020', type: 'מדיח', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
    ];

    const createdEquipment = [];
    for (const eq of equipmentData) {
      const typeRecord = typeRecords.find(t => t.name === eq.type);
      const created = await prisma.equipment.upsert({
        where: { qrTag: eq.qrTag },
        update: {},
        create: {
          qrTag: eq.qrTag,
          type: eq.type,
          typeId: typeRecord?.id,
          status: eq.status,
          condition: eq.condition,
          siteId: eq.siteId || null,
          installationDate: eq.status === EquipmentStatus.at_customer ? new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) : null,
          plannedRemovalDate: eq.status === EquipmentStatus.at_customer ? new Date(Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
          lastScanDate: eq.status === EquipmentStatus.at_customer ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        },
      });
      createdEquipment.push(created);
    }

    const workOrders = [
      { id: 'wo-1', type: WorkOrderType.installation, siteId: createdSites[0].id, technicianId: tech1.id, status: WorkOrderStatus.open, plannedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), plannedRemovalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
      { id: 'wo-2', type: WorkOrderType.inspection, siteId: createdSites[1].id, technicianId: tech1.id, status: WorkOrderStatus.in_progress, plannedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
      { id: 'wo-3', type: WorkOrderType.removal, siteId: createdSites[2].id, technicianId: tech2.id, status: WorkOrderStatus.open, plannedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), plannedRemovalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) },
      { id: 'wo-4', type: WorkOrderType.installation, siteId: createdSites[3].id, technicianId: tech2.id, status: WorkOrderStatus.completed, plannedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), actualDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), done: 'התקנה בוצעה בהצלחה. המזגן פועל.', plannedRemovalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000) },
      { id: 'wo-5', type: WorkOrderType.inspection, siteId: createdSites[4].id, technicianId: tech1.id, status: WorkOrderStatus.completed, plannedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), actualDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), done: 'המקרר תקין. יש להחליף גומיות בעוד 3 חודשים.' },
      { id: 'wo-6', type: WorkOrderType.installation, siteId: createdSites[5].id, technicianId: tech1.id, status: WorkOrderStatus.open, plannedDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), plannedRemovalDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000) },
      { id: 'wo-7', type: WorkOrderType.inspection, siteId: createdSites[6].id, technicianId: tech2.id, status: WorkOrderStatus.in_progress, plannedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
      { id: 'wo-8', type: WorkOrderType.removal, siteId: createdSites[7].id, technicianId: tech2.id, status: WorkOrderStatus.open, plannedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), plannedRemovalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
      { id: 'wo-9', type: WorkOrderType.installation, siteId: createdSites[1].id, technicianId: tech1.id, status: WorkOrderStatus.completed, plannedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), actualDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), done: 'המזגן הותקן ונבדק. הכל תקין.', plannedRemovalDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) },
      { id: 'wo-10', type: WorkOrderType.inspection, siteId: createdSites[0].id, technicianId: tech2.id, status: WorkOrderStatus.open, plannedDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) },
      { id: 'wo-11', type: WorkOrderType.general, siteId: createdSites[3].id, technicianId: tech1.id, status: WorkOrderStatus.completed, plannedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), actualDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), done: 'תיקון קטן בוצע.' },
      { id: 'wo-12', type: WorkOrderType.installation, siteId: createdSites[4].id, technicianId: tech2.id, status: WorkOrderStatus.in_progress, plannedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
    ];

    const createdWorkOrders = [];
    for (const wo of workOrders) {
      const created = await prisma.workOrder.upsert({
        where: { id: wo.id },
        update: {},
        create: wo,
      });
      createdWorkOrders.push(created);
    }

    const checklistItems = [
      { workOrderId: createdWorkOrders[0].id, itemName: 'בדיקת מתח חשמל', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'חיבור גז', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'בדיקת קירור', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'הדרכת לקוח', isChecked: false },
      { workOrderId: createdWorkOrders[1].id, itemName: 'בדיקת טמפרטורה', isChecked: true, value: '-18 מעלות' },
      { workOrderId: createdWorkOrders[1].id, itemName: 'בדיקת דלתות', isChecked: true },
      { workOrderId: createdWorkOrders[1].id, itemName: 'ניקוי מערכת', isChecked: false },
      { workOrderId: createdWorkOrders[2].id, itemName: 'ניתוק חשמל', isChecked: false },
      { workOrderId: createdWorkOrders[2].id, itemName: 'פירוק הציוד', isChecked: false },
      { workOrderId: createdWorkOrders[2].id, itemName: 'אישור לקוח', isChecked: false },
      { workOrderId: createdWorkOrders[5].id, itemName: 'בדיקת מתח', isChecked: false },
      { workOrderId: createdWorkOrders[5].id, itemName: 'חיבור ובדיקה', isChecked: false },
      { workOrderId: createdWorkOrders[6].id, itemName: 'בדיקת תקינות', isChecked: true },
      { workOrderId: createdWorkOrders[6].id, itemName: 'ניקוי', isChecked: false },
      { workOrderId: createdWorkOrders[7].id, itemName: 'ניתוק', isChecked: false },
      { workOrderId: createdWorkOrders[7].id, itemName: 'אריזה', isChecked: false },
    ];

    for (const item of checklistItems) {
      await prisma.checklistItem.create({ data: item });
    }

    const activityLogs = [
      { equipmentId: createdEquipment[0].id, siteId: createdSites[0].id, userId: tech1.id, actionType: ActionType.location_change, notes: 'Equipment installed at site', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { equipmentId: createdEquipment[0].id, siteId: createdSites[0].id, userId: tech1.id, actionType: ActionType.workorder_completed, notes: 'Installation completed', timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      { equipmentId: createdEquipment[2].id, siteId: createdSites[1].id, userId: tech2.id, actionType: ActionType.location_change, notes: 'Equipment scanned at site', timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      { workOrderId: createdWorkOrders[3].id, siteId: createdSites[3].id, userId: tech2.id, actionType: ActionType.workorder_created, notes: 'Work order created: installation', timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) },
      { workOrderId: createdWorkOrders[3].id, siteId: createdSites[3].id, userId: tech2.id, actionType: ActionType.workorder_completed, notes: 'Work order completed: installation', timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
      { equipmentId: createdEquipment[6].id, userId: manager.id, actionType: ActionType.status_change, notes: 'Equipment sent for repair', timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
    ];

    for (const log of activityLogs) {
      await prisma.activityLog.create({ data: log });
    }

    const counts = {
      users: await prisma.user.count(),
      sites: await prisma.site.count(),
      equipment: await prisma.equipment.count(),
      workOrders: await prisma.workOrder.count(),
      checklistItems: await prisma.checklistItem.count(),
      activityLogs: await prisma.activityLog.count(),
    };

    console.log('✅ Demo data populated:', counts);
    res.json({ success: true, message: 'Demo data populated successfully', counts });
  } catch (error) {
    console.error('❌ Error populating demo data:', error);
    res.status(500).json({ error: 'Failed to populate demo data' });
  }
});

export default router;
