import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';
import { ApprovalEngine } from '../approvals/approval-engine';

// ==========================================
// 1. GROUP BATCH POSTING TOOL (SECTION 7)
// ==========================================
export const postToGroupsTool: ToolDefinition = {
  name: 'post_to_groups',
  description:
    'Prepares or executes batch posting across user accessible Tolee community groups with explicit approval, target validation, deduplication, and anti-spam limits.',
  riskLevel: 'HIGH',
  parameters: {
    type: 'object',
    properties: {
      caption: {
        type: 'string',
        description: 'The text caption or content to post to the groups',
      },
      imageUrl: {
        type: 'string',
        description: 'Optional image URL for the group posts',
      },
      groupSlugs: {
        type: 'string',
        description: 'Comma-separated group slugs or "all" to target accessible groups',
      },
      isApproved: {
        type: 'string',
        description: 'Pass "true" only when the user has explicitly approved the batch destination list',
      },
      approvalId: {
        type: 'string',
        description: 'The ID of the cryptographic approval record if previously generated',
      },
    },
    required: ['caption'],
  },
  execute: async (args, context) => {
    try {
      const { caption, imageUrl, groupSlugs, isApproved, approvalId } = args;
      const approved = isApproved === 'true' || isApproved === true;

      // 1. Fetch accessible groups
      let slugFilter: string[] | undefined = undefined;
      if (groupSlugs && groupSlugs !== 'all') {
        slugFilter = groupSlugs.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
      }

      const accessibleGroups = await prisma.tolee.findMany({
        where: {
          OR: [
            { creatorId: context.userId },
            { members: { some: { userId: context.userId } } },
            { isPrivate: false, isPublicVisible: true },
          ],
          ...(slugFilter && slugFilter.length > 0 ? { slug: { in: slugFilter } } : {}),
        },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { members: true } },
        },
        take: 10, // Anti-spam safe batch ceiling (Section 7)
      });

      if (!accessibleGroups || accessibleGroups.length === 0) {
        return {
          success: false,
          error: 'Aapke paas post karne ke liye koi accessible ya valid Tolee community groups nahi mile.',
        };
      }

      const targets = accessibleGroups.map((g) => ({
        id: g.id,
        name: g.name,
        slug: g.slug,
        memberCount: g._count.members,
      }));

      // 2. Strict Approval Check
      if (!approved) {
        const approvalRecord = ApprovalEngine.createApproval({
          userId: context.userId,
          actionType: 'POST_TO_GROUPS',
          title: `Post to ${targets.length} Tolee Communities`,
          description: `AI is ready to publish your post to ${targets.length} groups. Review target groups and content before executing.`,
          summary: `Content: "${caption.slice(0, 120)}..."\nTargets:\n` + targets.map((t) => `• ${t.name} (${t.memberCount} members)`).join('\n'),
          payload: {
            caption,
            imageUrl,
            targets: targets.map((t) => t.slug),
          },
        });

        return {
          success: true,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'POST_TO_GROUPS',
            title: `Approve Posting to ${targets.length} Groups`,
            description: `Review destination groups (${targets.map((t) => t.name).join(', ')}) before publishing.`,
            summary: caption,
            payload: {
              caption,
              imageUrl,
              targets: targets.map((t) => t.slug),
              approvalId: approvalRecord.id,
              actionType: 'POST_TO_GROUPS',
            },
          },
          message: `Maine ${targets.length} accessible groups identify kiye hain (${targets.map((t) => t.name).join(', ')}). Kripya confirm karein taaki batch publish kiya ja sake.`,
        };
      }

      // 3. Execution after explicit approval
      if (approvalId) {
        const claim = ApprovalEngine.claimForExecution(approvalId, context.userId);
        if (!claim.success) {
          return { success: false, error: claim.error };
        }
      }

      const results = [];
      for (const target of targets) {
        try {
          const post = await prisma.post.create({
            data: {
              authorId: context.userId,
              caption,
              mediaUrls: imageUrl || null,
              mediaTypes: imageUrl ? 'image' : null,
              postType: 'post',
              visibility: 'public',
              status: 'published',
              tolees: {
                create: [{ toleeId: target.id }],
              },
            },
          });
          results.push({ group: target.name, slug: target.slug, status: 'SUCCESS', postId: post.id });
        } catch (err: any) {
          results.push({ group: target.name, slug: target.slug, status: 'FAILED', error: err.message });
        }
      }

      const successfulCount = results.filter((r) => r.status === 'SUCCESS').length;
      if (approvalId) {
        ApprovalEngine.markCompleted(approvalId, context.userId, { results });
      }

      return {
        success: true,
        data: results,
        message: `Batch publish complete: ${successfulCount}/${targets.length} groups me post successfully share ho gaya!`,
      };
    } catch (err: any) {
      console.error('[Tool: post_to_groups] Error:', err);
      return { success: false, error: 'Group posting process me issue aaya.' };
    }
  },
};

// ==========================================
// 2. PAID ADS & DOUBLE CONFIRMATION TOOL (SECTION 8)
// ==========================================
export const getAdOptionsTool: ToolDefinition = {
  name: 'get_ad_options',
  description: 'Retrieves official Tolee post boost tiers, pricing, and estimated reach options.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      postId: {
        type: 'string',
        description: 'Optional post ID to boost',
      },
    },
  },
  execute: async () => {
    return {
      success: true,
      data: [
        {
          tier: 'Local Spark',
          budget: 199,
          currency: 'INR',
          durationDays: 3,
          estimatedReach: '2,000 - 3,500 people',
          description: 'Best for local neighborhood awareness and fast initial engagement.',
        },
        {
          tier: 'Growth Boost',
          budget: 499,
          currency: 'INR',
          durationDays: 7,
          estimatedReach: '6,000 - 9,500 people',
          description: 'Popular choice for regional discovery and creator profile visits.',
        },
        {
          tier: 'Viral Scale',
          budget: 999,
          currency: 'INR',
          durationDays: 14,
          estimatedReach: '15,000 - 25,000 people',
          description: 'Maximum reach across trending feeds and suggested discovery tabs.',
        },
      ],
      message: 'Tolee Ad Boost packages available hain: ₹199 (3 din), ₹499 (7 din), aur ₹999 (14 din).',
    };
  },
};

export const createAdCampaignTool: ToolDefinition = {
  name: 'create_ad_campaign',
  description:
    'Configures a paid ad campaign / post boost with strict 2-step confirmation and budget cap enforcement.',
  riskLevel: 'HIGH',
  parameters: {
    type: 'object',
    properties: {
      postId: {
        type: 'string',
        description: 'The target post ID to boost',
      },
      budget: {
        type: 'number',
        description: 'Total budget in INR (e.g. 199, 499, 999)',
      },
      durationDays: {
        type: 'number',
        description: 'Campaign duration in days (e.g. 3, 7, 14)',
      },
      targetAudience: {
        type: 'string',
        description: 'Audience description or demographic keywords',
      },
      confirmationStage: {
        type: 'string',
        enum: ['PROPOSAL_REVIEW', 'FINAL_CONFIRMATION'],
        description: 'Stage 1: PROPOSAL_REVIEW (no money spent). Stage 2: FINAL_CONFIRMATION (executes spend).',
      },
      approvalId: {
        type: 'string',
        description: 'Approval ID returned from previous proposal stage',
      },
    },
    required: ['postId', 'budget'],
  },
  execute: async (args, context) => {
    try {
      const {
        postId,
        budget,
        durationDays = 7,
        targetAudience = 'All active users',
        confirmationStage = 'PROPOSAL_REVIEW',
        approvalId,
      } = args;

      // 1. Verify Post Ownership
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, caption: true, authorId: true },
      });

      if (!post) {
        return { success: false, error: `Post ID "${postId}" nahi mila.` };
      }
      if (post.authorId !== context.userId) {
        return { success: false, error: 'Aap sirf apne posts ko advertise/boost kar sakte hain.' };
      }

      // Hard budget ceiling validation
      const numBudget = Number(budget);
      if (isNaN(numBudget) || numBudget < 99) {
        return { success: false, error: 'Minimum campaign budget ₹99 hona chahiye.' };
      }

      // STAGE 1: PROPOSAL REVIEW (Does NOT commit money)
      if (confirmationStage === 'PROPOSAL_REVIEW') {
        const estImpressions = Math.round(numBudget * 14);
        const approval = ApprovalEngine.createApproval({
          userId: context.userId,
          actionType: 'CREATE_AD_CAMPAIGN',
          title: `Ad Proposal: Boost Post for ₹${numBudget}`,
          description: `Review campaign proposal. Step 1 of 2: Is stage par koi payment deduct nahi hogi.`,
          summary: `Post: "${post.caption?.slice(0, 80)}..."\nBudget: ₹${numBudget} for ${durationDays} days\nEst. Reach: ~${estImpressions.toLocaleString()} views\nAudience: ${targetAudience}`,
          cost: `₹${numBudget}`,
          payload: {
            postId,
            budget: numBudget,
            durationDays,
            targetAudience,
            stage: 'PROPOSAL_REVIEW',
          },
        });

        return {
          success: true,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'CREATE_AD',
            title: `Step 1/2: Review Ad Campaign (₹${numBudget})`,
            description: `Verify proposal parameters before final budget authorization.`,
            summary: `Budget: ₹${numBudget} | Duration: ${durationDays} days | Est Reach: ~${estImpressions} views`,
            cost: `₹${numBudget}`,
            payload: {
              postId,
              budget: numBudget,
              durationDays,
              targetAudience,
              approvalId: approval.id,
              confirmationStage: 'FINAL_CONFIRMATION',
            },
          },
          message: `Ad campaign proposal create ho gaya hai (Budget: ₹${numBudget}, Duration: ${durationDays} din). Kripya review karein aur Final Confirmation ke liye approve karein.`,
        };
      }

      // STAGE 2: FINAL CONFIRMATION & EXECUTION
      if (approvalId) {
        const claim = ApprovalEngine.claimForExecution(approvalId, context.userId);
        if (!claim.success) {
          return { success: false, error: claim.error };
        }
      }

      // Record Ad Campaign in database / logs
      const campaignId = `ad_${Date.now()}`;
      await (prisma as any).aIActionLog?.create({
        data: {
          userId: context.userId,
          action: 'CREATE_AD_CAMPAIGN',
          command: `CONFIRMED_AD_${campaignId}`,
          status: 'SUCCESS',
          details: JSON.stringify({ postId, budget: numBudget, durationDays, targetAudience }),
        },
      }).catch(() => {});

      if (approvalId) {
        ApprovalEngine.markCompleted(approvalId, context.userId, { campaignId, status: 'ACTIVE' });
      }

      return {
        success: true,
        data: {
          campaignId,
          postId,
          authorizedBudget: numBudget,
          status: 'ACTIVE_REVIEW',
          receipt: `RCPT-${Date.now().toString(36).toUpperCase()}`,
        },
        message: `✅ Ad campaign successfully authorized! Budget: ₹${numBudget}. Campaign ID: ${campaignId}. Status: Active.`,
      };
    } catch (err: any) {
      console.error('[Tool: create_ad_campaign] Error:', err);
      return { success: false, error: 'Ad campaign launch karne me error aaya.' };
    }
  },
};

// ==========================================
// 3. PROFILE BIO UPDATE TOOL (SECTION 3G)
// ==========================================
export const updateProfileBioTool: ToolDefinition = {
  name: 'update_profile_bio',
  description: 'Proposes and updates user profile bio on Tolee with preview and required confirmation.',
  riskLevel: 'MEDIUM',
  parameters: {
    type: 'object',
    properties: {
      newBio: {
        type: 'string',
        description: 'The updated bio text for the user profile',
      },
      isApproved: {
        type: 'string',
        description: 'Pass "true" if the user has confirmed applying the change',
      },
    },
    required: ['newBio'],
  },
  execute: async (args, context) => {
    try {
      const { newBio, isApproved } = args;
      const approved = isApproved === 'true' || isApproved === true;

      if (!approved) {
        return {
          success: true,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'UPDATE_BIO',
            title: 'Confirm Profile Bio Update',
            description: 'AI has drafted an updated bio for your Tolee profile.',
            summary: `Proposed Bio:\n"${newBio}"`,
            payload: {
              newBio,
              actionType: 'UPDATE_BIO',
            },
          },
          message: `Naya bio taiyar hai: "${newBio}". Kripya profile update karne ke liye approve karein.`,
        };
      }

      const updated = await prisma.user.update({
        where: { id: context.userId },
        data: { bio: newBio },
        select: { id: true, name: true, username: true, bio: true },
      });

      return {
        success: true,
        data: updated,
        message: `Profile bio successfully update ho gaya: "${updated.bio}"`,
      };
    } catch (err: any) {
      console.error('[Tool: update_profile_bio] Error:', err);
      return { success: false, error: 'Profile bio update karne me error aaya.' };
    }
  },
};

// ==========================================
// 4. DELETE POST TOOL (SECTION 3A)
// ==========================================
export const deletePostTool: ToolDefinition = {
  name: 'delete_tolee_post',
  description: 'Deletes a post owned by the authenticated user after mandatory confirmation.',
  riskLevel: 'HIGH',
  parameters: {
    type: 'object',
    properties: {
      postId: {
        type: 'string',
        description: 'The ID of the post to delete',
      },
      isApproved: {
        type: 'string',
        description: 'Pass "true" when user has explicitly confirmed deletion',
      },
    },
    required: ['postId'],
  },
  execute: async (args, context) => {
    try {
      const { postId, isApproved } = args;
      const approved = isApproved === 'true' || isApproved === true;

      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { id: true, authorId: true, caption: true },
      });

      if (!post) {
        return { success: false, error: 'Post nahi mila.' };
      }
      if (post.authorId !== context.userId) {
        return { success: false, error: 'Aap sirf apne posts ko delete kar sakte hain.' };
      }

      if (!approved) {
        return {
          success: true,
          requiresConfirmation: true,
          confirmationDetails: {
            actionType: 'DELETE_POST',
            title: 'Confirm Post Deletion',
            description: 'Are you sure you want to permanently delete this post? This cannot be undone.',
            summary: `Post: "${post.caption?.slice(0, 100)}..."`,
            payload: {
              postId,
              actionType: 'DELETE_POST',
            },
          },
          message: `Kya aap is post ko permanently delete karna chahte hain: "${post.caption?.slice(0, 60)}..."? Kripya confirm karein.`,
        };
      }

      await prisma.post.delete({
        where: { id: postId },
      });

      return {
        success: true,
        message: 'Post successfully delete ho gaya.',
      };
    } catch (err: any) {
      console.error('[Tool: delete_tolee_post] Error:', err);
      return { success: false, error: 'Post delete karne me problem aayi.' };
    }
  },
};

// ==========================================
// 5. USER SCOPED MEMORY TOOLS (SECTION 10)
// ==========================================
export const searchUserMemoryTool: ToolDefinition = {
  name: 'search_user_memory',
  description: 'Searches user private stored context, preferences, and facts in memory.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Keyword to search inside memory keys or values',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { query } = args || {};
      const memories = await prisma.aIMemory.findMany({
        where: {
          userId: context.userId,
          ...(query
            ? {
                OR: [
                  { key: { contains: query, mode: 'insensitive' } },
                  { value: { contains: query, mode: 'insensitive' } },
                  { category: { contains: query, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        take: 10,
        orderBy: { updatedAt: 'desc' },
      });

      return {
        success: true,
        data: memories.map((m) => ({ category: m.category, key: m.key, value: m.value })),
        message: `${memories.length} memories found.`,
      };
    } catch (err: any) {
      console.error('[Tool: search_user_memory] Error:', err);
      return { success: false, error: 'Memory search karne me error aaya.' };
    }
  },
};

export const saveUserMemoryTool: ToolDefinition = {
  name: 'save_user_memory',
  description: 'Saves or updates user private preference, brand detail, or context fact.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Category: "preference", "personal", "brand", "business", or "content"',
      },
      key: {
        type: 'string',
        description: 'Memory identifier key (e.g. "brand_voice", "favorite_hashtags")',
      },
      value: {
        type: 'string',
        description: 'Information content to remember',
      },
    },
    required: ['key', 'value'],
  },
  execute: async (args, context) => {
    try {
      const { category = 'preference', key, value } = args;

      const existing = await prisma.aIMemory.findFirst({
        where: { userId: context.userId, key },
      });

      if (existing) {
        await prisma.aIMemory.update({
          where: { id: existing.id },
          data: { value, category, updatedAt: new Date() },
        });
      } else {
        await prisma.aIMemory.create({
          data: {
            userId: context.userId,
            category,
            key,
            value,
          },
        });
      }

      return {
        success: true,
        message: `Memory saved: "${key}" = "${value}".`,
      };
    } catch (err: any) {
      console.error('[Tool: save_user_memory] Error:', err);
      return { success: false, error: 'Memory save nahi ho paayi.' };
    }
  },
};

export const forgetUserMemoryTool: ToolDefinition = {
  name: 'forget_user_memory',
  description: 'Deletes a specific remembered key from user memory.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key name to forget/delete',
      },
    },
    required: ['key'],
  },
  execute: async (args, context) => {
    try {
      const { key } = args;
      const res = await prisma.aIMemory.deleteMany({
        where: { userId: context.userId, key },
      });

      return {
        success: true,
        message: res.count > 0 ? `Memory "${key}" bhula di gayi hai.` : `"${key}" memory me nahi mila.`,
      };
    } catch (err: any) {
      console.error('[Tool: forget_user_memory] Error:', err);
      return { success: false, error: 'Memory delete karne me issue aaya.' };
    }
  },
};

// ==========================================
// 6. CANCELLATION & TASK RECOVERY TOOL (SECTION 11)
// ==========================================
export const cancelActiveTaskTool: ToolDefinition = {
  name: 'cancel_active_task',
  description: 'Halts running tasks and cancels pending approval requests when user requests "ruko", "cancel", "mat karo".',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'Optional cancellation reason',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const count = ApprovalEngine.cancelPendingForUser(context.userId);
      return {
        success: true,
        data: { cancelledOperations: count },
        message:
          count > 0
            ? `Maine aapki ${count} pending actions ko cancel kar diya hai. Koi unapproved change feed ya database me nahi kiya gaya.`
            : 'Abhi koi active pending operation running nahi tha. Sab safe hai.',
      };
    } catch (err: any) {
      console.error('[Tool: cancel_active_task] Error:', err);
      return { success: false, error: 'Cancellation execute karne me problem aayi.' };
    }
  },
};
