'use server';

// Multi-Key NVIDIA API Keys pool
const NVIDIA_KEYS = [
  process.env.NVIDIA_API_KEY,
  process.env.NVIDIA_API_KEY_2,
  process.env.NVIDIA_API_KEY_3,
  process.env.NVIDIA_API_KEY_4,
  process.env.NVIDIA_API_KEY_5,
].filter(Boolean) as string[];

const AI_MODELS = [
  'meta/llama-3.1-70b-instruct',
  'qwen/qwen2.5-72b-instruct',
  'meta/llama-3.1-8b-instruct',
  'mistralai/mistral-nemo-12b-instruct',
];

export type PostCategoryType = 'requirement' | 'reel' | 'news' | 'regular';

export interface CategoryDetectionResult {
  category: PostCategoryType;
  confidence: number;
  reason: string;
  suggestedTags: string[];
  headline?: string;
}

/**
 * Fast heuristic fallback classifier if AI service is offline or rate-limited.
 */
function heuristicClassify(
  caption: string,
  hasVideo: boolean,
  hasImages: boolean
): CategoryDetectionResult {
  const text = (caption || '').toLowerCase();

  // 1. Requirement Detection
  const reqKeywords = [
    'looking for', 'need a', 'need an', 'needed', 'wanted', 'hiring',
    'flatmate', 'roommate', 'pg available', 'flat for rent', 'house for rent',
    'urgent requirement', 'urgently required', 'plumber needed', 'doctor needed',
    'tutor required', 'driver required', 'maid needed', 'cook needed',
    'buy/sell', 'for sale', 'wtb', 'wts', 'budget:', 'contact:'
  ];
  if (reqKeywords.some(kw => text.includes(kw))) {
    return {
      category: 'requirement',
      confidence: 0.92,
      reason: 'Contains explicit requirement or hiring keywords.',
      suggestedTags: ['#requirement', '#community', '#localHelp'],
    };
  }

  // 2. Reel Detection
  if (hasVideo && !text.includes('breaking') && !text.includes('press release')) {
    return {
      category: 'reel',
      confidence: 0.95,
      reason: 'Contains video media suited for Tolee Reels & Feed showcase.',
      suggestedTags: ['#reels', '#trending', '#video'],
    };
  }

  // 3. News Detection
  const newsKeywords = [
    'breaking news', 'breaking:', 'announced today', 'press release',
    'official report', 'govt announces', 'police report', 'investigation reveals',
    'weather alert', 'traffic update', 'traffic alert', 'local municipality',
    'market update', 'economic bulletin', 'special report'
  ];
  if (newsKeywords.some(kw => text.includes(kw)) || text.startsWith('breaking') || text.startsWith('[news]')) {
    return {
      category: 'news',
      confidence: 0.88,
      reason: 'Contains formal news or current event announcement language.',
      suggestedTags: ['#news', '#breaking', '#updates'],
    };
  }

  // 4. Default: Regular Post
  return {
    category: 'regular',
    confidence: 0.85,
    reason: hasImages ? 'Photo post with social update.' : 'General thoughts and community update.',
    suggestedTags: ['#tolee', '#post', '#lifestyle'],
  };
}

/**
 * AI-powered category detection using NVIDIA NIM endpoint.
 */
export async function detectPostCategoryAction(params: {
  caption: string;
  hasVideo: boolean;
  hasImages: boolean;
  fileName?: string;
}): Promise<CategoryDetectionResult> {
  const { caption, hasVideo, hasImages, fileName } = params;

  if (!caption && !hasVideo && !hasImages) {
    return {
      category: 'regular',
      confidence: 0.5,
      reason: 'Empty draft post.',
      suggestedTags: [],
    };
  }

  // If no NVIDIA keys configured, run instantaneous heuristic
  if (NVIDIA_KEYS.length === 0) {
    return heuristicClassify(caption, hasVideo, hasImages);
  }

  const systemPrompt = `You are the Tolee AI Post Classifier.
Analyze the user post caption and media metadata, and classify it into EXACTLY ONE of these 4 categories:
1. "requirement": Needs, hiring, flatmate hunt, buy/sell request, urgent help, tutor/maid/doctor/service needed.
2. "reel": Short video clips, music reels, dance, talent, entertainment, vertical videos.
3. "news": Breaking news, municipal/civic alerts, investigative reports, press releases, formal public updates.
4. "regular": Normal social photos, personal thoughts, general community discussions, casual updates.

Rules:
- If media hasVideo is true and content is casual/entertainment, strongly favor "reel".
- If user mentions needing or looking for services, roommates, jobs, favor "requirement".
- If content describes public events, governance, accidents, announcements, favor "news".
- Return STRICT JSON only with NO MARKDOWN, NO CODEBLOCKS, format:
{"category": "requirement" | "reel" | "news" | "regular", "confidence": 0.0-1.0, "reason": "brief 1 sentence explanation", "suggestedTags": ["#tag1", "#tag2"]}`;

  const userPrompt = `Media Info: hasVideo=${hasVideo}, hasImages=${hasImages}, fileName=${fileName || 'none'}
Caption:
"""
${caption.slice(0, 2000)}
"""`;

  for (const key of NVIDIA_KEYS) {
    for (const model of AI_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s ceiling

        const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 300,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          const rawContent = json.choices?.[0]?.message?.content?.trim() || '';
          const cleaned = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          if (parsed.category && ['requirement', 'reel', 'news', 'regular'].includes(parsed.category)) {
            return {
              category: parsed.category,
              confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.9,
              reason: parsed.reason || 'AI classified based on content context.',
              suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
            };
          }
        }
      } catch {
        // Failover to next key / model
        continue;
      }
    }
  }

  // Graceful fallback to heuristic if all API calls fail or timeout
  return heuristicClassify(caption, hasVideo, hasImages);
}
