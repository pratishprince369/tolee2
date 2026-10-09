/**
 * 🌟 Tolee Specialist Dots Architecture
 * Inspired by CopilotKit/OpenDots Specialist Dots specification.
 * Provides role-bounded, tool-authorized AI agents with isolated execution boundaries.
 */

export type SpecialistId =
  | 'general_assistant'
  | 'research_agent'
  | 'content_creator'
  | 'social_media_agent'
  | 'marketing_agent'
  | 'crm_agent'
  | 'calendar_task_agent'
  | 'community_agent'
  | 'news_research_agent'
  | 'developer_agent';

export interface SpecialistDefinition {
  id: SpecialistId;
  name: string;
  role: string;
  description: string;
  instructions: string;
  allowedTools: string[];
  temperature: number;
  maxTokens: number;
  category: 'general' | 'research' | 'creative' | 'operations' | 'technical';
}

export const TOLEE_SPECIALISTS: Record<SpecialistId, SpecialistDefinition> = {
  general_assistant: {
    id: 'general_assistant',
    name: 'Tolee General Assistant',
    role: 'General Purpose Conversational AI Coworker',
    description: 'Handles day-to-day queries, general knowledge, explanations, and advice with high speed and precision.',
    instructions: `You are Tolee General Assistant. Respond politely, concisely, and factually. Never hallucinate facts about people or places. For current facts, verify or state uncertainty.`,
    allowedTools: ['get_user_profile', 'get_schedule', 'tolee_songs_catalog'],
    temperature: 0.2,
    maxTokens: 1024,
    category: 'general',
  },

  research_agent: {
    id: 'research_agent',
    name: 'Tolee Deep Research Agent',
    role: 'Comprehensive Information Researcher & Fact-Checker',
    description: 'Investigates complex topics, summarizes articles, cross-references sources, and returns verified citations.',
    instructions: `You are Tolee Research Specialist. Prioritize primary sources, search evidence, and objective facts. Always cite verified sources and state limitations clearly.`,
    allowedTools: ['live_web_search', 'get_radar_alerts', 'get_stories'],
    temperature: 0.2,
    maxTokens: 2048,
    category: 'research',
  },

  content_creator: {
    id: 'content_creator',
    name: 'Tolee Creative Studio & Content Writer',
    role: 'High-Impact Visual & Copywriting Specialist',
    description: 'Creates marketing banners, high-converting social copy, video concepts, and graphic blueprints.',
    instructions: `You are Tolee Content Creator. Craft compelling, viral, and culturally resonant captions and creative prompts for Indian and global audiences.`,
    allowedTools: ['create_tolee_post', 'tolee_songs_catalog'],
    temperature: 0.6,
    maxTokens: 1536,
    category: 'creative',
  },

  social_media_agent: {
    id: 'social_media_agent',
    name: 'Tolee Social Media Manager',
    role: 'Feed & Engagement Manager',
    description: 'Publishes posts, analyzes audience engagement, formats feeds, and schedules social updates.',
    instructions: `You are Tolee Social Media Specialist. Assist users with creating and publishing posts. For public publishing, prepare draft details for human approval.`,
    allowedTools: ['get_user_posts', 'create_tolee_post', 'agent_reach'],
    temperature: 0.3,
    maxTokens: 1024,
    category: 'operations',
  },

  marketing_agent: {
    id: 'marketing_agent',
    name: 'Tolee Marketing & Growth Specialist',
    role: 'Ad Campaign Strategist & Budget Allocator',
    description: 'Designs targeted ad campaigns, plans ad budgets, and calculates ROI and wallet spending.',
    instructions: `You are Tolee Marketing Specialist. Structure high-converting ad campaigns. Never commit financial ad budget without explicit user confirmation.`,
    allowedTools: ['get_wallet_balance', 'agent_reach', 'create_tolee_post'],
    temperature: 0.3,
    maxTokens: 1024,
    category: 'operations',
  },

  crm_agent: {
    id: 'crm_agent',
    name: 'Tolee CRM & Leads Assistant',
    role: 'Customer Relationship & Enquiries Manager',
    description: 'Tracks customer inquiries, marketplace deals, order requests, and customer contacts.',
    instructions: `You are Tolee CRM Specialist. Organize customer enquiries and marketplace interactions professionally. Respect data privacy and security.`,
    allowedTools: ['get_marketplace_enquiries', 'get_user_profile', 'send_tolee_message'],
    temperature: 0.2,
    maxTokens: 1024,
    category: 'operations',
  },

  calendar_task_agent: {
    id: 'calendar_task_agent',
    name: 'Tolee Calendar & Task Organizer',
    role: 'Personal Productivity & Event Planner',
    description: 'Manages schedules, sets alarms and reminders, creates tasks, and organizes daily agendas.',
    instructions: `You are Tolee Calendar & Productivity Specialist. Help users organize their day, schedule events, and set timely reminders.`,
    allowedTools: ['get_schedule', 'create_reminder', 'calendar_assistant', 'email_assistant'],
    temperature: 0.2,
    maxTokens: 1024,
    category: 'operations',
  },

  community_agent: {
    id: 'community_agent',
    name: 'Tolee Community & Group Coordinator',
    role: 'Community Moderator & Group Engagement Guide',
    description: 'Finds active groups, moderates discussions, surfaces community updates, and organizes events.',
    instructions: `You are Tolee Community Specialist. Facilitate meaningful connections inside Tolee groups and local neighborhood radar hubs.`,
    allowedTools: ['get_tolee_groups', 'get_radar_alerts', 'get_stories'],
    temperature: 0.3,
    maxTokens: 1024,
    category: 'operations',
  },

  news_research_agent: {
    id: 'news_research_agent',
    name: 'Tolee Live News & Trends Analyst',
    role: 'Real-time News & Current Affairs Investigator',
    description: 'Fetches real-time Indian & global news, analyzes emerging trends, and summarizes breaking events.',
    instructions: `You are Tolee Live News Analyst. Deliver fact-checked, neutral, and up-to-the-minute news briefings with reliable citations.`,
    allowedTools: ['live_web_search', 'get_radar_alerts'],
    temperature: 0.2,
    maxTokens: 1536,
    category: 'research',
  },

  developer_agent: {
    id: 'developer_agent',
    name: 'Tolee Developer & Code Specialist',
    role: 'Technical Architect & Code Consultant',
    description: 'Writes, reviews, and debugs code across TypeScript, Python, React, and backend systems.',
    instructions: `You are Tolee Developer Specialist. Write clean, production-ready code. Follow Ponytail principles (stdlib first, shortest diff). Never execute arbitrary shell commands on production servers.`,
    allowedTools: ['live_web_search'],
    temperature: 0.2,
    maxTokens: 2048,
    category: 'technical',
  },
};

export class ToleeSpecialistRegistry {
  /**
   * Retrieves a specialist definition by ID
   */
  public static get(id: SpecialistId): SpecialistDefinition {
    return TOLEE_SPECIALISTS[id] || TOLEE_SPECIALISTS.general_assistant;
  }

  /**
   * Returns all available specialists
   */
  public static getAll(): SpecialistDefinition[] {
    return Object.values(TOLEE_SPECIALISTS);
  }

  /**
   * Dynamically selects the best specialist based on the user's message intent
   */
  public static routeSpecialist(message: string): SpecialistDefinition {
    const text = message.toLowerCase();

    // 1. Developer / Code
    if (text.includes('code') || text.includes('function') || text.includes('typescript') || text.includes('bug') || text.includes('api error') || text.includes('debug')) {
      return TOLEE_SPECIALISTS.developer_agent;
    }

    // 2. Creative / Design / Video
    if (text.includes('banner') || text.includes('poster') || text.includes('video') || text.includes('reel') || text.includes('design') || text.includes('thumbnail')) {
      return TOLEE_SPECIALISTS.content_creator;
    }

    // 3. Social Media / Post
    if (text.includes('post create') || text.includes('publish post') || text.includes('social feed') || text.includes('post dalo')) {
      return TOLEE_SPECIALISTS.social_media_agent;
    }

    // 4. Marketing / Ads / Budget
    if (text.includes('ad campaign') || text.includes('advertising') || text.includes('wallet balance') || text.includes('ad spend') || text.includes('marketing')) {
      return TOLEE_SPECIALISTS.marketing_agent;
    }

    // 5. CRM / Marketplace Leads
    if (text.includes('enquiry') || text.includes('leads') || text.includes('marketplace') || text.includes('buyer') || text.includes('customer')) {
      return TOLEE_SPECIALISTS.crm_agent;
    }

    // 6. Calendar / Task / Reminder
    if (text.includes('remind') || text.includes('reminder') || text.includes('schedule') || text.includes('meeting') || text.includes('calendar') || text.includes('task')) {
      return TOLEE_SPECIALISTS.calendar_task_agent;
    }

    // 7. Community / Groups
    if (text.includes('group') || text.includes('community') || text.includes('discussion') || text.includes('tolee join')) {
      return TOLEE_SPECIALISTS.community_agent;
    }

    // 8. Live News / Breaking Events
    if (text.includes('news') || text.includes('samachar') || text.includes('headline') || text.includes('current affairs') || text.includes('breaking')) {
      return TOLEE_SPECIALISTS.news_research_agent;
    }

    // 9. Research / Person / Deep Query
    if (text.includes('kon hai') || text.includes('who is') || text.includes('research') || text.includes('history of') || text.includes('unake bare me')) {
      return TOLEE_SPECIALISTS.research_agent;
    }

    // Default: General Assistant
    return TOLEE_SPECIALISTS.general_assistant;
  }
}
