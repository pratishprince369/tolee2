import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const tab = searchParams.get('tab') || 'analytics';
    const sortBy = searchParams.get('sortBy') || 'subscribers';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    if (tab === 'analytics') {
      const [
        totalVideos, publishedVideos, draftVideos, liveVideos,
        totalCreators, verifiedCreators, simulatedVideos,
        totalSubscriptions, totalReports, flaggedVideos, removedVideos,
        totalViews, totalLikes, totalComments,
        totalPlatformViews, totalSpamViews, totalPendingViews, spamReasons
      ] = await Promise.all([
        prisma.screenVideo.count().catch(() => 0),
        prisma.screenVideo.count({ where: { status: 'published' } }).catch(() => 0),
        prisma.screenVideo.count({ where: { status: 'draft' } }).catch(() => 0),
        prisma.screenVideo.count({ where: { isLive: true } }).catch(() => 0),
        prisma.screenVideo.groupBy({ by: ['userId'] }).then((r: any) => r.length).catch(() => 0),
        prisma.user.count({ where: { isVerified: true, screenVideos: { some: {} } } }).catch(() => 0),
        prisma.screenVideo.count({ where: { isSimulation: true } }).catch(() => 0),
        prisma.subscription.count().catch(() => 0),
        prisma.screenVideoReport.count().catch(() => 0),
        prisma.screenVideo.count({ where: { moderationStatus: 'flagged' } }).catch(() => 0),
        prisma.screenVideo.count({ where: { moderationStatus: 'removed' } }).catch(() => 0),
        prisma.screenVideo.aggregate({ _sum: { viewsCount: true } }).then((r: any) => r._sum.viewsCount || 0).catch(() => 0),
        prisma.screenVideo.aggregate({ _sum: { likesCount: true } }).then((r: any) => r._sum.likesCount || 0).catch(() => 0),
        prisma.screenVideoComment.count().catch(() => 0),
        prisma.videoPlaybackSession.count({ where: { isVerified: true } }).catch(() => 0),
        prisma.videoPlaybackSession.count({ where: { isSpam: true } }).catch(() => 0),
        prisma.videoPlaybackSession.count({ where: { isVerified: false, isSpam: false } }).catch(() => 0),
        prisma.videoPlaybackSession.groupBy({
          by: ['spamReason'],
          _count: { id: true },
          where: { isSpam: true }
        }).catch(() => [])
      ]);

      // Top 5 categories
      const categoryBreakdown = await prisma.screenVideo.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10
      }).catch(() => []);

      // Recent uploads (last 7 days)
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      const recentUploads = await prisma.screenVideo.count({
        where: { createdAt: { gte: weekAgo } }
      }).catch(() => 0);

      return NextResponse.json({
        analytics: {
          totalVideos, publishedVideos, draftVideos, liveVideos,
          totalCreators, verifiedCreators, simulatedVideos,
          totalSubscriptions, totalReports, flaggedVideos, removedVideos,
          totalViews, totalLikes, totalComments, recentUploads,
          categoryBreakdown: categoryBreakdown.map((c: any) => ({
            category: c.category,
            count: c._count.id
          })),
          estimatedWatchHours: Math.round((totalViews as number) * 4.2 / 3600),
          avgRetention: 62.4, // placeholder
          totalPlatformViews,
          totalSpamViews,
          totalPendingViews,
          spamReasons: (spamReasons as any[]).map((r: any) => ({
            reason: r.spamReason || 'UNKNOWN',
            count: r._count.id
          }))
        }
      });
    }

    if (tab === 'moderation') {
      const reports = await prisma.screenVideoReport.findMany({
        where: { status: 'pending' },
        include: {
          video: {
            select: {
              id: true, title: true, thumbnailUrl: true, mediaUrl: true,
              viewsCount: true, reportedCount: true, moderationStatus: true,
              spamLabel: true, nsfwScore: true, spamScore: true, violenceScore: true,
              createdAt: true,
              user: { select: { id: true, name: true, username: true, avatar: true, isVerified: true } }
            }
          },
          reporter: {
            select: { id: true, name: true, username: true, avatar: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit
      });

      const totalPending = await prisma.screenVideoReport.count({ where: { status: 'pending' } });

      // Group reports by video for easier display
      const videoReportMap: Record<string, any> = {};
      for (const report of reports) {
        if (!videoReportMap[report.videoId]) {
          videoReportMap[report.videoId] = {
            video: report.video,
            reports: [],
            totalReports: report.video.reportedCount
          };
        }
        videoReportMap[report.videoId].reports.push({
          id: report.id,
          reason: report.reason,
          description: report.description,
          reporter: report.reporter,
          createdAt: report.createdAt
        });
      }

      return NextResponse.json({
        moderation: {
          items: Object.values(videoReportMap),
          totalPending,
          pages: Math.ceil(totalPending / limit)
        }
      });
    }

    if (tab === 'leaderboard') {
      // Get creators with their stats
      const creators = await prisma.user.findMany({
        where: { screenVideos: { some: {} } },
        select: {
          id: true, name: true, username: true, avatar: true, isVerified: true,
          createdAt: true,
          _count: {
            select: {
              screenVideos: true,
              subscribers: true,
              followers: true
            }
          },
          screenVideos: {
            select: { viewsCount: true, likesCount: true, duration: true }
          }
        },
        take: 100
      });

      const leaderboard = creators.map((c: any) => {
        const totalViews = c.screenVideos.reduce((a: number, v: any) => a + v.viewsCount, 0);
        const totalLikes = c.screenVideos.reduce((a: number, v: any) => a + v.likesCount, 0);
        const totalDuration = c.screenVideos.reduce((a: number, v: any) => a + (v.duration || 0), 0);
        const watchHours = Math.round(totalViews * 4.2 / 3600);

        return {
          id: c.id,
          name: c.name,
          username: c.username,
          avatar: c.avatar,
          isVerified: c.isVerified,
          joinedAt: c.createdAt,
          videosCount: c._count.screenVideos,
          subscriberCount: c._count.subscribers,
          followerCount: c._count.followers,
          totalViews,
          totalLikes,
          watchHours,
          totalDuration: Math.round(totalDuration / 60), // minutes
          growthPercent: Math.round(Math.random() * 35 + 5) // placeholder
        };
      });

      // Sort by requested field
      leaderboard.sort((a: any, b: any) => {
        if (sortBy === 'views') return b.totalViews - a.totalViews;
        if (sortBy === 'watchHours') return b.watchHours - a.watchHours;
        if (sortBy === 'videos') return b.videosCount - a.videosCount;
        if (sortBy === 'growth') return b.growthPercent - a.growthPercent;
        return b.subscriberCount - a.subscriberCount; // default: subscribers
      });

      return NextResponse.json({
        leaderboard: leaderboard.slice(0, 100)
      });
    }

    return NextResponse.json({ error: 'Invalid tab' }, { status: 400 });
  } catch (err) {
    console.error('Tolee Screen admin error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST - Moderation actions on videos
 */
export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { action, videoId, reason } = await req.json();

    if (!videoId || !action) {
      return NextResponse.json({ error: 'Missing videoId or action' }, { status: 400 });
    }

    const video = await prisma.screenVideo.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    switch (action) {
      case 'approve':
        await prisma.screenVideo.update({
          where: { id: videoId },
          data: { moderationStatus: 'clean', spamLabel: null }
        });
        // Mark all reports as reviewed
        await prisma.screenVideoReport.updateMany({
          where: { videoId, status: 'pending' },
          data: { status: 'reviewed' }
        });
        break;

      case 'hide':
        await prisma.screenVideo.update({
          where: { id: videoId },
          data: { moderationStatus: 'flagged', visibility: 'private' }
        });
        await prisma.screenVideoReport.updateMany({
          where: { videoId, status: 'pending' },
          data: { status: 'reviewed' }
        });
        break;

      case 'remove':
        await prisma.screenVideo.update({
          where: { id: videoId },
          data: { moderationStatus: 'removed', visibility: 'private' }
        });
        await prisma.screenVideoReport.updateMany({
          where: { videoId, status: 'pending' },
          data: { status: 'reviewed' }
        });
        // Notify creator
        await prisma.notification.create({
          data: {
            userId: video.userId,
            type: 'video_removed',
            message: `⚠️ Your video "${video.title}" has been removed for violating community guidelines.`,
            link: `/screen/studio`
          }
        });
        break;

      case 'age_restrict':
        await prisma.screenVideo.update({
          where: { id: videoId },
          data: { moderationStatus: 'age_restricted' }
        });
        await prisma.screenVideoReport.updateMany({
          where: { videoId, status: 'pending' },
          data: { status: 'reviewed' }
        });
        break;

      case 'warn_creator':
        await prisma.notification.create({
          data: {
            userId: video.userId,
            type: 'creator_warning',
            message: `⚠️ Warning: Your video "${video.title}" has received multiple reports. ${reason || 'Please ensure your content follows community guidelines.'}`,
            link: `/screen/studio`
          }
        });
        break;

      case 'dismiss':
        await prisma.screenVideoReport.updateMany({
          where: { videoId, status: 'pending' },
          data: { status: 'dismissed' }
        });
        await prisma.screenVideo.update({
          where: { id: videoId },
          data: { moderationStatus: 'clean', reportedCount: 0 }
        });
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, action });
  } catch (err) {
    console.error('Moderation action error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
