import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtp } from '@/lib/email';
import { authLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: 'Email field is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Rate limiting check
    if (authLimiter.isRateLimited(cleanEmail)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ message: 'No account found with this email address.' }, { status: 404 });
    }

    if (user.email_verified) {
      return NextResponse.json({ message: 'Email is already verified.' }, { status: 400 });
    }

    // Cooldown check (60 seconds)
    if (user.last_otp_sent_at) {
      const diffMs = Date.now() - new Date(user.last_otp_sent_at).getTime();
      if (diffMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - diffMs) / 1000);
        return NextResponse.json({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        }, { status: 429 });
      }
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update DB
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verification_otp: otp,
        verification_expiry: expiry,
        verification_attempts: 0,
        last_otp_sent_at: new Date()
      }
    });

    // Send email
    const emailSent = await sendOtp(user.email, otp);

    if (!emailSent) {
      return NextResponse.json({ message: 'Failed to resend verification code. Please try again later.' }, { status: 500 });
    }

    const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true';

    return NextResponse.json({
      success: true,
      message: 'Verification code resent successfully.',
      ...(isTest ? { otp } : {})
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
