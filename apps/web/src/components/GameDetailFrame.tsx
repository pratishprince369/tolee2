'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Maximize2, Minimize2, RotateCw, Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToleeGame } from '@/lib/gamesData';

export function GameDetailFrame({ game }: { game: ToleeGame }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Guarantee game.play_url is local/self-hosted and NEVER points to GitHub source repo
  const resolvedPlayUrl = React.useMemo(() => {
    const url = game.playUrl || '';
    if (url.includes('github.com') || url.includes('raw.githubusercontent.com')) {
      return `/games/${game.id}/index.html`;
    }
    if (url.startsWith('/games/') && !url.endsWith('.html')) {
      return url.endsWith('/') ? `${url}index.html` : `${url}/index.html`;
    }
    return url || `/games/${game.id}/index.html`;
  }, [game]);

  // Instantly pause music and videos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('tolee_pause_music_player'));
      window.dispatchEvent(new CustomEvent('tolee_pause_all_videos'));
    }
  }, []);

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
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = resolvedPlayUrl;
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Play ${game.title} on Tolee Games`,
          text: `Play ${game.title} directly in your browser on Tolee Games!`,
          url,
        });
        return;
      } catch (e) {}
    }
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      ref={containerRef}
      className="w-full aspect-16/10 sm:aspect-16/9 max-h-[82vh] rounded-3xl overflow-hidden border border-zinc-800 bg-black shadow-2xl relative flex flex-col"
    >
      {/* Floating Toolbar */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-zinc-900/80 backdrop-blur-md p-1 rounded-xl border border-zinc-700/60 shadow-lg">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReload}
          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
          title="Reload Game"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleShare}
          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
          title="Share"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="w-7 h-7 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800"
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 z-10 gap-2">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse text-primary">
            <RotateCw className="w-5 h-5 animate-spin" />
          </div>
          <p className="text-xs text-zinc-400">Loading {game.title}...</p>
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
        className="w-full h-full border-0 bg-black flex-1"
        sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads allow-modals"
      />
    </div>
  );
}
