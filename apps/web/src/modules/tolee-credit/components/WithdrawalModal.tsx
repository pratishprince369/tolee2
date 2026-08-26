'use client';

import React, { useState } from 'react';
import { CreditBankAccountDto, CreditWalletDto } from '../types';
import { formatCurrency } from '../utils/formatters';
import { X, Building2, ArrowUpRight, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: CreditWalletDto;
  bankAccounts: CreditBankAccountDto[];
  onOpenAddBank: () => void;
  onRequestWithdrawal: (amount: number, bankAccountId?: string) => Promise<{ success: boolean; error?: string }>;
}

export function WithdrawalModal({
  isOpen,
  onClose,
  wallet,
  bankAccounts,
  onOpenAddBank,
  onRequestWithdrawal,
}: WithdrawalModalProps) {
  const [amount, setAmount] = useState<string>('');
  const [selectedBankId, setSelectedBankId] = useState<string>(bankAccounts[0]?.id || '');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const minPayout = 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (numAmount < minPayout) {
      setErrorMsg(`Minimum withdrawal amount is ₹${minPayout}.`);
      return;
    }

    if (numAmount > wallet.availableBalance) {
      setErrorMsg(`Withdrawal amount exceeds your available balance of ₹${wallet.availableBalance.toFixed(2)}.`);
      return;
    }

    if (!selectedBankId && bankAccounts.length === 0) {
      setErrorMsg('Please add a bank account or UPI ID first.');
      return;
    }

    setLoading(true);
    const res = await onRequestWithdrawal(numAmount, selectedBankId || undefined);
    setLoading(false);

    if (res.success) {
      setSuccessMsg(`Withdrawal request of ₹${numAmount} submitted successfully!`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
        setAmount('');
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Failed to submit withdrawal request.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Title */}
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-teal-500" />
            <span>Withdraw Tolee Credit</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Transfer your available balance to your verified bank account or UPI.
          </p>
        </div>

        {/* Balance Card */}
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#070b13] border border-zinc-100 dark:border-[#141f33] flex items-center justify-between">
          <div>
            <span className="text-[11px] text-zinc-400 font-medium block">Available to Withdraw</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-white">
              {formatCurrency(wallet.availableBalance, wallet.currency)}
            </span>
          </div>
          <span className="text-[11px] font-bold text-teal-600 dark:text-teal-400 bg-teal-500/10 px-2.5 py-1 rounded-xl">
            Min. ₹{minPayout}
          </span>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Enter Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-zinc-400">₹</span>
              <input
                type="number"
                min={minPayout}
                max={wallet.availableBalance}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] focus:border-teal-500 rounded-2xl pl-8 pr-4 py-2.5 text-sm font-bold text-zinc-900 dark:text-white outline-none"
              />
            </div>
          </div>

          {/* Bank Account Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Payout Destination</label>
              <button
                type="button"
                onClick={onOpenAddBank}
                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
              >
                + Add New
              </button>
            </div>

            {bankAccounts.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center space-y-2">
                <p>No payout destination linked yet.</p>
                <button
                  type="button"
                  onClick={onOpenAddBank}
                  className="px-3.5 py-1.5 rounded-xl bg-teal-500 text-black text-xs font-bold shadow-sm"
                >
                  Link Bank / UPI Now
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {bankAccounts.map((acc) => (
                  <label
                    key={acc.id}
                    className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      selectedBankId === acc.id || (!selectedBankId && acc.isPrimary)
                        ? 'border-teal-500 bg-teal-500/5 dark:bg-teal-500/10'
                        : 'border-zinc-200 dark:border-[#16233a] bg-zinc-50/50 dark:bg-[#070b13]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="bank_select"
                      value={acc.id}
                      checked={selectedBankId === acc.id || (!selectedBankId && acc.isPrimary)}
                      onChange={() => setSelectedBankId(acc.id)}
                      className="accent-teal-500"
                    />
                    <div className="flex-1 min-w-0 text-xs">
                      <p className="font-bold text-zinc-900 dark:text-white truncate">
                        {acc.bankName || 'Bank Account'} •••• {acc.accountNumberLast4}
                      </p>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {acc.accountHolderName} {acc.ifscCode ? `(IFSC: ${acc.ifscCode})` : ''} {acc.upiId ? `• UPI: ${acc.upiId}` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || numAmount < minPayout || numAmount > wallet.availableBalance || bankAccounts.length === 0}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 disabled:opacity-40 text-black font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpRight className="w-4 h-4" />}
            <span>Confirm Withdrawal</span>
          </button>
        </form>

        <p className="text-[10px] text-zinc-400 text-center">
          Withdrawals are verified and processed directly to your beneficiary bank account.
        </p>
      </div>
    </div>
  );
}
