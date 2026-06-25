'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

/**
 * Toggle subscription to a creator
 */
export async function toggleSubscription(creatorId: string, sourcePostId?: string) {
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
          bellPreference: 'ALL',
          sourcePostId: sourcePostId || null
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

/**
 * Fetch detailed video analytics for the creator dashboard
 */
export async function getCreatorVideoAnalytics() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    // 1. Fetch all screen videos owned by the creator
    const screenVideos = await prisma.screenVideo.findMany({
      where: { userId: currentUserId },
      select: { id: true, title: true, createdAt: true, viewsCount: true, duration: true }
    });

    // 2. Fetch all video posts (reels/feed videos) owned by the creator
    const posts = await prisma.post.findMany({
      where: {
        authorId: currentUserId,
        mediaTypes: { contains: 'video' }
      },
      select: { id: true, caption: true, createdAt: true }
    });

    const videoIds = screenVideos.map(v => v.id);
    const postIds = posts.map(p => p.id);
    const allContentIds = [...videoIds, ...postIds];

    if (allContentIds.length === 0) {
      return {
        success: true,
        stats: {
          totalViews: 0,
          totalWatchTime: 0,
          subscribersGained: 0,
          followersGained: 0,
          avgWatchTime: 0,
          engagementRate: 0,
          returningViewers: 0
        },
        trafficSources: {},
        retention: { reached10s: 0, reached25: 0, reached50: 0, reached75: 0, reached100: 0 },
        realtime: { last60m: 0, last48h: 0, activeViewers: 0 },
        topVideos: [],
        devices: {},
        geography: {}
      };
    }

    // 3. Fetch all verified playback sessions for these content items
    const sessions = await prisma.videoPlaybackSession.findMany({
      where: {
        contentId: { in: allContentIds },
        isVerified: true
      }
    });

    // 4. Aggregate core stats
    const totalViews = sessions.length;
    const totalWatchTime = sessions.reduce((sum, s) => sum + s.watchTime, 0) / 3600; // in hours
    const avgWatchTime = totalViews > 0 ? (sessions.reduce((sum, s) => sum + s.watchTime, 0) / totalViews) : 0; // in seconds

    // 5. Subscribers / Followers gained from these videos
    const subscribersGained = await prisma.subscription.count({
      where: { sourcePostId: { in: allContentIds } }
    });

    const followersGained = await prisma.follow.count({
      where: { sourcePostId: { in: allContentIds } }
    });

    // 6. Real-time stats (last 60 min, last 48h)
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    const last60m = sessions.filter(s => new Date(s.createdAt) >= oneHourAgo).length;
    const last48h = sessions.filter(s => new Date(s.createdAt) >= fortyEightHoursAgo).length;

    // 7. Returning Viewers (viewers who watched at least twice)
    const viewerCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const id = s.viewer_user_id || s.device_fingerprint || s.ip_address || '';
      if (id) {
        viewerCounts[id] = (viewerCounts[id] || 0) + 1;
      }
    });
    const returningViewers = Object.values(viewerCounts).filter(c => c > 1).length;

    // 8. Traffic Sources breakdown
    const trafficSources: Record<string, number> = {};
    sessions.forEach(s => {
      const src = s.trafficSource || 'feed';
      trafficSources[src] = (trafficSources[src] || 0) + 1;
    });

    // 9. Devices & Geographies breakdown
    const devices: Record<string, number> = {};
    const geography: Record<string, number> = {};
    sessions.forEach(s => {
      const d = s.deviceType || 'desktop';
      devices[d] = (devices[d] || 0) + 1;

      const geo = s.city ? `${s.city}, ${s.country}` : (s.country || 'India');
      geography[geo] = (geography[geo] || 0) + 1;
    });

    // 10. Audience Retention percentages
    const reached10s = sessions.filter(s => s.reached10s).length;
    const reached25 = sessions.filter(s => s.reached25).length;
    const reached50 = sessions.filter(s => s.reached50).length;
    const reached75 = sessions.filter(s => s.reached75).length;
    const reached100 = sessions.filter(s => s.reached100).length;

    const retention = {
      reached10s: totalViews > 0 ? (reached10s / totalViews) * 100 : 0,
      reached25: totalViews > 0 ? (reached25 / totalViews) * 100 : 0,
      reached50: totalViews > 0 ? (reached50 / totalViews) * 100 : 0,
      reached75: totalViews > 0 ? (reached75 / totalViews) * 100 : 0,
      reached100: totalViews > 0 ? (reached100 / totalViews) * 100 : 0,
    };

    // 11. Top Performing Videos
    const videoViewsMap: Record<string, { title: string; views: number; watchTime: number }> = {};
    sessions.forEach(s => {
      const id = s.contentId;
      if (!videoViewsMap[id]) {
        const matchingScreen = screenVideos.find(v => v.id === id);
        const matchingPost = posts.find(p => p.id === id);
        const title = matchingScreen ? matchingScreen.title : (matchingPost ? (matchingPost.caption?.substring(0, 30) || 'Post Video') : 'Video');
        videoViewsMap[id] = { title, views: 0, watchTime: 0 };
      }
      videoViewsMap[id].views += 1;
      videoViewsMap[id].watchTime += s.watchTime;
    });

    const topVideos = Object.entries(videoViewsMap)
      .map(([id, info]) => ({ id, ...info, watchTime: info.watchTime / 3600 }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    // 12. Engagement rate aggregation (likes + comments + saves / views)
    let totalLikes = 0;
    let totalComments = 0;
    let totalSaves = 0;

    // Fetch counts from db for accuracy
    const screenVideoStats = await prisma.screenVideo.aggregate({
      where: { userId: currentUserId },
      _sum: { likesCount: true, viewsCount: true }
    });

    const postLikes = await prisma.like.count({ where: { postId: { in: postIds } } });
    const postComments = await prisma.comment.count({ where: { postId: { in: postIds } } });
    const postSaves = await prisma.savedPost.count({ where: { postId: { in: postIds } } });

    totalLikes = (screenVideoStats._sum.likesCount || 0) + postLikes;
    totalComments = postComments; // Screen comments are separate in ScreenVideoComment
    const screenVideoCommentsCount = await prisma.screenVideoComment.count({
      where: { videoId: { in: videoIds } }
    });
    totalComments += screenVideoCommentsCount;
    totalSaves = postSaves;

    const totalEngagement = totalLikes + totalComments + totalSaves;
    const engagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

    return {
      success: true,
      stats: {
        totalViews,
        totalWatchTime,
        subscribersGained,
        followersGained,
        avgWatchTime,
        engagementRate,
        returningViewers
      },
      trafficSources,
      retention,
      realtime: {
        last60m,
        last48h,
        activeViewers: last60m
      },
      topVideos,
      devices,
      geography
    };

  } catch (err: any) {
    console.error('getCreatorVideoAnalytics error:', err);
    return { success: false, error: err.message || 'Failed to fetch analytics data' };
  }
}
