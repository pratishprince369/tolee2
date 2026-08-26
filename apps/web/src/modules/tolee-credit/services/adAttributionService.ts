import { prisma } from '@/lib/prisma';
import { AdAttributionInput, AttributionResult } from '../types';
import { DEFAULT_CREDIT_CONFIG } from '../config/defaultConfig';
import { evaluateAdEventFraud } from './fraudService';
import { createCreditTransaction } from './ledgerService';
import { updateWalletBalances, getOrCreateWallet } from './walletService';
import { logCreditAudit } from './auditService';

export async function processAdRevenueAttribution(input: AdAttributionInput): Promise<AttributionResult> {
  // 1. Strict Idempotency Check
  const existingEvent = await prisma.creditAdAttributionEvent.findUnique({
    where: { eventId: input.eventId },
  });

  if (existingEvent) {
    return {
      success: true,
      status: 'ignored_duplicate',
      eventId: input.eventId,
      grossSpend: input.grossSpend,
      revenueSharePercent: existingEvent.revenueSharePercent,
      adminEarnedAmount: existingEvent.calculatedShare,
      reason: 'Event ID already processed. Duplicate skipped to prevent double-crediting.',
    };
  }

  // 2. Identify Connected Group & Beneficiary
  if (!input.toleeId) {
    return {
      success: false,
      status: 'no_eligible_group',
      eventId: input.eventId,
      grossSpend: input.grossSpend,
      revenueSharePercent: 0,
      adminEarnedAmount: 0,
      reason: 'No Tolee group specified for attribution.',
    };
  }

  const group = await prisma.tolee.findUnique({
    where: { id: input.toleeId },
    include: { creditConfig: true },
  });

  if (!group) {
    return {
      success: false,
      status: 'no_eligible_group',
      eventId: input.eventId,
      grossSpend: input.grossSpend,
      revenueSharePercent: 0,
      adminEarnedAmount: 0,
      reason: 'Specified Tolee group does not exist.',
    };
  }

  const beneficiaryUserId = group.ownerId;
  const config = group.creditConfig;

  // 3. Revenue Share % Configuration (Dynamic or Global Default)
  let revenueSharePercent = DEFAULT_CREDIT_CONFIG.defaultRevenueSharePercent;
  if (config && config.customRevenueSharePercent !== null && config.customRevenueSharePercent !== undefined) {
    revenueSharePercent = config.customRevenueSharePercent;
  } else {
    // Check system-wide dynamic config if exists in DB
    const systemConfig = await prisma.creditSystemConfig.findUnique({
      where: { id: 'global_credit_config' },
    });
    if (systemConfig) {
      revenueSharePercent = systemConfig.defaultRevenueSharePercent;
    }
  }

  const calculatedShare = Number(((input.grossSpend * revenueSharePercent) / 100).toFixed(2));
  const settlementDays = DEFAULT_CREDIT_CONFIG.settlementPeriodDays;
  const settlesAt = new Date(Date.now() + settlementDays * 24 * 60 * 60 * 1000);

  // 4. Fraud & Abuse Protection Evaluation
  const fraudResult = await evaluateAdEventFraud({
    userId: input.memberUserId,
    beneficiaryUserId,
    groupId: input.toleeId,
    campaignId: input.campaignId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    grossSpend: input.grossSpend,
  });

  const beneficiaryWallet = await getOrCreateWallet(beneficiaryUserId);

  // 5. Execute DB Transaction
  const transactionStatus = fraudResult.isFraudSuspicious ? 'under_review' : 'pending';

  const result = await prisma.$transaction(async (tx: any) => {
    // Record Event for Idempotency and Auditing
    await tx.creditAdAttributionEvent.create({
      data: {
        eventId: input.eventId,
        campaignId: input.campaignId,
        groupId: input.toleeId,
        memberUserId: input.memberUserId || null,
        adEventType: input.adEventType,
        grossSpend: input.grossSpend,
        revenueSharePercent,
        calculatedShare,
        beneficiaryUserId,
        status: fraudResult.isFraudSuspicious ? 'flagged_fraud' : 'processed',
        fraudRiskScore: fraudResult.riskScore,
        fraudReason: fraudResult.reason || null,
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });

    // Create Immutable Ledger Record
    const ledgerTxn = await createCreditTransaction(tx, {
      walletId: beneficiaryWallet.id,
      userId: beneficiaryUserId,
      type: 'ad_revenue',
      amount: calculatedShare,
      currency: 'INR',
      status: transactionStatus,
      sourceType: 'ad_campaign',
      sourceId: input.campaignId,
      groupId: input.toleeId,
      groupName: group.name,
      campaignId: input.campaignId,
      campaignName: input.campaignName || 'Sponsored Ad Campaign',
      revenueSharePercent,
      grossAdSpend: input.grossSpend,
      description: `Eligible group ad revenue share (${revenueSharePercent}%) from ${group.name}`,
      metadata: {
        adEventType: input.adEventType,
        fraudRiskScore: fraudResult.riskScore,
        fraudReason: fraudResult.reason,
      },
      settlesAt,
      eventId: input.eventId,
    });

    // If NOT suspicious fraud, credit pending balance immediately
    if (!fraudResult.isFraudSuspicious) {
      await updateWalletBalances(tx, beneficiaryWallet.id, {
        pendingDelta: calculatedShare,
        earnedDelta: calculatedShare,
      });

      // Update Group Credit Config Stats if connected
      if (config) {
        await tx.groupCreditConfig.update({
          where: { toleeId: input.toleeId },
          data: {
            totalRevenueGenerated: { increment: input.grossSpend },
            totalAdminShareEarned: { increment: calculatedShare },
          },
        });
      }
    }

    return ledgerTxn;
  });

  // 6. Notify Group Admin
  try {
    if (!fraudResult.isFraudSuspicious) {
      await prisma.notification.create({
        data: {
          userId: beneficiaryUserId,
          type: 'credit_earned',
          message: `₹${calculatedShare.toFixed(2)} has been added to your Tolee Credit as eligible group ad revenue from ${group.name}.`,
          link: '/tolee-credit',
        },
      });
    }
  } catch (notifErr) {
    console.error('[processAdRevenueAttribution] Notification dispatch failed:', notifErr);
  }

  // 7. Audit Log
  await logCreditAudit({
    actorId: input.memberUserId || 'system',
    actorRole: 'system',
    action: 'revenue_attributed',
    targetType: 'transaction',
    targetId: result.transactionId,
    amount: calculatedShare,
    details: {
      eventId: input.eventId,
      grossSpend: input.grossSpend,
      revenueSharePercent,
      isFraudSuspicious: fraudResult.isFraudSuspicious,
    },
    ipAddress: input.ipAddress,
  });

  return {
    success: true,
    status: fraudResult.isFraudSuspicious ? 'flagged_fraud' : 'credited_pending',
    eventId: input.eventId,
    transactionId: result.transactionId,
    beneficiaryUserId,
    groupId: input.toleeId,
    grossSpend: input.grossSpend,
    revenueSharePercent,
    adminEarnedAmount: calculatedShare,
    settlesAt: settlesAt.toISOString(),
    reason: fraudResult.reason,
  };
}
