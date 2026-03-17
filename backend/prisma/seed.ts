import { PrismaClient, EquipmentStatus, EquipmentCondition, WorkOrderType, WorkOrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      name: 'מנהל מערכת',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      phone: '050-1234567',
    },
  });
  console.log('✅ Admin user created:', admin.email);

  const managerPassword = await bcrypt.hash('manager123', 10);
  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      name: 'דוד כהן',
      email: 'manager@example.com',
      password: managerPassword,
      role: 'manager',
      phone: '050-2345678',
    },
  });
  console.log('✅ Manager user created:', manager.email);

  const techPassword = await bcrypt.hash('tech123', 10);
  const technician = await prisma.user.upsert({
    where: { email: 'tech@example.com' },
    update: {},
    create: {
      name: 'אבי לוי',
      email: 'tech@example.com',
      password: techPassword,
      role: 'technician',
      phone: '050-3456789',
    },
  });

  const tech2Password = await bcrypt.hash('tech2123', 10);
  const technician2 = await prisma.user.upsert({
    where: { email: 'tech2@example.com' },
    update: {},
    create: {
      name: 'משה פרידמן',
      email: 'tech2@example.com',
      password: tech2Password,
      role: 'technician',
      phone: '050-4567890',
    },
  });
  console.log('✅ Technician users created:', technician.email, technician2.email);

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
  console.log('✅ Equipment types created');

  const sites = [
    {
      name: 'קניון גבעתיים',
      address: 'רחוב רמת גן 15',
      city: 'גבעתיים',
      floor: '2',
      apartment: 'מתחם המזון',
      contact1Name: 'ישראל ישראלי',
      contact1Phone: '03-1234567',
      contact2Name: 'שרה ישראלי',
      contact2Phone: '03-1234568',
      rating: 5,
      isHighlighted: true,
      latitude: 32.0675,
      longitude: 34.8094,
    },
    {
      name: 'סופר דומא',
      address: 'רחוב הרצל 25',
      city: 'תל אביב',
      floor: '1',
      contact1Name: 'דוד דוד',
      contact1Phone: '03-2345678',
      rating: 4,
      latitude: 32.0853,
      longitude: 34.7818,
    },
    {
      name: 'בית ספר יסודי אופק',
      address: 'רחוב הגיא 10',
      city: 'ירושלים',
      floor: '1',
      contact1Name: 'רחל רחלי',
      contact1Phone: '02-3456789',
      rating: 3,
      latitude: 31.7683,
      longitude: 35.2137,
    },
    {
      name: 'מרכז מסחרי שורש',
      address: 'רחוב הלוחמים 50',
      city: 'חיפה',
      floor: '3',
      contact1Name: 'אברהם אברהם',
      contact1Phone: '04-4567890',
      rating: 4,
      isHighlighted: true,
      latitude: 32.7940,
      longitude: 34.9896,
    },
    {
      name: 'מתחם ספורט ברמה',
      address: 'רחוב הספורט 8',
      city: 'באר שבע',
      contact1Name: 'גד גד',
      contact1Phone: '08-5678901',
      rating: 5,
      latitude: 31.2530,
      longitude: 34.7915,
    },
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
  console.log('✅ Sample sites created');

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
  console.log('✅ Sample equipment created');

  const workOrders = [
    {
      id: 'wo-1',
      type: WorkOrderType.installation,
      siteId: createdSites[0].id,
      technicianId: technician.id,
      status: WorkOrderStatus.open,
      plannedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      plannedRemovalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'wo-2',
      type: WorkOrderType.inspection,
      siteId: createdSites[1].id,
      technicianId: technician.id,
      status: WorkOrderStatus.in_progress,
      plannedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'wo-3',
      type: WorkOrderType.removal,
      siteId: createdSites[2].id,
      technicianId: technician2.id,
      status: WorkOrderStatus.open,
      plannedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      plannedRemovalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'wo-4',
      type: WorkOrderType.installation,
      siteId: createdSites[3].id,
      technicianId: technician2.id,
      status: WorkOrderStatus.completed,
      plannedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      actualDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      done: 'התקנה בוצעה בהצלחה. המזגן פועל.',
      plannedRemovalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
    },
    {
      id: 'wo-5',
      type: WorkOrderType.inspection,
      siteId: createdSites[4].id,
      technicianId: technician.id,
      status: WorkOrderStatus.completed,
      plannedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      actualDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      done: 'המקרר תקין. יש להחליף גומיות בעוד 3 חודשים.',
    },
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
  console.log('✅ Sample work orders created');

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
  ];

  for (const item of checklistItems) {
    await prisma.checklistItem.create({
      data: item,
    });
  }
  console.log('✅ Checklist items created');

  const activityLogs = [
    {
      equipmentId: createdEquipment[0].id,
      siteId: createdSites[0].id,
      userId: technician.id,
      actionType: 'location_change' as const,
      notes: 'Equipment installed at site',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      equipmentId: createdEquipment[0].id,
      siteId: createdSites[0].id,
      userId: technician.id,
      actionType: 'workorder_completed' as const,
      notes: 'Installation completed',
      timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      equipmentId: createdEquipment[2].id,
      siteId: createdSites[1].id,
      userId: technician2.id,
      actionType: 'location_change' as const,
      notes: 'Equipment scanned at site',
      timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    },
    {
      workOrderId: createdWorkOrders[3].id,
      siteId: createdSites[3].id,
      userId: technician2.id,
      actionType: 'workorder_created' as const,
      notes: 'Work order created: installation',
      timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    },
    {
      workOrderId: createdWorkOrders[3].id,
      siteId: createdSites[3].id,
      userId: technician2.id,
      actionType: 'workorder_completed' as const,
      notes: 'Work order completed: installation',
      timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
    {
      equipmentId: createdEquipment[6].id,
      userId: manager.id,
      actionType: 'status_change' as const,
      notes: 'Equipment sent for repair',
      timestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const log of activityLogs) {
    await prisma.activityLog.create({
      data: log,
    });
  }
  console.log('✅ Activity logs created');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
