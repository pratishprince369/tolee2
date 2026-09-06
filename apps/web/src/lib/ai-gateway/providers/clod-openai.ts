import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

export class ClodOpenAIProvider implements AIProvider {
  readonly name = 'Claude / OpenAI Intelligent Engine';
  readonly type = 'claude' as const;

  private getClodKey(): string {
    return (
      process.env.CLOD_API_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJIRnlwdHkxU04wWXZYU3ptdGJ2a0FaVnhycGkyIiwidXNlcklkIjoiSEZ5cHR5MVNOMFl2WFN6bXRidmtBWlZ4cnBpMiIsInRlYW1JZCI6IjVlYjVlMzE1LTM2YzktNDBjOS04OWYwLTY4ZjlkNGJjNDFlYyIsInRlYW1Sb2xlIjoib3duZXIiLCJwcm9qZWN0SWQiOiJiMzg3ZjBiNS1iM2ZmLTRjZGQtODAzOS0yMWIwZTYyMWQ5NzQiLCJqdGkiOiJhcGlrZXktMTc4Njk1MjM2MDk4OSIsImlhdCI6MTc4Njk1MjM2MCwiZXhwIjoxODM2OTUyMzYwfQ.JHpH6Rlcnl23S9QYsw3b4h5e1sCxNHw5WmW1HjgaAkU'
    );
  }

  private getOpenAIKeys(): string[] {
    const keys = [
      process.env.OPENAI_API_KEY,
      'sk-abcdef1234567890abcdef1234567890abcdef12',
      'sk-1234567890abcdef1234567890abcdef12345678',
    ];
    return keys.filter((k): k is string => Boolean(k && k.trim()));
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.getClodKey() || this.getOpenAIKeys().length > 0);
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const clodKey = this.getClodKey();

    // 1. Try CLōD Engine (Claude 3.5 Sonnet / GPT-4o)
    const models = [
      'anthropic/claude-3.5-sonnet',
      'deepseek/deepseek-chat',
      'gpt-4o',
      'meta-llama/llama-3.3-70b-instruct',
    ];

    for (const model of models) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.clod.io/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${clodKey}`,
          },
          signal: options.signal || controller.signal,
          body: JSON.stringify({
            model,
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1500,
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return {
              text: content,
              provider: 'claude',
              model,
              tokensUsed: data.usage
                ? {
                    promptTokens: data.usage.prompt_tokens || 0,
                    completionTokens: data.usage.completion_tokens || 0,
                    totalTokens: data.usage.total_tokens || 0,
                  }
                : undefined,
              latencyMs: Date.now() - startTime,
            };
          }
        }
      } catch {}
    }

    // 2. Try OpenAI API Key
    const openAIKeys = this.getOpenAIKeys();
    for (const key of openAIKeys) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          signal: options.signal || controller.signal,
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 1500,
          }),
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return {
              text: content,
              provider: 'openai',
              model: 'gpt-4o-mini',
              latencyMs: Date.now() - startTime,
            };
          }
        }
      } catch {}
    }

    throw new Error('Claude/OpenAI providers unavailable.');
  }

  async streamText(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    // Non-streaming fallback wrapper for robust deliverability
    const result = await this.generateText(options);
    onChunk({ text: result.text, done: true, provider: result.provider, model: result.model });
    return result;
  }
}
