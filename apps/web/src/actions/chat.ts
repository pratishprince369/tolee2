'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { unstable_noStore as noStore } from 'next/cache';
import { createSystemNotification, createSystemNotificationsMany } from '@/lib/notification-service';
import { formatLastSeen, isUserOnline } from '@/lib/presence';

// Fetch real chats and messages for the user
export async function fetchRealChatData() {
  noStore();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Get the tolees the user is a member of
    const userTolees = await prisma.toleeMember.findMany({
      where: { userId, status: 'approved' },
      include: {
        tolee: {
          include: {
            _count: { select: { members: true } }
          }
        }
      }
    });

    const chatsList = [];
    const messagesByChatObj: Record<string, any[]> = {};

    // 1. Fetch Group Chats
    for (const tm of userTolees) {
      const tolee = tm.tolee;
      
      // Find or create a Chat for this Tolee
      let chat = await prisma.chat.findFirst({
        where: { name: tolee.name, isGroupChat: true }
      });

      if (!chat) {
        chat = await prisma.chat.create({
          data: {
            name: tolee.name,
            isGroupChat: true,
          }
        });
      }

      // Fetch latest 50 messages for this chat
      const messagesRaw = await prisma.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
          sender: true,
          parent: {
            include: {
              sender: true
            }
          }
        }
      });
      const messages = messagesRaw.reverse();

      // Calculate unread count for this group chat
      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          type: 'chat',
          isRead: false,
          OR: [
            { link: `/chat?chatId=${chat.id}` },
            { link: `/chat?id=${chat.id}` }
          ]
        }
      });

      chatsList.push({
        id: chat.id,
        toleeId: tolee.id,
        name: tolee.name,
        avatar: tolee.avatar || '/default-tolee-avatar.svg',
        isGroup: true,
        membersCount: tolee._count.members,
        hideMembers: false,
        lastMessage: messages.length > 0 
          ? (messages[messages.length-1].content || (
              messages[messages.length-1].mediaResourceType === 'image' || messages[messages.length-1].mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? '📷 Photo' :
              messages[messages.length-1].mediaResourceType === 'video' || messages[messages.length-1].mediaUrl?.match(/\.(mp4|webm|mov)$/i) ? '🎥 Video' :
              messages[messages.length-1].mediaResourceType === 'audio' || messages[messages.length-1].mediaUrl?.match(/\.(mp3|wav|ogg|m4a)$/i) ? '🎵 Audio' : '📄 Document'
            ) ? `${messages[messages.length-1].sender.name || 'User'}: ${messages[messages.length-1].content || (messages[messages.length-1].mediaResourceType === 'image' || messages[messages.length-1].mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? '📷 Photo' : messages[messages.length-1].mediaResourceType === 'video' || messages[messages.length-1].mediaUrl?.match(/\.(mp4|webm|mov)$/i) ? '🎥 Video' : '📄 Attachment')}` : 'No messages yet.') 
          : 'No messages yet.',
        time: messages.length > 0 ? messages[messages.length-1].createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        lastMessageCreatedAt: messages.length > 0 ? messages[messages.length-1].createdAt.toISOString() : chat.createdAt.toISOString(),
        phone: '',
        unread: unreadCount,
        online: 'Online',
        status: 'accepted',
        requestSenderId: null,
        isMuted: tm.isMuted || false,
        mutedUntil: tm.mutedUntil || null
      });

      messagesByChatObj[chat.id] = messages.map(msg => ({
        id: msg.id,
        sender: msg.sender.name || msg.sender.username || 'User',
        senderId: msg.senderId,
        senderUsername: msg.sender.username || null,
        senderAvatar: msg.sender.avatar || msg.sender.image || '/default-user-avatar.svg',
        text: msg.content,
        mediaUrl: msg.mediaUrl || null,
        mediaResourceType: msg.mediaResourceType || null,
        mediaPublicId: msg.mediaPublicId || null,
        isRead: msg.isRead,
        createdAt: msg.createdAt.toISOString(),
        time: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.senderId === userId,
        replyTo: msg.parent ? {
          id: msg.parent.id,
          text: msg.parent.content,
          sender: msg.parent.sender.name || msg.parent.sender.username || 'User',
          senderId: msg.parent.senderId,
          senderUsername: msg.parent.sender.username || null
        } : null,
        storyId: msg.storyId || null,
        storyType: msg.storyType || null,
        storyThumbnail: msg.storyThumbnail || null,
        storyUploaderId: msg.storyUploaderId || null,
        storyCreatedAt: msg.storyCreatedAt ? msg.storyCreatedAt.toISOString() : null
      }));
    }

    // 2. Fetch Personal DM Chats
    const userDms = await prisma.chat.findMany({
      where: {
        isGroupChat: false,
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            sender: true,
            shoot: true,
            parent: {
              include: {
                sender: true
              }
            }
          }
        }
      }
    });

    for (const dm of userDms) {
      const otherPart = dm.participants.find(p => p.userId !== userId);
      if (!otherPart) continue;

      // Fetch other user's info manually since participants does not have a user relation in schema.prisma
      const otherUser = await prisma.user.findUnique({
        where: { id: otherPart.userId }
      });
      if (!otherUser) continue;

      const dmMessages = [...dm.messages].reverse();

      const unreadCount = await prisma.notification.count({
        where: {
          userId,
          type: 'chat',
          isRead: false,
          link: `/chat?id=${dm.id}`
        }
      });

      // Accurate Server-Side WhatsApp-Style Presence
      const userOnline = isUserOnline(otherUser.lastActiveAt, false, otherUser.showActivityStatus !== false);
      const lastSeenText = formatLastSeen(
        otherUser.lastActiveAt,
        userOnline,
        otherUser.showActivityStatus !== false
      );

      // Golden Story Ring Detection
      const activeStoriesCount = await prisma.story.count({
        where: {
          authorId: otherUser.id,
          expiresAt: { gt: new Date() }
        }
      });

      chatsList.push({
        id: dm.id,
        name: otherUser.name || otherUser.username || 'User',
        username: otherUser.username || '',
        avatar: otherUser.avatar || otherUser.image || '/default-user-avatar.svg',
        isGroup: false,
        isPromotion: dm.isPromotion,
        otherUserId: otherUser.id,
        showActivityStatus: otherUser.showActivityStatus !== false,
        membersCount: 2,
        hideMembers: true,
        lastMessage: dmMessages.length > 0 
          ? (dmMessages[dmMessages.length - 1].content || (
              dmMessages[dmMessages.length - 1].mediaResourceType === 'image' || dmMessages[dmMessages.length - 1].mediaUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i) ? '📷 Photo' :
              dmMessages[dmMessages.length - 1].mediaResourceType === 'video' || dmMessages[dmMessages.length - 1].mediaUrl?.match(/\.(mp4|webm|mov)$/i) ? '🎥 Video' :
              dmMessages[dmMessages.length - 1].mediaResourceType === 'audio' || dmMessages[dmMessages.length - 1].mediaUrl?.match(/\.(mp3|wav|ogg|m4a)$/i) ? '🎵 Audio' : '📄 Document'
            ))
          : 'No messages yet.',
        time: dmMessages.length > 0 ? dmMessages[dmMessages.length - 1].createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        lastMessageCreatedAt: dmMessages.length > 0 ? dmMessages[dmMessages.length - 1].createdAt.toISOString() : dm.createdAt.toISOString(),
        phone: otherUser.phone || '',
        unread: unreadCount,
        isOnline: userOnline,
        lastActiveAt: otherUser.lastActiveAt ? otherUser.lastActiveAt.toISOString() : null,
        online: lastSeenText,
        hasActiveStories: activeStoriesCount > 0,
        status: dm.status,
        requestSenderId: dm.requestSenderId
      });

      messagesByChatObj[dm.id] = dmMessages.map(msg => ({
        id: msg.id,
        sender: msg.sender.name || msg.sender.username || 'User',
        senderId: msg.senderId,
        senderUsername: msg.sender.username || null,
        senderAvatar: msg.sender.avatar || msg.sender.image || '/default-user-avatar.svg',
        text: msg.content,
        mediaUrl: msg.mediaUrl || null,
        mediaResourceType: msg.mediaResourceType || null,
        mediaPublicId: msg.mediaPublicId || null,
        isRead: msg.isRead,
        createdAt: msg.createdAt.toISOString(),
        isPromotion: msg.isPromotion,
        shoot: msg.shoot ? {
          id: msg.shoot.id,
          contentType: msg.shoot.contentType,
          contentId: msg.shoot.contentId,
          mediaUrl: msg.shoot.mediaUrl
        } : null,
        time: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.senderId === userId,
        replyTo: msg.parent ? {
          id: msg.parent.id,
          text: msg.parent.content,
          sender: msg.parent.sender.name || msg.parent.sender.username || 'User',
          senderId: msg.parent.senderId,
          senderUsername: msg.parent.sender.username || null
        } : null,
        storyId: msg.storyId || null,
        storyType: msg.storyType || null,
        storyThumbnail: msg.storyThumbnail || null,
        storyUploaderId: msg.storyUploaderId || null,
        storyCreatedAt: msg.storyCreatedAt ? msg.storyCreatedAt.toISOString() : null
      }));
    }

    // Sort: chats with unread > 0 at the top, then by last message time
    chatsList.sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      const timeA = new Date(a.lastMessageCreatedAt || 0).getTime();
      const timeB = new Date(b.lastMessageCreatedAt || 0).getTime();
      return timeB - timeA;
    });

    return { success: true, chats: chatsList, messagesByChat: messagesByChatObj };

  } catch (error) {
    console.error("Error fetching chats:", error);
    return { success: false, error: 'Failed to fetch chats' };
  }
}

export async function markChatNotificationsAsRead(chatId?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    if (chatId) {
      await prisma.notification.updateMany({
        where: {
          userId,
          type: 'chat',
          isRead: false,
          OR: [
            { link: `/chat?chatId=${chatId}` },
            { link: `/chat?id=${chatId}` },
            { link: '/chat' }
          ]
        },
        data: { isRead: true }
      });
    } else {
      await prisma.notification.updateMany({
        where: { userId, type: 'chat', isRead: false },
        data: { isRead: true }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error marking chat notifications as read:", error);
    return { success: false, error: 'Failed' };
  }
}

export async function sendRealChatMessage(
  chatId: string,
  content: string,
  parentId?: string,
  storyReplyData?: {
    storyId: string;
    storyType: string;
    storyThumbnail: string;
    storyUploaderId: string;
    storyCreatedAt: Date | string;
  },
  mediaData?: {
    mediaUrl?: string;
    mediaPublicId?: string;
    mediaResourceType?: string;
  }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const senderId = (session.user as any).id;
    const senderName = session.user.name || 'A member';

    const user = await prisma.user.findUnique({
      where: { id: senderId },
      select: { messagingRestricted: true }
    });

    if (user?.messagingRestricted) {
      return { success: false, error: 'You are restricted from sending messages.' };
    }

    const { writeLimiter, getClientIp } = require('@/lib/rate-limit');
    const ip = getClientIp();
    if (writeLimiter.isRateLimited(ip)) {
      return { success: false, error: 'Too many requests. Please cool down.' };
    }

    const { sanitizeText } = require('@/lib/sanitize');
    const safeContent = sanitizeText(content || '', 5000);

    if (!safeContent && !mediaData?.mediaUrl) {
      return { success: false, error: 'Message cannot be empty.' };
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true }
    });

    if (!chat) {
      return { success: false, error: 'Chat not found.' };
    }

    if (chat.isGroupChat) {
      // Verify sender is an approved member of this Tolee group
      const tolee = await prisma.tolee.findFirst({
        where: { name: chat.name || '' },
        include: { members: { where: { userId: senderId, status: 'approved' } } }
      });
      if (!tolee || tolee.members.length === 0) {
        return { success: false, error: 'You are not a member of this group.' };
      }
    } else {
      // Verify sender is a participant of this 1-on-1 DM
      const isParticipant = chat.participants.some(p => p.userId === senderId);
      if (!isParticipant) {
        return { success: false, error: 'You are not a participant in this conversation.' };
      }

      if (chat.status === 'declined') {
        return { success: false, error: 'This conversation request has been declined.' };
      }

      if (chat.status === 'pending') {
        if (!chat.requestSenderId) {
          // This is the first message! Set the sender as the requestSenderId.
          await prisma.chat.update({
            where: { id: chatId },
            data: { requestSenderId: senderId }
          });
        } else if (chat.requestSenderId === senderId) {
          // Senders cannot send subsequent messages while the request is pending.
          return { 
            success: false, 
            error: 'Your message request has been sent. You can continue chatting after the recipient accepts your request.' 
          };
        }
      }
    }

    const message = await prisma.message.create({
      data: {
        content: safeContent || (mediaData?.mediaUrl ? '' : 'Message'),
        mediaUrl: mediaData?.mediaUrl || null,
        mediaPublicId: mediaData?.mediaPublicId || null,
        mediaResourceType: mediaData?.mediaResourceType || null,
        senderId,
        chatId,
        parentId: parentId || null,
        storyId: storyReplyData?.storyId || null,
        storyType: storyReplyData?.storyType || null,
        storyThumbnail: storyReplyData?.storyThumbnail || null,
        storyUploaderId: storyReplyData?.storyUploaderId || null,
        storyCreatedAt: storyReplyData?.storyCreatedAt ? new Date(storyReplyData.storyCreatedAt) : null
      },
      include: {
        sender: true,
        chat: true,
        parent: {
          include: {
            sender: true
          }
        }
      }
    });

    // If it's a group chat, find the associated Tolee and notify members
    if (message.chat.isGroupChat && message.chat.name) {
      const tolees = await prisma.tolee.findMany({
        where: { name: message.chat.name },
        include: { members: true }
      });

      if (tolees.length > 0) {
        const tolee = tolees[0];
        const userIdsToNotify = tolee.members
          .filter(m => {
            if (m.userId === senderId) return false;
            if (m.isMuted) return false;
            if (m.mutedUntil && new Date(m.mutedUntil) > new Date()) return false;
            return true;
          })
          .map(m => m.userId);

        if (userIdsToNotify.length > 0) {
          const previewText = safeContent ? `"${safeContent.substring(0, 30)}${safeContent.length > 30 ? '...' : ''}"` : (mediaData?.mediaUrl ? 'an attachment' : 'a message');
          const notifications = userIdsToNotify.map(userId => ({
            userId,
            type: 'chat',
            message: `${senderName} sent ${safeContent ? `a message in ${tolee.name}: ${previewText}` : `${previewText} in ${tolee.name}`}`,
            link: `/chat?chatId=${chatId}`
          }));

          await createSystemNotificationsMany(notifications, { groupName: tolee.name });
        }
      }
    } else {
      // 1-to-1 chat - notify the other participant
      const otherParticipant = await prisma.chatParticipant.findFirst({
        where: {
          chatId: message.chatId,
          userId: { not: senderId }
        }
      });

      if (otherParticipant) {
        const previewText = safeContent ? `"${safeContent.substring(0, 30)}${safeContent.length > 30 ? '...' : ''}"` : (mediaData?.mediaUrl ? 'an attachment' : 'a message');
        await createSystemNotification({
          userId: otherParticipant.userId,
          type: 'chat',
          message: `${senderName} sent you ${safeContent ? `a message: ${previewText}` : previewText}`,
          link: `/chat?id=${chatId}`
        });
      }
    }

    return { 
      success: true, 
      message: {
        id: message.id,
        sender: message.sender.name || message.sender.username || 'User',
        senderId: message.senderId,
        senderUsername: message.sender.username || null,
        senderAvatar: message.sender.avatar || message.sender.image || '/default-user-avatar.svg',
        text: message.content,
        time: message.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        replyTo: message.parent ? {
          id: message.parent.id,
          text: message.parent.content,
          sender: message.parent.sender.name || message.parent.sender.username || 'User',
          senderId: message.parent.senderId,
          senderUsername: message.parent.sender.username || null
        } : null,
        mediaUrl: message.mediaUrl || null,
        mediaResourceType: message.mediaResourceType || null,
        mediaPublicId: message.mediaPublicId || null,
        createdAt: message.createdAt.toISOString(),
        storyId: message.storyId || null,
        storyType: message.storyType || null,
        storyThumbnail: message.storyThumbnail || null,
        storyUploaderId: message.storyUploaderId || null,
        storyCreatedAt: message.storyCreatedAt ? message.storyCreatedAt.toISOString() : null
      }
    };
  } catch (error) {
    console.error("Error sending message:", error);
    return { success: false, error: 'Failed to send message' };
  }
}

// Get or create a 1-to-1 personal chat between the current user and a recipient
export async function getOrCreatePersonalChat(recipientId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    if (currentUserId === recipientId) {
      return { success: false, error: 'Cannot start chat with yourself.' };
    }

    // Look for existing chat where participants are current user and recipient
    const existingDms = await prisma.chat.findMany({
      where: {
        isGroupChat: false,
        participants: {
          some: { userId: currentUserId }
        }
      },
      include: {
        participants: true
      }
    });

    const targetChat = existingDms.find(chat => 
      chat.participants.some(p => p.userId === recipientId)
    );

    if (targetChat) {
      // If the request was previously declined, reset it back to pending to allow a new attempt
      if (targetChat.status === 'declined') {
        await prisma.chat.update({
          where: { id: targetChat.id },
          data: { status: 'pending', requestSenderId: null }
        });
      }
      return { success: true, chatId: targetChat.id };
    }

    // Create a new DM chat in pending state
    const newChat = await prisma.chat.create({
      data: {
        isGroupChat: false,
        status: 'pending',
        requestSenderId: null,
        participants: {
          create: [
            { userId: currentUserId },
            { userId: recipientId }
          ]
        }
      }
    });

    return { success: true, chatId: newChat.id };
  } catch (error) {
    console.error("Error getting or creating personal chat:", error);
    return { success: false, error: 'Failed to create personal chat' };
  }
}

// Accept or Decline a message request
export async function respondToChatRequest(chatId: string, action: 'accept' | 'decline') {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const currentUserId = (session.user as any).id;

    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true }
    });

    if (!chat || chat.isGroupChat) {
      return { success: false, error: 'Chat not found' };
    }

    const isParticipant = chat.participants.some(p => p.userId === currentUserId);
    if (!isParticipant) {
      return { success: false, error: 'Unauthorized' };
    }

    if (chat.requestSenderId && chat.requestSenderId === currentUserId) {
      return { success: false, error: 'You cannot respond to your own chat request.' };
    }

    if (action === 'accept') {
      await prisma.chat.update({
        where: { id: chatId },
        data: { status: 'accepted' }
      });
    } else {
      await prisma.chat.update({
        where: { id: chatId },
        data: { status: 'declined' }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error responding to chat request:", error);
    return { success: false, error: 'Failed to respond to chat request' };
  }
}

// Paginated scroll fetcher for historical messages using Prisma cursor
export async function fetchChatMessages(chatId: string, beforeMessageId?: string, limit = 30) {
  noStore();
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    // Check if user is a participant of the chat
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { participants: true }
    });

    if (!chat) {
      return { success: false, error: 'Chat not found' };
    }

    if (chat.isGroupChat) {
      // Check group membership
      const tolee = await prisma.tolee.findFirst({
        where: { name: chat.name || '' },
        include: { members: true }
      });
      if (tolee) {
        const isMember = tolee.members.some(m => m.userId === userId && m.status === 'approved');
        if (!isMember) {
          return { success: false, error: 'Not a member of this group' };
        }
      }
    } else {
      // Verify user is a DM participant
      const isParticipant = chat.participants.some(p => p.userId === userId);
      if (!isParticipant) {
        return { success: false, error: 'Unauthorized' };
      }
    }

    const queryOptions: any = {
      where: { chatId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        sender: true,
        shoot: true,
        parent: {
          include: {
            sender: true
          }
        }
      }
    };

    if (beforeMessageId) {
      queryOptions.cursor = { id: beforeMessageId };
      queryOptions.skip = 1;
    }

    const messagesRaw = await prisma.message.findMany(queryOptions);
    const hasMore = messagesRaw.length > limit;

    if (hasMore) {
      messagesRaw.pop();
    }

    const messages = messagesRaw.reverse().map(msg => ({
      id: msg.id,
      sender: msg.sender.name || msg.sender.username || 'User',
      senderId: msg.senderId,
      senderUsername: msg.sender.username || null,
      senderAvatar: msg.sender.avatar || msg.sender.image || '/default-user-avatar.svg',
      text: msg.content,
      mediaUrl: msg.mediaUrl || null,
      mediaResourceType: msg.mediaResourceType || null,
      mediaPublicId: msg.mediaPublicId || null,
      isRead: msg.isRead,
      createdAt: msg.createdAt.toISOString(),
      isPromotion: msg.isPromotion,
      shoot: msg.shoot ? {
        id: msg.shoot.id,
        contentType: msg.shoot.contentType,
        contentId: msg.shoot.contentId,
        mediaUrl: msg.shoot.mediaUrl
      } : null,
      time: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: msg.senderId === userId,
      replyTo: msg.parent ? {
        id: msg.parent.id,
        text: msg.parent.content,
        sender: msg.parent.sender.name || msg.parent.sender.username || 'User',
        senderId: msg.parent.senderId,
        senderUsername: msg.parent.sender.username || null
      } : null,
      storyId: msg.storyId || null,
      storyType: msg.storyType || null,
      storyThumbnail: msg.storyThumbnail || null,
      storyUploaderId: msg.storyUploaderId || null,
      storyCreatedAt: msg.storyCreatedAt ? msg.storyCreatedAt.toISOString() : null
    }));

    return { success: true, messages, hasMore };
  } catch (error) {
    console.error("Error fetching chat messages history:", error);
    return { success: false, error: 'Failed to fetch messages' };
  }
}

// Mark all incoming messages in this chat as read
export async function markChatMessagesAsRead(chatId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        isRead: false
      },
      data: { isRead: true }
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return { success: false, error: 'Failed to update read state' };
  }
}

// Update user presence (lastActiveAt heartbeat ping)
export async function updateUserPresence() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() }
    });

    return { success: true };
  } catch (error) {
    console.error("Error updating user presence heartbeat:", error);
    return { success: false, error: 'Failed to update presence' };
  }
}

// Fetch active stories for a user to display in the Story/Status Viewer
export async function fetchUserActiveStories(userId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized', stories: [] };
    }

    const stories = await prisma.story.findMany({
      where: {
        authorId: userId,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'asc' }
    });

    return { success: true, stories };
  } catch (error) {
    console.error("Error fetching user active stories:", error);
    return { success: false, error: 'Failed to fetch stories', stories: [] };
  }
}

// Fetch group (Tolee) details, member list with online status, and shared media assets
export async function fetchGroupChatDetails(chatId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }

    const chat = await prisma.chat.findUnique({
      where: { id: chatId }
    });

    if (!chat || !chat.isGroupChat || !chat.name) {
      return { success: false, error: 'Group chat not found' };
    }

    // Find the Tolee by group chat name
    const tolee = await prisma.tolee.findFirst({
      where: { name: chat.name },
      include: {
        members: {
          where: { status: 'approved' }
        }
      }
    });

    if (!tolee) {
      return { success: false, error: 'Associated Tolee not found' };
    }

    const userId = (session.user as any).id;
    const isMember = tolee.members.some(m => m.userId === userId);
    if (!isMember) {
      return { success: false, error: 'You are not a member of this group' };
    }

    // Fetch details of all approved members
    const memberIds = tolee.members.map(m => m.userId);
    const membersRaw = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: {
        id: true,
        name: true,
        username: true,
        avatar: true,
        image: true,
        lastActiveAt: true,
        showActivityStatus: true
      }
    });

    const members = membersRaw.map(member => {
      const isOnline = isUserOnline(member.lastActiveAt, false, member.showActivityStatus !== false);
      const lastSeenText = formatLastSeen(member.lastActiveAt, isOnline, member.showActivityStatus !== false);
      const memberRecord = tolee.members.find(m => m.userId === member.id);
      let role = memberRecord?.role || 'member';
      if (member.id === tolee.ownerId) {
        role = 'admin';
      }
      return {
        id: member.id,
        name: member.name || member.username || 'User',
        username: member.username || '',
        avatar: member.avatar || member.image || '/default-user-avatar.svg',
        isOnline,
        lastActiveAt: member.lastActiveAt ? member.lastActiveAt.toISOString() : null,
        lastSeenText,
        showActivityStatus: member.showActivityStatus !== false,
        role
      };
    });

    members.sort((a, b) => {
      const isAAdmin = a.role === 'admin';
      const isBAdmin = b.role === 'admin';
      if (isAAdmin && !isBAdmin) return -1;
      if (!isAAdmin && isBAdmin) return 1;

      const isAMod = a.role === 'moderator';
      const isBMod = b.role === 'moderator';
      if (isAMod && !isBMod) return -1;
      if (!isAMod && isBMod) return 1;

      return 0;
    });

    // Fetch shared media (messages in this chat containing attachments)
    const mediaMessages = await prisma.message.findMany({
      where: {
        chatId,
        mediaUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        mediaUrl: true,
        createdAt: true
      }
    });

    return {
      success: true,
      groupInfo: {
        id: chatId,
        name: tolee.name,
        avatar: tolee.avatar || '/default-tolee-avatar.svg',
        description: tolee.description || 'Welcome to our Tolee group chat!',
        createdAt: tolee.createdAt.toISOString()
      },
      members,
      media: mediaMessages
    };
  } catch (error) {
    console.error("Error fetching group chat details:", error);
    return { success: false, error: 'Failed to fetch details' };
  }
}

// Delete a message permanently for everyone
export async function deleteChatMessage(messageId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return { success: false, error: 'Message not found' };
    }

    if (message.senderId !== userId) {
      return { success: false, error: 'You can only delete your own messages.' };
    }

    await prisma.message.delete({
      where: { id: messageId }
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting message:", error);
    return { success: false, error: 'Failed to delete message' };
  }
}
