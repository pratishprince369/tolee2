import { ToolRegistry } from '../tools/registry';
import { ToolExecutionContext } from '../tools/types';
import { CentralAIEngine } from '@/lib/ai-gateway/central-engine';

const NVIDIA_API_KEYS = [
  process.env.NVIDIA_API_KEY,
  process.env.NVIDIA_LLM_KEY,
  "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",
  "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",
  "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",
  "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",
  "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",
].filter((k): k is string => Boolean(k && k.trim()));

export interface AgentProcessOptions {
  userMessage: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  context: ToolExecutionContext;
}

export class AgentOrchestrator {
  /**
   * Generates the Master System Prompt ensuring native Indian conversational tone & tool awareness
   */
  private static getSystemPrompt(userName: string = 'Sir / Ma\'am'): string {
    return `You are Tolee AI Manager, the 24x7 Personal AI Employee and Digital Brain of the Tolee ecosystem (inspired by ChatGPT & Google Gemini Live).

CORE PERSONALITY & TONE:
- Address the user respectfully as "${userName}".
- Speak in a natural, polite, confident, conversational style in Hindi, Hinglish, or English based on what the user speaks.
- CRITICAL: Never say "I am text only" or "I cannot perform actions". You have direct tool access to the user's Tolee account!
- When the user asks you to check messages, read notifications, create posts, find groups, or check marketplace enquiries, ALWAYS call the corresponding tool.
- After receiving tool results, explain the result clearly and naturally in 1-3 short, spoken sentences.
- If an action was executed, confirm it clearly (e.g. "Ram ko message bhej diya gaya hai.").
- If a tool fails, honestly tell the user what went wrong without hallucinating fake success.`;
  }

  /**
   * Main execution pipeline for both Text Chat and Voice Streams
   */
  public static async process(options: AgentProcessOptions): Promise<{
    replyText: string;
    executedTool?: string;
    toolData?: any;
  }> {
    const { userMessage, conversationHistory = [], context } = options;
    const apiKey = NVIDIA_API_KEYS[0] || process.env.OPENAI_API_KEY || '';

    const messages = [
      { role: 'system', content: this.getSystemPrompt(context.userName) },
      ...conversationHistory.slice(-6),
      { role: 'user', content: userMessage },
    ];

    const tools = ToolRegistry.toOpenAITools();
    const freellmBase = (process.env.FREELLMAPI_URL || process.env.FREELLMAPI_BASE_URL || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const freellmKey = process.env.FREELLMAPI_API_KEY || 'freellmapi-root';

    try {
      // Helper function to dispatch OpenAI-compatible tool calling
      const callLLM = async (callMessages: any[], maxTokens = 1024) => {
        // 1. Try FreeLLMAPI Unified Gateway first
        try {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 6000);
          const fRes = await fetch(`${freellmBase}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${freellmKey}`,
            },
            body: JSON.stringify({
              model: 'auto',
              messages: callMessages,
              tools,
              tool_choice: 'auto',
              temperature: 0.3,
              max_tokens: maxTokens,
            }),
            signal: c.signal,
          });
          clearTimeout(t);
          if (fRes.ok) return await fRes.json();
        } catch {}

        // 2. Fallback to NVIDIA NIM
        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'nvidia/llama-3.1-nemotron-70b-instruct',
            messages: callMessages,
            tools,
            tool_choice: 'auto',
            temperature: 0.3,
            max_tokens: maxTokens,
          }),
        });

        if (!res.ok) {
          throw new Error(`AI API responded with ${res.status}`);
        }
        return await res.json();
      };

      // 1. First Call: Let LLM decide whether to speak or call a tool
      const data = await callLLM(messages, 1024);
      const choice = data?.choices?.[0];
      const message = choice?.message;

      // 2. Check if a tool call was requested
      if (message?.tool_calls && message.tool_calls.length > 0) {
        const toolCall = message.tool_calls[0];
        const toolName = toolCall.function.name;
        let args = {};
        try {
          args = JSON.parse(toolCall.function.arguments || '{}');
        } catch (e) {
          args = {};
        }

        // Execute Tool in DB
        const toolResult = await ToolRegistry.execute(toolName, args, context);

        // 3. Second Call: Feed tool result back to LLM for final conversational spoken response
        const followUpMessages = [
          ...messages,
          message,
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ];

        try {
          const followUpData = await callLLM(followUpMessages, 512);
          const finalReply = followUpData?.choices?.[0]?.message?.content || toolResult.message || 'Action complete ho gaya.';
          return {
            replyText: finalReply,
            executedTool: toolName,
            toolData: toolResult.data,
          };
        } catch {
          return {
            replyText: toolResult.message || 'Task execute ho gaya.',
            executedTool: toolName,
            toolData: toolResult.data,
          };
        }
      }

      // No tool needed, direct conversational response
      return {
        replyText: message?.content || 'Main aapki kya madad kar sakta hoon?',
      };
    } catch (err: any) {
      console.warn('[AgentOrchestrator] Primary provider error, falling back to CentralAIEngine:', err.message);
      try {
        const centralResult = await CentralAIEngine.execute({
          message: userMessage,
          history: conversationHistory,
          userId: context.userId,
        });
        return {
          replyText: centralResult.content,
          executedTool: centralResult.toolUsed || undefined,
          toolData: undefined,
        };
      } catch (centralErr) {
        return {
          replyText: `Main aapki madad karne ke liye tayyar hoon. Aapka sawal dobara bhejein.`,
        };
      }
    }
  }
}
