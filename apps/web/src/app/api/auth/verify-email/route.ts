import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authLimiter } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    if (!email || !otp) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Rate limiting check
    if (authLimiter.isRateLimited(cleanEmail)) {
      return NextResponse.json({ message: 'Too many verification attempts. Please try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ message: 'No account found with this email address.' }, { status: 404 });
    }

    if (user.email_verified) {
      return NextResponse.json({ success: true, message: 'Email already verified' });
    }

    // Check attempt limits
    if (user.verification_attempts >= 5) {
      return NextResponse.json({ message: 'Maximum verification attempts exceeded. Please request a new code.' }, { status: 400 });
    }

    // Check OTP expiry
    if (!user.verification_otp || !user.verification_expiry || new Date() > user.verification_expiry) {
      return NextResponse.json({ message: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Check OTP match
    if (user.verification_otp !== otp.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          verification_attempts: { increment: 1 }
        }
      });
      return NextResponse.json({ message: 'Invalid verification code.' }, { status: 400 });
    }

    // Mark user as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email_verified: true,
        email_verified_at: new Date(),
        verification_otp: null,
        verification_attempts: 0,
        emailVerified: new Date(), // Standard NextAuth field compatibility
      }
    });

    return NextResponse.json({ success: true, message: 'Email verified successfully.' });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
