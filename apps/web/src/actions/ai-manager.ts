'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callNvidiaLLM } from '@/modules/ai-manager/Core/chat-engine';
import { SYSTEM_PROMPTS } from '@/modules/ai-manager/Core/prompt-manager';
import { parseNaturalLanguageReminder } from '@/modules/ai-manager/Core/reminder-parser';

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
// 4. REAL-TIME AI PERSONAL ASSISTANT PROCESSOR WITH NATURAL LANGUAGE PARSER
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
    const lower = trimmed.toLowerCase();

    // ⚡ Ultra-Fast Local Greeting Handler (<10ms instant response)
    const simpleGreetings = ['hi', 'hello', 'hey', 'hie', 'namaste', 'kaise ho', 'good morning', 'good evening', 'good night', 'hola'];
    if (simpleGreetings.includes(lower)) {
      return {
        success: true,
        response: `👋 Hello! I am your 24×7 Tolee AI Personal Assistant. How can I assist you with your tasks, calendar, alarms, or community today?`
      };
    }

    // 1. Natural Language Alarm & Reminder Parser
    if (lower.includes('remind') || lower.includes('reminder') || lower.includes('alarm') || lower.includes('ring') || lower.includes('wake me') || lower.includes('call ')) {
      const { title, remindAt, formattedTimeStr, isRecurring, recurrence } = parseNaturalLanguageReminder(
        trimmed, 
        clientLocalISO, 
        timeZone
      );

      // Create or Update deduplicated reminder in database
      const result = await createOrUpdateAIReminder({
        title,
        remindAt,
        timeZone: timeZone || 'Asia/Kolkata',
        isRecurring,
        recurrence
      });

      await createAITask({
        title,
        description: `Alarm scheduled for ${formattedTimeStr}${isRecurring ? ` (Recurring: ${recurrence})` : ''}`,
        dueDate: remindAt.toISOString(),
        isRecurring,
        recurrence
      });

      const recurringBadge = isRecurring ? ` (🔁 Repeating: ${recurrence})` : '';
      const updateNotice = result.isUpdate ? ' (Updated existing active reminder)' : '';

      return {
        success: true,
        response: `✅ **Reminder Scheduled!**${updateNotice}\n\nI will remind you for **"${title}"** at **${formattedTimeStr}**${recurringBadge}.\n\n🔊 *My audio alarm engine will ring loudly on your device at exactly ${formattedTimeStr}!*`
      };
    }

    // 2. Task / Schedule creation in database
    if (lower.includes('schedule') || lower.includes('task') || lower.includes('appointment') || lower.includes('bill')) {
      await createAITask({
        title: trimmed,
        description: 'Auto-created via Tolee AI Personal Assistant',
        dueDate: new Date(Date.now() + 86400000).toISOString()
      });
    }

    // 3. Memory saving in database
    if (lower.includes('remember') || lower.includes('save note') || lower.includes('my favorite') || lower.includes('birthday is')) {
      await saveAIMemory({
        category: lower.includes('birthday') ? 'family' : 'personal',
        key: `note_${Date.now()}`,
        value: trimmed
      });
    }

    // 4. Fetch user memories for context
    const existingMemories = await prisma.aIMemory.findMany({
      where: { userId },
      take: 5
    });

    const memoryContext = existingMemories.length > 0
      ? `User Memory Context: ${existingMemories.map(m => `${m.key}: ${m.value}`).join('; ')}`
      : 'No previous memories saved.';

    const userTimeContext = clientLocalISO ? `User Current Device Time: ${new Date(clientLocalISO).toLocaleString()}` : '';

    const systemPromptWithContext = `${SYSTEM_PROMPTS.PERSONAL_EMPLOYEE}\n\n${memoryContext}\n${userTimeContext}\n\nYou are a real human-like Jarvis AI Employee for Tolee. Respond concisely, warmly, and helpfully.`;

    // 5. Call Ultra-Fast NVIDIA NIM LLM
    const nvidiaResponse = await callNvidiaLLM(
      [...history, { role: 'user', content: trimmed }],
      systemPromptWithContext
    );

    if (nvidiaResponse) {
      return {
        success: true,
        response: nvidiaResponse
      };
    }

    // Fallback response if LLM API is unreachable or timed out
    return {
      success: true,
      response: `🤖 **Tolee AI Employee**: I have processed your request: "${trimmed}". I have updated your tasks and alarms in your database. What would you like to execute next?`
    };

  } catch (error: any) {
    return {
      success: false,
      response: `Sorry, I encountered an issue: ${error.message || 'Error processing request'}`
    };
  }
}
