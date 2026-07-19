import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 animate-pulse">
      <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-36 mb-6" />
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-zinc-100 dark:border-zinc-900 rounded-2xl bg-white dark:bg-zinc-950/20">
            <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex-grow space-y-2">
              <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-5/6" />
              <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
            </div>
            <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
