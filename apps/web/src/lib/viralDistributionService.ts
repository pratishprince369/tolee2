import { prisma } from '@/lib/prisma';

export const MAX_TEST_AUDIENCE_CAP = 10;

export interface DistributionStats {
  viral_count: number;
  get_it_down_count: number;
  total_vote_count: number;
  viral_percentage: number;
  get_it_down_percentage: number;
  current_user_vote: 'VIRAL' | 'GET_IT_DOWN' | null;
}

/**
 * Calculates deterministic percentages from real vote tallies.
 * Returns 0% / 0% for zero total votes. Percentages sum to 100% when total > 0.
 */
export function calculateDistributionPercentages(viralCount: number, getItDownCount: number) {
  const total = viralCount + getItDownCount;
  if (total <= 0) {
    return {
      total_vote_count: 0,
      viral_percentage: 0,
      get_it_down_percentage: 0,
    };
  }

  const viralPercent = Math.round((viralCount / total) * 100);
  const downPercent = 100 - viralPercent;

  return {
    total_vote_count: total,
    viral_percentage: viralPercent,
    get_it_down_percentage: downPercent,
  };
}

/**
 * Fetches distribution stats for a given post and authenticated user.
 */
export async function getPostDistributionStats(postId: string, userId?: string | null): Promise<DistributionStats> {
  const [post, userVote] = await Promise.all([
    prisma.post.findUnique({
      where: { id: postId },
      select: { viralCount: true, getItDownCount: true },
    }),
    userId
      ? prisma.postDistributionVote.findUnique({
          where: { postId_userId: { postId, userId } },
          select: { voteType: true },
        })
      : null,
  ]);

  const viralCount = post?.viralCount || 0;
  const downCount = post?.getItDownCount || 0;
  const { total_vote_count, viral_percentage, get_it_down_percentage } = calculateDistributionPercentages(
    viralCount,
    downCount
  );

  return {
    viral_count: viralCount,
    get_it_down_count: downCount,
    total_vote_count,
    viral_percentage,
    get_it_down_percentage,
    current_user_vote: (userVote?.voteType as 'VIRAL' | 'GET_IT_DOWN') || null,
  };
}

/**
 * Batch fetches distribution stats for multiple posts (zero N+1 queries).
 */
export async function batchGetPostDistributionStats(
  postIds: string[],
  userId?: string | null
): Promise<Map<string, DistributionStats>> {
  if (postIds.length === 0) return new Map();

  const [posts, userVotes] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: postIds } },
      select: { id: true, viralCount: true, getItDownCount: true },
    }),
    userId
      ? prisma.postDistributionVote.findMany({
          where: { postId: { in: postIds }, userId },
          select: { postId: true, voteType: true },
        })
      : [],
  ]);

  const userVoteMap = new Map<string, 'VIRAL' | 'GET_IT_DOWN'>();
  userVotes.forEach((v: any) => {
    userVoteMap.set(v.postId, v.voteType as 'VIRAL' | 'GET_IT_DOWN');
  });

  const resultMap = new Map<string, DistributionStats>();
  posts.forEach((p: any) => {
    const { total_vote_count, viral_percentage, get_it_down_percentage } = calculateDistributionPercentages(
      p.viralCount,
      p.getItDownCount
    );
    resultMap.set(p.id, {
      viral_count: p.viralCount,
      get_it_down_count: p.getItDownCount,
      total_vote_count,
      viral_percentage,
      get_it_down_percentage,
      current_user_vote: userVoteMap.get(p.id) || null,
    });
  });

  return resultMap;
}

/**
 * Submits or toggles a distribution vote ('VIRAL' | 'GET_IT_DOWN').
 * Atomic transaction ensures persisted votes and synchronized counts.
 */
export async function submitDistributionVote(postId: string, userId: string, voteType: 'VIRAL' | 'GET_IT_DOWN') {
  // 1. Verify post exists, is published, and not archived
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, status: true, isArchived: true, visibility: true, authorId: true },
  });

  if (!post || post.isArchived || post.status !== 'published') {
    throw new Error('Post not found or not eligible for distribution voting.');
  }

  // 2. Perform atomic transaction
  const result = await prisma.$transaction(async (tx: any) => {
    const existingVote = await tx.postDistributionVote.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    let finalUserVote: 'VIRAL' | 'GET_IT_DOWN' | null = null;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // Clicking same option toggles unvote
        await tx.postDistributionVote.delete({
          where: { id: existingVote.id },
        });
        finalUserVote = null;
      } else {
        // Switching vote
        await tx.postDistributionVote.update({
          where: { id: existingVote.id },
          data: { voteType },
        });
        finalUserVote = voteType;
      }
    } else {
      // New vote
      await tx.postDistributionVote.create({
        data: {
          postId,
          userId,
          voteType,
        },
      });
      finalUserVote = voteType;
    }

    // Atomic recount from source of truth to avoid drift
    const [viralCount, downCount] = await Promise.all([
      tx.postDistributionVote.count({ where: { postId, voteType: 'VIRAL' } }),
      tx.postDistributionVote.count({ where: { postId, voteType: 'GET_IT_DOWN' } }),
    ]);

    await tx.post.update({
      where: { id: postId },
      data: { viralCount, getItDownCount: downCount },
    });

    return {
      viralCount,
      downCount,
      currentUserVote: finalUserVote,
    };
  });

  // 3. If final vote is VIRAL, trigger controlled additional distribution
  if (result.currentUserVote === 'VIRAL') {
    processViralDistribution(postId).catch((err) => {
      console.error('[ViralControl] Background distribution error:', err);
    });
  }

  const { total_vote_count, viral_percentage, get_it_down_percentage } = calculateDistributionPercentages(
    result.viralCount,
    result.downCount
  );

  return {
    success: true,
    stats: {
      viral_count: result.viralCount,
      get_it_down_count: result.downCount,
      total_vote_count,
      viral_percentage,
      get_it_down_percentage,
      current_user_vote: result.currentUserVote,
    },
  };
}

/**
 * Controlled test-audience distribution algorithm:
 * - Checks post eligibility
 * - Caps total additional recipients to MAX_TEST_AUDIENCE_CAP (10)
 * - Excludes author, already delivered users, viewers, voters of GET_IT_DOWN, and banned accounts
 * - Delivers original post references idempotently
 */
export async function processViralDistribution(postId: string): Promise<{ delivered: number; totalDelivered: number }> {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      authorId: true,
      status: true,
      isArchived: true,
      visibility: true,
      viralCount: true,
      getItDownCount: true,
      author: { select: { id: true, isBanned: true, isSuspended: true, isPrivate: true } },
    },
  });

  if (!post || post.isArchived || post.status !== 'published') {
    return { delivered: 0, totalDelivered: 0 };
  }

  if (post.author?.isBanned || post.author?.isSuspended) {
    return { delivered: 0, totalDelivered: 0 };
  }

  // Tolee Viral Control: positive signal required, and Get it Down net-negative excludes from additional distribution pool
  // ("Do not penalize the content creator simply because one user selects Get it Down")
  if (post.viralCount <= 0 || post.getItDownCount >= post.viralCount) {
    return { delivered: 0, totalDelivered: 0 };
  }

  // Count existing deliveries for this post
  const existingDeliveries = await prisma.postDistributionDelivery.findMany({
    where: { postId },
    select: { recipientUserId: true },
  });

  const existingRecipientIds = new Set(existingDeliveries.map((d: any) => d.recipientUserId));
  if (existingRecipientIds.size >= MAX_TEST_AUDIENCE_CAP) {
    return { delivered: 0, totalDelivered: existingRecipientIds.size };
  }

  const remainingQuota = MAX_TEST_AUDIENCE_CAP - existingRecipientIds.size;

  // Gather exclusion user IDs:
  // 1. Post author
  // 2. Existing recipients
  // 3. Users who already viewed the post
  // 4. Users who voted GET_IT_DOWN
  const excludedUserIds = new Set<string>([post.authorId, ...Array.from(existingRecipientIds)]);

  const [views, downVotes] = await Promise.all([
    prisma.view.findMany({
      where: { contentId: postId },
      select: { viewer_user_id: true },
      take: 200,
    }),
    prisma.postDistributionVote.findMany({
      where: { postId, voteType: 'GET_IT_DOWN' },
      select: { userId: true },
    }),
  ]);

  views.forEach((v: any) => {
    if (v.viewer_user_id) excludedUserIds.add(v.viewer_user_id);
  });
  downVotes.forEach((dv: any) => {
    excludedUserIds.add(dv.userId);
  });

  // Find candidate users:
  // Tier 1: Followers of author
  // Tier 2: General active users (test audience)
  let candidateUserIds: string[] = [];

  const followers = await prisma.follow.findMany({
    where: {
      followingId: post.authorId,
      status: 'approved',
      followerId: { notIn: Array.from(excludedUserIds) },
    },
    select: { followerId: true },
    take: remainingQuota,
  });

  followers.forEach((f: any) => candidateUserIds.push(f.followerId));

  if (candidateUserIds.length < remainingQuota) {
    const needed = remainingQuota - candidateUserIds.length;
    const additionalUsers = await prisma.user.findMany({
      where: {
        id: { notIn: [...Array.from(excludedUserIds), ...candidateUserIds] },
        isBanned: false,
        isSuspended: false,
      },
      select: { id: true },
      take: needed,
      orderBy: { createdAt: 'desc' },
    });
    additionalUsers.forEach((u: any) => candidateUserIds.push(u.id));
  }

  if (candidateUserIds.length === 0) {
    return { delivered: 0, totalDelivered: existingRecipientIds.size };
  }

  // Idempotently create deliveries up to remainingQuota
  const toInsert = candidateUserIds.slice(0, remainingQuota);
  let createdCount = 0;

  for (const recipientId of toInsert) {
    try {
      await prisma.postDistributionDelivery.upsert({
        where: {
          postId_recipientUserId_distributionSource: {
            postId,
            recipientUserId: recipientId,
            distributionSource: 'viral_control',
          },
        },
        create: {
          postId,
          recipientUserId: recipientId,
          distributionSource: 'viral_control',
          status: 'delivered',
          deliveredAt: new Date(),
        },
        update: {},
      });
      createdCount++;
    } catch {
      // Safe deduplication
    }
  }

  return {
    delivered: createdCount,
    totalDelivered: existingRecipientIds.size + createdCount,
  };
}
