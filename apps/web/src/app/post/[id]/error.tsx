'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function PostError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PostError] Client post view error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070b13] text-white p-4 font-sans">
      <div className="max-w-md w-full text-center p-8 bg-[#0b1220] border border-[#16233a] rounded-3xl space-y-5 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto text-2xl font-bold border border-teal-500/20">
          ⚠️
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-white">Unable to display post</h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            An unexpected error occurred while loading this post.
          </p>
        </div>
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Try Again
          </button>
          <Link
            href="/feed"
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all shadow-md block text-center"
          >
            Back to Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
