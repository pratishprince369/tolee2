import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStreamableVideoUrl, getPosterUrl } from '@/lib/media';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { triggerBackgroundReelsPublisherIfNeeded } from '@/lib/reelsBundleAutoPublisher';

export const dynamic = 'force-dynamic';

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function extractVideoFingerprint(url: string | null | undefined): string {
  if (!url) return '';
  const firstUrl = url.split(/,(?=https?:\/\/)/)[0].trim();
  // 1. Google Drive file ID
  const gMatch = firstUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/) || firstUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (gMatch && gMatch[1]) return `gdrive_${gMatch[1]}`;
  // 2. YouTube Shorts / Video ID
  const yMatch = firstUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=))([a-zA-Z0-9_-]{11})/);
  if (yMatch && yMatch[1]) return `yt_${yMatch[1]}`;
  // 3. Normalized direct media URL (removes query strings)
  try {
    const parsed = new URL(firstUrl);
    return `${parsed.host}${parsed.pathname}`.toLowerCase();
  } catch {
    return firstUrl.split('?')[0].toLowerCase();
  }
}

export async function GET(req: NextRequest) {
  // Fire background publisher if needed (throttled) to ensure fresh Google Drive reels are continuously injected
  triggerBackgroundReelsPublisherIfNeeded();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 30);
  const fingerprint = searchParams.get('fingerprint');
  const excludeIdsParam = searchParams.get('excludeIds');

  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || searchParams.get('userId');

  try {
    // 1. Collect IDs already loaded on the client session (Step 16)
    const excludeIdSet = new Set<string>();
    if (excludeIdsParam) {
      excludeIdsParam.split(',').forEach(id => {
        const clean = id.trim();
        if (clean) excludeIdSet.add(clean);
      });
    }

    // 2. Fetch user-specific watch history (Steps 13, 14, 15)
    const viewedReelIds = new Set<string>();
    const viewedVideoFingerprints = new Set<string>();

    if (currentUserId || fingerprint) {
      try {
        const recentViews = await prisma.view.findMany({
          where: {
            contentType: 'reel',
            OR: [
              ...(currentUserId ? [{ viewer_user_id: currentUserId }] : []),
              ...(fingerprint ? [{ device_fingerprint: fingerprint }] : [])
            ]
          },
          select: { contentId: true },
          take: 1000,
          orderBy: { createdAt: 'desc' }
        });
        (recentViews as any[]).forEach((v: any) => {
          if (v.contentId) viewedReelIds.add(v.contentId);
        });

        // Also resolve fingerprints of viewed reels to catch re-uploaded duplicate clips (Step 4 & 5)
        if (viewedReelIds.size > 0) {
          const sampleViewed = Array.from(viewedReelIds).slice(0, 100);
          const viewedPosts = await prisma.post.findMany({
            where: { id: { in: sampleViewed } },
            select: { mediaUrls: true }
          });
          for (const vp of viewedPosts) {
            const fp = extractVideoFingerprint(vp.mediaUrls);
            if (fp) viewedVideoFingerprints.add(fp);
          }
        }
      } catch (err) {
        // Fallback silently if views query fails
      }
    }

    // 3. Also register fingerprints of reels currently displayed in the client's feed
    const sessionVideoFingerprints = new Set<string>();
    if (excludeIdSet.size > 0) {
      const displayedPosts = await prisma.post.findMany({
        where: { id: { in: Array.from(excludeIdSet).slice(0, 60) } },
        select: { mediaUrls: true }
      });
      for (const dp of displayedPosts) {
        const fp = extractVideoFingerprint(dp.mediaUrls);
        if (fp) sessionVideoFingerprints.add(fp);
      }
    }

    // 4. Query candidate reels from Neon DB (Step 17, 33)
    // Prioritize real reels (Google Drive bundles, Apify Instagram, Cloudinary), exclude generic Pexels stock footage
    let candidatePosts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        status: 'published',
        isArchived: false,
        mediaTypes: 'video',
        mediaUrls: { not: null },
        visibility: 'public',
        NOT: [
          { mediaUrls: { contains: '/image/upload/' } },
          { mediaUrls: { contains: 'pexels.com' } }
        ],
        ...(excludeIdSet.size > 0 ? { id: { notIn: Array.from(excludeIdSet) } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: 250, // Large candidate pool ensuring diversity across real bundle & IG reels
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            avatar: true,
            isPrivate: true,
            isVerified: true
          }
        },
        tolees: {
          include: {
            tolee: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerId: true
              }
            }
          }
        },
        _count: {
          select: { likes: true, comments: true, reposts: true, views: true }
        }
      }
    });

    // Fallback if real reels pool is unexpectedly low
    if (candidatePosts.length < limit) {
      const fallbackPosts = await prisma.post.findMany({
        where: {
          postType: 'reel',
          status: 'published',
          isArchived: false,
          mediaTypes: 'video',
          mediaUrls: { not: null },
          visibility: 'public',
          NOT: { mediaUrls: { contains: '/image/upload/' } },
          ...(excludeIdSet.size > 0 ? { id: { notIn: Array.from(excludeIdSet) } } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2,
        include: {
          author: { select: { id: true, name: true, username: true, avatar: true, isPrivate: true, isVerified: true } },
          tolees: { include: { tolee: { select: { id: true, name: true, slug: true, ownerId: true } } } },
          _count: { select: { likes: true, comments: true, reposts: true, views: true } }
        }
      });
      candidatePosts = [...candidatePosts, ...fallbackPosts];
    }

    // 5. Partition candidates into NEVER SEEN vs ALREADY SEEN with video deduplication (Step 14, 15, 30)
    const unseenCandidates: any[] = [];
    const seenCandidates: any[] = [];
    const localVideoFingerprints = new Set<string>();

    for (const post of candidatePosts) {
      const fp = extractVideoFingerprint(post.mediaUrls);
      
      // Skip if this video was already displayed in this user's current feed session
      if (fp && sessionVideoFingerprints.has(fp)) continue;
      // Skip if this video was already included in the current batch
      if (fp && localVideoFingerprints.has(fp)) continue;

      if (fp) localVideoFingerprints.add(fp);

      const isViewed = viewedReelIds.has(post.id) || (fp && viewedVideoFingerprints.has(fp));
      if (isViewed) {
        seenCandidates.push(post);
      } else {
        unseenCandidates.push(post);
      }
    }

    // 6. Controlled prioritization: Demote Pexels stock footage behind real reels + Fisher-Yates uniform shuffle
    const realUnseen = shuffleArray(unseenCandidates.filter(p => !p.mediaUrls?.includes('pexels.com')));
    const pexelsUnseen = shuffleArray(unseenCandidates.filter(p => p.mediaUrls?.includes('pexels.com')));
    const sortedUnseen = [...realUnseen, ...pexelsUnseen];

    const selected: any[] = [];
    for (const post of sortedUnseen) {
      if (selected.length >= limit) break;
      selected.push(post);
    }

    // 7. Step 31: Content exhaustion fallback:
    // If unseen content is fewer than limit, recycle oldest seen content (NOT recently seen)
    if (selected.length < limit && seenCandidates.length > 0) {
      const recycled = seenCandidates.reverse(); // oldest first
      for (const post of recycled) {
        if (selected.length >= limit) break;
        selected.push(post);
      }
    }

    const hasMore = (unseenCandidates.length - selected.length) > 0 || (seenCandidates.length > (limit - selected.length));
    const nextCursor = selected.length > 0 ? selected[selected.length - 1].createdAt.toISOString() : null;

    // 8. Build final stream response data
    const data = selected.map((post: any) => {
      const firstTolee = post.tolees?.[0]?.tolee;
      return {
        id: post.id,
        authorId: post.author.id,
        authorIsPrivate: post.author.isPrivate || false,
        visibility: post.visibility,
        video: getStreamableVideoUrl(post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : ''),
        author: post.author.username || 'creator',
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
        reposts: post._count?.reposts || 0,
        audio: 'Original Audio',
        isVerified: (post.author as any).isVerified || false,
        likedByMe: false,
        savedByMe: false,
        repostedByMe: false,
        resharedByUser: null,
        isFollowing: false,
        followStatus: null,
        location: post.location || null,
        poster: getPosterUrl(post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : ''),
        createdAt: post.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: 'hls',
        audioInfo: 'Original Audio',
      };
    });

    return NextResponse.json({
      success: true,
      data,
      nextCursor,
      hasMore,
      unseenCount: unseenCandidates.length
    });
  } catch (err: any) {
    console.error('[GET /api/reels Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
