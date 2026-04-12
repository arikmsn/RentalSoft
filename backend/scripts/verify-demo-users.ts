import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function verifyDemoUsers() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { username: { in: ['admin', 'manager', 'tech', 'tech2'] } },
        { email: { in: ['admin@demo.com', 'manager@demo.com', 'tech1@demo.com', 'tech2@demo.com'] } },
      ],
    },
    include: {
      tenantMemberships: {
        include: { tenant: true },
      },
    },
  });

  console.log('\n=== Demo Users in DB ===');
  for (const user of users) {
    console.log(`\n- ${user.name} (${user.role})`);
    console.log(`  username: ${user.username || '-'}`);
    console.log(`  email: ${user.email || '-'}`);
    console.log(`  tenants: ${user.tenantMemberships.map(m => m.tenant.slug).join(', ') || 'none'}`);
    
    // Verify password works
    const isValid = await bcrypt.compare('demo123', user.password);
    console.log(`  password 'demo123': ${isValid ? '✅ WORKS' : '❌ FAILS'}`);
  }

  await prisma.$disconnect();
}

verifyDemoUsers().catch(console.error);