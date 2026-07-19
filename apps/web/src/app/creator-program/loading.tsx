import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-48" />
      <div className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 rounded-2xl p-6 space-y-4">
        <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
        <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950/20 rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
            <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
