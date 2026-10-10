export const DEFAULT_CREDIT_CONFIG = {
  id: 'global_credit_config',
  defaultRevenueSharePercent: 10.0, // 10% to group founder/admin
  minimumWithdrawalAmount: 500.0,   // ₹500 minimum payout threshold
  settlementPeriodDays: 7,          // 7 days for pending revenue verification
  fraudCheckEnabled: true,
  kycRequiredForWithdrawal: false,
  maxDailyWithdrawalLimit: 50000.0, // ₹50,000 max daily payout request
  allowNewWallets: true,
  eligibleAdTypes: ['sponsored', 'boost', 'banner', 'video'],
};
