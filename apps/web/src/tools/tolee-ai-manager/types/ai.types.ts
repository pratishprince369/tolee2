export interface AIMessageItem {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  audioUrl?: string;
  createdAt: string | Date;
}

export interface AIReminderItem {
  id: string;
  userId: string;
  title: string;
  remindAt: string | Date;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'CANCELLED';
  recurrence?: string | null;
}
