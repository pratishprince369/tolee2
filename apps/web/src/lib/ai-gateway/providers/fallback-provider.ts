import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

export class FallbackProvider implements AIProvider {
  readonly name = 'Resilient Fallback AI';
  readonly type = 'nvidia' as const;

  private getEndpointAndKey(): { url: string; apiKey: string; model: string } | null {
    if (process.env.NVIDIA_API_KEY) {
      return {
        url: 'https://integrate.api.nvidia.com/v1/chat/completions',
        apiKey: process.env.NVIDIA_API_KEY,
        model: 'meta/llama-3.1-70b-instruct',
      };
    }
    if (process.env.OPENAI_API_KEY) {
      return {
        url: 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
      };
    }
    return null;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.getEndpointAndKey());
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const config = this.getEndpointAndKey();
    if (!config) {
      throw new Error('No fallback AI provider configured.');
    }

    const model = options.model || config.model;
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => 'Unknown error');
      throw new Error(`Fallback AI provider error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return {
      text,
      provider: 'fallback',
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

  async streamText(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const config = this.getEndpointAndKey();
    if (!config) {
      throw new Error('No fallback AI provider configured.');
    }

    const model = options.model || config.model;
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const err = await response.text().catch(() => 'Unknown stream error');
      throw new Error(`Fallback AI stream error (${response.status}): ${err}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulatedText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') {
          onChunk({ text: '', done: true, model, provider: 'fallback' });
          continue;
        }
        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              accumulatedText += delta;
              onChunk({ text: delta, done: false, model, provider: 'fallback' });
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    onChunk({ text: '', done: true, model, provider: 'fallback' });

    return {
      text: accumulatedText,
      provider: 'fallback',
      model,
      latencyMs: Date.now() - startTime,
    };
  }
}
