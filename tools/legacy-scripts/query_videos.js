const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching recent ScreenVideo records...");
  const videos = await prisma.screenVideo.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        }
      }
    }
  });
  console.log("Total ScreenVideo count:", await prisma.screenVideo.count());
  console.log("Recent videos:", JSON.stringify(videos, null, 2));

  console.log("Fetching recent Post records of type regular/reel...");
  const posts = await prisma.post.findMany({
    where: {
      postType: { in: ['regular', 'reel'] }
    },
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  console.log("Recent posts:", JSON.stringify(posts, null, 2));
}

main()
  .catch(e => console.error("Database query failed:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
