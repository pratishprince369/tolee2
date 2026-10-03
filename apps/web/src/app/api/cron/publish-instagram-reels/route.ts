import { NextRequest, NextResponse } from 'next/server';
import { publishInstagramReelsBatch } from '@/lib/apifyInstagramAutoPublisher';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleBatchPublish(req);
}

export async function POST(req: NextRequest) {
  return handleBatchPublish(req);
}

async function handleBatchPublish(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');
    const envSecret = process.env.CRON_SECRET || 'tolee-cron-agentic-secret-key-2026';

    // Optional auth check for production
    if (secret && secret !== envSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitParam = parseInt(searchParams.get('limit') || '2', 10);
    const maxPerAccount = Math.min(Math.max(limitParam, 1), 5);

    const result = await publishInstagramReelsBatch(maxPerAccount);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[publish-instagram-reels Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
