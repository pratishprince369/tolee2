import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-36" />
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="space-y-1 flex-grow">
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-16" />
              </div>
            </div>
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
