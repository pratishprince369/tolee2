'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  Gamepad2,
  Check,
  Star,
  Heart,
  Share2,
} from 'lucide-react';
import { ToleeGame } from '@/lib/gamesData';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface GamePlayerModalProps {
  game: ToleeGame | null;
  isOpen: boolean;
  onClose: () => void;
}

export function GamePlayerModal({ game, isOpen, onClose }: GamePlayerModalProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Guarantee game.play_url is safe and NEVER navigates to GitHub repository pages
  const resolvedPlayUrl = useMemo(() => {
    if (!game) return '';
    const url = game.playUrl || '';
    if (url.includes('github.com') || url.includes('raw.githubusercontent.com')) {
      return `/games/${game.id}/index.html`;
    }
    if (url.startsWith('/games/') && !url.endsWith('.html')) {
      return url.endsWith('/') ? `${url}index.html` : `${url}/index.html`;
    }
    return url || `/games/${game.id}/index.html`;
  }, [game]);

  // Sync favorites with localStorage
  useEffect(() => {
    if (!game) return;
    try {
      const favs = JSON.parse(localStorage.getItem('tolee_game_favorites') || '[]');
      setIsFavorite(favs.includes(game.id));
    } catch {
      setIsFavorite(false);
    }
  }, [game?.id]);

  const toggleFavorite = () => {
    if (!game) return;
    try {
      const favs: string[] = JSON.parse(localStorage.getItem('tolee_game_favorites') || '[]');
      let updated: string[];
      if (favs.includes(game.id)) {
        updated = favs.filter((id) => id !== game.id);
        setIsFavorite(false);
      } else {
        updated = [...favs, game.id];
        setIsFavorite(true);
      }
      localStorage.setItem('tolee_game_favorites', JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('tolee_favorites_updated'));
    } catch (e) {
      console.warn('Favorite storage error:', e);
    }
  };

  // Pause background media when game opens & ensure Poki SDK bridge
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tolee_pause_music_player'));
      window.dispatchEvent(new CustomEvent('tolee_pause_all_videos'));

      // Ensure Defold Poki SDK bridge is active
      if (!(window as any).PokiSDK) {
        const script = document.createElement('script');
        script.src = '/poki-sdk.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }
  }, [isOpen]);

  // Reset loading state when game changes
  useEffect(() => {
    if (game) {
      setIsLoading(true);
    }
  }, [game?.id]);

  // Handle Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen error:', err);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleReload = () => {
    if (iframeRef.current && game) {
      setIsLoading(true);
      iframeRef.current.src = resolvedPlayUrl;
    }
  };

  const handleShare = async () => {
    if (!game) return;
    const shareUrl = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Play ${game.title} on Tolee Games`,
          text: `Play ${game.title} instantly in your browser on Tolee Games!`,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  if (!game) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="!max-w-[96vw] sm:!max-w-[96vw] lg:!max-w-[1400px] !w-[96vw] lg:!w-[1400px] !h-[92vh] sm:!h-[90vh] p-0 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl z-50 text-white"
      >
        <DialogTitle className="sr-only">{game.title} - Tolee Games</DialogTitle>
        <div ref={containerRef} className="w-full h-full flex flex-col bg-zinc-950 relative overflow-hidden">
          
          {/* Top Header / Control Bar (Internal Tolee controls only - zero external links) */}
          <div className="h-13 px-3 sm:px-4 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between z-20 shrink-0">
            {/* Left: Game Title & Badges */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-xs sm:text-sm text-zinc-100 truncate">{game.title}</h3>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 border-zinc-700 bg-zinc-800 text-zinc-300">
                    {game.genre}
                  </Badge>
                  {game.badge && (
                    <span className="hidden md:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {game.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {game.rating.toFixed(1)}
                  </span>
                  <span>•</span>
                  <span className="truncate text-zinc-400">{game.multiplayer || 'Single Player'}</span>
                </div>
              </div>
            </div>

            {/* Right: Actions (No external links) */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFavorite}
                className={`w-8 h-8 rounded-lg ${
                  isFavorite ? 'text-rose-500 hover:text-rose-400' : 'text-zinc-400 hover:text-white'
                } hover:bg-zinc-800`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleReload}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                title="Reload Game"
              >
                <RotateCw className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                title="Share Game"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 hidden sm:inline-flex"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <div className="w-[1px] h-5 bg-zinc-800 mx-1 hidden sm:block" />

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 inline-flex"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Unified Single Game Box Viewport (100% full width and height) */}
          <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center min-w-0 min-h-0 overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center animate-pulse">
                  <Gamepad2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-200">Loading {game.title}...</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Instant HTML5 player ready in seconds</p>
                </div>
              </div>
            )}

            <iframe
              key={game.id}
              ref={iframeRef}
              src={resolvedPlayUrl}
              title={game.title}
              onLoad={() => setIsLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; gamepad"
              allowFullScreen
              className="w-full h-full border-0 bg-black"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-modals"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
