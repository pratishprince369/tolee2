import { prisma } from '@/lib/prisma';
import { CreditTransactionDto, TransactionType, TransactionStatus, EarningSourceType } from '../types';
import { generateTransactionId } from '../utils/idGenerators';

export interface CreateTransactionInput {
  walletId: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency?: string;
  status?: TransactionStatus;
  sourceType: EarningSourceType;
  sourceId?: string;
  groupId?: string;
  groupName?: string;
  campaignId?: string;
  campaignName?: string;
  revenueSharePercent?: number;
  grossAdSpend?: number;
  description?: string;
  metadata?: Record<string, any>;
  settlesAt?: Date;
  eventId?: string;
}

export async function createCreditTransaction(
  prismaClient: any,
  input: CreateTransactionInput
): Promise<CreditTransactionDto> {
  const transactionId = generateTransactionId('TXN');

  const created = await prismaClient.creditTransaction.create({
    data: {
      transactionId,
      walletId: input.walletId,
      userId: input.userId,
      type: input.type,
      amount: input.amount,
      currency: input.currency || 'INR',
      status: input.status || 'pending',
      sourceType: input.sourceType,
      sourceId: input.sourceId || null,
      groupId: input.groupId || null,
      groupName: input.groupName || null,
      campaignId: input.campaignId || null,
      campaignName: input.campaignName || null,
      revenueSharePercent: input.revenueSharePercent || null,
      grossAdSpend: input.grossAdSpend || null,
      description: input.description || null,
      metadata: input.metadata || {},
      settlesAt: input.settlesAt || null,
      eventId: input.eventId || null,
    },
  });

  return {
    id: created.id,
    transactionId: created.transactionId,
    walletId: created.walletId,
    userId: created.userId,
    type: created.type as TransactionType,
    amount: created.amount,
    currency: created.currency,
    status: created.status as TransactionStatus,
    sourceType: created.sourceType as EarningSourceType,
    sourceId: created.sourceId,
    groupId: created.groupId,
    groupName: created.groupName,
    campaignId: created.campaignId,
    campaignName: created.campaignName,
    revenueSharePercent: created.revenueSharePercent,
    grossAdSpend: created.grossAdSpend,
    description: created.description,
    metadata: created.metadata as any,
    settlesAt: created.settlesAt ? created.settlesAt.toISOString() : null,
    settledAt: created.settledAt ? created.settledAt.toISOString() : null,
    eventId: created.eventId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

export async function getTransactionsByWalletId(
  walletId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: TransactionType;
    status?: TransactionStatus;
  }
): Promise<{ transactions: CreditTransactionDto[]; total: number }> {
  const where: any = { walletId };
  if (options?.type) where.type = options.type;
  if (options?.status) where.status = options.status;

  const [items, total] = await Promise.all([
    prisma.creditTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.creditTransaction.count({ where }),
  ]);

  const transactions: CreditTransactionDto[] = items.map((t: any) => ({
    id: t.id,
    transactionId: t.transactionId,
    walletId: t.walletId,
    userId: t.userId,
    type: t.type as TransactionType,
    amount: t.amount,
    currency: t.currency,
    status: t.status as TransactionStatus,
    sourceType: t.sourceType as EarningSourceType,
    sourceId: t.sourceId,
    groupId: t.groupId,
    groupName: t.groupName,
    campaignId: t.campaignId,
    campaignName: t.campaignName,
    revenueSharePercent: t.revenueSharePercent,
    grossAdSpend: t.grossAdSpend,
    description: t.description,
    metadata: t.metadata as any,
    settlesAt: t.settlesAt ? t.settlesAt.toISOString() : null,
    settledAt: t.settledAt ? t.settledAt.toISOString() : null,
    eventId: t.eventId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));

  return { transactions, total };
}
