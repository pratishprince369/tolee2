export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

async function isAuthorizedAdmin(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (token && verifySuperAdminToken(token)) return true;

  const session = await getServerSession(authOptions);
  if (session?.user) {
    if ((session.user as any).email === SUPER_ADMIN_EMAIL) return true;
    if ((session.user as any).role === 'ADMIN' || (session.user as any).role === 'SUPERADMIN') return true;
  }
  return false;
}

// GET — list all creator applications with filtering & commercial rates
export async function GET(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'all';
    const city = searchParams.get('city') || '';
    const niche = searchParams.get('niche') || '';
    const followers = searchParams.get('followers') || '';

    const where: any = {};

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { mobile: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (niche && niche !== 'all') {
      where.niche = { contains: niche, mode: 'insensitive' };
    }

    if (followers && followers !== 'all') {
      where.followersRange = followers;
    }

    const applications = await prisma.creatorApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            image: true,
            phone: true,
            isCreator: true,
            creatorStatus: true,
            creatorConversationsAsCreator: {
              select: {
                id: true,
                unreadAdminCount: true,
                lastMessageAt: true,
                lastMessageText: true,
              }
            }
          }
        }
      }
    });

    const formatted = applications.map(app => {
      const conv = app.user?.creatorConversationsAsCreator?.[0];
      return {
        id: app.id,
        userId: app.userId,
        fullName: app.fullName,
        username: app.username,
        email: app.email,
        mobile: app.mobile,
        city: app.city,
        country: app.country,
        avatar: app.user?.image || app.user?.avatar || null,
        instagramLink: app.instagramLink,
        youtubeLink: app.youtubeLink,
        facebookLink: app.facebookLink,
        telegramLink: app.telegramLink,
        otherLinks: app.otherLinks,
        followersRange: app.followersRange,
        monthlyReach: app.monthlyReach,
        avgReelViews: app.avgReelViews,
        niche: app.niche,
        contentType: app.contentType,
        reelCharges: app.reelCharges,
        collaborationCharges: app.collaborationCharges,
        statusVideoCharges: app.statusVideoCharges,
        additionalPricingDetails: app.additionalPricingDetails,
        status: app.status,
        creatorTier: app.creatorTier,
        adminNotes: app.adminNotes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        conversationId: conv?.id || null,
        unreadAdminCount: conv?.unreadAdminCount || 0,
        lastMessageText: conv?.lastMessageText || null,
        lastMessageAt: conv?.lastMessageAt || null,
      };
    });

    return NextResponse.json({ success: true, applications: formatted, total: formatted.length });
  } catch (error: any) {
    console.error('[Admin Creators GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch applications' }, { status: 500 });
  }
}

// PATCH — approve, reject, put on hold, update tier or admin notes
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAuthorizedAdmin(req))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, userId, status, creatorTier, adminNotes } = body;

    if (!id && !userId) {
      return NextResponse.json({ error: 'Missing creator id or userId' }, { status: 400 });
    }

    const application = id
      ? await prisma.creatorApplication.findUnique({ where: { id } })
      : await prisma.creatorApplication.findUnique({ where: { userId } });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (creatorTier !== undefined) updateData.creatorTier = creatorTier;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (status === 'approved') updateData.approvedAt = new Date();
    if (status === 'rejected') updateData.rejectedAt = new Date();

    const updated = await prisma.creatorApplication.update({
      where: { id: application.id },
      data: updateData,
    });

    // Update user flags
    if (status) {
      const isApproved = status === 'approved';
      await prisma.user.update({
        where: { id: application.userId },
        data: {
          isCreator: isApproved,
          creatorStatus: status,
          creatorTier: isApproved ? (creatorTier || application.creatorTier || 'creator') : undefined,
        }
      });
    }

    // Ensure CreatorConversation exists
    await prisma.creatorConversation.upsert({
      where: { creatorUserId: application.userId },
      create: { creatorUserId: application.userId },
      update: {}
    }).catch(() => null);

    return NextResponse.json({ success: true, application: updated });
  } catch (error: any) {
    console.error('[Admin Creators PATCH]', error);
    return NextResponse.json({ error: error.message || 'Failed to update creator' }, { status: 500 });
  }
}
