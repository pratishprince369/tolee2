import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  WhatsAppSessionService,
  WhatsAppShootService,
  WhatsAppProgressService,
  WhatsAppReportService,
} from '@/lib/whatsappShootService';
import { generateInstantQR } from '@/lib/baileysSession';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'SESSION_STATUS';
    const shootId = searchParams.get('shootId');

    if (action === 'GET_PROGRESS') {
      if (shootId) {
        const progress = await WhatsAppProgressService.getShootProgress(shootId);
        return NextResponse.json({ success: true, progress });
      } else {
        const latest = await WhatsAppProgressService.getUserLatestShoot(userId);
        return NextResponse.json({ success: true, progress: latest });
      }
    }

    // Default: Return Session Status & QR
    const sess = await WhatsAppSessionService.getOrCreateSession(userId);
    let qr = sess.qrCodeDataUrl;
    if (!qr && sess.status !== 'CONNECTED') {
      qr = await generateInstantQR(`openwa_${userId}_${Date.now()}`);
    }

    return NextResponse.json({
      success: true,
      status: sess.status,
      phoneNumber: sess.phoneNumber,
      qrCodeDataUrl: qr,
      openwaSessionId: sess.openwaSessionId,
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

    // 1. Start WhatsApp Shoot
    if (action === 'START_SHOOT') {
      const { title, templateMessage, mediaUrl, mediaType, contacts, delaySec } = body;
      if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
        return NextResponse.json({ error: 'At least one contact is required.' }, { status: 400 });
      }

      const shoot = await WhatsAppShootService.createShoot({
        userId,
        title: title || 'WhatsApp Campaign',
        templateMessage: templateMessage || '',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        contacts,
      });

      return NextResponse.json({
        success: true,
        shootId: shoot.id,
        status: shoot.status,
        totalMessages: shoot.totalMessages,
      });
    }

    // 2. Retry Failed Messages
    if (action === 'RETRY_FAILED') {
      const { shootId } = body;
      if (!shootId) {
        return NextResponse.json({ error: 'Shoot ID required' }, { status: 400 });
      }
      const res = await WhatsAppReportService.retryFailedMessages(shootId, userId);
      return NextResponse.json(res);
    }

    // 3. Mark Session Connected
    if (action === 'CONNECT_SESSION') {
      const { phoneNumber } = body;
      const res = await WhatsAppSessionService.markConnected(userId, phoneNumber);
      return NextResponse.json({ success: true, session: res });
    }

    // 4. Disconnect Session
    if (action === 'DISCONNECT_SESSION') {
      await WhatsAppSessionService.disconnect(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
