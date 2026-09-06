import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { aiGateway } from '@/lib/ai-gateway/router';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    const body = await req.json().catch(() => ({}));
    const { personaId, voiceName = 'Puck', model = 'gemini-2.0-flash' } = body;

    let systemInstruction = 'You are a warm, intelligent, real-time voice assistant in Tolee. Keep replies concise, conversational, and direct.';
    let chosenVoice = voiceName;

    if (personaId) {
      const persona = await prisma.aIPersona.findUnique({
        where: { id: personaId },
      });
      if (persona) {
        systemInstruction = `${persona.systemPrompt}\nTone: ${persona.tone}. Keep your spoken answers crisp and friendly.`;
        chosenVoice = persona.voiceName || chosenVoice;
      }
    }

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_AI_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      '';

    return NextResponse.json({
      session: {
        model,
        voiceName: chosenVoice,
        systemInstruction,
        apiKeyConfigured: Boolean(apiKey),
        // Fallback endpoint for web-speech synthesis + direct audio streaming
        fallbackVoiceSynthesis: true,
        sessionCreated: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Live voice session init error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize voice session' }, { status: 500 });
  }
}
