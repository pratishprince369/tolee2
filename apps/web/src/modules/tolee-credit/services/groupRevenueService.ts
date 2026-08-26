import { prisma } from '@/lib/prisma';
import { GroupCreditSummaryDto } from '../types';
import { getOrCreateWallet } from './walletService';
import { DEFAULT_CREDIT_CONFIG } from '../config/defaultConfig';
import { logCreditAudit } from './auditService';

export async function connectGroupToCredit(
  toleeId: string,
  userId: string,
  customRevenueSharePercent?: number
): Promise<{ success: boolean; config?: any; error?: string }> {
  const tolee = await prisma.tolee.findUnique({
    where: { id: toleeId },
    select: { id: true, ownerId: true, name: true },
  });

  if (!tolee) {
    return { success: false, error: 'Tolee group not found.' };
  }

  if (tolee.ownerId !== userId) {
    return { success: false, error: 'Only the group founder/owner can connect Tolee Credit.' };
  }

  const wallet = await getOrCreateWallet(userId);

  const existingConfig = await prisma.groupCreditConfig.findUnique({
    where: { toleeId },
  });

  let config;
  if (existingConfig) {
    config = await prisma.groupCreditConfig.update({
      where: { toleeId },
      data: {
        walletId: wallet.id,
        ownerId: userId,
        creditEnabled: true,
        revenueShareEnabled: true,
        customRevenueSharePercent: customRevenueSharePercent ?? existingConfig.customRevenueSharePercent,
      },
    });
  } else {
    config = await prisma.groupCreditConfig.create({
      data: {
        toleeId,
        walletId: wallet.id,
        ownerId: userId,
        creditEnabled: true,
        revenueShareEnabled: true,
        customRevenueSharePercent: customRevenueSharePercent ?? null,
      },
    });
  }

  await logCreditAudit({
    actorId: userId,
    action: 'group_connected',
    targetType: 'group',
    targetId: toleeId,
    details: { toleeName: tolee.name, walletId: wallet.id },
  });

  return { success: true, config };
}

export async function getMyGroupsCreditSummary(userId: string): Promise<GroupCreditSummaryDto[]> {
  const ownedTolees = await prisma.tolee.findMany({
    where: { ownerId: userId },
    include: {
      _count: { select: { members: true } },
      creditConfig: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const wallet = await getOrCreateWallet(userId);

  const results: GroupCreditSummaryDto[] = [];

  for (const group of ownedTolees) {
    const config = group.creditConfig;

    // Fetch aggregate transaction stats for this group
    const [pendingAgg, settledAgg] = await Promise.all([
      prisma.creditTransaction.aggregate({
        where: {
          groupId: group.id,
          userId,
          status: 'pending',
        },
        _sum: { amount: true },
      }),
      prisma.creditTransaction.aggregate({
        where: {
          groupId: group.id,
          userId,
          status: { in: ['settled', 'available'] },
        },
        _sum: { amount: true },
      }),
    ]);

    const pendingShare = pendingAgg._sum.amount || 0;
    const availableShare = settledAgg._sum.amount || 0;
    const totalAdminShare = config?.totalAdminShareEarned || (pendingShare + availableShare);
    const totalRevenueGenerated = config?.totalRevenueGenerated || 0;

    results.push({
      id: config?.id || `unconnected_${group.id}`,
      toleeId: group.id,
      toleeName: group.name,
      toleeSlug: group.slug,
      toleeAvatar: group.avatar,
      memberCount: group._count.members || 0,
      creditEnabled: config ? config.creditEnabled : false,
      revenueShareEnabled: config ? config.revenueShareEnabled : false,
      revenueSharePercent: config?.customRevenueSharePercent ?? DEFAULT_CREDIT_CONFIG.defaultRevenueSharePercent,
      totalRevenueGenerated,
      totalAdminShareEarned: totalAdminShare,
      pendingShare,
      availableShare,
      isOwner: true,
      connectedAt: config ? config.createdAt.toISOString() : group.createdAt.toISOString(),
    });
  }

  return results;
}
