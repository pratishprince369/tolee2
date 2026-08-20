export type RadarCategory = 'alert' | 'food' | 'news' | 'deal' | 'gupt';

export interface RadarPostItem {
  id: string;
  category: string;
  title: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  locationName: string;
  radiusKm: number;
  isAnonymous: boolean;
  distanceKm?: number;
  likesCount: number;
  hasLiked?: boolean;
  author?: {
    id: string;
    name: string | null;
    image: string | null;
  } | null;
  createdAt: string | Date;
}

export interface RadarLocationUpdatePayload {
  latitude: number;
  longitude: number;
  locationName: string;
}

export interface CreateRadarPostPayload {
  category: 'alert' | 'food' | 'news' | 'deal' | 'gupt';
  title: string;
  description?: string;
  latitude: number;
  longitude: number;
  locationName: string;
  radiusKm?: number;
  isAnonymous?: boolean;
}
