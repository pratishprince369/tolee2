import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded-lg bg-zinc-800 ${className}`} />
  );
}

/** Single reel slide skeleton — full-viewport dark card */
function ReelSkeleton() {
  return (
    <div className="relative w-full h-full flex-shrink-0 bg-black flex items-end">
      {/* Blurred video placeholder */}
      <Shimmer className="absolute inset-0 rounded-none" />

      {/* Right-side action icons */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <Shimmer className="w-8 h-8 rounded-full" />
            <Shimmer className="w-8 h-2.5" />
          </div>
        ))}
      </div>

      {/* Bottom caption / user info */}
      <div className="relative z-10 p-4 pb-6 flex flex-col gap-2 w-4/5">
        <div className="flex items-center gap-2">
          <Shimmer className="w-9 h-9 rounded-full flex-shrink-0" />
          <Shimmer className="w-28 h-3.5" />
          <Shimmer className="w-16 h-7 rounded-full ml-2" />
        </div>
        <Shimmer className="w-full h-3 mt-1" />
        <Shimmer className="w-3/4 h-3" />
        <div className="flex items-center gap-2 mt-1">
          <Shimmer className="w-4 h-4 rounded-full" />
          <Shimmer className="w-24 h-2.5" />
        </div>
      </div>
    </div>
  );
}

export default function ReelsLoading() {
  return (
    <div className="fixed inset-0 bg-black z-10 overflow-hidden">
      <ReelSkeleton />
    </div>
  );
}
