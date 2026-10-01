const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function audit() {
  const allReelPosts = await prisma.post.findMany({
    where: { postType: 'reel' },
    select: { id: true, mediaUrls: true, mediaTypes: true, status: true, createdAt: true }
  });
  console.log('Total Reels with postType=reel:', allReelPosts.length);

  const categories = {
    googleDrive: 0,
    cloudinary: 0,
    s3: 0,
    cloudflare: 0,
    bunny: 0,
    directServer: 0,
    otherCdn: 0,
    missingOrEmpty: 0,
    invalid: 0
  };

  const domainCounts = {};
  const sampleUrls = [];

  for (const r of allReelPosts) {
    const rawUrl = r.mediaUrls ? r.mediaUrls.split(/,(?=https?:\/\/)/)[0].trim() : '';
    if (!rawUrl) {
      categories.missingOrEmpty++;
      continue;
    }

    try {
      const u = new URL(rawUrl);
      const host = u.hostname.toLowerCase();
      domainCounts[host] = (domainCounts[host] || 0) + 1;

      if (host.includes('drive.google.com') || host.includes('drive.usercontent.google.com') || host.includes('googleusercontent.com')) {
        categories.googleDrive++;
      } else if (host.includes('cloudinary.com')) {
        categories.cloudinary++;
      } else if (host.includes('s3') || host.includes('amazonaws.com')) {
        categories.s3++;
      } else if (host.includes('cloudflare') || host.includes('r2.cloudflarestorage.com')) {
        categories.cloudflare++;
      } else if (host.includes('bunny') || host.includes('b-cdn.net')) {
        categories.bunny++;
      } else if (host.includes('tolee.in') || host.includes('localhost') || rawUrl.startsWith('/')) {
        categories.directServer++;
      } else {
        categories.otherCdn++;
      }

      if (sampleUrls.length < 15) {
        sampleUrls.push({ id: r.id, host, url: rawUrl.slice(0, 100) });
      }
    } catch (e) {
      categories.invalid++;
    }
  }

  console.log('--- REELS AUDIT REPORT ---');
  console.log('Total Reels:', allReelPosts.length);
  console.log('Categories:', JSON.stringify(categories, null, 2));
  console.log('Domain breakdown:', JSON.stringify(domainCounts, null, 2));
  console.log('Sample URLs:', sampleUrls);

  await prisma.$disconnect();
}

audit().catch(console.error);
