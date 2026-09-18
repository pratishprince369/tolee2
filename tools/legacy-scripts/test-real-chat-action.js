const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmp13r0v50000q1oydz0r2gwf'; // pratish prince

async function main() {
  try {
    console.log("Testing fetchRealChatData logic...");

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
    const messagesByChatObj = {};

    // 1. Group Chats
    for (const tm of userTolees) {
      const tolee = tm.tolee;
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

      const messages = await prisma.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { sender: true }
      });

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
        name: tolee.name,
        avatar: tolee.avatar || '/default-tolee-avatar.svg',
        isGroup: true,
        membersCount: tolee._count.members,
        hideMembers: false,
        lastMessage: messages.length > 0 ? `${messages[messages.length-1].sender.name || 'User'}: ${messages[messages.length-1].content}` : 'No messages yet.',
        time: messages.length > 0 ? messages[messages.length-1].createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: unreadCount,
        online: 'Online',
        status: 'accepted',
        requestSenderId: null
      });

      messagesByChatObj[chat.id] = messages.map(msg => ({
        id: msg.id,
        sender: msg.sender.name || msg.sender.username || 'User',
        senderAvatar: msg.sender.avatar || msg.sender.image || '/default-user-avatar.svg',
        text: msg.content,
        time: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.senderId === userId
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
            sender: true
          }
        }
      }
    });

    console.log(`Found DMs count: ${userDms.length}`);

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

      chatsList.push({
        id: dm.id,
        name: otherUser.name || otherUser.username || 'User',
        username: otherUser.username || '',
        avatar: otherUser.avatar || otherUser.image || '/default-user-avatar.svg',
        isGroup: false,
        membersCount: 2,
        hideMembers: true,
        lastMessage: dmMessages.length > 0 ? dmMessages[dmMessages.length - 1].content : 'No messages yet.',
        time: dmMessages.length > 0 ? dmMessages[dmMessages.length - 1].createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        unread: unreadCount,
        online: 'Online',
        status: dm.status,
        requestSenderId: dm.requestSenderId
      });

      messagesByChatObj[dm.id] = dmMessages.map(msg => ({
        id: msg.id,
        sender: msg.sender.name || msg.sender.username || 'User',
        senderAvatar: msg.sender.avatar || msg.sender.image || '/default-user-avatar.svg',
        text: msg.content,
        time: msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: msg.senderId === userId
      }));
    }

    // Sort: chats with unread > 0 at the top, then by last message time
    chatsList.sort((a, b) => {
      if (a.unread > 0 && b.unread === 0) return -1;
      if (a.unread === 0 && b.unread > 0) return 1;
      return 0;
    });

    // Add AI Tolee Manager virtual chat at the very top of the list!
    chatsList.unshift({
      id: 'ai-tolee-manager',
      name: 'AI Tolee Manager',
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=ToleeManager',
      isGroup: false,
      isAI: true,
      membersCount: 1,
      hideMembers: true,
      lastMessage: 'Ask me to format and share your posts or reels to all relevant groups!',
      time: '',
      unread: 0,
      online: 'Active Now',
      status: 'accepted',
      requestSenderId: null
    });

    console.log("=== FINAL CHATS LIST ===");
    console.log(chatsList);
    console.log("Success! No Prisma errors!");

  } catch (err) {
    console.error("Prisma query failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
