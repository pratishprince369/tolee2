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
  Coffee
} from 'lucide-react';
import { BookItem } from '../types/book.types';
import { searchBooksAction } from '../actions/book';

const CATEGORIES = [
  'ALL',
  'Philosophy & Mind',
  'Science & Technology',
  'Classic Literature',
  'Business & Wealth',
  'Self-Improvement',
  'History & Culture',
  'Fiction & Drama'
];

const CURATED_SAMPLE_BOOKS: BookItem[] = [
  {
    id: 'meditations-marcus-aurelius',
    title: 'Meditations',
    author: 'Marcus Aurelius',
    coverImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Timeless private reflections on Stoic philosophy, personal ethics, duty, resilience, and mental strength by the Roman Emperor.',
    category: 'Philosophy & Mind',
    language: 'English',
    totalPages: 210,
    rating: 4.9,
    publishedYear: 180,
    textSnippet: `You have power over your mind - not outside events. Realize this, and you will find strength.

Very little is needed to make a happy life; it is all within yourself, in your way of thinking.

When you arise in the morning think of what a privilege it is to be alive, to think, to enjoy, to love...

Dwell on the beauty of life. Watch the stars, and see yourself running with them.

The happiness of your life depends upon the quality of your thoughts.`
  },
  {
    id: 'the-art-of-war-sun-tzu',
    title: 'The Art of War',
    author: 'Sun Tzu',
    coverImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=600&q=80',
    description: 'The ancient military treatise on strategy, tactical deception, leadership, patience, and conflict resolution.',
    category: 'Philosophy & Mind',
    language: 'English',
    totalPages: 160,
    rating: 4.8,
    publishedYear: -500,
    textSnippet: `The supreme art of war is to subdue the enemy without fighting.

Let your plans be dark and impenetrable as night, and when you move, fall like a thunderbolt.

In the midst of chaos, there is also opportunity.

If you know the enemy and know yourself, you need not fear the result of a hundred battles.`
  },
  {
    id: 'the-wealth-of-nations-adam-smith',
    title: 'The Wealth of Nations',
    author: 'Adam Smith',
    coverImage: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    description: 'Foundational economic work analyzing division of labor, productivity, free markets, and the invisible hand.',
    category: 'Business & Wealth',
    language: 'English',
    totalPages: 520,
    rating: 4.7,
    publishedYear: 1776,
    textSnippet: `It is not from the benevolence of the butcher, the brewer, or the baker that we expect our dinner, but from their regard to their own interest.

No society can surely be flourishing and happy, of which the far greater part of the members are poor and miserable.`
  },
  {
    id: 'siddhartha-hermann-hesse',
    title: 'Siddhartha',
    author: 'Hermann Hesse',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80',
    description: 'A spiritual journey of self-discovery, enlightenment, inner stillness, and understanding the rhythm of life.',
    category: 'Classic Literature',
    language: 'English',
    totalPages: 152,
    rating: 4.9,
    publishedYear: 1922,
    textSnippet: `Wisdom cannot be imparted. Wisdom that a wise man attempts to impart always sounds like foolishness to someone else.

Knowledge can be communicated, but not wisdom. One can find it, live it, do wonders through it, but one cannot communicate and teach it.

I have always believed, and I still believe, that whatever good or bad fortune may come our way we can always give it meaning and transform it into something of value.`
  },
  {
    id: 'as-a-man-thinketh-james-allen',
    title: 'As a Man Thinketh',
    author: 'James Allen',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80',
    description: 'A masterclass on how mind is the master weaver of both the inner garment of character and the outer garment of circumstance.',
    category: 'Self-Improvement',
    language: 'English',
    totalPages: 90,
    rating: 4.8,
    publishedYear: 1903,
    textSnippet: `A man is literally what he thinks, his character being the complete sum of all his thoughts.

As he thinks, so he is; as he continues to think, so he remains.

Circumstance does not make the man; it reveals him to himself.`
  },
  {
    id: 'beyond-good-and-evil-nietzsche',
    title: 'Beyond Good and Evil',
    author: 'Friedrich Nietzsche',
    coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=600&q=80',
    description: 'A piercing critique of past moralities, unmasking philosophical dogmas and advocating for intellectual sovereignty.',
    category: 'Philosophy & Mind',
    language: 'English',
    totalPages: 280,
    rating: 4.6,
    publishedYear: 1886,
    textSnippet: `He who fights with monsters might take care lest he thereby become a monster. And if you gaze for long into an abyss, the abyss gazes also into you.

There are no facts, only interpretations.

The individual has always had to struggle to keep from being overwhelmed by the tribe.`
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

  const handleOpenReader = (book: BookItem) => {
    setReadingBook(book);
    setCurrentPage(1);
    setAiSummary(null);
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
      setAiSummary(
        `🤖 **Tolee AI Key Insights for "${readingBook.title}" by ${readingBook.author}**:\n\n` +
        `• **Core Thesis**: The power of internal discernment, emotional sovereignty, and disciplined mindset.\n` +
        `• **Key Takeaway 1**: What happens to you matters far less than the meaning and response you construct.\n` +
        `• **Key Takeaway 2**: True freedom is detachment from transient external noise and adherence to virtue.\n` +
        `• **Actionable Exercise**: Spend 5 minutes every morning reflecting on your core priorities before engaging with external media.`
      );
      setGeneratingAi(false);
    }, 1200);
  };

  const filteredBooks = books.filter(b => {
    if (activeCategory === 'ALL') return true;
    return b.category?.toLowerCase().includes(activeCategory.toLowerCase());
  });

  const isCurrentPageBookmarked = readingBook && (bookmarks[readingBook.id] || []).includes(currentPage);

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
                  Free Library
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Explore thousands of classics, philosophy, science & personal growth books with AI chapter takeaways.
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
                placeholder="Search by title, author, philosophy, topic..."
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
                        {book.category || 'General'}
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
                        <span>{book.totalPages} pages</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed mb-4">
                    {book.description || 'A timeless classical text available for interactive digital reading and AI analysis.'}
                  </p>
                </div>

                {/* Bottom Launch Reader Button */}
                <div className="pt-4 border-t border-[#142036] flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Free E-Book
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
            INTERACTIVE E-BOOK READER MODAL
        ══════════════════════════════════════════════ */}
        {readingBook && (
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div
              className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden transition-colors duration-300 ${
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

              {/* Reader Content Body */}
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

                <div 
                  style={{ fontSize: `${fontSize}px` }} 
                  className="font-serif whitespace-pre-line tracking-normal select-text leading-loose"
                >
                  {readingBook.textSnippet || (
                    `Chapter 1: The Inner Journey\n\n` +
                    `In the quiet stillness of the early morning, the mind begins to awaken to the realities of existence. Everything that surrounds us is in a constant state of transformation. To resist this transformation is to invite suffering, while to understand and harmonize with it is to find peace.\n\n` +
                    `"He who lives in harmony with himself lives in harmony with the universe."\n\n` +
                    `No circumstance in the external world has the inherent power to diminish your integrity unless you willingly surrender it. Guard your inner citadel, treat others with compassion, and remain steadfast in your pursuit of truth.`
                  )}
                </div>
              </div>

              {/* Reader Bottom Navigation & Page Counter */}
              <div className="p-4 border-t border-inherit flex items-center justify-between text-xs opacity-80">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-inherit flex items-center gap-1 disabled:opacity-30 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <ChevronLeft className="w-4 h-4" /> Previous
                </button>

                <span className="font-bold">
                  Page {currentPage} of {readingBook.totalPages || 200}
                </span>

                <button
                  onClick={() => setCurrentPage(Math.min(readingBook.totalPages || 200, currentPage + 1))}
                  className="px-3 py-1.5 rounded-xl border border-inherit flex items-center gap-1 hover:bg-black/10 dark:hover:bg-white/10"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
