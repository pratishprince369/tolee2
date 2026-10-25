/**
 * ⚡ DEEPSEEK DEEPINFER ADAPTER & INFERENCE PROVIDER
 * Optional high-throughput inference backend for Tolee AI Manager.
 * 
 * Hardware Requirements (DeepSeek Official):
 * - Linux OS (glibc 2.31+, GCC 13+)
 * - NVIDIA SM100 architecture (Blackwell B200 / GB200) with CUDA 13.0+, OR
 * - Huawei Ascend 950 NPU with CANN 9.2
 * - Python 3.12+ runtime
 * 
 * Target Models:
 * - DeepSeek-V4.1-Flash (primary)
 * - DeepSeek-V3 / DeepSeek-R1 (MoE)
 * 
 * Architecture:
 * - Connects to DeepInfer serving cluster via HTTP/gRPC protocol
 * - Supports Mock/Simulation adapter mode for environments without SM100 hardware
 * - Zero disruption to browser automation (Stagehand / BrowserWorker)
 * - Automatic failover to Tolee FreeLLMAPI / NVIDIA NIM / Gemini
 */

import { AIProvider, AIRequestOptions, AICompletionResult, AIStreamChunk } from '../types';
import { BrowserWorker } from '@/modules/tolee-ai-agent/browser/browser-worker';

export interface DeepInferConfig {
  endpoint?: string;
  apiKey?: string;
  enabled?: boolean;
  model?: string;
  mockMode?: boolean;
  timeoutMs?: number;
}

export class DeepInferProvider implements AIProvider {
  readonly name = 'DeepSeek DeepInfer Frontier Cluster';
  readonly type = 'deepinfer' as any;

  private endpoint: string;
  private apiKey: string;
  private isEnabled: boolean;
  private isMockMode: boolean;
  private defaultModel: string;
  private timeoutMs: number;

  constructor(customConfig?: DeepInferConfig) {
    this.endpoint = customConfig?.endpoint || process.env.DEEPINFER_ENDPOINT || 'http://127.0.0.1:8000/v1';
    this.apiKey = customConfig?.apiKey || process.env.DEEPINFER_API_KEY || '';
    this.isEnabled = customConfig?.enabled ?? (process.env.DEEPINFER_ENABLED === 'true');
    this.isMockMode = customConfig?.mockMode ?? (process.env.DEEPINFER_MOCK_MODE === 'true');
    this.defaultModel = customConfig?.model || process.env.DEEPINFER_MODEL || 'deepseek-v4.1-flash';
    this.timeoutMs = customConfig?.timeoutMs || 8000;
  }

  /**
   * 🛡️ Health Check: Verifies DeepInfer cluster availability or mock readiness.
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isEnabled) return false;
    if (this.isMockMode) return true;

    // Validate endpoint SSRF safety before pinging
    const safety = BrowserWorker.isSafeUrl(this.endpoint);
    // Allow internal loopback only if explicitly configured in private network
    if (!safety.safe && !this.endpoint.includes('localhost') && !this.endpoint.includes('127.0.0.1')) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${this.endpoint.replace(/\/v1\/?$/, '')}/health`, {
        method: 'GET',
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * 💬 Format Messages into DeepSeek Prompt Protocol (ChatML + Speculative Tags)
   */
  private formatDeepSeekPrompt(messages: AIRequestOptions['messages']): string {
    let formatted = '';
    for (const msg of messages) {
      if (msg.role === 'system') {
        formatted += `<｜begin of sentence｜><｜System｜>${msg.content}<｜end of sentence｜>\n`;
      } else if (msg.role === 'user') {
        formatted += `<｜User｜>${msg.content}<｜end of sentence｜>\n`;
      } else if (msg.role === 'assistant') {
        formatted += `<｜Assistant｜>${msg.content}<｜end of sentence｜>\n`;
      }
    }
    formatted += '<｜Assistant｜>';
    return formatted;
  }

  /**
   * ⚡ Core Text Generation via DeepInfer
   */
  async generateText(options: AIRequestOptions): Promise<AICompletionResult> {
    const startTime = Date.now();
    const model = options.model || this.defaultModel;

    // 1. Mock / Isolated Test Runtime (for development and hardware-incompatible environments)
    if (this.isMockMode || !this.isEnabled) {
      if (!this.isEnabled && !this.isMockMode) {
        throw new Error('DeepInfer provider is disabled. Check DEEPINFER_ENABLED configuration.');
      }

      // Simulate high-throughput DeepInfer inference (SM100 emulation)
      const lastUserMsg = [...options.messages].reverse().find((m) => m.role === 'user')?.content || '';
      const isStructuredJson = lastUserMsg.toLowerCase().includes('json') || lastUserMsg.toLowerCase().includes('schema');

      let responseText = '';
      if (isStructuredJson) {
        responseText = JSON.stringify(
          {
            engine: 'DeepSeek-DeepInfer',
            model,
            mode: 'deterministic-structured',
            throughput_tps: 184.5,
            result: `Processed query with DeepInfer deterministic grammar: "${lastUserMsg.slice(0, 60)}"`,
          },
          null,
          2
        );
      } else {
        responseText = `[DeepInfer · ${model}]\n${lastUserMsg}\n\n*Generated via DeepSeek DeepInfer high-throughput inference engine (SM100 execution pipeline).*`;
      }

      return {
        text: responseText,
        provider: 'deepseek-deepinfer',
        model,
        tokensUsed: {
          promptTokens: Math.ceil(lastUserMsg.length / 4),
          completionTokens: Math.ceil(responseText.length / 4),
          totalTokens: Math.ceil((lastUserMsg.length + responseText.length) / 4),
        },
        latencyMs: Math.max(12, Date.now() - startTime),
      };
    }

    // 2. Real DeepInfer Cluster Remote Invocation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const promptPayload = {
        model,
        messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: options.temperature ?? 0.6,
        max_tokens: options.maxTokens ?? 2048,
        stream: false,
      };

      const res = await fetch(`${this.endpoint.replace(/\/+$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify(promptPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(`DeepInfer HTTP ${res.status}: ${errorBody.slice(0, 200)}`);
      }

      const data = await res.json();
      const outputText = data.choices?.[0]?.message?.content || data.text || '';

      return {
        text: outputText,
        provider: 'deepseek-deepinfer',
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
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`DeepInfer request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    }
  }

  /**
   * 🌊 Streaming Generation
   */
  async *generateStream(options: AIRequestOptions): AsyncGenerator<AIStreamChunk> {
    if (this.isMockMode) {
      const res = await this.generateText(options);
      const words = res.text.split(' ');
      for (const word of words) {
        yield {
          text: word + ' ',
          done: false,
          provider: 'deepseek-deepinfer',
          model: res.model,
        };
      }
      yield {
        text: '',
        done: true,
        provider: 'deepseek-deepinfer',
        model: res.model,
      };
      return;
    }

    // Default to complete generation when streaming endpoint is not configured
    const complete = await this.generateText(options);
    yield {
      text: complete.text,
      done: true,
      provider: 'deepseek-deepinfer',
      model: complete.model,
    };
  }
}
