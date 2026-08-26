import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrCreateWallet, getTransactionsByWalletId } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const wallet = await getOrCreateWallet(userId);

  const searchParams = req.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const type = searchParams.get('type') as any;
  const status = searchParams.get('status') as any;

  const result = await getTransactionsByWalletId(wallet.id, { limit, offset, type, status });

  return NextResponse.json({ success: true, ...result });
}
