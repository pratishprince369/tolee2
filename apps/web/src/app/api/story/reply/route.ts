import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrCreatePersonalChat, sendRealChatMessage } from '@/actions/chat';

export async function POST(req: NextRequest) {
  try {
    const { storyId, authorId, text } = await req.json();

    if (!storyId || !authorId || !text) {
      return NextResponse.json({ success: false, error: 'storyId, authorId, and text are required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const currentUserId = (session.user as any).id;
    if (currentUserId === authorId) {
      return NextResponse.json({ success: false, error: 'Cannot reply to your own story' }, { status: 400 });
    }

    // 1. Get or create the personal DM chat between current user and author
    const chatRes = await getOrCreatePersonalChat(authorId);
    if (!chatRes.success || !chatRes.chatId) {
      return NextResponse.json({ success: false, error: chatRes.error || 'Failed to start chat' }, { status: 500 });
    }

    // 2. Fetch story info to create context
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { mediaUrl: true, mediaType: true, thumbnailUrl: true, authorId: true, createdAt: true }
    });

    const contextPrefix = `[Replied to your story ${story?.mediaType || 'media'}]:`;
    const messageContent = `${contextPrefix} "${text}"`;

    // 3. Send message in chat with story reply metadata
    const sendRes = await sendRealChatMessage(
      chatRes.chatId,
      messageContent,
      undefined,
      story ? {
        storyId,
        storyType: story.mediaType,
        storyThumbnail: story.thumbnailUrl || story.mediaUrl || '',
        storyUploaderId: story.authorId,
        storyCreatedAt: story.createdAt
      } : undefined
    );

    return NextResponse.json(sendRes);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
