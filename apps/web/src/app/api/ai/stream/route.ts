import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiGateway } from '@/lib/ai-gateway/router';
import { AIMessagePayload, AIPersonaConfig } from '@/lib/ai-gateway/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const body = await req.json();
    const {
      messages,
      persona,
      conversationId,
      model,
      temperature,
      maxTokens,
    }: {
      messages: AIMessagePayload[];
      persona?: AIPersonaConfig;
      conversationId?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Persist last user message to conversation if conversationId is provided and user is logged in
    let activeConversationId = conversationId;
    if (userId) {
      if (!activeConversationId) {
        const lastUserMsg = messages[messages.length - 1]?.content || 'New Chat';
        const title = lastUserMsg.slice(0, 40) + (lastUserMsg.length > 40 ? '...' : '');
        const newConv = await prisma.aIConversation.create({
          data: {
            userId,
            title,
            personaId: persona?.id,
            model: model || 'gemini-2.0-flash',
          },
        });
        activeConversationId = newConv.id;
      }

      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.role === 'user') {
        await prisma.aIMessage.create({
          data: {
            conversationId: activeConversationId,
            role: 'user',
            content: lastMsg.content,
            mediaUrl: lastMsg.mediaUrl,
            mediaType: lastMsg.mediaType,
          },
        });
      }
    }

    const encoder = new TextEncoder();
    let accumulatedAssistantText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send conversationId header event if new
          if (activeConversationId) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ conversationId: activeConversationId })}\n\n`)
            );
          }

          await aiGateway.stream(
            {
              messages,
              persona,
              model,
              temperature,
              maxTokens,
              userId,
              conversationId: activeConversationId,
            },
            (chunk) => {
              if (chunk.text) {
                accumulatedAssistantText += chunk.text;
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: chunk.text, done: false })}\n\n`)
                );
              }
              if (chunk.done) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text: '', done: true })}\n\n`)
                );
              }
            }
          );

          // Save assistant message to DB
          if (userId && activeConversationId && accumulatedAssistantText) {
            await prisma.aIMessage.create({
              data: {
                conversationId: activeConversationId,
                role: 'assistant',
                content: accumulatedAssistantText,
                model: model || 'gemini-2.0-flash',
              },
            });
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message || 'Stream generation failed' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
