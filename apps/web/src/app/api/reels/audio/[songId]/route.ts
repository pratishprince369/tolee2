import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { songId: string } }
) {
  try {
    const reelAudios = await prisma.reelAudio.findMany({
      where: { songId: params.songId },
      include: {
        post: {
          include: {
            author: { select: { id: true, name: true, username: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
    });

    return NextResponse.json({ success: true, reelAudios });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
