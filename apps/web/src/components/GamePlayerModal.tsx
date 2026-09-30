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
  Sparkles,
  Gamepad2,
  Check,
  Star,
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
  const [showInfo, setShowInfo] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Pause background media when game opens
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tolee_pause_music_player'));
      window.dispatchEvent(new CustomEvent('tolee_pause_all_videos'));
    }
  }, [isOpen]);

  // Reset loading state when game changes
  useEffect(() => {
    if (game) {
      setIsLoading(true);
      setShowInfo(false);
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
      iframeRef.current.src = game.playUrl;
    }
  };

  const handleShare = async () => {
    if (!game) return;
    const shareUrl = `${window.location.origin}/games/${game.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Play ${game.title} on Tolee Games`,
          text: `Check out ${game.title} on Tolee Games! Instant browser play without downloads.`,
          url: shareUrl,
        });
        return;
      } catch (e) {}
    }

    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!game) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-[96vw] w-[1400px] h-[92vh] p-0 bg-zinc-950 border border-zinc-800 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl z-50 text-white"
      >
        <DialogTitle className="sr-only">{game.title} - Tolee Games</DialogTitle>
        <div ref={containerRef} className="w-full h-full flex flex-col bg-zinc-950 relative overflow-hidden">
          {/* Top Control Bar */}
          <div className="h-14 px-4 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between z-20 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-zinc-100 truncate">{game.title}</h3>
                  <Badge variant="outline" className="hidden sm:inline-flex text-[10px] py-0 px-1.5 border-zinc-700 bg-zinc-800/60 text-zinc-300">
                    {game.genre}
                  </Badge>
                  {game.badge && (
                    <span className="hidden xs:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {game.badge}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-2">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {game.rating.toFixed(1)}
                  </span>
                  <span>•</span>
                  <span className="truncate">{game.modelAttribution}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowInfo(!showInfo)}
                className={`w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 ${
                  showInfo ? 'bg-zinc-800 text-primary' : ''
                }`}
                title="Game Info"
              >
                <Info className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleReload}
                className="w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
                title="Reload Game"
              >
                <RotateCw className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
                title="Share Game"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              </Button>

              <a
                href={game.playUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Open in Full Window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 hidden sm:inline-flex"
                title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </Button>

              <div className="w-[1px] h-6 bg-zinc-800 mx-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
                title="Close"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Game Viewport Container */}
          <div className="flex-1 relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center animate-pulse">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-zinc-200">Loading {game.title}...</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Instant web player ready in a second</p>
                </div>
              </div>
            )}

            {/* Embedded Iframe */}
            <iframe
              ref={iframeRef}
              src={game.playUrl}
              title={game.title}
              onLoad={() => setIsLoading(false)}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; gamepad"
              allowFullScreen
              className="w-full h-full border-0 bg-black"
              sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-modals"
            />

            {/* Game Info Slide-over Panel */}
            {showInfo && (
              <div className="absolute top-0 right-0 w-80 max-w-[85vw] h-full bg-zinc-900/95 backdrop-blur-xl border-l border-zinc-800 p-5 overflow-y-auto z-30 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-zinc-200">About this game</h4>
                    <button
                      onClick={() => setShowInfo(false)}
                      className="text-zinc-400 hover:text-white p-1 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">{game.description}</p>

                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-zinc-500">Category</span>
                      <span className="text-zinc-200 font-medium">{game.genre}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-zinc-500">Rating</span>
                      <span className="text-amber-400 font-bold">{game.rating.toFixed(1)} / 10</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-zinc-500">Plays</span>
                      <span className="text-zinc-200 font-medium">{game.playsCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs py-1">
                      <span className="text-zinc-500">Architecture</span>
                      <span className="text-primary font-medium">{game.modelAttribution}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                    <span className="text-xs text-zinc-500">Technologies</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {game.technology.map((tech) => (
                        <span
                          key={tech}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-800 text-zinc-300 border border-zinc-700/60"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {game.githubUrl && (
                    <div className="pt-2">
                      <a
                        href={game.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <span>View Source on GitHub</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="pt-6">
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="w-full text-xs border-zinc-700 hover:bg-zinc-800"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5 mr-1.5" />}
                    {copied ? 'Link Copied' : 'Share with Friends'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
