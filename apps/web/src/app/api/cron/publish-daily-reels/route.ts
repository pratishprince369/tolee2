import { NextResponse } from 'next/server';
import { publishDailyBundleReelsBatch } from '@/lib/reelsBundleAutoPublisher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await publishDailyBundleReelsBatch(5);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await publishDailyBundleReelsBatch(5);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
