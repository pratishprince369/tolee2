import { prisma } from '@/lib/prisma';

export const DEFAULT_SPORTS_CATEGORIES = [
  { name: 'Cricket', slug: 'cricket', icon: 'cricket', displayOrder: 1, description: 'International & Domestic Cricket, IPL, World Cups' },
  { name: 'Football', slug: 'football', icon: 'futbol', displayOrder: 2, description: 'Premier League, UEFA Champions League, ISL, FIFA' },
  { name: 'Basketball', slug: 'basketball', icon: 'basketball', displayOrder: 3, description: 'NBA, EuroLeague, FIBA World Championship' },
  { name: 'Tennis', slug: 'tennis', icon: 'tennis', displayOrder: 4, description: 'Grand Slams, ATP Tour, WTA Tour' },
  { name: 'Kabaddi', slug: 'kabaddi', icon: 'trophy', displayOrder: 5, description: 'Pro Kabaddi League, World Cup & National Championships' },
  { name: 'Badminton', slug: 'badminton', icon: 'target', displayOrder: 6, description: 'BWF Super Series, All England, Thomas Cup' },
  { name: 'Hockey', slug: 'hockey', icon: 'shield', displayOrder: 7, description: 'FIH Pro League, Hockey World Cup, National Tournaments' },
  { name: 'Formula 1', slug: 'formula-1', icon: 'flag', displayOrder: 8, description: 'F1 Grand Prix World Championship' },
  { name: 'MMA', slug: 'mma', icon: 'swords', displayOrder: 9, description: 'UFC, ONE Championship, Mixed Martial Arts' },
  { name: 'Boxing', slug: 'boxing', icon: 'flame', displayOrder: 10, description: 'WBC, WBA, IBF World Boxing Championships' },
  { name: 'Volleyball', slug: 'volleyball', icon: 'circle-dot', displayOrder: 11, description: 'FIVB World League, Prime Volleyball League' },
  { name: 'Golf', slug: 'golf', icon: 'award', displayOrder: 12, description: 'PGA Tour, Masters, The Open Championship' },
  { name: 'Baseball', slug: 'baseball', icon: 'baseball', displayOrder: 13, description: 'MLB Major League Baseball, World Baseball Classic' },
  { name: 'Rugby', slug: 'rugby', icon: 'shield', displayOrder: 14, description: 'Rugby World Cup, Six Nations, Super Rugby' },
  { name: 'Esports', slug: 'esports', icon: 'gamepad-2', displayOrder: 15, description: 'BGMI, Valorant, CS2, League of Legends' },
  { name: 'Other Sports', slug: 'other-sports', icon: 'activity', displayOrder: 16, description: 'Athletics, Swimming, Chess, Table Tennis, and Regional sports' },
];

export async function ensureDefaultSportsCategories() {
  try {
    const existingCount = await prisma.sportsCategory.count();
    if (existingCount === 0) {
      console.log('[Sports Seed] No categories found. Seeding default sports categories...');
      for (const cat of DEFAULT_SPORTS_CATEGORIES) {
        await prisma.sportsCategory.upsert({
          where: { slug: cat.slug },
          update: {},
          create: {
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            displayOrder: cat.displayOrder,
            description: cat.description,
            isActive: true,
          },
        });
      }
      console.log('[Sports Seed] Default sports categories seeded successfully.');
    }

    // If no events exist, seed initial sample matches
    const eventCount = await prisma.sportsEvent.count();
    if (eventCount === 0) {
      const cricket = await prisma.sportsCategory.findUnique({ where: { slug: 'cricket' } });
      const football = await prisma.sportsCategory.findUnique({ where: { slug: 'football' } });
      const kabaddi = await prisma.sportsCategory.findUnique({ where: { slug: 'kabaddi' } });

      const now = new Date();

      if (cricket) {
        await prisma.sportsEvent.create({
          data: {
            title: 'India vs Australia - 3rd T20I',
            categoryId: cricket.id,
            team1Name: 'India',
            team1Logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=100&auto=format&fit=crop&q=60',
            team2Name: 'Australia',
            team2Logo: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=100&auto=format&fit=crop&q=60',
            status: 'LIVE',
            eventDate: now,
            startTime: '19:00',
            venue: 'Wankhede Stadium',
            city: 'Mumbai',
            country: 'India',
            homeScore: '184/3',
            awayScore: '180/7',
            currentStatusText: 'Live: Over 18.4 • India need 12 runs in 8 balls',
            isFeatured: true,
            isManual: true,
            scoreDetails: {
              format: 'T20',
              innings: [
                {
                  teamName: 'Australia',
                  inningsNumber: 1,
                  runs: 180,
                  wickets: 7,
                  overs: 20.0,
                  batsmen: [
                    { name: 'David Warner', runs: 58, balls: 38, fours: 6, sixes: 2, strikeRate: 152.6, dismissalInfo: 'c Rohit b Bumrah' },
                    { name: 'Travis Head', runs: 42, balls: 24, fours: 5, sixes: 2, strikeRate: 175.0, dismissalInfo: 'b Kuldeep' },
                    { name: 'Glenn Maxwell', runs: 31, balls: 16, fours: 2, sixes: 3, strikeRate: 193.7, dismissalInfo: 'c Pant b Siraj' }
                  ],
                  bowlers: [
                    { name: 'Jasprit Bumrah', overs: 4, maidens: 0, runs: 24, wickets: 3, economy: 6.00 },
                    { name: 'Kuldeep Yadav', overs: 4, maidens: 0, runs: 32, wickets: 2, economy: 8.00 },
                    { name: 'Mohammed Siraj', overs: 4, maidens: 0, runs: 38, wickets: 1, economy: 9.50 }
                  ]
                },
                {
                  teamName: 'India',
                  inningsNumber: 2,
                  runs: 184,
                  wickets: 3,
                  overs: 18.4,
                  batsmen: [
                    { name: 'Rohit Sharma (c)', runs: 64, balls: 41, fours: 7, sixes: 3, strikeRate: 156.1, dismissalInfo: 'c Starc b Zampa' },
                    { name: 'Virat Kohli', runs: 52, balls: 35, fours: 4, sixes: 1, strikeRate: 148.5, dismissalInfo: 'not out' },
                    { name: 'Suryakumar Yadav', runs: 46, balls: 22, fours: 4, sixes: 3, strikeRate: 209.0, dismissalInfo: 'not out' }
                  ],
                  bowlers: [
                    { name: 'Mitchell Starc', overs: 3.4, maidens: 0, runs: 36, wickets: 1, economy: 9.81 },
                    { name: 'Pat Cummins', overs: 4, maidens: 0, runs: 34, wickets: 1, economy: 8.50 },
                    { name: 'Adam Zampa', overs: 4, maidens: 0, runs: 38, wickets: 1, economy: 9.50 }
                  ]
                }
              ]
            },
            timeline: [
              { minute: '18.4 ov', title: 'FOUR! Suryakumar Yadav slices it past point', description: 'What a shot! Brings the target within single digits.', type: 'boundary' },
              { minute: '17.2 ov', title: 'FIFTY for Virat Kohli', description: 'Kohli reaches his 39th T20I half-century with a calm single.', type: 'general' },
              { minute: '11.5 ov', title: 'WICKET! Rohit Sharma caught at long-on', description: 'Zampa breaks the 90-run partnership.', type: 'wicket' }
            ]
          }
        });

        // Upcoming match
        const tomorrow = new Date(now.getTime() + 86400000);
        await prisma.sportsEvent.create({
          data: {
            title: 'Chennai Super Kings vs Mumbai Indians',
            categoryId: cricket.id,
            team1Name: 'Chennai Super Kings',
            team2Name: 'Mumbai Indians',
            status: 'UPCOMING',
            eventDate: tomorrow,
            startTime: '19:30',
            venue: 'M. A. Chidambaram Stadium',
            city: 'Chennai',
            country: 'India',
            isFeatured: true,
            isManual: true,
            description: 'El Clásico of the Indian Premier League. High-octane clash at Chepauk.'
          }
        });
      }

      if (football) {
        await prisma.sportsEvent.create({
          data: {
            title: 'Arsenal vs Manchester City',
            categoryId: football.id,
            team1Name: 'Arsenal',
            team2Name: 'Manchester City',
            status: 'LIVE',
            eventDate: now,
            startTime: '21:00',
            venue: 'Emirates Stadium',
            city: 'London',
            country: 'United Kingdom',
            homeScore: '2',
            awayScore: '1',
            currentStatusText: '74\' • Second Half',
            isFeatured: true,
            isManual: true,
            timeline: [
              { minute: '68\'', title: 'GOAL! Bukayo Saka scores with a curling strike', description: 'Arsenal take the lead at the Emirates!', type: 'goal' },
              { minute: '41\'', title: 'GOAL! Erling Haaland equalizes', description: 'Clinical finish into the bottom left corner.', type: 'goal' },
              { minute: '14\'', title: 'GOAL! Martin Odegaard opens scoring', description: 'Stunning 25-yard drive.', type: 'goal' }
            ]
          }
        });
      }

      if (kabaddi) {
        await prisma.sportsEvent.create({
          data: {
            title: 'Jaipur Pink Panthers vs Puneri Paltan',
            categoryId: kabaddi.id,
            team1Name: 'Jaipur Pink Panthers',
            team2Name: 'Puneri Paltan',
            status: 'COMPLETED',
            eventDate: new Date(now.getTime() - 86400000),
            startTime: '20:00',
            venue: 'Thyagaraj Indoor Stadium',
            city: 'Delhi',
            country: 'India',
            homeScore: '38',
            awayScore: '34',
            currentStatusText: 'Full Time • Jaipur won by 4 points',
            isFeatured: false,
            isManual: true,
          }
        });
      }

      // Basketball - Lakers vs Celtics
      const basketball = await prisma.sportsCategory.findUnique({ where: { slug: 'basketball' } });
      if (basketball) {
        await prisma.sportsEvent.create({
          data: {
            title: 'Los Angeles Lakers vs Boston Celtics',
            categoryId: basketball.id,
            team1Name: 'Lakers',
            team2Name: 'Celtics',
            status: 'LIVE',
            eventDate: now,
            startTime: '04:12',
            venue: 'Crypto.com Arena',
            city: 'Los Angeles',
            country: 'USA',
            homeScore: '78',
            awayScore: '71',
            currentStatusText: 'Quarter 3 - 04:12',
            isFeatured: true,
            isManual: true,
          }
        });
      }

      // Upcoming Fixtures
      const tennis = await prisma.sportsCategory.findUnique({ where: { slug: 'tennis' } });
      if (cricket) {
        await prisma.sportsEvent.create({
          data: {
            title: 'India vs Bangladesh',
            categoryId: cricket.id,
            team1Name: 'India',
            team2Name: 'Bangladesh',
            status: 'UPCOMING',
            eventDate: now,
            startTime: '19:00',
            venue: 'Dubai International Stadium',
            city: 'Dubai',
            country: 'UAE',
            isFeatured: true,
            isManual: true,
            description: 'T20 Super Clash at Dubai International Stadium.'
          }
        });
      }

      if (football) {
        await prisma.sportsEvent.create({
          data: {
            title: 'Real Madrid vs Bayern Munich',
            categoryId: football.id,
            team1Name: 'Real Madrid',
            team2Name: 'Bayern Munich',
            status: 'UPCOMING',
            eventDate: now,
            startTime: '00:30',
            venue: 'Santiago Bernabéu',
            city: 'Madrid',
            country: 'Spain',
            isFeatured: true,
            isManual: true,
            description: 'UEFA Champions League Semi-Final.'
          }
        });
      }

      if (tennis) {
        await prisma.sportsEvent.create({
          data: {
            title: 'Carlos Alcaraz vs Jannik Sinner',
            categoryId: tennis.id,
            team1Name: 'Alcaraz',
            team2Name: 'Sinner',
            status: 'UPCOMING',
            eventDate: new Date(now.getTime() + 86400000),
            startTime: '16:30',
            venue: 'Centre Court',
            city: 'London',
            country: 'United Kingdom',
            isFeatured: true,
            isManual: true,
            description: 'Wimbledon Men\'s Championship.'
          }
        });
      }

      console.log('[Sports Seed] Initial sample events seeded successfully.');
    }
  } catch (error) {
    console.error('[Sports Seed] Error seeding sports categories and events:', error);
  }
}
