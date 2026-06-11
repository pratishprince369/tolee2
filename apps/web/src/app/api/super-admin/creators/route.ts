import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

// GET — list all creator applications (super admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const where = status !== 'all' ? { status } : {};

    const [applications, total] = await Promise.all([
      prisma.creatorApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true, isVerified: true, wallet: { select: { balance: true } } }
          }
        }
      }),
      prisma.creatorApplication.count({ where })
    ]);

    return NextResponse.json({ applications, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('[Admin Creators GET]', error);
    return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
  }
}
