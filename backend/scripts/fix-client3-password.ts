const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function fixPassword() {
  const client3ManagerId = '63e0b2c3-884b-4d11-826b-99171431da84';
  const hashedPassword = await bcrypt.hash('demo123', 10);
  
  await prisma.user.update({
    where: { id: client3ManagerId },
    data: { password: hashedPassword }
  });
  
  console.log('Password reset for client3 manager');
  
  // Verify
  const user = await prisma.user.findUnique({ where: { id: client3ManagerId }});
  const pwOk = await bcrypt.compare('demo123', user.password);
  console.log('Password demo123 now: ' + (pwOk ? 'WORKS' : 'FAILS'));
  
  await prisma.$disconnect();
}

fixPassword().catch(console.error);