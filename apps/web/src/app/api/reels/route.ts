import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStreamableVideoUrl, getPosterUrl } from '@/lib/media';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { triggerBackgroundReelsPublisherIfNeeded } from '@/lib/reelsBundleAutoPublisher';
import { isKnownUnplayable } from '@/lib/videoHealth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function encodeCursor(post: { id: string; createdAt: Date }): string {
  const iso = new Date(post.createdAt).toISOString();
  return `${iso}_${post.id}`;
}

export function parseCursor(cursorStr: string | null | undefined): { cursorDate: Date; cursorId: string } | null {
  if (!cursorStr) return null;
  try {
    const idx = cursorStr.lastIndexOf('_');
    if (idx !== -1) {
      const datePart = cursorStr.slice(0, idx);
      const idPart = cursorStr.slice(idx + 1);
      const d = new Date(datePart);
      if (!isNaN(d.getTime()) && idPart) {
        return { cursorDate: d, cursorId: idPart };
      }
    }
    const rawDate = new Date(cursorStr);
    if (!isNaN(rawDate.getTime())) {
      return { cursorDate: rawDate, cursorId: '' };
    }
  } catch {}
  return null;
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

// Interleave posts round-robin by author so consecutive reels switch creators & categories
function interleaveByAuthor(items: any[]): any[] {
  const byAuthor = new Map<string, any[]>();
  for (const item of items) {
    const key = item.author?.username || 'general';
    if (!byAuthor.has(key)) byAuthor.set(key, []);
    byAuthor.get(key)!.push(item);
  }
  const buckets = Array.from(byAuthor.values());
  const result: any[] = [];
  let maxLen = 0;
  for (const b of buckets) {
    if (b.length > maxLen) maxLen = b.length;
  }
  for (let i = 0; i < maxLen; i++) {
    for (const b of buckets) {
      if (i < b.length) result.push(b[i]);
    }
  }
  return result;
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  // Fire background publisher if needed (throttled) to ensure fresh Google Drive reels are continuously injected
  triggerBackgroundReelsPublisherIfNeeded();

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 30);
  const cursorParam = searchParams.get('cursor');
  const fingerprint = searchParams.get('fingerprint');
  const excludeIdsParam = searchParams.get('excludeIds');

  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || searchParams.get('userId');

  try {
    // 1. Collect IDs already loaded on the client session to prevent same-session duplicate delivery
    const excludeIdSet = new Set<string>();
    if (excludeIdsParam) {
      excludeIdsParam.split(',').forEach(id => {
        const clean = id.trim();
        if (clean) excludeIdSet.add(clean);
      });
    }

    // 2. Fetch user-specific watch history for anti-repetition ranking
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
          take: 500,
          orderBy: { createdAt: 'desc' }
        });
        (recentViews as any[]).forEach((v: any) => {
          if (v.contentId) viewedReelIds.add(v.contentId);
        });

        if (viewedReelIds.size > 0) {
          const sampleViewed = Array.from(viewedReelIds).slice(0, 80);
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
        // Fallback silently if views query encounters temporary DB glitch
      }
    }

    // 3. Register fingerprints of reels currently displayed in the client's session
    const sessionVideoFingerprints = new Set<string>();
    if (excludeIdSet.size > 0) {
      const displayedPosts = await prisma.post.findMany({
        where: { id: { in: Array.from(excludeIdSet).slice(0, 50) } },
        select: { mediaUrls: true }
      });
      for (const dp of displayedPosts) {
        const fp = extractVideoFingerprint(dp.mediaUrls);
        if (fp) sessionVideoFingerprints.add(fp);
      }
    }

    // 4. Parse keyset cursor (createdAt + tie-breaker ID)
    const parsedCursor = parseCursor(cursorParam);
    const cursorFilter = parsedCursor ? (
      parsedCursor.cursorId ? {
        OR: [
          { createdAt: { lt: parsedCursor.cursorDate } },
          { createdAt: parsedCursor.cursorDate, id: { lt: parsedCursor.cursorId } }
        ]
      } : {
        createdAt: { lt: parsedCursor.cursorDate }
      }
    ) : {};

    // 5. Query candidate reels from Neon PostgreSQL
    // Buffer query size (limit * 3) to allow filtering unplayable/duplicate sources without running short
    const fetchSize = Math.max(limit * 3, 30);
    const candidatePosts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        status: 'published',
        isArchived: false,
        mediaTypes: 'video',
        mediaUrls: { not: null },
        visibility: 'public',
        OR: [
          { sourceValidation: null },
          { sourceValidation: { validationStatus: 'READY' } }
        ],
        NOT: [
          { mediaUrls: { contains: '/image/upload/' } },
          { mediaUrls: { contains: 'pexels.com' } },
          { caption: { contains: '#ai_' } },
          { caption: { contains: '#ai ' } },
          { caption: { contains: '#ai\n' } }
        ],
        ...cursorFilter
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      take: fetchSize,
      include: {
        sourceValidation: {
          select: {
            validationStatus: true,
            consecutiveFailureCount: true,
            sourceType: true,
            sourceFileId: true
          }
        },
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
        likes: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        savedBy: currentUserId ? { where: { userId: currentUserId }, select: { userId: true } } : false,
        reposts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            userId: true,
            user: { select: { id: true, name: true, username: true, avatar: true } }
          }
        },
        _count: {
          select: { likes: true, comments: true, reposts: true, views: true }
        }
      }
    });

    // 6. Filter invalid sources and partition into UNSEEN vs SEEN (with zero in-batch video duplicates)
    const unseenCandidates: any[] = [];
    const seenCandidates: any[] = [];
    const localVideoFingerprints = new Set<string>();

    for (const post of candidatePosts) {
      if (post.sourceValidation && post.sourceValidation.validationStatus !== 'READY') continue;
      if (isKnownUnplayable(post.mediaUrls)) continue;
      if (excludeIdSet.has(post.id)) continue;

      const fp = extractVideoFingerprint(post.mediaUrls);
      if (fp && sessionVideoFingerprints.has(fp)) continue;
      if (fp && localVideoFingerprints.has(fp)) continue;
      if (fp) localVideoFingerprints.add(fp);

      const isViewed = viewedReelIds.has(post.id) || (fp && viewedVideoFingerprints.has(fp));
      if (isViewed) {
        seenCandidates.push(post);
      } else {
        unseenCandidates.push(post);
      }
    }

    // 7. Creator Diversity: Interleave round-robin across authors so consecutive reels feature different creators
    const interleavedUnseen = interleaveByAuthor(unseenCandidates);
    const selected: any[] = [];

    for (const post of interleavedUnseen) {
      if (selected.length >= limit) break;
      selected.push(post);
    }

    // If unseen content in this keyset window is less than limit, backfill with seen items from the SAME window (never jump back to page 1)
    if (selected.length < limit && seenCandidates.length > 0) {
      const interleavedSeen = interleaveByAuthor(seenCandidates);
      for (const post of interleavedSeen) {
        if (selected.length >= limit) break;
        selected.push(post);
      }
    }

    // Determine pagination status and stable nextCursor
    const hasMore = candidatePosts.length === fetchSize;
    // Derive nextCursor from the last evaluated DB row so pagination advances monotonically through the database
    const nextCursor = candidatePosts.length > 0 ? encodeCursor(candidatePosts[candidatePosts.length - 1]) : null;

    // Follow relationships for authenticated user
    const authorIds = selected.map(p => p.author?.id).filter(Boolean);
    let followedAuthorIds = new Set<string>();
    let pendingFollowAuthorIds = new Set<string>();
    if (currentUserId && authorIds.length > 0) {
      try {
        const follows = await prisma.follow.findMany({
          where: {
            followerId: currentUserId,
            followingId: { in: authorIds }
          },
          select: { followingId: true, status: true }
        });
        follows.forEach((f: any) => {
          if (f.status === 'approved') followedAuthorIds.add(f.followingId);
          if (f.status === 'pending') pendingFollowAuthorIds.add(f.followingId);
        });
      } catch {}
    }

    // 8. Build final stream response data
    const data = selected.map((post: any) => {
      const firstTolee = post.tolees?.[0]?.tolee;
      const likedByMe = currentUserId ? (post.likes && post.likes.length > 0) : false;
      const savedByMe = currentUserId ? (post.savedBy && post.savedBy.length > 0) : false;
      const repostedByMe = currentUserId ? (post.reposts && post.reposts.some((r: any) => r.userId === currentUserId)) : false;
      const repostsCount = post._count?.reposts || 0;
      const mostRecentRepost = post.reposts?.[0];
      const resharedByUser = mostRecentRepost ? {
        username: mostRecentRepost.user.username,
        name: mostRecentRepost.user.name,
        avatar: mostRecentRepost.user.avatar || '/default-user-avatar.svg'
      } : null;

      const isFollowing = followedAuthorIds.has(post.author.id);
      const followStatus = pendingFollowAuthorIds.has(post.author.id) 
        ? 'pending' 
        : (isFollowing ? 'approved' : null);

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
        reposts: repostsCount,
        audio: 'Original Audio',
        isVerified: (post.author as any).isVerified || false,
        likedByMe,
        savedByMe,
        repostedByMe,
        resharedByUser,
        isFollowing,
        followStatus,
        location: post.location || null,
        poster: getPosterUrl(post.mediaUrls ? post.mediaUrls.split(/,(?=https?:\/\/)/)[0] : ''),
        createdAt: post.createdAt,
        duration: 15,
        aspectRatio: '9:16',
        videoType: 'hls',
        audioInfo: 'Original Audio',
      };
    });

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data,
      items: data, // standard alias
      nextCursor,
      hasMore,
      meta: {
        returned: data.length,
        hasMore,
        unseenCount: unseenCandidates.length,
        executionTimeMs: elapsedMs
      }
    }, {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    console.error('[GET /api/reels Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
