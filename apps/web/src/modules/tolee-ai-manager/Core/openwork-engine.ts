import { OPENWORK_SKILL_REGISTRY, OpenWorkSkill } from './openwork-skills';
import { callNvidiaLLM } from './chat-engine';

export interface PlanStep {
  id: string;
  stepNumber: number;
  title: string;
  skillId: string;
  args: Record<string, any>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: any;
  log?: string;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
  };
}

export interface OpenWorkExecutionResult {
  taskId: string;
  summary: string;
  steps: PlanStep[];
  finalOutput: string;
  interactiveAction?: {
    type: string;
    label: string;
    payload: any;
  };
  mediaUrl?: string;
}

/**
 * Decomposes a user objective into an executable multi-step OpenWork Plan
 */
export async function planOpenWorkTask(userPrompt: string): Promise<PlanStep[]> {
  const query = userPrompt.toLowerCase();
  const steps: PlanStep[] = [];

  // Pattern 0: AI Video / Reel / Motion Ad Request (e.g. "video banao", "generate reel", "LTX-2 motion")
  if (query.includes('video') || query.includes('reel') || query.includes('motion') || query.includes('animation') || query.includes('shorts') || query.includes('वीडियो') || query.includes('रील')) {
    const isPortrait = query.includes('reel') || query.includes('short') || query.includes('9:16') || query.includes('portrait');
    steps.push({
      id: `step_1_${Date.now()}`,
      stepNumber: 1,
      title: 'Generate LTX-2 4K Motion Video Reel',
      skillId: 'ai_video_generator',
      args: { prompt: userPrompt, aspectRatio: isPortrait ? '9:16' : '16:9' },
      status: 'pending'
    });

    steps.push({
      id: `step_2_${Date.now()}`,
      stepNumber: 2,
      title: 'Write High-Converting Video Reel Caption & Tags',
      skillId: 'content_writer',
      args: { topic: userPrompt, format: 'video_script' },
      status: 'pending'
    });

    steps.push({
      id: `step_3_${Date.now()}`,
      stepNumber: 3,
      title: 'Prepare 1-Click Feed / Reel Publish Action',
      skillId: 'social_publisher',
      args: { caption: userPrompt },
      status: 'pending'
    });

    return steps;
  }

  // Pattern 1: Creative Banner / Poster Request (e.g. "Create banner for...", "Banner banao")
  if (query.includes('banner') || query.includes('poster') || query.includes('creative') || query.includes('thumbnail') || query.includes('design')) {
    steps.push({
      id: `step_1_${Date.now()}`,
      stepNumber: 1,
      title: 'Generate High-Resolution Creative Visual',
      skillId: 'creative_studio',
      args: { prompt: userPrompt, style: 'Modern Minimalist' },
      status: 'pending'
    });

    steps.push({
      id: `step_2_${Date.now()}`,
      stepNumber: 2,
      title: 'Write High-Converting Social Caption & Copy',
      skillId: 'content_writer',
      args: { topic: userPrompt, format: 'post_caption' },
      status: 'pending'
    });

    steps.push({
      id: `step_3_${Date.now()}`,
      stepNumber: 3,
      title: 'Prepare 1-Click Feed Post Action',
      skillId: 'social_publisher',
      args: { caption: userPrompt },
      status: 'pending'
    });

    return steps;
  }

  // Pattern 2: News / Research Task (e.g. "Research about...", "Latest news on...", "Pata karo")
  if (query.includes('research') || query.includes('news') || query.includes('update') || query.includes('search') || query.includes('find out')) {
    steps.push({
      id: `step_1_${Date.now()}`,
      stepNumber: 1,
      title: 'Live News & Web Research',
      skillId: 'web_research',
      args: { query: userPrompt },
      status: 'pending'
    });

    steps.push({
      id: `step_2_${Date.now()}`,
      stepNumber: 2,
      title: 'Synthesize Verified Analysis & Article',
      skillId: 'content_writer',
      args: { topic: userPrompt, format: 'blog_article' },
      status: 'pending'
    });

    return steps;
  }

  // Pattern 3: Developer / Coding Task (e.g. "Code for...", "Create component...", "Bug fix")
  if (query.includes('code') || query.includes('function') || query.includes('component') || query.includes('script') || query.includes('api')) {
    steps.push({
      id: `step_1_${Date.now()}`,
      stepNumber: 1,
      title: 'Architect & Write Production Code',
      skillId: 'code_generator',
      args: { task: userPrompt, language: 'typescript' },
      status: 'pending'
    });

    return steps;
  }

  // Pattern 4: CRM / Meeting / Calendar Task
  if (query.includes('meeting') || query.includes('schedule') || query.includes('lead') || query.includes('client') || query.includes('reminder')) {
    steps.push({
      id: `step_1_${Date.now()}`,
      stepNumber: 1,
      title: 'Schedule Calendar & CRM Task',
      skillId: 'crm_scheduler',
      args: { title: userPrompt },
      status: 'pending'
    });

    return steps;
  }

  // Fallback: General High-Value Content & Execution
  steps.push({
    id: `step_1_${Date.now()}`,
    stepNumber: 1,
    title: 'Generate Comprehensive Content & Solution',
    skillId: 'content_writer',
    args: { topic: userPrompt, format: 'post_caption' },
    status: 'pending'
  });

  return steps;
}

/**
 * Executes an OpenWork plan step by step with live progress updates
 */
export async function executeOpenWorkPlan(
  steps: PlanStep[],
  onStepProgress?: (step: PlanStep) => void
): Promise<OpenWorkExecutionResult> {
  const taskId = `task_${Date.now()}`;
  let primaryImageUrl: string | undefined = undefined;
  let finalCaption: string = '';
  let lastAction: any = undefined;

  for (const step of steps) {
    step.status = 'running';
    if (onStepProgress) onStepProgress({ ...step });

    const skill = OPENWORK_SKILL_REGISTRY[step.skillId];
    if (!skill) {
      step.status = 'failed';
      step.log = `Skill ${step.skillId} not found in OpenWork registry.`;
      if (onStepProgress) onStepProgress({ ...step });
      continue;
    }

    try {
      // Inject previous step results if applicable
      if (step.skillId === 'social_publisher') {
        if (primaryImageUrl) step.args.imageUrl = primaryImageUrl;
        if (finalCaption) step.args.caption = finalCaption;
      }

      const execution = await skill.execute(step.args);
      step.status = execution.success ? 'completed' : 'failed';
      step.result = execution.output;
      step.log = execution.logMessage;
      step.interactiveAction = execution.interactiveAction;

      if (execution.output?.imageUrl) {
        primaryImageUrl = execution.output.imageUrl;
      }
      if (execution.output?.content) {
        finalCaption = execution.output.content;
      }
      if (execution.interactiveAction) {
        lastAction = execution.interactiveAction;
      }

      if (onStepProgress) onStepProgress({ ...step });
    } catch (err: any) {
      step.status = 'failed';
      step.log = `Execution error: ${err.message}`;
      if (onStepProgress) onStepProgress({ ...step });
    }
  }

  const completedSteps = steps.filter(s => s.status === 'completed');
  const summary = `Executed ${completedSteps.length}/${steps.length} autonomous steps successfully.`;

  return {
    taskId,
    summary,
    steps,
    finalOutput: finalCaption || summary,
    interactiveAction: lastAction,
    mediaUrl: primaryImageUrl
  };
}

/**
 * End-to-End Orchestrator: Plans and executes a task seamlessly
 */
export async function runOpenWorkAutonomousTask(
  userPrompt: string,
  onStepProgress?: (step: PlanStep) => void
): Promise<OpenWorkExecutionResult> {
  const plan = await planOpenWorkTask(userPrompt);
  return await executeOpenWorkPlan(plan, onStepProgress);
}
