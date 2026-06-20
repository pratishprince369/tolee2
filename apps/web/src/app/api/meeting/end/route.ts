import { NextRequest, NextResponse } from 'next/server';
import { updateMeetingStatus } from '@/actions/meeting';

export async function POST(req: NextRequest) {
  try {
    const { meetingId } = await req.json();
    if (!meetingId) {
      return NextResponse.json({ success: false, error: 'Missing meetingId' }, { status: 400 });
    }

    console.log(`[API Meeting End] Terminating meeting session: ${meetingId}`);
    const res = await updateMeetingStatus(meetingId, 'end');
    
    return NextResponse.json(res);
  } catch (error: any) {
    console.error('[API Meeting End Error]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
