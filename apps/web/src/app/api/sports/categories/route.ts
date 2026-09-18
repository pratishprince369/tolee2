import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultSportsCategories } from '@/lib/sports/seed';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await ensureDefaultSportsCategories();

    const categories = await prisma.sportsCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { events: true }
        }
      }
    });

    const formatted = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      icon: c.icon,
      description: c.description,
      isActive: c.isActive,
      displayOrder: c.displayOrder,
      eventsCount: c._count.events,
    }));

    return NextResponse.json({ success: true, categories: formatted });
  } catch (error: any) {
    console.error('[API Sports Categories] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
