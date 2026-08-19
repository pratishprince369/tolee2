'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prismaAI } from '@/lib/prismaAI';

// Multi-Key NVIDIA Engine for Failover Resilience
const NVIDIA_KEYS = [
  process.env.NVIDIA_API_KEY,
  process.env.NVIDIA_API_KEY_2,
  process.env.NVIDIA_API_KEY_3,
  process.env.NVIDIA_API_KEY_4,
  process.env.NVIDIA_API_KEY_5,
  process.env.NVIDIA_RERANK_KEY,
].filter(Boolean) as string[];

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const models = [
    'meta/llama-3.1-70b-instruct',
    'qwen/qwen2.5-72b-instruct',
    'meta/llama-3.1-8b-instruct',
    'mistralai/mistral-nemo-12b-instruct',
  ];

  for (const model of models) {
    for (const apiKey of NVIDIA_KEYS) {
      try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1500,
          }),
        });

        if (!response.ok) continue;
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      } catch (e) {
        continue;
      }
    }
  }

  throw new Error('AI service temporarily busy. Please retry in a few moments.');
}

/**
 * 1. AI WhatsApp Shoot Message Copywriter
 */
export async function generateWhatsAppShootMessage(params: {
  topicOrOffer: string;
  tone: 'promotional' | 'formal' | 'festive' | 'followup' | 'networking' | 'reminder';
  businessName?: string;
  includeLink?: string;
  smartTags?: string[];
}): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required.' };
    }

    const systemPrompt = `You are an elite WhatsApp Direct-Response Copywriting Specialist.
Generate an engaging, high-conversion WhatsApp Broadcast / Direct Message template.

RULES FOR WHATSAPP COPY:
- Use WhatsApp markdown: *bold* for emphasis/offers, _italic_ for subtle notes, and bullet points or numbered lists.
- Keep paragraphs short (1-3 sentences) with clear line breaks.
- Include natural smart tags like {{name}}, {{company}}, {{note}} where relevant so the user can dynamically personalize for every recipient.
- Include eye-catching emojis (🔥, 🚀, 💬, 👉, ✨, 🎁).
- Include a strong, friction-free Call-to-Action (CTA) at the bottom.
- Return ONLY the clean WhatsApp template message text ready to be dispatched. Do NOT wrap in quotes or add conversational preamble.`;

    const userPrompt = `
Campaign Objective / Offer: ${params.topicOrOffer}
Tone: ${params.tone}
Business / Brand Name: ${params.businessName || 'Our Team'}
CTA Link (if any): ${params.includeLink || ''}

Write the ultimate high-conversion WhatsApp message now:`;

    const generated = await callAI(systemPrompt, userPrompt);

    return {
      success: true,
      message: generated.trim(),
    };
  } catch (err: any) {
    console.error('[WhatsAppShoot] AI Copywriting Error:', err);
    return { success: false, error: err.message || 'Failed to generate WhatsApp copy.' };
  }
}

export interface WhatsAppContact {
  id: string;
  phone: string;
  name?: string;
  customVar?: string;
  status: 'PENDING' | 'SENT' | 'SKIPPED';
}

export interface WhatsAppCampaignItem {
  id: string;
  title: string;
  messageTemplate: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  contactsData: WhatsAppContact[];
  totalContacts: number;
  sentCount: number;
  status: 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: string;
}

/**
 * 2. Save or Update a WhatsApp Shoot Campaign
 */
export async function saveWhatsAppCampaign(params: {
  id?: string;
  title: string;
  messageTemplate: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  contactsData: WhatsAppContact[];
}): Promise<{
  success: boolean;
  campaign?: WhatsAppCampaignItem;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Authentication required. Please sign in.' };
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || 'Creator';

    const totalContacts = params.contactsData.length;
    const sentCount = params.contactsData.filter((c) => c.status === 'SENT').length;
    const status = sentCount >= totalContacts && totalContacts > 0 ? 'COMPLETED' : sentCount > 0 ? 'IN_PROGRESS' : 'DRAFT';

    let record: any;

    if (params.id) {
      record = await (prismaAI as any).whatsAppCampaign.update({
        where: { id: params.id },
        data: {
          title: params.title,
          messageTemplate: params.messageTemplate,
          mediaUrl: params.mediaUrl || null,
          mediaType: params.mediaType || null,
          contactsData: params.contactsData,
          totalContacts,
          sentCount,
          status,
        },
      });
    } else {
      record = await (prismaAI as any).whatsAppCampaign.create({
        data: {
          userId,
          userName,
          title: params.title,
          messageTemplate: params.messageTemplate,
          mediaUrl: params.mediaUrl || null,
          mediaType: params.mediaType || null,
          contactsData: params.contactsData,
          totalContacts,
          sentCount,
          status,
        },
      });
    }

    return {
      success: true,
      campaign: {
        id: record.id,
        title: record.title,
        messageTemplate: record.messageTemplate,
        mediaUrl: record.mediaUrl,
        mediaType: record.mediaType,
        contactsData: record.contactsData,
        totalContacts: record.totalContacts,
        sentCount: record.sentCount,
        status: record.status,
        createdAt: record.createdAt.toISOString(),
      },
    };
  } catch (err: any) {
    console.error('[WhatsAppShoot] Save Campaign Error:', err);
    return { success: false, error: err.message || 'Failed to save campaign.' };
  }
}

/**
 * 3. Fetch User's WhatsApp Shoot Campaigns
 */
export async function getUserWhatsAppCampaigns(): Promise<{
  success: boolean;
  campaigns: WhatsAppCampaignItem[];
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, campaigns: [] };
    }

    const userId = (session.user as any).id;
    const list = await (prismaAI as any).whatsAppCampaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      campaigns: list.map((c: any) => ({
        id: c.id,
        title: c.title,
        messageTemplate: c.messageTemplate,
        mediaUrl: c.mediaUrl,
        mediaType: c.mediaType,
        contactsData: c.contactsData || [],
        totalContacts: c.totalContacts || 0,
        sentCount: c.sentCount || 0,
        status: c.status || 'DRAFT',
        createdAt: c.createdAt.toISOString(),
      })),
    };
  } catch (err: any) {
    return { success: false, campaigns: [], error: err.message };
  }
}

/**
 * 4. Update Campaign Contact Status
 */
export async function updateWhatsAppContactStatus(params: {
  campaignId: string;
  contactId: string;
  status: 'PENDING' | 'SENT' | 'SKIPPED';
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const userId = (session.user as any).id;
    const campaign = await (prismaAI as any).whatsAppCampaign.findFirst({
      where: { id: params.campaignId, userId },
    });

    if (!campaign) return { success: false, error: 'Campaign not found.' };

    const contacts: WhatsAppContact[] = campaign.contactsData || [];
    const updatedContacts = contacts.map((c) =>
      c.id === params.contactId ? { ...c, status: params.status } : c
    );

    const sentCount = updatedContacts.filter((c) => c.status === 'SENT').length;
    const totalContacts = updatedContacts.length;
    const campaignStatus =
      sentCount >= totalContacts && totalContacts > 0 ? 'COMPLETED' : sentCount > 0 ? 'IN_PROGRESS' : 'DRAFT';

    await (prismaAI as any).whatsAppCampaign.update({
      where: { id: params.campaignId },
      data: {
        contactsData: updatedContacts,
        sentCount,
        status: campaignStatus,
      },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Delete Campaign
 */
export async function deleteWhatsAppCampaign(campaignId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: 'Unauthorized' };

    const userId = (session.user as any).id;
    await (prismaAI as any).whatsAppCampaign.deleteMany({
      where: { id: campaignId, userId },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
