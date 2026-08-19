'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prismaAI } from '@/lib/prisma-ai';

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
  'mistralai/mistral-nemo-12b-instruct'
];

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  for (const key of NVIDIA_KEYS) {
    for (const model of AI_MODELS) {
      try {
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
            temperature: 0.7,
            max_tokens: 3000,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          const content = json.choices?.[0]?.message?.content?.trim();
          if (content) return content;
        }
      } catch {
        // Continue to next key/model
      }
    }
  }
  throw new Error('AI Service temporarily unavailable. Please try again.');
}

export interface PlatformPostVariations {
  linkedin: {
    hook: string;
    body: string;
    cta: string;
    hashtags: string[];
    fullPost: string;
  };
  instagram: {
    hook: string;
    body: string;
    hashtags: string[];
    fullPost: string;
  };
  twitter: {
    tweet1: string;
    tweet2?: string;
    tweet3?: string;
    hashtags: string[];
    fullPost: string;
  };
  facebook: {
    body: string;
    cta: string;
    hashtags: string[];
    fullPost: string;
  };
  whatsapp: {
    formattedMessage: string;
  };
  viralityScore: number;
  suggestions: string[];
}

/**
 * 1. AI Multi-Platform Social Content Generator
 */
export async function generateSocialPostVariations(params: {
  topic: string;
  tone: 'professional' | 'viral' | 'casual' | 'storytelling' | 'promotional';
  targetAudience?: string;
  includeLink?: string;
}): Promise<{
  success: boolean;
  variations?: PlatformPostVariations;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required. Please sign in to use Social Publisher.' };
    }

    if (!params.topic || params.topic.trim().length < 5) {
      return { success: false, error: 'Please provide a topic or idea with at least 5 characters.' };
    }

    const systemPrompt = `You are the Master AI Social Media Copywriter & Viral Content Strategist.
Generate tailored, high-converting social media posts for multiple platforms based on the user's topic and chosen tone.

PLATFORM SPECIFICATIONS:
1. LINKEDIN: Professional, high-value storytelling. Strong 1-2 line hook, clean spacing, bullet points, insightful takeaway, clear CTA, 3-5 relevant industry hashtags.
2. INSTAGRAM: Highly visual, conversational, aesthetic emojis, line breaks, engaging question at the end, 15-20 viral and niche hashtags.
3. TWITTER/X: Punchy, high-impact. Primary tweet strictly under 280 characters. Optional 2-part thread continuation for deep topics. 2-3 hashtags.
4. FACEBOOK: Friendly, relatable story format, community engagement question, 3-5 hashtags.
5. WHATSAPP: Formatted with *bold*, _italics_, clean bullet points (•), and a clean link or call to action.

OUTPUT FORMAT: Return ONLY a valid JSON object matching this schema (NO markdown backticks, pure JSON):
{
  "linkedin": {
    "hook": "Strong opening line",
    "body": "Main insightful points with clean line spacing",
    "cta": "Call to action line",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
    "fullPost": "Complete ready-to-post LinkedIn text"
  },
  "instagram": {
    "hook": "Eye-catching opening",
    "body": "Engaging caption with emojis",
    "hashtags": ["#Tag1", "#Tag2", "#Tag3", "#Tag4", "#Tag5"],
    "fullPost": "Complete Instagram caption with hashtags"
  },
  "twitter": {
    "tweet1": "Punchy main tweet under 280 chars",
    "tweet2": "Thread continuation 1 if needed",
    "tweet3": "Thread conclusion + CTA if needed",
    "hashtags": ["#Tag1", "#Tag2"],
    "fullPost": "Complete tweet or thread string"
  },
  "facebook": {
    "body": "Engaging post body",
    "cta": "Engagement question",
    "hashtags": ["#Tag1", "#Tag2"],
    "fullPost": "Complete Facebook post"
  },
  "whatsapp": {
    "formattedMessage": "*Title*\n\nMessage body with bullet points\n\n• Point 1\n• Point 2\n\n_Call to action_"
  },
  "viralityScore": 92,
  "suggestions": ["3 quick tips to make this post perform even better"]
}`;

    const userPrompt = `Topic / Idea: "${params.topic}"
Chosen Tone: ${params.tone}
${params.targetAudience ? `Target Audience: ${params.targetAudience}` : ''}
${params.includeLink ? `Target Link to include: ${params.includeLink}` : ''}

Please generate the viral multi-platform JSON output now.`;

    const rawAI = await callAI(systemPrompt, userPrompt);
    const cleanedJson = rawAI.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed: PlatformPostVariations = JSON.parse(cleanedJson);

    return {
      success: true,
      variations: parsed,
    };
  } catch (err: any) {
    console.error('[SocialPublisher] Generation error:', err);
    return { success: false, error: err.message || 'Failed to generate social media content.' };
  }
}

/**
 * 2. 1-Click AI Caption Refiner
 */
export async function improveSocialCaption(params: {
  caption: string;
  platform: 'linkedin' | 'instagram' | 'twitter' | 'facebook' | 'whatsapp';
  instruction: 'shorter' | 'more_punchy' | 'add_emojis' | 'strong_cta' | 'add_stats';
}): Promise<{
  success: boolean;
  improved?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const systemPrompt = `You are a social media copy editor. Improve the given caption specifically for ${params.platform.toUpperCase()} following this exact instruction: "${params.instruction}". Keep the output ready to paste immediately without any conversational chatter or quotes.`;
    
    const userPrompt = `Current Caption:\n${params.caption}\n\nImprove it now:`;
    const improved = await callAI(systemPrompt, userPrompt);

    return {
      success: true,
      improved: improved.trim(),
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to improve caption.' };
  }
}

/**
 * 3. AI Viral Hashtag Generator
 */
export async function generateViralHashtags(params: {
  topic: string;
  platform: 'instagram' | 'linkedin' | 'twitter';
}): Promise<{
  success: boolean;
  hashtags?: string[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const systemPrompt = `You are a social media growth algorithm expert. Return a JSON array of 15 trending, high-engagement, relevant hashtags (e.g. ["#TechNews", "#AI", "#Productivity"]) for ${params.platform}. Return ONLY valid JSON array.`;
    const userPrompt = `Topic: ${params.topic}`;
    const raw = await callAI(systemPrompt, userPrompt);
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const tags: string[] = JSON.parse(cleaned);

    return {
      success: true,
      hashtags: Array.isArray(tags) ? tags : [],
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to generate hashtags.' };
  }
}

export interface ScheduledPostItem {
  id: string;
  topic: string;
  tone: string;
  platforms: string[];
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  postsData: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    whatsapp?: string;
  };
  scheduledAt: string;
  status: 'SCHEDULED' | 'PUBLISHED' | 'CANCELLED' | 'FAILED';
  createdAt: string;
}

/**
 * 4. Schedule a Social Post Campaign
 */
export async function scheduleSocialPost(params: {
  topic: string;
  tone: string;
  platforms: string[];
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  postsData: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    facebook?: string;
    whatsapp?: string;
  };
  scheduledAt: string; // ISO string
}): Promise<{
  success: boolean;
  scheduledPost?: ScheduledPostItem;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required. Please sign in to schedule posts.' };
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Creator';
    const userAvatar = (session.user as any).image;

    const scheduledDate = new Date(params.scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return { success: false, error: 'Invalid schedule date and time.' };
    }

    const record = await (prismaAI as any).scheduledSocialPost.create({
      data: {
        userId,
        userName,
        userAvatar,
        topic: params.topic,
        tone: params.tone,
        mediaUrl: params.mediaUrl || null,
        mediaType: params.mediaType || null,
        platforms: params.platforms,
        postsData: params.postsData,
        scheduledAt: scheduledDate,
        status: 'SCHEDULED',
      },
    });

    return {
      success: true,
      scheduledPost: {
        id: record.id,
        topic: record.topic,
        tone: record.tone,
        platforms: record.platforms,
        mediaUrl: record.mediaUrl,
        mediaType: record.mediaType,
        postsData: record.postsData,
        scheduledAt: record.scheduledAt.toISOString(),
        status: record.status,
        createdAt: record.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error('[SocialPublisher] Schedule error:', err);
    return { success: false, error: err.message || 'Failed to schedule post.' };
  }
}

/**
 * 5. Get User's Scheduled Queue
 */
export async function getUserScheduledPosts(): Promise<{
  success: boolean;
  posts: ScheduledPostItem[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, posts: [] };
    }

    const userId = (session.user as any).id;
    const posts = await (prismaAI as any).scheduledSocialPost.findMany({
      where: { userId },
      orderBy: { scheduledAt: 'asc' },
    });

    return {
      success: true,
      posts: posts.map((p: any) => ({
        id: p.id,
        topic: p.topic,
        tone: p.tone,
        platforms: p.platforms,
        mediaUrl: p.mediaUrl,
        mediaType: p.mediaType,
        postsData: p.postsData,
        scheduledAt: p.scheduledAt.toISOString(),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { success: false, posts: [], error: err.message };
  }
}

/**
 * 6. Cancel or Delete a Scheduled Post
 */
export async function cancelScheduledPost(postId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const userId = (session.user as any).id;
    await (prismaAI as any).scheduledSocialPost.deleteMany({
      where: { id: postId, userId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

