import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded-lg bg-gray-200 dark:bg-zinc-800 ${className}`} />
  );
}

export default function DiscoverLoading() {
  return (
    <div className="min-h-screen bg-background px-4 sm:px-6 py-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">

        {/* Search bar skeleton */}
        <Shimmer className="w-full h-11 rounded-full" />

        {/* Category pills */}
        <div className="flex gap-2 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <Shimmer key={i} className="w-20 h-8 rounded-full flex-shrink-0" />
          ))}
        </div>

        {/* Trending people */}
        <section>
          <Shimmer className="w-40 h-4 mb-4" />
          <div className="flex gap-4 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                <Shimmer className="w-16 h-16 rounded-full" />
                <Shimmer className="w-14 h-2.5" />
                <Shimmer className="w-12 h-7 rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* Trending hashtags */}
        <section>
          <Shimmer className="w-40 h-4 mb-4" />
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Shimmer className="w-10 h-10 rounded-xl flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Shimmer className="w-24 h-3.5" />
                  <Shimmer className="w-16 h-2.5" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Content grid */}
        <section>
          <Shimmer className="w-36 h-4 mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
            {[...Array(9)].map((_, i) => (
              <Shimmer key={i} className="aspect-square w-full rounded-xl" />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
