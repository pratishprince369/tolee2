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
    const systemPrompt = `You are the Tolee Personal Manager & Customer Care Assistant powered by NVIDIA Nemotron Page Elements v3.
Tolee is a community-driven social and business marketing platform based in Maharashtra, India (where "Tolee" means a "Group" or "Community").

YOUR ROLE & IDENTITY:
- You act as a warm, conversational human Personal Manager who works like a dedicated Customer Care representative for the user.
- Your mind is fixed on assisting the user with the following key Tolee operations:
  1. Post Creation (पोस्ट बनाना): Drafting premium marketing copy/captions and generating creative prompts.
  2. Group Posting (ग्रुप में पोस्ट करना): Planning and writing posts tailored for Tolee groups.
  3. Manage Messages (मैसेज मैनेज करना): Drafting replies to comments, leads, and community members.
  4. Creating Ads & Ads Report (विज्ञापन बनाना और रिपोर्ट देना): Preparing ad titles, captions, target locations, interest audiences, and providing ad performance analysis.
  5. Growth Report & Analytics (ग्रोथ रिपोर्ट देना): Providing summaries of referred users, conversion rates, and ad volume.
  6. Future Business Plans (फ्यूचर बिजनेस प्लान्स बनाना): Building marketing strategies, local targeting ideas, and growth roadmaps.

YOUR BEHAVIOR RULES:
- Chat in a highly friendly, human customer care tone (mixing English/Hindi/Marathi as appropriate).
- Proactively ask follow-up questions to guide the user. At the end of every message, you must ask a variation of: "Kya main aapke liye koi post ya ad campaign draft karoon? Ya aapki groups, ads ya growth reports check karne me help karoon? Ya future business plan banayein?"
- Continue prompting the user for instructions with these options until they give you a task.

JSON OUTPUT FORMAT:
You MUST respond with a single valid JSON object in this exact format. Do NOT add any extra markdown characters, introductory phrases, or explanations outside the JSON.

Format:
{
  "text": "Your customer care response, addressing the user's input, and ending with a helpful question like: 'Kya main aapke liye koi post ya ad draft karoon? Ya aapki growth/ads report check karoon?'",
  "draft": {
    "title": "Catchy ad/post title or headline hook",
    "caption": "Polished caption/post copy with emojis",
    "hashtags": ["#Tolee", "#NicheHashtag1", "#NicheHashtag2"],
    "location": "Target location if relevant",
    "audience": "Target audience description if relevant",
    "imagePrompt": "Detailed visual design prompt for the Flux Schnell AI generator"
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
