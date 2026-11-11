export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL;

async function checkAdmin(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (token && verifySuperAdminToken(token)) return true;

  const session = await getServerSession(authOptions);
  if (session?.user) {
    if ((session.user as any).email === SUPER_ADMIN_EMAIL) return true;
    if ((session.user as any).role === 'ADMIN' || (session.user as any).role === 'SUPERADMIN') return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdmin(req);
    const session = await getServerSession(authOptions);

    if (!isAdmin && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId } = body;

    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    if (isAdmin) {
      await prisma.creatorConversation.update({
        where: { id: conversationId },
        data: { unreadAdminCount: 0 }
      });
      await prisma.creatorMessage.updateMany({
        where: { conversationId, senderRole: 'creator', isRead: false },
        data: { isRead: true }
      });
    } else {
      const myId = (session?.user as any).id;
      const conv = await prisma.creatorConversation.findUnique({
        where: { id: conversationId }
      });
      if (!conv || conv.creatorUserId !== myId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await prisma.creatorConversation.update({
        where: { id: conversationId },
        data: { unreadCreatorCount: 0 }
      });
      await prisma.creatorMessage.updateMany({
        where: { conversationId, senderRole: 'admin', isRead: false },
        data: { isRead: true }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Creator Chat Read POST]', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}
