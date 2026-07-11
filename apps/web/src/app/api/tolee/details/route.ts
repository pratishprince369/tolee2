import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const toleeId = searchParams.get('toleeId');

    if (!toleeId) {
      return NextResponse.json({ success: false, error: 'toleeId is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const currentUserId = (session?.user as any)?.id;

    const tolee = await prisma.tolee.findUnique({
      where: { id: toleeId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        avatar: true,
        coverImage: true,
        isPrivate: true,
        ownerId: true,
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!tolee) {
      return NextResponse.json({ success: false, error: 'Tolee not found' }, { status: 404 });
    }

    let isMember = false;
    let membershipStatus = null;
    if (currentUserId) {
      const membership = await prisma.toleeMember.findUnique({
        where: {
          userId_toleeId: {
            userId: currentUserId,
            toleeId
          }
        }
      });
      isMember = membership?.status === 'approved';
      membershipStatus = membership?.status || null;
    }

    return NextResponse.json({ success: true, tolee, isMember, membershipStatus });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
