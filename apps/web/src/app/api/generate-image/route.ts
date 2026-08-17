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

    const { prompt, style, aspectRatio, count, model } = await request.json();

    // Basic sanitization: limit length and remove harmful chars if necessary
    const safePrompt = prompt ? prompt.substring(0, 1000).replace(/[<>]/g, '') : '';

    if (!safePrompt) {
      return NextResponse.json({ success: false, error: 'Prompt is required' });
    }

    // Open-Generative-AI Multi-Model Prompt Optimization Engine
    const MODEL_BLUEPRINTS: Record<string, string> = {
      flux_realism: 'FLUX.1 photorealism, extremely detailed 8k photography, natural skin texture, atmospheric lighting, sharp focus, RAW color grading',
      midjourney_v6: 'Midjourney v6 aesthetic, hyper-detailed artistic masterpiece, golden hour volumetric light, cinematic composition, award-winning visual art',
      ideogram_typography: 'Ideogram v2 typography design, 3D commercial graphic poster, crisp bold lettering, advertising layout, vibrant color palette',
      sd_35_masterpiece: 'Stable Diffusion 3.5 Large, masterpiece artwork, intricate textures, dynamic studio lighting, fine art finish, 8k resolution'
    };

    // Fooocus V2 Style & Prompt Expansion Engine
    const FOOOCUS_EXPANSIONS: Record<string, string> = {
      fooocus_v2: 'cinematic lighting, masterpiece, 8k resolution, photorealistic, sharp focus, intricate details, depth of field',
      fooocus_masterpiece: 'stunning visual masterpiece, extremely fine textures, dramatic natural lighting, ultra-detailed 8k, golden hour illumination',
      fooocus_photography: 'professional DSLR portrait, 85mm f/1.4 lens, natural skin texture, soft bokeh, atmospheric studio lighting',
      fooocus_cinematic: 'epic cinematic movie still, anamorphic lens, volumetric fog, moody color palette, IMAX 70mm aesthetic',
      realistic: 'photorealistic, extremely detailed, 8k resolution, cinematic lighting, professional photographic composition',
      illustration: 'modern digital illustration, highly detailed vector graphic, 2d cartoon aesthetic, vibrant colors',
      marketing: 'premium commercial banner, product advertisement photography, sleek modern layout, corporate advertising',
      social: 'aesthetic lifestyle social media post, trending on Pinterest, soft editorial color grading',
      minimalist: 'minimalist artistic design, clean simple lines, soft pastel colors, generous negative space'
    };

    const modelBlueprint = MODEL_BLUEPRINTS[model] || MODEL_BLUEPRINTS.flux_realism;
    const styleExpansion = FOOOCUS_EXPANSIONS[style] || FOOOCUS_EXPANSIONS.fooocus_v2;

    let enhancedPrompt = `${safePrompt}, ${modelBlueprint}, ${styleExpansion}`;

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

      try {
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

        if (response.ok) {
          const data = await response.json();
          const base64Data = data?.response?.artifacts?.[0]?.base64;
          if (base64Data && base64Data.length > 20000) {
            return `data:image/jpeg;base64,${base64Data}`;
          }
        }
      } catch (nimErr) {
        // Fallback to high-res FLUX engine
      }

      // Secondary High-Performance FLUX.1 Engine Fallback
      const encoded = encodeURIComponent(enhancedPrompt);
      return `https://image.pollinations.ai/prompt/${encoded}?model=flux-realism&width=${width}&height=${height}&seed=${randomSeed}&nologo=true`;
    });

    const urls = await Promise.all(promises);

    return NextResponse.json({ success: true, urls });
  } catch (error: any) {
    console.error('Error generating image:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' });
  }
}


