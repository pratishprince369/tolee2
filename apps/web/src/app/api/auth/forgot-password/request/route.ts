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
    const emailSent = await sendEmail(
      user.email,
      'Reset Your Tolee Password',
      `
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.3; text-align: center;">
          Reset Password
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6; font-weight: 500; text-align: center;">
          We received a request to reset your password. Use the 6-digit OTP code below to set a new password.
        </p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center" style="background-color: #f1f7f8; border: 2px dashed #0a7c85; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #0a7c85; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                Reset Code
              </div>
              <div style="font-size: 36px; font-weight: 800; color: #0a7c85; letter-spacing: 6px; font-family: monospace, sans-serif; line-height: 1;">
                ${otp}
              </div>
            </td>
          </tr>
        </table>
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; text-align: center;">
          This code is valid for <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.
        </p>
      `,
      'password_reset'
    );

    if (!emailSent) {
      return NextResponse.json({ message: 'Failed to send password reset code. Please try again later.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset code sent successfully.',
      ...(isTest ? { otp } : {})
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
