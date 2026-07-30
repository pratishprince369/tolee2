/**
 * Smart Community Operating System (COS) - Types & Interfaces
 * Isolates types for all Tolee community categories.
 */

export interface ToleeRoleConfig {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
  canManageMembers?: boolean;
  canManageSettings?: boolean;
  canPostContent?: boolean;
  canManagePayments?: boolean;
}

export interface ToleeFeatureConfig {
  id: string;
  name: string;
  iconName: string;
  description: string;
  enabledByDefault: boolean;
  category: 'core' | 'finance' | 'operations' | 'engagement' | 'ai';
}

export interface ToleeAIAssistantConfig {
  name: string;
  roleDescription: string;
  systemPrompt: string;
  suggestedPrompts: string[];
}

export interface ToleeTypeConfig {
  id: string;
  slug: string;
  title: string;
  icon: string;
  description: string;
  estimatedMembers: string;
  categoryTag: string;
  roles: ToleeRoleConfig[];
  features: ToleeFeatureConfig[];
  aiAssistant: ToleeAIAssistantConfig;
  defaultPrivacy: 'public' | 'private' | 'invite_only';
  defaultSearchable: boolean;
}
