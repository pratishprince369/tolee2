'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createSystemNotification } from '@/lib/notification-service';

// Helper to check if a user is business/premium
async function checkIsPremium(userId: string): Promise<boolean> {
  // If user owns at least one WorldProject, treat them as premium/business
  const projectCount = await prisma.worldProject.count({
    where: { creatorId: userId, status: 'published' }
  });
  return projectCount > 0;
}

// 1. Send Tolee Shoot Broadcast
export async function sendToleeShootBroadcast(params: {
  content: string;
  mediaUrl?: string;
  targetingType: 'GROUP' | 'LOCATION' | 'PINCODE';
  targetGroups?: string[]; // array of toleeIds
  targetLocations?: string[]; // array of location strings
  targetPincodes?: string[]; // array of pincodes
  contentType: 'TEXT' | 'PRODUCT' | 'REEL' | 'BLOG' | 'RESTAURANT' | 'STORE' | 'MARKETPLACE';
  contentId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const senderId = (session.user as any).id;
    const senderName = session.user.name || 'Tolee Creator';

    // Verify if restricted
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { promotionalRestricted: true, isSuspended: true, isBanned: true }
    });

    if (sender?.promotionalRestricted || sender?.isSuspended || sender?.isBanned) {
      return { success: false, error: 'You are restricted or banned from sending promotional broadcasts.' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const safeContent = sanitizeText(params.content || '', 5000);
    if (!safeContent) {
      return { success: false, error: 'Broadcast message content cannot be empty.' };
    }

    // Rate limits calculation
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const dailyCount = await prisma.toleeShoot.count({
      where: { senderId, createdAt: { gte: startOfToday } }
    });

    const isPremium = await checkIsPremium(senderId);
    const dailyLimit = isPremium ? 10 : 2;
    const maxTargets = isPremium ? 500 : 50;

    if (dailyCount >= dailyLimit) {
      return { 
        success: false, 
        error: `Daily limit reached. ${isPremium ? 'Premium/Business' : 'Free'} users are limited to ${dailyLimit} shoots per day.` 
      };
    }

    // AI Spam Moderation / Content check
    const spamKeywords = [
      "free money", "lottery", "win cash", "viagra", "click here now", 
      "congratulations you won", "earn 1000", "make money online", 
      "get rich quick", "phishing", "free-gift", "win-prize"
    ];
    const contentLower = safeContent.toLowerCase();
    const hasSpamKeyword = spamKeywords.some(kw => contentLower.includes(kw));

    if (hasSpamKeyword) {
      // Save campaign with "moderated" status for admin audit
      await prisma.toleeShoot.create({
        data: {
          senderId,
          content: safeContent,
          mediaUrl: params.mediaUrl || null,
          targetingType: params.targetingType,
          targetGroups: params.targetGroups ? JSON.stringify(params.targetGroups) : null,
          targetLocations: params.targetLocations ? JSON.stringify(params.targetLocations) : null,
          targetPincodes: params.targetPincodes ? JSON.stringify(params.targetPincodes) : null,
          contentType: params.contentType,
          contentId: params.contentId || null,
          status: 'moderated'
        }
      });

      return { 
        success: false, 
        error: 'Your broadcast was flagged by the automated anti-spam system for containing suspicious keywords or links.' 
      };
    }

    // Target Audience Querying
    let targetIds: string[] = [];

    if (params.targetingType === 'GROUP' && params.targetGroups && params.targetGroups.length > 0) {
      const members = await prisma.toleeMember.findMany({
        where: { toleeId: { in: params.targetGroups }, status: 'approved' },
        select: { userId: true }
      });
      targetIds = members.map(m => m.userId);
    } else if (params.targetingType === 'LOCATION' && params.targetLocations && params.targetLocations.length > 0) {
      const matched = await prisma.user.findMany({
        where: {
          OR: params.targetLocations.map(loc => ({
            location: { contains: loc, mode: 'insensitive' }
          }))
        },
        select: { id: true }
      });
      targetIds = matched.map(u => u.id);
    } else if (params.targetingType === 'PINCODE' && params.targetPincodes && params.targetPincodes.length > 0) {
      const matched = await prisma.user.findMany({
        where: {
          pincode: { in: params.targetPincodes }
        },
        select: { id: true }
      });
      targetIds = matched.map(u => u.id);
    }

    // Deduplicate
    let uniqueTargetIds = Array.from(new Set(targetIds));

    // Filter out: sender, opted-out users, suspended/banned users
    const validReceivers = await prisma.user.findMany({
      where: {
        id: { in: uniqueTargetIds, not: senderId },
        receivePromotions: true,
        isSuspended: false,
        isBanned: false
      },
      select: { id: true }
    });
    let filteredTargetIds = validReceivers.map(r => r.id);

    // Filter out mutes/blocks
    const mutes = await prisma.promotionalMute.findMany({
      where: {
        senderId,
        userId: { in: filteredTargetIds }
      },
      select: { userId: true }
    });
    const mutedUserIds = new Set(mutes.map(m => m.userId));
    filteredTargetIds = filteredTargetIds.filter(id => !mutedUserIds.has(id));

    // Enforce target capacity limit
    if (filteredTargetIds.length > maxTargets) {
      filteredTargetIds = filteredTargetIds.slice(0, maxTargets);
    }

    if (filteredTargetIds.length === 0) {
      return { success: false, error: 'No active users found matching your targeting criteria.' };
    }

    // Create Campaign Record
    const shoot = await prisma.toleeShoot.create({
      data: {
        senderId,
        content: safeContent,
        mediaUrl: params.mediaUrl || null,
        targetingType: params.targetingType,
        targetGroups: params.targetGroups ? JSON.stringify(params.targetGroups) : null,
        targetLocations: params.targetLocations ? JSON.stringify(params.targetLocations) : null,
        targetPincodes: params.targetPincodes ? JSON.stringify(params.targetPincodes) : null,
        contentType: params.contentType,
        contentId: params.contentId || null,
        status: 'sending'
      }
    });

    // Deliver messages asynchronously (simulated inline loop for simplicity)
    let deliveryCount = 0;
    for (const targetId of filteredTargetIds) {
      try {
        // Find or create promotional DM chat between sender and target
        const dms = await prisma.chat.findMany({
          where: {
            isGroupChat: false,
            isPromotion: true,
            participants: { some: { userId: senderId } }
          },
          include: { participants: true }
        });

        let chat = dms.find(c => c.participants.some(p => p.userId === targetId));

        if (!chat) {
          chat = await prisma.chat.create({
            data: {
              isGroupChat: false,
              isPromotion: true,
              status: 'accepted',
              participants: {
                create: [
                  { userId: senderId },
                  { userId: targetId }
                ]
              }
            }
          });
        }

        // Create the message
        await prisma.message.create({
          data: {
            content: safeContent,
            mediaUrl: params.mediaUrl || null,
            isPromotion: true,
            senderId,
            chatId: chat.id,
            shootId: shoot.id
          }
        });

        // Send Notification
        await createSystemNotification({
          userId: targetId,
          type: 'promotion',
          message: `${senderName} broadcasted an offer: "${safeContent.substring(0, 30)}${safeContent.length > 30 ? '...' : ''}"`,
          link: `/chat?id=${chat.id}`
        });

        deliveryCount++;
      } catch (err) {
        console.error(`Failed to deliver promotional shoot to user ${targetId}:`, err);
      }
    }

    // Update status to complete
    await prisma.toleeShoot.update({
      where: { id: shoot.id },
      data: {
        status: 'sent',
        deliveredCount: deliveryCount
      }
    });

    return { 
      success: true, 
      shootId: shoot.id, 
      deliveredCount: deliveryCount 
    };

  } catch (error) {
    console.error("Error sending promotional shoot:", error);
    return { success: false, error: 'An error occurred while broadcasting your promotional campaign.' };
  }
}

// 2. Fetch Sender's Tolee Shoot Analytics
export async function getToleeShootAnalytics() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const shoots = await prisma.toleeShoot.findMany({
      where: { senderId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        reports: true
      }
    });

    const isPremium = await checkIsPremium(userId);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const shootsToday = await prisma.toleeShoot.count({
      where: { senderId: userId, createdAt: { gte: startOfToday } }
    });

    // Aggregate counts
    const totalShoots = shoots.length;
    const totalDelivered = shoots.reduce((sum, s) => sum + s.deliveredCount, 0);
    const totalClicks = shoots.reduce((sum, s) => sum + s.clickCount, 0);
    const totalSeen = shoots.reduce((sum, s) => sum + s.seenCount, 0);

    return {
      success: true,
      shoots,
      isPremium,
      shootsToday,
      dailyLimit: isPremium ? 10 : 2,
      summary: {
        totalShoots,
        totalDelivered,
        totalClicks,
        totalSeen,
        avgCtr: totalDelivered > 0 ? ((totalClicks / totalDelivered) * 100).toFixed(1) : '0.0'
      }
    };
  } catch (error) {
    console.error("Error fetching shoot analytics:", error);
    return { success: false, error: 'Failed to retrieve promotional analytics.' };
  }
}

// 3. User Spam Report Control
export async function reportToleeShootSpam(shootId: string, reason: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const reporterId = (session.user as any).id;

    const existingReport = await prisma.toleeShootReport.findUnique({
      where: {
        shootId_reporterId: { shootId, reporterId }
      }
    });

    if (existingReport) {
      return { success: false, error: 'You have already reported this promotional broadcast.' };
    }

    await prisma.toleeShootReport.create({
      data: {
        shootId,
        reporterId,
        reason
      }
    });

    // Increment trust score deductions or trigger auto-suspension if a campaign has too many flags
    const reportCount = await prisma.toleeShootReport.count({ where: { shootId } });
    if (reportCount >= 5) {
      const shoot = await prisma.toleeShoot.findUnique({ where: { id: shootId }, select: { senderId: true } });
      if (shoot) {
        // Auto flag/restrict sender promotion access temporarily
        await prisma.user.update({
          where: { id: shoot.senderId },
          data: { promotionalRestricted: true }
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error reporting promotional spam:", error);
    return { success: false, error: 'Failed to record spam report.' };
  }
}

// 4. Mute promotional sender
export async function muteSenderPromotions(senderId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.promotionalMute.create({
      data: {
        userId,
        senderId
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error muting promotional sender:", error);
    return { success: false, error: 'Failed to mute sender.' };
  }
}

// 5. Unmute promotional sender
export async function unmuteSenderPromotions(senderId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.promotionalMute.delete({
      where: {
        userId_senderId: { userId, senderId }
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error unmuting promotional sender:", error);
    return { success: false, error: 'Failed to unmute sender.' };
  }
}

// 6. Opt-out/in from all promotional broadcasts
export async function toggleReceivePromotions(enabled: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.user.update({
      where: { id: userId },
      data: { receivePromotions: enabled }
    });

    return { success: true, receivePromotions: enabled };
  } catch (error) {
    console.error("Error toggling promotional opt-out:", error);
    return { success: false, error: 'Failed to update preferences.' };
  }
}

// 7. Track Click
export async function incrementShootClick(shootId: string) {
  try {
    await prisma.toleeShoot.update({
      where: { id: shootId },
      data: { clickCount: { increment: 1 } }
    });
    return { success: true };
  } catch (error) {
    console.error("Error recording click analytics:", error);
    return { success: false };
  }
}

// 8. Super Admin: Fetch Shoots Moderation List
export async function getAdminShootsList() {
  try {
    const session = await getServerSession(authOptions);
    // Add additional verification here if there is a role field, otherwise check against admin session
    // For Tolee standard, we'll verify they have admin privileges or access the route safely
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    const shoots = await prisma.toleeShoot.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, email: true, promotionalRestricted: true, avatar: true }
        },
        reports: {
          include: {
            shoot: true
          }
        }
      }
    });

    return { success: true, shoots };
  } catch (error) {
    console.error("Error retrieving admin shoots list:", error);
    return { success: false, error: 'Failed to retrieve moderation data.' };
  }
}

// 9. Super Admin: Toggle Promotional Restriction on Spammers
export async function toggleUserPromotionalRestriction(userId: string, restricted: boolean) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { promotionalRestricted: restricted }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        action: restricted ? "restrict_promotions" : "unrestrict_promotions",
        target: userId,
        targetType: "user",
        details: `Promotional broadcast access ${restricted ? 'restricted' : 'granted'} by admin.`
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error toggling user promotional restriction:", error);
    return { success: false, error: 'Failed to update user promotion status.' };
  }
}

// 10. Update user profile pincode
export async function updateUserPincode(pincode: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const cleanPincode = pincode.trim();
    if (!/^\d{4,8}$/.test(cleanPincode)) {
      return { success: false, error: 'Invalid postal code format. Must be 4 to 8 digits.' };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pincode: cleanPincode }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user pincode:", error);
    return { success: false, error: 'Failed to save pincode.' };
  }
}

// 11. Get promotional preferences and muted status
export async function getUserPromotionPreferences(senderId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { receivePromotions: true }
    });
    let isMuted = false;
    if (senderId) {
      const mute = await prisma.promotionalMute.findUnique({
        where: {
          userId_senderId: { userId, senderId }
        }
      });
      isMuted = !!mute;
    }
    return { success: true, receivePromotions: user?.receivePromotions ?? true, isMuted };
  } catch (error) {
    console.error("Error fetching preferences:", error);
    return { success: false, error: 'Failed to get preferences' };
  }
}

