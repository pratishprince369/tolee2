import { NextRequest, NextResponse } from 'next/server';
import { getTemples, ensureTemplesSeeded } from '@/lib/darshanService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || undefined;
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const liveOnly = searchParams.get('liveOnly') === 'true';

    await ensureTemplesSeeded();

    const temples = await getTemples({
      search,
      city,
      state,
      liveOnly
    });

    const liveCount = temples.filter(t => t.liveStatus === 'live').length;

    return NextResponse.json({
      success: true,
      count: temples.length,
      liveCount,
      temples
    });
  } catch (error: any) {
    console.error('[API /api/darshan] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch temples' },
      { status: 500 }
    );
  }
}
