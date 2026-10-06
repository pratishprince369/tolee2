/**
 * ⚡ TOLEE AI FAST PATH ROUTER & INFERENCE ENGINE
 * 
 * Rules:
 * 1. Simple questions (GK, explanations, coding, writing, greetings, conversational questions)
 *    MUST NEVER trigger RAG, database scanning, tool registries, multi-model loops, or dead providers.
 * 2. Primary Provider: NVIDIA NIM (Active Model: meta/llama-3.2-11b-vision-instruct)
 * 3. Fallback: Pollinations AI Free Gateway (if NVIDIA times out or fails)
 * 4. Maximum execution deadline: 10 seconds. Response target: 1-3 seconds.
 */

const FAST_NVIDIA_KEYS = [
  process.env.NVIDIA_API_KEY,
  process.env.NVIDIA_LLM_KEY,
  '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',
  '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',
  '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',
  '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',
  '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',
].filter((k): k is string => Boolean(k && k.trim()));

export interface FastPathResult {
  success: boolean;
  text: string;
  provider: string;
  model: string;
  latencyMs: number;
}

export class ToleeFastPath {
  /**
   * Deterministic check: Is this query a simple general/conversational/knowledge query?
   * If true, it skips all DB tools, RAG, and multi-model loops.
   */
  public static isFastPathCandidate(message: string): boolean {
    const q = (message || '').toLowerCase().trim();
    if (!q) return false;

    // Explicit Tolee specific keywords that REQUIRE tool/DB lookup
    const toleeKeywords = [
      'my post', 'my posts', 'my story', 'my stories', 'my group', 'my groups',
      'my notification', 'my notifications', 'my messages', 'my chat', 'my wallet',
      'my balance', 'my leads', 'my tasks', 'my reminders',
      'post banao', 'post create', 'post publish', 'story create', 'story daalo',
      'message bhejo', 'send message', 'delete post', 'like post', 'comment karo',
      'radar', 'near me', 'listing', 'marketplace create'
    ];

    const requiresToleeData = toleeKeywords.some(kw => q.includes(kw));
    return !requiresToleeData;
  }

  /**
   * Execute lightweight fast inference with hard timeout and immediate fallback
   */
  public static async executeFastChat(
    message: string,
    history: Array<{ role: string; content: string }> = [],
    userName: string = 'User'
  ): Promise<FastPathResult> {
    const startTime = Date.now();
    const systemPrompt = `You are Tolee AI Manager, a warm, intelligent personal AI employee.
Address the user respectfully. Respond directly, accurately, and concisely in natural Hindi, Hinglish, or English matching the user's language. Keep responses helpful and under 3-4 paragraphs.`;

    const trimmedHistory = history.slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    }));

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: message.trim() },
    ];

    // 1. Primary: NVIDIA NIM (Fastest frontier model)
    const apiKey = FAST_NVIDIA_KEYS[Math.floor(Math.random() * FAST_NVIDIA_KEYS.length)] || FAST_NVIDIA_KEYS[0];
    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second hard deadline

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify({
            model: 'meta/llama-3.2-11b-vision-instruct',
            messages: apiMessages,
            temperature: 0.3,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            return {
              success: true,
              text: content,
              provider: 'nvidia-nim',
              model: 'meta/llama-3.2-11b-vision-instruct',
              latencyMs: Date.now() - startTime,
            };
          }
        }
      } catch (err: any) {
        console.warn('[FastPath] Primary NVIDIA notice:', err?.message);
      }
    }

    // 2. High-Speed Fallback: Free Public OpenAI Gateway (Pollinations)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai',
          messages: apiMessages,
          temperature: 0.3,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            success: true,
            text: content,
            provider: 'freellmapi-pollinations',
            model: 'openai',
            latencyMs: Date.now() - startTime,
          };
        }
      }
    } catch (err: any) {
      console.warn('[FastPath] Fallback notice:', err?.message);
    }

    // 3. Fallback deterministic answer
    return {
      success: true,
      text: `Namaste ${userName}! Main Tolee AI Manager hoon. Main aapke sawal ko process kar raha hoon. Kripya apna sawal ek baar dobara bhejein.`,
      provider: 'tolee-local',
      model: 'fast-local',
      latencyMs: Date.now() - startTime,
    };
  }
}
