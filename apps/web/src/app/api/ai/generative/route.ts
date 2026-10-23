export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  generateAiImage,
  generateAiVideo,
  generateAiLipSync,
  pollMuApiResult,
} from '@/lib/generativeAiService';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, prompt, options = {}, requestId } = body;
    const apiKey = request.headers.get('x-api-key') || options.apiKey || process.env.MUAPI_API_KEY;

    if (action === 'check_status') {
      if (!requestId || !apiKey) {
        return NextResponse.json(
          { success: false, error: 'requestId and apiKey are required to poll status' },
          { status: 400 }
        );
      }
      const statusRes = await pollMuApiResult(requestId, apiKey, 1);
      return NextResponse.json(statusRes);
    }

    if (action === 'generate_image') {
      if (!prompt) {
        return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
      }
      const res = await generateAiImage(prompt, { ...options, apiKey });
      return NextResponse.json(res);
    }

    if (action === 'generate_video') {
      if (!prompt) {
        return NextResponse.json({ success: false, error: 'Prompt is required' }, { status: 400 });
      }
      const res = await generateAiVideo(prompt, { ...options, apiKey });
      return NextResponse.json(res);
    }

    if (action === 'generate_lipsync') {
      const { videoUrl, audioUrl, imageUrl } = body;
      if (!audioUrl || (!videoUrl && !imageUrl)) {
        return NextResponse.json(
          { success: false, error: 'audioUrl and (videoUrl or imageUrl) are required' },
          { status: 400 }
        );
      }
      const res = await generateAiLipSync({ videoUrl, audioUrl, imageUrl, apiKey });
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API /api/ai/generative error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
