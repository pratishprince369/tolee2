import { NextResponse } from 'next/server';
import { getArtistByIdAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await getArtistByIdAction(params.id);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
