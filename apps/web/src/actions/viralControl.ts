'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import {
  submitDistributionVote,
  getPostDistributionStats,
  processViralDistribution,
  DistributionStats,
} from '@/lib/viralDistributionService';

export async function votePostDistributionAction(
  postId: string,
  voteType: 'VIRAL' | 'GET_IT_DOWN'
): Promise<{ success: boolean; error?: string; stats?: DistributionStats }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: 'Authentication required to vote.' };
    }

    if (!postId || !['VIRAL', 'GET_IT_DOWN'].includes(voteType)) {
      return { success: false, error: 'Invalid vote parameters.' };
    }

    const res = await submitDistributionVote(postId, userId, voteType);
    return res;
  } catch (err: any) {
    console.error('[viralControl] votePostDistributionAction error:', err);
    return { success: false, error: err?.message || 'Failed to submit vote.' };
  }
}

export async function getPostDistributionStatsAction(
  postId: string
): Promise<{ success: boolean; stats?: DistributionStats; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!postId) {
      return { success: false, error: 'Post ID is required.' };
    }

    const stats = await getPostDistributionStats(postId, userId);
    return { success: true, stats };
  } catch (err: any) {
    console.error('[viralControl] getPostDistributionStatsAction error:', err);
    return { success: false, error: err?.message || 'Failed to fetch distribution stats.' };
  }
}

export async function processDistributionAction(
  postId: string
): Promise<{ success: boolean; delivered?: number; totalDelivered?: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    if (!userId) {
      return { success: false, error: 'Unauthorized.' };
    }

    const res = await processViralDistribution(postId);
    return { success: true, ...res };
  } catch (err: any) {
    console.error('[viralControl] processDistributionAction error:', err);
    return { success: false, error: err?.message || 'Failed to process distribution.' };
  }
}
