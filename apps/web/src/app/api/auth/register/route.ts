import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { name, email, password, website } = await req.json();
    
    // Honeypot check
    if (website) {
      return NextResponse.json({ message: "Registration disabled for automated/bot accounts." }, { status: 403 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = name.toLowerCase().trim();
    const prefix = cleanEmail.split('@')[0] || '';
    const botKeywords = process.env.NODE_ENV === 'production'
      ? ['bot', 'temp', 'fake', 'spam', 'qa-', 'qa_', 'test-', 'test_']
      : ['bot', 'temp', 'fake', 'spam'];
    const namePatterns = process.env.NODE_ENV === 'production'
      ? ['blocked user', 'forgot password user', 'e2e otp user', 'otp user']
      : [];

    const isBotName = (str: string) => {
      const trimmed = str.trim();
      if (!trimmed) return false;
      if (!trimmed.includes(' ')) {
        const len = trimmed.length;
        if (len >= 12) {
          let midUpperCount = 0;
          for (let i = 1; i < len; i++) {
            const code = trimmed.charCodeAt(i);
            if (code >= 65 && code <= 90) midUpperCount++;
          }
          if (midUpperCount >= 2) return true;
          
          const vowels = (trimmed.match(/[aeiouy]/gi) || []).length;
          if (vowels / len < 0.23) return true;

          if (/[^aeiouy\s\d\W]{5,}/i.test(trimmed)) return true;
        }
      }
      return false;
    };

    const dotCount = (prefix.match(/\./g) || []).length;

    if (
      dotCount >= 3 ||
      isBotName(name) ||
      botKeywords.some(k => prefix.includes(k) || cleanName.includes(k)) ||
      namePatterns.some(p => cleanName.includes(p))
    ) {
      return NextResponse.json({ message: "Registration disabled for automated/bot accounts." }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ message: "Email already taken" }, { status: 400 });
    }

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate a collision-free unique username from email prefix
    let baseUsername = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/gi, '').toLowerCase();
    if (baseUsername.length < 3) {
      baseUsername = 'user_' + baseUsername;
    }
    
    let uniqueUsername = baseUsername;
    let usernameTaken = true;
    let usernameCounter = 0;
    
    while (usernameTaken) {
      const existingUser = await prisma.user.findUnique({
        where: { username: uniqueUsername }
      });
      if (!existingUser) {
        usernameTaken = false;
      } else {
        usernameCounter++;
        uniqueUsername = `${baseUsername}${usernameCounter}`;
      }
    }

    const user = await prisma.user.create({
      data: {
        name,
        email: cleanEmail,
        passwordHash: hashedPassword,
        username: uniqueUsername,
        email_verified: false,
        verification_otp: otp,
        verification_expiry: expiry,
        verification_attempts: 0,
        last_otp_sent_at: new Date()
      }
    });

    // Send verification email via Resend
    const emailSent = await sendEmail(
      user.email,
      'Verify Your Tolee Account',
      `
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #1e293b; line-height: 1.3; text-align: center;">
          Welcome to Tolee!
        </h2>
        <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6; font-weight: 500; text-align: center;">
          Please verify your email address to complete your registration. Use the 6-digit OTP code below to verify your account.
        </p>
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
          <tr>
            <td align="center" style="background-color: #f1f7f8; border: 2px dashed #0a7c85; border-radius: 12px; padding: 20px; text-align: center;">
              <div style="font-size: 11px; font-weight: 700; color: #0a7c85; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
                Verification Code
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
      'verification'
    );

    if (!emailSent) {
      // Clean up the created user record to allow them to retry signing up
      await prisma.user.delete({ where: { id: user.id } }).catch(() => null);
      return NextResponse.json({ message: "Failed to send verification email. Please check your email address or try again later." }, { status: 500 });
    }

    // --- CONVERSION TRACKING ---
    try {
      const cookieStore = cookies();
      const sessionId = cookieStore.get('tolee_session_id')?.value;
      if (sessionId) {
        // Link user to VisitorSession
        await prisma.visitorSession.update({
          where: { sessionId },
          data: { userId: user.id }
        });
        // Log signup analytics event
        await prisma.analyticsEvent.create({
          data: {
            sessionId,
            eventType: 'signup',
            path: '/auth/signup',
            details: JSON.stringify({ userId: user.id, method: 'email' })
          }
        });
      }
    } catch (trackErr) {
      console.error("Failed to track signup conversion:", trackErr);
    }
    // ----------------------------

    const isTest = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development' || process.env.PLAYWRIGHT_TEST === 'true';

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      ...(isTest ? { otp } : {})
    });
  } catch (err: any) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
