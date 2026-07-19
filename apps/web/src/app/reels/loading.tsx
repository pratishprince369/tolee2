import React from 'react';

export default function Loading() {
  return (
    <div className="w-full h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] flex items-center justify-center bg-black animate-pulse">
      <div className="w-full max-w-md h-full aspect-[9/16] bg-zinc-900 border border-zinc-800 rounded-none md:rounded-2xl relative overflow-hidden flex flex-col justify-end p-6 space-y-4">
        {/* Left indicators skeleton */}
        <div className="space-y-2 w-2/3">
          <div className="h-4 bg-zinc-800 rounded w-1/2" />
          <div className="h-3 bg-zinc-800 rounded w-3/4" />
        </div>
        {/* Right floating overlay skeleton */}
        <div className="absolute right-4 bottom-24 flex flex-col gap-5 items-center">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-10 h-10 rounded-full bg-zinc-800" />
          ))}
        </div>
      </div>
    </div>
  );
}
