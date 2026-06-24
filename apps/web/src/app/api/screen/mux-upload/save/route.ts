import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Mux from '@mux/mux-node';

export const dynamic = 'force-dynamic';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '0f358a94-4bdf-403e-bb8a-02ee17b68b66';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || 'GiZ6iyNUthNh1Kt1BEYph8zVv24R4CINmTl64k7l0lyRzdvehcZlHCcndb0Gcn8KdsVnv5n3XBc';

const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;

    const body = await request.json();
    const { title, description, assetId, uploadId, category = 'General', visibility = 'public', status = 'published', isReel = false } = body;

    if (!assetId) {
      return NextResponse.json({ success: false, error: 'Missing assetId' }, { status: 400 });
    }

    // Retrieve asset details from Mux
    const asset = await mux.video.assets.retrieve(assetId);
    const playbackId = asset.playback_ids?.[0]?.id;
    const duration = asset.duration || 0;
    const videoUrl = playbackId ? `https://stream.mux.com/${playbackId}/medium.mp4` : '';

    if (isReel) {
      const post = await prisma.post.create({
        data: {
          caption: `🎥 **${title}**\n\n${description || ''}`,
          mediaUrls: videoUrl,
          mediaTypes: 'video',
          postType: 'reel',
          status: 'published',
          visibility: 'public',
          authorId: currentUserId
        }
      });
      return NextResponse.json({ success: true, isReel: true, post });
    }

    const video = await prisma.screenVideo.create({
      data: {
        title,
        description,
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        muxUploadId: uploadId || null,
        mediaUrl: videoUrl,
        duration,
        category,
        visibility,
        status,
        userId: currentUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    if (status !== 'draft') {
      // Create Feed Post for Tolee Screen Video
      await prisma.post.create({
        data: {
          caption: `🎥 **${title}**\n\n${description || ''}`,
          mediaUrls: videoUrl,
          mediaTypes: 'video',
          postType: 'regular',
          status: 'published',
          visibility: 'public',
          authorId: currentUserId
        }
      });
    }

    return NextResponse.json({ success: true, video });
  } catch (error: any) {
    console.error('Error saving screen video in API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to save video details' 
    }, { status: 500 });
  }
}
