import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getMyGroupsCreditSummary, connectGroupToCredit } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  const groups = await getMyGroupsCreditSummary(userId);

  return NextResponse.json({ success: true, groups });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;
  try {
    const body = await req.json();
    const { toleeId, customRevenueSharePercent } = body;

    if (!toleeId) {
      return NextResponse.json({ success: false, error: 'toleeId is required' }, { status: 400 });
    }

    const res = await connectGroupToCredit(toleeId, userId, customRevenueSharePercent);
    return NextResponse.json(res);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
