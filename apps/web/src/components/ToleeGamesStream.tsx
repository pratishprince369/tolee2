'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Gamepad2,
  Search,
  Star,
  Play,
  Share2,
  ExternalLink,
  Flame,
  Zap,
  Users,
  Download,
  Smartphone,
  Swords,
  Car,
  Puzzle,
  Crown,
  CircleDot,
  ArrowRight,
  Heart,
  Check,
  Code,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Trophy,
} from 'lucide-react';
import {
  ToleeGame,
  GAME_CATEGORIES,
  getAllGames,
  getFeaturedGames,
  getTrendingGames,
  getGamesByCategory,
  getGameById,
} from '@/lib/gamesData';
import { GamePlayerModal } from '@/components/GamePlayerModal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ToleeGamesStream() {
  const searchParams = useSearchParams();
  const initialGameId = searchParams.get('play');

  const allGames = useMemo(() => getAllGames(), []);
  const featuredGames = useMemo(() => getFeaturedGames(), []);
  const trendingGames = useMemo(() => getTrendingGames(), []);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'popular' | 'rating' | 'new'>('popular');
  const [activeGame, setActiveGame] = useState<ToleeGame | null>(null);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(25);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);

  const browseSectionRef = useRef<HTMLDivElement>(null);
  const multiplayerSectionRef = useRef<HTMLDivElement>(null);

  // Sync favorites with localStorage
  useEffect(() => {
    const loadFavorites = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('tolee_game_favorites') || '[]');
        setFavorites(stored);
      } catch {
        setFavorites([]);
      }
    };
    loadFavorites();
    window.addEventListener('tolee_favorites_updated', loadFavorites);
    return () => window.removeEventListener('tolee_favorites_updated', loadFavorites);
  }, []);

  const toggleFavorite = (gameId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('tolee_game_favorites') || '[]');
      let updated: string[];
      if (stored.includes(gameId)) {
        updated = stored.filter((id) => id !== gameId);
      } else {
        updated = [...stored, gameId];
      }
      localStorage.setItem('tolee_game_favorites', JSON.stringify(updated));
      setFavorites(updated);
      window.dispatchEvent(new CustomEvent('tolee_favorites_updated'));
    } catch (err) {
      console.warn('Favorite storage error:', err);
    }
  };

  const handleShareGame = async (game: ToleeGame, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const shareUrl = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Play ${game.title} on Tolee Games`,
          text: `Play ${game.title} free without downloads on Tolee Games!`,
          url: shareUrl,
        });
        return;
      } catch {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(game.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

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

  // Filtered & Sorted Games List
  const filteredGames = useMemo(() => {
    let list = getGamesByCategory(selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.description.toLowerCase().includes(q) ||
          g.genre.toLowerCase().includes(q) ||
          (g.category && g.category.toLowerCase().includes(q)) ||
          g.technology.some((t) => t.toLowerCase().includes(q)) ||
          g.modelAttribution.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'rating') {
      list.sort((a, b) => b.rating - a.rating);
    } else if (activeTab === 'new') {
      list = [...list].reverse();
    } else {
      list.sort((a, b) => b.playsCount - a.playsCount);
    }

    return list;
  }, [selectedCategory, searchQuery, activeTab]);

  const displayedGames = useMemo(() => {
    return filteredGames.slice(0, visibleCount);
  }, [filteredGames, visibleCount]);

  const handlePlayGame = (game: ToleeGame) => {
    setActiveGame(game);
    setIsPlayerOpen(true);
  };

  // Pre-filtered genre slices for the categorized carousels
  const racingGames = useMemo(() => getGamesByCategory('Racing').slice(0, 6), []);
  const puzzleGames = useMemo(() => getGamesByCategory('Puzzle').slice(0, 6), []);
  const classicGames = useMemo(() => getGamesByCategory('Classic').slice(0, 6), []);
  const boardGames = useMemo(() => getGamesByCategory('Board').slice(0, 6), []);
  const sportsGames = useMemo(() => getGamesByCategory('Sports').slice(0, 6), []);
  const shootingGames = useMemo(() => getGamesByCategory('Shooting').slice(0, 6), []);
  const multiplayerGames = useMemo(() => getGamesByCategory('Multiplayer').slice(0, 6), []);
  const newGames = useMemo(() => getGamesByCategory('New').slice(0, 6), []);

  return (
    <div className="min-h-screen bg-[#070B11] text-white pb-24 md:pb-16 select-none font-sans">
      {/* ── Top Search Header Bar ── */}
      <div className="w-full bg-[#0B1019]/95 backdrop-blur-md border-b border-[#182332] px-4 py-3 sticky top-16 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00D2C4] to-[#00F0FF] p-0.5 flex items-center justify-center shadow-lg shadow-[#00D2C4]/20">
              <div className="w-full h-full bg-[#0B1019] rounded-[10px] flex items-center justify-center text-[#00D2C4]">
                <Gamepad2 className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase flex items-center gap-1.5">
                <span>TOLEE</span>
                <span className="text-[#00D2C4]">GAMES</span>
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium">Free HTML5 & Multiplayer Hub</p>
            </div>
          </div>

          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 240+ games, 3D, chess, racing..."
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-8">
        
        {/* ── Category Filter Pills Row (13 requested categories) ── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
            {GAME_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 cursor-pointer shadow-sm',
                    isSelected
                      ? 'bg-[#00D2C4] text-black shadow-lg shadow-[#00D2C4]/30 scale-[1.03]'
                      : 'bg-[#0E1624] text-zinc-300 hover:text-white hover:bg-[#141F30] border border-[#1F2D40]'
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Top Hero Banner (Shown when not searching and on All) ── */}
        {!searchQuery && selectedCategory === 'All' && allGames.length > 0 && (
          <div className="relative rounded-3xl overflow-hidden border border-[#1C283B] bg-gradient-to-r from-[#0B131E] via-[#0E1A29] to-[#0A131F] shadow-2xl p-6 sm:p-9">
            <div className="absolute -left-20 -top-20 w-96 h-96 bg-[#00D2C4]/15 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute right-10 bottom-0 w-96 h-96 bg-[#0070F3]/15 rounded-full filter blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
              <div className="flex-1 space-y-3.5 text-center lg:text-left">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#00D2C4]">
                  PREMIUM ONLINE GAMING
                </span>

                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none">
                  Tolee <span className="bg-gradient-to-r from-[#00E5FF] via-[#00D2C4] to-[#00BFA5] text-transparent bg-clip-text">Games Hub</span>
                </h2>

                <p className="text-sm sm:text-base font-semibold text-zinc-300">
                  Instant HTML5 & WebGL Games with Realtime Multiplayer
                </p>

                <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto lg:mx-0">
                  Zero downloads, instant play on mobile and desktop. Play solo or challenge friends.
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3">
                  <button
                    onClick={() => {
                      const top = featuredGames[0] || allGames[0];
                      if (top) handlePlayGame(top);
                    }}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00D2C4] hover:bg-[#00E5FF] text-black font-extrabold text-xs sm:text-sm shadow-lg shadow-[#00D2C4]/25 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play Featured Game</span>
                  </button>

                  <button
                    onClick={() => multiplayerSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0E1624] hover:bg-[#141F30] border border-[#202E42] text-white font-bold text-xs sm:text-sm transition-all cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-[#00D2C4]" />
                    <span>Multiplayer Games</span>
                  </button>
                </div>
              </div>

              {/* 4 Feature Highlights */}
              <div className="grid grid-cols-2 gap-2.5 w-full sm:w-auto shrink-0">
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200">
                  <Gamepad2 className="w-4 h-4 text-[#00D2C4]" />
                  <span>140+ Free Games</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200">
                  <Download className="w-4 h-4 text-[#00F0FF]" />
                  <span>0 MB Downloads</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200">
                  <Smartphone className="w-4 h-4 text-[#3B82F6]" />
                  <span>Mobile First</span>
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-xs font-bold text-zinc-200">
                  <Zap className="w-4 h-4 text-[#F59E0B]" />
                  <span>Instant Play</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 1. 🔥 TRENDING GAMES ── */}
        {!searchQuery && selectedCategory === 'All' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Trending Games
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Most popular games played this week on Tolee
                  </p>
                </div>
              </div>

              <button
                onClick={() => browseSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs font-bold text-[#00D2C4] hover:text-[#00F0FF] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trendingGames.slice(0, 5).map((game) => (
                <GameCard
                  key={`trending-${game.id}`}
                  game={game}
                  isFavorite={favorites.includes(game.id)}
                  copiedId={copiedId}
                  onPlay={() => handlePlayGame(game)}
                  onToggleFavorite={(e) => toggleFavorite(game.id, e)}
                  onShare={(e) => handleShareGame(game, e)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── 2. 🎮 MULTIPLAYER GAMES (Standard Game Catalog) ── */}
        {!searchQuery && (selectedCategory === 'All' || selectedCategory === 'Multiplayer') && (
          <div ref={multiplayerSectionRef}>
            <CategorizedSection
              title="🎮 Multiplayer Games"
              subtitle="Real-time arena combat, 2-player battles, and online multiplayer"
              games={multiplayerGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Multiplayer')}
            />
          </div>
        )}

        {/* ── 3. 🆓 FREE HTML5 GAMES LIBRARY (Categorized Carousels / Grids) ── */}
        {!searchQuery && selectedCategory === 'All' && (
          <div className="space-y-8 pt-4">
            
            {/* Racing Section */}
            <CategorizedSection
              title="🏎️ Racing & High-Speed Games"
              subtitle="Futuristic 3D racers, turbo challenges, and track drifts"
              games={racingGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Racing')}
            />

            {/* Puzzle Section */}
            <CategorizedSection
              title="🧩 Puzzle & Brain Teasers"
              subtitle="Logic puzzles, 2048, Hextris, Sudoku and spatial riddles"
              games={puzzleGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Puzzle')}
            />

            {/* Classic Section */}
            <CategorizedSection
              title="🐍 Classic & Retro Games"
              subtitle="Tetris, Snake 97, Pong, Pacman and nostalgia masterpieces"
              games={classicGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Classic')}
            />

            {/* Board Games Section */}
            <CategorizedSection
              title="♟️ Board & Turn-Based Games"
              subtitle="Chessboard JS, Tic-Tac-Toe, Connect Four and strategic duel"
              games={boardGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Board')}
            />

            {/* Sports Section */}
            <CategorizedSection
              title="⚽ Sports & Skill Games"
              subtitle="Pong, basketball shootouts, pool and sports athletics"
              games={sportsGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Sports')}
            />

            {/* Shooting Section */}
            <CategorizedSection
              title="🔫 Shooting & Space Combat"
              subtitle="Vector Asteroids, Space Invaders, galactic defense"
              games={shootingGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Shooting')}
            />

            {/* Online Multiplayer Section */}
            <CategorizedSection
              title="👥 Online & Local Multiplayer"
              subtitle="Battle friends live in BrowserQuest, Agar clone, and 2-Player games"
              games={multiplayerGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('Multiplayer')}
            />

            {/* New Games Section */}
            <CategorizedSection
              title="🆕 Newly Added HTML5 Games"
              subtitle="Fresh browser releases engineered for web performance"
              games={newGames}
              favorites={favorites}
              copiedId={copiedId}
              onPlay={handlePlayGame}
              onToggleFavorite={toggleFavorite}
              onShare={handleShareGame}
              onViewAll={() => setSelectedCategory('New')}
            />
          </div>
        )}

        {/* ── 4. BROWSE ALL GAMES SECTION (Main Grid with Tabs & Filter) ── */}
        <div ref={browseSectionRef} className="space-y-4 pt-4 border-t border-[#182332]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-[#00D2C4]" />
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                {selectedCategory === 'All' ? 'All Free HTML5 Games' : `${selectedCategory} Games`}{' '}
                <span className="text-xs font-medium text-zinc-500">
                  ({filteredGames.length} available)
                </span>
              </h3>
            </div>

            {/* Tabs: Most Popular, Top Rated, New */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar">
              <button
                onClick={() => setActiveTab('popular')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'popular'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                🔥 Most Popular
              </button>

              <button
                onClick={() => setActiveTab('rating')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'rating'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                ⭐ Top Rated
              </button>

              <button
                onClick={() => setActiveTab('new')}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap',
                  activeTab === 'new'
                    ? 'bg-[#00D2C4] text-black font-extrabold shadow-md shadow-[#00D2C4]/20'
                    : 'bg-[#0E1624] text-zinc-400 hover:text-white border border-[#1F2D40]'
                )}
              >
                🆕 Newest
              </button>
            </div>
          </div>

          {/* Grid of Game Cards */}
          {displayedGames.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#0E1624] border border-[#1F2D40] text-zinc-500 mx-auto flex items-center justify-center">
                <Gamepad2 className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-zinc-200">No games available</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {allGames.length === 0
                  ? 'All games have been removed from Tolee Games.'
                  : `No matching games for "${searchQuery}".`}
              </p>
              {allGames.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="rounded-full border-zinc-700 text-xs mt-2"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isFavorite={favorites.includes(game.id)}
                  copiedId={copiedId}
                  onPlay={() => handlePlayGame(game)}
                  onToggleFavorite={(e) => toggleFavorite(game.id, e)}
                  onShare={(e) => handleShareGame(game, e)}
                />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {visibleCount < filteredGames.length && (
            <div className="pt-6 text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 25)}
                className="px-8 py-2.5 rounded-full border border-[#202E42] bg-[#0E1624] hover:bg-[#141F30] text-xs font-bold text-zinc-200 transition-colors shadow-md cursor-pointer"
              >
                Load More Games ({filteredGames.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>

        {/* ── 5. “MORE GAMES COMING SOON” FOOTER CARD ── */}
        <div className="rounded-3xl border border-[#1F2D40] bg-gradient-to-r from-[#0C1420] via-[#0F1B2B] to-[#0C1420] p-6 sm:p-8 text-center space-y-3 relative overflow-hidden shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-[#00D2C4]/15 text-[#00D2C4] border border-[#00D2C4]/30 flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-lg sm:text-xl font-black text-white">
            New Free Games Added Weekly!
          </h4>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            Experience lightning fast browser gaming with instant play, zero storage required, and full mobile touch support.
          </p>
          <div className="pt-2">
            <button
              onClick={() => browseSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#00D2C4] hover:bg-[#00E5FF] text-black font-extrabold text-xs transition-all shadow-lg shadow-[#00D2C4]/20 cursor-pointer"
            >
              <Gamepad2 className="w-4 h-4 fill-black stroke-black" />
              <span>Browse All Games</span>
            </button>
          </div>
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

// ── Reusable Categorized Carousel / Grid Component ──
interface CategorizedSectionProps {
  title: string;
  subtitle: string;
  games: ToleeGame[];
  favorites: string[];
  copiedId: string | null;
  onPlay: (game: ToleeGame) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onShare: (game: ToleeGame, e: React.MouseEvent) => void;
  onViewAll: () => void;
}

function CategorizedSection({
  title,
  subtitle,
  games,
  favorites,
  copiedId,
  onPlay,
  onToggleFavorite,
  onShare,
  onViewAll,
}: CategorizedSectionProps) {
  if (!games || games.length === 0) return null;

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-400">{subtitle}</p>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-bold text-[#00D2C4] hover:text-[#00F0FF] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
        {games.map((game) => (
          <GameCard
            key={`${title}-${game.id}`}
            game={game}
            isFavorite={favorites.includes(game.id)}
            copiedId={copiedId}
            onPlay={() => onPlay(game)}
            onToggleFavorite={(e) => onToggleFavorite(game.id, e)}
            onShare={(e) => onShare(game, e)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Reusable Individual Game Card with Play, Favorite, Share (No Repo UI) ──
interface GameCardProps {
  game: ToleeGame;
  isFavorite: boolean;
  copiedId: string | null;
  onPlay: () => void;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
}

function GameCard({
  game,
  isFavorite,
  copiedId,
  onPlay,
  onToggleFavorite,
  onShare,
}: GameCardProps) {
  return (
    <div
      onClick={onPlay}
      className="rounded-2xl bg-[#0D1522] border border-[#1A2636] hover:border-[#00D2C4]/60 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col group shadow-md hover:shadow-cyan-500/10"
    >
      {/* Thumbnail Container */}
      <div className="relative aspect-4/3 overflow-hidden bg-black">
        <img
          src={game.coverImage}
          alt={game.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Rating Badge top-right */}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-black bg-black/80 backdrop-blur-md text-amber-400 flex items-center gap-1 border border-white/10 shadow-sm">
          <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
          <span>{game.rating.toFixed(1)}</span>
        </div>

        {/* Single / Multiplayer & Mobile Badges Overlay at bottom of image */}
        <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between text-[9px] font-bold">
          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-xs text-zinc-200 border border-white/10">
            {game.multiplayer === 'Online Multiplayer' ? '🎮 Multiplayer' : game.multiplayer || 'Single Player'}
          </span>
          {game.mobileSupported !== false && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/80 backdrop-blur-xs text-white">
              📱 Mobile
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="p-3 flex flex-col justify-between flex-1 space-y-2.5">
        <div>
          <h4 className="font-extrabold text-xs sm:text-sm text-zinc-100 truncate group-hover:text-[#00D2C4] transition-colors">
            {game.title}
          </h4>
          <div className="flex items-center justify-between text-[10px] text-zinc-400 mt-1">
            <span className="truncate">{game.genre}</span>
            <span className="text-zinc-500 shrink-0">{game.multiplayer || 'Single Player'}</span>
          </div>
        </div>

        {/* Card Action Buttons: PLAY NOW + Favorite + Share (Clean Gamer UX) */}
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-[#1C283B]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-[#00D2C4] hover:bg-[#00E5FF] text-black font-black text-xs flex items-center justify-center gap-1.5 shadow-md shadow-[#00D2C4]/20 transition-all active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-black stroke-black" />
            <span>PLAY NOW</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(e);
            }}
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#111A27] hover:bg-[#182436] border border-[#202E42] flex items-center justify-center shrink-0 transition-colors ${
              isFavorite ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-zinc-400 hover:text-white'
            }`}
            title={isFavorite ? 'Favorited' : 'Favorite'}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(e);
            }}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#111A27] hover:bg-[#182436] border border-[#202E42] text-zinc-400 hover:text-white flex items-center justify-center shrink-0 transition-colors"
            title="Share Game"
          >
            {copiedId === game.id ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
