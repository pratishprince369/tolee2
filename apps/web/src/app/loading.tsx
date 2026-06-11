import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-shimmer rounded-lg bg-gray-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Slim top progress bar */}
      <div className="fixed top-0 left-0 w-full z-[9999] h-[3px] overflow-hidden bg-transparent">
        <div className="h-full bg-primary animate-progress-bar origin-left" />
      </div>

      {/* Main layout skeleton — mirrors the real app shell */}
      <div className="flex w-full min-h-screen pt-[3px]">

        {/* Left sidebar skeleton (desktop only) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 h-screen border-r border-gray-100 dark:border-zinc-800 p-4 gap-4">
          {/* Logo */}
          <Shimmer className="w-28 h-8 mb-4" />
          {/* Nav items */}
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
              <Shimmer className="flex-1 h-4" />
            </div>
          ))}
          <div className="mt-auto">
            <div className="flex items-center gap-3">
              <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
              <Shimmer className="flex-1 h-4" />
            </div>
          </div>
        </aside>

        {/* Main content area skeleton */}
        <main className="flex-1 flex flex-col gap-6 p-4 sm:p-6 max-w-2xl mx-auto w-full">

          {/* Stories / stories bar */}
          <div className="flex gap-3 overflow-hidden">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <Shimmer className="w-14 h-14 rounded-full" />
                <Shimmer className="w-12 h-2.5" />
              </div>
            ))}
          </div>

          {/* Post card skeleton × 2 */}
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Post header */}
              <div className="flex items-center gap-3 p-4">
                <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                  <Shimmer className="w-28 h-3.5" />
                  <Shimmer className="w-20 h-2.5" />
                </div>
                <Shimmer className="w-6 h-6 rounded-full" />
              </div>

              {/* Caption lines */}
              <div className="px-4 pb-3 flex flex-col gap-2">
                <Shimmer className="w-full h-3" />
                <Shimmer className="w-4/5 h-3" />
              </div>

              {/* Media placeholder */}
              <Shimmer className="w-full aspect-square rounded-none" />

              {/* Action bar */}
              <div className="flex items-center gap-4 px-4 py-3">
                <Shimmer className="w-6 h-6 rounded-full" />
                <Shimmer className="w-6 h-6 rounded-full" />
                <Shimmer className="w-6 h-6 rounded-full" />
                <div className="ml-auto">
                  <Shimmer className="w-6 h-6 rounded-full" />
                </div>
              </div>

              {/* Like count */}
              <div className="px-4 pb-4">
                <Shimmer className="w-24 h-3" />
              </div>
            </div>
          ))}
        </main>

        {/* Right panel skeleton (large desktop only) */}
        <aside className="hidden xl:flex flex-col w-72 shrink-0 h-screen border-l border-gray-100 dark:border-zinc-800 p-5 gap-5">
          {/* Suggested users heading */}
          <Shimmer className="w-32 h-4" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Shimmer className="w-24 h-3" />
                <Shimmer className="w-16 h-2.5" />
              </div>
              <Shimmer className="w-14 h-7 rounded-full" />
            </div>
          ))}
        </aside>
      </div>

      {/* Mobile bottom nav skeleton */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-zinc-900 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-around px-4">
        {[...Array(5)].map((_, i) => (
          <Shimmer key={i} className="w-7 h-7 rounded-full" />
        ))}
      </nav>
    </div>
  );
}
