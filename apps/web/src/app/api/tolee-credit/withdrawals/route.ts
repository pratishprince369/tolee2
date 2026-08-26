import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getOrCreateWallet, requestWithdrawal, getWithdrawalsByWalletId, addBankAccount, getBankAccounts } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const wallet = await getOrCreateWallet(userId);
  const [withdrawals, bankAccounts] = await Promise.all([
    getWithdrawalsByWalletId(wallet.id),
    getBankAccounts(userId),
  ]);

  return NextResponse.json({ success: true, withdrawals, bankAccounts });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  try {
    const body = await req.json();
    const { action, amount, bankAccountId, bankAccountData } = body;

    if (action === 'add_bank_account') {
      const res = await addBankAccount(userId, bankAccountData);
      return NextResponse.json(res);
    }

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount is required.' }, { status: 400 });
    }

    const res = await requestWithdrawal(userId, Number(amount), bankAccountId);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
