const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function debug() {
  // Find all users with username 'manager' - get their IDs
  const users = await prisma.user.findMany({
    where: { 
      username: 'manager'
    }
  });
  
  console.log('=== Users with username=manager ===');
  for (const u of users) {
    console.log('\n- ' + u.name + ' (role: ' + u.role + ')');
    console.log('  id: ' + u.id);
    console.log('  isActive: ' + u.isActive);
    const pwOk = await bcrypt.compare('demo123', u.password);
    console.log('  password demo123: ' + (pwOk ? 'WORKS' : 'FAILS'));
  }

  // Find all tenant memberships
  const memberships = await prisma.tenantMembership.findMany();
  
  console.log('\n=== All TenantMemberships ===');
  for (const m of memberships) {
    console.log('userId: ' + m.userId + ', tenantId: ' + m.tenantId + ', role: ' + m.role);
  }

  // Find tenant slugs
  const tenants = await prisma.tenant.findMany();
  console.log('\n=== Tenants ===');
  for (const t of tenants) {
    console.log(t.slug + ' (id: ' + t.id + ')');
  }

  await prisma.$disconnect();
}

debug().catch(console.error);