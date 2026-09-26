import { NextResponse } from 'next/server';
import { createMusicPlaylistAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }
    const result = await createMusicPlaylistAction(body.title, body.description, body.isPublic !== false);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
