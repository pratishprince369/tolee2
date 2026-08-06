/**
 * Tolee AI Manager (J.A.R.V.I.S. Inspired) - Types & Schemas
 */

export type JARVISCommunicationMode = 
  | 'professional'
  | 'friendly'
  | 'business'
  | 'family'
  | 'marketing'
  | 'short_reply'
  | 'long_reply';

export interface PersonalCommunicationProfile {
  userId: string;
  writingStyle: string;
  preferredLanguage: string;
  emojiUsage: 'frequent' | 'moderate' | 'minimal' | 'none';
  tone: 'formal' | 'casual' | 'enthusiastic' | 'direct' | 'persuasive';
  frequentlyUsedPhrases: string[];
  greetingStyle: string;
  activeMode: JARVISCommunicationMode;
  permissionGranted: boolean;
  learningEnabled: boolean;
  trustedAutomationEnabled: boolean;
}

export type JARVISIntentCategory = 
  | 'content_creation'
  | 'image_generation'
  | 'video_reels'
  | 'posting_automation'
  | 'community_management'
  | 'chat_assistant'
  | 'comment_assistant'
  | 'universal_search'
  | 'ads_manager'
  | 'business_growth'
  | 'platform_guided_help'
  | 'general_chat';

export interface JARVISIntent {
  category: JARVISIntentCategory;
  targetModule?: string;
  confidence: number;
  extractedParameters: Record<string, any>;
  requiresConfirmation: boolean;
  actionPayload?: {
    actionType: string;
    description: string;
    payloadData: Record<string, any>;
  };
}

export interface ProactiveAINotification {
  id: string;
  type: 'engagement_drop' | 'inactivity_alert' | 'unanswered_chats' | 'pending_join_requests' | 'crm_followup' | 'festival_opportunity';
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
}

export interface JARVISMessage {
  id: string;
  sender: 'user' | 'jarvis';
  text: string;
  timestamp: string;
  intent?: JARVISIntent;
  attachments?: {
    type: 'image' | 'video' | 'document' | 'audio';
    url: string;
  }[];
  interactiveAction?: {
    label: string;
    actionType: string;
    payloadData: any;
    confirmed?: boolean;
  };
}
