import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

export class GeminiOfficialProvider implements AIProvider {
  readonly name = 'Google Gemini Official';
  readonly type = 'gemini_official' as const;

  private getApiKey(): string {
    return (
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ''
    );
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.getApiKey());
  }

  private normalizeModelName(model?: string): string {
    if (!model) return 'gemini-2.0-flash';
    if (model.startsWith('models/')) return model.replace('models/', '');
    return model;
  }

  private formatContents(options: AIRequestOptions) {
    const contents: any[] = [];
    let systemInstructionText = '';

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        systemInstructionText += (systemInstructionText ? '\n\n' : '') + msg.content;
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      const parts: any[] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.mediaUrl) {
        if (msg.mediaUrl.startsWith('data:')) {
          const match = msg.mediaUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            parts.push({
              inline_data: {
                mime_type: match[1],
                data: match[2],
              },
            });
          }
        }
      }

      contents.push({ role, parts });
    }

    return {
      contents,
      systemInstruction: systemInstructionText
        ? { parts: [{ text: systemInstructionText }] }
        : undefined,
    };
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Set GEMINI_API_KEY in .env');
    }

    const model = this.normalizeModelName(options.model);
    const { contents, systemInstruction } = this.formatContents(options);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = systemInstruction;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: options.signal,
    });

    if (!response.ok) {
      const err = await response.text().catch(() => 'Unknown error');
      throw new Error(`Google Gemini API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const text =
      candidate?.content?.parts?.map((p: any) => p.text).filter(Boolean).join('') || '';

    return {
      text,
      provider: this.type,
      model,
      tokensUsed: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount || 0,
            completionTokens: data.usageMetadata.candidatesTokenCount || 0,
            totalTokens: data.usageMetadata.totalTokenCount || 0,
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
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Set GEMINI_API_KEY in .env');
    }

    const model = this.normalizeModelName(options.model);
    const { contents, systemInstruction } = this.formatContents(options);

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const bodyPayload: any = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 2048,
      },
    };

    if (systemInstruction) {
      bodyPayload.systemInstruction = systemInstruction;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      signal: options.signal,
    });

    if (!response.ok || !response.body) {
      const err = await response.text().catch(() => 'Unknown stream error');
      throw new Error(`Google Gemini stream error (${response.status}): ${err}`);
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

        if (trimmed.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            const textChunk = parts.map((p: any) => p.text).filter(Boolean).join('');
            if (textChunk) {
              accumulatedText += textChunk;
              onChunk({
                text: textChunk,
                done: false,
                model,
                provider: this.type,
              });
            }
          } catch {
            // Non-fatal parse error in stream chunk
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
