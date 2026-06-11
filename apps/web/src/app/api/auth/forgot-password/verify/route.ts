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
      return NextResponse.json({ message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail }
    });

    if (!user) {
      return NextResponse.json({ message: 'No account found with this email address.' }, { status: 400 });
    }

    // Check attempts count limit
    if (user.reset_password_attempts >= 5) {
      return NextResponse.json({ message: 'Maximum verification attempts exceeded. Please request a new code.' }, { status: 400 });
    }

    // Check OTP expiry
    if (!user.reset_password_otp || !user.reset_password_otp_expiry || new Date() > user.reset_password_otp_expiry) {
      return NextResponse.json({ message: 'OTP has expired. Please request a new code.' }, { status: 400 });
    }

    // Compare code
    if (user.reset_password_otp !== otp.trim()) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          reset_password_attempts: { increment: 1 }
        }
      });
      return NextResponse.json({ message: 'Invalid OTP.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
