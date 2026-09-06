import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiGateway } from '@/lib/ai-gateway/router';

export const dynamic = 'force-dynamic';

function maskApiKey(key?: string | null): string {
  if (!key) return '';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}********${key.slice(-4)}`;
}

export async function GET() {
  try {
    const liveStatus = await aiGateway.checkProvidersStatus();

    // Fetch stored DB configs if any
    const dbConfigs = await prisma.aIProviderConfig.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      providers: liveStatus.map((p) => {
        const stored = dbConfigs.find((c) => c.providerType === p.type);
        return {
          ...p,
          apiKeyMasked: stored?.apiKey ? maskApiKey(stored.apiKey) : undefined,
          baseUrl: stored?.baseUrl || (p.type === 'gemini_web2api' ? process.env.GEMINI_WEB2API_URL || 'http://127.0.0.1:8081' : undefined),
          temperature: stored?.temperature ?? 0.7,
          maxTokens: stored?.maxTokens ?? 2048,
        };
      }),
    });
  } catch (error: any) {
    console.error('Failed to get provider configs:', error);
    return NextResponse.json({ error: error.message || 'Failed to get provider configs' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { providerType, name, baseUrl, apiKey, defaultModel, temperature, maxTokens } = body;

    if (!providerType) {
      return NextResponse.json({ error: 'Provider type is required' }, { status: 400 });
    }

    const existing = await prisma.aIProviderConfig.findFirst({
      where: { providerType },
    });

    const updateData: any = {
      name: name || providerType,
      providerType,
      defaultModel: defaultModel || 'gemini-2.0-flash',
      temperature: temperature !== undefined ? parseFloat(temperature) : 0.7,
      maxTokens: maxTokens !== undefined ? parseInt(maxTokens, 10) : 2048,
    };

    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    if (apiKey && !apiKey.includes('********')) updateData.apiKey = apiKey;

    let saved;
    if (existing) {
      saved = await prisma.aIProviderConfig.update({
        where: { id: existing.id },
        data: updateData,
      });
    } else {
      saved = await prisma.aIProviderConfig.create({
        data: updateData,
      });
    }

    return NextResponse.json({
      success: true,
      provider: {
        ...saved,
        apiKey: maskApiKey(saved.apiKey),
      },
    });
  } catch (error: any) {
    console.error('Failed to save provider config:', error);
    return NextResponse.json({ error: error.message || 'Failed to save config' }, { status: 500 });
  }
}
