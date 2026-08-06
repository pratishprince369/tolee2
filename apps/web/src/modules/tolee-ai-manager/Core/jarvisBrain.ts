/**
 * Tolee AI Manager (J.A.R.V.I.S. Inspired) - Intelligence Engine & Brain
 */

import { TOLEE_PLATFORM_KNOWLEDGE } from './jarvisKnowledge';
import { 
  JARVISIntent, 
  JARVISCommunicationMode, 
  PersonalCommunicationProfile, 
  ProactiveAINotification 
} from './jarvisTypes';

export class JARVISBrain {
  /**
   * Generates the Master J.A.R.V.I.S. System Prompt customized for the user context.
   */
  public static generateSystemPrompt(
    userContext?: {
      name?: string;
      businessType?: string;
      communicationProfile?: Partial<PersonalCommunicationProfile>;
    }
  ): string {
    const userName = userContext?.name || 'Sir / Ma\'am';
    const profile = userContext?.communicationProfile;
    const activeMode = profile?.activeMode || 'professional';

    return `You are Tolee AI Manager, the 24x7 Personal AI Employee and Digital Brain of the Tolee ecosystem, inspired by Tony Stark's J.A.R.V.I.S. (Just A Rather Very Intelligent System).

CORE PERSONALITY & TONE:
- You address the user respectfully as "${userName}".
- You speak with an articulate, composed, highly capable, proactive, and polite tone like J.A.R.V.I.S.
- You are not just a passive chatbot; you are an executive digital employee managing the user's content, communities, leads, ads, calendar, and tasks inside Tolee.
- Current Active Communication Profile Mode: ${activeMode.toUpperCase()}.

PLATFORM SCOPE & KNOWLEDGE:
You possess complete knowledge of all 22 Tolee platform modules:
1. Feed & Posts (Social Posts, Images, Carousels, Polls)
2. Reels & Short Videos (Scripting, Voiceover, Editing, Distribution)
3. Chats & Messenger (Smart Replies, Tone Rewriting, Conversation Summaries)
4. Tolee Communities & Groups (Moderation, Member Welcoming, Growth Strategies)
5. Tolee Search & Universal Indexing
6. Discover & Marketplace (Listings, Negotiations)
7. Tolee News (Articles, Headlines, AEO/SEO/GEO Indexing)
8. Tolee Screen (HD Long Video & Masterclasses)
9. Ads Manager (Meta, Google, Tolee Ad Campaigns)
10. AI CRM (Leads, Deal Pipelines, Follow-up Alarms)
11. Calendar & Scheduler (Content Calendar, Event Planning)
12. Tasks (AI Delegation, Priorities, Reminders)
13. Documents & AI Multi-Modal Files (Image, PDF, Voice, Video)
14. Analytics, Payments, and Member Approvals.

RULES OF ENGAGEMENT:
1. PERMISSION-BASED ACTION EXECUTION: Always ask for explicit confirmation before posting content, sending chat messages, or executing actions on behalf of ${userName}, unless trusted automation is explicitly enabled.
2. GUIDED PLATFORM STEPS: When ${userName} asks "How do I...", provide clear 1-2-3 step-by-step guidance.
3. PROACTIVE EMPLOYEE ASSISTANCE: If ${userName} seems inactive, suggest content ideas, campaign opportunities, or CRM follow-ups.
4. MULTI-MODAL CREATIVITY: Offer prompt ideas for AI image generation, ad banners, and reel video clips whenever asked.`;
  }

  /**
   * Parse user message to identify JARVIS intent and target module.
   */
  public static parseIntent(userMessage: string): JARVISIntent {
    const text = userMessage.toLowerCase().trim();

    // 1. Post Creation & Scheduling Intent
    if (text.includes('post') || text.includes('schedule') || text.includes('publish') || text.includes('caption')) {
      return {
        category: 'posting_automation',
        targetModule: 'feed',
        confidence: 0.9,
        extractedParameters: { rawText: userMessage },
        requiresConfirmation: true,
        actionPayload: {
          actionType: 'CREATE_POST_DRAFT',
          description: 'Prepare and schedule a post for selected Tolee groups.',
          payloadData: { content: userMessage }
        }
      };
    }

    // 2. Image Generation Intent
    if (text.includes('create image') || text.includes('generate poster') || text.includes('banner') || text.includes('thumbnail')) {
      return {
        category: 'image_generation',
        targetModule: 'marketplace',
        confidence: 0.95,
        extractedParameters: { prompt: userMessage },
        requiresConfirmation: false
      };
    }

    // 3. Reels & Video Intent
    if (text.includes('reel') || text.includes('script') || text.includes('video idea') || text.includes('voiceover')) {
      return {
        category: 'video_reels',
        targetModule: 'reels',
        confidence: 0.9,
        extractedParameters: { topic: userMessage },
        requiresConfirmation: false
      };
    }

    // 4. Universal Platform Search Intent
    if (text.includes('find') || text.includes('search') || text.includes('where is')) {
      return {
        category: 'universal_search',
        confidence: 0.85,
        extractedParameters: { query: userMessage },
        requiresConfirmation: false
      };
    }

    // Default general assistance
    return {
      category: 'general_chat',
      confidence: 0.7,
      extractedParameters: {},
      requiresConfirmation: false
    };
  }

  /**
   * Generates Proactive AI Employee Notifications for the user.
   */
  public static getProactiveSuggestions(): ProactiveAINotification[] {
    return [
      {
        id: 'notif-1',
        type: 'inactivity_alert',
        title: '📢 Content Calendar Alert',
        message: 'You haven\'t posted in your Real Estate Tolee group in 4 days. Would you like me to draft today\'s article?',
        actionLabel: 'Draft Article with AI',
        actionRoute: '/news',
        timestamp: 'Just now',
        priority: 'medium'
      },
      {
        id: 'notif-2',
        type: 'crm_followup',
        title: '💼 CRM Overdue Follow-up',
        message: 'You have 3 leads pending follow-up today (Rahul Sharma, Anita Desai). Shall I generate reply drafts?',
        actionLabel: 'Open CRM Follow-ups',
        actionRoute: '/ai-manager',
        timestamp: '10m ago',
        priority: 'high'
      },
      {
        id: 'notif-3',
        type: 'pending_join_requests',
        title: '👥 Community Join Requests',
        message: '5 new members requested to join your Tolee community. Click to review and approve.',
        actionLabel: 'Review Requests',
        actionRoute: '/my-tolees',
        timestamp: '1h ago',
        priority: 'low'
      }
    ];
  }
}
