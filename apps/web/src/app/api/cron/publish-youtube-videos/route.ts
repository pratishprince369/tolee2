import { NextResponse } from 'next/server';
import { publishYouTubeVideosBatch } from '@/lib/youtubeAutoPublisher';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await publishYouTubeVideosBatch(false);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const result = await publishYouTubeVideosBatch(false);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
