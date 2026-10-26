/**
 * Tolee Video Health & Caching Utilities
 * Provides in-memory health tracking and lightweight server/client probes
 * for Google Drive and CDN video streams.
 */

interface HealthRecord {
  playable: boolean;
  status: number;
  reason?: string;
  checkedAt: number;
}

// Global in-memory cache for video source health
// Persists across requests within the Node.js server process
const healthCache = new Map<string, HealthRecord>();

const HEALTHY_TTL_MS = 30 * 60 * 1000; // 30 minutes
const UNHEALTHY_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function extractFileId(urlOrId: string | null | undefined): string | null {
  if (!urlOrId) return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{15,100}$/.test(trimmed)) {
    return trimmed;
  }
  const match = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
                trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function isKnownUnplayable(urlOrId: string | null | undefined): boolean {
  const fileId = extractFileId(urlOrId) || urlOrId;
  if (!fileId) return false;
  const record = healthCache.get(fileId);
  if (!record) return false;

  const ttl = record.playable ? HEALTHY_TTL_MS : UNHEALTHY_TTL_MS;
  if (Date.now() - record.checkedAt > ttl) {
    healthCache.delete(fileId);
    return false;
  }
  return !record.playable;
}

export function markVideoHealth(
  urlOrId: string,
  playable: boolean,
  status: number,
  reason?: string
): void {
  const fileId = extractFileId(urlOrId) || urlOrId;
  if (!fileId) return;
  healthCache.set(fileId, {
    playable,
    status,
    reason,
    checkedAt: Date.now()
  });
}

export function getCachedVideoHealth(urlOrId: string): HealthRecord | null {
  const fileId = extractFileId(urlOrId) || urlOrId;
  if (!fileId) return null;
  const record = healthCache.get(fileId);
  if (!record) return null;
  const ttl = record.playable ? HEALTHY_TTL_MS : UNHEALTHY_TTL_MS;
  if (Date.now() - record.checkedAt > ttl) {
    healthCache.delete(fileId);
    return null;
  }
  return record;
}
