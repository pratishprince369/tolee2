import { prisma } from '@/lib/prisma';
import { SportsEventData, MatchStatus } from './types';
import { ensureDefaultSportsCategories } from './seed';

const THESPORTSDB_BASE = 'https://www.thesportsdb.com/api/v1/json/3';

export interface SportsDataProvider {
  name: string;
  fetchLiveMatches(): Promise<Partial<SportsEventData>[]>;
  fetchUpcomingMatches(sportSlug?: string): Promise<Partial<SportsEventData>[]>;
  fetchPastMatches(sportSlug?: string): Promise<Partial<SportsEventData>[]>;
}

// Resilient public sports API provider using TheSportsDB free tier
export class TheSportsDBProvider implements SportsDataProvider {
  name = 'thesportsdb';

  private async fetchJson(endpoint: string) {
    try {
      const res = await fetch(`${THESPORTSDB_BASE}${endpoint}`, {
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[SportsAPI] Network error fetching ${endpoint}:`, err);
      return null;
    }
  }

  async fetchLiveMatches(): Promise<Partial<SportsEventData>[]> {
    // TheSportsDB livescore endpoint
    const data = await this.fetchJson('/livescore.php');
    if (!data || !data.events || !Array.isArray(data.events)) return [];

    return data.events.map((e: any) => this.mapEvent(e, 'LIVE'));
  }

  async fetchUpcomingMatches(sport: string = 'Cricket'): Promise<Partial<SportsEventData>[]> {
    // Next 15 events in popular leagues (e.g. IPL 4460, Premier League 4328)
    const leagueIds = [4460, 4328, 4387, 4391]; // IPL, EPL, NBA, Tennis
    const allMatches: Partial<SportsEventData>[] = [];

    for (const lid of leagueIds) {
      const data = await this.fetchJson(`/eventsnextleague.php?id=${lid}`);
      if (data && data.events && Array.isArray(data.events)) {
        allMatches.push(...data.events.map((e: any) => this.mapEvent(e, 'UPCOMING')));
      }
    }
    return allMatches;
  }

  async fetchPastMatches(): Promise<Partial<SportsEventData>[]> {
    const leagueIds = [4460, 4328, 4387];
    const allMatches: Partial<SportsEventData>[] = [];

    for (const lid of leagueIds) {
      const data = await this.fetchJson(`/eventspastleague.php?id=${lid}`);
      if (data && data.events && Array.isArray(data.events)) {
        allMatches.push(...data.events.map((e: any) => this.mapEvent(e, 'COMPLETED')));
      }
    }
    return allMatches;
  }

  private mapEvent(e: any, defaultStatus: MatchStatus): Partial<SportsEventData> {
    const strSport = (e.strSport || '').toLowerCase();
    let categorySlug = 'other-sports';
    if (strSport.includes('cricket')) categorySlug = 'cricket';
    else if (strSport.includes('soccer') || strSport.includes('football')) categorySlug = 'football';
    else if (strSport.includes('basket')) categorySlug = 'basketball';
    else if (strSport.includes('tennis')) categorySlug = 'tennis';
    else if (strSport.includes('motor') || strSport.includes('formula')) categorySlug = 'formula-1';
    else if (strSport.includes('mma') || strSport.includes('ufc')) categorySlug = 'mma';
    else if (strSport.includes('hockey')) categorySlug = 'hockey';

    // Status detection
    let status: MatchStatus = defaultStatus;
    const rawStatus = (e.strStatus || '').toUpperCase();
    if (rawStatus.includes('LIVE') || rawStatus.includes('1H') || rawStatus.includes('2H') || rawStatus.includes('INNINGS')) {
      status = 'LIVE';
    } else if (rawStatus.includes('FT') || rawStatus.includes('AET') || rawStatus.includes('FIN')) {
      status = 'COMPLETED';
    } else if (rawStatus.includes('POSTP')) {
      status = 'POSTPONED';
    } else if (rawStatus.includes('CANC')) {
      status = 'CANCELLED';
    }

    const eventDate = e.dateEvent ? new Date(`${e.dateEvent}T${e.strTime || '00:00:00'}Z`) : new Date();

    return {
      title: e.strEvent || `${e.strHomeTeam || 'Team 1'} vs ${e.strAwayTeam || 'Team 2'}`,
      team1Name: e.strHomeTeam || 'Team 1',
      team1Logo: e.strHomeTeamBadge || null,
      team2Name: e.strAwayTeam || 'Team 2',
      team2Logo: e.strAwayTeamBadge || null,
      homeScore: e.intHomeScore != null ? String(e.intHomeScore) : null,
      awayScore: e.intAwayScore != null ? String(e.intAwayScore) : null,
      currentStatusText: e.strProgress || e.strStatus || (status === 'LIVE' ? 'Live' : ''),
      eventDate,
      startTime: e.strTime ? e.strTime.substring(0, 5) : null,
      venue: e.strVenue || null,
      city: e.strCity || null,
      country: e.strCountry || null,
      status,
      externalApiId: e.idEvent ? `tsdb-${e.idEvent}` : undefined,
      apiSource: 'thesportsdb',
      description: e.strDescriptionEN || null,
    };
  }
}

// Master Sports Sync Service
export class SportsSyncService {
  private static provider: SportsDataProvider = new TheSportsDBProvider();

  public static async syncExternalSports(): Promise<{ success: boolean; syncedCount: number; message?: string }> {
    await ensureDefaultSportsCategories();

    try {
      // 1. Fetch categories map for slug matching
      const categories = await prisma.sportsCategory.findMany();
      const catMap = new Map(categories.map(c => [c.slug, c.id]));
      const defaultCatId = catMap.get('cricket') || categories[0]?.id;

      if (!defaultCatId) {
        return { success: false, syncedCount: 0, message: 'No sports categories found' };
      }

      // 2. Fetch live & upcoming matches from provider
      const [liveMatches, upcomingMatches] = await Promise.all([
        this.provider.fetchLiveMatches().catch(() => []),
        this.provider.fetchUpcomingMatches().catch(() => []),
      ]);

      const allFetched = [...liveMatches, ...upcomingMatches];
      let syncedCount = 0;

      for (const item of allFetched) {
        if (!item.externalApiId || !item.team1Name || !item.team2Name) continue;

        // Check if event already exists
        const existing = await prisma.sportsEvent.findUnique({
          where: { externalApiId: item.externalApiId }
        });

        // NEVER overwrite manual events customized by super admin
        if (existing && existing.isManual) {
          continue;
        }

        const categoryId = defaultCatId;

        if (existing) {
          // Update live score and status only
          await prisma.sportsEvent.update({
            where: { id: existing.id },
            data: {
              status: item.status || existing.status,
              homeScore: item.homeScore || existing.homeScore,
              awayScore: item.awayScore || existing.awayScore,
              currentStatusText: item.currentStatusText || existing.currentStatusText,
              lastApiSyncAt: new Date(),
            }
          });
          syncedCount++;
        } else {
          // Insert new fixture
          await prisma.sportsEvent.create({
            data: {
              title: item.title || `${item.team1Name} vs ${item.team2Name}`,
              categoryId,
              team1Name: item.team1Name,
              team1Logo: item.team1Logo,
              team2Name: item.team2Name,
              team2Logo: item.team2Logo,
              status: item.status || 'UPCOMING',
              eventDate: item.eventDate ? new Date(item.eventDate) : new Date(),
              startTime: item.startTime,
              venue: item.venue,
              city: item.city,
              country: item.country,
              homeScore: item.homeScore,
              awayScore: item.awayScore,
              currentStatusText: item.currentStatusText,
              isManual: false,
              externalApiId: item.externalApiId,
              apiSource: item.apiSource || 'thesportsdb',
              lastApiSyncAt: new Date(),
            }
          });
          syncedCount++;
        }
      }

      // Update SportsApiConfig record
      await prisma.sportsApiConfig.upsert({
        where: { provider: 'thesportsdb' },
        update: { lastSyncAt: new Date() },
        create: {
          provider: 'thesportsdb',
          isEnabled: true,
          lastSyncAt: new Date(),
        }
      });

      return { success: true, syncedCount };
    } catch (err: any) {
      console.error('[SportsSyncService] Error during sync:', err);
      return { success: false, syncedCount: 0, message: err.message };
    }
  }
}
