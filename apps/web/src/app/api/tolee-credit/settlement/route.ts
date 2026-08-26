import { NextResponse } from 'next/server';
import { processDueSettlements } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const res = await processDueSettlements();
    return NextResponse.json({ success: true, ...res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
