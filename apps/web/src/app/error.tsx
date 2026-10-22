'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalRootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalRootError] Unhandled client exception caught:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black text-gray-900 dark:text-white p-4 font-sans select-none">
      <div className="max-w-md w-full text-center p-8 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-3xl space-y-5 shadow-xl">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto text-2xl font-bold border border-teal-500/20">
          ✨
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight">Something went wrong</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            A temporary display sync occurred during navigation. Tap below to continue smoothly.
          </p>
        </div>
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              } else {
                reset();
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95"
          >
            Reload Page
          </button>
          <Link
            href="/feed"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-900 dark:text-white text-xs font-bold transition-all shadow-sm block text-center"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
