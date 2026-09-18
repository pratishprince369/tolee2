const { PrismaClient } = require('../apps/web/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({
      include: {
        ownedTolees: true,
        tolees: {
          include: {
            tolee: true
          }
        }
      }
    });

    console.log("=== USERS ===");
    for (const u of users) {
      console.log(`User ID: ${u.id}, Name: ${u.name || u.username}`);
      console.log(`  Owned Tolees: ${u.ownedTolees.map(t => t.name).join(', ')}`);
      console.log(`  Memberships: ${u.tolees.map(m => `${m.tolee.name} (Status: ${m.status}, Role: ${m.role})`).join(', ')}`);
    }

    const members = await prisma.toleeMember.findMany({
      include: {
        user: true,
        tolee: true
      }
    });

    console.log("\n=== ALL MEMBERSHIPS ===");
    console.log(members.map(m => ({
      userId: m.userId,
      userName: m.user.name || m.user.username,
      toleeId: m.toleeId,
      toleeName: m.tolee.name,
      status: m.status,
      role: m.role
    })));

    const chats = await prisma.chat.findMany({
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    });
    console.log("\n=== ALL CHATS ===");
    console.log(chats.map(c => ({
      id: c.id,
      name: c.name,
      isGroupChat: c.isGroupChat,
      participants: c.participants.map(p => p.user.name || p.user.username)
    })));

  } catch (err) {
    console.error("Error inspecting database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
