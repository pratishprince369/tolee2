import { NextRequest, NextResponse } from 'next/server';
import { aiGateway } from '@/lib/ai-gateway/router';
import { GroupAIActionRequest } from '@/lib/ai-gateway/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body: GroupAIActionRequest = await req.json();

    if (!body.action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const response = await aiGateway.executeGroupAction(body);

    return NextResponse.json({ result: response, action: body.action });
  } catch (error: any) {
    console.error('Group AI action failed:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process group AI action' },
      { status: 500 }
    );
  }
}
