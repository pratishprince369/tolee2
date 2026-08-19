import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  proto,
} from '@whiskeysockets/baileys';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';

interface UserSessionState {
  socket: WASocket | null;
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  phoneNumber: string | null;
  lastUpdated: number;
}

// In-Memory Global Session Registry
const sessions: Map<string, UserSessionState> = new Map();

const SESSIONS_DIR = path.join(process.cwd(), '.whatsapp_sessions');

// Ensure session directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  try {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  } catch {}
}

export async function getOrCreateWhatsAppSession(userId: string): Promise<UserSessionState> {
  const existing = sessions.get(userId);
  if (existing && existing.socket && (existing.status === 'CONNECTED' || existing.status === 'SCAN_QR')) {
    return existing;
  }

  const sessionPath = path.join(SESSIONS_DIR, `session_${userId}`);
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  const userSession: UserSessionState = {
    socket: null,
    status: 'CONNECTING',
    qrCodeDataUrl: null,
    phoneNumber: null,
    lastUpdated: Date.now(),
  };

  sessions.set(userId, userSession);

  try {
    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['Tolee World Engine', 'Chrome', '1.0.0'],
      syncFullHistory: false,
    });

    userSession.socket = sock;

    // Listen for Credential Updates
    sock.ev.on('creds.update', saveCreds);

    // Listen for Connection Updates & Real QR Codes
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 6 });
          userSession.status = 'SCAN_QR';
          userSession.qrCodeDataUrl = qrDataUrl;
          userSession.lastUpdated = Date.now();
        } catch (err) {
          console.error('[Baileys] QR Generation Error:', err);
        }
      }

      if (connection === 'open') {
        userSession.status = 'CONNECTED';
        userSession.qrCodeDataUrl = null;
        const jid = sock.user?.id || '';
        const rawPhone = jid.split(':')[0] || jid.split('@')[0];
        userSession.phoneNumber = rawPhone ? `+${rawPhone}` : 'Connected Device';
        userSession.lastUpdated = Date.now();
      }

      if (connection === 'close') {
        const shouldReconnect =
          (lastDisconnect?.error as any)?.output?.statusCode !== DisconnectReason.loggedOut;

        userSession.status = 'DISCONNECTED';
        userSession.socket = null;
        userSession.qrCodeDataUrl = null;

        if (shouldReconnect) {
          setTimeout(() => {
            getOrCreateWhatsAppSession(userId);
          }, 3000);
        } else {
          // Logged out - clean up directory
          try {
            fs.rmSync(sessionPath, { recursive: true, force: true });
          } catch {}
          userSession.phoneNumber = null;
        }
      }
    });

    return userSession;
  } catch (err: any) {
    console.error('[Baileys] Socket Init Error:', err);
    userSession.status = 'DISCONNECTED';
    return userSession;
  }
}

export function getSessionStatus(userId: string): {
  status: 'DISCONNECTED' | 'SCAN_QR' | 'CONNECTING' | 'CONNECTED';
  qrCodeDataUrl: string | null;
  phoneNumber: string | null;
} {
  const sess = sessions.get(userId);
  if (!sess) {
    return {
      status: 'DISCONNECTED',
      qrCodeDataUrl: null,
      phoneNumber: null,
    };
  }
  return {
    status: sess.status,
    qrCodeDataUrl: sess.qrCodeDataUrl,
    phoneNumber: sess.phoneNumber,
  };
}

export async function sendDirectWhatsAppMessage(
  userId: string,
  toPhone: string,
  messageText: string,
  mediaUrl?: string | null,
  mediaType?: string | null
): Promise<{ success: boolean; error?: string }> {
  const sess = sessions.get(userId);
  if (!sess || !sess.socket || sess.status !== 'CONNECTED') {
    return { success: false, error: 'WhatsApp device not connected. Please scan QR code first.' };
  }

  try {
    const cleanDigits = toPhone.replace(/[^\d]/g, '');
    const recipientJid = `${cleanDigits}@s.whatsapp.net`;

    if (mediaUrl) {
      if (mediaType === 'image') {
        await sess.socket.sendMessage(recipientJid, {
          image: { url: mediaUrl },
          caption: messageText,
        });
      } else if (mediaType === 'video') {
        await sess.socket.sendMessage(recipientJid, {
          video: { url: mediaUrl },
          caption: messageText,
        });
      } else {
        await sess.socket.sendMessage(recipientJid, {
          document: { url: mediaUrl },
          mimetype: 'application/pdf',
          caption: messageText,
          fileName: 'document.pdf',
        });
      }
    } else {
      await sess.socket.sendMessage(recipientJid, {
        text: messageText,
      });
    }

    return { success: true };
  } catch (err: any) {
    console.error('[Baileys] Send Message Error:', err);
    return { success: false, error: err.message || 'Failed to send message over WhatsApp.' };
  }
}

export async function logoutWhatsAppSession(userId: string): Promise<boolean> {
  const sess = sessions.get(userId);
  if (sess?.socket) {
    try {
      await sess.socket.logout();
    } catch {}
  }
  sessions.delete(userId);
  const sessionPath = path.join(SESSIONS_DIR, `session_${userId}`);
  try {
    fs.rmSync(sessionPath, { recursive: true, force: true });
  } catch {}
  return true;
}
