'use client';

import React, { useState } from 'react';
import { 
  Share2, Copy, Check, MessageCircle, Twitter, 
  Linkedin, Send, Sparkles, ExternalLink 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { ShareModal } from '@/components/ShareModal';

interface NewsShareButtonProps {
  postId: string;
  slug: string;
  headline: string;
  summary?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  authorName?: string | null;
  authorAvatar?: string | null;
}

export function NewsShareButton({
  postId,
  slug,
  headline,
  summary,
  mediaUrl,
  mediaType,
  authorName,
  authorAvatar
}: NewsShareButtonProps) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const getShareUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/news/${slug}`;
    }
    return `https://tolee.in/news/${slug}`;
  };

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('navigator.clipboard failed, attempting fallback...', err);
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-999999px';
      textArea.style.left = '-999999px';
      textArea.setAttribute('readonly', '');
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      return success;
    } catch (err) {
      console.error('Fallback clipboard copy failed:', err);
      return false;
    }
  };

  const handleCopyLink = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const url = getShareUrl();
    const success = await copyTextToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    const text = `${headline}\n\nRead more on Tolee News:\n${url}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    const text = `${headline} | Tolee News`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    window.open(linkedinUrl, '_blank', 'noopener,noreferrer');
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getShareUrl();
    if (typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: headline,
          text: summary || 'Check out this news article on Tolee!',
          url: url,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      }
    }
    // Fallback: open Tolee Share Modal
    setIsShareModalOpen(true);
  };

  const openFullModal = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsShareModalOpen(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 px-3.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer outline-none active:scale-95">
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-600" />
              <span className="text-teal-600 font-bold">Link Copied!</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400" />
              <span>Share</span>
            </>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-2xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xl z-50">
          <DropdownMenuItem 
            onClick={handleCopyLink} 
            className="cursor-pointer rounded-xl text-xs font-semibold py-2.5 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-teal-600" />
              <span>Copy Article Link</span>
            </div>
            {copied && <Check className="w-3.5 h-3.5 text-teal-600" />}
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleWhatsAppShare} 
            className="cursor-pointer rounded-xl text-xs font-semibold py-2.5 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Share via WhatsApp</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleTwitterShare} 
            className="cursor-pointer rounded-xl text-xs font-semibold py-2.5 flex items-center gap-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30"
          >
            <Twitter className="w-4 h-4" />
            <span>Share on X (Twitter)</span>
          </DropdownMenuItem>

          <DropdownMenuItem 
            onClick={handleLinkedInShare} 
            className="cursor-pointer rounded-xl text-xs font-semibold py-2.5 flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Linkedin className="w-4 h-4" />
            <span>Share on LinkedIn</span>
          </DropdownMenuItem>

          {typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function' && (
            <DropdownMenuItem 
              onClick={handleNativeShare} 
              className="cursor-pointer rounded-xl text-xs font-semibold py-2.5 flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4 text-purple-600" />
              <span>Share via Apps...</span>
            </DropdownMenuItem>
          )}

          <DropdownMenuSeparator />

          <DropdownMenuItem 
            onClick={openFullModal} 
            className="cursor-pointer rounded-xl text-xs font-bold py-2.5 flex items-center gap-2 text-primary"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Story & Tolee Friends...</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Full Tolee Share Modal */}
      {isShareModalOpen && (
        <ShareModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          postId={postId}
          shareUrl={getShareUrl()}
          previewText={headline}
          postMediaUrl={mediaUrl}
          postMediaType={mediaType}
          postAuthor={authorName}
          postAuthorAvatar={authorAvatar}
          postCaption={headline}
        />
      )}
    </>
  );
}
