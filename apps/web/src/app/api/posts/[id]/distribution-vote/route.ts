import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { submitDistributionVote } from '@/lib/viralDistributionService';

export async function POST(
  req: NextRequest,
  { params }: { params: { id?: string; postId?: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required.' }, { status: 401 });
    }

    const postId = params.id || params.postId;
    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { voteType } = body;

    if (!voteType || !['VIRAL', 'GET_IT_DOWN'].includes(voteType)) {
      return NextResponse.json(
        { error: "Invalid voteType. Must be 'VIRAL' or 'GET_IT_DOWN'." },
        { status: 400 }
      );
    }

    const result = await submitDistributionVote(postId, userId, voteType);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /distribution-vote] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process distribution vote.' },
      { status: 500 }
    );
  }
}
