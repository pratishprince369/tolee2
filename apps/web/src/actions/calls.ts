'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getCallLogs() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    const userId = (session.user as any).id;

    const logs = await prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        caller: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            avatar: true,
            username: true
          }
        }
      },
      take: 50
    });

    return { success: true, logs };
  } catch (err: any) {
    console.error('[getCallLogs] Error:', err);
    return { success: false, error: err.message };
  }
}

export async function deleteCallLog(callId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    await prisma.call.delete({
      where: { id: callId }
    });

    return { success: true };
  } catch (err: any) {
    console.error('[deleteCallLog] Error:', err);
    return { success: false, error: err.message };
  }
}
