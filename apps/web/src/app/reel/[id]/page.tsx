import { ReelsStream } from '@/components/ReelsStream';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ReelPageProps {
  params: Promise<{ id: string }> | { id: string };
}

export async function generateMetadata({ params }: ReelPageProps): Promise<Metadata> {
  const { id } = params instanceof Promise ? await params : params;
  try {
    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        caption: true,
        mediaUrls: true,
        author: { select: { name: true, username: true, isPrivate: true } },
        tolees: { select: { tolee: { select: { isPrivate: true } } } },
      },
    });

    if (post) {
      const isPrivateAuthor = post.author?.isPrivate;
      const isPrivateGroup = post.tolees?.some((t: any) => t.tolee?.isPrivate);

      if (isPrivateAuthor || isPrivateGroup) {
        return {
          title: 'Private Reel – Tolee',
          description: 'This reel is private.',
          robots: {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
              index: false,
              follow: false,
              noimageindex: true,
            }
          }
        };
      }

      const title = `${post.author?.name || post.author?.username || 'Creator'} Reel – Tolee`;
      const description = post.caption?.slice(0, 160) || 'Watch this reel on Tolee';
      const videoUrl = post.mediaUrls ? post.mediaUrls.split(',')[0] : '';

      return {
        title,
        description,
        openGraph: {
          title,
          description,
          url: `https://www.tolee.in/reel/${id}`,
          siteName: 'Tolee Reels',
          type: 'video.other',
          videos: videoUrl ? [{ url: videoUrl }] : undefined,
        },
        twitter: {
          card: 'player',
          title,
          description,
        },
        robots: {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
          }
        }
      };
    }
  } catch {}
  return { title: 'Reel – Tolee' };
}

export default async function ReelDeepLinkPage({ params }: ReelPageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/');
  }

  const { id } = params instanceof Promise ? await params : params;
  const currentUserId = (session?.user as any)?.id;

  // Fetch the target reel + a feed of other reels for continued scrolling
  let dbReels: any[] = [];

  try {
    // ── 1. Fetch the target reel directly ──────────────────────────────────
    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
        likes: { select: { userId: true } },
        savedBy: { select: { userId: true } },
        reposts: { orderBy: { createdAt: 'desc' }, include: { user: true } },
        comments: { take: 3, orderBy: { createdAt: 'desc' } },
        tolees: { include: { tolee: true } },
        _count: { select: { likes: true, comments: true, reposts: true, views: true } },
      },
    });

    const isVideo = (p: any) =>
      p && p.mediaUrls && (p.postType === 'reel' || p.mediaTypes?.includes('video'));

    if (post && isVideo(post)) {
      const firstTolee = post.tolees?.[0]?.tolee;
      const likedByMe = currentUserId
        ? post.likes.some((l: any) => l.userId === currentUserId)
        : false;
      const savedByMe = currentUserId
        ? post.savedBy?.some((s: any) => s.userId === currentUserId)
        : false;
      const repostedByMe = currentUserId
        ? post.reposts?.some((r: any) => r.userId === currentUserId)
        : false;
      const repostsCount = post._count?.reposts || 0;

      let isFollowing = false;
      let followStatus: string | null = null;
      let hasActiveStory = false;

      if (currentUserId) {
        const follow = await prisma.follow.findFirst({
          where: { followerId: currentUserId, followingId: post.author.id },
        });
        if (follow) {
          isFollowing = follow.status === 'approved';
          followStatus = follow.status;
        }
        const story = await prisma.story.findFirst({
          where: { authorId: post.author.id, expiresAt: { gte: new Date() } },
        });
        hasActiveStory = !!story;
      }

      const targetReel = {
        id: post.id,
        authorId: post.author.id,
        authorIsPrivate: post.author.isPrivate || false,
        visibility: post.visibility,
        video: post.mediaUrls.split(/,(?=https?:\/\/)/)[0],
        author: post.author.username || post.author.name || 'creator',
        authorAvatar: post.author.avatar || '/default-user-avatar.svg',
        toleeName: firstTolee?.name || null,
        toleeSlug: firstTolee?.slug || null,
        toleeId: firstTolee?.id || null,
        role: firstTolee?.ownerId === post.author.id ? 'Admin' : 'Member',
        caption: post.caption || '',
        likes: post._count?.likes || 0,
        comments: post._count?.comments || 0,
        views: post._count?.views || 0,
        shares: '0',
        reposts: repostsCount,
        audio: 'Original Audio',
        isVerified: false,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser: null,
        isFollowing,
        followStatus,
        hasActiveStory,
        location: post.location || null,
        subLocation: post.subLocation || null,
        createdAt: post.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: 'mp4',
        audioInfo: 'Original Audio',
      };

      dbReels.push(targetReel);
    } else {
      // Target not found / not a video — render unavailable placeholder
      dbReels.push({
        id,
        isUnavailable: true,
        caption: 'This reel is no longer available.',
        author: 'Unavailable',
        video: '',
        likes: 0,
        comments: 0,
        views: 0,
      });
    }

    // ── 2. Load supporting reels for continued scroll (exclude the target) ──
    const supportingPosts = await prisma.post.findMany({
      where: {
        id: { not: id },
        postType: 'reel',
        isArchived: false,
        status: 'published',
        mediaTypes: { contains: 'video' },
        visibility: 'public',
        author: { isPrivate: false },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        author: { select: { id: true, name: true, username: true, avatar: true, isPrivate: true } },
        likes: { select: { userId: true } },
        savedBy: { select: { userId: true } },
        reposts: { orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, name: true, username: true, avatar: true } } } },
        tolees: { include: { tolee: { select: { id: true, name: true, slug: true, ownerId: true } } } },
        _count: { select: { likes: true, comments: true, reposts: true, views: true } },
      },
    });

    // Batch follow + story lookups for the supporting authors
    const authorIds = supportingPosts.map((p: any) => p.author.id);
    let followedAuthorIds: string[] = [];
    let pendingFollowAuthorIds: string[] = [];
    let authorsWithActiveStories: string[] = [];

    if (currentUserId && authorIds.length > 0) {
      const follows = await prisma.follow.findMany({
        where: { followerId: currentUserId, followingId: { in: authorIds } },
        select: { followingId: true, status: true },
      });
      followedAuthorIds = follows.filter((f: any) => f.status === 'approved').map((f: any) => f.followingId);
      pendingFollowAuthorIds = follows.filter((f: any) => f.status === 'pending').map((f: any) => f.followingId);
    }
    if (authorIds.length > 0) {
      const stories = await prisma.story.findMany({
        where: { authorId: { in: authorIds }, expiresAt: { gte: new Date() } },
        select: { authorId: true },
      });
      authorsWithActiveStories = stories.map((s: any) => s.authorId);
    }

    for (const p of supportingPosts) {
      const firstTolee = p.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? p.likes.some((l: any) => l.userId === currentUserId) : false;
      const savedByMe = currentUserId ? p.savedBy?.some((s: any) => s.userId === currentUserId) : false;
      const repostedByMe = currentUserId ? p.reposts?.some((r: any) => r.userId === currentUserId) : false;
      const isFollowing = followedAuthorIds.includes(p.author.id);
      const followStatus = pendingFollowAuthorIds.includes(p.author.id)
        ? 'pending'
        : isFollowing ? 'approved' : null;
      const hasActiveStory = authorsWithActiveStories.includes(p.author.id);

      dbReels.push({
        id: p.id,
        authorId: p.author.id,
        authorIsPrivate: p.author.isPrivate || false,
        visibility: p.visibility,
        video: p.mediaUrls.split(/,(?=https?:\/\/)/)[0],
        author: p.author.username || p.author.name || 'creator',
        authorAvatar: p.author.avatar || '/default-user-avatar.svg',
        toleeName: firstTolee?.name || null,
        toleeSlug: firstTolee?.slug || null,
        toleeId: firstTolee?.id || null,
        role: firstTolee?.ownerId === p.author.id ? 'Admin' : 'Member',
        caption: p.caption || '',
        likes: p._count?.likes || 0,
        comments: p._count?.comments || 0,
        views: p._count?.views || 0,
        shares: '0',
        reposts: p._count?.reposts || 0,
        audio: 'Original Audio',
        isVerified: false,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser: null,
        isFollowing,
        followStatus,
        hasActiveStory,
        location: p.location || null,
        subLocation: p.subLocation || null,
        createdAt: p.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: p.mediaUrls?.includes('.m3u8') ? 'hls' : 'mp4',
        audioInfo: 'Original Audio',
      });
    }
  } catch (err) {
    console.error('[ReelDeepLinkPage] Error:', err);
  }

  // ReelsStream will treat index 0 as the active reel on mount
  return <ReelsStream initialReels={dbReels} />;
}
