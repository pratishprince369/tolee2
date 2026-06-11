import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { commentText, postTitle } = await request.json();
    if (!commentText) {
      return NextResponse.json({ success: false, error: 'commentText is required.' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    let replyText = '';

    if (apiKey) {
      try {
        const prompt = `You are a social media manager for a user on Tolee.
A follower commented: "${commentText}" on a post titled/captioned: "${postTitle || 'Update'}".

Draft a professional, friendly, and high-converting reply suggestion for this comment.
Keep the reply concise (1-2 sentences), friendly, and include an emoji.
Output ONLY the plain text reply, nothing else.`;

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta/llama-3.1-70b-instruct',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
            max_tokens: 150
          })
        });

        if (response.ok) {
          const resData = await response.json();
          replyText = resData?.choices?.[0]?.message?.content?.trim() || '';
        }
      } catch (err) {
        console.error("LLM Reply generation failed, falling back to heuristics:", err);
      }
    }

    // Heuristics Fallback if LLM fails or NVIDIA_API_KEY is not configured
    if (!replyText) {
      const lowerText = commentText.toLowerCase();

      if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('how much')) {
        replyText = "Hi! Let me send you the pricing brochure and available offers in DM right away. 📩";
      } else if (lowerText.includes('phone') || lowerText.includes('number') || lowerText.includes('whatsapp') || lowerText.includes('contact')) {
        replyText = "Thank you! I will send our contact details to your DMs, or feel free to message us directly. 📞";
      } else if (lowerText.includes('where') || lowerText.includes('location') || lowerText.includes('address')) {
        replyText = "Hi! We are located in the region. Sending you our exact address and shop coordinates in DMs! 📍";
      } else if (lowerText.includes('nice') || lowerText.includes('good') || lowerText.includes('great') || lowerText.includes('awesome') || lowerText.includes('wow') || lowerText.includes('super')) {
        replyText = "Thank you so much for the support! Truly appreciate it! 😊";
      } else if (lowerText.includes('available') || lowerText.includes('stock') || lowerText.includes('buy')) {
        replyText = "Yes, it is available! Let me DM you the purchasing details and options. 🛍️";
      } else {
        replyText = "Thank you for reaching out! Sending you a direct message to discuss this. 💬";
      }
    }

    return NextResponse.json({ success: true, replyText });

  } catch (error: any) {
    console.error('API Error in POST /api/ai-manager/generate-reply:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
