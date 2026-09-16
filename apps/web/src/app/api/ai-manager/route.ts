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

    const candidateKeys = [
      process.env.NVIDIA_API_KEY,
      process.env.NVIDIA_LLM_KEY,
      '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',
      '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',
      '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'
    ].filter((k): k is string => Boolean(k && k.trim()));

    const apiKey = candidateKeys[0];
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'NVIDIA API Key not configured on server.' }, { status: 500 });
    }

    // 3. Define Universal AI Assistant System Prompt
    const systemPrompt = `You are Tolee AI Manager, a world-class General-Purpose AI Assistant (comparable to ChatGPT and Google Gemini) and dedicated Tolee Platform Specialist.

CORE CAPABILITIES:
1. UNIVERSAL GENERAL AI ASSISTANT:
   - Answer general knowledge, science, mathematics, coding, software architecture, debugging, marketing, business, SEO, writing, translation, and everyday queries thoroughly, accurately, and naturally.
   - For programming questions: Provide clean, idiomatic, runnable code with clear explanations.
   - For language queries: Respond fluently in English, Hindi, Marathi, or Hinglish matching the user's language.
   - Never say "I can only help with Tolee" or "I am only an ad manager". You have full general AI intellect.

2. TOLEE PLATFORM SPECIALIST:
   - When asked about Tolee, community growth, post creation, ads, groups, or campaigns, provide expert marketing advice and actionable drafts.

OUTPUT FORMAT:
Respond with a JSON object:
{
  "text": "Your helpful, comprehensive markdown answer to the user's question.",
  "draft": {
    "title": "Ad/Post title if post/ad requested, else null",
    "caption": "Polished caption/post copy with emojis if requested, else null",
    "hashtags": ["#Tolee", "#RelevantHashtag"],
    "location": "Target location if relevant, else null",
    "audience": "Target audience if relevant, else null",
    "imagePrompt": "Image prompt for visual generator if relevant, else null"
  }
}
If the user's query does not require a post/ad draft (e.g. general question, coding, math, general chat), set "draft": null.`;

    // 4. Construct messages payload for the Llama model
    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => ({
        role: m.isMe ? 'user' : 'assistant',
        content: m.text
      }))
    ];

    // 5. Query the NVIDIA API with verified active model
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta/llama-3.2-11b-vision-instruct',
        messages: apiMessages,
        temperature: 0.4,
        max_tokens: 1500,
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

    // 6. Robust extraction of the JSON response with zero-fail fallback
    let parsedObj: any = null;
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
    } catch {
      // Graceful fallback: treat entire output as formatted text
      parsedObj = { text: assistantOutput, draft: null };
    }

    const responseText = (parsedObj && typeof parsedObj.text === 'string') ? parsedObj.text : assistantOutput;

    return NextResponse.json({
      success: true,
      text: responseText,
      draft: parsedObj?.draft || null
    });

  } catch (error: any) {
    console.error('API Error in /api/ai-manager:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
