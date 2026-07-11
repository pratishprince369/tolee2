import { NextRequest, NextResponse } from 'next/server';
import { incrementViewOriginalPostClick } from '@/actions/post';

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json();
    if (!postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }
    const res = await incrementViewOriginalPostClick(postId);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
