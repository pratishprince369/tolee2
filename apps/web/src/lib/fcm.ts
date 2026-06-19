import * as admin from 'firebase-admin';
import { prisma } from '@/lib/prisma';

// Initialize Firebase Admin SDK (only once)
try {
  if (!admin.apps.length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    let serviceAccount: any = null;

    if (serviceAccountJson) {
      try {
        serviceAccount = JSON.parse(serviceAccountJson);
      } catch (jsonErr) {
        console.error('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', jsonErr);
      }
    }

    // Fallback to individual env variables if JSON is missing or malformed
    if (!serviceAccount || (!serviceAccount.project_id && !serviceAccount.projectId)) {
      const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (projectId && clientEmail && privateKey) {
        serviceAccount = {
          projectId,
          clientEmail,
          // Correctly decode newline characters often escaped in hosting platforms
          privateKey: privateKey.replace(/\\n/g, '\n'),
        };
      }
    }

    const hasCreds = serviceAccount && (
      (serviceAccount.project_id && serviceAccount.project_id.trim() !== '') || 
      (serviceAccount.projectId && serviceAccount.projectId.trim() !== '')
    );

    if (hasCreds) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[FCM] Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('[FCM] Firebase Service Account credentials not provided. Push notifications will run in mock mode.');
    }
  }
} catch (err) {
  console.error('[FCM] Critical error during Firebase Admin SDK initialization:', err);
}

const getMessaging = () => {
  try {
    return admin.apps.length ? admin.messaging() : null;
  } catch (e) {
    console.error('[FCM] Failed to initialize Messaging service:', e);
    return null;
  }
};

/**
 * Calculates unread notifications for a user to display as the app icon badge count.
 */
async function getUnreadBadgeCount(userId: string): Promise<number> {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    return unreadCount;
  } catch (err) {
    console.error('[FCM] Error counting unread for badge:', err);
    return 0;
  }
}

/**
 * Send a push notification to all registered devices for a given user.
 * Best-effort delivery — logs errors but never throws.
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.log(`[FCM Mock] Sent push to user ${userId} -> Title: "${title}", Body: "${body}"`);
      return;
    }

    // Look up all push tokens for the user
    const pushTokens = await prisma.pushToken.findMany({
      where: { userId },
    });

    if (!pushTokens.length) {
      console.log(`[FCM] No push tokens found for user ${userId}`);
      return;
    }

    const tokens = pushTokens.map((t: any) => t.token);
    const badgeCount = await getUnreadBadgeCount(userId);

    const isCall = data?.type === 'incoming_call';

    const message: admin.messaging.MulticastMessage = {
      tokens,
      ...(isCall ? {} : {
        notification: {
          title,
          body,
        }
      }),
      data: {
        ...(data ?? {}),
        url: data?.url || '',
      },
      android: {
        priority: 'high',
        ttl: 86400 * 1000, // 24 hours
        ...(isCall ? {} : {
          notification: {
            title,
            body,
            channelId: data?.channelId || 'default',
            priority: 'high',
            sound: 'default',
            vibrateTimingsMillis: [0, 500, 200, 500],
            visibility: 'public', // Expandable on lock screen
            notificationCount: badgeCount,
          }
        }),
      },
      apns: {
        payload: {
          aps: {
            ...(isCall ? {
              'content-available': 1,
            } : {
              alert: {
                title,
                body,
              },
            }),
            sound: 'default',
            badge: badgeCount,
          },
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Handle token cleanup for failed sends
    if (response.failureCount > 0) {
      const tokensToRemove: string[] = [];

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          console.error(
            `[FCM] Failed to send to token ${tokens[idx]}: ${errorCode} - ${resp.error?.message}`
          );

          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            tokensToRemove.push(tokens[idx]);
          }
        }
      });

      // Delete stale tokens from the database
      if (tokensToRemove.length > 0) {
        await prisma.pushToken.deleteMany({
          where: { token: { in: tokensToRemove } },
        });
        console.log(
          `[FCM] Cleaned up ${tokensToRemove.length} stale token(s) for user ${userId}`
        );
      }
    }

    console.log(
      `[FCM] Sent to user ${userId}: ${response.successCount} success, ${response.failureCount} failure`
    );
  } catch (error) {
    console.error(`[FCM] Error sending push notification to user ${userId}:`, error);
  }
}

/**
 * Send a push notification directly to a specific FCM token.
 * Best-effort delivery — logs errors but never throws.
 */
export async function sendPushToToken(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  try {
    const messaging = getMessaging();
    if (!messaging) {
      console.log(`[FCM Mock] Sent push directly to token -> Title: "${title}", Body: "${body}"`);
      return;
    }

    const message: admin.messaging.Message = {
      token,
      notification: {
        title,
        body,
      },
      data: {
        ...(data ?? {}),
        url: data?.url || '',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: data?.channelId || 'default',
          priority: 'high',
          sound: 'default',
          vibrateTimingsMillis: [0, 500, 200, 500],
          visibility: 'public',
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title,
              body,
            },
            sound: 'default',
          },
        },
      },
    };

    const response = await messaging.send(message);
    console.log(`[FCM] Successfully sent to token: ${response}`);
  } catch (error) {
    console.error(`[FCM] Error sending to token:`, error);
  }
}
