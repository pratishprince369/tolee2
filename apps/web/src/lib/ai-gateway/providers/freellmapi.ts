import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';

interface FreeLLMTarget {
  name: string;
  url: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
}

export class FreeLLMAPIProvider implements AIProvider {
  readonly name = 'FreeLLMAPI Unified Gateway';
  readonly type = 'freellmapi' as const;

  private getTargets(optionsModel?: string): FreeLLMTarget[] {
    const targets: FreeLLMTarget[] = [];

    // 1. Dedicated / Self-hosted FreeLLMAPI instance (from tools/freellmapi or local Docker)
    const baseGateway = (process.env.FREELLMAPI_URL || process.env.FREELLMAPI_BASE_URL || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const gatewayKey = process.env.FREELLMAPI_API_KEY || 'freellmapi-root';
    targets.push({
      name: 'FreeLLMAPI Self-Hosted Instance',
      url: `${baseGateway}/chat/completions`,
      apiKey: gatewayKey,
      model: optionsModel || 'auto',
    });

    // 2. Groq Free Tier (Ultra fast Llama 3.3 / 3.1)
    if (process.env.GROQ_API_KEY) {
      targets.push({
        name: 'Groq Cloud Free Tier',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        model: optionsModel || 'llama-3.3-70b-versatile',
      });
    }

    // 3. Cerebras Free Tier (Fastest LLM inference in the world)
    if (process.env.CEREBRAS_API_KEY) {
      targets.push({
        name: 'Cerebras Inference Free Tier',
        url: 'https://api.cerebras.ai/v1/chat/completions',
        apiKey: process.env.CEREBRAS_API_KEY,
        model: optionsModel || 'llama3.1-70b',
      });
    }

    // 4. OpenRouter Free Tier
    if (process.env.OPENROUTER_API_KEY) {
      targets.push({
        name: 'OpenRouter Free Tier',
        url: 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: process.env.OPENROUTER_API_KEY,
        model: optionsModel || 'meta-llama/llama-3.3-70b-instruct:free',
        headers: {
          'HTTP-Referer': 'https://tolee.in',
          'X-Title': 'Tolee Social Platform',
        },
      });
    }

    // 5. Pollinations OpenAI-Compatible Free Multi-Model Tier (Zero-auth public fallback)
    targets.push({
      name: 'Pollinations AI Free Tier',
      url: 'https://gen.pollinations.ai/v1/chat/completions',
      apiKey: process.env.POLLINATIONS_API_KEY || 'public-free',
      model: optionsModel || 'openai',
    });

    return targets;
  }

  async isAvailable(): Promise<boolean> {
    // Pollinations and FreeLLMAPI always provide active public/local fallbacks
    return true;
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const targets = this.getTargets(options.model);
    let lastError: any = null;

    for (const target of targets) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const response = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${target.apiKey}`,
            Accept: 'application/json',
            ...(target.headers || {}),
          },
          body: JSON.stringify({
            model: target.model,
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: false,
          }),
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          lastError = new Error(`${target.name} responded with status ${response.status}`);
          continue;
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';

        if (text && text.trim()) {
          return {
            text: text.trim(),
            provider: `freellmapi (${target.name})`,
            model: data.model || target.model,
            tokensUsed: {
              promptTokens: data.usage?.prompt_tokens || 0,
              completionTokens: data.usage?.completion_tokens || 0,
              totalTokens: data.usage?.total_tokens || 0,
            },
            latencyMs: Date.now() - startTime,
          };
        }
      } catch (err: any) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error('All FreeLLMAPI endpoints failed to respond.');
  }

  async streamText(
    options: AIRequestOptions,
    onChunk: (chunk: AIStreamChunk) => void
  ): Promise<AICompletionResult> {
    const startTime = Date.now();
    const targets = this.getTargets(options.model);

    for (const target of targets) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        const response = await fetch(target.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${target.apiKey}`,
            Accept: 'text/event-stream',
            ...(target.headers || {}),
          },
          body: JSON.stringify({
            model: target.model,
            messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: true,
          }),
          signal: options.signal || controller.signal,
        });

        clearTimeout(timeoutId);

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
              onChunk({ text: '', done: true, provider: 'freellmapi', model: target.model });
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
                  provider: 'freellmapi',
                  model: target.model,
                });
              }
            } catch {
              // skip unparseable SSE line
            }
          }
        }

        if (fullText.trim()) {
          onChunk({ text: '', done: true, provider: 'freellmapi', model: target.model });
          return {
            text: fullText.trim(),
            provider: `freellmapi (${target.name})`,
            model: target.model,
            latencyMs: Date.now() - startTime,
          };
        }
      } catch {
        continue;
      }
    }

    return this.generateText(options);
  }
}
