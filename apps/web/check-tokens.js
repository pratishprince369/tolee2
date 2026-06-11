const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    const tokens = await prisma.pushToken.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });
    console.log("=== REGISTERED PUSH TOKENS ===");
    console.log(JSON.stringify(tokens, null, 2));

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true
      }
    });
    console.log("=== USERS IN DB ===");
    console.log(JSON.stringify(users, null, 2));

    const calls = await prisma.call.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        caller: { select: { name: true } },
        receiver: { select: { name: true } }
      }
    });
    console.log("\n=== RECENT CALL LOGS ===");
    console.log(JSON.stringify(calls, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
