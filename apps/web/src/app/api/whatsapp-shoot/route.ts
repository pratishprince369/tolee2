import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getOrCreateWhatsAppSession,
  getSessionStatus,
  sendDirectWhatsAppMessage,
  logoutWhatsAppSession,
} from '@/lib/baileysSession';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const current = getSessionStatus(userId);

    // If disconnected, trigger session initialization so QR is generated
    if (current.status === 'DISCONNECTED') {
      getOrCreateWhatsAppSession(userId).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      status: current.status,
      qrCodeDataUrl: current.qrCodeDataUrl,
      phoneNumber: current.phoneNumber,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const { action } = body;

    if (action === 'INIT_SESSION') {
      const sess = await getOrCreateWhatsAppSession(userId);
      return NextResponse.json({
        success: true,
        status: sess.status,
        qrCodeDataUrl: sess.qrCodeDataUrl,
        phoneNumber: sess.phoneNumber,
      });
    }

    if (action === 'SEND_MESSAGE') {
      const { toPhone, messageText, mediaUrl, mediaType } = body;
      if (!toPhone || !messageText) {
        return NextResponse.json({ error: 'Missing phone or message text' }, { status: 400 });
      }

      const res = await sendDirectWhatsAppMessage(
        userId,
        toPhone,
        messageText,
        mediaUrl,
        mediaType
      );

      if (res.success) {
        return NextResponse.json({ success: true });
      } else {
        return NextResponse.json({ success: false, error: res.error }, { status: 400 });
      }
    }

    if (action === 'LOGOUT') {
      await logoutWhatsAppSession(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
