'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, ArrowLeft } from 'lucide-react';

export default function SingleReelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error('[SingleReelError caught]:', error);
  }, [error]);

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col items-center justify-center p-6 text-center select-none">
      <div className="max-w-sm w-full bg-zinc-900/90 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800 text-zinc-300 flex items-center justify-center mx-auto text-xl font-bold">
          ⚡
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-white">Reel Display Sync</h2>
          <p className="text-xs text-zinc-400 leading-relaxed font-medium">
            Could not render this reel. Tap retry to smoothly resume playback.
          </p>
        </div>
        <div className="pt-2 flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-white text-black font-bold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <button
            onClick={() => router.push('/reels')}
            className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-zinc-300 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse All Reels</span>
          </button>
        </div>
      </div>
    </div>
  );
}
