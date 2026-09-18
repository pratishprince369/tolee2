const { PrismaClient } = require('./apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    const listings = await prisma.listing.findMany({
      include: {
        tolees: true
      }
    });
    console.log("Listings count:", listings.length);
    console.log("Listings details:", JSON.stringify(listings, null, 2));
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
