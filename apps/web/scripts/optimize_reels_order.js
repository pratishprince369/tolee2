const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('=== STEP 1: AUDITING ALL REELS ===');
  const allReels = await prisma.post.findMany({
    where: { postType: 'reel' },
    select: { id: true, mediaUrls: true, createdAt: true, author: { select: { username: true } } }
  });

  let googleDriveCount = 0;
  let pexelsCdnCount = 0;
  let cloudinaryCount = 0;
  let otherCount = 0;

  for (const r of allReels) {
    const url = r.mediaUrls || '';
    if (url.includes('drive.usercontent.google.com') || url.includes('drive.google.com')) {
      googleDriveCount++;
    } else if (url.includes('videos.pexels.com')) {
      pexelsCdnCount++;
    } else if (url.includes('res.cloudinary.com')) {
      cloudinaryCount++;
    } else {
      otherCount++;
    }
  }

  console.log(`Total Reels: ${allReels.length}`);
  console.log(`Google Drive: ${googleDriveCount}`);
  console.log(`Pexels CDN: ${pexelsCdnCount}`);
  console.log(`Cloudinary CDN: ${cloudinaryCount}`);
  console.log(`Other CDN/Sources: ${otherCount}`);

  console.log('\n=== STEP 2: OPTIMIZING REELS METADATA & ORDER ===');
  // Mark Google Drive reels as google_drive source and demote behind fast CDN reels
  const driveResult = await prisma.post.updateMany({
    where: {
      postType: 'reel',
      OR: [
        { mediaUrls: { contains: 'drive.usercontent.google.com' } },
        { mediaUrls: { contains: 'drive.google.com' } }
      ]
    },
    data: {
      isSimulation: true,
      mediaResourceTypes: 'google_drive',
      createdAt: new Date('2026-05-01T00:00:00.000Z')
    }
  });
  console.log(`Updated ${driveResult.count} Google Drive reels to legacy source metadata.`);

  // Mark CDN reels as cdn source
  const cdnResult = await prisma.post.updateMany({
    where: {
      postType: 'reel',
      NOT: [
        { mediaUrls: { contains: 'drive.usercontent.google.com' } },
        { mediaUrls: { contains: 'drive.google.com' } }
      ]
    },
    data: {
      mediaResourceTypes: 'cdn'
    }
  });
  console.log(`Updated ${cdnResult.count} CDN reels with cdn source metadata.`);

  // Verify top 10 reels by createdAt desc
  const top10 = await prisma.post.findMany({
    where: { postType: 'reel', status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, mediaUrls: true, mediaResourceTypes: true, createdAt: true }
  });
  console.log('\n=== VERIFICATION: NEW TOP 10 REELS ===');
  top10.forEach((r, idx) => {
    const isDrive = r.mediaUrls?.includes('drive');
    console.log(`${idx + 1}. ID: ${r.id} | Type: ${r.mediaResourceTypes} | IsDrive: ${isDrive} | Created: ${r.createdAt.toISOString()}`);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
