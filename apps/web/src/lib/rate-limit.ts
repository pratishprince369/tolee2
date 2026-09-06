import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { SECURITY_CONFIG } from "./security-config";

export function getClientIp(): string {
  try {
    const headersList = headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    const realIp = headersList.get("x-real-ip");
    if (realIp) return realIp.trim();
  } catch (e) {
    // Fail silently in scopes where headers() are not accessible
  }
  return "127.0.0.1";
}

export class RateLimiter {
  private cache: Map<string, { count: number; expiresAt: number }>;
  private limit: number;
  private windowMs: number;

  constructor(limit: number, windowMs: number) {
    this.cache = new Map();
    this.limit = limit;
    this.windowMs = windowMs;
  }

  public isRateLimited(identifier: string): boolean {
    const now = Date.now();
    const record = this.cache.get(identifier);

    // Dynamic garbage collection of expired items
    if (Math.random() < 0.05) {
      this.cache.forEach((val, key) => {
        if (now > val.expiresAt) {
          this.cache.delete(key);
        }
      });
    }

    if (!record || now > record.expiresAt) {
      this.cache.set(identifier, {
        count: 1,
        expiresAt: now + this.windowMs,
      });
      return false;
    }

    if (record.count >= this.limit) {
      return true;
    }

    record.count += 1;
    return false;
  }

  public getRemainingSeconds(identifier: string): number {
    const record = this.cache.get(identifier);
    if (!record) return 0;
    const remainingMs = Math.max(0, record.expiresAt - Date.now());
    return Math.ceil(remainingMs / 1000);
  }

  public reset(identifier: string): void {
    this.cache.delete(identifier);
  }
}

/**
 * Exponential backoff tracker for repeated authentication failures
 */
class AuthBackoffTracker {
  private attempts: Map<string, { failures: number; lastFailedAt: number }>;

  constructor() {
    this.attempts = new Map();
  }

  public recordFailure(identifier: string): number {
    const now = Date.now();
    const existing = this.attempts.get(identifier) || { failures: 0, lastFailedAt: now };
    const failures = existing.failures + 1;
    this.attempts.set(identifier, { failures, lastFailedAt: now });

    // Exponential delay formula: 2^(failures - 1) * 500ms, capped at MAX_BACKOFF_DELAY_MS
    const delay = Math.min(
      Math.pow(2, failures - 1) * 500,
      SECURITY_CONFIG.RATE_LIMITS.AUTH.MAX_BACKOFF_DELAY_MS
    );
    return delay;
  }

  public getBackoffDelay(identifier: string): number {
    const record = this.attempts.get(identifier);
    if (!record) return 0;
    // Decay after 15 minutes of inactivity
    if (Date.now() - record.lastFailedAt > SECURITY_CONFIG.RATE_LIMITS.AUTH.WINDOW_MS) {
      this.attempts.delete(identifier);
      return 0;
    }
    return Math.min(
      Math.pow(2, record.failures - 1) * 500,
      SECURITY_CONFIG.RATE_LIMITS.AUTH.MAX_BACKOFF_DELAY_MS
    );
  }

  public recordSuccess(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const authBackoffTracker = new AuthBackoffTracker();

// ── Centralized Rate Limit Instances ──
export const authLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.AUTH.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.AUTH.WINDOW_MS
);

export const writeLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.WRITE.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.WRITE.WINDOW_MS
);

export const aiLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.AI.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.AI.WINDOW_MS
);

export const uploadLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.UPLOAD.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.UPLOAD.WINDOW_MS
);

export const searchLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.SEARCH.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.SEARCH.WINDOW_MS
);

export const readLimiter = new RateLimiter(
  SECURITY_CONFIG.RATE_LIMITS.PUBLIC.LIMIT,
  SECURITY_CONFIG.RATE_LIMITS.PUBLIC.WINDOW_MS
);

// Backward-compatibility alias
export const apiRateLimiter = readLimiter;

/**
 * Creates a generic, secure HTTP 429 response without exposing internal security metrics
 */
export function createRateLimitResponse(retryAfterSeconds = 60) {
  return NextResponse.json(
    {
      success: false,
      error: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "Cache-Control": "no-store",
      },
    }
  );
}
