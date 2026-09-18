const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();

const userId = 'cmp13r0v50000q1oydz0r2gwf'; // pratish prince

async function main() {
  try {
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

    console.log("=== USER TOLEES ===");
    console.log("Found memberships count:", userTolees.length);
    for (const tm of userTolees) {
      console.log(`Tolee Member ID: ${tm.id}, Tolee Name: ${tm.tolee.name}`);
    }

    const chatsList = [];
    const messagesByChatObj = {};

    // 1. Fetch Group Chats
    for (const tm of userTolees) {
      const tolee = tm.tolee;
      
      // Find or create a Chat for this Tolee
      let chat = await prisma.chat.findFirst({
        where: { name: tolee.name, isGroupChat: true }
      });

      if (!chat) {
        console.log(`Creating chat for Tolee: ${tolee.name}`);
        chat = await prisma.chat.create({
          data: {
            name: tolee.name,
            isGroupChat: true,
          }
        });
      }

      // Fetch latest 50 messages for this chat
      const messages = await prisma.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
        take: 50,
        include: { sender: true }
      });

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
        name: tolee.name,
        avatar: tolee.avatar || '/default-tolee-avatar.svg',
        isGroup: true,
        membersCount: tolee._count.members,
        hideMembers: false,
        lastMessage: messages.length > 0 ? `${messages[messages.length-1].sender.name || 'User'}: ${messages[messages.length-1].content}` : 'No messages yet.',
        unread: unreadCount,
      });
    }

    console.log("\n=== GROUP CHATS LIST ===");
    console.log(chatsList);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
