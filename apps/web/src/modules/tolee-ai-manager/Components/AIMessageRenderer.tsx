'use client';

import React, { useState } from 'react';
import { Copy, Check, Terminal } from 'lucide-react';

interface AIMessageRendererProps {
  content: string;
  isAI?: boolean;
}

export function AIMessageRenderer({ content, isAI = true }: AIMessageRendererProps) {
  if (!content) return null;

  // Split by code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_\-+.]*)\n([\s\S]*?)```/g;
  const parts: { type: 'text' | 'code'; language?: string; text: string }[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: content.slice(lastIndex, match.index)
      });
    }

    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      text: match[2].trimEnd()
    });

    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      text: content.slice(lastIndex)
    });
  }

  return (
    <div className="space-y-3 leading-relaxed break-words text-sm">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return <CodeSnippetBlock key={index} language={part.language || 'code'} code={part.text} />;
        }
        return <FormattedTextChunk key={index} text={part.text} isAI={isAI} />;
      })}
    </div>
  );
}

function CodeSnippetBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-2xl overflow-hidden border border-slate-700/60 bg-zinc-950 text-zinc-100 shadow-md">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider text-violet-400">
          <Terminal className="w-3.5 h-3.5" />
          {language}
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors text-[11px] font-medium"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      {/* Code Body */}
      <pre className="p-3.5 text-xs font-mono overflow-x-auto text-zinc-200 leading-relaxed no-scrollbar selection:bg-violet-900 selection:text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function FormattedTextChunk({ text, isAI }: { text: string; isAI: boolean }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-base mt-2 mb-1 text-slate-900 dark:text-zinc-100">
              {formatInlineText(trimmed.replace(/^###\s+/, ''), isAI)}
            </h4>
          );
        }

        // Heading 2: ## Heading
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-extrabold text-lg mt-3 mb-1 text-slate-900 dark:text-zinc-100">
              {formatInlineText(trimmed.replace(/^##\s+/, ''), isAI)}
            </h3>
          );
        }

        // Heading 1: # Heading
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="font-extrabold text-xl mt-3 mb-1 text-slate-900 dark:text-zinc-100">
              {formatInlineText(trimmed.replace(/^#\s+/, ''), isAI)}
            </h2>
          );
        }

        // Blockquote: > text
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote
              key={idx}
              className="border-l-4 border-violet-500/80 pl-3 py-1 my-1 italic text-slate-600 dark:text-zinc-300 bg-violet-50/50 dark:bg-violet-950/20 rounded-r-lg text-xs sm:text-sm"
            >
              {formatInlineText(trimmed.replace(/^>\s+/, ''), isAI)}
            </blockquote>
          );
        }

        // Bullet point: - or *
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-violet-500 dark:text-violet-400 mt-1">•</span>
              <span className="flex-1">{formatInlineText(trimmed.replace(/^[-*]\s+/, ''), isAI)}</span>
            </div>
          );
        }

        // Numbered list: 1. or 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="font-semibold text-violet-600 dark:text-violet-400 shrink-0 text-xs mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{formatInlineText(numMatch[2], isAI)}</span>
            </div>
          );
        }

        // Regular paragraph line
        return (
          <p key={idx} className="leading-relaxed">
            {formatInlineText(line, isAI)}
          </p>
        );
      })}
    </div>
  );
}

function formatInlineText(raw: string, isAI: boolean): React.ReactNode {
  // Parses **bold**, *italic*, and `code` inline
  const tokens = raw.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('**') && token.endsWith('**') && token.length >= 4) {
      return (
        <strong key={i} className="font-bold text-slate-900 dark:text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length >= 2) {
      return <em key={i}>{token.slice(1, -1)}</em>;
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length >= 2) {
      return (
        <code
          key={i}
          className={`px-1.5 py-0.5 rounded font-mono text-xs ${
            isAI
              ? 'bg-slate-100 dark:bg-zinc-800 text-violet-700 dark:text-violet-300 font-semibold'
              : 'bg-white/20 text-white font-semibold'
          }`}
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    return token;
  });
}