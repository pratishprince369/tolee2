export interface MarketplaceListingItem {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  category: string;
  condition?: string;
  images: string[];
  location?: string;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  status: 'active' | 'sold' | 'expired';
  createdAt: string | Date;
}
