export type VoiceCompanionMode = 
  | 'OFF'
  | 'PUSH_TO_TALK'
  | 'ALWAYS_LISTENING'
  | 'DRIVING'
  | 'MEETING'
  | 'SILENT';

export interface VoicePriorityConfig {
  highPriority: {
    alarms: boolean;
    meetings: boolean;
    emergencyAlerts: boolean;
    crmUrgentFollowups: boolean;
  };
  mediumPriority: {
    messages: boolean;
    comments: boolean;
    crmLeads: boolean;
  };
  lowPriority: {
    likes: boolean;
    followers: boolean;
    dailyAnalytics: boolean;
  };
}

export interface SpokenNotification {
  id: string;
  category: 'message' | 'comment' | 'like' | 'follow' | 'crm' | 'calendar' | 'task' | 'analytics';
  priority: 'high' | 'medium' | 'low';
  title: string;
  conversationalText: string;
  senderName?: string;
  rawText?: string;
  pendingAction?: {
    type: 'REPLY_MESSAGE' | 'REPLY_COMMENT' | 'OPEN_CRM' | 'OPEN_CALENDAR' | 'CREATE_POST';
    payload: any;
  };
}

export interface VoiceCommandIntent {
  intent: 
    | 'READ_NOTIFICATIONS'
    | 'OPEN_MODULE'
    | 'SUMMARIZE_ACTIVITY'
    | 'CREATE_CONTENT'
    | 'CALL_CONTACT'
    | 'SEARCH_TOLEE'
    | 'UNKNOWN';
  targetModule?: string;
  query?: string;
  confirmationRequired: boolean;
  responseText: string;
  actionPayload?: any;
}
