import { NextResponse } from 'next/server';
import { getAlbumByIdAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const result = await getAlbumByIdAction(params.id);
  if (!result.success) {
    return NextResponse.json(result, { status: 404 });
  }
  return NextResponse.json(result);
}
