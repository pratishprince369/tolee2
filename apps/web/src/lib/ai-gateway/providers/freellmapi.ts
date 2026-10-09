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

  private static cachedReadyModels: { models: string[]; timestamp: number } | null = null;

  /**
   * Normalize FreeLLMAPI Base URL to ensure /v1 path
   */
  private getBaseGatewayUrl(): string | null {
    const raw =
      process.env.FREE_LLM_API_BASE_URL ||
      process.env.FREELLMAPI_BASE_URL ||
      process.env.FREELLMAPI_URL;
    if (!raw) return null;
    const trimmed = raw.replace(/\/+$/, '');
    return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
  }

  private getGatewayApiKey(): string {
    return (
      process.env.FREE_LLM_API_KEY ||
      process.env.FREELLMAPI_API_KEY ||
      'freellmapi-root'
    );
  }

  /**
   * Discover ready models dynamically from configured FreeLLMAPI gateway
   * GET /v1/models?execution_status=ready
   */
  public async discoverReadyModels(): Promise<string[]> {
    const base = this.getBaseGatewayUrl();
    if (!base) return [];

    // Return cached if within 5 minutes
    if (
      FreeLLMAPIProvider.cachedReadyModels &&
      Date.now() - FreeLLMAPIProvider.cachedReadyModels.timestamp < 300000
    ) {
      return FreeLLMAPIProvider.cachedReadyModels.models;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${base}/models?execution_status=ready`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.getGatewayApiKey()}`,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        const models = Array.isArray(json.data)
          ? json.data.map((m: any) => m.id || m.name).filter(Boolean)
          : Array.isArray(json)
          ? json.map((m: any) => m.id || m.name).filter(Boolean)
          : [];

        if (models.length > 0) {
          FreeLLMAPIProvider.cachedReadyModels = {
            models,
            timestamp: Date.now(),
          };
          return models;
        }
      }
    } catch {
      // Gateway offline or unreachable
    }

    return [];
  }

  private async getTargets(optionsModel?: string): Promise<FreeLLMTarget[]> {
    const targets: FreeLLMTarget[] = [];
    const baseGateway = this.getBaseGatewayUrl();

    // 1. Official FreeLLMAPI Gateway Instance (if configured in env)
    if (baseGateway) {
      const readyModels = await this.discoverReadyModels();
      const selectedModel =
        optionsModel || (readyModels.length > 0 ? readyModels[0] : 'auto');

      targets.push({
        name: 'FreeLLMAPI Gateway Instance',
        url: `${baseGateway}/chat/completions`,
        apiKey: this.getGatewayApiKey(),
        model: selectedModel,
      });
    }

    // 2. Groq Free Tier (Ultra fast Llama 3.3)
    if (process.env.GROQ_API_KEY) {
      targets.push({
        name: 'Groq Cloud Free Tier',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        apiKey: process.env.GROQ_API_KEY,
        model: optionsModel || 'llama-3.3-70b-versatile',
      });
    }

    // 3. Cerebras Free Tier
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

    // 5. Pollinations OpenAI-Compatible Free Tier
    targets.push({
      name: 'Pollinations AI Gateway',
      url: 'https://gen.pollinations.ai/v1/chat/completions',
      apiKey: process.env.POLLINATIONS_API_KEY || 'public-free',
      model: optionsModel || 'openai',
    });

    return targets;
  }

  async isAvailable(): Promise<boolean> {
    const base = this.getBaseGatewayUrl();
    if (base) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${base}/models`, {
          headers: { Authorization: `Bearer ${this.getGatewayApiKey()}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) return true;
      } catch {}
    }
    return Boolean(
      process.env.GROQ_API_KEY ||
      process.env.CEREBRAS_API_KEY ||
      process.env.OPENROUTER_API_KEY
    );
  }

  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const targets = await this.getTargets(options.model);
    let lastError: any = null;

    for (const target of targets) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

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
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 1500,
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
    const targets = await this.getTargets(options.model);

    for (const target of targets) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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
            temperature: options.temperature ?? 0.3,
            max_tokens: options.maxTokens ?? 1500,
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
            } catch {}
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
