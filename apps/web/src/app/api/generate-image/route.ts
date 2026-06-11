import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { apiRateLimiter } from '@/lib/rate-limit';

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

    const { prompt, style, aspectRatio, count } = await request.json();

    // Basic sanitization: limit length and remove harmful chars if necessary
    const safePrompt = prompt ? prompt.substring(0, 1000).replace(/[<>]/g, '') : '';

    if (!safePrompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' });
    }

    // Enhance prompt based on style
    let enhancedPrompt = safePrompt;
    switch (style) {
      case 'realistic':
        enhancedPrompt = `${safePrompt}, photorealistic, extremely detailed, 8k resolution, cinematic lighting, professional photographic composition, high-end DSLR portrait camera shot, natural textures, detailed skin and shadows`;
        break;
      case 'illustration':
        enhancedPrompt = `${safePrompt}, modern digital illustration, highly detailed vector graphic, 2d cartoon aesthetic, vibrant colors, artistic, trending on Behance and Dribbble, clean line art, creative character/scene design`;
        break;
      case 'marketing':
        enhancedPrompt = `${safePrompt}, premium product advertisement banner, marketing banner design, sleek modern typography layout, professional commercial photography, solid elegant background, corporate aesthetic, clean visuals`;
        break;
      case 'social':
        enhancedPrompt = `${safePrompt}, aesthetic lifestyle social media post, trending on Pinterest and Instagram, beautiful soft color grading, clean minimalist composition, high engagement layout, elegant modern vibe`;
        break;
      case 'minimalist':
        enhancedPrompt = `${safePrompt}, minimalist artistic design, clean simple lines, soft pastel colors, generous negative space, sophisticated product display, simple solid color background, elegant framing`;
        break;
    }

    // Determine dimensions
    let width = 1024;
    let height = 1024;
    if (aspectRatio === 'landscape') {
      width = 1024;
      height = 576; // 16:9 ratio
    } else if (aspectRatio === 'portrait') {
      width = 768;
      height = 1024; // 3:4 ratio (looks very nice on feed and reels)
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'NVIDIA API key is not configured on the server.' }, { status: 500 });
    }

    // Generate URLs using NVIDIA NIM API (Flux Schnell)
    const numImages = Math.min(Math.max(1, count || 1), 4);
    const functionId = '105fe02c-924b-4dfa-9797-92d89c3936ad'; // active ai-flux_1-schnell
    const url = `https://api.nvcf.nvidia.com/v2/nvcf/exec/functions/${functionId}`;

    const promises = Array.from({ length: numImages }).map(async () => {
      // Generate a random seed (0 to 4294967295) for each variant
      const randomSeed = Math.floor(Math.random() * 4294967295);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
        body: JSON.stringify({
          requestBody: {
            prompt: enhancedPrompt,
            width,
            height,
            seed: randomSeed,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`NVIDIA API response error (status ${response.status}): ${errorText}`);
      }

      const data = await response.json();
      if (!data || !data.response?.artifacts?.[0]?.base64) {
        throw new Error('NVIDIA API response artifact missing');
      }

      const base64Data = data.response.artifacts[0].base64;
      
      // NVIDIA returns a fully black image (usually < 15KB base64) when it hits safety filters
      if (base64Data.length < 20000) {
        throw new Error('NVIDIA safety filter blocked this prompt. Please modify your text and try again.');
      }

      return `data:image/jpeg;base64,${base64Data}`;
    });

    const urls = await Promise.all(promises);

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' });
  }
}


