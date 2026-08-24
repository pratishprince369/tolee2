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

export interface LanguageItem {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageItem[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', flag: '🚩' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
];
