import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 space-y-4 bg-white dark:bg-zinc-950/20">
            <div className="h-40 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
