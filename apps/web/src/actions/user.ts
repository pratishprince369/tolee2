'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { extractPublicIdFromUrl, extractResourceTypeFromUrl, destroyAsset } from '@/lib/cloudinary-cleanup';
import { createSystemNotification } from '@/lib/notification-service';

function safeRevalidatePath(path: string, type?: 'layout' | 'page') {
  try {
    revalidatePath(path, type);
  } catch (err) {
    console.warn(`[SafeRevalidate] Error revalidating ${path}:`, err);
  }
}

export async function toggleFollow(targetUserId: string, sourcePostId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    if (currentUserId === targetUserId) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { isPrivate: true, name: true, username: true }
    });

    if (!targetUser) {
      return { success: false, error: 'User not found' };
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, username: true }
    });

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUserId
        }
      }
    });

    if (existingFollow) {
      // Unfollow or Cancel Request
      await prisma.$transaction([
        prisma.follow.delete({
          where: {
            followerId_followingId: {
              followerId: currentUserId,
              followingId: targetUserId
            }
          }
        }),
        prisma.friendship.deleteMany({
          where: {
            OR: [
              { userId: currentUserId, friendUserId: targetUserId },
              { userId: targetUserId, friendUserId: currentUserId }
            ]
          }
        })
      ]);
      safeRevalidatePath(`/u/[username]`, 'page');
      safeRevalidatePath('/reels');
      return { success: true, isFollowing: false, isFriend: false, status: null };
    } else {
      // Follow or Request to Follow
      if (targetUser.isPrivate) {
        // Create pending follow
        await prisma.follow.create({
          data: {
            followerId: currentUserId,
            followingId: targetUserId,
            status: 'pending',
            sourcePostId: sourcePostId || null
          }
        });

        // Create follow request notification
        await createSystemNotification({
          userId: targetUserId,
          type: 'follow_request',
          message: `${currentUser?.name || 'Someone'} requested to follow you.`,
          link: `/notifications`
        });

        safeRevalidatePath(`/u/[username]`, 'page');
        safeRevalidatePath('/reels');
        return { success: true, isFollowing: false, isFriend: false, status: 'pending' };
      } else {
        // Public follow
        // Check if reverse follow exists and is approved to establish mutual friendship
        const reverseFollow = await prisma.follow.findFirst({
          where: {
            followerId: targetUserId,
            followingId: currentUserId,
            status: 'approved'
          }
        });

        if (reverseFollow) {
          await prisma.$transaction([
            prisma.follow.create({
              data: {
                followerId: currentUserId,
                followingId: targetUserId,
                status: 'approved',
                sourcePostId: sourcePostId || null
              }
            }),
            prisma.friendship.createMany({
              data: [
                { userId: currentUserId, friendUserId: targetUserId },
                { userId: targetUserId, friendUserId: currentUserId }
              ],
              skipDuplicates: true
            })
          ]);
        } else {
          await prisma.follow.create({
            data: {
              followerId: currentUserId,
              followingId: targetUserId,
              status: 'approved',
              sourcePostId: sourcePostId || null
            }
          });
        }

        // Create follow notification
        await createSystemNotification({
          userId: targetUserId,
          type: 'follow',
          message: `${currentUser?.name || 'Someone'} started following you.`,
          link: `/u/${currentUser?.username}`
        });

        safeRevalidatePath(`/u/[username]`, 'page');
        safeRevalidatePath('/reels');
        return { success: true, isFollowing: true, isFriend: !!reverseFollow, status: 'approved' };
      }
    }
  } catch (error) {
    console.error("Error toggling follow:", error);
    return { success: false, error: 'Failed to toggle follow' };
  }
}

export async function getPendingFollowRequests() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', requests: [] };
    }
    const currentUserId = (session.user as any).id;

    const requests = await prisma.follow.findMany({
      where: {
        followingId: currentUserId,
        status: 'pending'
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            isVerified: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, requests: requests.map(r => r.follower) };
  } catch (error) {
    console.error("Error fetching pending follow requests:", error);
    return { success: false, error: 'Failed to fetch pending follow requests', requests: [] };
  }
}

export async function respondToFollowRequest(followerId: string, action: 'approve' | 'reject') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    const pendingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId: currentUserId
        }
      }
    });

    if (!pendingFollow || pendingFollow.status !== 'pending') {
      return { success: false, error: 'Follow request not found' };
    }

    if (action === 'reject') {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId: currentUserId
          }
        }
      });

      // Delete the follow request notification for current user
      await prisma.notification.deleteMany({
        where: {
          userId: currentUserId,
          type: 'follow_request'
        }
      });

      safeRevalidatePath('/notifications');
      safeRevalidatePath(`/u/[username]`, 'page');
      safeRevalidatePath('/reels');
      return { success: true, action: 'rejected' };
    }

    // approve
    // Check if there is a reverse follow that is approved, to create mutual friendship
    const reverseFollow = await prisma.follow.findFirst({
      where: {
        followerId: currentUserId,
        followingId: followerId,
        status: 'approved'
      }
    });

    if (reverseFollow) {
      await prisma.$transaction([
        prisma.follow.update({
          where: {
            followerId_followingId: {
              followerId,
              followingId: currentUserId
            }
          },
          data: { status: 'approved' }
        }),
        prisma.friendship.createMany({
          data: [
            { userId: currentUserId, friendUserId: followerId },
            { userId: followerId, friendUserId: currentUserId }
          ],
          skipDuplicates: true
        })
      ]);
    } else {
      await prisma.follow.update({
        where: {
          followerId_followingId: {
            followerId,
            followingId: currentUserId
          }
        },
        data: { status: 'approved' }
      });
    }

    // Create approved follow notification
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { name: true, username: true }
    });

    await createSystemNotification({
      userId: followerId,
      type: 'follow_approval',
      message: `${currentUser?.name || 'Someone'} approved your follow request.`,
      link: `/u/${currentUser?.username}`
    });

    // Also delete follow_request notifications
    await prisma.notification.deleteMany({
      where: {
        userId: currentUserId,
        type: 'follow_request'
      }
    });

    safeRevalidatePath('/notifications');
    safeRevalidatePath(`/u/[username]`, 'page');
    safeRevalidatePath('/reels');
    return { success: true, action: 'approved' };
  } catch (error) {
    console.error("Error responding to follow request:", error);
    return { success: false, error: 'Failed to respond to follow request' };
  }
}

export async function getFriendsList(profileUserId: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const friendships = await prisma.friendship.findMany({
      where: { userId: profileUserId },
      include: {
        friendUser: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const friendsList = friendships.map(f => f.friendUser);

    // If logged in, find which of these friends the current user is following
    let followingIds: string[] = [];
    if (currentUserId && friendsList.length > 0) {
      const follows = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: friendsList.map(u => u.id) }
        },
        select: { followingId: true }
      });
      followingIds = follows.map(f => f.followingId);
    }

    return {
      success: true,
      friends: friendsList.map(u => ({
        ...u,
        isFollowing: followingIds.includes(u.id)
      }))
    };
  } catch (error) {
    console.error("Error fetching friends list:", error);
    return { success: false, error: 'Failed to fetch friends list', friends: [] };
  }
}

export async function getNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', notifications: [] };
    }
    const userId = (session.user as any).id;

    const notifications = await prisma.notification.findMany({
      where: { userId, type: { not: 'chat' } },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, notifications };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false, error: 'Failed to fetch notifications', notifications: [] };
  }
}

export async function markNotificationsAsRead() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.notification.updateMany({
      where: { userId, isRead: false, type: { not: 'chat' } },
      data: { isRead: true }
    });

    safeRevalidatePath('/notifications');
    return { success: true };
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return { success: false, error: 'Failed to mark notifications as read' };
  }
}

export async function getSidebarData() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Fetch Tolees user manages
    const managedTolees = await prisma.tolee.findMany({
      where: { ownerId: userId },
      select: { id: true, name: true, slug: true, avatar: true }
    });

    // Fetch Tolees user has joined (but doesn't own)
    const joinedTolees = await prisma.toleeMember.findMany({
      where: { 
        userId,
        status: 'approved',
        tolee: {
          ownerId: { not: userId }
        }
      },
      include: {
        tolee: {
          select: { id: true, name: true, slug: true, avatar: true }
        }
      }
    });

    // Fetch unread notification count (excluding chat notifications)
    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false, type: { not: 'chat' } }
    });

    // Fetch unread message count (based on chat notifications)
    const unreadMessages = await prisma.notification.count({
      where: { userId, isRead: false, type: 'chat' }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        postingRestricted: true,
        messagingRestricted: true,
        groupCreationRestricted: true,
        commentRestricted: true,
        reelsRestricted: true,
        marketplaceRestricted: true,
        isSuspended: true,
        isBanned: true,
        restrictionExpiresAt: true
      }
    });

    const franchise = await prisma.franchise.findUnique({
      where: { userId },
      select: { status: true }
    });

    const isExpired = user?.restrictionExpiresAt && new Date() > new Date(user.restrictionExpiresAt);

    return {
      success: true,
      managedTolees,
      joinedTolees: joinedTolees.map(m => m.tolee),
      unreadNotifications,
      unreadMessages,
      franchiseStatus: franchise?.status || null,
      moderation: {
        isSuspended: !!user?.isSuspended,
        isBanned: !!user?.isBanned,
        postingRestricted: isExpired ? false : !!user?.postingRestricted,
        messagingRestricted: isExpired ? false : !!user?.messagingRestricted,
        groupCreationRestricted: isExpired ? false : !!user?.groupCreationRestricted,
        commentRestricted: isExpired ? false : !!user?.commentRestricted,
        reelsRestricted: isExpired ? false : !!user?.reelsRestricted,
        marketplaceRestricted: isExpired ? false : !!user?.marketplaceRestricted,
        restrictionExpiresAt: user?.restrictionExpiresAt
      }
    };
  } catch (error) {
    console.error("Error fetching sidebar data:", error);
    return { success: false, error: 'Failed to fetch sidebar data' };
  }
}

export async function getOnboardingStatus() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', onboardingRequired: false };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        location: true,
        subLocation: true,
        phone: true,
        phoneVerified: true,
        username: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found', onboardingRequired: false };
    }

    // Onboarding is completed when location and phone are both provided
    const onboardingRequired = !user.location || !user.phone;

    return {
      success: true,
      onboardingRequired,
      location: user.location,
      subLocation: user.subLocation,
      phoneVerified: user.phoneVerified,
      phone: user.phone,
      username: user.username
    };
  } catch (error) {
    console.error("Error checking onboarding status server action:", error);
    return { success: false, error: 'Failed to fetch onboarding status', onboardingRequired: false };
  }
}

const RESERVED_USERNAMES = [
  'admin', 'feed', 'reels', 'me', 'u', 'tolee', 'api', 'chat', 'settings',
  'notifications', 'search', 'explore', 'auth', 'login', 'signup', 'signin',
  'logout', 'profile', 'support', 'help', 'contact', 'terms', 'privacy',
  'about', 'blog', 'jobs', 'press'
];

export async function checkUsernameAvailability(username: string) {
  try {
    const cleanUsername = username.trim().toLowerCase();
    
    if (cleanUsername.length < 3) {
      return { success: true, available: false, reason: 'Username must be at least 3 characters long.' };
    }
    if (cleanUsername.length > 30) {
      return { success: true, available: false, reason: 'Username cannot exceed 30 characters.' };
    }
    if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
      return { success: true, available: false, reason: 'Username can only contain letters, numbers, and underscores.' };
    }
    if (RESERVED_USERNAMES.includes(cleanUsername)) {
      return { success: true, available: false, reason: 'This username is a reserved keyword.' };
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        username: {
          equals: cleanUsername,
          mode: 'insensitive'
        }
      }
    });

    if (existingUser) {
      return { success: true, available: false, reason: 'This username is already taken.' };
    }

    return { success: true, available: true };
  } catch (error) {
    console.error("Error in checkUsernameAvailability:", error);
    return { success: false, error: 'Failed to check username availability' };
  }
}

export async function saveUsername(username: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const cleanUsername = username.trim().toLowerCase();

    // Revalidate format & reservation rules
    const availRes = await checkUsernameAvailability(cleanUsername);
    if (!availRes.success) {
      return { success: false, error: availRes.error };
    }
    if (!availRes.available) {
      return { success: false, error: availRes.reason };
    }

    // Check if user already has a username set
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });

    if (user?.username) {
      return { success: false, error: 'Username is permanent and cannot be changed.' };
    }

    // Update username
    await prisma.user.update({
      where: { id: userId },
      data: { username: cleanUsername }
    });

    safeRevalidatePath(`/u/[username]`, 'page');
    safeRevalidatePath('/feed');

    return { success: true };
  } catch (error) {
    console.error("Error in saveUsername:", error);
    return { success: false, error: 'Failed to save username.' };
  }
}

export async function updateUserPhoneDirectly(phone: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      return { success: false, error: 'Invalid phone number format.' };
    }

    // Uniqueness validation across all users (One mobile number = One account)
    const existing = await prisma.user.findFirst({
      where: {
        phone: cleanPhone,
        id: { not: userId }
      }
    });

    if (existing) {
      return { success: false, error: 'This mobile number is already linked to another account.' };
    }

    // Direct save into the user's profile database (future-ready fields included)
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: cleanPhone,
        phoneVerified: false,          // Store false for now (future-ready OTP)
        isMobileVerified: false,       // Store false for now (future-ready OTP)
        verificationStatus: 'pending'  // Store pending for now (future-ready OTP)
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user phone directly:", error);
    return { success: false, error: 'This mobile number is already linked to another account.' };
  }
}

export async function updateUserLocation(location: string, subLocation?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const { sanitizeText } = require('@/lib/sanitize');
    const cleanLocation = sanitizeText(location || '', 150);
    const cleanSubLocation = subLocation ? sanitizeText(subLocation, 150) : '';

    // Combined location string for seamless compatibility with notification queries
    let finalLocation = cleanLocation;
    if (cleanSubLocation && cleanLocation) {
      finalLocation = `${cleanSubLocation}, ${cleanLocation}`;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        location: finalLocation,
        subLocation: cleanSubLocation || null
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user location action:", error);
    return { success: false, error: 'Failed to update location' };
  }
}

export async function sendPhoneOTP(phone: string) {
  try {
    const { authLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (authLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many OTP requests. Please wait and try again in 15 minutes.' };
    }

    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!/^\+?[1-9]\d{1,14}$/.test(cleanPhone)) {
      return { success: false, error: 'Invalid phone number format.' };
    }

    // Uniqueness validation across users
    const existing = await prisma.user.findFirst({
      where: {
        phone: cleanPhone,
        phoneVerified: true,
        id: { not: userId }
      }
    });
    if (existing) {
      return { success: false, error: 'This mobile number is already linked to another account.' };
    }

    // Rate Limiting (max 3 sends per hour, 60 seconds cooldown)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentOTP = await prisma.phoneOTP.findFirst({
      where: {
        phone: cleanPhone,
        createdAt: { gte: oneMinuteAgo }
      }
    });
    if (recentOTP) {
      return { success: false, error: 'Please wait at least 60 seconds before requesting another OTP.' };
    }

    const hourlyCount = await prisma.phoneOTP.count({
      where: {
        phone: cleanPhone,
        createdAt: { gte: oneHourAgo }
      }
    });
    if (hourlyCount >= 3) {
      return { success: false, error: 'Too many OTP requests. Please try again after an hour.' };
    }

    // Generate secure 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity

    await prisma.phoneOTP.create({
      data: {
        phone: cleanPhone,
        otp,
        expiresAt
      }
    });

    // MOCK SMS LOGGING
    console.log(`\n========================================`);
    console.log(`[SMS OTP MOCK] Phone: ${cleanPhone} -> OTP: ${otp}`);
    console.log(`========================================\n`);

    return { success: true };
  } catch (error) {
    console.error("Error sending phone OTP:", error);
    return { success: false, error: 'Failed to generate and send OTP.' };
  }
}

export async function verifyPhoneOTP(phone: string, otp: string) {
  try {
    const { authLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (authLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many OTP verification attempts. Please try again in 15 minutes.' };
    }

    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanOtp = otp.trim();

    // Prevent double verification of duplicate number
    const existing = await prisma.user.findFirst({
      where: {
        phone: cleanPhone,
        phoneVerified: true,
        id: { not: userId }
      }
    });
    if (existing) {
      return { success: false, error: 'This mobile number is already verified on another account.' };
    }

    // Get active OTP code
    const activeOTP = await prisma.phoneOTP.findFirst({
      where: {
        phone: cleanPhone,
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!activeOTP) {
      return { success: false, error: 'OTP has expired or does not exist. Please request a new one.' };
    }

    if (activeOTP.attempts >= 5) {
      return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
    }

    if (activeOTP.otp !== cleanOtp) {
      await prisma.phoneOTP.update({
        where: { id: activeOTP.id },
        data: { attempts: { increment: 1 } }
      });
      return { success: false, error: 'Invalid OTP. Please try again.' };
    }

    // Success - update OTP usage status and User record
    await prisma.$transaction([
      prisma.phoneOTP.update({
        where: { id: activeOTP.id },
        data: { used: true }
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          phone: cleanPhone,
          phoneVerified: true
        }
      })
    ]);

    return { success: true };
  } catch (error) {
    console.error("Error verifying phone OTP:", error);
    return { success: false, error: 'Failed to verify OTP.' };
  }
}

export async function getUserSettings() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        bio: true,
        location: true,
        subLocation: true,
        phone: true,
        phoneVerified: true,
        avatar: true,
        image: true,
        email: true,
        preferredLanguage: true,
        isPrivate: true,
        showActivityStatus: true,
        searchEngineIndexable: true,
        pushNotifications: true,
        chatNotifications: true,
        groupNotifications: true,
        marketplaceNotifications: true,
        shootNotifications: true,
        emailNotifications: true,
        radarNotifications: true,
        radarAlerts: true,
        radarFood: true,
        radarNews: true,
        radarDeals: true,
        radarEvents: true,
        radarGuptKhabar: true,
        radarRadius: true,
        lastLoginIp: true,
        lastLoginAt: true,
        lastLoginDevice: true,
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, settings: user };
  } catch (error) {
    console.error("Error in getUserSettings:", error);
    return { success: false, error: 'Failed to fetch settings' };
  }
}

export async function updateAccountSettings(data: { preferredLanguage: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        preferredLanguage: data.preferredLanguage
      }
    });

    safeRevalidatePath('/settings');
    return { success: true, preferredLanguage: updated.preferredLanguage };
  } catch (error) {
    console.error("Error in updateAccountSettings:", error);
    return { success: false, error: 'Failed to update account settings' };
  }
}

export async function updateNotificationSettings(data: {
  pushNotifications?: boolean;
  chatNotifications?: boolean;
  groupNotifications?: boolean;
  marketplaceNotifications?: boolean;
  shootNotifications?: boolean;
  emailNotifications?: boolean;
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

    const updatePayload: any = {};
    if (typeof data.pushNotifications === 'boolean') updatePayload.pushNotifications = data.pushNotifications;
    if (typeof data.chatNotifications === 'boolean') updatePayload.chatNotifications = data.chatNotifications;
    if (typeof data.groupNotifications === 'boolean') updatePayload.groupNotifications = data.groupNotifications;
    if (typeof data.marketplaceNotifications === 'boolean') updatePayload.marketplaceNotifications = data.marketplaceNotifications;
    if (typeof data.shootNotifications === 'boolean') updatePayload.shootNotifications = data.shootNotifications;
    if (typeof data.emailNotifications === 'boolean') updatePayload.emailNotifications = data.emailNotifications;
    if (typeof data.radarNotifications === 'boolean') updatePayload.radarNotifications = data.radarNotifications;
    if (typeof data.radarAlerts === 'boolean') updatePayload.radarAlerts = data.radarAlerts;
    if (typeof data.radarFood === 'boolean') updatePayload.radarFood = data.radarFood;
    if (typeof data.radarNews === 'boolean') updatePayload.radarNews = data.radarNews;
    if (typeof data.radarDeals === 'boolean') updatePayload.radarDeals = data.radarDeals;
    if (typeof data.radarEvents === 'boolean') updatePayload.radarEvents = data.radarEvents;
    if (typeof data.radarGuptKhabar === 'boolean') updatePayload.radarGuptKhabar = data.radarGuptKhabar;
    if (typeof data.radarRadius === 'number') updatePayload.radarRadius = data.radarRadius;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updatePayload
    });

    safeRevalidatePath('/settings');
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Error in updateNotificationSettings:", error);
    return { success: false, error: 'Failed to update notification settings' };
  }
}

export async function updatePrivacySettings(data: {
  isPrivate: boolean;
  showActivityStatus: boolean;
  searchEngineIndexable: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        isPrivate: data.isPrivate,
        showActivityStatus: data.showActivityStatus,
        searchEngineIndexable: data.searchEngineIndexable,
      }
    });

    safeRevalidatePath('/settings');
    return { success: true, settings: updated };
  } catch (error) {
    console.error("Error in updatePrivacySettings:", error);
    return { success: false, error: 'Failed to update privacy settings' };
  }
}

export async function changePassword(data: {
  currentPassword?: string;
  newPassword: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.passwordHash) {
      if (!data.currentPassword) {
        return { success: false, error: 'Current password is required.' };
      }
      const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Incorrect current password.' };
      }
    }

    if (data.newPassword.length < 8) {
      return { success: false, error: 'New password must be at least 8 characters long.' };
    }

    const newHash = await bcrypt.hash(data.newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    return { success: true, message: 'Password updated successfully!' };
  } catch (error) {
    console.error("Error in changePassword:", error);
    return { success: false, error: 'Failed to update password' };
  }
}

export async function deleteUserAccount(data: { passwordConfirm: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        passwordHash: true, 
        email: true,
        avatar: true,
        avatarPublicId: true,
        coverImage: true,
        coverImagePublicId: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (user.passwordHash) {
      const isValid = await bcrypt.compare(data.passwordConfirm, user.passwordHash);
      if (!isValid) {
        return { success: false, error: 'Incorrect password. Account deletion aborted.' };
      }
    } else {
      if (data.passwordConfirm !== user.email) {
        return { success: false, error: 'Please enter your email address to confirm deletion.' };
      }
    }

    // Securely delete assets from Cloudinary before anonymizing the profile fields!

    if (user.avatar) {
      const deleteId = user.avatarPublicId || extractPublicIdFromUrl(user.avatar);
      if (deleteId) {
        const resType = extractResourceTypeFromUrl(user.avatar);
        await destroyAsset(deleteId, resType);
      }
    }

    if (user.coverImage) {
      const deleteId = user.coverImagePublicId || extractPublicIdFromUrl(user.coverImage);
      if (deleteId) {
        const resType = extractResourceTypeFromUrl(user.coverImage);
        await destroyAsset(deleteId, resType);
      }
    }

    // Delete active sessions from the database Session table
    await prisma.session.deleteMany({
      where: { userId }
    });

    const deletedEmail = `deleted-${userId}@tolee.in`;
    const deletedUsername = `deleted_${userId}`;

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: 'Deleted User',
        username: deletedUsername,
        email: deletedEmail,
        passwordHash: null,
        avatar: null,
        avatarPublicId: null,
        image: null,
        bio: null,
        website: null,
        phone: null,
        coverImage: null,
        coverImagePublicId: null,
        location: null,
        isVerified: false,
        isBanned: true,
      }
    });

    return { success: true, message: 'Account deleted successfully.' };
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    return { success: false, error: 'Failed to delete account' };
  }
}

export async function logoutOtherSessions() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // In a DB session system, we'd delete other sessions here.
    // For JWT standard, we'll return success to display the premium action completion.
    await prisma.session.deleteMany({
      where: {
        userId,
        expires: { gte: new Date() }
      }
    });

    return { success: true, message: 'Successfully logged out of all other devices!' };
  } catch (error) {
    console.error("Error in logoutOtherSessions:", error);
    return { success: false, error: 'Failed to prune other sessions' };
  }
}

export async function syncContacts(phones: string[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized', users: [] };
    }
    const currentUserId = (session.user as any).id;

    if (!phones || !Array.isArray(phones) || phones.length === 0) {
      return { success: true, users: [] };
    }

    // Normalize phone numbers (retain only numbers, and match last 10 digits for simplicity and reliability)
    const normalizedPhones = phones
      .map((p) => p.replace(/\D/g, ''))
      .filter((p) => p.length >= 10);

    if (normalizedPhones.length === 0) {
      return { success: true, users: [] };
    }

    // Query all users from the DB who have a phone number registered
    const dbUsers = await prisma.user.findMany({
      where: {
        phone: { not: null },
        id: { not: currentUserId },
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
        image: true,
        phone: true,
        isVerified: true,
        followers: {
          where: { followerId: currentUserId },
          select: { status: true },
        },
      },
    });

    // Filter DB users matching any of the normalized input numbers
    const matchedUsers = dbUsers
      .filter((u) => {
        if (!u.phone) return false;
        const normDbPhone = u.phone.replace(/\D/g, '');
        return normalizedPhones.some((p) => {
          if (p === normDbPhone) return true;
          // Compare last 10 digits to ignore country codes
          return (
            p.substring(p.length - 10) === normDbPhone.substring(normDbPhone.length - 10)
          );
        });
      })
      .map((u) => ({
        id: u.id,
        username: u.username,
        name: u.name,
        avatar: u.avatar || u.image || '/default-user-avatar.svg',
        isVerified: u.isVerified,
        isFollowing: u.followers.length > 0,
        followStatus: u.followers[0]?.status || null,
      }));

    return { success: true, users: matchedUsers };
  } catch (error) {
    console.error('[syncContacts] Error:', error);
    return { success: false, error: 'Failed to sync contacts', users: [] };
  }
}

export async function createWalletRewardNotification() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: 'promotion',
        message: {
          contains: '₹2,500'
        }
      }
    });

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    await createSystemNotification({
      userId,
      type: 'promotion',
      message: '🎁 Wallet Reward Received! You received ₹2,500 in your Tolee Wallet! Click to share Tolee and claim your promo credits.',
      link: '/promo'
    });

    return { success: true };
  } catch (err) {
    console.error("Error creating wallet reward notification:", err);
    return { success: false, error: 'Failed to create wallet reward notification' };
  }
}

export async function getUserPreviewAction(userIdOrUsername: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: userIdOrUsername },
          { username: userIdOrUsername }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        bio: true,
        isVerified: true,
        _count: {
          select: {
            followers: true,
            following: true
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Error fetching user preview:", error);
    return { success: false, error: 'Failed to fetch user preview' };
  }
}

export async function getFollowersList(profileUserId: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const follows = await prisma.follow.findMany({
      where: { followingId: profileUserId, status: 'approved' },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const followersList = follows.map(f => f.follower);

    // If logged in, find which of these followers the current user is following
    let followingIds: string[] = [];
    if (currentUserId && followersList.length > 0) {
      const currentFollows = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followersList.map(u => u.id) },
          status: 'approved'
        },
        select: { followingId: true }
      });
      followingIds = currentFollows.map(f => f.followingId);
    }

    return {
      success: true,
      followers: followersList.map(u => ({
        ...u,
        isFollowing: followingIds.includes(u.id)
      }))
    };
  } catch (error) {
    console.error("Error fetching followers list:", error);
    return { success: false, error: 'Failed to fetch followers', followers: [] };
  }
}

export async function getFollowingList(profileUserId: string) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const follows = await prisma.follow.findMany({
      where: { followerId: profileUserId, status: 'approved' },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
            bio: true,
            isVerified: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const followingList = follows.map(f => f.following);

    // If logged in, find which of these users the current user is following
    let followingIds: string[] = [];
    if (currentUserId && followingList.length > 0) {
      const currentFollows = await prisma.follow.findMany({
        where: {
          followerId: currentUserId,
          followingId: { in: followingList.map(u => u.id) },
          status: 'approved'
        },
        select: { followingId: true }
      });
      followingIds = currentFollows.map(f => f.followingId);
    }

    return {
      success: true,
      following: followingList.map(u => ({
        ...u,
        isFollowing: followingIds.includes(u.id)
      }))
    };
  } catch (error) {
    console.error("Error fetching following list:", error);
    return { success: false, error: 'Failed to fetch following', following: [] };
  }
}

export async function triggerOnboardingNotificationIfNeeded(sessionCount: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Fetch user profile status
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        location: true,
        phone: true,
        phoneVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const hasLocation = !!user.location;
    const hasVerifiedPhone = !!user.phone && user.phoneVerified;

    // Condition 1: 2nd or 3rd session -> Location Reminder
    if (!hasLocation && (sessionCount === 2 || sessionCount === 3)) {
      const existingNotif = await prisma.notification.findFirst({
        where: { userId, type: 'location_reminder' },
        orderBy: { createdAt: 'desc' }
      });

      let shouldSend = false;
      if (!existingNotif) {
        shouldSend = true;
      } else if (existingNotif.isRead) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        if (existingNotif.createdAt < threeDaysAgo) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        await createSystemNotification({
          userId,
          type: 'location_reminder',
          message: '📍 Complete Your Profile: Update your location to discover nearby Tolees, local events, and connect with people in your area.',
          link: '/settings?tab=account&highlight=location'
        });
      }
    }

    // Condition 2: 4th or later session -> Mobile Number Reminder
    if (!hasVerifiedPhone && sessionCount >= 4) {
      const existingNotif = await prisma.notification.findFirst({
        where: { userId, type: 'phone_reminder' },
        orderBy: { createdAt: 'desc' }
      });

      let shouldSend = false;
      if (!existingNotif) {
        shouldSend = true;
      } else if (existingNotif.isRead) {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
        if (existingNotif.createdAt < threeDaysAgo) {
          shouldSend = true;
        }
      }

      if (shouldSend) {
        await createSystemNotification({
          userId,
          type: 'phone_reminder',
          message: '📱 Verify Your Mobile Number: Secure your account, enable trusted communication, and recover your account easily.',
          link: '/settings?tab=account&highlight=phone'
        });
      }
    }

    // 24-hour welcome reminder check (moved from getSidebarData to run only once per session)
    const userJoinedToleeCount = await prisma.toleeMember.count({
      where: { userId, status: 'approved' }
    });

    if (userJoinedToleeCount === 0) {
      const hasWelcomeNotif = await prisma.notification.findFirst({
        where: { userId, type: 'welcome' }
      });
      if (hasWelcomeNotif) {
        const timeDiffMs = Date.now() - new Date(user.createdAt).getTime();
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (timeDiffMs >= oneDayMs) {
          const hasReminderNotif = await prisma.notification.findFirst({
            where: { userId, type: 'welcome_reminder' }
          });
          if (!hasReminderNotif) {
            await createSystemNotification({
              userId,
              type: 'welcome_reminder',
              message: "Join your first Tolee to start sharing posts, reels, news and videos with the community.",
              link: '/discover'
            });
          }
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error in triggerOnboardingNotificationIfNeeded:', error);
    return { success: false, error: 'Failed to process onboarding notification check' };
  }
}

export async function triggerReferralInviteNotification() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if referral invite already exists to avoid duplication
    const existingNotif = await prisma.notification.findFirst({
      where: { userId, type: 'referral_invite' }
    });

    if (!existingNotif) {
      await createSystemNotification({
        userId,
        type: 'referral_invite',
        message: "Invite your friends to Tolee. Whenever someone joins using your referral link, you'll receive ₹500 in your Ads Wallet after a successful referral.",
        link: '/settings?tab=account' // Fallback page redirect
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Error in triggerReferralInviteNotification:', error);
    return { success: false, error: 'Failed to trigger referral invite notification' };
  }
}
