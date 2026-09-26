import { NextResponse } from 'next/server';
import { searchSongsAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const genre = searchParams.get('genre') || undefined;
  const language = searchParams.get('language') || undefined;

  const result = await searchSongsAction(q, genre, language);
  return NextResponse.json(result);
}
