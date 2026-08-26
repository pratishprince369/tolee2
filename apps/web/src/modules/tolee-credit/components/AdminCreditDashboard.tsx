'use client';

import React, { useState } from 'react';
import { CreditSystemConfigDto, CreditWithdrawalDto } from '../types';
import { formatCurrency, formatCreditDateTime } from '../utils/formatters';
import {
  updateAdminCreditConfigAction,
  processAdminWithdrawalAction,
  runSettlementCycleAction,
} from '@/actions/toleeCredit';
import {
  Wallet,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Users,
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

interface AdminCreditDashboardProps {
  overview: any;
  initialConfig: CreditSystemConfigDto;
  initialWithdrawals: CreditWithdrawalDto[];
}

export function AdminCreditDashboard({ overview, initialConfig, initialWithdrawals }: AdminCreditDashboardProps) {
  const [config, setConfig] = useState<CreditSystemConfigDto>(initialConfig);
  const [withdrawals, setWithdrawals] = useState<CreditWithdrawalDto[]>(initialWithdrawals);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [runningSettlement, setRunningSettlement] = useState(false);
  const [settlementResult, setSettlementResult] = useState<string | null>(null);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    setConfigMessage(null);
    const res = await updateAdminCreditConfigAction(config);
    setSavingConfig(false);
    if (res.success && res.config) {
      setConfig(res.config);
      setConfigMessage('Configuration updated successfully!');
      setTimeout(() => setConfigMessage(null), 3000);
    } else {
      setConfigMessage('Failed to update configuration.');
    }
  };

  const handleProcessWithdrawal = async (withdrawalId: string, action: 'approve' | 'reject') => {
    const res = await processAdminWithdrawalAction(withdrawalId, action);
    if (res.success) {
      setWithdrawals((prev) =>
        prev.map((w) => (w.id === withdrawalId ? { ...w, status: action === 'approve' ? 'completed' : 'rejected' } : w))
      );
    }
  };

  const handleRunSettlement = async () => {
    setRunningSettlement(true);
    setSettlementResult(null);
    const res = await runSettlementCycleAction();
    setRunningSettlement(false);
    if (res.success) {
      setSettlementResult(`Settled ${res.settledCount} transactions (Total: ₹${(res.totalSettledAmount || 0).toFixed(2)})`);
      setTimeout(() => setSettlementResult(null), 4000);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Total Credit Issued</span>
            <TrendingUp className="w-4 h-4 text-teal-500" />
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white">
            {formatCurrency(overview.totalEarnedIssued)}
          </p>
          <span className="text-[11px] text-zinc-400 block">{overview.earningUsersCount} earning creators</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Available in Wallets</span>
            <Wallet className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {formatCurrency(overview.totalAvailable)}
          </p>
          <span className="text-[11px] text-zinc-400 block">{overview.totalWallets} active wallets</span>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Pending Settlement</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500">
            {formatCurrency(overview.totalPending)}
          </p>
          <button
            onClick={handleRunSettlement}
            disabled={runningSettlement}
            className="text-[11px] font-bold text-teal-500 hover:underline flex items-center gap-1 cursor-pointer"
          >
            {runningSettlement ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>Run Settlement Cycle</span>
          </button>
        </div>

        <div className="p-5 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">Total Payouts</span>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-zinc-900 dark:text-white">
            {formatCurrency(overview.totalWithdrawn)}
          </p>
          <span className="text-[11px] text-zinc-400 block">{overview.pendingWithdrawalsCount} pending payout requests</span>
        </div>
      </div>

      {settlementResult && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
          {settlementResult}
        </div>
      )}

      {/* Configuration & Controls Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal-500" />
              <span>Revenue-Share & Settlement Configuration</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Change business rules without code changes. All calculations use these values.
            </p>
          </div>
          {configMessage && <span className="text-xs font-bold text-teal-500">{configMessage}</span>}
        </div>

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Revenue Share Percentage (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={config.defaultRevenueSharePercent}
              onChange={(e) => setConfig({ ...config, defaultRevenueSharePercent: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white font-bold"
            />
            <span className="text-[10px] text-zinc-400">Share given to group founder from ad spend (e.g. 20%)</span>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Minimum Withdrawal Amount (₹)</label>
            <input
              type="number"
              min="10"
              step="10"
              value={config.minimumWithdrawalAmount}
              onChange={(e) => setConfig({ ...config, minimumWithdrawalAmount: parseFloat(e.target.value) || 0 })}
              className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white font-bold"
            />
            <span className="text-[10px] text-zinc-400">Minimum available balance required to withdraw</span>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-zinc-700 dark:text-zinc-300">Settlement Period (Days)</label>
            <input
              type="number"
              min="0"
              max="90"
              step="1"
              value={config.settlementPeriodDays}
              onChange={(e) => setConfig({ ...config, settlementPeriodDays: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-zinc-50 dark:bg-[#0e1626] border border-zinc-200 dark:border-[#18263e] rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white font-bold"
            />
            <span className="text-[10px] text-zinc-400">Days before pending revenue becomes withdrawable</span>
          </div>

          <div className="md:col-span-3 flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black font-extrabold text-xs transition-all shadow-sm cursor-pointer"
            >
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </form>
      </div>

      {/* Payout & Withdrawal Management Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-[#0b1220] border border-zinc-200/80 dark:border-[#16233a] space-y-4 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-teal-500" />
            <span>Withdrawal Requests ({withdrawals.length})</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Approve or reject creator payout requests.
          </p>
        </div>

        {withdrawals.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">No withdrawal requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Creator</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Requested</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {withdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                    <td className="py-3 px-3 font-bold text-zinc-900 dark:text-white">
                      {w.userName || w.userId}
                    </td>
                    <td className="py-3 px-3 font-black text-zinc-900 dark:text-white">
                      {formatCurrency(w.amount, w.currency)}
                    </td>
                    <td className="py-3 px-3 text-zinc-600 dark:text-zinc-300">
                      {w.bankAccountSnapshot?.bankName || 'Bank'} (•••• {w.bankAccountSnapshot?.accountNumberLast4})
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          w.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : w.status === 'pending'
                            ? 'bg-amber-500/10 text-amber-500'
                            : 'bg-rose-500/10 text-rose-500'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-zinc-400 text-[11px]">
                      {formatCreditDateTime(w.requestedAt)}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      {w.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleProcessWithdrawal(w.id, 'approve')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleProcessWithdrawal(w.id, 'reject')}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 text-[11px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
