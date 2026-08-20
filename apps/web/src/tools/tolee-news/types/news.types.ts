export interface NewsArticleItem {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  coverImage?: string | null;
  category: string;
  authorId: string;
  authorName?: string;
  authorImage?: string;
  location?: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  isVerifiedJournalist?: boolean;
  createdAt: string | Date;
}
