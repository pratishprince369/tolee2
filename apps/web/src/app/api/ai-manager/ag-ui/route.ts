import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AgentOrchestrator } from '@/modules/tolee-ai-agent/core/agent-orchestrator';
import { ToleeSpecialistRegistry, SpecialistId } from '@/modules/tolee-ai-agent/core/specialists';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 📡 AG-UI Event Streaming Protocol Route
 * Implements CopilotKit/OpenDots AG-UI Server-Sent Events specification.
 * Streams status, chunks, tool calls, and human approval requests.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : 'guest_user';
    const userName = session?.user?.name || 'User';

    const body = await req.json();
    const { message, history = [], specialistId } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const resolvedSpecialist = specialistId
      ? ToleeSpecialistRegistry.get(specialistId as SpecialistId)
      : ToleeSpecialistRegistry.routeSpecialist(message);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          // 1. RUN_START
          sendEvent({
            type: 'RUN_START',
            runId: `run_${Date.now()}`,
            specialist: {
              id: resolvedSpecialist.id,
              name: resolvedSpecialist.name,
              role: resolvedSpecialist.role,
            },
            timestamp: new Date().toISOString(),
          });

          // 2. STATUS_UPDATE
          sendEvent({
            type: 'STATUS_UPDATE',
            status: `Engaging ${resolvedSpecialist.name}...`,
          });

          // 3. Process via AgentOrchestrator
          const result = await AgentOrchestrator.process({
            userMessage: message,
            conversationHistory: history,
            specialistId: resolvedSpecialist.id,
            context: {
              userId,
              userName,
              userEmail: session?.user?.email || undefined,
            },
          });

          // 4. Stream Tool Events if tool executed or requires confirmation
          if (result.executedTool) {
            sendEvent({
              type: 'TOOL_CALL_START',
              tool: result.executedTool,
            });

            if (result.approvalRequired && result.approvalPayload) {
              sendEvent({
                type: 'APPROVAL_REQUEST',
                tool: result.executedTool,
                approval: result.approvalPayload,
              });
            } else {
              sendEvent({
                type: 'TOOL_CALL_RESULT',
                tool: result.executedTool,
                data: result.toolData,
              });
            }
          }

          // 5. Stream text chunks
          const chunks = result.replyText.match(/[\s\S]{1,40}/g) || [result.replyText];
          for (const chunk of chunks) {
            sendEvent({
              type: 'TEXT_MESSAGE_CHUNK',
              delta: chunk,
            });
          }

          // 6. RUN_FINISH
          sendEvent({
            type: 'RUN_FINISH',
            timestamp: new Date().toISOString(),
          });

          controller.close();
        } catch (streamErr: any) {
          sendEvent({
            type: 'RUN_ERROR',
            error: streamErr?.message || 'Agent stream execution encountered an error.',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'AG-UI stream initialization failed.' }, { status: 500 });
  }
}
