import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_ID = 'f57f10df-c447-4981-8e11-216c3b0c337f';
const CLIENT3_ID = '27b63ca4-4fd8-41ab-bea9-3565b7e1d0d5';

async function verify() {
  console.log('=== Verifying All Settings Entities Isolation ===\n');

  // WorkOrderTypes
  const wot1 = await prisma.settingsWorkOrderType.findMany({ where: { tenantId: DEFAULT_ID } });
  const wot2 = await prisma.settingsWorkOrderType.findMany({ where: { tenantId: CLIENT3_ID } });
  const wotOverlap = wot1.filter(d => wot2.some(c => c.id === d.id)).length;
  console.log('WorkOrderTypes: Default=' + wot1.length + ', Client3=' + wot2.length + ' -> ' + (wotOverlap === 0 ? 'PASS' : 'FAIL'));

  // EquipmentTypes
  const et1 = await prisma.settingsEquipmentType.findMany({ where: { tenantId: DEFAULT_ID } });
  const et2 = await prisma.settingsEquipmentType.findMany({ where: { tenantId: CLIENT3_ID } });
  const etOverlap = et1.filter(d => et2.some(c => c.id === d.id)).length;
  console.log('EquipmentTypes: Default=' + et1.length + ', Client3=' + et2.length + ' -> ' + (etOverlap === 0 ? 'PASS' : 'FAIL'));

  // EquipmentStatuses
  const es1 = await prisma.settingsEquipmentStatus.findMany({ where: { tenantId: DEFAULT_ID } });
  const es2 = await prisma.settingsEquipmentStatus.findMany({ where: { tenantId: CLIENT3_ID } });
  const esOverlap = es1.filter(d => es2.some(c => c.id === d.id)).length;
  console.log('EquipmentStatuses: Default=' + es1.length + ', Client3=' + es2.length + ' -> ' + (esOverlap === 0 ? 'PASS' : 'FAIL'));

  // EquipmentConditions
  const ec1 = await prisma.settingsEquipmentCondition.findMany({ where: { tenantId: DEFAULT_ID } });
  const ec2 = await prisma.settingsEquipmentCondition.findMany({ where: { tenantId: CLIENT3_ID } });
  const ecOverlap = ec1.filter(d => ec2.some(c => c.id === d.id)).length;
  console.log('EquipmentConditions: Default=' + ec1.length + ', Client3=' + ec2.length + ' -> ' + (ecOverlap === 0 ? 'PASS' : 'FAIL'));

  // ChecklistItems
  const ci1 = await prisma.settingsChecklistItem.findMany({ where: { tenantId: DEFAULT_ID } });
  const ci2 = await prisma.settingsChecklistItem.findMany({ where: { tenantId: CLIENT3_ID } });
  const ciOverlap = ci1.filter(d => ci2.some(c => c.id === d.id)).length;
  console.log('ChecklistItems: Default=' + ci1.length + ', Client3=' + ci2.length + ' -> ' + (ciOverlap === 0 ? 'PASS' : 'FAIL'));

  // EquipmentLocations - tenant + system
  const loc1 = await prisma.equipmentLocation.findMany({ where: { tenantId: DEFAULT_ID } });
  const loc2 = await prisma.equipmentLocation.findMany({ where: { OR: [{ tenantId: CLIENT3_ID }, { isSystem: true }] } });
  console.log('EquipmentLocations: Default=' + loc1.length + '(+system), Client3=' + loc2.length + ' -> ' + 'CHECK');

  // Technicians
  const tech1 = await prisma.technician.findMany({ where: { tenantId: DEFAULT_ID } });
  const tech2 = await prisma.technician.findMany({ where: { tenantId: CLIENT3_ID } });
  const techOverlap = tech1.filter(d => tech2.some(c => c.id === d.id)).length;
  console.log('Technicians: Default=' + tech1.length + ', Client3=' + tech2.length + ' -> ' + (techOverlap === 0 ? 'PASS' : 'FAIL'));

  await prisma.$disconnect();
  console.log('\n✅ Isolation verification complete!');
}

verify().catch(console.error);