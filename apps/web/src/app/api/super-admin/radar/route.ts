import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { revalidatePath } from 'next/cache';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'all';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 25;
  const skip = (page - 1) * limit;

  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeCount, reportedCount, underReviewCount, expiredTodayCount, resolvedCount, removedCount] = await Promise.all([
      prisma.radarPost.count({ where: { status: 'ACTIVE', isDeleted: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } }),
      prisma.radarPost.count({ where: { reportsCount: { gt: 0 }, isDeleted: false } }),
      prisma.radarPost.count({ where: { status: 'UNDER_REVIEW', isDeleted: false } }),
      prisma.radarPost.count({ where: { expiresAt: { gte: startOfToday, lte: now } } }),
      prisma.radarPost.count({ where: { status: 'RESOLVED' } }),
      prisma.radarPost.count({ where: { status: 'REMOVED' } })
    ]);

    let whereClause: any = {};
    if (filter === 'reported') {
      whereClause = { reportsCount: { gt: 0 }, isDeleted: false };
    } else if (filter === 'under_review') {
      whereClause = { status: 'UNDER_REVIEW', isDeleted: false };
    } else if (filter === 'active') {
      whereClause = { status: 'ACTIVE', isDeleted: false, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] };
    } else if (filter === 'resolved') {
      whereClause = { status: 'RESOLVED' };
    } else if (filter === 'removed') {
      whereClause = { OR: [{ status: 'REMOVED' }, { isDeleted: true }] };
    }

    const [posts, total] = await Promise.all([
      prisma.radarPost.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: filter === 'reported' || filter === 'under_review' ? { reportsCount: 'desc' } : { createdAt: 'desc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              radarStrikes: true,
              radarRestrictedUntil: true
            }
          },
          reports: {
            select: {
              id: true,
              reason: true,
              details: true,
              status: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          moderationLogs: {
            select: {
              id: true,
              action: true,
              reason: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        }
      }),
      prisma.radarPost.count({ where: whereClause })
    ]);

    return NextResponse.json({
      success: true,
      metrics: {
        activeCount,
        reportedCount,
        underReviewCount,
        expiredTodayCount,
        resolvedCount,
        removedCount
      },
      posts,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('[SuperAdmin Radar GET error]:', error);
    return NextResponse.json({ error: 'Failed to fetch radar moderation data' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  const decoded = token ? verifySuperAdminToken(token) : null;
  if (!decoded) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { postId, action, reason } = body;

    if (!postId || !action) {
      return NextResponse.json({ error: 'Missing postId or action' }, { status: 400 });
    }

    const post = await prisma.radarPost.findUnique({
      where: { id: postId },
      include: { author: { select: { id: true, radarStrikes: true } } }
    });

    if (!post) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { status: 'ACTIVE', isDeleted: false }
      });
    } else if (action === 'REMOVE' || action === 'HIDE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { isDeleted: true, status: 'REMOVED' }
      });
    } else if (action === 'RESOLVE') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { status: 'RESOLVED', resolvedAt: new Date() }
      });
    } else if (action === 'VERIFY') {
      await prisma.radarPost.update({
        where: { id: postId },
        data: { isVerified: true, verifiedAt: new Date() }
      });
    } else if (action === 'EXTEND_24H') {
      const currentExpiry = post.expiresAt ? new Date(post.expiresAt).getTime() : Date.now();
      const newExpiry = new Date(Math.max(Date.now(), currentExpiry) + 24 * 60 * 60 * 1000);
      await prisma.radarPost.update({
        where: { id: postId },
        data: {
          expiresAt: newExpiry,
          extendedAt: new Date(),
          extensionCount: { increment: 1 }
        }
      });
    } else if (action === 'STRIKE_USER') {
      const newStrikes = (post.author.radarStrikes || 0) + 1;
      let restrictedUntil: Date | null = null;
      if (newStrikes === 2) {
        restrictedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      } else if (newStrikes >= 3) {
        restrictedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      }

      await prisma.user.update({
        where: { id: post.author.id },
        data: {
          radarStrikes: newStrikes,
          ...(restrictedUntil ? { radarRestrictedUntil: restrictedUntil } : {})
        }
      });
    }

    await prisma.radarModerationLog.create({
      data: {
        radarPostId: postId,
        adminId: decoded.email || 'super_admin',
        action,
        reason: reason || `Admin performed ${action}`
      }
    });

    revalidatePath('/radar');
    revalidatePath(`/radar/${postId}`);
    revalidatePath('/super-admin/radar');

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('[SuperAdmin Radar POST error]:', error);
    return NextResponse.json({ error: 'Moderation action failed' }, { status: 500 });
  }
}
