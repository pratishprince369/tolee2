export const dynamic = 'force-dynamic';

import { ToleeView } from '@/components/ToleeView';
import { getToleeBySlug } from '@/actions/tolee';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Suspense } from 'react';

const getValidAvatarUrl = (url: string | null | undefined): string => {
  if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
    return '/default-user-avatar.svg';
  }
  return url;
};

export default async function ToleePage({ params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = session?.user ? (session.user as any).id : null;

  const res = await getToleeBySlug(params.slug);
  let dbTolee = res.tolee;
  
  // Demo Mode for landing page links
  if (!dbTolee && ['tech-titans', 'music-soul', 'artist-hub', 'qa-test-tolee'].includes(params.slug)) {
    dbTolee = {
      id: 'demo-' + params.slug,
      name: params.slug.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' '),
      slug: params.slug,
      description: 'This is a curated demo community to show you the power of Tolee.',
      _count: { members: 1200 },
      price: 0,
      avatar: '/default-tolee-avatar.svg',
      coverImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1200',
      owner: { username: 'Tolee Team' },
      ownerId: 'demo-admin',
      isPrivate: false,
      pendingPostApproval: false,
      rules: '1. Be awesome\n2. Share value\n3. Grow together',
      posts: []
    };
  }

  if (!dbTolee) return notFound();

  // Optimized membership check
  let membershipStatus = null;
  let role = 'member';

  if (currentUserId) {
    const memberRecord = await prisma.toleeMember.findUnique({
      where: {
        userId_toleeId: {
          userId: currentUserId,
          toleeId: dbTolee.id
        }
      }
    });
    if (memberRecord) {
      membershipStatus = memberRecord.status;
      role = memberRecord.role;
    }
  }

  // Fetch real group leaderboard
  const membersWithPoints = await prisma.toleeMember.findMany({
    where: {
      toleeId: dbTolee.id,
      status: 'approved'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true
        }
      }
    },
    orderBy: {
      points: 'desc'
    },
    take: 10
  });

  const realLeaderboard = membersWithPoints.map((m: any) => ({
    id: m.userId,
    name: m.user.name || m.user.username || 'Anonymous User',
    avatar: m.user.avatar || '/default-user-avatar.svg',
    points: m.points,
    level: Math.floor(m.points / 1000) + 1
  }));

  // Fetch real group members list
  const dbMembers = await prisma.toleeMember.findMany({
    where: {
      toleeId: dbTolee.id,
      status: 'approved'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true
        }
      }
    },
    take: 50
  });

  const realMembers = dbMembers.map((m: any) => ({
    id: m.userId,
    name: m.user.name || m.user.username || 'Anonymous User',
    role: m.role === 'admin' ? 'Admin' : m.role === 'moderator' ? 'Moderator' : 'Member',
    avatar: m.user.avatar || '/default-user-avatar.svg'
  }));

  // Fetch pending join requests if current user is owner or admin
  let pendingRequests: any[] = [];
  const isAdminUser = currentUserId && (dbTolee.ownerId === currentUserId || role === 'admin');
  if (isAdminUser) {
    const pendingDbMembers = await prisma.toleeMember.findMany({
      where: {
        toleeId: dbTolee.id,
        status: 'pending'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    pendingRequests = pendingDbMembers.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name || m.user.username || 'Anonymous User',
      username: m.user.username || '',
      avatar: getValidAvatarUrl(m.user.avatar),
      requestedAt: m.createdAt
    }));
  }

  const toleeData = {
    tolee: {
      id: dbTolee.id,
      name: dbTolee.name,
      slug: dbTolee.slug,
      description: dbTolee.description || 'Welcome to this group!',
      membersCount: dbTolee._count.members,
      price: dbTolee.price === 0 ? 'Free' : `₹${dbTolee.price}`,
      avatar: dbTolee.avatar || '/default-tolee-avatar.svg',
      banner: dbTolee.coverImage || '/default-tolee-cover.svg',
      coverImage: dbTolee.coverImage || '',
      admin: { name: dbTolee.owner?.username || 'Admin' },
      isPrivate: dbTolee.isPrivate,
      isPublicVisible: dbTolee.isPublicVisible ?? true,
      pendingPostApproval: dbTolee.pendingPostApproval,
      rules: dbTolee.rules || '1. Be respectful\n2. No spam or self-promotion\n3. Stay on topic',
      category: dbTolee.category || 'general',
      tags: dbTolee.tags || '',
      membershipQuestions: dbTolee.membershipQuestions || '',
      welcomeMessage: dbTolee.welcomeMessage || '',
      isLive: dbTolee.isLive,
      liveHostId: dbTolee.liveHostId,
      liveSessionType: dbTolee.liveSessionType,
      liveStartedAt: dbTolee.liveStartedAt,
      liveViewerCount: dbTolee.liveViewerCount,
      ownerId: dbTolee.ownerId
    },
    posts: dbTolee.posts.map((p: any) => {
      const authorName = p.post.author.username || p.post.author.name || 'Unknown User';
      const likedByMe = currentUserId ? p.post.likes.some((l: any) => l.userId === currentUserId) : false;
      const savedByMe = currentUserId ? p.post.savedBy?.some((s: any) => s.userId === currentUserId) : false;
      const repostedByMe = currentUserId ? p.post.reposts?.some((r: any) => r.userId === currentUserId) : false;
      const repostsCount = p.post._count?.reposts || 0;

      const mostRecentRepost = p.post.reposts?.[0];
      const resharedByUser = mostRecentRepost ? {
        username: mostRecentRepost.user.username,
        name: mostRecentRepost.user.name,
        avatar: getValidAvatarUrl(mostRecentRepost.user.avatar)
      } : null;
      
      const isAnon = !!p.post.isAnonymous;
      const displayAuthor = isAnon ? 'Anonymous' : authorName;
      const displayAvatar = isAnon ? '/default-user-avatar.svg' : getValidAvatarUrl(p.post.author.avatar);

      return {
        id: p.post.id,
        authorId: isAnon ? null : p.post.author.id,
        visibility: p.post.visibility,
        author: displayAuthor,
        authorName: displayAuthor,
        username: isAnon ? 'anonymous' : (p.post.author.username || 'unknown'),
        authorAvatar: displayAvatar,
        avatar: displayAvatar,
        isAnonymous: isAnon,
        content: p.post.caption || '',
        caption: p.post.caption,
        image: p.post.mediaTypes && p.post.mediaTypes.split(',')[0] === 'image' ? p.post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        video: p.post.mediaTypes && p.post.mediaTypes.split(',')[0] === 'video' ? p.post.mediaUrls?.split(/,(?=https?:\/\/)/)[0] : null,
        mediaUrls: p.post.mediaUrls || null,
        mediaTypes: p.post.mediaTypes || null,
        likes: p.post._count.likes,
        comments: p.post._count.comments,
        reposts: repostsCount,
        time: new Date(p.post.createdAt).toLocaleDateString(),
        role: p.post.author.id === dbTolee.ownerId ? 'Admin' : 'Member',
        isWin: p.post.postType === 'win',
        postType: p.post.postType,
        newsRelation: (p.post as any).newsRelation || null,
        worldProjectId: p.post.worldProjectId || null,
        worldProject: p.post.worldProject || null,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser,
        savesCount: p.post.savesCount || p.post._count?.saves || p.post.savedBy?.length || 0,
        createdAt: p.post.createdAt
      };
    }),
    leaderboard: realLeaderboard,
    members: realMembers,
    listings: dbTolee ? (await prisma.listing.findMany({
      where: {
        tolees: {
          some: {
            toleeId: dbTolee.id
          }
        },
        status: 'active'
      },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true
          }
        }
      }
    })).map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description || '',
      price: l.price === 0 ? 'Free' : `₹${l.price.toLocaleString('en-IN')}`,
      seller: l.seller?.name || 'User',
      sellerAvatar: getValidAvatarUrl(l.seller?.avatar),
      sellerUsername: l.seller?.username || '',
      img: l.images?.split(/,(?=https?:\/\/)/)[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80',
      createdAt: l.createdAt
    })) : [],
    membershipStatus,
    role,
    pendingRequests
  };

  // Merge community posts and shared marketplace listings chronologically
  const normalPosts = toleeData.posts || [];
  const listingPosts = toleeData.listings.map((l: any) => ({
    id: l.id,
    isMarketplace: true,
    title: l.title,
    content: l.description || '',
    price: l.price,
    author: l.seller || 'User',
    authorAvatar: l.sellerAvatar || '/default-user-avatar.svg',
    authorUsername: l.sellerUsername || '',
    image: l.img,
    time: new Date(l.createdAt).toLocaleDateString(),
    createdAt: l.createdAt,
    likes: 0,
    comments: 0,
    reposts: 0,
    likedByMe: false,
    savedByMe: false,
    repostedByMe: false,
    resharedByUser: null
  }));

  const unifiedFeed = [...normalPosts, ...listingPosts].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Client/Page level strict headline & ID deduplication
  const seenIds = new Set<string>();
  const seenHeadlines = new Set<string>();
  const uniqueUnifiedFeed = unifiedFeed.filter((item: any) => {
    if (!item || seenIds.has(item.id)) return false;
    const headlineText = item.caption || item.content || item.title || '';
    const key = headlineText.toLowerCase().trim().replace(/[^\w]/g, '').slice(0, 35);
    if (key && seenHeadlines.has(key)) return false;
    seenIds.add(item.id);
    if (key) seenHeadlines.add(key);
    return true;
  });

  toleeData.posts = uniqueUnifiedFeed;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#0a7c85]/20 border-t-[#0a7c85] rounded-full animate-spin" />
      </div>
    }>
      <ToleeView 
        toleeData={toleeData} 
        currentUserId={currentUserId} 
      />
    </Suspense>
  );
}
