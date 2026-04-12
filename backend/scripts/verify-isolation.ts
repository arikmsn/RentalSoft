import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = 'f57f10df-c447-4981-8e11-216c3b0c337f';
const CLIENT3_TENANT_ID = '27b63ca4-4fd8-41ab-bea9-3565b7e1d0d5';

async function verifyIsolation() {
  console.log('\n=== Verifying Tenant Settings Isolation (Direct DB) ===\n');

  // Get work order types for each tenant
  const defaultTypes = await prisma.settingsWorkOrderType.findMany({
    where: { tenantId: DEFAULT_TENANT_ID },
  });
  const client3Types = await prisma.settingsWorkOrderType.findMany({
    where: { tenantId: CLIENT3_TENANT_ID },
  });

  console.log(`Default tenant work order types: ${defaultTypes.length}`);
  console.log('First 3:', defaultTypes.slice(0, 3).map(t => t.name).join(', '));

  console.log(`\nClient3 tenant work order types: ${client3Types.length}`);
  console.log('First 3:', client3Types.slice(0, 3).map(t => t.name).join(', '));

  // Check overlap
  const defaultIds = new Set(defaultTypes.map(t => t.id));
  const client3Ids = new Set(client3Types.map(t => t.id));
  
  let overlap = 0;
  for (const id of defaultIds) {
    if (client3Ids.has(id)) overlap++;
  }
  
  console.log('\n=== Isolation Results ===');
  console.log('Data overlap:', overlap === 0 ? '✅ PASS - No data leaking!' : `❌ FAIL - ${overlap} records shared`);
  
  const defaultNames = new Set(defaultTypes.map(t => t.name));
  const client3Names = new Set(client3Types.map(t => t.name));
  console.log('Default has כללי:', defaultNames.has('כללי') ? '✅' : '❌');
  console.log('Client3 has כללי:', client3Names.has('כללי') ? '✅' : '❌');
  
  // Verify tenantId is set correctly
  console.log('\n=== TenantId Verification ===');
  console.log('Default all have tenantId:', defaultTypes.every(t => t.tenantId === DEFAULT_TENANT_ID) ? '✅' : '❌');
  console.log('Client3 all have tenantId:', client3Types.every(t => t.tenantId === CLIENT3_TENANT_ID) ? '✅' : '❌');
  
  // Check uniqueness
  console.log('\n=== Unique Constraint Verification ===');
  const duplicateInDefault = defaultTypes.filter(t => defaultTypes.filter(x => x.name === t.name).length > 1);
  const duplicateInClient3 = client3Types.filter(t => client3Types.filter(x => x.name === t.name).length > 1);
  console.log('Duplicates in default:', duplicateInDefault.length === 0 ? '✅ None' : `❌ ${duplicateInDefault.length}`);
  console.log('Duplicates in client3:', duplicateInClient3.length === 0 ? '✅ None' : `❌ ${duplicateInClient3.length}`);

  await prisma.$disconnect();
  console.log('\n✅ Verification complete!');
}

verifyIsolation().catch(console.error);