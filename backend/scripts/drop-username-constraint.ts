import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropUsernameConstraint() {
  try {
    const result = await prisma.$queryRaw<any>`DROP INDEX IF EXISTS "User_username_key"`;
    console.log('Result:', result);
    console.log('Username unique constraint dropped');
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

dropUsernameConstraint();