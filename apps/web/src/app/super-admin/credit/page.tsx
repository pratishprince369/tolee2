'use client';

import React, { useEffect, useState } from 'react';
import { getAdminCreditDashboardAction } from '@/actions/toleeCredit';
import { AdminCreditDashboard } from '@/modules/tolee-credit/components/AdminCreditDashboard';
import { Loader2, ShieldCheck, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminCreditPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const res = await getAdminCreditDashboardAction();
    if (res.success) {
      setData(res);
    } else {
      setError(res.error || 'Failed to load Admin Credit data.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-4">
        <p className="text-sm font-bold text-rose-500">{error || 'Access denied or server error.'}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 rounded-xl bg-teal-500 text-black text-xs font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/super-admin"
            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-teal-500" />
              <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight">
                Tolee Credit & Revenue Management
              </h1>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Super Admin controls for community revenue-share rules, settlements, and creator withdrawals.
            </p>
          </div>
        </div>

        <Link
          href="/tolee-credit"
          target="_blank"
          className="px-3.5 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
        >
          View User Wallet ↗
        </Link>
      </div>

      {/* Main Admin Component */}
      <AdminCreditDashboard
        overview={data.overview}
        initialConfig={data.config}
        initialWithdrawals={data.withdrawals}
      />
    </div>
  );
}
