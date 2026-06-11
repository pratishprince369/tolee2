import { NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/fcm';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const secret = process.env.INTERNAL_API_SECRET || "internal-tolee-secret-calling-2026";
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, callerId, callerName, callerAvatar, callType, callId } = body;

    if (!receiverId || !callerId || !callerName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    console.log(`[send-call-push] Sending incoming call push notification to user: ${receiverId}`);

    await sendPushNotification(
      receiverId,
      `${callerName}`,
      `Incoming ${callType} call...`,
      {
        type: 'incoming_call',
        callType,
        callerId,
        callerName,
        callerAvatar: callerAvatar || '',
        callId,
        receiverId
      }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[send-call-push] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
