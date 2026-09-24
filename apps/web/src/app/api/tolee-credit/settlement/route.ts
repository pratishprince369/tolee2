import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';
import { processDueSettlements } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Check Cron Secret
    const authHeader = req.headers.get('authorization');
    const cronHeader = req.headers.get('x-cron-secret');
    const cronSecret = process.env.CRON_SECRET;
    const isCron = cronSecret && (authHeader === `Bearer ${cronSecret}` || cronHeader === cronSecret);

    // 2. Check Super Admin cookie token
    const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
    const isSuperAdminCookie = Boolean(token && verifySuperAdminToken(token));

    // 3. Check NextAuth Admin session
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const email = session?.user?.email;
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    const isSessionAdmin = Boolean(
      (superAdminEmail && email && email.toLowerCase() === superAdminEmail.toLowerCase()) ||
      role === 'SUPER_ADMIN' ||
      role === 'admin'
    );

    if (!isCron && !isSuperAdminCookie && !isSessionAdmin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const res = await processDueSettlements();
    return NextResponse.json({ success: true, ...res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
