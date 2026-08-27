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
  // Rule 1: Direct Group Placement Context
  // Rule 2: Secondary Global Ad Campaign — First-Origin / Referral Attribution (Pehle kisne onboard kiya)
  let group: any = null;
  let attributionRule: 'placement' | 'global_origin_referral' = 'placement';
  let advertiserInfo: { name?: string; username?: string } = {};

  const advertiserId = input.advertiserUserId || input.memberUserId;

  if (input.toleeId) {
    // Primary Rule: Direct Group Placement Context
    group = await prisma.tolee.findUnique({
      where: { id: input.toleeId },
      include: { creditConfig: true },
    });
    attributionRule = 'placement';
  } else if (advertiserId) {
    // Secondary Rule: Global Ad Campaign — First-Origin Group Resolution
    attributionRule = 'global_origin_referral';

    // Step 2A: Find the very first group the advertiser joined on Tolee
    const firstMembership = await prisma.toleeMember.findFirst({
      where: {
        userId: advertiserId,
        status: 'approved',
      },
      orderBy: {
        joinedAt: 'asc',
      },
      include: {
        tolee: {
          include: { creditConfig: true },
        },
        user: {
          select: { name: true, username: true },
        },
      },
    });

    if (firstMembership && firstMembership.tolee) {
      group = firstMembership.tolee;
      advertiserInfo = {
        name: firstMembership.user?.name || undefined,
        username: firstMembership.user?.username || undefined,
      };
    } else {
      // Step 2B: Fallback to Referral Origin (If advertiser was invited by a user who owns a group)
      const referralRecord = await prisma.referral.findFirst({
        where: { refereeId: advertiserId },
        include: {
          referrer: {
            include: {
              tolees: {
                include: { creditConfig: true },
                orderBy: { createdAt: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      if (referralRecord?.referrer?.tolees?.[0]) {
        group = referralRecord.referrer.tolees[0];
      }
    }
  }

  if (!group) {
    return {
      success: false,
      status: 'no_eligible_group',
      eventId: input.eventId,
      grossSpend: input.grossSpend,
      revenueSharePercent: 0,
      adminEarnedAmount: 0,
      reason: 'No eligible group or origin community found for ad attribution.',
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
    userId: advertiserId,
    beneficiaryUserId,
    groupId: group.id,
    campaignId: input.campaignId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    grossSpend: input.grossSpend,
  });

  const beneficiaryWallet = await getOrCreateWallet(beneficiaryUserId);

  // 5. Execute DB Transaction
  const transactionStatus = fraudResult.isFraudSuspicious ? 'under_review' : 'pending';

  const transactionDescription =
    attributionRule === 'global_origin_referral'
      ? `Global ad revenue share (${revenueSharePercent}%) from advertiser origin (${advertiserInfo.name || advertiserInfo.username || 'Member'}) • Group: ${group.name}`
      : `Eligible group ad revenue share (${revenueSharePercent}%) from ${group.name}`;

  const result = await prisma.$transaction(async (tx: any) => {
    // Record Event for Idempotency and Auditing
    await tx.creditAdAttributionEvent.create({
      data: {
        eventId: input.eventId,
        campaignId: input.campaignId,
        groupId: group.id,
        memberUserId: advertiserId || null,
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
      groupId: group.id,
      groupName: group.name,
      campaignId: input.campaignId,
      campaignName: input.campaignName || 'Sponsored Ad Campaign',
      revenueSharePercent,
      grossAdSpend: input.grossSpend,
      description: transactionDescription,
      metadata: {
        attributionRule,
        advertiserId,
        advertiserName: advertiserInfo.name,
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
          where: { toleeId: group.id },
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
      const notifMsg =
        attributionRule === 'global_origin_referral'
          ? `₹${calculatedShare.toFixed(2)} has been added to your Tolee Credit as global ad revenue share from your onboarded member (${advertiserInfo.name || 'Member'}) in ${group.name}.`
          : `₹${calculatedShare.toFixed(2)} has been added to your Tolee Credit as eligible group ad revenue from ${group.name}.`;

      await prisma.notification.create({
        data: {
          userId: beneficiaryUserId,
          type: 'credit_earned',
          message: notifMsg,
          link: '/tolee-credit',
        },
      });
    }
  } catch (notifErr) {
    console.error('[processAdRevenueAttribution] Notification dispatch failed:', notifErr);
  }

  // 7. Audit Log
  await logCreditAudit({
    actorId: advertiserId || 'system',
    actorRole: 'system',
    action: 'revenue_attributed',
    targetType: 'transaction',
    targetId: result.transactionId,
    amount: calculatedShare,
    details: {
      eventId: input.eventId,
      attributionRule,
      advertiserId,
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
    groupId: group.id,
    grossSpend: input.grossSpend,
    revenueSharePercent,
    adminEarnedAmount: calculatedShare,
    settlesAt: settlesAt.toISOString(),
    reason: fraudResult.reason,
  };
}
