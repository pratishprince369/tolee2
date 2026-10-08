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

// ==========================================
// 7. LIVE WEB SEARCH & FACT VERIFICATION SKILL
// ==========================================
import { searchLiveWeb } from '@/lib/web-search';

export const liveWebSearchTool: ToolDefinition = {
  name: 'live_web_search',
  description: 'Searches the live internet for verified real-time information, current facts, politicians, cricket/sports scores, weather, stock rates, and recent events.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Specific topic or search query to look up on the live internet.',
      },
    },
    required: ['query'],
  },
  execute: async (args) => {
    try {
      const q = (args?.query || '').trim();
      if (!q) {
        return { success: false, error: 'Search query is required.' };
      }
      const snippets = await searchLiveWeb(q, 4);
      if (!snippets || snippets.trim().length === 0) {
        return {
          success: true,
          data: { query: q, snippets: 'No immediate internet search results found.' },
          message: `Internet par "${q}" se sambandhit turant koi naya lekh nahi mila.`,
        };
      }
      return {
        success: true,
        data: { query: q, snippets },
        message: `Verified live internet facts retrieved for "${q}".`,
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Web search failed.' };
    }
  },
};

// ==========================================
// 8. AGENT-REACH WEB & PLATFORM READER SKILL
// ==========================================
import { AgentReachConnector } from '@/lib/ai-gateway/agent-reach';

export const agentReachTool: ToolDefinition = {
  name: 'agent_reach_reader',
  description: 'Reads public webpages, YouTube videos, GitHub repositories, and Reddit discussions using Agent-Reach connector.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['auto', 'web', 'youtube', 'github', 'reddit'],
        description: 'Target platform to inspect. Use "auto" to let Agent-Reach detect from link/text.',
      },
      target: {
        type: 'string',
        description: 'URL, GitHub repo slug (owner/repo), YouTube link/title, or subreddit/topic.',
      },
    },
    required: ['target'],
  },
  execute: async (args) => {
    try {
      const { type = 'auto', target } = args;
      if (type === 'github') {
        const res = await AgentReachConnector.inspectGitHub(target);
        return { success: res.success, data: res.data, message: res.summary, error: res.error };
      }
      if (type === 'youtube') {
        const res = await AgentReachConnector.inspectYouTube(target);
        return { success: res.success, data: res.data, message: res.summary, error: res.error };
      }
      if (type === 'reddit') {
        const res = await AgentReachConnector.inspectReddit(target);
        return { success: res.success, data: res.data, message: res.summary, error: res.error };
      }
      if (type === 'auto') {
        const res = await AgentReachConnector.smartReach(target);
        if (res) {
          return { success: res.success, data: res.data, message: res.summary, error: res.error };
        }
      }
      const res = await AgentReachConnector.readWebPage(target);
      return { success: res.success, data: res.data, message: res.summary, error: res.error };
    } catch (err: any) {
      return { success: false, error: err.message || 'Agent-Reach execution failed.' };
    }
  },
};

// ==========================================
// 9. TOLEE SONGS MUSIC AGENT SKILL
// ==========================================
import { searchToleeMusic } from '@/lib/toleeMusicApi';

export const toleeSongsTool: ToolDefinition = {
  name: 'tolee_songs_control',
  description: 'Searches songs, albums, and artists on Tolee Music and triggers audio playback.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['play', 'search', 'pause'],
        description: 'Playback or search action.',
      },
      query: {
        type: 'string',
        description: 'Song name, movie, or artist to search or play.',
      },
    },
    required: ['action', 'query'],
  },
  execute: async (args) => {
    try {
      const { action, query } = args;
      const results = await searchToleeMusic(query || '');
      if (!results || results.length === 0) {
        return {
          success: true,
          data: { songs: [] },
          message: `Tolee Songs par "${query}" nahi mila.`,
        };
      }
      const topSong = results[0];
      return {
        success: true,
        data: {
          action,
          song: topSong,
          allResults: results.slice(0, 3).map(s => ({ id: s.id, title: s.title, artist: s.artist })),
        },
        message: `🎵 **Tolee Songs**: "${topSong.title}" by ${topSong.artist} play kar diya gaya hai.`,
      };
    } catch (err: any) {
      return { success: false, error: 'Song play karne me issue aaya.' };
    }
  },
};

// ==========================================
// 10. CALENDAR AGENT SKILL
// ==========================================
export const calendarAssistantTool: ToolDefinition = {
  name: 'calendar_assistant',
  description: 'Queries schedule agenda or creates a calendar event meeting.',
  riskLevel: 'LOW',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['list', 'create'],
        description: 'List agenda or create event.',
      },
      title: {
        type: 'string',
        description: 'Event or meeting title.',
      },
      dateISO: {
        type: 'string',
        description: 'ISO-8601 date string for meeting.',
      },
    },
    required: ['action'],
  },
  execute: async (args, context) => {
    try {
      if (args.action === 'create' && args.title && args.dateISO) {
        const eventDate = new Date(args.dateISO);
        const task = await prisma.aITask.create({
          data: {
            userId: context.userId,
            title: `📅 ${args.title}`,
            status: 'pending',
            priority: 'normal',
            category: 'calendar',
            dueDate: isNaN(eventDate.getTime()) ? new Date() : eventDate,
          },
        });
        return {
          success: true,
          data: { eventId: task.id, title: task.title, date: task.dueDate },
          message: `📅 Calendar event "${args.title}" successfully schedule kar diya gaya hai for ${task.dueDate?.toLocaleString('en-IN')}.`,
        };
      }

      const tasks = await prisma.aITask.findMany({
        where: { userId: context.userId, category: 'calendar' },
        take: 5,
        orderBy: { dueDate: 'asc' },
      });

      return {
        success: true,
        data: { events: tasks },
        message: tasks.length > 0
          ? `Aapke calendar me ${tasks.length} upcoming meetings hain.`
          : 'Aapke calendar me koi pending meeting scheduled nahi hai.',
      };
    } catch (err: any) {
      return { success: false, error: 'Calendar service unavailable.' };
    }
  },
};

// ==========================================
// 11. EMAIL ASSISTANT SKILL
// ==========================================
import { sendEmail } from '@/lib/email';

export const emailAssistantTool: ToolDefinition = {
  name: 'email_assistant',
  description: 'Reads recent email logs, drafts a reply, or sends an email with required confirmation.',
  riskLevel: 'MEDIUM',
  parameters: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['read', 'draft', 'send'],
        description: 'Read recent emails, create draft, or send email.',
      },
      to: {
        type: 'string',
        description: 'Recipient email address.',
      },
      subject: {
        type: 'string',
        description: 'Email subject.',
      },
      content: {
        type: 'string',
        description: 'Email content or draft message.',
      },
    },
    required: ['action'],
  },
  execute: async (args, context) => {
    try {
      if (args.action === 'send') {
        if (!args.to || !args.content) {
          return { success: false, error: 'Recipient and content are required to send email.' };
        }
        await sendEmail(args.to, args.subject || 'Message from Tolee', `<p>${args.content}</p>`, 'feedback');
        return {
          success: true,
          data: { to: args.to, subject: args.subject },
          message: `✉️ Email successfully sent to **${args.to}**.`,
        };
      }

      if (args.action === 'draft') {
        return {
          success: true,
          data: { to: args.to, subject: args.subject, content: args.content },
          message: `✉️ **Email Draft Ready**:\n**To:** ${args.to || '[Recipient]'}\n**Subject:** ${args.subject || 'Update'}\n**Body:**\n> "${args.content}"\n\nKya main ise send karu?`,
        };
      }

      // Read recent logs
      const logs = await prisma.emailLog.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      return {
        success: true,
        data: { recentLogs: logs },
        message: logs.length > 0
          ? `Aapke recent email records check kiye gaye (${logs.length} entries found).`
          : 'Koi unread email notice nahi hai.',
      };
    } catch (err: any) {
      return { success: false, error: 'Email service check failed.' };
    }
  },
};

