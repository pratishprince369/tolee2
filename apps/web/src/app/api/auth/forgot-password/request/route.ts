import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { authLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ message: 'Email field is required' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Rate limit check
    if (authLimiter.isRateLimited(cleanEmail)) {
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ message: 'No account found with this email address.' }, { status: 400 });
    }

    // Cooldown check (60 seconds) - bypass in test/development mode for testing speed
    const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true';
    if (!isTest && user.last_otp_sent_at) {
      const diffMs = Date.now() - new Date(user.last_otp_sent_at).getTime();
      if (diffMs < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - diffMs) / 1000);
        return NextResponse.json({
          message: `Please wait ${remainingSeconds} seconds before requesting a new OTP.`
        }, { status: 429 });
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        reset_password_otp: otp,
        reset_password_otp_expiry: expiry,
        reset_password_attempts: 0,
        last_otp_sent_at: new Date()
      }
    });

    // Send email using Resend
    await sendEmail(
      user.email,
      'Reset Your Tolee Password',
      `
        <h2>Reset Password</h2>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for 10 minutes.</p>
      `,
      'password_reset'
    );

    return NextResponse.json({
      success: true,
      message: 'Password reset code sent successfully.',
      ...(isTest ? { otp } : {})
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
