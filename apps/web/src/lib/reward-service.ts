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

  // 1. Fetch user's post counts for this month & today
  const [postsThisMonth, postsToday, wallet] = await Promise.all([
    prisma.post.count({
      where: {
        userId,
        createdAt: { gte: startOfMonth }
      }
    }),
    prisma.post.count({
      where: {
        userId,
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

  const adsWalletBalance = wallet?.balance ?? 2500.0;
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

  // Generate dynamic English notification message based on exact user activity
  let notificationMessage = '';
  if (rewardCreditedThisMonth) {
    notificationMessage = `🎉 Congratulations! Your ₹3,999 Ads Wallet reward for this month is credited and active in your account!`;
  } else if (isRewardEarned) {
    notificationMessage = `🎉 You completed your 30 posts target! ₹3,999 is ready to be credited to your Ads Wallet!`;
  } else if (postsToday === 0 && missedPosts === 0) {
    notificationMessage = `Post 1 or 2 posts daily on Tolee to claim ₹3,999 in your Ads Wallet every month! Start posting today!`;
  } else if (postsToday === 0 && missedPosts > 0) {
    notificationMessage = `Catch up on your pending posts! You missed posting for the last ${pendingDays} day(s). Post ${recommendedTodayPosts} posts today to maintain your ₹3,999 Ads Wallet monthly goal!`;
  } else {
    notificationMessage = `Great progress! You have created ${postsThisMonth}/${targetMonthlyPosts} posts this month. Post ${recommendedTodayPosts} more today to stay on track for your ₹3,999 Ads Wallet reward!`;
  }

  // 2. Auto Credit ₹3,999 into Ads Wallet if target achieved and not yet credited this month
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
        balance: 2500.0,
        totalEarned: 2500.0
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
        title: '🎉 ₹3,999 Ads Wallet Credited!',
        content: 'Congratulations! You completed your monthly posting goal. ₹3,999 has been credited into your Tolee Ads Wallet balance!'
      }
    })
  ]);

  return { success: true, credited: true };
}

/**
 * Triggers up to 3 daily English notifications for the ₹3,999 Creator Offer.
 */
export async function triggerRewardNotifications(userId: string) {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check how many creator reward notifications sent today
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
        title: status.postsToday === 0 ? '📢 Post Daily & Earn ₹3,999 in Ads Wallet!' : '✨ ₹3,999 Ads Wallet Monthly Goal',
        content: status.notificationMessage
      }
    });

    return { sent: true, count: notificationsTodayCount + 1, message: status.notificationMessage };
  } catch (err: any) {
    console.error('Error triggering reward notification:', err);
    return { sent: false, error: err.message };
  }
}
