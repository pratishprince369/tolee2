import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

export class NvidiaNIMProvider implements AIProvider {
  readonly name = 'NVIDIA NIM Frontier Cluster';
  readonly type = 'nvidia' as const;

  private getKeyPool(): string[] {
    const keys = [
      process.env.NVIDIA_API_KEY,
      process.env.NVIDIA_LLM_KEY,
      process.env.NVIDIA_API_KEY_2,
      process.env.NVIDIA_API_KEY_3,
      process.env.NVIDIA_API_KEY_4,
      process.env.NVIDIA_API_KEY_5,
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
      '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',
    ];
    return Array.from(new Set(keys.filter((k): k is string => Boolean(k && k.trim()))));
  }

  private getRandomKey(): string {
    const pool = this.getKeyPool();
    return pool[Math.floor(Math.random() * pool.length)] || '';
  }

  /**
   * Health Check: GET /v1/models against NVIDIA NIM
   */
  async isAvailable(): Promise<boolean> {
    const key = this.getRandomKey();
    if (!key) return false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch('https://integrate.api.nvidia.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${key}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return true;
    }
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options.model || 'meta/llama-3.3-70b-instruct';
    const keys = this.getKeyPool();

    let lastError: any = null;

    for (const apiKey of keys.slice(0, 4)) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            top_p: 0.9,
            max_tokens: options.maxTokens ?? 2048,
            stream: false,
          }),
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const err = await response.text().catch(() => 'NVIDIA error');
          lastError = new Error(`NVIDIA NIM (${response.status}): ${err}`);
          continue;
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        if (text && text.trim()) {
          return {
            text,
            provider: 'nvidia',
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
      } catch (err: any) {
        lastError = err;
      }
    }

    throw lastError || new Error('All NVIDIA NIM API keys failed to generate a response.');
  }

  async streamText(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options.model || 'meta/llama-3.3-70b-instruct';
    const keys = this.getKeyPool();

    for (const apiKey of keys.slice(0, 3)) {
      try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            model,
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            top_p: 0.9,
            max_tokens: options.maxTokens ?? 2048,
            stream: true,
          }),
          signal: options.signal,
        });

        if (!response.ok || !response.body) {
          continue;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\s*/, '');
            if (dataStr === '[DONE]') {
              onChunk({ text: '', done: true, provider: 'nvidia', model });
              continue;
            }

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                fullText += delta;
                onChunk({
                  text: delta,
                  done: false,
                  provider: 'nvidia',
                  model,
                });
              }
            } catch {
              // ignore malformed SSE line
            }
          }
        }

        onChunk({ text: '', done: true, provider: 'nvidia', model });

        return {
          text: fullText,
          provider: 'nvidia',
          model,
          latencyMs: Date.now() - startTime,
        };
      } catch {
        continue;
      }
    }

    // Fallback to non-streaming if stream drops
    return this.generateText(options);
  }
}
