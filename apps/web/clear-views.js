const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.view.deleteMany({});
  console.log(`Cleared ${result.count} views`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
