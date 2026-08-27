'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ShieldCheck,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Users,
  Wallet,
  Clock,
  Banknote,
  FileText,
} from 'lucide-react';

interface CreditTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
  redirectUrl?: string;
}

export function CreditTermsModal({
  isOpen,
  onClose,
  onAccept,
  redirectUrl = '/create-tolee',
}: CreditTermsModalProps) {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  const handleProceed = () => {
    if (!agreed) return;
    try {
      localStorage.setItem('tolee_credit_terms_accepted', 'true');
    } catch {}
    if (onAccept) {
      onAccept();
    } else {
      router.push(redirectUrl);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0b1220] border border-zinc-200 dark:border-[#18263e] rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-[#141f33] flex items-center justify-between bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-500 flex items-center justify-center border border-teal-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white tracking-tight">
                Tolee Credit Community Monetization Terms
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Revenue-Sharing Scheme & Creator Agreement
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed scrollbar-thin">
          {/* Highlight Badge */}
          <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300 flex items-start gap-3">
            <Percent className="w-5 h-5 shrink-0 text-teal-500 mt-0.5" />
            <div>
              <h4 className="font-extrabold text-sm text-zinc-900 dark:text-white">
                20% Community Revenue Share Scheme
              </h4>
              <p className="text-[11.5px] mt-0.5 text-zinc-600 dark:text-zinc-300">
                As a Tolee Group founder, you earn a verified 20% revenue share on all eligible advertising activity attributed to your community.
              </p>
            </div>
          </div>

          {/* Section 1: How Revenue is Attributed */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-zinc-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-500" />
              <span>1. Revenue Attribution Rules</span>
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1">
                <span className="font-bold text-zinc-900 dark:text-white block text-xs">
                  A. Group Placement Ads
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  When ads or sponsored campaigns are displayed inside your group feed or targeted to your members, 20% of the ad spend is credited to your Tolee Credit Wallet.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] space-y-1">
                <span className="font-bold text-zinc-900 dark:text-white block text-xs">
                  B. Global First-Origin Member Ads
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  If a user who first joined Tolee through your group runs an open platform ad in the future, you receive 20% attribution as their origin community founder.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Settlement & Withdrawals */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-zinc-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-500" />
              <span>2. Settlement Cycle & Payouts</span>
            </h4>
            <ul className="space-y-2 text-[11px] list-disc list-inside text-zinc-500 dark:text-zinc-400">
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Pending Period:</strong> Earned revenue is initially held as <em className="text-amber-500 not-italic font-bold">Pending</em> for 7 days for verification and fraud checks.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Available Balance:</strong> After the 7-day settlement period, funds automatically move to your <em className="text-emerald-500 not-italic font-bold">Available Balance</em>.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Minimum Withdrawal:</strong> You can withdraw once your available balance reaches at least <strong className="text-zinc-900 dark:text-white">₹500</strong>.
              </li>
              <li>
                <strong className="text-zinc-800 dark:text-zinc-200">Payout Modes:</strong> Direct transfer to your verified Bank Account (IMPS/NEFT) or UPI ID.
              </li>
            </ul>
          </div>

          {/* Section 3: Anti-Fraud & Compliance */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-zinc-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5 text-amber-500">
              <AlertTriangle className="w-4 h-4" />
              <span>3. Anti-Fraud & Fair Play Policy</span>
            </h4>
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-zinc-600 dark:text-zinc-300 text-[11px] space-y-1">
              <p>
                Strict zero-tolerance for bots, synthetic clicks, self-attribution manipulation, or artificial traffic bursts. Any detected fraud will result in balance forfeiture and wallet suspension.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Agreement Checkbox & Proceed Button */}
        <div className="p-6 border-t border-zinc-100 dark:border-[#141f33] bg-zinc-50/50 dark:bg-[#070b13] space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-teal-500 focus:ring-teal-500 accent-teal-500 cursor-pointer"
            />
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-snug">
              I have read, understood, and accept the <strong className="text-teal-600 dark:text-teal-400">Tolee Credit Community Revenue Sharing Scheme & Monetization Terms</strong>.
            </span>
          </label>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-2xl bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              onClick={handleProceed}
              disabled={!agreed}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-black flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <span>Accept & Create Group</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
