import { NextRequest, NextResponse } from 'next/server';
import { publishDailyBundleReelsBatch, discoverBundleSources, buildCentralReelCatalog } from '@/lib/reelsBundleAutoPublisher';

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

    // Optional auth check for production security
    if (secret && secret !== envSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const limitParam = parseInt(searchParams.get('limit') || searchParams.get('count') || '10', 10);
    const limit = Math.min(Math.max(limitParam, 1), 50);

    const result = await publishDailyBundleReelsBatch(limit);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[publish-daily-reels Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
