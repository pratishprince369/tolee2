import React from 'react';

export default function Loading() {
  return (
    <div className="flex-grow w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
      <div className="h-7 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-32" />
      <div className="flex flex-col md:flex-row gap-6">
        {/* Settings tabs list sidebar skeleton */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
          ))}
        </div>
        
        {/* Settings Tab Content Area skeleton */}
        <div className="flex-grow border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 bg-white dark:bg-zinc-950/20 space-y-6">
          <div className="space-y-2">
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
            <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
          </div>
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-24" />
                <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
