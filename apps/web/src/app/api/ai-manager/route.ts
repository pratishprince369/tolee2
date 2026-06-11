import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // 1. Authenticate Request
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (apiRateLimiter.isRateLimited(userId)) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // 2. Parse request payload
    const { messages } = await request.json();
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'Messages are required.' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'NVIDIA API Key not configured on server.' }, { status: 500 });
    }

    // 3. Define detailed System Prompt
    const systemPrompt = `You are the AI Tolee Manager Copywriter, an expert senior marketing copywriter and digital ads manager for Tolee.in.
Tolee is a community-driven social and business marketing platform based in Maharashtra, India.
"Tolee" is a Marathi word that means a "Group" or "Community".

YOUR BEHAVIOR AND RULES:
- You act as a world-class copywriter. When a user provides any rough business description, product idea, or post, you MUST craft premium, highly engaging marketing copy for them.
- Translate raw, minimal, or multilingual inputs (English, Hindi, Marathi) into clean, high-impact marketing titles, professional captions with emojis, and clean hashtags.
- Formulate a highly detailed, professional image generation prompt ("imagePrompt") for the Flux Schnell AI generator to create matching creatives. The prompt must describe the visual elements, background, style, and lighting in detail (e.g. "A premium box of handmade organic lavender soap on a rustic wooden table with natural morning light, photorealistic, professional product commercial photography").
- Extract target location and target audience interests based on their business description.
- DO NOT say "I have published this" or "I have shared this". You are strictly preparing a refined copywriting DRAFT.

JSON OUTPUT FORMAT:
You MUST respond with a single valid JSON object in this exact format. Do NOT add any extra markdown characters, introductory phrases, or explanations outside the JSON.

Format:
{
  "text": "Your human-like friendly message welcoming them, giving professional copy tips, and explaining your draft.",
  "draft": {
    "title": "A catchy, high-converting premium title or headline hook",
    "caption": "A fully polished and rewritten caption / primary ad text with emojis and clear call to action",
    "hashtags": ["#Tolee", "#NicheHashtag1", "#NicheHashtag2"],
    "location": "Target city/region (e.g. Kalyan, Thane, Mumbai, Pune, Maharashtra) if relevant",
    "audience": "Niche target interests/behaviors (e.g. food lovers, home buyers, skincare experts)",
    "imagePrompt": "A detailed, descriptive design prompt engineered for the AI image generator to produce the matching graphic"
  }
}

If you do NOT have enough information to construct a draft yet, or you are simply introducing Tolee, set "draft" to null.
`;

    // 4. Construct messages payload for the Llama model
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.isMe ? 'user' : 'assistant',
        content: m.text
      }))
    ];

    // 5. Query the NVIDIA API
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.1-70b-instruct',
        messages: apiMessages,
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API Error status:', response.status, errorText);
      return NextResponse.json({ success: false, error: `NVIDIA Chat Completions error: ${response.statusText}` }, { status: response.status });
    }

    const resData = await response.json();
    const assistantOutput = resData?.choices?.[0]?.message?.content || '';

    // 6. Robust extraction of the JSON response
    let parsedObj = null;
    try {
      let cleanOutput = assistantOutput.trim();
      if (cleanOutput.includes('```')) {
        const match = cleanOutput.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (match && match[1]) {
          cleanOutput = match[1].trim();
        }
      }
      const startIdx = cleanOutput.indexOf('{');
      const endIdx = cleanOutput.lastIndexOf('}');
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        cleanOutput = cleanOutput.substring(startIdx, endIdx + 1);
      }
      parsedObj = JSON.parse(cleanOutput);
    } catch (parseErr) {
      console.error('Failed to parse model response:', assistantOutput, parseErr);
      return NextResponse.json({ success: false, error: 'Received invalid JSON from model completions.' });
    }

    if (!parsedObj || typeof parsedObj.text !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid response format from assistant.' });
    }

    return NextResponse.json({
      success: true,
      text: parsedObj.text,
      draft: parsedObj.draft || null
    });

  } catch (error: any) {
    console.error('API Error in /api/ai-manager:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
