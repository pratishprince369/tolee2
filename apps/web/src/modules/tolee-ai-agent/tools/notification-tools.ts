import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

export const getNotificationsTool: ToolDefinition = {
  name: 'get_notifications',
  description: 'Fetches recent notifications, likes, comments, and community activity for the user.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of notifications to retrieve (default 5)',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { limit = 5 } = args || {};

      const notifications = await prisma.notification.findMany({
        where: { userId: context.userId },
        include: {
          sender: { select: { name: true, username: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      if (!notifications || notifications.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Aapke paas abhi koi nayi notification nahi hai.',
        };
      }

      const formatted = notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.content || `${n.sender?.name || n.sender?.username || 'Kisi'} ne interact kiya.`,
        isRead: n.isRead,
        createdAt: n.createdAt,
      }));

      return {
        success: true,
        data: formatted,
        message: `Aapke ${formatted.length} recent alerts mile hain.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_notifications] Error:', err);
      return { success: false, error: 'Notifications fetch nahi ho paayein.' };
    }
  },
};
