'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import Mux from '@mux/mux-node';

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID || '0f358a94-4bdf-403e-bb8a-02ee17b68b66';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET || 'GiZ6iyNUthNh1Kt1BEYph8zVv24R4CINmTl64k7l0lyRzdvehcZlHCcndb0Gcn8KdsVnv5n3XBc';

const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});

/**
 * Fetches all screen videos, optional search filter.
 */
export async function getScreenVideos(searchQuery?: string) {
  try {
    const whereClause: any = {};

    if (searchQuery && searchQuery.trim() !== '') {
      whereClause.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { description: { contains: searchQuery, mode: 'insensitive' } },
      ];
    }

    const videos = await prisma.screenVideo.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, videos };
  } catch (error) {
    console.error('Error fetching screen videos:', error);
    return { success: false, error: 'Failed to fetch videos' };
  }
}

/**
 * Fetches details of a single screen video and increments view count.
 */
export async function getScreenVideoDetails(id: string) {
  try {
    const video = await prisma.screenVideo.update({
      where: { id },
      data: {
        viewsCount: {
          increment: 1,
        },
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

    if (!video) {
      return { success: false, error: 'Video not found' };
    }

    // Fetch some recommended videos (excluding the current one)
    const recommended = await prisma.screenVideo.findMany({
      where: {
        id: { not: id },
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
      take: 6,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return { success: true, video, recommended };
  } catch (error) {
    console.error('Error fetching screen video details:', error);
    return { success: false, error: 'Failed to fetch video details' };
  }
}

/**
 * Request Mux Direct Upload URL
 */
export async function createMuxDirectUpload() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }

    const upload = await mux.video.uploads.create({
      new_asset_settings: { playback_policy: ['public'] },
      cors_origin: '*',
    });

    return {
      success: true,
      uploadId: upload.id,
      url: upload.url,
    };
  } catch (error) {
    console.error('Error creating Mux direct upload:', error);
    return { success: false, error: 'Failed to initiate video upload' };
  }
}

/**
 * Poll Mux for asset creation status and register video in DB
 */
export async function saveScreenVideo(title: string, description: string, uploadId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    // Retrieve upload status with retries (polling loop)
    let upload = await mux.video.uploads.retrieve(uploadId);
    let retries = 0;
    
    while (upload.status !== 'asset_created' && retries < 12) {
      // Wait 2 seconds before next retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      upload = await mux.video.uploads.retrieve(uploadId);
      retries++;
    }

    if (upload.status !== 'asset_created' || !upload.asset_id) {
      return { 
        success: false, 
        error: 'Video processing is taking longer than expected. Please wait a moment and refresh.' 
      };
    }

    const assetId = upload.asset_id;
    // Retrieve asset details
    const asset = await mux.video.assets.retrieve(assetId);
    const playbackId = asset.playback_ids?.[0]?.id;
    const duration = asset.duration || 0;

    const video = await prisma.screenVideo.create({
      data: {
        title,
        description,
        muxAssetId: assetId,
        muxPlaybackId: playbackId,
        duration,
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

    return { success: true, video };
  } catch (error) {
    console.error('Error saving screen video:', error);
    return { success: false, error: 'Failed to save video details' };
  }
}
