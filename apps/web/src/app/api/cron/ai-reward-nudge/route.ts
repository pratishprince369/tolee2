import { NextResponse } from 'next/server';
import { processAIRewardNudges } from '@/lib/reward-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await processAIRewardNudges();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result
    });
  } catch (error: any) {
    console.error('Error running AI Reward Nudge Cron:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
