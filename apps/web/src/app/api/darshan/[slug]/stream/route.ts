import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTempleLiveStream } from '@/lib/darshanService';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    const temple = await prisma.temple.findUnique({
      where: { slug }
    });

    if (!temple || !temple.isActive) {
      return NextResponse.json({ success: false, error: 'Temple not found' }, { status: 404 });
    }

    const streamInfo = await resolveTempleLiveStream(temple);

    return NextResponse.json({
      success: true,
      temple: {
        id: temple.id,
        name: temple.name,
        slug: temple.slug,
        deity: temple.deity,
        city: temple.city,
        state: temple.state,
        thumbnail: temple.thumbnail,
        officialUrl: temple.officialUrl
      },
      stream: streamInfo
    });
  } catch (error: any) {
    console.error('[API /api/darshan/[slug]/stream] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resolve temple live stream' },
      { status: 500 }
    );
  }
}
