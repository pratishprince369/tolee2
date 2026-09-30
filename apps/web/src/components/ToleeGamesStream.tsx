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
import { Badge } from '@/components/ui/badge';
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
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [activeGame, setActiveGame] = useState<ToleeGame | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  // Spotlight Game for Hero Banner (Highest rated 3D or Action game)
  const heroGame = useMemo(() => {
    return (
      allGames.find((g) => g.id === 'turbo-kart-grand-prix') ||
      allGames.find((g) => g.id === 'claude-chess') ||
      featuredGames[0] ||
      allGames[0]
    );
  }, [allGames, featuredGames]);

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    let list = [...allGames];

    if (selectedGenre !== 'All') {
      list = list.filter((g) => g.genre === selectedGenre);
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

  const handleShareGame = (e: React.MouseEvent, game: ToleeGame) => {
    e.stopPropagation();
    const url = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      navigator.share({
        title: `Play ${game.title} on Tolee Games`,
        text: `Play ${game.title} directly in your browser on Tolee Games!`,
        url,
      }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url);
    setCopiedId(game.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 md:pb-16 select-none">
      {/* ── Top Hero Banner Section ── */}
      {selectedGenre === 'All' && !searchQuery && heroGame && (
        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6">
          <div className="relative rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/60 shadow-2xl group">
            {/* Ambient Background Glow */}
            <div
              className="absolute inset-0 bg-cover bg-center filter blur-3xl opacity-25 scale-110 pointer-events-none transition-all duration-700 group-hover:opacity-35"
              style={{ backgroundImage: `url(${heroGame.coverImage})` }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent z-0" />

            <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="max-w-xl space-y-3.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 flex items-center gap-1.5 shadow-sm">
                    <Flame className="w-3.5 h-3.5 text-primary fill-primary" />
                    Spotlight Game
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-amber-300" />
                    {heroGame.rating.toFixed(1)} Rating
                  </span>
                  <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                    {heroGame.genre}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-black text-zinc-100 tracking-tight leading-tight">
                  {heroGame.title}
                </h1>

                <p className="text-sm sm:text-base text-zinc-300 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                  {heroGame.description}
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  {heroGame.technology.map((tech) => (
                    <span
                      key={tech}
                      className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/60"
                    >
                      {tech}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-3 pt-3">
                  <Button
                    onClick={() => handlePlayGame(heroGame)}
                    size="lg"
                    className="px-8 rounded-full font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 active:scale-95 transition-all gap-2"
                  >
                    <Play className="w-4 h-4 fill-current translate-x-0.5" />
                    Play Now
                  </Button>
                  <Button
                    onClick={(e) => handleShareGame(e, heroGame)}
                    variant="outline"
                    size="lg"
                    className="rounded-full border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm"
                  >
                    {copiedId === heroGame.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                    <span className="hidden sm:inline ml-2">{copiedId === heroGame.id ? 'Copied' : 'Share'}</span>
                  </Button>
                </div>
              </div>

              {/* Cover Preview Image */}
              <div
                onClick={() => handlePlayGame(heroGame)}
                className="relative w-full md:w-80 aspect-video md:aspect-4/3 rounded-2xl overflow-hidden border border-zinc-700/60 shadow-2xl cursor-pointer group/art"
              >
                <img
                  src={heroGame.coverImage}
                  alt={heroGame.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/art:scale-105"
                />
                <div className="absolute inset-0 bg-black/30 group-hover/art:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-2xl group-hover/art:scale-110 transition-transform">
                    <Play className="w-6 h-6 fill-current translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky Search, Categories & Filter Header ── */}
      <div className="sticky top-16 z-30 bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Title / Badge */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center shadow-inner">
                <Gamepad2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-zinc-100 tracking-tight">Tolee Games</h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    200+ Free Games
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 hidden xs:block">
                  Instant HTML5 & WebGL games — No downloads required
                </p>
              </div>
            </div>

            {/* Search Input & Sort Selection */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search games, 3D, chess..."
                  className="pl-9 pr-3 h-9 rounded-full bg-zinc-900 border-zinc-800 text-xs text-white placeholder:text-zinc-500 focus-visible:ring-1 focus-visible:ring-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Sort selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-9 px-3 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-medium focus:outline-none cursor-pointer hover:border-zinc-700"
              >
                <option value="popular">Most Popular</option>
                <option value="rating">Top Rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {/* Genre Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            {GAME_GENRES.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-150 cursor-pointer',
                  selectedGenre === genre
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
                )}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Trending Highlights Carousel (when not filtering) */}
        {selectedGenre === 'All' && !searchQuery && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-extrabold text-base text-zinc-100">Trending Now</h3>
              </div>
              <span className="text-xs text-zinc-500 font-medium">Updated today</span>
            </div>

            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              {trendingGames.slice(0, 8).map((game) => (
                <div
                  key={`trending-${game.id}`}
                  onClick={() => handlePlayGame(game)}
                  className="w-56 sm:w-64 shrink-0 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 cursor-pointer overflow-hidden group shadow-lg"
                >
                  <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-black/60 backdrop-blur-md text-amber-400 flex items-center gap-1 border border-white/10">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {game.rating.toFixed(1)}
                    </div>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-200">
                      <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="p-3 space-y-1">
                    <h4 className="font-bold text-xs text-zinc-200 truncate group-hover:text-primary transition-colors">
                      {game.title}
                    </h4>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span>{game.genre}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {(game.playsCount / 1000).toFixed(0)}k plays
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── All Games Grid ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base sm:text-lg text-zinc-100">
              {selectedGenre === 'All' ? 'Browse All Games' : selectedGenre}
              <span className="ml-2 text-xs font-medium text-zinc-500">
                ({filteredGames.length} games)
              </span>
            </h3>
            {searchQuery && (
              <span className="text-xs text-zinc-400">
                Showing results for &quot;{searchQuery}&quot;
              </span>
            )}
          </div>

          {displayedGames.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 mx-auto flex items-center justify-center">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayedGames.map((game) => (
                <div
                  key={game.id}
                  onClick={() => handlePlayGame(game)}
                  className="rounded-2xl bg-zinc-900/70 border border-zinc-800/90 hover:border-zinc-700 transition-all duration-200 flex flex-col overflow-hidden group cursor-pointer shadow-md hover:shadow-xl"
                >
                  {/* Card Thumbnail */}
                  <div className="relative aspect-16/10 overflow-hidden bg-zinc-950">
                    <img
                      src={game.coverImage}
                      alt={game.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Rating Badge */}
                    <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 backdrop-blur-md text-amber-400 flex items-center gap-1 border border-white/10">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      {game.rating.toFixed(1)}
                    </div>

                    {/* Tag / Category Badge */}
                    {game.badge && (
                      <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/80 backdrop-blur-md text-white border border-primary/40">
                        {game.badge}
                      </div>
                    )}

                    {/* Hover Play Button Overlay */}
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100 duration-200">
                      <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                        <Play className="w-5 h-5 fill-current translate-x-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Info Details */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-sm text-zinc-100 group-hover:text-primary transition-colors line-clamp-1">
                          {game.title}
                        </h4>
                        <button
                          onClick={(e) => handleShareGame(e, game)}
                          className="text-zinc-500 hover:text-white p-1 rounded transition-colors"
                          title="Share"
                        >
                          {copiedId === game.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {game.description}
                      </p>
                    </div>

                    {/* Footer Chips & Stats */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-medium">
                          {game.genre}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] shrink-0">
                        {(game.playsCount / 1000).toFixed(0)}k plays
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredGames.length && (
            <div className="pt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="px-8 rounded-full border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200"
              >
                Load More Games ({filteredGames.length - visibleCount} remaining)
              </Button>
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
