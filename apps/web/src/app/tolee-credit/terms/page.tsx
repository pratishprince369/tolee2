import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowLeft, Sparkles, Percent, Users, Wallet, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tolee Credit – Community Revenue Sharing Terms & Scheme | Tolee',
  description: 'Understand the Tolee Credit 20% community revenue-sharing scheme, placement & first-origin attribution rules, settlement cycles, and creator payout guidelines.',
};

export default function ToleeCreditTermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070b13] text-zinc-900 dark:text-zinc-100 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3.5 bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#141e33] shadow-xs">
        <div className="flex items-center gap-3 max-w-4xl mx-auto w-full">
          <Link
            href="/tolee-credit"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-[#141e33] hover:bg-zinc-200 dark:hover:bg-[#1f2d4a] text-zinc-700 dark:text-gray-200 transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="Back to Tolee Credit"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-teal-500" />
            <h1 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">
              Tolee Credit Revenue Sharing Terms & Scheme
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Intro Hero */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-teal-500/15 via-emerald-500/10 to-transparent border border-teal-500/20 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 text-xs font-black uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Community Monetization Policy</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
            Tolee Credit Community Monetization & Revenue Sharing Scheme
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Tolee allows community leaders, group creators, and admins to monetize their organic community reach.
            By creating a Tolee group and connecting Tolee Credit, you agree to the transparent revenue-sharing terms outlined below.
          </p>
        </div>

        {/* 1. The 20% Revenue Sharing Scheme */}
        <section className="p-6 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              1. 20% Revenue Share Model
            </h3>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            When verified advertising campaigns, sponsored promotions, or boost activities run on Tolee, a defined <strong>20% revenue share</strong> is automatically calculated and attributed to eligible group founders’ Tolee Credit Wallets.
          </p>
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] text-xs space-y-2">
            <p className="font-bold text-zinc-800 dark:text-zinc-200">Example Calculation:</p>
            <p className="text-zinc-500 dark:text-zinc-400">
              An advertiser spends <strong>₹1,000</strong> on an eligible campaign attributed to your group.
              Your wallet receives <strong>₹200 (20%)</strong> as Pending Balance.
            </p>
          </div>
        </section>

        {/* 2. Attribution Rules (Placement & Global Origin) */}
        <section className="p-6 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              2. How Revenue is Justified & Attributed
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1.5">
              <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Primary Rule: Group Placement & Context</span>
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                When an ad is specifically displayed inside your group feed or targeted to your group members, 100% of that placement's 20% share is credited directly to your group founder wallet.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1.5">
              <h4 className="font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-500" />
                <span>Secondary Rule: Global Ad Campaign / First-Origin Member</span>
              </h4>
              <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">
                If an advertiser runs a general platform-wide campaign across Tolee without targeting a specific group, the revenue share is attributed to the founder of the <strong>first group that the advertiser originally joined</strong> on Tolee.
              </p>
            </div>
          </div>
        </section>

        {/* 3. Settlement & Withdrawals */}
        <section className="p-6 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              3. Settlement Period & Payout Requirements
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1">
              <span className="font-bold text-zinc-900 dark:text-white block">7-Day Verification Settlement</span>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Ad earnings stay as Pending for 7 days while traffic verification completes, before transitioning to Available.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1">
              <span className="font-bold text-zinc-900 dark:text-white block">₹500 Minimum Payout</span>
              <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                Withdrawals can be requested once your Available balance reaches ₹500, paid directly to your Bank A/C or UPI.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Anti-Fraud Policy */}
        <section className="p-6 rounded-3xl bg-amber-500/5 dark:bg-[#0f141f] border border-amber-500/20 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Anti-Fraud & Fair Play Agreement</span>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
            Tolee uses real-time fraud detection. Any attempts to manipulate revenue via bots, emulator farms, click fraud, self-attribution, or fake accounts will lead to immediate cancellation of earnings and permanent ban of the user and group.
          </p>
        </section>

        {/* Action Button */}
        <div className="text-center pt-4">
          <Link
            href="/create-tolee"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black font-black text-sm shadow-xl shadow-teal-500/20 active:scale-95 transition-all"
          >
            <span>Proceed to Create Group</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </Link>
        </div>
      </main>
    </div>
  );
}
