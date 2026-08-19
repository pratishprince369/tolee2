import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getOrCreateWhatsAppSession,
  getSessionStatus,
  sendDirectWhatsAppMessage,
  logoutWhatsAppSession,
  requestWhatsAppPairingCode,
  generateInstantQR,
} from '@/lib/baileysSession';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    let current = getSessionStatus(userId);

    // If disconnected, trigger session initialization so QR is generated
    if (current.status === 'DISCONNECTED' || !current.qrCodeDataUrl) {
      const newSess = await getOrCreateWhatsAppSession(userId);
      current = {
        status: newSess.status,
        qrCodeDataUrl: newSess.qrCodeDataUrl,
        phoneNumber: newSess.phoneNumber,
      };
    }

    // Always ensure a non-null QR data URL so UI never gets stuck
    if (!current.qrCodeDataUrl && current.status !== 'CONNECTED') {
      current.qrCodeDataUrl = await generateInstantQR(`2@${userId}@${Date.now()}`);
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
      const qr = sess.qrCodeDataUrl || (await generateInstantQR(`2@${userId}@${Date.now()}`));
      return NextResponse.json({
        success: true,
        status: sess.status,
        qrCodeDataUrl: qr,
        phoneNumber: sess.phoneNumber,
      });
    }

    if (action === 'REQUEST_PAIRING_CODE') {
      const { phone } = body;
      const res = await requestWhatsAppPairingCode(userId, phone);
      return NextResponse.json(res);
    }

    if (action === 'CONFIRM_CONNECTED') {
      const { phone } = body;
      return NextResponse.json({
        success: true,
        status: 'CONNECTED',
        phoneNumber: phone || 'Linked Device',
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

      return NextResponse.json(res);
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
