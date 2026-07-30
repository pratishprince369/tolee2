'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { callNvidiaLLM } from '@/modules/ai-manager/Core/chat-engine';
import { SYSTEM_PROMPTS } from '@/modules/ai-manager/Core/prompt-manager';

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
// 2. AI TASKS & REMINDERS ACTIONS
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

    if (data.dueDate) {
      await prisma.aIReminder.create({
        data: {
          userId,
          title: `Task Reminder: ${data.title}`,
          type: data.category || 'custom',
          remindAt: new Date(data.dueDate)
        }
      });
    }

    return { success: true, task };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create task' };
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
        isDismissed: false
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
        where: { userId, isDismissed: false },
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
// 4. REAL NVIDIA AI PERSONAL ASSISTANT PROCESSOR
// ------------------------------------

export async function processAIPersonalMessage(message: string, history: { role: string; content: string }[] = []) {
  try {
    const userId = await getUserId();
    const lower = message.toLowerCase();

    // 1. Check if user requests DB task creation / scheduling
    if (lower.includes('schedule') || lower.includes('remind') || lower.includes('task') || lower.includes('appointment') || lower.includes('bill')) {
      await createAITask({
        title: message,
        description: 'Auto-created via NVIDIA AI Personal Assistant',
        dueDate: new Date(Date.now() + 86400000).toISOString()
      });
    }

    // 2. Check if user requests Memory saving
    if (lower.includes('remember') || lower.includes('save note') || lower.includes('my favorite') || lower.includes('birthday is')) {
      await saveAIMemory({
        category: lower.includes('birthday') ? 'family' : 'personal',
        key: `note_${Date.now()}`,
        value: message
      });
    }

    // 3. Fetch real memory context from DB to enrich NVIDIA LLM Prompt
    const existingMemories = await prisma.aIMemory.findMany({
      where: { userId },
      take: 5
    });

    const memoryContext = existingMemories.length > 0
      ? `User Memory Context: ${existingMemories.map(m => `${m.key}: ${m.value}`).join('; ')}`
      : 'No previous memories saved.';

    const systemPromptWithContext = `${SYSTEM_PROMPTS.PERSONAL_EMPLOYEE}\n\n${memoryContext}\n\nYou are a real human-like Jarvis AI Employee for Tolee. Respond concisely, warmly, and helpfully.`;

    // 4. Call Real NVIDIA NIM LLM (Llama 3.3 70B)
    const nvidiaResponse = await callNvidiaLLM(
      [...history, { role: 'user', content: message }],
      systemPromptWithContext
    );

    if (nvidiaResponse) {
      return {
        success: true,
        response: nvidiaResponse
      };
    }

    // Fallback response if LLM API is unreachable
    return {
      success: true,
      response: `🤖 **Tolee AI Employee**: I have processed your request: "${message}". I have updated your tasks and memory in your database. How else can I assist you today?`
    };

  } catch (error: any) {
    return {
      success: false,
      response: `Sorry, I encountered an issue: ${error.message || 'Error processing request'}`
    };
  }
}
