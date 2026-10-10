"use server";

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getUserReferralDashboardData, getOrCreateUserReferralCode } from '@/lib/referralService';
import { prisma } from '@/lib/prisma';

export async function getReferralDashboardAction() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const data = await getUserReferralDashboardData(userId);
    return { success: true, data };
  } catch (error: any) {
    console.error('[getReferralDashboardAction] Error:', error);
    return { success: false, error: error.message || 'Failed to load referral dashboard' };
  }
}

export async function getMyReferralCodeAction() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const code = await getOrCreateUserReferralCode(userId);
    const link = `https://tolee.in/signup?ref=${code}`;
    return { success: true, code, link };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function validateReferralCodeAction(code: string) {
  try {
    if (!code) return { success: false, error: 'Code is required' };
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { referralCode: code.trim() },
          { username: { equals: code.trim(), mode: 'insensitive' } },
          { id: code.trim() }
        ]
      },
      select: { id: true, name: true, username: true }
    });

    if (!user) {
      return { success: false, error: 'Invalid referral code' };
    }

    return {
      success: true,
      referrer: {
        name: user.name,
        username: user.username
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
