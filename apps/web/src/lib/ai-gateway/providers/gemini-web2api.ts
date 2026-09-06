import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

export class GeminiWeb2APIProvider implements AIProvider {
  readonly name = 'Gemini Web2API';
  readonly type = 'gemini_web2api' as const;

  private getBaseUrl(): string {
    return process.env.GEMINI_WEB2API_URL || process.env.AI_WEB2API_URL || 'http://127.0.0.1:8081';
  }

  private getApiKey(): string {
    return process.env.GEMINI_WEB2API_API_KEY || process.env.AI_WEB2API_KEY || 'sk-default';
  }

  /**
   * STEP 5: Strict Isolated Backend Health Check
   * Validates /v1/models AND /v1/chat/completions response content before allowing live traffic.
   */
  async isAvailable(): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const apiKey = this.getApiKey();

    try {
      // 1. Health check: GET /v1/models
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const modelsRes = await fetch(`${baseUrl}/v1/models`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!modelsRes.ok) {
        console.warn(`[GeminiWeb2API] /v1/models check failed with status: ${modelsRes.status}`);
        return false;
      }

      // 2. Health check: POST /v1/chat/completions with test prompt
      const postController = new AbortController();
      const postTimeoutId = setTimeout(() => postController.abort(), 3500);

      const testRes = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gemini-3.6-flash',
          messages: [{ role: 'user', content: 'Reply with exactly: Tolee AI working' }],
          stream: false,
        }),
        signal: postController.signal,
      });

      clearTimeout(postTimeoutId);

      if (!testRes.ok) {
        const errText = await testRes.text().catch(() => '');
        console.warn(`[GeminiWeb2API] Test completion failed (${testRes.status}): ${errText}`);
        return false;
      }

      const testData = await testRes.json();
      const content = testData.choices?.[0]?.message?.content;

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        console.warn('[GeminiWeb2API] Test completion returned empty or malformed content.');
        return false;
      }

      return true;
    } catch (err: any) {
      console.warn(`[GeminiWeb2API] Service offline at ${baseUrl}: ${err.message}`);
      return false;
    }
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const baseUrl = this.getBaseUrl();
    const model = options.model || 'gemini-3.6-flash';

    const formattedMessages = options.messages.map((m) => {
      if (m.mediaUrl && m.mediaType?.startsWith('image/')) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.mediaUrl } },
          ],
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      }),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Gemini Web2API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    if (!text) {
      throw new Error('Gemini Web2API returned empty message content');
    }

    return {
      text,
      provider: this.type,
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
    const baseUrl = this.getBaseUrl();
    const model = options.model || 'gemini-3.6-flash';

    const formattedMessages = options.messages.map((m) => {
      if (m.mediaUrl && m.mediaType?.startsWith('image/')) {
        return {
          role: m.role,
          content: [
            { type: 'text', text: m.content },
            { type: 'image_url', image_url: { url: m.mediaUrl } },
          ],
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.getApiKey()}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: true,
      }),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'Unknown stream error');
      throw new Error(`Gemini Web2API stream error (${response.status}): ${errorText}`);
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
          onChunk({ text: '', done: true, model, provider: this.type });
          continue;
        }

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || '';
            if (delta) {
              accumulatedText += delta;
              onChunk({
                text: delta,
                done: false,
                model,
                provider: this.type,
              });
            }
          } catch {
            // Ignore malformed SSE chunks
          }
        }
      }
    }

    onChunk({ text: '', done: true, model, provider: this.type });

    return {
      text: accumulatedText,
      provider: this.type,
      model,
      latencyMs: Date.now() - startTime,
    };
  }
}
