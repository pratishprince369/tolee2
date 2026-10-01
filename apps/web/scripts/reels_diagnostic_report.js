const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateReport() {
  const reels = await prisma.post.findMany({
    where: { postType: 'reel' },
    select: {
      id: true,
      mediaUrls: true,
      mediaResourceTypes: true,
      createdAt: true,
      status: true
    }
  });

  let googleDrive = 0;
  let cloudinary = 0;
  let pexelsCdn = 0;
  let otherCdn = 0;
  let missing = 0;
  let invalid = 0;

  for (const r of reels) {
    if (!r.mediaUrls || r.mediaUrls.trim() === '') {
      missing++;
      continue;
    }
    const url = r.mediaUrls.split(/,(?=https?:\/\/)/)[0].trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      invalid++;
      continue;
    }

    if (url.includes('drive.usercontent.google.com') || url.includes('drive.google.com')) {
      googleDrive++;
    } else if (url.includes('videos.pexels.com')) {
      pexelsCdn++;
    } else if (url.includes('res.cloudinary.com')) {
      cloudinary++;
    } else {
      otherCdn++;
    }
  }

  const cdnTotal = pexelsCdn + cloudinary + otherCdn;

  console.log('==============================================');
  console.log('       TOLEE REELS PRODUCTION AUDIT REPORT    ');
  console.log('==============================================');
  console.log(`Total Reels:        ${reels.length}`);
  console.log(`Google Drive:       ${googleDrive}`);
  console.log(`CDN Total:          ${cdnTotal}`);
  console.log(`  - Pexels CDN:     ${pexelsCdn}`);
  console.log(`  - Cloudinary CDN: ${cloudinary}`);
  console.log(`  - Other CDN:      ${otherCdn}`);
  console.log(`Other:              0`);
  console.log(`Invalid:            ${invalid}`);
  console.log(`Missing:            ${missing}`);
  console.log('==============================================');
  console.log('Priority Feed Sample (First 5):');
  const feed = await prisma.post.findMany({
    where: { postType: 'reel', status: 'published' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, mediaUrls: true, mediaResourceTypes: true, createdAt: true }
  });
  feed.forEach((f, i) => {
    const isDrive = f.mediaUrls?.includes('drive');
    console.log(`  #${i + 1} [${f.mediaResourceTypes || (isDrive ? 'google_drive' : 'cdn')}] ${f.id} (Drive: ${isDrive}) - ${f.createdAt.toISOString()}`);
  });
  console.log('==============================================');
}

generateReport()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
