'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Crown, Star, TrendingUp, Users, Wallet, Share2, Copy, CheckCircle2,
  Rocket, Award, Zap, ArrowRight, Loader2, Shield, Gift, RefreshCw
} from 'lucide-react';

const TIER_CONFIG: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  creator: { emoji: '🌱', color: '#22c55e', bg: '#052e16', label: 'Creator' },
  influencer: { emoji: '⭐', color: '#3b82f6', bg: '#172554', label: 'Influencer' },
  vip_creator: { emoji: '💎', color: '#a855f7', bg: '#3b0764', label: 'VIP Creator' },
  verified_creator: { emoji: '✅', color: '#06b6d4', bg: '#083344', label: 'Verified Creator' },
  premium_partner: { emoji: '👑', color: '#f59e0b', bg: '#451a03', label: 'Premium Partner' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '⏳ Under Review', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  approved: { label: '✅ Approved', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  rejected: { label: '❌ Not Approved', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function CreatorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin?callbackUrl=/creator-dashboard');
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [appRes, walletRes] = await Promise.all([
        fetch('/api/creator/apply'),
        fetch('/api/ads-manager/wallet').catch(() => null)
      ]);
      const appData = await appRes.json();
      if (appData.application) setApplication(appData.application);

      if (walletRes?.ok) {
        const wData = await walletRes.json();
        setWalletBalance(wData.balance ?? null);
        setReferralCount(wData.referralCount ?? 0);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const copyReferral = () => {
    const link = `https://tolee.in?ref=${(session?.user as any)?.username || (session?.user as any)?.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-[#020209] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  // Not applied yet
  if (!application) {
    return (
      <div className="min-h-screen bg-[#020209] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🎭</div>
          <h1 className="text-3xl font-black text-white mb-3">Creator Dashboard</h1>
          <p className="text-gray-400 mb-8">You haven't applied to the Creator Program yet. Apply now to unlock your creator benefits!</p>
          <Link href="/creator-program" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
            <Rocket className="w-4 h-4" /> Apply Now
          </Link>
        </div>
      </div>
    );
  }

  const tier = TIER_CONFIG[application.creatorTier || 'creator'];
  const statusCfg = STATUS_CONFIG[application.status] || STATUS_CONFIG.pending;
  const isApproved = application.status === 'approved';
  const referralLink = `https://tolee.in?ref=${(session?.user as any)?.username || (session?.user as any)?.id}`;
  const referralEarned = referralCount * 5;

  return (
    <div className="min-h-screen bg-[#020209] py-8 px-4">
      <style>{`
        @keyframes shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .shimmer-text {
          background: linear-gradient(90deg,#a855f7,#3b82f6,#06b6d4,#22c55e,#f59e0b,#a855f7);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
          animation: shimmer 3s linear infinite;
        }
        .card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 20px; }
        .stat-card:hover { transform: translateY(-2px); border-color: rgba(168,85,247,0.2); }
        .stat-card { transition: all 0.2s; }
      `}</style>

      <div className="max-w-4xl mx-auto" style={{ animation: 'fadeUp 0.5s ease forwards' }}>

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-black text-white">Creator Dashboard</h1>
              {isApproved && tier && (
                <span className="text-xs font-black px-3 py-1 rounded-full" style={{ background: tier.bg, color: tier.color }}>
                  {tier.emoji} {tier.label}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-sm">Welcome back, <strong className="text-gray-300">{application.fullName}</strong> 👋</p>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchData} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-gray-400 card hover:text-white transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </button>
            <Link href="/creator-program" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }}>
              <Rocket className="w-3.5 h-3.5" /> Creator Page
            </Link>
          </div>
        </div>

        {/* Status Banner */}
        <div className="rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
          <div>
            <p className="font-black text-white text-lg">{statusCfg.label}</p>
            {application.status === 'pending' && <p className="text-sm text-gray-400 mt-0.5">Your application is under review. We'll notify you within 24-48 hours.</p>}
            {application.status === 'approved' && <p className="text-sm text-gray-400 mt-0.5">Congratulations! You are an approved Creator on Tolee. Start growing!</p>}
            {application.status === 'rejected' && <p className="text-sm text-gray-400 mt-0.5">{application.adminNotes || 'Your application was not approved at this time.'}</p>}
          </div>
          {application.status === 'approved' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>
              <Shield className="w-4 h-4" /> Verified Creator
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '💰', label: 'Ads Wallet', value: walletBalance !== null ? `₹${walletBalance.toLocaleString()}` : '₹—', color: '#22c55e' },
            { icon: '🔗', label: 'Referrals', value: referralCount.toLocaleString(), color: '#3b82f6' },
            { icon: '💸', label: 'Referral Earned', value: `₹${referralEarned.toLocaleString()}`, color: '#a855f7' },
            { icon: '📈', label: 'Followers Range', value: application.followersRange || '—', color: '#f59e0b' },
          ].map((s, i) => (
            <div key={i} className="stat-card card p-5 text-center">
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="font-black text-xl mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Referral Link Card */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-4 h-4 text-purple-400" />
              <h3 className="font-black text-white">Your Referral Link</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">Share this link. Earn ₹5 for every person who joins!</p>
            <div className="flex items-center gap-2 p-3 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-xs text-gray-300 flex-1 truncate">{referralLink}</span>
              <button onClick={copyReferral} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{ background: copied ? 'rgba(34,197,94,0.2)' : 'rgba(168,85,247,0.2)', color: copied ? '#22c55e' : '#d8b4fe' }}>
                {copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[['🔗', 'Total Refs', referralCount], ['💸', 'Earned', `₹${referralEarned}`], ['⚡', 'Rate', '₹5/join']].map(([icon, label, val]) => (
                <div key={label as string} className="p-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div className="text-lg">{icon}</div>
                  <div className="text-xs font-black text-white">{val}</div>
                  <div className="text-[10px] text-gray-600">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Creator Benefits Unlocked */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="w-4 h-4 text-yellow-400" />
              <h3 className="font-black text-white">Benefits Status</h3>
            </div>
            <div className="space-y-3">
              {[
                { label: '🏆 VIP Golden Card', unlocked: isApproved },
                { label: '✅ Verified Badge', unlocked: isApproved },
                { label: '💰 ₹20K Wallet Credit', unlocked: isApproved && application.walletCreditGiven },
                { label: '🎉 VIP Event Access', unlocked: isApproved },
                { label: '🔥 Viral Boost', unlocked: isApproved },
                { label: '🎁 Gifts & Promos', unlocked: application.creatorTier === 'vip_creator' || application.creatorTier === 'premium_partner' },
              ].map(({ label, unlocked }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: unlocked ? '#d1d5db' : '#6b7280' }}>{label}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{
                    background: unlocked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
                    color: unlocked ? '#22c55e' : '#6b7280'
                  }}>
                    {unlocked ? '✓ Active' : '🔒 Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Application Details */}
        <div className="card p-6 mb-6">
          <h3 className="font-black text-white mb-4">📋 Your Application Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
            {[
              { label: 'Niche', val: application.niche },
              { label: 'Followers', val: application.followersRange },
              { label: 'Monthly Reach', val: application.monthlyReach || '—' },
              { label: 'Avg Reel Views', val: application.avgReelViews || '—' },
              { label: 'Content Type', val: application.contentType || '—' },
              { label: 'City', val: `${application.city}, ${application.country}` },
              { label: 'Instagram', val: application.instagramLink || '—' },
              { label: 'YouTube', val: application.youtubeLink || '—' },
              { label: 'Applied On', val: new Date(application.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-start gap-3 text-sm py-2 border-b border-white/5">
                <span className="text-gray-500 w-32 flex-shrink-0">{label}</span>
                <span className="text-gray-200 truncate">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Viral Boost Section */}
        {isApproved && (
          <div className="card p-6 relative overflow-hidden" style={{ border: '1px solid rgba(168,85,247,0.2)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 0% 50%, rgba(168,85,247,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-purple-400" />
                <h3 className="font-black text-white">📈 Viral Boost Status</h3>
              </div>
              <p className="text-gray-500 text-sm mb-4">Your content is eligible for Tolee's AI viral push across India. Post consistently to maximize reach!</p>
              <div className="grid grid-cols-3 gap-3">
                {[['🎬', 'Posts Boosted', '—'], ['👁️', 'Total Impressions', '—'], ['📍', 'Reach', 'India-wide']].map(([icon, label, val]) => (
                  <div key={label as string} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <div className="text-2xl mb-1">{icon}</div>
                    <div className="text-sm font-black text-white">{val}</div>
                    <div className="text-xs text-gray-600">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Go to Ads Manager */}
        <div className="mt-5 flex justify-center">
          <Link href="/ads-manager" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-gray-300 card hover:text-white transition-colors">
            <Wallet className="w-4 h-4" /> Open Ads Manager <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
