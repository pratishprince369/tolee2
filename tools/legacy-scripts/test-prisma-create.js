const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    // Find a real user in the DB
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("No user found in the database!");
      return;
    }
    console.log("Found user ID:", user.id);

    console.log("Attempting to create ScreenVideo...");
    const video = await prisma.screenVideo.create({
      data: {
        title: "Test Video Creation",
        description: "Test description",
        muxAssetId: "test-asset-id-123",
        muxPlaybackId: "test-playback-id-123",
        mediaUrl: "https://stream.mux.com/test-playback-id-123/medium.mp4",
        duration: 120,
        category: "Technology",
        visibility: "public",
        userId: user.id
      }
    });
    console.log("Successfully created ScreenVideo ID:", video.id);

    console.log("Attempting to create Post connected to the video upload...");
    const post = await prisma.post.create({
      data: {
        caption: `🎥 **Test Video Creation**\n\nTest description`,
        mediaUrls: "https://stream.mux.com/test-playback-id-123/medium.mp4",
        mediaTypes: 'video',
        postType: 'regular',
        status: 'published',
        visibility: 'public',
        authorId: user.id
      }
    });
    console.log("Successfully created Post ID:", post.id);

    // Clean up
    console.log("Cleaning up test data...");
    await prisma.screenVideo.delete({ where: { id: video.id } });
    await prisma.post.delete({ where: { id: post.id } });
    console.log("Cleaned up successfully!");
  } catch (error) {
    console.error("Prisma query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

run();
