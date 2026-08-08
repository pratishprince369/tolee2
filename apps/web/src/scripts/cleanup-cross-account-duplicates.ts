import { prisma } from '../lib/prisma';

async function cleanupCrossAccountDuplicates() {
  console.log("Searching for cross-account duplicate NewsPost entries in DB...");

  const allNews = await prisma.newsPost.findMany({
    select: {
      id: true,
      postId: true,
      headline: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total NewsPost records: ${allNews.length}`);

  const seenHeadlines = new Map<string, string>();
  const duplicatePostIdsToDelete: string[] = [];

  for (const item of allNews) {
    const key = item.headline.toLowerCase().trim().replace(/[^\w]/g, '').slice(0, 35);
    if (!key) continue;

    if (seenHeadlines.has(key)) {
      duplicatePostIdsToDelete.push(item.postId);
      console.log(`Found cross-account duplicate: "${item.headline.slice(0, 40)}..." (Post ID: ${item.postId})`);
    } else {
      seenHeadlines.set(key, item.postId);
    }
  }

  console.log(`Deleting ${duplicatePostIdsToDelete.length} cross-account duplicate posts...`);

  for (const postId of duplicatePostIdsToDelete) {
    try {
      await prisma.postTolee.deleteMany({ where: { postId } });
      await prisma.newsPost.deleteMany({ where: { postId } });
      await prisma.post.delete({ where: { id: postId } });
      console.log(`Successfully deleted duplicate post ID: ${postId}`);
    } catch (err: any) {
      console.error(`Failed to delete duplicate post ${postId}:`, err.message);
    }
  }

  console.log("Cross-account duplicate cleanup completed successfully!");
  await prisma.$disconnect();
}

cleanupCrossAccountDuplicates();
