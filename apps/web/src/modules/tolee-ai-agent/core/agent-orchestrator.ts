import { ToolRegistry } from '../tools/registry';
import { ToolExecutionContext } from '../tools/types';
import { CentralAIEngine } from '@/lib/ai-gateway/central-engine';
import { ToleeRealityValidator } from '@/lib/ai-gateway/reality-validator';
import { ToleeSpecialistRegistry, SpecialistId } from './specialists';
import { buildMasterSystemPrompt } from '@/modules/tolee-ai-manager/Core/prompt-manager';
import { ApprovalEngine } from '../approvals/approval-engine';

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
  specialistId?: SpecialistId;
}

export class AgentOrchestrator {
  /**
   * Generates the Master System Prompt ensuring native Indian conversational tone & tool awareness
   */
  private static getSystemPrompt(userName: string = 'User', specialistInstructions?: string): string {
    const basePrompt = buildMasterSystemPrompt({ userName });
    if (specialistInstructions) {
      return `${basePrompt}\n\n## SPECIALIST DIRECTIVES\n${specialistInstructions}`;
    }
    return basePrompt;
  }

  /**
   * Main execution pipeline for both Text Chat and Voice Streams
   */
  public static async process(options: AgentProcessOptions): Promise<{
    replyText: string;
    executedTool?: string;
    toolData?: any;
    approvalRequired?: boolean;
    approvalPayload?: any;
    specialistId?: SpecialistId;
  }> {
    const { userMessage, conversationHistory = [], context, specialistId } = options;

    // 🛑 Section 11: Instant Cancellation & Recovery Handler ("ruko", "cancel", "mat karo")
    const lowerMsg = (userMessage || '').trim().toLowerCase();
    const isCancellation = /^(ruko|ruk jao|cancel|mat karo|stop|abort|don't do it|wait stop|nahi karna|kuch mat karo)\b/i.test(lowerMsg);
    if (isCancellation) {
      const cancelledCount = ApprovalEngine.cancelPendingForUser(context.userId);
      return {
        replyText: cancelledCount > 0
          ? `Maine aapki ${cancelledCount} pending actions ko cancel kar diya hai. Koi unapproved change feed ya database me nahi kiya gaya.`
          : 'Samajh gaya! Maine sab stop kar diya hai. Koi action execute nahi hua.',
        executedTool: 'cancel_active_task',
        toolData: { cancelledCount },
      };
    }

    const specialist = specialistId
      ? ToleeSpecialistRegistry.get(specialistId)
      : ToleeSpecialistRegistry.routeSpecialist(userMessage);

    const apiKey = NVIDIA_API_KEYS[0] || process.env.OPENAI_API_KEY || '';

    const messages = [
      { role: 'system', content: this.getSystemPrompt(context.userName, specialist.instructions) },
      ...conversationHistory.slice(-6),
      { role: 'user', content: userMessage },
    ];

    const allTools = ToolRegistry.toOpenAITools();
    const tools = specialist.id === 'general_assistant'
      ? allTools
      : allTools.filter(t => specialist.allowedTools.includes(t.function.name));
    const freellmBase = (process.env.FREELLMAPI_URL || process.env.FREELLMAPI_BASE_URL || 'http://localhost:8080/v1').replace(/\/+$/, '');
    const freellmKey = process.env.FREELLMAPI_API_KEY || 'freellmapi-root';

    try {
      // Helper function to dispatch OpenAI-compatible tool calling
      const callLLM = async (callMessages: any[], maxTokens = specialist.maxTokens || 1024) => {
        // 1. Primary: NVIDIA NIM (Active Model: meta/llama-3.2-11b-vision-instruct)
        if (apiKey) {
          try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 8000);
            const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: 'meta/llama-3.2-11b-vision-instruct',
                messages: callMessages,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? 'auto' : undefined,
                temperature: specialist.temperature ?? 0.2,
                max_tokens: maxTokens,
              }),
              signal: c.signal,
            });
            clearTimeout(t);
            if (res.ok) return await res.json();
          } catch (nErr: any) {
            console.warn('[AgentOrchestrator] NVIDIA NIM primary attempt failed:', nErr?.message);
          }
        }

        // 2. High-speed Fallback: FreeLLMAPI Unified Gateway
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
              tools: tools.length > 0 ? tools : undefined,
              tool_choice: tools.length > 0 ? 'auto' : undefined,
              temperature: specialist.temperature ?? 0.2,
              max_tokens: maxTokens,
            }),
            signal: c.signal,
          });
          clearTimeout(t);
          if (fRes.ok) return await fRes.json();
        } catch {}

        throw new Error('AI providers currently unavailable.');
      };

      // 1. First Call: Let LLM decide whether to speak or call a tool
      const data = await callLLM(messages, specialist.maxTokens);
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

        // 🛡️ OpenDots Human-in-the-Loop Interception
        if (toolResult.requiresConfirmation && toolResult.confirmationDetails) {
          return {
            replyText: toolResult.message || 'Is action ko complete karne ke liye aapki approval ki zaroorat hai.',
            executedTool: toolName,
            toolData: toolResult.data,
            approvalRequired: true,
            approvalPayload: toolResult.confirmationDetails,
            specialistId: specialist.id,
          };
        }

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
          const rawReply = followUpData?.choices?.[0]?.message?.content || toolResult.message || 'Action complete ho gaya.';
          
          // Anti-hallucination validation check
          const validation = ToleeRealityValidator.validate(rawReply, {
            userId: context.userId,
            userMessage,
            toolUsed: toolName,
            toolResultSuccess: toolResult.success,
          });

          return {
            replyText: validation.sanitizedContent,
            executedTool: toolName,
            toolData: toolResult.data,
            specialistId: specialist.id,
          };
        } catch {
          return {
            replyText: toolResult.message || 'Task execute ho gaya.',
            executedTool: toolName,
            toolData: toolResult.data,
            specialistId: specialist.id,
          };
        }
      }

      // No tool called: validate that the raw conversational reply does not claim false actions
      const directReply = message?.content || 'Main aapki kya madad kar sakta hoon?';
      const validation = ToleeRealityValidator.validate(directReply, {
        userId: context.userId,
        userMessage,
        toolUsed: null,
        toolResultSuccess: false,
      });

      return {
        replyText: validation.sanitizedContent,
        specialistId: specialist.id,
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
