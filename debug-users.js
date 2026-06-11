const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/web/.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        coverImage: true
      }
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
