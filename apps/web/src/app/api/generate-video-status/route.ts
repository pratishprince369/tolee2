import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// NVIDIA NIM — async job status check (only used if initial response was async)
const NVIDIA_STATUS_URL = 'https://ai.api.nvidia.com/v1/status';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('id');

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'NVIDIA API key is not configured.' },
        { status: 500 }
      );
    }

    const response = await fetch(`${NVIDIA_STATUS_URL}/${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[generate-video-status] NVIDIA API error:', response.status, errText);
      return NextResponse.json(
        { success: false, status: 'error', error: `NVIDIA returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Status: fulfilled / completed / succeeded
    if (['fulfilled', 'completed', 'succeeded', 'success'].includes(data?.status?.toLowerCase())) {
      const videoBase64 = data?.response?.video ?? data?.output?.[0] ?? data?.video;
      if (videoBase64) {
        const videoDataUrl = videoBase64.startsWith('data:')
          ? videoBase64
          : `data:video/mp4;base64,${videoBase64}`;
        return NextResponse.json({ success: true, status: 'success', url: videoDataUrl });
      }
      return NextResponse.json({ success: false, status: 'error', error: 'No video output in response.' });
    }

    // Status: pending / running / processing
    if (['pending', 'running', 'processing', 'queued'].includes(data?.status?.toLowerCase())) {
      return NextResponse.json({ success: true, status: 'processing' });
    }

    // Status: failed / error
    if (['failed', 'error', 'cancelled'].includes(data?.status?.toLowerCase())) {
      return NextResponse.json({
        success: false,
        status: 'error',
        error: data?.detail || data?.message || 'Video generation failed.',
      });
    }

    // Unknown — treat as still processing
    console.warn('[generate-video-status] Unknown NVIDIA status:', data?.status);
    return NextResponse.json({ success: true, status: 'processing' });

  } catch (error: any) {
    console.error('Error in /api/generate-video-status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
