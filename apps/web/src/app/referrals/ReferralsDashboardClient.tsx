"use client";

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Users, Wallet, Share2, Copy, Check, TrendingUp, 
  ArrowUpRight, AlertCircle, Clock, CheckCircle2, 
  XCircle, RefreshCw, Sparkles, ShieldCheck, ChevronRight
} from 'lucide-react';
import { getReferralDashboardAction } from '@/actions/referral';
import Link from 'next/link';

export function ReferralsDashboardClient() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'members'>('ledger');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login?callbackUrl=/referrals');
      return;
    }
    if (authStatus === 'authenticated') {
      loadData();
    }
  }, [authStatus]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getReferralDashboardAction();
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load referral earnings.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected network error.');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = data?.referralLink || '';
  const referralCode = data?.referralCode || '';

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    const shareMessage = `Join me on Tolee – India's Community Social Network. Use my referral link to join and grow with your local communities:\n${referralLink}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Tolee',
          text: shareMessage,
          url: referralLink,
        });
      } catch (_) {}
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black py-16 px-4 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-zinc-500">Loading referral earnings dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black py-16 px-4 max-w-2xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-6 rounded-3xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold">Error loading referral dashboard</h4>
            <p className="text-xs mt-1">{error}</p>
            <button
              onClick={loadData}
              className="mt-3 px-4 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalReferredUsers: 0,
    activeReferredAdvertisers: 0,
    totalEligibleSpend: 0,
    pendingEarnings: 0,
    confirmedEarnings: 0,
    paidEarnings: 0,
    reversedEarnings: 0,
    totalEarnings: 0,
  };

  const commissions = data?.commissions || [];
  const referredUsersList = data?.referredUsersList || [];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#070708] py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ─── BREADCRUMB / TOP BAR ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Referral Earnings</span>
              <span className="px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20">
                10% Sharing
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Earn 10% on every rupee spent on eligible ads by users who joined through your referral link.
            </p>
          </div>
          <button
            onClick={loadData}
            title="Refresh"
            className="p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* ─── HERO PROMO CARD: GET 10% SHARING ─── */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-white/15 backdrop-blur-md text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>🎉 Get 10% Sharing Program</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              Earn 10% Sharing On Every Eligible Ad Spend
            </h2>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              When users who joined through your referral link run eligible advertisements on Tolee, 10% of their qualifying ad spend is automatically credited to you.
            </p>

            {/* Referral Link Box */}
            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider block">
                Your Unique Referral Link
              </label>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  className="flex-1 bg-black/25 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-xs sm:text-sm font-semibold text-white select-all focus:outline-none"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none px-4 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 shadow-md transition active:scale-95"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="flex-1 sm:flex-none px-4 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-2xl text-xs font-black flex items-center justify-center gap-1.5 border border-white/20 transition active:scale-95"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1 text-xs text-indigo-200">
                <span>Referral Code:</span>
                <span className="font-mono font-black text-white bg-black/30 px-2 py-0.5 rounded-lg border border-white/10">
                  {referralCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="underline hover:text-white transition text-[11px]"
                >
                  {copiedCode ? 'Copied!' : 'Copy code'}
                </button>
              </div>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-10 pointer-events-none flex items-center justify-end pr-6">
            <Users className="w-72 h-72 text-white" />
          </div>
        </div>

        {/* ─── STATS DASHBOARD GRID ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Referrals</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
              {metrics.totalReferredUsers}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Users joined via link</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Advertisers</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
              {metrics.activeReferredAdvertisers}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Ran eligible campaigns</p>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Eligible Ad Spend</span>
              <Wallet className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
              ₹{metrics.totalEligibleSpend.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Total spend base</p>
          </div>

          <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border border-emerald-500/20 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
              <span className="text-[11px] font-bold uppercase tracking-wider">Confirmed 10%</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
              ₹{metrics.confirmedEarnings.toLocaleString('en-IN')}
            </p>
            <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">Earned to wallet</p>
          </div>
        </div>

        {/* ─── SECONDARY METRICS ROW ─── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Pending</span>
            <p className="text-lg font-black text-slate-800 dark:text-zinc-200 mt-1">
              ₹{metrics.pendingEarnings.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Paid / Withdrawn</span>
            <p className="text-lg font-black text-slate-800 dark:text-zinc-200 mt-1">
              ₹{metrics.paidEarnings.toLocaleString('en-IN')}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800/70 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Reversed</span>
            <p className="text-lg font-black text-slate-800 dark:text-zinc-200 mt-1">
              ₹{metrics.reversedEarnings.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'ledger'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Commission Ledger ({commissions.length})
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'members'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-black'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            Referred Users ({referredUsersList.length})
          </button>
        </div>

        {/* ─── TAB CONTENT 1: COMMISSION LEDGER ─── */}
        {activeTab === 'ledger' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm">
            {commissions.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  No Commissions Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  When users who joined through your referral link run eligible advertisements, your 10% earnings will be recorded here automatically.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Referral Link</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-zinc-400 uppercase tracking-wider font-extrabold border-b border-zinc-100 dark:border-zinc-800">
                    <tr>
                      <th className="px-5 py-3.5">Date</th>
                      <th className="px-5 py-3.5">Advertiser</th>
                      <th className="px-5 py-3.5">Campaign</th>
                      <th className="px-5 py-3.5">Eligible Spend</th>
                      <th className="px-5 py-3.5">Rate</th>
                      <th className="px-5 py-3.5">10% Earning</th>
                      <th className="px-5 py-3.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium text-slate-800 dark:text-zinc-200">
                    {commissions.map((item: any) => (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition">
                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-500 dark:text-zinc-400">
                          {new Date(item.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold">
                          {item.advertiserName}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 dark:text-zinc-400">
                          {item.campaignName}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-bold">
                          ₹{item.eligibleSpend.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-zinc-500">
                          {(item.commissionRate * 100).toFixed(0)}%
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap font-black text-emerald-600 dark:text-emerald-400 text-sm">
                          +₹{item.commissionAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                              item.status === 'CONFIRMED'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : item.status === 'PENDING'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                : item.status === 'PAID'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB CONTENT 2: REFERRED MEMBERS ─── */}
        {activeTab === 'members' && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-3xl overflow-hidden shadow-sm">
            {referredUsersList.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Users className="w-10 h-10 text-zinc-400 mx-auto" />
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                  No Referred Members Yet
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                  Share your link with creators, friends, and businesses to start building your network.
                </p>
                <button
                  onClick={handleCopyLink}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Referral Link</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {referredUsersList.map((user: any) => (
                  <div key={user.id} className="p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black flex items-center justify-center text-sm">
                        {(user.name || user.username || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {user.name || user.username || 'Tolee User'}
                        </h4>
                        <p className="text-xs text-zinc-400">
                          {user.username ? `@${user.username}` : 'Joined Member'} • Joined{' '}
                          {new Date(user.joinedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Attributed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
