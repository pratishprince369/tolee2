import { NextRequest, NextResponse } from 'next/server';
import { processAdRevenueAttribution } from '@/modules/tolee-credit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventId, campaignId, campaignName, toleeId, memberUserId, adEventType, grossSpend } = body;

    if (!eventId || !campaignId || !toleeId || grossSpend === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: eventId, campaignId, toleeId, grossSpend' },
        { status: 400 }
      );
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const res = await processAdRevenueAttribution({
      eventId,
      campaignId,
      campaignName,
      toleeId,
      memberUserId,
      adEventType: adEventType || 'spend',
      grossSpend: Number(grossSpend),
      ipAddress,
      userAgent,
    });

    return NextResponse.json(res);
  } catch (err: any) {
    console.error('[API /api/tolee-credit/ad-attribution] Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
