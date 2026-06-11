import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { signSuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;
if (!SUPER_ADMIN_EMAIL) {
  throw new Error('SUPER_ADMIN_EMAIL environment variable is not set.');
}
const MAX_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || 'unknown';

    if (!email || email.toLowerCase().trim() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const record = await prisma.superAdminOTP.findFirst({
      where: {
        email: SUPER_ADMIN_EMAIL,
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!record) {
      return NextResponse.json({ error: 'OTP expired or not found. Please request a new one.' }, { status: 400 });
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await prisma.superAdminOTP.update({ where: { id: record.id }, data: { used: true } });
      return NextResponse.json({ error: 'Too many failed attempts. Request a new OTP.' }, { status: 429 });
    }

    if (record.otp !== otp.trim()) {
      await prisma.superAdminOTP.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      const remaining = MAX_ATTEMPTS - record.attempts - 1;
      return NextResponse.json({ error: `Invalid OTP. ${remaining} attempts remaining.` }, { status: 400 });
    }

    await prisma.superAdminOTP.update({ where: { id: record.id }, data: { used: true } });

    await prisma.auditLog.create({
      data: {
        action: 'super_admin_login',
        details: JSON.stringify({ ip }),
        ipAddress: ip,
      }
    });

    const token = signSuperAdminToken(email);
    const response = NextResponse.json({ success: true });
    response.cookies.set(SUPER_ADMIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 12,
      path: '/',
    });
    return response;
  } catch (err: any) {
    console.error('[OTP Verify Error]', err);
    return NextResponse.json({ 
      error: `Internal server error: ${err?.message || String(err)}`
    }, { status: 500 });
  }
}
