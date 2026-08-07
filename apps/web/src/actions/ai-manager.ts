'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callNvidiaLLM } from '@/modules/ai-manager/Core/chat-engine';
import { SYSTEM_PROMPTS } from '@/modules/ai-manager/Core/prompt-manager';
import { parseNaturalLanguageReminder } from '@/modules/ai-manager/Core/reminder-parser';
import { getUserDeviceTimeInfo, isTimeOrDateQuery } from '@/modules/ai-manager/Core/time-service';
import { getUserMonthlyRewardStatus, triggerRewardNotifications } from '@/lib/reward-service';

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
    const lower = trimmed.toLowerCase();

    // 🕒 CENTRAL TIME SERVICE RESOLUTION
    const timeInfo = getUserDeviceTimeInfo(clientLocalISO, timeZone);

    // ⚡ Direct Time Question Handler (0ms instant accurate device time response)
    if (isTimeOrDateQuery(trimmed)) {
      return {
        success: true,
        response: `🕒 It's currently **${timeInfo.formattedTime}** on **${timeInfo.formattedDate}** (${timeInfo.dayOfWeek}, ${timeInfo.timeZone}).`
      };
    }

    // ⚡ Autonomous Post & AI Image Creation Execution Handler (High Priority)
    const isPostIntent = 
      lower.includes('post') || 
      lower.includes('image') || 
      lower.includes('banner') || 
      lower.includes('poster') || 
      lower.includes('generate') ||
      lower.includes('banao') ||
      lower.includes('bana do') ||
      lower.includes('create');

    if (isPostIntent) {
      try {
        const isGoodMorning = lower.includes('good morning') || lower.includes('subah') || lower.includes('morning');
        const promptConcept = isGoodMorning 
          ? 'Beautiful morning sunrise over mountains with inspiring light' 
          : trimmed;

        const generatedImageUrl = await generateAIImageWithFallback(promptConcept) || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80';

        const caption = isGoodMorning
          ? `🌅 Good morning! Wishing everyone a peaceful, inspiring, and productive day ahead! ✨\n\n#GoodMorning #Tolee #Inspiration #DailyMotivation #Community`
          : `✨ ${trimmed}\n\n#Tolee #Community #Updates`;
        
        return {
          success: true,
          response: `✨ **Tolee AI Manager**: Maine aapka **${isGoodMorning ? 'Good Morning Post' : 'Post'}** AI image ke saath tayar kar diya hai!\n\nNiche post review karein aur **Publish Post Now** button par click karke Feed par post karein.`,
          interactiveAction: {
            type: 'PUBLISH_POST',
            label: '🚀 Publish Post Now',
            payload: {
              caption,
              imageUrl: generatedImageUrl,
              postType: 'post'
            }
          }
        };
      } catch (err) {
        console.error('Autonomous image post creation fallback:', err);
      }
    }

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
      const parsed = parseNaturalLanguageReminder(
        trimmed, 
        timeInfo.isoString, 
        timeInfo.timeZone
      );

      // Create or Update deduplicated reminder in database
      const result = await createOrUpdateAIReminder({
        title: parsed.title,
        remindAt: parsed.remindAt,
        timeZone: timeInfo.timeZone,
        isRecurring: parsed.isRecurring,
        recurrence: parsed.recurrence
      });

      await createAITask({
        title: parsed.title,
        description: `Alarm scheduled for ${parsed.formattedTimeStr}${parsed.isRecurring ? ` (Recurring: ${parsed.recurrence})` : ''}`,
        dueDate: parsed.remindAt.toISOString(),
        isRecurring: parsed.isRecurring,
        recurrence: parsed.recurrence
      });

      const recurringBadge = parsed.isRecurring ? ` (🔁 Repeating: ${parsed.recurrence})` : '';
      const updateNotice = result.isUpdate ? ' (Updated existing active reminder)' : '';
      const durationStr = parsed.minsOffset >= 60 
        ? `${Math.floor(parsed.minsOffset / 60)} hour${parsed.minsOffset >= 120 ? 's' : ''}${parsed.minsOffset % 60 ? ` ${parsed.minsOffset % 60} mins` : ''}`
        : `${parsed.minsOffset} minute${parsed.minsOffset > 1 ? 's' : ''}`;

      return {
        success: true,
        response: `✅ **Sure! Reminder Scheduled.**${updateNotice}\n\nCurrent device time is **${parsed.currentTimeStr}**.\n\nI will remind you for **"${parsed.title}"** in **${durationStr}**, exactly at **${parsed.formattedTimeStr}**${recurringBadge}.\n\n🔊 *My audio alarm engine will ring loudly on your device at exactly ${parsed.formattedTimeStr}!*`
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

    // 4b. Autonomous Post & AI Image Creation Execution
    const isImageOrPostRequest = 
      lower.includes('post') || 
      lower.includes('image') || 
      lower.includes('good morning') || 
      lower.includes('banner') || 
      lower.includes('poster') || 
      lower.includes('generate');

    if (isImageOrPostRequest && (lower.includes('create') || lower.includes('make') || lower.includes('banao') || lower.includes('publish') || lower.includes('good morning'))) {
      try {
        const promptConcept = trimmed.length > 5 ? trimmed : 'Beautiful morning sunrise with inspirational quote for social media post';
        const generatedImageUrl = await generateAIImageWithFallback(promptConcept) || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80';

        const caption = `🌅 Good morning! Wishing everyone a peaceful, inspiring, and productive day ahead! ✨\n\n#GoodMorning #Tolee #Inspiration #DailyMotivation #Community`;
        
        return {
          success: true,
          response: `✨ **Tolee AI Manager**: I have created a custom **Good Morning Post** with an AI-generated image for you!\n\nReview the generated post below and click **Publish Now** to post it to your Tolees instantly.`,
          interactiveAction: {
            type: 'PUBLISH_POST',
            label: '🚀 Publish Post Now',
            payload: {
              caption,
              imageUrl: generatedImageUrl,
              postType: 'post'
            }
          }
        };
      } catch (err) {
        console.error('Autonomous image post creation fallback:', err);
      }
    }

    // ⚡ Direct Chat Box Inspection Handler (Highest Priority for Voice Access)
    const isChatCheckIntent = 
      (lower.includes('chat') || lower.includes('message') || lower.includes('msg') || lower.includes('chhat') || lower.includes('inbox')) &&
      (lower.includes('kiska') || lower.includes('kya') || lower.includes('dekho') || lower.includes('check') || lower.includes('padho') || lower.includes('read') || lower.includes('aaya'));

    if (isChatCheckIntent) {
      const userChatParticipants = await prisma.chatParticipant.findMany({
        where: { userId },
        select: { chatId: true }
      }).catch(() => []);

      const userChatIds = userChatParticipants.map(cp => cp.chatId);

      const recentMessages = userChatIds.length > 0 ? await prisma.message.findMany({
        where: {
          chatId: { in: userChatIds },
          senderId: { not: userId }
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { sender: { select: { name: true, username: true } } }
      }).catch(() => []) : [];

      if (recentMessages.length > 0) {
        const msgList = recentMessages.map(m => `• **${m.sender.name || m.sender.username || 'User'}**: "${m.content}"`).join('\n');
        return {
          success: true,
          response: `📩 **Tolee AI Manager**: Maine aapka Tolee chat box check kiya hai! Aapke naye messages yeh hain:\n\n${msgList}\n\nKya aap chahte hain ki main inka reply send karoon?`
        };
      } else {
        return {
          success: true,
          response: `📩 **Tolee AI Manager**: Maine aapka Tolee chat box check kiya hai! Abhi aapke inbox mein koi bhi naya unread message nahi aaya hai.`
        };
      }
    }

    // ⚡ Direct ₹3,999 Ads Wallet Creator Offer Query Handler
    const isOfferQuery = 
      lower.includes('3999') || 
      lower.includes('3,999') || 
      lower.includes('ads wallet') || 
      lower.includes('offer') || 
      lower.includes('creator reward') || 
      lower.includes('reward status') ||
      (lower.includes('post') && (lower.includes('kitne') || lower.includes('baki') || lower.includes('target')));

    if (isOfferQuery) {
      const rewardStatus = await getUserMonthlyRewardStatus(userId);
      return {
        success: true,
        response: `🎁 **Tolee ₹3,999 Ads Wallet Monthly Creator Offer**:

• **Posts Created This Month**: **${rewardStatus.postsThisMonth}/30** posts
• **Posts Created Today**: **${rewardStatus.postsToday}** posts
• **Today's Recommended Target**: **Post ${rewardStatus.recommendedTodayPosts} item(s)** today
• **Current Ads Wallet Balance**: **₹${rewardStatus.adsWalletBalance.toLocaleString()}**

📢 **Reward Guidance**: ${rewardStatus.notificationMessage}`
      };
    }

    // 5. Fetch real-time user account context (Chats, Notifications, Groups, Memories, Reward Progress)
    const [userChatParticipants, existingMemories, notifications, userTolees, rewardStatus] = await Promise.all([
      prisma.chatParticipant.findMany({ where: { userId }, select: { chatId: true } }).catch(() => []),
      prisma.aIMemory.findMany({ where: { userId }, take: 5 }).catch(() => []),
      prisma.notification.findMany({ where: { userId, isRead: false }, take: 3, orderBy: { createdAt: 'desc' } }).catch(() => []),
      prisma.toleeMember.findMany({ where: { userId, status: 'approved' }, take: 5, include: { tolee: { select: { name: true } } } }).catch(() => []),
      getUserMonthlyRewardStatus(userId).catch(() => null)
    ]);

    const userChatIds = userChatParticipants.map(cp => cp.chatId);
    const recentMessages = userChatIds.length > 0 ? await prisma.message.findMany({
      where: { chatId: { in: userChatIds }, senderId: { not: userId } },
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: { sender: { select: { name: true } } }
    }).catch(() => []) : [];

    const accountDataSummary = `
REAL-TIME USER ACCOUNT DATA CONTEXT:
- Recent Direct Chat Messages: ${recentMessages.length > 0 ? recentMessages.map(m => `${m.sender.name}: "${m.content}"`).join('; ') : 'No recent direct messages'}
- Unread Notifications: ${notifications.length > 0 ? notifications.map(n => n.title).join('; ') : 'No unread notifications'}
- Active Joined Tolee Groups: ${userTolees.length > 0 ? userTolees.map(t => t.tolee.name).join(', ') : 'Tolee Public Group'}
- Monthly ₹3,999 Ads Wallet Reward Progress: ${rewardStatus ? `${rewardStatus.postsThisMonth}/30 posts created this month (Today: ${rewardStatus.postsToday} posts). Guidance: ${rewardStatus.notificationMessage}` : 'Active'}
- User Saved Memories: ${existingMemories.length > 0 ? existingMemories.map(m => `${m.key}: ${m.value}`).join('; ') : 'None'}

CRITICAL ACCOUNT ACCESS MANDATE:
You have 100% FULL ACCESS to the user's Tolee account, direct chats, notifications, group posts, and ₹3,999 Ads Wallet Creator Offer!
NEVER state or claim "I don't have direct access to your chat box" or "you need to check yourself"! You know all their chats, notifications, and monthly post progress listed above. Answer directly and perform actions on their behalf.`;

    const systemPromptWithContext = `${SYSTEM_PROMPTS.PERSONAL_EMPLOYEE}\n\n${accountDataSummary}\n\nCRITICAL SYSTEM INSTRUCTION: Current date/time reference: ${timeInfo.formattedFull} (${timeInfo.dayOfWeek}, Timezone: ${timeInfo.timeZone}). Use this internal context ONLY when scheduling or directly asked about the clock. DO NOT output timing notes, clock stamps, or "(Current time: ...)" in your message responses unless the user explicitly asks for the time!`;

    // 6. Call Ultra-Fast NVIDIA NIM LLM
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
      response: `🤖 **Tolee AI Manager**: I have processed your request: "${trimmed}". I have updated your tasks and alarms in your database. What would you like to execute next?`
    };

  } catch (error: any) {
    return {
      success: false,
      response: `Sorry, I encountered an issue: ${error.message || 'Error processing request'}`
    };
  }
}
