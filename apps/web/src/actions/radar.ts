'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { calculateDistanceKm, getBoundingBox, formatDistance } from '@/lib/geo-utils';
import { sendPushNotification } from '@/lib/fcm';

function safeRevalidatePath(path: string, type?: 'layout' | 'page') {
  try {
    revalidatePath(path, type);
  } catch (err) {
    console.warn(`[SafeRevalidate] Error revalidating ${path}:`, err);
  }
}

/**
 * 1. Update user's latest GPS / network location and timestamp.
 */
export async function updateUserRadarLocation(params: {
  lat: number;
  lng: number;
  locationName?: string;
  subLocation?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const { lat, lng, locationName, subLocation } = params;
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return { success: false, error: 'Invalid coordinates' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const cleanLocation = locationName ? sanitizeText(locationName, 150) : undefined;
    const cleanSub = subLocation ? sanitizeText(subLocation, 150) : undefined;

    await prisma.user.update({
      where: { id: userId },
      data: {
        latitude: lat,
        longitude: lng,
        locationUpdatedAt: new Date(),
        ...(cleanLocation ? { location: cleanLocation } : {}),
        ...(cleanSub ? { subLocation: cleanSub } : {})
      }
    });

    return { success: true };
  } catch (error) {
    console.error('[Radar] Error updating user location:', error);
    return { success: false, error: 'Failed to update location' };
  }
}

/**
 * 2. Create a location-based Radar update & dispatch targeted notifications to eligible users inside radius.
 */
export async function createRadarPostAction(params: {
  category: 'alert' | 'food' | 'news' | 'deal' | 'event';
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationName: string;
  radiusKm?: number;
  isAnonymous?: boolean;
  expiresHours?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    const {
      category,
      title,
      description,
      latitude,
      longitude,
      locationName,
      radiusKm = 5.0,
      isAnonymous = false,
      expiresHours
    } = params;

    if (!title || !title.trim()) {
      return { success: false, error: 'Title is required' };
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'Valid GPS coordinates are required' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const cleanTitle = sanitizeText(title.trim(), 300);
    const cleanDesc = description ? sanitizeText(description.trim(), 1000) : null;
    const cleanLocName = sanitizeText(locationName?.trim() || 'Nearby', 150);

    const safeRadius = Math.max(0.5, Math.min(50, Number(radiusKm) || 5.0));

    // Calculate optional expiration time
    let expiresAt: Date | null = null;
    if (expiresHours && expiresHours > 0) {
      expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
    } else {
      // Default expiration: alerts 24h, food 48h, news 72h, deals 48h
      const defaultHours = category === 'alert' ? 24 : category === 'deal' ? 48 : 72;
      expiresAt = new Date(Date.now() + defaultHours * 60 * 60 * 1000);
    }

    // A. Create Radar Post in DB
    const post = await prisma.radarPost.create({
      data: {
        category,
        title: cleanTitle,
        description: cleanDesc,
        latitude,
        longitude,
        locationName: cleanLocName,
        radiusKm: safeRadius,
        isAnonymous,
        authorId: currentUserId,
        expiresAt
      }
    });

    // Also update creator's own current coordinates
    try {
      await prisma.user.update({
        where: { id: currentUserId },
        data: {
          latitude,
          longitude,
          locationUpdatedAt: new Date()
        }
      });
    } catch (_) {}

    // B. SERVER-SIDE GEOSPATIAL TARGETING & NOTIFICATION DISPATCH ENGINE
    // Run asynchronously to ensure sub-100ms response time for post creator
    dispatchRadarNotifications({
      postId: post.id,
      creatorId: currentUserId,
      category,
      title: cleanTitle,
      latitude,
      longitude,
      locationName: cleanLocName,
      radiusKm: safeRadius,
      isAnonymous
    }).catch((err) => {
      console.error('[Radar] Error in notification dispatch pipeline:', err);
    });

    safeRevalidatePath('/radar');
    safeRevalidatePath(`/radar/${post.id}`);

    return {
      success: true,
      post: {
        id: post.id,
        category: post.category,
        title: post.title,
        description: post.description,
        latitude: post.latitude,
        longitude: post.longitude,
        locationName: post.locationName,
        radiusKm: post.radiusKm,
        isAnonymous: post.isAnonymous,
        likesCount: 0,
        createdAt: post.createdAt
      }
    };
  } catch (error) {
    console.error('[Radar] Error creating radar post:', error);
    return { success: false, error: 'Failed to create Radar post' };
  }
}

/**
 * Background Geo-Targeted Notification Engine
 */
async function dispatchRadarNotifications(params: {
  postId: string;
  creatorId: string;
  category: string;
  title: string;
  latitude: number;
  longitude: number;
  locationName: string;
  radiusKm: number;
  isAnonymous: boolean;
}) {
  const {
    postId,
    creatorId,
    category,
    title,
    latitude,
    longitude,
    locationName,
    radiusKm,
    isAnonymous
  } = params;

  // 1. Calculate bounding box for high-speed indexed SQL filtering
  const bbox = getBoundingBox(latitude, longitude, radiusKm);

  // 2. Location Freshness Window: Users with location updated in past 14 days (or valid coordinates)
  const freshnessThreshold = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  // 3. Find candidate users inside bounding box with radar notifications enabled
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: creatorId },
      isSuspended: false,
      isBanned: false,
      latitude: { gte: bbox.minLat, lte: bbox.maxLat },
      longitude: { gte: bbox.minLng, lte: bbox.maxLng },
      radarNotifications: true,
      OR: [
        { locationUpdatedAt: { gte: freshnessThreshold } },
        { locationUpdatedAt: null } // Include users whose location was set during onboarding
      ]
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      radarRadius: true,
      radarAlerts: true,
      radarFood: true,
      radarNews: true,
      radarDeals: true,
      radarEvents: true,
      radarGuptKhabar: true,
      pushNotifications: true
    }
  });

  if (!candidates.length) {
    console.log(`[Radar] No nearby candidate users found within ${radiusKm}km bounding box for post ${postId}`);
    return;
  }

  const eligibleRecipients: { userId: string; distanceKm: number }[] = [];

  // 4. Exact Haversine distance & category preference verification
  for (const user of candidates) {
    if (user.latitude === null || user.longitude === null) continue;

    // Check category preferences
    if (category === 'alert' && !user.radarAlerts) continue;
    if (category === 'food' && !user.radarFood) continue;
    if (category === 'news' && !user.radarNews) continue;
    if (category === 'deal' && !user.radarDeals) continue;
    if (category === 'event' && !user.radarEvents) continue;
    if (isAnonymous && !user.radarGuptKhabar) continue;

    const dist = calculateDistanceKm(latitude, longitude, user.latitude, user.longitude);
    const userMaxRadius = user.radarRadius || 5.0;
    const effectiveRadius = Math.max(radiusKm, userMaxRadius);

    if (dist <= effectiveRadius) {
      eligibleRecipients.push({ userId: user.id, distanceKm: dist });
    }
  }

  if (!eligibleRecipients.length) {
    console.log(`[Radar] No eligible users within exact ${radiusKm}km radius.`);
    return;
  }

  console.log(`[Radar] Dispatching notifications to ${eligibleRecipients.length} eligible nearby users for post ${postId}`);

  const postLink = `/radar/${postId}`;

  // 5. Prevent duplicates: Find existing notifications for this post link
  const existingNotifs = await prisma.notification.findMany({
    where: {
      link: postLink,
      userId: { in: eligibleRecipients.map(r => r.userId) }
    },
    select: { userId: true }
  });
  const alreadyNotifiedUserIds = new Set(existingNotifs.map(n => n.userId));

  const newRecipients = eligibleRecipients.filter(r => !alreadyNotifiedUserIds.has(r.userId));
  if (!newRecipients.length) return;

  // 6. Build contextual category notification titles and messages
  let notificationType = 'radar_alert';
  let headerPrefix = '🚨 Tolee Radar Alert';
  if (isAnonymous) {
    notificationType = 'radar_gupt';
    headerPrefix = '🕵️ Gupt Khabar';
  } else if (category === 'food') {
    notificationType = 'radar_food';
    headerPrefix = '🍔 Secret Food Spot';
  } else if (category === 'news') {
    notificationType = 'radar_news';
    headerPrefix = '📢 Local News';
  } else if (category === 'deal') {
    notificationType = 'radar_deal';
    headerPrefix = '🎉 Flash Deal';
  }

  // 7. Save DB Notifications in bulk
  const dbNotifications = newRecipients.map(r => {
    const distText = formatDistance(r.distanceKm);
    const bodyText = `${title} (${distText} in ${locationName})`;
    return {
      userId: r.userId,
      type: notificationType,
      message: bodyText,
      link: postLink
    };
  });

  await prisma.notification.createMany({
    data: dbNotifications
  });

  // 8. Dispatch Push / FCM notifications in parallel
  const pushPromises = newRecipients.map(async (r) => {
    try {
      const distText = formatDistance(r.distanceKm);
      const pushTitle = `${headerPrefix} • ${distText}`;
      const pushBody = `${title} (near ${locationName})`;

      await sendPushNotification(
        r.userId,
        pushTitle,
        pushBody,
        {
          url: postLink,
          channelId: category === 'alert' ? 'default' : 'social',
          type: notificationType,
          postId
        }
      );
    } catch (err) {
      console.warn(`[Radar] Push failed for user ${r.userId}:`, err);
    }
  });

  await Promise.allSettled(pushPromises);
  console.log(`[Radar] Finished sending notifications for post ${postId}`);
}

/**
 * 3. Fetch nearby active Radar posts with calculated distances.
 */
export async function getRadarPostsAction(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  category?: string;
  sortBy?: 'latest' | 'distance' | 'top';
}) {
  try {
    const { lat, lng, radiusKm = 5.0, category = 'all', sortBy = 'latest' } = params;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return { success: false, error: 'Valid coordinates are required', posts: [] };
    }

    const bbox = getBoundingBox(lat, lng, radiusKm);
    const now = new Date();

    const dbPosts = await prisma.radarPost.findMany({
      where: {
        isDeleted: false,
        latitude: { gte: bbox.minLat, lte: bbox.maxLat },
        longitude: { gte: bbox.minLng, lte: bbox.maxLng },
        ...(category && category !== 'all' ? { category } : {}),
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        likes: {
          select: { userId: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    // Filter by exact Haversine distance and compute relative distance
    const computedPosts = dbPosts
      .map((post) => {
        const dist = calculateDistanceKm(lat, lng, post.latitude, post.longitude);
        const hasLiked = currentUserId ? post.likes.some(l => l.userId === currentUserId) : false;

        let authorDisplay = post.isAnonymous ? 'Anonymous Neighbor' : (post.author.username ? `@${post.author.username}` : post.author.name);

        return {
          id: post.id,
          category: post.category,
          title: post.title,
          description: post.description,
          distanceKm: dist,
          latitude: post.latitude,
          longitude: post.longitude,
          locationName: post.locationName,
          radiusKm: post.radiusKm,
          isAnonymous: post.isAnonymous,
          author: authorDisplay,
          authorAvatar: post.isAnonymous ? null : post.author.avatar,
          authorId: post.isAnonymous ? null : post.author.id,
          likesCount: post.likesCount || post.likes.length,
          hasLiked,
          createdAt: post.createdAt,
          link: `/radar/${post.id}`
        };
      })
      .filter((post) => post.distanceKm <= radiusKm);

    // Apply sorting
    if (sortBy === 'distance') {
      computedPosts.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'top') {
      computedPosts.sort((a, b) => b.likesCount - a.likesCount);
    }

    return { success: true, posts: computedPosts };
  } catch (error) {
    console.error('[Radar] Error fetching radar posts:', error);
    return { success: false, error: 'Failed to fetch radar posts', posts: [] };
  }
}

/**
 * 4. Fetch a specific Radar post by ID (for direct URL `/radar/[id]`).
 */
export async function getRadarPostByIdAction(id: string, userLat?: number, userLng?: number) {
  try {
    if (!id) return { success: false, error: 'Post ID is required' };

    const post = await prisma.radarPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        },
        likes: {
          select: { userId: true }
        }
      }
    });

    if (!post) {
      return { success: false, notFound: true, error: 'This Radar update is no longer available.' };
    }

    if (post.isDeleted) {
      return { success: false, isDeleted: true, error: 'This Radar update was removed.' };
    }

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const hasLiked = currentUserId ? post.likes.some(l => l.userId === currentUserId) : false;

    let distanceKm: number | null = null;
    if (typeof userLat === 'number' && typeof userLng === 'number') {
      distanceKm = calculateDistanceKm(userLat, userLng, post.latitude, post.longitude);
    }

    let authorDisplay = post.isAnonymous ? 'Anonymous Neighbor' : (post.author.username ? `@${post.author.username}` : post.author.name);

    return {
      success: true,
      post: {
        id: post.id,
        category: post.category,
        title: post.title,
        description: post.description,
        latitude: post.latitude,
        longitude: post.longitude,
        locationName: post.locationName,
        radiusKm: post.radiusKm,
        isAnonymous: post.isAnonymous,
        author: authorDisplay,
        authorAvatar: post.isAnonymous ? null : post.author.avatar,
        authorId: post.isAnonymous ? null : post.author.id,
        likesCount: post.likesCount || post.likes.length,
        hasLiked,
        createdAt: post.createdAt,
        expiresAt: post.expiresAt,
        distanceKm,
        link: `/radar/${post.id}`
      }
    };
  } catch (error) {
    console.error('[Radar] Error fetching post by id:', error);
    return { success: false, error: 'Failed to retrieve Radar update' };
  }
}

/**
 * 5. Toggle Like / Useful on a Radar post.
 */
export async function toggleRadarPostLikeAction(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existing = await prisma.radarPostLike.findUnique({
      where: {
        radarPostId_userId: {
          radarPostId: postId,
          userId
        }
      }
    });

    if (existing) {
      await prisma.$transaction([
        prisma.radarPostLike.delete({
          where: { id: existing.id }
        }),
        prisma.radarPost.update({
          where: { id: postId },
          data: { likesCount: { decrement: 1 } }
        })
      ]);
      return { success: true, hasLiked: false };
    } else {
      await prisma.$transaction([
        prisma.radarPostLike.create({
          data: {
            radarPostId: postId,
            userId
          }
        }),
        prisma.radarPost.update({
          where: { id: postId },
          data: { likesCount: { increment: 1 } }
        })
      ]);
      return { success: true, hasLiked: true };
    }
  } catch (error) {
    console.error('[Radar] Error toggling like:', error);
    return { success: false, error: 'Failed to update reaction' };
  }
}

/**
 * 6. Delete a Radar post (Author or Super-Admin).
 */
export async function deleteRadarPostAction(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const post = await prisma.radarPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId) {
      return { success: false, error: 'Forbidden' };
    }

    await prisma.radarPost.update({
      where: { id: postId },
      data: { isDeleted: true }
    });

    safeRevalidatePath('/radar');
    safeRevalidatePath(`/radar/${postId}`);

    return { success: true };
  } catch (error) {
    console.error('[Radar] Error deleting post:', error);
    return { success: false, error: 'Failed to delete post' };
  }
}

/**
 * 7. Update Radar notification settings for the user.
 */
export async function updateRadarNotificationPreferencesAction(data: {
  radarNotifications?: boolean;
  radarAlerts?: boolean;
  radarFood?: boolean;
  radarNews?: boolean;
  radarDeals?: boolean;
  radarEvents?: boolean;
  radarGuptKhabar?: boolean;
  radarRadius?: number;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(typeof data.radarNotifications === 'boolean' ? { radarNotifications: data.radarNotifications } : {}),
        ...(typeof data.radarAlerts === 'boolean' ? { radarAlerts: data.radarAlerts } : {}),
        ...(typeof data.radarFood === 'boolean' ? { radarFood: data.radarFood } : {}),
        ...(typeof data.radarNews === 'boolean' ? { radarNews: data.radarNews } : {}),
        ...(typeof data.radarDeals === 'boolean' ? { radarDeals: data.radarDeals } : {}),
        ...(typeof data.radarEvents === 'boolean' ? { radarEvents: data.radarEvents } : {}),
        ...(typeof data.radarGuptKhabar === 'boolean' ? { radarGuptKhabar: data.radarGuptKhabar } : {}),
        ...(typeof data.radarRadius === 'number' ? { radarRadius: data.radarRadius } : {})
      }
    });

    safeRevalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error('[Radar] Error updating radar preferences:', error);
    return { success: false, error: 'Failed to update preferences' };
  }
}
