import { DiscoverGrid } from '@/components/DiscoverGrid';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getSimulationSettings, getGroupMemberCount } from '@/lib/simulation';

export default async function DiscoverPage() {
  const session = await getServerSession(authOptions);
  const isAuthenticated = !!session?.user;
  const currentUserId = session?.user ? (session.user as any).id : null;
  
  const simSettings = await getSimulationSettings();
  const isSimOn = simSettings.simulationMode;
  
  let tolees: any[] = [];

  try {
    const dbTolees = await prisma.tolee.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        category: true,
        location: true,
        price: true,
        owner: {
          select: {
            name: true,
            username: true
          }
        },
        members: {
          select: {
            userId: true,
            status: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    tolees = dbTolees.map((t: any, index: number) => {
      const isMember = currentUserId 
        ? t.members.some((m: any) => m.userId === currentUserId && m.status === 'approved')
        : false;
      const isPending = currentUserId
        ? t.members.some((m: any) => m.userId === currentUserId && m.status === 'pending')
        : false;

      const realCount = t.members.filter((m: any) => m.status === 'approved').length;
      const simulatedCount = getGroupMemberCount(t.id, t.name, realCount, isSimOn, simSettings.minGroupMembers, simSettings.maxGroupMembers);

      return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description || 'No description available',
        members: simulatedCount,
        price: t.price === 0 ? 'Free' : `₹${t.price}`,
        category: t.category || 'General',
        location: t.location || '',
        rank: index + 1,
        banner: t.coverImage || '/default-tolee-cover.svg',
        avatar: t.avatar || '/default-tolee-avatar.svg',
        creatorName: t.owner?.name || t.owner?.username || 'Community',
        isJoinedByMe: isMember,
        isPendingByMe: isPending
      };
    });
  } catch (error) {
    console.error("Error loading Discover Page Tolees:", error);
  }

  return (
    <DiscoverGrid 
      initialTolees={tolees} 
      isAuthenticated={isAuthenticated} 
    />
  );
}

