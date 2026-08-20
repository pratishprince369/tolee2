export interface ReelItem {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  hasLiked?: boolean;
  musicTitle?: string | null;
  createdAt: string | Date;
}
