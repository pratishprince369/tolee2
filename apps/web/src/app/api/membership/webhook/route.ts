import { NextRequest, NextResponse } from 'next/server';
import { verifyAndActivateMembership } from '@/lib/membership-service';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || req.headers.get('x-webhook-signature');
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.RAZORPAY_WEBHOOK_SECRET;

    // Verify HMAC signature if secret is configured
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody || '{}');

    // Extract order and payment identifiers from payload
    // Handles Razorpay event format or generic webhook format
    let orderId = payload.orderId || payload.order_id;
    let paymentId = payload.paymentId || payload.payment_id;
    let paymentMethod = payload.paymentMethod || 'gateway';

    if (payload.event === 'payment.captured' && payload.payload?.payment?.entity) {
      const entity = payload.payload.payment.entity;
      orderId = entity.notes?.orderId || entity.order_id;
      paymentId = entity.id;
      paymentMethod = entity.method || 'razorpay';
    }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId missing in payload' }, { status: 400 });
    }

    const activation = await verifyAndActivateMembership({
      orderId,
      paymentId,
      paymentMethod,
      gatewayResponse: payload,
      actorId: 'GATEWAY_WEBHOOK',
    });

    return NextResponse.json({
      success: true,
      data: activation,
    });
  } catch (error: any) {
    console.error('Membership webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Membership webhook service active' });
}
