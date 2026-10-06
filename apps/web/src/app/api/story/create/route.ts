import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await req.json();
    const { mediaUrl, mediaType, thumbnailUrl, caption, overlays, closeFriends } = body;

    if (!mediaUrl) {
      return NextResponse.json({ success: false, error: 'mediaUrl is required' }, { status: 400 });
    }

    const mType = mediaType || 'image';
    const story = await prisma.story.create({
      data: {
        mediaUrl,
        mediaType: mType,
        thumbnailUrl: thumbnailUrl || (mType === 'image' ? mediaUrl : null),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours expiry
        authorId: userId,
        caption: caption || null,
        overlays: overlays ? (typeof overlays === 'string' ? overlays : JSON.stringify(overlays)) : null,
        closeFriends: closeFriends || false,
      },
    });

    revalidatePath('/');
    return NextResponse.json({ success: true, story });
  } catch (err: any) {
    console.error('[API /api/story/create] Error creating story:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create story' },
      { status: 500 }
    );
  }
}
