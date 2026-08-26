'use server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  getOrCreateWallet,
  getWalletByUserId,
  getTransactionsByWalletId,
  getMyGroupsCreditSummary,
  connectGroupToCredit,
  getBankAccounts,
  addBankAccount,
  requestWithdrawal,
  getWithdrawalsByWalletId,
  processAdRevenueAttribution,
  processDueSettlements,
  getAdminCreditOverview,
  getAdminSystemConfig,
  updateAdminSystemConfig,
  getAdminAllWithdrawals,
  processAdminWithdrawalAction as processAdminWithdrawal,
  AdAttributionInput,
  CreditSystemConfigDto,
} from '@/modules/tolee-credit';

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const user = session.user as any;
  return {
    id: user.id as string,
    email: user.email as string,
    role: (user.role || 'user') as string,
  };
}

export async function getUserCreditDashboardAction() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: 'Unauthorized. Please log in.' };
  }

  try {
    const wallet = await getOrCreateWallet(user.id);
    const [groups, { transactions }, withdrawals, bankAccounts] = await Promise.all([
      getMyGroupsCreditSummary(user.id),
      getTransactionsByWalletId(wallet.id, { limit: 20 }),
      getWithdrawalsByWalletId(wallet.id),
      getBankAccounts(user.id),
    ]);

    return {
      success: true,
      wallet,
      groups,
      transactions,
      withdrawals,
      bankAccounts,
    };
  } catch (err: any) {
    console.error('[getUserCreditDashboardAction] Error:', err);
    return { success: false, error: err.message || 'Failed to load Tolee Credit dashboard.' };
  }
}

export async function createOrGetWalletAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const wallet = await getOrCreateWallet(user.id);
    revalidatePath('/tolee-credit');
    return { success: true, wallet };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to initialize wallet.' };
  }
}

export async function connectGroupToCreditAction(toleeId: string, customRevenueSharePercent?: number) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const res = await connectGroupToCredit(toleeId, user.id, customRevenueSharePercent);
    revalidatePath('/tolee-credit');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to connect group.' };
  }
}

export async function addBankAccountAction(input: {
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  bankName?: string;
  upiId?: string;
}) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const res = await addBankAccount(user.id, input);
    revalidatePath('/tolee-credit');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add bank account.' };
  }
}

export async function requestWithdrawalAction(amount: number, bankAccountId?: string) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const res = await requestWithdrawal(user.id, amount, bankAccountId);
    revalidatePath('/tolee-credit');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to request withdrawal.' };
  }
}

export async function attributeAdSpendAction(input: AdAttributionInput) {
  try {
    const res = await processAdRevenueAttribution(input);
    return res;
  } catch (err: any) {
    console.error('[attributeAdSpendAction] Error:', err);
    return { success: false, error: err.message || 'Ad attribution failed.' };
  }
}

export async function runSettlementCycleAction() {
  try {
    const res = await processDueSettlements();
    revalidatePath('/tolee-credit');
    return { success: true, ...res };
  } catch (err: any) {
    return { success: false, error: err.message || 'Settlement cycle failed.' };
  }
}

// ---------------------------------------------------------
// SUPER ADMIN ACTIONS
// ---------------------------------------------------------

export async function getAdminCreditDashboardAction() {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const [overview, config, withdrawals] = await Promise.all([
      getAdminCreditOverview(),
      getAdminSystemConfig(),
      getAdminAllWithdrawals(),
    ]);

    return {
      success: true,
      overview,
      config,
      withdrawals,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load Admin Credit dashboard.' };
  }
}

export async function updateAdminCreditConfigAction(input: Partial<CreditSystemConfigDto>) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const updated = await updateAdminSystemConfig(input, user.id);
    revalidatePath('/super-admin/credit');
    revalidatePath('/tolee-credit');
    return { success: true, config: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update system config.' };
  }
}

export async function processAdminWithdrawalAction(
  withdrawalId: string,
  action: 'approve' | 'reject' | 'fail',
  options?: { payoutReference?: string; reason?: string; adminNotes?: string }
) {
  const user = await getAuthenticatedUser();
  if (!user) return { success: false, error: 'Unauthorized.' };

  try {
    const res = await processAdminWithdrawal(withdrawalId, action, user.id, options);
    revalidatePath('/super-admin/credit');
    revalidatePath('/tolee-credit');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to process withdrawal.' };
  }
}
