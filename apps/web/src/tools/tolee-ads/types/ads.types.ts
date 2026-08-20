export interface AdCampaignItem {
  id: string;
  userId: string;
  postId?: string | null;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: string | Date;
}
