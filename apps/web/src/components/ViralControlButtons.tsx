'use client';

import React, { useState } from 'react';
import { votePostDistributionAction } from '@/actions/viralControl';
import { Flame, ArrowDownCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export interface ViralControlButtonsProps {
  postId: string;
  initialStats?: {
    viral_count?: number;
    get_it_down_count?: number;
    total_vote_count?: number;
    viral_percentage?: number;
    get_it_down_percentage?: number;
    current_user_vote?: 'VIRAL' | 'GET_IT_DOWN' | null;
  };
  variant?: 'feed' | 'reel';
  className?: string;
}

export function ViralControlButtons({
  postId,
  initialStats,
  variant = 'feed',
  className,
}: ViralControlButtonsProps) {
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  const [stats, setStats] = useState({
    viralCount: initialStats?.viral_count || 0,
    downCount: initialStats?.get_it_down_count || 0,
    totalVotes: initialStats?.total_vote_count || 0,
    viralPercent: initialStats?.viral_percentage || 0,
    downPercent: initialStats?.get_it_down_percentage || 0,
    userVote: initialStats?.current_user_vote || null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeVoteTarget, setActiveVoteTarget] = useState<'VIRAL' | 'GET_IT_DOWN' | null>(null);

  const handleVote = async (voteType: 'VIRAL' | 'GET_IT_DOWN') => {
    if (!isAuthenticated) {
      alert('Please log in to vote on content distribution.');
      return;
    }

    // Optimistic calculation
    const prevStats = { ...stats };
    let newViralCount = stats.viralCount;
    let newDownCount = stats.downCount;
    let newUserVote: 'VIRAL' | 'GET_IT_DOWN' | null = voteType;

    if (stats.userVote === voteType) {
      // Toggle unvote
      newUserVote = null;
      if (voteType === 'VIRAL') newViralCount = Math.max(0, newViralCount - 1);
      else newDownCount = Math.max(0, newDownCount - 1);
    } else if (stats.userVote === 'VIRAL' && voteType === 'GET_IT_DOWN') {
      newViralCount = Math.max(0, newViralCount - 1);
      newDownCount += 1;
    } else if (stats.userVote === 'GET_IT_DOWN' && voteType === 'VIRAL') {
      newDownCount = Math.max(0, newDownCount - 1);
      newViralCount += 1;
    } else {
      if (voteType === 'VIRAL') newViralCount += 1;
      else newDownCount += 1;
    }

    const newTotal = newViralCount + newDownCount;
    const newViralPercent = newTotal > 0 ? Math.round((newViralCount / newTotal) * 100) : 0;
    const newDownPercent = newTotal > 0 ? 100 - newViralPercent : 0;

    setStats({
      viralCount: newViralCount,
      downCount: newDownCount,
      totalVotes: newTotal,
      viralPercent: newViralPercent,
      downPercent: newDownPercent,
      userVote: newUserVote,
    });

    setActiveVoteTarget(voteType);
    setIsLoading(true);

    try {
      const res = await votePostDistributionAction(postId, voteType);
      if (res.success && res.stats) {
        setStats({
          viralCount: res.stats.viral_count,
          downCount: res.stats.get_it_down_count,
          totalVotes: res.stats.total_vote_count,
          viralPercent: res.stats.viral_percentage,
          downPercent: res.stats.get_it_down_percentage,
          userVote: res.stats.current_user_vote,
        });
      } else {
        // Revert optimistic on error
        setStats(prevStats);
      }
    } catch {
      setStats(prevStats);
    } finally {
      setIsLoading(false);
      setActiveVoteTarget(null);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════
  // REELS VARIANT — Compact, non-intrusive, low-brightness video overlay
  // ═══════════════════════════════════════════════════════════════════════
  if (variant === 'reel') {
    return (
      <div
        className={cn(
          "w-full max-w-[280px] flex flex-col gap-1.5 pointer-events-auto select-none my-1",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* 🟢 Make this Viral */}
          <button
            onClick={() => handleVote('VIRAL')}
            disabled={isLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-semibold transition-all duration-200 backdrop-blur-md active:scale-95 shadow-sm",
              stats.userVote === 'VIRAL'
                ? "bg-emerald-600 text-white shadow-emerald-500/30 ring-1 ring-emerald-400"
                : "bg-black/40 hover:bg-emerald-950/40 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30"
            )}
            title="Make this Viral: recommend to additional audience"
          >
            {isLoading && activeVoteTarget === 'VIRAL' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Flame className={cn("w-3 h-3", stats.userVote === 'VIRAL' ? "fill-white" : "fill-emerald-400")} />
            )}
            <span className="truncate">Make Viral</span>
            <span className="text-[10px] opacity-80 font-mono font-normal">
              {stats.totalVotes > 0 ? `${stats.viralPercent}%` : ''}
            </span>
          </button>

          {/* 🔴 Get it Down */}
          <button
            onClick={() => handleVote('GET_IT_DOWN')}
            disabled={isLoading}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-full text-[11px] font-semibold transition-all duration-200 backdrop-blur-md active:scale-95 shadow-sm",
              stats.userVote === 'GET_IT_DOWN'
                ? "bg-rose-600 text-white shadow-rose-500/30 ring-1 ring-rose-400"
                : "bg-black/40 hover:bg-rose-950/40 text-rose-300 hover:text-rose-200 border border-rose-500/30"
            )}
            title="Get it Down: exclude from additional distribution"
          >
            {isLoading && activeVoteTarget === 'GET_IT_DOWN' ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <ArrowDownCircle className={cn("w-3 h-3", stats.userVote === 'GET_IT_DOWN' ? "text-white" : "text-rose-400")} />
            )}
            <span className="truncate">Get Down</span>
            <span className="text-[10px] opacity-80 font-mono font-normal">
              {stats.totalVotes > 0 ? `${stats.downPercent}%` : ''}
            </span>
          </button>
        </div>

        {/* Low-brightness progress bar */}
        {stats.totalVotes > 0 && (
          <div className="w-full flex h-1 rounded-full overflow-hidden bg-black/40 border border-white/10 backdrop-blur-xs">
            <div
              className="bg-emerald-500/70 transition-all duration-300"
              style={{ width: `${stats.viralPercent}%` }}
            />
            <div
              className="bg-rose-500/70 transition-all duration-300"
              style={{ width: `${stats.downPercent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEED POST VARIANT — Responsive card layout with subtle progress bars
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      className={cn(
        "w-full pt-2.5 pb-1 flex flex-col gap-2.5 border-t border-zinc-100 dark:border-zinc-800/60 select-none",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Action Buttons Row */}
      <div className="flex items-center gap-2.5 w-full">
        {/* 🟢 Make this Viral */}
        <button
          onClick={() => handleVote('VIRAL')}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs sm:text-[13px] transition-all duration-200 active:scale-98 shadow-sm focus:outline-none",
            stats.userVote === 'VIRAL'
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 ring-1 ring-emerald-500"
              : "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40"
          )}
        >
          {isLoading && activeVoteTarget === 'VIRAL' ? (
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-300" />
          ) : stats.userVote === 'VIRAL' ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <Flame className="w-4 h-4 text-emerald-600 dark:text-emerald-400 fill-emerald-500/30" />
          )}
          <span>Make this Viral</span>
        </button>

        {/* 🔴 Get it Down */}
        <button
          onClick={() => handleVote('GET_IT_DOWN')}
          disabled={isLoading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-medium text-xs sm:text-[13px] transition-all duration-200 active:scale-98 shadow-sm focus:outline-none",
            stats.userVote === 'GET_IT_DOWN'
              ? "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 ring-1 ring-rose-500"
              : "bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40"
          )}
        >
          {isLoading && activeVoteTarget === 'GET_IT_DOWN' ? (
            <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-300" />
          ) : stats.userVote === 'GET_IT_DOWN' ? (
            <Check className="w-4 h-4 stroke-[2.5]" />
          ) : (
            <ArrowDownCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
          <span>Get it Down</span>
        </button>
      </div>

      {/* Progress Bars & Percentages */}
      <div className="flex flex-col gap-1.5 px-0.5">
        {/* Row 1: Viral Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Make this Viral</span>
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
              {stats.totalVotes > 0 ? `${stats.viralPercent}%` : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.totalVotes > 0 ? stats.viralPercent : 0}%` }}
            />
          </div>
        </div>

        {/* Row 2: Down Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Get it Down</span>
            </span>
            <span className="font-mono text-zinc-700 dark:text-zinc-300 font-semibold">
              {stats.totalVotes > 0 ? `${stats.downPercent}%` : '0%'}
            </span>
          </div>
          <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800/70 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${stats.totalVotes > 0 ? stats.downPercent : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
