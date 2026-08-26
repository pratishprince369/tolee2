import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  getAdminCreditOverview,
  getAdminSystemConfig,
  updateAdminSystemConfig,
  getAdminAllWithdrawals,
  processAdminWithdrawalAction,
} from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = req.nextUrl.searchParams;
  const section = searchParams.get('section') || 'all';

  try {
    if (section === 'config') {
      const config = await getAdminSystemConfig();
      return NextResponse.json({ success: true, config });
    }
    if (section === 'withdrawals') {
      const status = searchParams.get('status') || undefined;
      const withdrawals = await getAdminAllWithdrawals(status);
      return NextResponse.json({ success: true, withdrawals });
    }

    const [overview, config, withdrawals] = await Promise.all([
      getAdminCreditOverview(),
      getAdminSystemConfig(),
      getAdminAllWithdrawals(),
    ]);

    return NextResponse.json({ success: true, overview, config, withdrawals });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const adminId = (session.user as any).id;
  try {
    const body = await req.json();
    const { action, configData, withdrawalId, withdrawalAction, options } = body;

    if (action === 'update_config') {
      const updated = await updateAdminSystemConfig(configData, adminId);
      return NextResponse.json({ success: true, config: updated });
    }

    if (action === 'process_withdrawal') {
      if (!withdrawalId || !withdrawalAction) {
        return NextResponse.json({ success: false, error: 'withdrawalId and withdrawalAction required' }, { status: 400 });
      }
      const res = await processAdminWithdrawalAction(withdrawalId, withdrawalAction, adminId, options);
      return NextResponse.json(res);
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
