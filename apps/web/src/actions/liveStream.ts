'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export interface CoHostItem {
  id: string;
  name: string;
  avatar?: string;
  role: 'host' | 'cohost' | 'speaker';
  joinedAt: string;
}

export interface LiveBroadcastItem {
  id: string;
  roomCode: string;
  title: string;
  description?: string | null;
  postId?: string | null;
  hostId: string;
  hostName: string;
  hostAvatar?: string | null;
  toleeId?: string | null;
  toleeName?: string | null;
  isLive: boolean;
  viewerCount: number;
  peakViewers: number;
  coHosts: CoHostItem[];
  inviteToken?: string | null;
  status: string;
  startedAt: string;
  endedAt?: string | null;
}

/**
 * 1. Start a Live Broadcast (Creates Live Post + LiveBroadcast record)
 */
export async function startLiveBroadcast(params: {
  title: string;
  description?: string;
  toleeId?: string;
  toleeName?: string;
}): Promise<{
  success: boolean;
  roomCode?: string;
  inviteToken?: string;
  postId?: string;
  broadcast?: LiveBroadcastItem;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to start a live stream.' };
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || 'Tolee Creator';
    const userAvatar = session.user.image || '';

    const cleanTitle = params.title.trim() || `${userName} is Live Now 🔴`;
    const roomCode = `live-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const inviteToken = `invite-${Math.random().toString(36).substring(2, 10)}`;

    // Create Live Post in Feed / Community
    let newPost: any = null;
    try {
      newPost = await prisma.post.create({
        data: {
          authorId: userId,
          caption: cleanTitle,
          postType: 'live',
          visibility: 'public',
          location: params.toleeName || 'Tolee Live Studio',
          mediaUrls: roomCode, // Stores room code for player lookup
          mediaTypes: 'live_stream',
          ...(params.toleeId ? {
            tolees: {
              create: {
                toleeId: params.toleeId
              }
            }
          } : {})
        }
      });
    } catch (postErr) {
      console.warn('[LiveStream] Post create warning:', postErr);
    }

    // Create LiveBroadcast Record
    const broadcast = await (prisma as any).liveBroadcast.create({
      data: {
        roomCode,
        title: cleanTitle,
        description: params.description || '',
        postId: newPost?.id || null,
        hostId: userId,
        hostName: userName,
        hostAvatar: userAvatar,
        toleeId: params.toleeId || null,
        toleeName: params.toleeName || null,
        isLive: true,
        viewerCount: 1,
        peakViewers: 1,
        coHosts: [
          {
            id: userId,
            name: userName,
            avatar: userAvatar,
            role: 'host',
            joinedAt: new Date().toISOString()
          }
        ],
        inviteToken,
        status: 'live',
        startedAt: new Date(),
      }
    });

    // If stream is in a Tolee community, update Tolee model live status
    if (params.toleeId) {
      try {
        await prisma.tolee.update({
          where: { id: params.toleeId },
          data: {
            isLive: true,
            liveHostId: userId,
            liveSessionType: 'public',
            liveStartedAt: new Date(),
            liveViewerCount: 1
          }
        });
      } catch (e) {}
    }

    revalidatePath('/feed');
    if (params.toleeId) revalidatePath(`/t/${params.toleeId}`);

    return {
      success: true,
      roomCode,
      inviteToken,
      postId: newPost?.id || null,
      broadcast: {
        ...broadcast,
        startedAt: broadcast.startedAt.toISOString(),
        endedAt: broadcast.endedAt?.toISOString() || null,
        coHosts: broadcast.coHosts as any
      }
    };
  } catch (err: any) {
    console.error('[LiveStream] Start error:', err);
    return { success: false, error: err.message || 'Failed to start live stream.' };
  }
}

/**
 * 2. Join Live Broadcast as a Guest / Co-Host (News Media Split-Screen)
 */
export async function joinLiveAsCoHost(params: {
  roomCode: string;
  inviteToken?: string;
}): Promise<{
  success: boolean;
  broadcast?: LiveBroadcastItem;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to join as a guest speaker.' };
    }

    const userId = (session.user as any).id;
    const userName = session.user.name || 'Guest Speaker';
    const userAvatar = session.user.image || '';

    const broadcast = await (prisma as any).liveBroadcast.findUnique({
      where: { roomCode: params.roomCode }
    });

    if (!broadcast || !broadcast.isLive) {
      return { success: false, error: 'This live broadcast has already ended or does not exist.' };
    }

    // Add user to coHosts list if not already present
    const existingCoHosts: CoHostItem[] = Array.isArray(broadcast.coHosts) ? (broadcast.coHosts as any) : [];
    const isAlreadyJoined = existingCoHosts.some(c => c.id === userId);

    let updatedCoHosts = existingCoHosts;
    if (!isAlreadyJoined) {
      updatedCoHosts = [
        ...existingCoHosts,
        {
          id: userId,
          name: userName,
          avatar: userAvatar,
          role: 'cohost',
          joinedAt: new Date().toISOString()
        }
      ];

      await (prisma as any).liveBroadcast.update({
        where: { roomCode: params.roomCode },
        data: { coHosts: updatedCoHosts }
      });
    }

    return {
      success: true,
      broadcast: {
        ...broadcast,
        coHosts: updatedCoHosts,
        startedAt: broadcast.startedAt.toISOString(),
        endedAt: broadcast.endedAt?.toISOString() || null,
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join live broadcast.' };
  }
}

/**
 * 3. Get Live Broadcast Details
 */
export async function getLiveBroadcastDetails(roomCode: string): Promise<{
  success: boolean;
  broadcast?: LiveBroadcastItem;
  error?: string;
}> {
  try {
    const broadcast = await (prisma as any).liveBroadcast.findUnique({
      where: { roomCode }
    });

    if (!broadcast) {
      return { success: false, error: 'Broadcast not found.' };
    }

    return {
      success: true,
      broadcast: {
        ...broadcast,
        startedAt: broadcast.startedAt.toISOString(),
        endedAt: broadcast.endedAt?.toISOString() || null,
        coHosts: Array.isArray(broadcast.coHosts) ? broadcast.coHosts : []
      }
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 4. Update Live Viewer Count (Real-time tracking)
 */
export async function updateLiveViewerCount(roomCode: string, delta: number): Promise<{
  success: boolean;
  viewerCount?: number;
}> {
  try {
    const broadcast = await (prisma as any).liveBroadcast.findUnique({
      where: { roomCode }
    });

    if (!broadcast || !broadcast.isLive) return { success: false };

    const newCount = Math.max(1, (broadcast.viewerCount || 1) + delta);
    const newPeak = Math.max(broadcast.peakViewers || 1, newCount);

    await (prisma as any).liveBroadcast.update({
      where: { roomCode },
      data: {
        viewerCount: newCount,
        peakViewers: newPeak
      }
    });

    return { success: true, viewerCount: newCount };
  } catch {
    return { success: false };
  }
}

/**
 * 5. End Live Broadcast
 */
export async function endLiveBroadcast(roomCode: string): Promise<{
  success: boolean;
  peakViewers?: number;
  durationMinutes?: number;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const broadcast = await (prisma as any).liveBroadcast.findUnique({
      where: { roomCode }
    });

    if (!broadcast) return { success: false, error: 'Broadcast not found.' };

    if (broadcast.hostId !== userId) {
      return { success: false, error: 'Only the host can end this live broadcast.' };
    }

    const endedAt = new Date();
    const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - new Date(broadcast.startedAt).getTime()) / 60000));

    await (prisma as any).liveBroadcast.update({
      where: { roomCode },
      data: {
        isLive: false,
        status: 'ended',
        endedAt,
      }
    });

    // If attached to a Tolee community, reset isLive
    if (broadcast.toleeId) {
      try {
        await prisma.tolee.update({
          where: { id: broadcast.toleeId },
          data: {
            isLive: false,
            liveStartedAt: null,
            liveViewerCount: 0
          }
        });
      } catch (e) {}
    }

    revalidatePath('/feed');
    if (broadcast.toleeId) revalidatePath(`/t/${broadcast.toleeId}`);

    return {
      success: true,
      peakViewers: broadcast.peakViewers || 1,
      durationMinutes
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to end stream.' };
  }
}

/**
 * 6. Get All Currently Active Live Streams
 */
export async function getActiveLiveBroadcasts(): Promise<{
  success: boolean;
  broadcasts: LiveBroadcastItem[];
}> {
  try {
    const list = await (prisma as any).liveBroadcast.findMany({
      where: { isLive: true },
      orderBy: { startedAt: 'desc' },
      take: 10
    });

    return {
      success: true,
      broadcasts: list.map((b: any) => ({
        ...b,
        startedAt: b.startedAt.toISOString(),
        endedAt: b.endedAt?.toISOString() || null,
        coHosts: Array.isArray(b.coHosts) ? b.coHosts : []
      }))
    };
  } catch {
    return { success: true, broadcasts: [] };
  }
}
