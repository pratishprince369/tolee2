import { prisma } from '@/lib/prisma';

export type BackgroundTaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface CreateBackgroundTaskOptions {
  userId: string;
  title: string;
  category?: string;
  specialistId?: string;
  inputPayload?: any;
}

export interface BackgroundTaskSnapshot {
  id: string;
  userId: string;
  title: string;
  category: string;
  status: BackgroundTaskStatus;
  progress: number;
  stepMessage?: string;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ⚡ Tolee Persistent Background Task Engine
 * Inspired by CopilotKit/OpenDots Background Work architecture.
 * Backed by Prisma AITask and AIActionLog for robust, persistent job execution.
 */
export class ToleeBackgroundEngine {
  /**
   * Initializes and persists a new background task
   */
  public static async createTask(options: CreateBackgroundTaskOptions): Promise<BackgroundTaskSnapshot> {
    const { userId, title, category = 'ai_autonomous', specialistId, inputPayload } = options;

    const initialMetadata = {
      progress: 0,
      specialistId: specialistId || 'general_assistant',
      stepMessage: 'Task queued for execution',
      inputPayload: inputPayload || {},
    };

    const task = await prisma.aITask.create({
      data: {
        userId,
        title,
        category,
        status: 'in_progress',
        description: JSON.stringify(initialMetadata),
      },
    });

    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      category: task.category,
      status: task.status as BackgroundTaskStatus,
      progress: 0,
      stepMessage: initialMetadata.stepMessage,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Updates task progress and intermediate status
   */
  public static async updateProgress(
    taskId: string,
    progress: number,
    stepMessage: string,
    partialData?: any
  ): Promise<void> {
    try {
      const existing = await prisma.aITask.findUnique({
        where: { id: taskId },
        select: { description: true },
      });

      let currentMeta: Record<string, any> = {};
      try {
        currentMeta = existing?.description ? JSON.parse(existing.description) : {};
      } catch {}

      currentMeta.progress = Math.min(100, Math.max(0, progress));
      currentMeta.stepMessage = stepMessage;
      if (partialData) {
        currentMeta.partialData = partialData;
      }

      await prisma.aITask.update({
        where: { id: taskId },
        data: {
          description: JSON.stringify(currentMeta),
          status: progress >= 100 ? 'completed' : 'in_progress',
        },
      });
    } catch (err: any) {
      console.error(`[BackgroundEngine] Failed to update progress for ${taskId}:`, err?.message);
    }
  }

  /**
   * Marks a task as successfully completed with final payload
   */
  public static async completeTask(taskId: string, finalResult: any): Promise<void> {
    try {
      const existing = await prisma.aITask.findUnique({
        where: { id: taskId },
        select: { description: true, userId: true, title: true },
      });

      let currentMeta: Record<string, any> = {};
      try {
        currentMeta = existing?.description ? JSON.parse(existing.description) : {};
      } catch {}

      currentMeta.progress = 100;
      currentMeta.stepMessage = 'Task completed successfully';
      currentMeta.result = finalResult;

      await prisma.aITask.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          description: JSON.stringify(currentMeta),
        },
      });

      // Audit log
      if (existing?.userId) {
        await prisma.aIActionLog.create({
          data: {
            userId: existing.userId,
            action: 'BACKGROUND_TASK_COMPLETED',
            command: existing.title,
            status: 'SUCCESS',
            details: JSON.stringify({ taskId, completedAt: new Date().toISOString() }),
          },
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error(`[BackgroundEngine] Failed to complete task ${taskId}:`, err?.message);
    }
  }

  /**
   * Marks a task as failed with error details
   */
  public static async failTask(taskId: string, errorMessage: string): Promise<void> {
    try {
      const existing = await prisma.aITask.findUnique({
        where: { id: taskId },
        select: { description: true },
      });

      let currentMeta: Record<string, any> = {};
      try {
        currentMeta = existing?.description ? JSON.parse(existing.description) : {};
      } catch {}

      currentMeta.error = errorMessage;
      currentMeta.stepMessage = `Failed: ${errorMessage}`;

      await prisma.aITask.update({
        where: { id: taskId },
        data: {
          status: 'failed',
          description: JSON.stringify(currentMeta),
        },
      });
    } catch (err: any) {
      console.error(`[BackgroundEngine] Failed to fail task ${taskId}:`, err?.message);
    }
  }

  /**
   * Cancels a background task
   */
  public static async cancelTask(taskId: string): Promise<boolean> {
    try {
      await prisma.aITask.update({
        where: { id: taskId },
        data: { status: 'cancelled' },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetches current snapshot of a background task
   */
  public static async getTask(taskId: string): Promise<BackgroundTaskSnapshot | null> {
    const task = await prisma.aITask.findUnique({
      where: { id: taskId },
    });

    if (!task) return null;

    let meta: Record<string, any> = {};
    try {
      meta = task.description ? JSON.parse(task.description) : {};
    } catch {}

    return {
      id: task.id,
      userId: task.userId,
      title: task.title,
      category: task.category,
      status: task.status as BackgroundTaskStatus,
      progress: meta.progress ?? (task.status === 'completed' ? 100 : 0),
      stepMessage: meta.stepMessage,
      result: meta.result,
      error: meta.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  /**
   * Retrieves active or recent tasks for a user
   */
  public static async getUserTasks(userId: string, limit = 10): Promise<BackgroundTaskSnapshot[]> {
    const tasks = await prisma.aITask.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return tasks.map((t: any) => {
      let meta: Record<string, any> = {};
      try {
        meta = t.description ? JSON.parse(t.description) : {};
      } catch {}

      return {
        id: t.id,
        userId: t.userId,
        title: t.title,
        category: t.category,
        status: t.status as BackgroundTaskStatus,
        progress: meta.progress ?? (t.status === 'completed' ? 100 : 0),
        stepMessage: meta.stepMessage,
        result: meta.result,
        error: meta.error,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      };
    });
  }
}
