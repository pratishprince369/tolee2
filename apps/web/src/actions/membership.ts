'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  getActiveBoostMembership,
  createMembershipOrder,
  verifyAndActivateMembership,
  getMembershipDashboardData,
  getAdminMembershipOverview,
  adminAdjustMembership,
} from '@/lib/membership-service';
import { prisma } from '@/lib/prisma';

async function getUserId() {
  const session = await getServerSession(authOptions);
  return (session?.user as any)?.id || null;
}

export async function getMembershipDashboardAction() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const data = await getMembershipDashboardData(userId);
    return { success: true, data };
  } catch (error: any) {
    console.error('getMembershipDashboardAction error:', error);
    return { success: false, error: error.message || 'Failed to load membership details' };
  }
}

export async function createMembershipOrderAction() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const order = await createMembershipOrder(userId);
    return { success: true, order };
  } catch (error: any) {
    console.error('createMembershipOrderAction error:', error);
    return { success: false, error: error.message || 'Failed to create order' };
  }
}

export async function verifyAndActivateMembershipAction(params: {
  orderId: string;
  paymentId?: string;
  paymentMethod?: string;
  gatewayResponse?: any;
}) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return { success: false, error: 'Unauthorized. Please log in.' };
    }

    const result = await verifyAndActivateMembership({
      ...params,
      actorId: userId,
    });

    revalidatePath('/boost-membership');
    revalidatePath('/super-admin/boost-membership');
    return { success: true, result };
  } catch (error: any) {
    console.error('verifyAndActivateMembershipAction error:', error);
    return { success: false, error: error.message || 'Payment verification failed' };
  }
}

export async function getAdminMembershipOverviewAction() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPERADMIN' && (session?.user as any)?.email !== 'admin@tolee.com') {
      // Check in DB if user is admin
      const userId = (session?.user as any)?.id;
      if (!userId) return { success: false, error: 'Unauthorized' };
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'SUPERADMIN') {
        return { success: false, error: 'Access denied: Admin privileges required.' };
      }
    }

    const overview = await getAdminMembershipOverview();
    return { success: true, overview };
  } catch (error: any) {
    console.error('getAdminMembershipOverviewAction error:', error);
    return { success: false, error: error.message || 'Failed to load admin overview' };
  }
}

export async function adminAdjustMembershipAction(params: {
  membershipId: string;
  daysDelta: number;
  reason: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return { success: false, error: 'Unauthorized' };

    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (dbUser?.role !== 'ADMIN' && dbUser?.role !== 'SUPERADMIN') {
      return { success: false, error: 'Access denied: Admin privileges required.' };
    }

    const updated = await adminAdjustMembership({
      ...params,
      adminId: userId,
    });

    revalidatePath('/super-admin/boost-membership');
    return { success: true, updated };
  } catch (error: any) {
    console.error('adminAdjustMembershipAction error:', error);
    return { success: false, error: error.message || 'Failed to adjust membership' };
  }
}
