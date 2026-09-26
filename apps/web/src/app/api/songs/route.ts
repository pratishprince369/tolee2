import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureInitialMusicSeeded } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  await ensureInitialMusicSeeded();
  const { searchParams } = new URL(request.url);

  const genre = searchParams.get('genre');
  const language = searchParams.get('language');
  const trending = searchParams.get('trending') === 'true';
  const featured = searchParams.get('featured') === 'true';
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

  try {
    const where: any = {};
    if (genre && genre !== 'All') where.genre = { equals: genre, mode: 'insensitive' };
    if (language && language !== 'All') where.language = { equals: language, mode: 'insensitive' };
    if (trending) where.isTrending = true;
    if (featured) where.isFeatured = true;

    const songs = await prisma.song.findMany({
      where,
      include: {
        artist: true,
        album: true,
      },
      orderBy: trending ? { playCount: 'desc' } : { createdAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ success: true, songs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
