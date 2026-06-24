'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Toggle subscription to a creator
 */
export async function toggleSubscription(creatorId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    if (currentUserId === creatorId) {
      return { success: false, error: 'You cannot subscribe to yourself' };
    }

    const existing = await prisma.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: currentUserId,
          creatorId
        }
      }
    });

    if (existing) {
      await prisma.subscription.delete({
        where: { id: existing.id }
      });
      return { success: true, subscribed: false };
    } else {
      await prisma.subscription.create({
        data: {
          subscriberId: currentUserId,
          creatorId,
          bellPreference: 'ALL'
        }
      });

      // Notify the creator
      await prisma.notification.create({
        data: {
          userId: creatorId,
          type: 'new_subscriber',
          message: `🎉 You have a new subscriber!`,
          link: `/u/${currentUserId}`
        }
      });

      return { success: true, subscribed: true };
    }
  } catch (err) {
    console.error('toggleSubscription error:', err);
    return { success: false, error: 'Subscription operation failed' };
  }
}

/**
 * Update bell notification preference for a creator subscription
 */
export async function updateBellPreference(creatorId: string, preference: 'ALL' | 'PERSONALIZED' | 'NONE') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    const sub = await prisma.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: currentUserId,
          creatorId
        }
      }
    });

    if (!sub) {
      return { success: false, error: 'Not subscribed to this creator' };
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { bellPreference: preference }
    });

    return { success: true, bellPreference: preference };
  } catch (err) {
    console.error('updateBellPreference error:', err);
    return { success: false, error: 'Failed to update bell preference' };
  }
}

/**
 * Get subscription status and bell preference for a creator
 */
export async function getSubscriptionStatus(creatorId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: true, subscribed: false, bellPreference: null };
    }
    const currentUserId = (session.user as any).id;

    const sub = await prisma.subscription.findUnique({
      where: {
        subscriberId_creatorId: {
          subscriberId: currentUserId,
          creatorId
        }
      }
    });

    return {
      success: true,
      subscribed: !!sub,
      bellPreference: sub?.bellPreference || null
    };
  } catch (err) {
    console.error('getSubscriptionStatus error:', err);
    return { success: false, subscribed: false, bellPreference: null };
  }
}

/**
 * Get subscriber count for a user
 */
export async function getSubscriberCount(userId: string) {
  try {
    const count = await prisma.subscription.count({
      where: { creatorId: userId }
    });
    return { success: true, count };
  } catch (err) {
    console.error('getSubscriberCount error:', err);
    return { success: true, count: 0 };
  }
}

/**
 * Get list of subscribers for a creator (for creator tools)
 */
export async function getCreatorSubscribers(creatorId?: string) {
  try {
    let userId = creatorId;
    if (!userId) {
      const session = await getServerSession(authOptions);
      if (!session?.user) return { success: false, error: 'Unauthorized' };
      userId = (session.user as any).id;
    }

    const subs = await prisma.subscription.findMany({
      where: { creatorId: userId },
      include: {
        subscriber: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      subscribers: subs.map(s => ({
        ...s.subscriber,
        bellPreference: s.bellPreference,
        subscribedAt: s.createdAt
      }))
    };
  } catch (err) {
    console.error('getCreatorSubscribers error:', err);
    return { success: false, error: 'Failed to fetch subscribers' };
  }
}

/**
 * Send notification to all subscribers when creator uploads a new video
 */
export async function sendNewVideoNotification(creatorId: string, videoId: string, videoTitle: string) {
  try {
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { name: true, username: true }
    });

    if (!creator) return;

    // Get all subscribers with bell ON (ALL or PERSONALIZED)
    const subs = await prisma.subscription.findMany({
      where: {
        creatorId,
        bellPreference: { in: ['ALL', 'PERSONALIZED'] }
      },
      select: { subscriberId: true }
    });

    if (subs.length === 0) return;

    // Batch create notifications
    const notifications = subs.map(s => ({
      userId: s.subscriberId,
      type: 'new_video',
      message: `🎬 ${creator.name || creator.username} uploaded a new video: "${videoTitle}". Watch Now!`,
      link: `/screen/watch/${videoId}`
    }));

    await prisma.notification.createMany({
      data: notifications
    });
  } catch (err) {
    console.error('sendNewVideoNotification error:', err);
  }
}

/**
 * Report a screen video
 */
export async function reportScreenVideo(videoId: string, reason: string, description?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    // Check if already reported
    const existing = await prisma.screenVideoReport.findUnique({
      where: {
        videoId_reporterId: {
          videoId,
          reporterId: currentUserId
        }
      }
    });

    if (existing) {
      return { success: false, error: 'You have already reported this video' };
    }

    await prisma.screenVideoReport.create({
      data: {
        videoId,
        reporterId: currentUserId,
        reason,
        description
      }
    });

    // Increment reportedCount on the video
    await prisma.screenVideo.update({
      where: { id: videoId },
      data: { reportedCount: { increment: 1 } }
    });

    return { success: true };
  } catch (err) {
    console.error('reportScreenVideo error:', err);
    return { success: false, error: 'Failed to report video' };
  }
}
