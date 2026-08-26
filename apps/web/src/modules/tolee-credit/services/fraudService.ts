import { prisma } from '@/lib/prisma';

export interface FraudEvaluationInput {
  userId?: string;
  beneficiaryUserId: string;
  groupId?: string;
  campaignId: string;
  ipAddress?: string;
  userAgent?: string;
  grossSpend: number;
}

export interface FraudEvaluationResult {
  isFraudSuspicious: boolean;
  riskScore: number; // 0 - 100
  reason?: string;
}

export async function evaluateAdEventFraud(input: FraudEvaluationInput): Promise<FraudEvaluationResult> {
  let riskScore = 0;
  const reasons: string[] = [];

  // Rule 1: Self-attribution check (if user interacting with ad is the same as group owner)
  if (input.userId && input.userId === input.beneficiaryUserId) {
    riskScore += 45;
    reasons.push('Self-interaction detected: Group owner interacting with their own campaign');
  }

  // Rule 2: Rapid repeat events from same IP within last 5 minutes
  if (input.ipAddress) {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentIpEvents = await prisma.creditAdAttributionEvent.count({
      where: {
        ipAddress: input.ipAddress,
        createdAt: { gte: fiveMinutesAgo },
      },
    });

    if (recentIpEvents > 20) {
      riskScore += 50;
      reasons.push(`High frequency traffic: ${recentIpEvents} ad events in 5 minutes from same IP`);
    } else if (recentIpEvents > 8) {
      riskScore += 25;
      reasons.push(`Moderate frequency traffic: ${recentIpEvents} ad events in 5 minutes from same IP`);
    }
  }

  // Rule 3: Abnormal spend spike check in single event
  if (input.grossSpend > 10000) {
    riskScore += 30;
    reasons.push(`Unusually large single attribution spend: ₹${input.grossSpend}`);
  }

  const isFraudSuspicious = riskScore >= 50;

  return {
    isFraudSuspicious,
    riskScore,
    reason: reasons.length > 0 ? reasons.join('; ') : undefined,
  };
}
