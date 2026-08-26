import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserCreditDashboardAction } from '@/actions/toleeCredit';
import { ToleeCreditHub } from '@/modules/tolee-credit/components/ToleeCreditHub';
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Tolee Credit – Community Revenue & Wallet | Tolee',
  description: 'Manage your Tolee Credit wallet, track community ad revenue shares, view transaction ledgers, and withdraw earnings.',
};

export default async function ToleeCreditPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=/tolee-credit');
  }

  const res = await getUserCreditDashboardAction();
  if (!res.success || !res.wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-50 dark:bg-[#070b13] text-zinc-900 dark:text-white">
        <div className="max-w-md w-full p-8 text-center bg-white dark:bg-[#0b1220] border border-zinc-200 dark:border-[#16233a] rounded-3xl space-y-4 shadow-xl">
          <p className="text-sm text-rose-500 font-bold">{res.error || 'Failed to initialize wallet.'}</p>
          <Link href="/feed" className="inline-block px-4 py-2 rounded-xl bg-teal-500 text-black text-xs font-bold">
            Go to Feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-[#070b13] text-zinc-900 dark:text-zinc-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#0a0f1d]/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-[#141e33] shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 dark:bg-[#141e33] hover:bg-zinc-200 dark:hover:bg-[#1f2d4a] text-zinc-700 dark:text-gray-200 transition-all cursor-pointer shadow-xs active:scale-95"
            aria-label="Back to Feed"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-teal-500" />
            <h1 className="text-base font-extrabold tracking-tight text-zinc-900 dark:text-white">Tolee Credit</h1>
          </div>
        </div>

        <Link
          href="/create-tolee"
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
        >
          + Create Tolee
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6">
        <ToleeCreditHub
          initialWallet={res.wallet}
          initialGroups={res.groups || []}
          initialTransactions={res.transactions || []}
          initialWithdrawals={res.withdrawals || []}
          initialBankAccounts={res.bankAccounts || []}
        />
      </main>
    </div>
  );
}
