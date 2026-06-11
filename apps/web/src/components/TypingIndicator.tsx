'use client';

import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
  typingUsers: string[];
  isGroup?: boolean;
}

export function TypingIndicator({ typingUsers, isGroup = false }: TypingIndicatorProps) {
  const [visible, setVisible] = useState(false);

  // Smooth fade-in/out
  useEffect(() => {
    if (typingUsers.length > 0) {
      setVisible(true);
    } else {
      // Delay hiding to allow fade-out animation
      const t = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(t);
    }
  }, [typingUsers]);

  if (!visible) return null;

  // Build label: "Ram is typing..." or "Ram, Shyam are typing..."
  let label = '';
  if (typingUsers.length === 1) {
    label = isGroup ? `${typingUsers[0]} is typing` : 'typing';
  } else if (typingUsers.length === 2) {
    label = `${typingUsers[0]} and ${typingUsers[1]} are typing`;
  } else {
    label = `${typingUsers[0]} and ${typingUsers.length - 1} others are typing`;
  }

  const isShowing = typingUsers.length > 0;

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 my-1 px-0 transition-all duration-300 ${
        isShowing ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
      }`}
      aria-live="polite"
      aria-label={`${label}...`}
    >
      {/* Avatar placeholder dot (aligns with other messages) */}
      <div className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0" />

      {/* Typing bubble */}
      <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/60 rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm max-w-[200px]">
        {/* Animated dots */}
        <div className="flex items-center gap-[3px]">
          <span
            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-typing-dot"
            style={{ animationDelay: '0ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-typing-dot"
            style={{ animationDelay: '160ms' }}
          />
          <span
            className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-typing-dot"
            style={{ animationDelay: '320ms' }}
          />
        </div>
        {/* Name label for group chats */}
        {isGroup && typingUsers.length > 0 && (
          <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap truncate max-w-[100px]">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
