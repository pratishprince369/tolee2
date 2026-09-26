import { NextResponse } from 'next/server';
import { recordSongPlayAction } from '@/actions/songs';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const completionPercentage = typeof body.completionPercentage === 'number' ? body.completionPercentage : 0;
    const result = await recordSongPlayAction(params.id, completionPercentage);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
