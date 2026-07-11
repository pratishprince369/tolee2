import { NextRequest, NextResponse } from 'next/server';
import { deleteStory } from '@/actions/highlight';

export async function POST(req: NextRequest) {
  try {
    const { storyId } = await req.json();
    if (!storyId) {
      return NextResponse.json({ success: false, error: 'storyId is required' }, { status: 400 });
    }
    const res = await deleteStory(storyId);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
