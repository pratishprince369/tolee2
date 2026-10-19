import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { ApprovalEngine, ApprovalRecord } from '../approvals/approval-engine';

export type TaskStatus =
  | 'created'
  | 'planning'
  | 'running'
  | 'waiting_for_approval'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type StepStatus = 'pending' | 'running' | 'completed' | 'skipped' | 'failed';

export interface AgentTaskStep {
  id: string;
  stepIndex: number;
  title: string;
  description: string;
  status: StepStatus;
  approvalLevel?: 1 | 2 | 3 | 4;
  approvalId?: string;
  result?: any;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface AgentTaskRecord {
  id: string;
  userId: string;
  title: string;
  goal: string;
  status: TaskStatus;
  steps: AgentTaskStep[];
  currentStepIndex: number;
  artifacts: Array<{ name: string; url?: string; type: string; data?: any }>;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  checkpointState: Record<string, any>;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
  error?: string;
}

/**
 * 📋 Persistent Multi-Step Agent Task Manager (Sections 7, 8, 16)
 * - State machine with durable steps and checkpointing.
 * - Level 1-4 Approval gating between consequential steps.
 * - Safe task resumption and instant cancellation ("ruko", "cancel").
 */
export class AgentTaskManager {
  private static tasks: Map<string, AgentTaskRecord> = new Map();

  /**
   * Creates a multi-step task plan
   */
  public static async createTask(params: {
    userId: string;
    title: string;
    goal: string;
    steps: Array<{
      title: string;
      description: string;
      approvalLevel?: 1 | 2 | 3 | 4;
    }>;
  }): Promise<AgentTaskRecord> {
    const id = `task_${crypto.randomBytes(8).toString('hex')}`;
    const now = Date.now();

    const taskSteps: AgentTaskStep[] = params.steps.map((s, idx) => ({
      id: `step_${idx + 1}_${crypto.randomBytes(4).toString('hex')}`,
      stepIndex: idx + 1,
      title: s.title,
      description: s.description,
      status: 'pending',
      approvalLevel: s.approvalLevel || 1,
    }));

    const task: AgentTaskRecord = {
      id,
      userId: params.userId,
      title: params.title,
      goal: params.goal,
      status: 'created',
      steps: taskSteps,
      currentStepIndex: 0,
      artifacts: [],
      sources: [],
      checkpointState: {},
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(id, task);

    // Optional durable sync to Prisma AITask
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true },
      });
      if (userExists) {
        await prisma.aITask.create({
          data: {
            id,
            userId: params.userId,
            title: params.title,
            description: JSON.stringify({
              goal: params.goal,
              stepsCount: taskSteps.length,
              status: 'created',
            }),
            category: 'work',
            status: 'pending',
          },
        });
      }
    } catch {
      // Prisma offline/mock fallback for non-destructive local testing
    }

    return task;
  }

  /**
   * Retrieves a task by ID with user boundary check
   */
  public static getTask(id: string, userId: string): AgentTaskRecord | null {
    const task = this.tasks.get(id);
    if (!task || task.userId !== userId) {
      return null;
    }
    return task;
  }

  /**
   * Updates task status and steps
   */
  public static updateStep(
    taskId: string,
    stepIndex: number,
    update: Partial<AgentTaskStep>
  ): AgentTaskRecord | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const step = task.steps.find((s) => s.stepIndex === stepIndex);
    if (step) {
      Object.assign(step, update);
      task.updatedAt = Date.now();
    }

    return task;
  }

  /**
   * Saves task checkpoint data
   */
  public static saveCheckpoint(
    taskId: string,
    state: Record<string, any>,
    artifacts?: Array<{ name: string; url?: string; type: string; data?: any }>
  ): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.checkpointState = { ...task.checkpointState, ...state };
      if (artifacts) {
        task.artifacts.push(...artifacts);
      }
      task.updatedAt = Date.now();
    }
  }

  /**
   * Transitions task to 'waiting_for_approval'
   */
  public static requestStepApproval(
    taskId: string,
    stepIndex: number,
    approval: ApprovalRecord
  ): AgentTaskRecord | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    task.status = 'waiting_for_approval';
    task.currentStepIndex = stepIndex;

    const step = task.steps.find((s) => s.stepIndex === stepIndex);
    if (step) {
      step.status = 'running';
      step.approvalId = approval.id;
    }

    task.updatedAt = Date.now();
    return task;
  }

  /**
   * Safely resumes an interrupted or approved task
   */
  public static resumeTask(taskId: string, userId: string): { success: boolean; task?: AgentTaskRecord; nextStep?: AgentTaskStep; error?: string } {
    const task = this.getTask(taskId, userId);
    if (!task) {
      return { success: false, error: 'Task not found or access denied.' };
    }

    if (task.status === 'completed' || task.status === 'cancelled') {
      return { success: false, error: `Cannot resume task in "${task.status}" state.` };
    }

    // Find the first non-completed step
    const nextStep = task.steps.find((s) => s.status === 'pending' || s.status === 'running');
    if (!nextStep) {
      task.status = 'completed';
      task.completedAt = Date.now();
      return { success: true, task };
    }

    task.status = 'running';
    task.currentStepIndex = nextStep.stepIndex;
    task.updatedAt = Date.now();

    return { success: true, task, nextStep };
  }

  /**
   * Cancels a running or pending task immediately ("ruko", "cancel")
   */
  public static cancelTask(taskId: string, userId: string): boolean {
    const task = this.getTask(taskId, userId);
    if (!task) return false;

    task.status = 'cancelled';
    task.updatedAt = Date.now();

    // Cancel any associated approval
    const currentStep = task.steps[task.currentStepIndex - 1];
    if (currentStep?.approvalId) {
      ApprovalEngine.reject(currentStep.approvalId, userId, 'Task cancelled by user');
    }

    // Mark current pending/running step as skipped
    for (const step of task.steps) {
      if (step.status === 'pending' || step.status === 'running') {
        step.status = 'skipped';
      }
    }

    return true;
  }

  /**
   * Cancels all active tasks for user
   */
  public static cancelAllForUser(userId: string): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.userId === userId && (task.status === 'running' || task.status === 'waiting_for_approval' || task.status === 'planning')) {
        this.cancelTask(task.id, userId);
        count++;
      }
    }
    return count;
  }

  /**
   * Lists tasks for user
   */
  public static listUserTasks(userId: string, limit: number = 10): AgentTaskRecord[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}
