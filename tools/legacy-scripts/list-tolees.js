const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tolees = await prisma.tolee.findMany({
    include: {
      _count: {
        select: { members: true }
      }
    }
  });
  console.log(JSON.stringify(tolees, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
