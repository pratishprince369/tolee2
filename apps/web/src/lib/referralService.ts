import { prisma } from '@/lib/prisma';
import { createSystemNotification } from '@/lib/notification-service';

export const DEFAULT_REFERRAL_COMMISSION_RATE = 0.10; // 10%

/**
 * Generates a clean, unique alphanumeric referral code for a user.
 * e.g. "RAM_A8F2" or "PRINCE_9C4D"
 */
export async function generateUniqueReferralCode(user: { id: string; name?: string; username?: string }): Promise<string> {
  const baseRaw = (user.username || user.name || 'USER')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
  const base = baseRaw.length >= 3 ? baseRaw : 'TOLEE';

  // Try base directly first if available
  const existingBase = await prisma.user.findUnique({
    where: { referralCode: base }
  });
  if (!existingBase || existingBase.id === user.id) {
    return base;
  }

  // Append random hex suffix to guarantee uniqueness
  for (let attempts = 0; attempts < 10; attempts++) {
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const candidate = `${base}_${randomSuffix}`;
    const collision = await prisma.user.findUnique({
      where: { referralCode: candidate }
    });
    if (!collision || collision.id === user.id) {
      return candidate;
    }
  }

  // Fallback to user id slice
  return `TL_${user.id.slice(-8).toUpperCase()}`;
}

/**
 * Ensures a user has a unique referral code and returns it.
 */
export async function getOrCreateUserReferralCode(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true, referralCode: true }
  });

  if (!user) throw new Error('User not found');

  if (user.referralCode) {
    return user.referralCode;
  }

  const newCode = await generateUniqueReferralCode(user);
  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: newCode }
  });

  return newCode;
}

/**
 * Resolves a referral code to a referrer user.
 * Supports referralCode, username, or id for maximum backward compatibility.
 */
export async function resolveReferralCode(code: string | null | undefined) {
  if (!code) return null;
  const clean = code.trim();
  if (!clean) return null;

  return await prisma.user.findFirst({
    where: {
      OR: [
        { referralCode: clean },
        { username: { equals: clean, mode: 'insensitive' } },
        { id: clean }
      ]
    },
    select: {
      id: true,
      name: true,
      username: true,
      referralCode: true,
      email: true
    }
  });
}

/**
 * Attributes a newly registered user to their referrer.
 * Enforces:
 * 1. Self-referral prevention.
 * 2. Immutable attribution (never overwrites existing referrer).
 * 3. Database uniqueness on refereeId.
 */
export async function attributeReferralOnSignup(params: {
  refereeId: string;
  referralCode?: string | null;
  userAgent?: string;
  ipAddress?: string;
}) {
  const { refereeId, referralCode, userAgent = '', ipAddress = '' } = params;

  if (!referralCode || !refereeId) {
    return { success: false, reason: 'missing_params' };
  }

  // Rule 1: Prevent overwriting existing referral attribution
  const existing = await prisma.referral.findUnique({
    where: { refereeId }
  });
  if (existing) {
    return { success: false, reason: 'already_attributed', referrerId: existing.referrerId };
  }

  const referrer = await resolveReferralCode(referralCode);
  if (!referrer) {
    return { success: false, reason: 'referrer_not_found' };
  }

  // Rule 2: Prevent self-referral
  if (referrer.id === refereeId) {
    return { success: false, reason: 'self_referral_disallowed' };
  }

  let device = 'Desktop';
  if (/Mobi|Android|iPhone|iPad/i.test(userAgent)) device = 'Mobile';
  else if (/Tablet|iPad/i.test(userAgent)) device = 'Tablet';

  // Check franchise code backward compatibility
  let franchiseId: string | null = null;
  if (referralCode.startsWith('FRN')) {
    const franchise = await prisma.franchise.findUnique({
      where: { code: referralCode }
    });
    if (franchise) franchiseId = franchise.id;
  }

  const newReferral = await prisma.referral.create({
    data: {
      referrerId: referrer.id,
      refereeId,
      referralCode,
      attributedAt: new Date(),
      attributionStatus: 'attributed',
      rewardAmount: 0,
      status: 'completed',
      source: 'referral_link',
      device,
      franchiseId
    }
  });

  // Notify the referrer of the new attribution
  try {
    const referee = await prisma.user.findUnique({
      where: { id: refereeId },
      select: { name: true, username: true }
    });
    const displayName = referee?.name || referee?.username || 'A new user';

    await createSystemNotification({
      userId: referrer.id,
      type: 'referral_joined',
      title: '🎉 New Referral Joined',
      message: `🎉 ${displayName} joined Tolee using your referral link! You will earn 10% sharing on any eligible ad spend they run on Tolee.`,
      link: '/referrals'
    });
  } catch (notifErr) {
    console.error('[attributeReferralOnSignup] Notification notice:', notifErr);
  }

  return { success: true, referral: newReferral, referrerId: referrer.id };
}

/**
 * Authoritative Backend 10% Ad Revenue Sharing Commission Calculation.
 *
 * Formula: referral_earning = eligible_ad_spend * 0.10
 *
 * Requirements:
 * - Eligible spend means successfully paid & consumed ad spend.
 * - Idempotent: checks billingTransactionId to prevent duplicate commission generation.
 * - Decimal precision rounded to 2 decimal places.
 * - Stores immutable historical rate (10%).
 * - Credits the referrer's wallet and creates an auditable ledger entry.
 */
export async function processReferralAdSpendCommission(params: {
  advertiserUserId: string;
  eligibleSpendAmount: number;
  campaignId?: string | null;
  billingTransactionId?: string | null;
  customRate?: number;
}) {
  const { advertiserUserId, eligibleSpendAmount, campaignId, billingTransactionId, customRate } = params;

  // 1. Validation
  if (!advertiserUserId || eligibleSpendAmount <= 0) {
    return { success: false, reason: 'invalid_spend_amount', commissionAmount: 0 };
  }

  // 2. Strict Idempotency Check via billingTransactionId
  if (billingTransactionId) {
    const existingEntry = await prisma.referralCommission.findUnique({
      where: { billingTransactionId }
    });
    if (existingEntry) {
      return {
        success: true,
        status: 'ignored_duplicate',
        commissionId: existingEntry.id,
        commissionAmount: existingEntry.commissionAmount,
        reason: 'Transaction ID already processed. Duplicate skipped.'
      };
    }
  }

  // 3. Find original referrer recorded at signup
  const referral = await prisma.referral.findUnique({
    where: { refereeId: advertiserUserId },
    include: {
      referrer: {
        select: { id: true, name: true, username: true }
      }
    }
  });

  if (!referral || !referral.referrerId) {
    return { success: true, status: 'no_referrer', commissionAmount: 0 };
  }

  // Safeguard: Prevent self-referral commission
  if (referral.referrerId === advertiserUserId) {
    return { success: false, reason: 'self_referral_disallowed', commissionAmount: 0 };
  }

  const referrerId = referral.referrerId;
  const commissionRate = typeof customRate === 'number' && customRate >= 0 ? customRate : DEFAULT_REFERRAL_COMMISSION_RATE;
  // Decimal math rounded to 2 places
  const commissionAmount = Math.round(eligibleSpendAmount * commissionRate * 100) / 100;

  if (commissionAmount <= 0) {
    return { success: true, status: 'zero_commission', commissionAmount: 0 };
  }

  // 4. Atomic Transaction: Record Commission in Ledger & Credit Referrer Wallet
  const result = await prisma.$transaction(async (tx: any) => {
    // Generate fallback billing reference if none passed
    const txRef = billingTransactionId || `REF_COMM_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Create auditable ledger record
    const ledgerEntry = await tx.referralCommission.create({
      data: {
        referrerId,
        referredUserId: advertiserUserId,
        campaignId: campaignId || null,
        billingTransactionId: txRef,
        eligibleSpendAmount,
        commissionRate,
        commissionAmount,
        currency: 'INR',
        status: 'CONFIRMED',
        confirmedAt: new Date()
      }
    });

    // Credit referrer wallet
    let wallet = await tx.wallet.findUnique({ where: { userId: referrerId } });
    if (!wallet) {
      wallet = await tx.wallet.create({
        data: {
          userId: referrerId,
          balance: 2500.0,
          totalEarned: 2500.0,
          totalSpent: 0.0
        }
      });
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: {
        balance: { increment: commissionAmount },
        totalEarned: { increment: commissionAmount }
      }
    });

    // Add wallet transaction record
    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        amount: commissionAmount,
        type: 'referral',
        description: `10% Referral Revenue Sharing from eligible ad spend (₹${eligibleSpendAmount.toLocaleString('en-IN')})`,
        campaignId: campaignId || undefined
      }
    });

    return ledgerEntry;
  });

  // 5. Notify the referrer of the 10% earning
  try {
    const advertiser = await prisma.user.findUnique({
      where: { id: advertiserUserId },
      select: { name: true, username: true }
    });
    const advName = advertiser?.username ? `@${advertiser.username}` : (advertiser?.name || 'Your referral');

    await createSystemNotification({
      userId: referrerId,
      type: 'referral_earned',
      title: '💰 10% Referral Earning Received',
      message: `🎉 You earned ₹${commissionAmount.toLocaleString('en-IN')}! ${advName} spent ₹${eligibleSpendAmount.toLocaleString('en-IN')} on eligible Tolee ads (10% sharing).`,
      link: '/referrals'
    });
  } catch (err) {
    console.error('[processReferralAdSpendCommission] Notification error:', err);
  }

  return {
    success: true,
    status: 'commission_credited',
    commissionId: result.id,
    eligibleSpendAmount,
    commissionRate,
    commissionAmount,
    referrerId
  };
}

/**
 * Reverses a referral commission in case of ad campaign refunds or chargebacks.
 * Preserves the audit trail and updates the ledger.
 */
export async function reverseReferralAdSpendCommission(params: {
  commissionId?: string;
  billingTransactionId?: string;
  reason?: string;
}) {
  const { commissionId, billingTransactionId, reason = 'Ad spend refunded or cancelled' } = params;

  const commission = await prisma.referralCommission.findFirst({
    where: {
      OR: [
        ...(commissionId ? [{ id: commissionId }] : []),
        ...(billingTransactionId ? [{ billingTransactionId }] : [])
      ]
    }
  });

  if (!commission) {
    return { success: false, reason: 'commission_entry_not_found' };
  }

  if (commission.status === 'REVERSED') {
    return { success: true, status: 'already_reversed', commission };
  }

  const reversalReference = `REV_${commission.id}_${Date.now()}`;

  await prisma.$transaction(async (tx: any) => {
    // Update commission ledger
    await tx.referralCommission.update({
      where: { id: commission.id },
      data: {
        status: 'REVERSED',
        reversalReference,
        holdReason: reason
      }
    });

    // Adjust referrer wallet if balance allows
    const wallet = await tx.wallet.findUnique({ where: { userId: commission.referrerId } });
    if (wallet && wallet.balance >= commission.commissionAmount) {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: commission.commissionAmount }
        }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: -commission.commissionAmount,
          type: 'refund',
          description: `Referral commission reversed: ${reason} (Ref: ${reversalReference})`,
          campaignId: commission.campaignId || undefined
        }
      });
    }
  });

  return { success: true, status: 'reversed', reversalReference, commissionId: commission.id };
}

/**
 * Fetches real, comprehensive Referral Dashboard data for a user.
 */
export async function getUserReferralDashboardData(userId: string) {
  const referralCode = await getOrCreateUserReferralCode(userId);
  const referralLink = `https://tolee.in/signup?ref=${referralCode}`;

  // 1. Total referred users
  const totalReferredUsers = await prisma.referral.count({
    where: { referrerId: userId }
  });

  // 2. All commissions in ledger for this referrer
  const commissions = await prisma.referralCommission.findMany({
    where: { referrerId: userId },
    include: {
      referredUser: {
        select: { id: true, name: true, username: true, avatar: true }
      },
      campaign: {
        select: { id: true, name: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // 3. Compute distinct active referred advertisers
  const advertiserIds = new Set<string>();
  let totalEligibleSpend = 0;
  let pendingEarnings = 0;
  let confirmedEarnings = 0;
  let paidEarnings = 0;
  let reversedEarnings = 0;

  for (const c of commissions) {
    if (c.status !== 'REVERSED') {
      advertiserIds.add(c.referredUserId);
      totalEligibleSpend += c.eligibleSpendAmount;
    }

    if (c.status === 'PENDING') {
      pendingEarnings += c.commissionAmount;
    } else if (c.status === 'CONFIRMED') {
      confirmedEarnings += c.commissionAmount;
    } else if (c.status === 'PAID') {
      paidEarnings += c.commissionAmount;
    } else if (c.status === 'REVERSED') {
      reversedEarnings += c.commissionAmount;
    }
  }

  // 4. Referred users list
  const referredUsers = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          createdAt: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  return {
    referralCode,
    referralLink,
    metrics: {
      totalReferredUsers,
      activeReferredAdvertisers: advertiserIds.size,
      totalEligibleSpend: Math.round(totalEligibleSpend * 100) / 100,
      pendingEarnings: Math.round(pendingEarnings * 100) / 100,
      confirmedEarnings: Math.round(confirmedEarnings * 100) / 100,
      paidEarnings: Math.round(paidEarnings * 100) / 100,
      reversedEarnings: Math.round(reversedEarnings * 100) / 100,
      totalEarnings: Math.round((confirmedEarnings + paidEarnings) * 100) / 100
    },
    commissions: commissions.map((c: any) => ({
      id: c.id,
      advertiserName: c.referredUser.name || c.referredUser.username || 'Referred User',
      advertiserUsername: c.referredUser.username,
      campaignName: c.campaign?.name || 'Sponsored Boost',
      eligibleSpend: c.eligibleSpendAmount,
      commissionRate: c.commissionRate,
      commissionAmount: c.commissionAmount,
      currency: c.currency,
      status: c.status,
      createdAt: c.createdAt,
      confirmedAt: c.confirmedAt
    })),
    referredUsersList: referredUsers.map((r: any) => ({
      id: r.id,
      userId: r.referee.id,
      name: r.referee.name,
      username: r.referee.username,
      avatar: r.referee.avatar,
      joinedAt: r.createdAt
    }))
  };
}
