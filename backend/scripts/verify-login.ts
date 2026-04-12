const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verify() {
  const client3ManagerId = '63e0b2c3-884b-4d11-826b-99171431da84';
  
  // Find client3 tenant
  const client3 = await prisma.tenant.findUnique({ where: { slug: 'client3' }});
  console.log('Client3 tenant:', client3?.id, client3?.slug);
  
  // Find membership
  const membership = await prisma.tenantMembership.findFirst({
    where: { userId: client3ManagerId, tenantId: client3?.id }
  });
  
  console.log('Membership for client3 manager:', membership);
  
  // Now check what happens during login for /client3/login
  // The login code looks up user by username + checks membership
  
  // Check if user with username 'manager' exists for client3
  const user = await prisma.user.findFirst({ where: { username: 'manager' }});
  console.log('\nUser with username manager:', user?.id, user?.name);
  
  // Find membership for this user in client3
  const mem2 = await prisma.tenantMembership.findFirst({
    where: { userId: user?.id, tenantId: client3?.id }
  });
  console.log('Membership in client3:', mem2 ? 'FOUND' : 'NOT FOUND');
  
  await prisma.$disconnect();
}

verify().catch(console.error);