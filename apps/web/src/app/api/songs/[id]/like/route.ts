import { NextResponse } from 'next/server';
import { toggleSongLikeAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await toggleSongLikeAction(params.id);
  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}
