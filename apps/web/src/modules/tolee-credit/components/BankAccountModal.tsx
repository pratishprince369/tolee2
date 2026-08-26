'use client';

import React, { useState } from 'react';
import { X, Building, CreditCard, ShieldCheck, Loader2, AlertCircle } from 'lucide-react';

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (data: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
    upiId?: string;
  }) => Promise<{ success: boolean; error?: string }>;
}

export function BankAccountModal({ isOpen, onClose, onAddAccount }: BankAccountModalProps) {
  const [tab, setTab] = useState<'bank' | 'upi'>('bank');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!holderName.trim()) {
      setErrorMsg('Please enter account holder name.');
      return;
    }

    if (tab === 'bank') {
      if (!accountNumber || accountNumber !== confirmAccountNumber) {
        setErrorMsg('Account numbers do not match.');
        return;
      }
      if (!ifscCode.trim()) {
        setErrorMsg('Please enter valid IFSC code.');
        return;
      }
    } else {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMsg('Please enter a valid UPI ID (e.g. name@okhdfcbank).');
        return;
      }
    }

    setLoading(true);
    const res = await onAddAccount({
      accountHolderName: holderName.trim(),
      accountNumber: tab === 'bank' ? accountNumber.trim() : (upiId.trim() || 'UPI'),
      ifscCode: tab === 'bank' ? ifscCode.trim().toUpperCase() : 'UPI0000000',
      bankName: tab === 'bank' ? (bankName.trim() || 'Bank Account') : 'UPI Handle',
      upiId: tab === 'upi' ? upiId.trim() : undefined,
    });
    setLoading(false);

    if (res.success) {
      onClose();
      setHolderName('');
      setAccountNumber('');
      setConfirmAccountNumber('');
      setIfscCode('');
      setBankName('');
      setUpiId('');
    } else {
      setErrorMsg(res.error || 'Failed to save payout details.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-teal-500" />
            <span>Link Payout Destination</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Add your verified bank account or UPI ID for receiving withdrawals.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-zinc-100 dark:bg-[#0e1626] p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setTab('bank')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'bank' ? 'bg-white dark:bg-[#16233a] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'
            }`}
          >
            Bank Account
          </button>
          <button
            type="button"
            onClick={() => setTab('upi')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              tab === 'upi' ? 'bg-white dark:bg-[#16233a] text-zinc-900 dark:text-white shadow-xs' : 'text-zinc-500'
            }`}
          >
            UPI ID
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Account Holder Full Name</label>
            <input
              type="text"
              required
              value={holderName}
              onChange={(e) => setHolderName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-teal-500"
            />
          </div>

          {tab === 'bank' ? (
            <>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Bank Name (Optional)</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. HDFC Bank"
                  className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Account Number</label>
                <input
                  type="password"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">Confirm Account Number</label>
                <input
                  type="text"
                  required
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value)}
                  placeholder="Re-enter account number"
                  className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white uppercase outline-none focus:border-teal-500"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="font-bold text-zinc-700 dark:text-zinc-300 block mb-1">UPI ID / VPA</label>
              <input
                type="text"
                required
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="rajesh@okhdfcbank"
                className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2.5 text-zinc-900 dark:text-white outline-none focus:border-teal-500"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black font-black text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Save Beneficiary Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
