import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { CentralAIEngine } from '@/lib/ai-gateway/central-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json().catch(() => ({}));

    const message = body.message || body.prompt || (body.messages && body.messages[body.messages.length - 1]?.content) || '';
    const history = body.history || body.messages || [];
    const conversationId = body.conversationId;
    const mediaAttachment = body.mediaAttachment || (body.image ? { url: body.image, type: 'image/jpeg' } : undefined);

    const userId = (session?.user as any)?.id || (session?.user as any)?.sub;
    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'User';
    const userEmail = session?.user?.email || undefined;

    const result = await CentralAIEngine.execute({
      message,
      history,
      conversationId,
      userId,
      userName,
      userEmail,
      clientISO: body.clientLocalISO || new Date().toISOString(),
      timeZone: body.timeZone || 'Asia/Kolkata',
      mediaAttachment,
      model: body.model,
      preferredProvider: body.preferredProvider,
      persona: body.persona,
      taskContext: body.taskContext,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API: /api/tolee/ai/chat Error]:', error);
    return NextResponse.json({
      success: false,
      type: 'text',
      content: '⚠️ We encountered a temporary error processing your AI request. Please try again.',
      model: 'error-handler',
      provider: 'tolee-core',
      toolUsed: null,
      image: null,
      files: [],
      metadata: {
        latencyMs: Date.now() - startTime,
        intent: 'error',
        fallbackUsed: true,
      },
    }, { status: 500 });
  }
}
