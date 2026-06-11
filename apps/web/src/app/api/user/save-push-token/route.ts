import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { token, deviceType = 'android' } = body;

    if (!token || typeof token !== 'string' || token.trim() === '') {
      return NextResponse.json(
        { error: 'Token is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId,
        deviceType,
      },
      create: {
        token,
        userId,
        deviceType,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[save-push-token] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
