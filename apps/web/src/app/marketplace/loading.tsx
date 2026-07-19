import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      {/* Category selector row shimmer */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded-full w-24 shrink-0" />
        ))}
      </div>
      
      {/* Product grid list skeletons */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950/20 shadow-sm flex flex-col">
            <div className="h-40 bg-zinc-200 dark:bg-zinc-800 w-full" />
            <div className="p-3.5 space-y-2 flex-grow">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/3" />
              <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-full" />
              <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
