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

      // Find all chats the current user participates in
      const userChats = await prisma.chatParticipant.findMany({
        where: { userId: context.userId },
        select: { chatId: true },
      });

      const chatIds = userChats.map((c: any) => c.chatId);
      if (chatIds.length === 0) {
        return {
          success: true,
          data: [],
          message: 'Aapke paas abhi koi active chat conversation nahi hai.',
        };
      }

      const messages = await prisma.message.findMany({
        where: {
          chatId: { in: chatIds },
          senderId: { not: context.userId },
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
            : 'Aapke inbox me koi naya message nahi mila.',
        };
      }

      const formatted = messages.map((m: any) => ({
        id: m.id,
        chatId: m.chatId,
        senderName: m.sender?.name || m.sender?.username || 'User',
        senderUsername: m.sender?.username,
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

      // Find or create direct 1-on-1 chat
      const existingParticipant = await prisma.chatParticipant.findFirst({
        where: {
          userId: context.userId,
          chat: {
            isGroupChat: false,
            participants: { some: { userId: recipient.id } },
          },
        },
        select: { chatId: true },
      });

      let targetChatId = existingParticipant?.chatId;
      if (!targetChatId) {
        const newChat = await prisma.chat.create({
          data: {
            isGroupChat: false,
            participants: {
              create: [
                { userId: context.userId },
                { userId: recipient.id },
              ],
            },
          },
        });
        targetChatId = newChat.id;
      }

      // Create message in DB
      const newMsg = await prisma.message.create({
        data: {
          chatId: targetChatId,
          senderId: context.userId,
          content: messageContent,
        },
      });

      return {
        success: true,
        data: {
          messageId: newMsg.id,
          chatId: targetChatId,
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
