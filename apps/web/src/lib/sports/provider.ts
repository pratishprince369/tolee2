import { prisma } from '@/lib/prisma';
import { SportsEventData, MatchStatus } from './types';
import { ensureDefaultSportsCategories } from './seed';

// ---------------------------------------------------------------------------
// 1. TheSportsDB Free API Provider (Base: https://www.thesportsdb.com/free_sports_api)
// ---------------------------------------------------------------------------
const DEFAULT_SPORTSDB_KEY = process.env.THESPORTSDB_API_KEY || '123';
const THESPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${DEFAULT_SPORTSDB_KEY}`;

export interface SportsDataProvider {
  name: string;
  fetchLiveMatches(): Promise<Partial<SportsEventData>[]>;
  fetchUpcomingMatches(): Promise<Partial<SportsEventData>[]>;
  fetchPastMatches(): Promise<Partial<SportsEventData>[]>;
}

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
    if (!data) return [];

    const items = data.livescore || data.events || [];
    if (!Array.isArray(items)) return [];

    return items.map((e: any) => this.mapLiveScoreEvent(e));
  }

  async fetchUpcomingMatches(): Promise<Partial<SportsEventData>[]> {
    const allMatches: Partial<SportsEventData>[] = [];
    const today = new Date().toISOString().split('T')[0];

    // 1. Fetch today's schedule
    const dayData = await this.fetchJson(`/eventsday.php?d=${today}`);
    if (dayData && dayData.events && Array.isArray(dayData.events)) {
      allMatches.push(...dayData.events.map((e: any) => this.mapStandardEvent(e, 'UPCOMING')));
    }

    // 2. Fetch upcoming matches across major world leagues + Cricket leagues
    // 4328: Premier League, 4335: La Liga, 4332: Serie A, 4331: Bundesliga, 4480: Champions League,
    // 4387: NBA, 4370: Formula 1, 4460: IPL, 4479: T20 World Cup, 4483: Big Bash League
    const leagueIds = [4328, 4335, 4332, 4331, 4480, 4387, 4370, 4460, 4479, 4483];

    for (const lid of leagueIds) {
      const data = await this.fetchJson(`/eventsnextleague.php?id=${lid}`);
      if (data && data.events && Array.isArray(data.events)) {
        allMatches.push(...data.events.map((e: any) => this.mapStandardEvent(e, 'UPCOMING')));
      }
    }

    return allMatches;
  }

  async fetchPastMatches(): Promise<Partial<SportsEventData>[]> {
    const leagueIds = [4328, 4335, 4332, 4331, 4480, 4387, 4370, 4460, 4479];
    const allMatches: Partial<SportsEventData>[] = [];

    for (const lid of leagueIds) {
      const data = await this.fetchJson(`/eventspastleague.php?id=${lid}`);
      if (data && data.events && Array.isArray(data.events)) {
        allMatches.push(...data.events.map((e: any) => this.mapStandardEvent(e, 'COMPLETED')));
      }
    }
    return allMatches;
  }

  private mapSportCategory(strSport?: string): string {
    const s = (strSport || '').toLowerCase();
    if (s.includes('cricket')) return 'cricket';
    if (s.includes('soccer') || s.includes('football')) return 'football';
    if (s.includes('basket')) return 'basketball';
    if (s.includes('tennis')) return 'tennis';
    if (s.includes('motor') || s.includes('formula') || s.includes('racing')) return 'formula-1';
    if (s.includes('mma') || s.includes('ufc') || s.includes('fighting')) return 'mma';
    if (s.includes('boxing')) return 'boxing';
    if (s.includes('hockey')) return 'hockey';
    if (s.includes('badminton')) return 'badminton';
    if (s.includes('volleyball')) return 'volleyball';
    if (s.includes('table tennis')) return 'table-tennis';
    if (s.includes('wwe') || s.includes('wrestling')) return 'wwe';
    if (s.includes('esport')) return 'esports';
    if (s.includes('kabaddi')) return 'kabaddi';
    return 'other-sports';
  }

  private mapStatus(rawStatus?: string, defaultStatus: MatchStatus = 'UPCOMING'): MatchStatus {
    const s = (rawStatus || '').toUpperCase();
    if (s === 'NS') return 'UPCOMING';
    if (s.includes('LIVE') || s.includes('1H') || s.includes('2H') || s.includes('HT') || s.includes('ET') || s.includes('Q1') || s.includes('Q2') || s.includes('Q3') || s.includes('Q4') || s.includes('OT') || s.includes('INNINGS')) {
      return 'LIVE';
    }
    if (s.includes('FT') || s.includes('AET') || s.includes('FIN') || s.includes('POST')) {
      return 'COMPLETED';
    }
    if (s.includes('POSTP') || s.includes('PST')) return 'POSTPONED';
    if (s.includes('CANC') || s.includes('ABAN') || s.includes('INT')) return 'CANCELLED';
    return defaultStatus;
  }

  private parseEventDate(dateStr?: string, timeStr?: string, timestamp?: string): Date {
    if (timestamp) {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) return d;
    }
    if (dateStr) {
      const combined = timeStr ? `${dateStr}T${timeStr.includes(':') ? timeStr : timeStr + ':00'}` : `${dateStr}T00:00:00Z`;
      const d = new Date(combined);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  }

  private mapLiveScoreEvent(e: any): Partial<SportsEventData> {
    const status = this.mapStatus(e.strStatus, e.strProgress ? 'LIVE' : 'UPCOMING');
    const categorySlug = this.mapSportCategory(e.strSport);
    const eventDate = this.parseEventDate(e.dateEvent, e.strEventTime || e.strTime, e.strTimestamp);

    const homeTeam = e.strHomeTeam || 'Team 1';
    const awayTeam = e.strAwayTeam || 'Team 2';

    return {
      title: `${homeTeam} vs ${awayTeam}`,
      team1Name: homeTeam,
      team1Logo: e.strHomeTeamBadge || null,
      team2Name: awayTeam,
      team2Logo: e.strAwayTeamBadge || null,
      homeScore: e.intHomeScore != null ? String(e.intHomeScore) : null,
      awayScore: e.intAwayScore != null ? String(e.intAwayScore) : null,
      currentStatusText: e.strProgress || (status === 'LIVE' ? 'Live' : (status === 'COMPLETED' ? 'Full Time' : '')),
      eventDate,
      startTime: e.strEventTime || (e.strTimestamp ? e.strTimestamp.substring(11, 16) : null),
      status,
      categorySlug,
      tournamentName: e.strLeague || null,
      externalApiId: `tsdb-live-${e.idLiveScore || e.idEvent}`,
      apiSource: 'thesportsdb',
    };
  }

  private mapStandardEvent(e: any, defaultStatus: MatchStatus): Partial<SportsEventData> {
    const status = this.mapStatus(e.strStatus, defaultStatus);
    const categorySlug = this.mapSportCategory(e.strSport);
    const eventDate = this.parseEventDate(e.dateEvent, e.strTime, e.strTimestamp);

    const homeTeam = e.strHomeTeam || 'Team 1';
    const awayTeam = e.strAwayTeam || 'Team 2';

    return {
      title: e.strEvent || `${homeTeam} vs ${awayTeam}`,
      team1Name: homeTeam,
      team1Logo: e.strHomeTeamBadge || null,
      team2Name: awayTeam,
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
      categorySlug,
      tournamentName: e.strLeague || null,
      externalApiId: `tsdb-${e.idEvent}`,
      apiSource: 'thesportsdb',
      description: e.strDescriptionEN || null,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. CricketData.org API Provider (https://cricketdata.org / api.cricapi.com)
// ---------------------------------------------------------------------------
export class CricketDataProvider implements SportsDataProvider {
  name = 'cricketdata';

  private async getApiKey(): Promise<string | null> {
    if (process.env.CRICKETDATA_API_KEY && process.env.CRICKETDATA_API_KEY.trim()) {
      return process.env.CRICKETDATA_API_KEY.trim();
    }
    try {
      const config = await prisma.sportsApiConfig.findUnique({
        where: { provider: 'cricketdata' }
      });
      return config?.apiKey?.trim() || null;
    } catch {
      return null;
    }
  }

  private async fetchJson(endpoint: string) {
    const apiKey = await this.getApiKey();
    if (!apiKey) return null;

    try {
      const url = `https://api.cricapi.com/v1${endpoint}${endpoint.includes('?') ? '&' : '?'}apikey=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, {
        next: { revalidate: 60 },
        headers: { 'Accept': 'application/json' },
      });
      if (!res.ok) return null;
      return await res.json();
    } catch (err) {
      console.warn(`[CricketData] Network error fetching ${endpoint}:`, err);
      return null;
    }
  }

  async fetchLiveMatches(): Promise<Partial<SportsEventData>[]> {
    const allMatches: Partial<SportsEventData>[] = [];

    // 1. Try cricScore endpoint
    const cricScoreData = await this.fetchJson('/cricScore');
    if (cricScoreData && cricScoreData.status === 'success' && Array.isArray(cricScoreData.data)) {
      const liveItems = cricScoreData.data.filter((m: any) => m.ms === 'live');
      allMatches.push(...liveItems.map((m: any) => this.mapCricScoreEvent(m, 'LIVE')));
    }

    // 2. Fallback to currentMatches
    const currentMatchesData = await this.fetchJson('/currentMatches?offset=0');
    if (currentMatchesData && currentMatchesData.status === 'success' && Array.isArray(currentMatchesData.data)) {
      const liveItems = currentMatchesData.data.filter((m: any) => m.matchStarted && !m.matchEnded);
      for (const m of liveItems) {
        if (!allMatches.some(x => x.externalApiId === `cricdata-${m.id}`)) {
          allMatches.push(this.mapCurrentMatchEvent(m, 'LIVE'));
        }
      }
    }

    return allMatches;
  }

  async fetchUpcomingMatches(): Promise<Partial<SportsEventData>[]> {
    const allMatches: Partial<SportsEventData>[] = [];

    const cricScoreData = await this.fetchJson('/cricScore');
    if (cricScoreData && cricScoreData.status === 'success' && Array.isArray(cricScoreData.data)) {
      const upcomingItems = cricScoreData.data.filter((m: any) => m.ms === 'fixture');
      allMatches.push(...upcomingItems.map((m: any) => this.mapCricScoreEvent(m, 'UPCOMING')));
    }

    const currentMatchesData = await this.fetchJson('/currentMatches?offset=0');
    if (currentMatchesData && currentMatchesData.status === 'success' && Array.isArray(currentMatchesData.data)) {
      const upcomingItems = currentMatchesData.data.filter((m: any) => !m.matchStarted);
      for (const m of upcomingItems) {
        if (!allMatches.some(x => x.externalApiId === `cricdata-${m.id}`)) {
          allMatches.push(this.mapCurrentMatchEvent(m, 'UPCOMING'));
        }
      }
    }

    return allMatches;
  }

  async fetchPastMatches(): Promise<Partial<SportsEventData>[]> {
    const allMatches: Partial<SportsEventData>[] = [];

    const cricScoreData = await this.fetchJson('/cricScore');
    if (cricScoreData && cricScoreData.status === 'success' && Array.isArray(cricScoreData.data)) {
      const pastItems = cricScoreData.data.filter((m: any) => m.ms === 'result');
      allMatches.push(...pastItems.map((m: any) => this.mapCricScoreEvent(m, 'COMPLETED')));
    }

    const currentMatchesData = await this.fetchJson('/currentMatches?offset=0');
    if (currentMatchesData && currentMatchesData.status === 'success' && Array.isArray(currentMatchesData.data)) {
      const endedItems = currentMatchesData.data.filter((m: any) => m.matchEnded);
      for (const m of endedItems) {
        if (!allMatches.some(x => x.externalApiId === `cricdata-${m.id}`)) {
          allMatches.push(this.mapCurrentMatchEvent(m, 'COMPLETED'));
        }
      }
    }

    return allMatches;
  }

  private mapCricScoreEvent(m: any, defaultStatus: MatchStatus): Partial<SportsEventData> {
    let status: MatchStatus = defaultStatus;
    if (m.ms === 'live') status = 'LIVE';
    else if (m.ms === 'result') status = 'COMPLETED';
    else if (m.ms === 'fixture') status = 'UPCOMING';

    const eventDate = m.dateTimeGMT ? new Date(m.dateTimeGMT) : new Date();

    return {
      title: `${m.t1 || 'Team 1'} vs ${m.t2 || 'Team 2'}`,
      team1Name: m.t1 || 'Team 1',
      team1Logo: m.t1img || null,
      team2Name: m.t2 || 'Team 2',
      team2Logo: m.t2img || null,
      homeScore: m.t1s || null, // e.g. "180/4 (18.2)"
      awayScore: m.t2s || null,
      currentStatusText: m.status || (status === 'LIVE' ? 'Live' : (status === 'COMPLETED' ? 'Match Ended' : '')),
      eventDate,
      startTime: m.dateTimeGMT ? m.dateTimeGMT.substring(11, 16) : null,
      status,
      categorySlug: 'cricket',
      tournamentName: m.series || (m.matchType ? `${m.matchType.toUpperCase()} Series` : 'Cricket Match'),
      externalApiId: `cricdata-${m.id}`,
      apiSource: 'cricketdata',
    };
  }

  private mapCurrentMatchEvent(m: any, defaultStatus: MatchStatus): Partial<SportsEventData> {
    let status: MatchStatus = defaultStatus;
    if (m.matchStarted && !m.matchEnded) status = 'LIVE';
    else if (m.matchEnded) status = 'COMPLETED';
    else if (!m.matchStarted) status = 'UPCOMING';

    const teams = m.teams || [];
    const team1Name = (m.teamInfo && m.teamInfo[0]?.name) || teams[0] || 'Team 1';
    const team2Name = (m.teamInfo && m.teamInfo[1]?.name) || teams[1] || 'Team 2';
    const team1Logo = (m.teamInfo && m.teamInfo[0]?.img) || null;
    const team2Logo = (m.teamInfo && m.teamInfo[1]?.img) || null;

    let homeScore: string | null = null;
    let awayScore: string | null = null;
    const inningsList: any[] = [];

    if (Array.isArray(m.score)) {
      m.score.forEach((sc: any, idx: number) => {
        const scoreStr = `${sc.r}/${sc.w} (${sc.o})`;
        if (idx === 0) homeScore = scoreStr;
        else if (idx === 1) awayScore = scoreStr;

        inningsList.push({
          teamName: sc.inning || (idx === 0 ? team1Name : team2Name),
          inningsNumber: idx + 1,
          runs: sc.r,
          wickets: sc.w,
          overs: sc.o,
        });
      });
    }

    const eventDate = m.dateTimeGMT ? new Date(m.dateTimeGMT) : (m.date ? new Date(m.date) : new Date());

    return {
      title: m.name || `${team1Name} vs ${team2Name}`,
      team1Name,
      team1Logo,
      team2Name,
      team2Logo,
      homeScore,
      awayScore,
      currentStatusText: m.status || (status === 'LIVE' ? 'Live' : ''),
      eventDate,
      startTime: m.dateTimeGMT ? m.dateTimeGMT.substring(11, 16) : null,
      venue: m.venue || null,
      status,
      categorySlug: 'cricket',
      tournamentName: m.matchType ? `${m.matchType.toUpperCase()} Match` : 'Cricket Match',
      scoreDetails: {
        format: (m.matchType || '').toUpperCase(),
        innings: inningsList,
      },
      externalApiId: `cricdata-${m.id}`,
      apiSource: 'cricketdata',
    };
  }
}

// ---------------------------------------------------------------------------
// 3. Unified Sports Sync Service
// ---------------------------------------------------------------------------
export class SportsSyncService {
  private static theSportsDbProvider: SportsDataProvider = new TheSportsDBProvider();
  private static cricketDataProvider: SportsDataProvider = new CricketDataProvider();

  public static async syncExternalSports(): Promise<{
    success: boolean;
    syncedCount: number;
    thesportsdbCount: number;
    cricketdataCount: number;
    message?: string;
  }> {
    await ensureDefaultSportsCategories();

    try {
      // 1. Fetch categories map for slug matching
      const categories = await prisma.sportsCategory.findMany();
      const catMap = new Map(categories.map(c => [c.slug, c.id]));
      const defaultCatId = catMap.get('other-sports') || catMap.get('football') || categories[0]?.id;

      if (!defaultCatId) {
        return { success: false, syncedCount: 0, thesportsdbCount: 0, cricketdataCount: 0, message: 'No sports categories found' };
      }

      // 2. Fetch matches concurrently from both TheSportsDB and CricketData.org
      const [
        tsdbLive, tsdbUpcoming, tsdbPast,
        cricLive, cricUpcoming, cricPast
      ] = await Promise.all([
        this.theSportsDbProvider.fetchLiveMatches().catch(() => []),
        this.theSportsDbProvider.fetchUpcomingMatches().catch(() => []),
        this.theSportsDbProvider.fetchPastMatches().catch(() => []),
        this.cricketDataProvider.fetchLiveMatches().catch(() => []),
        this.cricketDataProvider.fetchUpcomingMatches().catch(() => []),
        this.cricketDataProvider.fetchPastMatches().catch(() => []),
      ]);

      const tsdbFetched = [...tsdbLive, ...tsdbUpcoming, ...tsdbPast];
      const cricFetched = [...cricLive, ...cricUpcoming, ...cricPast];
      const allFetched = [...tsdbFetched, ...cricFetched];

      const seenIds = new Set<string>();
      let syncedCount = 0;
      let thesportsdbCount = 0;
      let cricketdataCount = 0;

      for (const item of allFetched) {
        if (!item.externalApiId || !item.team1Name || !item.team2Name) continue;
        if (seenIds.has(item.externalApiId)) continue;
        seenIds.add(item.externalApiId);

        // Check if event already exists
        const existing = await prisma.sportsEvent.findUnique({
          where: { externalApiId: item.externalApiId }
        });

        // NEVER overwrite manual events customized by super admin
        if (existing && existing.isManual) {
          continue;
        }

        // Determine category ID from sport
        const categoryId = (item.categorySlug && catMap.get(item.categorySlug)) || defaultCatId;

        // Find or create tournament if provided
        let tournamentId: string | null = null;
        if (item.tournamentName && item.tournamentName.trim()) {
          const tName = item.tournamentName.trim();
          const tSlug = tName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          const existingTourn = await prisma.sportsTournament.findUnique({ where: { slug: tSlug } });
          if (existingTourn) {
            tournamentId = existingTourn.id;
          } else {
            const newTourn = await prisma.sportsTournament.create({
              data: {
                name: tName,
                slug: tSlug,
                categoryId,
              }
            });
            tournamentId = newTourn.id;
          }
        }

        if (existing) {
          // Update live score, status and timing
          await prisma.sportsEvent.update({
            where: { id: existing.id },
            data: {
              status: item.status || existing.status,
              homeScore: item.homeScore !== undefined ? item.homeScore : existing.homeScore,
              awayScore: item.awayScore !== undefined ? item.awayScore : existing.awayScore,
              currentStatusText: item.currentStatusText || existing.currentStatusText,
              scoreDetails: item.scoreDetails || existing.scoreDetails,
              tournamentId: tournamentId || existing.tournamentId,
              lastApiSyncAt: new Date(),
            }
          });
          syncedCount++;
          if (item.apiSource === 'cricketdata') cricketdataCount++;
          else thesportsdbCount++;
        } else {
          // Insert new fixture
          await prisma.sportsEvent.create({
            data: {
              title: item.title || `${item.team1Name} vs ${item.team2Name}`,
              categoryId,
              tournamentId,
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
              scoreDetails: item.scoreDetails,
              isManual: false,
              externalApiId: item.externalApiId,
              apiSource: item.apiSource || 'thesportsdb',
              lastApiSyncAt: new Date(),
            }
          });
          syncedCount++;
          if (item.apiSource === 'cricketdata') cricketdataCount++;
          else thesportsdbCount++;
        }
      }

      // Update last sync records in SportsApiConfig
      await Promise.all([
        prisma.sportsApiConfig.upsert({
          where: { provider: 'thesportsdb' },
          update: { lastSyncAt: new Date() },
          create: {
            provider: 'thesportsdb',
            isEnabled: true,
            lastSyncAt: new Date(),
          }
        }),
        prisma.sportsApiConfig.upsert({
          where: { provider: 'cricketdata' },
          update: { lastSyncAt: new Date() },
          create: {
            provider: 'cricketdata',
            isEnabled: true,
            lastSyncAt: new Date(),
          }
        })
      ]);

      return { success: true, syncedCount, thesportsdbCount, cricketdataCount };
    } catch (err: any) {
      console.error('[SportsSyncService] Error during sync:', err);
      return { success: false, syncedCount: 0, thesportsdbCount: 0, cricketdataCount: 0, message: err.message };
    }
  }
}
