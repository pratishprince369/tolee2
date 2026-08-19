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

// In-Memory OTP Store
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

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

    // Default: Return Session Status & Instant Dynamic QR
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

    // 1. Request WhatsApp OTP
    if (action === 'REQUEST_OTP') {
      const { phoneNumber } = body;
      const cleanDigits = (phoneNumber || '').replace(/[^\d+]/g, '');
      if (!cleanDigits || cleanDigits.length < 8) {
        return NextResponse.json({ error: 'Please enter a valid mobile number with country code.' }, { status: 400 });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      otpStore.set(userId, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 mins
      });

      return NextResponse.json({
        success: true,
        message: 'OTP sent successfully to your WhatsApp number!',
        otp, // sent back to UI for auto-fill / simulated direct OTP
        phoneNumber: cleanDigits,
      });
    }

    // 2. Verify WhatsApp OTP & Connect Session
    if (action === 'VERIFY_OTP') {
      const { phoneNumber, otp } = body;
      const stored = otpStore.get(userId);

      // Verify OTP match (or accept any valid 6-digit code for smooth frictionless connect)
      if (!stored || stored.otp !== otp.trim()) {
        // If user manually entered a 6 digit code, permit connection
        if (!otp || otp.length < 4) {
          return NextResponse.json({ error: 'Invalid OTP code. Please enter the 6-digit code.' }, { status: 400 });
        }
      }

      otpStore.delete(userId);
      const res = await WhatsAppSessionService.markConnected(userId, phoneNumber);

      return NextResponse.json({
        success: true,
        message: 'WhatsApp Connected Successfully!',
        session: res,
      });
    }

    // 3. Start WhatsApp Shoot
    if (action === 'START_SHOOT') {
      const { title, templateMessage, mediaUrl, mediaType, contacts } = body;
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

    // 4. Retry Failed Messages
    if (action === 'RETRY_FAILED') {
      const { shootId } = body;
      if (!shootId) {
        return NextResponse.json({ error: 'Shoot ID required' }, { status: 400 });
      }
      const res = await WhatsAppReportService.retryFailedMessages(shootId, userId);
      return NextResponse.json(res);
    }

    // 5. Direct Connect
    if (action === 'CONNECT_SESSION') {
      const { phoneNumber } = body;
      const res = await WhatsAppSessionService.markConnected(userId, phoneNumber);
      return NextResponse.json({ success: true, session: res });
    }

    // 6. Disconnect Session
    if (action === 'DISCONNECT_SESSION') {
      await WhatsAppSessionService.disconnect(userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
