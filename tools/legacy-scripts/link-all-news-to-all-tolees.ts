import { prisma } from '../lib/prisma';

async function linkAllNewsToAllTolees() {
  console.log("Fetching all active Tolees (Groups) in database...");
  const allTolees = await prisma.tolee.findMany({ select: { id: true, name: true, slug: true } });
  console.log(`Found ${allTolees.length} Tolees:`, allTolees.map((t: any) => `${t.name} (${t.slug})`));

  if (allTolees.length === 0) {
    console.error("No Tolees found in DB!");
    await prisma.$disconnect();
    return;
  }

  // Fetch all real posts (non-simulation news posts)
  const realNewsPosts = await prisma.post.findMany({
    where: {
      isSimulation: false,
      OR: [
        { postType: 'news' },
        { newsRelation: { isNot: null } }
      ]
    },
    select: { id: true, caption: true }
  });

  console.log(`Found ${realNewsPosts.length} real DB news/video posts to link across all Tolees.`);

  let createdLinksCount = 0;

  for (const post of realNewsPosts) {
    for (const tolee of allTolees) {
      try {
        const existingLink = await prisma.postTolee.findUnique({
          where: {
            postId_toleeId: {
              postId: post.id,
              toleeId: tolee.id
            }
          }
        });

        if (!existingLink) {
          await prisma.postTolee.create({
            data: {
              postId: post.id,
              toleeId: tolee.id
            }
          });
          createdLinksCount++;
        }
      } catch (err: any) {
        // Ignore duplicate key race conditions
      }
    }
  }

  console.log(`SUCCESS! Linked ${createdLinksCount} PostTolee relationships. Every Tolee group now has all real API news & video posts in its feed!`);
  await prisma.$disconnect();
}

linkAllNewsToAllTolees();
