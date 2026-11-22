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
      // Helper function to dispatch OpenAI-compatible tool calling across robust providers
      const callLLM = async (callMessages: any[], maxTokens = specialist.maxTokens || 1500) => {
        // 1. Primary High-Reliability: Pollinations AI Gateway (Zero-key, native OpenAI tool-calling)
        try {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 12000);
          const pRes = await fetch('https://text.pollinations.ai/openai/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'openai',
              messages: callMessages,
              tools: tools.length > 0 ? tools : undefined,
              tool_choice: tools.length > 0 ? 'auto' : undefined,
              temperature: specialist.temperature ?? 0.2,
              max_tokens: maxTokens,
            }),
            signal: c.signal,
          });
          clearTimeout(t);
          if (pRes.ok) return await pRes.json();
        } catch (pErr: any) {
          console.warn('[AgentOrchestrator] Pollinations attempt notice:', pErr?.message);
        }

        // 2. Groq Cloud (if key configured)
        if (process.env.GROQ_API_KEY) {
          try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 8000);
            const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: callMessages,
                tools: tools.length > 0 ? tools : undefined,
                tool_choice: tools.length > 0 ? 'auto' : undefined,
                temperature: specialist.temperature ?? 0.2,
                max_tokens: maxTokens,
              }),
              signal: c.signal,
            });
            clearTimeout(t);
            if (gRes.ok) return await gRes.json();
          } catch {}
        }

        // 3. Local / Remote FreeLLMAPI Unified Gateway
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

      // 🔄 Iterative ReAct Execution Loop (Phase 2 & Phase 3)
      const MAX_REACT_TURNS = 6;
      let currentMessages: any[] = [...messages];
      let executedToolName: string | undefined;
      let lastToolData: any = undefined;
      let activeBrowserSession: any = undefined;

      for (let turn = 0; turn < MAX_REACT_TURNS; turn++) {
        const data = await callLLM(currentMessages, specialist.maxTokens);
        const choice = data?.choices?.[0];
        const assistantMessage = choice?.message;
        if (!assistantMessage) break;

        // Check if tool calls were requested by the model
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          currentMessages.push(assistantMessage);

          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function?.name;
            let args = {};
            try {
              args = JSON.parse(toolCall.function?.arguments || '{}');
            } catch {
              args = {};
            }

            // Execute the actual tool
            const toolResult = await ToolRegistry.execute(toolName, args, context);
            executedToolName = toolName;
            lastToolData = toolResult.data;

            // Track browser session for UI live canvas synchronization
            if (toolResult.data?.browserSession) {
              activeBrowserSession = toolResult.data.browserSession;
            } else if (toolResult.data?.url) {
              const u = toolResult.data.url.startsWith('http') ? toolResult.data.url : `https://${toolResult.data.url}`;
              let hostname = 'web';
              try { hostname = new URL(u).hostname; } catch {}
              activeBrowserSession = {
                targetDomain: hostname,
                currentUrl: u,
                status: 'ready',
                isBlocked: false,
                statusText: 'Live Verified Session',
                tabs: [{
                  id: 'tab1',
                  title: toolResult.data.title || toolResult.data.pageTitle || hostname,
                  domain: hostname,
                  url: u,
                  status: 'ready',
                }],
                activeTabId: 'tab1',
              };
            }

            // Human-in-the-loop approval gate
            if (toolResult.requiresConfirmation && toolResult.confirmationDetails) {
              return {
                replyText: toolResult.message || 'Is action ko complete karne ke liye aapki approval ki zaroorat hai.',
                executedTool: toolName,
                toolData: toolResult.data,
                approvalRequired: true,
                approvalPayload: toolResult.confirmationDetails,
                browserSession: activeBrowserSession,
                specialistId: specialist.id,
              };
            }

            // Return real tool observation back to model
            currentMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          }

          // Continue loop to let model observe results, call next tool or finalize
          continue;
        }

        // Model has completed tool calls and synthesized final answer
        const rawContent = assistantMessage.content || '';
        const validation = ToleeRealityValidator.validate(rawContent, {
          userId: context.userId,
          userMessage,
          toolUsed: executedToolName || null,
          toolResultSuccess: true,
        });

        return {
          replyText: validation.sanitizedContent,
          executedTool: executedToolName,
          toolData: lastToolData,
          browserSession: activeBrowserSession,
          specialistId: specialist.id,
        };
      }

      return {
        replyText: 'Main aapki kya madad kar sakta hoon?',
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
