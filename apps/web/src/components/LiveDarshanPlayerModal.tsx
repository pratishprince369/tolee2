'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Share2, Sparkles, Volume2, VolumeX, Maximize2, ChevronLeft, ChevronRight, Heart, BellRing } from 'lucide-react';
import { TempleStreamInfo } from '@/lib/darshanService';

interface LiveDarshanPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  temple: any | null;
  onSelectTemple?: (temple: any) => void;
  allTemples?: any[];
}

export function LiveDarshanPlayerModal({
  isOpen,
  onClose,
  temple,
  onSelectTemple,
  allTemples = []
}: LiveDarshanPlayerModalProps) {
  const [streamData, setStreamData] = useState<TempleStreamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [pranamCount, setPranamCount] = useState(108);
  const [hasOffered, setHasOffered] = useState(false);
  const [showBellAnim, setShowBellAnim] = useState(false);

  useEffect(() => {
    if (!isOpen || !temple) {
      setStreamData(null);
      setLoading(true);
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetch(`/api/darshan/${temple.slug}/stream`)
      .then(res => res.json())
      .then(data => {
        if (isMounted) {
          if (data.success && data.stream) {
            setStreamData(data.stream);
          } else {
            // Fallback to channel live embed
            setStreamData({
              videoId: temple.youtubeVideoId || null,
              embedUrl: temple.youtubeChannelId
                ? `https://www.youtube.com/embed/live_stream?channel=${temple.youtubeChannelId}&autoplay=1&mute=0&controls=1&playsinline=1`
                : '',
              isLive: temple.liveStatus === 'live',
              statusLabel: temple.liveStatus === 'live' ? 'LIVE' : 'Offline'
            });
          }
          setLoading(false);
        }
      })
      .catch(err => {
        if (isMounted) {
          console.error('Failed to load stream:', err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, temple]);

  if (!isOpen || !temple) return null;

  const handlePranam = () => {
    if (!hasOffered) {
      setPranamCount(prev => prev + 1);
      setHasOffered(true);
      setShowBellAnim(true);
      setTimeout(() => setShowBellAnim(false), 2000);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `${temple.name} Live Darshan – Tolee`,
      text: `Watch live darshan of ${temple.name} (${temple.city}, ${temple.state}) on Tolee!`,
      url: typeof window !== 'undefined' ? `${window.location.origin}/darshan?temple=${temple.slug}` : ''
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      navigator.clipboard.writeText(shareData.url);
      alert('Darshan link copied to clipboard!');
    }
  };

  // Switch to next/prev temple
  const currentIndex = allTemples.findIndex(t => t.id === temple.id);
  const handlePrev = () => {
    if (currentIndex > 0 && onSelectTemple) {
      onSelectTemple(allTemples[currentIndex - 1]);
    }
  };
  const handleNext = () => {
    if (currentIndex < allTemples.length - 1 && onSelectTemple) {
      onSelectTemple(allTemples[currentIndex + 1]);
    }
  };

  const isLive = streamData?.isLive || temple.liveStatus === 'live';
  const statusLabel = streamData?.statusLabel || (isLive ? 'LIVE' : 'Offline');

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl bg-zinc-950 border border-amber-500/20 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shrink-0 text-sm">
              🛕
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100 truncate">{temple.name}</h3>
                {isLive ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-600/90 text-white shadow-sm animate-pulse shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    LIVE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700/60 shrink-0">
                    {statusLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400 truncate">
                {temple.city}, {temple.state} {temple.deity ? `• ${temple.deity}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handleShare}
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              title="Share Darshan"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Area */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8">
              <div className="w-12 h-12 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
              <p className="text-xs sm:text-sm font-medium text-amber-200/80">Connecting to official temple live broadcast...</p>
            </div>
          ) : streamData?.embedUrl ? (
            <iframe
              src={streamData.embedUrl}
              title={`${temple.name} Live Darshan`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="text-center p-6 space-y-3">
              <div className="text-4xl">🕉️</div>
              <p className="text-sm text-zinc-300 font-semibold">Live broadcast is currently offline</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Temple broadcast will resume during scheduled daily Aarti and Darshan timings.
              </p>
              {temple.officialUrl && (
                <a
                  href={temple.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                >
                  Visit Official Temple Website <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {/* Devotional Bell Floating Effect */}
          {showBellAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-out fade-out zoom-out duration-1000">
              <div className="p-4 rounded-full bg-amber-500/30 border border-amber-400 backdrop-blur-md shadow-2xl flex flex-col items-center">
                <BellRing className="w-12 h-12 text-amber-300 animate-bounce" />
                <span className="text-xs font-extrabold text-amber-100 mt-1 uppercase tracking-wider">🙏 Har Har Mahadev / Jai Shree Ram</span>
              </div>
            </div>
          )}
        </div>

        {/* Player Bottom Controls & Information */}
        <div className="p-4 sm:p-5 bg-gradient-to-b from-zinc-950 to-zinc-900 flex flex-col gap-4 border-t border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base sm:text-lg font-extrabold text-white">{temple.name}</h4>
                {temple.officialUrl && (
                  <a
                    href={temple.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline font-medium"
                  >
                    Official Trust <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                📍 {temple.city}, {temple.state}, {temple.country}
              </p>
            </div>

            {/* Devotional Interaction Pill */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handlePranam}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-extrabold transition-all duration-200 active:scale-95 shadow-md ${
                  hasOffered
                    ? 'bg-amber-500 text-black shadow-amber-500/20'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                }`}
              >
                <span>🙏</span>
                <span>{hasOffered ? 'Pranam Offered' : 'Offer Pranam'}</span>
                <span className="ml-1 opacity-75 font-mono text-[11px]">({pranamCount})</span>
              </button>

              {/* Prev / Next temple navigator buttons */}
              {allTemples.length > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex <= 0}
                    className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                    title="Previous Temple"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex >= allTemples.length - 1}
                    className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed border border-zinc-800 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
                    title="Next Temple"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Switch Temples Horizontal Bar */}
          {allTemples.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60">
              <p className="text-[11px] font-semibold text-zinc-400 mb-2 flex items-center gap-1">
                <span>⚡ Quick Switch Temples</span>
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {allTemples.map(t => {
                  const isSelected = t.id === temple.id;
                  const tLive = t.liveStatus === 'live';
                  return (
                    <button
                      key={t.id}
                      onClick={() => onSelectTemple && onSelectTemple(t)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-zinc-700">
                        <img src={t.thumbnail} alt={t.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="truncate max-w-[120px]">{t.name}</span>
                      {tLive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
