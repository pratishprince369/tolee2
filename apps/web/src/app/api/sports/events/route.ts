import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultSportsCategories } from '@/lib/sports/seed';
import { SportsSyncService } from '@/lib/sports/provider';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await ensureDefaultSportsCategories();

    // Auto-sync real live matches from external sports API if DB has no external matches or cache is stale
    try {
      const nonManualCount = await prisma.sportsEvent.count({ where: { isManual: false } });
      const lastSyncConfig = await prisma.sportsApiConfig.findFirst({
        where: { provider: 'thesportsdb' },
        select: { lastSyncAt: true }
      });

      const isStale = !lastSyncConfig?.lastSyncAt || (Date.now() - new Date(lastSyncConfig.lastSyncAt).getTime() > 3 * 60 * 1000);

      if (nonManualCount === 0) {
        await SportsSyncService.syncExternalSports();
      } else if (isStale) {
        SportsSyncService.syncExternalSports().catch((err) => {
          console.warn('[API Sports Events] Background sync error:', err);
        });
      }
    } catch (syncErr) {
      console.warn('[API Sports Events] Sync check error:', syncErr);
    }

    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get('category');
    const categoryId = searchParams.get('categoryId');
    const status = searchParams.get('status');
    const q = searchParams.get('q')?.trim();
    const dateFilter = searchParams.get('date');
    const featuredOnly = searchParams.get('featured') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    // 1. Category Filter
    if (categorySlug && categorySlug !== 'all') {
      where.category = { slug: categorySlug };
    } else if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    // 2. Status Filter
    if (status && status !== 'all') {
      where.status = status.toUpperCase();
    }

    // 3. Featured Filter
    if (featuredOnly) {
      where.isFeatured = true;
    }

    // 4. Date Filter
    const now = new Date();
    if (dateFilter === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      where.eventDate = { gte: startOfDay, lte: endOfDay };
    } else if (dateFilter === 'upcoming') {
      where.eventDate = { gte: now };
    } else if (dateFilter === 'recent') {
      where.eventDate = { lte: now };
    }

    // 5. Search Keyword
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { team1Name: { contains: q, mode: 'insensitive' } },
        { team2Name: { contains: q, mode: 'insensitive' } },
        { venue: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Determine sorting
    let orderBy: any = [{ status: 'asc' }, { eventDate: 'asc' }];
    if (status === 'COMPLETED' || dateFilter === 'recent') {
      orderBy = [{ eventDate: 'desc' }];
    } else if (status === 'LIVE') {
      orderBy = [{ updatedAt: 'desc' }, { eventDate: 'asc' }];
    }

    const [events, total] = await Promise.all([
      prisma.sportsEvent.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: {
            select: { id: true, name: true, slug: true, icon: true }
          },
          tournament: {
            select: { id: true, name: true, slug: true, logo: true }
          }
        }
      }),
      prisma.sportsEvent.count({ where })
    ]);

    // Live counts overview for top header tabs
    const [liveCount, todayCount, upcomingCount] = await Promise.all([
      prisma.sportsEvent.count({ where: { status: 'LIVE' } }),
      prisma.sportsEvent.count({
        where: {
          eventDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999),
          }
        }
      }),
      prisma.sportsEvent.count({ where: { status: 'UPCOMING' } }),
    ]);

    return NextResponse.json({
      success: true,
      events,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        counts: {
          live: liveCount,
          today: todayCount,
          upcoming: upcomingCount,
        }
      }
    });
  } catch (error: any) {
    console.error('[API Sports Events] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
