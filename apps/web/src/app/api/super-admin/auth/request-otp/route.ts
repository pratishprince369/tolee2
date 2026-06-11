import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/sendEmail';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'pratishrupawate369@gmail.com';
const OTP_COOLDOWN_MS = 60 * 1000;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    if (!email || email.toLowerCase().trim() !== SUPER_ADMIN_EMAIL.toLowerCase()) {
      await prisma.securityEvent.create({
        data: {
          type: 'failed_login',
          severity: 'medium',
          ipAddress: ip,
          endpoint: '/api/super-admin/auth/request-otp',
          details: JSON.stringify({ attemptedEmail: email }),
        }
      });
      return NextResponse.json({ error: 'Unauthorized email address' }, { status: 403 });
    }

    const recentOTP = await prisma.superAdminOTP.findFirst({
      where: {
        email: SUPER_ADMIN_EMAIL,
        used: false,
        createdAt: { gte: new Date(Date.now() - OTP_COOLDOWN_MS) }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentOTP) {
      const waitSeconds = Math.ceil((recentOTP.createdAt.getTime() + OTP_COOLDOWN_MS - Date.now()) / 1000);
      return NextResponse.json({ error: `Please wait ${waitSeconds}s before requesting another OTP` }, { status: 429 });
    }

    await prisma.superAdminOTP.updateMany({
      where: { email: SUPER_ADMIN_EMAIL, used: false },
      data: { used: true }
    });

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.superAdminOTP.create({
      data: { email: SUPER_ADMIN_EMAIL, otp, expiresAt, ipAddress: ip }
    });

    await sendOTPEmail(SUPER_ADMIN_EMAIL, otp);

    return NextResponse.json({ success: true, message: 'OTP sent to your email' });
  } catch (err: any) {
    console.error('[OTP Request Error]', err);
    return NextResponse.json({ 
      error: `Internal server error: ${err?.message || String(err)}`
    }, { status: 500 });
  }
}
