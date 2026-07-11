import { NextRequest, NextResponse } from 'next/server';
import { checkPostAvailability } from '@/actions/post';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const videoId = searchParams.get('videoId');

    if (!videoId) {
      return NextResponse.json({ success: false, error: 'videoId is required' }, { status: 400 });
    }

    const res = await checkPostAvailability(videoId);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
