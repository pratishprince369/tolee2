import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { validateExistingPendingReels, validatePostVideoSource } from '@/lib/videoValidationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    // Allow super-admin or admin
    if (userRole !== 'super_admin' && userRole !== 'admin' && process.env.NODE_ENV === 'production') {
      const authHeader = req.headers.get('authorization');
      const secret = new URL(req.url).searchParams.get('secret');
      const envSecret = process.env.CRON_SECRET || 'tolee-cron-agentic-secret-key-2026';
      if (secret !== envSecret && authHeader !== `Bearer ${envSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const [
      totalReels,
      readyCount,
      invalidCount,
      tempUnavailableCount,
      pendingCount,
      recentValidations,
      accountBreakdown,
    ] = await Promise.all([
      prisma.post.count({ where: { postType: 'reel' } }),
      prisma.reelSourceValidation.count({ where: { validationStatus: 'READY' } }),
      prisma.reelSourceValidation.count({ where: { validationStatus: 'INVALID' } }),
      prisma.reelSourceValidation.count({ where: { validationStatus: 'TEMPORARILY_UNAVAILABLE' } }),
      prisma.post.count({
        where: {
          postType: 'reel',
          isArchived: false,
          sourceValidation: null,
        },
      }),
      prisma.reelSourceValidation.findMany({
        take: 20,
        orderBy: { lastValidatedAt: 'desc' },
        include: {
          post: {
            select: {
              caption: true,
              author: { select: { username: true } },
            },
          },
        },
      }),
      prisma.post.groupBy({
        by: ['authorId'],
        where: { postType: 'reel', isSimulation: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalReels,
        readyCount,
        invalidCount,
        tempUnavailableCount,
        pendingCount,
      },
      recentValidations: recentValidations.map((v) => ({
        id: v.id,
        postId: v.postId,
        caption: v.post?.caption?.slice(0, 40),
        author: v.post?.author?.username,
        sourceType: v.sourceType,
        sourceFileId: v.sourceFileId,
        status: v.validationStatus,
        lastValidatedAt: v.lastValidatedAt,
        failureCount: v.consecutiveFailureCount,
        reason: v.lastFailureReason,
      })),
      accountBreakdown,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'validate_batch';
    const postId = searchParams.get('postId');

    if (action === 'revalidate_single' && postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, mediaUrls: true, mediaPublicIds: true },
      });
      if (!post || !post.mediaUrls) {
        return NextResponse.json({ success: false, error: 'Post or media not found' }, { status: 404 });
      }
      const res = await validatePostVideoSource(post.id, post.mediaUrls, post.mediaPublicIds || undefined);
      return NextResponse.json({ success: true, result: res });
    }

    const res = await validateExistingPendingReels(30);
    return NextResponse.json({ success: true, ...res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
