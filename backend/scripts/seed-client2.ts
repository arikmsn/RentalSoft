import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedClient2() {
  console.log('Seeding client2 tenant and users...');

  // 1. Create client2 tenant
  const client2 = await prisma.tenant.upsert({
    where: { slug: 'client2' },
    update: {},
    create: {
      name: 'Client 2',
      slug: 'client2',
      isActive: true,
    },
  });
  console.log('Created tenant:', client2.id, client2.slug);

  // 2. Get default tenant
  const defaultTenant = await prisma.tenant.findUnique({ where: { slug: 'default' } });
  console.log('Default tenant:', defaultTenant?.id);

  // 3. Hash password
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // 4. Create manager2 user
  const manager2 = await prisma.user.upsert({
    where: { email: 'manager2@demo.com' },
    update: {},
    create: {
      name: 'Client2 Manager',
      email: 'manager2@demo.com',
      password: hashedPassword,
      role: 'manager',
      username: 'manager2',
      isActive: true,
    },
  });
  console.log('Created user:', manager2.id, manager2.email);

  // 5. Create tech3 user
  const tech3 = await prisma.user.upsert({
    where: { email: 'tech3@demo.com' },
    update: {},
    create: {
      name: 'Client2 Tech',
      email: 'tech3@demo.com',
      password: hashedPassword,
      role: 'technician',
      username: 'tech3',
      isActive: true,
    },
  });
  console.log('Created user:', tech3.id, tech3.email);

  // 6. Ensure default tenant has the default membership for existing users
  // First ensure default tenant exists
  if (defaultTenant) {
    const existingDefaultUsers = await prisma.user.findMany({
      where: {
        email: { in: ['manager@demo.com', 'tech1@demo.com', 'tech2@demo.com', 'admin@demo.com'] }
      }
    });

    for (const user of existingDefaultUsers) {
      await prisma.tenantMembership.upsert({
        where: { userId_tenantId: { userId: user.id, tenantId: defaultTenant.id } },
        update: {},
        create: { userId: user.id, tenantId: defaultTenant.id, role: user.role },
      });
    }
    console.log('Ensured default memberships for default tenant users');
  }

  // 7. Create memberships for client2 users
  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: manager2.id, tenantId: client2.id } },
    update: {},
    create: { userId: manager2.id, tenantId: client2.id, role: 'manager' },
  });

  await prisma.tenantMembership.upsert({
    where: { userId_tenantId: { userId: tech3.id, tenantId: client2.id } },
    update: {},
    create: { userId: tech3.id, tenantId: client2.id, role: 'member' },
  });

  console.log('Created memberships for client2 users');

  // 8. Ensure admin is super admin
  const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  if (admin) {
    await prisma.user.update({
      where: { id: admin.id },
      data: { isSuperAdmin: true },
    });
    console.log('Set admin as super admin');
  }

  console.log('\n=== Seed complete ===');
  console.log('Default tenant ID:', defaultTenant?.id);
  console.log('Client2 tenant ID:', client2.id);
  console.log('\nDemo users:');
  console.log('- manager@demo.com / demo123 (role: manager, tenant: default)');
  console.log('- tech1@demo.com / demo123 (role: technician, tenant: default)');
  console.log('- tech2@demo.com / demo123 (role: technician, tenant: default)');
  console.log('- admin@demo.com / demo123 (role: admin, super admin)');
  console.log('- manager2@demo.com / demo123 (role: manager, tenant: client2)');
  console.log('- tech3@demo.com / demo123 (role: technician, tenant: client2)');

  await prisma.$disconnect();
}

seedClient2().catch(console.error);