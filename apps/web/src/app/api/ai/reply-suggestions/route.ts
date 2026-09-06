import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, personaName } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required for reply suggestions' },
        { status: 400 }
      );
    }

    const suggestions = await aiGateway.generateSmartReplies(messages, personaName);

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
