import { prisma } from '@/lib/prisma';
import { AIMessagePayload, AIPersonaConfig } from './types';
import { requiresLiveWebSearch, searchAndGroundQuery, isPersonQuery } from '@/lib/web-search';

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
  searchEvidence?: string;
}

// ponytail: RTK output token compression (ceiling: regex truncation; upgrade path: AST-aware token parser)
export function compressTokens(content: string, maxLen = 3000): string {
  if (!content || content.length <= maxLen) return content;
  const stripped = content.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '');
  const cleaned = stripped.replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ');
  if (cleaned.length <= maxLen) return cleaned;
  const half = Math.floor(maxLen / 2);
  return `${cleaned.slice(0, half)}\n\n[... output compressed for token efficiency ...]\n\n${cleaned.slice(-half)}`;
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
      'You are Tolee AI, an advanced, factually grounded AI companion integrated into the Tolee platform. ' +
      'You are knowledgeable, fast, honest, polite, and format text beautifully with Markdown and code blocks.'
    );
  }

  // 2. Critical Factual Grounding & Anti-Hallucination Policy
  systemParts.push(
    `[CRITICAL FACTUAL GROUNDING POLICY]:\n` +
    `1. NEVER invent, hallucinate, or guess a person's profession, identity, achievements, political office, or biography.\n` +
    `2. If verified evidence is provided in [LIVE VERIFIED EVIDENCE], rely strictly on those verified facts.\n` +
    `3. If reliable sources/evidence are unavailable, ambiguous, or the person cannot be verified with confidence, state honestly:\n` +
    `   "Mujhe reliable sources se is vyakti ki identity ya profession verify nahi ho saki. Kripya thoda aur context ya profile link share karein." (or in English if user asked in English).\n` +
    `4. NEVER claim someone is a cricketer, actor, doctor, or other profession without verified evidence.\n` +
    `5. For Tolee platform data (groups, posts, notifications, wallet), use actual authenticated database records. Never invent platform stats.\n` +
    `6. If an action fails or cannot be executed, say so honestly. Never claim an action succeeded without real execution.`
  );

  // 3. User Memories from database
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

  // 4. Live Internet Grounding for Person / Temporal Queries
  const lastUserMsg = [...rawMessages].reverse().find(m => m.role === 'user')?.content || '';
  if (options.searchEvidence) {
    systemParts.push(`\n[LIVE VERIFIED EVIDENCE]:\n${options.searchEvidence}`);
  } else if (lastUserMsg && requiresLiveWebSearch(lastUserMsg)) {
    try {
      const searchRes = await searchAndGroundQuery(lastUserMsg, 3);
      if (searchRes.hasEvidence) {
        systemParts.push(`\n[LIVE VERIFIED EVIDENCE]:\n${searchRes.contextText}`);
      } else if (isPersonQuery(lastUserMsg)) {
        systemParts.push(`\n[LIVE VERIFIED EVIDENCE]:\n(NO verified public sources found for this entity. Do NOT guess or invent facts.)`);
      }
    } catch {
      // Search non-blocking
    }
  }

  // 5. Reply / Group context
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

  // Add history (limit to last 20 messages to protect context limit & RTK compressed)
  const recentMessages = rawMessages.slice(-20);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      content: compressTokens(msg.content),
      mediaUrl: msg.mediaUrl,
      mediaType: msg.mediaType,
    });
  }

  return messages;
}
