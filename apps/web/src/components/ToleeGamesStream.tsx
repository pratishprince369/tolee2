'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Gamepad2,
  Search,
  Sparkles,
  TrendingUp,
  Star,
  Play,
  Share2,
  ExternalLink,
  Flame,
  Zap,
  Filter,
  Check,
  ChevronRight,
  Trophy,
  Users,
  Download,
  Smartphone,
  Swords,
  Car,
  Puzzle,
  Crown,
  CircleDot,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import {
  ToleeGame,
  GAME_GENRES,
  GameGenre,
  getAllGames,
  getFeaturedGames,
  getTrendingGames,
  getGameById,
} from '@/lib/gamesData';
import { GamePlayerModal } from '@/components/GamePlayerModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export function ToleeGamesStream() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGameId = searchParams.get('play');

  const allGames = useMemo(() => getAllGames(), []);
  const featuredGames = useMemo(() => getFeaturedGames(), []);
  const trendingGames = useMemo(() => getTrendingGames(), []);

  const [selectedGenre, setSelectedGenre] = useState<GameGenre>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'rating' | 'new' | 'recent'>('popular');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [activeGame, setActiveGame] = useState<ToleeGame | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const browseSectionRef = useRef<HTMLDivElement>(null);

  // Auto-open game if ?play=game-id is in URL
  useEffect(() => {
    if (initialGameId) {
      const g = getGameById(initialGameId);
      if (g) {
        setActiveGame(g);
        setIsPlayerOpen(true);
      }
    }
  }, [initialGameId]);

  // Handle Tab switch
  const handleTabChange = (tab: 'popular' | 'rating' | 'new' | 'recent') => {
    setActiveTab(tab);
    if (tab === 'rating') setSortBy('rating');
    else if (tab === 'new' || tab === 'recent') setSortBy('newest');
    else setSortBy('popular');
  };

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    let list = [...allGames];

    if (selectedGenre !== 'All') {
      if (selectedGenre === 'Sports') {
        list = list.filter((g) => {
          const t = (g.title + ' ' + g.description + ' ' + g.technology.join(' ')).toLowerCase();
          return t.includes('kart') || t.includes('racer') || t.includes('drift') || t.includes('sports') || t.includes('pool') || t.includes('golf') || t.includes('ball') || t.includes('fighter') || t.includes('kombat');
        });
      } else if (selectedGenre === 'Multiplayer') {
        list = list.filter((g) => {
          const t = (g.title + ' ' + g.description + ' ' + g.technology.join(' ')).toLowerCase();
          return t.includes('multiplayer') || t.includes('chess') || t.includes('fighter') || t.includes('combat') || t.includes('durable objects') || t.includes('battle') || t.includes('match') || t.includes('rogue');
        });
      } else {
        list = list.filter((g) => g.genre === selectedGenre);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.technology.some((t) => t.toLowerCase().includes(q)) ||
          g.modelAttribution.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'newest') {
      list.reverse();
    } else {
      list.sort((a, b) => b.playsCount - a.playsCount);
    }

    return list;
  }, [allGames, selectedGenre, searchQuery, sortBy]);

  const displayedGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  const handlePlayGame = (game: ToleeGame) => {
    setActiveGame(game);
    setIsPlayerOpen(true);
  };

  const handleStartPlayingHero = () => {
    const topGame = featuredGames[0] || allGames[0];
    if (topGame) {
      handlePlayGame(topGame);
    }
  };

  const scrollToBrowse = () => {
    browseSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Genre Icon Helper matching the mockup
  const renderGenreIcon = (genre: GameGenre) => {
    switch (genre) {
      case '3D & Racing':
        return <Car className="w-4 h-4 text-cyan-400" />;
      case 'Action & Combat':
        return <Swords className="w-4 h-4 text-amber-400" />;
      case 'Puzzle & Board':
        return <Puzzle className="w-4 h-4 text-indigo-400" />;
      case 'Arcade & Casual':
        return <Gamepad2 className="w-4 h-4 text-orange-400" />;
      case 'Strategy & RPG':
        return <Crown className="w-4 h-4 text-purple-400" />;
      case 'Sports':
        return <Trophy className="w-4 h-4 text-rose-400" />;
      case 'Multiplayer':
        return <Users className="w-4 h-4 text-teal-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#070B11] text-white pb-24 md:pb-16 select-none font-sans">
      {/* ── Top Search Header Bar (matching mockup center input) ── */}
      <div className="w-full bg-[#0B1019]/90 backdrop-blur-md border-b border-[#182332] px-4 py-3 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <div className="relative w-full max-w-xl">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games, 3D, racing, puzzle, action..."
              className="w-full h-10 pl-10 pr-9 rounded-full bg-[#111926] border border-[#202E42] text-xs sm:text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-[#00D2C4] focus:ring-1 focus:ring-[#00D2C4] transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* ── WELCOME TO TOLEE GAMES — HERO BANNER ── */}
        {!searchQuery && selectedGenre === 'All' && (
          <div className="relative rounded-3xl overflow-hidden border border-[#1C283B] bg-gradient-to-r from-[#0B131E] via-[#0E1A29] to-[#0A131F] shadow-2xl p-6 sm:p-9">
            {/* Ambient Background Radial Glows */}
            <div className="absolute -left-20 -top-20 w-96 h-96 bg-[#00D2C4]/15 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute right-10 bottom-0 w-96 h-96 bg-[#0070F3]/15 rounded-full filter blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Left Column: Heading, Subtitle & Start Playing CTA */}
              <div className="flex-1 space-y-3.5 text-center lg:text-left">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#00D2C4]">
                  WELCOME TO
                </span>

                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none">
                  Tolee <span className="bg-gradient-to-r from-[#00E5FF] via-[#00D2C4] to-[#00BFA5] text-transparent bg-clip-text">Games</span>
                </h1>

                <p className="text-base sm:text-lg font-bold text-zinc-200">
                  Play. Compete. Have Fun.
                </p>

                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto lg:mx-0">
                  Instant HTML5 & WebGL games — No downloads required
                </p>

                <div className="pt-2 flex justify-center lg:justify-start">
                  <button
                    onClick={handleStartPlayingHero}
                    className="inline-flex items-center gap-2.5 px-6 sm:px-8 py-3 rounded-full bg-[#00D2C4] hover:bg-[#00E5FF] text-black font-extrabold text-sm shadow-lg shadow-[#00D2C4]/25 hover:shadow-[#00D2C4]/40 active:scale-95 transition-all cursor-pointer"
                  >
                    <Gamepad2 className="w-4 h-4 fill-black stroke-black" />
                    <span>Start Playing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Center 3D Illustration Graphic (Gamepad + 3D Cards) */}
              <div className="relative w-full max-w-sm sm:max-w-md h-52 sm:h-64 flex items-center justify-center select-none">
                {/* 3D Floating Neon Game Controller Composition */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Floating Top Left Badge (Racing Car) */}
                  <div className="absolute top-2 left-6 w-20 sm:w-24 aspect-16/10 rounded-xl overflow-hidden border border-[#00F0FF]/40 shadow-xl shadow-cyan-500/20 transform -rotate-12 hover:rotate-0 transition-transform duration-300">
                    <img
                      src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=300&q=80"
                      alt="3D Racing"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Floating Crown Badge */}
                  <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 p-2 shadow-lg shadow-amber-500/30 transform rotate-12 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-black fill-black" />
                  </div>

                  {/* Floating Dartboard Badge */}
                  <div className="absolute bottom-4 right-10 w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2 shadow-lg shadow-rose-500/30 transform -rotate-6 flex items-center justify-center">
                    <CircleDot className="w-6 h-6 text-white" />
                  </div>

                  {/* Floating Retro Character Badge */}
                  <div className="absolute bottom-2 left-16 w-16 h-12 rounded-xl overflow-hidden border border-amber-500/40 shadow-xl shadow-amber-500/20 transform rotate-6">
                    <img
                      src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&q=80"
                      alt="Pixel Retro"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Main High-Tech Gamepad Center Art */}
                  <div className="relative z-10 w-44 sm:w-56 filter drop-shadow-[0_15px_30px_rgba(0,210,196,0.35)] transform hover:scale-105 transition-transform duration-300">
                    <svg viewBox="0 0 240 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto">
                      <defs>
                        <linearGradient id="bodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#FFFFFF" />
                          <stop offset="60%" stopColor="#E2E8F0" />
                          <stop offset="100%" stopColor="#CBD5E1" />
                        </linearGradient>
                        <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#00F0FF" />
                          <stop offset="100%" stopColor="#00D2C4" />
                        </linearGradient>
                      </defs>
                      {/* Controller Body Shell */}
                      <path
                        d="M60 40 C30 40 15 70 20 120 C23 145 45 155 65 140 C80 130 90 100 120 100 C150 100 160 130 175 140 C195 155 217 145 220 120 C225 70 210 40 180 40 C155 40 135 55 120 55 C105 55 85 40 60 40 Z"
                        fill="url(#bodyGrad)"
                        stroke="#94A3B8"
                        strokeWidth="3"
                      />
                      {/* D-Pad on Left */}
                      <rect x="52" y="72" width="12" height="34" rx="3" fill="#0F172A" />
                      <rect x="41" y="83" width="34" height="12" rx="3" fill="#0F172A" />
                      {/* D-Pad Teal Center */}
                      <circle cx="58" cy="89" r="3.5" fill="url(#tealGrad)" />
                      {/* Action Buttons on Right */}
                      <circle cx="182" cy="76" r="6" fill="url(#tealGrad)" />
                      <circle cx="194" cy="88" r="6" fill="#00D2C4" />
                      <circle cx="170" cy="88" r="6" fill="#00D2C4" />
                      <circle cx="182" cy="100" r="6" fill="#00BFA5" />
                      {/* Thumbsticks */}
                      <circle cx="92" cy="98" r="14" fill="#1E293B" stroke="#00D2C4" strokeWidth="2.5" />
                      <circle cx="92" cy="98" r="8" fill="#334155" />
                      <circle cx="148" cy="98" r="14" fill="#1E293B" stroke="#00D2C4" strokeWidth="2.5" />
                      <circle cx="148" cy="98" r="8" fill="#334155" />
                      {/* Tolee Brand Text on Center */}
                      <text x="120" y="75" textAnchor="middle" fill="#0F172A" fontSize="11" fontWeight="bold" fontFamily="sans-serif">
                        tolee
                      </text>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Right Column: 4 Feature Highlights */}
              <div className="flex flex-col gap-2.5 w-full sm:w-64 shrink-0">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200 shadow-sm hover:border-[#00D2C4]/40 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#00D2C4]/15 text-[#00D2C4] flex items-center justify-center">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <span>200+ Free Games</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200 shadow-sm hover:border-[#00D2C4]/40 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#00F0FF]/15 text-[#00F0FF] flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <span>No Downloads</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200 shadow-sm hover:border-[#00D2C4]/40 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#3B82F6]/15 text-[#3B82F6] flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <span>Play on Any Device</span>
                </div>

                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200 shadow-sm hover:border-[#00D2C4]/40 transition-colors">
                  <div className="w-7 h-7 rounded-xl bg-[#F59E0B]/15 text-[#F59E0B] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span>New Games Daily</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Category Filter Pills Row (matching mockup) ── */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
          {GAME_GENRES.map((genre) => {
            const isSelected = selectedGenre === genre;
            return (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer',
                  isSelected
                    ? 'bg-[#00D2C4] text-black shadow-lg shadow-[#00D2C4]/30 scale-[1.03]'
                    : 'bg-[#0E1624] text-zinc-300 hover:text-white hover:bg-[#141F30] border border-[#1F2D40]'
                )}
              >
                {renderGenreIcon(genre)}
                <span>{genre}</span>
              </button>
            );
          })}
        </div>

        {/* ── Trending Now Section (matching mockup) ── */}
        {!searchQuery && selectedGenre === 'All' && (
          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🔥</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Trending Now
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Most played games on Tolee this week
                  </p>
                </div>
              </div>

              <button
                onClick={scrollToBrowse}
                className="text-xs font-bold text-[#00D2C4] hover:text-[#00F0FF] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Trending Horizontal Row of 5 Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingGames.slice(0, 5).map((game) => (
                <div
                  key={`trending-${game.id}`}
                  onClick={() => handlePlayGame(game)}
                  className="rounded-2xl bg-[#0D1522] border border-[#1A2636] hover:border-[#00D2C4]/60 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group shadow-lg hover:shadow-cyan-500/10"
                >
                  {/* Card Thumbnail */}
                  <div className="relative aspect-4/3 overflow-hidden bg-black">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Rating Badge top-right with gold star */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/75 backdrop-blur-md text-amber-400 flex items-center gap-1 border border-white/10 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{game.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Card Bottom Footer */}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-xs text-zinc-100 truncate group-hover:text-[#00D2C4] transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {game.genre}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mt-0.5">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span>{(game.playsCount / 1000).toFixed(0)}K plays</span>
                      </div>
                    </div>

                    {/* Circular Cyan Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayGame(game);
                      }}
                      className="w-8 h-8 rounded-full bg-[#00D2C4] text-black flex items-center justify-center shrink-0 shadow-md shadow-[#00D2C4]/30 group-hover:scale-110 group-hover:bg-[#00F0FF] transition-all cursor-pointer"
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5 fill-black stroke-black translate-x-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Browse All Games Section ── */}
        <div ref={browseSectionRef} className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-[#00D2C4]" />
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                Browse All Games{' '}
                <span className="text-xs font-medium text-zinc-500">
                  ({filteredGames.length} games)
                </span>
              </h2>
            </div>

            {/* Right Tabs & Filter: New, Top Rated, Most Popular, Recently Added */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => handleTabChange('new')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'new'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                New
              </button>

              <button
                onClick={() => handleTabChange('rating')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'rating'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                Top Rated
              </button>

              <button
                onClick={() => handleTabChange('popular')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'popular'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                Most Popular
              </button>

              <button
                onClick={() => handleTabChange('recent')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'recent'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                Recently Added
              </button>
            </div>
          </div>

          {/* Grid of Games Cards */}
          {displayedGames.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-zinc-500 mx-auto flex items-center justify-center">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-zinc-200">No games found</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No matching games found for &quot;{searchQuery}&quot;. Try searching for &quot;chess&quot;, &quot;3D&quot;, or &quot;fighter&quot;.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('All');
                }}
                className="rounded-full border-zinc-700 text-xs mt-2"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handlePlayGame(game)}
                  className="rounded-2xl bg-[#0D1522] border border-[#1A2636] hover:border-[#00D2C4]/60 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group shadow-md hover:shadow-cyan-500/10"
                >
                  {/* Card Thumbnail */}
                  <div className="relative aspect-4/3 overflow-hidden bg-black">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* Rating Badge top-right with gold star */}
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/75 backdrop-blur-md text-amber-400 flex items-center gap-1 border border-white/10 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                      <span>{game.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Card Bottom Footer */}
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-xs text-zinc-100 truncate group-hover:text-[#00D2C4] transition-colors">
                        {game.title}
                      </h3>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {game.genre}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono mt-0.5">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span>{(game.playsCount / 1000).toFixed(0)}K plays</span>
                      </div>
                    </div>

                    {/* Circular Cyan Play Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayGame(game);
                      }}
                      className="w-8 h-8 rounded-full bg-[#00D2C4] text-black flex items-center justify-center shrink-0 shadow-md shadow-[#00D2C4]/30 group-hover:scale-110 group-hover:bg-[#00F0FF] transition-all cursor-pointer"
                      title="Play Now"
                    >
                      <Play className="w-3.5 h-3.5 fill-black stroke-black translate-x-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredGames.length && (
            <div className="pt-6 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 20)}
                className="px-8 py-2.5 rounded-full border border-[#202E42] bg-[#0E1624] hover:bg-[#141F30] text-xs font-bold text-zinc-200 transition-colors shadow-md cursor-pointer"
              >
                Load More Games ({filteredGames.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Active Game Player Modal ── */}
      <GamePlayerModal
        game={activeGame}
        isOpen={isPlayerOpen}
        onClose={() => {
          setIsPlayerOpen(false);
          setActiveGame(null);
        }}
      />
    </div>
  );
}
