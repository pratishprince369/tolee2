export type MatchStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED';

export interface CricketBatsman {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  strikeRate: number;
  isDismissed?: boolean;
  dismissalInfo?: string;
}

export interface CricketBowler {
  name: string;
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
}

export interface CricketInnings {
  teamName: string;
  inningsNumber: number;
  runs: number;
  wickets: number;
  overs: number;
  isDeclared?: boolean;
  batsmen?: CricketBatsman[];
  bowlers?: CricketBowler[];
}

export interface CricketScoreDetails {
  format?: 'T20' | 'ODI' | 'TEST' | 'T10' | 'OTHER';
  innings?: CricketInnings[];
  targetRuns?: number;
  requiredRunRate?: number;
  currentRunRate?: number;
  tossWinner?: string;
  tossDecision?: 'bat' | 'bowl';
  crr?: number;
  rrr?: number;
}

export interface FootballGoalEvent {
  minute: number;
  team: 'home' | 'away';
  player: string;
  isPenalty?: boolean;
  isOwnGoal?: boolean;
}

export interface FootballScoreDetails {
  halfTimeScore?: { home: number; away: number };
  fullTimeScore?: { home: number; away: number };
  extraTimeScore?: { home: number; away: number };
  penaltyScore?: { home: number; away: number };
  goals?: FootballGoalEvent[];
  yellowCards?: { minute: number; team: 'home' | 'away'; player: string }[];
  redCards?: { minute: number; team: 'home' | 'away'; player: string }[];
}

export interface TimelineItem {
  minute?: number | string;
  title: string;
  description?: string;
  type?: 'goal' | 'wicket' | 'card' | 'boundary' | 'substitution' | 'period' | 'general';
  team?: 'home' | 'away';
}

export interface MatchStats {
  [key: string]: string | number | { home: string | number; away: string | number };
}

export interface SportsEventData {
  id: string;
  title: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string | null;
  };
  tournamentId?: string | null;
  tournament?: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
  } | null;
  team1Name: string;
  team1Logo?: string | null;
  team2Name: string;
  team2Logo?: string | null;
  status: MatchStatus;
  eventDate: string | Date;
  startTime?: string | null;
  venue?: string | null;
  city?: string | null;
  country?: string | null;
  homeScore?: string | null;
  awayScore?: string | null;
  currentStatusText?: string | null;
  scoreDetails?: CricketScoreDetails | FootballScoreDetails | any;
  timeline?: TimelineItem[];
  stats?: MatchStats;
  description?: string | null;
  isFeatured: boolean;
  isManual: boolean;
  externalApiId?: string | null;
  apiSource?: string | null;
  categorySlug?: string;
  tournamentName?: string;
}

export interface SportsCategoryData {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  description?: string | null;
  isActive: boolean;
  displayOrder: number;
  eventsCount?: number;
}
