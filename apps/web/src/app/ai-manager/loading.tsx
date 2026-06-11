import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded-lg bg-gray-200 dark:bg-zinc-800 ${className}`} />
  );
}

/** AI-side bubble skeleton */
function AiBubble({ wide = false }: { wide?: boolean }) {
  return (
    <div className="flex items-end gap-2 sm:gap-3 justify-start">
      {/* Avatar */}
      <Shimmer className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 hidden sm:block" />
      <div className={`flex flex-col gap-1.5 ${wide ? 'w-72 sm:w-96' : 'w-48 sm:w-64'}`}>
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-5/6" />
        {wide && <Shimmer className="h-4 w-4/5" />}
        <Shimmer className="h-2.5 w-16 mt-0.5" />
      </div>
    </div>
  );
}

/** User-side bubble skeleton */
function UserBubble() {
  return (
    <div className="flex items-end gap-2 sm:gap-3 justify-end">
      <div className="flex flex-col items-end gap-1.5 w-48 sm:w-56">
        <Shimmer className="h-4 w-full" />
        <Shimmer className="h-4 w-3/4" />
        <Shimmer className="h-2.5 w-14 mt-0.5" />
      </div>
    </div>
  );
}

/** Typing indicator dots */
function TypingDots() {
  return (
    <div className="flex items-end gap-2 sm:gap-3 justify-start">
      <Shimmer className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 hidden sm:block" />
      <div className="px-4 py-3 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
        <span className="w-2 h-2 bg-gray-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default function AIManagerLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen w-full bg-white dark:bg-[#09090b] font-sans">

      {/* ── Header skeleton ── */}
      <div className="h-16 border-b border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center px-4 sm:px-6 gap-3 shrink-0">
        <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Shimmer className="w-32 h-3.5" />
          <Shimmer className="w-16 h-2.5" />
        </div>
      </div>

      {/* ── Message thread skeleton ── */}
      <div className="flex-1 overflow-hidden px-2 sm:px-4 lg:px-8 py-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5 sm:gap-6">

          {/* Welcome / large AI message */}
          <AiBubble wide />

          {/* User reply */}
          <UserBubble />

          {/* AI response with more lines */}
          <AiBubble wide />

          {/* Narrow user message */}
          <UserBubble />

          {/* Short AI reply */}
          <AiBubble />

          {/* AI marketing campaign card skeleton */}
          <div className="flex items-start gap-2 sm:gap-3">
            <Shimmer className="w-8 h-8 sm:w-9 sm:h-9 rounded-full flex-shrink-0 hidden sm:block" />
            <div className="w-full max-w-md flex flex-col rounded-2xl overflow-hidden border border-gray-100 dark:border-zinc-800 shadow-xl shadow-black/5">
              {/* Gradient header of card */}
              <Shimmer className="h-16 rounded-none" />
              <div className="p-4 sm:p-5 flex flex-col gap-3">
                <Shimmer className="w-24 h-2.5" />
                <div className="rounded-xl border border-gray-100 dark:border-zinc-800 p-4 flex flex-col gap-2">
                  <Shimmer className="w-3/4 h-4" />
                  <Shimmer className="w-full h-3" />
                  <Shimmer className="w-5/6 h-3" />
                  <Shimmer className="w-4/5 h-3" />
                  <Shimmer className="w-32 h-3 mt-1" />
                </div>
                {/* Community checkboxes */}
                <Shimmer className="w-36 h-2.5 mt-1" />
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <Shimmer className="w-4 h-4 rounded flex-shrink-0" />
                    <Shimmer className="flex-1 h-3" />
                  </div>
                ))}
              </div>
              {/* Publish button */}
              <div className="bg-gray-50 dark:bg-black/30 border-t border-gray-100 dark:border-zinc-800 p-4">
                <Shimmer className="w-full h-11 rounded-xl" />
              </div>
            </div>
          </div>

          {/* Typing dots — AI is about to respond */}
          <TypingDots />
        </div>
      </div>

      {/* ── Input bar skeleton ── */}
      <div className="shrink-0 px-4 pb-4 max-w-4xl mx-auto w-full">
        <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl shadow-lg flex items-center px-3 py-2 gap-3">
          <Shimmer className="w-9 h-9 rounded-xl flex-shrink-0" />
          <Shimmer className="flex-1 h-5 rounded-full" />
          <Shimmer className="w-9 h-9 rounded-xl flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
