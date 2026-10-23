'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const errorMsg = error?.message || '';
    console.error('[Tolee Global Error Caught]:', errorMsg);

    // If it's a React #482 or router chunk mismatch error, smoothly recover to feed
    if (
      errorMsg.includes('482') ||
      errorMsg.includes('Minified React error #482') ||
      errorMsg.includes('ChunkLoadError') ||
      errorMsg.includes('Loading chunk')
    ) {
      if (typeof window !== 'undefined') {
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
          }
        } catch (e) {}
        setTimeout(() => {
          window.location.replace('/feed');
        }, 100);
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex items-center justify-center p-4 font-sans text-gray-900 dark:text-zinc-100">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚡
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-bold">Resuming Tolee</h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              Recovering your feed and returning to your last read position...
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.replace('/feed');
                } else {
                  reset();
                }
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md cursor-pointer"
            >
              Back to Home Feed
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
