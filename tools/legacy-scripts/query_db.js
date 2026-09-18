const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const settings = await prisma.siteSettings.findUnique({
      where: { id: 'global' }
    });
    console.log("Database SiteSettings:", JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error("Error querying db:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
