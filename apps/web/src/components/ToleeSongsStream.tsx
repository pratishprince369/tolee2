'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Pause,
  Search,
  Mic,
  Disc,
  Film,
  Sparkles,
  Scissors,
  Heart,
  TrendingUp,
  User,
  MoreVertical,
  ChevronRight,
  Music,
  PlusCircle,
  Flag,
  X,
  ListPlus,
  PlayCircle,
  Library,
  Home,
  Compass,
  Radio,
  Flame,
  Check,
  Headphones,
} from 'lucide-react';
import { getSongsFeedAction, searchSongsAction } from '@/actions/songs';
import { useMusicPlayer } from '@/context/MusicPlayerContext';
import { formatDuration } from '@/lib/audioLibrary';
import { AudioWaveformTrimmer } from '@/components/AudioWaveformTrimmer';
import { LaunchMusicModal } from '@/components/LaunchMusicModal';
import { ReportSongModal } from '@/components/ReportSongModal';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Spotify-aligned Curated Categories
const CATEGORIES = [
  'All',
  'Bollywood',
  'Punjabi',
  'Marathi',
  'Tamil',
  'Telugu',
  'Devotional',
  'Lo-Fi',
  'Romantic',
  'Party',
  'Podcasts',
];

const TOP_CHARTS = [
  {
    id: 'chart-trending-today',
    title: 'Trending Today',
    count: '1.2M Songs',
    bgGradient: 'from-[#ff007a] via-[#ff2a55] to-[#ff6b35]',
    genre: 'Bollywood',
    sampleSong: {
      id: 'chart-s1',
      title: 'Trending Hits 2026',
      artistName: 'Top Artists',
      audioUrl: '/audio/kesariya.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300',
      duration: 210,
    },
  },
  {
    id: 'chart-romantic-hits',
    title: 'Romantic Hits',
    count: '850K Songs',
    bgGradient: 'from-[#2b1055] via-[#4338ca] to-[#3b82f6]',
    genre: 'Romantic',
    sampleSong: {
      id: 'chart-s2',
      title: 'Romantic Melodies',
      artistName: 'Arijit & Shreya',
      audioUrl: '/audio/midnight-chai.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300',
      duration: 198,
    },
  },
  {
    id: 'chart-party-anthems',
    title: 'Party Anthems',
    count: '620K Songs',
    bgGradient: 'from-[#3b0764] via-[#581c87] to-[#1e1b4b]',
    genre: 'Party',
    sampleSong: {
      id: 'chart-s3',
      title: 'Party Night Club',
      artistName: 'Tolee DJ Club',
      audioUrl: '/audio/party-celebration.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300',
      duration: 185,
    },
  },
  {
    id: 'chart-devotional-vibes',
    title: 'Devotional Vibes',
    count: '410K Songs',
    bgGradient: 'from-[#7c2d12] via-[#b45309] to-[#ea580c]',
    genre: 'Devotional',
    sampleSong: {
      id: 'chart-s4',
      title: 'Devotional Darshan & Flute',
      artistName: 'Divine Horizon',
      audioUrl: '/audio/shiva-mantra.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1545239351-ef35f43d514b?w=300',
      duration: 240,
    },
  },
];

const POPULAR_ARTISTS = [
  {
    id: 'artist-arijit-singh',
    name: 'Arijit Singh',
    genre: 'Bollywood',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'artist-diljit-dosanjh',
    name: 'Diljit Dosanjh',
    genre: 'Punjabi',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'artist-shreya-ghoshal',
    name: 'Shreya Ghoshal',
    genre: 'Bollywood',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'artist-sonu-nigam',
    name: 'Sonu Nigam',
    genre: 'Bollywood',
    image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'artist-neha-kakkar',
    name: 'Neha Kakkar',
    genre: 'Indian Pop',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&auto=format&fit=crop&q=80',
  },
];

const CURATED_RECOMMENDED = [
  {
    id: 'rec-1',
    title: 'Tera Ban Jaunga',
    artistName: 'Akhil',
    audioUrl: '/audio/midnight-chai.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=400&auto=format&fit=crop&q=80',
    duration: 215,
  },
  {
    id: 'rec-2',
    title: 'Husn',
    artistName: 'Anuv Jain',
    audioUrl: '/audio/pahadi-breeze.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=400&auto=format&fit=crop&q=80',
    duration: 198,
  },
  {
    id: 'rec-3',
    title: 'Heeriye',
    artistName: 'Jasleen Royal',
    audioUrl: '/audio/kesariya.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&auto=format&fit=crop&q=80',
    duration: 202,
  },
  {
    id: 'rec-4',
    title: 'Tum Hi Ho',
    artistName: 'Arijit Singh',
    audioUrl: '/audio/kesariya.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
    duration: 262,
  },
];

const POPULAR_SEARCH_TAGS = [
  'Arijit Singh',
  'Diljit Dosanjh',
  'Kesariya',
  'Lo-Fi Beats',
  'Hanuman Chalisa',
  'Tauba Tauba',
  'Shreya Ghoshal',
  'Party Dance',
];

export function ToleeSongsStream() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const {
    playTrack,
    currentTrack,
    isPlaying,
    togglePlay,
    toggleLike,
    likedSongIds,
    addToQueue,
    playNext,
  } = useMusicPlayer();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [feedData, setFeedData] = useState<any>({
    trendingSongs: [],
    featuredSongs: [],
    popularArtists: [],
    featuredAlbums: [],
  });
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [trimmerTrack, setTrimmerTrack] = useState<any>(null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [reportingSong, setReportingSong] = useState<any>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Load Feed Data from Database
  useEffect(() => {
    getSongsFeedAction()
      .then((res) => {
        if (res?.success) {
          setFeedData(res);
        }
      })
      .catch(() => {});
  }, []);

  // Handle Dynamic Search
  useEffect(() => {
    const handler = setTimeout(() => {
      const hasQuery = searchQuery.trim().length > 0;
      const hasCategory = selectedCategory !== 'All' && selectedCategory !== '';

      if (hasQuery || hasCategory) {
        setIsSearching(true);
        searchSongsAction(
          searchQuery,
          selectedCategory === 'All' ? '' : selectedCategory
        )
          .then((res) => {
            if (res?.success) {
              setSearchResults(res);
            }
            setIsSearching(false);
          })
          .catch(() => setIsSearching(false));
      } else {
        setSearchResults(null);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory]);

  const handleUseInReel = (track: any) => {
    router.push(
      `/reels?action=create&audioId=${encodeURIComponent(track.id)}&audioTitle=${encodeURIComponent(
        track.title
      )}`
    );
  };

  // Keyboard dismissal & smooth play handler
  const handleSelectSong = (track: any, songList: any[]) => {
    // Dismiss mobile keyboard if open
    if (typeof document !== 'undefined') {
      (document.activeElement as HTMLElement)?.blur();
    }
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      playTrack(track, songList);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSearchResults(null);
    searchInputRef.current?.focus();
  };

  // Build recommended songs pool (Database trending songs combined with curated hits)
  const displayRecommendedSongs =
    feedData.trendingSongs?.length > 0
      ? feedData.trendingSongs.slice(0, 10)
      : CURATED_RECOMMENDED;

  const handleLaunchFirstSong = () => {
    const firstSong = displayRecommendedSongs[0] || CURATED_RECOMMENDED[0];
    if (firstSong) {
      playTrack(firstSong, displayRecommendedSongs);
    }
  };

  const isSearchActive =
    searchQuery.trim().length > 0 || (selectedCategory !== 'All' && selectedCategory !== '');

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-zinc-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-2xl backdrop-blur-md border border-zinc-700/80 animate-in fade-in slide-in-from-top duration-200">
          {toastMessage}
        </div>
      )}

      <div className="flex">
        {/* ── Desktop Left Sidebar (Spotify style) ── */}
        <aside className="hidden lg:flex w-64 flex-col shrink-0 sticky top-0 h-screen border-r border-zinc-200 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl p-5 gap-6 select-none z-20">
          {/* Logo & Brand Header */}
          <Link href="/songs" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center shadow-lg shadow-[#0a7c85]/30 group-hover:scale-105 transition-transform">
              <Headphones className="w-5 h-5 text-zinc-950 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">
                Tolee <span className="text-[#0a7c85] dark:text-[#2dd4bf]">Songs</span>
              </span>
              <p className="text-[10px] font-semibold tracking-wider uppercase text-zinc-400">
                Ad-Free Streaming
              </p>
            </div>
          </Link>

          {/* Main Navigation */}
          <nav className="space-y-1 text-sm font-semibold">
            <button
              type="button"
              onClick={handleClearSearch}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                !isSearchActive
                  ? "bg-[#0a7c85]/10 text-[#0a7c85] dark:text-[#2dd4bf] font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
              )}
            >
              <Home className="w-4 h-4" />
              <span>Discover & Home</span>
            </button>

            <button
              type="button"
              onClick={() => {
                searchInputRef.current?.focus();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer",
                isSearchActive
                  ? "bg-[#0a7c85]/10 text-[#0a7c85] dark:text-[#2dd4bf] font-bold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
              )}
            >
              <Search className="w-4 h-4" />
              <span>Search Songs</span>
            </button>

            <Link
              href="/songs/my-music"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            >
              <Library className="w-4 h-4" />
              <span>Your Library</span>
            </Link>

            <Link
              href="/songs/my-music"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            >
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Liked Songs ({likedSongIds.size})</span>
            </Link>

            <Link
              href="/reels"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            >
              <Film className="w-4 h-4 text-fuchsia-500" />
              <span>Trending Reels Audio</span>
            </Link>
          </nav>

          {/* Moods & Quick Genres */}
          <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800/80 pt-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3">
              Quick Moods
            </span>
            <div className="space-y-0.5 text-xs font-medium">
              {[
                { label: 'Bollywood Hits', cat: 'Bollywood' },
                { label: 'Punjabi Anthems', cat: 'Punjabi' },
                { label: 'Devotional & Flute', cat: 'Devotional' },
                { label: 'Lo-Fi Chill & Chai', cat: 'Lo-Fi' },
                { label: 'Romantic Melodies', cat: 'Romantic' },
                { label: 'Party & Celebration', cat: 'Party' },
              ].map((item) => (
                <button
                  key={item.cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(item.cat);
                    setSearchQuery('');
                  }}
                  className={cn(
                    "w-full text-left px-3 py-1.5 rounded-lg transition-colors cursor-pointer truncate",
                    selectedCategory === item.cat
                      ? "text-[#0a7c85] dark:text-[#2dd4bf] font-bold bg-[#0a7c85]/10"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Action: Launch / Upload Song */}
          <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
            <button
              type="button"
              onClick={() => setIsLaunchModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#0a7c85] to-[#2dd4bf] text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#0a7c85]/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Launch / Upload Track</span>
            </button>
          </div>
        </aside>

        {/* ── Main Content Area ── */}
        <main className="flex-1 min-w-0 min-h-screen pb-40">
          {/* ── Sticky Top Bar with Search (Prominent & Always Accessible) ── */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
            <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
              {/* Mobile Brand Title */}
              <div className="flex lg:hidden items-center gap-2 shrink-0">
                <Link href="/songs" className="flex items-center gap-1.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
                  </div>
                  <span className="font-black text-sm tracking-tight text-zinc-900 dark:text-white">
                    Tolee <span className="text-[#0a7c85] dark:text-[#2dd4bf]">Songs</span>
                  </span>
                </Link>
              </div>

              {/* Prominent Search Input Box */}
              <div className="relative flex-1 max-w-2xl">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                  placeholder="What do you want to play? (Songs, artists, albums...)"
                  className="w-full bg-zinc-100 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-full pl-10 pr-20 py-2 sm:py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#0a7c85]/40 focus:border-[#0a7c85] transition-all shadow-inner"
                />

                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-zinc-400">
                  {/* Clear 'X' Button */}
                  {searchQuery.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="p-1 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Voice Mic Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                        const SpeechRecognition =
                          (window as any).SpeechRecognition ||
                          (window as any).webkitSpeechRecognition;
                        const recognition = new SpeechRecognition();
                        recognition.onresult = (event: any) => {
                          const transcript = event.results[0][0].transcript;
                          setSearchQuery(transcript);
                        };
                        recognition.start();
                      } else {
                        showToast('Voice search not supported on this browser');
                      }
                    }}
                    className="p-1 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] transition-colors"
                    title="Search by voice"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Right Header Navigation Quick Links */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/songs/my-music"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                >
                  <Library className="w-3.5 h-3.5 text-[#0a7c85] dark:text-[#2dd4bf]" />
                  <span>Library</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsLaunchModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-[#0a7c85] hover:bg-[#096d75] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Upload</span>
                </button>
              </div>
            </div>

            {/* Category / Genre Filter Chips */}
            <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-2.5 pt-1 overflow-x-auto no-scrollbar flex items-center gap-2 select-none">
              {CATEGORIES.map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer shrink-0",
                      isActive
                        ? "bg-[#0a7c85] dark:bg-[#2dd4bf] text-white dark:text-zinc-950 font-bold shadow-md shadow-[#0a7c85]/20"
                        : "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </header>

          {/* ── Content Viewport: Active Search View OR Discovery View ── */}
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-6">
            {/* ══════════════════════════════════════════════════════════
                1. DEDICATED SEARCH RESULTS VIEW (Directly Under Search Bar)
               ══════════════════════════════════════════════════════════ */}
            {isSearchActive ? (
              <div className="space-y-5 animate-in fade-in duration-200">
                {/* Search Header Status */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                      <Search className="w-4 h-4 text-[#0a7c85] dark:text-[#2dd4bf]" />
                      <span>
                        {searchQuery.trim().length > 0
                          ? `Results for "${searchQuery}"`
                          : `${selectedCategory} Hits`}
                      </span>
                      {isSearching && (
                        <span className="text-xs text-zinc-400 font-normal animate-pulse">
                          (Searching tracks...)
                        </span>
                      )}
                    </h2>
                    {searchResults?.songs && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        Found {searchResults.songs.length} tracks
                        {searchResults.artists?.length > 0 && ` • ${searchResults.artists.length} artists`}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="text-xs font-bold text-[#0a7c85] dark:text-[#2dd4bf] hover:underline cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>

                {/* Loading Skeleton */}
                {isSearching && !searchResults && (
                  <div className="space-y-2 py-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-xl bg-zinc-200/60 dark:bg-zinc-900/60 animate-pulse"
                      />
                    ))}
                  </div>
                )}

                {/* Search Results Content */}
                {searchResults && (
                  <>
                    {/* Top Result + Matching Songs Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                      {/* Top Match Spotlight (Spotify-Style, Left 4 cols) */}
                      {searchResults.songs?.length > 0 && (
                        <div className="lg:col-span-4 flex flex-col">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                            Top Match
                          </h3>
                          {(() => {
                            const topSong = searchResults.songs[0];
                            const isCurrent = currentTrack?.id === topSong.id;
                            const isTrackPlaying = isCurrent && isPlaying;

                            return (
                              <div
                                onClick={() => handleSelectSong(topSong, searchResults.songs)}
                                className="flex-1 p-5 rounded-2xl bg-gradient-to-br from-[#0a7c85]/15 via-zinc-100 to-zinc-50 dark:from-[#0a7c85]/20 dark:via-zinc-900 dark:to-zinc-950 border border-[#0a7c85]/30 shadow-md group cursor-pointer hover:border-[#0a7c85] transition-all flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  <div className="relative aspect-square w-28 sm:w-32 rounded-xl overflow-hidden shadow-lg border border-zinc-200 dark:border-zinc-800">
                                    <img
                                      src={
                                        topSong.coverUrl ||
                                        'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300'
                                      }
                                      alt={topSong.title}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                  </div>
                                  <div>
                                    <h4 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white line-clamp-1 group-hover:text-[#0a7c85] dark:group-hover:text-[#2dd4bf] transition-colors">
                                      {topSong.title}
                                    </h4>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                                      {topSong.artistName || topSong.artist?.name || 'Tolee Artist'}
                                    </p>
                                    <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                      Song • {formatDuration(topSong.duration || 180)}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                                  <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                    Tap to play
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSelectSong(topSong, searchResults.songs);
                                    }}
                                    className="w-10 h-10 rounded-full bg-[#0a7c85] dark:bg-[#2dd4bf] text-white dark:text-zinc-950 flex items-center justify-center shadow-lg group-hover:scale-105 active:scale-95 transition-transform"
                                  >
                                    {isTrackPlaying ? (
                                      <Pause className="w-4 h-4 fill-current" />
                                    ) : (
                                      <Play className="w-4 h-4 fill-current ml-0.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Songs List Table (Right 8 cols or full width) */}
                      <div
                        className={cn(
                          searchResults.songs?.length > 0
                            ? 'lg:col-span-8'
                            : 'col-span-12',
                          'space-y-1'
                        )}
                      >
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                          Songs ({searchResults.songs?.length || 0})
                        </h3>

                        {searchResults.songs?.length > 0 ? (
                          <div className="space-y-1.5">
                            {searchResults.songs.map((song: any, index: number) => {
                              const isCurrent = currentTrack?.id === song.id;
                              const isTrackPlaying = isCurrent && isPlaying;
                              const isLiked = likedSongIds.has(song.id);

                              return (
                                <div
                                  key={song.id}
                                  onClick={() => handleSelectSong(song, searchResults.songs)}
                                  className={cn(
                                    "flex items-center justify-between p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer group active:scale-[0.99] select-none",
                                    isCurrent
                                      ? "bg-[#0a7c85]/10 dark:bg-[#0a7c85]/20 border-[#0a7c85]/50 shadow-xs"
                                      : "bg-white dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 border-zinc-200/80 dark:border-zinc-800/80"
                                  )}
                                >
                                  {/* Left: Index / Play Button + Cover + Title */}
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectSong(song, searchResults.songs);
                                      }}
                                      className={cn(
                                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-90",
                                        isTrackPlaying
                                          ? "bg-[#0a7c85] text-white"
                                          : isCurrent
                                          ? "bg-[#0a7c85]/20 text-[#0a7c85] dark:text-[#2dd4bf]"
                                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 group-hover:bg-[#0a7c85] group-hover:text-white"
                                      )}
                                      title={isTrackPlaying ? 'Pause' : 'Play'}
                                    >
                                      {isTrackPlaying ? (
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                                      )}
                                    </button>

                                    <img
                                      src={
                                        song.coverUrl ||
                                        'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120'
                                      }
                                      alt={song.title}
                                      className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-200 dark:border-zinc-800"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <h4
                                        className={cn(
                                          "text-xs sm:text-sm font-bold truncate",
                                          isCurrent
                                            ? "text-[#0a7c85] dark:text-[#2dd4bf]"
                                            : "text-zinc-900 dark:text-zinc-100"
                                        )}
                                      >
                                        {song.title}
                                      </h4>
                                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                                        {song.artistName || song.artist?.name || 'Tolee Artist'}
                                        {song.albumName && (
                                          <span className="hidden md:inline text-zinc-400">
                                            {' '}• {song.albumName}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Right: Duration + Like + Actions Dropdown */}
                                  <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-2">
                                    <span className="hidden sm:inline text-xs font-mono text-zinc-400">
                                      {formatDuration(song.duration || 180)}
                                    </span>

                                    {/* Like Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleLike(song.id);
                                      }}
                                      className={cn(
                                        "p-1.5 rounded-lg transition-colors active:scale-90",
                                        isLiked
                                          ? "text-rose-500"
                                          : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                                      )}
                                      title={isLiked ? 'Unlike' : 'Like'}
                                    >
                                      <Heart
                                        className={cn("w-4 h-4", isLiked && "fill-current")}
                                      />
                                    </button>

                                    {/* Reel Button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUseInReel(song);
                                      }}
                                      className="hidden xs:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-[#0a7c85] hover:text-white text-zinc-700 dark:text-zinc-300 text-[11px] font-bold transition-colors"
                                      title="Use audio in Reel"
                                    >
                                      <Film className="w-3 h-3" />
                                      <span>Reel</span>
                                    </button>

                                    {/* 3-Dots Context Menu */}
                                    <DropdownMenu>
                                      <DropdownMenuTrigger
                                        onClick={(e) => e.stopPropagation()}
                                        className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg outline-none"
                                      >
                                        <MoreVertical className="w-4 h-4" />
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent
                                        align="end"
                                        className="w-44 text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                      >
                                        <DropdownMenuItem
                                          onClick={() => {
                                            playNext(song);
                                            showToast('Song will play next');
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <PlayCircle className="w-3.5 h-3.5 mr-2 text-[#0a7c85] dark:text-[#2dd4bf]" />
                                          <span>Play Next</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          onClick={() => {
                                            addToQueue(song);
                                            showToast('Added to queue');
                                          }}
                                          className="cursor-pointer"
                                        >
                                          <ListPlus className="w-3.5 h-3.5 mr-2 text-sky-500" />
                                          <span>Add to Queue</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          onClick={() => handleUseInReel(song)}
                                          className="cursor-pointer"
                                        >
                                          <Film className="w-3.5 h-3.5 mr-2 text-fuchsia-500" />
                                          <span>Create Reel</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          onClick={() => setTrimmerTrack(song)}
                                          className="cursor-pointer"
                                        >
                                          <Scissors className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                          <span>Trim Audio</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem
                                          onClick={() => {
                                            setReportingSong(song);
                                            setIsReportModalOpen(true);
                                          }}
                                          className="cursor-pointer text-rose-500 focus:text-rose-500"
                                        >
                                          <Flag className="w-3.5 h-3.5 mr-2" />
                                          <span>Report Song</span>
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-12 px-4 rounded-2xl bg-zinc-100/60 dark:bg-zinc-900/40 border border-dashed border-zinc-300 dark:border-zinc-800 space-y-3">
                            <Music className="w-10 h-10 text-zinc-400 mx-auto opacity-60" />
                            <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                              No matching songs found
                            </h4>
                            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                              Try searching with different keywords, artist name, or explore one of these popular searches:
                            </p>
                            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
                              {POPULAR_SEARCH_TAGS.map((tag) => (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => setSearchQuery(tag)}
                                  className="px-3 py-1 rounded-full text-[11px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#0a7c85] transition-colors"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Matching Artists Section */}
                    {searchResults.artists?.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Artists
                        </h3>
                        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2">
                          {searchResults.artists.map((artist: any) => (
                            <div
                              key={artist.id}
                              onClick={() => {
                                setSearchQuery(artist.name);
                              }}
                              className="shrink-0 w-24 text-center group cursor-pointer active:scale-95 transition-all"
                            >
                              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden p-0.5 border-2 border-[#0a7c85] group-hover:border-[#2dd4bf] shadow-md transition-colors">
                                <img
                                  src={
                                    artist.image ||
                                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200'
                                  }
                                  alt={artist.name}
                                  className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <h5 className="mt-2 text-xs font-bold truncate text-zinc-900 dark:text-zinc-100 group-hover:text-[#0a7c85] dark:group-hover:text-[#2dd4bf]">
                                {artist.name}
                              </h5>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {artist.genre || 'Artist'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Matching Albums Section */}
                    {searchResults.albums?.length > 0 && (
                      <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          Albums
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {searchResults.albums.map((album: any) => (
                            <div
                              key={album.id}
                              onClick={() => setSearchQuery(album.title)}
                              className="p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-[#0a7c85] cursor-pointer transition-all group"
                            >
                              <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-zinc-100 dark:bg-zinc-800">
                                <img
                                  src={
                                    album.coverUrl ||
                                    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300'
                                  }
                                  alt={album.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                              </div>
                              <h5 className="text-xs font-bold truncate group-hover:text-[#0a7c85]">
                                {album.title}
                              </h5>
                              <p className="text-[10px] text-zinc-400 truncate">
                                {album.releaseYear || 'Album'}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════════
                  2. SPOTIFY-STYLE DISCOVERY / HOME VIEW (When Not Searching)
                 ══════════════════════════════════════════════════════════ */
              <div className="space-y-6">
                {/* ── Hero Banner: Ad-Free Unlimited Music ── */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#032a2d] via-[#074349] to-[#032c30] text-white p-5 sm:p-7 shadow-xl border border-[#0a7c85]/20 select-none">
                  {/* Ambient Lighting & Glow */}
                  <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#2dd4bf]/15 rounded-full blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex items-center justify-between gap-4">
                    {/* Left Content */}
                    <div className="space-y-3 max-w-[65%] sm:max-w-md">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center p-2 shadow-lg shadow-[#0a7c85]/40 border border-white/20 shrink-0">
                          <div className="w-full h-full rounded-full border-2 border-white/60 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                            <div className="w-3 h-3 rounded-full border-2 border-white bg-[#0a7c85]" />
                          </div>
                        </div>
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white">
                            Tolee <span className="text-[#2dd4bf]">Songs</span>
                          </h1>
                          <span className="text-[10px] font-bold tracking-widest uppercase text-emerald-300">
                            100% Ad-Free Experience
                          </span>
                        </div>
                      </div>

                      <p className="text-xs sm:text-sm font-medium text-zinc-200 leading-snug">
                        Unlimited Music • Any Language • Any Mood<br />
                        High Quality Streaming directly into your feed & Reels.
                      </p>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <button
                          type="button"
                          onClick={handleLaunchFirstSong}
                          className="px-4 py-2 rounded-full bg-[#00c9b7] hover:bg-[#00b4a4] text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-[#00c9b7]/30 active:scale-95 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                          <span>Play Trending</span>
                        </button>

                        <Link
                          href="/songs/my-music"
                          className="px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition-all"
                        >
                          <Heart className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                          <span>My Library</span>
                        </Link>
                      </div>
                    </div>

                    {/* Right Graphic: Girl with Headphones */}
                    <div className="relative w-36 xs:w-44 sm:w-60 h-36 sm:h-44 shrink-0 flex items-end justify-end pointer-events-none">
                      <span className="absolute top-2 left-2 text-[#2dd4bf] text-xl font-bold animate-bounce drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]">
                        ♪
                      </span>
                      <span className="absolute top-5 right-2 text-[#2dd4bf] text-sm animate-pulse drop-shadow-[0_0_6px_rgba(45,212,191,0.8)]">
                        ♫
                      </span>
                      <img
                        src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500&auto=format&fit=crop&q=80"
                        alt="Tolee Songs Listener"
                        className="w-full h-full object-cover object-top rounded-2xl opacity-95 filter contrast-105 drop-shadow-2xl"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#032a2d] via-transparent to-transparent opacity-80" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#032a2d] via-transparent to-transparent opacity-60" />
                    </div>
                  </div>
                </div>

                {/* ── Dual Feature Cards: Unlimited Songs + Reels Audio ── */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 select-none">
                  {/* Card 1: Unlimited Songs Bina Ads ke */}
                  <div
                    onClick={handleLaunchFirstSong}
                    className="sm:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#032a2d] via-[#094c52] to-[#0f6b73] text-white p-5 sm:p-6 shadow-md border border-[#0a7c85]/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[135px] flex items-center justify-between"
                  >
                    <div className="relative z-10 space-y-1 max-w-[65%]">
                      <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-black">
                        <span>👑</span>
                        <span className="text-[10px] tracking-wider uppercase bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                          Tolee Ad-Free
                        </span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                        Unlimited Songs
                      </h3>
                      <p className="text-amber-300 text-base sm:text-lg font-black tracking-wide">
                        Bina Ads ke
                      </p>
                    </div>

                    <div className="relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform shrink-0">
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    </div>
                  </div>

                  {/* Card 2: Trending Reels Audio */}
                  <div
                    onClick={() => router.push('/reels')}
                    className="sm:col-span-4 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#581c87] via-[#701a75] to-[#831843] text-white p-5 shadow-md border border-fuchsia-500/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[135px] flex items-center justify-between"
                  >
                    <div className="relative z-10 space-y-2">
                      <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                        Trending<br />
                        Reels Audio
                      </h3>
                      <div className="w-7 h-7 rounded-lg bg-pink-500/80 flex items-center justify-center shadow-md">
                        <Film className="w-4 h-4 text-white" />
                      </div>
                    </div>

                    <div className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform shrink-0">
                      <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* ── Top Charts Section (Spotify-style colored cards) ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <TrendingUp className="w-4.5 h-4.5 text-[#0a7c85] dark:text-[#2dd4bf]" />
                      <span>Top Charts</span>
                    </h3>
                    <Link
                      href="/songs/my-music"
                      className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] flex items-center gap-0.5 transition-colors"
                    >
                      <span>See All</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {TOP_CHARTS.map((chart) => {
                      return (
                        <div
                          key={chart.id}
                          onClick={() =>
                            playTrack(
                              chart.sampleSong,
                              TOP_CHARTS.map((c) => c.sampleSong)
                            )
                          }
                          className={cn(
                            "relative h-32 sm:h-36 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden shadow-md cursor-pointer group active:scale-95 transition-all text-white bg-gradient-to-br",
                            chart.bgGradient
                          )}
                        >
                          <div className="relative z-10">
                            <h4 className="font-black text-xs sm:text-sm leading-tight drop-shadow-sm">
                              {chart.title}
                            </h4>
                            <p className="text-[10px] text-white/80 font-medium mt-0.5">
                              {chart.count}
                            </p>
                          </div>

                          <div className="relative z-10 flex justify-end">
                            <div className="w-8 h-8 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Popular Artists (Circular Avatars) ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <User className="w-4.5 h-4.5 text-[#0a7c85] dark:text-[#2dd4bf]" />
                      <span>Popular Artists</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('Bollywood')}
                      className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] flex items-center gap-0.5 transition-colors cursor-pointer"
                    >
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-2 text-center select-none">
                    {POPULAR_ARTISTS.map((artist) => (
                      <div
                        key={artist.id}
                        onClick={() => {
                          setSearchQuery(artist.name);
                        }}
                        className="shrink-0 group cursor-pointer active:scale-95 transition-all w-20 sm:w-24"
                      >
                        <div className="w-18 h-18 sm:w-22 sm:h-22 mx-auto rounded-full overflow-hidden p-0.5 border-2 border-[#0a7c85] group-hover:border-[#2dd4bf] transition-colors shadow-md">
                          <img
                            src={artist.image}
                            alt={artist.name}
                            className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h4 className="mt-2 font-bold text-[11px] sm:text-xs text-zinc-900 dark:text-zinc-100 truncate group-hover:text-[#0a7c85] dark:group-hover:text-[#2dd4bf]">
                          {artist.name}
                        </h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {artist.genre}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Recommended for You (Track Cards with Play Overlay) ── */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                      <Flame className="w-4.5 h-4.5 text-orange-500 fill-orange-500" />
                      <span>Trending & Recommended Hits</span>
                    </h3>
                    <Link
                      href="/songs/my-music"
                      className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] flex items-center gap-0.5 transition-colors"
                    >
                      <span>Library</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {displayRecommendedSongs.map((song: any) => {
                      const isCurrent = currentTrack?.id === song.id;
                      const isTrackPlaying = isCurrent && isPlaying;
                      const isLiked = likedSongIds.has(song.id);

                      return (
                        <div
                          key={song.id}
                          className={cn(
                            "rounded-2xl border p-2.5 flex flex-col justify-between transition-all bg-white dark:bg-zinc-900/60 shadow-xs group",
                            isCurrent
                              ? "border-[#0a7c85] dark:border-[#2dd4bf] ring-1 ring-[#0a7c85]/40"
                              : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                          )}
                        >
                          {/* Artwork with Instant Hover Play Overlay */}
                          <div
                            onClick={() => handleSelectSong(song, displayRecommendedSongs)}
                            className="relative aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer bg-zinc-100 dark:bg-zinc-800"
                          >
                            <img
                              src={
                                song.coverUrl ||
                                'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300'
                              }
                              alt={song.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />

                            <div
                              className={cn(
                                "absolute inset-0 bg-black/30 flex items-center justify-center transition-opacity",
                                isTrackPlaying
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              <div
                                className={cn(
                                  "w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-transform",
                                  isTrackPlaying
                                    ? "bg-[#0a7c85] dark:bg-[#2dd4bf] text-white dark:text-zinc-950 scale-105"
                                    : "bg-white text-zinc-950 hover:scale-110"
                                )}
                              >
                                {isTrackPlaying ? (
                                  <Pause className="w-4 h-4 fill-current" />
                                ) : (
                                  <Play className="w-4 h-4 fill-current ml-0.5" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Title & Artist */}
                          <div className="min-w-0">
                            <h4
                              className={cn(
                                "text-xs font-bold truncate leading-tight",
                                isCurrent
                                  ? "text-[#0a7c85] dark:text-[#2dd4bf]"
                                  : "text-zinc-900 dark:text-zinc-100"
                              )}
                            >
                              {song.title}
                            </h4>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                              {song.artistName || song.artist?.name || 'Tolee Artist'}
                            </p>
                          </div>

                          {/* Card Footer */}
                          <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleLike(song.id);
                              }}
                              className={cn(
                                "p-1 transition-colors active:scale-90",
                                isLiked
                                  ? "text-rose-500"
                                  : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                              )}
                              title={isLiked ? 'Unlike' : 'Like'}
                            >
                              <Heart
                                className={cn("w-3.5 h-3.5", isLiked && "fill-current")}
                              />
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 outline-none"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-40 text-xs font-semibold bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                              >
                                <DropdownMenuItem
                                  onClick={() => {
                                    playNext(song);
                                    showToast('Song will play next');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <PlayCircle className="w-3.5 h-3.5 mr-2 text-[#0a7c85] dark:text-[#2dd4bf]" />
                                  <span>Play Next</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    addToQueue(song);
                                    showToast('Added to queue');
                                  }}
                                  className="cursor-pointer"
                                >
                                  <ListPlus className="w-3.5 h-3.5 mr-2 text-sky-500" />
                                  <span>Add to Queue</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleUseInReel(song)}
                                  className="cursor-pointer"
                                >
                                  <Film className="w-3.5 h-3.5 mr-2 text-fuchsia-500" />
                                  <span>Use in Reel</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setTrimmerTrack(song)}
                                  className="cursor-pointer"
                                >
                                  <Scissors className="w-3.5 h-3.5 mr-2 text-amber-500" />
                                  <span>Trim Audio</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReportingSong(song);
                                    setIsReportModalOpen(true);
                                  }}
                                  className="cursor-pointer text-rose-500"
                                >
                                  <Flag className="w-3.5 h-3.5 mr-2" />
                                  <span>Report Song</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── Audio Trimmer Drawer if active ── */}
            {trimmerTrack && (
              <div className="p-5 bg-white dark:bg-zinc-900 border border-[#0a7c85]/40 rounded-3xl shadow-xl space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        trimmerTrack.coverUrl ||
                        'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'
                      }
                      alt={trimmerTrack.title}
                      className="w-10 h-10 rounded-xl object-cover"
                    />
                    <div>
                      <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">
                        {trimmerTrack.title}
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        {trimmerTrack.artistName || trimmerTrack.artist?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUseInReel(trimmerTrack)}
                      className="px-3 py-1.5 bg-[#0a7c85] text-white font-bold text-xs rounded-full flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Open Reel Creator</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimmerTrack(null)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-white px-2 py-1 cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
                <AudioWaveformTrimmer track={trimmerTrack} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Launch / Upload Music Modal */}
      <LaunchMusicModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
        onSuccess={() => {
          getSongsFeedAction().then((res) => {
            if (res?.success) setFeedData(res);
          });
        }}
      />

      {/* Report Song Modal */}
      <ReportSongModal
        isOpen={isReportModalOpen}
        song={reportingSong}
        onClose={() => {
          setIsReportModalOpen(false);
          setReportingSong(null);
        }}
      />
    </div>
  );
}
