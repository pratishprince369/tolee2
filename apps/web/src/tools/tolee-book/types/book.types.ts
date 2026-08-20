export interface BookItem {
  id: string;
  title: string;
  author: string;
  coverImage?: string | null;
  description?: string;
  category?: string;
  language?: string;
  totalPages?: number;
  rating?: number;
  publishedYear?: number;
  epubUrl?: string;
  pdfUrl?: string;
  textSnippet?: string;
}

export interface ReadingProgressItem {
  bookId: string;
  userId: string;
  currentPage: number;
  totalPages: number;
  progressPercent: number;
  lastReadAt: string | Date;
}

export interface BookmarkItem {
  id: string;
  bookId: string;
  userId: string;
  pageNumber: number;
  note?: string;
  createdAt: string | Date;
}
