import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SUPER_ADMIN_COOKIE)?.value;
    if (!token || !verifySuperAdminToken(token)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';

    const users = await prisma.user.findMany({
      where: q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
          { username: { contains: q, mode: 'insensitive' } },
        ]
      } : {},
      select: {
        id: true,
        name: true,
        email: true,
        username: true
      },
      take: 20
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
