import { ReelsStream } from '@/components/ReelsStream';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notFound, redirect } from 'next/navigation';
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
        createdAt: true,
        author: { select: { name: true, username: true, isPrivate: true, avatar: true } },
        tolees: { select: { tolee: { select: { isPrivate: true } } } },
      },
    });

    if (post) {
      const isPrivateAuthor = post.author?.isPrivate;
      const isPrivateGroup = post.tolees?.some((t: any) => t.tolee?.isPrivate);

      if (isPrivateAuthor || isPrivateGroup) {
        return {
          title: 'Private Reel | Tolee',
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

      const creatorName = post.author?.name || post.author?.username || 'Creator';
      const captionSnippet = post.caption ? post.caption.replace(/(\r\n|\n|\r)/gm, " ").trim() : 'Watch trending reel';
      const title = `${captionSnippet.slice(0, 60)} | ${creatorName} Reel on Tolee`;
      const description = captionSnippet.slice(0, 160) || `Watch video reel by ${creatorName} on Tolee.`;
      const videoUrl = post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : '';
      const posterImage = post.author?.avatar || 'https://tolee.in/logo.png';

      return {
        title,
        description,
        alternates: {
          canonical: `https://tolee.in/reel/${id}`,
        },
        openGraph: {
          title,
          description,
          url: `https://tolee.in/reel/${id}`,
          siteName: 'Tolee Reels',
          type: 'video.other',
          videos: videoUrl ? [{ url: videoUrl }] : undefined,
          images: [{ url: posterImage }],
        },
        twitter: {
          card: 'player',
          title,
          description,
          images: [posterImage],
        },
        robots: {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          }
        }
      };
    }
  } catch {}
  return { title: 'Reel | Tolee' };
}

export default async function ReelDeepLinkPage({ params }: ReelPageProps) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || null;

  const { id } = params instanceof Promise ? await params : params;

  // Fetch the target reel + a feed of other reels for continued scrolling
  let dbReels: any[] = [];
  let targetPost: any = null;

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

    targetPost = post;

    const isVideo = (p: any) =>
      p && p.mediaUrls && (p.postType === 'reel' || p.mediaTypes?.includes('video'));

    if (post && isVideo(post)) {
      // If private reel and user is not author, protect privacy
      if (post.author?.isPrivate && (!currentUserId || post.authorId !== currentUserId)) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center p-8 bg-card border rounded-3xl space-y-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto text-xl font-bold">🔒</div>
              <h2 className="text-xl font-bold">Private Reel</h2>
              <p className="text-sm text-muted-foreground">This reel is private and only available to approved followers.</p>
            </div>
          </div>
        );
      }

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
    }

    // ── 2. Fetch a batch of other public reels (excluding the target) ──────
    const morePosts = await prisma.post.findMany({
      where: {
        id: { not: id },
        status: 'published',
        visibility: 'public',
        postType: 'reel',
        mediaUrls: { not: null },
        author: { isPrivate: false },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        author: true,
        likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        savedBy: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        reposts: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        comments: { take: 3, orderBy: { createdAt: 'desc' } },
        tolees: { include: { tolee: true } },
        _count: { select: { likes: true, comments: true, reposts: true, views: true } },
      },
    });

    const otherAuthorIds = morePosts.map((p: any) => p.author.id);

    let followedAuthorIds: string[] = [];
    let pendingFollowAuthorIds: string[] = [];
    if (currentUserId && otherAuthorIds.length > 0) {
      const follows = await prisma.follow.findMany({
        where: { followerId: currentUserId, followingId: { in: otherAuthorIds } },
        select: { followingId: true, status: true },
      });
      followedAuthorIds = follows
        .filter((f: any) => f.status === 'approved')
        .map((f: any) => f.followingId);
      pendingFollowAuthorIds = follows
        .filter((f: any) => f.status === 'pending')
        .map((f: any) => f.followingId);
    }

    let authorsWithActiveStories: string[] = [];
    if (otherAuthorIds.length > 0) {
      const activeStories = await prisma.story.findMany({
        where: { authorId: { in: otherAuthorIds }, expiresAt: { gte: new Date() } },
        select: { authorId: true },
      });
      authorsWithActiveStories = activeStories.map((s: any) => s.authorId);
    }

    for (const p of morePosts) {
      if (!p.mediaUrls) continue;
      const firstTolee = p.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? (p.likes as any[])?.length > 0 : false;
      const savedByMe = currentUserId ? (p.savedBy as any[])?.length > 0 : false;
      const repostedByMe = currentUserId ? (p.reposts as any[])?.length > 0 : false;
      const isFollowing = followedAuthorIds.includes(p.author.id);
      const followStatus = isFollowing
        ? 'approved'
        : pendingFollowAuthorIds.includes(p.author.id)
        ? 'pending'
        : null;
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

  const creatorName = targetPost?.author?.name || targetPost?.author?.username || 'Tolee Creator';
  const videoUrl = targetPost?.mediaUrls ? targetPost.mediaUrls.split(/,(?=https?:\/\/)/)[0] : '';

  const jsonLdVideo = targetPost ? {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": targetPost.caption?.slice(0, 100) || `Reel by ${creatorName}`,
    "description": targetPost.caption || `Watch vertical video reel by ${creatorName} on Tolee.`,
    "thumbnailUrl": targetPost.author?.avatar || "https://tolee.in/logo.png",
    "uploadDate": targetPost.createdAt ? new Date(targetPost.createdAt).toISOString() : new Date().toISOString(),
    "contentUrl": videoUrl,
    "embedUrl": `https://tolee.in/reel/${id}`,
    "author": {
      "@type": "Person",
      "name": creatorName,
      "url": targetPost.author?.username ? `https://tolee.in/u/${targetPost.author.username}` : `https://tolee.in`
    },
    "interactionStatistic": {
      "@type": "InteractionCounter",
      "interactionType": "https://schema.org/WatchAction",
      "userInteractionCount": targetPost._count?.views || 0
    }
  } : null;

  const jsonLdBreadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tolee.in"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Reels",
        "item": "https://tolee.in/reels"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": targetPost?.caption ? `${targetPost.caption.slice(0, 30)}...` : `Reel #${id}`,
        "item": `https://tolee.in/reel/${id}`
      }
    ]
  };

  return (
    <>
      {jsonLdVideo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdVideo) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumbs) }}
      />
      <ReelsStream initialReels={dbReels} />
    </>
  );
}
