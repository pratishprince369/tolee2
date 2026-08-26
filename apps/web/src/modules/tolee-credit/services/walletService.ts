import { prisma } from '@/lib/prisma';
import { CreditWalletDto } from '../types';
import { logCreditAudit } from './auditService';

export async function getWalletByUserId(userId: string): Promise<CreditWalletDto | null> {
  const wallet = await prisma.creditWallet.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
          image: true,
        },
      },
    },
  });

  if (!wallet) return null;

  return {
    id: wallet.id,
    userId: wallet.userId,
    currency: wallet.currency,
    availableBalance: wallet.availableBalance,
    pendingBalance: wallet.pendingBalance,
    totalEarned: wallet.totalEarned,
    totalWithdrawn: wallet.totalWithdrawn,
    status: wallet.status as any,
    createdAt: wallet.createdAt.toISOString(),
    updatedAt: wallet.updatedAt.toISOString(),
    userName: wallet.user?.name,
    userEmail: wallet.user?.email,
    userAvatar: wallet.user?.avatar || wallet.user?.image || undefined,
  };
}

export async function getOrCreateWallet(userId: string): Promise<CreditWalletDto> {
  let existing = await getWalletByUserId(userId);
  if (existing) return existing;

  const created = await prisma.creditWallet.create({
    data: {
      userId,
      currency: 'INR',
      availableBalance: 0.0,
      pendingBalance: 0.0,
      totalEarned: 0.0,
      totalWithdrawn: 0.0,
      status: 'active',
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
          image: true,
        },
      },
    },
  });

  await logCreditAudit({
    actorId: userId,
    action: 'wallet_created',
    targetType: 'wallet',
    targetId: created.id,
    details: { currency: 'INR' },
  });

  return {
    id: created.id,
    userId: created.userId,
    currency: created.currency,
    availableBalance: created.availableBalance,
    pendingBalance: created.pendingBalance,
    totalEarned: created.totalEarned,
    totalWithdrawn: created.totalWithdrawn,
    status: created.status as any,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
    userName: created.user?.name,
    userEmail: created.user?.email,
    userAvatar: created.user?.avatar || created.user?.image || undefined,
  };
}

export async function updateWalletBalances(
  prismaClient: any,
  walletId: string,
  deltas: {
    availableDelta?: number;
    pendingDelta?: number;
    earnedDelta?: number;
    withdrawnDelta?: number;
  }
) {
  const data: any = {};
  if (deltas.availableDelta !== undefined && deltas.availableDelta !== 0) {
    data.availableBalance = { increment: deltas.availableDelta };
  }
  if (deltas.pendingDelta !== undefined && deltas.pendingDelta !== 0) {
    data.pendingBalance = { increment: deltas.pendingDelta };
  }
  if (deltas.earnedDelta !== undefined && deltas.earnedDelta !== 0) {
    data.totalEarned = { increment: deltas.earnedDelta };
  }
  if (deltas.withdrawnDelta !== undefined && deltas.withdrawnDelta !== 0) {
    data.totalWithdrawn = { increment: deltas.withdrawnDelta };
  }

  return await prismaClient.creditWallet.update({
    where: { id: walletId },
    data,
  });
}
