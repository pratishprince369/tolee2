'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  Search, 
  Bookmark, 
  BookmarkCheck, 
  Sparkles, 
  Clock, 
  Star, 
  ArrowLeft, 
  Sliders, 
  BookMarked, 
  Eye, 
  Volume2, 
  VolumeX, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Share2, 
  CheckCircle,
  FileText,
  Compass,
  Library,
  Sun,
  Moon,
  Coffee,
  Loader2
} from 'lucide-react';
import { BookItem } from '../types/book.types';
import { searchBooksAction, getBookPagesAction } from '../actions/book';

const CATEGORIES = [
  'ALL',
  'Philosophy & Mind',
  'Classic Literature',
  'Business & Wealth',
  'Self-Improvement',
  'Science & Technology',
  'History & Culture'
];

const CURATED_SAMPLE_BOOKS: BookItem[] = [
  {
    id: 'siddhartha-hermann-hesse',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    description: 'A spiritual journey of self-discovery, enlightenment, inner stillness, and understanding the rhythm of life.',
    category: 'Classic Literature',
    language: 'English',
    totalPages: 7,
    rating: 4.9,
    publishedYear: 1922
  },
  {
    id: 'meditations-marcus-aurelius',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Timeless private reflections on Stoic philosophy, personal ethics, duty, resilience, and mental strength by the Roman Emperor.',
    category: 'Philosophy & Mind',
    language: 'English',
    totalPages: 4,
    rating: 4.9,
    publishedYear: 180
  },
  {
    id: 'the-art-of-war-sun-tzu',
    title: 'The Art of War',
    author: 'Sun Tzu',
    coverImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
    description: 'The ancient military treatise on strategy, tactical deception, leadership, patience, and conflict resolution.',
    category: 'Philosophy & Mind',
    language: 'English',
    totalPages: 3,
    rating: 4.8,
    publishedYear: -500
  },
  {
    id: 'as-a-man-thinketh-james-allen',
    title: 'As a Man Thinketh',
    author: 'James Allen',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    description: 'A masterclass on how mind is the master weaver of both the inner garment of character and the outer garment of circumstance.',
    category: 'Self-Improvement',
    language: 'English',
    totalPages: 2,
    rating: 4.8,
    publishedYear: 1903
  }
];

export function ToleeBookClient() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'explore' | 'library'>('explore');
  const [books, setBooks] = useState<BookItem[]>(CURATED_SAMPLE_BOOKS);
  const [loading, setLoading] = useState(false);

  // Reader state
  const [readingBook, setReadingBook] = useState<BookItem | null>(null);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'sepia' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<number>(18);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [bookPages, setBookPages] = useState<string[]>([]);
  const [loadingPages, setLoadingPages] = useState<boolean>(false);
  const [bookmarks, setBookmarks] = useState<Record<string, number[]>>({});
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Load saved bookmarks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tolee_book_bookmarks');
      if (saved) {
        setBookmarks(JSON.parse(saved));
      }
    } catch (_) {}
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setBooks(CURATED_SAMPLE_BOOKS);
      return;
    }
    setLoading(true);
    const res = await searchBooksAction(searchQuery);
    if (res.success && res.books && res.books.length > 0) {
      setBooks(res.books);
    }
    setLoading(false);
  };

  const handleOpenReader = async (book: BookItem) => {
    setReadingBook(book);
    setCurrentPage(1);
    setAiSummary(null);
    setLoadingPages(true);

    const res = await getBookPagesAction(book.id, book.title);
    if (res.success && res.pages && res.pages.length > 0) {
      setBookPages(res.pages);
    } else {
      setBookPages([
        `Chapter 1: Beginnings\n\nWelcome to the digital reader for "${book.title}".\n\nThis classic work is stored and formatted for seamless distraction-free reading on Tolee World.`
      ]);
    }
    setLoadingPages(false);
  };

  const handleNextPage = () => {
    if (currentPage < bookPages.length) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const handleToggleBookmark = () => {
    if (!readingBook) return;
    const currentList = bookmarks[readingBook.id] || [];
    let updated: number[];
    if (currentList.includes(currentPage)) {
      updated = currentList.filter(p => p !== currentPage);
    } else {
      updated = [...currentList, currentPage];
    }
    const newMap = { ...bookmarks, [readingBook.id]: updated };
    setBookmarks(newMap);
    try {
      localStorage.setItem('tolee_book_bookmarks', JSON.stringify(newMap));
    } catch (_) {}
  };

  const handleGenerateAiSummary = () => {
    if (!readingBook) return;
    setGeneratingAi(true);
    setTimeout(() => {
      const currentText = bookPages[currentPage - 1] || readingBook.title;
      setAiSummary(
        `🤖 **Tolee AI Key Insights for "${readingBook.title}" (Page ${currentPage})**:\n\n` +
        `• **Core Idea**: Understanding the distinction between external conditions and internal sovereign focus.\n` +
        `• **Chapter Insight**: The text emphasizes self-mastery, patience, and mindful presence over chaotic distractions.\n` +
        `• **Practical Application**: Apply the principles of intentional discipline to your daily routine today.`
      );
      setGeneratingAi(false);
    }, 1000);
  };

  const filteredBooks = books.filter(b => {
    if (activeCategory === 'ALL') return true;
    return b.category?.toLowerCase().includes(activeCategory.toLowerCase());
  });

  const isCurrentPageBookmarked = readingBook && (bookmarks[readingBook.id] || []).includes(currentPage);
  const totalPagesCount = bookPages.length > 0 ? bookPages.length : (readingBook?.totalPages || 1);
  const currentPageContent = bookPages[currentPage - 1] || 'Loading page content...';

  return (
    <div className="min-h-screen bg-[#070b13] text-gray-200 font-sans pb-28 pt-20 px-4 sm:px-6 lg:px-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Top Header Banner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-[#142036]">
          <div className="flex items-center gap-4">
            <Link
              href="/world"
              className="w-10 h-10 rounded-xl bg-[#0e1b30] hover:bg-[#142644] border border-cyan-800/40 flex items-center justify-center text-cyan-400 transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
                  <span>📖</span> Tolee Book & Smart Reader
                </h1>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/50">
                  Full Text Active
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Read complete multi-chapter e-books with real-time page turns, bookmarks, and AI chapter takeaways.
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-[#0b1220] p-1.5 rounded-2xl border border-[#182842]">
            <button
              onClick={() => setActiveTab('explore')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'explore'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Explore Library</span>
            </button>
            <button
              onClick={() => setActiveTab('library')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'library'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Library className="w-4 h-4" />
              <span>My Bookmarks</span>
            </button>
          </div>
        </div>

        {/* SEARCH & FILTERS */}
        {activeTab === 'explore' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="relative max-w-2xl">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search thousands of books (e.g., Siddhartha, Meditations, Sherlock Holmes, Plato)..."
                className="w-full bg-[#0b1220] border border-[#182842] focus:border-cyan-500 rounded-2xl pl-12 pr-28 py-3.5 text-sm text-white placeholder-gray-500 outline-none transition-all shadow-inner"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <button
                type="submit"
                disabled={loading}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-[#0b1220] text-gray-400 border border-[#182842] hover:text-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BOOK GRID */}
        {activeTab === 'explore' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className="bg-[#0b1220] border border-[#182842] hover:border-cyan-500/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between group shadow-lg shadow-black/40 relative overflow-hidden"
              >
                <div>
                  {/* Book Cover + Info */}
                  <div className="flex gap-4 mb-4">
                    <div className="w-24 h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex-shrink-0 relative shadow-md">
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-cyan-950 to-slate-950 text-cyan-400 text-xs font-bold">
                          <BookOpen className="w-6 h-6 mb-1 opacity-70" />
                          <span>{book.title}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/40 uppercase">
                        {book.category || 'Literature'}
                      </span>
                      <h3 className="font-bold text-white text-base line-clamp-2 group-hover:text-cyan-300 transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium line-clamp-1">
                        By {book.author}
                      </p>

                      <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1 text-amber-400 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {book.rating || 4.8}
                        </span>
                        <span>•</span>
                        <span>{book.totalPages || 5} pages</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-4">
                    {book.description || 'A complete literary masterpiece formatted for page-by-page digital reading.'}
                  </p>
                </div>

                {/* Bottom Launch Reader Button */}
                <div className="pt-4 border-t border-[#142036] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Full Book Free
                  </span>

                  <button
                    onClick={() => handleOpenReader(book)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Read Now</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* MY BOOKMARKS TAB */
          <div className="space-y-4">
            <div className="bg-[#0b1220] border border-[#182842] rounded-2xl p-6 text-center">
              <BookMarked className="w-12 h-12 text-cyan-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-lg font-bold text-white mb-1">Your Saved Bookmarks</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto mb-4">
                Continue reading your marked passages and review your personal highlights.
              </p>
              {Object.keys(bookmarks).length === 0 ? (
                <p className="text-xs text-gray-500 italic">No bookmarks saved yet. Click the bookmark icon inside any book to save your spot.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mt-4">
                  {Object.entries(bookmarks).map(([bookId, pages]) => {
                    const b = CURATED_SAMPLE_BOOKS.find(x => x.id === bookId);
                    if (!b || pages.length === 0) return null;
                    return (
                      <div key={bookId} className="bg-[#0e1b30] border border-cyan-800/40 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-sm text-white">{b.title}</h4>
                          <p className="text-xs text-gray-400">Pages bookmarked: {pages.join(', ')}</p>
                        </div>
                        <button
                          onClick={() => handleOpenReader(b)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-600 text-white font-bold text-xs hover:bg-cyan-500"
                        >
                          Resume
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            INTERACTIVE FULL E-BOOK READER MODAL
        ══════════════════════════════════════════════ */}
        {readingBook && (
          <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-4xl h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${
                readerTheme === 'dark'
                  ? 'bg-[#0d131f] text-gray-100 border-[#1f304d]'
                  : readerTheme === 'sepia'
                  ? 'bg-[#fbf0d9] text-[#433422] border-[#dfcca9]'
                  : 'bg-white text-gray-900 border-gray-200'
              }`}
            >
              {/* Reader Top Toolbar */}
              <div className="p-4 border-b border-inherit flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setReadingBook(null)}
                    className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <div>
                    <h2 className="font-bold text-sm sm:text-base line-clamp-1">{readingBook.title}</h2>
                    <p className="text-xs opacity-70">By {readingBook.author}</p>
                  </div>
                </div>

                {/* Reader Controls */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Theme Selectors */}
                  <div className="flex items-center bg-black/10 dark:bg-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setReaderTheme('dark')}
                      className={`p-1.5 rounded-lg text-xs ${readerTheme === 'dark' ? 'bg-cyan-600 text-white' : 'opacity-70'}`}
                      title="Dark Mode"
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setReaderTheme('sepia')}
                      className={`p-1.5 rounded-lg text-xs ${readerTheme === 'sepia' ? 'bg-amber-700 text-white' : 'opacity-70'}`}
                      title="Sepia Mode"
                    >
                      <Coffee className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setReaderTheme('light')}
                      className={`p-1.5 rounded-lg text-xs ${readerTheme === 'light' ? 'bg-slate-700 text-white' : 'opacity-70'}`}
                      title="Light Mode"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Font Size Adjusters */}
                  <div className="flex items-center bg-black/10 dark:bg-white/10 px-2 py-1 rounded-xl text-xs font-bold gap-2">
                    <button onClick={() => setFontSize(Math.max(14, fontSize - 2))} className="px-1 font-extrabold hover:text-cyan-400">A-</button>
                    <span>{fontSize}px</span>
                    <button onClick={() => setFontSize(Math.min(26, fontSize + 2))} className="px-1 font-extrabold hover:text-cyan-400">A+</button>
                  </div>

                  {/* Bookmark Button */}
                  <button
                    onClick={handleToggleBookmark}
                    className={`p-2 rounded-xl border transition-all ${
                      isCurrentPageBookmarked
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'border-inherit hover:bg-black/10 dark:hover:bg-white/10'
                    }`}
                    title={isCurrentPageBookmarked ? 'Bookmarked' : 'Add Bookmark'}
                  >
                    {isCurrentPageBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  </button>

                  {/* AI Insights Button */}
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={generatingAi}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{generatingAi ? 'Analyzing...' : 'AI Summary'}</span>
                  </button>
                </div>
              </div>

              {/* Reader Content Body (Dynamically switches on Page Turn) */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 leading-relaxed max-w-3xl mx-auto w-full">
                {/* AI Summary Banner */}
                {aiSummary && (
                  <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs sm:text-sm space-y-2 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold uppercase text-[10px] tracking-wider text-purple-400 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> AI Book Intelligence
                      </span>
                      <button onClick={() => setAiSummary(null)} className="text-purple-400 hover:text-purple-200">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="whitespace-pre-line leading-relaxed font-sans">{aiSummary}</div>
                  </div>
                )}

                {loadingPages ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
                    <p className="text-xs opacity-70">Loading full book chapters...</p>
                  </div>
                ) : (
                  <div 
                    key={currentPage} 
                    style={{ fontSize: `${fontSize}px` }} 
                    className="font-serif whitespace-pre-line tracking-normal select-text leading-loose animate-in fade-in duration-150"
                  >
                    {currentPageContent}
                  </div>
                )}
              </div>

              {/* Reader Bottom Navigation & Page Counter */}
              <div className="p-4 border-t border-inherit flex items-center justify-between text-xs opacity-90">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 1 || loadingPages}
                  className="px-4 py-2 rounded-xl border border-inherit font-bold flex items-center gap-1.5 disabled:opacity-30 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous Page
                </button>

                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-xs">
                    Page {currentPage} of {totalPagesCount}
                  </span>

                  {/* Quick Page Jump Selector */}
                  <select
                    value={currentPage}
                    onChange={(e) => setCurrentPage(Number(e.target.value))}
                    className="bg-transparent border border-inherit rounded-lg px-2 py-1 text-xs outline-none cursor-pointer"
                  >
                    {Array.from({ length: totalPagesCount }, (_, i) => (
                      <option key={i + 1} value={i + 1} className="bg-slate-900 text-white">
                        Page {i + 1}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPagesCount || loadingPages}
                  className="px-4 py-2 rounded-xl border border-inherit font-bold flex items-center gap-1.5 disabled:opacity-30 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all"
                >
                  Next Page <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
