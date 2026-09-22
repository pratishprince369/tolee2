import { prisma } from '@/lib/prisma';

/**
 * Automatically joins a user to the top 5 public default Tolee communities
 * so they can immediately select a group and publish posts/reels without manual joining.
 */
export async function autoJoinDefaultTolees(userId: string, count: number = 5) {
  if (!userId) return [];

  try {
    // Check if user has already joined or created any Tolees
    const existingCount = await prisma.toleeMember.count({
      where: { userId, status: 'approved' }
    });
    const ownedCount = await prisma.tolee.count({
      where: { ownerId: userId }
    });

    // If user already has 1 or more tolees, do not duplicate
    if (existingCount > 0 || ownedCount > 0) {
      return [];
    }

    // Fetch top public, non-private tolees
    const publicTolees = await prisma.tolee.findMany({
      where: {
        isPublicVisible: true,
        isPrivate: false,
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            members: { where: { status: 'approved' } }
          }
        }
      },
      take: 25
    });

    if (!publicTolees || publicTolees.length === 0) {
      return [];
    }

    // Sort by member count descending so largest communities come first
    const sorted = [...publicTolees].sort(
      (a, b) => (b._count?.members || 0) - (a._count?.members || 0)
    );

    const selected = sorted.slice(0, count);

    for (const tolee of selected) {
      try {
        await prisma.toleeMember.upsert({
          where: {
            userId_toleeId: {
              userId,
              toleeId: tolee.id
            }
          },
          create: {
            userId,
            toleeId: tolee.id,
            status: 'approved',
            role: 'member'
          },
          update: {
            status: 'approved'
          }
        });

        // Add user to the group chat if it exists
        const chat = await prisma.chat.findFirst({
          where: { OR: [{ toleeId: tolee.id }, { name: tolee.name, isGroupChat: true }] }
        });
        if (chat) {
          await prisma.chatParticipant.upsert({
            where: { chatId_userId: { chatId: chat.id, userId } },
            create: { chatId: chat.id, userId },
            update: {}
          });
        }
      } catch (innerErr) {
        console.warn(`[autoJoinDefaultTolees] Could not join tolee ${tolee.id}:`, innerErr);
      }
    }

    return selected;
  } catch (err) {
    console.error('[autoJoinDefaultTolees] Error auto-joining default tolees for user:', userId, err);
    return [];
  }
}
