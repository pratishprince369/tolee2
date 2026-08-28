export type WhatomateGatewayType = 'CLOUD_API' | 'WEB_GATEWAY';

export interface WhatomateCredentials {
  gatewayType: WhatomateGatewayType;
  phoneNumberId?: string;
  wabaId?: string;
  accessToken?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  webhookVerifyToken?: string;
  isConnected: boolean;
}

export type WhatomateTemplateCategory = 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';

export interface WhatomateTemplateButton {
  type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface WhatomateTemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  example?: {
    header_text?: string[];
    body_text?: string[][];
    header_handle?: string[];
  };
  buttons?: WhatomateTemplateButton[];
}

export interface WhatomateTemplate {
  id: string;
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED';
  category: WhatomateTemplateCategory;
  components: WhatomateTemplateComponent[];
}

export interface WhatomateRecipient {
  phone: string;
  name?: string;
  customVar?: string;
  parameters?: Record<string, string>;
}

export interface WhatomateCampaign {
  id: string;
  title: string;
  templateName?: string;
  messageText?: string;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | 'document' | null;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  status: 'DRAFT' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string | null;
}
