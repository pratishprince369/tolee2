import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, unreadCount: 0, latestRadar: null });
    }
    const userId = (session.user as any).id;

    // 1. Unread notification count (excluding chat)
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false, type: { not: 'chat' } }
    });

    // 2. Latest unread radar notification in past 10 minutes
    const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);
    const latestRadar = await prisma.notification.findFirst({
      where: {
        userId,
        isRead: false,
        type: { startsWith: 'radar' },
        createdAt: { gte: tenMinsAgo }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      success: true,
      unreadCount,
      latestRadar: latestRadar
        ? {
            id: latestRadar.id,
            title: latestRadar.type === 'radar_alert' ? '🚨 Radar Alert' :
                   latestRadar.type === 'radar_food' ? '🍔 Secret Food Spot' :
                   latestRadar.type === 'radar_news' ? '📢 Local News' :
                   latestRadar.type === 'radar_deal' ? '🎉 Flash Deal' :
                   latestRadar.type === 'radar_gupt' ? '🕵️ Gupt Khabar' : '📡 Tolee Radar',
            message: latestRadar.message,
            link: latestRadar.link || '/radar',
            type: latestRadar.type
          }
        : null
    });
  } catch (err) {
    return NextResponse.json({ success: false, unreadCount: 0, latestRadar: null });
  }
}
