import { headers } from "next/headers";

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
        expiresAt: now + this.windowMs
      });
      return false;
    }

    if (record.count >= this.limit) {
      return true;
    }

    record.count += 1;
    return false;
  }
}

// 1. Strict Auth Limit (Logins, OTP requests, Credit transfers): 5 attempts per 15 minutes
export const authLimiter = new RateLimiter(5, 15 * 60 * 1000);

// 2. Strict Write Limit (Creating posts, comments, chat messages): 20 requests per 5 minutes
export const writeLimiter = new RateLimiter(20, 5 * 60 * 1000);

// 3. Standard Read Limit (General API scrolling, suggestions): 120 requests per 1 minute
export const readLimiter = new RateLimiter(120, 60 * 1000);

// Legacy backward-compatibility alias for existing Route APIs
export const apiRateLimiter = new RateLimiter(10, 60 * 1000);
