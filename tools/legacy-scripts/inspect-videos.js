const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './apps/web/.env' });

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("=== SCREEN VIDEOS ===");
    const videos = await prisma.screenVideo.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true
          }
        }
      }
    });
    console.log(`Found ${videos.length} screen videos:`);
    console.log(JSON.stringify(videos.map(v => ({
      id: v.id,
      title: v.title,
      mediaUrl: v.mediaUrl,
      muxAssetId: v.muxAssetId,
      muxPlaybackId: v.muxPlaybackId,
      muxUploadId: v.muxUploadId,
      status: v.status,
      user: v.user?.name || v.userId,
      createdAt: v.createdAt
    })), null, 2));

    console.log("\n=== POSTS / REELS ===");
    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { postType: 'reel' },
          { mediaTypes: 'video' },
          { caption: { contains: 'Mux' } },
          { ocrText: { contains: 'mux' } }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    console.log(`Found ${posts.length} matching posts:`);
    console.log(JSON.stringify(posts.map(p => ({
      id: p.id,
      caption: p.caption,
      mediaUrls: p.mediaUrls,
      mediaTypes: p.mediaTypes,
      postType: p.postType,
      ocrText: p.ocrText,
      author: p.author?.name || p.authorId,
      createdAt: p.createdAt
    })), null, 2));

  } catch (e) {
    console.error("Error running script:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
