export interface ChatMessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string | null;
  text?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  isRead: boolean;
  createdAt: string | Date;
}
