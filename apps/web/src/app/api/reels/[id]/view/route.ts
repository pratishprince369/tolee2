import { NextRequest, NextResponse } from 'next/server';
import { recordView } from '@/actions/post';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const reelId = params.id;
  if (!reelId) {
    return NextResponse.json({ error: 'Missing reel id' }, { status: 400 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const fingerprint = body.fingerprint || req.headers.get('x-forwarded-for') || 'anon';
    await recordView(reelId, 'reel', fingerprint);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
