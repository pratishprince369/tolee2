'use client';

import React, { useState, useEffect } from 'react';
import { votePostDistributionAction } from '@/actions/viralControl';
import { ArrowDownCircle, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSession } from 'next-auth/react';

export interface ViralControlButtonsProps {
  postId: string;
  initialStats?: {
    viral_count?: number;
    get_it_down_count?: number;
    total_vote_count?: number;
    total_eligible_users?: number;
    viral_percentage?: number;
    get_it_down_percentage?: number;
    total_participation_percentage?: number;
    all_users_participated?: boolean;
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
    viralCount: initialStats?.viral_count ?? 0,
    downCount: initialStats?.get_it_down_count ?? 0,
    totalVotes: initialStats?.total_vote_count ?? 0,
    totalEligibleUsers: initialStats?.total_eligible_users ?? 1,
    viralPercent: initialStats?.viral_percentage ?? 0,
    downPercent: initialStats?.get_it_down_percentage ?? 0,
    allUsersParticipated: initialStats?.all_users_participated ?? false,
    userVote: initialStats?.current_user_vote ?? null,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [activeVoteTarget, setActiveVoteTarget] = useState<'VIRAL' | 'GET_IT_DOWN' | null>(null);

  // Sync state whenever props update
  useEffect(() => {
    if (initialStats) {
      setStats({
        viralCount: initialStats.viral_count ?? 0,
        downCount: initialStats.get_it_down_count ?? 0,
        totalVotes: initialStats.total_vote_count ?? 0,
        totalEligibleUsers: initialStats.total_eligible_users ?? 1,
        viralPercent: initialStats.viral_percentage ?? 0,
        downPercent: initialStats.get_it_down_percentage ?? 0,
        allUsersParticipated: initialStats.all_users_participated ?? false,
        userVote: initialStats.current_user_vote ?? null,
      });
    }
  }, [
    initialStats?.viral_count,
    initialStats?.get_it_down_count,
    initialStats?.viral_percentage,
    initialStats?.get_it_down_percentage,
    initialStats?.current_user_vote,
    initialStats?.total_eligible_users,
  ]);

  // Client-side fallback fetch if initial percentages were missing
  useEffect(() => {
    if (initialStats?.viral_percentage === undefined && postId) {
      fetch(`/api/posts/${postId}/distribution-stats`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.stats) {
            setStats({
              viralCount: data.stats.viral_count ?? 0,
              downCount: data.stats.get_it_down_count ?? 0,
              totalVotes: data.stats.total_vote_count ?? 0,
              totalEligibleUsers: data.stats.total_eligible_users ?? 1,
              viralPercent: data.stats.viral_percentage ?? 0,
              downPercent: data.stats.get_it_down_percentage ?? 0,
              allUsersParticipated: data.stats.all_users_participated ?? false,
              userVote: data.stats.current_user_vote ?? null,
            });
          }
        })
        .catch(() => {});
    }
  }, [postId, initialStats?.viral_percentage]);

  const handleVote = async (voteType: 'VIRAL' | 'GET_IT_DOWN') => {
    if (!isAuthenticated) {
      alert('Please log in to vote on content distribution.');
      return;
    }

    // Optimistic calculation against global eligible users (N)
    const prevStats = { ...stats };
    const N = Math.max(1, stats.totalEligibleUsers);
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

    // Make this Viral % = (ViralVotes / N) * 100
    let newViralPercent = 0;
    if (newViralCount > 0) {
      newViralPercent = Math.round((newViralCount / N) * 100);
      if (newViralPercent === 100 && newViralCount < N) newViralPercent = 99;
      if (newViralCount >= N) newViralPercent = 100;
    }

    // Get it Down % = (DownVotes / N) * 100
    let newDownPercent = 0;
    if (newDownCount > 0) {
      newDownPercent = Math.round((newDownCount / N) * 100);
      if (newDownPercent === 100 && newDownCount < N) newDownPercent = 99;
      if (newDownCount >= N) newDownPercent = 100;
    }

    const allUsersParticipated = newTotal >= N;

    setStats({
      viralCount: newViralCount,
      downCount: newDownCount,
      totalVotes: newTotal,
      totalEligibleUsers: N,
      viralPercent: newViralPercent,
      downPercent: newDownPercent,
      allUsersParticipated,
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
          totalEligibleUsers: res.stats.total_eligible_users ?? N,
          viralPercent: res.stats.viral_percentage,
          downPercent: res.stats.get_it_down_percentage,
          allUsersParticipated: res.stats.all_users_participated,
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

  const safeViralPercent = Number.isFinite(stats.viralPercent) ? stats.viralPercent : 0;
  const safeDownPercent = Number.isFinite(stats.downPercent) ? stats.downPercent : 0;
  const isViralFilled = safeViralPercent >= 35 || stats.userVote === 'VIRAL';
  const isDownFilled = safeDownPercent >= 35 || stats.userVote === 'GET_IT_DOWN';

  // ═══════════════════════════════════════════════════════════════════════
  // REELS VARIANT — Compact side-by-side with full text & watermark percentage
  // ═══════════════════════════════════════════════════════════════════════
  if (variant === 'reel') {
    return (
      <div
        className={cn(
          "w-full max-w-[320px] flex items-center gap-1.5 sm:gap-2 pointer-events-auto select-none my-1",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 🟢 Make this Viral */}
        <button
          type="button"
          onClick={() => handleVote('VIRAL')}
          disabled={isLoading}
          className={cn(
            "relative overflow-hidden flex-1 flex items-center justify-center h-8 px-2 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm border select-none cursor-pointer",
            isViralFilled
              ? "border-emerald-500 bg-emerald-600/30 text-white"
              : "border-emerald-500/30 bg-black/50 text-emerald-300 hover:text-white"
          )}
          title={`Make this Viral: ${safeViralPercent}% of all Tolee users`}
        >
          {/* In-button progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-emerald-600/70 transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, safeViralPercent))}%` }}
          />

          {/* Low opacity percentage watermark behind text */}
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center font-mono font-black text-sm tracking-tight opacity-20 pointer-events-none select-none z-0"
          >
            {safeViralPercent}%
          </span>

          {/* Foreground Icon & Full Text */}
          <div className="relative z-10 flex items-center justify-center gap-1 min-w-0 whitespace-nowrap">
            {isLoading && activeVoteTarget === 'VIRAL' ? (
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            ) : (
              <Check className="w-3 h-3 stroke-[3] shrink-0" />
            )}
            <span className="whitespace-nowrap tracking-tight">Make this Viral</span>
          </div>
        </button>

        {/* 🔴 Get it Down */}
        <button
          type="button"
          onClick={() => handleVote('GET_IT_DOWN')}
          disabled={isLoading}
          className={cn(
            "relative overflow-hidden flex-1 flex items-center justify-center h-8 px-2 rounded-full text-[11px] font-bold transition-all duration-200 active:scale-95 shadow-sm border select-none cursor-pointer",
            isDownFilled
              ? "border-rose-500 bg-rose-600/30 text-white"
              : "border-rose-500/30 bg-black/50 text-rose-300 hover:text-white"
          )}
          title={`Get it Down: ${safeDownPercent}% of all Tolee users`}
        >
          {/* In-button progress fill */}
          <div
            className="absolute inset-y-0 left-0 bg-rose-600/70 transition-all duration-300 ease-out z-0 pointer-events-none"
            style={{ width: `${Math.min(100, Math.max(0, safeDownPercent))}%` }}
          />

          {/* Low opacity percentage watermark behind text */}
          <span
            aria-hidden="true"
            className="absolute inset-0 flex items-center justify-center font-mono font-black text-sm tracking-tight opacity-20 pointer-events-none select-none z-0"
          >
            {safeDownPercent}%
          </span>

          {/* Foreground Icon & Full Text */}
          <div className="relative z-10 flex items-center justify-center gap-1 min-w-0 whitespace-nowrap">
            {isLoading && activeVoteTarget === 'GET_IT_DOWN' ? (
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
            ) : (
              <ArrowDownCircle className="w-3 h-3 stroke-[2.5] shrink-0" />
            )}
            <span className="whitespace-nowrap tracking-tight">Get it Down</span>
          </div>
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FEED POST VARIANT
  // Full text display without truncation with low opacity percentage behind text
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      className={cn(
        "w-full pt-3 pb-1 flex items-center gap-2 sm:gap-3 select-none",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 🟢 Make this Viral Button */}
      <button
        type="button"
        onClick={() => handleVote('VIRAL')}
        disabled={isLoading}
        className={cn(
          "relative overflow-hidden flex-1 flex items-center justify-center h-10 sm:h-11 px-2.5 sm:px-3 rounded-full text-[11.5px] xs:text-xs sm:text-[13px] font-bold transition-all duration-200 active:scale-98 select-none border cursor-pointer",
          isViralFilled
            ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
            : "border-[#A7F3D0] dark:border-emerald-800/80 bg-[#E8F8F0] dark:bg-emerald-950/20 text-[#065F46] dark:text-emerald-300 hover:bg-[#DCFCE7]"
        )}
        title={`Make this Viral — ${safeViralPercent}% of all eligible Tolee users`}
      >
        {/* Dynamic In-Button Progress Layer */}
        <div
          className="absolute inset-y-0 left-0 bg-[#059669] dark:bg-emerald-600 transition-all duration-300 ease-out z-0 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, safeViralPercent))}%` }}
        />

        {/* Low opacity percentage watermark behind text */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-mono font-black text-base sm:text-lg tracking-tight opacity-20 pointer-events-none select-none z-0"
        >
          {safeViralPercent}%
        </span>

        {/* Foreground Content: Check icon + Full Text (No truncation) */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 min-w-0 whitespace-nowrap">
          {isLoading && activeVoteTarget === 'VIRAL' ? (
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
          ) : (
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3] shrink-0" />
          )}
          <span className="whitespace-nowrap tracking-tight">Make this Viral</span>
        </div>
      </button>

      {/* 🔴 Get it Down Button */}
      <button
        type="button"
        onClick={() => handleVote('GET_IT_DOWN')}
        disabled={isLoading}
        className={cn(
          "relative overflow-hidden flex-1 flex items-center justify-center h-10 sm:h-11 px-2.5 sm:px-3 rounded-full text-[11.5px] xs:text-xs sm:text-[13px] font-bold transition-all duration-200 active:scale-98 select-none border cursor-pointer",
          isDownFilled
            ? "border-rose-600 bg-rose-600 text-white shadow-xs"
            : "border-[#FECACA] dark:border-rose-900/60 bg-[#FEECEC] dark:bg-rose-950/20 text-[#DC2626] dark:text-rose-300 hover:bg-[#FEE2E2]"
        )}
        title={`Get it Down — ${safeDownPercent}% of all eligible Tolee users`}
      >
        {/* Dynamic In-Button Progress Layer */}
        <div
          className="absolute inset-y-0 left-0 bg-[#E11D48] dark:bg-rose-600 transition-all duration-300 ease-out z-0 pointer-events-none"
          style={{ width: `${Math.min(100, Math.max(0, safeDownPercent))}%` }}
        />

        {/* Low opacity percentage watermark behind text */}
        <span
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center font-mono font-black text-base sm:text-lg tracking-tight opacity-20 pointer-events-none select-none z-0"
        >
          {safeDownPercent}%
        </span>

        {/* Foreground Content: Down Circle icon + Full Text (No truncation) */}
        <div className="relative z-10 flex items-center justify-center gap-1.5 min-w-0 whitespace-nowrap">
          {isLoading && activeVoteTarget === 'GET_IT_DOWN' ? (
            <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin shrink-0" />
          ) : (
            <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5] shrink-0" />
          )}
          <span className="whitespace-nowrap tracking-tight">Get it Down</span>
        </div>
      </button>
    </div>
  );
}
