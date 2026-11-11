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

// GET — Retrieve conversation & messages
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = await checkAdmin(req);
    const session = await getServerSession(authOptions);

    const requestedCreatorUserId = searchParams.get('creatorUserId');
    const requestedConversationId = searchParams.get('conversationId');
    const listAll = searchParams.get('list') === 'true';

    // If admin is asking for all conversations list
    if (isAdmin && listAll) {
      const conversations = await prisma.creatorConversation.findMany({
        orderBy: { lastMessageAt: 'desc' },
        include: {
          creatorUser: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatar: true,
              image: true,
              creatorApplication: {
                select: {
                  city: true,
                  niche: true,
                  followersRange: true,
                  status: true,
                  reelCharges: true,
                  collaborationCharges: true,
                }
              }
            }
          }
        }
      });
      return NextResponse.json({ success: true, conversations });
    }

    let targetUserId: string | null = null;

    if (isAdmin) {
      if (requestedCreatorUserId) {
        targetUserId = requestedCreatorUserId;
      } else if (requestedConversationId) {
        const conv = await prisma.creatorConversation.findUnique({
          where: { id: requestedConversationId },
        });
        if (conv) targetUserId = conv.creatorUserId;
      }
    } else {
      // Must be logged in as the creator
      if (!session?.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      targetUserId = (session.user as any).id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Creator User ID is required' }, { status: 400 });
    }

    // Get or create conversation for this creator
    let conversation = await prisma.creatorConversation.findUnique({
      where: { creatorUserId: targetUserId },
      include: {
        creatorUser: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            avatar: true,
            image: true,
            creatorApplication: {
              select: {
                fullName: true,
                city: true,
                niche: true,
                followersRange: true,
                status: true,
                reelCharges: true,
                collaborationCharges: true,
                statusVideoCharges: true,
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      conversation = await prisma.creatorConversation.create({
        data: { creatorUserId: targetUserId },
        include: {
          creatorUser: {
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              avatar: true,
              image: true,
              creatorApplication: {
                select: {
                  fullName: true,
                  city: true,
                  niche: true,
                  followersRange: true,
                  status: true,
                  reelCharges: true,
                  collaborationCharges: true,
                  statusVideoCharges: true,
                }
              }
            }
          }
        }
      });
    }

    // Fetch messages for this conversation
    const messages = await prisma.creatorMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    });

    // Auto mark as read for the current viewer
    if (isAdmin && conversation.unreadAdminCount > 0) {
      await prisma.creatorConversation.update({
        where: { id: conversation.id },
        data: { unreadAdminCount: 0 }
      });
      await prisma.creatorMessage.updateMany({
        where: { conversationId: conversation.id, senderRole: 'creator', isRead: false },
        data: { isRead: true }
      });
      conversation.unreadAdminCount = 0;
    } else if (!isAdmin && conversation.unreadCreatorCount > 0) {
      await prisma.creatorConversation.update({
        where: { id: conversation.id },
        data: { unreadCreatorCount: 0 }
      });
      await prisma.creatorMessage.updateMany({
        where: { conversationId: conversation.id, senderRole: 'admin', isRead: false },
        data: { isRead: true }
      });
      conversation.unreadCreatorCount = 0;
    }

    return NextResponse.json({
      success: true,
      conversation,
      messages,
      currentUserRole: isAdmin ? 'admin' : 'creator'
    });
  } catch (error: any) {
    console.error('[Creator Chat GET]', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch chat' }, { status: 500 });
  }
}

// POST — Send a message
export async function POST(req: NextRequest) {
  try {
    const isAdmin = await checkAdmin(req);
    const session = await getServerSession(authOptions);

    if (!isAdmin && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { conversationId, creatorUserId, message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message text cannot be empty' }, { status: 400 });
    }

    let conversation: any = null;

    if (conversationId) {
      conversation = await prisma.creatorConversation.findUnique({
        where: { id: conversationId }
      });
    } else if (creatorUserId) {
      conversation = await prisma.creatorConversation.upsert({
        where: { creatorUserId },
        create: { creatorUserId },
        update: {}
      });
    } else if (!isAdmin && session?.user) {
      const myId = (session.user as any).id;
      conversation = await prisma.creatorConversation.upsert({
        where: { creatorUserId: myId },
        create: { creatorUserId: myId },
        update: {}
      });
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation could not be found or created' }, { status: 404 });
    }

    // Security check: creators cannot send messages into another creator's conversation
    if (!isAdmin && session?.user) {
      const myId = (session.user as any).id;
      if (conversation.creatorUserId !== myId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const senderRole = isAdmin ? 'admin' : 'creator';
    const senderId = isAdmin
      ? ((session?.user as any)?.id || 'super-admin')
      : (session?.user as any).id;

    // Create the message
    const newMessage = await prisma.creatorMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        senderRole,
        message: message.trim(),
        isRead: false,
      }
    });

    // Update conversation last message & increment unread counter for recipient
    await prisma.creatorConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageText: message.trim(),
        lastMessageAt: new Date(),
        ...(isAdmin
          ? { unreadCreatorCount: { increment: 1 } }
          : { unreadAdminCount: { increment: 1 } }
        )
      }
    });

    return NextResponse.json({
      success: true,
      message: newMessage,
      conversationId: conversation.id
    });
  } catch (error: any) {
    console.error('[Creator Chat POST]', error);
    return NextResponse.json({ error: error.message || 'Failed to send message' }, { status: 500 });
  }
}
