import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Match ID is required' }, { status: 400 });
    }

    const match = await prisma.sportsEvent.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, slug: true, icon: true }
        },
        tournament: {
          select: { id: true, name: true, slug: true, logo: true, country: true }
        },
        homeTeam: true,
        awayTeam: true,
      }
    });

    if (!match) {
      return NextResponse.json({ success: false, error: 'Match not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, match });
  } catch (error: any) {
    console.error('[API Sports Match] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
