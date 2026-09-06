import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_PERSONAS = [
  {
    name: 'Tolee AI',
    avatar: '✨',
    description: 'Friendly, versatile, and hyper-capable default assistant.',
    systemPrompt: 'You are Tolee AI, a warm, intelligent, helpful, and versatile assistant built for the Tolee community. You speak naturally, answer questions clearly, and offer rich insights.',
    tone: 'friendly',
    language: 'auto',
    responseLength: 'balanced',
    formality: 'casual',
    emojiBehavior: 'moderate',
    voiceName: 'Puck',
    voiceGender: 'neutral',
    isDefault: true,
    isSystem: true,
  },
  {
    name: 'Professional Advisor',
    avatar: '💼',
    description: 'Formal, strategic, concise, and business-focused.',
    systemPrompt: 'You are a senior professional advisor and strategist. Deliver structured, objective, and executive-ready answers with clear bullet points and actionable summaries.',
    tone: 'professional',
    language: 'en',
    responseLength: 'detailed',
    formality: 'formal',
    emojiBehavior: 'none',
    voiceName: 'Charon',
    voiceGender: 'male',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Code Architect',
    avatar: '💻',
    description: 'Specialized in clean architecture, debugging, and production code.',
    systemPrompt: 'You are a senior principal software architect. Provide clean, secure, type-safe, and well-tested code snippets. Format with proper language identifiers and explain root causes directly.',
    tone: 'direct',
    language: 'en',
    responseLength: 'detailed',
    formality: 'casual',
    emojiBehavior: 'none',
    voiceName: 'Fenrir',
    voiceGender: 'neutral',
    isDefault: false,
    isSystem: true,
  },
  {
    name: 'Hinglish Dost',
    avatar: '🇮🇳',
    description: 'Warm, conversational companion speaking natural Hindi + English blend.',
    systemPrompt: 'You are a helpful and energetic Indian companion speaking in natural, everyday Hinglish (mix of Hindi and English written in Latin script). Use warm Indian conversational phrases naturally.',
    tone: 'friendly',
    language: 'hinglish',
    responseLength: 'balanced',
    formality: 'casual',
    emojiBehavior: 'expressive',
    voiceName: 'Kore',
    voiceGender: 'female',
    isDefault: false,
    isSystem: true,
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    let personas = await prisma.aIPersona.findMany({
      where: { isEnabled: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    // Auto-seed defaults if table is empty
    if (personas.length === 0) {
      for (const p of DEFAULT_PERSONAS) {
        await prisma.aIPersona.create({ data: p });
      }
      personas = await prisma.aIPersona.findMany({
        where: { isEnabled: true },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    }

    let selectedPersonaId: string | null = null;
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { selectedPersonaId: true },
      });
      selectedPersonaId = user?.selectedPersonaId || null;
    }

    return NextResponse.json({ personas, selectedPersonaId });
  } catch (error: any) {
    console.error('Failed to get AI personas:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch personas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // Switch user selected persona
    if (action === 'select') {
      const { personaId } = body;
      await prisma.user.update({
        where: { id: session.user.id },
        data: { selectedPersonaId: personaId || null },
      });
      return NextResponse.json({ success: true, selectedPersonaId: personaId });
    }

    // Create a new persona
    const {
      name,
      avatar,
      description,
      systemPrompt,
      tone,
      language,
      responseLength,
      formality,
      emojiBehavior,
      voiceName,
      voiceGender,
      voiceSpeed,
    } = body;

    if (!name || !systemPrompt) {
      return NextResponse.json({ error: 'Name and System Prompt are required' }, { status: 400 });
    }

    const persona = await prisma.aIPersona.create({
      data: {
        name,
        avatar: avatar || '🤖',
        description,
        systemPrompt,
        tone: tone || 'friendly',
        language: language || 'auto',
        responseLength: responseLength || 'balanced',
        formality: formality || 'casual',
        emojiBehavior: emojiBehavior || 'moderate',
        voiceName: voiceName || 'Puck',
        voiceGender: voiceGender || 'neutral',
        voiceSpeed: voiceSpeed ? parseFloat(voiceSpeed) : 1.0,
        isDefault: false,
        isSystem: false,
      },
    });

    return NextResponse.json({ success: true, persona });
  } catch (error: any) {
    console.error('Failed to create/select AI persona:', error);
    return NextResponse.json({ error: error.message || 'Persona action failed' }, { status: 500 });
  }
}
