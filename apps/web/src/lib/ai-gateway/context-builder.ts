import { prisma } from '@/lib/prisma';
import { AIMessagePayload, AIPersonaConfig } from './types';

export interface ContextBuilderOptions {
  userId?: string;
  persona?: AIPersonaConfig | null;
  rawMessages: AIMessagePayload[];
  includeMemories?: boolean;
  replyContext?: string;
  groupContext?: {
    groupName?: string;
    senderName?: string;
  };
}

export async function buildAIContext(options: ContextBuilderOptions): Promise<AIMessagePayload[]> {
  const { userId, persona, rawMessages, includeMemories = true, replyContext, groupContext } = options;

  const systemParts: string[] = [];

  // 1. Base identity & Persona
  if (persona) {
    systemParts.push(persona.systemPrompt || `You are ${persona.name}, a helpful and intelligent AI assistant for Tolee.`);
    if (persona.tone) {
      systemParts.push(`Tone: Maintain a ${persona.tone} tone throughout the conversation.`);
    }
    if (persona.language && persona.language !== 'auto') {
      systemParts.push(`Preferred Language: Respond primarily in ${persona.language} or match the user's input language naturally.`);
    }
    if (persona.formality) {
      systemParts.push(`Formality: Speak in a ${persona.formality} style.`);
    }
    if (persona.emojiBehavior) {
      if (persona.emojiBehavior === 'none') {
        systemParts.push('Emoji: Do not use emojis in responses.');
      } else if (persona.emojiBehavior === 'expressive') {
        systemParts.push('Emoji: Use expressive and relevant emojis naturally.');
      }
    }
    if (persona.responseLength) {
      if (persona.responseLength === 'concise') {
        systemParts.push('Response Length: Keep answers concise, direct, and to the point.');
      } else if (persona.responseLength === 'detailed') {
        systemParts.push('Response Length: Provide thorough, comprehensive, and well-structured answers.');
      }
    }
  } else {
    systemParts.push(
      'You are Tolee AI, an advanced AI companion integrated into the Tolee communication platform. ' +
      'You are knowledgeable, fast, helpful, polite, and format text beautifully with Markdown, code blocks with syntax, and LaTeX math when appropriate.'
    );
  }

  // 2. User Memories from database
  if (userId && includeMemories) {
    try {
      const memories = await prisma.aIMemory.findMany({
        where: { userId },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });

      if (memories.length > 0) {
        const memoryLines = memories.map((m: any) => `- ${m.key}: ${m.value}`);
        systemParts.push(`\n[USER CONTEXT & MEMORIES]\n${memoryLines.join('\n')}`);
      }
    } catch {
      // Non-blocking memory retrieval
    }
  }

  // 3. Reply / Group context
  if (replyContext) {
    systemParts.push(`\n[CURRENT REPLY TARGET]\nThe user is replying directly to this message:\n"${replyContext}"`);
  }

  if (groupContext) {
    systemParts.push(
      `\n[GROUP CHAT CONTEXT]\nThis is a group chat named "${groupContext.groupName || 'Tolee Group'}". Sender: "${groupContext.senderName || 'Member'}". Address the group appropriately.`
    );
  }

  const messages: AIMessagePayload[] = [];

  // Add consolidated system prompt
  if (systemParts.length > 0) {
    messages.push({
      role: 'system',
      content: systemParts.join('\n\n'),
    });
  }

  // Add history (limit to last 20 messages to protect context limit)
  const recentMessages = rawMessages.slice(-20);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
    });
  }

  return messages;
}
