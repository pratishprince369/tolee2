'use client';

import React, { useEffect, useState } from 'react';
import { Zap, WifiOff, CheckCircle2, ChevronRight, HardDrive } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getOfflinePocketPosts, CachedPocketPost } from '@/lib/offlineSmartPocket';

export function OfflineSmartPocketBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [cachedCount, setCachedCount] = useState(0);
  const [cachedItems, setCachedItems] = useState<CachedPocketPost[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateOnlineStatus = () => {
      const offline = !navigator.onLine;
      setIsOffline(offline);
      if (offline) {
        const pocket = getOfflinePocketPosts();
        setCachedCount(pocket.length);
        setCachedItems(pocket);
      }
    };

    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <>
      {/* Floating Offline Zero-Data Status Banner */}
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 w-11/12 max-w-md">
        <div 
          onClick={() => setShowDrawer(!showDrawer)}
          className="bg-zinc-950/95 border border-amber-500/50 shadow-2xl backdrop-blur-xl rounded-full px-4 py-2.5 flex items-center justify-between cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <Zap className="w-4 h-4 animate-pulse" />
            </span>
            <div>
              <span className="text-xs font-black text-amber-400 block tracking-wide">
                ⚡ Zero-Data Offline Mode Active
              </span>
              <span className="text-[10px] text-zinc-400 block">
                {cachedCount > 0 ? `${cachedCount} News & Videos Cached` : 'Offline Pocket Active'}
              </span>
            </div>
          </div>

          <Badge className="bg-amber-500 text-zinc-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1 border-none shadow-md">
            View Pocket <ChevronRight className="w-3 h-3" />
          </Badge>
        </div>
      </div>

      {/* Offline Cached Articles Drawer */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">Tolee Offline Smart Pocket</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowDrawer(false)}
                className="text-xs text-zinc-400 hover:text-white px-2 py-1"
              >
                Close
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              No internet connection detected. Read your pre-cached news articles and watch saved videos offline with zero data!
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {cachedItems.map((item) => (
                <a
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="block bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-2xl p-3 space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <Badge className="bg-amber-500/20 text-amber-400 text-[9px] font-bold border-none uppercase">
                      {item.category}
                    </Badge>
                    <span className="text-[10px] text-zinc-500">Cached Offline</span>
                  </div>
                  <h4 className="text-xs font-bold text-white line-clamp-2">{item.headline}</h4>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
