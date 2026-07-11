import { NextRequest, NextResponse } from 'next/server';
import { muteGroupNotifications } from '@/actions/tolee';

export async function POST(req: NextRequest) {
  try {
    const { toleeId, duration } = await req.json();
    if (!toleeId) {
      return NextResponse.json({ success: false, error: 'toleeId is required' }, { status: 400 });
    }

    const res = await muteGroupNotifications(toleeId, duration);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
