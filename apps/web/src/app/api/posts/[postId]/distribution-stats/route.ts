import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getPostDistributionStats } from '@/lib/viralDistributionService';

export async function GET(
  req: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;

    const { postId } = params;
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    const stats = await getPostDistributionStats(postId, userId);
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    console.error('[API /distribution-stats] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch distribution stats.' },
      { status: 500 }
    );
  }
}
