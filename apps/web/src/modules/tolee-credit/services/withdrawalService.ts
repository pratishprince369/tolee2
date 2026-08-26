import { prisma } from '@/lib/prisma';
import { CreditWithdrawalDto, CreditBankAccountDto } from '../types';
import { getOrCreateWallet, updateWalletBalances } from './walletService';
import { createCreditTransaction } from './ledgerService';
import { generateWithdrawalId } from '../utils/idGenerators';
import { DEFAULT_CREDIT_CONFIG } from '../config/defaultConfig';
import { logCreditAudit } from './auditService';

export async function addBankAccount(
  userId: string,
  input: {
    accountHolderName: string;
    accountNumber: string;
    ifscCode: string;
    bankName?: string;
    upiId?: string;
  }
): Promise<{ success: boolean; bankAccount?: CreditBankAccountDto; error?: string }> {
  if (!input.accountHolderName || (!input.accountNumber && !input.upiId)) {
    return { success: false, error: 'Account holder name and account number or UPI ID are required.' };
  }

  const wallet = await getOrCreateWallet(userId);
  const cleanAcc = (input.accountNumber || '').replace(/\s+/g, '');
  const last4 = cleanAcc.slice(-4) || 'UPI';

  const created = await prisma.creditBankAccount.create({
    data: {
      userId,
      walletId: wallet.id,
      accountHolderName: input.accountHolderName.trim(),
      accountNumberEncrypted: cleanAcc, // In production, this can be encrypted with crypto key
      accountNumberLast4: last4,
      ifscCode: (input.ifscCode || '').trim().toUpperCase(),
      bankName: input.bankName?.trim() || null,
      upiId: input.upiId?.trim() || null,
      isPrimary: true,
      isVerified: true, // In full release, bank penny drop / verification can verify
      verificationStatus: 'verified',
    },
  });

  await logCreditAudit({
    actorId: userId,
    action: 'bank_account_added',
    targetType: 'bank_account',
    targetId: created.id,
    details: { bankName: created.bankName, last4 },
  });

  return {
    success: true,
    bankAccount: {
      id: created.id,
      userId: created.userId,
      walletId: created.walletId,
      accountHolderName: created.accountHolderName,
      accountNumberLast4: created.accountNumberLast4,
      ifscCode: created.ifscCode,
      bankName: created.bankName,
      upiId: created.upiId,
      isPrimary: created.isPrimary,
      isVerified: created.isVerified,
      verificationStatus: created.verificationStatus as any,
      createdAt: created.createdAt.toISOString(),
    },
  };
}

export async function getBankAccounts(userId: string): Promise<CreditBankAccountDto[]> {
  const accounts = await prisma.creditBankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return accounts.map((a: any) => ({
    id: a.id,
    userId: a.userId,
    walletId: a.walletId,
    accountHolderName: a.accountHolderName,
    accountNumberLast4: a.accountNumberLast4,
    ifscCode: a.ifscCode,
    bankName: a.bankName,
    upiId: a.upiId,
    isPrimary: a.isPrimary,
    isVerified: a.isVerified,
    verificationStatus: a.verificationStatus as any,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  bankAccountId?: string
): Promise<{ success: boolean; withdrawal?: CreditWithdrawalDto; error?: string }> {
  if (amount <= 0 || isNaN(amount)) {
    return { success: false, error: 'Invalid withdrawal amount.' };
  }

  // Check system config
  let minAmount = DEFAULT_CREDIT_CONFIG.minimumWithdrawalAmount;
  const sysConfig = await prisma.creditSystemConfig.findUnique({
    where: { id: 'global_credit_config' },
  });
  if (sysConfig) {
    minAmount = sysConfig.minimumWithdrawalAmount;
  }

  if (amount < minAmount) {
    return {
      success: false,
      error: `Minimum withdrawal amount is ₹${minAmount.toLocaleString('en-IN')}.`,
    };
  }

  const wallet = await getOrCreateWallet(userId);

  if (wallet.availableBalance < amount) {
    return {
      success: false,
      error: `Insufficient available balance. You have ₹${wallet.availableBalance.toFixed(2)} available.`,
    };
  }

  // Fetch Bank Account
  let bankAccount = null;
  if (bankAccountId) {
    bankAccount = await prisma.creditBankAccount.findUnique({
      where: { id: bankAccountId },
    });
  } else {
    bankAccount = await prisma.creditBankAccount.findFirst({
      where: { userId, isPrimary: true },
    });
  }

  if (!bankAccount) {
    return {
      success: false,
      error: 'Please add and select a verified bank account or UPI ID to withdraw funds.',
    };
  }

  const withdrawalId = generateWithdrawalId();
  const bankSnapshot = {
    accountHolderName: bankAccount.accountHolderName,
    accountNumberLast4: bankAccount.accountNumberLast4,
    ifscCode: bankAccount.ifscCode,
    bankName: bankAccount.bankName,
    upiId: bankAccount.upiId,
  };

  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Create Withdrawal Record
    const withdrawal = await tx.creditWithdrawal.create({
      data: {
        withdrawalId,
        walletId: wallet.id,
        userId,
        amount,
        currency: 'INR',
        bankAccountId: bankAccount.id,
        bankAccountSnapshot: bankSnapshot,
        status: 'pending',
      },
    });

    // 2. Record Debit Ledger Entry
    await createCreditTransaction(tx, {
      walletId: wallet.id,
      userId,
      type: 'withdrawal',
      amount: -amount,
      currency: 'INR',
      status: 'pending',
      sourceType: 'payout',
      sourceId: withdrawal.id,
      description: `Withdrawal request to ${bankAccount.bankName || 'Bank Account'} (ending in ${bankAccount.accountNumberLast4})`,
      metadata: { withdrawalId, bankSnapshot },
    });

    // 3. Update balances
    await updateWalletBalances(tx, wallet.id, {
      availableDelta: -amount,
      withdrawnDelta: amount,
    });

    return withdrawal;
  });

  // Audit
  await logCreditAudit({
    actorId: userId,
    action: 'withdrawal_requested',
    targetType: 'withdrawal',
    targetId: result.id,
    amount,
    details: { withdrawalId, bankSnapshot },
  });

  return {
    success: true,
    withdrawal: {
      id: result.id,
      withdrawalId: result.withdrawalId,
      walletId: result.walletId,
      userId: result.userId,
      amount: result.amount,
      currency: result.currency,
      bankAccountId: result.bankAccountId,
      bankAccountSnapshot: result.bankAccountSnapshot as any,
      status: result.status as any,
      requestedAt: result.requestedAt.toISOString(),
      processedAt: result.processedAt ? result.processedAt.toISOString() : null,
      completedAt: result.completedAt ? result.completedAt.toISOString() : null,
    },
  };
}

export async function getWithdrawalsByWalletId(walletId: string): Promise<CreditWithdrawalDto[]> {
  const withdrawals = await prisma.creditWithdrawal.findMany({
    where: { walletId },
    orderBy: { requestedAt: 'desc' },
  });

  return withdrawals.map((w: any) => ({
    id: w.id,
    withdrawalId: w.withdrawalId,
    walletId: w.walletId,
    userId: w.userId,
    amount: w.amount,
    currency: w.currency,
    bankAccountId: w.bankAccountId,
    bankAccountSnapshot: w.bankAccountSnapshot as any,
    status: w.status as any,
    failureReason: w.failureReason,
    adminNotes: w.adminNotes,
    payoutReference: w.payoutReference,
    requestedAt: w.requestedAt.toISOString(),
    processedAt: w.processedAt ? w.processedAt.toISOString() : null,
    completedAt: w.completedAt ? w.completedAt.toISOString() : null,
  }));
}
