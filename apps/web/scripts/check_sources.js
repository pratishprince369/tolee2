const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const sources = await prisma.post.groupBy({
    by: ['mediaResourceTypes'],
    where: { postType: 'reel' },
    _count: true
  });
  console.log('Post counts by mediaResourceTypes:', sources);

  const driveCount = await prisma.post.count({
    where: {
      postType: 'reel',
      OR: [
        { mediaUrls: { contains: 'drive.usercontent.google.com' } },
        { mediaUrls: { contains: 'drive.google.com' } }
      ]
    }
  });
  console.log('Reels with Google Drive URLs:', driveCount);

  const pexelsCount = await prisma.post.count({
    where: { postType: 'reel', mediaUrls: { contains: 'pexels.com' } }
  });
  console.log('Reels with Pexels URLs:', pexelsCount);

  const cloudinaryCount = await prisma.post.count({
    where: { postType: 'reel', mediaUrls: { contains: 'cloudinary.com' } }
  });
  console.log('Reels with Cloudinary URLs:', cloudinaryCount);

  const latestFive = await prisma.post.findMany({
    where: { postType: 'reel' },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { id: true, createdAt: true, mediaUrls: true, caption: true, author: { select: { username: true } } }
  });
  const accounts = await prisma.user.findMany({
    where: { username: { in: ['vsdapav', 'suman_kumar', 'adsvia', 'updatesontimes', 'rinku_sharma'] } },
    select: { id: true, username: true, _count: { select: { posts: true } } }
  });
  console.log('5 automated accounts status:', accounts);

  const sampleGdrive = await prisma.post.findMany({
    where: { postType: 'reel', mediaResourceTypes: 'google_drive' },
    select: { id: true, createdAt: true, author: { select: { username: true } }, mediaUrls: true },
    take: 5
  });
  console.log('Sample GDrive reels:', sampleGdrive);

  await prisma.$disconnect();
}
check().catch(console.error);
