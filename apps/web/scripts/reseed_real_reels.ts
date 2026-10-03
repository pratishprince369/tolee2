import dotenv from 'dotenv';
dotenv.config();
import { prisma } from '../src/lib/prisma';
import { publishDailyBundleReelsBatch } from '../src/lib/reelsBundleAutoPublisher';
import { publishInstagramReelsBatch } from '../src/lib/apifyInstagramAutoPublisher';

async function main() {
  console.log('=== STEP 1: REFRESHING EXISTING GOOGLE DRIVE REELS TIMESTAMPS ===');
  // Stagger timestamps across the last 3 days so they rank at the top of createdAt DESC
  const driveReels = await prisma.post.findMany({
    where: {
      postType: 'reel',
      OR: [
        { mediaUrls: { contains: 'drive.usercontent.google.com' } },
        { mediaUrls: { contains: 'drive.google.com' } }
      ]
    },
    select: { id: true }
  });
  console.log(`Found ${driveReels.length} existing Google Drive reels.`);

  const now = Date.now();
  let updatedCount = 0;
  for (let i = 0; i < driveReels.length; i++) {
    // Stagger by 20 minutes each so each reel has a unique, recent createdAt
    const staggeredTime = new Date(now - (i * 20 * 60 * 1000));
    await prisma.post.update({
      where: { id: driveReels[i].id },
      data: {
        createdAt: staggeredTime,
        status: 'published',
        visibility: 'public',
        isArchived: false
      }
    });
    updatedCount++;
  }
  console.log(`Updated ${updatedCount} Google Drive reels with fresh timestamps.`);

  console.log('\n=== STEP 2: INGESTING GOOGLE DRIVE BUNDLE REELS FOR 5 ACCOUNTS ===');
  try {
    const driveResult = await publishDailyBundleReelsBatch(25);
    console.log('Drive Batch Result:', {
      success: driveResult.success,
      count: driveResult.count,
      userStats: driveResult.userStats
    });
    if (driveResult.log && driveResult.log.length > 0) {
      console.log('Sample Drive logs:', driveResult.log.slice(0, 5));
    }
  } catch (err: any) {
    console.error('Error in Drive Batch:', err.message || err);
  }

  console.log('\n=== STEP 3: INGESTING APIFY INSTAGRAM REELS FOR 5 ACCOUNTS ===');
  try {
    const igResult = await publishInstagramReelsBatch(2);
    console.log('Instagram Batch Result:', {
      success: igResult.success,
      count: igResult.count
    });
    if (igResult.logs && igResult.logs.length > 0) {
      console.log('Sample IG logs:', igResult.logs);
    }
  } catch (err: any) {
    console.error('Error in Instagram Batch:', err.message || err);
  }

  console.log('\n=== STEP 4: VERIFYING TOP 15 REELS PRODUCED FOR FEED ===');
  const top15 = await prisma.post.findMany({
    where: {
      postType: 'reel',
      status: 'published',
      isArchived: false,
      visibility: 'public',
      mediaUrls: { not: null },
      NOT: [
        { mediaUrls: { contains: '/image/upload/' } },
        { mediaUrls: { contains: 'pexels.com' } }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 15,
    select: {
      id: true,
      caption: true,
      mediaUrls: true,
      createdAt: true,
      author: { select: { username: true } }
    }
  });

  console.log(`Top 15 real reels count: ${top15.length}`);
  top15.forEach((r, idx) => {
    const url = r.mediaUrls?.split(',')[0] || '';
    const isDrive = url.includes('drive');
    const isCloudinary = url.includes('cloudinary');
    const isPexels = url.includes('pexels');
    console.log(`${idx + 1}. [@${r.author?.username || 'anon'}] ${r.caption?.slice(0, 35)}... | Drive:${isDrive} Cloudinary:${isCloudinary} Pexels:${isPexels}`);
  });

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal in reseed_real_reels:', err);
  process.exit(1);
});
