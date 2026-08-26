'use client';

import React, { useState } from 'react';
import { CreditTransactionDto, TransactionType } from '../types';
import { formatCurrency, formatCreditDateTime } from '../utils/formatters';
import { ArrowDownLeft, ArrowUpRight, Clock, CheckCircle, AlertTriangle, Search } from 'lucide-react';

interface TransactionLedgerViewProps {
  transactions: CreditTransactionDto[];
}

export function TransactionLedgerView({ transactions }: TransactionLedgerViewProps) {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = t.groupName?.toLowerCase().includes(q);
      const matchCamp = t.campaignName?.toLowerCase().includes(q);
      const matchTxnId = t.transactionId.toLowerCase().includes(q);
      if (!matchName && !matchCamp && !matchTxnId) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Transaction Ledger</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {filtered.length}
            </span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Immutable record of all revenue attributions, settlements, and withdrawals.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['all', 'ad_revenue', 'withdrawal', 'bonus'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                filterType === type
                  ? 'bg-teal-500 text-black shadow-xs'
                  : 'bg-zinc-100 dark:bg-[#0e1626] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {type === 'all'
                ? 'All'
                : type === 'ad_revenue'
                ? 'Ad Revenue'
                : type === 'withdrawal'
                ? 'Withdrawals'
                : 'Bonuses'}
            </button>
          ))}
        </div>
      </div>

      {/* Search box */}
      <div className="relative">
        <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by group, campaign, or transaction ID..."
          className="w-full bg-zinc-50 dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-teal-500 transition-all"
        />
      </div>

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center bg-zinc-50 dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-3xl space-y-2">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No transactions found.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((txn) => {
            const isPositive = txn.amount > 0;

            return (
              <div
                key={txn.id}
                className="p-4 rounded-2xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] hover:border-teal-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                {/* Left details */}
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isPositive
                        ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-500 dark:text-rose-400'
                    }`}
                  >
                    {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white leading-tight">
                        {txn.type === 'ad_revenue'
                          ? 'Group Ad Revenue'
                          : txn.type === 'withdrawal'
                          ? 'Withdrawal Payout'
                          : txn.type === 'bonus'
                          ? 'System Bonus'
                          : 'Credit Adjustment'}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize ${
                          txn.status === 'available' || txn.status === 'settled'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : txn.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {txn.status}
                      </span>
                    </div>

                    {/* Explanatory Breakdown (User Transparency) */}
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 space-y-0.5">
                      {txn.groupName && (
                        <p className="font-medium text-zinc-700 dark:text-zinc-300">
                          Group: <span className="font-bold">{txn.groupName}</span>
                        </p>
                      )}
                      {txn.campaignName && (
                        <p className="text-[11px]">
                          Campaign: {txn.campaignName}{' '}
                          {txn.grossAdSpend ? `(Spend: ₹${txn.grossAdSpend} @ ${txn.revenueSharePercent || 20}% Share)` : ''}
                        </p>
                      )}
                      <p className="text-[10px] text-zinc-400">
                        {formatCreditDateTime(txn.createdAt)} • Ref: {txn.transactionId}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Amount */}
                <div className="text-left sm:text-right shrink-0">
                  <span
                    className={`text-base font-black tracking-tight ${
                      isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-900 dark:text-white'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {formatCurrency(txn.amount, txn.currency)}
                  </span>
                  {txn.status === 'pending' && txn.settlesAt && (
                    <span className="block text-[10px] text-amber-500 dark:text-amber-400 font-medium">
                      Settles {new Date(txn.settlesAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
