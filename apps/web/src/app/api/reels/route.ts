import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStreamableVideoUrl, getPosterUrl } from '@/lib/media';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 30);
  const cursor = searchParams.get('cursor');
  const fingerprint = searchParams.get('fingerprint');

  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id || searchParams.get('userId');

  try {
    // 1. Fetch user-specific watch history (Steps 13, 14, 15)
    let viewedReelIds = new Set<string>();
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
        viewedReelIds = new Set((recentViews as any[]).map((v: any) => v.contentId));
      } catch (err) {
        // Fallback silently if views query fails
      }
    }

    // 2. Query candidates from Neon DB
    const poolSize = cursor ? limit + 1 : 50;
    const posts = await prisma.post.findMany({
      where: {
        postType: 'reel',
        status: 'published',
        isArchived: false,
        mediaTypes: 'video',
        mediaUrls: { not: null },
        visibility: 'public',
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: poolSize,
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

    let items: typeof posts = [];
    let nextCursor: string | null = null;
    let hasMore = false;

    if (!cursor) {
      // STEPS 14, 15, 30, 31: Split into NEVER SEEN vs ALREADY SEEN
      const unseen = (posts as any[]).filter((p: any) => !viewedReelIds.has(p.id));
      const seen = (posts as any[]).filter((p: any) => viewedReelIds.has(p.id));

      // Controlled shuffle of the top unseen candidates so returning users never see identical order
      const sortedUnseen = unseen.sort((a: any, b: any) => {
        const aIsDrive = a.mediaUrls && (a.mediaUrls.includes('drive.usercontent.google.com') || a.mediaUrls.includes('drive.google.com'));
        const bIsDrive = b.mediaUrls && (b.mediaUrls.includes('drive.usercontent.google.com') || b.mediaUrls.includes('drive.google.com'));
        // Fast CDN reels take top priority
        if (aIsDrive && !bIsDrive) return 1;
        if (!aIsDrive && bIsDrive) return -1;
        // Micro-randomization within same tier to keep fresh experience
        return 0.5 - Math.random();
      });

      // If unseen is sufficient, use unseen; otherwise backfill with least recently seen (Step 31)
      const selected = sortedUnseen.slice(0, limit);
      if (selected.length < limit && seen.length > 0) {
        const remaining = limit - selected.length;
        selected.push(...seen.slice(0, remaining));
      }

      items = selected.length > 0 ? selected : posts.slice(0, limit);
      hasMore = posts.length > items.length;
      nextCursor = items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;
    } else {
      // Normal cursor pagination
      hasMore = posts.length > limit;
      items = hasMore ? posts.slice(0, limit) : posts;
      nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;
    }

    const data = (items as any[]).map((post: any) => {
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
      data,
      nextCursor,
      hasMore
    });
  } catch (err: any) {
    console.error('[GET /api/reels Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
