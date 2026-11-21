'use client';

import React, { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const purgeAndReload = () => {
    if (typeof window !== 'undefined') {
      try {
        if ('caches' in window) {
          caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
        }
      } catch (e) {}
      window.location.href = '/feed?_fresh=' + Date.now();
    } else {
      reset();
    }
  };

  useEffect(() => {
    const errorMsg = error?.message || '';
    console.error('[Tolee Global Error Caught]:', errorMsg);

    // Auto-recover immediately without requiring the user to tap "Back to Home Feed"
    if (typeof window !== 'undefined') {
      try {
        const retries = parseInt(sessionStorage.getItem('tolee_ge_retries') || '0', 10);
        if (retries < 2) {
          sessionStorage.setItem('tolee_ge_retries', String(retries + 1));
          setTimeout(() => {
            purgeAndReload();
          }, 150);
        }
      } catch (e) {
        setTimeout(purgeAndReload, 150);
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
              onClick={purgeAndReload}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md cursor-pointer active:scale-95"
            >
              Back to Home Feed
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
