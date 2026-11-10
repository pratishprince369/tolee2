export type ExpoCategory = 'fashion' | 'beauty' | 'food' | 'jewellery' | 'wellness';

export type StallTier = 'vip' | 'gold' | 'silver';

export interface CreatorReview {
  creatorName: string;
  handle: string;
  rating: string;
}

export interface ExpoListing {
  id: string;
  brandName: string;
  category: ExpoCategory;
  categoryLabel: string;
  stallTier: StallTier;
  stallTierLabel: string;
  city: string;
  tagline: string;
  offerLabel: string;
  offerDescription: string;
  productName: string;
  originalPrice: number;
  expoPrice: number;
  discountPct: number;
  image: string;
  creatorReview?: CreatorReview;
  features: string[];
  whatsappMessage: string;
  isVerified: boolean;
}

export interface ExpoCategoryFilterItem {
  id: string;
  label: string;
}
