'use client';

import React from 'react';
import { CreditWalletDto } from '../types';
import { formatCurrency } from '../utils/formatters';
import { Wallet, ArrowUpRight, Clock, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface WalletCardProps {
  wallet: CreditWalletDto;
  onOpenWithdraw: () => void;
  onOpenBankAccount: () => void;
  hasBankAccount: boolean;
}

export function WalletCard({ wallet, onOpenWithdraw, onOpenBankAccount, hasBankAccount }: WalletCardProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c1322] via-[#090f1d] to-[#040810] border border-teal-500/20 text-white p-6 shadow-2xl">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold tracking-tight">TOLEE CREDIT</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wider">
                Active
              </span>
            </div>
            <p className="text-xs text-zinc-400">Community Monetization & Revenue Wallet</p>
          </div>
        </div>

        <button
          onClick={onOpenBankAccount}
          className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline cursor-pointer"
        >
          {hasBankAccount ? 'Manage Bank A/C' : '+ Add Bank A/C'}
        </button>
      </div>

      {/* Main Balance Display */}
      <div className="my-6 relative z-10">
        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Available Balance</span>
        <div className="flex items-baseline gap-3 mt-1">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {formatCurrency(wallet.availableBalance, wallet.currency)}
          </h1>
          {wallet.pendingBalance > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
              <Clock className="w-3.5 h-3.5" />
              <span>+ {formatCurrency(wallet.pendingBalance, wallet.currency)} Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3 pt-2 relative z-10">
        <button
          onClick={onOpenWithdraw}
          className="flex-1 min-w-[140px] py-3 px-5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95 cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Withdraw</span>
        </button>

        <button
          onClick={() => {
            const el = document.getElementById('tolee-credit-groups-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>My Groups</span>
        </button>
      </div>

      {/* Aggregate Statistics Footer */}
      <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 gap-4 relative z-10 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">Total Earned</span>
            <span className="font-bold text-zinc-100 text-sm">
              {formatCurrency(wallet.totalEarned, wallet.currency)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <span className="text-zinc-400 block text-[11px]">Total Withdrawn</span>
            <span className="font-bold text-zinc-100 text-sm">
              {formatCurrency(wallet.totalWithdrawn, wallet.currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
