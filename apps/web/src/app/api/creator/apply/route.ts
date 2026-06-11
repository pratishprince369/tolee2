import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fullName, username, email, mobile, city, country,
      instagramLink, youtubeLink, facebookLink, telegramLink, otherLinks,
      followersRange, monthlyReach, niche, avgReelViews, contentType,
      password
    } = body;

    // Validate required fields
    if (!fullName || !username || !email || !mobile || !city || !followersRange || !niche) {
      return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    let userId: string;
    let finalUsername = username;

    if (session?.user) {
      userId = (session.user as any).id;
      finalUsername = (session.user as any).username || username;

      // Check if already applied
      const existing = await prisma.creatorApplication.findUnique({ where: { userId } });
      if (existing) {
        return NextResponse.json({ error: 'You have already submitted an application', existing }, { status: 400 });
      }
    } else {
      // Unauthenticated signup flow
      if (!password) {
        return NextResponse.json({ error: 'Password is required to create an account' }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      }

      const cleanEmail = email.toLowerCase().trim();
      const cleanName = fullName.toLowerCase().trim();
      const prefix = cleanEmail.split('@')[0] || '';
      const botKeywords = ['bot', 'temp', 'fake', 'spam', 'qa-', 'qa_', 'test-', 'test_'];
      const namePatterns = ['blocked user', 'forgot password user', 'e2e otp user', 'otp user'];

      if (
        botKeywords.some(k => prefix.includes(k) || cleanName.includes(k)) ||
        namePatterns.some(p => cleanName.includes(p))
      ) {
        return NextResponse.json({ error: "Registration disabled for automated/bot accounts." }, { status: 403 });
      }

      // Check if email already taken
      const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingEmail) {
        return NextResponse.json({ error: 'Email already registered. Please sign in instead.' }, { status: 400 });
      }

      // Check if phone already taken
      if (mobile) {
        const existingPhone = await prisma.user.findFirst({
          where: { phone: mobile }
        });
        if (existingPhone) {
          return NextResponse.json({ error: 'Mobile number already registered. Please sign in instead.' }, { status: 400 });
        }
      }

      // Generate a collision-free unique username from email prefix or custom input
      let baseUsername = username.replace(/[^a-z0-9_]/gi, '').toLowerCase();
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

      finalUsername = uniqueUsername;
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user account with verified email status so they can log in and explore
      const user = await prisma.user.create({
        data: {
          name: fullName,
          email: cleanEmail,
          passwordHash: hashedPassword,
          username: finalUsername,
          phone: mobile || null,
          email_verified: true,
          emailVerified: new Date(),
          creatorStatus: 'pending',
          isCreator: false,
        }
      });

      userId = user.id;

      // Track conversion
      try {
        const cookieStore = cookies();
        const sessionId = cookieStore.get('tolee_session_id')?.value;
        if (sessionId) {
          await prisma.visitorSession.update({
            where: { sessionId },
            data: { userId }
          });
          await prisma.analyticsEvent.create({
            data: {
              sessionId,
              eventType: 'signup',
              path: '/creator-program/apply',
              details: JSON.stringify({ userId, method: 'creator_apply' })
            }
          });
        }
      } catch (trackErr) {
        console.error("Failed to track signup conversion in creator apply:", trackErr);
      }
    }

    const application = await prisma.creatorApplication.create({
      data: {
        userId,
        fullName,
        username: finalUsername,
        email: email.toLowerCase().trim(),
        mobile,
        city,
        country: country || 'India',
        instagramLink,
        youtubeLink,
        facebookLink,
        telegramLink,
        otherLinks: otherLinks ? JSON.stringify(otherLinks) : null,
        followersRange,
        monthlyReach,
        niche,
        avgReelViews,
        contentType,
        status: 'pending',
      }
    });

    // Update user creatorStatus to pending
    await prisma.user.update({
      where: { id: userId },
      data: { isCreator: false, creatorStatus: 'pending' }
    });

    // Notify super admin via Audit Log
    await prisma.auditLog.create({
      data: {
        target: userId,
        targetType: 'user',
        action: 'CREATOR_APPLICATION_SUBMITTED',
        details: `Creator application from ${fullName} (@${finalUsername}) — ${followersRange} followers — Niche: ${niche}`,
      }
    }).catch((err) => {
      console.error('AuditLog error in creator apply:', err);
    });

    return NextResponse.json({ success: true, application });
  } catch (error: any) {
    console.error('[Creator Apply]', error);
    return NextResponse.json({ error: error.message || 'Failed to submit application' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;
    const application = await prisma.creatorApplication.findUnique({ where: { userId } });
    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
