import { NextResponse } from 'next/server';
import { attachAudioToReelAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.postId || !body.songId) {
      return NextResponse.json({ success: false, error: 'postId and songId are required' }, { status: 400 });
    }

    const result = await attachAudioToReelAction({
      postId: body.postId,
      songId: body.songId,
      startTime: Number(body.startTime) || 0,
      endTime: Number(body.endTime) || 30,
      duration: Number(body.duration) || 30,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
