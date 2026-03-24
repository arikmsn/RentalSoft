import { PrismaClient, EquipmentStatus, EquipmentCondition, WorkOrderType, WorkOrderStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Demo user passwords MUST be provided via env vars
  const adminPassword = process.env.ADMIN_PASSWORD;
  const managerPassword = process.env.MANAGER_PASSWORD;
  const techPassword = process.env.TECH_PASSWORD;
  const tech2Password = process.env.TECH2_PASSWORD;

  if (!adminPassword || !managerPassword || !techPassword || !tech2Password) {
    console.warn('⚠️ Demo user passwords not fully configured via env vars. Set: ADMIN_PASSWORD, MANAGER_PASSWORD, TECH_PASSWORD, TECH2_PASSWORD');
    console.warn('⚠️ Skipping demo users seeding. Add the required env vars and run seed again.');
    // Continue with other seeding (equipment types, sites, etc.) but skip users
  } else {
    // Admin user
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedAdminPassword,
        name: 'מנהל מערכת',
        role: 'admin',
      },
      create: {
        name: 'מנהל מערכת',
        email: 'admin@rentalsoft.local',
        username: 'admin',
        password: hashedAdminPassword,
        role: 'admin',
        phone: '050-1234567',
      },
    });
    console.log('✅ Admin user created/updated: admin');

    // Manager user
    const hashedManagerPassword = await bcrypt.hash(managerPassword, 10);
    await prisma.user.upsert({
      where: { username: 'manager' },
      update: {
        password: hashedManagerPassword,
        name: 'מנהל',
        role: 'manager',
      },
      create: {
        name: 'מנהל',
        email: 'manager@rentalsoft.local',
        username: 'manager',
        password: hashedManagerPassword,
        role: 'manager',
        phone: '050-2345678',
      },
    });
    console.log('✅ Manager user created/updated: manager');

    // Tech user
    const hashedTechPassword = await bcrypt.hash(techPassword, 10);
    await prisma.user.upsert({
      where: { username: 'tech' },
      update: {
        password: hashedTechPassword,
        name: 'טכנאי 1',
        role: 'technician',
      },
      create: {
        name: 'טכנאי 1',
        email: 'tech@rentalsoft.local',
        username: 'tech',
        password: hashedTechPassword,
        role: 'technician',
        phone: '050-3456789',
      },
    });
    console.log('✅ Technician user created/updated: tech');

    // Tech2 user
    const hashedTech2Password = await bcrypt.hash(tech2Password, 10);
    await prisma.user.upsert({
      where: { username: 'tech2' },
      update: {
        password: hashedTech2Password,
        name: 'טכנאי 2',
        role: 'technician',
      },
      create: {
        name: 'טכנאי 2',
        email: 'tech2@rentalsoft.local',
        username: 'tech2',
        password: hashedTech2Password,
        role: 'technician',
        phone: '050-4567890',
      },
    });
    console.log('✅ Technician user created/updated: tech2');
  }

  const equipmentTypes = [
    { name: 'מכונה גדולה', description: 'מכונה גדולה לייבוש' },
    { name: 'מכונה בינונית', description: 'מכונה בינונית לייבוש' },
    { name: 'מכונה קטנה', description: 'מכונה קטנה לייבוש' },
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
    { qrTag: 'EQ001', type: 'מכונה גדולה', status: EquipmentStatus.at_customer, siteId: createdSites[0].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ002', type: 'מכונה גדולה', status: EquipmentStatus.at_customer, siteId: createdSites[0].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ003', type: 'מכונה בינונית', status: EquipmentStatus.at_customer, siteId: createdSites[1].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ004', type: 'מכונה בינונית', status: EquipmentStatus.at_customer, siteId: createdSites[1].id, condition: EquipmentCondition.wearout },
    { qrTag: 'EQ005', type: 'מכונה קטנה', status: EquipmentStatus.at_customer, siteId: createdSites[2].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ006', type: 'מכונה גדולה', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
    { qrTag: 'EQ007', type: 'מכונה בינונית', status: EquipmentStatus.in_repair, condition: EquipmentCondition.not_ok },
    { qrTag: 'EQ008', type: 'מכונה קטנה', status: EquipmentStatus.at_customer, siteId: createdSites[3].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ009', type: 'מכונה גדולה', status: EquipmentStatus.at_customer, siteId: createdSites[4].id, condition: EquipmentCondition.ok },
    { qrTag: 'EQ010', type: 'מכונה בינונית', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
    { qrTag: 'EQ011', type: 'מכונה קטנה', status: EquipmentStatus.warehouse, condition: EquipmentCondition.ok },
    { qrTag: 'EQ012', type: 'מכונה גדולה', status: EquipmentStatus.at_customer, siteId: createdSites[3].id, condition: EquipmentCondition.wearout },
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

  const techUser = await prisma.user.findFirst({ where: { username: 'tech' } });
  const tech2User = await prisma.user.findFirst({ where: { username: 'tech2' } });

  if (techUser && tech2User) {
    const workOrders = [
      {
        id: 'wo-1',
        type: WorkOrderType.installation,
        siteId: createdSites[0].id,
        technicianId: techUser.id,
        status: WorkOrderStatus.open,
        plannedDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        plannedRemovalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'wo-2',
        type: WorkOrderType.inspection,
        siteId: createdSites[1].id,
        technicianId: techUser.id,
        status: WorkOrderStatus.in_progress,
        plannedDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'wo-3',
        type: WorkOrderType.removal,
        siteId: createdSites[2].id,
        technicianId: tech2User.id,
        status: WorkOrderStatus.open,
        plannedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        plannedRemovalDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'wo-4',
        type: WorkOrderType.installation,
        siteId: createdSites[3].id,
        technicianId: tech2User.id,
        status: WorkOrderStatus.completed,
        plannedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        actualDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        done: 'התקנה בוצעה בהצלחה. המכונה פועלת.',
        plannedRemovalDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'wo-5',
        type: WorkOrderType.inspection,
        siteId: createdSites[4].id,
        technicianId: techUser.id,
        status: WorkOrderStatus.completed,
        plannedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        actualDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        done: 'המכונה תקינה. יש לבצע תחזוקה בעוד 3 חודשים.',
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

    console.log('✅ Sample work orders created');

    // Seed Settings tables
    // Work Order Types
    const workOrderTypes = [
      { name: 'התקנה', sortOrder: 1 },
      { name: 'בדיקה', sortOrder: 2 },
      { name: 'הסרה', sortOrder: 3 },
      { name: 'כללי', sortOrder: 4 },
    ];
    for (const type of workOrderTypes) {
      await prisma.settingsWorkOrderType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }
    console.log('✅ Settings work order types created');

    // Equipment Types
    const settingsEquipmentTypes = [
      { name: 'מכונה גדולה', code: 'LG', sortOrder: 1 },
      { name: 'מכונה בינונית', code: 'MD', sortOrder: 2 },
      { name: 'מכונה קטנה', code: 'SM', sortOrder: 3 },
    ];
    for (const type of settingsEquipmentTypes) {
      await prisma.settingsEquipmentType.upsert({
        where: { name: type.name },
        update: {},
        create: type,
      });
    }
    console.log('✅ Settings equipment types created');

    // Equipment Statuses
    const equipmentStatuses = [
      { name: 'במחסן', code: 'WH', sortOrder: 1 },
      { name: 'זמין', code: 'AV', sortOrder: 2 },
      { name: 'אצל לקוח', code: 'AT', sortOrder: 3 },
      { name: 'בתיקון', code: 'RP', sortOrder: 4 },
    ];
    for (const status of equipmentStatuses) {
      await prisma.settingsEquipmentStatus.upsert({
        where: { name: status.name },
        update: {},
        create: status,
      });
    }
    console.log('✅ Settings equipment statuses created');

    // Equipment Conditions
    const equipmentConditions = [
      { name: 'תקין', code: 'OK', sortOrder: 1 },
      { name: 'לא תקין', code: 'NK', sortOrder: 2 },
      { name: 'בלאי', code: 'WT', sortOrder: 3 },
    ];
    for (const condition of equipmentConditions) {
      await prisma.settingsEquipmentCondition.upsert({
        where: { name: condition.name },
        update: {},
        create: condition,
      });
    }
    console.log('✅ Settings equipment conditions created');

    // Checklist Items (Settings)
    const settingsChecklistItems = [
      { id: 'checklist-1', name: 'בדיקת מתח חשמל', sortOrder: 1 },
      { id: 'checklist-2', name: 'חיבור ניקוז', sortOrder: 2 },
      { id: 'checklist-3', name: 'בדיקת פעולה', sortOrder: 3 },
      { id: 'checklist-4', name: 'הדרכת לקוח', sortOrder: 4 },
      { id: 'checklist-5', name: 'בדיקת טמפרטורה', sortOrder: 5 },
      { id: 'checklist-6', name: 'בדיקת פילטרים', sortOrder: 6 },
      { id: 'checklist-7', name: 'ניקוי מערכת', sortOrder: 7 },
      { id: 'checklist-8', name: 'ניתוק חשמל', sortOrder: 8 },
      { id: 'checklist-9', name: 'פירוק הציוד', sortOrder: 9 },
      { id: 'checklist-10', name: 'אישור לקוח', sortOrder: 10 },
    ];
    for (const item of settingsChecklistItems) {
      await prisma.settingsChecklistItem.upsert({
        where: { id: item.id },
        update: {},
        create: item,
      });
    }
    console.log('✅ Settings checklist items created');

    const checklistItems = [
      { workOrderId: createdWorkOrders[0].id, itemName: 'בדיקת מתח חשמל', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'חיבור ניקוז', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'בדיקת פעולה', isChecked: false },
      { workOrderId: createdWorkOrders[0].id, itemName: 'הדרכת לקוח', isChecked: false },
      { workOrderId: createdWorkOrders[1].id, itemName: 'בדיקת טמפרטורה', isChecked: true, value: 'תקין' },
      { workOrderId: createdWorkOrders[1].id, itemName: 'בדיקת פילטרים', isChecked: true },
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

    // Equipment Locations - System defaults
    const equipmentLocations = [
      { name: 'לקוח', isSystem: true, isDefaultCustomer: true },
      { name: 'מחסן', isSystem: true, isDefaultCustomer: false },
    ];
    for (const loc of equipmentLocations) {
      await prisma.equipmentLocation.upsert({
        where: { name: loc.name },
        update: {},
        create: loc,
      });
    }
    console.log('✅ Equipment locations created');
  }

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
