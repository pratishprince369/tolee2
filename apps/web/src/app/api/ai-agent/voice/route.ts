import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { AgentOrchestrator } from '@/modules/tolee-ai-agent/core/agent-orchestrator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 });
    }

    const body = await req.json();
    const { transcript, conversationHistory = [], voiceSessionId = 'voice-session' } = body;

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Voice transcript is required.' }, { status: 400 });
    }

    const currentUserId = (session.user as any).id || (session.user as any).sub;
    const currentUserName = session.user.name || session.user.email?.split('@')[0] || 'User';

    const result = await AgentOrchestrator.process({
      userMessage: transcript,
      conversationHistory,
      context: {
        userId: currentUserId,
        userName: currentUserName,
        sessionId: voiceSessionId,
        isVoiceMode: true,
      },
    });

    return NextResponse.json({
      success: true,
      transcript,
      spokenReply: result.replyText,
      executedTool: result.executedTool,
      toolData: result.toolData,
    });
  } catch (err: any) {
    console.error('[API: /api/ai-agent/voice] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Voice Agent Error' },
      { status: 500 }
    );
  }
}
