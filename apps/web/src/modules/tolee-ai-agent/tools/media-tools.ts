import { ToolDefinition } from './types';
import { OpenHiggsfieldMediaService, OPEN_HIGGSFIELD_MODELS } from '../media/generation-service';
import { prisma } from '@/lib/prisma';

// ==========================================
// 1. IMAGE GENERATION TOOL (PHASE 3)
// ==========================================
export const generateImageTool: ToolDefinition = {
  name: 'generate_ai_image',
  description:
    'Generates photorealistic AI images, social creatives, and branding posters using Open-Higgsfield & Flux models. Saves output as a private draft.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed prompt describing the subject, style, lighting, and composition',
      },
      modelId: {
        type: 'string',
        enum: ['flux-schnell', 'flux-dev', 'higgsfield-image', 'sdxl-turbo'],
        description: 'Optional model selection (default: flux-schnell)',
      },
      aspectRatio: {
        type: 'string',
        enum: ['1:1', '16:9', '9:16', '4:5'],
        description: 'Aspect ratio (default: 1:1 for social feeds, 9:16 for stories)',
      },
      referenceImageUrl: {
        type: 'string',
        description: 'Optional reference image URL for image-to-image styling',
      },
      negativePrompt: {
        type: 'string',
        description: 'Elements to avoid in the generation',
      },
    },
    required: ['prompt'],
  },
  execute: async (args, context) => {
    try {
      const { prompt, modelId, aspectRatio, referenceImageUrl, negativePrompt } = args;

      const task = await OpenHiggsfieldMediaService.generateImage({
        userId: context.userId,
        prompt,
        modelId,
        aspectRatio,
        referenceImageUrl,
        negativePrompt,
      });

      if (task.status === 'failed') {
        return {
          success: false,
          error: task.error || 'Image generation me issue aaya.',
        };
      }

      const imageUrl = task.outputUrls[0];
      return {
        success: true,
        data: {
          taskId: task.taskId,
          status: task.status,
          imageUrl,
          prompt: task.prompt,
          model: task.modelId,
          aspectRatio: task.aspectRatio,
        },
        message: `✨ Creative successfully generate ho gaya! Preview image ready hai (Draft saved).`,
      };
    } catch (err: any) {
      console.error('[Tool: generate_ai_image] Error:', err);
      return { success: false, error: 'Image generation service temporarily unavailable.' };
    }
  },
};

// ==========================================
// 2. VIDEO GENERATION TOOL (PHASE 4)
// ==========================================
export const generateVideoTool: ToolDefinition = {
  name: 'generate_ai_video',
  description:
    'Generates cinematic AI videos or converts images into promotional videos using Open-Higgsfield models (Seedance, Kling, Runway, Higgsfield). Keeps output as a private draft.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Description of scene motion, camera movement, and visual action',
      },
      modelId: {
        type: 'string',
        enum: ['seedance-2.5-text-to-video', 'kling-video', 'runway-gen3', 'luma-dream-machine', 'higgsfield-video'],
        description: 'Video model selection (default: seedance-2.5-text-to-video)',
      },
      duration: {
        type: 'number',
        description: 'Duration in seconds (5 or 10, default 5)',
      },
      aspectRatio: {
        type: 'string',
        enum: ['9:16', '16:9'],
        description: 'Aspect ratio (9:16 for Reels/Shorts, 16:9 for landscape cinema)',
      },
      referenceImageUrl: {
        type: 'string',
        description: 'Optional reference photo for image-to-video conversion',
      },
    },
    required: ['prompt'],
  },
  execute: async (args, context) => {
    try {
      const { prompt, modelId, duration, aspectRatio, referenceImageUrl } = args;

      const task = await OpenHiggsfieldMediaService.generateVideo({
        userId: context.userId,
        prompt,
        modelId,
        duration,
        aspectRatio,
        referenceImageUrl,
      });

      if (task.status === 'failed') {
        return {
          success: false,
          error: task.error || 'Video rendering me issue aaya.',
        };
      }

      const videoUrl = task.outputUrls[0];
      return {
        success: true,
        data: {
          taskId: task.taskId,
          status: task.status,
          videoUrl,
          thumbnailUrl: task.thumbnailUrl,
          duration: task.duration,
          model: task.modelId,
          mode: task.mode,
        },
        message: `🎬 Video render complete! Cinematic ${task.duration}s video ready hai (Draft saved).`,
      };
    } catch (err: any) {
      console.error('[Tool: generate_ai_video] Error:', err);
      return { success: false, error: 'Video generation service temporarily unavailable.' };
    }
  },
};

// ==========================================
// 3. GENERATION STATUS TOOL (PHASE 6)
// ==========================================
export const getGenerationStatusTool: ToolDefinition = {
  name: 'get_media_generation_status',
  description: 'Retrieves status and output URLs of an AI image or video generation task.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The task ID of the generation',
      },
    },
    required: ['taskId'],
  },
  execute: async (args, context) => {
    const { taskId } = args;
    const task = OpenHiggsfieldMediaService.getTask(taskId, context.userId);

    if (!task) {
      return { success: false, error: 'Task ID nahi mila ya aapke account se associated nahi hai.' };
    }

    return {
      success: true,
      data: task,
      message: `Task status: ${task.status}. Output URLs: ${task.outputUrls.length} available.`,
    };
  },
};

// ==========================================
// 4. USER GENERATIONS LIST TOOL (PHASE 6)
// ==========================================
export const listMyGenerationsTool: ToolDefinition = {
  name: 'list_my_generations',
  description: 'Lists recent AI image and video generation drafts for the authenticated user.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (_args, context) => {
    const list = OpenHiggsfieldMediaService.listUserTasks(context.userId);
    return {
      success: true,
      data: list,
      message: `${list.length} generative media tasks found in your history.`,
    };
  },
};

// ==========================================
// 5. CANCELLATION TOOL (PHASE 6)
// ==========================================
export const cancelGenerationTool: ToolDefinition = {
  name: 'cancel_generation',
  description: 'Cancels a pending or processing media generation task.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      taskId: {
        type: 'string',
        description: 'The generation task ID to cancel',
      },
    },
    required: ['taskId'],
  },
  execute: async (args, context) => {
    const { taskId } = args;
    const cancelled = OpenHiggsfieldMediaService.cancelTask(taskId, context.userId);
    return {
      success: cancelled,
      message: cancelled
        ? `Task ${taskId} successfully cancel ho gaya.`
        : `Task ${taskId} cancel nahi kiya ja saka (ho sakta hai pehle hi complete ya fail ho gaya ho).`,
    };
  },
};

// ==========================================
// 6. SAVE AS REEL DRAFT TOOL (PHASE 4 & 12)
// ==========================================
export const saveMediaAsReelDraftTool: ToolDefinition = {
  name: 'save_media_as_reel_draft',
  description: 'Saves a generated video or creative as a private reel draft in the user account without publishing.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      videoUrl: {
        type: 'string',
        description: 'The URL of the video file',
      },
      caption: {
        type: 'string',
        description: 'The caption or title for the reel draft',
      },
    },
    required: ['videoUrl', 'caption'],
  },
  execute: async (args, context) => {
    try {
      const { videoUrl, caption } = args;

      const draftPost = await prisma.post.create({
        data: {
          authorId: context.userId,
          caption,
          mediaUrls: videoUrl,
          mediaTypes: 'video',
          postType: 'reel',
          visibility: 'private', // Draft status: private until explicit approval
          status: 'draft',
        },
      });

      return {
        success: true,
        data: { draftId: draftPost.id, videoUrl, status: 'DRAFT_SAVED' },
        message: `Video successfully saved as private reel draft (Draft ID: ${draftPost.id}). Feed par publish nahi kiya gaya hai.`,
      };
    } catch (err: any) {
      console.error('[Tool: save_media_as_reel_draft] Error:', err);
      return { success: false, error: 'Reel draft save karne me issue aaya.' };
    }
  },
};
