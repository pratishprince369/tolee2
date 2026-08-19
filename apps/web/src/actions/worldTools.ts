'use server';

import { prismaAI } from '@/lib/prisma-ai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export interface WorldToolItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  routeUrl: string;
  icon: string;
  category: string;
  badge?: string | null;
  isVisible: boolean;
  accessType: 'FREE' | 'PAID' | 'TIMED_FREE';
  priceMonthly: number;
  freeTrialDays?: number | null;
  freeUntil?: string | null;
  order: number;
  createdAt?: string;
  updatedAt?: string;
  // Computed client fields
  isFreeTrialActive?: boolean;
  daysRemaining?: number;
}

const DEFAULT_TOOLS: Omit<WorldToolItem, 'id'>[] = [
  {
    name: 'LinkedIn Extractor',
    slug: 'linkedin-extractor',
    description: 'Scout OSINT Engine for extracting live LinkedIn talent, verified corporate work emails & phone numbers.',
    routeUrl: '/world/linkedin-extractor',
    icon: 'Sparkles',
    category: 'Lead Generation',
    badge: 'POPULAR',
    isVisible: true,
    accessType: 'TIMED_FREE',
    priceMonthly: 19.99,
    freeTrialDays: 7,
    order: 1,
  },
  {
    name: 'AI Resume Builder & ATS Optimizer',
    slug: 'ai-resume-builder',
    description: 'Build ATS-optimized resumes with AI summary writer, action-verb enhancer, Job Description matcher, and 1-click PDF download.',
    routeUrl: '/world/ai-resume-builder',
    icon: 'FileText',
    category: 'Career & Productivity',
    badge: 'PRO AI',
    isVisible: true,
    accessType: 'TIMED_FREE',
    priceMonthly: 14.99,
    freeTrialDays: 7,
    order: 2,
  },
  {
    name: 'AI Multi-Platform Social Publisher',
    slug: 'social-publisher',
    description: 'Create, optimize & 1-click publish viral posts across Instagram, LinkedIn, Twitter/X, Facebook & WhatsApp with AI caption & hashtag generator.',
    routeUrl: '/world/social-publisher',
    icon: 'Share2',
    category: 'Marketing & Creator Suite',
    badge: 'NEW 🔥',
    isVisible: true,
    accessType: 'TIMED_FREE',
    priceMonthly: 14.99,
    freeTrialDays: 7,
    order: 3,
  }
];

/**
 * Public: Get all visible tools for Tolee World with computed trial/paid status
 */
export async function getPublicWorldTools(): Promise<{ success: boolean; tools: WorldToolItem[] }> {
  try {
    let dbTools: any[] = [];
    try {
      dbTools = await (prismaAI as any).worldTool.findMany({
        where: { isVisible: true },
        orderBy: { order: 'asc' },
      });
    } catch (e) {
      console.warn('[WorldTools] fallback to initial tools:', e);
    }

    if (!dbTools) dbTools = [];

    // Ensure all DEFAULT_TOOLS exist in database & list
    for (const t of DEFAULT_TOOLS) {
      const exists = dbTools.some((d: any) => d.slug === t.slug);
      if (!exists) {
        try {
          const created = await (prismaAI as any).worldTool.upsert({
            where: { slug: t.slug },
            create: {
              name: t.name,
              slug: t.slug,
              description: t.description,
              routeUrl: t.routeUrl,
              icon: t.icon,
              category: t.category,
              badge: t.badge,
              isVisible: t.isVisible,
              accessType: t.accessType,
              priceMonthly: t.priceMonthly,
              freeTrialDays: t.freeTrialDays,
              order: t.order,
            },
            update: {}
          });
          if (created && created.isVisible) {
            dbTools.push(created);
          }
        } catch {
          dbTools.push({ id: `default-${t.slug}`, ...t });
        }
      }
    }

    // Sort by order
    dbTools.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    const now = new Date();
    const formattedTools: WorldToolItem[] = dbTools.map((tool: any) => {
      let isFreeTrialActive = false;
      let daysRemaining = 0;

      if (tool.accessType === 'TIMED_FREE') {
        if (tool.freeUntil) {
          const until = new Date(tool.freeUntil);
          const diffMs = until.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isFreeTrialActive = daysRemaining > 0;
        } else if (tool.freeTrialDays) {
          // If based on created date or default trial duration
          const created = new Date(tool.createdAt || now);
          const expiry = new Date(created.getTime() + tool.freeTrialDays * 24 * 60 * 60 * 1000);
          const diffMs = expiry.getTime() - now.getTime();
          daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          isFreeTrialActive = daysRemaining > 0;
        }
      } else if (tool.accessType === 'FREE') {
        isFreeTrialActive = false;
      }

      return {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        description: tool.description,
        routeUrl: tool.routeUrl,
        icon: tool.icon || 'Zap',
        category: tool.category || 'AI Tools',
        badge: tool.badge,
        isVisible: tool.isVisible,
        accessType: tool.accessType as any,
        priceMonthly: tool.priceMonthly || 0,
        freeTrialDays: tool.freeTrialDays,
        freeUntil: tool.freeUntil ? new Date(tool.freeUntil).toISOString() : null,
        order: tool.order || 0,
        createdAt: tool.createdAt ? new Date(tool.createdAt).toISOString() : null,
        isFreeTrialActive,
        daysRemaining,
      };
    });

    return { success: true, tools: formattedTools };
  } catch (error: any) {
    return { success: false, tools: [] };
  }
}

/**
 * Super Admin: Get all tools (including hidden & drafts)
 */
export async function getAllWorldToolsAdmin(): Promise<{ success: boolean; tools: WorldToolItem[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.isSuperAdmin || user?.email === process.env.SUPER_ADMIN_EMAIL;

    // Fetch from database
    let dbTools: any[] = [];
    try {
      dbTools = await (prismaAI as any).worldTool.findMany({
        orderBy: { order: 'asc' },
      });
    } catch {
      // Fallback
    }

    if (!dbTools) dbTools = [];

    // Ensure all DEFAULT_TOOLS exist in database & list
    for (const t of DEFAULT_TOOLS) {
      const exists = dbTools.some((d: any) => d.slug === t.slug);
      if (!exists) {
        try {
          const created = await (prismaAI as any).worldTool.upsert({
            where: { slug: t.slug },
            create: {
              name: t.name,
              slug: t.slug,
              description: t.description,
              routeUrl: t.routeUrl,
              icon: t.icon,
              category: t.category,
              badge: t.badge,
              isVisible: t.isVisible,
              accessType: t.accessType,
              priceMonthly: t.priceMonthly,
              freeTrialDays: t.freeTrialDays,
              order: t.order,
            },
            update: {}
          });
          if (created) {
            dbTools.push(created);
          }
        } catch {
          dbTools.push({ id: `default-${t.slug}`, ...t });
        }
      }
    }

    dbTools.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

    return {
      success: true,
      tools: dbTools.map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        description: t.description,
        routeUrl: t.routeUrl,
        icon: t.icon || 'Zap',
        category: t.category || 'AI Tools',
        badge: t.badge,
        isVisible: Boolean(t.isVisible),
        accessType: (t.accessType || 'FREE') as any,
        priceMonthly: Number(t.priceMonthly || 0),
        freeTrialDays: t.freeTrialDays ? Number(t.freeTrialDays) : 7,
        freeUntil: t.freeUntil ? new Date(t.freeUntil).toISOString() : null,
        order: t.order || 0,
        createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : null,
      }))
    };
  } catch (err: any) {
    return { success: false, tools: [], error: err.message };
  }
}

/**
 * Super Admin: Create a new AI tool for Tolee World
 */
export async function createWorldTool(data: {
  name: string;
  slug: string;
  description: string;
  routeUrl: string;
  icon?: string;
  category?: string;
  badge?: string;
  isVisible?: boolean;
  accessType: 'FREE' | 'PAID' | 'TIMED_FREE';
  priceMonthly?: number;
  freeTrialDays?: number;
  freeUntil?: string;
  order?: number;
}): Promise<{ success: boolean; tool?: WorldToolItem; error?: string }> {
  try {
    const slug = data.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const created = await (prismaAI as any).worldTool.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        routeUrl: data.routeUrl,
        icon: data.icon || 'Zap',
        category: data.category || 'AI Utilities',
        badge: data.badge || 'NEW',
        isVisible: data.isVisible !== false,
        accessType: data.accessType || 'FREE',
        priceMonthly: data.priceMonthly || 0,
        freeTrialDays: data.freeTrialDays || 7,
        freeUntil: data.freeUntil ? new Date(data.freeUntil) : null,
        order: data.order || 0,
      }
    });

    return { success: true, tool: created };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Update tool visibility, monetization & trial days
 */
export async function updateWorldTool(
  id: string,
  data: Partial<WorldToolItem>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.routeUrl !== undefined) updateData.routeUrl = data.routeUrl;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.badge !== undefined) updateData.badge = data.badge;
    if (data.isVisible !== undefined) updateData.isVisible = data.isVisible;
    if (data.accessType !== undefined) updateData.accessType = data.accessType;
    if (data.priceMonthly !== undefined) updateData.priceMonthly = Number(data.priceMonthly);
    if (data.freeTrialDays !== undefined) updateData.freeTrialDays = Number(data.freeTrialDays);
    if (data.freeUntil !== undefined) updateData.freeUntil = data.freeUntil ? new Date(data.freeUntil) : null;
    if (data.order !== undefined) updateData.order = Number(data.order);

    await (prismaAI as any).worldTool.update({
      where: { id },
      data: updateData,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Super Admin: Delete a tool from Tolee World
 */
export async function deleteWorldTool(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await (prismaAI as any).worldTool.delete({
      where: { id },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
