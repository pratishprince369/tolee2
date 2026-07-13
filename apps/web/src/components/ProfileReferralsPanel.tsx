"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, MousePointerClick, Download, CheckCircle, Clock, 
  Wallet, Share2, Copy, Check, Send, ExternalLink
} from 'lucide-react';
import { getUserWallet } from '@/actions/ads';

interface Props {
  userId: string;
  username: string | null;
}

export function ProfileReferralsPanel({ userId, username }: Props) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    clicks: 0,
    installs: 0,
    signups: 0,
    approved: 0,
    pending: 0,
    earnings: 0,
    balance: 2500
  });
  const [referralLink, setReferralLink] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    getUserWallet().then((res) => {
      if (res.success && res.referralStats) {
        setStats(res.referralStats);
        setReferralLink(res.referralLink || '');
        setReferralCode(res.referralCode || userId);
      } else {
        // Fallback fallback values
        const code = username || userId;
        setReferralLink(`${window.location.origin}/ref/${code}`);
        setReferralCode(code);
      }
      setLoading(false);
    });
  }, [userId, username]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const shareText = `Join me on Tolee – India's Community Social Network. Use my referral link to join and become part of amazing local communities.\nDownload Now: ${referralLink}`;

  const shareLinks = {
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    instagram: `https://www.instagram.com/` // Instagram doesn't support pre-filled links, fallback to site
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Clock className="w-8 h-8 text-zinc-300 animate-spin" />
        <p className="text-xs text-zinc-400 mt-3 font-semibold">Loading referral stats...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 p-4 max-w-2xl mx-auto space-y-6">
      
      {/* ─── HEADER BANNER ─── */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-500/10 p-6 relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            👥 Program active
          </span>
          <h3 className="text-xl font-black text-slate-800 dark:text-white">Invite Friends & Earn ₹500</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-md">
            Share your unique link or invite code. When they register on Tolee, they receive a ₹2,500 welcome credit and you instantly get ₹500 in your Ads Wallet.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
          <Users className="w-36 h-36 text-indigo-500" />
        </div>
      </div>

      {/* ─── STATS DASHBOARD GRID ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Clicks', value: stats.clicks, icon: <MousePointerClick className="w-4 h-4 text-blue-500" />, bg: 'bg-blue-50/50 dark:bg-blue-950/10' },
          { label: 'App Installs', value: stats.installs, icon: <Download className="w-4 h-4 text-purple-500" />, bg: 'bg-purple-50/50 dark:bg-purple-950/10' },
          { label: 'Successful Signups', value: stats.signups, icon: <CheckCircle className="w-4 h-4 text-emerald-500" />, bg: 'bg-emerald-50/50 dark:bg-emerald-950/10' },
          { label: 'Approved Referrals', value: stats.approved, icon: <CheckCircle className="w-4 h-4 text-green-650" />, bg: 'bg-green-50/50 dark:bg-green-950/10' },
          { label: 'Pending Referrals', value: stats.pending, icon: <Clock className="w-4 h-4 text-amber-500" />, bg: 'bg-amber-50/50 dark:bg-amber-950/10' },
          { label: 'Total Earned', value: `₹${stats.earnings}`, icon: <Wallet className="w-4 h-4 text-indigo-500" />, bg: 'bg-indigo-50/50 dark:bg-indigo-950/10' },
        ].map((item, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 ${item.bg} flex flex-col justify-between`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{item.label}</span>
              {item.icon}
            </div>
            <p className="text-xl font-black text-zinc-800 dark:text-zinc-100 mt-2">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ─── SHARING ACTIONS ─── */}
      <div className="space-y-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm">
        
        {/* Referral Link */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Your Referral Link</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralLink} 
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-medium text-zinc-650 dark:text-zinc-350 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Invite Code */}
        <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Invite Code</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={referralCode} 
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-650 dark:text-zinc-350 select-all focus:outline-none"
            />
            <button
              onClick={handleCopyCode}
              className="px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none shrink-0"
            >
              {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Social Share Buttons */}
        <div className="space-y-2.5 pt-4 border-t border-zinc-100 dark:border-zinc-800/60">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Share Referral Code</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            
            <a 
              href={shareLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 text-emerald-600 transition-colors"
            >
              <Send className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black">WhatsApp</span>
            </a>

            <a 
              href={shareLinks.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 hover:bg-sky-50/20 dark:hover:bg-sky-950/10 text-sky-500 transition-colors"
            >
              <Send className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black">Telegram</span>
            </a>

            <a 
              href={shareLinks.twitter}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 text-zinc-850 dark:text-zinc-200 transition-colors"
            >
              <Share2 className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black">X (Twitter)</span>
            </a>

            <a 
              href={shareLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 text-blue-600 transition-colors"
            >
              <Share2 className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black">Facebook</span>
            </a>

            <a 
              href={shareLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/80 hover:bg-pink-50/20 dark:hover:bg-pink-950/10 text-pink-500 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mb-1" />
              <span className="text-[10px] font-black">Instagram</span>
            </a>

          </div>
        </div>

      </div>

    </div>
  );
}
