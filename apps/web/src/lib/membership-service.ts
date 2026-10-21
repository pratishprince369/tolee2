import { prisma } from '@/lib/prisma';
import { getOrCreateUserReferralCode } from '@/lib/referralService';
import { createSystemNotification } from '@/lib/notification-service';

export const BOOST_MEMBERSHIP_PLAN = {
  name: 'Tolee Unlimited Boost Membership',
  price: 500, // INR
  durationDays: 180, // 6 months
  referralRewardDays: 30, // 1 month per paid referral
  currency: 'INR',
};

/**
 * Checks if a user has an active, valid boost membership.
 */
export async function getActiveBoostMembership(userId: string) {
  if (!userId) return null;

  const membership = await prisma.boostMembership.findUnique({
    where: { userId },
  });

  if (!membership) return null;

  const now = new Date();
  if (membership.status === 'ACTIVE' && membership.expiresAt > now) {
    return membership;
  }

  // If expired but still marked ACTIVE, update to EXPIRED
  if (membership.status === 'ACTIVE' && membership.expiresAt <= now) {
    try {
      await prisma.boostMembership.update({
        where: { id: membership.id },
        data: { status: 'EXPIRED' },
      });
    } catch {
      // ignore concurrent update errors
    }
  }

  return null;
}

/**
 * Creates an order to purchase or renew the ₹500 Boost Membership.
 */
export async function createMembershipOrder(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const orderId = `BM_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const payment = await prisma.membershipPayment.create({
    data: {
      orderId,
      userId,
      amount: BOOST_MEMBERSHIP_PLAN.price,
      currency: BOOST_MEMBERSHIP_PLAN.currency,
      durationDays: BOOST_MEMBERSHIP_PLAN.durationDays,
      status: 'PENDING',
    },
  });

  return {
    orderId: payment.orderId,
    amount: payment.amount,
    currency: payment.currency,
    planName: BOOST_MEMBERSHIP_PLAN.name,
    durationDays: payment.durationDays,
    user: {
      id: user.id,
      name: user.name || 'Member',
      email: user.email,
      phone: user.phone,
    },
  };
}

/**
 * Idempotently verifies and activates a membership after successful payment.
 * Automatically attributes +30 days to the referrer if this user was referred by someone.
 */
export async function verifyAndActivateMembership(params: {
  orderId: string;
  paymentId?: string;
  paymentMethod?: string;
  gatewayResponse?: any;
  actorId?: string;
}) {
  const { orderId, paymentId, paymentMethod = 'gateway', gatewayResponse, actorId } = params;

  const payment = await prisma.membershipPayment.findUnique({
    where: { orderId },
    include: {
      user: true,
      membership: true,
    },
  });

  if (!payment) {
    throw new Error(`Order ${orderId} not found`);
  }

  // Idempotency check: if already SUCCESS, return early
  if (payment.status === 'SUCCESS') {
    const existingMembership = await prisma.boostMembership.findUnique({
      where: { userId: payment.userId },
    });
    return {
      success: true,
      alreadyActivated: true,
      membership: existingMembership,
    };
  }

  const resolvedPaymentId = paymentId || `PAY_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  return await prisma.$transaction(async (tx) => {
    const now = new Date();
    const durationMs = BOOST_MEMBERSHIP_PLAN.durationDays * 24 * 60 * 60 * 1000;

    // Check existing membership for the user
    const existingMembership = await tx.boostMembership.findUnique({
      where: { userId: payment.userId },
    });

    let newExpiresAt: Date;
    let prevExpiresAt: Date | null = null;
    let membershipId: string;

    if (existingMembership) {
      prevExpiresAt = existingMembership.expiresAt;
      // If currently active and unexpired, extend from current expiry; otherwise extend from now
      if (existingMembership.status === 'ACTIVE' && existingMembership.expiresAt > now) {
        newExpiresAt = new Date(existingMembership.expiresAt.getTime() + durationMs);
      } else {
        newExpiresAt = new Date(now.getTime() + durationMs);
      }

      const updated = await tx.boostMembership.update({
        where: { id: existingMembership.id },
        data: {
          status: 'ACTIVE',
          expiresAt: newExpiresAt,
          pricePaid: BOOST_MEMBERSHIP_PLAN.price,
          updatedAt: now,
        },
      });
      membershipId = updated.id;
    } else {
      newExpiresAt = new Date(now.getTime() + durationMs);
      const created = await tx.boostMembership.create({
        data: {
          userId: payment.userId,
          status: 'ACTIVE',
          startDate: now,
          expiresAt: newExpiresAt,
          planName: BOOST_MEMBERSHIP_PLAN.name,
          pricePaid: BOOST_MEMBERSHIP_PLAN.price,
        },
      });
      membershipId = created.id;
    }

    // Update payment record to SUCCESS
    await tx.membershipPayment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESS',
        paymentId: resolvedPaymentId,
        paymentMethod,
        membershipId,
        appliedAt: now,
        metadata: gatewayResponse ? (gatewayResponse as any) : undefined,
      },
    });

    // Create Audit Log
    await tx.membershipAuditLog.create({
      data: {
        membershipId,
        userId: payment.userId,
        actorId: actorId || payment.userId,
        action: existingMembership ? 'EXTENDED_PURCHASE' : 'CREATED',
        previousExpiry: prevExpiresAt,
        newExpiry: newExpiresAt,
        details: `Purchased 6-Month Unlimited Boost Membership (₹500). Order: ${orderId}`,
      },
    });

    // REFERRAL REWARD LOGIC:
    // Check if paying user (referee) was referred by another user
    const referralRecord = await tx.referral.findUnique({
      where: { refereeId: payment.userId },
    });

    if (
      referralRecord &&
      referralRecord.referrerId &&
      referralRecord.referrerId !== payment.userId
    ) {
      const referrerId = referralRecord.referrerId;

      // Check if reward already recorded for this payment (unique constraint safeguard)
      const existingReward = await tx.membershipReferralReward.findUnique({
        where: { paymentId: payment.id },
      });

      if (!existingReward) {
        // Record the referral reward
        await tx.membershipReferralReward.create({
          data: {
            paymentId: payment.id,
            referrerId,
            refereeId: payment.userId,
            bonusDays: BOOST_MEMBERSHIP_PLAN.referralRewardDays,
            status: 'APPLIED',
          },
        });

        // Award +30 days to referrer
        const rewardMs = BOOST_MEMBERSHIP_PLAN.referralRewardDays * 24 * 60 * 60 * 1000;
        const referrerMembership = await tx.boostMembership.findUnique({
          where: { userId: referrerId },
        });

        let referrerNewExpiry: Date;
        let referrerPrevExpiry: Date | null = null;
        let referrerMembershipId: string;

        if (referrerMembership) {
          referrerPrevExpiry = referrerMembership.expiresAt;
          if (referrerMembership.status === 'ACTIVE' && referrerMembership.expiresAt > now) {
            referrerNewExpiry = new Date(referrerMembership.expiresAt.getTime() + rewardMs);
          } else {
            referrerNewExpiry = new Date(now.getTime() + rewardMs);
          }

          const refUpdated = await tx.boostMembership.update({
            where: { id: referrerMembership.id },
            data: {
              status: 'ACTIVE',
              expiresAt: referrerNewExpiry,
              totalMonthsEarned: { increment: 1 },
              updatedAt: now,
            },
          });
          referrerMembershipId = refUpdated.id;
        } else {
          referrerNewExpiry = new Date(now.getTime() + rewardMs);
          const refCreated = await tx.boostMembership.create({
            data: {
              userId: referrerId,
              status: 'ACTIVE',
              startDate: now,
              expiresAt: referrerNewExpiry,
              planName: BOOST_MEMBERSHIP_PLAN.name,
              pricePaid: 0,
              totalMonthsEarned: 1,
            },
          });
          referrerMembershipId = refCreated.id;
        }

        // Referrer Audit Log
        await tx.membershipAuditLog.create({
          data: {
            membershipId: referrerMembershipId,
            userId: referrerId,
            actorId: 'SYSTEM_REFERRAL',
            action: 'EXTENDED_REFERRAL',
            previousExpiry: referrerPrevExpiry,
            newExpiry: referrerNewExpiry,
            details: `Earned +1 Month free Boost Membership for referee ${payment.userId} paid activation.`,
          },
        });

        // Notify Referrer
        try {
          await createSystemNotification({
            userId: referrerId,
            title: '🎉 1 Month Boost Membership Earned!',
            message: `A friend you referred just activated Tolee Unlimited Boost Membership. We added +1 month (30 days) of free boost membership to your account!`,
            type: 'MEMBERSHIP_REWARD',
            link: '/boost-membership',
          });
        } catch {
          // non-blocking notification failure
        }
      }
    }

    const finalMembership = await tx.boostMembership.findUnique({
      where: { id: membershipId },
    });

    return {
      success: true,
      alreadyActivated: false,
      membership: finalMembership,
    };
  });
}

/**
 * Returns complete dashboard data for user's Boost Membership & Referrals.
 */
export async function getMembershipDashboardData(userId: string) {
  const referralCode = await getOrCreateUserReferralCode(userId);

  const membership = await prisma.boostMembership.findUnique({
    where: { userId },
    include: {
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  });

  const now = new Date();
  const isActive = membership ? membership.status === 'ACTIVE' && membership.expiresAt > now : false;
  const daysRemaining = (isActive && membership)
    ? Math.max(0, Math.ceil((membership.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Fetch referrals made by this user
  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: {
          id: true,
          name: true,
          username: true,
          avatar: true,
          createdAt: true,
          boostMembership: {
            select: {
              status: true,
              expiresAt: true,
              createdAt: true,
            },
          },
          membershipPayments: {
            where: { status: 'SUCCESS' },
            select: { id: true, amount: true, appliedAt: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const referralRewards = await prisma.membershipReferralReward.findMany({
    where: { referrerId: userId },
    include: {
      referee: {
        select: { id: true, name: true, username: true },
      },
      payment: {
        select: { id: true, orderId: true, amount: true, appliedAt: true },
      },
    },
    orderBy: { rewardedAt: 'desc' },
  });

  const totalReferrals = referrals.length;
  const paidReferralsCount = referralRewards.filter((r) => r.status === 'APPLIED').length;
  const totalMonthsEarned = paidReferralsCount; // Each is +1 month

  // Format referral items for frontend display
  const referralList = referrals.map((r) => {
    const hasPaid = r.referee.membershipPayments.length > 0;
    const hasActiveMembership =
      r.referee.boostMembership &&
      r.referee.boostMembership.status === 'ACTIVE' &&
      r.referee.boostMembership.expiresAt > now;

    return {
      id: r.id,
      refereeId: r.referee.id,
      name: r.referee.name || r.referee.username || 'Tolee User',
      username: r.referee.username,
      avatar: r.referee.avatar,
      joinedAt: r.createdAt,
      hasPaidMembership: hasPaid,
      rewardGranted: hasPaid,
      status: hasPaid ? 'PAID (+1 Month Earned)' : 'REGISTERED (Free Usage)',
    };
  });

  return {
    membership: membership
      ? {
          id: membership.id,
          status: membership.status,
          isActive,
          startDate: membership.startDate,
          expiresAt: membership.expiresAt,
          daysRemaining,
          planName: membership.planName,
          pricePaid: membership.pricePaid,
          totalMonthsEarned: membership.totalMonthsEarned,
        }
      : null,
    plan: BOOST_MEMBERSHIP_PLAN,
    referral: {
      code: referralCode,
      totalReferrals,
      paidReferralsCount,
      totalMonthsEarned,
      referralList,
    },
    payments: (membership?.payments || []).map((p) => ({
      id: p.id,
      orderId: p.orderId,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      appliedAt: p.appliedAt,
    })),
  };
}

/**
 * Super Admin metrics and membership management
 */
export async function getAdminMembershipOverview() {
  const now = new Date();

  const [
    totalMemberships,
    activeMemberships,
    totalPayments,
    totalRewards,
    recentMemberships,
  ] = await Promise.all([
    prisma.boostMembership.count(),
    prisma.boostMembership.count({
      where: {
        status: 'ACTIVE',
        expiresAt: { gt: now },
      },
    }),
    prisma.membershipPayment.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.membershipReferralReward.count({
      where: { status: 'APPLIED' },
    }),
    prisma.boostMembership.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phone: true,
          },
        },
        payments: {
          where: { status: 'SUCCESS' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    }),
  ]);

  return {
    stats: {
      totalMemberships,
      activeMemberships,
      totalRevenue: totalPayments._sum.amount || 0,
      totalPaidOrders: totalPayments._count,
      totalReferralMonthsAwarded: totalRewards,
    },
    memberships: recentMemberships.map((m) => ({
      id: m.id,
      userId: m.userId,
      user: m.user,
      status: m.status,
      isActive: m.status === 'ACTIVE' && m.expiresAt > now,
      startDate: m.startDate,
      expiresAt: m.expiresAt,
      totalMonthsEarned: m.totalMonthsEarned,
      lastPayment: m.payments[0] || null,
      updatedAt: m.updatedAt,
    })),
  };
}

/**
 * Admin action to adjust days on a membership (e.g. extension or fraud resolution)
 */
export async function adminAdjustMembership(params: {
  membershipId: string;
  daysDelta: number;
  reason: string;
  adminId: string;
}) {
  const { membershipId, daysDelta, reason, adminId } = params;

  const membership = await prisma.boostMembership.findUnique({
    where: { id: membershipId },
  });

  if (!membership) {
    throw new Error('Membership not found');
  }

  const prevExpiry = membership.expiresAt;
  const newExpiry = new Date(prevExpiry.getTime() + daysDelta * 24 * 60 * 60 * 1000);
  const now = new Date();
  const status = newExpiry > now ? 'ACTIVE' : 'EXPIRED';

  const updated = await prisma.boostMembership.update({
    where: { id: membershipId },
    data: {
      expiresAt: newExpiry,
      status,
    },
  });

  await prisma.membershipAuditLog.create({
    data: {
      membershipId,
      userId: membership.userId,
      actorId: adminId,
      action: 'ADMIN_ADJUST',
      previousExpiry: prevExpiry,
      newExpiry,
      details: `Admin adjustment (${daysDelta > 0 ? `+${daysDelta}` : daysDelta} days): ${reason}`,
    },
  });

  return updated;
}
