'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Eye, Heart, MessageCircle, Send, Bookmark, 
  Rocket, TrendingUp, Sparkles, Calendar, ExternalLink, 
  CheckCircle2, MousePointerClick, ShieldCheck, Loader2 
} from 'lucide-react';
import { getPostInsightsAction } from '@/actions/post';
import Link from 'next/link';

interface PostInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: string;
  onOpenBoost?: () => void;
}

export function PostInsightsModal({
  isOpen,
  onClose,
  postId,
  onOpenBoost
}: PostInsightsModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && postId) {
      setLoading(true);
      setError('');
      getPostInsightsAction(postId)
        .then((res) => {
          if (res.success && res.insights) {
            setData(res.insights);
          } else {
            setError(res.error || 'Failed to fetch insights');
          }
        })
        .catch((err) => {
          console.error(err);
          setError('Failed to fetch insights');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, postId]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">Post insights</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-xs font-semibold">Loading real-time post insights...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-500 text-sm">{error}</div>
          ) : data ? (
            <>
              {/* 6-Month Free Boosting Offer Banner */}
              {data.freeBoost?.isEligible && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-500/20 dark:border-teal-500/20 flex items-start gap-3">
                  <div className="p-1.5 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">
                      6 Months Free Boost Active
                    </p>
                    <p className="text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                      You have <span className="font-bold">{data.freeBoost.daysRemaining} days</span> remaining of zero-charge boosting for all your posts!
                    </p>
                  </div>
                </div>
              )}

              {/* High Level Overview */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Overview
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span>Accounts reached</span>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 dark:text-white">
                      {(data.reach || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Interactions</span>
                    </div>
                    <div className="text-2xl font-black text-zinc-900 dark:text-white">
                      {(data.interactions?.total || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Content Interactions Breakdown */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Interactions Breakdown
                </h4>
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 px-4">
                  <div className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span>Likes</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {(data.interactions?.likes || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                      <MessageCircle className="w-4 h-4 text-blue-500" />
                      <span>Comments</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {(data.interactions?.comments || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                      <Send className="w-4 h-4 text-emerald-500" />
                      <span>Shares / Reposts</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {(data.interactions?.shares || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-3 text-sm">
                    <div className="flex items-center gap-2.5 text-zinc-700 dark:text-zinc-300">
                      <Bookmark className="w-4 h-4 text-amber-500" />
                      <span>Saves</span>
                    </div>
                    <span className="font-bold text-zinc-900 dark:text-white">
                      {(data.interactions?.saves || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Boost Campaign Analytics */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                  Ad Performance & Boost Metrics
                </h4>

                {data.boostMetrics ? (
                  <div className="p-4 rounded-2xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Rocket className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-bold text-zinc-900 dark:text-white">
                          Campaign Status
                        </span>
                      </div>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        data.boostMetrics.status === 'approved' || data.boostMetrics.status === 'running'
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}>
                        {data.boostMetrics.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[11px] text-zinc-400 block mb-1">Ad Impressions</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">
                          {(data.boostMetrics.impressions || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/80 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[11px] text-zinc-400 block mb-1">Link / Action Clicks</span>
                        <span className="text-xl font-black text-zinc-900 dark:text-white">
                          {(data.boostMetrics.clicks || 0).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs text-zinc-500">
                      <span>Total Cost: <strong className="text-emerald-600 dark:text-emerald-400">₹0 (Free Boost)</strong></span>
                      <Link 
                        href="/ads-manager"
                        onClick={onClose}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Ads Manager <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center space-y-3">
                    <p className="text-xs text-zinc-500">
                      This post has not been boosted yet.
                    </p>
                    {onOpenBoost && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenBoost();
                        }}
                        className="w-full py-2.5 rounded-xl bg-[#0095f6] hover:bg-[#1877f2] text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                      >
                        Boost this post now (Free 🚀)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
