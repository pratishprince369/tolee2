import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// In-memory store: "chatId:userId" -> { userName, timestamp }
// This lives in server memory and auto-expires after 3s — no DB needed
const typingStore = new Map<string, { userName: string; timestamp: number }>();

const TYPING_EXPIRE_MS = 5000; // 5 seconds

function cleanupStale() {
  const now = Date.now();
  for (const [key, val] of typingStore.entries()) {
    if (now - val.timestamp > TYPING_EXPIRE_MS) {
      typingStore.delete(key);
    }
  }
}

// POST /api/chat/typing — emit typing event
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const userName = session.user.name || 'Someone';

    const body = await req.json();
    const { chatId, isTyping } = body;

    if (!chatId || typeof chatId !== 'string') {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    const key = `${chatId}:${userId}`;

    if (isTyping) {
      typingStore.set(key, { userName, timestamp: Date.now() });
    } else {
      typingStore.delete(key);
    }

    // Clean up stale entries on every write
    cleanupStale();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[typing POST] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/chat/typing?chatId=xxx — poll who's typing in a chat
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
      return NextResponse.json({ error: 'chatId required' }, { status: 400 });
    }

    cleanupStale();

    const now = Date.now();
    const typingUsers: string[] = [];

    for (const [key, val] of typingStore.entries()) {
      // Format: "chatId:userId"
      const [storedChatId, storedUserId] = key.split(':');
      if (
        storedChatId === chatId &&
        storedUserId !== userId &&
        now - val.timestamp <= TYPING_EXPIRE_MS
      ) {
        typingUsers.push(val.userName);
      }
    }

    return NextResponse.json({ typingUsers });
  } catch (error) {
    console.error('[typing GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
