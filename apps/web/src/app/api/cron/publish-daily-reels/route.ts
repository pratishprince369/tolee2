import { NextRequest, NextResponse } from 'next/server';
import { publishDailyBundleReelsBatch, discoverBundleSources, buildCentralReelCatalog } from '@/lib/reelsBundleAutoPublisher';
import { validateExistingPendingReels } from '@/lib/videoValidationService';

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

    // 1. Run 2-hour multi-account bundle publisher (validated fresh content)
    const publishResult = await publishDailyBundleReelsBatch(limit);

    // 2. Validate existing pending or temporary reels in background
    const validationResult = await validateExistingPendingReels(20);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      publishResult,
      validationResult
    });
  } catch (error: any) {
    console.error('[publish-daily-reels Cron Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
