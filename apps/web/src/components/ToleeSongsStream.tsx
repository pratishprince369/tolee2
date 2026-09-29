'use client';

import React, { useState, useEffect } from 'react';
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

// Mockup-aligned Curated Datasets
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

export function ToleeSongsStream() {
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlay, toggleLike, likedSongIds } =
    useMusicPlayer();

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

  // Load Feed Data from Database
  useEffect(() => {
    getSongsFeedAction().then((res) => {
      if (res?.success) {
        setFeedData(res);
      }
    }).catch(() => {});
  }, []);

  // Handle Dynamic Search
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length > 0 || (selectedCategory !== 'All' && selectedCategory !== '')) {
        setIsSearching(true);
        searchSongsAction(searchQuery, selectedCategory === 'All' ? '' : selectedCategory).then((res) => {
          if (res?.success) {
            setSearchResults(res);
          }
          setIsSearching(false);
        }).catch(() => setIsSearching(false));
      } else {
        setSearchResults(null);
      }
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery, selectedCategory]);

  const handleUseInReel = (track: any) => {
    router.push(
      `/reels?action=create&audioId=${encodeURIComponent(track.id)}&audioTitle=${encodeURIComponent(
        track.title
      )}`
    );
  };

  // Build recommended songs pool (Database trending songs combined with curated hits)
  const displayRecommendedSongs = feedData.trendingSongs?.length > 0
    ? feedData.trendingSongs.slice(0, 8)
    : CURATED_RECOMMENDED;

  const handleLaunchFirstSong = () => {
    const firstSong = displayRecommendedSongs[0] || CURATED_RECOMMENDED[0];
    if (firstSong) {
      playTrack(firstSong, displayRecommendedSongs);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-36 font-sans">
      <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 space-y-5">
        
        {/* ── 1. Hero Banner (Tolee Songs with Girl with Headphones) ── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#032a2d] via-[#074349] to-[#032c30] text-white p-5 sm:p-7 shadow-xl border border-[#0a7c85]/20 select-none">
          {/* Ambient Lighting & Glow */}
          <div className="absolute top-0 right-1/4 w-72 h-72 bg-[#2dd4bf]/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-2 sm:gap-4">
            {/* Left Content */}
            <div className="space-y-3 max-w-[62%] sm:max-w-md">
              <div className="flex items-center gap-3">
                {/* Vinyl Record Icon Badge */}
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-tr from-[#0a7c85] to-[#2dd4bf] flex items-center justify-center p-2 shadow-lg shadow-[#0a7c85]/40 border border-white/20 shrink-0">
                  <div className="w-full h-full rounded-full border-2 border-white/60 flex items-center justify-center animate-[spin_10s_linear_infinite]">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white bg-[#0a7c85]" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-none text-white">
                    Tolee <span className="text-[#2dd4bf] block sm:inline">Songs</span>
                  </h1>
                </div>
              </div>

              <p className="text-xs sm:text-sm font-medium text-zinc-200 leading-snug">
                Unlimited Music<br />
                Any Language,<br />
                Any Mood
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  onClick={handleLaunchFirstSong}
                  className="px-4 py-2 rounded-full bg-[#00c9b7] hover:bg-[#00b4a4] text-zinc-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-[#00c9b7]/30 active:scale-95 transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  <span>Launch Player</span>
                </button>

                <Link
                  href="/songs/my-music"
                  className="px-4 py-2 rounded-full bg-black/40 hover:bg-black/60 border border-white/20 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 backdrop-blur-md active:scale-95 transition-all"
                >
                  <Heart className="w-3.5 h-3.5 fill-white text-white" />
                  <span>My Library</span>
                </Link>
              </div>
            </div>

            {/* Right Graphic: Girl with Headphones & Floating Glowing Notes */}
            <div className="relative w-36 xs:w-44 sm:w-64 h-36 sm:h-44 shrink-0 flex items-end justify-end pointer-events-none">
              {/* Floating Musical Notes */}
              <span className="absolute top-2 left-2 text-[#2dd4bf] text-xl font-bold animate-bounce drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]">♪</span>
              <span className="absolute top-5 right-2 text-[#2dd4bf] text-sm animate-pulse drop-shadow-[0_0_6px_rgba(45,212,191,0.8)]">♫</span>
              <span className="absolute bottom-6 left-0 text-white/90 text-base drop-shadow-[0_0_6px_white]">♬</span>
              <span className="absolute bottom-1 right-6 text-[#2dd4bf] text-xs font-mono">♪</span>

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

        {/* ── 2. Search Bar with Mic ── */}
        <div className="relative w-full">
          <Search className="w-4.5 h-4.5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs, artists, albums, moods..."
            className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full pl-11 pr-11 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 shadow-sm focus:outline-none focus:border-[#0a7c85] transition-all"
          />
          <Mic 
            className="w-4.5 h-4.5 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 cursor-pointer hover:text-[#0a7c85] transition-colors" 
            onClick={() => {
              if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                const recognition = new SpeechRecognition();
                recognition.onresult = (event: any) => {
                  setSearchQuery(event.results[0][0].transcript);
                };
                recognition.start();
              }
            }}
          />
        </div>

        {/* ── 3. Category Filter Tabs (Horizontal Scroll) ── */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-95 shadow-xs cursor-pointer",
                  isActive
                    ? "bg-[#0a7c85] text-white font-bold shadow-md shadow-[#0a7c85]/25"
                    : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* ── 4. Search Results View (If actively searching) ── */}
        {searchResults ? (
          <div className="space-y-4 pt-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-lg font-black flex items-center gap-2 text-zinc-900 dark:text-white">
                <Search className="w-4.5 h-4.5 text-[#0a7c85]" />
                Search Results {isSearching && <span className="text-xs text-zinc-400 font-normal">(Searching...)</span>}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setSearchResults(null);
                }}
                className="text-xs font-bold text-[#0a7c85] hover:underline"
              >
                Clear Search
              </button>
            </div>

            {/* Found Songs List */}
            <div className="space-y-2">
              {searchResults.songs?.length > 0 ? (
                searchResults.songs.map((song: any) => {
                  const isCurrent = currentTrack?.id === song.id;
                  const isTrackPlaying = isCurrent && isPlaying;
                  const isLiked = likedSongIds.has(song.id);

                  return (
                    <div
                      key={song.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-2xl border transition-all select-none",
                        isCurrent
                          ? "bg-primary/5 dark:bg-zinc-900 border-[#0a7c85]/50 shadow-sm"
                          : "bg-white dark:bg-zinc-900/50 hover:bg-zinc-50 dark:hover:bg-zinc-900 border-zinc-150 dark:border-zinc-800"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => (isCurrent ? togglePlay() : playTrack(song, searchResults.songs))}
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95",
                            isTrackPlaying
                              ? "bg-[#0a7c85] text-white scale-105"
                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200"
                          )}
                        >
                          {isTrackPlaying ? (
                            <Pause className="w-4 h-4 fill-current" />
                          ) : (
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          )}
                        </button>

                        <img
                          src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=120'}
                          alt={song.title}
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          <h4 className={cn("text-xs sm:text-sm font-bold truncate", isCurrent ? "text-[#0a7c85]" : "text-zinc-900 dark:text-zinc-100")}>
                            {song.title}
                          </h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                            {song.artistName || song.artist?.name || 'Tolee Artist'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleLike(song.id)}
                          className={cn("p-1.5 transition-colors", isLiked ? "text-rose-500" : "text-zinc-400 hover:text-zinc-600")}
                        >
                          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUseInReel(song)}
                          className="px-2.5 py-1 rounded-lg bg-[#0a7c85] text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
                        >
                          <Film className="w-3 h-3" />
                          <span>Reel</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-zinc-400 text-xs">
                  No matching tracks found for &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ── 5. Featured 2 Dual Cards (Unlimited Songs + Trending Reels Audio) ── */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 select-none">
              {/* Card 1: Unlimited Songs Bina Ads ke (Left, ~65%) */}
              <div 
                onClick={handleLaunchFirstSong}
                className="sm:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#032a2d] via-[#094c52] to-[#0f6b73] text-white p-5 sm:p-6 shadow-md border border-[#0a7c85]/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[140px] flex items-center justify-between"
              >
                {/* Background Artwork Decoration */}
                <div className="absolute right-0 inset-y-0 w-3/5 opacity-80 pointer-events-none flex items-center justify-end overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"
                    alt="Singers Collage"
                    className="w-full h-full object-cover object-center mix-blend-overlay group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-[#032a2d] via-transparent to-transparent" />
                </div>

                <div className="relative z-10 space-y-1 max-w-[65%]">
                  <div className="inline-flex items-center gap-1.5 text-amber-300 text-xs font-black">
                    <span>👑</span>
                    <span className="text-[10px] tracking-wider uppercase bg-amber-400/20 px-2 py-0.5 rounded-full border border-amber-400/30">
                      Tolee Premium
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                    Unlimited Songs
                  </h3>
                  <p className="text-amber-300 text-base sm:text-lg font-black tracking-wide">
                    Bina Ads ke
                  </p>
                </div>

                {/* Floating Cyan Play Button */}
                <div className="relative z-10 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#2dd4bf] text-zinc-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform shrink-0">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>

              {/* Card 2: Trending Reels Audio (Right, ~35%) */}
              <div 
                onClick={() => router.push('/reels')}
                className="sm:col-span-4 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#581c87] via-[#701a75] to-[#831843] text-white p-5 shadow-md border border-fuchsia-500/30 cursor-pointer group active:scale-[0.99] transition-all min-h-[140px] flex items-center justify-between"
              >
                <div className="relative z-10 space-y-2">
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug">
                    Trending<br />
                    Reels<br />
                    Audio
                  </h3>
                  <div className="w-7 h-7 rounded-lg bg-pink-500/80 flex items-center justify-center shadow-md">
                    <Film className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Floating White Play Button */}
                <div className="relative z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform shrink-0">
                  <Play className="w-4.5 h-4.5 fill-current ml-0.5" />
                </div>
              </div>
            </div>

            {/* ── 6. Top Charts Section ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                  <TrendingUp className="w-4.5 h-4.5 text-[#0a7c85]" />
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

              {/* Horizontal Scroll Cards */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
                {TOP_CHARTS.map((chart) => {
                  return (
                    <div
                      key={chart.id}
                      onClick={() => playTrack(chart.sampleSong, TOP_CHARTS.map(c => c.sampleSong))}
                      className={cn(
                        "relative shrink-0 w-36 xs:w-40 sm:w-44 h-36 rounded-2xl p-3.5 flex flex-col justify-between overflow-hidden shadow-md cursor-pointer group active:scale-95 transition-all text-white bg-gradient-to-br",
                        chart.bgGradient
                      )}
                    >
                      {/* Ambient corner glow */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

                      <div className="relative z-10">
                        {chart.id === 'chart-trending-today' && (
                          <div className="w-6 h-6 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <h4 className="font-black text-xs sm:text-sm leading-tight drop-shadow-sm">
                          {chart.title}
                        </h4>
                        <p className="text-[10px] text-white/80 font-medium">
                          {chart.count}
                        </p>
                      </div>

                      {/* White Circular Play Button */}
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

            {/* ── 7. Popular Artists Section ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                  <User className="w-4.5 h-4.5 text-[#0a7c85]" />
                  <span>Popular Artists</span>
                </h3>
                <Link 
                  href="/songs/my-music" 
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Horizontal Scroll Circular Artists */}
              <div className="flex items-center gap-4 sm:gap-5 overflow-x-auto no-scrollbar pb-1 text-center select-none">
                {POPULAR_ARTISTS.map((artist) => (
                  <div
                    key={artist.id}
                    onClick={() => {
                      setSearchQuery(artist.name);
                    }}
                    className="shrink-0 group cursor-pointer active:scale-95 transition-all w-20 sm:w-24"
                  >
                    <div className="w-18 h-18 sm:w-20 sm:h-20 mx-auto rounded-full overflow-hidden p-0.5 border-2 border-[#0a7c85] group-hover:border-[#2dd4bf] transition-colors shadow-md">
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

            {/* ── 8. Recommended for You Section ── */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-base sm:text-lg font-black flex items-center gap-1.5 text-zinc-900 dark:text-white">
                  <Heart className="w-4.5 h-4.5 text-emerald-500 fill-emerald-500" />
                  <span>Recommended for You</span>
                </h3>
                <Link 
                  href="/songs/my-music" 
                  className="text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-[#0a7c85] dark:hover:text-[#2dd4bf] flex items-center gap-0.5 transition-colors"
                >
                  <span>See All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Horizontal Scroll Song Cards */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 select-none">
                {displayRecommendedSongs.map((song: any) => {
                  const isCurrent = currentTrack?.id === song.id;
                  const isTrackPlaying = isCurrent && isPlaying;
                  const isLiked = likedSongIds.has(song.id);

                  return (
                    <div
                      key={song.id}
                      className={cn(
                        "shrink-0 w-36 xs:w-40 sm:w-44 rounded-2xl border p-2.5 flex flex-col justify-between transition-all bg-white dark:bg-zinc-900 shadow-xs",
                        isCurrent 
                          ? "border-[#0a7c85] dark:border-[#2dd4bf]" 
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      {/* Album Art with Play Overlay */}
                      <div 
                        onClick={() => (isCurrent ? togglePlay() : playTrack(song, displayRecommendedSongs))}
                        className="relative aspect-square rounded-xl overflow-hidden mb-2 cursor-pointer group shadow-sm bg-zinc-100 dark:bg-zinc-800"
                      >
                        <img
                          src={song.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=250'}
                          alt={song.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Play Button Pill Overlay */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition-transform",
                            isTrackPlaying
                              ? "bg-[#0a7c85] text-white scale-110"
                              : "bg-white/90 text-zinc-950 group-hover:scale-110"
                          )}>
                            {isTrackPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Title & Artist */}
                      <div className="space-y-0.5 min-w-0">
                        <h4 className={cn("text-xs font-bold truncate leading-tight", isCurrent ? "text-[#0a7c85] dark:text-[#2dd4bf]" : "text-zinc-900 dark:text-zinc-100")}>
                          {song.title}
                        </h4>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                          {song.artistName || song.artist?.name || 'Tolee Artist'}
                        </p>
                      </div>

                      {/* Card Footer: Heart & 3-Dots */}
                      <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 mt-2">
                        <button
                          type="button"
                          onClick={() => toggleLike(song.id)}
                          className={cn("p-1 transition-colors active:scale-90", isLiked ? "text-rose-500" : "text-zinc-400 hover:text-zinc-600")}
                        >
                          <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-current")} />
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 outline-none">
                            <MoreVertical className="w-3.5 h-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36 text-xs font-semibold">
                            <DropdownMenuItem onClick={() => handleUseInReel(song)} className="cursor-pointer">
                              <Film className="w-3.5 h-3.5 mr-2 text-[#0a7c85]" />
                              <span>Use in Reel</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTrimmerTrack(song)} className="cursor-pointer">
                              <Scissors className="w-3.5 h-3.5 mr-2 text-indigo-500" />
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
                              <span>Report Track</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Trimmer Drawer if active */}
        {trimmerTrack && (
          <div className="p-5 bg-white dark:bg-zinc-900 border border-[#0a7c85]/40 rounded-3xl shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <div className="flex items-center gap-3">
                <img
                  src={trimmerTrack.coverUrl || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=100'}
                  alt={trimmerTrack.title}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div>
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white">{trimmerTrack.title}</h3>
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
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-white px-2 py-1"
                >
                  Close
                </button>
              </div>
            </div>
            <AudioWaveformTrimmer track={trimmerTrack} />
          </div>
        )}

      </div>

      {/* Launch Music Modal */}
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
