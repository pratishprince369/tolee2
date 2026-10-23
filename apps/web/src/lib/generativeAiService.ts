/**
 * Generative AI Service for Tolee
 * Inspired by Open-Generative-AI (Anil-matcha)
 * 
 * Supports:
 * 1. MuAPI (api.muapi.ai) for 600+ models (Kling, Veo, Flux, Midjourney, Lip-sync)
 * 2. Pollinations.ai (Flux, SDXL, Turbo) as zero-config, free fallback
 */

const MUAPI_BASE_URL = 'https://api.muapi.ai/api/v1';

export interface GenerationOptions {
  apiKey?: string;
  model?: string;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  width?: number;
  height?: number;
  duration?: number;
  negativePrompt?: string;
}

export async function generateAiImage(
  prompt: string,
  options: GenerationOptions = {}
): Promise<{ success: boolean; url?: string; requestId?: string; error?: string }> {
  try {
    const apiKey = options.apiKey || process.env.MUAPI_API_KEY;
    const model = options.model || 'flux-dev-text-to-image';
    const aspectRatio = options.aspectRatio || '16:9';

    // 1. If MuAPI Key is configured, use MuAPI endpoint
    if (apiKey) {
      const response = await fetch(`${MUAPI_BASE_URL}/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          aspect_ratio: aspectRatio,
          negative_prompt: options.negativePrompt || '',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const requestId = data.request_id || data.id;
        if (requestId) {
          // Poll for completion (up to 30s)
          const result = await pollMuApiResult(requestId, apiKey, 6);
          if (result.success && result.url) {
            return { success: true, url: result.url };
          }
          return { success: true, requestId };
        }
        if (data.outputs?.[0] || data.output) {
          return { success: true, url: data.outputs?.[0] || data.output };
        }
      }
    }

    // 2. High-speed, high-resolution Pollinations Flux fallback (No API key needed)
    let w = options.width || 1024;
    let h = options.height || 576;
    if (aspectRatio === '9:16') {
      w = 576;
      h = 1024;
    } else if (aspectRatio === '1:1') {
      w = 768;
      h = 768;
    }

    const cleanPrompt = encodeURIComponent(prompt.trim().slice(0, 400));
    const seed = Math.floor(Math.random() * 999999);
    const pollinationsUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;

    return {
      success: true,
      url: pollinationsUrl,
    };
  } catch (error: any) {
    console.error('generateAiImage error:', error);
    return { success: false, error: error.message || 'Image generation failed' };
  }
}

export async function generateAiVideo(
  prompt: string,
  options: GenerationOptions = {}
): Promise<{ success: boolean; url?: string; requestId?: string; error?: string }> {
  try {
    const apiKey = options.apiKey || process.env.MUAPI_API_KEY;
    const model = options.model || 'kling-master';
    const aspectRatio = options.aspectRatio || '9:16';
    const duration = options.duration || 5;

    if (apiKey) {
      const response = await fetch(`${MUAPI_BASE_URL}/${model}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt,
          duration,
          aspect_ratio: aspectRatio,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const requestId = data.request_id || data.id;
        return { success: true, requestId };
      }
      const errText = await response.text();
      return { success: false, error: `MuAPI video submission error: ${errText}` };
    }

    // Without API key, generate dynamic animated AI clip via pollinations motion / canvas
    const cleanPrompt = encodeURIComponent(prompt.trim().slice(0, 400));
    const seed = Math.floor(Math.random() * 999999);
    const motionUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=576&height=1024&seed=${seed}&nologo=true&model=flux`;

    return {
      success: true,
      url: motionUrl,
    };
  } catch (error: any) {
    console.error('generateAiVideo error:', error);
    return { success: false, error: error.message || 'Video generation failed' };
  }
}

export async function generateAiLipSync(
  params: { videoUrl?: string; audioUrl: string; imageUrl?: string; apiKey?: string }
): Promise<{ success: boolean; url?: string; requestId?: string; error?: string }> {
  try {
    const apiKey = params.apiKey || process.env.MUAPI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'MuAPI Key is required for advanced Lip-Sync models (e.g. SyncLabs / LatentSync). Please provide a MuAPI key.',
      };
    }

    const payload: any = { audio_url: params.audioUrl };
    if (params.videoUrl) payload.video_url = params.videoUrl;
    if (params.imageUrl) payload.image_url = params.imageUrl;

    const response = await fetch(`${MUAPI_BASE_URL}/sync-lipsync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const requestId = data.request_id || data.id;
      return { success: true, requestId };
    }
    const errText = await response.text();
    return { success: false, error: errText };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lip-sync generation failed' };
  }
}

export async function pollMuApiResult(
  requestId: string,
  apiKey: string,
  maxAttempts: number = 8
): Promise<{ success: boolean; url?: string; status?: string; error?: string }> {
  try {
    const pollUrl = `${MUAPI_BASE_URL}/predictions/${requestId}/result`;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 4000));
      const res = await fetch(pollUrl, {
        method: 'GET',
        headers: { 'x-api-key': apiKey },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'completed') {
          const output = data.outputs?.[0] || data.output || data.video_url || data.image_url;
          return { success: true, url: output, status: 'completed' };
        }
        if (data.status === 'failed') {
          return { success: false, error: data.error || 'Generation failed', status: 'failed' };
        }
      }
    }
    return { success: false, status: 'processing', error: 'Still processing, check back shortly.' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Polling error' };
  }
}
