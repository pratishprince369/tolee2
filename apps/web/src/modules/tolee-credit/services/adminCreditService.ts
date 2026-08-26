import { prisma } from '@/lib/prisma';
import { CreditSystemConfigDto, CreditWithdrawalDto } from '../types';
import { DEFAULT_CREDIT_CONFIG } from '../config/defaultConfig';
import { updateWalletBalances } from './walletService';
import { logCreditAudit } from './auditService';

export async function getAdminSystemConfig(): Promise<CreditSystemConfigDto> {
  const config = await prisma.creditSystemConfig.findUnique({
    where: { id: 'global_credit_config' },
  });

  if (!config) {
    return {
      id: DEFAULT_CREDIT_CONFIG.id,
      defaultRevenueSharePercent: DEFAULT_CREDIT_CONFIG.defaultRevenueSharePercent,
      minimumWithdrawalAmount: DEFAULT_CREDIT_CONFIG.minimumWithdrawalAmount,
      settlementPeriodDays: DEFAULT_CREDIT_CONFIG.settlementPeriodDays,
      fraudCheckEnabled: DEFAULT_CREDIT_CONFIG.fraudCheckEnabled,
      kycRequiredForWithdrawal: DEFAULT_CREDIT_CONFIG.kycRequiredForWithdrawal,
      maxDailyWithdrawalLimit: DEFAULT_CREDIT_CONFIG.maxDailyWithdrawalLimit,
      allowNewWallets: DEFAULT_CREDIT_CONFIG.allowNewWallets,
      eligibleAdTypes: DEFAULT_CREDIT_CONFIG.eligibleAdTypes,
    };
  }

  return {
    id: config.id,
    defaultRevenueSharePercent: config.defaultRevenueSharePercent,
    minimumWithdrawalAmount: config.minimumWithdrawalAmount,
    settlementPeriodDays: config.settlementPeriodDays,
    fraudCheckEnabled: config.fraudCheckEnabled,
    kycRequiredForWithdrawal: config.kycRequiredForWithdrawal,
    maxDailyWithdrawalLimit: config.maxDailyWithdrawalLimit,
    allowNewWallets: config.allowNewWallets,
    eligibleAdTypes: config.eligibleAdTypes ? config.eligibleAdTypes.split(',') : DEFAULT_CREDIT_CONFIG.eligibleAdTypes,
  };
}

export async function updateAdminSystemConfig(
  input: Partial<CreditSystemConfigDto>,
  adminId: string
): Promise<CreditSystemConfigDto> {
  const updated = await prisma.creditSystemConfig.upsert({
    where: { id: 'global_credit_config' },
    update: {
      defaultRevenueSharePercent: input.defaultRevenueSharePercent,
      minimumWithdrawalAmount: input.minimumWithdrawalAmount,
      settlementPeriodDays: input.settlementPeriodDays,
      fraudCheckEnabled: input.fraudCheckEnabled,
      kycRequiredForWithdrawal: input.kycRequiredForWithdrawal,
      maxDailyWithdrawalLimit: input.maxDailyWithdrawalLimit,
      allowNewWallets: input.allowNewWallets,
      eligibleAdTypes: input.eligibleAdTypes ? input.eligibleAdTypes.join(',') : undefined,
      updatedBy: adminId,
    },
    create: {
      id: 'global_credit_config',
      defaultRevenueSharePercent: input.defaultRevenueSharePercent ?? DEFAULT_CREDIT_CONFIG.defaultRevenueSharePercent,
      minimumWithdrawalAmount: input.minimumWithdrawalAmount ?? DEFAULT_CREDIT_CONFIG.minimumWithdrawalAmount,
      settlementPeriodDays: input.settlementPeriodDays ?? DEFAULT_CREDIT_CONFIG.settlementPeriodDays,
      fraudCheckEnabled: input.fraudCheckEnabled ?? DEFAULT_CREDIT_CONFIG.fraudCheckEnabled,
      kycRequiredForWithdrawal: input.kycRequiredForWithdrawal ?? DEFAULT_CREDIT_CONFIG.kycRequiredForWithdrawal,
      maxDailyWithdrawalLimit: input.maxDailyWithdrawalLimit ?? DEFAULT_CREDIT_CONFIG.maxDailyWithdrawalLimit,
      allowNewWallets: input.allowNewWallets ?? DEFAULT_CREDIT_CONFIG.allowNewWallets,
      eligibleAdTypes: input.eligibleAdTypes ? input.eligibleAdTypes.join(',') : DEFAULT_CREDIT_CONFIG.eligibleAdTypes.join(','),
      updatedBy: adminId,
    },
  });

  await logCreditAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: 'config_updated',
    targetType: 'config',
    targetId: 'global_credit_config',
    details: input as any,
  });

  return {
    id: updated.id,
    defaultRevenueSharePercent: updated.defaultRevenueSharePercent,
    minimumWithdrawalAmount: updated.minimumWithdrawalAmount,
    settlementPeriodDays: updated.settlementPeriodDays,
    fraudCheckEnabled: updated.fraudCheckEnabled,
    kycRequiredForWithdrawal: updated.kycRequiredForWithdrawal,
    maxDailyWithdrawalLimit: updated.maxDailyWithdrawalLimit,
    allowNewWallets: updated.allowNewWallets,
    eligibleAdTypes: updated.eligibleAdTypes ? updated.eligibleAdTypes.split(',') : DEFAULT_CREDIT_CONFIG.eligibleAdTypes,
  };
}

export async function getAdminCreditOverview() {
  const [
    walletAggregates,
    earningUsersCount,
    earningGroupsCount,
    pendingWithdrawalsCount,
    flaggedTransactions,
    topGroups,
    topWallets,
  ] = await Promise.all([
    prisma.creditWallet.aggregate({
      _sum: {
        totalEarned: true,
        availableBalance: true,
        pendingBalance: true,
        totalWithdrawn: true,
      },
      _count: { id: true },
    }),
    prisma.creditWallet.count({
      where: { totalEarned: { gt: 0 } },
    }),
    prisma.groupCreditConfig.count({
      where: { totalRevenueGenerated: { gt: 0 } },
    }),
    prisma.creditWithdrawal.count({
      where: { status: 'pending' },
    }),
    prisma.creditTransaction.aggregate({
      where: { status: 'under_review' },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.groupCreditConfig.findMany({
      orderBy: { totalRevenueGenerated: 'desc' },
      take: 5,
      include: {
        tolee: { select: { name: true, slug: true, avatar: true } },
      },
    }),
    prisma.creditWallet.findMany({
      orderBy: { totalEarned: 'desc' },
      take: 5,
      include: {
        user: { select: { name: true, username: true, email: true, avatar: true } },
      },
    }),
  ]);

  return {
    totalWallets: walletAggregates._count.id || 0,
    totalEarnedIssued: walletAggregates._sum.totalEarned || 0,
    totalAvailable: walletAggregates._sum.availableBalance || 0,
    totalPending: walletAggregates._sum.pendingBalance || 0,
    totalWithdrawn: walletAggregates._sum.totalWithdrawn || 0,
    earningUsersCount,
    earningGroupsCount,
    pendingWithdrawalsCount,
    flaggedAmount: flaggedTransactions._sum.amount || 0,
    flaggedCount: flaggedTransactions._count.id || 0,
    topGroups: topGroups.map((g: any) => ({
      id: g.id,
      toleeName: g.tolee?.name || 'Group',
      toleeSlug: g.tolee?.slug || '',
      toleeAvatar: g.tolee?.avatar,
      totalRevenueGenerated: g.totalRevenueGenerated,
      totalAdminShareEarned: g.totalAdminShareEarned,
    })),
    topUsers: topWallets.map((w: any) => ({
      userId: w.userId,
      userName: w.user?.name || 'User',
      username: w.user?.username || '',
      userEmail: w.user?.email || '',
      userAvatar: w.user?.avatar,
      totalEarned: w.totalEarned,
      availableBalance: w.availableBalance,
    })),
  };
}

export async function getAdminAllWithdrawals(status?: string): Promise<CreditWithdrawalDto[]> {
  const where: any = {};
  if (status) where.status = status;

  const items = await prisma.creditWithdrawal.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  return items.map((w: any) => ({
    id: w.id,
    withdrawalId: w.withdrawalId,
    walletId: w.walletId,
    userId: w.userId,
    amount: w.amount,
    currency: w.currency,
    bankAccountId: w.bankAccountId,
    bankAccountSnapshot: w.bankAccountSnapshot as any,
    status: w.status as any,
    failureReason: w.failureReason,
    adminNotes: w.adminNotes,
    payoutReference: w.payoutReference,
    requestedAt: w.requestedAt.toISOString(),
    processedAt: w.processedAt ? w.processedAt.toISOString() : null,
    completedAt: w.completedAt ? w.completedAt.toISOString() : null,
    userName: w.user?.name,
    userEmail: w.user?.email,
  }));
}

export async function processAdminWithdrawalAction(
  withdrawalId: string,
  action: 'approve' | 'reject' | 'fail',
  adminId: string,
  options?: { payoutReference?: string; reason?: string; adminNotes?: string }
): Promise<{ success: boolean; error?: string }> {
  const withdrawal = await prisma.creditWithdrawal.findUnique({
    where: { id: withdrawalId },
  });

  if (!withdrawal) {
    return { success: false, error: 'Withdrawal record not found.' };
  }

  if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
    return { success: false, error: `Withdrawal is already in '${withdrawal.status}' status.` };
  }

  const now = new Date();

  await prisma.$transaction(async (tx: any) => {
    if (action === 'approve') {
      await tx.creditWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: 'completed',
          payoutReference: options?.payoutReference || `BANK_SETTLE_${Date.now()}`,
          adminNotes: options?.adminNotes || null,
          processedAt: now,
          completedAt: now,
        },
      });

      // Update Ledger transaction
      await tx.creditTransaction.updateMany({
        where: { sourceId: withdrawal.id, type: 'withdrawal' },
        data: { status: 'settled', settledAt: now },
      });

      // Send Notification to user
      try {
        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: 'credit_withdrawal_completed',
            message: `Your Tolee Credit withdrawal of ₹${withdrawal.amount.toFixed(2)} has been completed successfully.`,
            link: '/tolee-credit',
          },
        });
      } catch {}
    } else {
      // Reject or Fail: Restore wallet balance
      await tx.creditWithdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: action === 'reject' ? 'rejected' : 'failed',
          failureReason: options?.reason || 'Withdrawal rejected by administrator.',
          adminNotes: options?.adminNotes || null,
          processedAt: now,
        },
      });

      // Reverse ledger transaction
      await tx.creditTransaction.updateMany({
        where: { sourceId: withdrawal.id, type: 'withdrawal' },
        data: { status: 'failed' },
      });

      // Restore available balance and subtract from totalWithdrawn
      await updateWalletBalances(tx, withdrawal.walletId, {
        availableDelta: withdrawal.amount,
        withdrawnDelta: -withdrawal.amount,
      });

      // Send Notification
      try {
        await tx.notification.create({
          data: {
            userId: withdrawal.userId,
            type: 'credit_withdrawal_failed',
            message: `Your Tolee Credit withdrawal of ₹${withdrawal.amount.toFixed(2)} could not be completed. Reason: ${options?.reason || 'Cancelled'}. Your balance has been restored.`,
            link: '/tolee-credit',
          },
        });
      } catch {}
    }
  });

  await logCreditAudit({
    actorId: adminId,
    actorRole: 'admin',
    action: action === 'approve' ? 'withdrawal_approved' : 'withdrawal_rejected',
    targetType: 'withdrawal',
    targetId: withdrawal.id,
    amount: withdrawal.amount,
    details: { action, options },
  });

  return { success: true };
}
