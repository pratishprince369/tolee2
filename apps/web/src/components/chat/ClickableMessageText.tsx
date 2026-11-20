'use client';

import React, { useMemo } from 'react';

interface ClickableMessageTextProps {
  text?: string | null;
  isMe?: boolean;
  className?: string;
}

interface TextSegment {
  type: 'text' | 'link';
  content: string;
  href?: string;
}

/**
 * Parses plain message text and identifies web URLs (http, https, www).
 * WhatsApp-style: Automatically isolates trailing punctuation, ensures safe protocols,
 * and maintains message text formatting without HTML injection.
 */
function parseMessageUrls(rawText: string): TextSegment[] {
  if (!rawText) return [];

  // Match URLs starting with http://, https://, or www.
  // Stops at standard whitespace and illegal URL delimiters
  const urlRegex = /\b(?:https?:\/\/|www\.)[^\s<>"'{}|\^`\\]+/gi;
  const segments: TextSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(rawText)) !== null) {
    const matchStart = match.index;
    let url = match[0];
    const matchEnd = matchStart + url.length;

    // Normal text before this URL
    if (matchStart > lastIndex) {
      segments.push({
        type: 'text',
        content: rawText.slice(lastIndex, matchStart),
      });
    }

    // Safely peel off trailing punctuation (.,;:!?) or unmatched closing brackets
    let trailingPunct = '';
    while (url.length > 0) {
      const lastChar = url[url.length - 1];
      if (['.', ',', ';', ':', '!', '?'].includes(lastChar)) {
        trailingPunct = lastChar + trailingPunct;
        url = url.slice(0, -1);
      } else if (lastChar === ')') {
        const openParen = (url.match(/\(/g) || []).length;
        const closeParen = (url.match(/\)/g) || []).length;
        if (closeParen > openParen) {
          trailingPunct = lastChar + trailingPunct;
          url = url.slice(0, -1);
        } else {
          break;
        }
      } else if (lastChar === ']') {
        const openBracket = (url.match(/\[/g) || []).length;
        const closeBracket = (url.match(/\]/g) || []).length;
        if (closeBracket > openBracket) {
          trailingPunct = lastChar + trailingPunct;
          url = url.slice(0, -1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    if (url.length > 0) {
      // Validate and enforce safe web protocol
      const safeHref = url.toLowerCase().startsWith('www.')
        ? `https://${url}`
        : url.match(/^https?:\/\//i)
          ? url
          : `https://${url}`;

      segments.push({
        type: 'link',
        content: url,
        href: safeHref,
      });
    }

    if (trailingPunct) {
      segments.push({
        type: 'text',
        content: trailingPunct,
      });
    }

    lastIndex = matchEnd;
  }

  // Normal text after the last URL
  if (lastIndex < rawText.length) {
    segments.push({
      type: 'text',
      content: rawText.slice(lastIndex),
    });
  }

  return segments;
}

export const ClickableMessageText: React.FC<ClickableMessageTextProps> = React.memo(
  ({ text, isMe, className = '' }) => {
    if (!text) return null;

    const segments = useMemo(() => parseMessageUrls(text), [text]);

    // Fast-path: if no links detected, return raw text directly
    if (segments.length === 1 && segments[0].type === 'text') {
      return <>{text}</>;
    }

    return (
      <span className={className}>
        {segments.map((seg, idx) => {
          if (seg.type === 'link' && seg.href) {
            return (
              <a
                key={`lnk-${idx}-${seg.href}`}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  // Prevent message bubble long-press / selection / context handlers from swallowing the link click
                  e.stopPropagation();
                }}
                className={`font-normal underline underline-offset-2 break-all [word-break:break-all] transition-colors cursor-pointer ${
                  isMe
                    ? 'text-[#056155] dark:text-[#2dd4bf] hover:text-[#023b34] dark:hover:text-[#5eead4] decoration-[#056155]/60 dark:decoration-[#2dd4bf]/60'
                    : 'text-[#0a7c71] dark:text-[#2dd4bf] hover:text-[#065f57] dark:hover:text-[#5eead4] decoration-[#0a7c71]/60 dark:decoration-[#2dd4bf]/60'
                }`}
                title={seg.href}
              >
                {seg.content}
              </a>
            );
          }
          return <React.Fragment key={`txt-${idx}`}>{seg.content}</React.Fragment>;
        })}
      </span>
    );
  }
);

ClickableMessageText.displayName = 'ClickableMessageText';

export default ClickableMessageText;
