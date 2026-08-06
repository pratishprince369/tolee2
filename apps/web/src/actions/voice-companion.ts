'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function getVoiceNotificationBriefing() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { success: false, briefing: 'Please log in to hear your Tolee notifications.' };
    }

    const userId = (session.user as any).id;
    const userName = session.user.name?.split(' ')[0] || 'there';

    // Fetch unread notifications
    const unreadNotifs = await prisma.notification.findMany({
      where: { userId, read: false },
      take: 3,
      orderBy: { createdAt: 'desc' }
    });

    // Fetch pending CRM leads
    const pendingLeads = await prisma.cRMLead.count({
      where: { userId, status: 'NEW' }
    });

    // Fetch pending tasks
    const pendingTasks = await prisma.aITask.count({
      where: { userId, completed: false }
    });

    if (unreadNotifs.length === 0 && pendingLeads === 0 && pendingTasks === 0) {
      return {
        success: true,
        briefing: `Good day ${userName}! You are all caught up. You have no unread notifications, no pending leads, and no urgent tasks due right now.`
      };
    }

    let summaryParts = [`Hello ${userName}. Here is your quick Tolee briefing.`];

    if (unreadNotifs.length > 0) {
      summaryParts.push(`You have ${unreadNotifs.length} new notification${unreadNotifs.length > 1 ? 's' : ''}.`);
      unreadNotifs.forEach((n: any) => {
        summaryParts.push(`${n.title}. ${n.message}`);
      });
    }

    if (pendingLeads > 0) {
      summaryParts.push(`In your CRM, you have ${pendingLeads} new pending lead${pendingLeads > 1 ? 's' : ''} waiting for follow-up.`);
    }

    if (pendingTasks > 0) {
      summaryParts.push(`You also have ${pendingTasks} task${pendingTasks > 1 ? 's' : ''} scheduled for today.`);
    }

    summaryParts.push('Would you like me to open the detailed dashboard for you?');

    return {
      success: true,
      briefing: summaryParts.join(' ')
    };
  } catch (error: any) {
    console.error('Voice Notification Briefing Error:', error);
    return {
      success: false,
      briefing: 'Sorry, I encountered an issue retrieving your voice briefing.'
    };
  }
}
