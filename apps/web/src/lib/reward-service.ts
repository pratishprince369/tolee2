import { prisma } from '@/lib/prisma';

export interface MonthlyRewardStatus {
  postsThisMonth: number;
  postsToday: number;
  dayOfMonth: number;
  targetMonthlyPosts: number;
  missedPosts: number;
  pendingDays: number;
  recommendedTodayPosts: number;
  isRewardEarned: boolean;
  rewardCreditedThisMonth: boolean;
  adsWalletBalance: number;
  notificationMessage: string;
}

/**
 * Calculates current month's creator posting progress & Ads Wallet ₹3,999 reward status.
 */
export async function getUserMonthlyRewardStatus(userId: string): Promise<MonthlyRewardStatus> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfMonth = now.getDate();
  const targetMonthlyPosts = 30;

  // Fetch user's post counts for this month & today
  const [postsThisMonth, postsToday, wallet] = await Promise.all([
    prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: startOfMonth }
      }
    }),
    prisma.post.count({
      where: {
        authorId: userId,
        createdAt: { gte: startOfToday }
      }
    }),
    prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          where: {
            type: 'monthly_creator_reward',
            createdAt: { gte: startOfMonth }
          },
          take: 1
        }
      }
    })
  ]);

  const adsWalletBalance = wallet?.balance ?? 3999.0;
  const rewardCreditedThisMonth = Boolean(wallet && wallet.transactions.length > 0);
  const expectedPostsSoFar = Math.min(targetMonthlyPosts, dayOfMonth);
  const missedPosts = Math.max(0, expectedPostsSoFar - postsThisMonth);
  const pendingDays = Math.min(2, Math.ceil(missedPosts));

  // Determine recommended post count for today
  let recommendedTodayPosts = 1;
  if (postsToday === 0) {
    recommendedTodayPosts = missedPosts > 0 ? Math.min(5, 2 + missedPosts) : 1;
  } else {
    recommendedTodayPosts = missedPosts > 0 ? Math.min(5, 1 + missedPosts) : 1;
  }

  const isRewardEarned = postsThisMonth >= targetMonthlyPosts;

  let notificationMessage = '';
  if (rewardCreditedThisMonth) {
    notificationMessage = `🎉 Congratulations! Your ₹3,999 Ads Wallet reward for this month is credited and active in your account!`;
  } else if (isRewardEarned) {
    notificationMessage = `🎉 You completed your 30 posts target! ₹3,999 is ready to be credited to your Ads Wallet!`;
  } else if (postsToday === 0 && missedPosts === 0) {
    notificationMessage = `Post 1 or 2 posts daily (Reels, Videos, Images, Blogs) on Tolee to claim ₹3,999 in your Ads Wallet every month!`;
  } else if (postsToday === 0 && missedPosts > 0) {
    notificationMessage = `You haven't posted today! Post ${recommendedTodayPosts} post(s) today to catch up and keep your ₹3,999/mo Ads Wallet streak active!`;
  } else {
    notificationMessage = `Great progress! You have created ${postsThisMonth}/${targetMonthlyPosts} posts this month. Post ${recommendedTodayPosts} more today to stay on track for your ₹3,999 Ads Wallet reward!`;
  }

  // Auto Credit ₹3,999 into Ads Wallet if target achieved and not yet credited this month
  if (isRewardEarned && !rewardCreditedThisMonth) {
    try {
      await autoCreditMonthlyReward(userId);
    } catch (err) {
      console.error('Error auto-crediting ₹3,999 Ads Wallet reward:', err);
    }
  }

  return {
    postsThisMonth,
    postsToday,
    dayOfMonth,
    targetMonthlyPosts,
    missedPosts,
    pendingDays,
    recommendedTodayPosts,
    isRewardEarned,
    rewardCreditedThisMonth,
    adsWalletBalance,
    notificationMessage
  };
}

/**
 * Automatically credits ₹3,999 into the user's Ads Wallet & sends a notification.
 */
export async function autoCreditMonthlyReward(userId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Ensure Wallet exists
  let wallet = await prisma.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        userId,
        balance: 3999.0,
        totalEarned: 3999.0
      }
    });
  }

  // Check deduplication for current month
  const existingTransaction = await prisma.walletTransaction.findFirst({
    where: {
      walletId: wallet.id,
      type: 'monthly_creator_reward',
      createdAt: { gte: startOfMonth }
    }
  });

  if (existingTransaction) {
    return { success: true, alreadyCredited: true };
  }

  // Transaction: Increment balance & create record + notification
  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: 3999.0 },
        totalEarned: { increment: 3999.0 }
      }
    }),
    prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: 3999.0,
        type: 'monthly_creator_reward',
        description: 'Monthly Creator Reward - ₹3,999 Ads Wallet Bonus'
      }
    }),
    prisma.notification.create({
      data: {
        userId,
        type: 'CREATOR_REWARD_CREDITED',
        message: '🎉 ₹3,999 Ads Wallet Credited! Congratulations! You completed your monthly posting goal. ₹3,999 has been credited into your Tolee Ads Wallet balance!',
        link: '/settings?tab=billing'
      }
    })
  ]);

  return { success: true, credited: true };
}

/**
 * Triggers up to 3 daily notifications for a specific user.
 */
export async function triggerRewardNotifications(userId: string) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const notificationsTodayCount = await prisma.notification.count({
      where: {
        userId,
        type: 'CREATOR_REWARD_REMINDER',
        createdAt: { gte: startOfToday }
      }
    });

    if (notificationsTodayCount >= 3) {
      return { sent: false, reason: 'Daily notification limit reached (3/3)' };
    }

    const status = await getUserMonthlyRewardStatus(userId);

    await prisma.notification.create({
      data: {
        userId,
        type: 'CREATOR_REWARD_REMINDER',
        message: `🎁 Earn ₹3,999 Every Month in Ads Wallet! Post daily (Reels, Videos, Images, or Blogs) on Tolee to claim ₹3,999 automatically credited to your Ads Wallet every month!\n\nStatus: ${status.notificationMessage}`,
        link: '/feed'
      }
    });

    return { sent: true, count: notificationsTodayCount + 1, message: status.notificationMessage };
  } catch (err: any) {
    console.error('Error triggering reward notification:', err);
    return { sent: false, error: err.message };
  }
}

/**
 * AI Smart Nudge Engine: Evaluates ALL users and sends up to 3 daily notifications via Bell Icon.
 * Handles active posters who missed today (e.g. Ram) and passive lurkers.
 */
export async function processAIRewardNudges() {
  const now = new Date();
  const hour = now.getHours();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let slot: 'morning' | 'afternoon' | 'evening' = 'morning';
  if (hour >= 12 && hour < 17) {
    slot = 'afternoon';
  } else if (hour >= 17) {
    slot = 'evening';
  }

  // Fetch active non-banned users
  const users = await prisma.user.findMany({
    where: { isBanned: false, isSuspended: false },
    select: { id: true, name: true, username: true }
  });

  let processedCount = 0;
  let sentCount = 0;

  for (const user of users) {
    try {
      // Limit check: Max 3 CREATOR_REWARD_REMINDER per user per day
      const notifCountToday = await prisma.notification.count({
        where: {
          userId: user.id,
          type: 'CREATOR_REWARD_REMINDER',
          createdAt: { gte: startOfToday }
        }
      });

      if (notifCountToday >= 3) continue;

      // Count posts created today by this user
      const postsToday = await prisma.post.count({
        where: {
          authorId: user.id,
          createdAt: { gte: startOfToday }
        }
      });

      const nameStr = user.name || user.username || 'User';
      let messageText = '';

      if (postsToday === 0) {
        // User HAS NOT posted today!
        if (slot === 'morning') {
          messageText = `🎁 ₹3,999/Month Ads Wallet Offer: Hi ${nameStr}, post anything daily (Reels, Videos, Images, Blogs) on Tolee and claim ₹3,999 in your Ads Wallet every month! Start your posting streak today!`;
        } else if (slot === 'afternoon') {
          messageText = `⚠️ Hi ${nameStr}, you haven't posted today! Don't skip your ₹3,999/mo Ads Wallet streak! Post 1 photo, reel, video, or blog today to stay on track for your monthly reward.`;
        } else {
          messageText = `⏰ Today's Post Streak Reminder for ₹3,999 Offer: Just 1 post today keeps your ₹3,999/mo Ads Wallet reward streak alive! Post an image, reel, video, or update before midnight!`;
        }
      } else {
        // User HAS posted today (Positive Reinforcement)
        messageText = `🎉 Great job today, ${nameStr}! Your daily post is submitted! You are on track to receive ₹3,999 credited to your Ads Wallet this month.`;
      }

      await prisma.notification.create({
        data: {
          userId: user.id,
          type: 'CREATOR_REWARD_REMINDER',
          message: messageText,
          link: '/feed'
        }
      });

      sentCount++;
    } catch (e) {
      console.error(`Error processing AI nudge for user ${user.id}:`, e);
    }
    processedCount++;
  }

  return {
    success: true,
    totalUsers: users.length,
    processedCount,
    sentCount,
    slot
  };
}
