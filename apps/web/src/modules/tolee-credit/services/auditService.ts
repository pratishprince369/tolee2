import { prisma } from '@/lib/prisma';

export interface AuditLogInput {
  actorId: string;
  actorRole?: 'user' | 'admin' | 'system';
  action:
    | 'wallet_created'
    | 'group_connected'
    | 'revenue_attributed'
    | 'settlement_processed'
    | 'withdrawal_requested'
    | 'withdrawal_approved'
    | 'withdrawal_rejected'
    | 'config_updated'
    | 'fraud_flagged'
    | 'bank_account_added';
  targetType: 'wallet' | 'group' | 'transaction' | 'withdrawal' | 'config' | 'bank_account';
  targetId: string;
  amount?: number;
  details?: Record<string, any>;
  ipAddress?: string;
}

export async function logCreditAudit(input: AuditLogInput): Promise<void> {
  try {
    await prisma.creditAuditLog.create({
      data: {
        actorId: input.actorId,
        actorRole: input.actorRole || 'user',
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        amount: input.amount ?? null,
        details: input.details ?? {},
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[logCreditAudit] Error saving audit log:', err);
  }
}
