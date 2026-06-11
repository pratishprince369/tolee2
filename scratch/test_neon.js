const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/web/.env' });

const prisma = new PrismaClient();

async function main() {
  console.log("Testing connection to:", process.env.DATABASE_URL);
  try {
    const users = await prisma.user.findMany();
    console.log("Success! Users found:", users.length);
  } catch (error) {
    console.error("Connection failed!");
    console.error(error.message);
    if (error.message.includes("does not exist")) {
      console.log("\nTIP: It looks like the tables are missing. Try running 'npx prisma db push' in apps/web.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
