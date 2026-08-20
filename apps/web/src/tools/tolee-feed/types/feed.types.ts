export interface FeedPostItem {
  id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  content: string;
  mediaUrls?: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  hasLiked?: boolean;
  toleeSlug?: string | null;
  createdAt: string | Date;
}
