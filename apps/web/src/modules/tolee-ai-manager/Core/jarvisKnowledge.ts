/**
 * Tolee AI Manager (J.A.R.V.I.S. Inspired) - Comprehensive Platform Knowledge Base
 * 
 * Contains detailed module intelligence for every feature in the Tolee ecosystem.
 */

export interface ToleeModuleKnowledge {
  id: string;
  name: string;
  category: 'Social' | 'Community' | 'Content' | 'Business' | 'Productivity' | 'Monetization' | 'System';
  description: string;
  capabilities: string[];
  guidedSteps: Record<string, string[]>;
  aiCapabilities: string[];
}

export const TOLEE_PLATFORM_KNOWLEDGE: Record<string, ToleeModuleKnowledge> = {
  feed: {
    id: 'feed',
    name: 'Tolee Home Feed',
    category: 'Social',
    description: 'The central social stream displaying posts, news, media, and community updates.',
    capabilities: ['Create posts', 'Filter by Tolee group', 'Like/Comment/Share/Repost', 'View trending posts'],
    guidedSteps: {
      create_post: [
        'Click the + Create button in the header or top bar.',
        'Choose post type (Standard Post, News, Reel, Screen).',
        'Add text content, images, videos, or AI generated media.',
        'Select target Tolee groups to distribute your post.',
        'Click Publish to post instantly.'
      ]
    },
    aiCapabilities: ['AI Post Generation', 'AI Image Post Generator', 'Hashtag Recommendation', 'Best Time to Post Prediction']
  },
  reels: {
    id: 'reels',
    name: 'Tolee Reels & Short Videos',
    category: 'Content',
    description: 'Full-screen immersive vertical short-video feed with audio tracks and engagement tools.',
    capabilities: ['Watch vertical reels', 'Upload video clips', 'AI Reel Generation', 'Soundtrack integration'],
    guidedSteps: {
      upload_reel: [
        'Click + Create and select the Reel tab.',
        'Upload your short video clip or generate one using AI Video Generator.',
        'Add a catchy caption and hashtags.',
        'Select Tolees for distribution and click Publish Reel.'
      ]
    },
    aiCapabilities: ['AI Reel Idea Generator', 'Voiceover Script Generator', 'Auto Subtitle Suggestions', 'Thumbnail Generator']
  },
  chats: {
    id: 'chats',
    name: 'Tolee Messenger & Direct Chats',
    category: 'Social',
    description: 'Real-time 1-on-1 and group messaging with media sharing, voice notes, and AI smart replies.',
    capabilities: ['Direct messaging', 'Group chats', 'Voice messaging', 'Document sharing', 'AI Smart Replies'],
    guidedSteps: {
      start_chat: [
        'Click the Chat icon in the header or sidebar.',
        'Search for a user or group contact.',
        'Click on the name to open the conversation window.'
      ]
    },
    aiCapabilities: ['AI Smart Reply Suggestions', 'Tone Rewriter (Professional, Casual, Friendly)', 'Conversation Summarizer', 'Language Translation']
  },
  tolees: {
    id: 'tolees',
    name: 'Tolee Communities & Groups',
    category: 'Community',
    description: 'Interest-based, geographic, or business community groups with member permissions and moderation.',
    capabilities: ['Create public/private Tolees', 'Invite members', 'Manage posts', 'Moderate spam', 'Member roles'],
    guidedSteps: {
      create_community: [
        'Navigate to My Tolees or Discover page.',
        'Click Create New Tolee button.',
        'Enter group name, category, description, and privacy settings (Public or Private).',
        'Upload group logo/banner and click Create Group.'
      ]
    },
    aiCapabilities: ['Auto Member Welcome', 'Spam & Harmful Content Moderation', 'Community Rules Generator', 'Engagement Booster Suggestions']
  },
  news: {
    id: 'news',
    name: 'Tolee News Studio',
    category: 'Content',
    description: 'Professional news article creation and publishing suite with SEO, AEO, and GEO optimization.',
    capabilities: ['Headline & slug generation', 'Notion-like rich article formatting', 'Category tagging', 'AEO/GEO Search Indexing'],
    guidedSteps: {
      publish_news: [
        'Go to Tolee News section and click Create Article.',
        'Enter headline, news category, and article body.',
        'AI automatically extracts SEO keywords, meta description, and slug.',
        'Click Publish News for instant sub-2s publishing.'
      ]
    },
    aiCapabilities: ['AI Journalist Rewriter', 'SEO/AEO/GEO Meta Generator', 'Fact-Check & Moderation Scan', 'Reading Time Calculator']
  },
  crm: {
    id: 'crm',
    name: 'Tolee AI CRM & Lead Manager',
    category: 'Business',
    description: 'Client relationship management system for tracking leads, pipelines, follow-ups, and customer contacts.',
    capabilities: ['Lead pipeline tracking', 'Customer profiles', 'Follow-up reminders', 'Deal stage management'],
    guidedSteps: {
      add_lead: [
        'Open AI Manager and navigate to the CRM tab.',
        'Click Add New Lead button.',
        'Fill in lead name, email, phone number, interest, and deal value.',
        'Save lead and set automated follow-up reminders.'
      ]
    },
    aiCapabilities: ['Lead Scoring', 'AI Follow-up Draft Generator', 'Overdue Follow-up Alerts', 'Customer Sentiment Analysis']
  },
  ads_manager: {
    id: 'ads_manager',
    name: 'Tolee Ads Manager',
    category: 'Monetization',
    description: 'Campaign management platform for running sponsored posts, banners, and targeted advertisements.',
    capabilities: ['Create ad campaigns', 'Target audience selection', 'Budget controls', 'Click & conversion analytics'],
    guidedSteps: {
      create_ad: [
        'Navigate to Ads Manager from the sidebar.',
        'Click Create Campaign button.',
        'Select ad objective (Reach, Leads, Sales, Traffic).',
        'Set daily budget, target demographics/Tolee groups, and upload creative.',
        'Submit campaign for instant approval.'
      ]
    },
    aiCapabilities: ['AI Ad Copy & Banner Generator', 'Audience Targeting Recommendations', 'A/B Test Suggestions', 'ROI Optimization']
  },
  marketplace: {
    id: 'marketplace',
    name: 'Tolee Local Marketplace',
    category: 'Business',
    description: 'Buy and sell goods, services, real estate, products, and local items directly inside Tolee.',
    capabilities: ['Product listings', 'Seller chat', 'Price negotiations', 'Location-based discovery'],
    guidedSteps: {
      list_item: [
        'Go to Marketplace and click Sell Item.',
        'Upload product photos, set title, category, price, and location.',
        'Publish listing to local Tolees.'
      ]
    },
    aiCapabilities: ['AI Product Description Generator', 'Optimal Price Recommender', 'Auto Seller Reply Assistant']
  },
  screen: {
    id: 'screen',
    name: 'Tolee Screen (Long Video & Watch)',
    category: 'Content',
    description: 'High-definition long-form video streaming, shows, tutorials, and masterclasses.',
    capabilities: ['Upload long-form videos', 'Channel creation', 'Playlists', 'Video search'],
    guidedSteps: {
      upload_video: [
        'Go to Tolee Screen and click Upload Video.',
        'Select MP4 video file, add title, description, and thumbnail.',
        'Set visibility and publish.'
      ]
    },
    aiCapabilities: ['AI Video Title & Description Generator', 'Auto Chapter Generator', 'Video Script Synthesizer']
  },
  calendar: {
    id: 'calendar',
    name: 'Tolee AI Content & Task Calendar',
    category: 'Productivity',
    description: 'Unified scheduling calendar for posts, events, CRM follow-ups, and personal reminders.',
    capabilities: ['Content scheduling', 'Event planning', 'Reminder alarms', 'Sync with CRM'],
    guidedSteps: {
      schedule_post: [
        'Open AI Manager Calendar tab.',
        'Click on a future date/time slot.',
        'Create post draft or task and click Schedule.'
      ]
    },
    aiCapabilities: ['Best Time Scheduler', 'Automated Content Gap Alerts', 'Event Reminder Alarms']
  },
  tasks: {
    id: 'tasks',
    name: 'Tolee AI Task Delegation Studio',
    category: 'Productivity',
    description: 'To-do list and task management engine with AI priorities and deadline tracking.',
    capabilities: ['Create tasks', 'Assign priority', 'Set due dates', 'Delegate to AI employee'],
    guidedSteps: {
      create_task: [
        'Open AI Manager Tasks tab.',
        'Type task title, set deadline, and select priority.',
        'Mark completed when done.'
      ]
    },
    aiCapabilities: ['AI Task Prioritization', 'Automatic Subtask Breakdown', 'Proactive Overdue Reminders']
  }
};
