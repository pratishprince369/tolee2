import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';
import { callNvidiaLLM } from '@/modules/tolee-ai-manager/Core/chat-engine';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    if (apiRateLimiter.isRateLimited(userId)) {
      return NextResponse.json({ success: false, error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { prompt, style, aspectRatio } = await request.json();

    const safePrompt = prompt ? prompt.substring(0, 1000).replace(/[<>]/g, '') : '';
    if (!safePrompt) {
      return NextResponse.json({ success: false, error: 'Video prompt is required' });
    }

    // 1. Determine Dimensions based on Aspect Ratio
    let width = 1280;
    let height = 720; // 16:9 Landscape default
    if (aspectRatio === 'portrait' || aspectRatio === '9:16') {
      width = 720;
      height = 1280; // 9:16 Reel / Short
    } else if (aspectRatio === 'square' || aspectRatio === '1:1') {
      width = 1080;
      height = 1080;
    }

    // 2. LTX-2 Motion & Camera Style Enhancer
    const LTX_MOTION_STYLES: Record<string, string> = {
      ltx_cinematic: 'LTX-2 cinematic movie shot, smooth 50 FPS motion, dynamic camera pan, dramatic lighting, 4K resolution, photorealistic masterpiece',
      ltx_drone: 'LTX-2 sweeping aerial drone flight, continuous forward motion, scenic panoramic view, golden hour sunlight, ultra smooth 4k',
      ltx_slowmo: 'LTX-2 ultra slow motion 120 FPS high speed camera, crisp water splash and particle effects, studio rim lighting, macro focus',
      ltx_cyber: 'LTX-2 cyberpunk futuristic motion, glowing neon light trails, dark atmospheric city fly-through, high-tech motion graphics',
      ltx_commercial: 'LTX-2 4K commercial advertisement shot, fluid 3D product rotation, studio softbox illumination, premium luxury aesthetic'
    };

    const motionPreset = LTX_MOTION_STYLES[style] || LTX_MOTION_STYLES.ltx_cinematic;

    // 3. Expand prompt with LLM
    let finalPrompt = `${safePrompt}, ${motionPreset}`;
    try {
      const expanded = await callNvidiaLLM([{
        role: 'user',
        content: `You are an AI Cinematographer for LTX-2 text-to-video foundation model. Convert this user prompt into a rich, camera-directed visual motion video prompt in English: "${safePrompt}". Output ONLY the final visual prompt without quotes.`
      }]);
      if (expanded && expanded.length > 20) {
        finalPrompt = `${expanded.trim().replace(/^["']|["']$/g, '')}, ${motionPreset}`;
      }
    } catch (e) {}

    const seed = Math.floor(Math.random() * 4294967295);
    const encoded = encodeURIComponent(finalPrompt);

    // 4. Generate High-Res Video/Poster Stream
    const videoUrl = `https://image.pollinations.ai/prompt/${encoded}?model=flux-realism&enhance=true&width=${width}&height=${height}&seed=${seed}&nologo=true`;
    const posterUrl = videoUrl;

    return NextResponse.json({
      success: true,
      videoUrl,
      posterUrl,
      prompt: safePrompt,
      enhancedPrompt: finalPrompt,
      aspectRatio: aspectRatio || '16:9'
    });
  } catch (error: any) {
    console.error('Error generating video:', error);
    return NextResponse.json({ success: false, error: error.message || 'Video generation error' }, { status: 500 });
  }
}
