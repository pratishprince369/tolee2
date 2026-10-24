/**
 * ⚡ TOLEE AI FAST PATH ROUTER & INFERENCE ENGINE
 * 
 * Rules:
 * 1. Simple questions (GK, explanations, coding, writing, greetings, conversational questions)
 *    MUST NEVER trigger RAG, database scanning, tool registries, multi-model loops, or dead providers.
 * 2. Primary Provider: NVIDIA NIM (Active Model: meta/llama-3.2-11b-vision-instruct)
 * 3. Fallback: FreeLLMAPI / Pollinations Gateway
 * 4. Maximum execution deadline: 10 seconds. Response target: 1-3 seconds.
 * 5. Strict Factual Policy: Never invent person identities or professions.
 */

import { searchAndGroundQuery, requiresLiveWebSearch, isPersonQuery } from '@/lib/web-search';
import { AgentReachConnector } from './agent-reach';
import { ToleeRealityValidator } from './reality-validator';

const FAST_NVIDIA_KEYS = [
  process.env.NVIDIA_API_KEY,
  process.env.NVIDIA_LLM_KEY,
  process.env.NVIDIA_API_KEY_2,
  process.env.NVIDIA_API_KEY_3,
  process.env.NVIDIA_API_KEY_4,
  process.env.NVIDIA_API_KEY_5,
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

    // Explicit Tolee specific keywords that REQUIRE tool/DB/Action lookup
    const toleeKeywords = [
      'my post', 'my posts', 'my story', 'my stories', 'my group', 'my groups',
      'my notification', 'my notifications', 'my messages', 'my chat', 'my wallet',
      'my balance', 'my leads', 'my tasks', 'my reminders',
      'post banao', 'post create', 'post publish', 'story create', 'story daalo',
      'message bhejo', 'send message', 'delete post', 'like post', 'comment karo',
      'radar', 'near me', 'listing', 'marketplace create',
      // Music & Songs
      'song', 'gana', 'gaana', 'music', 'bajao', 'chalao', 'sunao', 'play',
      // News
      'news', 'khabar', 'samachar', 'headline', 'breaking',
      // Autonomous Backlinks & Browser Automation (Muse parity)
      'backlink', 'backlinks', 'muse', 'crunchbase', 'alternativeto', 'saashub',
      'producthunt', 'directory submission', 'seo submission', 'browser automation',
      'automate backlink', 'backlink banao', 'backlink bana',
      // Jobs & Career Automation
      'job', 'jobs', 'apply job', 'job apply', 'job application', 'apply for',
      'naukri', 'internship', 'hiring', 'vacancy', 'career', 'job dhoond', 'resume submit', 'hire me',
      // Travel & Bookings
      'book flight', 'flight book', 'hotel book', 'ticket book', 'irctc', 'makemytrip',
      // Browser Tasks & Automation
      'open webpage', 'fill form', 'browser task', 'take control', 'scrape'
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
    const isPerson = isPersonQuery(message);

    // 👁️ Agent-Reach Multi-Platform Reader for URLs, GitHub, YouTube & Reddit
    let reachContext = '';
    if (AgentReachConnector.hasReachTarget(message)) {
      try {
        const reachRes = await AgentReachConnector.smartReach(message);
        if (reachRes?.success && reachRes.summary) {
          reachContext = `[Agent-Reach Platform: ${reachRes.platform.toUpperCase()}]\n${reachRes.summary}`;
        }
      } catch (reachErr) {
        // Fallback gracefully
      }
    }

    // 🌐 Live Internet Grounding for current affairs / real-time queries
    let liveWebContext = '';
    let searchFoundEvidence = false;

    if (!reachContext && requiresLiveWebSearch(message)) {
      try {
        const searchRes = await searchAndGroundQuery(message, 3);
        if (searchRes.hasEvidence) {
          liveWebContext = searchRes.contextText;
          searchFoundEvidence = true;
        }
      } catch (searchErr) {
        // Fallthrough if search times out
      }
    }

    const groundingContext = [reachContext, liveWebContext].filter(Boolean).join('\n\n');

    const systemPrompt = `You are Tolee AI Manager — a warm, helpful, intelligent AI assistant and digital personal manager for the Tolee platform.
Address the user respectfully.
${groundingContext ? 'Use the provided [Live Verified Search Context] to give verified, up-to-date facts.' : ''}

CORE FACTUAL POLICY & STRICT ANTI-HALLUCINATION RULES:
- When answering about a specific individual, public figure, or organization using [Live Verified Search Context]:
  * State ONLY facts that are explicitly verified in the search context or undisputed general knowledge.
  * NEVER invent, guess, or extrapolate previous political parties, party transitions, birth dates, family background, or reasons not stated in the evidence. (e.g., if a source says someone joined Party A in a year, DO NOT invent that they joined from Party B).
  * If a detail is not mentioned in the verified sources, do not speculate or guess.
  * Use proper Hindi / Hinglish terms (e.g. write "राजनेता" or "rajneta", NEVER write broken words like "raja neta").
  * Highlight their real public service, social work, and organizations mentioned in the sources.
- For public offices and well-known world figures (e.g., Prime Minister of India is Narendra Modi, President of India is Droupadi Murmu), answer with confidence and clarity.
- For unverified private platform users or unknown individuals, do not invent fake personal biographies.
- Never claim an action succeeded without real execution receipts.
Respond directly, accurately, and concisely in natural Hindi, Hinglish, or English matching the user's language. Keep responses helpful and under 3-4 paragraphs.`;

    const trimmedHistory = history.slice(-6).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    }));

    const finalUserContent = groundingContext
      ? `[Live Verified Search Context]:\n${groundingContext}\n\n[User Question]:\n${message.trim()}`
      : message.trim();

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...trimmedHistory,
      { role: 'user', content: finalUserContent },
    ];

    // 0. Instant Deterministic Handlers for Greetings & Navigation
    const cleanMsg = (message || '').toLowerCase().trim();
    if (/^(hi|hello|hey|namaste|kaise ho|kya haal hai|good morning|good evening|pranam)\b/i.test(cleanMsg)) {
      return {
        success: true,
        text: `Namaste ${userName}! Main Tolee AI Personal Manager hoon. Main bilkul theek hoon! Aapke liye Tolee posts banana, strategy plan karna, coding, ya kisi bhi sawal ka jawab taiyar kar sakta hoon. Bataiye aaj main aapki kya madad karoon?`,
        provider: 'tolee-local',
        model: 'fast-greeting',
        latencyMs: Date.now() - startTime,
      };
    }

    if (cleanMsg.includes('google.com') || cleanMsg.includes('google open') || cleanMsg.includes('khol do') || cleanMsg.includes('kholega')) {
      return {
        success: true,
        text: `Haan bilkul! Aap Google ko yahan se directly access kar sakte hain: [Google Search](https://www.google.com)\n\nAgar aapko koi specific jankari ya search karna hai, toh aap mujhe yahin direct bata sakte hain, main live web research karke aapko verified data yahin provide kar dunga.`,
        provider: 'tolee-local',
        model: 'fast-navigator',
        latencyMs: Date.now() - startTime,
      };
    }

    // 1. Primary: NVIDIA NIM (Rotates across active keys with 12s timeout)
    const candidateKeys = FAST_NVIDIA_KEYS.length > 0 ? FAST_NVIDIA_KEYS.slice(0, 3) : ['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'];
    for (const apiKey of candidateKeys) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s generous window for cloud inference

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
            temperature: groundingContext ? 0.1 : 0.4,
            max_tokens: 600,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) {
            const validated = ToleeRealityValidator.validate(content, {
              userMessage: message,
              searchEvidence: liveWebContext,
            });

            return {
              success: true,
              text: validated.sanitizedContent,
              provider: 'nvidia-nim',
              model: 'meta/llama-3.2-11b-vision-instruct',
              latencyMs: Date.now() - startTime,
            };
          }
        }
      } catch (err: any) {
        // Try next key in pool
      }
    }

    // 2. High-Speed Fallback: Pollinations Multi-Model Gateway (1-2s response)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const pollRes = await fetch('https://gen.pollinations.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai',
          messages: apiMessages,
          temperature: groundingContext ? 0.1 : 0.3,
          max_tokens: 600,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (pollRes.ok) {
        const pollData = await pollRes.json();
        const content = pollData.choices?.[0]?.message?.content?.trim();
        if (content) {
          return {
            success: true,
            text: content,
            provider: 'pollinations-ai',
            model: 'openai',
            latencyMs: Date.now() - startTime,
          };
        }
      }
    } catch (pollErr: any) {
      // Fallback to direct raw text endpoint
      try {
        const rawRes = await fetch(`https://text.pollinations.ai/${encodeURIComponent(message)}?system=${encodeURIComponent(systemPrompt.slice(0, 300))}`);
        if (rawRes.ok) {
          const rawText = await rawRes.text();
          if (rawText && rawText.trim()) {
            return {
              success: true,
              text: rawText.trim(),
              provider: 'pollinations-text',
              model: 'default',
              latencyMs: Date.now() - startTime,
            };
          }
        }
      } catch {}
    }

    // 2. Intelligent Deterministic Fallback for Core Common Knowledge
    const lowerMsg = (message || '').toLowerCase();
    if (lowerMsg.includes('pm') || lowerMsg.includes('prime minister') || lowerMsg.includes('pradhan mantri')) {
      if (lowerMsg.includes('india') || lowerMsg.includes('bharat') || !lowerMsg.includes(' of ')) {
        return {
          success: true,
          text: `भारत के वर्तमान प्रधानमंत्री **श्री नरेंद्र मोदी** (Narendra Modi) हैं। वे 26 मई 2014 से भारत के प्रधानमंत्री के रूप में सेवारत हैं।`,
          provider: 'tolee-knowledge',
          model: 'verified-gk',
          latencyMs: Date.now() - startTime,
        };
      }
    }

    // 3. Fallback answer: signal false so CentralAIEngine fallback brain takes over
    return {
      success: false,
      text: '',
      provider: 'tolee-local',
      model: 'fast-local',
      latencyMs: Date.now() - startTime,
    };
  }
}
