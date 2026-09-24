import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { sendOtp } from "@/lib/email";
import { checkBotStatus } from "@/lib/botDetection";
import { autoJoinDefaultTolees } from "@/lib/autoJoinTolees";

export async function POST(req: Request) {
  try {
    const { name, email, password, website, ref } = await req.json();
    
    // Honeypot check
    if (website) {
      return NextResponse.json({ message: "Registration disabled for automated/bot accounts." }, { status: 403 });
    }

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Missing fields" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Perform validation checks (bot name check, etc.)
    if (checkBotStatus(cleanEmail, name)) {
      return NextResponse.json({ message: "Registration disabled for automated/bot accounts." }, { status: 403 });
    }

    // Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json({ message: "Email already taken" }, { status: 400 });
    }

    // Generate 6-digit verification OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Send verification email via Resend
    try {
      await sendOtp(cleanEmail, otp);
    } catch (err) {
      console.error('[Email Service] Failed to send verification email:', err);
      // Don't block signup if email fails, user can request a resend later
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

    // Automatically join new user to 5 default top groups so they can post immediately
    try {
      await autoJoinDefaultTolees(user.id, 5);
    } catch (joinErr) {
      console.error("[Register] Auto-join default tolees failed:", joinErr);
    }

    // Create welcome onboarding notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'welcome',
        message: 'Welcome to Tolee! We have automatically joined you to 5 top communities so you can immediately create and share posts, reels, and updates.',
        link: '/feed'
      }
    });

    // Send 6-Month Free Boosting notification 2 seconds after registration
    setTimeout(async () => {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            type: 'promotion',
            message: '🎉 Congratulations! You have unlocked 6 Months of FREE Post Boosting on Tolee! Boost any of your posts with zero charges.',
            link: '/ads-manager'
          }
        });
      } catch (err) {
        console.error('[Register] Failed to send 6-month free boost notification:', err);
      }
    }, 2000);

    // --- FRANCHISE REFERRAL TRACKING ---
    const cookieStore = cookies();
    const referralCode = ref || cookieStore.get("tolee_referral_code")?.value;
    if (referralCode) {
      try {
        if (referralCode.startsWith("FRN")) {
          const franchise = await prisma.franchise.findUnique({
            where: { code: referralCode }
          });
          if (franchise && franchise.status === "active") {
            const userAgent = req.headers.get("user-agent") || "";
            let device = "Desktop";
            if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) device = "Mobile";
            else if (/Tablet|iPad/i.test(userAgent)) device = "Tablet";

            // Create Referral record linking referee to franchise owner
            await prisma.referral.create({
              data: {
                referrerId: franchise.userId,
                refereeId: user.id,
                franchiseId: franchise.id,
                device,
                source: "referral_link",
                rewardAmount: 0,
                status: "completed"
              }
            });

            // Clean up tracking cookie
            try {
              cookieStore.delete("tolee_referral_code");
            } catch (cookieErr) {
              // Ignore cookie delete errors in some environments
            }
          }
        }
      } catch (refErr) {
        console.error("[Referral Logging Error]:", refErr);
      }
    }

    // --- CONVERSION TRACKING ---
    try {
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
