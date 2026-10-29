import { NextRequest, NextResponse } from 'next/server';
import { recordPlaybackFailure, recordPlaybackSuccess } from '@/lib/videoValidationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reelId, status, errorDetail } = body;

    if (!reelId || typeof reelId !== 'string') {
      return NextResponse.json({ success: false, error: 'Invalid reelId' }, { status: 400 });
    }

    if (status === 'success') {
      await recordPlaybackSuccess(reelId);
      return NextResponse.json({ success: true, action: 'recorded_success' });
    }

    const detail = errorDetail || 'Video playback failed on client';
    await recordPlaybackFailure(reelId, detail);

    return NextResponse.json({ success: true, action: 'recorded_failure' });
  } catch (err: any) {
    console.error('[API /api/video/report-failure Error]:', err?.message || err);
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
