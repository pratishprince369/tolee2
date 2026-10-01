const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTop() {
  const posts = await prisma.post.findMany({
    where: {
      postType: 'reel',
      status: 'published',
      isArchived: false,
      mediaTypes: 'video',
      mediaUrls: { not: null },
      visibility: 'public',
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      mediaUrls: true,
      createdAt: true
    }
  });

  console.log('Top 30 Reels in feed:');
  let driveCount = 0;
  let cdnCount = 0;
  posts.forEach((p, i) => {
    const u = p.mediaUrls.split(/,(?=https?:\/\/)/)[0].trim();
    const isDrive = u.includes('drive.usercontent.google.com') || u.includes('drive.google.com');
    if (isDrive) driveCount++; else cdnCount++;
    console.log(`${i + 1}. [${p.id}] ${isDrive ? '🚨 GOOGLE DRIVE' : '✅ CDN'} -> ${u.slice(0, 90)}`);
  });
  console.log(`\nIn Top 30: Google Drive = ${driveCount}, CDN = ${cdnCount}`);

  await prisma.$disconnect();
}
checkTop().catch(console.error);
