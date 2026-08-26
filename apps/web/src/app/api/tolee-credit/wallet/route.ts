import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrCreateWallet, getWalletByUserId } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const wallet = await getOrCreateWallet(userId);

  return NextResponse.json({ success: true, wallet });
}
