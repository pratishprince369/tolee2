"use client";

import React, { useState } from 'react';
import { Copy, Share2, Check } from 'lucide-react';

interface Props {
  referralCode: string;
}

export function ReferralNotificationActions({ referralCode }: Props) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const referralLink = `${window.location.origin}/ref/${referralCode}`;
  const shareMessage = `Join me on Tolee – India's Community Social Network. Use my referral link to join and become part of amazing local communities.\nDownload Now: ${referralLink}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy referral link:', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Tolee Social Network",
          text: shareMessage,
          url: referralLink,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch (err) {
        console.warn('Share cancelled or failed:', err);
      }
    } else {
      // Fallback copy if Web Share API is not supported
      handleCopy();
    }
  };

  return (
    <div className="pt-2 flex flex-wrap items-center gap-3">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl px-4 py-2.5 shadow-sm transition-all"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5" />
            <span>Copied Link!</span>
          </>
        ) : (
          <>
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Referral Link</span>
          </>
        )}
      </button>

      <button
        onClick={handleShare}
        className="inline-flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white text-xs font-black rounded-xl px-4 py-2.5 shadow-sm transition-all"
      >
        <Share2 className="w-3.5 h-3.5" />
        <span>{shared ? 'Shared!' : 'Share Referral Link'}</span>
      </button>
    </div>
  );
}
