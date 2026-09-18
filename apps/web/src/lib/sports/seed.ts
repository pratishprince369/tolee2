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

    // Ensure VCPL event exists (User-configured real tournament)
    const cricket = await prisma.sportsCategory.findUnique({ where: { slug: 'cricket' } });
    if (cricket) {
      const vcplTournament = await prisma.sportsTournament.upsert({
        where: { slug: 'vcpl-season-2' },
        update: { logo: '/uploads/vcpl-season-2.jpg' },
        create: {
          name: 'VCPL - T10 Season 2',
          slug: 'vcpl-season-2',
          categoryId: cricket.id,
          season: 'Season 2',
          country: 'India',
          logo: '/sports/vcpl-season-2.jpg',
          description: 'SNEHA EVENTS AND MANAGEMENT PRESENTS VCPL - T10 - Vindhya Celebrity Premier League Season 2. 27 Dec 2026 to 1 Jan 2027.',
          isActive: true,
        }
      });

      const existingVcpl = await prisma.sportsEvent.findUnique({
        where: { externalApiId: 'vcpl-season-2-inaugural' }
      });

      if (!existingVcpl) {
        await prisma.sportsEvent.create({
          data: {
            title: 'VCPL - T10 - Vindhya Celebrity Premier League Season 2',
            categoryId: cricket.id,
            tournamentId: vcplTournament.id,
            externalApiId: 'vcpl-season-2-inaugural',
            eventDate: new Date('2026-12-27T10:00:00.000Z'),
            startTime: '10:00 AM',
            venue: 'Vindhya Cricket Stadium',
            city: 'Rewa, Vindhya',
            country: 'India',
            team1Name: 'Vindhya Celebrities',
            team1Logo: '/sports/vcpl-season-2.jpg',
            team2Name: 'Royal Stars XI',
            team2Logo: '/sports/vcpl-season-2.jpg',
            status: 'UPCOMING',
            isFeatured: true,
            isManual: true,
            description: 'SNEHA EVENTS AND MANAGEMENT PRESENTS VCPL - T10 - Vindhya Celebrity Premier League Season 2. Bigger, Faster, Tougher, More Stars. A League of Stars. Cricket Beyond Limits. Dates: 27 December 2026 to 1 January 2027.',
            scoreDetails: {
              posterUrl: '/sports/vcpl-season-2.jpg',
              format: 'T10',
              season: 'Season 2',
              startDate: '27 Dec 2026',
              endDate: '1 Jan 2027',
              organizer: 'Sneha Events and Management',
              tagline: 'Cricket Beyond Limits'
            }
          }
        });
        console.log('[Sports Seed] Seeded VCPL Season 2 fixture.');
      }
    }
  } catch (error) {
    console.error('[Sports Seed] Error seeding sports categories and events:', error);
  }
}
