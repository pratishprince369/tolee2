import { NextRequest, NextResponse } from 'next/server';
import { submitPlaybackSession } from '@/actions/post';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const result = await submitPlaybackSession(data);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Playback Session Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
