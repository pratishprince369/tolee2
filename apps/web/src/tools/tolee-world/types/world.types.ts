export interface WorldToolItem {
  id: string;
  name: string;
  category: string;
  description: string;
  badge?: string;
  badgeType?: string;
  iconType: string;
  status: string;
  endpoint: string;
  rating?: number;
  reviewsCount?: number;
  creditsRequired?: number;
  tags?: string[];
  isLocked?: boolean;
}
