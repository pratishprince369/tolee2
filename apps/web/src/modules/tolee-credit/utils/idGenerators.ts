export function generateTransactionId(prefix: string = 'TXN'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
}

export function generateWithdrawalId(): string {
  return generateTransactionId('WD');
}

export function generateEventId(campaignId: string, groupId?: string): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6);
  return `EVT_${campaignId}_${groupId || 'DIRECT'}_${timestamp}_${random}`;
}
