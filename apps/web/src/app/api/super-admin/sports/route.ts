import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { ensureDefaultSportsCategories } from '@/lib/sports/seed';
import { SportsSyncService } from '@/lib/sports/provider';

export const dynamic = 'force-dynamic';

function checkAuth(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  return token && verifySuperAdminToken(token);
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDefaultSportsCategories();

    const [categories, events, apiConfig, stats] = await Promise.all([
      prisma.sportsCategory.findMany({
        orderBy: { displayOrder: 'asc' },
        include: {
          _count: { select: { events: true } }
        }
      }),
      prisma.sportsEvent.findMany({
        orderBy: [{ updatedAt: 'desc' }, { eventDate: 'desc' }],
        take: 100,
        include: {
          category: { select: { id: true, name: true, slug: true } },
          tournament: { select: { id: true, name: true } }
        }
      }),
      prisma.sportsApiConfig.findMany(),
      Promise.all([
        prisma.sportsEvent.count(),
        prisma.sportsEvent.count({ where: { status: 'LIVE' } }),
        prisma.sportsEvent.count({ where: { isManual: true } }),
        prisma.sportsCategory.count(),
      ])
    ]);

    const apiConfigsList = apiConfig as any[] || [];
    const thesportsdbConfig = apiConfigsList.find(c => c.provider === 'thesportsdb') || null;
    const cricketdataConfig = apiConfigsList.find(c => c.provider === 'cricketdata') || null;

    return NextResponse.json({
      success: true,
      categories: categories.map(c => ({
        ...c,
        eventsCount: c._count.events
      })),
      events,
      apiConfig: thesportsdbConfig,
      apiConfigs: {
        thesportsdb: thesportsdbConfig,
        cricketdata: cricketdataConfig,
      },
      stats: {
        totalEvents: stats[0],
        liveEvents: stats[1],
        manualEvents: stats[2],
        totalCategories: stats[3],
      }
    });
  } catch (err: any) {
    console.error('[SuperAdmin Sports GET] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    // 1. Category Operations
    if (action === 'create_category') {
      const { name, slug, icon, description, displayOrder = 0, isActive = true } = body;
      if (!name || !slug) {
        return NextResponse.json({ success: false, error: 'Name and slug are required' }, { status: 400 });
      }

      const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      const category = await prisma.sportsCategory.create({
        data: {
          name,
          slug: cleanSlug,
          icon: icon || 'trophy',
          description,
          displayOrder: parseInt(displayOrder, 10) || 0,
          isActive: Boolean(isActive),
        }
      });
      return NextResponse.json({ success: true, category });
    }

    if (action === 'update_category') {
      const { id, name, slug, icon, description, displayOrder, isActive } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Category ID required' }, { status: 400 });

      const category = await prisma.sportsCategory.update({
        where: { id },
        data: {
          name,
          slug: slug?.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          icon,
          description,
          displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : undefined,
          isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        }
      });
      return NextResponse.json({ success: true, category });
    }

    if (action === 'delete_category') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Category ID required' }, { status: 400 });

      // Check if events exist
      const eventsCount = await prisma.sportsEvent.count({ where: { categoryId: id } });
      if (eventsCount > 0) {
        return NextResponse.json({ 
          success: false, 
          error: `Cannot delete category: ${eventsCount} events are associated with it. Please reassign or delete them first.` 
        }, { status: 400 });
      }

      await prisma.sportsCategory.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (action === 'toggle_category') {
      const { id } = body;
      const cat = await prisma.sportsCategory.findUnique({ where: { id } });
      if (!cat) return NextResponse.json({ success: false, error: 'Category not found' }, { status: 404 });

      const updated = await prisma.sportsCategory.update({
        where: { id },
        data: { isActive: !cat.isActive }
      });
      return NextResponse.json({ success: true, isActive: updated.isActive });
    }

    // 2. Event Operations
    if (action === 'create_event') {
      const { 
        title, categoryId, tournamentName, team1Name, team1Logo, team2Name, team2Logo,
        eventDate, startTime, venue, city, country, status = 'UPCOMING',
        homeScore, awayScore, currentStatusText, scoreDetails, description, isFeatured = false
      } = body;

      if (!title || !categoryId || !team1Name || !team2Name) {
        return NextResponse.json({ success: false, error: 'Title, category, and both team names are required' }, { status: 400 });
      }

      // Find or create tournament if provided
      let tournamentId: string | null = null;
      if (tournamentName && tournamentName.trim()) {
        const tSlug = tournamentName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        const tourney = await prisma.sportsTournament.upsert({
          where: { categoryId_slug: { categoryId, slug: tSlug } },
          update: {},
          create: {
            name: tournamentName.trim(),
            slug: tSlug,
            categoryId,
          }
        });
        tournamentId = tourney.id;
      }

      const event = await prisma.sportsEvent.create({
        data: {
          title,
          categoryId,
          tournamentId,
          team1Name,
          team1Logo: team1Logo || null,
          team2Name,
          team2Logo: team2Logo || null,
          eventDate: eventDate ? new Date(eventDate) : new Date(),
          startTime: startTime || null,
          venue: venue || null,
          city: city || null,
          country: country || null,
          status: status.toUpperCase(),
          homeScore: homeScore || null,
          awayScore: awayScore || null,
          currentStatusText: currentStatusText || null,
          scoreDetails: scoreDetails || null,
          description: description || null,
          isFeatured: Boolean(isFeatured),
          isManual: true,
          apiSource: 'manual',
        }
      });
      return NextResponse.json({ success: true, event });
    }

    if (action === 'update_event') {
      const { 
        id, title, categoryId, team1Name, team1Logo, team2Name, team2Logo,
        eventDate, startTime, venue, city, country, status,
        homeScore, awayScore, currentStatusText, scoreDetails, description, isFeatured
      } = body;

      if (!id) return NextResponse.json({ success: false, error: 'Event ID required' }, { status: 400 });

      const event = await prisma.sportsEvent.update({
        where: { id },
        data: {
          title,
          categoryId,
          team1Name,
          team1Logo,
          team2Name,
          team2Logo,
          eventDate: eventDate ? new Date(eventDate) : undefined,
          startTime,
          venue,
          city,
          country,
          status: status ? status.toUpperCase() : undefined,
          homeScore,
          awayScore,
          currentStatusText,
          scoreDetails,
          description,
          isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
        }
      });
      return NextResponse.json({ success: true, event });
    }

    if (action === 'update_score') {
      const { id, homeScore, awayScore, currentStatusText, status } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Event ID required' }, { status: 400 });

      const updated = await prisma.sportsEvent.update({
        where: { id },
        data: {
          homeScore: homeScore !== undefined ? homeScore : undefined,
          awayScore: awayScore !== undefined ? awayScore : undefined,
          currentStatusText: currentStatusText !== undefined ? currentStatusText : undefined,
          status: status ? status.toUpperCase() : undefined,
        }
      });
      return NextResponse.json({ success: true, event: updated });
    }

    if (action === 'delete_event') {
      const { id } = body;
      if (!id) return NextResponse.json({ success: false, error: 'Event ID required' }, { status: 400 });

      await prisma.sportsEvent.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    // 3. Save API Config (TheSportsDB or CricketData)
    if (action === 'save_api_config') {
      const { provider, apiKey, isEnabled, autoSyncIntervalMinutes } = body;
      if (!provider) return NextResponse.json({ success: false, error: 'Provider is required' }, { status: 400 });

      const config = await prisma.sportsApiConfig.upsert({
        where: { provider },
        update: {
          apiKey: apiKey !== undefined ? apiKey.trim() : undefined,
          isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : undefined,
          autoSyncIntervalMinutes: autoSyncIntervalMinutes ? parseInt(autoSyncIntervalMinutes, 10) : undefined,
        },
        create: {
          provider,
          apiKey: apiKey ? apiKey.trim() : null,
          isEnabled: isEnabled !== undefined ? Boolean(isEnabled) : true,
          autoSyncIntervalMinutes: autoSyncIntervalMinutes ? parseInt(autoSyncIntervalMinutes, 10) : 15,
        }
      });
      return NextResponse.json({ success: true, config });
    }

    // 4. Trigger External Sports Sync
    if (action === 'sync_api') {
      const result = await SportsSyncService.syncExternalSports();
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('[SuperAdmin Sports POST] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
