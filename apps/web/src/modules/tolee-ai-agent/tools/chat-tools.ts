import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

export const getLatestMessagesTool: ToolDefinition = {
  name: 'get_latest_messages',
  description: 'Fetches recent chat messages or unread conversations for the authenticated user.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Number of recent messages to fetch (default 5)',
      },
      senderName: {
        type: 'string',
        description: 'Optional filter by sender name or username (e.g. "Ram")',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { limit = 5, senderName } = args || {};
      
      const messages = await prisma.message.findMany({
        where: {
          receiverId: context.userId,
          ...(senderName
            ? {
                sender: {
                  OR: [
                    { name: { contains: senderName, mode: 'insensitive' } },
                    { username: { contains: senderName, mode: 'insensitive' } },
                  ],
                },
              }
            : {}),
        },
        include: {
          sender: { select: { id: true, name: true, username: true, avatar: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      if (!messages || messages.length === 0) {
        return {
          success: true,
          data: [],
          message: senderName
            ? `Aapko ${senderName} se koi naya message nahi mila hai.`
            : 'Aapke inbox me koi naya unread message nahi hai.',
        };
      }

      const formatted = messages.map((m) => ({
        id: m.id,
        senderName: m.sender.name || m.sender.username || 'User',
        senderUsername: m.sender.username,
        text: m.content,
        sentAt: m.createdAt,
        isRead: m.isRead,
      }));

      return {
        success: true,
        data: formatted,
        message: `${formatted.length} messages found.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_latest_messages] Error:', err);
      return { success: false, error: 'Chat messages fetch karne me problem aayi.' };
    }
  },
};

export const sendMessageTool: ToolDefinition = {
  name: 'send_chat_message',
  description: 'Sends or replies to a chat message for a specific recipient on Tolee.',
  riskLevel: 'MEDIUM',
  parameters: {
    type: 'object',
    properties: {
      recipientNameOrUsername: {
        type: 'string',
        description: 'The name or username of the recipient (e.g. "Ram")',
      },
      messageContent: {
        type: 'string',
        description: 'The text message content to send',
      },
    },
    required: ['recipientNameOrUsername', 'messageContent'],
  },
  execute: async (args, context) => {
    try {
      const { recipientNameOrUsername, messageContent } = args;
      if (!recipientNameOrUsername || !messageContent) {
        return { success: false, error: 'Recipient aur message content zaroori hai.' };
      }

      // Find recipient
      const recipient = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: recipientNameOrUsername, mode: 'insensitive' } },
            { name: { contains: recipientNameOrUsername, mode: 'insensitive' } },
          ],
          NOT: { id: context.userId },
        },
        select: { id: true, name: true, username: true },
      });

      if (!recipient) {
        return {
          success: false,
          error: `User "${recipientNameOrUsername}" nahi mila. Kripya sahi naam ya username batayein.`,
        };
      }

      // Create message in DB
      const newMsg = await prisma.message.create({
        data: {
          senderId: context.userId,
          receiverId: recipient.id,
          content: messageContent,
        },
      });

      return {
        success: true,
        data: {
          messageId: newMsg.id,
          recipientName: recipient.name || recipient.username,
          sentText: messageContent,
        },
        message: `${recipient.name || recipient.username} ko message bhej diya gaya: "${messageContent}"`,
      };
    } catch (err: any) {
      console.error('[Tool: send_chat_message] Error:', err);
      return { success: false, error: 'Message send karne me error aaya.' };
    }
  },
};
