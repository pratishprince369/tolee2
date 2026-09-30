import { NextRequest, NextResponse } from 'next/server';
import {
  TOLEE_GAMES,
  GAME_GENRES,
  getFeaturedGames,
  getTrendingGames,
  getGameById,
} from '@/lib/gamesData';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const game = getGameById(id);
      if (!game) {
        return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      }
      return NextResponse.json({ game });
    }

    const genre = searchParams.get('genre') || 'All';
    const query = (searchParams.get('q') || searchParams.get('search') || '').trim().toLowerCase();
    const sort = searchParams.get('sort') || 'popular'; // popular | rating | newest
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(60, Math.max(1, parseInt(searchParams.get('limit') || '24', 10)));

    let filtered = [...TOLEE_GAMES];

    if (genre && genre !== 'All') {
      filtered = filtered.filter((g) => g.genre === genre);
    }

    if (query) {
      filtered = filtered.filter(
        (g) =>
          g.title.toLowerCase().includes(query) ||
          g.description.toLowerCase().includes(query) ||
          g.technology.some((t) => t.toLowerCase().includes(query)) ||
          g.modelAttribution.toLowerCase().includes(query)
      );
    }

    if (sort === 'rating') {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (sort === 'newest') {
      filtered.reverse();
    } else {
      // 'popular'
      filtered.sort((a, b) => b.playsCount - a.playsCount);
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      games: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      genres: GAME_GENRES,
      featured: page === 1 && !query && genre === 'All' ? getFeaturedGames() : [],
      trending: page === 1 && !query && genre === 'All' ? getTrendingGames() : [],
    });
  } catch (error: any) {
    console.error('Error in /api/games:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
