import React from 'react';

function Shimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded-lg bg-gray-200 dark:bg-zinc-800 ${className}`} />
  );
}

/** One chat list row */
function ChatRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Shimmer className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <Shimmer className="w-28 h-3.5" />
          <Shimmer className="w-10 h-2.5 flex-shrink-0" />
        </div>
        <Shimmer className="w-3/4 h-2.5" />
      </div>
    </div>
  );
}

/** One message bubble */
function MessageBubbleSkeleton({ isMe = false }: { isMe?: boolean }) {
  return (
    <div className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
      {!isMe && <Shimmer className="w-8 h-8 rounded-full flex-shrink-0 self-end" />}
      <div className={`flex flex-col gap-1.5 max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        <Shimmer className="h-10 w-48 rounded-2xl" />
        <Shimmer className="w-16 h-2.5" />
      </div>
    </div>
  );
}

export default function ChatLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen bg-background overflow-hidden">

      {/* ── Left panel: chat list ── */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-100 dark:border-zinc-800 flex flex-col shrink-0">
        {/* Header */}
        <div className="h-16 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-4 gap-3">
          <Shimmer className="w-24 h-5" />
          <Shimmer className="w-8 h-8 rounded-full" />
        </div>
        {/* Search */}
        <div className="px-4 py-3">
          <Shimmer className="w-full h-9 rounded-full" />
        </div>
        {/* Chat rows */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <ChatRowSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* ── Right panel: message thread (hidden on mobile) ── */}
      <div className="hidden md:flex flex-col flex-1 overflow-hidden">
        {/* Chat header */}
        <div className="h-16 border-b border-gray-100 dark:border-zinc-800 flex items-center gap-3 px-4">
          <Shimmer className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Shimmer className="w-28 h-3.5" />
            <Shimmer className="w-20 h-2.5" />
          </div>
        </div>

        {/* Message thread */}
        <div className="flex-1 flex flex-col gap-4 px-4 py-5 overflow-hidden">
          <MessageBubbleSkeleton />
          <MessageBubbleSkeleton isMe />
          <MessageBubbleSkeleton />
          <MessageBubbleSkeleton />
          <MessageBubbleSkeleton isMe />
          <MessageBubbleSkeleton />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-100 dark:border-zinc-800 p-4 flex items-center gap-3">
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
          <Shimmer className="flex-1 h-10 rounded-full" />
          <Shimmer className="w-8 h-8 rounded-full flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}
