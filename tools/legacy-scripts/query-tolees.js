const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const tolees = await prisma.tolee.findMany({
      select: {
        id: true,
        name: true,
        avatar: true,
        coverImage: true
      }
    });
    console.log("Tolees in Database:", JSON.stringify(tolees, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
