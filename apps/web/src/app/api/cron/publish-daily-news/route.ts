import { NextResponse } from 'next/server';
import { publishDailyNewsBatch } from '@/lib/newsAutoPublisher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await publishDailyNewsBatch();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await publishDailyNewsBatch();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
