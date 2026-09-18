import { prisma } from '../lib/prisma';

async function main() {
  console.log("🔍 Checking total posts created in DB today...");

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const totalToday = await prisma.post.count({
    where: {
      createdAt: { gte: startOfDay }
    }
  });

  const newsToday = await prisma.post.count({
    where: {
      postType: 'news',
      createdAt: { gte: startOfDay }
    }
  });

  const videosToday = await prisma.post.count({
    where: {
      postType: 'video',
      createdAt: { gte: startOfDay }
    }
  });

  console.log(`📊 Stats for Today (${startOfDay.toISOString().split('T')[0]}):`);
  console.log(`- Total Posts Today: ${totalToday}`);
  console.log(`- News Posts Today: ${newsToday}`);
  console.log(`- Video Posts Today: ${videosToday}`);

  const recentPosts = await prisma.post.findMany({
    take: 15,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      caption: true,
      postType: true,
      createdAt: true,
      author: {
        select: { username: true, email: true }
      }
    }
  });

  console.log("\n📌 Last 15 Posts in DB:");
  recentPosts.forEach((p, i) => {
    console.log(`${i + 1}. [${p.postType.toUpperCase()}] "${p.caption?.slice(0, 45)}" by @${p.author.username} at ${p.createdAt.toISOString()}`);
  });

  process.exit(0);
}

main().catch(console.error);
