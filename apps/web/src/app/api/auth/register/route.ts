import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sendOtp } from "@/lib/email";
import { checkBotStatus } from "@/lib/botDetection";

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

    // Generate 6-digit verification OTP immediately
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send verification email via Resend (ALWAYS, no conditions)
    try {
      await sendOtp(cleanEmail, otp);
    } catch (err) {
      console.error('[Email Service] Failed to send verification email:', err);
      // Don't block signup if email fails, user can request a resend later
    }

    // NOW perform validation checks (bot name check, etc.)
    if (checkBotStatus(cleanEmail, name)) {
      return NextResponse.json({ message: "Registration disabled for automated/bot accounts." }, { status: 403 });
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ message: "Email already taken" }, { status: 400 });
    }


    // Create user
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
