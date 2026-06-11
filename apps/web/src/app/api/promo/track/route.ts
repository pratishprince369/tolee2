import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { action, details } = body;

    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const userId = session?.user ? (session.user as any).id : null;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Save tracking event in AuditLog
    await prisma.auditLog.create({
      data: {
        action,
        target: userId || 'anonymous',
        targetType: 'promo',
        details: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: ip,
        adminId: null, // this is not an admin action
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[promo-track] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
