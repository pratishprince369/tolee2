import { prisma } from '@/lib/prisma';
import {
  AIProvider,
  AIRequestOptions,
  AICompletionResult,
  AIStreamChunk,
  SmartReplySuggestion,
  GroupAIActionRequest,
} from './types';
import { NvidiaNIMProvider } from './providers/nvidia-nim';
import { GeminiOfficialProvider } from './providers/gemini-official';
import { ClodOpenAIProvider } from './providers/clod-openai';
import { GeminiWeb2APIProvider } from './providers/gemini-web2api';
import { FallbackProvider } from './providers/fallback-provider';
import { buildAIContext } from './context-builder';

class AIGatewayRouter {
  private nvidia = new NvidiaNIMProvider();
  private geminiOfficial = new GeminiOfficialProvider();
  private clod = new ClodOpenAIProvider();
  private web2api = new GeminiWeb2APIProvider();
  private fallback = new FallbackProvider();

  private getProviderOrder(options?: AIRequestOptions): AIProvider[] {
    const hasImage = options?.messages?.some((m) => m.mediaUrl && m.mediaType?.startsWith('image/'));
    const preferred = options?.persona?.preferredProvider;

    // 1. Multimodal / Vision routing -> Gemini Official first, then OpenAI fallback
    if (hasImage) {
      return [this.geminiOfficial, this.web2api, this.clod, this.nvidia, this.fallback];
    }

    // 2. Explicit provider preference
    if (preferred === 'nvidia') {
      return [this.nvidia, this.geminiOfficial, this.clod, this.fallback, this.web2api];
    }
    if (preferred === 'gemini_official') {
      return [this.geminiOfficial, this.nvidia, this.clod, this.web2api, this.fallback];
    }
    if (preferred === 'claude' || preferred === 'openai') {
      return [this.clod, this.nvidia, this.geminiOfficial, this.fallback, this.web2api];
    }
    if (preferred === 'gemini_web2api') {
      return [this.web2api, this.nvidia, this.geminiOfficial, this.fallback];
    }

    // 3. Default Capability-based Order: NVIDIA NIM -> Google Gemini -> Claude/OpenAI -> Web2API -> Fallback
    return [this.nvidia, this.geminiOfficial, this.clod, this.web2api, this.fallback];
  }

  async checkProvidersStatus() {
    const [nvidiaOk, geminiOk, clodOk, web2apiOk, fallbackOk] = await Promise.all([
      this.nvidia.isAvailable().catch(() => false),
      this.geminiOfficial.isAvailable().catch(() => false),
      this.clod.isAvailable().catch(() => false),
      this.web2api.isAvailable().catch(() => false),
      this.fallback.isAvailable().catch(() => false),
    ]);

    return [
      {
        id: 'nvidia',
        name: 'NVIDIA NIM Frontier Cluster',
        type: 'nvidia',
        status: nvidiaOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'meta/llama-3.3-70b-instruct',
        isVision: false,
        isVoice: false,
        isStreaming: true,
      },
      {
        id: 'gemini_official',
        name: 'Google Gemini Official API',
        type: 'gemini_official',
        status: geminiOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'gemini-2.0-flash',
        isVision: true,
        isVoice: true,
        isStreaming: true,
      },
      {
        id: 'claude',
        name: 'Claude / OpenAI Intelligent Engine',
        type: 'claude',
        status: clodOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'anthropic/claude-3.5-sonnet',
        isVision: false,
        isVoice: false,
        isStreaming: false,
      },
      {
        id: 'gemini_web2api',
        name: 'Gemini Web2API Layer',
        type: 'gemini_web2api',
        status: web2apiOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'gemini-3.6-flash',
        isVision: true,
        isVoice: false,
        isStreaming: true,
      },
      {
        id: 'fallback',
        name: 'Resilient Multi-Tier Fallback AI',
        type: 'nvidia',
        status: fallbackOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'meta/llama-3.1-70b-instruct',
        isVision: false,
        isVoice: false,
        isStreaming: true,
      },
    ];
  }

  async generate(options: AIRequestOptions): Promise<AICompletionResult> {
    const contextualMessages = await buildAIContext({
      userId: options.userId,
      persona: options.persona,
      rawMessages: options.messages,
    });

    const requestOptions: AIRequestOptions = {
      ...options,
      messages: contextualMessages,
    };

    const providers = this.getProviderOrder(options);
    let lastError: any = null;

    for (const provider of providers) {
      const isReady = await provider.isAvailable().catch(() => false);
      if (!isReady && provider !== providers[providers.length - 1]) continue;

      try {
        const result = await provider.generateText(requestOptions);

        // Async log usage
        if (options.userId) {
          prisma.aIUsageLog
            .create({
              data: {
                userId: options.userId,
                conversationId: options.conversationId,
                action: 'chat_completion',
                provider: result.provider,
                model: result.model,
                tokensUsed: result.tokensUsed?.totalTokens,
                latencyMs: result.latencyMs,
              },
            })
            .catch((e) => console.warn('[AIGateway] Usage log notice:', e));
        }

        return result;
      } catch (err: any) {
        console.warn(`[AIGateway] Provider ${provider.name} failed: ${err.message}. Retrying fallback...`);
        lastError = err;
      }
    }

    throw lastError || new Error('All configured AI providers failed.');
  }

  async stream(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    const contextualMessages = await buildAIContext({
      userId: options.userId,
      persona: options.persona,
      rawMessages: options.messages,
    });

    const requestOptions: AIRequestOptions = {
      ...options,
      messages: contextualMessages,
    };

    const providers = this.getProviderOrder(options);
    let lastError: any = null;

    for (const provider of providers) {
      const isReady = await provider.isAvailable().catch(() => false);
      if (!isReady && provider !== providers[providers.length - 1]) continue;

      try {
        const result = await provider.streamText(requestOptions, onChunk);

        if (options.userId) {
          prisma.aIUsageLog
            .create({
              data: {
                userId: options.userId,
                conversationId: options.conversationId,
                action: 'chat_stream',
                provider: result.provider,
                model: result.model,
                latencyMs: result.latencyMs,
              },
            })
            .catch((e) => console.warn('[AIGateway] Usage log notice:', e));
        }

        return result;
      } catch (err: any) {
        console.warn(`[AIGateway] Stream with ${provider.name} failed: ${err.message}. Retrying fallback...`);
        lastError = err;
      }
    }

    throw lastError || new Error('All configured AI stream providers failed.');
  }

  async generateSmartReplies(params: {
    lastMessage: string;
    recentMessages?: { role: string; content: string }[];
    personaTone?: string;
  }): Promise<SmartReplySuggestion[]> {
    const prompt = `You are an AI Smart Reply Generator.
Generate exactly 3 natural, short, contextual quick replies (max 6 words each) for the last message in the conversation.
Conversation context:
${params.recentMessages?.map((m) => `${m.role}: ${m.content}`).join('\n') || ''}
Last message: "${params.lastMessage}"

Tone: ${params.personaTone || 'natural, helpful, friendly'}.
Output ONLY a valid JSON array of 3 strings, example: ["Sounds good!", "When are you free?", "Let's do it!"]`;

    try {
      const result = await this.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        maxTokens: 200,
      });

      const cleanJson = result.text.replace(/```json|```/g, '').trim();
      const parsed: string[] = JSON.parse(cleanJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3).map((text, i) => ({
          id: `reply_${Date.now()}_${i}`,
          text,
          tone: params.personaTone || 'friendly',
        }));
      }
    } catch {
      // Return natural fallback suggestions
    }

    return [
      { id: '1', text: '👍 Haan bilkul!', tone: 'friendly' },
      { id: '2', text: 'Thoda detail me batayein.', tone: 'helpful' },
      { id: '3', text: 'Main check karke batata hoon.', tone: 'professional' },
    ];
  }

  async executeGroupAIAction(request: GroupAIActionRequest): Promise<string> {
    let systemPrompt = '';
    let userPrompt = '';

    switch (request.action) {
      case 'summarize':
        systemPrompt = 'You are a concise group discussion summarizer. Provide key points and decisions in bullet points.';
        userPrompt = `Please summarize the following conversation:\n\n${
          request.recentMessages?.map((m) => `${m.role}: ${m.content}`).join('\n') ||
          request.targetMessageContent ||
          ''
        }`;
        break;
      case 'translate':
        systemPrompt = `You are a translator. Translate the text accurately into ${
          request.targetLanguage || 'Hindi'
        }. Return ONLY the translated text.`;
        userPrompt = request.targetMessageContent || request.prompt || '';
        break;
      case 'explain':
        systemPrompt = 'You are a helpful assistant explaining concepts clearly and simply.';
        userPrompt = `Please explain the following clearly and simply:\n\n${
          request.targetMessageContent || request.prompt
        }`;
        break;
      case 'poll':
        systemPrompt = 'You are a group poll creator. Create a poll question and 3-4 options.';
        userPrompt = `Create a poll based on this discussion: ${
          request.targetMessageContent || request.prompt
        }`;
        break;
      default:
        systemPrompt = 'You are Tolee AI assistant in a group chat.';
        userPrompt = request.prompt || request.targetMessageContent || '';
    }

    const res = await this.generate({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.6,
      maxTokens: 1000,
    });

    return res.text;
  }
}

export const aiGateway = new AIGatewayRouter();
