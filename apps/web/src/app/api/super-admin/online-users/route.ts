import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://api.tolee.in';
    let socketSessions: any[] = [];

    // 1. Fetch real-time active sessions from Socket / Presence service
    try {
      const socketRes = await fetch(`${SOCKET_URL}/presence`, {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      });
      if (socketRes.ok) {
        const socketData = await socketRes.json();
        socketSessions = Array.isArray(socketData.sessions) ? socketData.sessions : [];
      }
    } catch {
      // Socket server might be offline or unreachable; fall back to DB presence
    }

    // 2. Fetch database presence (users active within the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const dbActiveUsers = await prisma.user.findMany({
      where: {
        OR: [
          { lastActiveAt: { gte: fifteenMinutesAgo } },
          { lastLoginAt: { gte: fifteenMinutesAgo } },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        avatar: true,
        image: true,
        role: true,
        location: true,
        lastActiveAt: true,
        isVerified: true,
      },
      orderBy: { lastActiveAt: 'desc' },
      take: 100,
    }).catch(() => []);

    // 3. Merge socket sessions with DB users to produce a unified, comprehensive online list
    const sessionMap = new Map<string, any>();

    // Add socket sessions first
    socketSessions.forEach((s) => {
      const key = s.userId && s.userId !== 'super-admin' && s.userId !== 'guest' ? s.userId : (s.socketId || s.name);
      sessionMap.set(key, {
        id: s.userId || s.socketId,
        name: s.name || 'Guest User',
        username: s.username || null,
        email: s.email || null,
        avatar: s.avatar || null,
        role: s.role || 'user',
        device: s.device || 'Web Browser',
        location: s.location || 'India',
        currentPage: s.currentPage || '/',
        connectedAt: s.connectedAt || new Date().toISOString(),
        lastActiveAt: s.connectedAt || new Date().toISOString(),
        isRegistered: Boolean(s.userId && s.userId !== 'guest' && s.userId !== 'super-admin'),
        source: 'realtime_socket',
      });
    });

    // Merge in DB active users
    dbActiveUsers.forEach((u) => {
      const existing = sessionMap.get(u.id);
      if (existing) {
        existing.name = u.name || existing.name;
        existing.username = u.username || existing.username;
        existing.email = u.email || existing.email;
        existing.avatar = u.avatar || u.image || existing.avatar;
        existing.role = u.role || existing.role;
        existing.location = u.location || existing.location;
        existing.isRegistered = true;
      } else {
        sessionMap.set(u.id, {
          id: u.id,
          name: u.name || u.username || 'Tolee User',
          username: u.username,
          email: u.email,
          avatar: u.avatar || u.image,
          role: u.role || 'user',
          device: 'Web Client',
          location: u.location || 'India',
          currentPage: '/feed',
          connectedAt: u.lastActiveAt.toISOString(),
          lastActiveAt: u.lastActiveAt.toISOString(),
          isRegistered: true,
          source: 'database_presence',
        });
      }
    });

    const onlineUsers = Array.from(sessionMap.values());

    return NextResponse.json({
      success: true,
      count: onlineUsers.length,
      users: onlineUsers,
    });
  } catch (error: any) {
    console.error('[API Super Admin Online Users] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch online users' },
      { status: 500 }
    );
  }
}
