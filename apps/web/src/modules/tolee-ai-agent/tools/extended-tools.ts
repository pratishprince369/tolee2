import { prisma } from '@/lib/prisma';
import { ToolDefinition } from './types';

// ==========================================
// 1. USER PROFILE TOOL (READ)
// ==========================================
export const getUserProfileTool: ToolDefinition = {
  name: 'get_user_profile',
  description: 'Fetches real profile details, stats, verified status, and bio of the authenticated user or another user.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      username: {
        type: 'string',
        description: 'Optional username to look up. If omitted, returns current user profile.',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const targetUsername = args?.username?.trim();
      const user = await prisma.user.findFirst({
        where: targetUsername
          ? { username: { equals: targetUsername, mode: 'insensitive' } }
          : { id: context.userId },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          bio: true,
          avatar: true,
          isVerified: true,
          isCreator: true,
          createdAt: true,
          _count: {
            select: {
              posts: true,
              followers: true,
              following: true,
              stories: true,
            },
          },
        },
      });

      if (!user) {
        return {
          success: false,
          error: targetUsername
            ? `User "${targetUsername}" Tolee par nahi mila.`
            : 'User profile retrieve nahi ho paya.',
        };
      }

      return {
        success: true,
        data: {
          id: user.id,
          name: user.name || user.username,
          username: user.username,
          bio: user.bio || '',
          isVerified: user.isVerified,
          isCreator: user.isCreator,
          postsCount: user._count.posts,
          followersCount: user._count.followers,
          followingCount: user._count.following,
          storiesCount: user._count.stories,
          memberSince: user.createdAt,
        },
        message: `Profile data: ${user.name || user.username} (@${user.username}) - ${user._count.followers} followers, ${user._count.posts} posts.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_user_profile] Error:', err);
      return { success: false, error: 'Profile retrieve karne me problem aayi.' };
    }
  },
};

// ==========================================
// 2. RADAR ALERTS & LOCAL UPDATES TOOL (READ)
// ==========================================
export const getRadarAlertsTool: ToolDefinition = {
  name: 'get_radar_alerts',
  description: 'Fetches real local neighborhood radar updates, urgent alerts, secret food, local news, and deals.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'Filter category: "Alerts", "Secret Food", "Local News", "Deals & Offers", or "all"',
      },
      limit: {
        type: 'number',
        description: 'Number of radar listings to retrieve (default 5)',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { category, limit = 5 } = args || {};
      const now = new Date();

      const whereClause: any = {
        status: 'published',
        expiresAt: { gt: now },
      };

      if (category && category.toLowerCase() !== 'all') {
        whereClause.category = { contains: category, mode: 'insensitive' };
      }

      const radarPosts = await prisma.radarPost.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          content: true,
          category: true,
          locationName: true,
          expiresAt: true,
          createdAt: true,
          author: { select: { name: true, username: true } },
        },
      });

      if (!radarPosts || radarPosts.length === 0) {
        return {
          success: true,
          data: [],
          message: category
            ? `Abhi ${category} category me koi active radar update nahi hai.`
            : 'Aapke area me abhi koi active radar alert nahi mila.',
        };
      }

      const formatted = radarPosts.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content,
        category: r.category,
        location: r.locationName || 'Local Neighborhood',
        author: r.author?.name || r.author?.username || 'Neighbor',
        expiresAt: r.expiresAt,
      }));

      return {
        success: true,
        data: formatted,
        message: `${formatted.length} active neighborhood radar updates mile hain.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_radar_alerts] Error:', err);
      return { success: false, error: 'Radar posts fetch karne me issue aaya.' };
    }
  },
};

// ==========================================
// 3. TOLEE STORIES TOOL (READ)
// ==========================================
export const getStoriesTool: ToolDefinition = {
  name: 'get_active_stories',
  description: 'Fetches active stories posted by the user or their network on Tolee (within 24 hours).',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      onlyOwn: {
        type: 'boolean',
        description: 'Set to true to check only current user active stories',
      },
      limit: {
        type: 'number',
        description: 'Max stories to retrieve (default 5)',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { onlyOwn = false, limit = 5 } = args || {};
      const now = new Date();

      const stories = await prisma.story.findMany({
        where: {
          expiresAt: { gt: now },
          ...(onlyOwn ? { authorId: context.userId } : {}),
        },
        include: {
          author: { select: { id: true, name: true, username: true, avatar: true } },
          _count: { select: { views: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      if (!stories || stories.length === 0) {
        return {
          success: true,
          data: [],
          message: onlyOwn
            ? 'Aapne abhi tak koi active story nahi daali hai.'
            : 'Abhi feed par koi nayi active story nahi hai.',
        };
      }

      const formatted = stories.map((s: any) => ({
        id: s.id,
        author: s.author.name || s.author.username,
        isOwn: s.authorId === context.userId,
        caption: s.caption || '',
        mediaType: s.mediaType,
        mediaUrl: s.mediaUrl,
        viewsCount: s._count.views,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
      }));

      return {
        success: true,
        data: formatted,
        message: `${formatted.length} active stories mili hain.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_active_stories] Error:', err);
      return { success: false, error: 'Stories retrieve karne me error aaya.' };
    }
  },
};

// ==========================================
// 4. TOLEE WALLET & EARNINGS TOOL (READ)
// ==========================================
export const getWalletBalanceTool: ToolDefinition = {
  name: 'get_wallet_balance',
  description: 'Checks the user credit wallet balance, reward earnings, and withdrawal status.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {},
  },
  execute: async (args, context) => {
    try {
      const wallet = await prisma.creditWallet.findUnique({
        where: { userId: context.userId },
        select: {
          balance: true,
          lockedBalance: true,
          lifetimeEarnings: true,
          isBlocked: true,
        },
      });

      if (!wallet) {
        return {
          success: true,
          data: {
            balance: 0,
            lockedBalance: 0,
            lifetimeEarnings: 0,
          },
          message: 'Aapka Tolee Credit Wallet balance ₹0 hai.',
        };
      }

      return {
        success: true,
        data: {
          balance: wallet.balance,
          lockedBalance: wallet.lockedBalance,
          lifetimeEarnings: wallet.lifetimeEarnings,
        },
        message: `Aapka current wallet balance ₹${wallet.balance} hai (Lifetime earnings: ₹${wallet.lifetimeEarnings}).`,
      };
    } catch (err: any) {
      console.error('[Tool: get_wallet_balance] Error:', err);
      return { success: false, error: 'Wallet balance fetch nahi ho saka.' };
    }
  },
};

// ==========================================
// 5. SCHEDULE, TASKS & REMINDERS TOOL (READ & WRITE)
// ==========================================
export const getScheduleTool: ToolDefinition = {
  name: 'get_daily_schedule',
  description: 'Fetches user pending tasks, reminders, and daily planner schedule from database.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Filter: "pending", "completed", or "all"',
      },
    },
  },
  execute: async (args, context) => {
    try {
      const { status = 'pending' } = args || {};

      const [tasks, reminders] = await Promise.all([
        prisma.aITask.findMany({
          where: {
            userId: context.userId,
            ...(status !== 'all' ? { status } : {}),
          },
          orderBy: { dueDate: 'asc' },
          take: 5,
        }),
        prisma.aIReminder.findMany({
          where: {
            userId: context.userId,
            isDismissed: false,
            ...(status === 'pending' ? { status: { in: ['PENDING', 'SNOOZED'] } } : {}),
          },
          orderBy: { remindAt: 'asc' },
          take: 5,
        }),
      ]);

      return {
        success: true,
        data: {
          tasks: tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority })),
          reminders: reminders.map(r => ({ id: r.id, title: r.title, remindAt: r.remindAt, recurrence: r.recurrence })),
        },
        message: `${tasks.length} pending tasks aur ${reminders.length} reminders hain.`,
      };
    } catch (err: any) {
      console.error('[Tool: get_daily_schedule] Error:', err);
      return { success: false, error: 'Schedule data fetch karne me error aaya.' };
    }
  },
};

export const createReminderTool: ToolDefinition = {
  name: 'create_ai_reminder',
  description: 'Sets a real scheduled reminder/alarm in the database for the user.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Title of the reminder (e.g. "Call Client", "Gym time")',
      },
      remindAtISO: {
        type: 'string',
        description: 'Exact ISO-8601 timestamp for when to remind (e.g. 2026-10-07T09:00:00Z)',
      },
      recurrence: {
        type: 'string',
        description: 'Optional recurrence: "daily", "weekly", "monthly", or null',
      },
    },
    required: ['title', 'remindAtISO'],
  },
  execute: async (args, context) => {
    try {
      const { title, remindAtISO, recurrence } = args;
      const remindDate = new Date(remindAtISO);

      if (isNaN(remindDate.getTime())) {
        return { success: false, error: 'Invalid remind time format provided.' };
      }

      const reminder = await prisma.aIReminder.create({
        data: {
          userId: context.userId,
          title,
          type: 'alarm',
          remindAt: remindDate,
          timeZone: 'Asia/Kolkata',
          status: 'PENDING',
          isRecurring: Boolean(recurrence),
          recurrence: recurrence || null,
          isDismissed: false,
        },
      });

      return {
        success: true,
        data: {
          reminderId: reminder.id,
          title: reminder.title,
          remindAt: reminder.remindAt,
        },
        message: `Reminder "${reminder.title}" schedule kar diya gaya hai for ${reminder.remindAt.toLocaleString('en-IN')}.`,
      };
    } catch (err: any) {
      console.error('[Tool: create_ai_reminder] Error:', err);
      return { success: false, error: 'Reminder create karne me issue aaya.' };
    }
  },
};
