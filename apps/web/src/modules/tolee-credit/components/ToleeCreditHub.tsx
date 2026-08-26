'use client';

import React, { useState } from 'react';
import { CreditWalletDto, GroupCreditSummaryDto, CreditTransactionDto, CreditWithdrawalDto, CreditBankAccountDto } from '../types';
import { WalletCard } from './WalletCard';
import { GroupRevenueDashboard } from './GroupRevenueDashboard';
import { TransactionLedgerView } from './TransactionLedgerView';
import { WithdrawalModal } from './WithdrawalModal';
import { BankAccountModal } from './BankAccountModal';
import {
  connectGroupToCreditAction,
  addBankAccountAction,
  requestWithdrawalAction,
} from '@/actions/toleeCredit';
import { ShieldCheck, Info, Sparkles } from 'lucide-react';

interface ToleeCreditHubProps {
  initialWallet: CreditWalletDto;
  initialGroups: GroupCreditSummaryDto[];
  initialTransactions: CreditTransactionDto[];
  initialWithdrawals: CreditWithdrawalDto[];
  initialBankAccounts: CreditBankAccountDto[];
}

export function ToleeCreditHub({
  initialWallet,
  initialGroups,
  initialTransactions,
  initialWithdrawals,
  initialBankAccounts,
}: ToleeCreditHubProps) {
  const [wallet, setWallet] = useState<CreditWalletDto>(initialWallet);
  const [groups, setGroups] = useState<GroupCreditSummaryDto[]>(initialGroups);
  const [transactions, setTransactions] = useState<CreditTransactionDto[]>(initialTransactions);
  const [bankAccounts, setBankAccounts] = useState<CreditBankAccountDto[]>(initialBankAccounts);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);

  const handleConnectGroup = async (toleeId: string) => {
    const res = await connectGroupToCreditAction(toleeId);
    if (res.success) {
      setGroups((prev) =>
        prev.map((g) => (g.toleeId === toleeId ? { ...g, creditEnabled: true, revenueShareEnabled: true } : g))
      );
    }
  };

  const handleAddBankAccount = async (data: any) => {
    const res = await addBankAccountAction(data);
    if (res.success && res.bankAccount) {
      setBankAccounts((prev) => [res.bankAccount!, ...prev]);
    }
    return res;
  };

  const handleRequestWithdrawal = async (amount: number, bankAccountId?: string) => {
    const res = await requestWithdrawalAction(amount, bankAccountId);
    if (res.success && res.withdrawal) {
      setWallet((w) => ({
        ...w,
        availableBalance: w.availableBalance - amount,
        totalWithdrawn: w.totalWithdrawn + amount,
      }));
    }
    return res;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* 1. Main Hero Wallet Card */}
      <WalletCard
        wallet={wallet}
        onOpenWithdraw={() => setIsWithdrawModalOpen(true)}
        onOpenBankAccount={() => setIsAddBankModalOpen(true)}
        hasBankAccount={bankAccounts.length > 0}
      />

      {/* 2. Educational & Transparency Banner (Rule #34 & #35) */}
      <div className="p-4 rounded-3xl bg-teal-500/5 dark:bg-[#0c1424] border border-teal-500/20 flex items-start gap-3.5 text-xs text-zinc-600 dark:text-zinc-300">
        <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-zinc-900 dark:text-white">How Tolee Credit Earnings Work</h4>
          <p className="leading-relaxed text-[11.5px] text-zinc-500 dark:text-zinc-400">
            When you create a Tolee community, your group becomes eligible for community revenue share.
            When verified advertising campaigns run across Tolee, the configured revenue share (e.g. 20%) is credited to your wallet as Pending, and becomes Available for withdrawal upon standard settlement.
          </p>
        </div>
      </div>

      {/* 3. My Connected Groups Section */}
      <GroupRevenueDashboard groups={groups} onConnectGroup={handleConnectGroup} />

      {/* 4. Immutable Transaction Ledger Section */}
      <TransactionLedgerView transactions={transactions} />

      {/* Modals */}
      <WithdrawalModal
        isOpen={isWithdrawModalOpen}
        onClose={() => setIsWithdrawModalOpen(false)}
        wallet={wallet}
        bankAccounts={bankAccounts}
        onOpenAddBank={() => {
          setIsWithdrawModalOpen(false);
          setIsAddBankModalOpen(true);
        }}
        onRequestWithdrawal={handleRequestWithdrawal}
      />

      <BankAccountModal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        onAddAccount={handleAddBankAccount}
      />
    </div>
  );
}
