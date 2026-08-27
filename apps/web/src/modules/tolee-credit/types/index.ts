export type WalletStatus = 'active' | 'frozen' | 'under_review' | 'closed';

export type TransactionType =
  | 'ad_revenue'
  | 'group_revenue'
  | 'bonus'
  | 'referral'
  | 'withdrawal'
  | 'refund'
  | 'reversal'
  | 'admin_adjustment';

export type TransactionStatus =
  | 'pending'
  | 'settled'
  | 'available'
  | 'failed'
  | 'reversed'
  | 'under_review';

export type EarningSourceType =
  | 'ad_campaign'
  | 'group_share'
  | 'system_bonus'
  | 'payout'
  | 'creator_reward';

export type WithdrawalStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export interface CreditWalletDto {
  id: string;
  userId: string;
  currency: string;
  availableBalance: number;
  pendingBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  status: WalletStatus;
  createdAt: string;
  updatedAt: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
}

export interface CreditTransactionDto {
  id: string;
  transactionId: string;
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  sourceType: EarningSourceType;
  sourceId?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  revenueSharePercent?: number | null;
  grossAdSpend?: number | null;
  description?: string | null;
  metadata?: Record<string, any> | null;
  settlesAt?: string | null;
  settledAt?: string | null;
  eventId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GroupCreditSummaryDto {
  id: string;
  toleeId: string;
  toleeName: string;
  toleeSlug: string;
  toleeAvatar?: string | null;
  memberCount: number;
  creditEnabled: boolean;
  revenueShareEnabled: boolean;
  revenueSharePercent: number; // custom or global
  totalRevenueGenerated: number;
  totalAdminShareEarned: number;
  pendingShare: number;
  availableShare: number;
  isOwner: boolean;
  connectedAt: string;
}

export interface CreditWithdrawalDto {
  id: string;
  withdrawalId: string;
  walletId: string;
  userId: string;
  amount: number;
  currency: string;
  bankAccountId?: string | null;
  bankAccountSnapshot?: {
    accountHolderName?: string;
    accountNumberLast4?: string;
    ifscCode?: string;
    bankName?: string;
    upiId?: string;
  } | null;
  status: WithdrawalStatus;
  failureReason?: string | null;
  adminNotes?: string | null;
  payoutReference?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  completedAt?: string | null;
  userName?: string;
  userEmail?: string;
}

export interface CreditBankAccountDto {
  id: string;
  userId: string;
  walletId: string;
  accountHolderName: string;
  accountNumberLast4: string;
  ifscCode: string;
  bankName?: string | null;
  upiId?: string | null;
  isPrimary: boolean;
  isVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface CreditSystemConfigDto {
  id: string;
  defaultRevenueSharePercent: number;
  minimumWithdrawalAmount: number;
  settlementPeriodDays: number;
  fraudCheckEnabled: boolean;
  kycRequiredForWithdrawal: boolean;
  maxDailyWithdrawalLimit: number;
  allowNewWallets: boolean;
  eligibleAdTypes: string[];
}

export interface AdAttributionInput {
  eventId: string; // Unique idempotency ID
  campaignId: string;
  campaignName?: string;
  toleeId?: string; // Group ID (if placement-specific)
  advertiserUserId?: string; // Advertiser who created/spent on the ad (e.g. Dham)
  memberUserId?: string; // Viewer or interacting member
  adEventType: 'impression' | 'click' | 'conversion' | 'spend';
  grossSpend: number; // In INR (e.g. 100.0)
  ipAddress?: string;
  userAgent?: string;
  attributionModel?: 'placement' | 'global_origin_referral';
}

export interface AttributionResult {
  success: boolean;
  status: 'credited_pending' | 'ignored_duplicate' | 'flagged_fraud' | 'no_eligible_group';
  eventId: string;
  transactionId?: string;
  beneficiaryUserId?: string;
  groupId?: string;
  grossSpend: number;
  revenueSharePercent: number;
  adminEarnedAmount: number;
  settlesAt?: string;
  reason?: string;
}
