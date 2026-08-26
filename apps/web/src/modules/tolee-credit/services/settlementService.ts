import { prisma } from '@/lib/prisma';
import { updateWalletBalances } from './walletService';
import { logCreditAudit } from './auditService';

export interface SettlementSummary {
  settledCount: number;
  totalSettledAmount: number;
}

export async function processDueSettlements(): Promise<SettlementSummary> {
  const now = new Date();

  const dueTransactions = await prisma.creditTransaction.findMany({
    where: {
      status: 'pending',
      settlesAt: { lte: now },
    },
    take: 100, // Batch limit
  });

  let settledCount = 0;
  let totalSettledAmount = 0;

  for (const txn of dueTransactions) {
    try {
      await prisma.$transaction(async (tx: any) => {
        await tx.creditTransaction.update({
          where: { id: txn.id },
          data: {
            status: 'available',
            settledAt: now,
          },
        });

        await updateWalletBalances(tx, txn.walletId, {
          pendingDelta: -txn.amount,
          availableDelta: txn.amount,
        });
      });

      settledCount++;
      totalSettledAmount += txn.amount;

      // Notification
      try {
        await prisma.notification.create({
          data: {
            userId: txn.userId,
            type: 'credit_available',
            message: `Your ₹${txn.amount.toFixed(2)} group revenue from ${txn.groupName || 'Tolee Group'} is now available for withdrawal.`,
            link: '/tolee-credit',
          },
        });
      } catch (notifErr) {
        console.error('[processDueSettlements] Notification failed:', notifErr);
      }

      await logCreditAudit({
        actorId: 'system',
        actorRole: 'system',
        action: 'settlement_processed',
        targetType: 'transaction',
        targetId: txn.id,
        amount: txn.amount,
        details: { walletId: txn.walletId, transactionId: txn.transactionId },
      });
    } catch (err) {
      console.error(`[processDueSettlements] Failed to settle transaction ${txn.id}:`, err);
    }
  }

  return { settledCount, totalSettledAmount };
}
