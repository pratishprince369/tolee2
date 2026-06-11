import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSearchAnalytics } from '@/actions/search';
import { verifySuperAdminToken, SUPER_ADMIN_COOKIE } from '@/lib/superAdminAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get(SUPER_ADMIN_COOKIE)?.value;
  if (!token || !verifySuperAdminToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const analytics = await getSuperAdminSearchAnalytics();
    if (!analytics.success) {
      return NextResponse.json({ error: 'Failed to retrieve analytics or unauthorized' }, { status: 403 });
    }
    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error in super-admin/search-analytics API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
