import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { ensureTemplesSeeded, resolveTempleLiveStream } from '@/lib/darshanService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureTemplesSeeded();

    const temples = await prisma.temple.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    const total = temples.length;
    const liveCount = temples.filter(t => t.liveStatus === 'live').length;
    const activeCount = temples.filter(t => t.isActive).length;

    return NextResponse.json({
      success: true,
      stats: {
        total,
        liveCount,
        offlineCount: total - liveCount,
        activeCount
      },
      temples
    });
  } catch (error: any) {
    console.error('[Admin Darshan GET] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const {
        name,
        slug,
        deity,
        city,
        state,
        country = 'India',
        thumbnail,
        coverImage,
        description,
        youtubeChannelId,
        youtubeVideoId,
        officialUrl,
        sortOrder = 0,
        isFeatured = false,
        isActive = true
      } = body;

      if (!name || !slug || !city || !state || !thumbnail) {
        return NextResponse.json(
          { success: false, error: 'Name, slug, city, state, and thumbnail are required' },
          { status: 400 }
        );
      }

      const existing = await prisma.temple.findUnique({ where: { slug } });
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'A temple with this slug already exists' },
          { status: 400 }
        );
      }

      const temple = await prisma.temple.create({
        data: {
          name,
          slug,
          deity,
          city,
          state,
          country,
          thumbnail,
          coverImage,
          description,
          youtubeChannelId,
          youtubeVideoId,
          officialUrl,
          sortOrder: Number(sortOrder) || 0,
          isFeatured: Boolean(isFeatured),
          isActive: Boolean(isActive),
          liveStatus: 'offline'
        }
      });

      return NextResponse.json({ success: true, temple });
    }

    if (action === 'update') {
      const { id, ...updateData } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Temple ID is required' }, { status: 400 });
      }

      if (updateData.sortOrder !== undefined) {
        updateData.sortOrder = Number(updateData.sortOrder);
      }

      const updated = await prisma.temple.update({
        where: { id },
        data: updateData
      });

      return NextResponse.json({ success: true, temple: updated });
    }

    if (action === 'toggle_active') {
      const { id } = body;
      const temple = await prisma.temple.findUnique({ where: { id } });
      if (!temple) {
        return NextResponse.json({ success: false, error: 'Temple not found' }, { status: 404 });
      }

      const updated = await prisma.temple.update({
        where: { id },
        data: { isActive: !temple.isActive }
      });

      return NextResponse.json({ success: true, temple: updated });
    }

    if (action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Temple ID is required' }, { status: 400 });
      }

      await prisma.temple.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Temple deleted successfully' });
    }

    if (action === 'sync_all') {
      const temples = await prisma.temple.findMany({ where: { isActive: true } });
      const results: any[] = [];

      for (const temple of temples) {
        try {
          const stream = await resolveTempleLiveStream(temple);
          results.push({
            id: temple.id,
            name: temple.name,
            status: stream.statusLabel,
            videoId: stream.videoId
          });
        } catch {
          // ignore single failures
        }
      }

      return NextResponse.json({ success: true, synced: results.length, results });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[Admin Darshan POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
