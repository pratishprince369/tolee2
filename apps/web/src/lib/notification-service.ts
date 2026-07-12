import { prisma } from '@/lib/prisma';
import { sendPushNotification } from '@/lib/fcm';

interface CreateNotificationParams {
  userId: string;
  type: string;
  message: string;
  link?: string;
}

/**
 * Maps system notification types to precise Android channel IDs and titles.
 */
function getChannelAndTitle(type: string, groupName?: string): { channelId: string; title: string } {
  switch (type) {
    case 'chat':
      return groupName 
        ? { channelId: 'groups', title: `💬 ${groupName}` }
        : { channelId: 'messages', title: '📩 New Message' };
    case 'like':
      return { channelId: 'social', title: '❤️ Post Liked' };
    case 'comment':
      return { channelId: 'social', title: '💬 New Comment' };
    case 'repost':
      return { channelId: 'social', title: '🔁 Post Reposted' };
    case 'follow':
      return { channelId: 'social', title: '👤 New Follower' };
    case 'follow_request':
      return { channelId: 'social', title: '👤 Follow Request' };
    case 'follow_approval':
      return { channelId: 'social', title: '👤 Follow Request Approved' };
    case 'promotion':
      return { channelId: 'promotions', title: '🎉 Special Offer' };
    case 'marketplace':
      return { channelId: 'marketplace', title: '🛍️ Marketplace Listing' };
    case 'requirement':
      return { channelId: 'social', title: '📌 Local Requirement' };
    case 'live':
      return { channelId: 'groups', title: '🔴 Live Now' };
    case 'location_reminder':
      return { channelId: 'social', title: '📍 Complete Your Profile' };
    case 'phone_reminder':
      return { channelId: 'social', title: '📱 Verify Your Mobile Number' };
    default:
      return { channelId: 'default', title: 'Tolee Alert' };
  }
}

/**
 * Unified service to save a system notification to the database AND dispatch a real-time high-priority push notification.
 */
export async function createSystemNotification(params: CreateNotificationParams, extra?: { groupName?: string }) {
  try {
    // 1. Create DB Notification record
    const notif = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        message: params.message,
        link: params.link || null,
      },
    });

    // 2. Fetch User Notification Preferences
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        pushNotifications: true,
        chatNotifications: true,
        groupNotifications: true,
        marketplaceNotifications: true,
        shootNotifications: true,
      },
    });

    // 3. Dispatch Push Notification if enabled
    if (user?.pushNotifications) {
      let isPreferenceEnabled = true;
      if (params.type === 'chat' || params.type === 'live') {
        isPreferenceEnabled = extra?.groupName ? user.groupNotifications : user.chatNotifications;
      } else if (params.type === 'marketplace') {
        isPreferenceEnabled = user.marketplaceNotifications;
      } else if (params.type === 'promotion') {
        isPreferenceEnabled = user.shootNotifications;
      }

      if (isPreferenceEnabled) {
        const { channelId, title } = getChannelAndTitle(params.type, extra?.groupName);
        console.log(`[DEBUG] [Notification Delivered] Sending FCM Push to User: ${params.userId} -> Title: "${title}", Body: "${params.message}"`);
        await sendPushNotification(
          params.userId,
          title,
          params.message,
          {
            url: params.link || '',
            channelId,
            type: params.type,
          }
        );
      } else {
        console.log(`[DEBUG] [Notification Delivered] Skip sending push to ${params.userId} because preference is disabled.`);
      }
    } else {
      console.log(`[DEBUG] [Notification Delivered] Skip sending push to ${params.userId} because user pushNotifications preference is disabled.`);
    }

    return { success: true, notification: notif };
  } catch (error) {
    console.error('[NotificationService] Error creating notification:', error);
    return { success: false, error };
  }
}

/**
 * Unified service to save bulk system notifications AND dispatch push notifications.
 */
export async function createSystemNotificationsMany(
  notifications: CreateNotificationParams[],
  extra?: { groupName?: string }
) {
  try {
    if (!notifications.length) return { success: true };

    // 1. Save all database notifications
    await prisma.notification.createMany({
      data: notifications.map(n => ({
        userId: n.userId,
        type: n.type,
        message: n.message,
        link: n.link || null,
      })),
    });

    // 2. Dispatch push notifications asynchronously in parallel
    const pushPromises = notifications.map(async (n) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: n.userId },
          select: {
            pushNotifications: true,
            chatNotifications: true,
            groupNotifications: true,
            marketplaceNotifications: true,
            shootNotifications: true,
          },
        });

        if (user?.pushNotifications) {
          let isPreferenceEnabled = true;
          if (n.type === 'chat' || n.type === 'live') {
            isPreferenceEnabled = extra?.groupName ? user.groupNotifications : user.chatNotifications;
          } else if (n.type === 'marketplace') {
            isPreferenceEnabled = user.marketplaceNotifications;
          } else if (n.type === 'promotion') {
            isPreferenceEnabled = user.shootNotifications;
          }

          if (isPreferenceEnabled) {
            const { channelId, title } = getChannelAndTitle(n.type, extra?.groupName);
            console.log(`[DEBUG] [Notification Delivered] Sending FCM Push to User: ${n.userId} -> Title: "${title}", Body: "${n.message}"`);
            await sendPushNotification(
              n.userId,
              title,
              n.message,
              {
                url: n.link || '',
                channelId,
                type: n.type,
              }
            );
          } else {
            console.log(`[DEBUG] [Notification Delivered] Skip sending push to ${n.userId} because group/chat notifications are muted/disabled by preference.`);
          }
        } else {
          console.log(`[DEBUG] [Notification Delivered] Skip sending push to ${n.userId} because user pushNotifications preference is disabled.`);
        }
      } catch (err) {
        console.error(`[NotificationService] Failed to send push to ${n.userId}:`, err);
      }
    });

    await Promise.all(pushPromises);
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Error creating multiple notifications:', error);
    return { success: false, error };
  }
}
