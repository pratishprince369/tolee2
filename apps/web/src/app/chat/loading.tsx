import React from 'react';

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] w-full bg-white dark:bg-[#09090b] overflow-hidden border-t border-zinc-100 dark:border-zinc-900 animate-pulse">
      {/* Chats List Sidebar skeleton */}
      <div className="w-80 border-r border-zinc-100 dark:border-zinc-900 flex flex-col p-4 space-y-4 shrink-0 hidden md:flex">
        <div className="h-9 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-full" />
        <div className="flex-1 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-2/3" />
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat column skeleton */}
      <div className="flex-grow flex flex-col p-6 justify-between bg-zinc-50/20 dark:bg-black/10">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28" />
          </div>
        </div>
        <div className="flex-1 py-8 space-y-6 overflow-y-auto">
          <div className="flex justify-start"><div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-1/3" /></div>
          <div className="flex justify-end"><div className="h-10 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-2xl w-1/4" /></div>
          <div className="flex justify-start"><div className="h-12 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-1/2" /></div>
        </div>
        <div className="h-11 bg-zinc-200 dark:bg-zinc-800 rounded-2xl w-full" />
      </div>
    </div>
  );
}
