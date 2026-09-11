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
 * Helper to check Super Admin privileges
 */
async function checkIsSuperAdmin(session: any): Promise<boolean> {
  // 1. Check Super Admin portal cookie token
  try {
    const { cookies } = require('next/headers');
    const { verifySuperAdminToken, SUPER_ADMIN_COOKIE } = require('@/lib/superAdminAuth');
    const cookieStore = cookies();
    const saToken = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;
    if (saToken && verifySuperAdminToken(saToken)) {
      return true;
    }
  } catch (_) {}

  // 2. Check NextAuth session
  if (!session?.user) return false;
  const email = (session.user as any).email;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (superAdminEmail && email && email.toLowerCase() === superAdminEmail.toLowerCase()) {
    return true;
  }
  return (session.user as any).role === 'SUPER_ADMIN';
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
 * Enforces Rule 1 (24h Default Expiry), Rule 9 (User Strikes), Rule 10 (Accuracy confirmation),
 * Rule 16 (Duplicate detection), Rule 30 & 31 (Rate limiting).
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
  isAccurateConfirmed?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to post on Tolee Radar.' };
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
      isAnonymous = false
    } = params;

    if (!title || !title.trim()) {
      return { success: false, error: 'Title is required' };
    }
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
      return { success: false, error: 'Valid GPS coordinates are required' };
    }

    // A. Rule 9: Check User Posting Restrictions / Strikes
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: {
        radarStrikes: true,
        radarRestrictedUntil: true,
        postingRestricted: true,
        isSuspended: true,
        isBanned: true
      }
    });

    if (user?.isBanned || user?.isSuspended || user?.postingRestricted) {
      return { success: false, error: 'Your account has been restricted from posting.' };
    }

    if (user?.radarRestrictedUntil && new Date(user.radarRestrictedUntil) > new Date()) {
      const untilStr = new Date(user.radarRestrictedUntil).toLocaleDateString();
      return { 
        success: false, 
        error: `Your Radar posting privileges are currently suspended until ${untilStr} due to policy violations.` 
      };
    }

    // B. Rule 30 & 31: Rate Limiting (max 5 posts per 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentPostsCount = await prisma.radarPost.count({
      where: {
        authorId: currentUserId,
        createdAt: { gte: fifteenMinutesAgo }
      }
    });

    if (recentPostsCount >= 5) {
      return { 
        success: false, 
        error: 'You are posting too frequently. Please wait a few minutes before submitting another alert.' 
      };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const cleanTitle = sanitizeText(title.trim(), 300);
    const cleanDesc = description ? sanitizeText(description.trim(), 1000) : null;
    const cleanLocName = sanitizeText(locationName?.trim() || 'Nearby', 150);
    const safeRadius = Math.max(0.5, Math.min(50, Number(radiusKm) || 5.0));

    // C. Rule 16: Duplicate Alert Check (within 1.5 km and last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const recentBbox = getBoundingBox(latitude, longitude, 1.5);
    const potentialDuplicates = await prisma.radarPost.findMany({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        category,
        createdAt: { gte: twoHoursAgo },
        latitude: { gte: recentBbox.minLat, lte: recentBbox.maxLat },
        longitude: { gte: recentBbox.minLng, lte: recentBbox.maxLng }
      },
      select: { id: true, title: true, latitude: true, longitude: true }
    });

    let duplicateIncidentCount = 0;
    const cleanTitleLower = cleanTitle.toLowerCase();
    for (const dup of potentialDuplicates) {
      const dist = calculateDistanceKm(latitude, longitude, dup.latitude, dup.longitude);
      if (dist <= 1.5) {
        const dupTitleLower = dup.title.toLowerCase();
        // Check for common keyword matches
        if (cleanTitleLower.includes(dupTitleLower) || dupTitleLower.includes(cleanTitleLower) || cleanTitleLower.slice(0, 15) === dupTitleLower.slice(0, 15)) {
          duplicateIncidentCount++;
        }
      }
    }

    // D. Rule 1 & Rule 21: Server-Side Strict Expiration Duration
    // Emergency / Road / Traffic / Water / Power / Safety Alerts = 24h STRICT
    // Secret Food & Deals = 72h; Local News = 72h
    let defaultHours = 24;
    if (category === 'food' || category === 'deal') {
      defaultHours = 72;
    } else if (category === 'news' || category === 'event') {
      defaultHours = 72;
    }
    const expiresAt = new Date(Date.now() + defaultHours * 60 * 60 * 1000);

    // E. Create Radar Post in DB with ACTIVE status
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
        status: 'ACTIVE',
        confirmationsCount: 1, // Author confirms
        resolvedVotesCount: 0,
        reportsCount: 0,
        isVerified: false,
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

    // F. Asynchronous FCM & In-App Notification Dispatch (Non-blocking)
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
      duplicateIncidentCount,
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
        confirmationsCount: 1,
        status: post.status,
        expiresAt: post.expiresAt,
        createdAt: post.createdAt
      }
    };
  } catch (error) {
    console.error('[Radar] Error creating radar post:', error);
    return { success: false, error: 'Failed to create Radar update' };
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

  // 2. Extract city/locality keywords
  const locationTokens = (locationName || '')
    .split(/[,–\-\/]/)
    .map(s => s.trim())
    .filter(s => s.length >= 3);
  const primaryCity = locationTokens[0] || 'Local';

  // 3. Find candidate users
  const candidates = await prisma.user.findMany({
    where: {
      id: { not: creatorId },
      isSuspended: false,
      isBanned: false,
      radarNotifications: true,
      OR: [
        {
          latitude: { gte: bbox.minLat, lte: bbox.maxLat },
          longitude: { gte: bbox.minLng, lte: bbox.maxLng }
        },
        {
          location: { contains: primaryCity, mode: 'insensitive' }
        },
        {
          subLocation: { contains: primaryCity, mode: 'insensitive' }
        }
      ]
    },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      location: true,
      subLocation: true,
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

  if (!candidates.length) return;

  const eligibleRecipients: { userId: string; distanceKm: number }[] = [];

  // 4. Exact Haversine distance & category preference verification
  for (const user of candidates) {
    if (category === 'alert' && !user.radarAlerts) continue;
    if (category === 'food' && !user.radarFood) continue;
    if (category === 'news' && !user.radarNews) continue;
    if (category === 'deal' && !user.radarDeals) continue;
    if (category === 'event' && !user.radarEvents) continue;
    if (isAnonymous && !user.radarGuptKhabar) continue;

    let dist: number;
    if (typeof user.latitude === 'number' && typeof user.longitude === 'number') {
      dist = calculateDistanceKm(latitude, longitude, user.latitude, user.longitude);
      const userMaxRadius = user.radarRadius || 5.0;
      const effectiveRadius = Math.max(radiusKm, userMaxRadius);

      if (dist <= effectiveRadius) {
        eligibleRecipients.push({ userId: user.id, distanceKm: dist });
      }
    } else {
      dist = 0.8;
      eligibleRecipients.push({ userId: user.id, distanceKm: dist });
    }
  }

  if (!eligibleRecipients.length) return;

  const postLink = `/radar/${postId}`;

  // 5. Prevent duplicate notifications
  const existingNotifs = await prisma.notification.findMany({
    where: {
      link: postLink,
      userId: { in: eligibleRecipients.map(r => r.userId) }
    },
    select: { userId: true }
  });
  const alreadyNotifiedUserIds = new Set(existingNotifs.map((n: any) => n.userId));
  const newRecipients = eligibleRecipients.filter(r => !alreadyNotifiedUserIds.has(r.userId));
  if (!newRecipients.length) return;

  // 6. Build contextual category notification titles and messages (Privacy protected)
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

  // 8. Dispatch Push / FCM notifications
  for (const r of newRecipients) {
    const distText = formatDistance(r.distanceKm);
    const pushTitle = `${headerPrefix} • ${distText}`;
    const pushBody = `${title} (near ${locationName})`;
    sendPushNotification(r.userId, pushTitle, pushBody, {
      type: notificationType,
      postId,
      url: postLink
    }).catch(() => {});
  }
}

/**
 * 3. Fetch nearby active radar posts within bounding box and radius.
 * Enforces Rule 22 (Auto-expiry server side) & Rule 24 (Only ACTIVE content counted).
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
        status: 'ACTIVE',
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
        },
        confirmations: {
          select: { userId: true, type: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    // Filter by exact Haversine distance and compute relative distance
    const computedPosts = dbPosts
      .map((post: any) => {
        const dist = calculateDistanceKm(lat, lng, post.latitude, post.longitude);
        const hasLiked = currentUserId ? post.likes.some((l: any) => l.userId === currentUserId) : false;
        const hasConfirmedStillHappening = currentUserId 
          ? post.confirmations.some((c: any) => c.userId === currentUserId && c.type === 'STILL_HAPPENING')
          : false;
        const hasConfirmedResolved = currentUserId 
          ? post.confirmations.some((c: any) => c.userId === currentUserId && c.type === 'RESOLVED')
          : false;

        const authorDisplay = post.isAnonymous 
          ? 'Anonymous Neighbor' 
          : (post.author.username ? `@${post.author.username}` : post.author.name);

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
          confirmationsCount: post.confirmationsCount,
          resolvedVotesCount: post.resolvedVotesCount,
          reportsCount: post.reportsCount,
          status: post.status,
          isVerified: post.isVerified,
          hasLiked,
          hasConfirmedStillHappening,
          hasConfirmedResolved,
          expiresAt: post.expiresAt,
          createdAt: post.createdAt,
          link: `/radar/${post.id}`
        };
      })
      .filter((post: any) => post.distanceKm <= radiusKm);

    // Apply sorting
    if (sortBy === 'distance') {
      computedPosts.sort((a: any, b: any) => a.distanceKm - b.distanceKm);
    } else if (sortBy === 'top') {
      computedPosts.sort((a: any, b: any) => b.likesCount - a.likesCount);
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
        },
        confirmations: {
          select: { userId: true, type: true }
        }
      }
    });

    if (!post) {
      return { success: false, notFound: true, error: 'This Radar update is no longer available.' };
    }

    if (post.isDeleted || post.status === 'REMOVED') {
      return { success: false, isDeleted: true, error: 'This Radar update was removed.' };
    }

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;
    const hasLiked = currentUserId ? post.likes.some((l: any) => l.userId === currentUserId) : false;
    const hasConfirmedStillHappening = currentUserId 
      ? post.confirmations.some((c: any) => c.userId === currentUserId && c.type === 'STILL_HAPPENING')
      : false;
    const hasConfirmedResolved = currentUserId 
      ? post.confirmations.some((c: any) => c.userId === currentUserId && c.type === 'RESOLVED')
      : false;

    let distanceKm: number | null = null;
    if (typeof userLat === 'number' && typeof userLng === 'number') {
      distanceKm = calculateDistanceKm(userLat, userLng, post.latitude, post.longitude);
    }

    const authorDisplay = post.isAnonymous 
      ? 'Anonymous Neighbor' 
      : (post.author.username ? `@${post.author.username}` : post.author.name);

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
        confirmationsCount: post.confirmationsCount,
        resolvedVotesCount: post.resolvedVotesCount,
        reportsCount: post.reportsCount,
        status: post.status,
        isVerified: post.isVerified,
        hasLiked,
        hasConfirmedStillHappening,
        hasConfirmedResolved,
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
 * 5. Toggle Like / Useful on a Radar post (Rule 19: Unique reaction per user).
 */
export async function toggleRadarPostLikeAction(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to react.' };
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
 * 6. Community Confirmation Action (Rule 3, 4, 5).
 * Nearby users confirm:
 * - 'STILL_HAPPENING': Increments confirmationsCount, provides community trust badge
 * - 'RESOLVED': Increments resolvedVotesCount. If >= 5 votes or author confirms, marks post RESOLVED.
 */
export async function confirmRadarPostAction(params: {
  postId: string;
  type: 'STILL_HAPPENING' | 'RESOLVED';
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to confirm this alert.' };
    }
    const userId = (session.user as any).id;
    const { postId, type } = params;

    const post = await prisma.radarPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, status: true, resolvedVotesCount: true, confirmationsCount: true }
    });

    if (!post || post.status !== 'ACTIVE') {
      return { success: false, error: 'This alert is no longer active.' };
    }

    // Check duplicate confirmation
    const existing = await prisma.radarPostConfirmation.findUnique({
      where: {
        radarPostId_userId_type: {
          radarPostId: postId,
          userId,
          type
        }
      }
    });

    if (existing) {
      return { success: false, error: 'You have already submitted this confirmation.' };
    }

    // Create confirmation record
    await prisma.radarPostConfirmation.create({
      data: {
        radarPostId: postId,
        userId,
        type
      }
    });

    if (type === 'STILL_HAPPENING') {
      const updated = await prisma.radarPost.update({
        where: { id: postId },
        data: { confirmationsCount: { increment: 1 } },
        select: { confirmationsCount: true }
      });

      safeRevalidatePath('/radar');
      safeRevalidatePath(`/radar/${postId}`);
      return {
        success: true,
        type,
        confirmationsCount: updated.confirmationsCount,
        message: 'Thank you! Your confirmation keeps neighbors informed.'
      };
    } else {
      // Type is RESOLVED
      const newResolvedCount = post.resolvedVotesCount + 1;
      const isAuthor = post.authorId === userId;
      // If author says resolved OR community reaches 5 resolved votes -> status becomes RESOLVED
      const shouldResolve = isAuthor || newResolvedCount >= 5;

      const updated = await prisma.radarPost.update({
        where: { id: postId },
        data: {
          resolvedVotesCount: { increment: 1 },
          ...(shouldResolve ? { status: 'RESOLVED', resolvedAt: new Date() } : {})
        },
        select: { resolvedVotesCount: true, status: true }
      });

      safeRevalidatePath('/radar');
      safeRevalidatePath(`/radar/${postId}`);

      return {
        success: true,
        type,
        resolvedVotesCount: updated.resolvedVotesCount,
        isResolvedNow: updated.status === 'RESOLVED',
        message: updated.status === 'RESOLVED' 
          ? 'Alert marked as RESOLVED by the community.' 
          : 'Thank you! Your resolution report was recorded.'
      };
    }
  } catch (error) {
    console.error('[Radar] Error confirming radar post:', error);
    return { success: false, error: 'Failed to record confirmation' };
  }
}

/**
 * 7. Report Alert Action (Rule 6, 7, 8).
 * Submits a report for false info, wrong location, outdated, spam, etc.
 * Protects against duplicate reports. Automatically sets UNDER_REVIEW if reports >= 3.
 */
export async function reportRadarPostAction(params: {
  postId: string;
  reason: string;
  details?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Please sign in to report an alert.' };
    }
    const reporterId = (session.user as any).id;
    const { postId, reason, details } = params;

    if (!reason) {
      return { success: false, error: 'Please select a reason for reporting.' };
    }

    const post = await prisma.radarPost.findUnique({
      where: { id: postId },
      select: { id: true, reportsCount: true, status: true }
    });

    if (!post) {
      return { success: false, error: 'Alert not found.' };
    }

    // Rule 7: Duplicate Report Protection
    const existing = await prisma.radarPostReport.findUnique({
      where: {
        radarPostId_reporterId: {
          radarPostId: postId,
          reporterId
        }
      }
    });

    if (existing) {
      return { success: false, error: 'You have already submitted a report for this alert.' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const cleanDetails = details ? sanitizeText(details.trim(), 500) : null;

    // Create report and increment reportsCount
    await prisma.radarPostReport.create({
      data: {
        radarPostId: postId,
        reporterId,
        reason,
        details: cleanDetails,
        status: 'PENDING'
      }
    });

    const newReportsCount = post.reportsCount + 1;
    // Rule 8: If 3 or more independent reports received, flag as UNDER_REVIEW
    const shouldReview = newReportsCount >= 3;

    await prisma.radarPost.update({
      where: { id: postId },
      data: {
        reportsCount: { increment: 1 },
        ...(shouldReview && post.status === 'ACTIVE' ? { status: 'UNDER_REVIEW' } : {})
      }
    });

    safeRevalidatePath('/radar');
    safeRevalidatePath(`/radar/${postId}`);

    return { 
      success: true, 
      message: 'Thank you. Your report has been securely submitted for moderation.' 
    };
  } catch (error) {
    console.error('[Radar] Error reporting post:', error);
    return { success: false, error: 'Failed to submit report' };
  }
}

/**
 * 8. Super Admin Radar Moderation Action (Rule 25, 26, 27).
 * Allows Super Admins to:
 * - 'APPROVE': Sets status to ACTIVE
 * - 'REMOVE' / 'HIDE': Sets isDeleted = true, status = REMOVED
 * - 'RESOLVE': Sets status = RESOLVED
 * - 'VERIFY': Sets isVerified = true
 * - 'EXTEND_24H': Adds 24h to expiresAt
 * - 'STRIKE_USER': Adds strike to author, applies temporary posting suspension
 */
export async function adminModerateRadarPostAction(params: {
  postId: string;
  action: 'APPROVE' | 'HIDE' | 'REMOVE' | 'RESOLVE' | 'VERIFY' | 'EXTEND_24H' | 'STRIKE_USER';
  reason?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = await checkIsSuperAdmin(session);
    if (!isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Admin privileges required.' };
    }
    const adminId = (session?.user as any).id;
    const { postId, action, reason } = params;

    const post = await prisma.radarPost.findUnique({
      where: { id: postId },
      include: { author: { select: { id: true, radarStrikes: true } } }
    });

    if (!post) {
      return { success: false, error: 'Post not found.' };
    }

    if (action === 'APPROVE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { status: 'ACTIVE', isDeleted: false }
      });
    } else if (action === 'REMOVE' || action === 'HIDE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { isDeleted: true, status: 'REMOVED' }
      });
    } else if (action === 'RESOLVE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
    } else if (action === 'VERIFY') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { isVerified: true, verifiedAt: new Date() }
      });
    } else if (action === 'EXTEND_24H') {
      const currentExpiry = post.expiresAt ? new Date(post.expiresAt).getTime() : Date.now();
      const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 24 * 60 * 60 * 1000);
      await prisma.radarPost.update({
        where: { id: postId },
        data: {
          expiresAt: newExpiry,
          extendedAt: new Date(),
          extensionCount: { increment: 1 }
        }
      });
    } else if (action === 'STRIKE_USER') {
      const newStrikes = (post.author.radarStrikes || 0) + 1;
      let restrictedUntil: Date | null = null;
      if (newStrikes === 2) {
        restrictedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      } else if (newStrikes >= 3) {
        restrictedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      }

      await prisma.user.update({
        where: { id: post.author.id },
        data: {
          radarStrikes: newStrikes,
          ...(restrictedUntil ? { radarRestrictedUntil: restrictedUntil } : {})
        }
      });
    }

    // Rule 27: Log to Audit Log
    await prisma.radarModerationLog.create({
      data: {
        radarPostId: postId,
        adminId,
        action,
        reason: reason || 'Admin moderation decision'
      }
    });

    safeRevalidatePath('/radar');
    safeRevalidatePath(`/radar/${postId}`);
    safeRevalidatePath('/super-admin/radar');

    return { success: true, action };
  } catch (error) {
    console.error('[Radar] Error moderating post:', error);
    return { success: false, error: 'Moderation failed.' };
  }
}

/**
 * 9. Super Admin Dashboard Metrics & Moderation Feed (Rule 26).
 */
export async function getAdminRadarModerationDataAction() {
  try {
    const session = await getServerSession(authOptions);
    const isSuperAdmin = await checkIsSuperAdmin(session);
    if (!isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeCount, reportedCount, underReviewCount, expiredTodayCount, resolvedCount, removedCount] = await Promise.all([
      prisma.radarPost.count({ where: { status: 'ACTIVE', isDeleted: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      prisma.radarPost.count({ where: { reportsCount: { gt: 0 }, isDeleted: false } }),
      prisma.radarPost.count({ where: { status: 'UNDER_REVIEW', isDeleted: false } }),
      prisma.radarPost.count({ where: { expiresAt: { gte: startOfToday, lte: now } } }),
      prisma.radarPost.count({ where: { status: 'RESOLVED' } }),
      prisma.radarPost.count({ where: { status: 'REMOVED' } })
    ]);

    // Fetch alerts flagged with reports
    const reportedAlerts = await prisma.radarPost.findMany({
      where: {
        OR: [
          { reportsCount: { gt: 0 } },
          { status: 'UNDER_REVIEW' }
        ]
      },
      include: {
        author: { select: { id: true, name: true, username: true, radarStrikes: true } },
        reports: {
          select: { id: true, reason: true, details: true, createdAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { reportsCount: 'desc' },
      take: 20
    });

    return {
      success: true,
      stats: {
        activeCount,
        reportedCount,
        underReviewCount,
        expiredTodayCount,
        resolvedCount,
        removedCount
      },
      reportedAlerts
    };
  } catch (error) {
    console.error('[Radar] Error fetching admin moderation data:', error);
    return { success: false, error: 'Failed to fetch admin data' };
  }
}

/**
 * 10. Delete a Radar post (Author or Super-Admin).
 */
export async function deleteRadarPostAction(postId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;
    const isSuperAdmin = await checkIsSuperAdmin(session);

    const post = await prisma.radarPost.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return { success: false, error: 'Post not found' };
    }

    if (post.authorId !== userId && !isSuperAdmin) {
      return { success: false, error: 'Forbidden' };
    }

    await prisma.radarPost.update({
      where: { id: postId },
      data: { isDeleted: true, status: 'REMOVED' }
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
 * 11. Update Radar notification settings for the user.
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
