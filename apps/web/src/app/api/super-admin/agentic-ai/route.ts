import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const searchOnly = searchParams.get('searchOnly') === 'true';

  try {
    if (searchOnly && q) {
      // Search for users to add/enable
      const users = await prisma.user.findMany({
        where: {
          isSuspended: false,
          isBanned: false,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          avatar: true,
          agenticReelsEnabled: true,
          agenticInterval: true
        },
        take: 20
      });
      return NextResponse.json({ users });
    }

    // Default: Return currently enabled users
    const enabledUsers = await prisma.user.findMany({
      where: {
        agenticReelsEnabled: true
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        agenticInterval: true,
        agenticLastPostAt: true
      },
      orderBy: {
        agenticLastPostAt: 'desc'
      }
    });

    // Get counts
    const totalCount = await prisma.user.count();
    const enabledCount = enabledUsers.length;

    // Get count of total agentic posts (postType = 'reel' and authored by an enabled agent or containing agent posts)
    // We can count all posts where postType = 'reel' as a simple proxy or count posts by agent users
    const agentPostCount = await prisma.post.count({
      where: {
        postType: 'reel',
        author: {
          agenticReelsEnabled: true
        }
      }
    });

    return NextResponse.json({
      enabledUsers,
      stats: {
        totalCount,
        enabledCount,
        agentPostCount
      }
    });
  } catch (err: any) {
    console.error('[Agentic AI API Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch agentic configurations' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  try {
    const { action, userId, enabled, interval } = await req.json();

    if (action === 'disable_all') {
      // Disable agentic posting for all users
      const result = await prisma.user.updateMany({
        where: { agenticReelsEnabled: true },
        data: { agenticReelsEnabled: false }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'disable_all_agentic_reels',
          target: 'all',
          targetType: 'agentic_ai',
          details: 'Super admin disabled Agentic AI reels for all users',
          ipAddress: ip
        }
      }).catch(() => {});

      return NextResponse.json({ success: true, count: result.count });
    }

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (action === 'update') {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          agenticReelsEnabled: enabled ?? false,
          agenticInterval: interval ?? 'DAILY'
        },
        select: {
          id: true,
          name: true,
          username: true,
          agenticReelsEnabled: true,
          agenticInterval: true
        }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          action: 'update_user_agentic_config',
          target: userId,
          targetType: 'user',
          details: `Updated agentic config for user ${updatedUser.name} (@${updatedUser.username}): enabled=${updatedUser.agenticReelsEnabled}, interval=${updatedUser.agenticInterval}`,
          ipAddress: ip
        }
      }).catch(() => {});

      return NextResponse.json({ success: true, user: updatedUser });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    console.error('[Agentic AI Post Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to update agentic configuration' }, { status: 500 });
  }
}
