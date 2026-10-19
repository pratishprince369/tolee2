import crypto from 'crypto';

export type ApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ApprovalRecord {
  id: string;
  userId: string;
  actionType: string;
  title: string;
  description: string;
  summary: string;
  payload: Record<string, any>;
  payloadHash: string;
  state: ApprovalState;
  cost?: string;
  createdAt: number;
  expiresAt: number;
  executedAt?: number;
  result?: any;
  error?: string;
}

export interface CreateApprovalParams {
  userId: string;
  actionType: string;
  title: string;
  description: string;
  summary: string;
  payload: Record<string, any>;
  cost?: string;
  ttlMinutes?: number;
}

/**
 * 🛡️ Strict Backend Approval Engine (Section 6 & 8)
 * - Cryptographically binds payloads to SHA-256 hash.
 * - Prevents double execution with atomic state transitions.
 * - Enforces per-user boundaries and TTL expiration.
 * - Provides audit records for consequential operations.
 */
export class ApprovalEngine {
  private static store: Map<string, ApprovalRecord> = new Map();

  /**
   * Generates deterministic SHA-256 hash of a payload object
   */
  public static hashPayload(payload: Record<string, any>): string {
    const sortedKeys = Object.keys(payload || {}).sort();
    const sortedObj: Record<string, any> = {};
    for (const k of sortedKeys) {
      sortedObj[k] = payload[k];
    }
    return crypto.createHash('sha256').update(JSON.stringify(sortedObj)).digest('hex');
  }

  /**
   * Creates a new pending approval request
   */
  public static createApproval(params: CreateApprovalParams): ApprovalRecord {
    const id = `appr_${crypto.randomBytes(12).toString('hex')}`;
    const now = Date.now();
    const ttl = (params.ttlMinutes || 15) * 60 * 1000;
    const payloadHash = this.hashPayload(params.payload);

    const record: ApprovalRecord = {
      id,
      userId: params.userId,
      actionType: params.actionType,
      title: params.title,
      description: params.description,
      summary: params.summary,
      payload: params.payload,
      payloadHash,
      state: 'pending',
      cost: params.cost,
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.store.set(id, record);
    return record;
  }

  /**
   * Retrieves an approval record with user ownership and expiry validation
   */
  public static getApproval(id: string, userId: string): { success: boolean; record?: ApprovalRecord; error?: string } {
    const record = this.store.get(id);
    if (!record) {
      return { success: false, error: 'Approval request not found.' };
    }

    // Ownership check (Section 12: Cross-user boundary)
    if (record.userId !== userId) {
      return { success: false, error: 'Unauthorized: Approval belongs to another user.' };
    }

    // Expiry check
    if (record.state === 'pending' && Date.now() > record.expiresAt) {
      record.state = 'expired';
      return { success: false, record, error: 'Approval request has expired (15 minute TTL).' };
    }

    return { success: true, record };
  }

  /**
   * Validates and transitions an approval to 'approved' state
   */
  public static approve(
    id: string,
    userId: string,
    submittedPayload?: Record<string, any>
  ): { success: boolean; record?: ApprovalRecord; error?: string } {
    const fetch = this.getApproval(id, userId);
    if (!fetch.success || !fetch.record) {
      return { success: false, error: fetch.error };
    }

    const record = fetch.record;

    if (record.state !== 'pending') {
      return { success: false, error: `Cannot approve request in "${record.state}" state.` };
    }

    // Payload tamper check (Rule 4: Editing an approved payload invalidates old approval)
    if (submittedPayload) {
      const submittedHash = this.hashPayload(submittedPayload);
      if (submittedHash !== record.payloadHash) {
        record.state = 'rejected';
        record.error = 'Payload was modified after approval was requested. Old approval invalidated.';
        return {
          success: false,
          record,
          error: 'Security alert: Payload does not match original request. Approval invalidated.',
        };
      }
    }

    record.state = 'approved';
    return { success: true, record };
  }

  /**
   * Atomically claims an approved record for execution to prevent double execution
   */
  public static claimForExecution(
    id: string,
    userId: string
  ): { success: boolean; record?: ApprovalRecord; error?: string } {
    const fetch = this.getApproval(id, userId);
    if (!fetch.success || !fetch.record) {
      return { success: false, error: fetch.error };
    }

    const record = fetch.record;

    // Both 'approved' and 'pending' (if instant execution with valid user click) are checked
    if (record.state === 'executing') {
      return { success: false, error: 'Action is already currently executing (concurrent execution prevented).' };
    }
    if (record.state === 'completed') {
      return { success: false, error: 'Action has already been executed and completed.' };
    }
    if (record.state === 'rejected' || record.state === 'cancelled' || record.state === 'expired') {
      return { success: false, error: `Action cannot execute because it is ${record.state}.` };
    }

    // Atomic claim
    record.state = 'executing';
    return { success: true, record };
  }

  /**
   * Marks execution as completed
   */
  public static markCompleted(id: string, userId: string, result: any): void {
    const record = this.store.get(id);
    if (record && record.userId === userId) {
      record.state = 'completed';
      record.executedAt = Date.now();
      record.result = result;
    }
  }

  /**
   * Marks execution as failed
   */
  public static markFailed(id: string, userId: string, error: string): void {
    const record = this.store.get(id);
    if (record && record.userId === userId) {
      record.state = 'failed';
      record.error = error;
    }
  }

  /**
   * Rejects an approval request
   */
  public static reject(id: string, userId: string, reason: string = 'User rejected action'): boolean {
    const fetch = this.getApproval(id, userId);
    if (!fetch.success || !fetch.record) return false;
    fetch.record.state = 'rejected';
    fetch.record.error = reason;
    return true;
  }

  /**
   * Cancels all active pending approvals for a user (for "ruko", "cancel", "mat karo")
   */
  public static cancelPendingForUser(userId: string): number {
    let count = 0;
    for (const record of this.store.values()) {
      if (record.userId === userId && (record.state === 'pending' || record.state === 'approved')) {
        record.state = 'cancelled';
        record.error = 'Cancelled by user directive';
        count++;
      }
    }
    return count;
  }

  /**
   * Lists approvals for audit trail (Section 13)
   */
  public static listForUser(userId: string, limit: number = 20): ApprovalRecord[] {
    return Array.from(this.store.values())
      .filter((r) => r.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }
}
