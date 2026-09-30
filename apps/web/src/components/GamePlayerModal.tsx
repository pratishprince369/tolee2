'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCw,
  ExternalLink,
  Share2,
  Info,
  Gamepad2,
  Check,
  Star,
  Heart,
  ShieldAlert,
  Smartphone,
  Users,
  Compass,
  Code,
  ArrowLeft,
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
  const [reported, setReported] = useState(false);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomCopied, setRoomCopied] = useState(false);

  const handleGenerateRoom = () => {
    const code = 'TLE' + Math.floor(100 + Math.random() * 900);
    setRoomCode(code);
  };

  const handleCopyRoom = () => {
    if (!roomCode || !game) return;
    const roomUrl = `${window.location.origin}/games/${game.id}?room=${roomCode}`;
    navigator.clipboard.writeText(roomUrl);
    setRoomCopied(true);
    setTimeout(() => setRoomCopied(false), 2000);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Guarantee game.play_url is local/self-hosted and NEVER points to GitHub source repo
  const resolvedPlayUrl = React.useMemo(() => {
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
      setReported(false);
      setMobileInfoOpen(false);
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
          text: `Play ${game.title} instantly in your browser! Zero install on Tolee Games.`,
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

  const handleReport = () => {
    setReported(true);
    setTimeout(() => setReported(false), 4000);
  };

  if (!game) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="!max-w-[96vw] sm:!max-w-[96vw] lg:!max-w-[1380px] !w-[96vw] lg:!w-[1380px] !h-[92vh] sm:!h-[90vh] p-0 bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl z-50 text-white"
      >
        <DialogTitle className="sr-only">{game.title} - Tolee Games</DialogTitle>
        <div ref={containerRef} className="w-full h-full flex flex-col bg-zinc-950 relative overflow-hidden">
          
          {/* Top Header / Control Bar */}
          <div className="h-14 px-3 sm:px-4 bg-zinc-900/95 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between z-20 shrink-0">
            {/* Left: Game Branding & Quick Stats */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-white lg:hidden shrink-0"
                title="Back to games"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>

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

            {/* Right: Actions */}
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

              <a
                href={resolvedPlayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Open in New Tab"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileInfoOpen(!mobileInfoOpen)}
                className={`w-8 h-8 rounded-lg lg:hidden ${
                  mobileInfoOpen ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400 hover:text-white'
                }`}
                title="Info"
              >
                <Info className="w-4 h-4" />
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

              <div className="w-[1px] h-5 bg-zinc-800 mx-1 hidden lg:block" />

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hidden lg:inline-flex"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Main Body: Desktop Split View (Left Viewport + Right Info Drawer) */}
          <div className="flex-1 flex w-full h-full min-h-0 relative overflow-hidden bg-black">
            {/* Left: Game Viewport */}
            <div className="flex-1 relative w-full h-full bg-black flex items-center justify-center min-w-0">
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

            {/* Right: Desktop Split Info Panel (340px) */}
            <div className="hidden lg:flex w-84 shrink-0 flex-col bg-zinc-900/90 border-l border-zinc-800 p-5 overflow-y-auto space-y-4">
              {/* Thumbnail & Title */}
              <div className="relative aspect-16/9 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800">
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-xs">
                  <span className="font-semibold text-white drop-shadow">{game.genre}</span>
                  <span className="text-emerald-400 font-bold bg-black/60 px-2 py-0.5 rounded backdrop-blur-xs">
                    {(game.playsCount / 1000).toFixed(0)}k plays
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-base text-zinc-100">{game.title}</h4>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{game.description}</p>
              </div>

              {/* Game Metadata Table */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80 text-xs">
                <div className="flex justify-between py-1">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Players
                  </span>
                  <span className="text-zinc-200 font-medium">{game.multiplayer || 'Single Player'}</span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Mobile Ready
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {game.mobileSupported !== false ? 'Supported' : 'Desktop Optimized'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-zinc-500 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    Controls
                  </span>
                  <span className="text-zinc-200 font-medium text-right truncate max-w-[170px]">
                    {game.controls || 'Keyboard / Touch'}
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-zinc-500">Installation</span>
                  <span className="text-emerald-400 font-medium">Instant Web (0 MB)</span>
                </div>
              </div>

              {/* Multiplayer Lobby / Rooms (Section 18) */}
              {(game.multiplayer === 'Online Multiplayer' || game.multiplayer === '2 Player') && (
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-emerald-500/30 space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Multiplayer Lobby
                    </span>
                    {roomCode && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px]">
                        {roomCode}
                      </span>
                    )}
                  </div>
                  {roomCode ? (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCopyRoom}
                        className="flex-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                      >
                        {roomCopied ? 'Room Link Copied!' : 'Invite Friends'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleGenerateRoom}
                        className="text-xs text-zinc-400 hover:text-white"
                        title="New Room Code"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={handleGenerateRoom}
                      className="w-full text-xs bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold"
                    >
                      Create Game Room
                    </Button>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-3 space-y-2 mt-auto">

                <div className="flex items-center gap-2">
                  <Button
                    onClick={toggleFavorite}
                    variant="outline"
                    className={`flex-1 text-xs border-zinc-700 hover:bg-zinc-800 ${
                      isFavorite ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-zinc-300'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 mr-1.5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </Button>

                  <Button
                    onClick={handleReport}
                    variant="ghost"
                    className="text-xs text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 px-3"
                    title="Report issue with game"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                    {reported ? 'Reported' : 'Report'}
                  </Button>
                </div>

                {reported && (
                  <p className="text-[11px] text-amber-400 text-center animate-in fade-in">
                    Thank you! Our moderators will review this game.
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Slide-up Info Sheet */}
            {mobileInfoOpen && (
              <div className="lg:hidden absolute bottom-0 inset-x-0 bg-zinc-900/98 backdrop-blur-xl border-t border-zinc-800 p-4 max-h-[70vh] overflow-y-auto z-30 shadow-2xl rounded-t-2xl animate-in slide-in-from-bottom duration-200 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="font-bold text-sm text-zinc-200">{game.title}</h4>
                  <button onClick={() => setMobileInfoOpen(false)} className="text-zinc-400 hover:text-white p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{game.description}</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-zinc-400 pt-1">
                  <div>Genre: <strong className="text-zinc-200">{game.genre}</strong></div>
                  <div>Players: <strong className="text-zinc-200">{game.multiplayer || 'Single'}</strong></div>
                  <div>Controls: <strong className="text-zinc-200">{game.controls || 'Touch'}</strong></div>
                  <div>Mode: <strong className="text-emerald-400">Instant Web</strong></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
