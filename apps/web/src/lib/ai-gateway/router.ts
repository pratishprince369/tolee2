import { prisma } from '@/lib/prisma';
import {
  AIProvider,
  AIRequestOptions,
  AICompletionResult,
  AIStreamChunk,
  SmartReplySuggestion,
  GroupAIActionRequest,
} from './types';
import { GeminiWeb2APIProvider } from './providers/gemini-web2api';
import { GeminiOfficialProvider } from './providers/gemini-official';
import { FallbackProvider } from './providers/fallback-provider';
import { buildAIContext } from './context-builder';

class AIGatewayRouter {
  private web2api = new GeminiWeb2APIProvider();
  private geminiOfficial = new GeminiOfficialProvider();
  private fallback = new FallbackProvider();

  private getProviderOrder(preferred?: string): AIProvider[] {
    if (preferred === 'gemini_web2api') {
      return [this.web2api, this.geminiOfficial, this.fallback];
    }
    if (preferred === 'fallback' || preferred === 'nvidia' || preferred === 'openai') {
      return [this.fallback, this.geminiOfficial, this.web2api];
    }
    // Default: Gemini Official -> Web2API -> Fallback
    return [this.geminiOfficial, this.web2api, this.fallback];
  }

  async checkProvidersStatus() {
    const [web2apiOk, geminiOk, fallbackOk] = await Promise.all([
      this.web2api.isAvailable(),
      this.geminiOfficial.isAvailable(),
      this.fallback.isAvailable(),
    ]);

    return [
      {
        id: 'gemini_official',
        name: 'Google Gemini Official API',
        type: 'gemini_official',
        status: geminiOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'gemini-2.0-flash',
        isVision: true,
        isVoice: true,
      },
      {
        id: 'gemini_web2api',
        name: 'Gemini Web2API Layer',
        type: 'gemini_web2api',
        status: web2apiOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'gemini-2.0-flash',
        isVision: true,
        isVoice: false,
      },
      {
        id: 'fallback',
        name: 'Resilient Fallback (NVIDIA / OpenAI)',
        type: 'nvidia',
        status: fallbackOk ? 'CONNECTED' : 'OFFLINE',
        defaultModel: 'meta/llama-3.1-70b-instruct',
        isVision: false,
        isVoice: false,
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

    const providers = this.getProviderOrder(options.persona?.voiceName ? 'gemini_official' : undefined);
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
                inputTokens: result.tokensUsed?.promptTokens || 0,
                outputTokens: result.tokensUsed?.completionTokens || 0,
                totalTokens: result.tokensUsed?.totalTokens || 0,
                requestDurationMs: result.latencyMs,
                isSuccess: true,
              },
            })
            .catch(() => {});
        }

        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`Provider ${provider.name} failed:`, err.message);
      }
    }

    throw lastError || new Error('All AI providers failed to generate response.');
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

    const providers = this.getProviderOrder();
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
                action: 'stream_completion',
                provider: result.provider,
                model: result.model,
                inputTokens: result.tokensUsed?.promptTokens || 0,
                outputTokens: result.tokensUsed?.completionTokens || 0,
                totalTokens: result.tokensUsed?.totalTokens || 0,
                requestDurationMs: result.latencyMs,
                isSuccess: true,
              },
            })
            .catch(() => {});
        }

        return result;
      } catch (err: any) {
        lastError = err;
        console.warn(`Provider ${provider.name} streaming failed:`, err.message);
      }
    }

    throw lastError || new Error('All AI providers failed to stream response.');
  }

  async generateSmartReplies(
    recentMessages: { role: string; content: string }[],
    personaName?: string
  ): Promise<SmartReplySuggestion[]> {
    const prompt = `You are generating smart WhatsApp-style 1-tap quick replies for a user in a conversation.
Based on the following recent messages, generate EXACTLY 3 natural, concise, and distinct quick reply suggestions (e.g. 1 positive/enthusiastic, 1 neutral/clarifying, 1 action-oriented).
Keep each reply under 10 words. Respond ONLY with a valid JSON array of objects with keys "id", "text", "tone", and "emoji".

Recent messages:
${recentMessages.map((m) => `${m.role}: ${m.content}`).join('\n')}

Example JSON format:
[
  {"id": "1", "text": "Sure, that sounds great!", "tone": "positive", "emoji": "👍"},
  {"id": "2", "text": "Can we discuss this tomorrow?", "tone": "neutral", "emoji": "📅"},
  {"id": "3", "text": "Let me look into it right now.", "tone": "action", "emoji": "⚡"}
]`;

    try {
      const res = await this.generate({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        maxTokens: 300,
      });

      const cleaned = res.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.slice(0, 3);
      }
    } catch {
      // Safe fallback suggestions
    }

    return [
      { id: '1', text: 'Sounds good to me!', tone: 'positive', emoji: '👍' },
      { id: '2', text: 'Let me get back to you in a bit.', tone: 'neutral', emoji: '⏳' },
      { id: '3', text: 'Could you share more details?', tone: 'question', emoji: '🤔' },
    ];
  }

  async executeGroupAction(request: GroupAIActionRequest): Promise<string> {
    let systemPrompt = '';
    let userPrompt = '';

    switch (request.action) {
      case 'summarize':
        systemPrompt = 'You are a concise meeting and group chat summarizer.';
        userPrompt = `Please summarize the key decisions, topics discussed, and action items from the following messages in bullet points:\n\n${
          request.targetMessageContent ||
          request.recentMessages?.map((m) => `${m.role}: ${m.content}`).join('\n')
        }`;
        break;
      case 'translate':
        systemPrompt = `You are an expert translator. Translate the text accurately into ${
          request.targetLanguage || 'English'
        }. Return only the translated text.`;
        userPrompt = request.targetMessageContent || '';
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
