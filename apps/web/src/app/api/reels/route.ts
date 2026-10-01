import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getStreamableVideoUrl, getPosterUrl } from '@/lib/media';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 30);
  const cursor = searchParams.get('cursor');

  try {
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
      take: limit + 1,
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

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : null;

    const data = items.map(post => {
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
