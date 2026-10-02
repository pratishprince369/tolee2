import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { aiGateway } from '@/lib/ai-gateway/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { messages, personaName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required for reply suggestions' },
        { status: 400 }
      );
    }

    const lastMsg = typeof messages[messages.length - 1] === 'string'
      ? messages[messages.length - 1]
      : messages[messages.length - 1]?.content || '';
    const formattedRecent = messages.slice(-5).map((m: any) => ({
      role: typeof m === 'string' ? 'user' : (m.role || 'user'),
      content: typeof m === 'string' ? m : (m.content || '')
    }));

    const suggestions = await aiGateway.generateSmartReplies({
      lastMessage: lastMsg,
      recentMessages: formattedRecent,
      personaTone: personaName
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Failed to generate reply suggestions:', error);
    return NextResponse.json(
      {
        suggestions: [
          { id: '1', text: 'Sounds good!', tone: 'positive', emoji: '👍' },
          { id: '2', text: 'Let me get back to you.', tone: 'neutral', emoji: '⏳' },
          { id: '3', text: 'Can you provide more info?', tone: 'question', emoji: '❓' },
        ],
      },
      { status: 200 }
    );
  }
}
