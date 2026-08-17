'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callNvidiaLLM, generateAIImageWithFallback } from '@/modules/ai-manager/Core/chat-engine';
import { SYSTEM_PROMPTS } from '@/modules/ai-manager/Core/prompt-manager';
import { parseNaturalLanguageReminder } from '@/modules/ai-manager/Core/reminder-parser';
import { getUserDeviceTimeInfo, isTimeOrDateQuery } from '@/modules/ai-manager/Core/time-service';
import { getUserMonthlyRewardStatus, triggerRewardNotifications } from '@/lib/reward-service';
import { createPost, deletePostPermanently } from '@/actions/post';
import { executeToleeAIAction } from '@/lib/tolee-action-engine';

async function getUserId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error('Unauthorized');
  }
  const email = session.user.email;
  if (!email) throw new Error('Unauthorized');
  
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true }
  });
  
  if (!user) throw new Error('User not found');
  return user.id;
}

// Compute Next Trigger Date for Recurring Reminders
function computeNextRecurrence(currentRemindAt: Date, recurrence: string | null): Date {
  const next = new Date(currentRemindAt.getTime());
  if (!recurrence) {
    next.setDate(next.getDate() + 1);
    return next;
  }

  const rec = recurrence.toLowerCase();
  if (rec.includes('daily') || rec.includes('day')) {
    next.setDate(next.getDate() + 1);
  } else if (rec.includes('weekly') || rec.includes('every_monday')) {
    next.setDate(next.getDate() + 7);
  } else if (rec.includes('monthly')) {
    next.setMonth(next.getMonth() + 1);
  } else if (rec.includes('yearly')) {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

// ------------------------------------
// 1. AI MEMORY ENGINE ACTIONS
// ------------------------------------

export async function saveAIMemory(data: {
  category: string;
  key: string;
  value: string;
  isSensitive?: boolean;
}) {
  try {
    const userId = await getUserId();
    const existing = await prisma.aIMemory.findFirst({
      where: { userId, key: data.key }
    });

    if (existing) {
      const updated = await prisma.aIMemory.update({
        where: { id: existing.id },
        data: {
          category: data.category,
          value: data.value,
          isSensitive: data.isSensitive ?? false
        }
      });
      return { success: true, memory: updated };
    }

    const memory = await prisma.aIMemory.create({
      data: {
        userId,
        category: data.category,
        key: data.key,
        value: data.value,
        isSensitive: data.isSensitive ?? false
      }
    });
    return { success: true, memory };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to save AI memory' };
  }
}

export async function getAIMemories(category?: string) {
  try {
    const userId = await getUserId();
    const memories = await prisma.aIMemory.findMany({
      where: {
        userId,
        ...(category ? { category } : {})
      },
      orderBy: { updatedAt: 'desc' }
    });
    return { success: true, memories };
  } catch (error: any) {
    return { success: false, memories: [] };
  }
}

export async function deleteAIMemory(id: string) {
  try {
    const userId = await getUserId();
    await prisma.aIMemory.deleteMany({
      where: { id, userId }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ------------------------------------
// 2. AI TASKS & REMINDERS ACTIONS (WITH LIFECYCLE & DEDUPLICATION)
// ------------------------------------

export async function createAITask(data: {
  title: string;
  description?: string;
  category?: string;
  dueDate?: string;
  isRecurring?: boolean;
  recurrence?: string;
}) {
  try {
    const userId = await getUserId();
    const task = await prisma.aITask.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        category: data.category || 'personal',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        isRecurring: data.isRecurring ?? false,
        recurrence: data.recurrence || null
      }
    });

    return { success: true, task };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create task' };
  }
}

// Smart Deduplicating Reminder Creator
export async function createOrUpdateAIReminder(data: {
  title: string;
  description?: string;
  remindAt: Date;
  timeZone?: string;
  isRecurring?: boolean;
  recurrence?: string;
}) {
  try {
    const userId = await getUserId();

    // Deduplication check: Look for existing active reminder with same title
    const existing = await prisma.aIReminder.findFirst({
      where: {
        userId,
        title: data.title,
        status: { in: ['PENDING', 'SNOOZED'] },
        isDismissed: false
      }
    });

    if (existing) {
      const updated = await prisma.aIReminder.update({
        where: { id: existing.id },
        data: {
          remindAt: data.remindAt,
          timeZone: data.timeZone || existing.timeZone,
          isRecurring: data.isRecurring ?? existing.isRecurring,
          recurrence: data.recurrence || existing.recurrence,
          status: 'PENDING',
          isDismissed: false
        }
      });
      return { success: true, reminder: updated, isUpdate: true };
    }

    const reminder = await prisma.aIReminder.create({
      data: {
        userId,
        title: data.title,
        description: data.description || null,
        type: 'alarm',
        remindAt: data.remindAt,
        timeZone: data.timeZone || 'Asia/Kolkata',
        status: 'PENDING',
        isRecurring: data.isRecurring ?? false,
        recurrence: data.recurrence || null,
        isDismissed: false
      }
    });
    return { success: true, reminder, isUpdate: false };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get Currently Due Active Reminders (Within last 2 minutes window to avoid ringing old missed alarms)
export async function getDueAIReminders() {
  try {
    const userId = await getUserId();
    const now = new Date();
    // Only fetch reminders due now where time offset is within last 2 minutes
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const dueReminders = await prisma.aIReminder.findMany({
      where: {
        userId,
        isDismissed: false,
        status: { in: ['PENDING', 'SNOOZED'] },
        remindAt: {
          gte: twoMinutesAgo,
          lte: now
        }
      },
      orderBy: { remindAt: 'asc' }
    });

    return { success: true, dueReminders };
  } catch (error: any) {
    return { success: false, dueReminders: [] };
  }
}

// Get Missed Reminders (Scheduled > 2 mins ago but never completed)
export async function getMissedAIReminders() {
  try {
    const userId = await getUserId();
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);

    const missed = await prisma.aIReminder.findMany({
      where: {
        userId,
        isDismissed: false,
        status: 'PENDING',
        remindAt: { lt: twoMinutesAgo }
      },
      orderBy: { remindAt: 'desc' },
      take: 5
    });

    // Mark status as MISSED in database silently
    if (missed.length > 0) {
      await prisma.aIReminder.updateMany({
        where: { id: { in: missed.map(m => m.id) } },
        data: { status: 'MISSED', isDismissed: true }
      });
    }

    return { success: true, missedReminders: missed };
  } catch (error: any) {
    return { success: false, missedReminders: [] };
  }
}

// Dismiss / Stop Alarm
export async function dismissAIReminder(reminderId: string) {
  try {
    const userId = await getUserId();
    const reminder = await prisma.aIReminder.findFirst({
      where: { id: reminderId, userId }
    });

    if (!reminder) return { success: false, error: 'Reminder not found' };

    // If Recurring: calculate next trigger date
    if (reminder.isRecurring) {
      const nextRemindAt = computeNextRecurrence(reminder.remindAt, reminder.recurrence);
      await prisma.aIReminder.update({
        where: { id: reminderId },
        data: {
          remindAt: nextRemindAt,
          status: 'PENDING',
          isDismissed: false,
          completedAt: new Date()
        }
      });
    } else {
      // One-Time: Mark as COMPLETED & Dismissed permanently
      await prisma.aIReminder.update({
        where: { id: reminderId },
        data: {
          status: 'COMPLETED',
          isDismissed: true,
          completedAt: new Date()
        }
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Turn OFF / Dismiss ALL Active Alarms & Reminders at once
export async function dismissAllAIReminders() {
  try {
    const userId = await getUserId();
    const updated = await prisma.aIReminder.updateMany({
      where: {
        userId,
        status: { in: ['PENDING', 'SNOOZED'] },
        isDismissed: false
      },
      data: {
        status: 'COMPLETED',
        isDismissed: true,
        completedAt: new Date()
      }
    });

    return { success: true, count: updated.count };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Snooze Alarm for 5 Minutes
export async function snoozeAIReminder(reminderId: string, snoozeMinutes: number = 5) {
  try {
    const userId = await getUserId();
    const newRemindAt = new Date(Date.now() + snoozeMinutes * 60 * 1000);

    await prisma.aIReminder.updateMany({
      where: { id: reminderId, userId },
      data: {
        remindAt: newRemindAt,
        status: 'SNOOZED',
        isDismissed: false,
        lastSnoozedAt: new Date()
      }
    });
    return { success: true, newRemindAt };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Get Full Reminder History with Filter Status
export async function getAIReminderHistory(filterStatus: string = 'all') {
  try {
    const userId = await getUserId();
    let whereClause: any = { userId };

    if (filterStatus === 'pending') {
      whereClause.status = 'PENDING';
      whereClause.isDismissed = false;
    } else if (filterStatus === 'completed') {
      whereClause.status = 'COMPLETED';
    } else if (filterStatus === 'recurring') {
      whereClause.isRecurring = true;
    } else if (filterStatus === 'missed') {
      whereClause.status = 'MISSED';
    } else if (filterStatus === 'archived') {
      whereClause.status = 'ARCHIVED';
    }

    const reminders = await prisma.aIReminder.findMany({
      where: whereClause,
      orderBy: { remindAt: 'desc' },
      take: 50
    });

    return { success: true, reminders };
  } catch (error: any) {
    return { success: false, reminders: [] };
  }
}

export async function deleteAIReminder(reminderId: string) {
  try {
    const userId = await getUserId();
    await prisma.aIReminder.deleteMany({
      where: { id: reminderId, userId }
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAITasks(status: string = 'pending') {
  try {
    const userId = await getUserId();
    const tasks = await prisma.aITask.findMany({
      where: {
        userId,
        ...(status !== 'all' ? { status } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, tasks };
  } catch (error: any) {
    return { success: false, tasks: [] };
  }
}

export async function updateAITaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed') {
  try {
    const userId = await getUserId();
    const task = await prisma.aITask.updateMany({
      where: { id: taskId, userId },
      data: { status }
    });
    return { success: true, task };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAIReminders() {
  try {
    const userId = await getUserId();
    const reminders = await prisma.aIReminder.findMany({
      where: {
        userId,
        isDismissed: false,
        status: { in: ['PENDING', 'SNOOZED'] }
      },
      orderBy: { remindAt: 'asc' },
      take: 10
    });
    return { success: true, reminders };
  } catch (error: any) {
    return { success: false, reminders: [] };
  }
}

// ------------------------------------
// 3. AI DASHBOARD & SUMMARY DATA
// ------------------------------------

export async function getAIDashboardSummary() {
  try {
    const userId = await getUserId();

    const [tasks, reminders, memories, userTolees] = await Promise.all([
      prisma.aITask.findMany({
        where: { userId, status: 'pending' },
        take: 5,
        orderBy: { dueDate: 'asc' }
      }),
      prisma.aIReminder.findMany({
        where: { userId, isDismissed: false, status: { in: ['PENDING', 'SNOOZED'] } },
        take: 5,
        orderBy: { remindAt: 'asc' }
      }),
      prisma.aIMemory.findMany({
        where: { userId },
        take: 10
      }),
      prisma.toleeMember.findMany({
        where: { userId, status: 'approved' },
        select: {
          tolee: {
            select: { id: true, name: true, slug: true, avatar: true }
          }
        },
        take: 5
      })
    ]);

    // Automatically deliver ₹3,999 Creator Offer Notification to user's Bell Icon
    triggerRewardNotifications(userId).catch(err => console.error('Reward notification trigger notice:', err));

    return {
      success: true,
      summary: {
        pendingTasksCount: tasks.length,
        remindersCount: reminders.length,
        memoriesCount: memories.length,
        myGroupsCount: userTolees.length,
        tasks,
        reminders,
        myGroups: userTolees.map(t => t.tolee)
      }
    };
  } catch (error: any) {
    return {
      success: false,
      summary: {
        pendingTasksCount: 0,
        remindersCount: 0,
        memoriesCount: 0,
        myGroupsCount: 0,
        tasks: [],
        reminders: [],
        myGroups: []
      }
    };
  }
}

// ------------------------------------
// 4. REAL-TIME AI PERSONAL ASSISTANT PROCESSOR WITH CENTRALIZED TIME SERVICE
// ------------------------------------

export async function processAIPersonalMessage(
  message: string, 
  history: { role: string; content: string }[] = [],
  clientLocalISO?: string,
  timeZone?: string
) {
  try {
    const userId = await getUserId();
    const trimmed = message.trim();

    // 🕒 CENTRAL TIME SERVICE RESOLUTION
    const timeInfo = getUserDeviceTimeInfo(clientLocalISO, timeZone);

    // ⚡ Direct Time Question Handler (0ms instant accurate device time response)
    if (isTimeOrDateQuery(trimmed)) {
      return {
        success: true,
        response: `🕒 It's currently **${timeInfo.formattedTime}** on **${timeInfo.formattedDate}** (${timeInfo.dayOfWeek}, ${timeInfo.timeZone}).`
      };
    }

    // ⚡ CENTRAL TOLEE AI ACTION ENGINE (Executes Real Operations Across Tolee Platform)
    const actionResult = await executeToleeAIAction({
      userId,
      userEmail: (await getServerSession(authOptions))?.user?.email || undefined,
      command: trimmed
    });

    return {
      success: actionResult.success,
      response: actionResult.message,
      action: actionResult.action,
      data: actionResult.data,
      interactiveAction: actionResult.interactiveAction
    };
  } catch (error: any) {
    console.error('Error in processAIPersonalMessage:', error);
    return {
      success: false,
      response: `🤖 **Tolee AI Manager**: Operation error: ${error.message}`
    };
  }
}

export async function executeConfirmedAIAction(
  action: string,
  targetId?: string,
  payload?: any
) {
  try {
    const userId = await getUserId();

    if (action === 'DELETE_POST') {
      if (!targetId) {
        return { success: false, error: 'Target ID is required for post deletion.' };
      }

      // Verify ownership before deleting
      const post = await prisma.post.findUnique({
        where: { id: targetId },
        select: { authorId: true }
      });

      if (!post) {
        return { success: false, error: 'Post not found.' };
      }

      if (post.authorId !== userId) {
        return { success: false, error: 'You are not authorized to delete this post.' };
      }

      const res = await deletePostPermanently(targetId);
      if (res.success) {
        // Log action
        await prisma.aIActionLog.create({
          data: {
            userId,
            action: 'DELETE_POST',
            command: `CONFIRMED_DELETE_POST_${targetId}`,
            status: 'SUCCESS',
            details: JSON.stringify({ targetId })
          }
        });
        return { success: true, message: 'Post has been permanently deleted.' };
      } else {
        return { success: false, error: res.error || 'Failed to delete post.' };
      }
    }

    return { success: false, error: `Unsupported AI action type: ${action}` };
  } catch (error: any) {
    console.error('Error executing confirmed AI action:', error);
    return { success: false, error: error.message || 'Operation failed.' };
  }
}

// ==========================================
// 🚀 OPENWORK AUTONOMOUS AGENT ACTIONS
// ==========================================

import { runOpenWorkAutonomousTask, planOpenWorkTask } from '@/modules/tolee-ai-manager/Core/openwork-engine';
import { OPENWORK_SKILL_REGISTRY } from '@/modules/tolee-ai-manager/Core/openwork-skills';

export async function runOpenWorkAgentAction(prompt: string) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : 'guest';

    const result = await runOpenWorkAutonomousTask(prompt);

    // Save action log if user is logged in
    if (userId && userId !== 'guest') {
      await prisma.aIActionLog.create({
        data: {
          userId,
          action: 'OPENWORK_AUTONOMOUS_TASK',
          command: prompt.slice(0, 100),
          status: 'SUCCESS',
          details: JSON.stringify({
            stepsCount: result.steps.length,
            hasMedia: Boolean(result.mediaUrl)
          })
        }
      }).catch(() => {});
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(result))
    };
  } catch (err: any) {
    console.error('[OpenWorkAction] Error:', err);
    return {
      success: false,
      error: err.message || 'Failed to execute OpenWork autonomous task.'
    };
  }
}

export async function getOpenWorkSkillsList() {
  const skills = Object.values(OPENWORK_SKILL_REGISTRY).map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    category: s.category,
    parameters: s.parameters
  }));

  return {
    success: true,
    skills
  };
}
